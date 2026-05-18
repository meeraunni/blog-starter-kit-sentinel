---
title: "Conditional Access Browser Support: A Field Guide to Edge, Chrome, Safari, and the Failure Modes Nobody Explains"
excerpt: "Why Conditional Access fails per-browser, what device evidence each browser actually sends, the private-mode trap, and the diagnostic sequence to convert 'works in Chrome but not Safari' into a real root cause."
coverImage: "/assets/blog/browser-policy/cover.svg"
date: "2026-05-14T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/browser-policy/cover.svg"
---

## The complaint that wastes a help-desk afternoon

The complaint always sounds the same: "It works in Edge but not in Chrome." Or "It worked yesterday." Or "It works for me on the same laptop." After a few hours of trial and error, somebody usually files a ticket that says "Conditional Access is flaky in Safari" and the team moves on to the next thing.

Conditional Access is not flaky. The mismatch is almost always that **different browser sessions are presenting different device evidence to Microsoft Entra**, and the policy is correctly enforcing against the evidence each session can actually carry. Once you internalise that, the per-browser failures stop being mysterious and start being deterministic.

This article walks through how the browser participates in the device-evidence pipeline, the five failure modes that account for nearly every per-browser ticket, a diagnostic sequence that takes about ten minutes per incident, and a small KQL toolkit for finding these problems at scale before users notice. The Microsoft references throughout are the authoritative source: [browser conditions in Conditional Access policies](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-conditional-access-conditions), [grant controls](https://learn.microsoft.com/entra/identity/conditional-access/concept-conditional-access-grant), and [browser SSO troubleshooting](https://learn.microsoft.com/entra/identity/devices/troubleshoot-device-windows-joined).

## What the browser actually carries to Microsoft Entra

A modern browser participating in a Microsoft Entra sign-in is doing two distinct jobs in the same HTTP transaction.

The first job is the one everyone thinks about — moving the user through the OIDC or SAML flow, presenting the sign-in page, handling the redirect back to the application. This is the "user authentication" path. Every supported browser does this reliably.

The second job, and the one that decides Conditional Access outcomes, is **device evidence acquisition**. Depending on the platform and the browser, the request can include:

- A primary refresh token (PRT) cookie carrying the device identity, on Microsoft Entra joined or hybrid-joined Windows devices.
- A device-bound client certificate, on macOS or Windows where the device is registered.
- A managed-browser channel (Edge or the Single Sign-On extension on Chrome) that proxies the request through the OS's identity broker.
- Nothing at all — a clean browser session with no extension, no PRT, no certificate. Conditional Access sees a request and a username, and that's it.

Conditional Access then evaluates each policy that targets the request. If a policy requires *compliant device* or *hybrid Entra joined device*, the runtime needs to *know* which device this is. If the browser session can't supply that evidence, the runtime cannot satisfy the grant control, and the policy returns `failure`. The user sees "Your sign-in was successful, but you don't have access to this app."

That phrasing is what makes the failure look like a Conditional Access bug. It isn't. The sign-in worked; the device-evidence step failed.

> [!NOTE]
> The Conditional Access result a sign-in log shows is the verdict the runtime reached given the evidence it received. It is not a description of the user's "true" device state. Two browsers on the same laptop can produce different verdicts because they present different evidence.

## The five failure modes

After enough incident reviews, almost every per-browser Conditional Access ticket falls into one of these five buckets.

### 1. The PRT cookie is missing because the browser is not the SSO broker

On Windows, the Web Account Manager (WAM) brokers SSO between the OS and supported browsers. Edge consumes it natively. Chrome consumes it through the [Microsoft Single Sign-On extension](https://learn.microsoft.com/azure/active-directory/devices/howto-windows-for-work-extension). Firefox consumes it through a different path. If the SSO extension is missing, disabled, or out of date, Chrome behaves like a clean browser — no PRT cookie, no device evidence.

**Diagnostic signature in `SigninLogs`:** `DeviceDetail.deviceId` is empty, `DeviceDetail.trustType` is null, `ClientAppUsed` is "Browser". The Conditional Access tab shows the device-compliance policy as `failure`.

**Fix:** Deploy the Microsoft Single Sign-On extension via GPO, Intune, or the browser's enterprise policies. The [extension is documented](https://learn.microsoft.com/azure/active-directory/devices/howto-windows-for-work-extension) and is the supported way to give non-Edge browsers PRT access on Windows.

### 2. macOS missing the device-bound client certificate

On macOS, device-based Conditional Access relies on the [Microsoft Enterprise SSO plug-in for Apple devices](https://learn.microsoft.com/azure/active-directory/devices/macos-psso) and a client certificate provisioned during device registration. If the SSO plug-in isn't deployed, or the certificate has been deleted from Keychain, Safari and Chrome both stop being able to present device evidence.

**Diagnostic signature:** sign-in shows `DeviceDetail.operatingSystem = "MacOs"`, `trustType` is `WorkPlace` (Entra registered) or null, but the *compliance check* still fails. The user-facing error is `AADSTS530002` ("device must be managed to access this resource").

**Fix:** Confirm SSO extension is enrolled via MDM (Intune Settings Catalog → "Apple SSO"), and re-trigger device registration with `dsregcmd`-equivalent macOS commands or by re-enrolling in Intune.

### 3. Private / Incognito mode silently strips evidence

This one accounts for more "but it works in my normal window" tickets than anything else. Private browsing on every major browser disables persistent cookies, which means the PRT cookie is not available even on a device that would otherwise be perfectly capable. Some private modes also disable extensions, which kills the SSO extension path on Chrome.

The user did nothing wrong. The browser is functioning as designed. But Conditional Access correctly returns `failure` because no device evidence is present.

> [!WARNING]
> Add "are you in a private / Incognito tab?" to the first three questions your help desk asks. It will close 15-25% of CA browser tickets immediately.

### 4. Linux + native Chrome / Firefox with no broker

There is no PRT broker on Linux today. Conditional Access policies that require compliant or Entra-joined devices will fail in any browser on Linux unless you're using a workaround such as Microsoft Edge for Linux (which does have a limited broker path) or a Web Application Proxy / Defender for Cloud Apps session policy that doesn't require device evidence.

**Fix paths:**
- If your developer / data-science population needs Linux access to compliant-device-gated resources, scope the Conditional Access policy to exclude them and apply a compensating control (Conditional Access App Control session policy via Defender for Cloud Apps, or an IP-based restriction to the corporate VPN).
- Or move them to Edge for Linux for the apps that need it.

### 5. Browser version too old for the current TLS / cookie / SameSite behavior

This one is rare but worth knowing about. The PRT cookie path relies on `SameSite=None; Secure` cookies and modern TLS. Browsers older than roughly two major releases sometimes break the cookie flow even when the rest of the stack is correct. Microsoft does not publish a minimum-supported-browser-version matrix the way Office or Teams does, but the [browser conditions documentation](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-conditional-access-conditions) does list the supported families.

**Diagnostic signature:** sporadic failures on a small population, no obvious pattern, fixed by browser update.

## A reference matrix, written from the operator's seat

The Microsoft browser-conditions documentation is the authoritative version. What's missing from it is the operator's view — "given this client setup, can device-evidence policies pass?" The table below is that view.

| Client | Supported for device-evidence CA? | What needs to be true |
|---|---|---|
| Edge on Windows (Entra joined or hybrid) | Yes | Native; no extension required |
| Chrome on Windows (Entra joined or hybrid) | Yes | MS Single Sign-On extension deployed |
| Firefox on Windows | Yes | MS Single Sign-On extension; works on recent versions |
| Edge on macOS (Entra registered + Intune) | Yes | Apple SSO plug-in + device certificate present |
| Safari on macOS (Entra registered + Intune) | Yes | Same prerequisites; cookies enabled |
| Chrome on macOS | Yes | Same prerequisites; SSO plug-in is system-level |
| Edge on Linux | Limited | Some scenarios work; not a complete substitute for Windows / macOS |
| Any browser, private / Incognito | **No** | Cookies stripped; treat as no-device path |
| Any browser, unmanaged personal device | **No** | No PRT or certificate; CA returns failure if device-evidence required |

> [!IMPORTANT]
> "Yes" in this table means *the path is technically capable of carrying device evidence under standard configuration*. It does not promise that any particular tenant's policy will succeed — the device itself must also be registered, compliant, and not excluded by some other condition.

## A KQL toolkit for the on-call engineer

Browser-related Conditional Access failures are easy to find at scale once you know the query shape. The following queries assume sign-in logs are routed to a Log Analytics workspace via the standard Diagnostic Settings, with the `SigninLogs` table available.

```kql
// Top failing CA policies grouped by the browser the user was on
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

```kql
// Users who succeed in one browser and fail in another
// (a strong signal that the failure is browser-evidence, not user or policy)
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

```kql
// Sign-ins from devices Entra recognises but where no device evidence reached CA
// (almost always a browser-extension or private-mode issue)
SigninLogs
| where TimeGenerated > ago(7d)
| where ClientAppUsed == "Browser"
| where isnotempty(UserPrincipalName)
| extend DeviceId = tostring(DeviceDetail.deviceId),
         TrustType = tostring(DeviceDetail.trustType),
         CAResult = tostring(ConditionalAccessStatus)
| where isempty(DeviceId) and CAResult == "failure"
| summarize Failures = count() by tostring(DeviceDetail.browser), tostring(DeviceDetail.operatingSystem)
| order by Failures desc
```

The third query is the most useful one to run as a weekly report. Browsers and operating-system combinations that appear consistently are populations who are *almost* set up for compliant-device policies but missing one piece — usually the SSO extension on Chrome.

## A diagnostic sequence for a single ticket

When you have a real user reporting a real failure, this is the order that works:

1. **Get the correlation ID** from the user's sign-in log entry. The user can find it in `https://myaccount.microsoft.com` under recent activity; you can find it in the admin centre.
2. **Open the Conditional Access tab on that sign-in entry.** Identify which policy returned `failure` and which grant control was unsatisfied.
3. **Open the Device tab on the same entry.** Note `Device ID`, `Operating system`, `Browser`, `Trust type`, and `Compliant`. If `Device ID` is empty, you already have your answer — the browser session didn't carry device evidence.
4. **Ask the user to repeat the sign-in in a normal (not private) tab in Edge** if they're on Windows, or **Safari** if they're on macOS. If that succeeds, the original browser is the variable.
5. **Compare browser version against the Microsoft-supported list** and check whether the SSO extension is present (Chrome: `chrome://extensions`, look for "Microsoft Single Sign-On").
6. **Only after steps 1-5 do you start looking at the policy itself.** Misconfigured policies are real but rare; missing browser evidence is common.

> [!TIP]
> If you find yourself reaching the policy editor in step 6, you've usually skipped step 3. Re-read the Device tab — the answer is almost always there.

## A rollout consideration most teams skip

If you're enabling device-evidence Conditional Access (compliant device, hybrid Entra joined, or a similar grant) for the first time, do these three things before flipping any policy from report-only to enforced:

1. **Audit which browsers are actually in use** with `summarize count() by tostring(DeviceDetail.browser), tostring(DeviceDetail.operatingSystem)` over the last 30 days. The shape of this distribution decides what training and extension-deployment work you need to do.
2. **Deploy the SSO extension to every managed browser that isn't Edge** before the policy lands. Don't make users discover it.
3. **Publish a one-page user-facing FAQ** that names the supported browsers, names private mode as unsupported, and gives the help-desk contact for exceptions. The number of tickets the FAQ deflects is usually larger than the number of tickets the policy generates.

## Common questions

### Why does Edge sometimes work without the user signing in to Edge with their work account?

Edge consumes the Windows WAM broker at the OS level, not at the browser sign-in level. Even an Edge instance that has no profile signed in can carry the PRT cookie because the cookie originates from the OS account, not the browser account. Chrome with the SSO extension behaves the same way.

### A user's device shows as compliant in Intune but the CA policy still fails. What's wrong?

Almost always one of: the device-compliance signal hasn't propagated to Entra yet (allow up to 8 hours after a compliance state change), the browser session isn't carrying the device ID (re-check the Device tab), or the user is in a private tab.

### Why does the same device fail compliant-device policies on Chrome and pass on Edge?

Chrome doesn't have the SSO extension deployed. Edge has the WAM broker built in. Same device, different evidence-acquisition path.

### Does using a corporate VPN affect device-evidence Conditional Access?

Not directly — Conditional Access evaluates the request as it arrives, regardless of network path. The VPN can affect *named location* conditions (the request's source IP is the VPN egress, not the user's residential IP), but it doesn't add or remove device evidence. The PRT cookie is browser-state, independent of the network.

### Can we use Conditional Access App Control (Defender for Cloud Apps) to compensate for unsupported browsers?

Yes — and it's the standard fallback for browsers that can't carry device evidence. Defender for Cloud Apps session policies inspect HTTP traffic after the sign-in and can restrict downloads, blocking actions, and apply DLP without requiring device proof. The trade-off is that the proxy adds latency and is visible to the user (URL is rewritten).

## What to take away

Per-browser Conditional Access failures look random until you stop treating "browser" as the unit of analysis. The real unit is "what device evidence does this exact browser session carry?" Once you switch to that frame, the failure modes become a small, finite set: missing PRT cookie, missing macOS certificate, private mode, Linux with no broker, or an out-of-date browser. The KQL queries above find the population-level patterns; the six-step diagnostic finds the individual cause. Skip the policy editor until you've checked the Device tab — that's where the answer lives.

## References

- [Browser conditions in Conditional Access policies — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-conditional-access-conditions)
- [Configure grant controls in Conditional Access — Microsoft Learn](https://learn.microsoft.com/entra/identity/conditional-access/concept-conditional-access-grant)
- [Microsoft Single Sign-On extension for Chrome — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/devices/howto-windows-for-work-extension)
- [Apple SSO plug-in / Platform SSO — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/devices/macos-psso)
- [Troubleshoot device-state issues — Microsoft Learn](https://learn.microsoft.com/entra/identity/devices/troubleshoot-device-windows-joined)
- [Conditional Access App Control — Microsoft Learn](https://learn.microsoft.com/defender-cloud-apps/proxy-intro-aad)
- [SigninLogs reference — Microsoft Learn](https://learn.microsoft.com/azure/azure-monitor/reference/tables/signinlogs)
