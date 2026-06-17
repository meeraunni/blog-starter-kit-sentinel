---
title: "When the Passkey Option Won't Appear in Microsoft Entra Security Info: A Walkthrough That Closes Most Tickets in Two Minutes"
excerpt: "The passkey option isn't in Security info. Or it's there but the registration fails silently. Or it works for one colleague and not the next on the same device. Seven different failures wearing the same coat. Here's how to identify which one, with a Graph-based diagnostic script and the policy design that prevents most of them from happening at all."
coverImage: "/assets/blog/passkey-not-showing/cover.svg"
date: "2026-05-11T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/passkey-not-showing/cover.svg"
---

The user opens Security info, taps Add sign-in method, and the passkey option isn't there. Or it's there but greyed out. Or they tap through it and the registration silently fails. Or it works for them but not for the colleague at the next desk on what looks like an identical laptop. Same symptom on the surface, several genuinely different problems underneath.

This is one of the highest-volume troubleshooting topics in any Microsoft Entra rollout. The reason it's frustrating to support isn't that any single cause is exotic. It's that the same user-facing complaint maps to at least seven distinct root causes spread across four different control surfaces — and treating them as one problem is the path to escalations that ping between the help desk and the identity team and Microsoft Support without anyone making progress.

What follows is the layered walk I use, a PowerShell script the help desk can run against an affected account in about thirty seconds, and the small set of policy-design choices that make most of these tickets stop happening in the first place. The Microsoft references — [authentication methods policy](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage), [passkey registration](https://learn.microsoft.com/entra/identity/authentication/how-to-register-passkey), [Temporary Access Pass](https://learn.microsoft.com/entra/identity/authentication/howto-authentication-temporary-access-pass), [FIDO2 compatibility matrix](https://learn.microsoft.com/entra/identity/authentication/concept-fido2-compatibility), and the [passkey FIDO2 policy](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2) — describe each piece in isolation. Getting them to combine into "user opens Security info and successfully registers a passkey" is the operational story this article is about.

## The seven layers, in the order I check them

Every incident I've worked on this is exactly one of these:

| Layer | What's wrong | Where to look |
|---|---|---|
| Authentication Methods policy | FIDO2 is disabled or the user isn't in the targeting | Entra admin → Authentication methods → FIDO2 |
| Passkey profile | A profile narrows allowed AAGUIDs and the user's authenticator isn't in the allowlist | FIDO2 → Passkey profiles |
| MFA bootstrap missing | User has no usable MFA, can't satisfy the recent-MFA prerequisite | `Get-MgUserAuthenticationMethod` |
| Recent MFA expired | User has MFA but their session is older than ten minutes | Authentication tab on the most recent SigninLog |
| Platform doesn't support the chosen path | iOS 16, Android 13, old Authenticator, browser without CTAP | Compatibility matrix versus the device |
| Hardware doesn't satisfy strength | Android without hardware Keystore, old FIDO2 key without resident-key support | Device hardware versus AAGUID lookup |
| Local platform provider conflict | iOS/Android offering iCloud Keychain or Google Passwords instead of Microsoft Authenticator | The platform's passkey-chooser dialog the user saw |

These map cleanly to four different owners. The first three layers are policy design, the identity team owns the fix. The fourth is session state, usually self-resolves with a re-sign-in. The last three are endpoint, the user or endpoint engineering owns the fix. Knowing which layer broke is the same as knowing which queue the ticket belongs in.

The diagnostic order matters and I want to be specific about why. The most common ticket reflex is to open the FIDO2 policy first, because that's the surface admins know best. Don't. Half the time, the answer is at layer three or four and the policy is fine. Start with the user's most recent sign-in record and their registered methods, not the policy.

> [!IMPORTANT]
> If a colleague at the next desk *can* register a passkey on the same model of device, the layers in play are user-specific (1, 2, 3, 4), not platform (5, 6). That observation alone narrows the search by half.

## A script for the help desk

This walks layers one through four for a given user and prints a verdict. The help desk runs it, reads the output, and either fixes the issue on the spot or escalates with the right context already gathered.

```powershell
<#
.SYNOPSIS
  Diagnoses why a Microsoft Entra user can't see or register a passkey.
.PARAMETER UserPrincipalName
  The UPN of the affected user.
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

# Layer 1: Authentication Methods policy
$authPolicy = Get-MgPolicyAuthenticationMethodPolicy
$fido2 = $authPolicy.AuthenticationMethodConfigurations |
    Where-Object Id -eq "Fido2"

if ($fido2.State -ne "enabled") {
    $verdict.Add("LAYER 1: FAIL — FIDO2 method is '$($fido2.State)' tenant-wide.")
} else {
    $included = $fido2.AdditionalProperties.includeTargets
    $excluded = $fido2.AdditionalProperties.excludeTargets
    $allUsers = $included | Where-Object { $_.id -eq "all_users" }
    if (-not $allUsers) {
        $userGroups = (Get-MgUserMemberOf -UserId $user.Id).Id
        $inScope = $included | Where-Object { $_.id -in $userGroups }
        if (-not $inScope) {
            $verdict.Add("LAYER 1: FAIL — user not in any included target group.")
        }
    }
    $exclScope = $excluded | Where-Object { $_.id -in (Get-MgUserMemberOf -UserId $user.Id).Id }
    if ($exclScope) {
        $verdict.Add("LAYER 1: FAIL — user is in an excluded group.")
    }
}

# Layer 3: MFA bootstrap
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
    $verdict.Add("LAYER 3: FAIL — user has no MFA-capable method. Issue a TAP.")
}

# Layer 4: Recent MFA freshness
$recentSignIn = Get-MgAuditLogSignIn -Filter "userPrincipalName eq '$($user.UserPrincipalName)'" `
    -Top 1 -Sort "createdDateTime desc"
if ($recentSignIn) {
    $mfaAge = (Get-Date) - $recentSignIn.CreatedDateTime
    if ($mfaAge.TotalMinutes -gt 10) {
        $verdict.Add("LAYER 4: WARN — most recent sign-in was $([math]::Round($mfaAge.TotalMinutes,1)) min ago.")
    }
}

Write-Host "`n=== Passkey diagnostic for $($user.UserPrincipalName) ===" -ForegroundColor Cyan
Write-Host "MFA methods registered: $($methods.Count)`n"

if ($verdict.Count -eq 0) {
    Write-Host "Layers 1-4 are clean." -ForegroundColor Green
    Write-Host "Remaining causes are likely layer 2 (AAGUID profile), layer 5 (platform),"
    Write-Host "layer 6 (hardware), or layer 7 (platform passkey provider chooser)."
} else {
    foreach ($v in $verdict) {
        if ($v -like '*FAIL*') { Write-Host $v -ForegroundColor Red }
        else                   { Write-Host $v -ForegroundColor Yellow }
    }
}
```

Save it as `Test-EntraPasskey.ps1` and have the help desk run it on every passkey ticket. It closes around half of them on its own.

## What each layer actually wants from you

Layer one is Authentication Methods policy. The most common failure I see here is FIDO2 enabled for "All users" *minus* an excluded group, and the user landed in the excluded group via an Intune dynamic-group rule the identity team didn't know about. Walk the user's group memberships, find the offender, decide whether the exclusion was deliberate, and either remove the user from the group or remove the group from the exclusion list.

Layer two is the passkey profile, which is where AAGUID narrowing happens. If you've enabled a profile that allowlists specific AAGUIDs and the user is attempting to register a device whose AAGUID isn't in the list, the registration ceremony completes locally and Entra rejects the credential at storage. The user sees "We weren't able to add this method," which is the least helpful possible error. Look up the AAGUID of the authenticator the user is attempting — vendor docs, the public [AAGUID list](https://github.com/passkeydeveloper/passkey-authenticator-aaguids) — and confirm whether it's in your tenant's allowlist. Add it, or steer the user to an allowed authenticator.

Layer three is MFA bootstrap. If `Get-MgUserAuthenticationMethod` shows no MFA-capable method, the user can't satisfy the recent-MFA prerequisite that passkey registration depends on. The fix is to issue a Temporary Access Pass:

```powershell
Connect-MgGraph -Scopes "UserAuthenticationMethod.ReadWrite.All"
$tap = New-MgUserAuthenticationTemporaryAccessPassMethod `
    -UserId "alice@contoso.com" `
    -LifetimeInMinutes 60 `
    -IsUsableOnce:$true
Write-Host "TAP value: $($tap.TemporaryAccessPass)"
```

Deliver the TAP value through whatever out-of-band channel you trust. The user signs in with it once, immediately registers the passkey in Security info, and the TAP expires.

Layer four is session staleness. The user has MFA configured but the most recent sign-in is older than ten minutes. Have them sign out of Security info, sign back in (which satisfies MFA in the process), and immediately retry registration. The clock is on the session, not the device.

Layers five, six, and seven are endpoint-side, and the [FIDO2 compatibility matrix](https://learn.microsoft.com/entra/identity/authentication/concept-fido2-compatibility) is the canonical reference. The repeat offenders: iOS below 17 with Authenticator passkey (the OS predates the API the app uses, upgrade or use a hardware key), Android without a hardware-backed Keystore (common on older or budget devices, the only real fix is different hardware), Chrome without USB or NFC permissions on macOS or Linux (system-level dialog the user has to grant), and the iOS user accidentally selecting iCloud Keychain instead of Microsoft Authenticator in the platform's passkey-provider chooser (the resulting passkey is registered with Apple, not Entra). Walk the user through the registration ceremony again and pay attention to which provider they pick in the platform dialog.

## The policy design that prevents most of these tickets

Almost all of these failures are preventable at design time, and the pattern that works is small.

Enable FIDO2 for the broadest group you intend to support, with one named exclusion group. Don't sprinkle individual user exclusions, don't compound exclusions across multiple groups. One exclusion group, named something audit-friendly like `auth-fido2-excluded`, and when someone is excluded the group membership is the documentation.

Decide attestation up front and document the call. Attestation is the single trap that breaks more passkey rollouts than any other choice. The trade-off looks like this:

| Stance | Pros | Cons |
|---|---|---|
| Required + AAGUID allowlist | Tightest control over which authenticators are accepted | Locks out Windows Hello passkey (currently not attested); needs AAGUID maintenance for every new model |
| Required, no AAGUID restriction | Some control without the maintenance burden | Still locks out non-attesting authenticators |
| Not required | Maximum compatibility | Accepts software-backed and unknown-AAGUID credentials, weaker assurance |

For most enterprises starting out, the right initial position is "not required, with a passkey profile allowlist of known-good AAGUIDs." Move to required attestation only after a pilot has confirmed every population can satisfy it.

Pre-register at onboarding, not at policy-enforcement time. The order that works: add the user, issue a TAP through the onboarding flow, user signs in with the TAP and registers a passkey plus a backup method (a recovery hardware key is the ideal backup), TAP expires, *then* the user is moved into whatever group has the Conditional Access policy that requires phishing-resistant MFA. That order guarantees the user has a registered method before policy starts enforcing one.

And monitor registration outcomes with a weekly query. Failures that don't generate help-desk tickets — because the user gave up — show up here and nowhere else:

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

## Questions that keep coming up

*The option appears in iOS Authenticator but not on the desktop. Why?* Two different registration paths. The Authenticator app on iOS uses the iOS platform passkey provider directly. The desktop browser uses CTAP-over-caBLE (Bluetooth) to talk to the phone. If Bluetooth is off or the desktop browser doesn't support CTAP, the cross-device path fails. Confirm the user is testing on Security info from a *desktop* browser, not just in the Authenticator app on their phone.

*Security Defaults is on, why doesn't FIDO2 work?* Security Defaults and Authentication Methods policy are mutually exclusive in how they manage methods. With Security Defaults enabled, FIDO2 can't be enabled or disabled independently — the bundle decides. Disable Security Defaults and migrate to Conditional Access plus Authentication Methods policy.

*The user registered a passkey but can't sign in with it.* Sign-in is a separate path from registration. Walk the token-lifetime flow first, then check whether an Authentication Strength policy is requiring something stricter than the registered passkey can satisfy (attestation, specific AAGUID, hardware-backed credential).

*Can a single user have multiple passkeys?* Yes, and they should. At least two — a primary (Windows Hello, Authenticator, or platform passkey) and a backup (hardware FIDO2 key stored somewhere secure). The recovery story for a single-passkey user who loses their device is a TAP-based re-bootstrap, which works but creates a help-desk dependency.

*How do I remove a passkey from a user account?* `Get-MgUserAuthenticationFido2Method` then `Remove-MgUserAuthenticationFido2Method` with the method ID. This is also the path for revoking a lost hardware key, combined with a session revocation if the loss is suspected to be a compromise.

## Where to read further

- [Authentication methods policy — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage)
- [Enable passkeys in Microsoft Entra ID — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2)
- [Register a passkey (FIDO2) — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/how-to-register-passkey)
- [Temporary Access Pass — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [FIDO2 compatibility matrix — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-fido2-compatibility)
- [Authentication strengths — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-strengths)
- [`Get-MgUserAuthenticationMethod` — Graph PowerShell SDK](https://learn.microsoft.com/powershell/module/microsoft.graph.identity.signins/get-mguserauthenticationmethod)
- [Public AAGUID lookup list](https://github.com/passkeydeveloper/passkey-authenticator-aaguids)
