---
title: "Microsoft Entra ID: Troubleshoot Missing Passkey Registration Options"
excerpt: "Technical troubleshooting for when Passkey (FIDO2) does not appear in Security info or Microsoft Authenticator, including Authentication Methods policy, MFA bootstrap, platform support, and authenticator constraints."
coverImage: "/assets/blog/passkey-not-showing/cover.svg"
date: "2026-03-27T21:40:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkey-not-showing/cover.svg"
---

## Scope of the failure

This article is about one specific failure pattern:

- the user goes to **Security info**
- the user expects to add **Passkey**
- the option is missing, blocked, or never completes registration

That failure is usually not caused by "passkeys being broken." In Microsoft Entra ID, passkey registration depends on several independent control points:

- [Authentication Methods policy](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage)
- the [passkey registration flow](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- a valid [strong-authentication bootstrap path](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass)
- the supported platform and authenticator combination documented in the [passkey compatibility matrix](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility)

When the option is missing, the useful question is not "does this device support passkeys in general?" The useful question is:

**At which layer did Entra stop offering or accepting the registration path?**

## How the registration path actually works

As documented in [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey), browser-based registration starts in **Security info**. The user selects **Add sign-in method**, chooses **Passkey**, and must satisfy MFA before registration continues. Microsoft explicitly states there that if the user does not already have at least one MFA method, they must add one first, or an admin can issue a [Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass) to bootstrap strong authentication.

That sequence matters because it tells you where the control-plane checks happen:

1. Entra determines whether the user is allowed to configure passkeys.
2. Entra checks whether the user can strongly authenticate.
3. The browser and operating system decide which passkey storage options to show.
4. The selected authenticator path succeeds or fails based on platform support and policy.

If any one of those stages fails, the user experiences the same vague symptom: "I don’t see passkey."

![Passkey registration dependency map](/assets/blog/passkey-not-showing/cover.svg)

## Root cause 1: the user is not enabled for Passkey (FIDO2)

The first check should be the [Authentication Methods policy](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage), not the mobile device.

As Microsoft describes in the Authentication Methods management documentation, each method is enabled and targeted independently. If **Passkey (FIDO2)** is disabled for the user or group, Security info does not have to present the method at all.

### What to verify

1. Open **Entra admin center > Protection > Authentication methods > Policies**.
2. Open **Passkey (FIDO2)**.
3. Confirm the user is in scope through direct or group targeting.
4. If passkey profiles are in use, confirm the effective profile still allows the intended authenticator.

### Why this breaks registration

This is a control-plane denial, not a device failure. The user never reaches a valid passkey enrollment path because Entra does not consider the method available for that identity. The frontend symptom is "the option is missing," but the backend reality is that the tenant never exposed the capability to that principal.

## Root cause 2: the user cannot satisfy the MFA prerequisite

Microsoft states in [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) that the user must sign in with MFA before adding a passkey. Microsoft also documents in [Configure Temporary Access Pass to register passwordless authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass) that TAP is specifically intended to bootstrap passwordless methods such as passkeys.

### What to verify

1. Confirm the user already has at least one usable MFA method.
2. If not, issue and test a Temporary Access Pass.
3. Re-run registration through Security info after the user can strongly authenticate.

### Why this breaks registration

Passkeys are not universally the first method in the lifecycle. In many tenants, the failure is simply that the rollout design skipped the bootstrap requirement documented by Microsoft.

## Root cause 3: the browser or operating system does not expose the expected storage options

Microsoft notes in [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) that the options shown during registration vary by device and operating system. The [passkey compatibility matrix](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility) is therefore not a side note. It is part of the registration control path.

### What to verify

1. Identify whether the user is attempting:
   - a same-device passkey
   - cross-device registration
   - registration on a physical FIDO2 key
2. Compare the exact browser, operating system, and authenticator combination against the [Microsoft matrix](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility).
3. If the matrix does not support the exact combination, stop troubleshooting policy and switch to a supported path.

### Why this breaks registration

The registration UX is built on platform capabilities. If the local platform does not expose a supported passkey path, Entra cannot force the missing option to appear.

## Root cause 4: Microsoft Authenticator passkeys are being attempted on an unsupported mobile path

Microsoft’s [Enable passkeys in Authenticator](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-enable-authenticator-passkey) and [Authenticator passkey FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-authenticator-faq) are explicit about platform expectations.

Two details matter operationally:

- Microsoft documents **iOS 17+** and **Android 14+** for supported Authenticator passkey scenarios.
- Microsoft documents that on Android, Authenticator stores the private key only if the device has secure hardware available through Android Keystore, specifically a **Secure Element (SE)** or **Trusted Execution Environment (TEE)**.

### What to verify

1. Check the device OS version against the current Microsoft documentation.
2. If Android is involved, confirm the problem is not tied to device hardware capability.
3. If you need a fast isolation test, attempt the same user registration with a supported FIDO2 security key.

### Why this breaks registration

This is not an Entra policy problem. It is a local authenticator capability problem. The registration path reaches the authenticator, but the authenticator cannot create or store the credential in the manner Microsoft requires. Once you are in that failure mode, changing directory policy is usually noise; the real decision is whether to change device, browser path, or authenticator type.

## Root cause 5: attestation or passkey profile policy rejects the authenticator

If the tenant uses [passkey profiles](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkey-profiles) or attestation-related restrictions, the failure may be intentional. Microsoft documents there that profiles can control the target passkey type and authenticator characteristics.

### What to verify

1. Review whether the pilot group is scoped to a passkey profile.
2. Review whether attestation or AAGUID restrictions narrow the allowed authenticators.
3. Compare the user’s attempted authenticator against the profile design.

### Why this breaks registration

The user is not failing because registration is generically unavailable. The user is failing because the selected authenticator does not satisfy the tenant’s allowed authenticator model.

## Root cause 6: the admin is mixing sign-in support with registration support

This is a frequent design error. A browser or device can be usable for some Entra sign-in scenarios and still be the wrong path for the specific passkey registration flow being attempted.

Microsoft states in [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) that the save-location options vary by platform. Microsoft separately documents exact support combinations in the [compatibility matrix](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility). Those two sources together imply an important troubleshooting rule:

**do not infer registration support from generic sign-in success**

## Recommended diagnostic sequence

Use this order:

1. Confirm the user is targeted for **Passkey (FIDO2)** in [Authentication Methods policy](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage).
2. Confirm the user can meet the MFA prerequisite or has a valid [Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass).
3. Confirm whether the intended path is Authenticator, hardware key, same-device, or cross-device registration.
4. Validate the exact browser and OS combination against the [passkey compatibility matrix](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility).
5. If Authenticator on Android is involved, validate OS version and secure-hardware support using the [Authenticator FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-authenticator-faq).
6. If profiles or stricter authenticator controls are in use, validate the selected authenticator against the [passkey profiles documentation](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkey-profiles).

That diagnostic order follows Microsoft’s documented control flow instead of guessing at symptoms.

## Final takeaway

When the passkey option is missing, the failure is usually one of four documented causes:

- the method is not enabled for the user
- the user cannot satisfy the MFA bootstrap requirement
- the platform path is unsupported
- the selected authenticator does not satisfy the tenant’s passkey policy

Treat it as a registration pipeline problem, not as a generic "passkeys are broken" problem.

## Microsoft References

- [Manage authentication methods for Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Configure Temporary Access Pass to register passwordless authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [Enable passkeys in Authenticator](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-enable-authenticator-passkey)
- [Passkeys in Microsoft Authenticator FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-authenticator-faq)
- [Passkey authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility)
- [Enable passkey (FIDO2) profiles in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkey-profiles)
