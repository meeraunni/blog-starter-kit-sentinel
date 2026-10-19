---
title: "Microsoft Entra Universal CAE Device Revocation Guide"
excerpt: "Use Microsoft Entra Universal CAE device revocation safely: validate Windows clients, pair Conditional Access, test signals, and troubleshoot tunnel drops."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-19T17:24:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra Universal CAE device revocation** lets Global Secure Access react when the Windows device carrying a user's tunnel is deleted, disabled, or reported noncompliant. Microsoft Entra sends the event to the Global Secure Access edge, the client is challenged to reauthenticate, and access through the affected tunnels is dropped when the device can no longer satisfy policy.

That is the short answer. The useful answer has more boundaries: the device signals are **public preview**, Universal Continuous Access Evaluation currently requires Global Secure Access Client for Windows version **1.8.239.0 or later**, and a noncompliance event needs a matching Conditional Access policy if it is supposed to deny access. Other client platforms currently use regular Global Secure Access access tokens rather than Universal CAE tokens.

Microsoft announced the additional device-revocation and user-risk signals in its [October 2026 Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). The current [Universal Continuous Access Evaluation reference](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-universal-continuous-access-evaluation) and [Global Secure Access limitations](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-current-known-limitations) provide the operational detail. This guide is derived from those sources; it does not claim a tenant-specific lab test.

Grab a coffee before making “device disabled means instant network cutoff” your incident-response promise. Universal CAE closes an important token-validity gap, but client version, traffic acquisition, signal delivery, Conditional Access, reauthentication grace, and application behavior all have to line up. Treat it as a control chain and prove each link.

## Microsoft Entra Universal CAE device revocation: what changed

Global Secure Access uses Microsoft Entra access tokens to authenticate its Microsoft, Internet Access, and Private Access tunnels. Without a mid-session signal, those tokens remain usable until expiry; Microsoft documents a 60-to-90-minute lifetime for this path. Disabling an account or device does not magically rewrite a token already present on the endpoint.

Universal CAE adds an event path between Microsoft Entra ID and the Global Secure Access edge. When a supported event arrives, the service challenges the client even though its current access token has not expired. The client asks the user to reauthenticate, Microsoft Entra reevaluates the current state and policies, and the edge can stop forwarding traffic when the challenge cannot be satisfied.

Microsoft currently separates the events into two groups.

**User-based signals** include:

- deletion or disablement of the user account;
- a user password change or reset;
- MFA being enabled for the user;
- an administrator explicitly revoking all of the user's refresh tokens; and
- high user risk detected by Microsoft Entra ID Protection.

**Device-based signals, in public preview**, include:

- deletion or disablement of the device used for Global Secure Access; and
- the device being detected as noncompliant.

The lifecycle label matters. Universal CAE is listed across the Microsoft, Internet Access, and Private Access profiles in Microsoft's current [Global Secure Access feature and licensing comparison](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access), but the two newer device signals remain preview. Do not write a general-availability guarantee, a mandatory-enforcement date, or a cross-platform support claim into policy.

### Device state and user state are separate kill switches

Disabling the **user** answers “may this identity authenticate?” Disabling the **device** answers “may this device identity continue to participate?” Marking the device **noncompliant** answers a third question: “does this device still meet the organization's compliance definition?”

Those are not interchangeable controls. A valid user can be on a compromised device. A disabled user can have more than one device. A device can be healthy enough to run the client while failing a compliance rule. Preserve the user object ID, device object ID, tenant ID, client version, traffic profile, and triggering event separately during every pilot and incident.

The site's broader [token lifetime, revocation, and native CAE guide](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) explains why disabling a user does not produce the same timing in every application. Universal CAE changes the Global Secure Access network edge; it does not make every application session, browser cookie, or service-side authorization cache identical.

## Understand the enforcement path before enabling it

A successful Universal CAE device-revocation test crosses seven boundaries:

1. A supported Windows client acquires traffic for an enabled Global Secure Access forwarding profile.
2. The client authenticates the user and device and receives a Universal CAE-capable Global Secure Access token.
3. Microsoft Entra records a supported user or device event.
4. The event propagates to Global Secure Access.
5. The edge returns a claims challenge and the client prompts for reauthentication.
6. Microsoft Entra reevaluates the user, device, and applicable Conditional Access policies.
7. The client reconnects when the new evaluation succeeds, or the service disconnects the tunnels when it cannot be satisfied.

This is different from traditional application-aware CAE. In native CAE, a supported resource such as Exchange Online, SharePoint Online, Teams, or Microsoft Graph participates in the claims-challenge exchange. The [Microsoft Entra CAE reference](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation) says critical-event enforcement is intended to be near real time, although event propagation can take up to 15 minutes.

Universal CAE moves that decision point to the Global Secure Access edge. Microsoft says this extends CAE behavior to applications reached through Global Secure Access even when the destination application is not itself CAE-aware. It does not modify the destination application, revoke an application's own cookie, or prove that traffic outside the Global Secure Access path has stopped.

### Do not promise a two-minute cutoff

The Universal CAE overview says a user who does not reauthenticate within two minutes has Global Secure Access tunnels disconnected. The current limitations page provides the more complete operational sequence: approximately two to five minutes for the signal to reach the client, followed by three authentication prompts with a two-minute grace period each, for a disconnect at roughly ten minutes.

Use the limitations page as the planning boundary and measure the actual result in the pilot. Record at least four timestamps:

- the source device event;
- the first client prompt;
- the last successful tunneled request; and
- the first denied request or disconnected-tunnel state.

“Near real time” is a service behavior, not a zero-second service-level objective. If containment requires a faster endpoint action, pair identity and network controls with the organization's approved endpoint isolation process rather than claiming Universal CAE alone provides an instantaneous quarantine.

## Pass the license, role, client, and policy gates

Start with a preflight. A failed prerequisite can look exactly like a failed revocation signal.

### License the traffic profile you actually use

Microsoft's current licensing page lists Universal CAE for all three Global Secure Access traffic profiles:

- the **Microsoft traffic profile** is included with Microsoft Entra ID P1 or P2;
- the **Internet Access profile** requires Microsoft Entra Internet Access, which is available standalone or in Microsoft Entra Suite, plus Entra ID P1 or P2 for its users; and
- the **Private Access profile** requires Microsoft Entra Private Access, available standalone or in Microsoft Entra Suite, plus Entra ID P1 or P2 for its users.

License the pilot users for the profile carrying the test traffic. Seeing a Global Secure Access blade or a different forwarding profile in the tenant does not prove entitlement for the path under test.

### Separate the administrative roles

Use **Global Secure Access Administrator** for traffic-forwarding and service configuration and **Conditional Access Administrator** for the enforcement policies. Microsoft documents **Reports Reader** as sufficient to open the traffic-log experience, while the dedicated **Global Secure Access Log Reader** is designed for log access. Use just-in-time role activation where your operating model supports it.

Do not give a client deployment operator broad Conditional Access rights simply to complete the pilot. The endpoint, network, identity, and security-monitoring owners need shared evidence, not one standing super-administrator.

### Hold the Windows client at the documented floor

The current limitations page says only **Global Secure Access Client for Windows 1.8.239.0 or later** supports Universal CAE. Windows clients below that version and the macOS, iOS, and Android clients use regular access tokens for this scenario.

In the Windows client's **Advanced Diagnostics** view, capture:

- username;
- device ID and tenant ID;
- client version;
- forwarding-profile ID and last-check time; and
- the active Microsoft, Internet, or Private Access rules.

Microsoft's [Advanced Diagnostics reference](https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-global-secure-access-client-advanced-diagnostics) identifies those fields and provides a policy tester for checking which rule acquires a destination. Use joined or hybrid-joined Windows devices for the first ring so device identity is unambiguous, and test every production join model separately before widening scope.

### Pair the signal with the correct Conditional Access policy

