---
title: "AADSTS500212 Outbound Access Blocked: Microsoft Entra Fix"
excerpt: "Fix AADSTS500212 by tracing the home tenant’s outbound cross-tenant policy, user and app scope, partner override, logs, and safe least-privilege recovery."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-12T09:03:07-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS500212 outbound access blocked** error means the user's home Microsoft Entra tenant has an outbound cross-tenant access policy that does not allow access to the resource tenant. The fix belongs on the home-tenant side: identify the exact resource tenant, user or group, and external application, then correct the narrowest outbound B2B collaboration rule that blocked that combination. Do not weaken Conditional Access, recreate the guest, or open the default policy to every organization.

Grab a coffee and preserve the complete error before anyone edits policy. Microsoft's current error reference names AADSTS500212 `NotAllowedByOutboundPolicyTenant` and says the user's administrator has configured an outbound access policy that does not allow the resource tenant. The neighboring AADSTS500213 means the opposite boundary failed: the **resource tenant's inbound** policy blocked the user. Those codes point different administrators at different control planes. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

This guide is for Entra administrators troubleshooting workforce-to-workforce B2B collaboration. It covers the policy decision, evidence, least-privilege recovery, validation, rollback, and monitoring. It does not claim that every external-access failure is AADSTS500212, and it does not treat an invitation email as proof that the current sign-in path is allowed.

## AADSTS500212 outbound access blocked: the short answer

Work through these checks in order:

1. Capture the exact error code and description, UTC timestamp, request ID, correlation ID, user's home tenant ID, resource tenant ID, application, and last successful time.
2. Confirm the user authenticated with the intended home-tenant identity and is opening the intended resource-tenant application.
3. In the **home tenant**, inspect **Entra ID > External Identities > Cross-tenant access settings**.
4. Read the outbound B2B collaboration defaults, then check for an organization-specific entry for the resource tenant. Organization-specific settings take precedence over defaults.
5. Evaluate both halves of the outbound rule: **Users and groups** and **External applications**. The user and target application must both be allowed by the effective configuration.
6. If the tenants are in different Microsoft clouds, verify Microsoft cloud settings as a separate prerequisite.
7. Change only the verified partner, pilot identity or group, and required external application. Preserve the previous configuration before saving.
8. Acquire a fresh sign-in, confirm the intended resource opens, and verify outbound sign-in and audit evidence.

AADSTS500212 is an authorization decision at the home tenant's outbound cross-tenant boundary. Resetting MFA, granting app consent, deleting and reinviting the guest, changing the resource tenant's inbound trust, or disabling Conditional Access cannot make a home-tenant outbound block become an allow.

## Understand the two-tenant policy decision

Cross-tenant access has two independent administrators and two independent directions:

```text
user in home tenant
        -> home tenant outbound policy
        -> resource tenant inbound policy
        -> resource application and Conditional Access
```

Microsoft defines outbound settings as the control over whether your users can access resources in external organizations. Inbound settings control whether users from external organizations can access resources in your organization. For B2B collaboration, Microsoft enables inbound and outbound collaboration by default, while an organization-specific configuration can override the default for one partner. ([cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview), [cross-tenant access settings for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration))

That gives AADSTS500212 a precise owner:

- **AADSTS500212:** inspect outbound access in the user's home tenant.
- **AADSTS500213:** inspect inbound access in the resource tenant.
- **AADSTS50020:** prove the user, tenant, guest object, redemption identity, and application context with the separate [AADSTS50020 external-user sign-in guide](/posts/microsoft-entra-aadsts50020-external-user-sign-in-failures).
- **AADSTS53003:** inspect Conditional Access after cross-tenant policy allows the request; use the [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs).

The fact that a guest object exists in the resource tenant does not override the home tenant's outbound policy. Likewise, a successful invitation or redemption yesterday does not prove that today's user, group membership, partner override, application scope, or cloud configuration still allows the request.

## Step 1: preserve the evidence before changing policy

Record these fields from the failure page, application telemetry, and sign-in event:

- complete sanitized error code and description;
- UTC timestamp, request ID, and correlation ID;
- user's sign-in name and home tenant ID;
- resource tenant ID and verified partner name;
- application display name, application ID, and resource;
- cross-tenant access type, when present;
- browser or client, device, network path, and application entry URL;
- last successful sign-in and first failed sign-in;
- whether one user, one group, one application, one partner, or every partner is affected;
- recent `CrossTenantAccessSettings` audit events.

