---
title: "Microsoft Entra ID: Passkey Registration on Windows, iPhone, and Android"
excerpt: "A technical implementation guide covering how Microsoft Entra passkey registration works on Windows, iOS, and Android, including MFA bootstrap, Security info flows, Windows Hello preview behavior, and mobile security-key registration."
coverImage: "/assets/blog/passkey-registration/cover.svg"
date: "2026-03-28T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-registration/cover.svg"
---

## Registration is where policy becomes real

Registration is the point where Entra stops being a policy configuration problem and starts being a protocol and client-platform problem.

At registration time, Entra is validating all of the following:

- is the user allowed to register a passkey?
- did the user satisfy strong authentication recently enough?
- is the current passkey type allowed?
- does the authenticator meet attestation and AAGUID restrictions?
- does the client platform expose the right WebAuthn or OS-integrated passkey flow?

Microsoft documents the main user flows in:

- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)

![Passkey registration flow](/assets/blog/passkey-registration/cover.svg)

## The bootstrap requirement is not optional

Microsoft states in both the [general enablement guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) and the [registration guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) that a user must complete MFA before adding a passkey.

Microsoft is even more specific in the enablement guide: users must complete MFA within the **previous five minutes** before they can register a passkey.

That is a backend trust requirement. Entra is treating passkey registration as a privileged credential issuance event, not as a low-risk profile edit.

This is why Microsoft also says an Authentication Policy Administrator can issue a [Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) so a user can strongly authenticate and then register a passkey.

## Browser-based registration from Security info

Microsoft documents the primary user-driven registration path in [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey):

1. go to [Security info](https://mysignins.microsoft.com)
2. choose `Add sign-in method`
3. select `Passkey`
4. complete MFA
5. choose where the passkey will be saved

What is happening in the backend is straightforward but important:

- Entra verifies the user is eligible under the Authentication Methods policy
- Entra checks the recent MFA requirement
- the client invokes the platform passkey UX
- the authenticator generates a key pair
- the public key and attestation metadata are registered with Entra
- the user names the method for later lifecycle management

The private key never goes to Entra. Entra stores the credential metadata and uses the registered public-key material for later challenge verification.

## Windows registration is not just “another client”

Microsoft Entra passkey on Windows is a separate deployment topic because Windows Hello becomes the local credential container.

As Microsoft explains in [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows), Windows passkeys:

- are stored in the local Windows Hello container
- can use PIN, fingerprint, or face as the user verification gate
- do not require the device to be Entra joined or registered
- allow multiple Entra passkeys for multiple accounts on one PC

This has two important architectural implications.

### The join state is not the gating factor

For Windows passkeys, the local passkey provider does not require the device itself to be joined or registered to Entra. That is different from how many admins mentally model Windows identity features.

What matters here is:

- Windows Hello support
- passkey profile configuration
- explicit allow-listing of Windows Hello AAGUIDs during preview

### Windows Hello is acting as the authenticator

Microsoft publishes the Windows Hello AAGUIDs in the Windows passkey article. That is a strong signal that Entra is treating Windows Hello as a passkey provider that must be explicitly recognized in policy.

As documented [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows), preview registration on Windows requires:

- Windows 10 or Windows 11
- Windows Hello support
- explicit allow-listing of Windows Hello AAGUIDs
- key restrictions enabled
- attestation disabled for those profiles

If any of those pieces are wrong, the registration flow fails before the user ever gets a working credential.

## iPhone registration with a security key

Microsoft’s [mobile registration guide for iOS](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS) shows a security-key-based mobile flow:

1. open [Security info](https://mysignins.microsoft.com) on iPhone
2. add a new passkey method
3. complete MFA
4. choose `Other Options`
5. choose `Security key`
6. connect the key
7. satisfy PIN or biometric requirements
8. rename the registered passkey

The important implementation detail is that the iPhone is functioning as the browser and registration surface, but the actual credential may still be created on the external security key. That means:

- phone support alone is not enough
- the key must support the required transport and policy conditions
- the key may require its own PIN enrollment before registration completes

## Android registration with a security key

Microsoft’s [Android instructions](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=Android) are similar but platform navigation differs:

1. open [Security info](https://mysignins.microsoft.com)
2. select `Passkey`
3. complete MFA
4. in the Android security window, choose an alternate save path
5. select `Another device` or equivalent
6. choose `USB security key`
7. connect the key
8. complete PIN or biometric verification

Microsoft notes in that article that manufacturer and Android OS differences change the exact option labels. That matters for operations because support teams should document both the Microsoft flow and the OEM-specific variants users actually see.

## Mobile registration is not the same thing as Authenticator passkeys

Microsoft makes an important distinction in the [mobile registration article](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS): registering a security key from a mobile device is different from registering passkeys in Microsoft Authenticator.

That distinction matters because:

- security-key registration uses an external authenticator
- Authenticator passkeys use the phone and Authenticator app as the passkey provider
- the client experience may look similar, but the policy and lifecycle implications can differ

Architecturally, admins should document which provider types are approved, not just whether "mobile passkeys" are allowed.

## Why registration fails even when the user follows the steps

In production tenants, passkey registration failures usually come from one of these backend causes:

### Policy gate failure

- self-service registration disabled
- user not targeted by a valid passkey profile
- passkey type not allowed

Microsoft documents these policy dependencies in [How to enable passkeys (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2).

### Strong-auth bootstrap failure

- no MFA method exists yet
- the last MFA event is outside Microsoft’s five-minute window
- the user should be bootstrapped with Temporary Access Pass

Microsoft documents this requirement [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey).

### Authenticator compatibility failure

- security key not compatible with Entra attestation expectations
- AAGUID is not allowed
- Windows Hello preview profile is missing required AAGUIDs

Microsoft documents these in the [Windows passkey preview article](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) and the [attestation vendor article](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor).

## Screenshot reference

Microsoft’s registration screenshots for the exact UI discussed here are in:

- [general browser registration](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [mobile registration on iOS and Android](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS)
- [Windows Hello passkey configuration](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)

## Final takeaway

Passkey registration in Microsoft Entra is not one workflow. It is a family of registration paths with a common trust model:

- strong authentication first
- platform/provider invocation second
- public-key registration into Entra third
- ongoing management through Security info and per-user authentication method controls

If an admin understands that model, Windows, iPhone, and Android registration flows stop looking random and start looking like different client surfaces over the same Entra credential-issuance process.

## References

- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
