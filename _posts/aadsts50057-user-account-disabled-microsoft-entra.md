---
title: "AADSTS50057 User Account Disabled: Microsoft Entra Fix"
excerpt: "Fix AADSTS50057 user account disabled errors by proving the affected tenant and source of authority, reviewing audit evidence, and restoring access safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-22T17:11:04-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The user sees **AADSTS50057 user account disabled**, but their manager says the account is active and the help desk is ready to flip every enable switch it can find. Pause there. Microsoft defines this error against the user object in the **resource tenant**. A healthy home account, a working Windows sign-in, or an enabled account in another tenant does not disprove the failure.

The short answer is to match the report to the exact Microsoft Entra sign-in, confirm which resource tenant rejected it, inspect that tenant's user object and source of authority, and review the audit trail before changing `accountEnabled`. Re-enable only when the disablement was accidental or formally cleared. If it was an offboarding or containment action, leave it disabled and investigate the continued attempt. Microsoft documents `AADSTS50057` as `UserDisabled` and says the backing user object is disabled. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

Microsoft's dedicated support article makes the tenant boundary explicit: the user object is disabled in the resource tenant, and that tenant's owners must decide whether it should remain disabled or be restored. ([AADSTS50057: user account is disabled](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50057-user-account-is-disabled))

## AADSTS50057 user account disabled: the fast path

Use this sequence before enabling the account, resetting a password, changing Conditional Access, or editing guest settings:

1. Capture the UTC time, request ID, correlation ID, user, application, resource, home tenant, and resource tenant from the failure.
2. Open **Entra ID > Monitoring & health > Sign-in logs** in the resource tenant and find the exact event.
3. Confirm error code `50057`, the user object ID, and the sign-in category. Do not work from a screenshot of the browser error alone.
4. Query or open the same user object and verify `accountEnabled`, `userType`, and `onPremisesSyncEnabled`.
5. Review **Audit logs** for **Disable account**, **Enable account**, and relevant **Update user** activity against that object.
6. Establish why the account was disabled: approved offboarding, security containment, automation, synchronization, guest lifecycle, or mistake.
7. Restore only through the authoritative control plane and with the required approval.
8. Run one fresh sign-in through the original tenant, app, device, and network. Then confirm the audit event, successful sign-in, and absence of an unsafe reversal.

This guide is based on current Microsoft documentation and operational analysis. It does not claim that every tenant, hybrid topology, or application path was reproduced for this article.

## What AADSTS50057 proves—and what it does not

`AADSTS50057` proves that Microsoft Entra evaluated the user object for this request as disabled. It does not prove why the object was disabled, who disabled it, whether the user's home account is enabled, whether previously issued sessions have ended everywhere, or whether restoring access is safe.

Keep the neighboring states separate:

- **`AADSTS50126`:** the submitted username or password could not be validated. Use the [AADSTS50126 invalid-credential runbook](/posts/aadsts50126-invalid-username-password-microsoft-entra) for that path.
- **`AADSTS50053`:** the account is locked or the source was blocked as malicious. The [AADSTS50053 lockout guide](/posts/aadsts50053-account-locked-microsoft-entra) explains why a reset is not always the answer.
- **`AADSTS50057`:** the user object used by the resource tenant is disabled.
- **`AADSTS53003`:** Conditional Access blocked the request.
- **`AADSTS7000112`:** a service principal, not a user, is disabled.

Several codes can appear in one incident. A responder might disable a user after suspicious `50126` failures, causing later attempts to return `50057`. That is a successful containment boundary, not a new authentication defect. Read the event timeline instead of treating the final code as the root cause.

Microsoft's sign-in troubleshooting workflow recommends collecting the exact error code, failure reason, identity, request context, and correlation identifiers from the event. Reports Reader is the least-privileged role Microsoft lists for viewing activity logs. ([troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

## Prove the affected tenant and user object

One person can have several directory objects. A member account in a home tenant, a B2B guest in a resource tenant, and a separate account in another organization can share a familiar email address while having different object IDs and `accountEnabled` values.

Record these identifiers from the exact failure:

- UTC timestamp, request ID, correlation ID, and trace ID when shown;
- sign-in identifier, user principal name, and user object ID;
- home tenant ID and resource tenant ID;
- application name and application ID;
- resource name and resource service-principal ID;
- interactive or non-interactive sign-in category;
- client, browser, operating system, device ID, IP address, and location; and
- failure reason, additional details, authentication requirement, and Conditional Access result.

The sign-in activity view organizes the evidence around **who**, **how**, and **what**: the identity, client, and target resource. Microsoft notes that the Basic info tab carries the failure details, while the Location and Device tabs add request context. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)) The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is useful when one prompt produces several resource or policy events.

