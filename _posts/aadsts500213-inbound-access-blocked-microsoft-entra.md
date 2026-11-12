---
title: "AADSTS500213 Inbound Access Blocked: Microsoft Entra Fix"
excerpt: "Fix AADSTS500213 by tracing the resource tenant’s inbound policy, external user and app scope, trust settings, logs, and least-privilege recovery."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-12T17:33:19-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS500213 inbound access blocked** error means the resource tenant's cross-tenant access policy does not allow this external user to access the tenant. The fix belongs in the resource tenant: prove the user's home tenant, calculate the effective inbound B2B collaboration rule, evaluate both the external-user scope and the internal-application scope, and change only the approved partner relationship. Do not delete the guest, disable Conditional Access, or open inbound access for every organization.

Grab a coffee and preserve the complete failure before anyone touches policy. Microsoft's error reference names AADSTS500213 `NotAllowedByInboundPolicyTenant` and assigns the decision to the resource tenant. The neighboring AADSTS500212 is the opposite boundary: the user's home tenant blocked outbound access to the resource tenant. Those two errors require different administrators and different evidence. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

This guide is for workforce-tenant administrators troubleshooting B2B collaboration. It covers effective policy, partner overrides, application targeting, inbound trust, Conditional Access, licensing, evidence, rollback, and escalation. It does not treat an invitation, guest object, entitlement assignment, or successful home-tenant MFA challenge as proof that the resource tenant currently allows the sign-in.

## AADSTS500213 inbound access blocked: the short answer

Work through these checks in order:

1. Capture the exact error, UTC timestamp, request ID, correlation ID, home tenant ID, resource tenant ID, user, and application ID.
2. Confirm that the user authenticated with the intended home-tenant identity and reached the intended resource tenant.
3. In the **resource tenant**, open **Entra ID > External Identities > Cross-tenant access settings**.
4. Inspect the inbound B2B collaboration defaults, then find any organization-specific entry for the user's home tenant. A customized organization setting takes precedence over the default.
5. Evaluate both sides of the effective inbound rule: **External users and groups** and **Applications**. The external identity and the resource-tenant application must both be allowed.
6. Keep inbound trust separate. Trusting the home tenant's MFA or device claims can help satisfy a later Conditional Access requirement, but it does not turn a blocked inbound B2B rule into an allow.
7. If the tenants use different Microsoft clouds, verify the cross-cloud relationship on both sides before changing ordinary inbound scope.
8. Pilot the smallest approved partner-specific change, acquire a fresh sign-in, and verify both the intended allow and an intended deny.

AADSTS500213 is the resource tenant's cross-tenant authorization decision. Reinviting the guest, resetting MFA, adding app consent, or excluding the user from Conditional Access does not repair a blocked inbound rule.

## Understand where the inbound decision happens

The useful control-plane model is:

```text
external user in home tenant
        -> home tenant outbound policy
        -> resource tenant inbound policy
        -> resource application and Conditional Access
```

Microsoft defines inbound settings as the control over which users from external Microsoft Entra organizations can access which applications in your organization. Outbound settings control whether your own users can access external organizations. B2B collaboration is allowed by the initial service defaults, but administrators can replace those defaults and can create organization-specific settings that override them for one partner. ([cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview), [manage B2B collaboration settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration))

That gives each nearby error a precise owner:

- **AADSTS500213:** the resource-tenant administrator inspects inbound cross-tenant access.
- **AADSTS500212:** the home-tenant administrator inspects outbound access; use the companion [AADSTS500212 outbound access guide](/posts/aadsts500212-outbound-access-blocked-microsoft-entra).
- **AADSTS50020:** prove the identity, tenant, guest object, redemption path, and application context with the [AADSTS50020 external-user sign-in guide](/posts/microsoft-entra-aadsts50020-external-user-sign-in-failures).
- **AADSTS53003:** cross-tenant policy reached a later Conditional Access decision; use the [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs).

A guest object can exist while inbound access is blocked. An access package can assign that guest while the cross-tenant gate still denies the sign-in. Likewise, allowing the inbound relationship does not bypass application assignment, Conditional Access, Terms of Use, or accepted MFA and device-claim requirements.

