---
title: "Why Compliant Devices Still Get Blocked"
excerpt: "A detailed technical guide to why Microsoft Entra can block a sign-in from an Intune-compliant device, including device identity proof, browser support, client certificate behavior, and Conditional Access evaluation."
coverImage: "/assets/blog/compliant-device-blocked/cover.svg"
date: "2026-03-27T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/compliant-device-blocked/cover.svg"
---

## Overview

One of the most common Conditional Access escalations sounds simple: Intune shows the device as compliant, but Microsoft Entra still blocks the sign-in with a policy that requires the device to be marked as compliant.

In practice, this is rarely an Intune-only issue. Microsoft Entra does not evaluate compliance by querying Intune in a vacuum. It evaluates whether the sign-in request presented enough **device identity evidence** to associate the request with the correct Entra device object and then determine whether that object is managed and compliant.

Microsoft's most relevant references are [Configure grant controls in Microsoft Entra Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant), [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions), [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access), [View applied Conditional Access policies in sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies), and [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview).

The important shift in thinking is this: a compliant device in Intune is only useful to Conditional Access if the sign-in transaction can prove **which device** is actually making the request.

![Compliant device still blocked](/assets/blog/compliant-device-blocked/cover.svg)

## How the compliant-device grant is evaluated

When a policy uses **Require device to be marked as compliant**, the Conditional Access engine is not making a simple yes-or-no call against the Intune console. The evaluation path has several stages.

First, Microsoft Entra must authenticate the user and collect sign-in context such as client app, platform, browser, and app target.

Second, the service must determine whether the request carries usable device identity information. For web scenarios, Microsoft documents in [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions) and [Configure grant controls in Microsoft Entra Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant) that supported device checks rely on browser and platform-specific behavior and, in several scenarios, a client certificate path.

Third, once the sign-in is associated with a device object, Microsoft Entra evaluates whether that object is managed and compliant. If the device evidence is missing or wrong, the service cannot safely consume the compliance signal even if Intune shows the device as healthy.

That is why administrators often say "Intune says compliant, but Entra says blocked." A more accurate interpretation is "the sign-in request did not present the evidence Entra needed in order to trust Intune's compliance state for this session."

## Device compliance and device identity are not the same thing

This is the most important concept in this topic. Device **compliance** answers whether the management platform considers the device aligned with policy. Device **identity** answers whether Microsoft Entra can confidently tie the current authentication request to the correct device object.

Microsoft's [device identity overview](https://learn.microsoft.com/en-us/entra/identity/devices/overview) is useful here because it makes clear that device identity is a first-class identity primitive in Microsoft Entra. Conditional Access consumes that primitive. If device identity is stale, missing, or unsupported in the client path, the compliance decision never gets a trustworthy input.

This is also why web support is narrower than many teams expect. A device may be fully managed, fully compliant, and fully healthy, but if the browser session cannot present the correct device evidence, the policy still fails.

## Failure class 1: the browser path cannot provide device proof

Microsoft publishes the authoritative browser and platform support matrix in [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions). That matrix should be treated as a runtime support contract, not as optional reading.

The important backend meaning of the matrix is this: Microsoft is telling you which browser and operating system combinations can carry enough device identity evidence to evaluate device-based policy correctly.

This is why a sign-in can succeed in one browser and fail in another without any change in Intune compliance:

1. user authentication works in both browsers
2. only one browser can provide the device proof needed for policy evaluation
3. Entra therefore consumes compliance in one path and ignores or cannot trust it in the other

Microsoft also notes that private mode or disabled cookies can break the device check. That matters because the user experience looks deceptively simple. The same compliant device can pass in a normal tab and fail in a private session because the policy engine no longer receives the required device correlation.

## Failure class 2: the device object is stale, mismatched, or unusable

Even on a supported browser path, the service still has to correlate the request to the correct Entra device object. If that object is stale, duplicated, disabled, or otherwise not aligned with the local device state, the policy engine can fail to consume the compliance signal correctly.

This is where [Troubleshoot devices by using the dsregcmd command](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd) becomes important even though the user reported a Conditional Access problem. For Windows, `dsregcmd /status` helps you validate whether the device registration state that Windows is presenting matches the identity object the tenant expects.

If local registration and tenant object state disagree, the user can still appear to be signing in from "the same laptop," but Conditional Access is not evaluating human intent. It is evaluating the technical device identity attached to the sign-in request.

