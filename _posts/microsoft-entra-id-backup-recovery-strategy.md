---
title: "Microsoft Entra Backup and Recovery: Operating Model, Incident Playbook, and the Limits Microsoft Doesn't Lead With"
excerpt: "An operator's view of Microsoft Entra Backup and Recovery — what it can and cannot do, where it differs from on-prem AD backup, an incident response playbook for accidental bulk changes, and a separation-of-duties workflow for multi-team recovery approval."
coverImage: "/assets/blog/entra-backup-recovery/cover.svg"
date: "2026-05-09T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/entra-backup-recovery/cover.svg"
---

## The recovery story you actually need to tell

A new feature gets announced. The headline reads "Microsoft Entra Backup and Recovery." Everyone breathes a sigh of relief and the recovery section of the disaster-recovery runbook stops being touched. Six months later there's an incident, someone reaches for the runbook, and the team discovers — under real time pressure — that the feature does not do what they thought it did. It does not reconstruct hard-deleted objects, it does not restore the tenant to "yesterday at 3pm," and it does not exempt you from the conditional access policy that's now blocking your own admins from running the recovery action.

Microsoft Entra Backup and Recovery is genuinely useful — but it's a *delta-based reconciliation engine* with specific recovery actions on specific object types, not a tenant-image restore. The teams who get the most out of it are the ones who internalised that distinction before the incident, designed the operating model around it, and wrote the multi-team approval workflow into a document before they needed it. This article is the operator's view.

