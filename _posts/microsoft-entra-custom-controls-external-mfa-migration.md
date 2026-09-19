---
title: "Migrate Microsoft Entra Custom Controls to External MFA"
excerpt: "Migrate Microsoft Entra custom controls to External MFA before retirement. Inventory Conditional Access policies, pilot safely, and preserve rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-19T09:07:03-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The change board meets next week, the Conditional Access policy still points at a custom control, and someone has just noticed Microsoft's September deadline. This is not the moment to replace one grant control in place and hope the same people receive the same challenge.

To **migrate Microsoft Entra custom controls to External MFA**, inventory every policy that references the old control, configure the provider as an External MFA method, register and scope a pilot population, create a separate policy using **Require multifactor authentication**, then move each rollout ring out of the old policy as it enters the new one. Prove the result in sign-in logs before expanding. Keep the old policy disabled, not deleted, until the new path has been stable for at least two weeks.

Grab a coffee before touching the first exclusion. Custom controls and External MFA can both redirect to a third-party provider, but they occupy different places in the Entra control plane. A careless overlap creates two prompts; a careless gap creates no MFA prompt at all.

## The Microsoft Entra custom controls retirement timeline

Microsoft's current public material gives administrators three boundaries to plan around:

| Boundary | What it means for the change plan |
|---|---|
| **March 24, 2026** | External MFA became generally available. It can satisfy the standard Conditional Access **Require multifactor authentication** grant. |
| **September 30, 2026** | Microsoft's GA and security announcements identify this as the custom-controls deprecation/retirement milestone. Current Learn documentation describes the practical September change as blocking creation of new custom controls and edits to existing ones. Existing configurations continue during the transition. |
| **May 2027** | Microsoft's security update identifies this as end of life. The Learn pages describe full retirement more broadly as early 2027. Treat May 2027 as the outside public deadline, not permission to begin the design in April. |

The exact distinction matters. September is not documented as a tenant-wide switch that immediately disables every existing control. It is the point after which an old design becomes harder to maintain while it approaches end of life. Microsoft's [External MFA GA announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/external-mfa-in-microsoft-entra-id-is-now-generally-available/4488926) confirms the September 30 deprecation milestone and says existing configurations continue during transition. The later [Microsoft Entra security update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/microsoft-entra-id-security-updates-what-organizations-need-to-do-now/4522024) adds the May 2027 end-of-life date. The current [custom-controls reference](https://learn.microsoft.com/en-us/entra/identity/conditional-access/controls) describes the new-and-edit cutoff as starting in September 2026.

This article is about the retirement migration. If the External MFA method is already deployed and one sign-in is failing, use the site's [External MFA troubleshooting guide](/posts/microsoft-entra-external-mfa-not-working) instead.

## Why this is not a grant-control rename

A custom control is a preview Conditional Access control that redirects the browser to an approved external service and then checks the response. Microsoft documents important limitations: it does not satisfy an Entra MFA claim and cannot be used for PIM activation, Identity Protection MFA remediation, SSPR, sign-in frequency, device join, cross-tenant trust, or Intune enrollment.

External MFA is an authentication method. The provider is registered in the Authentication Methods policy through its Application ID, Client ID, and OpenID Connect discovery endpoint. Entra still evaluates Conditional Access and makes the access decision, while the external provider performs the additional factor. Microsoft's [External MFA management guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-external-method-manage) documents that control-plane split and the provider metadata required to configure it.

That architectural change affects the migration:

| Design question | Custom control | External MFA |
|---|---|---|
| Where is the provider configured? | Conditional Access custom-control definition | Authentication Methods policy |
| Which grant invokes it? | Provider-specific custom control | Require multifactor authentication |
| Does Entra record a satisfied MFA method? | No native MFA claim | Yes |
| Can sign-in frequency drive a fresh prompt? | Not supported | Supported through Conditional Access session controls |
| Can an authentication strength require it? | Not applicable | Not currently supported; use Require multifactor authentication |
| What must be true for a user? | The custom-control policy applies | Method enabled for the user, usable registration, and an applicable MFA requirement |

Do not translate policy JSON mechanically. Reconstruct the intended outcome: **who**, **which resources**, **under which conditions**, **with which exclusions**, and **how often** should MFA be required?

## Inventory every custom-control dependency first

Start at **Entra ID > Conditional Access > Custom controls** and **Entra ID > Conditional Access > Policies**. Record the control definition, provider, policy IDs, state, user and workload scope, conditions, exclusions, and grant logic. Include disabled and report-only policies; an apparently dormant policy might be a rollback dependency or a scheduled change waiting to happen.

Microsoft's migration guide provides a Graph PowerShell inventory pattern using the `CustomAuthenticationFactors` property. This read-only version keeps only policies with a non-empty custom-control reference:

```powershell
Connect-MgGraph -Scopes "Policy.Read.All"

Get-MgIdentityConditionalAccessPolicy -All |
    Where-Object {
        @(
            $_.GrantControls.CustomAuthenticationFactors |
                Where-Object { $_ -is [string] -and $_.Trim().Length -gt 0 }
        ).Count -gt 0
    } |
    Select-Object Id, DisplayName, State, @{
        Name = "CustomAuthenticationFactors"
        Expression = { $_.GrantControls.CustomAuthenticationFactors -join "," }
    }
```