For an external user, inspect the guest object in the **resource tenant named in the event**. Do not ask the home tenant to reset a credential until you have proved the home credential is the failing boundary. Microsoft specifically places the `50057` object and the enablement decision in the resource tenant.

## Read account state and source of authority together

The Microsoft Graph user resource defines `accountEnabled` as `true` when the account is enabled and `false` otherwise. The property is not returned in every default response, so request it explicitly. It is also a sensitive property: supported roles and permissions govern who can change it. ([Microsoft Graph user resource](https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0))

Check four values before deciding where to make the repair:

- **`accountEnabled`:** the effective cloud sign-in state for this user object;
- **`onPremisesSyncEnabled`:** whether the object is synchronized from Windows Server Active Directory;
- **`userType`:** Member or Guest, which helps explain the object's tenant-local lifecycle; and
- **object ID:** the immutable target to compare across the sign-in, audit event, portal, and Graph output.

Microsoft's current user-profile guidance says **Account Enabled** can be changed in the cloud even for a user managed from on-premises, but recommends doing so only for emergency purposes. For identity, contact, and job information on an AD-authoritative user, administrators should update Windows Server Active Directory and allow synchronization to complete. ([manage user profile information](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-user-profile-info))

That creates two valid but different paths:

- **Cloud-managed member or guest:** investigate and, when approved, restore the tenant-local object in Microsoft Entra.
- **AD-authoritative synchronized member:** correct the intended account state at the authoritative AD DS object, validate synchronization, and use a cloud-side enable only as a documented emergency measure—not as a permanent split-brain configuration.

Do not disable tenant-wide directory synchronization to fix one user. Microsoft warns that turning off synchronization initiates a broad source-of-authority conversion and is not a troubleshooting step for an individual object. The supported source-of-authority guidance also shows that an AD-managed user remains read-only for normal cloud-managed attributes until authority is deliberately transferred. ([configure user source of authority](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure))

## Review why the account was disabled before restoring it

In **Entra ID > Monitoring & health > Audit logs**, search the time around the first `50057` event and filter for the exact user object. Microsoft lists **Disable account** and **Enable account** as UserManagement audit activities. ([audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities))

Open the relevant event and preserve:

- activity time, status, category, and correlation ID;
- initiating user, service principal, or Microsoft service;
- target user object ID and UPN;
- old and new values when present;
- source IP recorded for the initiating OAuth client when present; and
- the linked change, lifecycle, help-desk, or incident record.

Microsoft describes audit logs as the tenant record for changes to users, groups, applications, and licenses. Event details can include the actor, target, correlation ID, and changed properties. ([Microsoft Entra audit logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-audit-logs))

Classify the disablement before acting:

- **Approved offboarding:** leave the account disabled. Investigate why a former identity or stale client is still trying to sign in.
- **Security containment:** leave it disabled until the incident owner clears restoration. Review surrounding successful sign-ins, sessions, authentication methods, devices, and resource activity.
- **Lifecycle or synchronization automation:** determine whether the authoritative HR, identity governance, or AD state is wrong. A portal toggle that automation immediately reverses is not a fix.
- **Disabled resource-tenant guest:** confirm the sponsor, resource owner, and guest lifecycle before enabling the tenant-local object.
- **Operator mistake:** verify the exact object and approval, then restore only that object.
- **Unknown actor or missing rationale:** preserve evidence and escalate. Do not convert an unexplained privileged change into an undocumented re-enable.

Microsoft's security-operations guidance recommends alerting on `50057` attempts because continued access attempts against a disabled identity can indicate a former user, stale workload, or attacker still trying the account. A blocked attempt is useful evidence even though access was denied. ([security operations for privileged accounts](https://learn.microsoft.com/en-us/entra/architecture/security-operations-privileged-accounts))

## Confirm authority, roles, and licensing

Reading logs and changing a sensitive user property are separate privileges. Reports Reader is sufficient for the sign-in and audit investigation. Enabling or disabling a user is a sensitive action, and the target's privilege level determines which administrator can perform it.

Microsoft's sensitive-action matrix shows that User Administrator can enable or disable many ordinary users and some administrators, while Privileged Authentication Administrator or Global Administrator is required for protected targets that include highly privileged roles, members or owners of role-assignable groups, and users scoped to restricted management administrative units. Security Administrator, Security Operator, and Entra SOC Identity Responder are limited to non-administrative accounts for these actions. ([privileged roles and sensitive actions](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions#who-can-perform-sensitive-actions))

