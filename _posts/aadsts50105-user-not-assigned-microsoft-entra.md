---
title: "AADSTS50105 User Not Assigned: Microsoft Entra Fix"
excerpt: "Fix AADSTS50105 user not assigned errors by checking enterprise app assignment, direct group membership, app roles, provisioning, and sign-in evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-25T17:27:38-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The SSO tile works for the rest of the team, but one new starter gets **AADSTS50105**. Their password works, MFA succeeds, and the application is plainly present in the tenant. This is where people often start changing Conditional Access or SAML settings, even though neither is the failed control.

An **AADSTS50105 user not assigned** error means the enterprise application requires assignment and Microsoft Entra cannot find a qualifying assignment for the signed-in user. Fix the assignment boundary: confirm the exact enterprise application, then assign the user directly or through a group of which they are a **direct** member. Disable the assignment requirement only when every otherwise-authorized tenant user is genuinely supposed to reach the application.

Grab a coffee and keep the failed sign-in open. Microsoft's current troubleshooting reference says the check applies to SAML, OpenID Connect, OAuth 2.0, WS-Federation, and Application Proxy applications that use Entra preauthentication. It also makes two details unusually explicit: nested group membership is not a supported path for this check, and a Global Administrator can bypass the assignment requirement. ([Microsoft's AADSTS50105 troubleshooting reference](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50105-user-not-assigned-role))

## AADSTS50105 user not assigned: the short answer

Work through this sequence:

1. Capture the user, application ID, resource service-principal ID, tenant, timestamp, request ID, and correlation ID from the failed sign-in.
2. Open the exact object under **Entra ID > Enterprise apps > All applications**. Do not select an app registration or a same-named enterprise application by accident.
3. Confirm that **Assignment required?** is set to **Yes** and that restricting access is intentional.
4. Under **Users and groups**, look for either a direct assignment for the affected user or an assigned group containing that user as a direct member.
5. Check the selected application role. Use **Default Access** only when the application exposes no named role and does not need a `roles` claim.
6. Add the smallest correct assignment, allow for replication, and retest as the affected user. Do not validate with a Global Administrator.
7. If automatic provisioning is in scope, prove the target account and entitlement separately. A successful Entra assignment does not prove that the SaaS-side account is ready.

The order matters. AADSTS50105 is an application-assignment decision made against the tenant-local service principal. It is not evidence of a bad password, failed MFA, broken reply URL, or Conditional Access block.

## Understand the assignment check before fixing it

The setting behind this error is `appRoleAssignmentRequired` on the application's **service principal**, the object shown in Enterprise applications. When the corresponding portal property **Assignment required?** is **Yes**, Entra requires an app-role assignment before it issues a token or federated sign-in response for the user.

Microsoft supports two user paths through that boundary:

- a direct user-to-application assignment; or
- an assignment to a group of which the user is a direct member.

Group nesting does not flow through application assignment. If `Finance-All` is assigned to the application and `Finance-Toronto` is nested inside it, a member of `Finance-Toronto` does not gain the application assignment from that relationship. Microsoft's application-access documentation and the dedicated error reference both state this limitation. ([manage access to applications](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/what-is-access-management), [assign users and groups](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal?pivots=portal))

An assignment also has a role value. When the application exposes named app roles such as `Reader`, `Approver`, or `Administrator`, the assignment connects the principal to one of those role IDs. When no named role exists, **Default Access** uses the all-zero app-role ID. Microsoft notes that Default Access satisfies the assignment requirement but does not add a `roles` claim to the token. That distinction is easy to miss: it can clear AADSTS50105 while leaving an application that expects a named role to deny access later.

> [!IMPORTANT]
> An assignment and an application account are not the same object. Entra can permit token issuance while the target SaaS application still lacks a provisioned account, has the account disabled, or maps the user to the wrong local role.

## Step 1: preserve the failed sign-in

Record the evidence before anybody adds a broad group or flips the assignment requirement:

