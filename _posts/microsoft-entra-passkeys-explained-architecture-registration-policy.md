---
title: "How Passkeys Work in Entra"
excerpt: "A technical guide to Microsoft Entra passkeys for administrators, including passkey types, registration flows, Authentication Methods policy, Conditional Access, and deployment design."
coverImage: "/assets/blog/passkeys-explained/cover.svg"
date: "2026-03-27T20:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkeys-explained/cover.svg"
---

## Why Microsoft Entra passkeys matter

Passkeys are easy to describe badly. A lot of tenant discussions reduce them to "passwordless sign-in" or "better MFA," which misses the engineering reality.

In Microsoft Entra ID, passkeys are a phishing-resistant authentication method built on FIDO2 and WebAuthn. They change:

- how a credential is created
- where the private key lives
- how sign-in challenges are satisfied
- what policy controls registration and use
- what recovery and rollout models are viable

If you are an Entra administrator, the important question is not just whether passkeys are more secure than passwords. The important question is whether you understand the control plane well enough to deploy them without locking users out or creating a support burden you did not expect.

This article is written as a top-to-bottom technical explainer for administrators, architects, and engineers.

## The core architecture: what a passkey actually is

At a protocol level, a passkey is a FIDO2 credential backed by an asymmetric key pair:

1. A user starts registration with Microsoft Entra ID.
2. The authenticator creates a public-private key pair.
3. The private key remains in the authenticator.
4. The public key and metadata are registered with Entra.
5. At sign-in, Entra sends a challenge.
6. The authenticator signs that challenge after local user verification, such as biometrics or PIN.
7. Entra validates the signed response against the registered public key.

This matters because it explains the two security properties admins care about most:

- the secret is not replayed to Entra the way a password is
- the authenticator is bound to the relying party, so a phishing site cannot simply trick the user into typing the credential into the wrong place

That is why Microsoft classifies passkeys as phishing-resistant authentication.

## Passkey types in Microsoft Entra

Microsoft's current Entra documentation distinguishes between device-bound and synced passkeys.

| Passkey type | Where the private key lives | Typical examples | Operational tradeoff |
| --- | --- | --- | --- |
| Device-bound passkey | On one authenticator or one device | FIDO2 security key, Microsoft Authenticator-backed passkey | Strong control, but more device dependency |
| Synced passkey | Synced by a passkey provider | Apple, Google, or third-party provider models where supported | Easier recovery and mobility, but requires careful policy choices |

The compatibility matrix and most broadly deployed Entra guidance still center on device-bound passkeys. Microsoft also has newer documentation for synced passkeys and passkey profiles in preview. That means administrators should be careful not to mix general-availability assumptions with preview design choices.

The safe engineering model is:

- device-bound passkeys are the baseline production model to understand first
- synced passkeys introduce additional provider and governance questions

## Why passkeys are not just "another MFA method"

Passkeys are not only about user convenience. They affect the whole identity path:

- registration experience
- authenticator trust
- supportability by browser and operating system
- Conditional Access enforcement
- recovery after lost or replaced devices
- rollout for admins, developers, contractors, and frontline workers

That is why the strongest Entra passkey projects treat passkeys as architecture, not as a button added to the sign-in page.

## What has to be true before a user can register a passkey

### 1. Authentication Methods policy must allow passkeys

If Passkey (FIDO2) is not enabled for the right users in Authentication Methods policy, registration does not matter what device the user has. The credential will not be offered or will fail to register.

Microsoft also documents self-service setup controls. If self-service setup is off, users cannot simply go into Security info and add the method themselves.

### 2. The user must satisfy strong authentication first

Microsoft requires MFA before passkey registration. In real tenant operations, that means passkeys are often not the very first credential a user ever touches.

Typical bootstrap patterns are:

- existing MFA method
- Temporary Access Pass
- admin-assisted setup during enrollment

This is one of the most common planning errors in passkey rollouts. Teams sometimes try to enforce passkeys before they have solved the first-registration problem.

### 3. The platform and authenticator have to be supported

Support depends on the exact combination of:

- browser
- operating system
- authenticator type
- mobile or desktop app path
- same-device or cross-device sign-in

Microsoft maintains a compatibility matrix for exactly this reason. Do not assume that because a passkey works in one consumer website flow it will behave the same way in Microsoft Entra.

## Registration models you should understand

### FIDO2 security keys

Security keys remain one of the cleanest operational models in Entra for:

- privileged admins
- shared workstations
- kiosk and frontline scenarios
- organizations that want explicit hardware inventory and attestation decisions

The operational upside is predictability. The downside is logistics: users can lose them, and you need a replacement and recovery model.

### Microsoft Authenticator passkeys

Microsoft Authenticator supports device-bound passkeys and stores the private key in platform-protected hardware:

- Secure Enclave on iOS
- Android secure hardware via Android Keystore where supported

This is one of the most important engineering details in the Microsoft FAQ because it explains why some Android devices fail registration even when the user appears to be doing everything right. If the device does not meet the secure-hardware expectations, registration may fail.

Microsoft's current Authenticator documentation also calls out minimum platform versions, including iOS 17 and Android 14 for supported Authenticator passkey scenarios.

### Synced passkeys

Microsoft has preview documentation for synced passkeys and passkey profiles. These flows are attractive because they can reduce recovery friction and help users move across devices more easily.

But synced passkeys also move the conversation from "what device has the credential?" to "which provider and trust model are we comfortable allowing for this group?"

That is a governance decision, not only a user-experience decision.

## How sign-in works in practice

There are three sign-in patterns administrators should reason about separately:

