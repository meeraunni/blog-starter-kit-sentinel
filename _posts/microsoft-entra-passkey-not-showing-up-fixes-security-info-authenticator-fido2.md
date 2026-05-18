---
title: "When the Passkey Option Won't Appear in Microsoft Entra Security Info: Diagnostic Script and Prevention Design"
excerpt: "The Microsoft Entra passkey option is missing or fails silently in Security info. Walk the seven-layer diagnostic, run the included Graph-based check script, and apply the policy-design pattern that prevents the failure mode at scale."
coverImage: "/assets/blog/passkey-not-showing/cover.svg"
date: "2026-05-11T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/passkey-not-showing/cover.svg"
---

## The symptom that's actually seven different failures

The user opens Security info, taps **Add sign-in method**, and the passkey option isn't there. Or it's there but greyed out. Or they tap through it and registration silently fails. Or it works for them but not for the colleague sitting next to them on what looks like the same device.

This is one of the highest-volume troubleshooting topics in any Microsoft Entra rollout, and it's actively misleading because the user-facing symptom — "I can't add a passkey" — has at least seven distinct root causes spread across four different control surfaces. Treating it as a single problem produces escalations that ping between the help desk, the identity team, and Microsoft Support with nobody making progress.

This article gives you the layered diagnostic that maps the symptom to the actual cause, a PowerShell script you can hand to the help desk to run against the user's account, and the policy-design pattern that prevents most of the failure modes from happening in the first place. The Microsoft references throughout are the authoritative source: [Authentication methods policy](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage), [Register a passkey (FIDO2)](https://learn.microsoft.com/entra/identity/authentication/how-to-register-passkey), [passkey policy](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2), [Temporary Access Pass](https://learn.microsoft.com/entra/identity/authentication/howto-authentication-temporary-access-pass), and [FIDO2 compatibility matrix](https://learn.microsoft.com/entra/identity/authentication/concept-fido2-compatibility).

## The seven layers, in order

Every passkey-not-appearing incident is exactly one of these:

| # | Layer | What's wrong | Where to look |
|---|---|---|---|
| 1 | **Authentication Methods policy** | FIDO2/passkey is disabled or the user isn't in the targeting group | Entra admin centre → Protection → Authentication methods → FIDO2 |
| 2 | **Passkey profile (preview)** | A profile narrows allowed AAGUIDs and the device's authenticator isn't permitted | Entra admin centre → Authentication methods → FIDO2 → Passkey profiles |
| 3 | **MFA bootstrap missing** | User has no usable MFA, can't satisfy the recent-MFA prerequisite | `Get-MgUserAuthenticationMethod` for the user |
| 4 | **Recent MFA session expired** | User has MFA configured but their session is older than 10 minutes | The Authentication tab on the most recent SigninLog |
| 5 | **Platform / browser doesn't support the chosen path** | iOS 16, Android 13, old Authenticator app, browser missing CTAP support | Compatibility matrix vs the device |
| 6 | **Hardware doesn't satisfy security requirements** | Android device without hardware-backed Keystore; old FIDO2 key without resident-key support | Device hardware spec + AAGUID lookup |
| 7 | **Local platform passkey provider conflict** | iOS / Android offering the wrong passkey provider (iCloud Keychain vs Authenticator, Google Passwords vs Authenticator) | User chose the wrong entry in the platform's passkey chooser |

These map cleanly to four owners. Layers 1, 2, and 3 are **policy design** — the identity team owns the fix. Layer 4 is **session state** — usually self-resolves with a re-sign-in. Layers 5, 6, and 7 are **endpoint** — the user / endpoint engineering owns the fix. Knowing which layer broke is the same as knowing which queue the ticket belongs in.

> [!IMPORTANT]
> Don't open the FIDO2 policy first. Open the user's recent sign-in log and `Get-MgUserAuthenticationMethod` output first. Half the time, the answer is at layer 3 or 4 and the policy is fine.

## A diagnostic script the help desk can run

This script walks layers 1, 2, 3, and 4 for a given user and prints a verdict. The help desk runs it, reads the output, and either resolves the ticket on the spot or escalates with the right context already gathered.

