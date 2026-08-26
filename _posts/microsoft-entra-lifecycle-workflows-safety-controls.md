---
title: "Microsoft Entra Lifecycle Workflows Safety Controls: Scope Preview, Quarantine, and Run Cancellation"
excerpt: "Microsoft has made Lifecycle Workflows what-if mode and run cancellation generally available. Learn how to combine scope checks, execution thresholds, quarantine, monitoring, and recovery into a safe production rollout."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-26T18:26:57.000-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The dangerous part of identity automation is not building a workflow. It is discovering, five minutes after the schedule fires, that your scope rule matched 4,000 people instead of 40.

Grab a coffee. Microsoft has added a much better safety model to Lifecycle Workflows: you can inspect who is in execution scope without changing users, place scheduled workflows behind execution thresholds that quarantine an unexpectedly large run, and cancel a queued or in-progress run before every remaining task completes.

Microsoft listed **what-if mode** and **run cancellation** as generally available in its August 10, 2026 Entra release roundup. The same announcement also made the **Update user attributes** task generally available, which raises the value of these controls: a workflow can now change directory data as well as memberships, licenses, access packages, and account state. The sponsorless-guest cleanup workflow announced in the same post is still **public preview** and is not the subject of this production rollout guide. [Microsoft's August release post separates the GA and preview capabilities](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172).

This is the operating model I would use before letting a joiner, mover, or leaver workflow touch production.

## The release state and control boundaries

| Control | Current state | What it does | What it does not do |
|---|---|---|---|
| What-if mode / execution-scope inspection | Generally available | Shows which users currently meet a workflow's execution conditions without running its tasks | Does not prove that downstream task permissions, data, or integrations will succeed |
| Execution thresholds and quarantine | Documented production control; thresholds are administrator-enabled | Blocks a scheduled workflow when its evaluated population exceeds a configured percentage, fixed count, or either | Does not protect on-demand runs |
| Cancel workflow run | Generally available | Stops unprocessed tasks in a queued or in-progress run | Does not reverse tasks that already completed |
| Update user attributes task | Generally available | Sets or clears supported attributes as part of a workflow | Does not write arbitrary built-in attributes back to synchronized AD users |
| Sponsorless guest cleanup | Public preview | Detects and manages guest accounts without a valid sponsor | Should not be folded into the same production change record as the GA controls |

Microsoft has not published a mandatory-enforcement deadline or a tenant-wide default-on rollout for what-if mode or cancellation. They are administrator-invoked controls. Execution thresholds are also opt-in: an administrator must enable and configure them at the tenant or workflow level. [Microsoft's threshold and quarantine guide documents that enablement model](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-execution-limits).

## Think of the control plane in four stages

Lifecycle Workflows are easier to operate when you separate four decisions that happen before, during, and after a run.

### 1. Selection: who qualifies right now?

A scheduled workflow has a trigger and a scope. The trigger decides *when* a user qualifies; the scope decides *which* users can qualify. A date-driven leaver workflow might trigger on `employeeLeaveDateTime` while its scope narrows processing to employees in a particular business unit.

What-if mode is the preflight check for this selection stage. In the Microsoft Entra admin center, the documented route is **ID Governance > Lifecycle workflows > Workflows > [workflow] > Execution conditions > Execution User Scope**. The page lists users who currently meet the execution scope, including users who might already have been processed. It does not modify those users. [Microsoft documents the portal and Graph paths for checking execution scope](https://learn.microsoft.com/en-us/entra/id-governance/check-workflow-execution-scope).

Treat this as a query result, not a simulation of every side effect. It tells you whom the rule selects. It cannot tell you whether a group is writable, whether a custom Logic App will time out, whether a license is available, or whether a manager email address is valid.

### 2. Admission control: is the selected population plausible?

Execution thresholds are the circuit breaker. You can define a tenant-wide limit for workflows that do not have their own limit, then override it with a workflow-specific limit. A limit can be a percentage of the tenant population, a fixed number of users, or both. When both are present, Microsoft evaluates them with **OR** logic: crossing either limit quarantines the workflow.

The critical boundary is easy to miss: thresholds apply only to **scheduled** runs. On-demand runs are not checked. A quarantined workflow can also be run on demand, bypassing the threshold. That makes on-demand execution a privileged break-glass path, not a harmless testing shortcut.

When a scheduled run crosses its limit, the workflow is quarantined and Lifecycle Workflows administrators receive an automatic email. The workflow will not run again until an administrator approves execution. Approval does not launch it immediately; it returns to its existing schedule and is evaluated at the next applicable run time. [The execution-limit documentation describes the precedence, OR logic, notification, bypass, and approval behavior](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-execution-limits).

### 3. Execution: what has already crossed the line?

Cancellation works at the **run** level. An administrator can cancel a run whose state is **Queued** or **In progress**. For a queued run, cancellation prevents its tasks from starting. For an in-progress run, it stops tasks that have not yet been processed.

There is no transaction rollback. If the first task removed a user from a group and the second task disabled the account before you canceled, those changes remain. The portal currently cancels one selected run at a time, and it cannot cancel one task or one user inside a run. [Microsoft's cancellation guide is explicit about all four boundaries](https://learn.microsoft.com/en-us/entra/id-governance/cancel-workflow-runs).

The portal route is **ID Governance > Lifecycle workflows > Workflows > [workflow] > Workflow History > Runs**. Select a queued or in-progress run, then select **Cancel**.

For controlled automation, Microsoft Graph exposes the action in v1.0:

```http
POST https://graph.microsoft.com/v1.0/identityGovernance/lifecycleWorkflows/workflows/{workflow-id}/cancelProcessing
Content-Type: application/json

{
  "scope": {
    "@odata.type": "#microsoft.graph.identityGovernance.cancelRunsScope",
    "runs": [
      {
        "id": "{run-id}"
      }
    ]
  }
}
```

The least-privileged documented Graph permission is `LifecycleWorkflows-Workflow.ReadWrite.All`; for delegated access, the calling user also needs a supported Entra role, with Lifecycle Workflows Administrator listed as the least privileged supported role. [The v1.0 `cancelProcessing` reference provides the endpoint, request body, permissions, and role requirement](https://learn.microsoft.com/en-us/graph/api/identitygovernance-workflow-cancelprocessing?view=graph-rest-1.0).

### 4. Evidence: what happened, to whom, and where did it fail?

Workflow History gives three useful views: users, runs, and tasks. The run view answers whether a batch completed; the user view shows which identities were processed; the task view exposes which action failed. Reports can be downloaded as CSV. For compliance and investigation, the directory audit log remains the detailed event source. [Microsoft's Lifecycle Workflows history guide explains the three summaries and their relationship to audit logs](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-history).

Do not reduce monitoring to a green "Completed" badge. A completed run can still be operationally wrong if the scope was wrong but every requested task succeeded. Compare the processed population with the approved change population, especially after editing an execution condition.

## Why attribute updates increase the blast radius

The new GA **Update user attributes** task can set or clear up to 10 attributes per task instance. For cloud-managed users, it supports built-in user attributes, on-premises extension attributes, and directory extensions. For users synchronized from on-premises Active Directory, it supports **directory extension attributes only**. Custom security attributes are not supported by this task. [Microsoft documents the supported attribute types and limitations](https://learn.microsoft.com/en-us/entra/id-governance/how-to-lifecycle-workflow-update-user-attributes).

That source-of-authority boundary matters. A synchronized user may appear in the same workflow scope as a cloud-managed user, but the same attribute operation might not be valid for both. Split workflows where ownership differs rather than relying on a long chain of per-task failures.

The task also changes how you should think about recovery. Group membership can often be restored from an exported membership list. A cleared `department`, `jobTitle`, or lifecycle date might affect dynamic groups, provisioning rules, address lists, access packages, and other workflows. Before adding attribute updates, inventory every downstream rule that consumes the attribute and record the original values for the pilot population.

That last point is operational analysis, not a Microsoft product guarantee: the directory attribute is often only the first control-plane change. The downstream consequences depend on how your tenant uses it.

## Prerequisites and licensing

Microsoft's current documentation requires **Microsoft Entra ID Governance or Microsoft Entra Suite** licensing for Lifecycle Workflows. The portal procedures use at least the **Lifecycle Workflows Administrator** role. For larger organizations, administrative-unit scoping can delegate management of specific workflows, but it does not remove the need to control who can run or change them. [Microsoft's Lifecycle Workflows overview contains the current licensing requirement and service boundaries](https://learn.microsoft.com/en-us/entra/id-governance/what-are-lifecycle-workflows).

Before production rollout, confirm these prerequisites:

1. The lifecycle attributes used by the trigger and scope are populated from an authoritative source and arrive before the workflow's evaluation window.
2. Cloud-managed and synchronized users are separated where task compatibility differs.
3. Every target group, access package, application, and custom extension has a named owner.
4. The administrator role and Graph permissions are least privilege and time-bound where possible.
5. Workflow History and Entra audit logs are retained long enough for your incident and compliance requirements.
6. The rollback owner can reverse each task in the workload where that task made its change.

## A staged production rollout

### Ring 0: model the failure before enabling the schedule

For every task, write down three things: the object it changes, the evidence of success, and the reversal action. "Disable user account" is not one generic rollback item if another task also removes licenses and group memberships.

Set a tenant-wide threshold as a backstop, then use a tighter workflow-specific threshold for high-impact leaver and mover workflows. Remember that the workflow-specific value overrides the tenant-wide value; the two limits are not combined.

### Ring 1: validate selection only

Keep scheduling off. Populate representative test identities with realistic dates, departments, manager relationships, source-of-authority types, and extension attributes. Inspect **Execution User Scope** and compare every returned object with a separately approved roster.

Test negative cases deliberately:

- a user just outside the date window;
- a user in the wrong department;
- a synchronized user where a built-in attribute update is unsupported;
- a user with a missing manager or downstream dependency;
- a user who previously met the condition and can appear because of the workflow catch-up behavior.

If the preview includes one unexpected privileged, service, emergency-access, or executive identity, stop and fix the rule. Do not wave it through because the rest of the list looks correct.

### Ring 2: a small on-demand task test

Run the workflow on demand against a few disposable pilot users. Microsoft documents a maximum of 10 users per on-demand selection. Verify each side effect in its owning workload and then verify the Workflow History user, run, and task views. [Microsoft's deployment guide documents the on-demand limit and scheduling constraints](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflows-deployment).

Because on-demand runs bypass execution thresholds, require a second person to compare the selected users with the change ticket before execution. This is a process control compensating for a documented product boundary.

### Ring 3: prove the circuit breaker

Use a nonproduction workflow to create a scope larger than its workflow-specific threshold. Confirm that the scheduled run is quarantined, the administrator notification arrives, and no tasks execute.

Do not immediately approve the quarantined workflow. Correct the scope, recheck the execution population, and record why the limit fired. Approval clears the block; it does not fix the rule that caused it.

### Ring 4: prove cancellation and recovery

Use a workflow with multiple low-risk tasks and enough pilot objects to observe a queued or in-progress state. Cancel the run and record:

- which tasks completed before cancellation;
- which tasks remained unprocessed;
- the final run status;
- the workload-local evidence for completed actions;
- the time required to reverse those completed actions.

The objective is not to prove that the Cancel button exists. It is to prove that your team can identify the irreversible boundary quickly enough to contain a real mistake.

### Ring 5: limited scheduled production

Start with a small business unit and a threshold slightly above its approved daily volume, not a percentage generous enough to include the whole tenant. Review every run during the pilot. Expand only after the selected population, task results, downstream effects, and recovery records all agree.

## Rollback and containment

When a run is wrong, containment and rollback are separate:

1. **Cancel** the queued or in-progress run to stop unprocessed tasks.
2. **Prevent recurrence** by disabling scheduling or correcting the workflow before its next evaluation.
3. **Export the evidence** from Workflow History and the directory audit log.
4. **Inventory completed tasks** by user and workload.
5. **Reverse completed changes** in their owning services using the preapproved recovery procedure.
6. **Recheck execution scope** before re-enabling the schedule.

Do not reprocess the failed run until you know whether a task is idempotent. Re-running "add user to group" might be harmless; re-running an email, access-package request, custom extension, or destructive offboarding action might not be.

Quarantine is prevention, not rollback. Cancellation is containment, not rollback. Workflow History is evidence, not rollback. The recovery plan still belongs to you.

## Troubleshooting the controls

**Execution User Scope is empty.** Check the trigger attribute, the scope expression, the source system's most recent synchronization, and whether the user's lifecycle date falls inside the applicable processing window. Avoid changing several conditions at once; version and retest one change at a time.

**The wrong users appear in scope.** Inspect `and`/`or` grouping and null or stale attribute values. Compare a returned user's actual Entra properties with the rule rather than assuming the HR record has already synchronized.

**A workflow was quarantined below the percentage you expected.** Check for a fixed-number threshold as well. When both exist, either one can quarantine the run. Also check whether a workflow-specific threshold is overriding the tenant-wide value.

**The workflow ran despite the threshold.** Confirm whether it was started on demand. Execution limits protect scheduled runs only.

**Cancel is unavailable.** The selected run must be Queued or In progress. Cancellation is not offered for a completed run, from the Users or Tasks tabs, or for one user or task inside a run.

**A canceled run still changed users.** Review task processing results. Cancellation stops work that has not yet been processed; it does not undo completed tasks.

**An approved quarantined workflow did not run immediately.** Approval returns it to normal scheduling. The workflow is evaluated at its next scheduled run, assuming its execution conditions still match.

**Attribute updates fail only for synchronized users.** Confirm the attribute type. The GA task supports directory extensions for synchronized users, not arbitrary built-in or on-premises extension attributes.

## The admin checklist

- [ ] Record that what-if mode, run cancellation, and Update user attributes are GA; keep sponsorless guest cleanup marked preview.
- [ ] Confirm Entra ID Governance or Entra Suite licensing and least-privilege administrator access.
- [ ] Map every trigger and scope attribute to its authoritative source and synchronization path.
- [ ] Separate cloud-managed and synchronized users where task compatibility differs.
- [ ] Inspect Execution User Scope and reconcile it with an independently approved roster.
- [ ] Configure a tenant-wide threshold and tighter workflow-specific thresholds where impact is higher.
- [ ] Document that either percentage or fixed count can trigger quarantine.
- [ ] Treat on-demand execution as a controlled bypass because thresholds do not apply.
- [ ] Test quarantine without approving the bad scope.
- [ ] Test run cancellation and measure which tasks can complete before containment.
- [ ] Export Workflow History and preserve directory audit evidence.
- [ ] Record original attribute values and downstream consumers before using Update user attributes.
- [ ] Assign a workload owner and a reversal procedure to every task.
- [ ] Recheck execution scope after every workflow version change.
- [ ] Expand scheduled production by observed daily volume, not by optimism.

If you are new to the feature itself, start with the broader [Lifecycle Workflows joiner-mover-leaver guide](/posts/what-are-entra-lifecycle-workflows-beginners-guide). Then come back to this playbook before enabling a production schedule.

Identity automation should be boring in production. The new controls make that possible, but only when you use them as layers: inspect selection, cap the blast radius, stop unfinished work, preserve evidence, and keep a workload-specific recovery plan for everything that already happened.