- same-device sign-in
- cross-device sign-in
- sign-in with a physical FIDO2 security key

### Same-device sign-in

The authenticator and the sign-in session live on the same device. This is usually the simplest operational path because it minimizes transport dependencies and user confusion.

### Cross-device sign-in

Cross-device sign-in usually starts on one device and completes using a passkey stored on another device, often through a QR flow.

This is where support cases start to appear, because Microsoft documents explicit prerequisites:

- Bluetooth has to be enabled on both devices
- both devices need internet connectivity
- required platform endpoints need to be reachable

If one of those conditions is not satisfied, the user often experiences the vague symptom "it hangs while connecting to my device."

### Security-key sign-in

This remains the most explicit and easiest-to-reason-about model because the authenticator is obvious, portable, and usually less dependent on mobile-app state.

## Authentication Methods policy versus Conditional Access

One of the most important Entra design concepts is the separation between capability and enforcement.

| Layer | What it controls |
| --- | --- |
| Authentication Methods policy | Whether users are allowed to register and use passkeys |
| Conditional Access with authentication strengths | Where passkeys or phishing-resistant auth are required |

Many rollout mistakes come from collapsing those two layers into one.

Examples:

- enabling passkeys does not force users to use them
- requiring phishing-resistant authentication for an app does not by itself solve user bootstrap
- a user can be allowed to register but still fail sign-in to a protected app if Conditional Access demands more than the current path satisfies

That distinction should shape how you pilot and enforce passkeys.

## Authentication strengths: where passkeys become strategically useful

Passkeys become truly valuable in Entra when you combine them with Conditional Access authentication strengths.

That lets you do things like:

- require phishing-resistant auth for admin portals
- require stronger authentication for sensitive apps
- allow broader access paths for standard users while tightening privileged paths

This is also the right way to think about enforcement. Do not start by forcing passkeys onto everything. Start by identifying resources and personas where phishing-resistant authentication actually reduces material risk.

## Attestation and passkey profiles

Microsoft's newer Entra documentation adds more depth around passkey profiles and attestation-related control.

From an engineering standpoint, these features matter because they let you control:

- what kind of passkey is being targeted
- whether attestation is required
- which authenticators are permitted by AAGUID-based rules

That is powerful, but it also increases rollout complexity. Every time you tighten attestation or authenticator restrictions, you reduce ambiguity and potentially increase trust, but you also increase the chance of failed registration for users on unsupported paths.

The right question is not "should we turn this on?" The right question is "which population needs this assurance, and what registration friction are we willing to accept for them?"

## Same design problem every mature rollout eventually hits: recovery

Passkeys improve phishing resistance, but they do not eliminate lifecycle work.

You still need a documented answer for:

- lost phone
- replaced laptop
- lost or damaged security key
- stale credential left on an old device
- bootstrap for a brand-new user

If you do not define recovery and re-registration early, your passkey project turns into a help-desk project.

Temporary Access Pass, secondary methods, and controlled registration lanes all matter here.

## A practical rollout model for Microsoft Entra passkeys

For most tenants, a sensible passkey rollout looks like this:

1. Identify your first pilot populations.
2. Define the recovery and break-glass model before broad rollout.
3. Enable Passkey (FIDO2) in Authentication Methods policy for a narrow group.
4. Decide which authenticators are allowed in the pilot.
5. Validate the current Microsoft compatibility matrix for the devices and apps that group actually uses.
6. Test registration, same-device sign-in, and cross-device sign-in separately.
7. Use authentication strengths to enforce passkeys only where the risk reduction justifies it.
8. Review sign-in logs and help-desk issues before widening the scope.

This is much safer than flipping a tenant-wide setting and discovering later that your contractor, BYOD, or mobile-registration path does not work.

## Common admin misunderstandings

### "Passkeys are just a cleaner UX for MFA"

No. They are a phishing-resistant authenticator model with different protocol, device, and policy behavior.

### "If Authenticator is installed, passkeys will work"

No. Device support, operating system version, secure hardware, and policy all matter.

### "Once passkeys are enabled, they will be used everywhere"

No. Support depends on the exact browser, OS, application, and authenticator combination.

### "If I enable passkeys, I have enforced passkeys"

No. Enforcement is a Conditional Access and authentication strengths problem.

### "Cross-device sign-in is just another way to show the same screen"

No. It has Bluetooth, connectivity, and endpoint dependencies that same-device sign-in does not.

## Final takeaway

The best mental model for Microsoft Entra passkeys is this:

passkeys are not a cosmetic sign-in enhancement. They are a control plane that spans authenticator hardware, registration policy, Conditional Access strategy, compatibility constraints, and recovery design.

If you understand those layers, you can roll out passkeys confidently. If you ignore them, the first wave of failures will look random even though they are usually completely explainable.

## Microsoft References

- [Passkeys (FIDO2) authentication method in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-authentication-passwordless)
- [Enable passkeys (FIDO2) for your organization](https://learn.microsoft.com/en-us/azure/active-directory/authentication/howto-authentication-passwordless-security-key)
- [Enable passkeys in Authenticator](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-enable-authenticator-passkey)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register a passkey with a FIDO2 security key](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-with-security-key)
- [Sign in with a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-sign-in-passkey)
- [Sign in with passkeys in Authenticator for Android and iOS](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-sign-in-passkey-authenticator)
- [Passkey support in Microsoft Authenticator FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-authenticator-faq)
- [Support passkeys in Authenticator in your Microsoft Entra tenant](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-support-authenticator-passkey)
- [Passkey authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility)
- [Enable synced passkeys (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-synced-passkeys)
- [Enable passkey profiles (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkey-profiles)
