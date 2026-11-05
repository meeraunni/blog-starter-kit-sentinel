---
title: "Microsoft Authenticator New Phone Transfer: Admin Guide"
excerpt: "Transfer Microsoft Authenticator to a new phone safely, re-register work accounts and passkeys, prevent lockouts, and remove old methods with evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-05T09:21:02-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

A **Microsoft Authenticator new phone transfer** does not copy a work or school credential from one handset to another. Authenticator backup can restore the account name, but the user must sign in and register the work account again on the new phone. A device-bound passkey in Authenticator does not sync or restore; create and test a new passkey before removing the old one. A passkey stored in an approved synced credential manager might already follow the user, but verify it rather than assuming it did.

That is the short answer. The safe administrator runbook is: keep the old phone available, inventory the methods and policies that actually protect the user, restore the account entry, re-register the new Authenticator instance, create a new device-bound passkey when required, test a fresh sign-in to representative resources, and only then remove the obsolete methods. Microsoft's current [new-phone transfer guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-transfer-authenticator-new-phone) makes that order explicit.

Grab a coffee before anyone taps **Require re-register multifactor authentication**. Microsoft documents that action as a broad reset that removes phone numbers, Microsoft Authenticator apps, and software OATH tokens. It is useful when a complete MFA re-registration is intended; it is not a harmless way to rename one phone. A routine replacement should preserve every working recovery path until the new path is proven. ([manage a user's authentication methods](https://learn.microsoft.com/en-gb/entra/identity/authentication/howto-mfa-userdevicesettings))

Microsoft's release record describes an improved iOS restore experience beginning in August 2026 and says no administrator action is required for that product change. The current transfer and passkey documentation still says work or school credentials require setup again and Authenticator passkeys remain device-bound. An improved restore journey is not credential portability. ([Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#upcoming-change---improved-restore-experience-for-device-bound-authenticator-app-passkeys-on-ios), [Authenticator passkey FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-faq))

> **Documentation and testing boundary:** this guide is based on Microsoft's public documentation as of November 5, 2026. It does not claim hands-on testing in a Microsoft Entra tenant. Authentication Methods Policy, Conditional Access, device management, approved proofing, licenses, and help-desk authority remain tenant-specific and require an approved pilot.

## Microsoft Authenticator new phone transfer decisions

Start with the credential type and whether the old phone is still usable. “Authenticator” can mean several different things, and they do not transfer the same way.

**Work or school account using Authenticator push or app code**

- **Restore result:** the account name, not the usable work credential.
- **Safe next action:** open the restored account, sign in, and complete registration on the new phone.

**Device-bound passkey in Microsoft Authenticator**

- **Restore result:** no passkey transfer or synchronization.
- **Safe next action:** use a working method to register a new passkey on the new phone, test it, then remove the old passkey.

**Passkey in Apple iCloud Keychain, Google Password Manager, or another allowed synced provider**

- **Restore result:** the provider might make the synced passkey available after provider sign-in.
- **Safe next action:** confirm the exact passkey is available and permitted by the tenant's passkey profile before relying on it.

**Personal Microsoft account using a one-time password code**

- **Restore result:** the eligible code can be restored.
- **Safe next action:** test the code and complete any separate passwordless setup the account requires.

**Third-party account using a one-time password code**

- **Restore result:** the eligible code can be restored.
- **Safe next action:** test the code against the third-party service before retiring the old phone.

**Old phone lost, stolen, reset, or unavailable**

- **Restore result:** no trusted transfer proof from that device.
- **Safe next action:** follow the approved identity-proofing and incident process, remove only the compromised or obsolete methods, and bootstrap a replacement method.

Microsoft's [Authenticator restore guidance](https://support.microsoft.com/en-us/authenticator/restore-account-credentials-from-microsoft-authenticator) draws the critical boundary: work or school account credentials are not backed up, and only the account name is restored. It also says backup restore stays within the same device type—for example, an iOS backup is not restored onto Android.

## Understand the four control planes before the move

A phone replacement crosses four related but separate control planes:

1. **Backup and restore:** iCloud or the configured Microsoft personal recovery account restores eligible Authenticator data.
2. **Microsoft Entra authentication methods:** the tenant records Authenticator registrations, passkeys, phone methods, and other credentials against the user.
3. **Policy evaluation:** Authentication Methods Policy decides what the user may register, while Conditional Access and authentication strengths decide what can satisfy a protected sign-in or registration.
4. **Endpoint state:** the old and new phones have their own screen lock, secure hardware, application state, compliance, and device-management lifecycle.

A green result in one plane does not prove the others. Seeing the account tile after restore does not prove that push approval works. Seeing a new passkey in **Security info** does not prove that it satisfies the authentication strength protecting the payroll app. Removing an Authenticator method from Entra does not prove that a lost corporate phone has been retired from device management.

If the team needs the broader credential architecture first, use the site's [Microsoft Entra passkey architecture and policy guide](/posts/microsoft-entra-passkeys-explained-architecture-registration-policy). This article serves the narrower move-and-recovery intent.

## Prepare the Microsoft Authenticator new phone transfer

Before touching either phone, record:

- the user's object ID, user principal name, tenant, and whether the account is a member, internal guest, external guest, or administrator;
- every authentication method shown for the user, including its display name and registration time where available;
- the method the user can still complete independently of the phone being replaced;
- Authentication Methods Policy scope for Authenticator, passkeys, and Temporary Access Pass;
- passkey profile scope, allowed passkey type, provider restrictions, and attestation requirement;
- Conditional Access policies that protect **Register security information** and the real applications the user needs;
- the device-management record and the team authorized to retire it;
- a small test set of representative applications and authentication strengths; and
- the support ticket, change record, or device-replacement record that establishes ownership and approval.

Do not ask the user to send a screenshot containing a Temporary Access Pass, QR registration secret, session cookie, or one-time code. Record method type, sanitized device name, timestamps, application, result, and correlation identifiers instead.

For a planned replacement, confirm that the old phone can still approve a fresh sign-in before starting. Also confirm another approved method or recovery path. A migration that depends only on the device being replaced has no safe failure branch.

### Back up the old phone through the documented path

On iOS, Microsoft's current transfer procedure requires iCloud Drive, iCloud Keychain, iCloud Backup, and Authenticator enabled under the applications saved to iCloud. On Android, Authenticator's **Cloud Backup** stores the backup under the selected Microsoft personal account. Follow the live platform steps in the [new-phone transfer guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-transfer-authenticator-new-phone#back-up-microsoft-authenticator-on-ios) rather than copying an old screenshot into a runbook.

Backup is a convenience for restoring supported entries. It is not the acceptance test. Record when the backup was checked, but make the new phone prove each required sign-in method independently.

## Re-register the work account on the new phone

Install Authenticator from the approved application store, restore with the correct recovery account, and open the work or school account tile. The message **Sign in to add your account** is expected after restore because the credential itself was not backed up. Complete the organization's normal registration flow.

The user must be allowed to register the method and must satisfy the policies around registration. Microsoft documents **Register security information** as a Conditional Access user action. A policy can require MFA, a trusted location, a compliant device, or another supported control at this boundary. ([Conditional Access target resources and user actions](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps#user-actions))

Combined registration also requires recent strong authentication. Microsoft's current documentation says adding or modifying a passkey requires strong authentication within the previous five minutes, and managing credentials or My Sign-ins can require MFA within the current session. An authentication strength that accepts only the credential being replaced can create a bootstrap loop. Preserve an approved bootstrap method instead of excluding the user from policy merely to make the wizard pass. ([combined security-information registration](https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-registration-mfa-sspr-combined#session-controls-for-combined-registration))

### Use Temporary Access Pass only through an approved recovery process

When the user has no working method that can bootstrap registration, a Temporary Access Pass can provide time-limited access to register a passwordless method. The tenant must enable TAP and target the user in Authentication Methods Policy. Authentication Administrators can create a TAP for members; Privileged Authentication Administrators can handle administrators and members within Microsoft's documented role boundaries. External B2B guests cannot receive a TAP from the resource tenant; their home tenant owns their authentication method. ([Temporary Access Pass configuration and role boundaries](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass))

Treat TAP issuance as identity recovery, not a convenience code:

1. complete the approved identity-proofing procedure;
2. issue the shortest practical pass under the tenant's policy;
3. transmit it only through the approved secure channel;
4. register and test the intended durable method;
5. delete or let the TAP expire according to the recovery record; and
6. review the resulting audit and sign-in evidence.

A TAP does not replace the user's password. Microsoft also notes that an existing session created with a TAP can outlive the pass itself according to Conditional Access session controls, so deleting or expiring a TAP is not a substitute for a deliberate session-containment decision.

## Recreate a device-bound Authenticator passkey

Authenticator passkeys are device-bound. On iOS, the private key is stored in the Secure Enclave; on Android, Authenticator uses supported secure hardware through Android Keystore. Microsoft's passkey FAQ states that these passkeys cannot be synced or restored. ([Authenticator passkey storage and restore behavior](https://learn.microsoft.com/en-us/entra/identity/authentication/passkey-faq))

On the new phone:

1. Verify that the operating system, Authenticator version, screen lock, tenant policy, and passkey profile meet Microsoft's current prerequisites.
2. Use the old phone, another allowed method, or an approved TAP to sign in to [Security info](https://aka.ms/mysecurityinfo).
3. Select **Add sign-in method**, then choose the passkey option allowed by the tenant.
4. Save the new passkey on the intended provider and device.
5. Complete a fresh same-device sign-in and, if part of the user's workflow, a cross-device sign-in.
6. Test an application that requires the intended authentication strength.
7. Only after those tests pass, identify and remove the old passkey.

Microsoft's [Authenticator passkey deployment guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-support-authenticator-passkey) documents two traps that matter during a move. Cross-device registration and authentication need Bluetooth, internet access on both devices, and the required platform endpoints. If the tenant requires passkey attestation, users must register directly in Authenticator because cross-device registration does not support attested passkeys.

If the passkey option does not appear, use the site's [passkey registration troubleshooting guide](/posts/microsoft-entra-passkey-not-showing-up-fixes-security-info-authenticator-fido2) to separate policy targeting, provider selection, device capability, and client support before changing tenant-wide settings.

### Keep synced and device-bound passkeys separate

Microsoft Entra can allow both device-bound and synced passkeys through passkey profiles. A synced passkey stored in Apple iCloud Keychain, Google Password Manager, Microsoft Password Manager, or another supported provider can become available on another device through that provider. A device-bound passkey in Authenticator cannot.

Do not infer the type from the word “passkey” in a user report. The Microsoft Graph `fido2AuthenticationMethod` resource exposes `passkeyType` as `deviceBound`, `synced`, or a future value. Its `displayName`, `createdDateTime`, authenticator identifier, and attestation properties help distinguish credentials without asking the user to guess. ([FIDO2 authentication-method resource](https://learn.microsoft.com/en-us/graph/api/resources/fido2authenticationmethod?view=graph-rest-1.0))

> **Analysis:** the recovery design should deliberately combine portability and independence. A synced passkey can improve device-replacement continuity, while a separate device-bound or hardware credential can reduce dependence on one cloud credential provider. Choose the mix from the organization's threat model and support model; do not label either type universally safer without that context.

## Test the new phone before removing the old one

Test from a fresh private browser session or another clean client so an existing session does not hide a broken method. For each pilot user, prove:

- the expected account and tenant are selected;
- Authenticator push or app-code MFA works when it is part of the design;
- the new passkey works on the phone itself;
- cross-device passkey sign-in works when users depend on it;
- Conditional Access evaluates the intended device, location, application, risk, and authentication strength;
- Security info shows the new method with a recognizable display name;
- at least one independent recovery method remains; and
- the user's critical applications open with the expected authorization after authentication.

The site's [MFA and authentication-strength rollout guide](/posts/microsoft-365-mfa-rollout-strategy-conditional-access-authentication-strength) is the useful companion for testing policy rings. A successful Security info registration is not proof that every application policy accepts the method.

## Remove the old method without widening the blast radius

After the new phone passes the acceptance tests, remove only the obsolete registration you can identify. The user can manage methods in Security info. An authorized administrator can manage the user's methods in **Entra ID > Users > Authentication methods**, and Microsoft Graph provides method-specific read and delete operations. Microsoft's [authentication-methods API overview](https://learn.microsoft.com/en-us/graph/api/resources/authenticationmethods-overview?view=graph-rest-1.0) separates Microsoft Authenticator and FIDO2 methods, which is why one “old phone” can require more than one carefully identified cleanup action.

For passkeys, inspect the display name, creation time, type, and authenticator details, then delete the exact obsolete FIDO2 method. Microsoft publishes a v1.0 [FIDO2 method deletion operation](https://learn.microsoft.com/en-us/graph/api/fido2authenticationmethod-delete?view=graph-rest-1.0). Preserve the method inventory and test result in the ticket before deletion; the delete call is not a quarantine or reversible disable.

Do not use **Require re-register MFA** unless the approved outcome is to remove all methods covered by that action. Do not revoke sessions merely because a planned transfer succeeded. Session revocation is a separate containment decision for a lost, stolen, or suspected-compromised device and should follow the incident plan.

For a managed corporate phone, complete the endpoint retirement or wipe process through the device-management team after identity acceptance. The Entra authentication-method cleanup and the endpoint lifecycle are separate controls; close both records.

## Monitor the transfer and preserve evidence

Use three evidence sources:

- **Authentication methods for the user:** proves which Authenticator and passkey registrations exist now.
- **Audit logs:** records registration and administrative method changes, including actor, target, time, status, and correlation information. Microsoft's [audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities#authentication-methods) lists Authentication Methods events.
- **Sign-in logs:** proves whether the new method satisfied the real sign-in and shows Conditional Access and authentication details.

The Authentication Methods **Activity** report helps with fleet-level registration and usage review, but it is not a real-time acceptance test. Microsoft documents up to 36 hours of reporting latency and requires Microsoft Entra ID P1 or P2 for Usage and insights. Use the immediate method record, audit event, and fresh sign-in for the ticket; use the report later to reconcile the rollout. ([Authentication Methods Activity](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-methods-activity))

## Troubleshoot the common transfer failures

### “Sign in to add your account” appears after restore

This is expected for a work or school account. The backup restored the account name, not the credential. Open the account and complete sign-in and registration. If registration is blocked, inspect Authentication Methods Policy and Conditional Access rather than repeating restore.

### Restore from backup is missing

Confirm that backup was enabled on the old phone, the same recovery account is in use, and the move stays within the same device type. On iOS, confirm iCloud Drive, Keychain, Backup, and the Authenticator application toggle. Microsoft's [Authenticator FAQ](https://support.microsoft.com/en-us/authenticator/microsoft-authenticator-faqs) also recommends verifying the supported application version and opening the old application before switching.

### The approval notification still goes to the old phone

The old Authenticator registration can still be the active notification destination. Use the working old device or another approved method to finish registration on the new phone, test the new instance, and then remove the identifiable old Authenticator method. Do not repeatedly approve unexplained prompts merely to discover which phone receives them.

### No passkey appears on the new phone

First identify whether the old credential was device-bound or synced. A device-bound Authenticator passkey is not supposed to appear after restore. Create a new one. For a synced passkey, confirm sign-in to the intended credential provider, tenant passkey-profile scope, provider allowance, operating-system support, and the account selected in the passkey chooser.

### Registration says another sign-in method is required

Inspect Conditional Access for **Register security information**, the enforced authentication strength, and the age of the current MFA session. The user might be presenting a method that does not satisfy the registration policy, or the policy might require the very method being replaced. Use an approved bootstrap method or TAP; do not add a broad policy exclusion as an improvised fix.

### Cross-device registration fails or the QR flow cannot connect

Check Bluetooth and internet access on both devices, the documented platform endpoints, the system camera path, and whether the passkey profile requires attestation. With attestation required, register directly inside Authenticator instead of retrying an unsupported cross-device registration path.

### The passkey is present but “can no longer be used”

Microsoft's [passkey sign-in troubleshooting guidance](https://support.microsoft.com/en-us/accounts-billing/security/troubleshoot-signing-in-with-a-passkey) says the credential might have been removed from the account or device, or invalidated by a change to local authentication state. Register and test a new passkey, then remove the obsolete entry. Do not weaken the tenant's authentication strength to preserve a credential that no longer validates.

## Roll back a failed new-phone registration

Rollback means returning to a known working authentication set, not restoring a device-bound key from backup.

If the old phone is still trusted and functional:

1. stop before deleting any old method;
2. preserve the failed registration and sign-in evidence;
3. remove only a clearly identified, incomplete new registration if approved;
4. keep the old method active while policy, client, device, or network causes are corrected; and
5. repeat the new-phone acceptance test from the beginning.

If the old phone is lost, stolen, or suspected compromised, do not restore access to it as a convenience rollback. Follow the identity and endpoint incident plan, remove affected credentials after proofing the user, issue a controlled bootstrap method, and decide separately whether sessions must be revoked or the account contained.

## Administrator checklist

- [ ] Confirm the exact user, tenant, account type, and support authority.
- [ ] Inventory Authenticator, passkey, phone, OATH, and recovery methods.
- [ ] Record Authentication Methods Policy, passkey profile, attestation, and registration Conditional Access scope.
- [ ] Confirm a working method independent of the phone being replaced.
- [ ] Back up through Microsoft's current iOS or Android procedure.
- [ ] Restore with the intended recovery account and same platform family.
- [ ] Re-register the work or school account; do not treat the restored tile as a credential.
- [ ] Create a new device-bound passkey when the old passkey lived in Authenticator.
- [ ] Use TAP only after approved identity proofing and within documented role and guest boundaries.
- [ ] Test fresh same-device, cross-device, MFA, and application sign-ins that the user actually needs.
- [ ] Preserve method, audit, sign-in, Conditional Access, and ticket evidence.
- [ ] Remove only the identifiable obsolete Authenticator and passkey methods.
- [ ] Complete the managed-device retirement process separately.
- [ ] Reconcile the delayed Authentication Methods Activity report after the rollout.

## Frequently asked questions

### Does Microsoft Authenticator backup transfer work account credentials?

No. Microsoft says only the work or school account name is restored. The user must sign in and register the account again on the new phone.

### Can a Microsoft Authenticator passkey be restored to a new phone?

No. Authenticator passkeys are device-bound and cannot be synced or restored. Register a new passkey on the new phone and test it before deleting the old passkey.

### Will an iCloud Keychain or Google Password Manager passkey transfer?

It might become available through the synced credential provider after the user signs in to that provider. Confirm that the passkey is present, allowed by the tenant's passkey profile, and accepted by the intended authentication strength. Do not confuse a synced provider passkey with a device-bound Authenticator passkey.

### Should the help desk select Require re-register MFA for every new phone?

No. Microsoft documents that action as a broad reset of multiple method types. Use it only when the approved objective is complete MFA re-registration. For a routine move, register and test the new method first, then remove the exact obsolete methods.

### What if the user has no other method and the old phone is gone?

Complete the organization's identity-proofing procedure. If the user is eligible and TAP is enabled, an authorized administrator can issue a Temporary Access Pass to bootstrap a new durable method. External B2B guests normally recover through their home tenant.

### How do I prove the transfer succeeded?

Use a fresh sign-in that exercises the intended method and application policy, then retain the new method record, Authentication Methods audit event, sign-in authentication details, Conditional Access result, and support record. The delayed registration report alone is not enough.

The operating rule is simple: **restore entries, re-register credentials, prove policy acceptance, and delete old methods last**. That turns a phone swap from an improvised MFA reset into a controlled credential lifecycle with a recovery path and evidence.
