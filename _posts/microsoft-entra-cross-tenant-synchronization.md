---
title: "Cross-Tenant Synchronization in Microsoft Entra: Multi-Tenant Identity Lifecycle Without the Manual Work"
excerpt: "Cross-Tenant Synchronization (CTS) replaces the manual B2B invite-and-redeem dance with automatic identity provisioning between two Microsoft Entra tenants. This is the operator's view: source and target tenant configuration, sync scope, deprovisioning, and the gotchas that bite real deployments."
coverImage: "/assets/blog/microsoft-entra-cross-tenant-synchronization/diagram.svg"
date: "2026-06-11T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/microsoft-entra-cross-tenant-synchronization/diagram.svg"
---

## The problem CTS actually solves

Most enterprises have more than one Microsoft Entra tenant. A merger left two. A subsidiary keeps its own. A short-lived joint venture has a tenant nobody wants to fold in. Whatever the history, the *people* often need access across the boundary — a shared finance team that lives in one tenant uses an application that lives in another, an engineering team in tenant A collaborates with one in tenant B for six months on a specific product.

The old answer is B2B guest invitations. An admin in the target tenant invites a user from the source tenant; the user clicks the link, redeems the invite, and gets a guest account in the target tenant. It works, but at scale it's a manual lifecycle: invites must be issued for every new hire in the source who needs target access, guest accounts must be cleaned up when source-tenant users leave, and the matching of accounts across tenants is done by humans with email addresses. The lifecycle gap — "the user left tenant A three months ago, the guest in tenant B is still active" — is real, and at the scale of a Fortune 500 acquisition, it produces hundreds of orphaned accounts a year.

**Cross-Tenant Synchronization (CTS)** is the automation. A source tenant configures a sync job that automatically provisions, updates, and de-provisions B2B guests in a target tenant. Think of it as Microsoft Entra connect-sync, but between two cloud tenants instead of between AD and Entra. Once it's in place, the answer to "I have a new hire in tenant A who needs access to apps in tenant B" is "they already have a guest account in tenant B; the sync ran two minutes after the hire account was created."

This article is the operator's view: what CTS does and doesn't do, the configuration sequence in both tenants, the attribute mapping pattern that works, the deprovisioning story, and the four gotchas that surface in real multi-tenant scenarios.

