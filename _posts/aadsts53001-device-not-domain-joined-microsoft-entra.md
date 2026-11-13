---
title: "AADSTS53001 Device Not Domain Joined: Entra Fix Guide"
excerpt: "Fix AADSTS53001 device not domain joined errors by tracing the Conditional Access policy, hybrid join state, device claim, and safe recovery path."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-13T17:02:26-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**AADSTS53001 device not domain joined** means Microsoft Entra Conditional Access required a Microsoft Entra hybrid joined device, but the sign-in did not present a device that satisfied that grant control. Microsoft names the error `DeviceNotDomainJoined`. It does not automatically mean the PC has fallen out of the on-premises Active Directory domain. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

The fastest safe repair is to identify the failed sign-in and policy, prove the device's local and cloud hybrid-join state with the same device ID, then verify that the client actually supplied the device identity. Repair the broken layer; do not disable Conditional Access just because Windows still shows a domain name.

Grab a coffee before removing the work account or deleting the device object. `53001` sits at the intersection of four different things: policy scope, Windows join state, the Entra device object, and the browser or client that carries the device claim. A green check in only one of those places is not enough.

## AADSTS53001 device not domain joined: the fast path

1. Capture the complete error, UTC timestamp, correlation ID, request ID, user, application, resource, browser or client, and device name before changing anything.
2. Open **Entra ID > Monitoring & health > Sign-in logs**, find the exact failed request, and confirm error code `53001`.
3. On the event's **Conditional Access** tab, identify the failed policy and verify that its grant controls require **Microsoft Entra hybrid joined device**.
4. On the affected Windows session, run `dsregcmd /status` as the signed-in user. Hybrid join requires both `AzureAdJoined : YES` and `DomainJoined : YES`.
5. Record the `DeviceId`, `DeviceAuthStatus`, and `AzureAdPrt` state. Do not paste the full output into a public ticket.
6. In **Entra ID > Devices > All devices**, find that exact `DeviceId`. Confirm it is enabled, registered rather than pending, and listed with the intended hybrid join type.
7. If local and cloud state are healthy, reproduce once in a supported non-private browser or the expected native client. Check whether the sign-in event now contains the correct device ID and hybrid-join signal.
8. Repair the failing layer: hybrid registration, pending or stale cloud object, PRT/device authentication, browser device-claim path, or policy targeting.
9. Validate the original application and one control test. The intended hybrid device should succeed; an untrusted device should remain blocked.

This guide uses current Microsoft documentation and labeled operational analysis. It does not claim that the incident was reproduced in a production tenant.

## What AADSTS53001 proves—and what it does not

