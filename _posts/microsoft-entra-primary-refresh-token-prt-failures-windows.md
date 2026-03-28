---
title: "Microsoft Entra ID: Troubleshoot Primary Refresh Token (PRT) Failures on Windows"
excerpt: "Learn how to troubleshoot Microsoft Entra Primary Refresh Token failures on Windows by using dsregcmd, AAD logs, device validation, and network diagnostics."
coverImage: "/assets/blog/prt-failures/cover.svg"
date: "2026-03-28T09:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/prt-failures/cover.svg"
---

## Overview

This article covers Windows scenarios where seamless SSO degrades and `dsregcmd /status` shows `AzureAdPrt : NO`.

The authoritative Microsoft guide is [Troubleshoot primary refresh token issues on Windows devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token).

Typical user symptoms include:

- repeated Microsoft 365 sign-in prompts
- loss of seamless SSO after time passes
- inconsistent browser and Office sign-in behavior

![Primary Refresh Token failure indicators](/assets/blog/prt-failures/cover.svg)

## What a PRT does

Microsoft explains in [Understanding Primary Refresh Token (PRT)](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token) that the PRT is a device-bound token used by Windows and Microsoft identity brokers to support downstream token acquisition.

The operational consequence is important: a PRT problem is rarely just an app problem. It is a device SSO problem that can surface across multiple apps at once.

Microsoft also documents in the PRT troubleshooting article that Windows refreshes the PRT in the background. That explains why users can sign in successfully at first and then start seeing prompts later. The original session may have been healthy while background PRT refresh was already failing.

## How to start troubleshooting

Microsoft’s first diagnostic step is `dsregcmd /status`.

Run:

```bash
dsregcmd /status
```

Then review the `SSO State` section, especially:

- `AzureAdPrt`
- `Previous Prt Attempt`
- `Attempt Status`
- `Credential Type`
- `Server Error Code`
- `Server Error Description`

Microsoft documents these fields in [Troubleshoot primary refresh token issues on Windows devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token).

## Common causes

### User or server-side authentication failure during PRT acquisition

Microsoft maps common server errors in the PRT troubleshooting article. One documented example is `AADSTS50126` paired with `invalid_grant`.

This means the device reached the Microsoft token service, but the PRT issuance attempt itself failed.

### Device authentication failure

Microsoft documents `AADSTS50155` as a device authentication failure and notes that the device object might be deleted or disabled.

This is a different failure class from user credential issues. In this case, the user may authenticate correctly while the device trust layer fails.

### Network or proxy failure

Microsoft lists common WinHTTP failures such as:

- `ERROR_WINHTTP_TIMEOUT`
- `ERROR_WINHTTP_NAME_NOT_RESOLVED`
- `ERROR_WINHTTP_CANNOT_CONNECT`
- `ERROR_WINHTTP_CONNECTION_ERROR`

This is especially important in environments with outbound proxy infrastructure, because the machine context has to be able to complete the background token flow.

### Missing or misread diagnostics

Microsoft explicitly points administrators to the **AAD Analytic** and **AAD Operational** logs. Without those logs, teams often guess based on user-visible symptoms instead of reading the actual PRT acquisition path.

### Problem is misdiagnosed as an app issue

Microsoft’s guidance makes it clear that PRT failure is often the root cause behind later Outlook, Teams, or browser prompts. If `AzureAdPrt` is already failing, the app prompt is often the messenger, not the actual fault domain.

## How to validate the problem

Use this order:

1. run `dsregcmd /status`
2. inspect the `SSO State` section
3. capture the attempt status and server error values
4. verify the device object still exists and is enabled
5. review the AAD Analytic and Operational logs
6. if needed, follow Microsoft’s network trace guidance

Microsoft documents the event log path and relevant events in [Troubleshoot primary refresh token issues on Windows devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token).

## What usually fixes it

The remediation depends on the stage that failed:

- if the failure is `invalid_grant` or a user-authentication issue, fix the credential or auth-side problem first
- if device authentication failed, validate the Entra device object and repair or re-register the device
- if the failure is network or proxy related, fix service reachability from the machine context
- if the sign-in prompt is only a symptom, solve the PRT issue before debugging the application

The main point is to treat PRT as a device-token pipeline rather than as an app symptom.

## Key implementation points

- `dsregcmd /status` is the primary PRT diagnostic entry point.
- PRT failure often appears after the original sign-in because refresh is a background process.
- Device trust and user trust are both required for successful PRT issuance.
- App prompts are often downstream effects of a Windows token problem.

## References

- [Troubleshoot primary refresh token issues on Windows devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-primary-refresh-token)
- [Troubleshoot devices by using the dsregcmd command](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd)
- [Troubleshooting Windows devices in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-windows-joined)
- [Understanding Primary Refresh Token (PRT)](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token)
- [Primary Refresh Token (PRT) in Azure and Microsoft 365](https://blog.matrixpost.net/azure-active-directory-primary-refresh-token-prt-single-sign-on-to-azure-and-office-365/)
