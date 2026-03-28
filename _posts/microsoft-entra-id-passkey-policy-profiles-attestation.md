---
title: "Microsoft Entra ID: Passkey Policy Design, Profiles, AAGUID Restrictions, and Attestation"
excerpt: "A technical design guide for Microsoft Entra administrators covering passkey policy architecture, passkey profiles, device-bound versus synced passkeys, AAGUID-based restrictions, attestation, and rollout design."
coverImage: "/assets/blog/passkey-policy/cover.svg"
date: "2026-03-28T21:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-policy/cover.svg"
---

## Why policy design matters before rollout

Microsoft Entra passkeys are not enabled safely by simply flipping on one authentication method. The control plane is a combination of:

- the Authentication Methods policy
- the passkey global registration toggle
- one or more passkey profiles
- optional attestation enforcement
- optional AAGUID allow/block restrictions

As Microsoft explains in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), passkey profiles are the policy layer that lets an architect separate requirements for admins, privileged operators, and standard users.

If that design is weak, the registration and sign-in experience becomes inconsistent. If it is designed well, Entra can enforce different passkey types and authenticator restrictions per group without relying on tenant-wide one-size-fits-all settings.

![Passkey policy design](/assets/blog/passkey-policy/cover.svg)

## The backend model Entra is enforcing

Microsoft describes passkey profiles as group-based policy containers in the [enable passkeys article](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2). In practical terms, Entra is evaluating whether a registration or sign-in attempt satisfies at least one applicable profile targeted to the user.

As mentioned [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), when a user is in scope for multiple profiles:

- there is no guaranteed evaluation order
- the passkey is allowed if it fully satisfies at least one targeted profile

That means the architecture is **profile-satisfaction based**, not "first matching policy wins."

For an engineer, that has two immediate consequences:

1. overlapping profiles can widen access if one profile is less restrictive than intended
2. rollout design should focus on mutually understandable policy boundaries, not only on group membership

## The profile model Microsoft currently exposes

Microsoft’s current passkey policy model, documented [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), includes:

- a global `Allow self-service set up` control
- a `Default` passkey profile created when you opt in
- additional passkey profiles for targeted groups
- selection of passkey type: device-bound, synced, or both
- optional attestation enforcement
- optional key restrictions using AAGUIDs

Two details from the Microsoft document matter operationally:

- after you opt in to passkey profiles, you cannot opt out
- up to three passkey profiles, including the Default profile, are currently supported

This is not just an admin-center UI fact. It affects how you model phased rollout and exception handling.

## Why the global self-service toggle still matters

