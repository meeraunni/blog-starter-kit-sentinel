---
title: "Microsoft Entra ID: Troubleshoot Primary Refresh Token (PRT) Failures on Windows"
excerpt: "Technical troubleshooting for Microsoft Entra Primary Refresh Token failures on Windows, including dsregcmd diagnostics, AAD analytic and operational logs, common status codes, and network/proxy causes."
coverImage: "/assets/blog/prt-failures/cover.svg"
date: "2026-03-28T09:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/prt-failures/cover.svg"
---

## Failure definition

This article covers Windows scenarios where:

- users lose seamless SSO
- Microsoft 365 starts prompting unexpectedly
- lock/unlock and sign-in behavior becomes inconsistent
- `dsregcmd /status` shows `AzureAdPrt : NO`

The authoritative Microsoft source is [Troubleshoot primary refresh token issues on Windows devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token).

## What the PRT is doing in the backend

Microsoft explains in the [PRT troubleshooting article](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token) that on Microsoft Entra joined or hybrid joined Windows devices, the **Primary Refresh Token** is a core component of Windows authentication. It is acquired at sign-in, cached on the device, and refreshed in the background roughly every four hours.

That backend behavior explains two important failure patterns:

- the device can appear healthy immediately after sign-in because a cached PRT still exists
- SSO can degrade later when background refresh fails and the PRT expires

A PRT issue is therefore usually a **token refresh path** problem, not just a generic "sign-in prompt" problem.

## Where to start: dsregcmd, not guesswork

Microsoft’s first troubleshooting step is [Get the status of the primary refresh token](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token).

Run:

```bash
dsregcmd /status
```

Then inspect the **SSO State** section, especially:

- `AzureAdPrt`
- `AzureAdPrtAuthority`
- `Previous Prt Attempt`
- `Attempt Status`
- `Credential Type`
- `Server Error Code`
- `Server Error Description`

As documented [here](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token), on Windows 10 21H1 and later, `dsregcmd` can expose the PRT attempt status directly in the output.

## Root cause 1: credentials or server-side auth failed during PRT acquisition

Microsoft documents status codes and server error mappings in the [PRT troubleshooting article](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token). One example Microsoft gives is:

- `Attempt Status : 0xc000006d`
- `Server Error Code : invalid_grant`
- `AADSTS50126`

### Validation steps

1. Run `dsregcmd /status`.
2. Capture the `Attempt Status`, `Server Error Code`, and `Server Error Description`.
3. Map the result to the status-code guidance in the Microsoft article.

### Root-cause explanation

The device reached the token endpoint, but the authentication exchange for PRT issuance failed. That means the failure is in the PRT acquisition flow itself, not necessarily in device registration.

## Root cause 2: the device cannot authenticate itself to Microsoft Entra

Microsoft explicitly documents `AADSTS50155: Device authentication failed` in the [PRT troubleshooting article](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token). Microsoft states there that the device may have been deleted or disabled.

### Validation steps

1. Check whether the device object still exists and is enabled in Entra.
2. Compare the local device state from `dsregcmd /status` with the Entra device object.
3. If Microsoft identifies the device object as deleted/disabled, re-register the device according to the documented join type.

### Root-cause explanation

PRT issuance depends on both user and device trust. If Microsoft Entra cannot authenticate the device object, token issuance fails even when the user portion of sign-in looks valid.

## Root cause 3: network, proxy, or endpoint reachability problems

Microsoft documents common WinHTTP errors in the [PRT troubleshooting article](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token), including:

- `ERROR_WINHTTP_TIMEOUT`
- `ERROR_WINHTTP_NAME_NOT_RESOLVED`
- `ERROR_WINHTTP_CANNOT_CONNECT`
- `ERROR_WINHTTP_CONNECTION_ERROR`

Microsoft also states there that in environments using an outbound proxy, the **computer account** must be able to discover and silently authenticate to the proxy where required.

### Validation steps

1. Use `dsregcmd /status` and Event Viewer to find the failing URL and error context.
2. Review **AAD Analytic** and **AAD Operational** logs, as documented [here](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token).
3. If needed, capture traces by using the Microsoft `netsh trace` method documented in the same article.

### Root-cause explanation

PRT refresh is a scheduled network transaction. If the device cannot reach the right Microsoft endpoint, or cannot traverse the proxy path correctly, the cached token ages out and SSO degrades.

## Root cause 4: the admin is not reading the right event logs

Microsoft is explicit in the [PRT troubleshooting article](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token): you need both **AAD Analytic** and **AAD Operational** logs.

As mentioned [here](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token), Event IDs **1006** and **1007** bracket the PRT acquisition flow in the analytic log, and Event ID **1081** can include server error details.

### Validation steps

1. Open **Event Viewer**.
2. Enable **Show Analytic and Debug Logs** if needed.
3. Browse to **Applications and Services Logs > Microsoft > Windows > AAD**.
4. Review the **Analytic** and **Operational** logs around the repro window.

### Root-cause explanation

Many PRT incidents are diagnosable without guessing because the CloudAP and AAD logging stack exposes the exact failing stage of token acquisition.

## Root cause 5: the issue is being misread as an app problem

Because PRT affects Windows SSO broadly, users often report the first visible symptom at the app layer:

- Outlook prompts again
- Teams reauthenticates
- browser-based SSO becomes inconsistent

Microsoft’s [PRT troubleshooting article](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token) explains that those symptoms can appear after background refresh failure causes the cached PRT to expire.

### Validation steps

1. Confirm whether `AzureAdPrt` is `NO`.
2. Check whether prompts appeared after extended lock/unlock or elapsed time rather than at the original device sign-in.
3. If yes, treat the issue as a device SSO/token problem before debugging the application itself.

### Root-cause explanation

The application is often the messenger, not the root cause. The real failure happened earlier in the Windows token refresh path.

## Recommended troubleshooting order

1. Run `dsregcmd /status` and inspect the **SSO State**, as documented [here](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token).
2. Capture `Attempt Status`, `Server Error Code`, and `Server Error Description`.
3. Review **AAD Analytic** and **AAD Operational** logs around the failing window.
4. If the failure points to device auth, validate the Entra device object.
5. If the failure points to connectivity, follow Microsoft’s network and `netsh trace` guidance from the same article.
6. Only after those checks should you move up-stack into application-specific debugging.

## Final takeaway

PRT failures are not generic "Windows sign-in issues." They are failures in one of three documented backend paths:

- user or server-side auth during PRT acquisition
- device authentication to Microsoft Entra
- network/proxy connectivity to required token endpoints

Use Microsoft’s `dsregcmd` and AAD log guidance first. It is the shortest path to the actual root cause.

## Microsoft References

- [Troubleshoot primary refresh token issues on Windows devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token)
- [Troubleshoot devices by using the dsregcmd command](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd)
- [Troubleshooting Windows devices in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-windows-joined)
