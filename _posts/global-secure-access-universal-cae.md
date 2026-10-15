---
title: "Global Secure Access Universal CAE: Deployment Guide"
excerpt: "Deploy Global Secure Access Universal CAE safely: validate Windows clients, pair device and risk signals with Conditional Access, test revocation, and recover."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-15T17:03:02-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Global Secure Access Universal CAE** revalidates the network access token used by Microsoft Entra Internet Access and Private Access when Entra receives a supported identity or device signal. It extends continuous access evaluation to resources that do not understand CAE themselves because the enforcement point is the Global Secure Access edge, not the destination application.

The October 2026 update adds public-preview signals for a device that is deleted, disabled, or marked noncompliant. That is useful, but it is not an automatic promise that every session will stop the instant a device changes state. The supported Windows client, traffic routing, Conditional Access policy, signal propagation, reauthentication grace period, and destination path all matter.

Grab a coffee and treat this as a network-access control-plane rollout. The safe pattern is to prove the traffic path first, pair risk and compliance signals with policies that can act on them, test revocation on disposable identities and devices, and keep strict location enforcement for a later ring.

## Global Secure Access Universal CAE: the decision first

Microsoft describes Universal CAE as a Global Secure Access platform feature that validates access to the service edge whenever a connection to a new application resource is established. The edge can challenge an unexpired network access token after receiving a supported Entra event. The application behind the edge does not need a CAE-aware library.

That makes Universal CAE different from three adjacent controls:

- **Standard Microsoft Entra CAE** is enforced by a CAE-aware resource such as a supported Microsoft service. It lets the application reject an unexpired application access token after a critical event or location change.
- **Universal CAE** is enforced at the Global Secure Access edge. It lets the user's network access token be revalidated before traffic continues through a GSA tunnel.
- **Compliant network** is evaluated by Microsoft Entra Conditional Access. It proves that authentication arrived through the tenant's recognized Global Secure Access path.
- **Device compliance** combines Microsoft Intune state with Conditional Access. It proves that the device meets the organization's configured compliance policy.

The distinctions are operationally important. A compliant **network** does not mean a compliant **device**. Universal CAE can receive a noncompliance signal, but Microsoft says the device-compliance and user-risk signals are intended to be used with corresponding Conditional Access policies. Without the matching policy, reauthentication can be silent and there is no control that acts on the event.

This guide therefore has a narrower purpose than the site's [Microsoft Entra Internet Access architecture and rollout guide](/posts/microsoft-entra-internet-access-overview), which explains the broader Secure Service Edge design. It also differs from the [application-token CAE and revocation model](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation). Here, the question is how to make the **GSA network token** respond predictably to user and device state.

Microsoft announced the device-signal expansion as **public preview** in the [October 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). The [Universal CAE reference](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-universal-continuous-access-evaluation) separately labels device-based signals as preview. Preview is not general availability, default-on enforcement, or a retirement deadline.

## Understand the network-token control plane

Global Secure Access relies on Entra access tokens to authenticate the Microsoft, Internet, and Private Access service tunnels. Microsoft documents those access tokens as valid for 60 to 90 minutes. Disabling a user invalidates refresh tokens, but an already issued GSA access token would ordinarily remain usable until expiry.

Universal CAE shortens that window through this sequence:

1. Microsoft Entra detects a supported user or device event.
2. The event reaches Global Secure Access.
3. GSA challenges the network access token and asks the client to reauthenticate.
4. Entra reevaluates the request, including applicable Conditional Access policy.
5. Successful reauthentication restores connectivity; an unsatisfied control or failed reauthentication causes the GSA tunnels to disconnect.

The [Universal CAE documentation](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-universal-continuous-access-evaluation) lists these user signals:

- user account deleted or disabled;
- user password changed or reset;
- multifactor authentication enabled for the user;
- administrator revokes all refresh tokens; and
- high user risk detected by Microsoft Entra ID Protection.

