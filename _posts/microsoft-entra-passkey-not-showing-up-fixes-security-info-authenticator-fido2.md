---
title: "Microsoft Entra Passkey Not Showing Up? Fix Security Info, Authenticator, and FIDO2 Registration"
excerpt: "A technical troubleshooting guide for when the passkey option is missing in Microsoft Entra Security info or Microsoft Authenticator, including policy scope, MFA prerequisites, platform support, and FIDO2 registration issues."
coverImage: "/assets/blog/passkey-not-showing/cover.svg"
date: "2026-03-27T21:40:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-not-showing/cover.svg"
---

## Why this issue is more common than it looks

One of the most frustrating Microsoft Entra passkey problems is also one of the least descriptive:

- the **Passkey** option is missing in **Security info**
- the user cannot add a passkey in **Microsoft Authenticator**
- the device supports passkeys in general, but Entra does not offer the method

This problem usually is not caused by a single bug. It is usually the result of a missing prerequisite somewhere in the chain:

- Authentication Methods policy
- self-service setup scope
- MFA bootstrap
- device and operating system support
- authenticator type
- browser path

If you break the problem down in that order, it becomes predictable.

## Start with the control plane, not the user’s phone

When a user says the passkey option is not available, many admins start by looking at the device. That is often too late in the sequence.

The first question is:

**Is the user allowed to register a passkey in the tenant at all?**

In Microsoft Entra, passkeys are controlled through **Authentication Methods policy**. If Passkey (FIDO2) is disabled, or the user is not in the targeted group, the option may never appear no matter how new the device is.

## Root cause 1: Passkey (FIDO2) is not enabled for the user

Passkeys in Entra are not just turned on by default for every user. An admin has to enable the method and target the right users or groups.

What to verify:

1. Go to **Entra ID > Security > Authentication methods > Policies**.
2. Open **Passkey (FIDO2)**.
3. Confirm the user is in scope through direct or group targeting.
4. Confirm the policy changes were saved and have propagated.

If the tenant is also using **passkey profiles (preview)**, verify that the relevant passkey type and targeting logic still allows the user’s scenario.

## Root cause 2: self-service setup is disabled

Even when passkeys are enabled, a user may still be blocked from registering them through the standard Security info experience if self-service setup is off.

This is one reason two users in the same tenant can report different experiences. One may be in the correct group and setup path, while another is not.

What to verify:

- whether self-service registration is enabled for the target population
- whether the user is expected to register independently or only through a managed rollout path

## Root cause 3: the user does not have a valid MFA bootstrap method

Microsoft requires MFA before a passkey can be registered.

That means passkeys are often **not** the first method a user can ever set up. If the user has no existing MFA method, or their current method is unavailable, the passkey flow can stall before registration starts.

This is a very common misunderstanding in greenfield rollouts. Teams want to move straight to passkeys, but the user still needs a strong bootstrap path first.

Practical fixes:

- keep one existing MFA method available during rollout
- use **Temporary Access Pass** for first-time setup and recovery
- document the bootstrap path clearly for help desk and onboarding teams

## Root cause 4: the device is not on a supported platform path

Passkey support in Entra is not simply "does this phone support passkeys?"

You need the exact combination of:

- operating system
- browser
- Authenticator version and scenario
- same-device or cross-device flow
- security key or Authenticator-backed passkey

Microsoft’s current Authenticator guidance is explicit:

- **iOS 17+**
- **Android 14+**

If the device does not meet that baseline, troubleshooting policy alone will not fix it.

## Root cause 5: the user is trying the wrong registration path

There are multiple registration paths in Microsoft Entra:

- browser-based **Security info**
- **Microsoft Authenticator** direct setup on mobile
- registration with a **physical FIDO2 security key**
- cross-device registration from another device

The user may be trying a path that is not supported for their device or browser combination.

Examples:

- a same-device browser path on a phone that does not satisfy the current support rules
- an Authenticator path on a device that lacks the required secure hardware
- a cross-device flow that fails because Bluetooth or connectivity is unavailable

For troubleshooting, it helps to test in this order:

1. direct Authenticator registration on a supported mobile device
2. Security info in a supported browser
3. a known-good FIDO2 security key

That quickly tells you whether the issue is tied to the authenticator model or the user’s policy scope.

## Root cause 6: Android secure hardware is missing

This is one of the highest-value checks for mobile passkey issues.

Microsoft’s Authenticator FAQ states that Authenticator-backed passkeys on Android rely on secure hardware through Android Keystore, preferring:

- Secure Element (SE)
- Trusted Execution Environment (TEE)

If the device lacks those protections, the passkey may not be stored and registration can fail or never complete properly.

That means some Android devices will behave as if Entra passkeys are broken when the real issue is the device security capability.

## Root cause 7: attestation or passkey profile policy is narrowing what is allowed

If your tenant is using:

- attestation enforcement
- AAGUID restrictions
- passkey profiles

then the tenant might be intentionally rejecting certain authenticators or passkey types.

That is not necessarily a bad configuration. It just means the admin needs to match the expected authenticator to the policy design.

This matters especially when one user can register with a hardware key while another cannot register with a mobile passkey provider.

## Root cause 8: the browser is supported for sign-in, but not for device-bound policy checks

Admins often assume that if a browser can sign in to Entra, it can also satisfy all device-based policy requirements during registration and sign-in. That is not always true.

Microsoft maintains a browser support matrix for device-based Conditional Access and related device identification flows. The user may be in a browser path that is fine for basic web auth but not for the device-based behavior your policy requires.

This is especially important on:

- iOS
- macOS
- non-Edge browsers
- private browsing sessions

## A step-by-step diagnostic flow

If the passkey option is missing, use this order:

1. Confirm the user is targeted in **Passkey (FIDO2)** Authentication Methods policy.
2. Confirm self-service registration is enabled if the user is expected to self-enroll.
3. Confirm the user has an MFA bootstrap method or Temporary Access Pass.
4. Check whether the scenario is **Authenticator**, **security key**, or another passkey path.
5. Check the operating system version against current Microsoft guidance.
6. Check the browser and registration flow against the support matrix.
7. If Android Authenticator is involved, validate secure hardware support.
8. If the tenant uses attestation or passkey profiles, confirm the authenticator is still allowed.

That sequence is far more effective than testing random combinations until something works.

## Recommended rollout pattern

To reduce passkey-not-showing incidents in production:

1. Pilot with a narrow group.
2. Publish one supported registration path first.
3. Document the supported device and OS combinations.
4. Keep Temporary Access Pass available for bootstrap and recovery.
5. Add stricter passkey profile or attestation logic only after the baseline path works reliably.

Most passkey confusion comes from trying to roll out every passkey type and every registration method at once.

## Final takeaway

If the Microsoft Entra passkey option is missing, the problem usually is not mysterious. It almost always comes back to one of these:

- policy scope
- self-service setup
- MFA bootstrap
- platform support
- authenticator support
- stricter passkey policy than the admin realized

Treat the problem as a control-plane check first and a device check second.

## Microsoft References

- [Enable passkeys in Authenticator](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-enable-authenticator-passkey)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Register passkeys in Authenticator on Android and iOS devices](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-authenticator)
- [Passkeys in Microsoft Authenticator FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-authenticator-faq)
- [Manage authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage)
- [Passkey authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility)
- [How to enable passkey (FIDO2) profiles in Microsoft Entra ID (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkey-profiles)
