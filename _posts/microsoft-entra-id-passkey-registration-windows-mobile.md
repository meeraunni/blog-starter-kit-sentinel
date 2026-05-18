---
title: "Microsoft Entra Passkey Registration on Windows, iOS, and Android: A Practitioner's Playbook"
excerpt: "How passkey registration in Microsoft Entra ID actually works at the credential-issuance layer, what differs across Windows Hello, iOS Authenticator, Android Keystore, and FIDO2 keys, the platform-specific failure modes, and a Graph-driven inventory of what your users have registered."
coverImage: "/assets/blog/passkey-registration/cover.svg"
date: "2026-05-12T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/passkey-registration/cover.svg"
---

## Why most passkey rollouts get stuck at registration

The slide deck version of a passkey rollout makes registration look like four taps. The production reality is that registration is the **credential-issuance** step of a phishing-resistant authentication system, and a tenant that hasn't planned the issuance trust chain ends up with a population of users who can sign in but can't register, or who register a credential type the tenant policy then refuses to honour.

Every passkey registration in Microsoft Entra ID is the resolution of four independent questions: (1) is the user *allowed* to register a passkey at all, (2) can the user *prove* they should be allowed to right now, (3) can the local *platform* actually host the credential type the user is trying to create, and (4) does the tenant's **passkey profile** accept the specific authenticator that's offering itself. A failure at any of the four produces the same vague user-facing symptom — "I can't add a passkey" — which is why support tickets on this topic tend to ping-pong between the help desk, the identity team, and Microsoft Support without anyone making progress.

This article gives you the four-question decision tree, the platform-specific failure modes for Windows Hello, iOS Authenticator, Android Authenticator, and FIDO2 hardware keys, the Microsoft Graph queries to inventory what your users have actually registered, and the rollout pattern that prevents the help-desk surge.

## The four-question decision tree

```
[1] Is the user enabled for FIDO2 / passkey in Authentication Methods policy?
       NO  -> Method is hidden in Security info. Update policy targeting.
       YES -> Continue.

[2] Has the user satisfied MFA within the last 10 minutes?
       NO  -> "Sign-in interrupted" prompts re-auth, or registration silently fails.
              Fix: ensure user has at least one usable MFA method OR
              issue a Temporary Access Pass.
       YES -> Continue.

[3] Can the local platform host the credential type the user is selecting?
       NO  -> Windows Hello: "Your device does not support this option."
              iOS / Android: ceremony exits silently or shows generic error.
              Fix: switch platform path (security key, phone, paired device).
       YES -> Continue.

[4] Does the tenant's passkey profile accept this authenticator's AAGUID
    and attestation?
       NO  -> Ceremony completes locally, registration fails at Entra
              with a generic "We weren't able to add this method" message.
              Fix: update passkey profile AAGUID allowlist, or relax
              attestation requirement, or steer the user to an allowed
              authenticator.
       YES -> Registration succeeds.
```

Print this. Tape it to the help desk's wall. Most passkey tickets get closed faster than the user can finish describing the symptom once you start at question 1 and walk forward.

