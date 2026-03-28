---
title: "Microsoft Entra ID: Passkey Policy Design, Profiles, AAGUID Restrictions, and Attestation"
excerpt: "Learn how Microsoft Entra passkey policy works, how passkey profiles are evaluated, and how AAGUID restrictions and attestation affect registration and sign-in."
coverImage: "/assets/blog/passkey-policy/cover.svg"
date: "2026-03-28T21:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-policy/cover.svg"
---

## Overview

This article explains how Microsoft Entra evaluates passkey policy. It focuses on the parts of the design that usually decide whether a rollout is predictable or frustrating:

- passkey profiles
- passkey type selection
- AAGUID restrictions
- attestation
- Windows Hello preview-specific behavior

The authoritative Microsoft configuration guidance is in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) and [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).

![Passkey policy design](/assets/blog/passkey-policy/cover.svg)

## What passkey policy controls

Microsoft Entra passkey policy is not a single on or off switch. The registration and sign-in path is controlled by several settings that work together:

1. self-service registration must be allowed
2. the user must be targeted by a passkey profile
3. the authenticator must satisfy the allowed passkey type
4. if key restrictions are enabled, the AAGUID must be allowed
5. if attestation is enforced, Microsoft must be able to validate the attestation statement

This layering is why a tenant can appear to have passkeys enabled while registration still fails for a user population. A failure at any stage blocks the full workflow.

## How passkey profiles are evaluated

Microsoft documents in [How to enable passkeys (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) that passkey profiles are group-targeted policy definitions. A profile tells Entra what type of passkey a targeted user can register and what restrictions apply to that registration.

The important runtime detail is that users can be targeted by more than one profile. Microsoft states that evaluation order is not guaranteed and that a passkey is allowed if it satisfies at least one applicable profile. That means profile design should be treated carefully:

- broad profiles can unintentionally override the intent of narrow profiles
- exception groups should be isolated
- privileged populations should not share the same permissive profile as standard users

For practical rollout design, it is better to think of passkey profiles as policy personas rather than as ad hoc exceptions.

## Passkey type: device-bound and synced

Microsoft lets you control whether a profile allows:

- device-bound passkeys
- synced passkeys
- both

This is not only a UX choice. It changes the operational model.

As Microsoft explains in the [synced passkey FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq), synced passkeys are expected to be the best option for most standard users because they reduce issuance and recovery friction. The same Microsoft guidance recommends device-bound passkeys for administrators and highly privileged users.

That recommendation aligns with how the two models behave:

- device-bound passkeys provide tighter control over the authenticator boundary
- synced passkeys provide lower lifecycle overhead and better portability

A clean tenant design usually separates those populations instead of trying to force one passkey type across every role.

## What AAGUID is and why it matters

The Authenticator Attestation GUID, or AAGUID, is the identifier the authenticator presents to represent its make and model. Microsoft defines it in [How to enable passkeys (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) and uses it as the enforcement primitive for key restrictions.

If your tenant needs to allow only specific authenticator models, AAGUID is the control that makes that possible. Entra is not matching on marketing names or vendor branding. It is matching on the identifier supplied during registration.

This also has a runtime implication. Microsoft notes that if a previously allowed AAGUID is later removed from policy, existing passkeys associated with that authenticator model can stop working for sign-in. So AAGUID restrictions are not only a registration-time decision. They are also a production access decision.

## What attestation is doing

Attestation is the mechanism that lets Microsoft validate that the authenticator is what it claims to be. Microsoft explains in [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor) that it relies on FIDO metadata and attestation information returned by the authenticator.

In practice, attestation changes how much trust Entra can place in the properties associated with the passkey. Microsoft states in [How to enable passkeys (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2):

- when attestation is enforced, registration requires a valid attestation statement
- when attestation is not enforced, Entra cannot guarantee the attributes of the passkey, including whether it is synced or device-bound

That second point is easy to miss. Disabling attestation broadens compatibility, but it also reduces certainty about the authenticator identity and credential classification.

## Windows Hello preview behavior

Windows Hello is a special case in the current passkey design. Microsoft documents in [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) that Windows Hello can act as the passkey provider for Microsoft Entra passkeys on Windows.

For policy design, the most important Microsoft requirements are:

- the Windows Hello AAGUIDs must be explicitly allow-listed
- key restrictions must be enabled
- attestation must not be enforced for those preview profiles

That is why Windows Hello should usually be placed in a dedicated pilot profile rather than mixed into a broader workforce profile during early rollout.

## Recommended profile model

For most tenants, the cleanest implementation is to separate passkey policy into three groups:

### Admin profile

- device-bound only
- approved AAGUIDs only
- attestation enforced where supported

### Workforce profile

- synced passkeys allowed
- minimal restriction unless compliance requires tighter control

### Windows Hello pilot profile

- explicit Windows Hello AAGUID allow list
- key restrictions enabled
- attestation disabled for preview support

This structure maps directly to Microsoft’s guidance and makes later troubleshooting easier because each profile has a clear purpose.

## Example policy screens

![Microsoft Entra passkey settings](/assets/blog/passkey-policy/ms-passkey-settings.png)
*Source: Microsoft Learn, [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2).*

![Default passkey profile in Microsoft Entra](/assets/blog/passkey-policy/ms-default-passkey-profile.png)
*Source: Microsoft Learn, [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2).*

![Windows Hello passkey profile configuration](/assets/blog/passkey-policy/ms-windows-passkey-profile.png)
*Source: Microsoft Learn, [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).*

## Key implementation points

- Passkey rollout should be designed as a profile strategy, not a single global toggle.
- AAGUID restrictions are the real enforcement control for approved authenticator models.
- Attestation changes the trust quality of the registration, not just the compatibility rate.
- Windows Hello preview needs its own profile treatment.

## References

- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Frequently asked questions about synced passkeys](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq)
- [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
