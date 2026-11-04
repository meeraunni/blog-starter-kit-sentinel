---
title: "Microsoft Entra Lifecycle Workflows: Update Attributes"
excerpt: "Configure Microsoft Entra Lifecycle Workflows to update user attributes safely, test set and clear operations, monitor evidence, and plan rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-04T17:25:45-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The **Microsoft Entra Lifecycle Workflows Update user attributes** task can set or clear as many as 10 user attributes when a joiner, mover, or leaver workflow runs. In the current public preview, it supports built-in attributes, on-premises extension attributes, and directory extensions for cloud-managed users; for users synchronized from Active Directory, it supports directory extension attributes only. Custom security attributes are not supported.

That is the short answer. The safe answer is to treat every configured value as a directory write with downstream consequences. Capture the old values, separate cloud-managed from synchronized identities, test one disposable pilot at a time, verify every resulting attribute, and keep scheduling off until the workflow history and downstream systems agree with the change record.

Grab a coffee before using an empty value to tidy up a leaver profile. Microsoft documents an empty value as a request to **clear** the attribute, not as a harmless omission. A successful clear can change a dynamic-group rule, an application provisioning mapping, an address list, an access decision, or another lifecycle workflow. The task changes the directory value; it does not discover every system that consumes it or reconstruct the previous value for you. ([Update user attributes with Lifecycle Workflows](https://learn.microsoft.com/en-us/entra/id-governance/how-to-lifecycle-workflow-update-user-attributes))

Microsoft's current release record and the admin-center screenshot in the dedicated configuration guide label the feature **public preview**. They do not publish a general-availability date, mandatory-enforcement date, default-on change, or tenant rollout ring for this task. Recheck the live documentation and your tenant before each production expansion. ([Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#public-preview---automate-setting-or-clearing-user-attributes-values-in-lifecycle-workflows))

> **Documentation and testing boundary:** this guide is based on Microsoft's public documentation as of November 4, 2026. It does not claim hands-on testing in a Microsoft Entra tenant. Attribute ownership, workflow scope, downstream dependencies, licenses, preview availability, and rollback procedures remain tenant-specific and need an approved pilot.

## Microsoft Entra Lifecycle Workflows update user attributes safely

The control plane has four separate decisions:

1. **Selection:** the workflow trigger and execution conditions determine which identities are scheduled.
2. **Execution:** the Update user attributes task applies its configured attribute-and-value pairs to each processed identity.
3. **Consumption:** dynamic groups, provisioning services, applications, reports, and other automation read the resulting directory state on their own schedules.
4. **Recovery:** your change process restores a captured prior value or applies an approved replacement; the task is not a point-in-time restore system.

Keep those stages separate during testing. A correct scope preview does not prove the write is supported for that identity's source of authority. A completed task does not prove every downstream consumer accepted the new value. A corrected workflow does not reverse a value written by an earlier run.

If the service itself is new to your team, start with the site's [Lifecycle Workflows joiner-mover-leaver introduction](/posts/what-are-entra-lifecycle-workflows-beginners-guide). This guide serves the narrower intent: configure, test, monitor, troubleshoot, and recover the attribute-write task.

## Know which attributes the task can change

Microsoft's current support boundary is compact but easy to misread.

### Cloud-managed users

For a cloud-managed user, the task supports:

- built-in user attributes such as `department`, `jobTitle`, and `employeeLeaveDateTime`;
- on-premises extension attributes such as `extensionAttribute1` through `extensionAttribute15`; and
- directory extension attributes.

### Users synchronized from on-premises Active Directory

For a synchronized user, the task supports **directory extension attributes only**. A synchronized identity appearing in the workflow scope does not make its built-in attributes writable by this task. Keep the authoritative HR, Active Directory, and synchronization path in control of the attributes they own.

The site's [Workday termination lookahead guide](/posts/microsoft-entra-workday-termination-lookahead) shows why source timing matters for `employeeLeaveDateTime`. An upstream connector calculating a lifecycle date and a downstream workflow writing a value are different operations; do not create a loop in which two systems alternately correct one another.

### Unsupported and bounded cases

Custom security attributes are not supported. One task instance can update or clear at most 10 attributes. For a datetime attribute, Microsoft allows either a specific date or `system.now`; `system.now` records the date when the task is processed, not the employee event's originally planned time. ([supported attributes and limits](https://learn.microsoft.com/en-us/entra/id-governance/how-to-lifecycle-workflow-update-user-attributes#supported-attributes))

> **Analysis:** use `system.now` only when processing time is the business fact you intend to record. If the authoritative fact is a hire, transfer, or termination time supplied by HR, preserve that authoritative timestamp instead of silently replacing it with workflow execution time.

## Define the write contract before opening the portal

For each attribute, write down this small contract:

- **Identity population:** cloud-managed, synchronized, guest, administrator, service identity, or another governed class.
- **Authoritative source:** HR, Active Directory, Microsoft Entra, an application, or an approved manual process.
- **Operation:** set a fixed value, set a specific datetime, use `system.now`, or clear the current value.
- **Trigger and scope:** the lifecycle event and rule that should select the identity.
- **Consumers:** dynamic groups, Conditional Access filters, provisioning mappings, applications, address lists, reports, access packages, or other workflows.
- **Success evidence:** the expected directory value, workflow task result, audit event, and workload-local outcome.
- **Prior value:** the exact value captured immediately before the pilot.
- **Recovery owner:** the team authorized to restore the value and validate every affected consumer.

Do not bundle unrelated business changes merely because the task allows 10 attributes. A department change, termination timestamp, application-routing extension, and reporting flag can have different owners, evidence, and recovery paths. Smaller task instances make partial failure and rollback easier to reason about.

Also decide whether the workflow should stop when this task fails. The Microsoft task definition includes the common `continueOnError` setting. A later email can be safe after an attribute-write failure; a later access-removal or provisioning action might produce an inconsistent lifecycle state. Choose the behavior from the business transaction, not from a preference to make the run look green. ([Lifecycle Workflows tasks and definitions](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-tasks#update-user-attributes))

## Pass the preview, license, role, and scope gates

The feature requires Microsoft Entra ID Governance or Microsoft Entra Suite licensing. The documented portal procedure requires at least **Lifecycle Workflows Administrator**. Confirm the actual benefit assignment and role activation for the pilot identities and operator; a visible blade is not proof that every processed user is correctly licensed. ([Microsoft Entra ID Governance licensing fundamentals](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals))

Before creating the task:

1. Record that the task is public preview and obtain the organization's preview-use approval.
2. Export the current workflow version, task order, execution conditions, and scheduling state.
3. Produce an independently approved pilot roster; do not derive the approval list from the same rule being tested.
4. Export the pilot users' current values and source-of-authority state.
5. Identify every known consumer of each attribute.
6. Keep privileged, emergency-access, shared, service, and executive identities out of the first pilot.
7. Assign an owner to containment, restoration, and downstream verification.

If a delegated team will operate the workflow, use the site's [delegated Lifecycle Workflows administration guide](/posts/delegate-microsoft-entra-lifecycle-workflows-administration) to separate administrative-unit scope, workflow administration, and execution scope. Delegating the workflow does not delegate ownership of every application that consumes the changed attribute.

## Configure the Update user attributes task in the portal

Microsoft's current portal path is:

1. Sign in to the Microsoft Entra admin center with the approved role.
2. Browse to **ID Governance > Lifecycle workflows > Workflows**.
3. Open the intended workflow or create a new one.
4. Open **Tasks**, select **Add task**, and choose **Update user attributes (Preview)**.
5. Select each attribute and provide its approved value. Leave the value empty only when the approved operation is to clear that attribute.
6. Set a descriptive task name and description that identify the business operation and owner.
7. Review task order and failure behavior, then select **Save**.

Capture the before and after configuration, workflow identifier, version, operator, time, ticket, selected attributes, values, clear operations, task order, and scheduling state. Do not put secrets, access tokens, passwords, personal recovery data, or confidential free-form content into an attribute simply because the UI accepts a string.

Adding or changing tasks creates a new workflow version in the portal. Microsoft keeps version details such as who created or modified the version, its execution conditions, and its tasks. Compare the new version with the approved design before enabling scheduling. ([Lifecycle Workflows versioning](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-versioning))

If you are starting from an existing workflow, the site's [safe workflow cloning guide](/posts/clone-microsoft-entra-lifecycle-workflow-safely) provides a bounded way to preserve the known-good source while testing a new task sequence.

## Use Microsoft Graph without inventing the payload

Microsoft publishes a v1.0 task definition for automation. The documented task definition ID is `2c8f4a1b-7d3e-4f9c-8a5b-6e1d2c3f4a5b`, and the argument name is `attributeUpdates`. Its value is a **JSON string** containing the attribute-and-value pairs, not a nested JSON array supplied directly to the outer request.

The task portion of a request follows this shape:

```json
{
  "continueOnError": false,
  "description": "Set approved mover attributes",
  "displayName": "Update user attributes",
  "isEnabled": true,
  "taskDefinitionId": "2c8f4a1b-7d3e-4f9c-8a5b-6e1d2c3f4a5b",
  "arguments": [
    {
      "name": "attributeUpdates",
      "value": "[{\"attribute\":\"department\",\"value\":\"Sales\"},{\"attribute\":\"jobTitle\",\"value\":\"Account Executive\"}]"
    }
  ]
}
```

That example uses the current Microsoft-published attribute pair and encoding pattern. Validate generated JSON twice: first parse the outer request, then parse the `attributeUpdates` string and compare its exact pairs with the approved manifest. Do not guess a Graph clear-value representation from the portal's empty field; use a currently documented API shape or the documented portal path for a clear operation.

For creating a workflow, Microsoft documents `LifecycleWorkflows-Workflow.ReadWrite.All` as the least-privileged delegated or application permission. A delegated caller also needs a supported Entra role, with Lifecycle Workflows Administrator identified as the least privileged. Microsoft Graph updates to tasks or execution conditions require the workflow versioning path rather than silently editing the current version. ([create workflow permissions](https://learn.microsoft.com/en-us/graph/api/identitygovernance-lifecycleworkflowscontainer-post-workflows?view=graph-rest-1.0), [workflow versioning behavior](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-versioning#workflow-properties-and-versions))

Feature lifecycle and API lifecycle are separate facts. A v1.0 Graph endpoint does not turn the Update user attributes task into a generally available feature.

## Pilot set and clear operations without trusting the rule

Microsoft allows an enabled workflow to run on demand for up to 10 users at a time. The important warning is that an on-demand run **does not evaluate whether the selected user meets the workflow's execution conditions**. It is useful for a controlled pilot and dangerous as an informal shortcut. ([run a workflow on demand](https://learn.microsoft.com/en-us/entra/id-governance/on-demand-workflow))

Use this sequence:

### Ring 0: prove the baseline

Select one disposable cloud-managed test identity. Capture its object ID, source-of-authority state, current attribute values, group memberships influenced by those values, provisioning state, and any application record that should respond.

### Ring 1: set one low-risk attribute

Add one approved set operation to a dedicated test workflow. Enable the workflow only as required for on-demand execution, keep scheduling off, select the exact pilot identity, and have a second operator compare the object ID with the change record before running it.

Verify the new directory value, task result, directory audit event, and every known downstream consumer. Record propagation time rather than repeatedly editing the task while other systems are still processing the first change.

### Ring 2: restore the original value

Apply the documented recovery value from the baseline. Confirm that the directory and downstream consumers return to their approved state. A pilot that proves the forward write but not restoration is incomplete.

### Ring 3: test an approved clear

Use a different disposable attribute with a known nonempty value. Capture it, configure the empty value through the documented portal path, run the pilot, and prove that the value is actually absent. Restore it and revalidate downstream state.

### Ring 4: test identity-source boundaries

Use a synchronized pilot only for a directory extension supported by the current documentation. Confirm that the same workflow does not attempt an unsupported built-in attribute operation for that identity class. Split workflows by ownership where necessary.

### Ring 5: enable a narrow schedule

Inspect the execution population immediately before scheduling. Start with a small business population and a change window in which the directory, provisioning, application, and recovery owners are available. Expand only after the selected population, written values, history, audit trail, and downstream behavior all agree.

## Monitor the write and its consequences

Lifecycle Workflow History provides user, run, and task views. Use the user view to prove who was processed, the run view to identify batch status, and the task view to isolate failures. Microsoft documents statuses including Completed, Completed with errors, Failed, Canceled, Queued, and In progress. A **Completed** run means the configured tasks completed; it does not prove the business value was correct. ([Lifecycle Workflow History](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-history))

Microsoft also records Lifecycle Workflows actions in the directory audit log. Filter on the Lifecycle Workflow service and retain status, status reason, targets, actor, and time. Current workflow history and audit views expose a 30-day window; export the approved evidence when the organization's retention requirement is longer. ([Auditing Lifecycle Workflows](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-audits), [download workflow history](https://learn.microsoft.com/en-us/entra/id-governance/download-workflow-history))

For each production run, reconcile four evidence sets:

- the approved population and intended values;
- the workflow user, run, and task results;
- the final Microsoft Entra values and audit events; and
- the downstream consumer outcomes.

Do not reduce the control to a run-count dashboard. The most dangerous failure can be a perfectly successful write to the wrong user or a technically correct value that changes access in an unreviewed consumer.

## Roll back without pretending the task is transactional

Microsoft's public documentation does not promise that the task snapshots prior values, rolls back downstream systems, or makes a multi-attribute business transaction atomic. Design recovery accordingly.

When an incorrect run is discovered:

1. Cancel a queued or in-progress run to stop work that has not yet processed.
2. Disable scheduling or correct the workflow before the next evaluation.
3. Export workflow history and audit evidence.
4. Identify every user and every attribute already changed.
5. Restore captured prior values through the approved source-of-authority path.
6. Reconcile dynamic groups, provisioning jobs, applications, access packages, reports, and other workflows.
7. Create a new tested workflow version before resuming.

Cancellation is containment, not rollback. Disabling a task prevents future writes; it does not restore past values. Re-entering a value in Microsoft Entra is not a complete recovery when an authoritative source will overwrite it or a downstream system has already acted on the earlier state.

> **Analysis:** attribute rollback is a distributed-state problem. The directory value is the starting point, while the recovery finish line is agreement among the authoritative source, Microsoft Entra, workflow evidence, and every material consumer.

## Troubleshoot the first broken boundary

### Update user attributes does not appear in Add task

Confirm the operator's role, licensing, workflow category, and current tenant experience. Recheck the live documentation because the feature remains preview. Do not manufacture a task definition ID, use an undocumented endpoint, or grant Global Administrator merely to make the option appear.

### The task fails only for synchronized users

Check the attribute type first. Microsoft currently supports directory extension attributes for synchronized users, not built-in or on-premises extension attributes through this task. Move the write to the authoritative source or redesign it around a supported directory extension; do not fight synchronization with repeated cloud writes.

### A value changes and then changes back

Identify the source that owns the property and compare timestamps across HR provisioning, Active Directory synchronization, Graph automation, and Lifecycle Workflows. Stop the competing writer before rerunning anything.

### A datetime is later than the employee event

If the task uses `system.now`, the value reflects processing time. Use a specific approved datetime when the event time—not workflow execution—is the required business fact.

### The run is Completed, but the application still shows the old value

Prove the final Entra value, then inspect the application's provisioning mapping, sync schedule, matching rule, and logs. Workflow completion does not prove that a separate provisioning service or application has consumed the change.

### The wrong attribute was cleared

Contain future execution, identify every processed user from history, and restore the captured values. Do not guess the old value from a report, naming convention, or neighboring user. If the baseline is missing, stop and consult the authoritative owner rather than creating plausible data.

### One configured write fails while later tasks continue

Inspect `continueOnError`, task order, and each user-processing result. Determine whether later actions created an inconsistent lifecycle state. Repair the business transaction in the owning systems before retrying the failed task.

## Update user attributes admin checklist

- [ ] Record the task as public preview; do not imply GA, default-on behavior, or a mandatory date.
- [ ] Confirm Microsoft Entra ID Governance or Entra Suite licensing.
- [ ] Use Lifecycle Workflows Administrator or a narrower approved delegated boundary.
- [ ] Separate cloud-managed and synchronized identities.
- [ ] Use only directory extensions for synchronized users.
- [ ] Exclude custom security attributes.
- [ ] Keep each task at 10 or fewer approved attributes.
- [ ] Treat an empty portal value as an intentional clear operation.
- [ ] Use `system.now` only when processing time is the intended value.
- [ ] Capture original values and every material downstream consumer.
- [ ] Review task order and `continueOnError` behavior.
- [ ] Compare the new workflow version with the approved design.
- [ ] Remember that on-demand execution ignores workflow conditions.
- [ ] Pilot set, restore, clear, and restore operations on disposable identities.
- [ ] Verify user, run, task, audit, directory, and downstream evidence.
- [ ] Keep scheduling off until recovery has been proven.
- [ ] Export evidence when 30 days is shorter than the retention requirement.
- [ ] Recheck current Microsoft documentation before each preview expansion.

## FAQ

### Is Update user attributes generally available?

No. Microsoft's current release notes and dedicated configuration guide label the task public preview. A v1.0 Graph task definition does not change the feature's preview status.

### Can the task update built-in attributes for synchronized users?

No. Microsoft currently documents directory extension attributes as the only supported type for users synchronized from on-premises Active Directory.

### Can it update custom security attributes?

No. Custom security attributes are explicitly unsupported.

### How many attributes can one task update?

Up to 10. Use smaller task instances when attributes have different owners, evidence, or recovery paths.

### Does an on-demand run respect the workflow rule?

No. Microsoft says an on-demand run applies to the users selected by the operator without checking whether they meet the execution conditions. Verify object IDs before running it.

### Does clearing an attribute preserve the old value for rollback?

Microsoft's public task documentation does not promise a rollback snapshot. Export and protect the prior value before the pilot, then restore it through the correct source-of-authority path if needed.

The practical finish line is simple: **the right identity, the right source of authority, the intended value, a bounded pilot, complete evidence, and a recovery path that has already worked once**. That turns a convenient preview task into governed lifecycle automation instead of a fast new way to distribute directory drift.