```powershell
<#
.SYNOPSIS
  Diagnoses why a Microsoft Entra user can't see / register a passkey.

.PARAMETER UserPrincipalName
  The UPN of the user reporting the problem.

.REQUIRED
  Microsoft.Graph and Microsoft.Graph.Identity.SignIns modules.
  Calling identity needs: User.Read.All, UserAuthenticationMethod.Read.All,
                          Policy.Read.All, AuditLog.Read.All
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $UserPrincipalName
)

Connect-MgGraph -Scopes @(
    "User.Read.All",
    "UserAuthenticationMethod.Read.All",
    "Policy.Read.All",
    "AuditLog.Read.All"
) -NoWelcome

$user = Get-MgUser -UserId $UserPrincipalName -ErrorAction Stop
$verdict = [System.Collections.Generic.List[string]]::new()

# --- LAYER 1: Authentication Methods policy ---
$authPolicy = Get-MgPolicyAuthenticationMethodPolicy
$fido2 = $authPolicy.AuthenticationMethodConfigurations |
    Where-Object Id -eq "Fido2"

if ($fido2.State -ne "enabled") {
    $verdict.Add("LAYER 1: FAIL — FIDO2 method is '$($fido2.State)' tenant-wide. Enable it in Authentication methods policy.")
} else {
    $included = $fido2.AdditionalProperties.includeTargets
    $excluded = $fido2.AdditionalProperties.excludeTargets
    $allUsers = $included | Where-Object { $_.id -eq "all_users" }
    if (-not $allUsers) {
        # Check group memberships
        $userGroups = (Get-MgUserMemberOf -UserId $user.Id).Id
        $inScope = $included | Where-Object { $_.id -in $userGroups }
        if (-not $inScope) {
            $verdict.Add("LAYER 1: FAIL — FIDO2 enabled but user not in any included target group.")
        }
    }
    $exclScope = $excluded | Where-Object { $_.id -in (Get-MgUserMemberOf -UserId $user.Id).Id }
    if ($exclScope) {
        $verdict.Add("LAYER 1: FAIL — user is in an excluded group for FIDO2.")
    }
}

# --- LAYER 3: MFA bootstrap ---
$methods = Get-MgUserAuthenticationMethod -UserId $user.Id
$mfaCapable = $methods | Where-Object {
    $_.AdditionalProperties.'@odata.type' -in @(
        "#microsoft.graph.microsoftAuthenticatorAuthenticationMethod",
        "#microsoft.graph.phoneAuthenticationMethod",
        "#microsoft.graph.fido2AuthenticationMethod",
        "#microsoft.graph.softwareOathAuthenticationMethod",
        "#microsoft.graph.windowsHelloForBusinessAuthenticationMethod"
    )
}
if (-not $mfaCapable) {
    $verdict.Add("LAYER 3: FAIL — user has no MFA-capable method. Issue a Temporary Access Pass to bootstrap.")
}

# --- LAYER 4: Recent MFA freshness ---
$recentSignIn = Get-MgAuditLogSignIn -Filter "userPrincipalName eq '$($user.UserPrincipalName)'" `
    -Top 1 -Sort "createdDateTime desc"
if ($recentSignIn) {
    $mfaAge = (Get-Date) - $recentSignIn.CreatedDateTime
    if ($mfaAge.TotalMinutes -gt 10) {
        $verdict.Add("LAYER 4: WARN — most recent sign-in was $([math]::Round($mfaAge.TotalMinutes,1)) min ago; user may need to re-auth before registration.")
    }
} else {
    $verdict.Add("LAYER 4: WARN — no recent sign-in found in audit log; user may not have signed in recently enough.")
}

# --- Output ---
Write-Host "`n=== Passkey diagnostic for $($user.UserPrincipalName) ===" -ForegroundColor Cyan
Write-Host "Display name: $($user.DisplayName)"
Write-Host "User ID:      $($user.Id)"
Write-Host "MFA methods:  $($methods.Count) registered`n"