Microsoft explicitly warns that device-compliance and user-risk signals should be paired with their corresponding Conditional Access policies. Without the policy, reauthentication can complete silently and there is no control that acts on the new noncompliant or risky state.

For **Internet Access**, Microsoft's example targets **All internet resources with Global Secure Access** and requires the device to be marked compliant. Begin in report-only mode with emergency accounts excluded, confirm the expected policy result, then enable it only for the pilot group.

For **Private Access**, Microsoft currently says Conditional Access cannot be assigned to Private Access traffic as one bulk target. Apply the policy at the application level to each Quick Access or Global Secure Access enterprise application. The [Private Access Conditional Access procedure](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-target-resource-private-access-apps) supports requiring a compliant device or hybrid join and recommends report-only validation before enforcement.

Do not confuse **require compliant device** with **compliant network**. Microsoft's limitations page says compliant-network checks are not supported for Private Access applications. This guide is about the device-compliance signal and grant control, not the compliant-network named-location signal.

## Build a pilot that proves the signal, not just a login

Choose a small ring of managed Windows devices that already send known traffic through Global Secure Access. Include one nonprivileged user, one representative business application, one Internet Access destination if licensed, and one noncritical Private Access application when that profile is in scope.

Before changing device state, establish the baseline:

1. Confirm the client is version 1.8.239.0 or later.
2. Record the user, device ID, tenant ID, forwarding-profile ID, and client timestamp.
3. Use the policy tester to prove that the selected destination matches the intended profile.
4. Complete a fresh sign-in and confirm the applicable Conditional Access policy in the sign-in log.
5. Open the application and generate a recognizable benign transaction.
6. Find the connection in **Global Secure Access > Monitor > Traffic logs** and record its transaction and connection IDs.
7. Confirm that an approved recovery route and rollback owner are available before changing device state.

The [Global Secure Access traffic-log guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs) models one user visit as a session containing connections and transactions. The current preview log does not expose a session ID in the detail view, so preserve connection ID, transaction ID, user, device category, traffic type, destination, action, and UTC time instead of inventing a one-field correlation.

### Run three independent negative tests

Use dedicated test devices and restore each one to a known-good state before beginning the next scenario.

**Test 1: disable the device.** Disable the exact Entra device object recorded by the client. Keep the user enabled. Observe the event time, client prompts, tunnel state, application behavior, sign-in result, and traffic-log result.

**Test 2: mark the device noncompliant through the approved compliance workflow.** Keep the device enabled. Confirm that the applicable Conditional Access policy requires a compliant device. Observe whether reauthentication fails because of the current device state and whether the expected traffic stops.

**Test 3: disable the user as a control.** Re-enable and restore the test device first, then disable the test user. This validates the older user signal and helps distinguish a general Universal CAE failure from a device-signal-specific failure.

Do not use production users, delete the only device object for an executive, or simulate malware on a real endpoint. The purpose is to prove service behavior with reversible directory and compliance states.

### Define success before the test

A useful success record includes:

- the correct device event reached the correct client;
- the first prompt and disconnect occurred within the documented operational envelope;
- the expected Conditional Access policy reevaluated;
- traffic through every in-scope forwarding profile stopped or resumed as designed;
- direct or bypassed traffic was correctly identified as outside the control;
- restoring device state and satisfying policy restored only the intended access; and
- the sign-in, device, client, and traffic evidence can be correlated without relying on a user's screenshot alone.

The site's [Microsoft Entra Internet Access overview](/posts/microsoft-entra-internet-access-overview) explains which internet and Microsoft traffic enters the edge. Its [Private Access VPN-replacement guide](/posts/microsoft-entra-private-access-vpn-replacement) covers the connector and application path for private destinations. Universal CAE can only revoke traffic that those paths actually acquire.

## Monitor the control without inventing a CAE event log

Microsoft's public documentation does not describe one dedicated “Universal CAE device signal succeeded” report. Build evidence from the adjacent control planes.

**Device record:** preserve the device audit event, object ID, enabled state, and compliance-state timestamp. This proves the trigger existed, not that the client received it.

