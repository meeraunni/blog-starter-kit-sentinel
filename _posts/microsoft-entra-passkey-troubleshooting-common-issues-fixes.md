---
title: "Passkey Troubleshooting Guide"
excerpt: "A technical troubleshooting guide for Microsoft Entra passkeys covering registration failures, Conditional Access loops, Bluetooth issues, orphaned passkeys, compatibility gaps, and Authenticator-specific problems."
coverImage: "/assets/blog/passkeys-troubleshooting/cover.svg"
date: "2026-03-27T20:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/passkeys-troubleshooting/cover.svg"
---

## Why passkey troubleshooting in Entra feels harder than it should

Passkeys in Microsoft Entra are usually reliable when all layers align. When they do not, the failure is often surfaced as a vague user complaint:

- "It keeps saying connecting to your device."
- "The passkey option never shows up."
- "I registered it yesterday and now it is gone."
- "Conditional Access is blocking setup."
- "It works in one place but not another."

The reason these incidents feel messy is that passkey behavior depends on multiple systems at the same time:

- Authentication Methods policy
- Conditional Access
- authenticator type
- browser and operating system support
- same-device versus cross-device flow
- lifecycle state of the credential itself

This guide is designed as a troubleshooting playbook for administrators. It uses Microsoft documentation as the primary source and then adds the recurring field patterns that show up in real tenant incidents.

## First question: what stage is actually failing?

Before you debug anything else, identify the failing stage. Most passkey issues land in one of these buckets:

1. The user cannot see or start registration.
2. Registration starts but fails.
3. Registration succeeded, but sign-in fails.
4. Cross-device sign-in fails or hangs.
5. The credential exists locally but not in Entra.
6. The scenario is simply unsupported for the exact app, browser, or device combination.

If you skip this stage split, you lose time on the wrong layer. A Bluetooth issue looks nothing like a Conditional Access policy issue even if the user describes both as "passkey isn't working."

## Problem 1: the user cannot register a passkey at all

### Typical symptoms

- No passkey option appears in Security info.
- The user is told they cannot add the method.
- The setup path fails immediately before an authenticator prompt appears.

### Likely root causes

#### Passkey (FIDO2) is not enabled for the user

This is still the first thing to check. If Authentication Methods policy does not allow passkeys for the target user or group, the rest of the troubleshooting does not matter.

#### Self-service registration is disabled

Microsoft documents self-service setup as a separate control. If it is off, users may not be allowed to register through the standard Security info path.

#### The user cannot satisfy the bootstrap requirement

Microsoft requires strong authentication before passkey registration. If the user does not have a valid existing method or Temporary Access Pass, registration can stall before it really starts.

### What to check

1. Confirm the user is in scope for Passkey (FIDO2) in Authentication Methods policy.
2. Confirm self-service registration is allowed for that population.
3. Confirm the user has a valid bootstrap method, such as MFA or Temporary Access Pass.

## Problem 2: Microsoft Authenticator registration fails on some phones but not others

### Typical symptoms

- Registration works for one Android user and fails for another.
- The Authenticator flow starts and then stops without a clear explanation.
- The same policy seems fine, but device results are inconsistent.

### Likely root causes

#### Unsupported platform level

Microsoft's current Authenticator passkey documentation calls out minimum platform versions, including Android 14 and iOS 17 for supported Authenticator passkey scenarios. If the device is below that line, troubleshooting the tenant is the wrong move.

#### Missing secure hardware on Android

Microsoft's Authenticator FAQ explains that Android storage for passkeys depends on secure hardware through Android Keystore. Devices without the required hardware path may fail registration even when the user is otherwise doing the right thing.

This is one of the highest-value checks in passkey troubleshooting because it explains the very common complaint: "Why does it work on one Android phone but not mine?"

#### Attestation-related constraints

If your tenant is using attestation or authenticator restrictions, not every authenticator path will behave the same way. Some flows that feel normal to the user are no longer allowed by policy.

### What to check

1. Confirm the device version meets Microsoft's current support guidance.
2. Confirm whether the failed device is using supported secure hardware.
3. Review whether attestation, AAGUID restrictions, or passkey profiles are narrowing allowed authenticators.
4. Test the same user with a known-good FIDO2 security key to separate user policy issues from device issues.

## Problem 3: cross-device sign-in hangs on "connecting to your device"

### Typical symptoms

- The QR flow starts but never completes.
- The user scans the code and then waits forever.
- The session hangs at "connecting to your device."

### Why this happens

Microsoft documents explicit prerequisites for cross-device registration and sign-in:

- Bluetooth must be enabled on both devices
- both devices must have internet connectivity
- required platform endpoints must be reachable

In real-world passkey rollouts, the "connecting to your device" symptom shows up repeatedly when one of those dependencies is missing or unreliable. The user sees one symptom, but the failure can be anywhere in Bluetooth pairing, device-to-device transport, or outbound endpoint reachability.

### What to check

1. Confirm Bluetooth is on for both devices.
2. Confirm both devices have working internet access.
3. Confirm required endpoints are not blocked by proxy, DNS filtering, firewall, or mobile restrictions.
4. Re-test with same-device sign-in or a hardware key to determine whether the issue is specifically cross-device.

## Problem 4: Conditional Access blocks registration or creates a bootstrap loop

### Typical symptoms

- The user starts registration and gets blocked by policy.
- A BYOD mobile device is required to be compliant before the passkey can be created.
- A user is forced into passkey-based enforcement before they have a passkey.

### Why this happens

This is one of the most common deployment mistakes discussed in admin forums. The registration flow itself still has to pass through the tenant's access controls. If your registration path does not satisfy the same Conditional Access requirements as normal sign-in, the user gets trapped in a setup loop.

