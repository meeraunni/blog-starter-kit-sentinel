---
title: "Entra Backup and Recovery"
excerpt: "A technical document for Microsoft Entra administrators covering how Microsoft Entra Backup and Recovery works, what it can recover, supported objects and properties, difference reports, recovery behavior, soft deletion, troubleshooting, and operational design guidance."
coverImage: "/assets/blog/entra-backup-recovery/cover.svg"
date: "2026-03-28T20:30:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/entra-backup-recovery/cover.svg"
---

## Why this feature matters

Microsoft Entra Backup and Recovery is not just another recycle-bin view in the admin center. As Microsoft explains in the [overview](https://learn.microsoft.com/en-us/entra/backup/overview), it is a built-in backup and recovery capability that lets administrators recover supported Microsoft Entra directory objects to a previously known-good state after accidental change or security compromise.

That distinction matters because the service is doing more than restoring deleted objects. The backup engine also compares current tenant state with a historical snapshot and applies a recovery action based on the type of drift that occurred since the backup.

The right technical question is therefore not "Can Entra restore deleted objects?" The better question is:

**How does Microsoft Entra Backup and Recovery model state, detect drift, and apply recovery actions across supported object types?**

That is the question this article answers.

![Microsoft Entra Backup and Recovery](/assets/blog/entra-backup-recovery/cover.svg)

## What Microsoft Entra Backup and Recovery actually does

As documented in the [overview](https://learn.microsoft.com/en-us/entra/backup/overview), Microsoft Entra Backup and Recovery currently:

- runs automatically once per day
- retains up to five days of backup history
- stores backups in the same geo-location as the tenant
- prevents signed-in users and apps, even highly privileged ones, from turning off, deleting, or modifying the backups

That tells you something important about the backend design. This is a **Microsoft-controlled snapshot service**, not a customer-managed export job. Administrators consume backup points and recovery workflows, but they do not own the scheduling engine or the backup storage lifecycle.

From an operations perspective, that means:

- you do not configure backup frequency
- you do not prune backup points
- you do not upload or import backup sets
- you work within Microsoft’s fixed retention and recovery model

As mentioned [here](https://learn.microsoft.com/en-us/entra/backup/view-available-backups), each backup is a point-in-time view of supported tenant objects and attributes, with one backup created per day and retained for five days.

## Tenant and role prerequisites

The feature is still in preview, and Microsoft is explicit about the operating boundary in the [overview](https://learn.microsoft.com/en-us/entra/backup/overview) and [troubleshooting guide](https://learn.microsoft.com/en-us/entra/backup/troubleshooting):

- only workforce tenants are supported
- External ID and Azure AD B2C tenants are not supported
- the tenant must have Microsoft Entra ID P1 or P2 licensing
- admins need either `Microsoft Entra Backup Reader`, `Microsoft Entra Backup Administrator`, or `Global Administrator`

Role separation is meaningful here.

As Microsoft documents [here](https://learn.microsoft.com/en-us/entra/backup/overview):

- `Microsoft Entra Backup Reader` can view backups, review difference reports, and review recovery history
- `Microsoft Entra Backup Administrator` can also create difference reports and trigger recovery

That separation is operationally useful because it allows a review workflow where one team investigates drift and a smaller set of admins is allowed to initiate recovery.

## The recovery model is state-based, not object-cloning

The most important page in the document set is the [backup, difference report, and recovery model](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model).

Microsoft defines the recovery action based on what changed since the backup:

- if an object was added after the backup, recovery soft-deletes it
- if an object was updated, recovery updates the object back to the backup value
- if an object was soft-deleted, recovery restores it
- if an object was restored after the backup, recovery soft-deletes it again

This is the real backend behavior that admins need to understand.

Microsoft Entra Backup and Recovery is not replaying a full tenant image. It is evaluating the delta between a backup point and the current tenant state, then applying object-level remediation actions to supported objects and supported attributes.

That also explains two architectural limits Microsoft calls out directly in the same article:

- it **does not create new objects**
- it **does not hard-delete objects**

So if an admin expects this feature to reconstruct a hard-deleted object from nothing, that expectation is wrong. Microsoft says this directly [here](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model).

## Soft deletion is the foundation of the recovery system

Microsoft’s [soft deletion article](https://learn.microsoft.com/en-us/entra/backup/soft-deletion) is important because it explains the lower-level object lifecycle that Backup and Recovery builds on.

When an object that supports soft delete is deleted:

- the object is no longer active for authentication or authorization
- Microsoft Entra retains the object data for 30 days
- the object can be restored during that retention window

This matters because Backup and Recovery uses soft delete as one of its recovery actions. If drift analysis determines that an object exists now but should not exist relative to the selected backup, the service can move that object into a soft-deleted state. If an object was soft-deleted after the backup but existed at the backup point, the service can restore it.

This is why Microsoft describes soft deletion as a foundational capability [here](https://learn.microsoft.com/en-us/entra/backup/soft-deletion).

## Supported object types are broader than many admins expect, but not complete

Microsoft documents the current scope in the [overview](https://learn.microsoft.com/en-us/entra/backup/overview) and the more detailed [supported objects and recoverable properties](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations) article.

Supported object categories include:

- users
- groups
- applications
- service principals
- Conditional Access policies
- named location policies
- authentication methods policy
- authorization policy
- organization

But the important engineering detail is this:

**support is property-based, not "full object rollback" across every possible field.**

Microsoft states that recovery applies only to the supported properties listed in the article and does not imply full object rollback [here](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations).

That single sentence is one of the most important constraints in the whole feature.

## What is actually in scope for recovery

### Users

Microsoft lists supported user properties in the [supported objects article](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations), including:

- `AccountEnabled`
- `DisplayName`
- `UserPrincipalName`
- `Mail`
- `Department`
- `JobTitle`
- `UsageLocation`
- `PerUserMfaState`

But Microsoft also explicitly says that **manager and sponsor changes are not in scope**.

That means a user object can be partially recoverable while relationship data around that object is still outside recovery scope.

### Groups

Group support includes properties such as:

- `DisplayName`
- `Description`
- `Mail`
- `MailEnabled`
- `SecurityEnabled`

But Microsoft notes [here](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations) that:

- group ownership changes are not in scope
- dynamic group rule changes are not in scope

This is a good example of why admins should not read "groups are supported" too casually. Group existence and some attributes are recoverable. Ownership and dynamic rule logic are different questions.

### Conditional Access and named locations

For Conditional Access policies and named locations, Microsoft states that **all properties are in scope** in the [supported objects article](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations).

That is a strong capability and one of the highest-value parts of the feature, because Conditional Access mistakes can break tenant-wide sign-in.

### Authentication methods policy

Microsoft says recovery supports these policy families [here](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations):

- email one-time passcode
- FIDO2 passkey
- Authenticator app
- voice call
- SMS
- third-party software OATH
- Temporary Access Pass
- certificate-based authentication

This matters operationally because a bad authentication-methods change can affect registration and sign-in paths across the tenant, not just one admin blade.

### Applications

Microsoft documents a defined set of supported application properties, such as:

- `DisplayName`
- `Description`
- `RequiredResourceAccess`
- `SignInAudience`
- `OptionalClaims`
- `GroupMembershipClaims`
- `ServicePrincipalLockConfiguration`

That is meaningful, but still bounded. It is not the same as "the entire application object is always fully restorable in every dimension."

### Service principals and related permissions

The service principal section is especially important.

Microsoft states [here](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations) that service principal recovery is the anchor for related permissions, and when a service principal is recovered, Backup and Recovery also restores:

- OAuth2 permission grants where the recovered service principal is the target object
- app role assignments where the recovered service principal is the target object

But Microsoft also adds an important constraint:

- only admin-created delegated grants in scope as `consentType = AllPrincipals` and `principalId = null` are supported
- user-consent-generated OAuth2 permission grants are not supported

That is the kind of detail that changes the real-world recovery story. If your app relied heavily on user-consented delegated permissions, you should not assume this feature fully reconstructs that consent landscape.

### Organization and authorization policy

Microsoft also supports selected tenant-level settings in the `organization` object and `authorization policy`, including items such as:

- guest user role behavior
- tenant-level per-user MFA settings under `StrongAuthenticationDetails`
- pieces of `StrongAuthenticationPolicy`

Again, the key takeaway is selective tenant-state recovery, not universal rollback.

## Difference reports are the control point before recovery

The operational heart of the feature is the difference report.

As Microsoft explains in [Create and review difference reports](https://learn.microsoft.com/en-us/entra/backup/create-review-difference-reports), a difference report compares the current tenant state with a selected backup and shows objects that were:

- created
- modified
- soft-deleted
- restored

It also shows:

- changed attributes
- changed links such as group membership

This is the part of the feature admins should treat as their preview and validation stage before writing changes back into the tenant.

Microsoft’s guidance is explicit [here](https://learn.microsoft.com/en-us/entra/backup/overview): always run a difference report, review the changes, and then decide what to recover.

### Scoping options

Microsoft allows you to scope difference reports in three ways [here](https://learn.microsoft.com/en-us/entra/backup/create-review-difference-reports):

- all supported objects
- by object type
- by object ID

For object ID scoping, Microsoft allows up to 100 object IDs across supported object types.

That gives you a useful recovery pattern:

- use broad reports when you suspect wide tenant drift
- use narrow reports when you know the incident domain, such as Conditional Access only
- use object ID scope for surgical investigation of one critical object

### Why the first report is slower

Microsoft explains in the [recovery model article](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model) that the first time you create a difference report against a given backup, the backup data first has to be loaded before comparison starts.

Microsoft’s documented planning estimates are:

- up to 1 hour for smaller tenants
- up to 2.5 hours for very large tenants

The second report against the same backup is faster because the data-loading step is reused.

This is not just a UX detail. It reveals the processing model:

1. load backup dataset
2. compute drift against current tenant state
3. materialize a report

That is why Microsoft also notes that for 100,000 object and/or link changes, full report generation can take around 45 minutes, as mentioned [here](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model).

## Only one job runs at a time

This is one of the most operationally important limits.

Microsoft states in both the [recovery model article](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model) and the [recover objects article](https://learn.microsoft.com/en-us/entra/backup/recover-objects) that only **one job can run at a time**, including:

- difference reports
- recovery jobs

That means an active report blocks recovery startup, and an active recovery blocks new reporting.

From an incident-response perspective, this matters because:

- you cannot parallelize multiple recovery investigations in the same tenant
- your team needs to coordinate who owns the active job
- broad exploratory reports can delay urgent surgical recovery if launched carelessly

## How recovery is actually executed

Microsoft documents two recovery entry points in [Recover objects](https://learn.microsoft.com/en-us/entra/backup/recover-objects):

- recover from a completed difference report
- recover directly from a backup

The safer path is usually the first one, because you have already reviewed the drift.

### Recover from a difference report

When you recover from a difference report:

- the recovery reuses the scope of that report
- you cannot apply different filters at recovery time
- you can recover a single high-priority object from the changed attributes panel

The single-object recovery path is important for practical operations because it lets you avoid a full scoped recovery job when one object is the actual outage cause.

### Recover directly from a backup

Microsoft also lets you recover directly from a backup with scope filters:

- all supported objects
- only certain object types
- only specific object IDs

But Microsoft gives a clear warning [here](https://learn.microsoft.com/en-us/entra/backup/recover-objects): recovery actions apply directly to the tenant and cannot be undone automatically.

That warning should change admin behavior. This is not a "test restore" workflow. This is a live control-plane mutation.

## The subtle but critical point about point-in-time reports

One of the easiest mistakes to make is to treat the difference report as if it were a frozen recovery plan.

Microsoft says something very important in [Recover objects](https://learn.microsoft.com/en-us/entra/backup/recover-objects): difference reports are point-in-time comparisons, and if objects are modified after the report is created, those later changes are not reflected in the report. Recovery still applies to the tenant’s **most current state**.

That means:

- the report is an analysis artifact
- the recovery job is still applied to live, current tenant state
- more drift can happen between report generation and recovery start

This is the kind of backend detail that can surprise admins in a fast-moving incident. If many changes are happening, create the report, review it quickly, and recover with clear control over concurrent admin activity.

## What you can see in backups and history

As documented in [View available backups](https://learn.microsoft.com/en-us/entra/backup/view-available-backups), the Backups page shows:

- available backups for the last five days
- backup timestamps
- backup IDs

From there, you can start either a difference report or a recovery.

The [Recovery History](https://learn.microsoft.com/en-us/entra/backup/review-recovery-history) page then shows:

- recovery status
- the backup point used
- recovery start and completion time
- number of objects and links modified

Microsoft also notes that recovery history is retained for five days after completion.

That short retention window means recovery history is useful for recent operations and troubleshooting, but not as a long-term audit system by itself.

## What the feature still does not solve

The limitations section in [Supported objects and recoverable properties](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations) and the [recovery model article](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model) is where admins need to be especially disciplined.

### Hard-deleted objects are not recoverable

Microsoft states this repeatedly:

- hard-deleted objects cannot be recovered
- Backup and Recovery does not recreate hard-deleted objects
- only soft-deleted or modified objects can be restored

That is not a minor exception. It is a design boundary.

### On-premises synchronized objects show up in reports but are not recoverable here

Microsoft explains [here](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model) that synchronized users and groups from on-premises AD can appear in difference reports, but recovery is not supported through this feature because the source of authority remains on-premises Active Directory.

This is exactly the right behavior architecturally. Drift can be detected in Entra, but authoritative restoration must happen where the object is mastered.

### Supported object does not mean every property is supported

Microsoft’s supported-object page is explicit that:

- some relationships are not in scope
- some rule logic is not in scope
- some permission grant scenarios are not in scope

This means backup coverage should be interpreted at the attribute level, not only at the object-type label.

## Troubleshooting the feature the way Microsoft documents it

The [troubleshooting article](https://learn.microsoft.com/en-us/entra/backup/troubleshooting) is more useful than it looks, because it tells you what failures Microsoft expects in real tenants.

### Issue: no backups are listed

Microsoft says fewer than five visible days or duplicate-looking timestamps can happen during onboarding or transient backend conditions, and this does not indicate data loss or backup failure. Microsoft’s documented resolution is effectively to wait; the service continues creating new backups automatically.

That is useful because it tells you not to overdiagnose temporary backup-list gaps during early service initialization.

### Issue: a difference report or recovery job will not start

Microsoft’s documented root causes are:

- another job is already running
- the admin lacks the required role
- the object type is not supported in the current release

This maps directly to the service design:

- global tenant job lock
- role-gated operations
- preview-limited object coverage

### Issue: expected changes are missing from a difference report

Microsoft’s troubleshooting guidance says to verify:

- the object type and property are supported
- the object really changed after the backup
- the missing item was not hard-deleted

That tells you the diagnostic order. First validate scope, then timing, then deletion type. Do not assume the report is wrong before checking whether the change actually falls inside product scope.

### Issue: long-running jobs

Microsoft’s guidance here is straightforward and consistent with the backend model:

- large tenants take longer
- large change sets take longer
- first use of a backup is slower because of data loading

If the job eventually completes, this is usually a scale-and-processing issue, not necessarily a service fault.

### Issue: recovery completed with warnings or did not restore what you expected

The documentation points you back to the scope boundaries:

- unsupported objects or attributes are not recovered
- objects may have changed after the report was created
- hard-deleted objects are not recoverable

That is why difference report review and controlled timing are so important.

## Operational guidance for Entra administrators

If I were advising an Entra operations team on how to use this feature well, the working model would be:

1. Treat backups as Microsoft-managed recovery points, not as customer-owned exports.
2. Start with a difference report unless the incident is so urgent that direct recovery is justified.
3. Scope narrowly when possible, especially for Conditional Access, named locations, or a small set of critical objects.
4. Remember that reports are point-in-time comparisons, but recovery is applied to current tenant state.
5. Do not assume object support means every property and relationship is recoverable.
6. Do not assume hard delete is reversible.
7. Coordinate incident response because only one report or recovery job can run at a time.

## The practical value of the video walkthrough

The video you linked, [here](https://www.youtube.com/watch?v=72nowrDIlQU), is useful in combination with the Microsoft documentation because it helps visualize the admin workflow:

- inspect backups
- generate a difference report
- review scope and changed objects
- recover either the selected scope or a specific object
- verify the result in recovery history

That workflow matches the Microsoft documentation set closely. The value is not just knowing where the buttons are. The value is understanding the service semantics behind those buttons.

## Final takeaway

Microsoft Entra Backup and Recovery is a real recovery control plane for supported Entra objects, but it is not an unlimited tenant rollback engine.

Its actual behavior, as documented by Microsoft, is:

- one automatic backup per day
- five days of retention
- state comparison through difference reports
- recovery actions driven by object drift
- soft-delete-aware restore and rollback behavior
- strict limits around hard deletes, synced objects, unsupported attributes, and one-job-at-a-time execution

If an Entra administrator understands those mechanics, they can use the feature properly:

- to review tenant drift
- to restore supported objects and properties safely
- to recover from bad changes without guessing
- and to avoid assuming the product can do things Microsoft never said it can do

That is the level at which this feature should be operated.

## References

- [Microsoft Entra Backup and Recovery overview](https://learn.microsoft.com/en-us/entra/backup/overview)
- [Backup, difference report, and recovery model](https://learn.microsoft.com/en-us/entra/backup/backup-difference-report-recovery-model)
- [Supported objects and recoverable properties](https://learn.microsoft.com/en-us/entra/backup/scope-supported-objects-limitations)
- [Soft deletion in Microsoft Entra Backup and Recovery](https://learn.microsoft.com/en-us/entra/backup/soft-deletion)
- [View available backups](https://learn.microsoft.com/en-us/entra/backup/view-available-backups)
- [Create and review difference reports](https://learn.microsoft.com/en-us/entra/backup/create-review-difference-reports)
- [Recover objects](https://learn.microsoft.com/en-us/entra/backup/recover-objects)
- [Review recovery history](https://learn.microsoft.com/en-us/entra/backup/review-recovery-history)
- [Troubleshoot Microsoft Entra Backup and Recovery](https://learn.microsoft.com/en-us/entra/backup/troubleshooting)
- [Video walkthrough](https://www.youtube.com/watch?v=72nowrDIlQU)