Microsoft defines `AADSTS53001` narrowly: a Conditional Access policy required a domain-joined device and the device did not satisfy that requirement. The current grant-control documentation calls the control **Require Microsoft Entra hybrid joined device**. It supports domain-joined Windows devices and does not treat Microsoft Edge InPrivate as hybrid joined. ([Conditional Access grant controls](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant#require-microsoft-entra-hybrid-joined-device))

The error proves that token issuance reached Conditional Access and the required device grant was not satisfied for that request. It does **not** prove that:

- the Windows computer is no longer joined to Active Directory Domain Services;
- the device is noncompliant in Intune;
- the Entra device object is missing;
- the user typed the wrong password;
- every application is blocked;
- the policy itself is correctly scoped; or
- deleting and rejoining the device is the right first action.

Those distinctions matter. A computer can be `DomainJoined : YES` but `AzureAdJoined : NO`, making it domain joined without being Microsoft Entra hybrid joined. It can also be correctly joined locally while the browser fails to present device identity, or while the matching cloud object is pending, disabled, deleted, or different from the local `DeviceId`.

Do not confuse `53001` with `53000`. Microsoft maps `53000` to `DeviceNotCompliant`, which evaluates a compliance requirement. `53001` maps to `DeviceNotDomainJoined`, which evaluates the hybrid-join requirement. The site's [compliant-device Conditional Access guide](/posts/microsoft-entra-conditional-access-compliant-device-blocked-sign-in) covers the neighboring but separate `53000` path.

## Put the failure in the Conditional Access path

For this sign-in to succeed, four boundaries must line up:

1. **Policy boundary:** the user, resource, client, platform, location, and other conditions place the request in a policy whose grant controls can be satisfied.
2. **Local device boundary:** Windows reports the intended join state and holds usable device credentials.
3. **Cloud device boundary:** the same device ID exists, is enabled, and has completed registration in the correct tenant.
4. **Request boundary:** the browser or native client sends device evidence that Microsoft Entra can associate with that cloud object.

Conditional Access evaluates the request in front of it, not the sticker on the laptop. If the request carries no usable device identity, the service cannot infer hybrid join from the user's office location, computer name, Active Directory account, or Intune record.

Microsoft documents three Entra device identities: registered, joined, and hybrid joined. Registered devices commonly serve bring-your-own-device scenarios; Entra joined devices are cloud joined; hybrid joined devices are joined to on-premises AD DS and registered with Microsoft Entra. Device identity is a prerequisite for device-based Conditional Access. ([device identity overview](https://learn.microsoft.com/en-us/entra/identity/devices/overview))

The hybrid grant is intentionally narrower than “managed device” or “known device.” A Microsoft Entra registered personal device and a Microsoft Entra joined corporate device can both be legitimate, but neither satisfies a grant that specifically requires Microsoft Entra hybrid join.

## Preserve the evidence before recovery

Capture both request evidence and device evidence:

- complete error and numeric code;
- UTC time, correlation ID, request ID, and trace ID when shown;
- user object ID and sign-in identifier;
- tenant ID and resource tenant ID;
- application name, application ID, resource, and client app;
- Conditional Access policy name, result, conditions, and failed grant control;
- sign-in-log device ID, operating system, browser, managed state, compliant state, and hybrid-join state;
- local `DeviceId`, `AzureAdJoined`, `DomainJoined`, `DeviceAuthStatus`, and `AzureAdPrt` values;
- matching cloud device object's join type, enabled state, registered state, and approximate registration time; and
- whether the failure reproduces in the expected native client and a supported standard browser session.

Microsoft lists **Reports Reader** as the least-privileged role for tenant activity logs. The documented path is **Entra ID > Monitoring & health > Sign-in logs**. The event exposes the error code, failure reason, correlation ID, user, app, device information, and applied Conditional Access policies. ([troubleshoot sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors#gather-sign-in-details), [sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

Treat the identifiers as operational data. Do not collect passwords, session cookies, access tokens, refresh tokens, device private keys, or a raw browser profile. Redact tenant names, device names, and user identifiers when evidence leaves the approved support channel.

## Read the failed policy before touching the device

On the event's **Conditional Access** tab, find every policy with a failure result. Confirm the policy actually requires Microsoft Entra hybrid join and note whether grant controls use **Require one of the selected controls** or **Require all the selected controls**.

Then check:

- included and excluded users or groups;
- target resources;
- device platforms;
- client apps;
- locations and device filters;
- policy state, including report-only versus enabled; and
- other grant controls evaluated with the hybrid requirement.

Microsoft warns that requiring hybrid join for all users and all resources can block an entire organization when users lack a qualifying device. It recommends using sign-in evidence and the What If tool to understand policy impact. ([Conditional Access troubleshooting](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access))

Do not assume the policy shown to an administrator today is identical to the version that evaluated the request yesterday. If timing matters, use **Entra ID > Monitoring & health > Audit logs**, filter the service to Conditional Access, and review policy changes around the event. Microsoft's activity-log guidance documents the current and previous modified properties for Conditional Access policy updates. ([Conditional Access and activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies))

## Prove the local hybrid-join state with dsregcmd

Run the following from the affected user's Windows session:

```text
dsregcmd /status
```

Start with **Device State**:

**`AzureAdJoined : YES` and `DomainJoined : YES` — hybrid joined.** Local state claims Microsoft Entra hybrid join. Continue to the device ID, cloud object, PRT, and request evidence.

**`AzureAdJoined : NO` and `DomainJoined : YES` — AD domain joined only.** The PC has not completed Microsoft Entra hybrid join. This is a direct route to `53001`.

**`AzureAdJoined : YES` and `DomainJoined : NO` — Microsoft Entra joined.** The PC is not hybrid joined and cannot satisfy a hybrid-only grant.

**`AzureAdJoined : NO` and `DomainJoined : NO` — neither join appears in this output.** Confirm that you checked the intended session and device before diagnosing the policy.

Microsoft's `dsregcmd` reference defines those fields and explicitly maps `AzureAdJoined : YES` plus `DomainJoined : YES` to Microsoft Entra hybrid joined. ([troubleshoot devices with dsregcmd](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd#device-state))

Next record:

- **DeviceId:** the cloud key you must match exactly in Entra;
- **DeviceAuthStatus:** `SUCCESS` means the device is present and enabled in Microsoft Entra; `FAILED` can indicate a disabled or deleted device;
- **DeviceCertificateValidity:** evidence about the local device certificate's validity; and
- **AzureAdPrt:** whether a Primary Refresh Token is present for the signed-in user.

Run `dsregcmd /status` in the user's context when reading user and SSO state. Microsoft notes that some fields can differ or show errors from an elevated prompt. Use an elevated prompt only when the specific diagnostics require it, such as the pre-join system-context tests or key-sign test. ([dsregcmd diagnostics reference](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd))

If `AzureAdJoined` is `NO`, use the **Diagnostic Data** section rather than immediately running leave or join commands. On a domain-joined device that cannot hybrid join, Microsoft exposes the error phase, client error code, server error code, request ID, HTTP status, AD connectivity test, and AD configuration test. The site's [Windows device join and registration walkthrough](/posts/microsoft-entra-windows-device-join-registration-failures) provides the broader registration-flow investigation.

## Match the local device to the cloud object

In **Entra ID > Devices > All devices**, search by the local `DeviceId`, not just the display name. Confirm:

- the ID matches exactly;
- the object belongs to the expected tenant;
- join type is Microsoft Entra hybrid joined;
- the device is enabled; and
- the registered state is complete rather than pending.

Microsoft says a hybrid device showing **Pending** in the Registered column has been synchronized from Microsoft Entra Connect and is waiting for the client to finish registration. ([manage device identities](https://learn.microsoft.com/en-us/entra/identity/devices/manage-device-identities))

A duplicate display name is not proof of a duplicate identity. Reimaging, restoration, previous registration, or object recreation can leave similarly named records. The local `DeviceId`, the cloud object ID, and the sign-in event's device ID must tell one consistent story.

Do not delete a device object merely because it looks stale. Microsoft ties the validity of the Windows PRT to the device identity; disabling or deleting the cloud object can break SSO and produce separate “deleted” or “disabled” device failures. ([Microsoft Entra device management FAQ](https://learn.microsoft.com/en-us/entra/identity/devices/faq))

## Check the PRT and device-authentication path

On a healthy joined or hybrid-joined Windows session, the Primary Refresh Token is central to cloud SSO. In `dsregcmd /status`, check **SSO State** for `AzureAdPrt : YES`, its authority, and update time. Microsoft says `AzureAdPrt : NO` means PRT acquisition failed and provides diagnostics for the previous attempt on supported Windows versions. ([troubleshoot Primary Refresh Token issues](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token))

A missing PRT is not identical to `53001`, but it is strong evidence that the device's token path is unhealthy. Investigate the reported attempt status, user identity, authority, network reachability, and device authentication before changing Conditional Access.

If the device is locally and cloud healthy but SSO remains broken, follow the site's [PRT failure guide](/posts/microsoft-entra-primary-refresh-token-prt-failures-windows). A password prompt that eventually produces `53001` can be the visible end of a deeper device-authentication failure.

## Verify that the browser or client presents device identity

A correct hybrid join does not guarantee that every client request carries its device identity. Microsoft documents the supported browser paths and warns that private browsing or disabled cookies can fail a device check. Current Windows guidance includes:

- Microsoft Edge must have the user signed in so it can pass device identity correctly;
- Chrome requires its documented Windows device-authentication configuration;
- Firefox requires **Allow Windows single sign-on for Microsoft, work, and school accounts**;
- InPrivate or private mode does not satisfy the hybrid-join grant; and
- unsupported or out-of-support browser and operating-system combinations should not be used to validate the control.

See Microsoft's current [Conditional Access conditions and supported browsers](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-conditions#supported-browsers) before treating a browser-specific failure as a device-registration outage.

Also identify the authentication flow. Microsoft says the hybrid-device grant and device-state conditions are not supported with the OAuth device-code flow because the device entering the code cannot supply the state of the device performing authentication. ([Conditional Access grant controls](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant#require-microsoft-entra-hybrid-joined-device))

Use the sign-in event as the deciding evidence. If the expected device ID and hybrid state are absent in one browser but present in another supported client on the same Windows session, repair the client path. Rejoining the computer would be a high-cost response to a browser-claim problem.

## Choose the recovery branch that matches the evidence

### The device is only AD domain joined

`DomainJoined : YES` with `AzureAdJoined : NO` means the machine has not completed Microsoft Entra hybrid join. Review the `dsregcmd` diagnostic phase and error, Service Connection Point discovery, computer-object synchronization, tenant targeting, and Device Registration Service reachability.

Microsoft recommends a targeted hybrid-join deployment before broad rollout and documents that synchronization can create a temporary pending object before client registration completes. ([plan Microsoft Entra hybrid join](https://learn.microsoft.com/en-us/entra/identity/devices/hybrid-join-plan), [targeted hybrid-join deployment](https://learn.microsoft.com/en-us/entra/identity/devices/hybrid-join-control))

### The cloud device is pending

Do not treat synchronization as completed registration. Correlate the local join diagnostics with the synchronized computer object, then repair the registration step. Validate that the pending record transitions to a completed registered state and that the local and cloud device IDs match.

### The cloud device is disabled, deleted, or mismatched

Determine who or what changed the object before recreating anything. Preserve audit evidence. If the local `DeviceId` points to a different or missing object, use the supported device-registration recovery for that join type and your endpoint-management process. Do not enable an object merely because its name resembles the user's laptop.

### The PRT or device authentication is unhealthy

Use `AcquirePrtDiagnostics`, device-authentication status, Windows event logs, and the matching Entra sign-in event. Repair the device credential, authority, network, or user authentication problem identified by the diagnostics. Avoid broad session revocation until you understand whether it affects the evidence you still need.

### One browser fails but another supported client works

Keep the join intact. Repair browser sign-in, supported device-authentication configuration, cookie handling, private-mode use, or client version. Re-test the exact application because redirects and embedded browsers can change which client actually performs authentication.

### The policy targets the wrong population

Fix the targeting through the organization's change process. Use report-only evidence and What If analysis before enforcement. A policy design error is not proof that the security objective is wrong, and an emergency exception is not a durable device fix.

## Mitigate without dismantling the control

When business access must be restored before the device can be repaired, prefer the smallest approved mitigation that preserves the control's intent.

**Analysis:** a defensible temporary exception is limited to the necessary user or group, resource, client, and time window; requires compensating controls such as phishing-resistant authentication where appropriate; has a named owner and expiry; and is monitored in sign-in logs. Whether that is acceptable depends on the resource and the organization's risk authority.

Do not:

- disable every Conditional Access policy;
- remove the hybrid grant from all resources to fix one device;
- mark an unverified device trusted by display name;
- convert a hybrid-only policy to “compliant or hybrid” without confirming that this matches the intended security design;
- delete duplicate-looking objects during an outage without ID and audit evidence; or
- include emergency access accounts in a device requirement they cannot satisfy.

Microsoft recommends excluding emergency access accounts from Conditional Access policies that block or restrict sign-in and testing those accounts regularly. ([manage emergency access accounts](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access#conditional-access-considerations))

Conditional Access requires Microsoft Entra ID P1; Microsoft 365 Business Premium also includes Conditional Access capabilities. Other controls, such as Intune compliance or risk-based policy, have their own licensing requirements. ([Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-conditional-access))

## Validate the repair end to end

Use a controlled validation sequence:

1. confirm `AzureAdJoined : YES` and `DomainJoined : YES` locally;
2. confirm `DeviceAuthStatus : SUCCESS` and record the exact `DeviceId`;
3. confirm the same enabled, fully registered hybrid object in Entra;
4. confirm `AzureAdPrt : YES` for the affected user and review its update time;
5. use the intended supported client in a standard session;
6. sign in to the original application and locate the new event by UTC time and identifiers;
7. confirm the event contains the correct device ID and hybrid state;
8. confirm the intended Conditional Access policy succeeds and no unexpected policy fails;
9. repeat with an approved negative control that should remain blocked; and
10. monitor the next normal token renewal or sign-in rather than closing on one lucky interactive attempt.

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) helps interpret the Basic info, Device info, Authentication details, and Conditional Access tabs without guessing from the user's error page.

**Analysis:** measure recurrence by device ID, client app, browser, policy, and deployment group. Many devices failing after a sync or browser-policy change points to control-plane rollout. One device with a mismatched ID points to its registration lineage. One browser failing across otherwise healthy devices points to the claim-delivery path.

## Escalate with evidence, not a rejoin history

If the evidence remains contradictory, collect:

- UTC failure time, correlation ID, request ID, and trace ID;
- tenant ID, user object ID, application ID, and resource ID;
- Conditional Access policy ID and failed grant result;
- sanitized sign-in event export;
- Windows version and client or browser version;
- relevant `dsregcmd /status` sections with identifiers appropriately protected;
- local `DeviceId` and matching cloud-object details;
- PRT attempt status and device-registration diagnostic codes;
- relevant User Device Registration and AAD operational event entries; and
- the last known successful sign-in for the same user, device, client, and resource.

Microsoft recommends including the request ID, time, and date when opening a support incident for Conditional Access. ([Conditional Access troubleshooting](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access#microsoft-entra-sign-in-events))

## AADSTS53001 administrator checklist

- [ ] Capture the complete error and UTC identifiers before remediation.
- [ ] Confirm the exact code is `53001`.
- [ ] Identify the failed Conditional Access policy and hybrid-join grant.
- [ ] Verify the intended user, app, resource, client, tenant, and policy scope.
- [ ] Run `dsregcmd /status` in the affected user's context.
- [ ] Confirm both `AzureAdJoined : YES` and `DomainJoined : YES`.
- [ ] Match the local `DeviceId` to the exact cloud object.
- [ ] Confirm the cloud device is enabled and fully registered, not pending.
- [ ] Review `DeviceAuthStatus`, device certificate validity, and `AzureAdPrt`.
- [ ] Reproduce in the intended supported non-private browser or native client.
- [ ] Confirm the successful sign-in event carries the correct device identity.
- [ ] Keep the hybrid-device requirement effective for negative controls.
- [ ] Time-box and monitor any approved temporary exception.
- [ ] Preserve a sanitized evidence package for escalation.

## Frequently asked questions

### Is an AD domain-joined PC automatically Microsoft Entra hybrid joined?

No. On Windows, `DomainJoined : YES` proves the on-premises AD DS relationship. Microsoft Entra hybrid join requires `AzureAdJoined : YES` as well, plus a matching completed cloud device object.

### Why does AADSTS53001 work in Edge but fail in another browser?

The browser must pass usable device identity. Sign-in state, supported configuration, cookies, private mode, and operating-system support can change that path. Compare the device information in the two sign-in events before changing the device registration.

### Will Intune compliance satisfy the hybrid-join requirement?

Not by itself. **Require device to be marked as compliant** and **Require Microsoft Entra hybrid joined device** are separate grant controls. They can be combined as alternatives or simultaneous requirements, but the policy's selected-control logic decides what must pass.

### Should I delete and rejoin the device?

Not as the first step. Prove local state, cloud state, device ID, PRT health, request evidence, and policy scope first. A delete-and-rejoin can destroy useful evidence and create a new identity without fixing a browser or policy problem.

### Can a Microsoft Entra joined device satisfy this policy?

No. A device with `AzureAdJoined : YES` and `DomainJoined : NO` is Microsoft Entra joined, not hybrid joined. Change the policy only if the security design intends to allow that join type.

### Why does the hybrid device show Pending in Entra?

The computer object has been synchronized, but the client has not completed registration. Treat that as an unfinished hybrid join and troubleshoot the registration diagnostics on the device.

## Final takeaway

AADSTS53001 is not a generic “the laptop is broken” message. It says one token request failed a specific Conditional Access hybrid-device grant. Find that request, read the policy result, prove both halves of local hybrid join, match the device ID to an enabled and completed cloud object, then verify that the client delivered the claim. Fix the layer that failed and leave the security boundary standing.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Conditional Access grant controls](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant)
- [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access)
- [Conditional Access conditions and supported browsers](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-conditions)
- [What is a device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview)
- [Troubleshoot devices by using dsregcmd](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd)
- [Verify Microsoft Entra hybrid join](https://learn.microsoft.com/en-us/entra/identity/devices/how-to-hybrid-join-verify)
- [Troubleshoot Microsoft Entra hybrid joined devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-hybrid-join-windows-current)
- [Plan a Microsoft Entra hybrid join deployment](https://learn.microsoft.com/en-us/entra/identity/devices/hybrid-join-plan)
- [Manage device identities](https://learn.microsoft.com/en-us/entra/identity/devices/manage-device-identities)
- [Troubleshoot Primary Refresh Token issues](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token)
- [Troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors)
- [Sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Conditional Access and activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [Manage emergency access accounts](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)
- [Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)
