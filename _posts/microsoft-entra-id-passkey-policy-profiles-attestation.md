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

## Why passkey policy design matters

Most Entra passkey deployments start with the wrong mental model. Teams often assume passkeys are enabled by turning on a method and then letting users register. That is not how Microsoft Entra actually enforces passkey eligibility.

The real control plane, as Microsoft documents in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), is a layered decision model:

- the tenant must allow passkey self-service registration
- the user must be in scope for a passkey profile
- the chosen authenticator has to satisfy the passkey type allowed by that profile
- if key restrictions are enabled, the authenticator’s AAGUID must satisfy the allow or block rule
- if attestation is enforced, the authenticator must return attestation Microsoft can validate

This is why badly planned rollouts feel random. They are not random. The directory is evaluating multiple control points, and the admin team has usually configured only part of the chain.

![Passkey policy design](/assets/blog/passkey-policy/cover.svg)

## The policy engine Entra is actually applying

Microsoft’s passkey profile model is not a cosmetic wrapper over the old FIDO2 toggle. It is a group-targeted policy framework. When a user tries to register or use a passkey, Entra evaluates the user’s applicable passkey profiles and determines whether the authenticator satisfies at least one of them.

Microsoft is explicit in the [passkey enablement article](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) that if a user is targeted by multiple profiles, the evaluation order is not guaranteed, and the passkey is permitted if it fully satisfies one of the targeted profiles.

This has an important architectural consequence: the system does not behave like a firewall rule set where the first matching policy wins. It behaves more like a satisfiability model. If you accidentally scope one broad profile and one narrow profile to the same population, the broad profile can make the narrow one operationally irrelevant.

That is why passkey design should be treated as policy architecture, not just as directory configuration.

## What a passkey profile really represents

A passkey profile is Microsoft’s mechanism for binding user scope to authenticator requirements. It lets you describe which populations can register which kinds of passkeys and under what trust assumptions.

As described in [the Microsoft documentation](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), each profile can define:

- the user or group target
- the allowed passkey type
- whether attestation is enforced
- whether key restrictions are used
- whether the restrictions are allow or block based

The important thing to notice is that these are not just registration preferences. They influence the entire credential lifecycle:

- which credentials can be issued
- which credentials remain usable later
- which populations can migrate between provider types
- which authenticators remain valid after policy changes

Microsoft also notes that after you opt in to passkey profiles, you cannot opt out, and that the feature currently supports up to three profiles, including the default profile. That limit matters because it forces the architect to think in broad operating personas instead of over-fitting one profile to every exception.

## Why the self-service registration toggle still matters

One of the easiest design mistakes is to build a careful set of passkey profiles and forget that the tenant-level registration control can still block the entire workflow.

