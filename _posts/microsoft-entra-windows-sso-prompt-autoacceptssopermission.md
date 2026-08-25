---
title: "Microsoft Entra SSO Prompts on Windows: How to Deploy AutoAcceptSsoPermission Safely"
excerpt: "Microsoft now lets administrators suppress the EEA Windows 'Continue to sign in?' prompt on eligible managed devices. Here is the exact scope, what the registry policy changes, what it does not change, and a staged deployment and rollback plan."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-25T09:00:00.000-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

If you manage Windows devices in the European Economic Area, you have probably met the **Continue to sign in?** prompt by now. A user signs in to Windows with a work account, opens a Microsoft app, and gets asked whether Windows may use that same account for other Microsoft apps and services. The prompt is intentional, but in a managed fleet it can also produce inconsistent SSO behaviour and a surprising number of help-desk tickets.

Grab a coffee. Microsoft has now given administrators a supported control for this experience, but the scope is narrower than the headline makes it sound.

The new policy does **not** turn on tenant-wide SSO. It does not bypass Conditional Access, MFA, or application consent. It automatically accepts this specific Windows SSO permission on eligible managed devices. Microsoft announced the capability as generally available in the [August 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172) and documents the supported configuration in [Admin control for SSO prompts in Windows](https://learn.microsoft.com/en-us/entra/identity/devices/sso-admin-control).

## The status and scope in one minute

Here is the change-control version:

| Question | Confirmed answer |
|---|---|
| Release state | Generally available |
| Available since | July 2026 monthly security update |
| Supported Windows releases | Windows 11, versions 24H2 and 25H2 |
| Required update | KB5101650, or a later cumulative update containing its changes |
| Device scope | Managed enterprise Windows devices |
| Identity scope | Microsoft Entra work or school accounts |
| Personal Microsoft accounts | Not controllable by this policy |
| Unmanaged devices | Not controllable by this policy |
| Default behaviour | The prompt remains unless the administrator deploys the policy |
| Mandatory enforcement | No; this is an administrator-controlled option |

Microsoft's dedicated documentation ties the feature to [KB5101650 on Windows 11 24H2 and 25H2](https://support.microsoft.com/en-us/servicing/os/windows-11/2026/07/july-14-2026-kb5101650-os-builds-26200-8875-and-26100-8875). Windows quality updates are cumulative, so a device on a later monthly cumulative update also contains fixes released in earlier updates, as explained in Microsoft's [Windows client update release cycle](https://learn.microsoft.com/en-us/windows/deployment/update/release-cycle).

The supported registry configuration is:

| Setting | Value |
|---|---|
| Registry path | `HKLM\SOFTWARE\Policies\Microsoft\Windows\AAD` |
| Value name | `AutoAcceptSsoPermission` |
| Type | `DWORD` |
| Enabled value | `1` |

Microsoft says the setting can be deployed through Group Policy, Microsoft Intune or another MDM tool, Microsoft Configuration Manager, or any management platform that can deploy registry policy. Microsoft has not documented a separate Entra admin-centre switch or a Microsoft Graph tenant setting for this control.

## Why the prompt exists

The original behaviour was introduced for devices whose Windows region is set to a country in the EEA. Microsoft explained that the change was part of its work to comply with the Digital Markets Act: after Windows sign-in, the first compatible app asks whether the user wants to use the same credentials for that app and other Microsoft apps. The original [Windows SSO change announcement](https://techcommunity.microsoft.com/blog/windows-itpro-blog/upcoming-changes-to-windows-single-sign-on/4008151) also makes the user choice explicit: the user can continue with the Windows account, choose a different account, or remain unsigned in when the application permits it.

That history matters. This is not a random Office prompt and it is not proof that the Primary Refresh Token is broken. It is a consent experience at the Windows account-to-app SSO boundary.

Microsoft's current documentation says the notice appears the first time a user opens an app that supports the experience after signing in to Windows. If the user chooses to continue with the Windows credentials, the notice does not appear again for that decision. The new registry policy lets an eligible managed device make that choice automatically for the Entra work or school account.

## What changes in the control plane

There are three separate layers here, and keeping them separate prevents bad change tickets.

The first layer is **Windows sign-in**. The user has already authenticated to Windows with a Microsoft Entra account.

The second layer is **Windows account reuse for Microsoft apps**. This is where the EEA prompt asks whether the signed-in Windows account can participate in SSO to other Microsoft apps and services. `AutoAcceptSsoPermission` changes this layer.

The third layer is **Microsoft Entra token issuance and policy evaluation**. Microsoft Entra still evaluates the sign-in, the target resource, the user, the device evidence, Conditional Access policies, risk, and any required authentication controls. The feature announcement describes the change as automatic acceptance of the Windows SSO permission; it does not describe any change to Entra policy evaluation.

> [!NOTE]
> **Analysis:** Treat this registry policy as endpoint user-experience configuration, not as a security-policy replacement. It removes a local choice from eligible managed devices. It does not make an otherwise blocked token request succeed.

That distinction is important during incident response. If the prompt disappears but Outlook still requests credentials, or a Conditional Access policy still blocks the user, the registry setting probably worked. The remaining failure lives in another layer.

## Who is affected, and who is not

The policy is useful when all of these statements are true:

1. the device is a managed enterprise Windows device
2. the device runs Windows 11 24H2 or 25H2
3. the device has the July 2026 security update or a later cumulative update
4. the user signs in with a Microsoft Entra work or school account
5. the prompt experience is relevant to the device's region and sign-in flow

Do not build an assignment that assumes broader reach. Microsoft's [supported-scope table](https://learn.microsoft.com/en-us/entra/identity/devices/sso-admin-control) explicitly excludes personal Microsoft accounts and unmanaged devices from administrator control. The original prompt applied to both Windows 10 and Windows 11, but the new administrative control is documented only for Windows 11 24H2 and 25H2.

Windows Server is also outside the original prompt's scope, according to Microsoft's [Windows SSO FAQ](https://techcommunity.microsoft.com/blog/windows-itpro-blog/upcoming-changes-to-windows-single-sign-on/4008151). Do not send a desktop registry policy to servers merely because the key exists under `HKLM`.

Microsoft's feature page does not publish a separate Entra P1 or P2 licensing prerequisite. It does require an eligible managed enterprise device, so validate the Windows edition and device-management entitlements in your own licensing agreement before broad deployment.

## A deployment plan that does not confuse success with silence

The policy is simple. Proving it is safe across a real fleet is the actual work.

### Ring 0: prove eligibility

Start with two or three lab devices that match production:

1. one Windows 11 24H2 device
2. one Windows 11 25H2 device
3. the same management channel you use in production
4. a test Entra user with the same app set as your EEA users

Confirm the Windows release and update state before deploying the registry value. Microsoft's [Windows 11 release information](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information) records KB5101650 as the July 14, 2026 security release for builds 26100.8875 and 26200.8875. A newer supported build is expected when later cumulative updates are installed.

Use a fresh test profile or a test user who has not already answered the prompt on that device. An existing per-user choice can make an unmanaged test and a managed test look identical.

### Ring 1: identity and endpoint administrators

Deploy the registry policy to a small group of administrators and desktop engineers in the EEA. Keep the ring limited to Windows 11 24H2 and 25H2. Validate:

1. the registry value is present as `DWORD` value `1`
2. the eligible prompt is suppressed for a fresh test path
3. Microsoft 365 app sign-in succeeds
4. Conditional Access results remain as designed
5. users can still choose among accounts inside applications where the application exposes that choice

That last check matters. Automatically accepting the Windows SSO permission should not be confused with forcing every application to use one account forever.

### Ring 2: one business unit

Expand to a representative EEA department. Include remote users, shared network conditions, and more than one hardware model. Monitor endpoint-policy compliance and help-desk reports for at least several business days.

Do not use an all-user assignment to compensate for weak device targeting. The unsupported populations are known in advance; exclude them in the deployment design.

### Ring 3: eligible production devices

Expand only after you can answer four questions with evidence:

1. What percentage of the target fleet is on a supported Windows version?
2. What percentage has received the required cumulative update level?
3. What percentage reports the registry value correctly?
4. Did application sign-in or account-selection tickets increase in the pilot?

The safest production scope is an endpoint collection built from Windows version, management state, and geography—not a broad Entra user group on its own.

## Monitoring and validation

Microsoft tells administrators to validate SSO behaviour across the managed fleet, but it does not document a new Microsoft Entra audit event or sign-in-log field for this registry control. Use three evidence sources instead.

**Endpoint configuration evidence** proves that the device received the policy. Your GPO, MDM, or configuration-management reporting should confirm the exact path, name, type, and value.

**Windows servicing evidence** proves that the endpoint is eligible. Record the Windows release and current cumulative update or OS build, rather than checking only that the registry key exists.

**User-flow evidence** proves that the expected experience occurred. Test with a controlled fresh profile and record the app, Windows version, region, management state, and result.

Entra sign-in logs are still valuable, but for a different reason: they prove that downstream authentication and Conditional Access continued to work. Do not expect the absence of the Windows prompt to appear as a new Conditional Access success reason.

## Rollback and mitigation

The good news is that the control is endpoint-scoped and can be rolled back by withdrawing the registry-policy deployment from the affected ring.

Microsoft documents `DWORD = 1` as the enabled state. It does not currently document `DWORD = 0` as a supported disable value. For a clean rollback, remove the policy-created value through the same management channel that created it, then validate on a fresh test path. Keep the broader assignment paused until the pilot devices again show the expected default prompt behaviour.

> [!IMPORTANT]
> Microsoft's original FAQ describes the notice as a once-per-user, per-device experience, but the new policy documentation does not define a reset procedure for earlier user choices. Validate rollback with a test profile that is not carrying a previous answer.

If a production issue appears, first stop expansion. Then separate the symptoms:

| Symptom | First check |
|---|---|
| Prompt still appears | Windows version, cumulative update level, management state, registry type and path |
| Personal account still prompts | Expected; personal Microsoft accounts are excluded |
| Unmanaged device still prompts | Expected; unmanaged devices are excluded |
| Prompt is gone but app sign-in fails | Entra sign-in logs, Conditional Access, account state, and app authentication |
| Only some users appear changed | Prior per-user decisions, profile freshness, device targeting, and policy reporting |
| Windows 10 is unaffected | Expected; the admin control is documented only for Windows 11 24H2 and 25H2 |

## Security consequences administrators should record

This change trades an end-user consent moment for an administrator-controlled SSO default on managed enterprise devices. That may be the correct decision where the organisation already governs device sign-in and account use, but it should still be written down in the change record.

The security boundary does not disappear. Microsoft Entra continues to decide whether an app receives a token and whether Conditional Access requirements are satisfied. The practical risk is mostly operational: a badly scoped endpoint policy can create an account experience that users and support staff do not expect.

The compensating controls are therefore straightforward:

1. target only corporate-managed eligible devices
2. retain normal Conditional Access and MFA policy
3. exclude unsupported operating systems and personal-device populations
4. pilot with real application flows, not only registry compliance
5. keep rollback ownership with the endpoint team

## The admin checklist

- [ ] Confirm the affected users and devices are in the EEA prompt scope.
- [ ] Limit deployment to managed enterprise Windows devices.
- [ ] Target Windows 11 24H2 and 25H2 only.
- [ ] Confirm KB5101650 or a later cumulative update is present through build/update reporting.
- [ ] Deploy `AutoAcceptSsoPermission` as a `DWORD` with value `1` under the documented `HKLM` path.
- [ ] Test with a fresh profile that has not already answered the prompt.
- [ ] Confirm Microsoft 365 sign-in and Conditional Access still behave as designed.
- [ ] Monitor endpoint compliance and help-desk tickets through each rollout ring.
- [ ] Roll back by removing the managed registry value, not by inventing an undocumented disable value.
- [ ] Record the user-consent and support implications in the change ticket.

The registry value is the easy part. The world-class implementation is the one that treats eligibility, user state, downstream Entra policy, and rollback as four separate things—and proves each one before the assignment reaches the whole fleet.

## References

- [Admin control for SSO prompts in Windows](https://learn.microsoft.com/en-us/entra/identity/devices/sso-admin-control)
- [What's New in Microsoft Entra: August 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172)
- [Now available: Admin control for SSO prompts in Windows](https://techcommunity.microsoft.com/blog/windows-itpro-blog/now-available-admin-control-for-sso-prompts-in-windows/4534613)
- [Upcoming changes to Windows single sign-on](https://techcommunity.microsoft.com/blog/windows-itpro-blog/upcoming-changes-to-windows-single-sign-on/4008151)
- [July 14, 2026—KB5101650](https://support.microsoft.com/en-us/servicing/os/windows-11/2026/07/july-14-2026-kb5101650-os-builds-26200-8875-and-26100-8875)
- [Windows 11 release information](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information)
- [Update release cycle for Windows clients](https://learn.microsoft.com/en-us/windows/deployment/update/release-cycle)
