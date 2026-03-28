---
title: "Microsoft Entra ID: Passkey Registration on Windows, iPhone, and Android"
excerpt: "Learn how Microsoft Entra passkey registration works on Windows, iPhone, and Android, including MFA bootstrap, Security info flows, Windows Hello preview behavior, and mobile security-key registration."
coverImage: "/assets/blog/passkey-registration/cover.svg"
date: "2026-03-28T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-registration/cover.svg"
---

## Overview

This article explains how passkey registration works in Microsoft Entra and what an administrator needs to validate before asking users to enroll. The Microsoft registration experience looks simple, but the backend requirements are strict:

- the user must be eligible under policy
- the user must complete strong authentication first
- the selected authenticator must satisfy profile restrictions
- the client platform must support the registration path

Microsoft’s primary guides are:

- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)

![Passkey registration flow](/assets/blog/passkey-registration/cover.svg)

## Before registration

Microsoft requires a recent MFA event before a user can register a passkey. As documented in [How to enable passkeys (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), the user must complete MFA within the previous five minutes.

This requirement exists because passkey registration is a credential issuance action, not a cosmetic account update. Microsoft Entra is verifying that the current session still represents a strongly authenticated user before it accepts a new phishing-resistant credential.

If the user cannot meet that requirement, Microsoft points to [Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) as the supported bootstrap option.

## What happens during registration

When a user starts the passkey registration flow, Entra evaluates policy first and lets the authenticator ceremony start only if the policy requirements are satisfied.

The registration transaction is effectively:

1. user starts passkey registration
2. Entra verifies eligibility and recent MFA
3. the platform or external authenticator creates a key pair
4. the public-key registration material is sent to Entra
5. Entra stores the method metadata for later sign-in validation

The private key never goes to Entra. The authenticator keeps it locally under its own protection model.

## Registering from Security info in a browser

Microsoft documents the baseline user flow in [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey):

1. go to [Security info](https://mysignins.microsoft.com)
2. select `Add sign-in method`
3. choose `Passkey`
4. complete MFA
5. choose where the passkey is saved

For administrators, the important part is not the portal path. The important part is that Security info is only the front end for a deeper policy decision. If the user is out of scope, outside the recent MFA window, or attempting an unsupported authenticator path, the registration flow fails before the credential is accepted.

## Registering on Windows

Microsoft Entra passkey on Windows is documented separately in [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) because Windows Hello acts as the passkey provider.

Microsoft’s key points for the Windows preview are:

- Windows Hello stores the passkey in the local Windows Hello container
- the device does not need to be Entra joined or registered for the preview registration path
- Windows Hello AAGUIDs must be explicitly allow-listed
- key restrictions must be enabled
- attestation must not be enforced for the preview profile

That means Windows registration should be treated as its own design track. If the profile is missing the required AAGUID configuration, the user can reach the registration UX and still fail.

## Registering on iPhone

Microsoft’s [mobile registration guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS) shows how an iPhone can be used to drive registration for an external security key.

The important design point is that the phone is not always the actual passkey provider. In this scenario, it is often the browser surface and ceremony host, while the credential itself is created on the connected security key.

That changes how you troubleshoot:

- if the phone can browse successfully but the key cannot finish the ceremony, the issue is usually provider or transport related
- if policy blocks the key’s AAGUID or attestation path, the failure occurs even though the phone experience looks normal

## Registering on Android

Microsoft’s [Android instructions](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=Android) follow the same core pattern, but Android introduces more OEM-specific UX differences. The path labels can differ, but the registration logic is the same:

- the user starts from Security info
- the user chooses the passkey registration path
- MFA is completed
- the external key or supported platform path is selected
- Entra evaluates whether the registration satisfies policy

That means Android support documentation should always account for UI variance while keeping the policy model fixed.

## Common registration failure points

The most common registration issues fall into four categories.

### Policy scope

The user is not in a passkey profile that allows the attempted passkey type or provider.

### MFA bootstrap

The user did not complete recent MFA, or needs Temporary Access Pass to establish a valid registration session.

### Authenticator restrictions

The AAGUID is not allowed, or attestation is enforced and the authenticator cannot satisfy Microsoft’s validation requirements.

### Platform path mismatch

The browser, Windows preview path, or mobile transport path does not support the exact registration method the user chose.

## Example registration screens

![Add passkey flow in Security info](/assets/blog/passkey-registration/ms-add-passkey.png)
*Source: Microsoft Learn, [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey).*

![Windows Hello passkey profile and AAGUID configuration](/assets/blog/passkey-policy/ms-windows-passkey-profile.png)
*Source: Microsoft Learn, [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).*

## Key implementation points

- Treat registration as credential issuance, not as a simple profile update.
- Validate recent MFA and policy scope before testing authenticator behavior.
- Keep Windows Hello preview rollout separate from general passkey rollout.
- Document the difference between mobile as interface and mobile as passkey provider.

## References

- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
