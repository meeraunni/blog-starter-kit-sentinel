---
title: "Microsoft Entra ID: Troubleshoot 'Require device to be marked as compliant' Sign-In Failures"
excerpt: "Technical troubleshooting for Conditional Access failures where the device is compliant in Intune but Microsoft Entra still blocks token issuance."
coverImage: "/assets/blog/compliant-device-blocked/cover.svg"
date: "2026-03-27T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/compliant-device-blocked/cover.svg"
---

## Failure definition

The scenario in scope is:

- the device is shown as compliant in Intune
- the user signs in to a cloud resource
- Microsoft Entra blocks token issuance because a Conditional Access policy requiring a compliant device was not satisfied

This failure is easy to describe badly. The common summary is "Intune says compliant but Entra says blocked." The more precise summary is:

**the compliance state exists, but the sign-in transaction did not satisfy Microsoft Entra’s device-based evaluation requirements**

That distinction matters because the [grant control documentation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant) and the [Conditional Access conditions documentation](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions) make clear that device-based enforcement depends on both:

- a valid device identity
- a supported client path that can present that identity during sign-in

## What the control actually checks

As documented in [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview), device-based Conditional Access depends on a device object in Microsoft Entra ID. As documented in [Configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant), **Require device to be marked as compliant** only supports Microsoft Entra-registered devices on supported platforms that are enrolled with Intune.

That means "device is compliant in Intune" is necessary, but it is not the whole condition. Microsoft Entra still has to identify the device during the sign-in and match that sign-in to a registered, managed, policy-evaluable device object.

## Root cause 1: the sign-in path cannot present device identity

The [Conditional Access conditions documentation](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions) explicitly lists the supported browsers and operating systems for satisfying device policies. That page also states two details admins often miss:

- the browsers in the support table are the ones that support **device authentication**
- the device check fails if the browser is in **private mode** or if **cookies are disabled**

As mentioned [here](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions), that means a device can be perfectly compliant and still fail the policy if the browser session cannot carry the device proof.

### Validation steps

1. Open the failed sign-in in **Entra sign-in logs**.
2. Record the **browser** and **operating system** used for the failed event.
3. Compare that combination to the support table in [Conditional Access conditions](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions).
4. Confirm the user was not in private browsing and did not disable cookies.

### Root-cause explanation

The policy engine is not directly evaluating Intune compliance "in the abstract." It is evaluating whether the specific token request carried the evidence needed to map the request to a device and then check that device’s compliance state.

## Root cause 2: the device is enrolled, but the registration state is not the one the policy expects

As explained in [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview), Microsoft Entra recognizes device identity through registration, join, or hybrid join. Device-based Conditional Access relies on that object. If the object is missing, stale, or mismatched, compliance cannot be applied correctly at sign-in.

### Validation steps

1. Confirm the device has a valid device object in **Microsoft Entra ID > Devices**.
2. Confirm the object state matches the expected platform model:
   - Microsoft Entra registered
   - Microsoft Entra joined
   - Microsoft Entra hybrid joined
3. On Windows, run `dsregcmd /status` and compare the local registration state to the Entra object.

### Root-cause explanation

Intune compliance by itself does not manufacture device identity. The sign-in succeeds only when Entra can associate the token request with the expected device object and then evaluate the relevant compliance signal.

## Root cause 3: the client certificate path failed

Microsoft states in [Configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant) that on Windows, iOS, Android, macOS, and some non-Microsoft browsers, Microsoft Entra identifies the device using a **client certificate** provisioned during device registration. Microsoft also states there that the user must select that certificate when prompted.

### Validation steps

1. Ask whether the user saw a certificate prompt on first browser sign-in.
2. Confirm the user did not dismiss or reject the certificate.
3. Reproduce the sign-in in a normal browser session, not an incognito/private session.
4. If possible, compare behavior between the failing browser and Microsoft Edge.

### Root-cause explanation

If the certificate-based device proof is not presented, the browser session may authenticate the user successfully but still fail device-based Conditional Access because the device identity never reached the policy engine.

## Root cause 4: Edge is supported, but the Edge session is not

The [Conditional Access conditions page](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions) states that **Microsoft Edge 85+ requires the user to be signed in to the browser to properly pass device identity**. The [Microsoft Edge Conditional Access documentation](https://learn.microsoft.com/en-us/deployedge/ms-edge-security-conditional-access) expands on how Edge participates in device-based access.

### Validation steps

1. Confirm the user is actually signed into the Edge browser profile.
2. Confirm the session is not **InPrivate**.
3. Re-run the sign-in after confirming the profile state.

### Root-cause explanation

This is a browser-state problem, not a compliance-policy problem. The browser is supported, but the session is not carrying the device identity in the manner Microsoft documents.

## Root cause 5: the policy design blocks its own enrollment or recovery path

The [Conditional Access troubleshooting documentation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access) recommends using sign-in logs, the What If tool, and [report-only mode](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only) to understand policy effects before broad enforcement. This is directly relevant when a tenant requires compliant devices very early in the lifecycle.

### Validation steps

1. Use the failed sign-in’s **Conditional Access** tab to identify the exact blocking policy.
2. Evaluate whether that same policy blocks:
   - device enrollment
   - Company Portal access
   - admin onboarding
   - browser bootstrap on unmanaged/BYOD endpoints
3. Use [What If](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool) and [report-only mode](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only) to test the revised policy model.

### Root-cause explanation

This is a policy-architecture failure. The tenant has created a control that assumes device proof exists before the workflow that establishes or exposes that proof can complete.

## Root cause 6: the admin is reading the final error but not the sign-in details

The [Applied Conditional Access policies view](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies) and [Conditional Access troubleshooting guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access) are the authoritative places to inspect what actually happened during the sign-in.

### Validation steps

For the failed sign-in, review:

- **Conditional Access** tab
- **Device ID**
- **Compliant**
- **Managed**
- **Client app**
- **Browser**
- **Operating system**

If the device ID is absent or the browser is unsupported, the root cause may be missing device evidence rather than true noncompliance.

### Root-cause explanation

The sign-in result alone is too coarse. The diagnostic data in the sign-in log tells you whether the problem is policy selection, missing device proof, unsupported client path, or actual compliance failure.

## Recommended troubleshooting order

1. Open the failed sign-in in [sign-in logs](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access).
2. Review the [Conditional Access tab](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies) for the blocking policy.
3. Check whether **Device ID**, **Compliant**, and **Managed** values are populated.
4. Compare the browser and OS with the support matrix in [Conditional Access conditions](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions).
5. Validate Microsoft Entra device registration state using [device identity](https://learn.microsoft.com/en-us/entra/identity/devices/overview) and local Windows checks where relevant.
6. Confirm the browser session was not private and did not suppress the device certificate path.
7. Re-evaluate whether the policy is blocking enrollment or proof-up flows.

## Final takeaway

When a compliant device is blocked, the real question is not "is Intune right or is Entra right?"

The real question is whether the token request provided the evidence Microsoft Entra needs to:

1. identify the device
2. map it to the correct Entra device object
3. evaluate the compliance grant control on a supported client path

Most failures reduce to one of those documented dependencies.

## Microsoft References

- [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview)
- [Configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant)
- [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions)
- [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access)
- [View applied Conditional Access policies in sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [Conditional Access report-only mode](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only)
- [What If tool for Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool)
- [Microsoft Edge and Conditional Access](https://learn.microsoft.com/en-us/deployedge/ms-edge-security-conditional-access)
