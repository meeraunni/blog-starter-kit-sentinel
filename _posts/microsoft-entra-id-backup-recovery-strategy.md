---
title: "Microsoft Entra ID: Backup and Recovery Strategy for Tenant Configuration and Identity Objects"
excerpt: "A technical recovery guide for Microsoft Entra administrators covering soft-delete behavior, hard-delete limitations, Conditional Access rollback, application recovery, configuration export, emergency access accounts, and operational runbooks."
coverImage: "/assets/blog/entra-backup-recovery/cover.svg"
date: "2026-03-28T20:30:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/entra-backup-recovery/cover.svg"
---

## Why Entra backup is not the same as server backup

Microsoft Entra ID does not behave like a VM, database, or file share where you can take a single tenant-wide point-in-time snapshot and later roll back the whole platform. Microsoft’s current guidance is built around **recoverability**, not around a universal tenant restore button. As Microsoft explains in [Recoverability best practices](https://learn.microsoft.com/en-us/entra/architecture/recoverability-overview), unintended deletions and misconfigurations will happen, and the operational goal is to prepare for them with documentation, monitoring, and tested restoration processes.

That distinction matters because Entra failures usually fall into four different classes:

- a soft-deleted object that can still be restored
- a hard-deleted object that must be recreated
- a misconfiguration that must be rolled back or corrected
- a sign-in or authentication-method loss scenario that requires alternate access paths

If an admin says "we need Entra backup," the technical follow-up question should be: **backup of what exact control plane state, and what recovery time objective are we designing for?**

![Microsoft Entra backup and recovery flow](/assets/blog/entra-backup-recovery/cover.svg)

## The recovery boundary Microsoft actually gives you

As documented in [Recover from deletions](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions), the following Microsoft Entra object types support soft delete and are recoverable within 30 days:

- users
- Microsoft 365 groups
- cloud security groups
- application registrations
- service principals
- administrative units
- Conditional Access policies
- named locations

That same Microsoft article is equally important for what it says in the opposite direction: for other object types, hard delete is immediate, and the object must be **re-created and reconfigured**. That is the core design reality behind any Entra backup strategy.

Two consequences follow from that:

1. a tenant recovery plan cannot be only a recycle-bin plan
2. configuration export becomes part of the backup design, not an optional extra

## What must be in an Entra recovery design

A defensible Entra recovery design has at least six layers.

### 1. Emergency administrative access

Microsoft recommends maintaining **two or more emergency access accounts** in [Manage emergency access accounts in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access). These are not convenience accounts. They are the control-plane recovery path when normal admin sign-in is blocked by Conditional Access, MFA dependency failure, federation issues, or role activation problems.

In practice, that means:

- exclude emergency accounts from Conditional Access policies where Microsoft recommends doing so, as also reinforced in [Plan your Conditional Access deployment](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access)
- use very strong credentials and tightly controlled monitoring
- test sign-in periodically so the account is not "theoretical"

If you cannot get into the tenant, no backup document matters.

### 2. Object restore coverage

For recoverable objects, your runbook should be explicit about whether recovery is done from:

- the Entra admin center
- Microsoft Graph deletedItems APIs
- Microsoft Entra PowerShell

Microsoft documents the Graph restore path in [Restore deleted item (directory object)](https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore?view=graph-rest-1.0) and the PowerShell path in [Restore-EntraDeletedDirectoryObject](https://learn.microsoft.com/en-us/powershell/module/microsoft.entra/restore-entradeleteddirectoryobject?view=entra-powershell).

### 3. Configuration export

Soft delete protects some objects. It does **not** give you a versioned copy of current tenant configuration. Microsoft’s own recoverability guidance points you toward documenting current state and monitoring changes in [Recoverability best practices](https://learn.microsoft.com/en-us/entra/architecture/recoverability-overview) and [Recover from deletions](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions).

For real operations, you should export and version at least:

- Conditional Access policies
- named locations
- authentication methods policy
- application registrations
- service principals
- break-glass account configuration metadata
- critical group definitions and privileged role assignments

### 4. Audit and change visibility

Microsoft states in [Recover from deletions](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions) that the Microsoft Entra audit log contains delete operations and should be exported to a SIEM such as Microsoft Sentinel. Without audit history, recovery becomes archaeology.

### 5. Change management with rollback paths

Microsoft’s recoverability and Conditional Access deployment guidance both push toward safer rollout controls:

- least privilege
- Privileged Identity Management
- report-only testing for Conditional Access
- staged deployment and validation

Those controls exist because many Entra incidents are not deletions. They are misconfigurations with a very large blast radius.

### 6. Tested runbooks

Microsoft explicitly recommends rehearsing restoration processes in [Recoverability best practices](https://learn.microsoft.com/en-us/entra/architecture/recoverability-overview). If the first time your team attempts a restore is during a tenant lockout, you do not have a recovery plan. You have documentation.

## What to export on a schedule

For most production tenants, the most important engineering pattern is to export critical configuration into source control or a secured configuration repository.

### Conditional Access policies

The authoritative read path is the Microsoft Graph endpoint documented in [List policies](https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-policies?view=graph-rest-1.0):

```powershell
Connect-MgGraph -Scopes "Policy.Read.All"
Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies"
```

Why this matters:

- Conditional Access mistakes can create tenant-wide sign-in disruption
- deleted policies are recoverable for 30 days, but misconfigured active policies still require rollback logic
- Microsoft recommends restoring deleted policies in **Report-only** mode first in [Recover from deletions](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions)

### Named locations

Named locations are often part of your Conditional Access trust boundary. Microsoft documents the read path in [List namedLocations](https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-namedlocations?view=graph-rest-1.0):

```powershell
Connect-MgGraph -Scopes "Policy.Read.All"
Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations"
```

Recovery nuance matters here. As Microsoft notes in [Recover from deletions](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions), when a named location is recovered from soft delete, it is **not** restored as trusted. That is the kind of detail that can silently change access behavior after a restore.

### Authentication methods policy

The tenant authentication policy is part of your sign-in control plane, not just a convenience setting. Microsoft documents the policy read path in [Get authenticationMethodsPolicy](https://learn.microsoft.com/en-us/graph/api/authenticationmethodspolicy-get?view=graph-rest-1.0) and the policy model in [authentication methods policies API overview](https://learn.microsoft.com/en-us/graph/api/resources/authenticationmethodspolicies-overview?view=graph-rest-1.0).

```powershell
Connect-MgGraph -Scopes "Policy.Read.AuthenticationMethod"
Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy"
```

If this policy is changed incorrectly, users may lose available registration or sign-in methods. For user-side recovery from complete authentication-method loss, Microsoft now also documents [Account Recovery (Preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-account-recovery-enable). That feature helps recover user access, but it is not a substitute for tenant configuration backup.

### Application registrations

Applications are one of the most commonly underestimated recovery domains in Entra. Microsoft documents the inventory path in [List applications](https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0).

```powershell
Connect-MgGraph -Scopes "Application.Read.All"
Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/applications?$select=id,appId,displayName,signInAudience,requiredResourceAccess,web,spa,publicClient,passwordCredentials,keyCredentials"
```

This export should be treated as **metadata backup**, not secret backup.

Microsoft is explicit in [application: addPassword](https://learn.microsoft.com/en-us/graph/api/application-addpassword?view=graph-rest-1.0) and the [passwordCredential resource](https://learn.microsoft.com/en-us/graph/api/resources/passwordcredential?view=graph-rest-1.0): the generated `secretText` is returned only when the secret is created, and there is no way to retrieve it later. So if an admin says "we can recover the app secret from Entra," that is wrong. You need external secret storage and credential rotation runbooks.

Microsoft also notes in [List applications](https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0) that `keyCredentials` are not fully returned unless you explicitly select them. If certificate-based trust is business-critical, your backup design needs to capture that metadata intentionally.

### Service principals

Service principals are runtime objects in the tenant and can drift away from the application registration. Microsoft documents the inventory path in [List servicePrincipals](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0).

```powershell
Connect-MgGraph -Scopes "Application.Read.All"
Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?$select=id,appId,displayName,servicePrincipalType,accountEnabled,passwordCredentials,keyCredentials"
```

This matters because the Entra recovery boundary for applications is not as simple as many admins assume.

As Microsoft explains in [Restore a soft deleted enterprise application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application), restoring a deleted application registration can restore the corresponding enterprise application, but previous policies such as Conditional Access policies are **not** restored with it. That means app recovery is not complete until you validate the policy attachments and sign-in controls that existed around the app.

## How recovery actually breaks in production

The most common Entra recovery mistakes are not technical impossibilities. They are design mistakes.

### Mistake 1: assuming the recycle bin is the backup

It is not. The recycle bin helps only for supported soft-deleted objects and only inside the retention window documented in [Recover from deletions](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions).

### Mistake 2: backing up object shape but not dependency context

A restored application without its downstream enterprise app validation, owner review, secrets, certificate plan, app role assignments, and Conditional Access design is not truly recovered. It is only re-created.

### Mistake 3: ignoring secret material

Because Microsoft does not let you retrieve `secretText` later, a backup strategy that exports only application metadata is insufficient for actual app recovery. Secrets must live in a separate secure system and be rotatable on demand.

### Mistake 4: treating misconfiguration like deletion

A bad Conditional Access rollout is not fixed by restore APIs if the policy still exists and is simply wrong. Microsoft’s own deployment guidance in [Plan your Conditional Access deployment](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access) is effectively telling you to design rollback before production enablement.

### Mistake 5: not validating post-restore state

Microsoft calls this out directly in [Recover from deletions](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions):

- restored Conditional Access policies should be reviewed and often restored in report-only mode first
- restored named locations should be reviewed before marking them trusted again

Recovery is not complete when the object exists again. Recovery is complete when the object behaves correctly again.

## A practical runbook Entra admins can implement

If I were building an Entra backup and recovery program for a production tenant, the runbook would look like this:

1. Create and monitor at least two emergency access accounts as Microsoft recommends [here](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access).
2. Export Conditional Access policies, named locations, authentication methods policy, applications, and service principals on a schedule through Microsoft Graph.
3. Store those exports in version control with change review.
4. Export audit logs to Microsoft Sentinel or another SIEM, as Microsoft recommends [here](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions).
5. Store application secrets and certificate lifecycle data outside Entra so lost credentials can be reissued.
6. Use PIM, least privilege, and staged change control to reduce destructive writes, as described in [Recoverability best practices](https://learn.microsoft.com/en-us/entra/architecture/recoverability-overview).
7. For Conditional Access changes, test in report-only mode and keep a break-glass path, as described [here](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access).
8. Rehearse restores in a test tenant, including app recovery, policy rollback, and deleted object restoration.

## The John Savill angle that matters

For platform-level context, John Savill’s [Microsoft Entra ID Resilience Architecture Deep Dive](https://www.classcentral.com/course/youtube-entra-resilience-deep-dive-459261) is useful because it reinforces a point that Microsoft’s documentation also makes: Entra resilience at the service layer and tenant recoverability at the admin layer are related, but they are not the same thing.

Microsoft can engineer resilient global authentication infrastructure. That does not remove the tenant administrator’s responsibility to preserve critical configuration, protect recovery identities, and test restoration workflows.

## Final takeaway

The right mental model is not "How do I back up Entra like a server?"

The right question is:

**Which Entra objects are recoverable, which ones are only reproducible, and how do I preserve enough state to rebuild the tenant control plane safely?**

If you answer that question well, you end up with a mature Entra recovery design:

- emergency access for control-plane survival
- soft-delete restore for supported objects
- Graph-based exports for critical configuration
- external secret storage for application credentials
- audited change control for rollback
- rehearsed runbooks for real incidents

That is what a serious Entra backup and recovery strategy actually looks like.

## Microsoft References

- [Recoverability best practices in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/architecture/recoverability-overview)
- [Recover from deletions in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/architecture/recover-from-deletions)
- [Recover from misconfigurations in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/architecture/recover-from-misconfigurations)
- [Manage emergency access accounts in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)
- [Plan your Conditional Access deployment](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access)
- [Restore deleted item (directory object) - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore?view=graph-rest-1.0)
- [List policies - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-policies?view=graph-rest-1.0)
- [List namedLocations - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-namedlocations?view=graph-rest-1.0)
- [Get authenticationMethodsPolicy - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/authenticationmethodspolicy-get?view=graph-rest-1.0)
- [Authentication methods policies API overview - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/authenticationmethodspolicies-overview?view=graph-rest-1.0)
- [List applications - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0)
- [List servicePrincipals - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0)
- [application: addPassword - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/application-addpassword?view=graph-rest-1.0)
- [passwordCredential resource type - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/passwordcredential?view=graph-rest-1.0)
- [Restore a soft deleted enterprise application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application)
- [How to enable and test Account Recovery (Preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-account-recovery-enable)

## Supplemental References

- [Microsoft Entra ID Resilience Architecture Deep Dive - John Savill](https://www.classcentral.com/course/youtube-entra-resilience-deep-dive-459261)
- [Leading the way in resilience at scale - Microsoft Entra Blog](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/leading-the-way-in-resilience-at-scale/4094703)
