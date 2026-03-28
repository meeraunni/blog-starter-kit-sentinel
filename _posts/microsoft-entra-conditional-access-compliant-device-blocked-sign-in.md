---
title: "Microsoft Entra ID: Troubleshoot 'Require device to be marked as compliant' Sign-In Failures"
excerpt: "Learn why Microsoft Entra can block a sign-in that comes from an Intune-compliant device and how to validate device identity, browser support, and Conditional Access evaluation."
coverImage: "/assets/blog/compliant-device-blocked/cover.svg"
date: "2026-03-27T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/compliant-device-blocked/cover.svg"
---

## Overview

This article covers the scenario where:

- Intune shows the device as compliant
- a Conditional Access policy requires a compliant device
- Microsoft Entra still blocks token issuance

This does not automatically mean Intune is wrong. In many cases, it means the sign-in request did not present the device evidence that Microsoft Entra needs in order to evaluate the compliant-device control.

Microsoft’s main references are:

- [Configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant)
- [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions)
- [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access)

![Compliant device still blocked](/assets/blog/compliant-device-blocked/cover.svg)

## What the grant control actually checks

The compliant-device control is not evaluating Intune compliance in isolation. Microsoft documents in [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview) and [Configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant) that device-based Conditional Access depends on Microsoft Entra being able to identify the device during sign-in.

That means the full chain is:

1. the client must present device identity
2. Entra must map that sign-in to the correct device object
3. Entra must confirm the device is managed and compliant
4. the browser or client path must be one of Microsoft’s supported device-authentication paths

If step 1 or step 4 fails, the device can still be compliant in Intune while the sign-in is blocked.

## Common causes

### Browser or client path does not support device identity properly

Microsoft’s [Conditional Access conditions documentation](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions) publishes the supported browsers and operating systems for device-based policy evaluation.

That support table matters because a compliant device is not enough if the browser session cannot carry the device-authentication evidence. Microsoft also notes that private mode and disabled cookies can break the device check.

### Device identity is missing or mismatched

If the device object is missing, stale, or does not line up with local registration state, Entra cannot evaluate the compliance condition correctly. Microsoft’s device identity documentation and `dsregcmd` guidance are critical here:

- [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview)
- [Troubleshoot devices by using the dsregcmd command](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd)

### Client certificate path failed

Microsoft documents in [Configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant) that supported browser-based device identification relies on a client certificate path in several platform scenarios.

If the certificate prompt is missed or the browser state prevents that proof from being reused, the user can authenticate while the device proof never reaches policy evaluation.

### Edge session is not in the right state

Microsoft notes in the browser-support documentation that Microsoft Edge 85 and later requires the user to be signed in to the browser to pass device identity correctly in supported scenarios.

That means “Edge is supported” is not the full statement. The Edge session also has to be in the supported state.

### Policy design blocks its own bootstrap path

Microsoft recommends [report-only mode](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only) and the [What If tool](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool) precisely because some policy designs block enrollment or proof-up flows before a user can ever establish the required device state.

## How to validate the problem

Use the failed sign-in record as the primary evidence source:

1. open the sign-in in Entra sign-in logs
2. review the `Conditional Access` tab
3. capture the `Device ID`, `Compliant`, and `Managed` fields
4. record the browser and operating system
5. compare the browser and OS with Microsoft’s supported matrix
6. if needed, validate the local device state with `dsregcmd /status`

The applied-policy view is documented in [View applied Conditional Access policies in sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies).

## What usually fixes it

The right remediation depends on what failed:

- if the browser path is unsupported, move the user to a supported client path
- if the session is private or missing cookies, repeat the sign-in in a supported normal session
- if the device object is wrong or stale, repair device registration first
- if the client certificate path failed, reproduce the sign-in and allow the device-identification path to complete
- if policy design blocks the enrollment or bootstrap path, redesign the policy and validate it in report-only mode first

## Key implementation points

- Intune compliance is necessary but not sufficient for the compliant-device grant control.
- Microsoft Entra must identify the device during the sign-in transaction.
- Browser support and browser state matter.
- Sign-in logs usually reveal whether the real problem is missing device proof or true noncompliance.

## References

- [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview)
- [Configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant)
- [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions)
- [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access)
- [View applied Conditional Access policies in sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [Conditional Access report-only mode](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only)
- [What If tool for Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool)
- [Microsoft Edge and Conditional Access](https://learn.microsoft.com/en-us/deployedge/ms-edge-security-conditional-access)