- affected user's user principal name and object ID;
- application display name and application ID;
- resource service-principal ID, when present;
- sign-in tenant and resource tenant;
- error code, failure reason, timestamp, request ID, and correlation ID;
- launch path, such as My Apps, an application URL, or a deep link;
- last known successful sign-in and the most recent assignment, group, or application change.

In the Entra admin center, browse to **Entra ID > Monitoring & health > Sign-in logs**, open the exact failure, and use its application ID and correlation details rather than a display name copied from a ticket. Microsoft's sign-in diagnostic can start from that event or search by user, application ID, request ID, correlation ID, and time. ([Microsoft Entra sign-in diagnostics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics))

For Microsoft Graph PowerShell, Microsoft publishes this exact status filter for the error:

```powershell
Connect-MgGraph -Scopes "AuditLog.Read.All"

Get-MgAuditLogSignIn -Filter "status/errorCode eq 50105" -All |
    Select-Object CreatedDateTime, UserPrincipalName, AppDisplayName,
        AppId, ResourceDisplayName, CorrelationId, Status
```

The command is read-only. Microsoft's monitoring reference documents `Get-MgAuditLogSignIn` and `status/errorCode eq 50105` as the supported query pattern. ([Graph PowerShell monitoring reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-powershell-reporting))

Do not put access tokens, SAML assertions, cookies, passwords, or MFA details into the incident record. The identifiers and timestamps are enough to find the decision Entra made.

## Step 2: locate the exact enterprise application

Open **Enterprise applications**, not **App registrations**. The app registration is the application definition; the enterprise application is the tenant-local service principal that holds `Assignment required?`, user and group assignments, enabled state, SSO configuration, provisioning configuration, owners, and local policy relationships.

Use the application ID from the sign-in event to avoid three common mistakes:

- opening a same-named test or retired service principal;
- editing the home app registration instead of the customer tenant's enterprise application;
- mistaking an object ID for an application ID.

The recent [AADSTS700016 application-not-found guide](/posts/aadsts700016-application-not-found-microsoft-entra) covers the earlier lookup boundary. If you have AADSTS50105, Entra found enough application context to evaluate assignment. Re-creating the registration or granting consent again is therefore the wrong first move.

This read-only inventory resolves the service principal by application ID and lists everything assigned to it:

```powershell
$appId = "00000000-0000-0000-0000-000000000000"

Connect-MgGraph -Scopes "Application.Read.All", "Directory.Read.All"

$sp = Get-MgServicePrincipal -Filter "appId eq '$appId'" `
    -Property "id,appId,displayName,accountEnabled,appRoleAssignmentRequired,appRoles"

$sp | Select-Object Id, AppId, DisplayName, AccountEnabled,
    AppRoleAssignmentRequired

Get-MgServicePrincipalAppRoleAssignedTo -ServicePrincipalId $sp.Id -All |
    Select-Object PrincipalDisplayName, PrincipalType, PrincipalId,
        AppRoleId, CreatedDateTime
