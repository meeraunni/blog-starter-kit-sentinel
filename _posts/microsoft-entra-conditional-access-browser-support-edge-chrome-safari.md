---
title: '"Works in Edge but Not in Chrome": Conditional Access Browser Support, Explained'
excerpt: "The same user signs in fine from one browser and gets blocked from another on the same laptop. The policy didn't change, the user didn't change, the device didn't change. So what changed? Almost always, the device evidence the browser session carried. Here's the actual model, the five failure modes that account for most of it, and the KQL to spot the pattern at scale."
coverImage: "/assets/blog/browser-policy/cover.svg"
date: "2026-05-14T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/browser-policy/cover.svg"
---

The complaint always sounds the same. "It works in Edge but not in Chrome." Or "I had it yesterday." Or "it works for me on the same laptop." The help desk burns an afternoon on it, somebody files a ticket that says "Conditional Access is flaky in Safari," and the team moves on.

Conditional Access is not flaky. What's actually happening is that different browser sessions are presenting different device evidence to Microsoft Entra, and the policy is correctly enforcing against the evidence each session can carry. Once you internalise that, the per-browser failures stop being mysterious and start being a small set of predictable patterns.

This piece walks through how the browser participates in the device-evidence pipeline, the five failure modes that account for nearly every per-browser ticket I've ever worked, a diagnostic sequence that takes about ten minutes per incident, and a small KQL toolkit for finding the same problems at population scale before users notice them. The Microsoft references — [browser conditions in Conditional Access](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-conditional-access-conditions), [grant controls](https://learn.microsoft.com/entra/identity/conditional-access/concept-conditional-access-grant), and [browser SSO troubleshooting](https://learn.microsoft.com/entra/identity/devices/troubleshoot-device-windows-joined) — are the authoritative source for the underlying mechanics.

## What the browser is actually carrying

A modern browser participating in a Microsoft Entra sign-in is doing two distinct jobs in the same HTTP transaction. The first is the one everyone thinks about: moving the user through the OIDC or SAML flow, presenting the sign-in page, handling the redirect back to the application. Every supported browser does this reliably.

The second job, and the one that decides Conditional Access outcomes, is **device evidence acquisition**. Depending on platform and browser, the request might include a primary refresh token (PRT) cookie carrying the device identity (on Entra-joined or hybrid-joined Windows devices), a device-bound client certificate (on macOS or Windows where the device is registered), or a managed-browser channel that proxies the request through the OS's identity broker (Edge directly, or Chrome with the Single Sign-On extension). Or it might include nothing at all — a clean browser session with no extension, no PRT, no certificate. Conditional Access sees a request and a username and that's it.

The runtime then evaluates each policy that targets the request. If a policy requires *compliant device* or *hybrid Entra joined*, the runtime needs to know which device this is. If the browser session can't supply that evidence, the runtime can't satisfy the grant control, and the policy returns failure. The user sees "Your sign-in was successful, but you don't have access to this app," which is the phrasing that makes the failure look like a Conditional Access bug. It isn't. The sign-in worked. The device-evidence step failed.

> [!NOTE]
> The Conditional Access verdict on a sign-in record is what the runtime concluded *given the evidence it received*. It is not a description of the user's "true" device state. Two browsers on the same physical laptop can produce different verdicts because they presented different evidence to the same request.

## The five things that go wrong

After enough incident reviews almost every per-browser ticket falls into one of these.

The first is **Chrome on Windows missing the PRT cookie because the SSO extension isn't deployed**. On Windows, the Web Account Manager brokers SSO between the OS and supported browsers. Edge consumes it natively. Chrome consumes it through the Microsoft [Single Sign-On extension](https://learn.microsoft.com/azure/active-directory/devices/howto-windows-for-work-extension). If the extension is missing, disabled, or out of date, Chrome behaves like a clean browser: no PRT cookie, no device evidence. You'll see this in `SigninLogs` as `DeviceDetail.deviceId` being empty, `DeviceDetail.trustType` null, `ClientAppUsed` set to "Browser," and the Conditional Access tab showing the device-compliance policy as failure. Deploy the SSO extension via GPO, Intune, or the browser's enterprise policies. That's the supported path.

