---
title: "Microsoft Entra Conditional Access: Why a Compliant Device Is Still Blocked at Sign-In"
excerpt: "A technical guide to troubleshooting Microsoft Entra Conditional Access when Intune says a device is compliant but sign-in is blocked, including browser support, device identity, sign-in logs, and grant control behavior."
coverImage: "/assets/blog/compliant-device-blocked/cover.svg"
date: "2026-03-27T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/compliant-device-blocked/cover.svg"
---

## The problem behind a very common help desk ticket

One of the most common Microsoft Entra access complaints sounds like this:

> "The device is compliant in Intune, but Conditional Access still blocks the sign-in."

This is not one problem. It is several possible problems that look identical from the user’s perspective.

In practice, the failure usually comes from one of these layers:

- the device has compliance, but the sign-in path cannot present device identity
- the browser is unsupported for device-based access controls
- the device is not registered in the expected way
- the sign-in event is being evaluated before the full device context is available
- the policy was designed too broadly and blocks its own bootstrap path

The key is to stop asking only whether the device is compliant and start asking whether Entra can **prove** that compliance during the exact sign-in path being used.

## Compliance and device identity are related, but they are not the same thing

A device being compliant in Intune does not automatically mean every sign-in can satisfy **Require device to be marked as compliant**.

For that grant control to work, Entra needs device identity information during the sign-in event. Microsoft documents that device-based controls require the device to be registered with Entra and supported on the relevant platform and browser path.

That means you need all of the following to line up:

- device registration state
- Intune compliance state
- supported browser or client
- supported operating system
- policy conditions that match the real access path

If any one of those is missing, the sign-in may still show as blocked even though the device is healthy in Intune.

## Root cause 1: the browser path cannot satisfy device identification

This is one of the biggest sources of false assumptions.

Microsoft’s Conditional Access documentation explains that to satisfy a device policy such as **Require device to be marked as compliant**, only certain browser and operating system combinations support device authentication properly.

Examples from current Microsoft guidance:

- **Windows 10+**: Edge, Chrome, Firefox 91+
- **iOS**: Edge, Safari
- **Android**: Edge, Chrome
- **macOS**: Edge, Chrome, Firefox 133+, Safari
- **Linux desktop**: Edge

If the user signs in with an unsupported browser path, Entra may not be able to determine the device state, even if the device is enrolled and compliant.

That is why "it works in one browser but not another" is often a real architecture issue, not a random bug.

## Root cause 2: the device is compliant, but not registered in the way the grant control expects

Microsoft documents that devices must be registered with Entra before they can be used for device-based Conditional Access checks.

That means you should verify:

- Microsoft Entra registered
- Microsoft Entra joined
- Microsoft Entra hybrid joined

The right answer depends on the platform and the policy model you are enforcing.

If the device object is missing, stale, or not the one Entra expects during sign-in, the user can end up with a compliant device that still cannot satisfy the grant control.

For Windows investigation, `dsregcmd /status` remains one of the most useful checks because it confirms the local registration and join state directly from the endpoint.

## Root cause 3: the browser certificate or device proof is not being presented

Microsoft notes that on Windows, iOS, Android, macOS, and some non-Microsoft browsers, Entra identifies the device through a client certificate provisioned during device registration.

This has several operational implications:

- the certificate prompt may appear during first use
- private browsing can break the flow
- disabled cookies can break the flow
- browser state and sign-in context matter

If the user dismisses the certificate prompt, uses a private window, or signs in through a path that does not preserve device identity correctly, the device state can appear unknown or noncompliant even though Intune shows the device as healthy.

## Root cause 4: Edge profile or browser sign-in state is incomplete

Microsoft specifically documents that Edge requires the user to be signed in to the browser profile to properly pass device identity in supported scenarios.

That means a user can say:

- "I’m in Edge"
- "The device is compliant"
- "Why am I still blocked?"

and the answer can still be that the browser itself is not in the state required to carry device identity to Entra.

This is a good example of why "supported browser" is not the same thing as "correctly configured browser session."

## Root cause 5: the policy is blocking a registration or bootstrap flow

Microsoft’s own Conditional Access troubleshooting guidance warns against broad policies that require compliant devices for all users and all resources before the organization has a safe onboarding path.

This is where tenants create their own lockout conditions.

Common examples:

- new user cannot reach enrollment because access already requires compliance
- admin cannot reach Intune portal because access already requires compliance
- BYOD phone cannot finish the managed app or registration path because the compliant device rule is enforced too early

This is not a device problem. It is a policy design problem.

## Root cause 6: the sign-in log is telling you the device state was unknown, not truly noncompliant

In real incidents, admins often focus on the final blocked result and miss what the sign-in details actually show.

The more useful fields are:

- **Client app**
- **Browser**
- **Operating system**
- **Device ID**
- **Compliant**
- **Managed**
- **Conditional Access tab**
- **Error code**

Microsoft’s sign-in troubleshooting guidance highlights codes such as:

- `AADSTS53000` for **DeviceNotCompliant**
- `AADSTS53003` for **BlockedByConditionalAccess**

But the interpretation still depends on whether Entra received a valid device signal from the sign-in path.

If the device ID is missing or the browser path is unsupported, the issue may be that the device could not be evaluated correctly, not that Intune truly marked it noncompliant.

## A fast troubleshooting sequence that works

When a compliant device is blocked, use this order:

1. Check the Entra sign-in log for the exact attempt.
2. Open the **Conditional Access** tab and confirm which policy blocked it.
3. Check whether the **Device ID** is present.
4. Check the **Browser** and **Operating system** values against Microsoft’s supported browser matrix.
5. Confirm the device is actually registered in Entra, not just enrolled in Intune.
6. On Windows, validate device registration locally with `dsregcmd /status`.
7. Confirm the user is not in private browsing or a cookie-restricted session.
8. If Edge is used, confirm the user is signed into the Edge profile.

That sequence usually narrows the problem quickly.

## Design guidance to avoid this class of issue

If you want fewer "compliant but blocked" incidents:

1. Do not apply **Require device to be marked as compliant** to every user and every resource without a bootstrap plan.
2. Keep one safe enrollment and recovery path available.
3. Publish the supported browser list to users and support staff.
4. Test mobile and browser paths separately.
5. Review policy interactions with app protection and approved app controls instead of stacking them blindly.

Most mature Conditional Access deployments fail less because the policy is technically stronger. They fail less because the access paths were designed intentionally.

## Final takeaway

If Intune says a device is compliant but Entra still blocks the sign-in, the problem is often not the compliance policy itself.

The real issue is usually one of these:

- unsupported browser path
- missing device identity during sign-in
- stale or unexpected registration state
- policy design blocking enrollment or proof-up
- misread sign-in log interpretation

Ask whether Entra could identify the device during **that exact sign-in**, not only whether Intune liked the device five minutes earlier.

## Microsoft References

- [Troubleshoot sign-in problems with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/troubleshoot-conditional-access)
- [Use Conditional Access with Microsoft Intune compliance policies](https://learn.microsoft.com/en-us/mem/intune/protect/conditional-access)
- [How to configure grant controls in Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant)
- [How to use conditions in Conditional Access policies](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-conditions)
- [Microsoft Edge and Conditional Access](https://learn.microsoft.com/en-us/deployedge/ms-edge-security-conditional-access)
- [Conditional Access and sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [What is device identity in Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/devices/overview)
- [Microsoft Entra device management FAQ](https://learn.microsoft.com/entra/identity/devices/faq)