```

`Get-MgServicePrincipalAppRoleAssignedTo` returns user, group, and client-service-principal app-role assignments granted for the resource service principal. Microsoft warns that recently created or removed assignments can take time to appear because of replication. ([list app-role assignments](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list-approleassignedto?view=graph-rest-1.0), [Graph PowerShell cmdlet reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/get-mgserviceprincipalapproleassignedto?view=graph-powershell-1.0))

If the application ID returns more than one object, stop and verify the tenant and service-principal type. If it returns none, you are no longer troubleshooting the normal AADSTS50105 path; re-check the sign-in tenant and the identifiers from the event.

## Step 3: prove the user's effective assignment

Start in **Users and groups** on the enterprise application. Search for the user's object, then search for every group the requester claims should grant access. Record principal object IDs, not only names.

Use this decision sequence:

1. **Direct user assignment exists:** confirm it belongs to the same user object that attempted sign-in and that it targets the exact service principal from the event.
2. **Group assignment exists:** confirm the affected user is a direct member of that assigned group. A nested path is not enough.
3. **Several groups are assigned:** identify which direct group is supposed to be the entitlement source. Do not add the user to every plausible group to make the ticket disappear.
4. **The assignment has a named role:** map the assignment's `AppRoleId` to the service principal's current `appRoles` collection. A stale or retired role needs application-owner review.
5. **Only Default Access is available:** confirm the application does not expect a named `roles` claim for authorization after sign-in.

Duplicate identities matter. A deleted-and-recreated guest, a restored user, or two similarly named groups can make the portal look correct while the assigned principal ID differs from the object that signed in. Compare object IDs in the sign-in, assignment, and group membership evidence.

For a newly changed dynamic group, prove that membership evaluation has completed before treating the group assignment as effective. For a synchronized group, prove the member reached Entra. Application assignment consumes the membership Entra currently knows; it does not repair an upstream group rule or directory synchronization failure.

## Step 4: choose the repair that matches the access model

There are two legitimate fixes, and they have very different security consequences.

### Keep assignment required

Use this path when the application should be limited to approved people or workloads.

In the enterprise application, select **Users and groups > Add user/group**, choose the user or group, select the intended role, and assign it. Group-based application assignment requires Microsoft Entra ID P1 or P2. Microsoft lists Cloud Application Administrator, Application Administrator, User Administrator, and a current service-principal owner among the supported administrators for assignments, with the exact operation still constrained by role permissions. ([assignment procedure and prerequisites](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal?pivots=portal))

Prefer an owned, purpose-specific group when access is recurring and the group lifecycle is reliable. Prefer a direct assignment for a controlled exception or when the only proposed group path is nested. Document the business owner, entitlement source, selected app role, review date, and removal condition.

If the user should receive access through an access package, repair that governed path rather than creating a permanent side-door assignment. The site's [Entitlement Management and access packages guide](/posts/microsoft-entra-entitlement-management-access-packages) explains the approval and expiration model.

### Turn assignment required off

Use this path only when the intended design allows every otherwise-authorized user in the tenant to request a token for the application. On the enterprise application's **Properties** page, set **Assignment required?** to **No** and save.

This is not a harmless troubleshooting toggle. Microsoft says the change broadens token eligibility to unassigned users and applications. Conditional Access and application-side authorization still apply, but the Entra assignment gate is gone. Microsoft's application properties reference also notes that unassigned users can sign in when assignment is not required even though they do not automatically see the application in My Apps. ([enterprise application properties](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-properties), [AADSTS50105 resolution](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50105-user-not-assigned-role#resolution))

Do not turn it off temporarily during an incident unless broad tenant access is the approved steady-state design. A temporary bypass is still a real authorization change, and the person who remembers to turn it back on may not be the person carrying the outage pager.

## Step 5: separate sign-in from provisioning

Many Gallery and SCIM applications use the same assignment as both a sign-in entitlement and a provisioning scope. When provisioning is configured for **Sync only assigned users and groups**, Microsoft's provisioning service reads the assignments and provisions or deprovisions the corresponding users. ([how Microsoft Entra application provisioning works](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works))

That coupling creates two checkpoints:

- **Entra assignment:** can the user pass the `appRoleAssignmentRequired` check and receive the expected token or SAML response?
- **Target application state:** does the SaaS application have the matching account, active status, attributes, and local entitlement?

After adding an assignment, inspect **Enterprise application > Provisioning > Provision on demand** or the provisioning logs when automatic provisioning is configured. Do not declare success because the user moved past AADSTS50105. If the next failure is “user not found,” “account disabled,” or an application-specific access-denied page, the Entra gate worked and the target-side lifecycle now needs attention.

The [provisioning quarantine fix guide](/posts/microsoft-entra-provisioning-quarantine-fix-guide) is the right next diagnostic when assignment is correct but the provisioning job is stopped or quarantined.

## Step 6: validate without a privileged bypass

Microsoft explicitly says Global Administrators are exempt from the assignment requirement. That makes a Global Administrator a bad test account for this incident.

Use the affected identity or a nonprivileged pilot that follows the same assignment path:

1. Record the assignment and group state after the approved change.
2. Wait for the new app-role assignment and any upstream group membership to replicate.
3. Start a fresh private browser session from the application's canonical launch path.
4. Confirm the new sign-in event has error code `0` or progresses to the expected next control.
5. Inspect the token or SAML assertion only in an approved diagnostic environment and verify the intended role claim when the application requires one.
6. If provisioning is configured, confirm the target account and entitlement are active.
7. Test My Apps, the service-provider launch URL, and relevant deep links if the application supports more than one entry point.

If AADSTS50105 remains, compare the new sign-in's user object ID, application ID, service-principal ID, tenant, and timestamp with the assignment you changed. A repeated error often means the repair targeted a look-alike object or relied on an indirect group path.

If the error changes to AADSTS53003, the assignment boundary is no longer the blocker. Move to the [AADSTS53003 Conditional Access diagnostic](/posts/aadsts53003-access-blocked-by-conditional-access) and preserve the successful assignment evidence.

## Failure patterns worth recognizing

**The user is in a nested group.** Assign the directly containing group that matches the access design, or add the user directly to the already assigned group through the approved group-governance process. Do not assume normal transitive group queries describe application-assignment behavior.

**The administrator can sign in, but the user cannot.** Check whether the administrator is a Global Administrator. Their success does not validate the user's assignment.

**The user appears assigned in another tenant.** App-role assignments are tenant-local relationships to a service principal. Verify the resource tenant from the failed sign-in and inspect the enterprise application there.

**The user has Default Access, but the application still denies them.** AADSTS50105 may be fixed. Inspect whether the application requires a named app role or maintains a separate local authorization model.

**The user was just added to a dynamic or synchronized group.** Prove that the membership object has reached Entra and appears as a direct membership, then allow the app-role assignment relationship to replicate.

**Only one launch link fails.** Capture the application ID and tenant from both paths. A stale bookmark or environment-specific deep link may target a different enterprise application.

**An app-only workload fails with AADSTS501051.** That is the service-principal assignment variant, not the user error covered here. Microsoft's restriction guide documents explicit client-service-principal assignment to the resource application. ([restrict an app to selected users or services](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users))

## Monitor the fix instead of forgetting it

For a sensitive application, an assignment added during an incident should enter the normal governance cycle. Microsoft Entra access reviews can recertify users assigned to an enterprise application when the application requires assignment; direct assignments and group-based models need different review design. ([plan application access reviews](https://learn.microsoft.com/en-us/entra/id-governance/deploy-access-reviews#plan-reviews-for-applications))

At minimum, preserve:

- the failed and successful sign-in events;
- who approved and created the assignment;
- principal, resource service-principal, and app-role IDs;
- direct group membership evidence when a group grants access;
- provisioning result when the target app is assignment-scoped;
- a removal date or access-review owner for exceptions.

Audit logs provide traceability for application, group, and assignment changes. Keep enough retention to investigate the interval between the last successful sign-in and the first AADSTS50105 report. Microsoft's Graph PowerShell monitoring reference uses `Get-MgAuditLogDirectoryAudit` for these directory changes. ([Microsoft Entra audit and sign-in log cmdlets](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-powershell-reporting))

## AADSTS50105 administrator checklist

- [ ] Capture the exact failed sign-in and all correlation identifiers.
- [ ] Locate the enterprise application by application ID in the resource tenant.
- [ ] Confirm `Assignment required?` is enabled and intentional.
- [ ] Compare the signed-in user object ID with the assigned principal IDs.
- [ ] Prove direct user assignment or direct membership in an assigned group.
- [ ] Reject nested membership as an application-assignment path.
- [ ] Map the assignment's app-role ID to the current named role or Default Access.
- [ ] Keep the assignment gate unless broad tenant access is the approved design.
- [ ] Check provisioning separately when assignments scope the SaaS account lifecycle.
- [ ] Retest with the affected user, never only with a Global Administrator.
- [ ] Preserve the successful sign-in, provisioning result, approver, and removal condition.
- [ ] Put durable access into an access review or access-package lifecycle.

The useful mental model is small: **service principal, assignment requirement, principal, direct membership, app role, then target account**. Follow that chain in order and AADSTS50105 stops being a vague SSO problem. More importantly, the repair restores the intended person to the intended application without quietly widening access for everyone else.