Microsoft's interactive sign-in-log reference says the log exposes cross-tenant access details including the home and resource tenant IDs. It also documents `Cross tenant access type`, which helps distinguish B2B collaboration, B2B direct connect, service-provider access, and passthrough events. ([interactive user sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-interactive-sign-ins))

Do not identify the resource tenant from a logo, email suffix, SharePoint hostname, or application display name alone. Use the tenant ID from the error or sign-in evidence and have the partner confirm it. A brand can operate several tenants, and a tenant can use several verified domains.

## Step 2: prove the identity and resource tenant

First, make sure the user signed in with the intended work account. A browser session can silently select another organizational account, a personal Microsoft account, or a different member account with a similar address. Use a private session or explicit account selection for the controlled retest, but do not mistake a clean browser for a policy fix.

Next, prove the destination:

- Which tenant owns the resource?
- Which application ID is being requested?
- Is the user using B2B collaboration, B2B direct connect, or another path?
- Is the tenant in the same Microsoft cloud as the home tenant?
- Does the business owner approve this user-to-application relationship?

This matters because outbound policy targets an external **tenant**, then evaluates selected home-tenant users and groups against selected external applications. Changing a rule for the wrong tenant or a similarly named app can widen access without fixing the failing request.

If the two organizations are in different Microsoft clouds, Microsoft requires both organizations to enable collaboration in Microsoft cloud settings and then add the partner by tenant ID. Selecting another cloud does not by itself allow B2B collaboration; after the cloud relationship exists, the normal inbound and outbound settings still apply. ([cross-cloud settings](https://learn.microsoft.com/en-us/entra/external-id/cross-cloud-settings))

## Step 3: find the effective outbound rule

In the user's home tenant, browse to **Entra ID > External Identities > Cross-tenant access settings**.

Read the policy in this order:

1. Open **Default settings** and inspect outbound B2B collaboration.
2. Open **Organizational settings** and find the resource tenant by tenant ID.
3. If no partner entry exists, the default applies.
4. If a partner entry exists and shows customized outbound settings, that partner configuration takes precedence.
5. In the effective outbound rule, inspect both **Users and groups** and **External applications**.

Microsoft explicitly documents that organizational settings take precedence over defaults. Adding an organization does not automatically create a special allow: a newly added organization initially inherits the default until an administrator customizes it. ([cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#organizational-settings), [configure B2B collaboration settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#add-an-organization))

The two target lists must be interpreted together:

- **Allow selected users or groups:** anyone not selected is blocked by that user scope.
- **Block selected users or groups:** the selected identities are blocked and identities outside that list remain eligible.
- **Allow selected applications:** every other external application is blocked for that rule.
- **Block selected applications:** those applications are blocked while applications outside the list remain eligible.

Microsoft's Graph API guide illustrates those allowlist and blocklist semantics and warns through its examples that the user and application targets combine to produce the final decision. ([cross-tenant access settings API overview](https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicy-overview?view=graph-rest-1.0#interpreting-the-api-response))

Common causes are wonderfully ordinary:

- the organization-specific rule is still inherited from a newly restrictive default;
- the partner override allows a pilot group but the user is no longer a direct or transitive member as expected;
- the user scope allows the person but the external application allowlist omits the requested app;
- an app was added by display name but the request uses a different application ID;
- a denylist contains a group that recently gained the user;
- the administrator changed B2B direct connect while the sign-in uses B2B collaboration, or the reverse;
- a cross-cloud relationship was never enabled on both sides.

## Step 4: verify the configuration read-only with Microsoft Graph

The portal is useful for the human decision. A read-only Graph snapshot is useful for change control and exact comparison. Microsoft documents `Policy.Read.All` as the least-privileged permission for reading the default and partner-specific cross-tenant access configuration. Supported read roles include Security Reader, Global Reader, and Security Administrator. ([get the default policy](https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationdefault-get?view=graph-rest-1.0), [get a partner configuration](https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationpartner-get?view=graph-rest-1.0))

```powershell
$resourceTenantId = "00000000-0000-0000-0000-000000000000"

Connect-MgGraph -Scopes "Policy.Read.All"

$default = Get-MgPolicyCrossTenantAccessPolicyDefault
$partner = Get-MgPolicyCrossTenantAccessPolicyPartner -All |
    Where-Object TenantId -eq $resourceTenantId

$default |
    Select-Object IsServiceDefault, B2BCollaborationOutbound

$partner |
    Select-Object TenantId, B2BCollaborationOutbound
```

The first cmdlet returns whether the tenant still uses Microsoft's service default and the configured default object. The second reads partner-specific configurations; the tenant ID is the key. ([default-policy PowerShell reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/get-mgpolicycrosstenantaccesspolicydefault?view=graph-powershell-1.0), [partner-policy PowerShell reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/get-mgpolicycrosstenantaccesspolicypartner?view=graph-powershell-1.0))

If `$partner` is empty, do not create an entry merely to make the command return data. That result means there is no partner-specific configuration and the default policy governs this boundary. If it returns a configuration whose outbound property is `null`, Microsoft's resource model says that property inherits the default. Preserve the full object securely in the change record before any approved edit.

## Step 5: separate policy, licensing, and role prerequisites

Microsoft documents **Security Administrator** or an appropriate custom role as the portal prerequisite for configuring cross-tenant access. Read-only investigation can use lower-privilege roles such as Security Reader or Global Reader with the required Graph permission. ([cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#organizational-settings), [custom roles for cross-tenant access settings](https://learn.microsoft.com/en-us/entra/external-id/reference-cross-tenant-custom-roles))

Licensing depends on the control being used. Microsoft says a P1 license is required in the tenant being configured when you apply access settings to specific users, groups, or applications, change trust settings, or change the default redemption order. B2B direct connect requires P1 in both tenants because the relationship is mutual. Do not infer that a visible policy editor proves every selected feature is licensed. ([cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#organizational-settings))

The cross-tenant access activity workbook is optional evidence, not a prerequisite for the policy itself. Microsoft documents that workbook as requiring Entra ID P1, a Log Analytics workspace, and the appropriate Entra and Azure Monitor roles. It can summarize inbound and outbound status, applications, and users by external tenant for up to 90 days. ([cross-tenant access activity workbook](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/workbook-cross-tenant-access-activity))

## Step 6: make the smallest authorized change

Before remediation, answer four questions in writing:

1. Which home-tenant users or group should be allowed out?
2. Which exact resource-tenant application IDs do they need?
3. Which partner tenant owns those applications?
4. Who approved the data and access relationship?

Then prefer an organization-specific outbound rule for that partner over widening the global default. Scope the first change to a controlled pilot group and the required external application or applications. Microsoft warns that changing defaults to block access can interrupt business-critical collaboration and recommends reviewing existing sign-in activity and consulting business owners before changing policy. The same care applies when widening access: the goal is the approved relationship, not a convenient `All users` plus `All applications` exception. ([configure B2B collaboration settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#prerequisites))

Do not edit inbound trust merely to fix AADSTS500212. Trust settings decide whether the resource tenant accepts MFA, compliant-device, or hybrid-joined-device claims from the home tenant. They are not the outbound allow decision identified by this error code.

Do not delete an organization-specific entry as a shortcut. A partner object can carry inbound settings, outbound settings, automatic redemption, cross-tenant synchronization, tenant restrictions, or other collaboration configuration. Deleting it can change more than the failing path. The site's [cross-tenant synchronization guide](/posts/microsoft-entra-cross-tenant-synchronization) explains one of those adjacent dependencies.

## Step 7: validate the entire path

After the approved outbound change, perform a controlled fresh sign-in with the pilot user. Confirm all of the following:

- the user authenticates with the intended home-tenant identity;
- the request reaches the intended resource tenant;
- AADSTS500212 no longer appears;
- the expected application opens and an unrelated external application remains blocked when it should;
- the resource tenant's inbound policy and Conditional Access still enforce their intended controls;
- no broader user or partner population gained access;
- the home tenant records the sign-in and the policy change.

Microsoft recommends examining inbound and outbound sign-in behavior before and after cross-tenant policy changes. Its overview lists sign-in logs, Microsoft Graph, the cross-tenant activity workbook, and exported SIEM data as supported evidence sources. It also states that audit logs capture cross-tenant policy changes under the `CrossTenantAccessSettings` category. ([identify inbound and outbound sign-ins](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#identify-inbound-and-outbound-sign-ins), [identify cross-tenant setting changes](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#identify-changes-to-cross-tenant-access-settings))

Do not promise an undocumented propagation time. Record the save time, the first successful fresh sign-in, and every failed retest with its request and correlation IDs. If the effective configuration is correct but a fresh request still returns AADSTS500212, preserve the evidence and open Microsoft support with both tenant IDs, the application ID, UTC time, request ID, correlation ID, and sanitized policy snapshot.

## Roll back without losing the known-good policy

The rollback unit is the exact organization-specific outbound change, not the whole cross-tenant policy.

If the pilot unexpectedly widens access or breaks another approved flow:

1. Stop the rollout.
2. Restore the captured user/group and application target configuration for that partner.
3. Do not delete the partner object if it holds other settings.
4. Acquire fresh sign-ins for the original allowed and blocked personas.
5. Confirm the audit event and record the rollback time.
6. Reconcile group membership, app IDs, and the allowlist-versus-blocklist interpretation before another attempt.

For external users assigned through entitlement management, validate the access package and cross-tenant policy as separate layers. The [external-user access package guide](/posts/assign-external-users-microsoft-entra-access-packages) covers that assignment path; an access-package assignment cannot override an outbound cross-tenant block.

## Troubleshoot the failures that remain

### The user is allowed, but AADSTS500212 remains

Check the application side of the same outbound rule. A selected-user allowlist combined with a selected-application allowlist requires both matches. Compare the sign-in's application ID with the target ID in policy rather than relying on display names.

### The partner setting says inherited

Read the default outbound configuration. Inherited is not synonymous with allowed; it means this partner has no customized value for that property and follows the default.

### One member of the same group works and another fails

Prove each user's effective group membership and use fresh sign-ins. Compare tenant IDs, application IDs, account selection, and cross-tenant access type. Do not assume two links with the same branding target the same resource application.

### AADSTS500212 changes to AADSTS500213

The home-tenant outbound boundary now allows the request, but the resource tenant's inbound policy does not. Hand the new error, request identifiers, tenant IDs, application ID, and timestamp to the resource-tenant administrator. Do not widen the home-tenant rule further.

### The error changes to AADSTS53003

Cross-tenant access reached a later control. Read the resource tenant's Conditional Access result and authentication details. Preserve home-tenant MFA and device claims, the resource tenant's trust configuration, and the policy result before changing anything.

### The browser works but Teams, SharePoint, or another client fails

Compare the application ID, resource, client type, token context, and tenant selected by each path. The outbound application target might allow one client or resource but not another. Do not add the whole Microsoft 365 suite until the business owner has defined the actual requirement.

### Cross-tenant synchronization also stops

Treat synchronization as a separate dependency on the partner relationship. Microsoft warns that broad blocks in cross-tenant access can affect cross-tenant synchronization. Restore only the documented synchronization requirements; do not convert the entire partner to unrestricted access.

## Administrator checklist

- [ ] Capture AADSTS500212, UTC time, request ID, and correlation ID
- [ ] Prove the user's home tenant and the resource tenant by ID
- [ ] Record application ID, resource, and cross-tenant access type
- [ ] Inspect home-tenant outbound B2B collaboration defaults
- [ ] Check for a partner-specific override and remember that it wins
- [ ] Evaluate both Users and groups and External applications
- [ ] Verify same-cloud or cross-cloud prerequisites
- [ ] Snapshot policy and `CrossTenantAccessSettings` audit evidence
- [ ] Confirm role and P1 requirements for the intended scope
- [ ] Approve the exact user/group-to-application relationship
- [ ] Pilot the narrow organization-specific change
- [ ] Validate fresh allowed and blocked sign-ins
- [ ] Confirm inbound policy and Conditional Access still enforce normally
- [ ] Monitor outbound sign-ins and audit events
- [ ] Keep a precise rollback snapshot and support escalation package

## FAQ

### Which tenant fixes AADSTS500212?

The user's home tenant. Microsoft's error reference maps AADSTS500212 to the home administrator's outbound cross-tenant access policy. If the code is AADSTS500213, the resource tenant's inbound policy is the failing boundary.

### Should I delete and reinvite the guest?

No, not as a fix for this code. A guest object or invitation does not override a home-tenant outbound block. Reinvitation can also change redemption state while leaving the policy decision untouched.

### Does allowing the partner bypass Conditional Access?

No. Outbound cross-tenant access answers whether the home tenant permits the user to reach that external tenant and application. The resource tenant still evaluates its inbound policy, application authorization, Conditional Access, and any accepted home-tenant trust claims.

### Should I allow all users and all applications temporarily?

Not for troubleshooting. That can expose unrelated users and resources and makes the successful test ambiguous. Use a pilot group and the verified external application, then expand only from observed business requirements.

### Is AADSTS500212 a tenant-restrictions error?

Microsoft documents tenant restrictions as a separate control for external accounts used on managed networks or devices. Cross-tenant inbound, outbound, and trust settings do not replace tenant restrictions. Diagnose the exact code, cross-tenant access type, identity, and policy evidence rather than changing both systems at once. ([tenant restrictions in the cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#tenant-restrictions))

The useful mental model is simple: **AADSTS500212 names the home tenant's outbound gate**. Prove the resource tenant and application, calculate the effective default-plus-partner policy, change the smallest approved user-and-app scope, then validate the later inbound and Conditional Access gates without weakening them.