The Microsoft references throughout are [What is cross-tenant synchronization](https://learn.microsoft.com/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview), [Configure cross-tenant synchronization](https://learn.microsoft.com/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure), and [Cross-tenant access settings](https://learn.microsoft.com/entra/external-id/cross-tenant-access-overview).

## What CTS does, in one paragraph

CTS is configured on the **source tenant** as a provisioning job that targets the **target tenant** as a SCIM-like endpoint. The job has a scope (which users to include — typically a group), an attribute mapping (which source attributes flow to which target attributes), and a schedule (every 40 minutes by default). Each run reads the in-scope source users, calls into the target tenant via a service-to-service trust, and creates or updates B2B guest objects there. When a source user leaves the scope (group removal or user deletion), the corresponding target B2B guest is soft-deleted, then hard-deleted after a configurable interval. The target tenant's apps see those B2B guests like any other guest — Conditional Access policies, app-role assignments, and group memberships still apply.

## The pre-deployment decisions

Before touching either tenant, make four decisions explicitly.

### 1. Which tenant is the source?

The source is the one that owns the user's master record — typically the employer's primary tenant. The target receives B2B guests. CTS is one-way per direction; if both tenants need to sync to each other, you configure two CTS jobs.

### 2. What is the sync scope?

The default scope is "all users in the source tenant." That's almost never what you want. The pattern that works is **a security group containing the people who should be guests in the target**. Adding a user to the group provisions them; removing them deprovisions them. This is the single most important design decision because it shapes how lifecycle works for the rest of the relationship.

### 3. What attributes flow?

The default attribute mapping covers the basics (display name, mail, given name, surname). For most targets you want to extend this with at least:

- `department` — useful for target-tenant group dynamic rules.
- `jobTitle` — useful for app-role mapping and audit.
- `extensionAttribute1` (or similar) — for tenant-of-origin tagging in the target.
- `companyName` — populated to a value the target recognises as "from tenant A," used as a discriminator in the target.

What *should not* flow: anything sensitive (e.g., `employeeId` if that's considered PII in your environment) and anything that conflicts with target-side semantics (the target's `accountEnabled` should be governed by the target's own policy, not overridden by the source).

### 4. How long after deprovisioning does the guest fully delete?

CTS uses Entra's soft-delete behaviour: a deprovisioned guest is moved to a soft-deleted state for 30 days, then hard-deleted. Most deployments leave this default. Plan whether your target-tenant audit / SIEM needs to see the deletion event, and how Defender for Cloud Apps will treat sessions that were active when soft-delete occurred (answer: they get blocked via Continuous Access Evaluation on the next API call).

## Configuration sequence

### Step 1: Target tenant — accept the inbound CTS trust

The target tenant has to opt in. In the target tenant's Entra admin centre:

1. Open **Microsoft Entra ID** → **External Identities** → **Cross-tenant access settings**.
2. Add the source tenant's tenant ID to the **Organizational settings** list.
3. Edit the entry, navigate to **Inbound access** → **Cross-tenant sync**, and enable **Allow users sync into this tenant**.
4. Save.

This grants the source tenant the ability to provision into the target. Without this opt-in, the source's sync attempts fail with `Forbidden`.

### Step 2: Target tenant — set inbound trust settings

Still in cross-tenant access settings → Organizational settings → the source tenant entry, configure **Trust settings**. The most common settings to enable for CTS-provisioned guests:

- **Trust multifactor authentication from Microsoft Entra tenants** — accept the source's MFA satisfaction rather than re-prompting.
- **Trust compliant devices** — useful if the source's compliance program is mature.

These trust settings affect how Conditional Access policies in the target evaluate the guest's sessions. Without them, target-side CA policies that require MFA will re-prompt the guest even if they satisfied MFA in the source — that's not always wrong but it's almost never what users expect.

### Step 3: Source tenant — create the cross-tenant access entry

In the source tenant's Entra admin centre:

1. Open **External Identities** → **Cross-tenant access settings** → **Organizational settings**.
2. Add the target tenant's tenant ID.
3. Edit the entry, navigate to **Outbound access** → **Cross-tenant sync**, and enable **Allow users sync into other tenants**.
4. Save.

The settings on the source side and the target side together establish the bilateral consent that the CTS engine validates before each sync run.

### Step 4: Source tenant — configure the sync job

In **Microsoft Entra ID** → **Cross-tenant synchronization** → **Configurations**:

1. **New configuration** → name it (e.g., "Sync to Fabrikam").
2. **Get started** → choose the target tenant.
3. **Provisioning** → set the source identity (an application identity that runs the sync; this is created automatically).
4. **Attribute mappings** → review and adjust per your earlier design.
5. **Scope** → set to "Sync only assigned users and groups" and assign the in-scope group.
6. **Save** and **Start provisioning**.

The job starts running every 40 minutes. First run will be slow if the scoped group is large; subsequent runs are deltas.

```powershell
# Confirm the sync job is running via Graph
Connect-MgGraph -Scopes "Synchronization.ReadWrite.All"
$apps = Get-MgServicePrincipal -Filter "displayName eq 'Sync to Fabrikam'"
foreach ($app in $apps) {
    Get-MgServicePrincipalSynchronizationJob -ServicePrincipalId $app.Id |
        Format-Table Id, Status, Schedule, SynchronizationJobSettings
}
```

### Step 5: Validate end-to-end

Add a single test user to the in-scope group. Within 40 minutes (or trigger an on-demand sync from the job's overview page), confirm:

- The user appears as a B2B guest in the target tenant.
- The mapped attributes are populated correctly.
- The guest can sign in to a target-tenant application (the target's Conditional Access policies apply — verify they don't block the guest unexpectedly).

Then remove the test user from the group. Within 40 minutes, confirm the guest is soft-deleted in the target.

## The attribute-mapping pattern that works

CTS attribute mappings are defined in JSON-like expressions. The defaults are functional; the additions worth making:

```json
// Map jobTitle (default included, but verify it's enabled)
{
    "source": "[jobTitle]",
    "target": "jobTitle"
}

// Map department for downstream group dynamics
{
    "source": "[department]",
    "target": "department"
}

// Stamp the source tenant in companyName for filterability
{
    "source": "\"Contoso (Synced)\"",
    "target": "companyName"
}

// Carry an immutable identity from source extensionAttribute1
{
    "source": "[extensionAttribute1]",
    "target": "extensionAttribute1"
}
```

The `companyName = "Contoso (Synced)"` pattern is the one I recommend most strongly. It gives target-tenant admins a way to filter "everyone who came from CTS" in queries, app role assignments, and dynamic groups — without grepping email domains.

> [!TIP]
> Once `companyName` is set consistently on synced guests, you can create a dynamic security group in the target with rule `(user.companyName -eq "Contoso (Synced)")`. Assign that group to app roles, CA policies, or PIM-eligible roles. The membership maintains itself.

## Deprovisioning and the lifecycle story

The lifecycle story is the value proposition. The events that trigger deprovisioning:

1. **User removed from the in-scope group.** Soft-delete in the target within the next sync cycle.
2. **User account disabled in the source tenant.** The synced attribute `accountEnabled = false` flows to the target — the target guest is disabled (not deleted). The user cannot sign in.
3. **User hard-deleted from the source tenant.** The next sync cycle soft-deletes the target guest.

The 30-day soft-delete window in the target tenant is the safety net. If a deprovisioning was incorrect, an admin in the target can restore the guest from the recycle bin during the window.

```powershell
# Restore a recently soft-deleted guest in the target tenant
Connect-MgGraph -Scopes "User.ReadWrite.All"
Restore-MgDirectoryDeletedItem -DirectoryObjectId "<guest-object-id>"
```

> [!IMPORTANT]
> CTS does not currently sync sign-in revocation events instantly. If a source user is compromised and deprovisioning needs to be immediate (not "within the next sync cycle"), revoke sessions in the source and disable the target guest manually rather than waiting for CTS. The lifecycle automation is for steady state; incidents need the panic button.

## The four gotchas

### Gotcha 1: The target's Conditional Access blocks synced guests on first sign-in

The most common surprise. The target tenant has a CA policy that requires MFA for guest users; the synced guest tries to sign in to a target app and gets prompted for MFA without a registered method. The fix is either to enable **Trust multifactor authentication from Microsoft Entra tenants** on the target's inbound trust settings (so the source's MFA satisfaction crosses over) or to ensure synced guests register an MFA method on first sign-in. The former is the cleaner answer; the latter is the fallback when source MFA can't be trusted.

### Gotcha 2: Attribute mismatch with target-side dynamic groups

A target tenant has a dynamic group rule that includes `(user.department -eq "Finance")`. A synced guest comes in with `department = "Finance"` from the source, lands in the dynamic group, and is inadvertently granted access they shouldn't have. The fix is to scope target-side dynamic groups by `companyName` (or another discriminator) so that synced guests don't accidentally match rules designed for native users. Test dynamic groups against a synced test user before going live.

### Gotcha 3: User Principal Name format change

CTS-provisioned guests in the target tenant get a UPN in the format `originalEmail_originalDomain#EXT#@targetTenant.onmicrosoft.com`. Apps that look up users by UPN (rather than by mail or objectID) can break. Audit downstream apps' user-lookup logic before rollout.

### Gotcha 4: Sync job latency under bulk change

The default 40-minute cycle is fine for steady-state lifecycle. During bulk operations (a 5,000-user re-org that adds all of them to the in-scope group at once), the first cycle after the change can take longer than 40 minutes to complete because the provisioning is one user at a time. Plan bulk changes for a window where the delay is acceptable.

## Operational telemetry

```kql
// 1. CTS provisioning events in the target tenant audit log
AuditLogs
| where TimeGenerated > ago(7d)
| where InitiatedBy.app.displayName contains "Cross-tenant synchronization"
| project TimeGenerated, OperationName,
          Target = tostring(TargetResources[0].userPrincipalName),
          Result = tostring(Result)
| order by TimeGenerated desc
```

```kql
// 2. Sync failures, by reason
AuditLogs
| where TimeGenerated > ago(7d)
| where InitiatedBy.app.displayName contains "Cross-tenant synchronization"
| where Result == "failure"
| summarize Failures = count() by tostring(ResultReason)
| order by Failures desc
```

```kql
// 3. Count of currently synced guests vs the in-scope group size
// Compare these in a weekly report to catch sync gaps
let SyncedGuests = (
    SigninLogs
    | where TimeGenerated > ago(30d)
    | where UserType == "Guest"
    | distinct UserPrincipalName
);
SyncedGuests | count
```

## Common questions

### Can a user object exist in both tenants natively, not as a guest?

Not for the same person — the model is one tenant of record, the other tenant gets a guest representation. Multi-tenant orgs that need users to have first-class accounts in both tenants is a different feature ([Multi-Tenant Organization](https://learn.microsoft.com/entra/identity/multi-tenant-organizations/multi-tenant-organization-overview)), not CTS.

### Does CTS work between Entra ID and Entra External ID (B2C / customer)?

Not in the standard cross-tenant-sync configuration. Entra External ID has its own user store model. Check current documentation for any preview pathways.

### What happens to a synced guest who registers their own MFA in the target?

The MFA registration is local to the target tenant — CTS doesn't touch it. If you later turn on **Trust MFA from source tenant**, the target tenant has a choice of MFA satisfaction sources. Most teams keep both registered as a defence-in-depth.

### Can I sync groups (memberships), not just users?

Yes, with current preview features. The default sync job is user-only; group sync is a separate capability with its own attribute mapping. Verify against current documentation before depending on it.

### What's the failure mode if the source tenant CTS service principal credentials are revoked?

The sync job stops running. No new provisioning happens, no deprovisioning happens. Existing synced guests in the target remain active. The fix is to restore the SP credentials in the source; the next sync cycle catches up.

### How does CTS interact with PIM for Groups?

Synced guests can be made PIM-eligible for groups in the target tenant the same way native users can. The eligibility lives in the target. Activation requires the guest to satisfy whatever activation policy the target tenant configured (MFA, justification, approval).

## What to take away

Cross-Tenant Synchronization replaces a manual lifecycle with an automatic one. The hard part is the up-front design — which users sync, which attributes flow, how the target tenant treats synced guests under Conditional Access. Get those four decisions right, configure the bilateral consent in both tenants, then watch the sync run on a 40-minute heartbeat. The four common gotchas (CA prompting unprovisioned MFA, dynamic group accidents, UPN format break, bulk-sync latency) are predictable and avoidable. Done that way, the answer to "manage guests across the two tenants we have" stops being a quarterly cleanup project.

## References

- [What is cross-tenant synchronization — Microsoft Learn](https://learn.microsoft.com/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview)
- [Configure cross-tenant synchronization — Microsoft Learn](https://learn.microsoft.com/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure)
- [Cross-tenant access settings overview — Microsoft Learn](https://learn.microsoft.com/entra/external-id/cross-tenant-access-overview)
- [Multi-Tenant Organization overview — Microsoft Learn](https://learn.microsoft.com/entra/identity/multi-tenant-organizations/multi-tenant-organization-overview)
- [`Get-MgServicePrincipalSynchronizationJob` — Microsoft Graph PowerShell SDK](https://learn.microsoft.com/powershell/module/microsoft.graph.applications/get-mgserviceprincipalsynchronizationjob)
- [Restore-MgDirectoryDeletedItem — Microsoft Graph PowerShell SDK](https://learn.microsoft.com/powershell/module/microsoft.graph.identity.directorymanagement/restore-mgdirectorydeleteditem)