**Sign-in log:** inspect the reauthentication attempt, Conditional Access tab, device detail, application or target resource, failure reason, request ID, correlation ID, and UTC time. The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) provides the investigation order.

**Client evidence:** record the client version, device and tenant IDs, profile timestamp, channel state, notification time, and Advanced Diagnostics results. If the result is inconsistent, collect the client's supported diagnostic package before reinstalling or clearing state.

**Traffic evidence:** compare the last allowed and first denied or absent transaction around the event. Traffic logs are still preview. Microsoft says they can be exported through Entra diagnostic settings as `NetworkAccessTrafficLogs` when longer retention or automated correlation is needed.

**Application evidence:** record whether the destination connection ended, retried, or continued outside the tunnel. A traffic-log denial and an application logout are related but not identical facts.

Alert on control drift as well as user impact. Useful operational checks include clients below the version floor, expected devices without recent Global Secure Access traffic, spikes in Conditional Access failures, forwarding-profile changes, policy changes, and a growing interval between a device event and loss of tunneled access.

## Troubleshoot Universal CAE device revocation by layer

### Nothing happens after the device is disabled

First confirm that the device object you changed matches the device ID in Advanced Diagnostics. Duplicate, stale, and re-registered device objects make portal display names unreliable.

Then check the client version. A healthy client below 1.8.239.0 still uses regular tokens for this purpose. Confirm that the tested destination is acquired by a visible forwarding rule and that the user did not reach it directly, through a remote-network path, or through another VPN route.

Wait through the documented signal and prompt envelope before declaring failure. If no challenge appears, preserve the device event, client version, device and tenant IDs, forwarding profile, UTC window, diagnostics package, and relevant traffic records for escalation.

### The user is prompted but access continues

Check whether the user completed reauthentication and whether any policy was configured to reject the new state. Microsoft warns that a device-compliance or high-risk signal without the matching Conditional Access policy can result in silent successful reauthentication.

Next, separate tunneled from non-tunneled access. A browser tab might keep rendering cached content, an application might use a direct path, or an existing server-side session might remain valid even though new network traffic through Global Secure Access is blocked. Generate a fresh request and inspect its route and transaction result.

### The user is disconnected even after compliance returns

Confirm that the device ID did not change during remediation or re-registration. Read the new sign-in event for its actual Conditional Access failure rather than assuming the old compliance result is cached. Verify the client channel state, refresh the forwarding-profile details, and retest a known acquired destination.

Restoring compliance does not undo an intentional device disablement, recreate a deleted device object, or fix another failed grant control. Recover the exact state that failed.

### Private Access behaves differently from Internet Access

Confirm that the Private Access enterprise application has its own Conditional Access policy. Microsoft does not currently support applying one policy to all Private Access traffic. Also verify the application's FQDN or IP segment, assignment, connector health, and client rule.

Do not troubleshoot a missing compliant-network signal when the intended control is device compliance. They are different conditions, and compliant-network check is currently unsupported for Private Access applications.

### macOS or mobile does not reproduce the Windows result

That is expected under the current support boundary. Microsoft says only Windows client 1.8.239.0 or later supports Universal CAE; other Global Secure Access clients use regular access tokens. Do not treat a regular-token result on macOS, iOS, or Android as proof that the preview device signal is broken.

### All traffic breaks during the pilot

Stop expansion and use the preapproved rollback. Return the Conditional Access policy to report-only or remove only the pilot assignment, depending on which change caused the impact. Restore the test device state when appropriate, confirm emergency access remains available, and verify the client receives the intended forwarding profile.

Do not disable CAE tenant-wide as a first response. Microsoft's Universal CAE reference says the Conditional Access CAE setting affects all supporting services, including Global Secure Access. Broadly disabling it turns a bounded pilot failure into a wider security regression.

## Rollout and rollback plan

Use four rings.

**Ring 0 — evidence only:** inventory Windows client versions, device IDs, traffic profiles, applicable applications, licenses, Conditional Access policies, exclusions, and current logs. Upgrade no more than the dedicated test population.

