---
title: "Outlook Keeps Asking for Password in Microsoft 365: The Modern Auth, MFA, and Credential Cache Diagnostic"
excerpt: "Outlook keeps prompting for credentials in a loop, the user enters the right password, the prompt comes back. Walk the modern auth check, credential manager state, MFA enrolment, broken WAM token cache, and the registry keys that resolve the persistent loop."
coverImage: "/assets/blog/outlook-keeps-asking-for-password-microsoft-365-mfa/diagram.svg"
date: "2026-05-13T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/outlook-keeps-asking-for-password-microsoft-365-mfa/diagram.svg"
---

## The loop that defeats password managers

Outlook prompts for a password. The user types it. The prompt comes back. They type it again. Same prompt. They check that the password is right by signing in to OWA — works first try. Back to Outlook, same loop. Some users find that closing Outlook and reopening helps for an hour, then the loop returns. Some find that nothing helps and they end up using OWA all day.

This is one of the most frustrating Microsoft 365 client issues because everything *looks* correct. The credentials are right. The account is enabled. MFA is set up. And yet the desktop client refuses to stay authenticated. The cause is almost always one of five things, all of which are at the client layer rather than at the identity layer — and none of which a user can diagnose without admin tooling.

This article walks the five-cause diagnostic, the credential manager / registry fixes that resolve most cases, and the underlying modern-auth-vs-legacy-auth state that explains why this happens to some users but not others. References: [Outlook prompting for credentials](https://learn.microsoft.com/outlook/troubleshoot/authentication/outlook-prompt-for-credentials), [Modern authentication in EXO](https://learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/enable-or-disable-modern-authentication-in-exchange-online), [Web Account Manager (WAM)](https://learn.microsoft.com/azure/active-directory/develop/scenario-desktop-acquire-token-wam).

## The five causes, in observed-frequency order

| # | Cause | Symptom signature | Fix scope |
|---|---|---|---|
| 1 | Cached/stale credential in Windows Credential Manager | Prompt loop, OWA works, registry-level Outlook errors mention MSO/STSCertificate | Per-user: delete cache entries |
| 2 | Modern auth disabled on the tenant or client | Prompt asks for password (not the modern Microsoft dialog with company logo) | Tenant-wide: enable modern auth |
| 3 | WAM token cache corruption | Intermittent loops, "Need Password" status in Outlook taskbar | Per-user: reset WAM via dsregcmd |
| 4 | Conditional Access requires compliant device + device is non-compliant | Loop with no MFA prompt offered | Identity team: device compliance |
| 5 | MFA enabled but no auth method registered (or method expired) | First prompt is fine, second prompt asks "approve in your authenticator" but never resolves | User: register or refresh MFA method |

The first one is the cause of most of these tickets, and the fix takes 60 seconds. Walk the rest only if the credential cache reset doesn't resolve it.

## Cause 1: Stale Windows Credential Manager entries (start here)

Windows Credential Manager caches the credentials Outlook uses to authenticate to EXO. When MFA is enabled, when the password is rotated, when modern auth is enabled on the tenant — the cached entry can become inconsistent with what's actually required. The result is a loop where Outlook keeps trying the cached credential, EXO keeps rejecting it, Outlook prompts again, the user enters the password, Outlook *still uses the cache*, EXO rejects again.

**The fix on the user's machine:**

1. Close Outlook completely (check Task Manager for `OUTLOOK.EXE` — Outlook sometimes lingers).
2. Open Control Panel → Credential Manager → Windows Credentials.
3. Delete *every* entry under "Generic Credentials" whose name begins with:
   - `MicrosoftOffice16_Data:`
   - `MicrosoftOffice16:`
   - `MSO_`
   - `MSOpenStorage_`
   - `OneDrive_*`
   - `OneDriveBusinessAuthClient_*`
   - Anything referencing the user's UPN
4. Open Outlook. It will prompt for credentials. Enter them once (and complete MFA if prompted).
5. Outlook should authenticate and stay authenticated.

The reason this works: deleting the cache forces Outlook to re-acquire a token via the current authentication flow (which by 2026 is modern auth with WAM), discarding whatever stale legacy credential was being replayed.

> [!TIP]
> Bundle the Credential Manager cleanup into a help-desk one-liner the user can run themselves:
>
> ```powershell
> cmdkey /list | ForEach-Object {
>     if ($_ -match "Target: (MicrosoftOffice16|MSO_|MSOpenStorage|OneDrive).*") {
>         cmdkey /delete:($matches[0] -replace "^.*Target: ", "")
>     }
> }
> ```

## Cause 2: Modern auth disabled on the tenant or client

If the prompt the user sees is the small native Windows authentication dialog (just username/password fields, no Microsoft branding), rather than the larger Microsoft-branded sign-in window with the company logo and tenant branding, the client is falling back to legacy authentication. In a tenant where modern auth is required (which is now the EXO default), legacy auth attempts can succeed initially then fail when token refresh tries to use a flow the tenant doesn't accept.

**Tenant check:**

```powershell
Connect-ExchangeOnline
Get-OrganizationConfig | Select-Object Name, OAuth2ClientProfileEnabled
```

If `OAuth2ClientProfileEnabled : False`, modern auth is disabled tenant-wide. Enable it:

```powershell
Set-OrganizationConfig -OAuth2ClientProfileEnabled $true
```

This requires Outlook clients to restart but should be done — running with modern auth disabled in 2026 is not a supported configuration.

**Client check (registry):**

```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Common\Identity\EnableADAL = 1
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Common\Identity\Version = 1
```

If `EnableADAL = 0`, the client has explicitly disabled modern auth. Set to 1, close Outlook, reopen.

## Cause 3: WAM token cache corruption

Modern Outlook uses Windows Web Account Manager (WAM) to broker tokens. The WAM token cache lives at `%LocalAppData%\Microsoft\TokenBroker\Cache` and can get into a state where token refresh silently fails, producing intermittent password prompts.

**Reset sequence:**

1. Close Outlook.
2. Delete `%LocalAppData%\Microsoft\TokenBroker\Cache\*`.
3. Run `dsregcmd /refreshprt` from an elevated PowerShell — this refreshes the device's Primary Refresh Token.
4. Open Outlook.

If the device is Microsoft Entra joined or hybrid joined and dsregcmd reports issues, those need to be addressed first — see the [PRT failures on Windows post](/posts/microsoft-entra-primary-refresh-token-prt-failures-windows) for the dsregcmd diagnostic flow.

## Cause 4: Conditional Access blocking the sign-in

If a Conditional Access policy requires a compliant or Entra-joined device for EXO access, and the user's device doesn't satisfy that requirement, Outlook prompts repeatedly because it can never get a token. The user is being asked to do the impossible — they have correct credentials but the policy refuses to issue.

**Diagnostic:** Open the user's recent sign-ins in the Microsoft Entra admin centre. Filter by app `Office 365 Exchange Online`. Look for failures with a Conditional Access verdict.

If a CA policy is the blocker, the resolution is either to make the device compliant (the right answer), or to scope the CA policy to exclude this user (the wrong answer, but sometimes necessary as a temporary unblock).

The [CA browser-support post](/posts/microsoft-entra-conditional-access-browser-support-edge-chrome-safari) covers the diagnostic for similar issues in browsers; the desktop client equivalent uses WAM rather than browser cookies but the same compliance-check logic applies.

## Cause 5: MFA enabled but no usable method registered

If MFA enforcement was added to the user via Authentication Methods policy or Conditional Access, and the user hasn't actually registered an authentication method, the first sign-in succeeds via password but the MFA step never resolves. Outlook surfaces this as an endless password loop because it never gets the full MFA token.

**Check:**

```powershell
Connect-MgGraph -Scopes "UserAuthenticationMethod.Read.All"
Get-MgUserAuthenticationMethod -UserId "alice@contoso.com" |
    Select-Object @{N="Type";E={ $_.AdditionalProperties.'@odata.type' }}
```

If the only method returned is `passwordAuthenticationMethod`, the user has no MFA method registered. Issue a Temporary Access Pass, have them register a method via `https://aka.ms/mysecurityinfo`, then retry Outlook.

## A nuclear option that works when nothing else does

If the five-cause diagnostic is exhausted and Outlook still prompts in a loop, the reliable last resort:

1. Close Outlook.
2. Remove the Outlook profile entirely: Control Panel → Mail → Show Profiles → select the profile → Remove.
3. Delete `%LocalAppData%\Microsoft\Outlook\*` (the user's OST file lives here — they'll re-download mail).
4. Reset the Office credential keys in Credential Manager (cause 1 above).
5. Open Outlook. It will go through the full first-run authentication including MFA.

This costs the user 5-30 minutes of re-download (depending on mailbox size) but reliably clears every cached state at the cost of nothing.

## Common questions

### Why does this affect only some users on the same tenant?

The cache and WAM state are per-user, per-device. The same tenant configuration can produce loops for the user whose cache is stale and not for the user whose cache is fresh. That's why the symptom looks "random" — it's machine-specific.

### Will rebooting fix it?

Sometimes. A reboot clears in-memory token state and forces dsregcmd-style re-validation at login. It's worth trying once but not worth chasing if it doesn't work the first time — the Credential Manager fix is more deterministic.

### Why does OWA work but Outlook desktop doesn't?

OWA establishes its own session via the browser. Outlook desktop uses the WAM and Credential Manager paths described above. The two are independent. OWA working confirms the *account* is fine; Outlook failing points to the *client*.

### Does this happen on Mac too?

Yes, with a different underlying mechanism. macOS Outlook uses Keychain for credentials and the Apple SSO plug-in for SSO. The equivalent fix is: Keychain Access → search for "Microsoft" → delete entries → restart Outlook. macOS rarely loops as persistently as Windows because the broker integration is different.

### How do I prevent the prompt loop from recurring?

Three things help most:
1. Deploy modern auth tenant-wide and confirm `EnableADAL = 1` via GPO or Intune.
2. Standardise on Microsoft Entra joined or hybrid joined devices so the PRT-based SSO flow is consistent.
3. Audit Conditional Access policies for ones that target EXO without a compliant-device fallback — those create the worst loops.

### Will MFA-everywhere make this better or worse?

Generally better. Modern auth + WAM + a registered MFA method is the most reliable Outlook authentication path in EXO. The loop scenarios most often occur in the *transition* — a user with cached legacy credentials suddenly required to use modern auth. Once the cache is reset, ongoing operation is smooth.

## What to take away

Outlook password loops are almost always client-side cache problems, not identity-side configuration problems. The Credential Manager reset resolves the majority within a minute. The remaining cases divide cleanly between modern auth misconfiguration, WAM corruption, Conditional Access blocking, or MFA registration gaps. Walking the five causes in order resolves nearly every ticket without the user ever having to rebuild their Outlook profile.

## References

- [Outlook prompts for credentials — Microsoft Learn](https://learn.microsoft.com/outlook/troubleshoot/authentication/outlook-prompt-for-credentials)
- [Modern authentication in EXO — Microsoft Learn](https://learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/enable-or-disable-modern-authentication-in-exchange-online)
- [Web Account Manager (WAM) — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/develop/scenario-desktop-acquire-token-wam)
- [Authentication methods policy — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage)
- [dsregcmd command reference — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/devices/troubleshoot-device-dsregcmd)
- [Credential Manager — Microsoft Learn](https://learn.microsoft.com/windows/win32/secauthn/credential-manager)
