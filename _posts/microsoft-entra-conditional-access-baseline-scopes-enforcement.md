---
title: "Conditional Access Baseline Scopes: Enforcement Guide"
excerpt: "Understand Microsoft Entra baseline scopes enforcement. Audit resource exclusions, find affected apps, test Conditional Access, and roll out safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-19T17:12:22-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An application is excluded from your **All resources** Conditional Access policy, yet its user suddenly receives an MFA or compliant-device challenge. The exclusion looks correct. The sign-in log says the policy still evaluated. Nothing about that combination feels intuitive until you account for Microsoft's new treatment of **baseline scopes**.

**Conditional Access baseline scopes enforcement** now evaluates sign-ins that request only a small set of OpenID Connect or directory scopes as access to the directory. When an **All resources** policy has a resource exclusion, those baseline-only requests no longer inherit the old automatic bypass. Entra maps them to the **Windows Azure Active Directory** resource for Conditional Access evaluation, so the applicable MFA, device, location, or block controls can run even when the client application itself is excluded.

Grab a coffee before changing the exclusion. The right response is to inventory All resources policies with resource exclusions, identify clients that request *only* baseline scopes, validate the new enforcement in sign-in logs, and remove exemptions that no longer have a business reason. If one business-critical flow cannot handle the challenge, use Microsoft's per-policy customization as a temporary, documented compatibility measure. Do not disable the new behavior tenant-wide merely to make one application quiet.

## Conditional Access baseline scopes enforcement in one table

Microsoft's current guidance says the phased rollout began **June 15, 2026** and proceeds over several weeks. An earlier technical page still mentions a March 2026 phase start; the dedicated enforcement guide and Microsoft's announcement were subsequently updated to June 15. Use the dedicated guide and your tenant's **Baseline scopes settings** as the operational source of truth rather than assuming every tenant changed on the same day. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions), [Microsoft Entra announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/upcoming-conditional-access-change-improved-enforcement-for-policies-with-resour/4488925))

| Question | Current answer |
|---|---|
| What changed? | Baseline-only requests are evaluated as directory access instead of being automatically left out when an All resources policy contains a resource exclusion. |
| Which policies matter? | All resources policies with one or more resource exclusions, plus policies that explicitly target Windows Azure Active Directory. |
| Which requests matter? | User sign-ins where the client requests only the documented baseline OIDC or directory scopes. |
| What can users see? | MFA, device-compliance, app-protection, location, terms-of-use, or block outcomes from the policies that apply to them. |
| What did not change? | Requests containing any scope beyond the baseline set were already evaluated against their target resource. Excluded confidential clients requesting only OIDC scopes are also documented as unaffected. |
| Is this preview behavior? | No. Microsoft [lists the improved enforcement as a generally available changed feature](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---improved-enforcement-for-all-resources-policies-with-resource-exclusions). The rollout itself is phased. |
| Can an admin control it? | Yes. The Baseline scopes settings can enable the new model, customize legacy behavior for selected policies, or disable it tenant-wide. Microsoft recommends full enforcement and warns against tenant-wide disablement. |

The key distinction is **client** versus **resource**. Conditional Access does not merely ask which application presented the sign-in screen. It evaluates the resource and scopes for which a token is requested. The site's [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) is useful background if those two identities are being conflated in the incident room.

## What Microsoft means by baseline scopes

The current enforcement guide defines two groups:

- **OpenID Connect scopes:** `email`, `offline_access`, `openid`, and `profile`.
- **Directory scopes:** `User.Read`, `User.Read.All`, `User.ReadBasic.All`, `People.Read`, `People.Read.All`, `GroupMember.Read.All`, and `Member.Read.Hidden`.