The current [Microsoft migration procedure](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-custom-controls-external-mfa) documents `Policy.Read.All`, the portal inventory, and the seven-stage migration sequence. Export the result into the change record, but do not treat the list as the whole dependency map.

For every matching policy, also capture:

- nested group membership and dynamic-group rules;
- target resources, user actions, authentication contexts, and application exclusions;
- named locations, device platforms, client-app conditions, filters, risk conditions, and session controls;
- `AND` versus `OR` behavior when several grant controls are present;
- emergency-access exclusions and the owner who validates them;
- provider-side groups, policies, recovery paths, availability commitments, and certificate-rotation process;
- help-desk procedures that assume the old prompt, provider name, or failure message; and
- any automation that exports, tests, edits, or monitors the old policy.

> [!IMPORTANT]
> **Analysis:** a migration inventory is complete only when you can explain the effective policy set for a real user and application. A list of Conditional Access display names does not expose nested membership, a second applicable policy, or provider-side enforcement.

## Confirm licensing, roles, provider readiness, and recovery

Microsoft requires Entra ID P1 or P2 for this migration. An Authentication Policy Administrator or Global Administrator can configure External MFA; a Privileged Role Administrator is required to grant admin consent to the provider application. The provider must supply the Application ID, Client ID, and HTTPS OIDC discovery URL. Those prerequisites are listed in Microsoft's [custom-controls migration guide](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-custom-controls-external-mfa#prerequisites).

Before creating the method, get written answers to these questions:

1. Is the provider's External MFA integration generally available for your cloud and contract, not merely its legacy custom control?
2. Which Application ID, Client ID, discovery endpoint, redirect behavior, and signing-key process apply to this tenant?
3. How are users correlated between Entra and the provider, and what happens when the provider account is missing, disabled, or locked?
4. Which browser, mobile, desktop, VDI, guest, federation, and device-enrollment journeys are supported?
5. What is the provider outage procedure, and which approved authentication path remains usable during that outage?
6. Who owns admin consent, certificate rollover, provider policy, help-desk recovery, Conditional Access, and the final rollback decision?

Keep emergency access independent of the provider being migrated. The site's [emergency access account guide](/posts/microsoft-entra-emergency-access-accounts-admin-guide) explains why an account intended for a control-plane outage cannot depend on the same external factor or approval chain that might be unavailable.

## Build the External MFA pilot without creating a gap

### 1. Configure the external method for a test group

In the current portal, open **Entra ID > Authentication methods > Add external MFA**. Enter the provider-supplied metadata, obtain the required admin consent, enable the method, and include only a dedicated test group. The display name is visible to users and cannot be changed after creation, so settle the support-friendly name before saving.

Method scope and policy scope are separate. Enabling External MFA for a group makes the method available to that population; it does not require MFA at a sign-in. Conditional Access supplies the requirement.

### 2. Prove registration for each pilot user

Users can register through Security info or the registration wizard, and an administrator can add the method to a user's Authentication Methods record. Microsoft also warns that users enabled through groups do not appear in authentication-method registration reports. Check each pilot user's individual record and complete a controlled registration journey rather than declaring readiness from a population report alone.

Include users who represent the real service: managed and unmanaged devices, supported operating systems, different browsers, remote and office locations, guests where applicable, administrators, and people who need the provider's documented recovery path. Do not put an emergency account in the pilot.

### 3. Create a separate Conditional Access policy

Create a new policy for the same target resources and conditions as the old custom-control policy, but scope it only to the test group. Select **Grant access > Require multifactor authentication**. Start in report-only mode to check targeting, then turn it on for the pilot when the expected policy set is clean.

Do not select **Require authentication strength**. Microsoft's current migration guide says External MFA is not yet compatible with authentication-strength policies. If the old design depended on a provider-specific assurance level that is not expressible through the standard MFA grant, stop and obtain a supported design from Microsoft and the provider rather than translating that assumption into a weaker control.

Use the site's [MFA rollout strategy](/posts/microsoft-365-mfa-rollout-strategy-conditional-access-authentication-strength) for ring design and the [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) for evidence review.

### 4. Move one cohort between mutually exclusive policies

External MFA and custom controls can run in the same tenant, but Microsoft says a user targeted by both must satisfy both. That produces the classic double redirect.

For the pilot group:

1. confirm the new External MFA method includes the group;
2. confirm the new Require MFA policy includes the group;
3. exclude the group from the old custom-control policy;
4. run Conditional Access What If for representative users and applications; and
5. perform new live sign-ins after the policy changes have propagated.

Make the include and exclusion changes in one approved window. If the new policy is enabled while the old exclusion is missing, users receive two challenges. If the old exclusion lands while the new policy is still report-only or out of scope, the pilot might lose its intended MFA requirement.

