---
title: "Why Outlook Keeps Asking for Your Password (And How To Make It Stop)"
excerpt: "The password is right. OWA works first try. Outlook prompts again anyway. The loop that defeats password managers and makes people use the web app all day. It's almost always one of five things, none of which a user can diagnose, all of which take a minute to fix once you know which one it is."
coverImage: "/assets/blog/outlook-keeps-asking-for-password-microsoft-365-mfa/diagram.svg"
date: "2026-05-13T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/outlook-keeps-asking-for-password-microsoft-365-mfa/diagram.svg"
---

Outlook prompts for a password. The user types it. The prompt comes back. They check the password by signing in to OWA in a browser — works first try, no fuss. Back to Outlook, the loop continues. Closing and reopening sometimes buys an hour. Sometimes it does nothing. Eventually the user gives up and lives in OWA for the rest of the week and tells their colleagues that Outlook is "broken on their machine."

This is one of the most frustrating M365 client issues precisely because everything looks correct at the surface. The credentials are right. The account is enabled. MFA is set up. The desktop client just refuses to stay authenticated. The cause is almost always one of five things, all of which are at the client layer rather than the identity layer, and none of which a user can diagnose without admin tooling. The good news is that the most common one closes in under a minute.

This piece walks the five-cause diagnostic in the order I run it, with the credential-manager and registry fixes that resolve most cases, and the modern-auth-versus-legacy-auth state that explains why this happens to some users but not others. Microsoft's authoritative references are [Outlook prompts for credentials](https://learn.microsoft.com/outlook/troubleshoot/authentication/outlook-prompt-for-credentials), [modern authentication in EXO](https://learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/enable-or-disable-modern-authentication-in-exchange-online), and [Web Account Manager](https://learn.microsoft.com/azure/active-directory/develop/scenario-desktop-acquire-token-wam).

## The five causes, in order of how often I actually see them

| # | Cause | Symptom you'd notice | Fix scope |
|---|---|---|---|
| 1 | Stale credential in Windows Credential Manager | Loop, OWA fine, prompt looks slightly off | Per-user, 60 seconds |
| 2 | Modern auth disabled on tenant or client | The prompt is the small native Windows one, not the branded Microsoft sign-in | Tenant or registry |
| 3 | WAM token cache corruption | Intermittent loops, "Need Password" status in taskbar | Per-user, reset WAM |
| 4 | Conditional Access requires compliant device and the device isn't | Loop with no MFA prompt offered at all | Identity team |
| 5 | MFA enabled but no method registered | First prompt fine, second prompt says "approve in your authenticator" and never resolves | User registration |

The first one resolves the majority of tickets I see. Walk the rest only if the credential cache reset doesn't fix it.

## Cause one: stale Windows Credential Manager entries

Windows Credential Manager caches the credentials Outlook uses against Exchange Online. When MFA gets enabled, the password rotates, or modern auth turns on at the tenant — any of these can leave the cached entry inconsistent with what the runtime now actually requires. The result is a loop where Outlook keeps replaying the cached value, EXO keeps rejecting it, Outlook prompts again, the user enters the password, and Outlook *still uses the cache* underneath because the cache is what its inner machinery is reaching for. The user typing the password into the dialog turns out to be theatre.

The fix on the user's machine takes about a minute:

1. Close Outlook completely. Check Task Manager for `OUTLOOK.EXE` because it sometimes lingers.
2. Control Panel → Credential Manager → Windows Credentials.
3. Delete every entry under Generic Credentials whose name begins with `MicrosoftOffice16`, `MSO_`, `MSOpenStorage_`, `OneDrive_`, `OneDriveBusinessAuthClient_`, or anything referencing the user's UPN.
4. Open Outlook. Enter credentials once when prompted (and complete MFA if it asks).

What you've just done is force Outlook to re-acquire a token through the current auth path (modern auth via WAM in any tenant on a current build), discarding whatever stale legacy credential was being replayed at every refresh.

> [!TIP]
> Bundle the cleanup into a one-liner the help desk can send to the user, or paste themselves in a remote session:
>
> ```powershell
> cmdkey /list | ForEach-Object {
>     if ($_ -match "Target: (MicrosoftOffice16|MSO_|MSOpenStorage|OneDrive).*") {
>         cmdkey /delete:($matches[0] -replace "^.*Target: ", "")
>     }
> }
> ```

## Cause two: modern auth disabled at the tenant or client

If the prompt the user sees is the *small native Windows authentication dialog* (just username and password fields, no Microsoft branding) rather than the larger Microsoft-branded sign-in window with the company logo, the client is falling back to legacy authentication. In a tenant where modern auth is required (which is now the EXO default), legacy attempts can succeed at first and then fail when the token tries to refresh through a flow the tenant doesn't accept. The user experiences this as "I sign in and an hour later it asks again."

Check the tenant:

```powershell
Connect-ExchangeOnline
Get-OrganizationConfig | Select-Object Name, OAuth2ClientProfileEnabled
```

If `OAuth2ClientProfileEnabled` is `False`, modern auth is disabled tenant-wide. Turn it on:

```powershell
Set-OrganizationConfig -OAuth2ClientProfileEnabled $true
```

Outlook clients will need a restart after the change. Running with modern auth disabled in 2026 isn't a supported configuration anyway, so this is one of those rare cases where the right answer is also the urgent one.