These scopes support common sign-in-time needs such as obtaining identity claims, displaying a user profile, or reading limited directory information. Under the legacy behavior, an All resources policy with any resource exclusion automatically left some low-privilege scope requests outside enforcement. Microsoft documents why that exception existed: many clients request profile or directory information alongside their normal authentication flow, and the old behavior tried to avoid accidental lockouts. ([Target resources in Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps#legacy-conditional-access-behavior-when-an-all-resources-policy-has-a-resource-exclusion))

The new model closes that implicit gap. For Conditional Access evaluation, Entra maps a request containing only the listed scopes to **Windows Azure Active Directory**, application ID `00000002-0000-0000-c000-000000000000`. An All resources policy includes that resource even when administrators cannot select every underlying directory operation as a named application. The Azure AD Graph product retirement does not remove this resource object from the tenant; Microsoft explicitly documents that boundary. ([New Conditional Access behavior](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps#new-conditional-access-behavior-when-an-all-resources-policy-has-a-resource-exclusion))

> [!IMPORTANT]
> **Analysis:** an application exclusion is not a promise that every token request made during that application's sign-in journey is exempt. It excludes the selected resource from the policy. A separate baseline-only directory request can still be evaluated as Windows Azure Active Directory access.

## Decide whether your tenant and application are affected

All three conditions must be present:

1. at least one Conditional Access policy targets **All resources**;
2. that policy contains at least one **resource exclusion**; and
3. a user signs in through a client that requests only baseline scopes.

If an All resources policy has no resource exclusions, Microsoft says this behavior change does not affect it. The policy already covered the baseline request. If the client requests `Mail.Read`, `Files.Read`, or any other non-baseline scope, that request was already evaluated against its actual resource and does not become a new baseline-scopes case. ([Affected scenarios and boundaries](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions#who-is-affected))

Use these decisions before treating every new prompt as the rollout:

- **Public desktop client requests only `openid` and `profile`: likely involved.** Inspect the Conditional Access audience and policy result in the sign-in log.
- **Azure CLI flow requests only `User.Read`: likely involved.** Look for Windows Azure Active Directory as the enforcement audience.
- **Excluded confidential web app requests only `User.Read` and `People.Read`: likely involved.** Confirm whether the app can use OIDC claims instead of directory scopes.
- **Excluded confidential web app requests only `openid` and `profile`: no change expected.** Investigate other token requests and applicable policies.
- **Client requests `offline_access` and `Files.Read`: not a baseline-only request.** Evaluate the SharePoint resource and its exclusions.
- **All resources policy has no excluded resources: no change from this feature.** Troubleshoot the policy normally.
- **Failure occurs during device registration or Windows Hello provisioning: not this change by itself.** Inspect policies targeting registration, device state, and the actual resource. Microsoft says this update does not change those enrollment experiences.

Microsoft's own examples use Visual Studio Code, Azure CLI, and an excluded confidential client to show the before-and-after challenge. Treat those as architecture examples, not a complete affected-application list. The decisive evidence is the real request in your tenant. ([Microsoft's user-experience examples](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions#user-experience))

## Inventory All resources policies and exclusions first

Start with policy design, not failed-user screenshots.

For every Conditional Access policy whose target resources are **All resources**, record:

- policy ID, display name, state, owner, and last approved change;
- included and excluded users, groups, roles, and external identities;
- every excluded resource;
- device, platform, client-app, location, risk, and authentication-flow conditions;
- grant controls and whether the operator is `AND` or `OR`;
- session controls;
- emergency-access exclusions;
- whether a business process explicitly depends on the resource exclusion; and
- the application owner and vendor escalation path for each dependency.

Do not limit the inventory to enabled policies. Report-only and disabled policies reveal planned migrations, rollback assumptions, and duplicated logic that might return later. Use **What If** to confirm policy targeting for representative users, devices, locations, and resources, but remember that What If is a policy simulator. It does not execute an application's actual OAuth request or prove that a client handles a claims challenge.

Then narrow the application population. Microsoft recommends focusing on clients that request only baseline scopes and especially on applications explicitly excluded from All resources policies. For tenant-owned confidential clients that need only identity information, ask developers whether OIDC claims such as `openid` and `profile` replace the directory call. For vendor-owned clients, obtain a supported statement from the vendor; do not add a broader Graph permission just to escape the baseline classification. ([Microsoft's application actions](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions#what-you-need-to-do))

## Confirm licensing, roles, and recovery ownership

Conditional Access requires Microsoft Entra ID P1. Microsoft 365 Business Premium also includes Conditional Access capability; risk-based policies require the P2-backed ID Protection capability. Other controls, such as Intune compliance or app protection, retain their own licensing requirements. ([Conditional Access licensing](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview#license-requirements))

Microsoft's enforcement procedure requires at least **Conditional Access Administrator** to change the Baseline scopes setting. A **Reports Reader** can inspect sign-in logs in the portal. If you query sign-ins with Microsoft Graph, the least-privileged Graph permission is `AuditLog.Read.All`; reading applied Conditional Access policy objects requires an additional supported role or policy-read permission. ([List sign-ins permissions](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0#permissions))

Separate these responsibilities in the change record:

- a Conditional Access owner inventories and approves policy behavior;
- each application owner validates protocol and user experience;
- the endpoint team validates compliance and app-protection paths;
- the service desk receives the new prompt and error decision tree;
- the security operations team monitors unexpected failures; and
- an incident owner holds the rollback decision.

Keep tested emergency access accounts excluded from the production policy set according to your established recovery design. This change does not broaden the permission to weaken emergency-access controls. It does increase the need to prove that an administrator can still reach the control plane if a client or device cannot satisfy the new challenge.

## Choose the enforcement mode deliberately

Microsoft exposes the control through a direct **Baseline scopes settings** link; the enforcement guide says that direct link is required to view the page. The three choices are materially different. ([Baseline scopes settings](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions#choose-how-baseline-scopes-are-enforced))

### Enable enforcement

This is Microsoft's recommended end state. It immediately applies the new behavior to All resources policies with exclusions. Baseline-only sign-ins that previously avoided policy evaluation can now be evaluated using Windows Azure Active Directory as the target resource.

Use a test tenant first when the application estate is unknown. Before enabling it in production, finish the policy and application inventory, validate emergency access, identify clients that cannot handle a challenge, define success thresholds, and schedule monitoring coverage. The setting is tenant-wide; it is not a user-ring toggle.

### Customize behavior for selected policies

Customize behavior is the narrow compatibility option. Microsoft instructs administrators to register a single-tenant application as a **placeholder target resource**, exclude that application from the relevant policy, then select it in the Baseline scopes settings. For that policy, baseline scopes are evaluated against the placeholder; because the placeholder is excluded, the legacy behavior remains for that policy. Full enforcement continues elsewhere. ([Customize behavior procedure](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions#customize-behavior))

That placeholder is not the affected client application and it is not granted directory access merely by being registered. It is a control-plane mapping object for this compatibility behavior. Give it a clear name, owner, review date, and deletion condition. Treat every customized policy as technical debt with an expiry, not a permanent exception that disappears into the app-registration inventory.

Microsoft lists legitimate temporary cases: a policy requiring a compliant device when a necessary public client must work unmanaged, a policy requiring app protection when a client lacks the Intune SDK integration, or a block policy with a justified exception. In each case, preserve legacy behavior only for the specific policy that needs it.

### Disable enforcement tenant-wide

Microsoft warns that **Disable enforcement** turns off the new behavior for every policy in the tenant and can create Conditional Access coverage gaps. If an administrator selects Disable or Customize, the rollout does not overwrite that configured choice; the tenant stays on the selected behavior until someone changes it. ([Disable enforcement warning](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions#disable-enforcement))

Tenant-wide disablement is an emergency mitigation, not a finished architecture. If used, record the incident, affected applications, UTC start time, approver, monitoring controls, and a near-term restoration deadline. Prefer per-policy customization when the failure is isolated.

## Find affected applications in sign-in evidence

After enforcement is enabled, Microsoft says baseline-only events show the chosen target application as a **Conditional Access audience** in sign-in logs. In the default enforced model, expect Windows Azure Active Directory to be the mapped resource. Under customized behavior, use the custom placeholder application's ID to find matching events. ([Identify affected applications](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions#identify-affected-applications-with-a-custom-target-resource))

For each suspected event, preserve:

- UTC timestamp, user, client application, and application ID;
- resource and Conditional Access audience;
- interactive or non-interactive sign-in type;
- device ID, operating system, browser, join state, and compliance state;
- IP address, location, and named-location result;
- Conditional Access status and every evaluated policy;
- grant controls satisfied or failed;
- authentication details;
- failure code, failure reason, correlation ID, and request ID; and
- the application's own request or trace ID when available.

The dedicated Microsoft guide includes a read-only Microsoft Graph beta query that filters `conditionalAccessAudiences` for the placeholder application ID. Adapt the UTC interval and ID; do not copy the sample's May dates into a production investigation:

```text
GET https://graph.microsoft.com/beta/auditLogs/signIns?$filter=createdDateTime ge <start-UTC> and createdDateTime lt <end-UTC> and conditionalAccessAudiences/any(a:a eq '<placeholder-app-id>')&$select=createdDateTime,appId,appDisplayName,userDisplayName,userPrincipalName,ipAddress,conditionalAccessStatus
```

The `conditionalAccessAudiences` filter in this workflow is documented on the beta endpoint. Microsoft Graph SDKs use v1.0 by default, so use the beta request only for this supported diagnostic purpose, keep the time range bounded, and do not build a permanent production dependency on an undocumented extension of the sample. The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains how to read the resulting policy evidence.

## Roll out without turning the control plane into a test case

Use this sequence:

1. **Freeze new broad exclusions.** Require an owner and expiry for every All resources policy exclusion while the inventory is open.
2. **Reproduce in a test tenant.** Match the relevant policy shape, client type, scopes, and device state. Enable enforcement there and record both successful and denied outcomes.
3. **Fix tenant-owned clients.** Make them handle Conditional Access claims challenges using Microsoft's [developer guidance](https://learn.microsoft.com/en-us/entra/identity-platform/v2-conditional-access-dev-guide). Where directory reads are unnecessary, reduce the request to appropriate OIDC scopes.
4. **Obtain vendor readiness.** Ask for supported versions, scope behavior, MSAL or equivalent challenge handling, device and broker support, and a remediation date.
5. **Create only necessary policy customizations.** Record the placeholder application, mapped policies, business justification, owner, expiry, and removal test.
6. **Enable enforcement in an approved window.** Staff identity, application, endpoint, service-desk, and security monitoring roles.
7. **Observe at least one full business cycle.** Cover desktop, browser, mobile, remote, office, managed, unmanaged, guest, administrator, and automation-adjacent user journeys that actually exist in the tenant.
8. **Remove customizations one policy at a time.** Validate each application's challenge handling and sign-in evidence before deleting its compatibility entry.

Define thresholds before the window: total new failures, unique affected users, business-critical application failures, service-desk volume, device-compliance failures, and mean recovery time. A successful login rate alone can hide one low-volume but critical administrative tool.

> [!NOTE]
> Report-only policy results can validate policy targeting, but they do not prove that a client can complete MFA, device compliance, or an OAuth claims challenge. End-to-end proof requires controlled live authentication with an active policy.

## Troubleshoot the new MFA or device prompt

Work from the failing control backward:

1. **Confirm the request is baseline-only.** If a non-baseline scope is present, troubleshoot that resource instead.
2. **Confirm the mapped audience.** Windows Azure Active Directory or the configured placeholder ties the event to this enforcement model.
3. **Read every policy result.** A second All resources policy might be the real blocker.
4. **Identify the exact failed grant.** MFA, compliant device, app protection, authentication strength, terms of use, and block are different incidents.
5. **Check device evidence, not device reputation.** A device can be healthy in Intune while the sign-in lacks the device ID or compliance claim expected by Conditional Access.
6. **Check client challenge handling.** A public client that does not process the claims challenge might surface a generic login loop or token-acquisition error.
7. **Validate the intended exclusion.** Confirm whether the excluded object is the client, the resource, or merely a similarly named enterprise application.
8. **Correlate by UTC time and IDs.** Avoid comparing a successful interactive event with a later failed silent token request.

If the user receives `AADSTS53003`, the code means Conditional Access blocked token issuance; it does not name the failed policy. Use the [AADSTS53003 diagnostic path](/posts/aadsts53003-access-blocked-by-conditional-access) and the log's Conditional Access tab to find the specific control.

Do not “fix” the incident by adding the user to an exclusion group, granting a broader Graph scope, or converting an All resources policy into a collection of hand-picked apps. Those moves can erase coverage well beyond the client being investigated.

## Rollback and escalation

The narrow rollback is policy customization for the affected policy. The broad rollback is tenant-wide Disable enforcement, which Microsoft warns can reopen coverage gaps. Choose the narrow path whenever the evidence isolates one policy or application.

Before rollback, save the sign-in records and current Baseline scopes setting. After rollback, repeat the exact failing request and prove that the expected legacy behavior returned. Then open the remediation track: client challenge handling, OIDC scope reduction, device integration, vendor upgrade, or policy redesign. A rollback without a dated remediation owner becomes an undocumented permanent exception.

Escalate to the application vendor when the request scope or claims-challenge behavior is wrong. Escalate to Microsoft when the tenant setting, mapped audience, and policy result contradict the documented behavior or when the same known-good client fails across users and policies. Include tenant ID, UTC interval, application and resource IDs, policy IDs, correlation and request IDs, the Baseline scopes mode, relevant sanitized logs, and a minimal reproduction. Never send access tokens, refresh tokens, client secrets, or private keys.

## Administrator checklist

- [ ] Confirm the tenant has All resources policies with resource exclusions.
- [ ] Export enabled, report-only, and disabled policy design and ownership.
- [ ] Inventory every excluded resource and its business dependency.
- [ ] Identify public and confidential clients that request only baseline scopes.
- [ ] Confirm Conditional Access licensing and administrator roles.
- [ ] Validate emergency access and incident ownership.
- [ ] Test representative flows in a test tenant.
- [ ] Make tenant-owned clients handle Conditional Access claims challenges.
- [ ] Reduce unnecessary directory scopes to supported OIDC claims where appropriate.
- [ ] Obtain vendor support statements for third-party clients.
- [ ] Use Customize behavior only for specific documented policies.
- [ ] Name, own, review, and expire the placeholder application.
- [ ] Enable enforcement in a monitored change window.
- [ ] Correlate the mapped audience, policy result, and failed grant in sign-in logs.
- [ ] Remove per-policy customizations after the application is remediated.
- [ ] Require zero unjustified legacy mappings before closing the program.

The clean mental model is this: **All resources means all token resources, not simply all sign-in screens**. Baseline scopes are now explicit directory access in the Conditional Access decision. Once the incident team separates client, resource, scope, audience, and grant control, the apparently impossible result—“the app is excluded, but the policy still applied”—becomes a traceable and fixable policy outcome.

## FAQ

### Does excluding an application from All resources exclude its baseline scopes?

Not under the new default model. If the sign-in makes a baseline-only request, Entra evaluates that request as Windows Azure Active Directory access. Use the sign-in log's Conditional Access audience and policy results to prove which resource was evaluated.

### Should we add a non-baseline Graph permission to avoid the new challenge?

No. Permissions must follow the application's data requirement, not a Conditional Access workaround. Adding a broader scope increases data access and moves enforcement to another resource; it does not repair challenge handling or policy design.

### Can we roll out enforcement to one user group?

The Baseline scopes enforcement setting is tenant-wide. Microsoft provides per-policy legacy customization, not a user-ring toggle. Use a test tenant, finish the production inventory, then retain legacy behavior only for specific policies that have a proven compatibility need.

### Why does Windows Azure Active Directory appear when Azure AD Graph is retired?

Microsoft says the Azure AD Graph retirement does not remove the Windows Azure Active Directory resource registered in the tenant. Entra uses that resource as the Conditional Access evaluation target for these directory scopes.

### Will this change block Windows Hello for Business during Autopilot?

Microsoft says the baseline-scopes change does not alter device enrollment, compliance establishment, or Windows Hello for Business provisioning. If that journey fails, inspect the actual resources and any policies targeting security-information registration or device registration rather than assuming baseline scopes are the cause.

### What is the safest temporary mitigation?

Use Customize behavior for the specific policy and a documented placeholder application. Tenant-wide Disable enforcement is broader and Microsoft warns it can create coverage gaps.

## References

- [Improved enforcement for All resources policies with resource exclusions — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions)
- [Microsoft Entra releases and announcements — Microsoft Learn](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---improved-enforcement-for-all-resources-policies-with-resource-exclusions)
- [Targeting resources in Conditional Access policies — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps)
- [Upcoming Conditional Access enforcement change — Microsoft Entra Blog](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/upcoming-conditional-access-change-improved-enforcement-for-policies-with-resour/4488925)
- [Developer guidance for Conditional Access claims challenges — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/v2-conditional-access-dev-guide)
- [List sign-ins with Microsoft Graph — Microsoft Learn](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0)