## Preserve evidence before changing cross-tenant policy

Record a small incident packet:

- complete sanitized error code and description;
- UTC failure time, request ID, and correlation ID;
- external user's sign-in name and home tenant ID;
- resource tenant ID and resource application ID;
- application display name and resource name;
- cross-tenant access type, client, device, and network path;
- last successful sign-in and first failed sign-in;
- whether one person, one partner, one application, or all external users are affected;
- recent audit events in the `CrossTenantAccessSettings` category.

Microsoft's sign-in documentation exposes the home tenant ID, resource tenant ID, and cross-tenant access type. The type separates B2B collaboration, B2B direct connect, service-provider, passthrough, and other events. Microsoft does not populate the home tenant name in cross-tenant events because of its privacy commitments, so use the tenant ID rather than guessing from branding or email suffixes. ([interactive user sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-interactive-sign-ins), [sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details#basic-info-and-location))

Capture the application ID from evidence, not from a similarly named enterprise application. Inbound application targeting can use a client app ID or resource app ID, and Microsoft explicitly recommends obtaining object and application identifiers from the partner when configuring granular scope. ([B2B collaboration prerequisites](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#prerequisites))

## Calculate the effective inbound B2B collaboration rule

In the resource tenant, browse to **Entra ID > External Identities > Cross-tenant access settings** and read the configuration in this order:

1. Open **Default settings** and inspect inbound B2B collaboration.
2. Open **Organizational settings** and locate the user's home tenant by tenant ID.
3. If there is no partner entry, the inbound default applies.
4. If the partner entry says **Inherited from default**, read the default; inherited does not mean allowed.
5. If the partner has customized inbound settings, that organization-specific configuration takes precedence.
6. Within the effective rule, inspect both **External users and groups** and **Applications**.

Microsoft documents that a newly added organization initially inherits the default and that organization-specific settings take precedence once customized. It also prevents contradictory all-user and all-application configurations. If all external users are blocked, all applications must be blocked too; otherwise, evaluate the two scopes together. ([cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#organizational-settings), [modify inbound access settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#modify-inbound-access-settings))

Interpret the effective pair carefully:

- **Allow selected external users or groups:** external identities outside the selected scope are blocked.
- **Block selected external users or groups:** selected identities are blocked; identities outside the list remain eligible.
- **Allow selected applications:** every other resource-tenant application is blocked by that rule.
- **Block selected applications:** the selected applications are blocked; applications outside the list remain eligible.

The Graph policy overview documents how target `accessType` and target collections produce allowlist or blocklist behavior. A user match alone is not enough when the application side is an allowlist. ([cross-tenant access policy API overview](https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicy-overview?view=graph-rest-1.0#interpreting-the-api-response))

Common failures include:

- a restrictive inbound default applies because no partner override exists;
- the partner override allows a group, but the failing user's home-tenant object ID is not in scope;
- the external user is allowed, but the resource application is missing from an application allowlist;
- the policy targets a client app ID while the sign-in evidence identifies a different resource app, or the reverse;
- an administrator edited B2B direct connect while the event uses B2B collaboration;
- a cross-cloud partner was not enabled and added in both organizations;
- a broader default or partner rule changed after the guest was invited.

Do not assume the resource tenant can search the partner's directory by friendly name. Microsoft instructs administrators to obtain the external user or group object IDs from the partner organization for targeted inbound settings. ([configure selected external users and groups](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#to-change-inbound-b2b-collaboration-settings))

## Read the policy safely with Microsoft Graph PowerShell

The portal is the best place to understand the intended relationship. A read-only Graph snapshot gives change control an exact before-state. Microsoft documents `Policy.Read.All` as the least-privileged permission for reading default and partner-specific cross-tenant policy. Supported read roles include Security Reader, Global Reader, and Security Administrator. ([get the default configuration](https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationdefault-get?view=graph-rest-1.0), [get a partner configuration](https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationpartner-get?view=graph-rest-1.0))

```powershell
$homeTenantId = "00000000-0000-0000-0000-000000000000"

Connect-MgGraph -Scopes "Policy.Read.All"

$default = Get-MgPolicyCrossTenantAccessPolicyDefault
$partner = Get-MgPolicyCrossTenantAccessPolicyPartner `
    -CrossTenantAccessPolicyConfigurationPartnerTenantId $homeTenantId

$default |
    Select-Object IsServiceDefault, B2BCollaborationInbound, InboundTrust

$partner |
    Select-Object TenantId, B2BCollaborationInbound, InboundTrust
```

The default object shows whether the tenant still uses Microsoft's service default. The partner object is keyed by the external tenant ID. A missing partner returns no partner-specific configuration; a `null` partner property inherits the corresponding default behavior. ([default-policy PowerShell reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/get-mgpolicycrosstenantaccesspolicydefault?view=graph-powershell-1.0), [partner-policy PowerShell reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/get-mgpolicycrosstenantaccesspolicypartner?view=graph-powershell-1.0), [partner resource type](https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicyconfigurationpartner?view=graph-rest-1.0))

If you are not sure whether a partner object exists, list partner configurations first rather than treating a not-found response as policy corruption:

```powershell
Get-MgPolicyCrossTenantAccessPolicyPartner -All |
    Select-Object TenantId, B2BCollaborationInbound, InboundTrust
```

Keep this step read-only during diagnosis. Creating a partner entry merely to inspect it changes inheritance and complicates rollback.

## Keep inbound access, trust, and Conditional Access separate

Inbound B2B collaboration decides **who from the partner can reach which resource-tenant applications**. Inbound trust decides whether the resource tenant accepts the partner tenant's MFA, compliant-device, or Microsoft Entra hybrid-joined-device claims. Conditional Access then evaluates the resource tenant's policies using the available context. These controls cooperate, but they are not interchangeable. ([cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#organizational-settings), [authentication and Conditional Access for external users](https://learn.microsoft.com/en-us/entra/external-id/authentication-conditional-access))

For example, allowing an external user and SharePoint Online through inbound policy does not automatically trust that user's home-tenant MFA claim. If the resource tenant requires MFA and MFA trust is disabled, Microsoft can challenge the external user in the resource tenant with an acceptable method. If a resource-tenant device policy requires a managed device, external users can be blocked because their devices are managed by their home tenant; the resource tenant can choose whether to trust compliant-device or hybrid-joined claims from that organization. Those are explicit security decisions, not troubleshooting switches.

**Analysis:** If AADSTS500213 disappears and the next fresh event fails a Conditional Access control, that is evidence that the request crossed the inbound gate and reached a later policy. Preserve the new error and sign-in result. Do not keep widening inbound scope after its error has cleared.

## Check adjacent invitation and application controls

Cross-tenant access settings and external collaboration settings answer different questions. Microsoft says cross-tenant access controls authentication with other Entra organizations, while external collaboration settings control invitation permissions, domain allow/block lists, and guest directory restrictions. Both are evaluated during invitation. A domain block can prevent an invitation even when cross-tenant access allows the organization. ([What is B2B collaboration?](https://learn.microsoft.com/en-us/entra/external-id/what-is-b2b#cross-tenant-access-settings-and-external-collaboration-settings), [B2B collaboration prerequisites](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#prerequisites))

For native SharePoint and OneDrive sharing with Entra B2B integration, Microsoft also warns that the external domain must be permitted in external collaboration settings; adding the tenant only to cross-tenant access settings is not sufficient for those invitations. This is an invitation-path dependency, not permission to broaden the inbound application list. ([manage B2B collaboration settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#modify-inbound-access-settings))

If the guest is assigned through entitlement management, keep assignment and authentication as separate planes. The [external-user access package guide](/posts/assign-external-users-microsoft-entra-access-packages) covers the assignment lifecycle; an active assignment cannot override an inbound cross-tenant block.

## Verify role and licensing prerequisites

Microsoft lists **Security Administrator** as the minimum built-in role for configuring cross-tenant access in the portal and publishes recommended custom roles for narrower administration and read access. Prefer a scoped custom role when the operating model supports it. ([manage B2B collaboration settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#prerequisites), [custom roles for cross-tenant access](https://learn.microsoft.com/en-us/entra/external-id/reference-cross-tenant-custom-roles))

Granular targeting has a licensing boundary: Microsoft marks selecting specific external users, groups, or applications as requiring Microsoft Entra ID P1 or P2. Its overview also states that P1 is required in the tenant being configured when access settings target specific users, groups, or applications or when trust settings are changed. B2B direct connect requires P1 in both tenants because both sides configure the mutual relationship. ([modify inbound access settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#modify-inbound-access-settings), [cross-tenant access overview](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#organizational-settings))

The optional cross-tenant access activity workbook requires Entra ID P1, a Log Analytics workspace, workspace access, and the appropriate Microsoft Entra and Azure Monitor roles. It can filter inbound and outbound activity by external tenant, user, application, status, and a time range of up to 90 days. ([cross-tenant access activity workbook](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/workbook-cross-tenant-access-activity))

## Make the smallest authorized inbound change

Before editing policy, write down:

1. Which external user object IDs or partner-managed group should be allowed?
2. Which exact resource-tenant application IDs do they need?
3. Which home tenant owns those identities?
4. Which resource owner approved the relationship?
5. Which currently blocked persona and application will prove the rule did not become broader?

Prefer a partner-specific rule over weakening the default for every external organization. Start with a pilot identity or partner group and only the required application set. Microsoft cautions that changing inbound defaults to block access can interrupt business-critical applications and recommends reviewing cross-tenant activity with business stakeholders before policy changes. The inverse matters too: an emergency `All external users` plus `All applications` allow is not a controlled repair. ([B2B collaboration prerequisites](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#prerequisites))

Selected-application allowlists need deliberate supporting-resource review. Microsoft notes that an allowlist containing only SharePoint Online can prevent access to My Apps or MFA registration in the resource tenant, and documents specific Microsoft application considerations for MFA registration and Terms of Use. Add a supporting application only when the sign-in flow and policy require it; do not paste a broad suite of app IDs into every partner rule. ([considerations for allowing Microsoft applications](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration#considerations-for-allowing-microsoft-applications))

Do not delete the organization entry as a shortcut. The same partner object can hold outbound access, inbound trust, cross-tenant synchronization, automatic consent, tenant restrictions, and Microsoft 365 collaboration settings. Removing it can change unrelated controls. ([partner configuration resource](https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicyconfigurationpartner?view=graph-rest-1.0))

## Validate the fix without weakening later controls

After the approved policy change, acquire a fresh sign-in with the pilot user and verify:

- the identity belongs to the expected home tenant;
- the request reaches the expected resource tenant and application ID;
- AADSTS500213 no longer appears;
- the required application opens;
- a deliberately unapproved application or external identity remains blocked;
- Conditional Access, app assignment, Terms of Use, and trust behavior still match design;
- the sign-in and the policy change appear in the resource tenant's evidence.

Microsoft recommends using sign-in logs, Graph, the cross-tenant activity workbook, and exported SIEM data to identify inbound and outbound activity. It records cross-tenant policy changes in audit logs under the `CrossTenantAccessSettings` category. ([identify inbound and outbound sign-ins](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#identify-inbound-and-outbound-sign-ins), [identify cross-tenant setting changes](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-overview#identify-changes-to-cross-tenant-access-settings))

Do not invent a propagation promise. Record the save time and every controlled retry with its request and correlation IDs. If current configuration clearly allows the exact tenant, identity, and application but a fresh sign-in still returns AADSTS500213, preserve the sanitized default and partner snapshots and escalate to Microsoft with both tenant IDs, the application ID, UTC time, request ID, and correlation ID.

## Roll back the exact partner change

If the pilot widens access or disrupts another external flow:

1. Stop expansion.
2. Restore the captured inbound user/group and application targets for that partner.
3. Preserve inbound trust and every unrelated property.
4. Acquire new sign-ins for the original allowed and blocked personas.
5. Confirm the rollback audit event and time.
6. Reconcile object IDs, app IDs, and allowlist-versus-blocklist interpretation before retrying.

Rollback should restore the known-good partner property, not reset the tenant default or delete the partner object.

## Troubleshoot the failures that remain

### The external user is allowed, but AADSTS500213 remains

Inspect the **Applications** side of the same effective inbound rule. A selected-user allow combined with a selected-application allow requires both matches. Compare the sign-in's client and resource app IDs with the configured target rather than relying on display names.

### The partner entry says inherited from default

Read the inbound default. Inheritance is a configuration relationship, not an access result. If the default is restrictive, the partner is restrictive until an approved override is created.

### Only one person in the partner group fails

Ask the partner to prove the external object ID and effective group membership, then compare the failing and successful sign-ins by home tenant ID, application ID, and cross-tenant access type. Do not substitute email address equality for object identity.

### AADSTS500213 changes to AADSTS53003

The inbound boundary now allows the request and a later Conditional Access decision denied it. Read the new event's Conditional Access and authentication details. Review inbound trust only if the policy design intends to accept the home tenant's MFA or device claims.

### The invitation fails before the user reaches sign-in

Check external collaboration domain restrictions and invitation permissions. For SharePoint or OneDrive native sharing, verify the documented external-domain requirement. Do not widen cross-tenant authentication policy to repair a blocked invitation path.

### Cross-tenant synchronization is also affected

Microsoft warns that blocking all external users and groups can block cross-tenant synchronization. Treat synchronization as an explicit dependency on the partner relationship and restore only its documented scope; do not grant unrestricted interactive access as a synchronization fix.

## Administrator checklist

- [ ] Capture AADSTS500213, UTC time, request ID, and correlation ID
- [ ] Prove the home and resource tenant IDs
- [ ] Record the resource application ID and cross-tenant access type
- [ ] Inspect resource-tenant inbound B2B defaults
- [ ] Check the home tenant's organization-specific override
- [ ] Evaluate External users and groups together with Applications
- [ ] Keep inbound trust separate from inbound access
- [ ] Verify same-cloud or cross-cloud prerequisites
- [ ] Check external collaboration controls when invitation is the failing stage
- [ ] Snapshot the policy and `CrossTenantAccessSettings` audit evidence
- [ ] Confirm role and P1/P2 requirements for the intended scope
- [ ] Approve the exact partner-identity-to-application relationship
- [ ] Pilot a narrow organization-specific change
- [ ] Validate one intended allow and one intended deny
- [ ] Confirm Conditional Access and app authorization still enforce normally
- [ ] Preserve an exact rollback snapshot and support escalation packet

## FAQ

### Which tenant fixes AADSTS500213?

The resource tenant. Microsoft's error reference says its cross-tenant inbound policy does not allow the user. AADSTS500212 points to the user's home tenant and its outbound policy instead.

### Should I delete and reinvite the guest?

No, not as a fix for this code. A guest object and an invitation do not override a resource tenant's inbound cross-tenant block. Reinvitation can alter redemption state while leaving the policy decision unchanged.

### Does an inbound allow bypass Conditional Access?

No. The allow only clears the cross-tenant inbound boundary for the configured external identity and resource application. The resource tenant still evaluates application authorization, Conditional Access, Terms of Use, and its decision to trust or rechallenge MFA and device claims.

### Is inbound trust the same as inbound access?

No. Inbound access controls the external users and applications allowed through the cross-tenant gate. Inbound trust controls whether the resource tenant accepts MFA, compliant-device, and hybrid-joined-device claims already established by the home tenant.

### Should I temporarily allow all external users and applications?

No. That exposes unrelated identities and resources and makes a successful retest ambiguous. Use the verified partner tenant, a pilot identity or partner group, and the required application set.

The durable mental model is: **AADSTS500213 names the resource tenant's inbound gate**. Prove the home tenant and resource application, calculate default-versus-partner inheritance, evaluate external-user and application targets together, and repair the narrowest approved relationship without weakening trust or Conditional Access.