Typical examples:

- compliant-device requirement on a personal phone
- approved-client-app rule that conflicts with the registration experience
- phishing-resistant enforcement applied before the user has completed registration

One recurring field pattern is the "chicken and egg" problem: users are required to use passkeys everywhere before they have completed initial setup on a new phone or new account.

### What to check

1. Review the failed registration sign-in in Entra sign-in logs.
2. Identify which app and client path were actually used.
3. Identify which Conditional Access policies applied.
4. Create a controlled bootstrap lane if needed, such as Temporary Access Pass, pilot exclusions, or a dedicated registration path.

## Problem 5: the passkey exists on the device, but Entra does not recognize it

### Typical symptoms

- The user insists the passkey is already there.
- The authenticator offers a credential, but Entra rejects it.
- The passkey is no longer listed in Security info.

### Root cause: orphaned passkey

Microsoft documents orphaned passkeys as a real lifecycle issue. The local passkey can remain on the device even when the Entra-side registration no longer exists or no longer matches what Entra expects.

This often happens after:

- the passkey is deleted from Security info
- the authenticator entry is cleaned up only on one side
- the user changes devices or reenrolls incompletely

### What to check

1. Remove the stale local passkey from the device or passkey manager.
2. Confirm the Entra method entry is removed or corrected.
3. Register a fresh credential cleanly.

Whenever a user says "the passkey is there but the service says no," think orphaned credential early.

## Problem 6: Android work profile and personal profile behavior is inconsistent

### Typical symptoms

- The user can sign in from one profile but not the other.
- Passkey prompts appear inconsistently on the same phone.
- Work apps and browser sign-in do not behave the same way.

### Why this happens

Microsoft's support guidance notes that Android passkey behavior depends on the profile where the passkey is stored. If a user has both work and personal profiles, the passkey is not automatically universal across both contexts.

### What to check

1. Identify whether the passkey was registered in the work profile or personal profile.
2. Test sign-in from the matching profile context.
3. If the scenario requires both contexts, plan registration accordingly and document it clearly for users.

## Problem 7: a synced passkey or third-party provider does not behave the way the admin expected

### Typical symptoms

- The user says the passkey exists in their provider, but Entra registration or sign-in is inconsistent.
- Behavior differs sharply between Authenticator and another passkey provider.
- The tenant policy seems to allow passkeys, but the exact scenario still fails.

### Why this happens

Administrators often mix together:

- current generally available support
- preview synced-passkey features
- provider-specific behavior
- authenticator restrictions imposed by policy

The result is a mismatch between what the user believes a passkey provider can do and what the tenant is actually configured to accept.

### What to check

1. Verify whether the tenant is intended for device-bound passkeys only or whether preview synced-passkey features are being used.
2. Review passkey profile and attestation settings if enabled.
3. Validate the exact OS, browser, and provider combination against Microsoft's latest compatibility guidance.

## Problem 8: passkey works in one app, browser, or device path but not another

### Typical symptoms

- Works in browser, fails in a native app
- Works on desktop, fails on mobile
- Works for one Microsoft workload but not another

### Why this happens

This is usually not random. It is usually a support-matrix problem.

Microsoft publishes a compatibility matrix because support varies by:

- browser
- operating system
- authenticator type
- native app versus browser
- same-device versus cross-device path

Do not troubleshoot this category with general statements like "Entra supports passkeys." That sentence is too broad to be useful. You need the exact combination.

### What to check

1. Record the exact OS, browser, app, and authenticator.
2. Compare that combination to Microsoft's matrix.
3. Test the same user on a supported path to verify whether the issue is coverage rather than policy.

## The fastest troubleshooting sequence for real incidents

If you need a repeatable runbook, use this order:

1. Is the issue registration, sign-in, or lifecycle cleanup?
2. What authenticator is involved: FIDO2 key, Authenticator, or another provider?
3. Is this same-device or cross-device?
4. What operating system and browser are in play?
5. Is the user in scope for the right Authentication Methods policy?
6. Which Conditional Access policies applied to the failed attempt?
7. Could this be an orphaned local credential?
8. Does Microsoft's compatibility matrix explicitly support this scenario?

That sequence is much more effective than starting from "the user says passkeys are broken."

## Common field patterns from docs and community discussions

Across Microsoft Learn and repeated production troubleshooting patterns, the same themes appear repeatedly:

- registration blocked by policy scope
- Android registration failure on unsupported hardware
- bootstrap loops created by Conditional Access
- cross-device failures caused by Bluetooth or endpoint reachability
- orphaned credentials after cleanup or device change
- mismatch between supported device-bound flows and assumptions about synced providers

Those are the issues worth testing proactively in a pilot.

## Final takeaway

Most Microsoft Entra passkey incidents are explainable. They usually reduce to one of these categories:

- policy scope
- authenticator capability
- support-matrix mismatch
- cross-device dependency failure
- lifecycle cleanup issue

If you sort the issue into the right bucket early, passkey troubleshooting becomes much more deterministic.

## Microsoft References

- [Passkeys in Microsoft Authenticator FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-authenticator-faq)
- [Support passkeys in Authenticator in your Microsoft Entra tenant](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-support-authenticator-passkey)
- [Enable passkeys in Authenticator](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-enable-authenticator-passkey)
- [Sign in with a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-sign-in-passkey)
- [Sign in with passkeys in Authenticator for Android and iOS](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-sign-in-passkey-authenticator)
- [Passkey authentication matrix with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-compatibility)
- [Passkey profiles in Microsoft Entra ID (preview)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkey-profiles)