The Microsoft references are [Backup and Recovery overview](https://learn.microsoft.com/entra/backup/overview), [backup, difference report, and recovery model](https://learn.microsoft.com/entra/backup/backup-difference-report-recovery-model), [soft deletion](https://learn.microsoft.com/entra/backup/soft-deletion), [view available backups](https://learn.microsoft.com/entra/backup/view-available-backups), [troubleshooting](https://learn.microsoft.com/entra/backup/troubleshooting), and the related [restore a deleted user](https://learn.microsoft.com/entra/identity/users/users-restore) page for soft-delete restore semantics.

## The product in one paragraph

Entra Backup and Recovery runs an automatic daily backup of supported tenant objects (users, groups, applications, conditional access policies, named locations, custom security attribute assignments, and a growing list), retains five days of history, stores the backups in the same geo as the tenant, and exposes two main operations: produce a **difference report** between the current state and a chosen backup, then trigger a **recovery action** that applies the documented per-difference-type action (re-create deleted objects via soft-delete restore, revert updates, or soft-delete objects that didn't exist at the backup point). The backups are immutable to anyone signed in to the tenant — including Global Administrators — which is the key security property and the reason it's defensible against rogue-admin scenarios. It does not create wholly new objects from nothing, it does not hard-delete objects, and it does not currently cover every object type in the directory.

## How it differs from on-prem AD authoritative restore

Most administrators carry mental models from on-prem Active Directory recovery, and those models lead to wrong expectations:

| Behaviour | On-prem AD authoritative restore | Entra Backup and Recovery |
|---|---|---|
| Restore unit | A NTDS.dit snapshot, replicated to other DCs | Per-object delta application against current state |
| Hard-deleted object recovery | Yes — restored from the snapshot | No — object must still be soft-deleted within 30-day retention |
| Granularity | Whole forest / domain / OU subtree | Per supported object type |
| Backup ownership | Customer (Windows Server Backup, third-party) | Microsoft (immutable, customer cannot disable) |
| Retention | Customer-decided | 5 days, not adjustable |
| Roll-forward operations | Tombstone lifetime + USN reanimation | Soft-delete restore + property update |
| Authoritative across the directory | Yes | Only within supported object/property scope |

The most consequential difference is the **hard-delete** behaviour. On-prem AD authoritative restore can pull back an object that's been gone for months, as long as your tape rotation includes a date when it existed. Entra cannot. If a user object has been hard-deleted (or soft-deleted more than 30 days ago and aged out of the recycle bin), Entra Backup and Recovery has no operation that brings it back — because the operation it would perform is "restore from soft-delete," and there's no soft-deleted shadow left to restore.

> [!IMPORTANT]
> If your incident playbook contains the words "and then we'll restore the deleted users from yesterday's backup," verify whether those users are *soft-deleted* (recoverable) or *hard-deleted* (gone). The terminology matters more than it sounds.

## What's in scope today, and what isn't

The supported object types and properties have been growing through the preview and into GA. The set as documented in [Backup and Recovery overview](https://learn.microsoft.com/entra/backup/overview) currently includes users, groups (including their memberships), applications and service principals, named locations, conditional access policies, and a defined property set on each. **What it does not cover** (or covers only partially) — and these are the gaps that bite during real incidents — typically includes:

- **Privileged Identity Management role assignments and configurations.** Manage these separately via PIM's own history.
- **Identity Protection risk policies and risky-user / risky-sign-in history.** Out of scope.
- **Authentication Methods policy state changes.** Some property sets covered, others not — verify against the current docs before depending on it.
- **Cross-tenant access settings.** Out of scope.
- **B2B guest user property updates** in some scenarios.
- **Custom security attribute *definitions*.** Assignments are covered; the underlying schema definitions are not.

Treat this list as a moving target. The right operational habit is: every six months, re-read the supported-object documentation and update your DR runbook's "covered / not covered" appendix. Anything not covered needs a manual procedure documented separately.

> [!WARNING]
> Discovering that a critical object type is *not* covered during the incident is the most expensive way to find out. The thirty minutes spent reviewing the supported list during a calm Wednesday afternoon pay for themselves the first time the runbook would have led you down a dead end.

## The recovery actions, in operator terms

When you run a difference report between a backup and the current state, every detected delta lines up with one of four recovery actions:

| Delta type | Action Entra performs | Operator note |
|---|---|---|
| Object existed at backup, deleted since | **Soft-delete restore** | Only works if the object is still in the 30-day soft-delete window |
| Object existed at backup, properties changed since | **Property revert** to backup values | Only the *supported property set* is reverted; out-of-scope properties keep their current values |
| Object didn't exist at backup, exists now | **Soft-delete the object** | Effectively undoes a "new object" change |
| Object was already soft-deleted at backup, now restored | **Soft-delete the object again** | Used when an unauthorised restore needs to be reverted |

The Microsoft reference for these actions is [backup, difference report, and recovery model](https://learn.microsoft.com/entra/backup/backup-difference-report-recovery-model). The implication that catches teams off guard is the third row: **running recovery against a backup older than the creation of a legitimate new object will *delete* that new object**. This is the right behaviour for the design ("restore tenant to its state at the backup point") but it means recovery is destructive in the forward direction as well as the backward direction.

> [!IMPORTANT]
> Always run a *difference report first*, review it object by object, and only then run the recovery action — and run it scoped to the specific objects you intend to remediate, not the whole report.

## A real-feeling incident walkthrough

The scenario, anonymised from a pattern I've seen play out: at 14:30, a junior administrator runs a Graph PowerShell script that's meant to update the department attribute on ~50 users and instead updates `accountEnabled = false` on 4,800 users because of a buggy ForEach loop and an unfiltered query. Within fifteen minutes, the help desk is overwhelmed with "I can't sign in" tickets, the leadership Slack channel lights up, and someone in the identity team reaches for the Backup and Recovery feature.

The right sequence:

### Step 1: Stop the bleeding (5 minutes)

Disable the running script if it's still running. Identify the script's identity (signed-in user or service principal) and revoke its sessions:

```powershell
Connect-MgGraph -Scopes "User.RevokeSessions.All", "Directory.AccessAsUser.All"
Revoke-MgUserSignInSession -UserId "junior.admin@contoso.com"
```

If a service principal performed the action, rotate its credentials and remove the over-privileged role assignment. This stops new damage while you plan the recovery.

### Step 2: Scope the damage (10 minutes)

Query the audit log for what the script actually changed, so you know what to recover:

```kql
AuditLogs
| where TimeGenerated between (datetime(2026-05-09T14:30:00Z) .. datetime(2026-05-09T15:00:00Z))
| where InitiatedBy.user.userPrincipalName == "junior.admin@contoso.com"
| where OperationName == "Update user"
| extend Target = tostring(TargetResources[0].userPrincipalName)
| extend Changes = TargetResources[0].modifiedProperties
| project TimeGenerated, Target, Changes
| order by TimeGenerated asc
```

Save the resulting list. This is your authoritative "objects to evaluate for recovery" set. Do not skip this step; running recovery without it is the path to *also* reverting changes that were legitimate and concurrent.

### Step 3: Choose the recovery point

In the Entra admin centre, open Backup and Recovery → backups list. Identify the most recent backup *before* the incident time. If the script ran at 14:30 and your daily backup runs at 02:00, the 02:00 backup is your recovery point. Anything in the tenant changed *legitimately* between 02:00 and 14:30 will appear in the difference report and will be reverted unless you exclude it.

### Step 4: Generate the difference report, scoped

This is the step that separates "controlled recovery" from "secondary incident." Generate the report against the chosen backup point, then **filter** the report's recovery selection to just the objects in your audit-log query result from step 2. The Microsoft tooling supports per-object selection — don't bulk-apply.

### Step 5: Recovery approval (separation of duties)

Production recovery actions should not be authorised by the same person who diagnosed the incident, and they should not be performed by the person who caused the incident. The minimum approval shape:

- **Diagnostician** (the on-call identity engineer who scoped the damage in steps 1-2). Reads the difference report. Writes the recovery plan.
- **Recovery operator** (a separate engineer with the `Microsoft Entra Backup Administrator` role). Reviews the plan and runs the recovery operation.
- **Recorder** (the incident commander). Documents the plan, the approval, the execution time, and any deviations in the incident ticket.

The two roles `Microsoft Entra Backup Reader` and `Microsoft Entra Backup Administrator` exist specifically to support this separation, as documented in the [overview](https://learn.microsoft.com/entra/backup/overview). Assign the Reader role widely (anyone who might investigate). Assign the Administrator role narrowly (a small named pool, ideally just-in-time via PIM).

### Step 6: Execute, then verify

Run the scoped recovery. Immediately afterwards, run a sample sign-in test for 5-10 of the affected users to confirm they can sign in. Spot-check group memberships if the script had cascading effects. Watch the audit log:

```kql
AuditLogs
| where TimeGenerated > ago(15m)
| where Category == "DirectoryManagement"
| where OperationName has "Restore" or OperationName has "Recovery"
| project TimeGenerated, OperationName, Target = tostring(TargetResources[0].userPrincipalName), Result
| order by TimeGenerated desc
```

### Step 7: Post-incident — close the gap that enabled the script

The recovery is the proximate fix. The underlying issue is that a junior administrator had a permission set that let them update 4,800 user objects without review. Move that role to PIM with eligible-only assignment, require approval for activation, and add a Conditional Access policy that requires phishing-resistant MFA for the activation. The next time someone runs the wrong script, they get a prompt; the time after that, they don't have the right at all.

## Multi-team approval workflow as a written procedure

Most tenants don't have a written workflow for this. They have one written *after* the first incident. Write it before.

The minimum document:

- **Who can trigger a difference report?** (Backup Reader role; wide assignment.)
- **Who can run a recovery action?** (Backup Administrator; narrow, PIM-eligible, JIT activation only.)
- **What approval is required for a recovery action affecting > N objects?** (Pick N for your org — 25 is a reasonable default. Above the threshold, require a named second-approver before running.)
- **Where is the recovery plan documented?** (Incident ticket with a fixed template; the difference report attached as evidence.)
- **What happens if the recovery itself goes wrong?** (Identify the next backup point; identify whether the *failed* recovery itself is now in the audit log; have the rollback procedure pre-written.)
- **What's the post-incident communication?** (Who emails affected users? When? With what wording?)

A document this short can be drafted in an afternoon. The cost of *not* having it is measured in minutes of additional outage per incident.

## Day-to-day operational pattern

Beyond incident response, the feature has a steady-state use that pays for itself: **drift detection**. A weekly difference report against the oldest available backup surfaces accidental and unauthorised changes that would otherwise sit unnoticed.

```powershell
# Pseudo-code; the actual cmdlet surface is evolving — check current Graph PowerShell SDK
Connect-MgGraph -Scopes "EntraBackup.Read.All"
$oldest = Get-MgBeta...EntraBackup | Sort-Object CreatedDateTime | Select-Object -First 1
$diff   = New-MgBeta...EntraBackupDifferenceReport -BackupId $oldest.Id
$diff | Export-Csv weekly-drift-report.csv
```

Triage the CSV against your change-management log. Anything in the diff that isn't in the change log is either: (a) a legitimate change that didn't get logged (process gap), (b) an automated change from a script or workflow you forgot existed (operational hygiene gap), or (c) an actual unauthorised change (incident).

> [!TIP]
> Drift reports also catch the *negative* failure: changes that *should* have happened but didn't, because a runbook silently failed and nobody noticed. If a weekly automation is supposed to set a property and the drift report doesn't show it, the automation is broken.

## Common questions

### Can Backup and Recovery restore Conditional Access policies that were modified or deleted?

Yes, for the property set Microsoft documents as in scope. Run the difference report scoped to the Conditional Access objects, review the proposed reverts, and apply. The most common operational use is reverting a policy that was tightened too far during an incident response and now needs to be relaxed back to its prior state.

### What's the recovery story for hard-deleted users beyond the 30-day window?

There isn't one within the Backup and Recovery feature. If hard-deleted users beyond 30 days are a recoverable scenario you need to support, the answer is *prevention*: lock down the hard-delete permission via PIM, monitor `AuditLogs` for "Delete user" operations with alerting, and never grant hard-delete rights to scripts.

### Is the backup data stored in our tenant's geo?

Yes. Microsoft commits in the [overview](https://learn.microsoft.com/entra/backup/overview) that backups are stored in the same geo as the tenant. This matters for data-residency compliance.

### What licenses are required?

Microsoft Entra ID P1 or P2, per the troubleshooting and overview pages. Workforce tenants only; External ID and B2C tenants are not covered today.

### Can a Global Administrator turn this feature off?

No — that's the explicit immutability property. A signed-in user, even a Global Administrator, cannot disable, delete, or modify the backups. This is the security guarantee that makes the feature defensible against rogue-admin scenarios.

### How does this interact with our existing third-party Entra backup tools?

Most third-party tools were built before the Microsoft-native feature existed, and they used different mechanisms (Graph snapshotting, change-feed monitoring). They are not obsolete — they may cover object types Microsoft doesn't, and they may offer longer retention. The right operating model is to use both: Microsoft-native as the primary, immutable recovery surface for the supported object set, and the third-party tool for whatever gaps remain.

### What's the expected RPO and RTO?

RPO is up to 24 hours (one backup per day). RTO depends on the recovery scope — a small targeted recovery (a few dozen users) takes minutes; a large reconciliation (thousands of objects) can take hours and should be planned in a change window.

## What to take away

Microsoft Entra Backup and Recovery is the right tool for the right job, but only if you understand what job it does. It is a delta-reconciliation engine, not a tenant-image restore. It cannot resurrect hard-deleted objects, it cannot extend its five-day retention, and it does not yet cover every object type in the directory. The operating model that gets the most out of it has three legs: a written multi-team approval workflow with separation of duties, a steady-state weekly drift report against the oldest available backup, and a documented appendix listing exactly which object types are and aren't in scope for *this* tenant *this* quarter. With those three in place, the feature genuinely earns its line in the disaster-recovery runbook. Without them, it's a button that looks reassuring until you press it.

## References

- [Microsoft Entra Backup and Recovery overview — Microsoft Learn](https://learn.microsoft.com/entra/backup/overview)
- [Backup, difference report, and recovery model — Microsoft Learn](https://learn.microsoft.com/entra/backup/backup-difference-report-recovery-model)
- [Soft deletion in Microsoft Entra — Microsoft Learn](https://learn.microsoft.com/entra/backup/soft-deletion)
- [View available backups — Microsoft Learn](https://learn.microsoft.com/entra/backup/view-available-backups)
- [Backup and Recovery troubleshooting — Microsoft Learn](https://learn.microsoft.com/entra/backup/troubleshooting)
- [Restore or remove a deleted user — Microsoft Learn](https://learn.microsoft.com/entra/identity/users/users-restore)
- [Microsoft Entra built-in roles — Microsoft Learn](https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference)
- [Privileged Identity Management — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/privileged-identity-management/pim-configure)