Microsoft documents [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) that if `Allow self-service set up` is disabled, users cannot register passkeys from [Security info](https://mysignins.microsoft.com), even if the rest of the passkey policy design looks correct.

This tells you something useful about the enforcement pipeline. Microsoft Entra does not start with profile resolution and then discover later that registration is disabled. The flow is rejected earlier because the tenant has not allowed self-service issuance in the first place.

For an architect, that means there are really two gates:

1. can this tenant issue passkeys through self-service at all?
2. if yes, is this specific user-authenticator combination allowed?

If the first gate is closed, all later policy reasoning is irrelevant.

## Device-bound versus synced is a governance decision, not just a usability choice

Microsoft’s documentation draws a hard distinction between device-bound passkeys and synced passkeys. Many teams read that as a user-experience decision. It is more accurately a governance and recovery decision.

Device-bound passkeys are tied to a specific authenticator. In Entra terms, that often means:

- a hardware FIDO2 security key
- a platform authenticator with device-local binding
- Windows Hello in the passkey-on-Windows preview model

The value of device-bound credentials is control. You know more precisely what physical or local authenticator holds the key material. That is why Microsoft recommends device-bound passkeys for administrators and highly privileged users in the [synced passkey FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq).

Synced passkeys solve a different problem. As Microsoft explains in that same FAQ, synced passkeys reduce issuance, replacement, and lifecycle cost. The private key still stays on user-controlled authenticators, but the passkey experience can follow the user through a provider’s sync ecosystem. That makes them operationally attractive for standard user populations.

The deeper engineering point is this: passkey type affects your helpdesk model, your privileged-access model, your recovery model, and your hardware-vendor dependency model. That is why passkey type belongs inside targeted profiles rather than in a single tenant-wide decision.

## AAGUID is the control that turns “approved authenticator” into something enforceable

When administrators talk about “allow only approved keys,” they are really talking about AAGUID-driven control.

Microsoft defines the Authenticator Attestation GUID in [How to enable passkeys (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) as the 128-bit identifier returned by the authenticator to identify its make and model. That means AAGUID is not a friendly label. It is the authoritative identifier Entra can actually evaluate during registration.

This is the real reason key restrictions exist. Without AAGUID-based restriction, the directory has no precise way to distinguish one vendor/model family from another at policy time.

Microsoft’s documentation is especially important on one operational detail: if you remove an allowed AAGUID from policy, existing passkeys that depend on that authenticator model can stop working for sign-in. That means AAGUID governance is not only an onboarding decision. It is a runtime access decision with production impact.

An admin who changes AAGUID policy is effectively changing the set of authenticators that remain trusted by the tenant.

## What attestation is doing under the hood

Attestation is often described loosely as “verifying the key.” That is too vague to be useful.

Microsoft explains in [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor) that Microsoft relies on the FIDO Alliance Metadata Service and authenticator attestation statements to evaluate authenticator identity and capability. In other words, attestation gives Entra a way to validate that the authenticator presenting itself as a certain model/provider is backed by metadata Microsoft recognizes.

That matters because several higher-level policy promises depend on attestation being meaningful:

- whether Microsoft can trust the authenticator’s reported identity
- whether the directory can classify the passkey reliably
- whether AAGUID restrictions are operating on a trustworthy signal

Microsoft is very clear in [the enablement article](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2):

- if attestation is enforced, registration requires a verifiable attestation statement
- if attestation is not enforced, Entra cannot guarantee the attributes of the passkey, including whether it is synced or device-bound

That second sentence is the one most teams underestimate. Turning off attestation does not merely broaden compatibility. It reduces the certainty of the directory’s own classification of the credential.

## Why Windows Hello needs separate policy treatment

The Windows preview is the best example of why passkey policy cannot be built from generic assumptions.

Microsoft documents in [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) that Windows Hello stores Entra passkeys in the Windows Hello container and can back that storage with TPM-backed or software-based protection depending on the device.

For policy design, the important part is not the local storage mechanism by itself. The important part is that Windows Hello is being treated as a passkey provider with its own published AAGUIDs. During preview, Microsoft requires those AAGUIDs to be explicitly allow-listed and requires key restrictions to be turned on for the profile. Microsoft also says attestation should not be enforced for profiles that include Windows Hello AAGUIDs in preview.

That tells you the preview architecture is still converging. Entra can recognize the provider through explicit AAGUID policy, but the attestation path should not be treated as production-grade in the same way as other attested authenticators.

In practice, that means Windows Hello should usually live in its own pilot profile instead of being mixed immediately into your broad workforce design.

## The real failure pattern during passkey rollout

When passkey rollout fails, the symptom is usually “user cannot register.” The root cause is usually one of four different technical failures:

The first failure domain is scope. The user is not in a profile that actually allows the authenticator they are trying to use. Because the evaluation model is “satisfy at least one profile,” badly overlapping profiles can also create the opposite problem: the user is more permitted than the admin intended.

The second failure domain is bootstrap authentication. Microsoft requires the user to complete MFA within the prior five minutes before registration, as documented [here](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2). If that trust bootstrap is missing, the registration flow is denied even though the passkey profile itself is fine.

The third failure domain is authenticator trust. If attestation is enforced and the authenticator’s attestation cannot be validated, the flow fails. If key restrictions are enabled and the AAGUID is not permitted, the flow fails. Those are authenticator-identity failures, not user failures.

The fourth failure domain is feature-specific constraints, especially around Windows preview support. A team can have a correct general passkey design and still fail Windows registration because the required AAGUIDs were not explicitly allow-listed in the preview profile.

## A practical architecture pattern

The cleanest design pattern is to stop trying to make one passkey profile fit every use case.

For privileged populations, use a tightly controlled profile:

- device-bound only
- approved AAGUIDs only
- attestation enforced where supported

For broad workforce populations, use a separate profile aligned with Microsoft’s recommendation in the [synced passkey FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq):

- synced passkeys allowed
- minimal restriction unless there is a compliance requirement
- lower operational friction

For Windows Hello preview, use a dedicated pilot profile:

- explicitly allow the Windows Hello AAGUIDs Microsoft publishes
- enable key restrictions
- disable attestation for that profile during preview

This architecture is easier to reason about, easier to troubleshoot, and much safer to expand.

## Screenshot references

The specific policy screens this article is describing are shown in Microsoft’s documentation:

- [Passkey profile configuration and group targeting](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Windows Hello passkey profile and AAGUID requirements](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)

## Final takeaway

Microsoft Entra passkey policy is a trust framework, not a simple method toggle. Profiles decide who can use which passkey types. AAGUID decides whether the authenticator model is acceptable. Attestation decides how strongly Entra can trust the authenticator’s claimed identity. Windows Hello preview adds another provider-specific layer that needs its own policy treatment.

If you understand those relationships, passkey rollout becomes much more predictable. If you ignore them, the tenant quickly ends up with a design that looks enabled in the portal but behaves inconsistently in production.

## References

- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Frequently asked questions about synced passkeys](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq)
- [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
