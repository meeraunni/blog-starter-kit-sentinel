---
title: "Clone a Microsoft Entra Lifecycle Workflow: Safe Guide"
excerpt: "Clone a Microsoft Entra Lifecycle Workflow safely: compare scope and tasks, run a bounded pilot, monitor execution, and retain a clean rollback path."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-18T09:09:29-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **clone a Microsoft Entra Lifecycle Workflow**, open **Microsoft Entra admin center > ID Governance > Lifecycle workflows > Workflows**, select the source workflow, and choose **Clone**. You can also start from **Create workflow > Clone an existing workflow > Browse workflows**. Microsoft opens the copy on **Review + create**, where you can inspect and change its details before selecting **Create**. The clone option is available only in the admin center, and you need at least the Lifecycle Workflows Administrator role. [Microsoft documents both portal paths and the role requirement](https://learn.microsoft.com/en-us/entra/id-governance/create-lifecycle-workflow).

That is the button-click answer. The operational answer is: do not create an unchanged twin and assume it is safe.

A cloned workflow can inherit the source's automation logic at the exact moment you intend to change its population, timing, or purpose. Grab a coffee and treat cloning like a controlled deployment: record the source, review every execution condition and task, keep the new schedule off, test with disposable identities, and preserve the original as the known-good path.

Microsoft lists workflow cloning as **generally available** in the [September 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-september-2026/4545179). Microsoft documents it as an administrator-initiated creation option—not a default-on tenant change, mandatory rollout, or retirement event.

## Clone a Microsoft Entra Lifecycle Workflow without cloning its risk

Cloning is useful when a working joiner, mover, or leaver process needs a controlled variant. Good examples include:

- creating a regional copy with a narrower department or location rule;
- separating cloud-managed users from identities synchronized from Active Directory;
- piloting a different task sequence without editing production;
- creating a lower-impact test copy of a destructive leaver workflow; or
- preserving an approved workflow while a replacement is validated.

Cloning is a poor fit when the objective is merely to change an existing workflow in place. Microsoft Lifecycle Workflows already maintains versions: changing tasks or execution conditions in the admin center automatically creates a new version of that workflow. Microsoft Graph changes require an administrator to create the new version manually. The [workflow versioning reference](https://learn.microsoft.com/en-us/entra/id-governance/manage-workflow-tasks) explains that distinction.

Use this decision rule:

| Change | Better control-plane action | Why |
| --- | --- | --- |
| Correct one production workflow while keeping its identity and history | Edit the existing workflow | The change becomes a new version of the same workflow |
| Build a variant for a different population or operating owner | Clone the workflow | The variant can be tested and governed separately |
| Start from a Microsoft-designed scenario | Use a built-in template | You avoid inheriting tenant-specific assumptions |
| Build a workflow from scratch through automation | Use Microsoft Graph | Microsoft says from-scratch creation is a Graph path |

> [!IMPORTANT]
> **Analysis:** cloning is a branching operation, not a rollback feature. The source and clone become separate operational objects. Keep the source unchanged until the clone has passed scope, task, schedule, monitoring, and recovery checks.

If you are new to the service, start with the [Lifecycle Workflows joiner-mover-leaver introduction](/posts/what-are-entra-lifecycle-workflows-beginners-guide). If your main concern is blast radius, the [Lifecycle Workflows safety-controls guide](/posts/microsoft-entra-lifecycle-workflows-safety-controls) covers execution-scope inspection, thresholds, quarantine, and run cancellation.

## Confirm licensing and authority before cloning

Microsoft requires **Microsoft Entra ID Governance or Microsoft Entra Suite** licensing to use Lifecycle Workflows. The administrator performing the portal clone needs at least the **Lifecycle Workflows Administrator** role. These requirements are stated in Microsoft's current [workflow creation guidance](https://learn.microsoft.com/en-us/entra/id-governance/create-lifecycle-workflow) and [Identity Governance licensing fundamentals](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals).

Before opening the clone wizard, record:

- the source workflow display name and object ID;
- its business owner and technical owner;
- whether it is joiner, mover, or leaver automation;
- its enabled and scheduling states;
- its administrative scope, trigger, subject scope, and schedule;
- its ordered task list, disabled tasks, task arguments, and custom extensions;
- the identities and workloads each task can change;
- the source workflow's recent run, user, and task history; and
- the intended difference between source and clone.

That last item should fit in one sentence. “Copy production and adjust later” is not a change purpose. “Create a Canada-only onboarding variant that excludes contractors and replaces the access-package task” is reviewable.

If another team will operate the clone, design that boundary before creation. The site's [delegated Lifecycle Workflows administration guide](/posts/delegate-microsoft-entra-lifecycle-workflows-administration) explains how Administrative Unit role scope, workflow administrative scope, and execution conditions combine.

## Capture a source baseline you can compare

The portal review is necessary, but it is easier to miss a small rule, task argument, or scheduling difference when the source is not recorded independently.

At minimum, capture screenshots or an approved configuration record for these three parts:

1. **General information:** display name, description, category, administrative scope, enabled state, and scheduling state.
2. **Execution conditions:** trigger type, trigger attribute or group, timing, and the complete subject-scope rule.
3. **Tasks:** order, enabled state, continue-on-error behavior, task arguments, target objects, and custom-extension dependencies.

For a machine-readable baseline, Microsoft Graph v1.0 can retrieve a workflow. The `GET` operation expands tasks by default and supports expansion of relationships including `previewScope`. Use the permissions and role requirements in Microsoft's [Get workflow reference](https://learn.microsoft.com/en-us/graph/api/identitygovernance-workflow-get?view=graph-rest-1.0):

```http
GET https://graph.microsoft.com/v1.0/identityGovernance/lifecycleWorkflows/workflows/{source-workflow-id}
```

After creation, retrieve the clone using its own object ID and compare the fields that matter to your approved change. Do not compare only the display name. Microsoft's workflow resource includes execution conditions, tasks, `isEnabled`, `isSchedulingEnabled`, and version information.

> [!NOTE]
> This is a configuration-review technique, not a claim that Microsoft provides a built-in source-versus-clone diff. Keep the comparison in your change process or approved tooling.

## Review the clone in blast-radius order

The portal allows you to create the clone directly from **Review + create** without making changes. Resist that shortcut. Open the other tabs and review the copy in this order.

### 1. Give the clone a unique operational identity

Use a unique display name that identifies population, purpose, and lifecycle phase. Microsoft requires workflow display names to be unique. Its [workflow properties guide](https://learn.microsoft.com/en-us/entra/id-governance/manage-workflow-properties) also separates basic information from changes that create new workflow versions.

A useful name looks like `CA Employees - Joiner - Pilot`, not `Copy of Onboarding`.

Put the source workflow ID, change record, owner, pilot boundary, and expected retirement decision in the description if your naming and data-handling standards permit it. The portal name is an operational control when an administrator is staring at several similar workflows during an incident.

### 2. Rebuild the who and when mentally

Microsoft defines execution conditions as two controls:

- the **trigger** determines when processing is eligible to occur; and
- the **scope** determines which users the workflow can process.

The current [execution-conditions reference](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-execution-conditions) documents time-based, attribute-change, group-membership-change, sign-in-inactivity, and on-demand-only triggers. Review the exact trigger type, attribute, operator, timing, selected group, and rule expression in the clone.

Do not assume a location or department change narrows the source rule. Parentheses, `and`/`or` grouping, stale attributes, null values, and upstream synchronization can make a seemingly small edit expand the population.

For scheduled workflows, open **Execution conditions > Execution User Scope** after creation. Microsoft's [execution-scope guide](https://learn.microsoft.com/en-us/entra/id-governance/check-workflow-execution-scope) says that this view lists users who currently meet the workflow's execution scope, regardless of whether they were processed previously. It also warns that a retroactive processing window can include users who met conditions earlier.

Reconcile that list with an independently approved roster. A list that is “about the right size” is not evidence.

### 3. Review tasks as side effects, not labels

For every task, write down:

- the directory or workload object it changes;
- the target population;
- the required dependency or permission;
- the evidence that proves success;
- whether repeating the task is safe; and
- the reversal action and owner.

Task order matters. Microsoft allows tasks to be added, disabled, reordered, and removed, and changes to tasks create a workflow version. A clone that contains the right tasks in the wrong sequence is not equivalent to the source.

Pay special attention to account disablement, group removal, access-package requests, attribute changes, emails, and custom extensions. A workflow status of **Completed** proves that requested processing finished; it does not prove the chosen user population or business result was correct.

### 4. Keep the first schedule off

Microsoft says a newly created workflow is disabled by default so it can be tested on a smaller audience first. Preserve that safety state while the configuration is reviewed.

Separate two switches in the change record:

- **workflow enabled** controls whether the workflow can run, including on demand; and
- **schedule enabled** controls scheduled evaluation.

Do not turn both on as one step. Enable the workflow for a bounded test only after the clone configuration and pilot identities are ready. Enable scheduling later, after test evidence is clean.

## Pilot the cloned workflow in five rings

### Ring 0: prove the source is still known-good

Review the source workflow's latest successful runs and failures. Confirm that the baseline you captured matches the current source. If the source changed after the clone decision, stop and decide which source version is authoritative.

Do not edit the source to make the clone easier to validate. That creates two moving targets.

### Ring 1: validate configuration with scheduling off

Create the clone, keep its schedule disabled, and compare it with the source baseline. Every difference should map to the approved purpose. Unexpected similarity can be as dangerous as unexpected difference: a copied production group, email recipient, custom extension, or destructive task may be wrong for the pilot.

Inspect the clone's Execution User Scope. Include positive and negative cases:

- one user who should match;
- one user just outside the timing window;
- one user in the wrong department, location, or group;
- one privileged, emergency-access, or service identity that must never match; and
- one identity with a missing or stale trigger attribute.

### Ring 2: run a small on-demand test

Microsoft allows on-demand testing against up to 10 selected users, but the workflow must be enabled. Crucially, an on-demand run can target any user without considering whether that user meets the workflow's execution conditions. [Microsoft's on-demand workflow guide](https://learn.microsoft.com/en-us/entra/id-governance/on-demand-workflow) documents both behaviors.

That makes on-demand execution useful and sharp. Use disposable test identities, compare their object IDs with the change record, and require a second-person check for high-impact tasks.

Execution thresholds do not protect on-demand runs. Microsoft's [execution-limit guidance](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-execution-limits) says thresholds are evaluated only for scheduled runs. Do not describe a threshold as a safety net for a manually selected test.

### Ring 3: inspect every task result

Open **Workflow history** and review the Users, Runs, and Tasks views. Microsoft's [workflow status guide](https://learn.microsoft.com/en-us/entra/id-governance/check-status-workflow) exposes successful, failed, in-progress, and unprocessed work at those levels.

Verify the result twice:

1. in Lifecycle Workflows history; and
2. in the system that owns the side effect, such as the user object, group, access package, mailbox, or external extension.

A green task with the wrong target is still an incident. A failed task that made a partial downstream change also needs workload-local evidence.

### Ring 4: enable a bounded schedule

Before enabling the schedule, configure or confirm a workflow-specific execution threshold appropriate to the pilot. Microsoft supports count and percentage thresholds for scheduled runs; when both are set, exceeding either one quarantines the workflow. A workflow-specific limit overrides the tenant-wide limit.

Use a small pilot group or narrowly reviewable rule. Wait for a real qualifying event, then compare:

- the evaluated population;
- the users actually processed;
- the task results;
- the downstream changes; and
- the expected schedule and propagation window.

Expand one population boundary or task change at a time.

### Ring 5: decide the source workflow's future

After the clone completes a defined observation window, make an explicit decision:

- keep both because they serve distinct populations;
- promote the clone and disable the source schedule;
- retire the clone and retain the source; or
- redesign because the pilot exposed an unsafe dependency.

Do not leave two enabled workflows with overlapping scope while the team “watches what happens.” Duplicate automation can repeat email, group, access-package, attribute, or offboarding actions.

## Monitor both configuration changes and execution

Cloning creates two evidence streams.

**Configuration evidence** answers who created or modified the clone, which properties changed, and when the workflow or schedule was enabled. Microsoft's [Lifecycle Workflows audit guide](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-audits) documents WorkflowManagement and TaskManagement events, status, failure reason, targets, and initiating actor in Microsoft Entra audit logs.

**Execution evidence** answers which users, runs, and tasks were processed and whether each result succeeded. The [Lifecycle Workflow history reference](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-history) documents summaries by users, runs, and tasks, plus CSV reporting.

During the pilot, review at least:

- creation and later configuration changes to the clone;
- enabled-state and scheduling-state changes;
- execution-condition and task-version changes;
- on-demand executions and their initiating administrator;
- scheduled user counts compared with the approved range;
- failed, unprocessed, or repeated tasks; and
- source and clone scope overlap.

Export evidence before your retention window expires if incident response, audit, or compliance obligations require it.

## Troubleshoot the failures that cloning exposes

### The Clone action is missing

Confirm that you are in **ID Governance > Lifecycle workflows > Workflows**, that the tenant has the required Entra ID Governance or Entra Suite licensing, and that your active account has at least the Lifecycle Workflows Administrator role. Cloning is portal-only; do not look for a dedicated Microsoft Graph clone endpoint.

### The portal will not create the clone

Check the display name first. Workflow display names must be unique. Then review required execution conditions and task configuration before retrying. Preserve the failed attempt's visible error and correlation details for escalation; do not simplify the workflow by deleting controls at random.

### Execution User Scope contains unexpected users

Disable or keep scheduling disabled. Compare the complete scope rule, trigger, selected group, timing, and current user attributes with the source baseline. Check for a retroactive window and stale upstream attributes. Fix one condition, re-open the scope view, and reconcile the entire list again.

### The on-demand test processed someone outside the rule

That is documented behavior. On-demand execution does not require the selected user to meet the workflow's execution conditions. Treat this as a selection-control failure, preserve the run and task evidence, and reverse completed workload changes through their owning systems.

### The clone was quarantined

Do not approve it immediately. Compare the expected population with the threshold and current execution scope. Correct the rule or threshold through change control. Approval returns the workflow to its normal schedule; it does not repair a bad scope.

### The clone and source both processed the same user

Disable the next scheduled path, preserve both run histories, and identify which tasks completed in each workflow. Do not assume that a repeated task is harmless. Reverse downstream effects based on task and workload evidence, then redesign the scopes so the intended ownership boundary is explicit.

## Roll back the clone without losing evidence

Use the smallest containment action that addresses the failure:

1. **Stop future scheduled evaluation:** disable the clone's schedule.
2. **Stop on-demand execution too:** disable the workflow.
3. **Stop queued or in-progress work:** cancel the run where the documented run state permits it.
4. **Preserve evidence:** export workflow history and retain relevant Entra audit events.
5. **Reverse completed side effects:** use the owning workload's approved recovery procedure.
6. **Return to the source:** keep or re-enable the original only after verifying that its configuration and scope remain known-good.

Deleting the clone is cleanup, not task rollback. Microsoft's [workflow deletion guide](https://learn.microsoft.com/en-us/entra/id-governance/delete-lifecycle-workflow) says deleted workflows enter a 30-day soft-delete state and can be restored during that period. Restoring a workflow restores the control-plane object; it does not undo or replay directory and workload changes that tasks already completed.

## Cloned Lifecycle Workflow admin checklist

- [ ] Define the clone's population, purpose, owner, and retirement decision
- [ ] Confirm GA status, Entra ID Governance or Entra Suite licensing, and administrator role
- [ ] Record the source workflow name, object ID, version, state, scope, trigger, tasks, and history
- [ ] Decide whether a clone, version change, template, or Graph-created workflow is the right action
- [ ] Give the clone a unique operational name and description
- [ ] Compare every cloned field with the approved change
- [ ] Keep the schedule disabled during review and testing
- [ ] Reconcile Execution User Scope with an independent roster
- [ ] Test positive, negative, privileged, and stale-attribute cases
- [ ] Treat on-demand execution as a manual scope bypass
- [ ] Verify every task in Workflow history and its owning workload
- [ ] Configure a scheduled-run threshold appropriate to the pilot
- [ ] Monitor configuration and execution as separate evidence streams
- [ ] Prove containment and task-specific recovery before expansion
- [ ] Remove source-and-clone scope overlap before both can run
- [ ] Make an explicit keep, promote, retire, or redesign decision

The Clone button saves build time. It does not transfer confidence. Confidence comes from knowing exactly what was copied, changing only what the new purpose requires, proving who can be selected, observing what every task does, and keeping a clean path back to the known-good source.
