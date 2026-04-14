---
title: "Passkey Registration"
excerpt: "A technical guide to Microsoft Entra passkey registration on Windows and mobile, with a focus on credential issuance, MFA bootstrap, platform differences, and backend policy checks."
coverImage: "/assets/blog/passkey-registration/cover.svg"
date: "2026-03-28T21:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-registration/cover.svg"
---

## Overview

Passkey registration in Microsoft Entra is often explained as a short user journey through the Security info page. That description is fine for a quick demo, but it is not enough for engineers. Registration is not just a UI event. It is a credential issuance workflow in which Microsoft Entra decides whether it is willing to bind a new public-key credential to the account.

The main references are [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey), [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS), [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2), and [Enable Microsoft Entra passkey on Windows devices (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).

![Passkey registration flow](/assets/blog/passkey-registration/cover.svg)

## What registration actually means

When a user registers a passkey, Microsoft Entra is not taking custody of a password replacement that it can later replay. The authenticator generates the key pair. The private key remains under the authenticator or platform provider. Microsoft Entra stores the public key and the registration metadata needed to validate future authentication assertions.

That makes registration a high-value event. The tenant is not simply adding a convenience setting. It is authorizing a new phishing-resistant credential that may later satisfy strong authentication requirements. This is why registration deserves the same design rigor as a privileged authentication-method rollout.

## Why recent MFA is required

Microsoft states in [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) that a user must have completed multifactor authentication within the previous five minutes before being allowed to register a passkey. This requirement is not arbitrary friction. It is an issuance control.

If passkey registration could occur after only a weak or stale session, an attacker who gained a partial foothold could potentially add a strong sign-in method and create persistence. By requiring a recent high-confidence authentication event, Microsoft Entra reduces that risk and ensures that registration happens only from a session it is willing to trust at a stronger level.

This is also why bootstrap planning matters. A user cannot move to passkeys cleanly if the tenant has no safe way to satisfy the recent-MFA prerequisite. Microsoft's documentation points administrators toward Temporary Access Pass as a bootstrap method because a strong credential issuance process has to start from an already trusted path.

## What happens in the backend

The backend sequence explains most of the strange behaviors administrators see during rollout. The user starts from Security info. Microsoft Entra checks whether self-service registration is enabled, whether the user is targeted by a compatible passkey profile, whether recent MFA is present, and whether the attempted authenticator satisfies the active profile's passkey type, AAGUID, and attestation rules.

Only if those checks succeed does the authenticator ceremony proceed. At that point, the authenticator creates the key pair or selects the existing provider-owned key path, and the public-key metadata is returned to Microsoft Entra. Entra stores that registration data so that later sign-in assertions can be validated against it.

Several important conclusions follow from this. Microsoft Entra never receives the private key. Security info is the orchestration surface, not the credential container. Two users can follow what looks like the same UI path and end up with different outcomes because the profiles, authenticator types, and policy rules in force are different. And many registration failures happen before the authenticator is fully accepted, which is why the user-facing error can look generic even when the real issue is very specific.

## Registration on Windows

Windows gets separate documentation because Microsoft's [Windows passkey guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows) uses Windows Hello as the passkey provider. In that scenario, the key material is stored in the Windows Hello container and the authenticator properties presented during registration are those associated with Windows Hello.

That means the tenant policy must explicitly support the Windows path. Microsoft documents that the relevant Windows Hello AAGUIDs must be allow-listed, key restrictions must be enabled, and attestation must not be enforced for that preview profile. This is one of the clearest examples of why registration has to be understood as control-plane evaluation rather than as a simple button click.

A user can be on a fully supported Windows device, see the passkey registration UI, and still fail because the tenant policy does not trust the authenticator identity Windows is presenting. The user experience looks like a registration issue. The backend reality is a policy mismatch.

## Registration on iPhone

The iPhone flow documented in [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS) is useful because it shows that the phone is not always the actual credential host. In some cases, the phone is the platform holding the passkey. In other cases, it is the browser and transport surface for an external authenticator such as a hardware key.

That distinction matters in troubleshooting. If the browser renders correctly and the user reaches the expected step but the registration still fails, the issue may not be the Security info experience or the phone itself. The problem may be authenticator compatibility, AAGUID restrictions, attestation, or the transport between the phone and the authenticator boundary.

This is why support teams should avoid using the phrase "mobile registration" as if it identifies the true trust anchor. Sometimes the mobile device is the authenticator. Sometimes it is only the UI surface through which another authenticator is being used.

## Registration on Android

The Android guidance in Microsoft's mobile registration documentation follows the same control-plane logic, but the user experience can vary more visibly because device vendors, browser combinations, and platform passkey implementations vary. The engineering model, however, stays the same. Microsoft Entra still evaluates the same prerequisites before it accepts the credential.

That means it is more useful to understand the decision path than to memorize every Android screen sequence. The user must still satisfy recent MFA. The user must still be in scope for an applicable profile. The attempted authenticator must still satisfy passkey type, AAGUID, and attestation requirements. UX differences on Android do not change the backend trust model.

## Failure patterns that actually matter

Once you understand registration as credential issuance, most failures become easier to classify. Policy-scope failure means the user is not targeted by a compatible profile or the attempted passkey type is not allowed. Bootstrap failure means the user cannot satisfy the recent-MFA requirement, often because the tenant has not planned a Temporary Access Pass or equivalent bootstrap path. Authenticator-governance failure means the AAGUID is not allowed or attestation cannot be validated as required. Platform mismatch means the user selected a path the tenant did not actually design around.

These categories are much more useful than a generic "passkeys do not work" label because each one points to a different owner and a different remediation path. Scope issues belong to policy design. Bootstrap issues belong to authentication-method lifecycle planning. Authenticator-governance issues belong to passkey profile engineering. Platform mismatch belongs to rollout design and user guidance.

## Example registration screens

![Add passkey flow in Security info](/assets/blog/passkey-registration/ms-add-passkey.png)
*Source: Microsoft Learn, [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey).*

![Windows Hello passkey profile and AAGUID configuration](/assets/blog/passkey-policy/ms-windows-passkey-profile.png)
*Source: Microsoft Learn, [Enable Microsoft Entra passkey on Windows devices (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows).*

## Key implementation points

1. Passkey registration is a credential issuance workflow, not a lightweight user preference change.
2. Recent MFA is part of the issuance trust model and should be treated as a hard design prerequisite.
3. Windows, iPhone, and Android may present different ceremony behavior, but Microsoft Entra still applies the same core policy logic.
4. Most registration failures become understandable once they are classified as scope, bootstrap, authenticator-governance, or platform-path issues.

## References

- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register a passkey using a mobile device](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-mobile?tabs=iOS)
- [How to enable passkeys (FIDO2) in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2)
- [Enable Microsoft Entra passkey on Windows devices (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-entra-passkeys-on-windows)
- [Passkey (FIDO2) authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility?tabs=web)
- [John Savill video reference](https://www.youtube.com/watch?v=e0FPn-gJeO4)