The Microsoft reference for the underlying flow is [Register a passkey (FIDO2)](https://learn.microsoft.com/entra/identity/authentication/how-to-register-passkey); the policy controls live in [Authentication methods policy](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage) and the [passkey (FIDO2) policy](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2).

## What "registration" actually means at the credential layer

Three things happen in sequence on a successful registration:

1. **The authenticator** (Windows Hello chip, iPhone Secure Enclave, Android TEE/StrongBox, or a hardware FIDO2 key) generates a public/private key pair.
2. **The private key never leaves the authenticator.** Entra never sees it; you never see it; the OS doesn't expose it. This is the property that makes passkeys phishing-resistant — a phisher can't trick the user into typing it because there's nothing to type.
3. **The public key, the AAGUID of the authenticator, and the attestation statement** are sent to Entra. Entra stores the public key against the user, records the AAGUID, and validates the attestation (if attestation is required). From that moment, the user can present an assertion signed by the matching private key to satisfy sign-ins.

The thing the tenant gets to decide, and the thing administrators most often forget they decided, is **which AAGUIDs are acceptable** and **whether attestation is required**. AAGUID is a 128-bit identifier baked into every FIDO2 authenticator that identifies its make and model — so YubiKey 5C has one AAGUID, Microsoft Authenticator's passkey implementation has another, Windows Hello has its own. The [passkey (FIDO2) policy](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2) lets you allowlist or blocklist AAGUIDs; the [Authentication strengths](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-strengths) feature can require *attested* phishing-resistant credentials. If your tenant requires attestation and the user attempts to register an authenticator whose vendor doesn't sign attestation statements (or whose attestation root isn't in Entra's trust list), the local ceremony succeeds but Entra rejects the credential at storage.

> [!IMPORTANT]
> Attestation enforcement is the single most common cause of "the user clicked through everything and it still failed." Before turning attestation on, audit which AAGUIDs your population is actually using.

## Why MFA-within-10-minutes matters more than people think

Microsoft requires recent strong authentication before passkey registration for the same reason a bank requires re-auth before adding a new payee: the registration of a new strong credential is itself a high-value action, and if it could be performed from a weak or stale session, an attacker who phished a single password could establish persistent phishing-resistant access.

Two operational consequences:

- **Users who don't have any MFA method yet can't register a passkey, period.** They need at least one method (even a phone call) to satisfy the prerequisite, or they need a Temporary Access Pass issued by an admin. Don't tell new hires "your passkey is your first credential" — that flow doesn't exist.
- **Temporary Access Pass (TAP) is the canonical bootstrap.** Issue a one-time-use TAP with a short lifetime (1-4 hours), have the user satisfy it via Security info, register the passkey, then let the TAP expire. The [TAP documentation](https://learn.microsoft.com/entra/identity/authentication/howto-authentication-temporary-access-pass) is explicit that this is the supported pattern.

```powershell
# Issue a TAP for a single user via Microsoft Graph PowerShell
Connect-MgGraph -Scopes "UserAuthenticationMethod.ReadWrite.All"
$user = Get-MgUser -UserId "new.hire@contoso.com"
New-MgUserAuthenticationTemporaryAccessPassMethod -UserId $user.Id `
    -LifetimeInMinutes 60 -IsUsableOnce:$true
```

The cmdlet returns the TAP value. Send it to the user via the out-of-band channel you trust (your HR system, in-person handover, or an authenticated portal — never email, because that's the channel passkeys are supposed to make irrelevant).

## Platform-by-platform: what actually happens

### Windows 11 + Windows Hello as the passkey provider

On Windows 11, the Web Account Manager and Windows Hello together act as the passkey provider. The credential is generated and stored in the TPM. The AAGUID Entra sees identifies the Windows Hello passkey provider, not the user's specific TPM model.

**Failure modes specific to this platform:**

- **TPM unavailable or unhealthy.** Look at `Get-Tpm` in an elevated PowerShell. If `TpmReady` is false, registration cannot proceed.
- **Windows Hello PIN not configured.** WHfB requires a PIN as the gesture. If the user has only logged in with a password, the registration ceremony halts at the PIN-setup step.
- **AAGUID for Windows Hello passkey provider not allowlisted.** The Windows passkey on Windows 11 is currently in preview and ships with a distinct AAGUID. Tenants with strict passkey profiles need to add it explicitly. The [Windows passkey enablement guide](https://learn.microsoft.com/entra/identity/authentication/how-to-authentication-passkeys-on-windows) lists the AAGUIDs.
- **Attestation required, Windows Hello doesn't sign attestation.** If your tenant requires attestation, Windows Hello's passkey provider — as of writing — does not satisfy it. Either remove attestation enforcement or steer Windows users to hardware FIDO2 keys.

### iOS + Microsoft Authenticator app

On iOS 17+, the Microsoft Authenticator app holds the passkey in the device's Secure Enclave. The user must have the Authenticator app installed, signed in to their work account, and the device must be running a supported iOS version.

**Failure modes:**

- **Bluetooth disabled** during cross-device registration (registering from a desktop using the phone as the authenticator). The cross-device flow uses CTAP-over-caBLE, which is Bluetooth-mediated. If Bluetooth is off, the ceremony hangs at the QR-code screen.
- **iCloud Keychain confusion.** Apple's native passkey path uses iCloud Keychain; Microsoft Authenticator's path uses the Secure Enclave directly without iCloud sync. Users sometimes register with the Apple path expecting it to be the work passkey. It isn't — the work account is a separate credential. Confirm registration via Security info, not the iOS Passwords app.
- **App version too old.** iOS Authenticator versions older than the documented minimum don't expose passkey registration at all.

### Android + Microsoft Authenticator app

Android requires the device to have either a hardware-backed Keystore (a Secure Element or TEE) for the Authenticator app to store the private key. Devices without such hardware can register but the credential is stored in software, and Microsoft documents that the tenant policy can refuse to accept software-backed credentials.

**Failure modes:**

- **Android Keystore not hardware-backed.** Common on older or budget devices. The Authenticator app will surface a more or less helpful error depending on its version.
- **Multiple Google accounts on the device** can confuse the passkey provider chooser dialog. Have the user explicitly select the Microsoft Authenticator entry, not the Google Passwords entry.
- **Android version below the documented minimum** (typically Android 14 for current Authenticator releases).

### Hardware FIDO2 keys (YubiKey, Feitian, Token2, etc.)

The cleanest path, and the path with the most predictable failure modes. The key contains its own AAGUID and attestation statement.

**Failure modes:**

- **AAGUID not in your tenant allowlist.** Find the AAGUID in the vendor's documentation (or use a free AAGUID lookup tool) and add it to the passkey profile.
- **Browser does not have WebAuthn USB or NFC permission.** Chrome on Linux often needs explicit udev rules; Safari on macOS requires the system to recognise the USB device.
- **Firmware too old for FIDO2 / CTAP2.** Some early-generation keys are U2F-only and can't register passkeys at all.

## A Graph-driven inventory: what have your users actually registered?

You can't manage what you can't see. The following queries against Microsoft Graph give you the current state of registered authentication methods per user.

```powershell
# Inventory: every user's registered passkey methods with AAGUID
Connect-MgGraph -Scopes "UserAuthenticationMethod.Read.All", "User.Read.All"

$users = Get-MgUser -All -Property Id,UserPrincipalName,DisplayName

$report = foreach ($u in $users) {
    $methods = Get-MgUserAuthenticationFido2Method -UserId $u.Id -ErrorAction SilentlyContinue
    foreach ($m in $methods) {
        [pscustomobject]@{
            UserPrincipalName  = $u.UserPrincipalName
            DisplayName        = $u.DisplayName
            MethodDisplayName  = $m.DisplayName
            AAGUID             = $m.AaGuid
            Model              = $m.Model
            CreatedDateTime    = $m.CreatedDateTime
            AttestationLevel   = $m.AttestationLevel
            AttestationCertificateThumbprint = $m.AttestationCertificateThumbprint
        }
    }
}

$report | Export-Csv -Path passkey-inventory.csv -NoTypeInformation
```

Then the same data via KQL on `AuditLogs` for the registration events themselves:

```kql
AuditLogs
| where TimeGenerated > ago(90d)
| where OperationName == "Register security info"
| extend Method = tostring(TargetResources[0].modifiedProperties[0].newValue)
| where Method has_any ("Passkey", "FIDO2", "Authenticator")
| project TimeGenerated,
          Initiator = tostring(InitiatedBy.user.userPrincipalName),
          Target    = tostring(TargetResources[0].userPrincipalName),
          Method,
          Result    = tostring(Result),
          CorrelationId
| order by TimeGenerated desc
```

Patterns to watch for in the inventory:

- **Users with no phishing-resistant method.** Run a separate query (`Get-MgUserAuthenticationMethod`) and identify users with only SMS / Authenticator push / voice. These are your remaining MFA-only population.
- **AAGUIDs you didn't allowlist appearing in the registrations.** Either your policy is more permissive than you thought, or a user found a workaround. Investigate.
- **Bulk registrations from a single admin in a short window.** Could be legitimate bootstrap, could be a help-desk insider risk. Audit.

## The rollout pattern

What works:

1. **Open registration first** — turn on the FIDO2 / passkey method in Authentication Methods policy, target a pilot group, leave attestation off initially.
2. **Drive pilot users to Security info** with a one-page how-to. Use Temporary Access Pass for users who don't have an MFA method yet.
3. **Inventory what gets registered** with the Graph query above. You'll discover which AAGUIDs your population actually uses (often a wider mix than you expected: Windows Hello, Authenticator on iOS, a couple of YubiKey models, the occasional Token2).
4. **Tighten the passkey profile** to allowlist exactly those AAGUIDs. Now you've moved from "register anything" to "register only known-good authenticators" without locking anyone out retroactively.
5. **Roll registration to the next ring.** Repeat.
6. **Only once registration is stable across rings** do you turn on the Authentication Strength policy that *requires* phishing-resistant MFA for sign-in. The order matters: requiring something users haven't registered locks them out.

> [!WARNING]
> Don't combine "first time turning on passkeys" and "first time enforcing phishing-resistant strength" in the same change window. The two are separate concerns. Register first, then enforce.

## Common questions

### Why does a user with a working YubiKey on another tenant get rejected on ours?

Almost certainly an AAGUID allowlist mismatch. Each tenant's passkey profile is independent. Find the YubiKey model's AAGUID in [Yubico's AAGUID list](https://support.yubico.com/hc/en-us/articles/360016648959-YubiKey-AAGUIDs) and add it to your profile.

### The user successfully registered yesterday but the sign-in policy now blocks them. What happened?

You enforced a stricter Authentication Strength after the registration. Either the registered method satisfies the new strength (in which case investigate further — could be a session issue) or it doesn't (revisit the AAGUID + attestation requirements in the strength policy).

### Can a user have both a passkey and SMS as a fallback?

Yes, and for the rollout phase you usually want them to. Authentication Strength is what decides which method is acceptable for a given sign-in. The presence of SMS doesn't force the user to use SMS — it just provides a fallback for scenarios where the passkey isn't reachable. Plan to retire SMS once passkey adoption is stable.

### Why does the iOS Authenticator passkey work for Outlook on the phone but not for sign-in on a desktop browser?

Cross-device flows (phone-as-authenticator for a desktop session) need Bluetooth on the phone and proximity to the desktop. If those conditions aren't met, the desktop browser falls back to whichever passkey provider the desktop has locally — which may not be your work account's. The fix is either to register a desktop-local passkey (Windows Hello, Mac Touch ID via the work account in Authenticator), or to ensure Bluetooth is enabled and the user is physically near the desktop during sign-in.

### Is a passkey portable between Authenticator apps and other passkey providers?

Generally no. A passkey created in Microsoft Authenticator on iOS lives in the Secure Enclave and is not exported. The user would register a separate passkey in iCloud Keychain or another provider if they want one there. Microsoft is working on cross-provider passkey portability (the "CXP" specs are in progress at FIDO Alliance), but it's not generally available yet.

## What to take away

Passkey registration is a credential-issuance workflow, and the failures cluster into four buckets: policy targeting, MFA prerequisite, platform capability, and AAGUID/attestation governance. Walking the decision tree closes most tickets before they need escalation. The Graph queries give you the population-level view that the portal doesn't surface. The rollout pattern — open registration first, inventory, then tighten profiles, then enforce strength — is what gets you to phishing-resistant authentication without a help-desk surge. Get the order right and most of your users will register passkeys without ever opening a ticket.

## References

- [Register a passkey (FIDO2) — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/how-to-register-passkey)
- [Enable passkeys (FIDO2) in Microsoft Entra ID — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/how-to-enable-passkey-fido2)
- [Microsoft Entra passkey on Windows devices — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/how-to-authentication-passkeys-on-windows)
- [Authentication strengths — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-strengths)
- [Temporary Access Pass — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [Authentication methods policy — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage)
- [FIDO2 compatibility matrix — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-fido2-compatibility)
- [`Get-MgUserAuthenticationFido2Method` — Microsoft Graph PowerShell SDK](https://learn.microsoft.com/powershell/module/microsoft.graph.identity.signins/get-mguserauthenticationfido2method)