## Failure class 3: the client certificate path did not complete correctly

Microsoft explains in [Configure grant controls in Microsoft Entra Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant) that supported device-identification scenarios rely on a client certificate path for several browser and platform combinations.

This is one of the most misunderstood parts of compliant-device enforcement. Administrators often think that if the browser can show the login page and the user can type a password, then the device identity should be obvious to Entra. That is not how the evaluation works. Device proof has to be supplied through the supported technical path. If the certificate-based or device-identification exchange does not complete, the policy engine sees an authenticated user without sufficient device evidence.

That is why some failures look paradoxical:

1. the user authenticated successfully
2. the device is compliant
3. the policy still blocks the session

The paradox disappears once you separate user authentication from device proof.

## Failure class 4: the browser is supported, but the browser state is unsupported

Supported browser brand does not guarantee supported session state. Microsoft notes, for example, that Microsoft Edge support depends on the correct browser sign-in state in relevant scenarios, and the conditions guidance also notes that private mode and disabled cookies break device checks.

This matters in production because support teams often stop at "the user is on Edge" or "the user is on Chrome." That is not enough information. The real diagnostic questions are:

1. was the browser session normal or private?
2. were cookies available?
3. did the browser complete the expected device-authentication behavior?
4. is the user testing a supported browser-plus-platform combination or only a supported browser name?

Without those answers, browser-related Conditional Access troubleshooting becomes guesswork.

## Failure class 5: policy design blocks its own bootstrap path

Microsoft recommends [report-only mode](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only), the [What If tool](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool), and the sign-in diagnostic because tenants often design a policy that is logically correct on paper but operationally impossible for some users to satisfy.

This usually happens when the tenant requires compliant-device access too early in the lifecycle:

1. the user needs access to complete enrollment or establish the supported browser state
2. the policy blocks the very access path that would allow the user to become policy-compliant
3. the issue then appears to be device compliance, even though the true problem is a policy bootstrap loop

This is not a platform bug. It is a control-plane design problem.

## A practical validation sequence

The fastest route to root cause is to validate the sign-in in the same order Microsoft Entra evaluates it.

### 1. Start with the sign-in logs

Open the failed sign-in and review the Conditional Access tab, as described in [View applied Conditional Access policies in sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies). Record whether the sign-in shows `Device ID`, `Compliant`, and `Managed`, and capture the error code if one is present. Microsoft documents codes such as `53000` (`DeviceNotCompliant`) and `53003` (`BlockedByConditionalAccess`) in [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access).

### 2. Validate the browser and platform combination

Compare the exact browser and operating system pair to the Microsoft support matrix in [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions). Do not rely on memory here. Device-based web access is support-matrix driven.

### 3. Validate local device identity

If the device is Windows-based, run `dsregcmd /status` and confirm the local registration state. If the device identity is stale locally, Conditional Access is consuming a bad input before it ever looks at compliance.

### 4. Use policy simulation tools

If the evidence is ambiguous, use the sign-in diagnostic and the [What If tool](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool). These tools help distinguish "policy applied correctly to bad input" from "policy design is wrong."

## Remediation principles

The fix depends on which stage failed.

If the client path is unsupported, the correct fix is to move the user to a supported path. If the device identity is stale, repair device registration first. If the browser session is unsupported because of private mode or browser state, repeat the sign-in in a supported session. If the policy design is causing a bootstrap loop, redesign the scope and rollout order rather than asking users to keep retrying.

The common anti-pattern is to keep troubleshooting Intune compliance when the sign-in logs already show that the service never trusted the device identity in the first place.

## Key implementation points

1. Intune compliance is only usable to Conditional Access when the sign-in request also carries trusted device identity.
2. Browser and platform support determine whether web-based device checks can work at all.
3. Client certificate and device-identification paths are part of the evaluation, not background details.
4. Sign-in logs are the most reliable evidence source for distinguishing real noncompliance from missing device proof.

## References

- [Configure grant controls in Microsoft Entra Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant)
- [Use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions)
- [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access)
- [View applied Conditional Access policies in sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [What is device identity?](https://learn.microsoft.com/en-us/entra/identity/devices/overview)
- [Conditional Access report-only mode](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only)
- [The What If tool](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool)
- [Microsoft Edge and Conditional Access](https://learn.microsoft.com/en-us/deployedge/ms-edge-security-conditional-access)