The second is **macOS missing the device-bound client certificate**. Device-based CA on macOS relies on the [Microsoft Enterprise SSO plug-in for Apple devices](https://learn.microsoft.com/azure/active-directory/devices/macos-psso) and a client certificate provisioned during device registration. If the SSO plug-in isn't deployed, or the certificate has been deleted from Keychain, Safari and Chrome both stop being able to present device evidence. The diagnostic signature is `DeviceDetail.operatingSystem = "MacOs"`, `trustType` showing as `WorkPlace` (Entra registered) or null, but the compliance check still failing. The user-facing error is `AADSTS530002`. The fix is to confirm the SSO extension is enrolled via MDM and re-trigger device registration.

The third is **private or Incognito mode silently stripping evidence**. This accounts for more "but it works in my normal window" tickets than anything else I see. Private browsing on every major browser disables persistent cookies, which means the PRT cookie isn't available even on a device that would otherwise be perfectly capable. Some private modes also disable extensions, which kills the SSO extension path on Chrome. The user did nothing wrong, the browser is functioning as designed, and Conditional Access correctly returns failure because no device evidence is there. Adding "are you in a private or Incognito tab" to the first three questions your help desk asks closes between fifteen and twenty-five percent of CA browser tickets on its own.

The fourth is **Linux with native Chrome or Firefox and no broker**. There isn't a PRT broker on Linux today. Conditional Access policies that require compliant or Entra-joined devices fail in any browser on Linux. The exceptions are Microsoft Edge for Linux (limited broker support) or a Conditional Access App Control session policy via Defender for Cloud Apps that doesn't require device evidence at all. If your developer or data-science populations need Linux access to compliant-device-gated resources, either scope the CA policy to exclude them with a compensating control (an App Control session policy, or an IP-based restriction to the corporate VPN), or move them to Edge for Linux for the apps that genuinely need it.

The fifth is **a browser too old for the current cookie behaviour**. This one is rare but worth knowing about. The PRT cookie path relies on `SameSite=None; Secure` cookies and modern TLS. Browsers older than roughly two major releases occasionally break the flow even when the rest of the stack is correct. Microsoft doesn't publish a minimum-version matrix the way Office or Teams does, but the [browser conditions](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-conditional-access-conditions) page lists the supported families. The diagnostic signature is sporadic failures on a small population, no obvious pattern, fixed by browser update.

## A matrix written from the operator's seat

Microsoft's browser-conditions documentation is authoritative on what's supported. What's missing from it is the operator's view — "given this client setup, can device-evidence policies actually pass?" The table below is that view.

| Client | Capable of device-evidence CA | What needs to be true |
|---|---|---|
| Edge on Windows (Entra-joined or hybrid) | Yes | Native, no extension required |
| Chrome on Windows (Entra-joined or hybrid) | Yes | MS Single Sign-On extension deployed |
| Firefox on Windows | Yes | MS Single Sign-On extension, recent versions |
| Edge on macOS (Entra-registered + Intune) | Yes | Apple SSO plug-in plus device certificate |
| Safari on macOS (Entra-registered + Intune) | Yes | Same prerequisites, cookies enabled |
| Chrome on macOS | Yes | Same prerequisites, plug-in is system-level |
| Edge on Linux | Limited | Some scenarios work, not a complete substitute |
| Any browser, private / Incognito | **No** | Cookies stripped, treat as no-device path |
| Any browser, unmanaged personal device | **No** | No PRT or certificate, CA fails if device-evidence required |

> [!IMPORTANT]
> "Yes" in this table means the path is technically capable of carrying device evidence under standard configuration. It does not promise that any particular tenant's policy will succeed. The device itself still needs to be registered, compliant, and not excluded by some other condition.

## A KQL toolkit for the on-call engineer

Browser-related CA failures are easy to find at scale once you know the query shape. These assume sign-in logs are shipping to a Log Analytics workspace via the standard Diagnostic Settings, with the `SigninLogs` table available.

The first query is the population-level "top failing policies by browser" view, which surfaces patterns the per-user tickets won't show:

```kql
SigninLogs
| where TimeGenerated > ago(7d)
| where ResultType != 0
| mv-expand policy = ConditionalAccessPolicies
| where tostring(policy.result) == "failure"
| extend Browser = tostring(DeviceDetail.browser)
| summarize Failures = count()
    by PolicyName = tostring(policy.displayName), Browser
| order by Failures desc
```

The second finds users who succeed in one browser and fail in another, which is a strong signal that the failure is browser-evidence-shaped rather than user or policy:

```kql
SigninLogs
| where TimeGenerated > ago(7d)
| where AppDisplayName == "Office 365"
| extend Browser = tostring(DeviceDetail.browser),
         CAResult = tostring(ConditionalAccessStatus)
| summarize Failures = countif(CAResult == "failure"),
            Successes = countif(CAResult == "success"),
            Browsers = make_set(Browser)
    by UserPrincipalName
| where Failures > 0 and Successes > 0 and array_length(Browsers) > 1
| order by Failures desc
```

The third is the one I'd run weekly during any device-compliance rollout. Sign-ins where Entra recognises the device but no device evidence reached CA — almost always a browser-extension or private-mode issue:

```kql
SigninLogs
| where TimeGenerated > ago(7d)
| where ClientAppUsed == "Browser"
| where isnotempty(UserPrincipalName)
| extend DeviceId = tostring(DeviceDetail.deviceId),
         CAResult = tostring(ConditionalAccessStatus)
| where isempty(DeviceId) and CAResult == "failure"
| summarize Failures = count()
    by tostring(DeviceDetail.browser), tostring(DeviceDetail.operatingSystem)
| order by Failures desc
```

Browsers and operating-system combinations that show up consistently in the third query are populations who are *almost* set up for compliant-device policies but missing one piece. Usually the SSO extension on Chrome.

## How to diagnose a single ticket

When you have a real user reporting a real failure, this is the order that works.

Get the Correlation ID from the user's sign-in log entry. The user can find it at `https://myaccount.microsoft.com` under recent activity, you can find it in the admin center.

Open the Conditional Access tab on that sign-in entry, identify which policy returned failure, and note which grant control was unsatisfied.

Open the Device tab on the same record. Note `Device ID`, `Operating system`, `Browser`, `Trust type`, and `Compliant`. If `Device ID` is empty, you already have the answer — the browser session didn't carry device evidence.

Ask the user to repeat the sign-in in a normal (not private) tab in Edge on Windows, or Safari on macOS. If that succeeds, the original browser is the variable.

Compare the browser version against the supported list and check whether the SSO extension is present on Chrome (`chrome://extensions`, looking for "Microsoft Single Sign-On").

Only after those steps do you start looking at the policy itself. If you find yourself reaching the policy editor without checking the Device tab first, you skipped a step — go back. The answer is almost always in the Device tab.

> [!TIP]
> If you support a help desk, train them on this sequence specifically. "Correlation ID, Conditional Access tab, Device tab, then Edge baseline" is the four-step triage that closes most browser tickets in under ten minutes.

## A rollout consideration most teams skip

If you're enabling device-evidence Conditional Access (compliant device, hybrid Entra joined, or similar) for the first time, do three things before flipping any policy from report-only to enforced.

Audit which browsers are actually in use with `summarize count() by tostring(DeviceDetail.browser), tostring(DeviceDetail.operatingSystem)` over the past 30 days. The shape of that distribution decides what training and extension-deployment work you have to do.

Deploy the SSO extension to every managed browser that isn't Edge before the policy lands. Don't make users discover it.

Publish a one-page user-facing FAQ naming the supported browsers, naming private mode as unsupported, and giving the help-desk contact for exceptions. The number of tickets the FAQ deflects is usually larger than the number the policy generates, which is the right ratio for a launch you don't want to be remembered for.

## Things I get asked

*Why does Edge sometimes work without the user signing in to Edge with their work account?* Edge consumes the Windows WAM broker at the OS level, not at the browser sign-in level. Even an Edge instance with no profile signed in can carry the PRT cookie because the cookie originates from the OS account, not the browser account. Chrome with the SSO extension behaves the same way.

*A user's device shows as compliant in Intune but the CA policy still fails. Why?* Almost always one of: the compliance signal hasn't propagated to Entra yet (allow up to eight hours after a compliance state change), the browser session isn't carrying the device ID (re-check the Device tab), or the user is in a private tab.

*Same device fails compliant-device policies on Chrome and passes on Edge. Why?* Chrome doesn't have the SSO extension deployed. Edge has the WAM broker built in. Same device, different evidence-acquisition path.

*Does a corporate VPN affect device-evidence Conditional Access?* Not directly. Conditional Access evaluates the request as it arrives regardless of network path. The VPN can affect *named location* conditions (the source IP is the VPN egress, not the user's residential IP), but it doesn't add or remove device evidence. The PRT cookie is browser-state, independent of the network.

*Can we use Conditional Access App Control (Defender for Cloud Apps) to compensate for unsupported browsers?* Yes, and it's the standard fallback. App Control session policies inspect HTTP traffic after sign-in and can restrict downloads, block specific actions, and apply DLP without requiring device proof. The trade-offs are that the proxy adds latency and is visible to the user — the URL is rewritten, which some users notice and ask about.

## Where to read further

- [Browser conditions in Conditional Access — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-conditional-access-conditions)
- [Configure grant controls in Conditional Access — Microsoft Learn](https://learn.microsoft.com/entra/identity/conditional-access/concept-conditional-access-grant)
- [Microsoft Single Sign-On extension for Chrome — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/devices/howto-windows-for-work-extension)
- [Apple SSO plug-in / Platform SSO — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/devices/macos-psso)
- [Troubleshoot device-state issues — Microsoft Learn](https://learn.microsoft.com/entra/identity/devices/troubleshoot-device-windows-joined)
- [Conditional Access App Control — Microsoft Learn](https://learn.microsoft.com/defender-cloud-apps/proxy-intro-aad)
- [SigninLogs schema reference — Microsoft Learn](https://learn.microsoft.com/azure/azure-monitor/reference/tables/signinlogs)