Check the client via registry:

```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Common\Identity\EnableADAL = 1
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Common\Identity\Version    = 1
```

If `EnableADAL` is 0, the client has explicitly opted out of modern auth. Set to 1, close and reopen Outlook.

## Cause three: WAM token cache corruption

Modern Outlook uses Web Account Manager to broker tokens. The WAM cache lives at `%LocalAppData%\Microsoft\TokenBroker\Cache` and occasionally enters a state where token refresh silently fails, which the user sees as intermittent password prompts.

The reset sequence:

1. Close Outlook.
2. Delete `%LocalAppData%\Microsoft\TokenBroker\Cache\*`.
3. Run `dsregcmd /refreshprt` from an elevated PowerShell to refresh the device's Primary Refresh Token.
4. Open Outlook.

If the device is Entra joined or hybrid joined and `dsregcmd` reports issues at step three, address those first. PRT problems propagate everywhere on the device, not just into Outlook.

## Cause four: Conditional Access is the actual blocker

If a Conditional Access policy requires compliant or Entra-joined devices for EXO access and the user's device doesn't satisfy that requirement, Outlook prompts repeatedly because it can never acquire a token in the first place. The user is being asked to do something impossible. They have correct credentials. The policy refuses to issue regardless.

Open the user's recent sign-ins in the Entra admin center, filter by app `Office 365 Exchange Online`, and look for failures with a Conditional Access verdict. If a CA policy is the blocker, you either make the device compliant (the right answer) or scope the policy to exclude this user (the wrong answer, but sometimes necessary as a temporary unblock with a compensating control).

## Cause five: MFA enabled with no usable method registered

If MFA enforcement was added to the user via Authentication Methods policy or Conditional Access and the user hasn't actually registered an authentication method, the first sign-in succeeds via password but the MFA step never resolves. Outlook surfaces this as a password loop because it never gets the full MFA token, and the prompt has no way to tell the user what's actually missing.

Check what's registered:

```powershell
Connect-MgGraph -Scopes "UserAuthenticationMethod.Read.All"
Get-MgUserAuthenticationMethod -UserId "alice@contoso.com" |
    Select-Object @{N="Type";E={ $_.AdditionalProperties.'@odata.type' }}
```

If the only method returned is `passwordAuthenticationMethod`, the user has no MFA method registered. Issue a Temporary Access Pass, have them register a method via `https://aka.ms/mysecurityinfo`, then retry Outlook.

## The nuclear option for when nothing else works

If you've walked all five causes and Outlook is still prompting, the reliable last resort is to nuke the profile entirely. Close Outlook, remove the profile (Control Panel → Mail → Show Profiles → Remove), delete `%LocalAppData%\Microsoft\Outlook\*` (the OST file lives here, so the user re-downloads mail after), clear the Office credential keys in Credential Manager, then reopen Outlook. First-run authentication takes the user through a clean sign-in including MFA.

This costs five to thirty minutes of re-download depending on mailbox size, which is the only reason it isn't the first thing you do. It clears every cached state in one shot.

## Things people ask

*Why does this affect some users on the same tenant but not others?* Credential and WAM state are per-user, per-device. The same tenant configuration produces a loop for a user whose cache is stale and not for the user whose cache is fresh. The symptom looks "random" but it's machine-specific.

*Will a reboot fix it?* Sometimes. A reboot clears in-memory token state and re-validates at login. Worth one shot. Not worth chasing if the first reboot doesn't resolve, because the Credential Manager fix is more deterministic.

*Why does OWA work when Outlook desktop doesn't?* OWA establishes its own session through the browser. Outlook desktop uses WAM and Credential Manager. The two paths are independent. OWA working confirms the *account* is fine; Outlook failing points at the *client*.

*Does this happen on Mac too?* Yes, through different machinery. macOS Outlook uses Keychain for credentials and the Apple SSO plug-in for SSO. The equivalent fix is Keychain Access → search for Microsoft → delete entries → restart Outlook. macOS rarely loops as persistently as Windows because the broker integration is different.

*How do I prevent the loop from coming back?* Three things help most. Deploy modern auth tenant-wide and confirm `EnableADAL = 1` via GPO or Intune. Standardise on Entra-joined or hybrid-joined devices so the PRT-based SSO flow is consistent. Audit Conditional Access for policies that target EXO without a compliant-device fallback, which are the ones that produce the worst-feeling loops.

*Does MFA-everywhere make this better or worse?* Generally better. Modern auth plus WAM plus a registered MFA method is the most reliable Outlook auth path in EXO. The loop scenarios are mostly in the *transition* — a user with cached legacy credentials suddenly required to use modern auth. Once the cache is reset, ongoing operation is smooth.

## Where to read further

- [Outlook prompts for credentials — Microsoft Learn](https://learn.microsoft.com/outlook/troubleshoot/authentication/outlook-prompt-for-credentials)
- [Modern authentication in EXO — Microsoft Learn](https://learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/enable-or-disable-modern-authentication-in-exchange-online)
- [Web Account Manager — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/develop/scenario-desktop-acquire-token-wam)
- [Authentication methods policy — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage)
- [dsregcmd command reference — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/devices/troubleshoot-device-dsregcmd)
- [Credential Manager — Microsoft Learn](https://learn.microsoft.com/windows/win32/secauthn/credential-manager)
