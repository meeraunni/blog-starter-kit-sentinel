---
title: "Microsoft Entra ID: Passkey Registration on Windows, iPhone, and Android"
excerpt: "A detailed technical guide to Microsoft Entra passkey registration on Windows and mobile, including recent MFA requirements, Temporary Access Pass bootstrap, authenticator behavior, and policy evaluation."
coverImage: "/assets/blog/passkey-registration/cover.svg"
date: "2026-03-28T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-registration/cover.svg"
---

## Overview

Passkey registration in Microsoft Entra often gets described as a simple user action in the Security info portal. That description is too shallow to be useful for engineering or rollout work. Registration is a **credential issuance workflow**. The user interface is only the front end for a policy-controlled exchange in which Microsoft Entra decides whether it is willing to bind a new public-key credential to the user account.

The main Microsoft sources are [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey), [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS), [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), and [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).

The right architectural question is not "where does the user click?" The right question is "what conditions must be true before Microsoft Entra will accept a new phishing-resistant authenticator for this account?"

![Passkey registration flow](/assets/blog/passkey-registration/cover.svg)

## What happens before registration starts

Microsoft documents an important prerequisite in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2): the user must have completed MFA within the previous five minutes before they can register a passkey.

This is not an arbitrary user-experience rule. It is a credential-governance safeguard. Registration adds a new sign-in method that can later satisfy strong authentication requirements. Microsoft Entra therefore requires a recent high-confidence sign-in event before it will issue that new credential binding.

This also explains why bootstrap planning matters. If the user cannot satisfy the recent MFA requirement through existing methods, Microsoft directs administrators to use [Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey). In other words, registration is not independent from authentication-method lifecycle. It depends on the tenant already having a safe way to get the user into a strong authentication session.

## The backend registration sequence

When the user starts passkey registration, several control-plane checks happen before the authenticator ceremony can succeed.

Microsoft Entra first validates whether the user is in scope for passkey registration and whether recent MFA requirements are satisfied. If that check passes, the selected platform or authenticator generates a key pair. The private key remains protected by the authenticator. The public key and related registration metadata are then returned to Microsoft Entra, which stores the method metadata for later sign-in verification.

This backend model matters because it explains several common misunderstandings:

1. Microsoft Entra never receives the private key
2. the Security info page is only the orchestration layer, not the credential container
3. policy failure happens before the authenticator is fully accepted
4. the same UI can lead to different outcomes depending on the profile, passkey type, and authenticator restrictions that apply

## Security info is the portal, not the whole workflow

Microsoft's [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) article documents the standard path through [Security info](https://mysignins.microsoft.com). The user selects **Add sign-in method**, chooses **Passkey**, completes MFA, and then selects where the passkey will be stored.

From an engineering perspective, that UI is only the visible top layer. Whether the registration actually works depends on deeper factors:

1. the user must be in scope for a passkey profile
2. the attempted passkey type must be allowed
3. any AAGUID restrictions must be satisfied
4. attestation requirements, if enforced, must be met
5. the chosen platform path must be supported for the intended authenticator

This is why it is possible for the user to reach the registration UX and still fail before the credential is accepted.

## Registration on Windows

Microsoft documents Windows separately in [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) because Windows Hello is acting as the passkey provider in that scenario.

The important engineering details are:

1. Windows Hello stores the passkey locally in the Windows Hello container
2. the profile must allow the Windows Hello AAGUIDs
3. key restrictions must be enabled
4. attestation must not be enforced for the preview profile

These details matter because Windows registration can look available in the UI while the tenant policy still makes successful issuance impossible. If the Windows Hello AAGUIDs are not allow-listed correctly, the registration ceremony does not fail because "Windows is unsupported." It fails because the authenticator presented by Windows Hello does not satisfy the tenant's policy rules.

## Registration on iPhone

Microsoft's [mobile registration guidance for iOS](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS) shows how iPhone participates in the registration flow, especially when using an external security key.

The operational detail administrators should understand is that the phone is not always the actual credential container. In many scenarios it is the UI and transport host for a ceremony whose credential is being created on the external authenticator.

That distinction changes how you troubleshoot failures. If the browser interaction on the phone looks healthy but the authenticator cannot complete the registration, the issue is probably in authenticator compatibility, transport, AAGUID restriction, or attestation handling rather than in the Security info portal itself.

## Registration on Android

Microsoft's [mobile registration guidance for Android](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=Android) follows the same core policy model but allows for more device and OEM variation in the user experience.

What should stay fixed in your mental model is not the exact Android screen sequence, which can vary, but the Entra-side decision path:

1. user begins registration from Security info
2. recent MFA is evaluated
3. the selected authenticator path is tested against the active profile
4. Microsoft Entra accepts or rejects the registration material based on policy

That means Android documentation and support runbooks should tolerate UX differences while remaining strict about control-plane validation.

## Common registration failure patterns

Most registration failures fall into a small number of backend categories.

The first is **policy scope failure**. The user is not in an applicable passkey profile, or the profile does not allow the type of authenticator being attempted.

The second is **bootstrap failure**. The user has not completed recent MFA and cannot satisfy the issuance prerequisites. In those cases, Temporary Access Pass is often the supported recovery path, as described in Microsoft's registration guidance.

The third is **authenticator-governance failure**. The AAGUID is not allowed, or attestation is enforced and the authenticator cannot satisfy Microsoft's validation path.

The fourth is **platform-path mismatch**. The browser or device path chosen by the user does not match the registration scenario the tenant actually designed for.

When administrators classify failures this way, troubleshooting becomes much more predictable than treating every registration issue as generic "passkeys don't work."

## Example registration screens

![Add passkey flow in Security info](/assets/blog/passkey-registration/ms-add-passkey.png)
*Source: Microsoft Learn, [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey).*

![Windows Hello passkey profile and AAGUID configuration](/assets/blog/passkey-policy/ms-windows-passkey-profile.png)
*Source: Microsoft Learn, [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).*

## Key implementation points

1. Passkey registration is a credential issuance workflow, not just a UI action in Security info.
2. Recent MFA is a hard prerequisite because Microsoft Entra treats registration as a high-value account change.
3. Windows Hello, iPhone, and Android differ in ceremony behavior, but the Entra-side policy checks remain the same.
4. The most common failures are policy scope, MFA bootstrap, authenticator restrictions, and platform-path mismatch.

## References

- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS)
- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
