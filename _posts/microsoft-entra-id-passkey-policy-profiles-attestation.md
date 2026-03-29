---
title: "Microsoft Entra ID: Passkey Policy Design, Profiles, AAGUID Restrictions, and Attestation"
excerpt: "A detailed technical guide to Microsoft Entra passkey policy, profile evaluation, AAGUID restrictions, attestation behavior, and rollout architecture."
coverImage: "/assets/blog/passkey-policy/cover.svg"
date: "2026-03-28T21:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-policy/cover.svg"
---

## Overview

Microsoft Entra passkey rollout often looks simple in the portal and unexpectedly complex in production. The reason is that passkey enablement is not a single toggle. It is a layered policy design that combines registration scope, passkey type, AAGUID restrictions, attestation requirements, and, in some scenarios, preview-specific platform behavior.

The primary Microsoft references are [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows), [Frequently asked questions about synced passkeys](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq), [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web), and [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor).

The most useful architectural mindset is to think of passkey configuration as **credential governance**, not just as sign-in method enablement. You are deciding which authenticators are allowed to issue credentials for which user populations and what evidence Microsoft Entra must receive before it trusts those credentials.

![Passkey policy design](/assets/blog/passkey-policy/cover.svg)

## What the passkey control plane is actually evaluating

When a user attempts to register a passkey, Microsoft Entra is not simply checking whether "passkeys are on." As described in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), the registration path evaluates several controls:

1. self-service registration must be enabled
2. the user must be targeted by an applicable passkey profile
3. the attempted authenticator must match the allowed passkey type
4. if key restrictions are enabled, the authenticator's AAGUID must be allowed
5. if attestation is enforced, the authenticator must provide a valid attestation statement that Microsoft can verify

That sequence explains why administrators often believe the feature is enabled while end users still cannot register. In production, passkey registration is allowed only if the attempted authenticator satisfies the full policy stack.

## How passkey profiles behave

Microsoft documents passkey profiles as group-targeted policy objects. In operational terms, a profile defines the kind of authenticator behavior Microsoft Entra is willing to accept for a given user population.

The important part is not merely that profiles exist. It is how they are evaluated. Microsoft notes that users can be targeted by multiple profiles and that evaluation order is not guaranteed. A passkey registration is accepted if it satisfies at least one applicable profile.

This has serious design implications:

1. broad profiles can unintentionally allow authenticators you meant to restrict
2. exception profiles can become more permissive than the main production design
3. privileged-account design can be undermined if admin users are still covered by a broader workforce profile

That is why profiles should be designed as deliberate policy personas rather than as ad hoc exceptions added over time.

## Device-bound and synced passkeys are different operating models

Microsoft's [synced passkey FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq) is especially helpful because it frames the decision in operational terms rather than in purely user-experience terms. Microsoft recommends synced passkeys for most standard users and device-bound passkeys for admins and highly privileged users.

That distinction is not cosmetic. It reflects a real difference in risk and lifecycle design.

Device-bound passkeys keep the credential anchored to a specific authenticator boundary. That usually makes the ownership model and recovery boundary easier to reason about for privileged identities. Synced passkeys reduce user friction, improve portability, and make account recovery more manageable for broad workforce rollout, but they also introduce more dependency on provider ecosystems and supported platform paths.

An architect should not ask "which option is modern?" The better question is "which credential lifecycle and trust boundary make sense for this user population?"

## What AAGUID restrictions really control

Microsoft uses the **Authenticator Attestation GUID (AAGUID)** as the enforcement primitive for authenticator restrictions. As described in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), the AAGUID identifies the authenticator model that is attempting to register.

This is important because Microsoft Entra is not enforcing policy against marketing names or vague vendor categories. It is enforcing against the authenticator identifier presented in the protocol flow.

That makes AAGUID restrictions powerful but easy to misuse. If you allow-list the wrong identifiers, the wrong authenticators are accepted. If you later remove an AAGUID from policy, Microsoft notes that existing passkeys associated with that authenticator can stop working. In other words, AAGUID policy is not only a registration-time decision. It is also an access-governance decision that can affect existing production credentials.

## What attestation changes

Attestation is one of the most important and least well understood parts of passkey governance. Microsoft's [attestation for passkey vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor) documentation explains that Microsoft uses FIDO metadata and authenticator-provided attestation statements to validate what kind of authenticator is being presented.

Operationally, attestation changes the trust quality of the registration event. Microsoft states in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) that when attestation is enforced, the authenticator must present a valid attestation statement. Microsoft also notes that if attestation is not enforced, Microsoft Entra cannot guarantee properties such as whether the credential should be classified as synced or device-bound.

That means disabling attestation is not just a compatibility choice. It is a trust tradeoff. You may gain broader compatibility, but you reduce the certainty that the registered authenticator has the properties your policy intended to enforce.

## Why Windows Hello needs separate treatment

The Windows-specific passkey guidance in [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) exists because Windows Hello is not simply another generic authenticator in this design. It has preview-specific requirements.

Microsoft documents that Windows Hello passkey rollout requires:

1. explicit allow-listing of the Windows Hello AAGUIDs
2. key restrictions to be enabled
3. attestation not to be enforced for those preview profiles

This is why mixing Windows Hello pilot behavior into a broad production profile is usually poor architecture. The profile requirements are different enough that the cleaner design is to isolate Windows Hello into its own pilot profile and treat it as a controlled rollout stream.

## Recommended profile architecture

Most tenants benefit from separating passkey policy into clear populations with clear trust objectives.

For privileged identities, the passkey profile should usually prefer device-bound authenticators, tightly controlled AAGUIDs, and stronger attestation requirements where Microsoft supports them. For standard workforce identities, synced passkeys usually provide the best balance of usability and phishing resistance, especially when the goal is broad adoption rather than maximal hardware control. For Windows Hello preview, a dedicated pilot profile is usually the safest design because the AAGUID and attestation requirements differ from the general production model.

The value of this model is not just cleaner configuration. It also produces cleaner troubleshooting. When each profile has a defined purpose, it becomes much easier to explain why a registration was allowed or blocked.

## Example policy screens

![Microsoft Entra passkey settings](/assets/blog/passkey-policy/ms-passkey-settings.png)
*Source: Microsoft Learn, [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2).*

![Default passkey profile in Microsoft Entra](/assets/blog/passkey-policy/ms-default-passkey-profile.png)
*Source: Microsoft Learn, [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2).*

![Windows Hello passkey profile configuration](/assets/blog/passkey-policy/ms-windows-passkey-profile.png)
*Source: Microsoft Learn, [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).*

## Key implementation points

1. Passkey rollout is a credential-governance design problem, not a single enablement toggle.
2. Profile overlap matters because multiple profiles can apply and evaluation order is not guaranteed.
3. AAGUID restrictions control authenticator model allow-listing at registration time and can also affect later sign-in viability.
4. Attestation changes the level of trust Microsoft Entra can place in the authenticator properties presented during registration.

## References

- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Frequently asked questions about synced passkeys](https://learn.microsoft.com/en-us/entra/identity/authentication/synced-passkey-faq)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [Microsoft Entra ID attestation for passkey (FIDO2) vendors](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