if ($verdict.Count -eq 0) {
    Write-Host "All layer-1-to-4 checks passed." -ForegroundColor Green
    Write-Host "If the user still can't see passkey in Security info, the cause is likely:"
    Write-Host "  - LAYER 2: a passkey profile narrowing AAGUIDs the user's authenticator doesn't match"
    Write-Host "  - LAYER 5: platform / OS / browser doesn't support the chosen path (check compatibility matrix)"
    Write-Host "  - LAYER 6: hardware-backed Keystore absent (Android) or FIDO2 firmware too old (security key)"
    Write-Host "  - LAYER 7: user chose the wrong passkey provider on iOS/Android"
} else {
    foreach ($v in $verdict) {
        if ($v -like '*FAIL*') { Write-Host $v -ForegroundColor Red }
        else                   { Write-Host $v -ForegroundColor Yellow }
    }
}
```

Save it as `Test-EntraPasskey.ps1`. Run it as `.\Test-EntraPasskey.ps1 -UserPrincipalName alice@contoso.com`. The output tells you which layer to look at next.

> [!TIP]
> If your tenant uses delegated admin or Graph App-only auth, replace `Connect-MgGraph -Scopes` with the App-only auth call. The query logic doesn't change.

## Layer-by-layer fixes

### Layer 1: Authentication Methods policy

The most common failure: FIDO2 is enabled for `All users` *minus* an `Excluded` group, and the user landed in the excluded group by way of an Intune dynamic-group rule the identity team didn't know about. Walk the user's group memberships, find the offending group, decide whether the exclusion was intentional, and either remove the user from the group or remove the group from the policy's exclusions.

### Layer 2: Passkey profile (AAGUID narrowing)

If you've enabled a [passkey profile](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2) that allowlists specific AAGUIDs, and the user is trying to register a device whose AAGUID isn't on the list, the registration ceremony will complete locally and Entra will reject the credential storage with a generic error. The user sees "We weren't able to add this method," which is the least helpful possible error.

Look up the AAGUID of the authenticator the user is attempting (vendor docs, [public AAGUID lists](https://github.com/passkeydeveloper/passkey-authenticator-aaguids)) and confirm whether it's in your tenant's allowlist. Either add it or steer the user to an allowed authenticator.

### Layer 3: MFA bootstrap

If `Get-MgUserAuthenticationMethod` shows no MFA-capable method, the user can't satisfy the recent-MFA prerequisite that passkey registration requires. Issue a Temporary Access Pass:

```powershell
Connect-MgGraph -Scopes "UserAuthenticationMethod.ReadWrite.All"
$tap = New-MgUserAuthenticationTemporaryAccessPassMethod `
    -UserId "alice@contoso.com" `
    -LifetimeInMinutes 60 `
    -IsUsableOnce:$true
Write-Host "TAP value: $($tap.TemporaryAccessPass)"
```

Deliver the TAP value via your trusted out-of-band channel. The user uses it once to sign in, immediately registers the passkey in Security info, and the TAP expires.

### Layer 4: Session staleness

The user has MFA configured but the most recent sign-in is more than 10 minutes old. Have them sign out of Security info, sign back in (satisfying MFA in the process), and immediately retry registration. The clock is on the session, not the device.

### Layers 5, 6, 7: endpoint and user