Microsoft does not list a separate premium license as a prerequisite for updating `accountEnabled`. Evidence retention does vary: Microsoft Entra ID Free retains sign-in and audit logs for seven days, while P1 and P2 retain them for 30 days in the Entra reporting surface. Longer investigations require prior routing or archival; buying a license later does not recover expired events. ([Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention))

## Restore the intended user through a controlled path

For an approved cloud-side restoration in the resource tenant:

1. Browse to **Entra ID > Users > All users**.
2. Find the user by object ID from the failed sign-in, not only by display name.
3. Open **Properties** and review the identity, user type, source, and account status.
4. Under **Settings**, set the account to enabled and save.
5. Re-open the user or query Microsoft Graph to verify the effective value.
6. Review the new **Enable account** audit event and confirm the initiator and target.

For a repeatable Microsoft Graph PowerShell check, use the v1.0 user cmdlets and request the properties explicitly:

```powershell
Connect-MgGraph -Scopes "User.Read.All", "User.EnableDisableAccount.All"

$userId = "00000000-0000-0000-0000-000000000000"

Get-MgUser -UserId $userId `
    -Property "id,userPrincipalName,userType,accountEnabled,onPremisesSyncEnabled" |
    Select-Object Id, UserPrincipalName, UserType, AccountEnabled, OnPremisesSyncEnabled
```

Replace the placeholder with the object ID from the exact sign-in. Stop if the tenant context, object ID, UPN, or source-of-authority result does not match the case.

When restoration is approved:

```powershell
Update-MgUser -UserId $userId -AccountEnabled:$true

Get-MgUser -UserId $userId `
    -Property "id,userPrincipalName,accountEnabled,onPremisesSyncEnabled" |
    Select-Object Id, UserPrincipalName, AccountEnabled, OnPremisesSyncEnabled
```

Microsoft documents `User.EnableDisableAccount.All` plus `User.Read.All` as the least-privileged Graph permission combination for updating `accountEnabled`. The signed-in administrator must also satisfy the sensitive-action role boundary for the target. ([update user with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0), [Update-MgUser](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.users/update-mguser?view=graph-powershell-1.0))

Do not turn this into a bulk loop over every disabled user. Disabled accounts are often intentional controls. The case should identify one target, one reason, one owner, and one verification plan.

## Treat account state and session invalidation as separate controls

Enabling an account allows the identity to attempt fresh authentication again. It does not explain or erase the original disablement, repair a bad password, satisfy MFA, restore an application assignment, or override Conditional Access.

Likewise, disabling an account is not the complete emergency revocation procedure. Microsoft tells responders to disable the account and revoke sessions as separate actions, and warns that applications and resources can have their own session behavior. ([revoke user access in an emergency](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access)) The site's [token lifetime, revocation, and CAE guide](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) explains why existing access is not a single global on/off switch.

If the account was disabled for compromise, do not re-enable it merely because a password was reset. Complete the approved credential recovery, authentication-method review, session revocation, device response, risk review, and resource investigation first. If the disablement was accidental and no compromise evidence exists, do not add destructive incident actions just to make the ticket look thorough.

## Monitor AADSTS50057 without creating alert noise

If interactive and non-interactive user sign-in logs are routed to Log Analytics, a focused query can surface continued attempts against disabled users. Microsoft exposes non-interactive events in the `AADNonInteractiveUserSignInLogs` table, separate from `SigninLogs`. ([non-interactive user sign-in log schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/aadnoninteractiveusersigninlogs))

```kusto
union withsource=LogTable SigninLogs, AADNonInteractiveUserSignInLogs
| where ResultType == "50057"
| project TimeGenerated, LogTable, UserPrincipalName, UserId,
          AppDisplayName, ResourceDisplayName, IPAddress,
          ClientAppUsed, CorrelationId
| order by TimeGenerated desc
```

Interpret the pattern, not only the count:

- repeated attempts from one known device can indicate a cached session or stale client;
- attempts after an offboarding date can expose an unmanaged device, scheduled process, or incomplete application cleanup;
- attempts from unfamiliar sources can be threat evidence even though the account stayed blocked;
- failures across several disabled users from one source deserve broader investigation; and
- a sudden success after an enable event should correlate to the approved change and expected device, app, and network.

Do not alert every single `50057` at the same severity. Prioritize privileged identities, recently disabled users, unfamiliar sources, repeated attempts, and any sequence that includes an unexplained enable event or successful access.

## Troubleshoot when AADSTS50057 persists

Work through these branches in order:

1. **The cloud user still shows `accountEnabled=false`.** Verify the tenant, target object ID, administrator role, and audit result. Check whether lifecycle or security automation reversed the write.
2. **The account is synchronized from AD DS.** Confirm the intended state at the authoritative AD object and validate the next sync. A temporary cloud toggle is not a durable repair when the source remains disabled.
3. **The home account is enabled, but a guest still fails.** Inspect the resource-tenant guest object. The home and resource objects have independent lifecycle state.
4. **The account is enabled, but the next attempt shows a different code.** The disabled-user boundary is cleared. Investigate the new password, MFA, assignment, consent, risk, or Conditional Access result on its own evidence.
5. **The user can enter one app but not another.** Match the resource tenant and resource service principal for both events. The successful path might not exercise the failing tenant or object.
6. **No matching `50057` event exists.** Recheck UTC time, resource tenant, sign-in category, user object ID, application, and correlation ID. Launch **Sign-in diagnostic** from the exact event when available. ([Microsoft Entra Sign-in diagnostic](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics))
7. **The disablement actor is unknown.** Preserve the audit event, initiator, changed properties, nearby role activity, and automation context; then treat it as a directory-control investigation.

For Microsoft support, provide sanitized UTC timestamps, request and correlation IDs, home and resource tenant IDs, user object ID, UPN, user type, `accountEnabled`, `onPremisesSyncEnabled`, application and resource IDs, sign-in category, the relevant audit event, and reproduction steps. Never attach passwords, tokens, session cookies, private keys, or authentication secrets.

## Verify the fix without weakening the control

Run one fresh sign-in through the original application, resource tenant, device, and network. Then verify:

1. the new sign-in belongs to the same user object ID and resource tenant;
2. `accountEnabled` remains at the approved value after the expected synchronization or automation interval;
3. the audit log records the expected actor and target;
4. the user satisfies the intended password, MFA, Conditional Access, assignment, and application controls;
5. an out-of-scope identity remains blocked; and
6. continued attempts from stale or suspicious sources are investigated rather than hidden by the successful test.

A green portal banner is not verification. A successful sign-in to the home tenant is not verification of a resource-tenant guest. Close the exact path that produced `50057`.

## AADSTS50057 administrator checklist

- [ ] Confirm error code 50057 on the exact sign-in event.
- [ ] Record UTC time, request and correlation IDs, user object ID, app, resource, and tenant IDs.
- [ ] Verify the resource-tenant user object's `accountEnabled` value.
- [ ] Record `userType` and `onPremisesSyncEnabled` before choosing a repair path.
- [ ] Review Disable account, Enable account, and relevant Update user audit events.
- [ ] Identify the business, lifecycle, security, or automation reason for disablement.
- [ ] Confirm the responder can perform the sensitive action on this target.
- [ ] Restore only through the authoritative control plane and approved change path.
- [ ] Verify the effective property and the new audit event.
- [ ] Run one fresh sign-in through the original app and resource tenant.
- [ ] Investigate continued attempts against intentionally disabled accounts.
- [ ] Escalate an unknown actor, repeated reversal, or missing audit trail.

## Frequently asked questions

### Does AADSTS50057 mean the password is wrong?

No. It means the user object evaluated for the request is disabled. Invalid credentials normally produce a different error such as `AADSTS50126`.

### Why can the user sign in to Windows but still get AADSTS50057?

The Windows sign-in and the failing cloud request might use different cached credentials, tokens, tenants, or user objects. Match the failure to its resource tenant and object ID before comparing account state.

### Can a home-tenant admin fix AADSTS50057 for a guest?

Not when the disabled object is the guest in another resource tenant. Microsoft directs the resource tenant owners to investigate and re-enable that tenant-local object when appropriate.

### Should I reset the password after enabling the account?

Only when the investigation supports a credential recovery action. A password reset does not change `accountEnabled`, and enabling an account does not prove the credential is safe.

### Why does the account become disabled again?

An authoritative AD state, lifecycle workflow, HR feed, security automation, or administrator may be reapplying the disablement. Find the new audit or provisioning evidence instead of repeatedly toggling the account.

### Does enabling the user restore every session and application?

No. Enablement permits fresh authentication attempts. Existing session invalidation, application assignments, consent, Conditional Access, and application-local account state remain separate controls.

AADSTS50057 is a narrow code with a useful operational lesson: identity state is tenant-local, source-of-authority matters, and a disabled account is often doing exactly what an administrator or security process intended. Prove the object, preserve the reason, and restore only when the evidence says access should return.

## Microsoft sources

- [AADSTS50057: user account is disabled](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50057-user-account-is-disabled)
- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors)
- [Microsoft Graph user resource](https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0)
- [Update a user with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0)
- [Privileged roles and sensitive actions](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions)
- [Microsoft Entra audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities)
- [Revoke user access in an emergency](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access)