The public-preview device signals are:

- the device used for GSA access is deleted or disabled; and
- that device becomes noncompliant.

Microsoft's current [Global Secure Access limitations](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-current-known-limitations) put useful numbers around “near real time.” The Entra signal can take approximately two to five minutes to reach the client. The current flow gives the user up to three authentication prompts with a two-minute grace period for each, which can put the eventual disconnect at roughly ten minutes. Write incident procedures around that documented envelope, not around “instant revocation.”

> [!IMPORTANT]
> **Analysis:** use the ten-minute figure as a validation ceiling for the documented client flow, not a service-level guarantee. Record the event time, prompt time, tunnel-disconnect time, and policy result in every pilot test. If the sequence exceeds Microsoft's documented behavior, preserve evidence and escalate rather than declaring the feature unreliable from a stopwatch alone.

## Confirm prerequisites, licensing, and preview boundaries

Universal CAE is listed across the Microsoft, Internet, and Private Access traffic profiles in the [Global Secure Access licensing matrix](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access). The license depends on the traffic being protected:

- the Microsoft traffic profile is included with Microsoft Entra ID P1 or P2;
- Internet Access requires the Internet Access product or Microsoft Entra Suite, with P1 or P2 as a prerequisite; and
- Private Access requires the Private Access product or Microsoft Entra Suite, again with P1 or P2 as a prerequisite.

High user-risk policy requires Microsoft Entra ID P2 because it depends on Identity Protection. Device compliance requires a real Intune compliance policy and a device capable of satisfying it. Do not create a “require compliant device” policy before at least one pilot device can actually report compliant; Microsoft's [device-compliance Conditional Access guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance) calls out that dependency explicitly.

The client boundary is just as important as licensing. Microsoft's current limitations say **only the Global Secure Access client for Windows version 1.8.239.0 or later supports Universal CAE**. Other platform clients use regular access tokens. A tenant may have working GSA traffic on macOS, iOS, or Android without having Universal CAE on those devices.

Inventory these facts before a pilot:

- assigned GSA and Entra licenses by traffic profile;
- Windows version, GSA client version, Entra device ID, and Intune compliance state;
- the enabled forwarding profiles and their user/device assignments;
- any Conditional Access policy that disables CAE;
- the user-risk remediation and device-compliance policies that should act on signals;
- emergency-access exclusions and the recovery operator;
- the applications, FQDNs, IP ranges, and protocols expected to traverse GSA; and
- sign-in, traffic, audit, and client evidence owners.

No authenticated Microsoft 365 Message Center context was available for this review, so this guide does not claim a Message Center ID, private rollout ring, or tenant-specific deadline.

## Build policies that can act on the signals

Universal CAE is on for supported clients unless a Conditional Access policy disables CAE. Microsoft describes the default behavior as **opportunistic**: a supported client attempts to obtain a CAE-capable token, but a regular token can be issued if it cannot. Optional strict enforcement changes that posture, but it should not be the first rollout step.

The new device and risk events need matching policy outcomes.

### Pair device noncompliance with a compliance policy

Microsoft's Universal CAE reference gives this policy pattern: target users and **Internet resources with Global Secure Access**, then require a compliant device. The [GSA traffic Conditional Access guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-target-resource-microsoft-profile) confirms that Global Secure Access traffic can be targeted by Conditional Access and that Global Secure Access Administrator and Conditional Access Administrator are separate roles.

Start with a small Windows pilot group and exclude emergency-access identities. Put the compliance policy in report-only mode to validate targeting, but remember that report-only mode does not enforce the grant control. The [report-only reference](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only) also warns that compliance policies can still produce certificate-selection prompts on macOS, iOS, and Android during evaluation. Keep those platforms outside this Windows Universal CAE pilot.

Once report-only evidence is clean, enforce the policy for a disposable pilot identity and managed test device. Only then can a noncompliance event prove the full path from Intune state to Entra signal, GSA challenge, Conditional Access denial, and tunnel disconnect.