For the endpoint-side layers, the [FIDO2 compatibility matrix](https://learn.microsoft.com/entra/identity/authentication/concept-fido2-compatibility) is the canonical reference. The common offenders:

- **iOS < 17 with Authenticator passkey** — the OS predates the API the app uses. Upgrade iOS or use a hardware key instead.
- **Android without hardware Keystore** — many older / budget devices. The fix is a different device or a hardware FIDO2 key.
- **Chrome without USB / NFC permissions** on macOS or Linux — system-level dialog that the user has to grant.
- **iOS user accidentally choosing iCloud Keychain** instead of Microsoft Authenticator in the platform's passkey-provider chooser — the resulting passkey is registered with Apple, not Entra. Walk the user through the registration again and pay attention to the platform's provider chooser dialog.

## The prevention design

Most "passkey not appearing" tickets are preventable at policy-design time. The pattern that works:

### 1. Enable FIDO2 for the broadest group you intend, with a single named exclusion group

Don't sprinkle individual user exclusions and don't compound exclusions across multiple groups. One exclusion group, named something like `auth-fido2-excluded`, that you can audit in a single query. When a user is excluded, the group membership is the documentation.

### 2. Decide attestation up-front, document the call

Attestation enforcement is the trap that breaks more passkey rollouts than any other single choice. The decision is:

| Attestation | Pros | Cons |
|---|---|---|
| Required + AAGUID allowlist | Tightest control over which authenticators sign | Locks out Windows Hello passkey (currently not attested); requires AAGUID maintenance for every new authenticator model |
| Required, no AAGUID restriction | Some control without the maintenance overhead | Still locks out non-attesting authenticators |
| Not required | Maximum compatibility | Tenant accepts software-backed and unknown-AAGUID credentials; weaker assurance |

For most enterprises the right initial position is **not required, with a passkey profile allowlist of known good AAGUIDs**. Move to required attestation only after a pilot has confirmed every population can satisfy it.

### 3. Pre-register at onboarding, not at policy-enforcement time

The reliable rollout sequence is:

- Add the user to the tenant.
- Issue a Temporary Access Pass with the user's onboarding email.
- User signs in via TAP, registers a passkey, and any backup method (a recovery hardware key, for example).
- TAP expires.
- *Then* the user is moved into the group whose Conditional Access policy requires phishing-resistant MFA.

That sequence guarantees the user has a registered method before policy starts enforcing one. The alternative — enforce first, hope users register — produces a lockout queue every Monday morning.

### 4. Monitor registration outcomes with a weekly report

A weekly KQL query against `AuditLogs` for "Register security info" failures, broken out by user and reason, surfaces the layer-2 / layer-5 / layer-6 failures that don't generate help-desk tickets because users just give up.

```kql
AuditLogs
| where TimeGenerated > ago(7d)
| where OperationName == "Register security info"
| where Result == "failure"
| extend Method = tostring(TargetResources[0].modifiedProperties[0].newValue)
| where Method has_any ("Passkey", "FIDO2", "Authenticator")
| project TimeGenerated, User = tostring(TargetResources[0].userPrincipalName),
          Method, FailureReason = tostring(ResultReason)
| summarize Attempts = count() by User, FailureReason
| order by Attempts desc
```

Anything appearing more than twice for the same user is a candidate for proactive outreach.

## Common questions

### Why does the option appear in the iOS Authenticator app but not on the desktop?

The two surfaces use different registration paths. The Authenticator app on iOS uses the iOS platform passkey provider directly; the desktop browser uses CTAP-over-caBLE (Bluetooth) to talk to the phone. If Bluetooth is off, or the desktop browser doesn't support CTAP, the cross-device path fails. Confirm with the user that they see the option *on Security info from a desktop browser*, not just in the Authenticator app.

### My tenant has Security Defaults turned on. Why doesn't FIDO2 work?

Security Defaults and Authentication Methods policy are mutually exclusive in how they manage methods. With Security Defaults enabled, you cannot turn FIDO2 on or off independently — the bundle decides. Disable Security Defaults and migrate to Conditional Access + Authentication Methods policy as the long-term control surface.

### A user registered a passkey successfully but can't sign in with it. What's wrong?

Sign-in is a separate path from registration. Walk the [token lifetimes and CAE](https://sentinelidentity.ca/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) flow first; then check whether an Authentication Strength policy is requiring something stricter than the registered passkey can satisfy (attestation, specific AAGUID, hardware-backed credential).

### Can a single user have multiple passkeys registered?

Yes — and they should. Best practice is at least two: a primary (Windows Hello, Authenticator, or platform passkey) and a backup (hardware FIDO2 key kept somewhere secure). The recovery story for a single-passkey user who loses their device is a TAP-based re-bootstrap, which works but creates a help-desk dependency.

### How do I remove a passkey from a user account?

```powershell
$methods = Get-MgUserAuthenticationFido2Method -UserId "alice@contoso.com"
Remove-MgUserAuthenticationFido2Method -UserId "alice@contoso.com" -Fido2AuthenticationMethodId $methods[0].Id
```

This is also the path for revoking a lost hardware key. Combine with a session revocation if the loss is suspected to be a compromise.

## What to take away

The "passkey won't appear" symptom is seven different problems wearing the same coat. The layered diagnostic and the bundled PowerShell script give the help desk a way to identify which layer broke in under two minutes. The prevention design — one exclusion group, AAGUID allowlist before attestation requirement, TAP-based onboarding, weekly failure monitoring — moves the problem from reactive ticket-closing to a small, finite, design-time decision set. Most of the tickets you'd otherwise see don't get raised because the user is set up before they ever notice they need to be.

## References

- [Authentication methods policy — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage)
- [Enable passkeys (FIDO2) in Microsoft Entra ID — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2)
- [Register a passkey (FIDO2) — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/how-to-register-passkey)
- [Temporary Access Pass — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [FIDO2 compatibility matrix — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-fido2-compatibility)
- [Authentication strengths — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-strengths)
- [`Get-MgUserAuthenticationMethod` — Microsoft Graph PowerShell SDK](https://learn.microsoft.com/powershell/module/microsoft.graph.identity.signins/get-mguserauthenticationmethod)
- [Public AAGUID lookup list](https://github.com/passkeydeveloper/passkey-authenticator-aaguids)