Microsoft states [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) that if `Allow self-service set up` is set to `No`, users cannot register passkeys from [Security info](https://mysignins.microsoft.com), even if passkeys are otherwise enabled by policy.

That tells you the enforcement chain:

1. global registration must be allowed
2. the user must be targeted by at least one compatible passkey profile
3. the authenticator must satisfy the selected passkey type and restrictions
4. the user must pass strong authentication before registration

If self-service is off, the registration flow is blocked before profile logic becomes useful.

## Passkey types are not just UX options

Microsoft treats `device-bound` and `synced` as policy-relevant categories in [the same article](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2).

That distinction matters because the recovery and governance properties are different.

### Device-bound passkeys

Device-bound passkeys are anchored to a specific authenticator, such as:

- a FIDO2 security key
- Microsoft Authenticator in supported scenarios
- Windows Hello in the Windows passkey preview scenario

The benefit is tighter hardware or device affinity. The tradeoff is lifecycle friction: replacement, reissuance, and recovery can be more operationally expensive.

### Synced passkeys

Microsoft’s [synced passkeys FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq) is direct on the design tradeoff: synced passkeys reduce the issuance and recoverability cost associated with separate hardware and are expected to be the best option for most users and organizations.

Microsoft also recommends, in that FAQ, a split model:

- device-bound passkeys for admins and highly privileged users
- synced passkeys for non-admin users

That recommendation is really a policy-segmentation pattern, and passkey profiles are the mechanism that makes it implementable.

## AAGUID is the actual hardware/provider identity control

The most important low-level identifier in this feature is the **Authenticator Attestation GUID** or **AAGUID**.

Microsoft defines AAGUID in the [passkey enablement article](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) as the 128-bit identifier vendors provide during registration to identify the authenticator make and model. The AAGUID is what lets Entra distinguish one passkey provider model from another at registration time.

That is why AAGUID restrictions are not cosmetic. They are the actual primitive Entra uses for model-based allow/block enforcement.

As described [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2):

- key restrictions can allow or block specific models or providers
- if you remove a previously allowed AAGUID, already-registered methods that depend on that AAGUID can stop working for sign-in

That second point is extremely important. AAGUID governance affects both **future registration** and **existing authentication usability**.

## What attestation is doing in the backend

Attestation is the control that lets Entra verify that the authenticator really is what it claims to be.

Microsoft explains in [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor) that Microsoft relies on the **FIDO Alliance Metadata Service (MDS)** and expects authenticators to return valid attestation statements. Entra then uses that metadata to evaluate compatibility and trust.

As Microsoft states [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2):

- if `Enforce attestation` is `Yes`, registration requires verifiable attestation metadata
- if `Enforce attestation` is `No`, Entra cannot guarantee attributes about the passkey, including whether it is synced or device-bound

This is the most important security-versus-flexibility tradeoff in the passkey policy model.

### When attestation is enforced

You gain:

- vendor/model verification
- stronger control over authenticator provenance
- better confidence in AAGUID-based restrictions

You may lose:

- compatibility with authenticators that do not meet Entra attestation expectations
- frictionless registration for consumer-style or third-party passkey providers

### When attestation is not enforced

You gain:

- broader registration compatibility
- easier pilot rollout

You lose:

- strong assurance about authenticator identity
- strong assurance about passkey type classification

For a solution architect, the correct question is not "Should I always enforce attestation?" The better question is:

**Which user populations require high-confidence authenticator provenance, and which populations need broad deployment velocity?**

## Why Windows is a special case

Microsoft Entra passkey on Windows changes the passkey provider model because Windows Hello becomes the local secure credential container.

Microsoft documents in [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) that Windows Hello can store passkeys in:

- a hardware-based TPM
- a VBS-backed hardware path
- a software-based TPM

Microsoft also publishes the Windows Hello AAGUIDs in that article, which is important because profile-based policy needs those identifiers to explicitly allow the provider during preview.

More importantly, Microsoft states [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) that during public preview:

- Windows Hello AAGUIDs must be explicitly allow-listed
- key restrictions must be enabled
- attestation must **not** be enforced for profiles that include Windows Hello AAGUIDs

That is a real backend compatibility constraint, not just a UI instruction.

## Registration preconditions are stronger than many admins realize

Microsoft documents two important prerequisites in [How to enable passkeys (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2):

- users must complete MFA within the last five minutes before registering a passkey
- the authenticator must support Entra’s attestation requirements if attestation is enforced

This explains a large class of rollout failures:

- policy looks correct
- user is in scope
- registration still fails

In many tenants, the real root cause is not the passkey profile. It is that the registration attempt failed the strong-auth bootstrap requirement or used an authenticator outside the allowed attestation or AAGUID conditions.

## A practical policy design pattern

A solid Entra rollout usually separates users into at least three populations.

### Profile 1: privileged admins

- passkey type: device-bound only
- attestation: enforce where vendor support is known
- key restrictions: allow only approved AAGUIDs

This reduces ambiguity and helps ensure highly privileged identities are tied to approved authenticators.

### Profile 2: standard knowledge workers

- passkey type: synced
- attestation: evaluate carefully based on provider support
- key restrictions: minimal unless there is a compliance requirement

This aligns closely with Microsoft’s recommendation in the [synced passkeys FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq).

### Profile 3: Windows pilot users

- include Windows Hello AAGUIDs explicitly
- key restrictions: enabled
- attestation: off during preview

This isolates preview-specific complexity and stops Windows behavior from unexpectedly affecting the broader rollout.

## Screenshot reference

The Microsoft policy screens this article is referring to are shown in:

- [passkey profiles configuration and targeting](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Windows Hello passkey profile requirements](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)

## Final takeaway

Microsoft Entra passkey policy is not just a method toggle. It is a policy engine that combines:

- global registration enablement
- group-targeted passkey profiles
- passkey type rules
- AAGUID restriction logic
- attestation trust decisions

If you understand that model, you can design a passkey rollout intentionally:

- privileged users on device-bound authenticators
- broad workforce on synced passkeys where appropriate
- Windows Hello enabled with preview-specific constraints
- AAGUID restrictions used as an identity-control primitive, not as an afterthought

That is the level at which passkey policy should be designed in Entra.

## References

- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Frequently asked questions about synced passkeys](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq)
- [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