### Pair high user risk with risk remediation

Microsoft's [risky-user remediation policy](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-risk-based-user) targets high user risk, applies to all resources, and uses the **Require risk remediation** grant control. It automatically applies an authentication strength and an every-time sign-in frequency.

Pilot this as a separate policy from device compliance. A high-risk user and a noncompliant device are different incidents with different recovery owners. Combining both into one first test makes a denial hard to diagnose and can leave the help desk unable to tell whether the user must remediate identity risk or device health.

### Check for a tenant-wide CAE disable policy

The [Conditional Access session-control reference](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-session) says CAE can be disabled only through a policy that targets all resources and uses the **Customize continuous access evaluation** session control. That choice affects supported services, including GSA.

Do not create another policy and assume it wins. Inventory the effective Conditional Access result for the pilot identity, then remove or narrow an intentional CAE-disable policy only through normal change control.

## Roll out Universal CAE in five rings

### Ring 0: prove ordinary GSA routing

Universal CAE cannot protect traffic that does not traverse Global Secure Access. Before testing revocation, verify the expected profile is enabled, the pilot user and device receive it, and the destination appears in GSA traffic logs.

For Private Access, also prove the app segment, connector group, DNS path, and ordinary authentication. The site's [Private Access rollout guide](/posts/microsoft-entra-private-access-vpn-replacement) covers that foundation. Do not debug a connector or DNS failure as if it were a CAE failure.

### Ring 1: validate the Windows client and token path

Use Windows client version 1.8.239.0 or later. Open Advanced diagnostics and record the authenticated user, tenant ID, device ID, client version, health-check result, and effective forwarding-profile rules. Microsoft's [Windows client diagnostics guide](https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-global-secure-access-client-advanced-diagnostics) documents those evidence points and the support bundle.

Test a normal sign-in and connection before changing any identity or device state. A green baseline should include:

- a healthy policy-service connection;
- the expected forwarding rule;
- an allowed traffic record for the destination;
- a successful GSA-related sign-in; and
- the expected Conditional Access result.

### Ring 2: test user critical events

Use a disposable user with no production access. Test one event at a time: explicit refresh-token revocation, password reset, and account disablement. Capture the administrator action time, client prompt, reauthentication result, traffic result, and disconnect time.

Do not perform all three actions in one session. The test is supposed to identify which signal and policy caused the outcome. Re-enable the account and restore the baseline between cases.

### Ring 3: test device and risk policies

Use a disposable Windows device object and a pilot user covered by the enforced test policies.

For device compliance, make the device noncompliant through a reversible test condition defined by the endpoint team. Wait for Intune and Entra to show the state before judging GSA. Confirm that the client receives the challenge and that Conditional Access denies continued access because the device no longer satisfies the grant.

For a deleted or disabled device, preserve the device ID first. Never use an administrator's workstation for this test. Confirm the event applies to the device that is actually authenticating the GSA client; a stale duplicate object proves nothing.

For high user risk, use an approved Identity Protection test procedure rather than attempting to simulate malicious activity. Confirm that the risk-remediation policy, not an unrelated block policy, produces the final result.

### Ring 4: expand by cohort and traffic profile

Expand Windows cohorts separately for Microsoft, Internet, and Private Access traffic. Keep client version compliance, GSA licensing, Intune compliance, and Conditional Access targeting as explicit entry criteria.

Hold macOS and mobile platforms outside any claim of Universal CAE coverage while Microsoft's limitations continue to say they use regular access tokens. They can still use GSA, but the revocation behavior is different.

### Ring 5: consider strict location enforcement

Strict location enforcement is an optional, public-preview CAE mode. It immediately stops access when the IP address seen by the resource is not allowed by the location policy. Microsoft's [strict-enforcement guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation-strict-enforcement) says to test an ordinary location policy on a small cohort first and inspect the **IP address seen by resource** in sign-in logs.