Microsoft notes that a new Conditional Access policy can take up to a few hours to appear at authentication time. Treat propagation as a planned hold point. Do not expand the ring while some users see the old policy and others see the new one.

## Validate the migration with sign-in evidence

Report-only answers whether a policy would apply. It does not execute the external challenge and cannot prove the end-to-end provider handoff. After the pilot policy is on, test fresh sign-ins to each representative resource and client journey.

For each attempt, preserve the UTC time, user, resource, client, device, location, result, correlation ID, and request ID. In **Entra ID > Monitoring & health > Sign-in logs**, confirm:

- the new Conditional Access policy applied and granted access;
- the old custom-control policy did not apply;
- Authentication Details records the external authentication method;
- the MFA requirement was satisfied by External MFA rather than an unrelated prior claim;
- no second provider redirect occurred; and
- any remaining failure belongs to a different grant, device, risk, session, or application control.

Test success and failure deliberately:

| Test | Expected result |
|---|---|
| Correct user, normal device, supported app | One provider challenge and successful access |
| User not registered with the provider | Documented registration or recovery path, not silent bypass |
| User outside External MFA method scope | External method unavailable; another approved method or a controlled failure |
| User accidentally in both policies | Test must expose and then eliminate the double prompt |
| Noncompliant device where compliance is required | External MFA can succeed, but Conditional Access still denies on device state |
| Blocked location | Denied by the location policy even if the external factor succeeds |
| Expired session with sign-in frequency configured | Fresh challenge at the documented session boundary |
| Provider outage | Approved recovery or continuity procedure works without weakening tenant-wide policy |

Entra remains the access-decision point. A success event in the provider proves its factor completed; it does not prove that Entra accepted the response or that every other Conditional Access grant passed.

## Expand in rings and preserve a real rollback

Move from lab to IT, then to representative business cohorts, then broader production. At each boundary, expand three scopes together: External MFA method targeting, new Require MFA policy targeting, and the corresponding exclusion from the old custom-control policy. Stop when failure rate, recovery demand, provider latency, or log evidence moves outside the approved threshold.

Rollback means reversing the affected cohort's policy assignment, not deleting architecture during an incident. Restore the cohort to the old custom-control path only while that path remains supported and verified, remove it from the new pilot policy, and preserve logs from the failed External MFA attempt. If the old control can no longer be edited after the September cutoff, an untested rollback design that depends on editing it is not a rollback.

After the last cohort is stable, Microsoft recommends disabling the old policy and monitoring for one to two weeks before deleting the policy and custom-control definition. The [official migration procedure](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-custom-controls-external-mfa#remove-custom-control-references) explicitly keeps the disabled configuration for at least two weeks as a rollback option.

Do not remove the provider enterprise application, consent, user registrations, or old policy in the first cleanup change. Confirm which objects belong only to the retired integration, capture the final evidence, obtain owner approval, and remove them in a separate decommissioning window.

## Know when to stop and escalate

Pause the rollout when:

- the provider has not confirmed GA support for External MFA in your cloud;
- the intended control depends on authentication strength, Windows 10 OOBE, or another unsupported path;
- policy inventory and effective group membership cannot be reconciled;
- emergency access depends on the provider being changed;
- the provider and Entra logs disagree about the signed response;
- the same cohort cannot be made mutually exclusive between old and new policies;
- a required application or client journey has no validated test result; or
- the tenant's Message Center or service-health notice contradicts the public timeline.

Escalate provider-side request rejection, account correlation, factor policy, or signing-key issues to the provider. Escalate Entra policy evaluation, method recognition, or acceptance of a provider response that meets Microsoft's contract to Microsoft. Supply tenant ID, UTC window, user object ID, resource, policy IDs, correlation and request IDs, provider event ID, discovery URL, issuer, and signing key ID. Never place raw tokens, client secrets, or private keys in a support ticket.

## The migration checklist

- [ ] Export every policy with a custom-control reference, including disabled and report-only policies.
- [ ] Map effective users, resources, conditions, exclusions, provider dependencies, and automation.
- [ ] Confirm P1 or P2 licensing, administrator roles, provider GA support, metadata, consent, and recovery.
- [ ] Keep emergency access independent of the external provider.
- [ ] Configure External MFA for a dedicated pilot group.
- [ ] Verify individual user registration and provider account readiness.
- [ ] Create a separate policy with **Require multifactor authentication**, not authentication strength.
- [ ] Make the old-policy exclusion and new-policy inclusion mutually exclusive for every ring.
- [ ] Use What If for targeting, then use live sign-ins for end-to-end proof.
- [ ] Validate Authentication Details, all Conditional Access results, and provider evidence.
- [ ] Test device, location, session, recovery, outage, and representative application paths.
- [ ] Expand only when the previous ring meets its documented exit criteria.
- [ ] Disable the old policy and monitor for at least two weeks before deletion.
- [ ] Decommission provider artifacts in a separate approved change.

The safe finish line is not “the provider prompt appeared.” It is **one intended MFA requirement, one supported provider handoff, one consistent Entra record, no policy gap, and a rollback that still works when you need it**.