**Ring 1 — technical pilot:** enable the paired Conditional Access controls in report-only, prove traffic acquisition, then run the three negative tests on reversible test identities and devices.

**Ring 2 — representative users:** include different Windows builds, joined and hybrid-joined devices, remote and office networks, Microsoft, internet, and private destinations, plus the service desk. Keep macOS and mobile out of the Universal CAE success metric because they are outside the current client support boundary.

**Ring 3 — production expansion:** move in bounded cohorts only after monitoring, help-desk recovery, application ownership, and rollback have been exercised. Track the percentage of in-scope Windows clients at or above the version floor and the observed event-to-disconnect interval.

Rollback the control that failed:

- a bad Conditional Access policy returns to report-only or loses only the affected pilot assignment;
- a bad client release returns through the organization's approved endpoint deployment ring;
- a wrong device-state change is restored on the test object when recovery is supported;
- a forwarding-profile problem is corrected using the preserved prior configuration; and
- a destination bypass is fixed as a routing problem, not hidden by weakening device policy.

Rollback can restore availability. It cannot prove that an already compromised endpoint was safe during the gap, so preserve the incident window and review affected traffic.

## Microsoft Entra Universal CAE device revocation checklist

- [ ] Record that device-based Universal CAE signals are public preview.
- [ ] Define Microsoft, Internet Access, and Private Access scope separately.
- [ ] Confirm licenses for every pilot user and traffic profile.
- [ ] Use Global Secure Access and Conditional Access roles separately.
- [ ] Upgrade pilot Windows clients to version 1.8.239.0 or later.
- [ ] Record the client user, device ID, tenant ID, version, and forwarding profile.
- [ ] Prove the test destination is acquired through the intended rule.
- [ ] Pair device noncompliance with a require-compliant-device policy.
- [ ] Target Internet Access and each Private Access application correctly.
- [ ] Exclude and test monitored emergency access accounts.
- [ ] Establish sign-in, client, device, and traffic-log baselines.
- [ ] Test device disablement, noncompliance, and user disablement separately.
- [ ] Measure source event, prompt, last allowed request, and first denial.
- [ ] Test recovery without deleting evidence or recreating the whole client state.
- [ ] Keep non-Windows clients outside the current Universal CAE success claim.
- [ ] Document the exact rollback for policy, client, profile, and device state.
- [ ] Export logs when the required retention exceeds the portal window.
- [ ] Recheck Microsoft documentation before every rollout ring.

## FAQ

### Is Universal CAE device revocation generally available?

No. Microsoft labels device deletion, device disablement, and device noncompliance signals for Universal CAE as public preview. Universal CAE exists more broadly, but those new device-based triggers retain the preview boundary.

### Does disabling a device immediately disconnect Global Secure Access?

Not literally immediately. Microsoft documents roughly two to five minutes for the signal to reach the client and up to three two-minute reauthentication grace periods, producing a disconnect at approximately ten minutes in the current known-limitations description. Measure the pilot rather than publishing a two-minute guarantee.

### Does a noncompliant signal block access by itself?

Not reliably. Microsoft says device-compliance signals are intended to work with a corresponding Conditional Access policy. Without that policy, the reauthentication can be silent and there is no grant control to deny the newly noncompliant device.

### Does Universal CAE work on macOS, iOS, and Android?

Not under the current documented Universal CAE client boundary. Microsoft says only the Windows Global Secure Access client version 1.8.239.0 or later supports Universal CAE; other client platforms use regular access tokens.

### Does it revoke application cookies or traffic outside Global Secure Access?

No. Universal CAE reevaluates access at the Global Secure Access edge and disconnects its tunnels. A destination application's own session and any direct, bypassed, or otherwise unacquired network path are separate controls and evidence sources.

The safe operating model is simple: **prove the client, prove the route, prove the event, prove the policy, and prove the denied request**. When those five facts agree, Universal CAE device revocation turns device state into a useful network-containment signal. When one is missing, “CAE did not work” is only a symptom—not a diagnosis.