Do not enable strict enforcement when authentication and resource traffic use shared, unstable, or undefinable egress. The [GSA known-limitations page](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-current-known-limitations) also warns that non-Microsoft resources do not currently receive the original source IP for location evaluation and can block trusted users. Strict mode is a topology decision, not a checkbox that makes every Universal CAE deployment “more secure.”

## Monitor four evidence layers

### 1. Administrative changes

Use **Global Secure Access > Monitor > Audit logs** or filter Entra audit logs to the Global Secure Access service. Microsoft's [audit-log reference](https://learn.microsoft.com/en-us/azure/global-secure-access/how-to-access-audit-logs) documents changes to forwarding profiles and other GSA policy objects. Preserve the Conditional Access policy change in Entra audit evidence separately.

### 2. Authentication and policy

Use user sign-in logs to confirm the Global Secure Access resource, device ID, Conditional Access policies, failure reason, and timing. For report-only policies, review the dedicated report-only result rather than reading it as enforcement.

### 3. Network traffic

The [GSA traffic-log guide](https://learn.microsoft.com/en-us/azure/global-secure-access/how-to-view-traffic-logs) exposes the destination, action, transaction ID, and connection ID under **Global Secure Access > Monitor > Traffic logs**. Current documentation says session ID is not available there, so correlate by user, device, destination, connection/transaction identifiers, and time rather than promising a single session key.

Traffic logs are preview and retained in the service for 30 days. Use diagnostic settings and `NetworkAccessTrafficLogs` when the investigation or compliance requirement needs longer retention.

### 4. Client state

Use the Windows client's Advanced diagnostics for health checks, effective profile rules, hostname acquisition, traffic, and support log collection. A browser error alone cannot tell you whether the failure was client health, traffic acquisition, Entra authentication, Conditional Access, or the destination.

## Troubleshoot from the first broken boundary

### No reauthentication prompt appears

Confirm the device is Windows, the client is at least 1.8.239.0, the correct user and device authenticated the client, and the destination is actually routed through an enabled profile. Then check whether a tenant Conditional Access policy disables CAE.

If those are correct, verify that Entra recorded the triggering state. A portal action against a duplicate device object or a compliance change that has not synchronized is not yet a Universal CAE event for the active client.

### The user reauthenticates and traffic continues

For high user risk and device noncompliance, this often means the signal caused reauthentication but no corresponding Conditional Access policy acted on it. Inspect the sign-in's Conditional Access tab. Confirm the intended policy applied, was enforced rather than report-only, and targeted the GSA resource or all resources as designed.

### Access drops for healthy users

Check device identity and compliance first. Then review policy overlap, GSA profile assignment, and client health. If strict location enforcement is enabled, compare the authentication IP, resource-observed IP, named locations, source-IP restoration support, and the documented non-Microsoft resource limitation.

### The event takes several minutes

Microsoft documents two to five minutes for signal delivery plus the reauthentication grace sequence. Preserve the timestamps. If the client eventually disconnects inside the documented flow, that is different from a missing signal. If the event exceeds it, collect the GSA support bundle, sign-in details, traffic identifiers, tenant ID, device ID, client version, and UTC timestamps for Microsoft Support.

### Traffic never appears in GSA logs

Stop CAE troubleshooting. The traffic was not acquired or logged by the expected profile. Return to client health, forwarding assignments, destination matching, Private Access connectors, and DNS. Universal CAE cannot revoke a GSA path that the request never used.

## Roll back without disabling CAE tenant-wide

Rollback should remove the narrow policy or cohort change that caused the incident:

1. move the affected pilot identity or device out of the new enforced policy scope;
2. disable the dedicated pilot Conditional Access policy if the policy itself is wrong;
3. restore the prior traffic-profile assignment if acquisition changed in the same maintenance window;
4. turn off the dedicated strict-enforcement pilot before changing named locations; and
5. revalidate ordinary GSA access and preserve all evidence.

Do not disable CAE tenant-wide as the first response. Microsoft's Universal CAE reference says the opportunistic fallback exists specifically so an unsupported client can receive a regular token, and disabling CAE affects other supported services too.

If the rollback touches compliant-network signaling, order matters. Microsoft's [compliant-network guidance](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-compliant-network) warns that disabling GSA Conditional Access signaling while policies still require the compliant network can block targeted users. Remove or disable the dependent policies before disabling the signal.

## Administrator checklist

- [ ] Confirm the exact traffic profile and license for every pilot user
- [ ] Use Windows GSA client 1.8.239.0 or later
- [ ] Record tenant ID, user, device ID, client version, and effective profile
- [ ] Prove the destination appears in GSA traffic logs before testing CAE
- [ ] Inventory any Conditional Access policy that disables CAE
- [ ] Pair noncompliance with a require-compliant-device policy
- [ ] Pair high user risk with an approved risk-remediation policy
- [ ] Exclude and monitor emergency-access identities
- [ ] Validate policy targeting in report-only, then enforce only for disposable pilots
- [ ] Test one user or device signal at a time
- [ ] Capture event, prompt, denial, and disconnect timestamps
- [ ] Keep macOS and mobile outside Universal CAE coverage claims
- [ ] Delay strict location enforcement until the egress topology is proven
- [ ] Export traffic logs if 30-day service retention is insufficient
- [ ] Prepare an article-specific rollback and support evidence package

## FAQ

### Is Global Secure Access Universal CAE generally available?

Microsoft documents Universal CAE as a GSA platform capability, but the device-based signals added for deleted, disabled, and noncompliant devices are **public preview**. Strict location enforcement and GSA traffic logs also carry preview status in their respective documentation. Record each preview dependency separately.

### Does a noncompliant device automatically lose GSA access?

Not from the signal alone. Microsoft says device compliance should be paired with the corresponding Conditional Access policy. Without it, reauthentication can be silent and there is no policy action on the event.

### Does Universal CAE protect macOS, iOS, and Android GSA clients?

Not under Microsoft's current limitations. Only the Windows client version 1.8.239.0 or later supports Universal CAE; other platforms use regular access tokens.

### Is Universal CAE the same as requiring a compliant network?

No. Universal CAE revalidates GSA network access after supported events. The compliant-network condition proves that authentication traversed the tenant's recognized GSA path. Device compliance is another control again.

### Should strict location enforcement be enabled on day one?

No. First prove routing, client support, ordinary location policy, resource-observed IPs, and recovery on a small pilot. Shared or unstable egress and non-Microsoft resource limitations can block legitimate users.

### What should go into a Microsoft support case?

Include the tenant ID, user object ID, device ID, GSA client version, traffic profile, Conditional Access policy IDs and modes, triggering event, sign-in correlation details, traffic connection and transaction IDs, UTC timestamps, client support bundle, and the expected versus observed result. Remove secrets and unrelated personal data.

## Microsoft sources

- [What's new in Microsoft Entra: October 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460)
- [Universal Continuous Access Evaluation](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-universal-continuous-access-evaluation)
- [Global Secure Access known limitations](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-current-known-limitations)
- [Global Secure Access overview and licensing](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access)
- [Require device compliance with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-device-compliance)
- [Require remediation for risky users](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-risk-based-user)
- [Analyze Conditional Access policy impact](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only)
- [Strictly enforce location policies with CAE](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation-strict-enforcement)
- [Global Secure Access logs and monitoring](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-global-secure-access-logs-monitoring)
- [Global Secure Access traffic logs](https://learn.microsoft.com/en-us/azure/global-secure-access/how-to-view-traffic-logs)
- [Global Secure Access audit logs](https://learn.microsoft.com/en-us/azure/global-secure-access/how-to-access-audit-logs)
- [Troubleshoot the Windows client with Advanced diagnostics](https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-global-secure-access-client-advanced-diagnostics)
