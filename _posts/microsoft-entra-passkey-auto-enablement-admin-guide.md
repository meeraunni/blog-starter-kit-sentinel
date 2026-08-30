---
title: "Microsoft Entra Passkey Auto-Enablement: Admin Guide"
excerpt: "Prepare for Microsoft Entra passkey auto-enablement on September 1: inventory SMS and voice scope, validate profiles, pilot registration, and monitor results."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-30T09:05:18-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra passkey auto-enablement begins on **September 1, 2026** for public-cloud users who are enabled for SMS or voice authentication. Microsoft will add those users to passkey scope and put the registration campaign into a Microsoft-managed state targeting passkeys. After an affected user completes MFA, the campaign can prompt them to register a passkey.

That is the short answer. The change does **not** mean every user immediately owns a passkey, SMS stops working that day, or Conditional Access suddenly requires phishing-resistant authentication. It changes **method eligibility and registration prompting**. A user still has to complete the registration ceremony before a credential exists, and an authentication-strength policy is still what enforces a passkey for access to a protected resource.

Grab a coffee and treat this as a control-plane change, not a new sign-in button. Microsoft's current [passkeys-by-default guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sms-voice-retirement) and [security announcement](https://www.microsoft.com/en-us/security/blog/2026/07/13/microsoft-entra-id-security-updates-passkeys-are-the-default-authentication-method-in-entra-id/) agree on the September 1 population and behavior. This guide deliberately covers that confirmed milestone only. It does not state the later SMS and voice retirement date because Microsoft-maintained sources were not aligned on that separate deadline when this article was published.

## Microsoft Entra passkey auto-enablement: what changes

Microsoft documents four linked actions for users enabled for SMS or voice in either the Authentication Methods Policy or legacy MFA settings:

1. the user is automatically enabled for passkeys in the Authentication Methods Policy;
2. the user is placed in a passkey profile that allows all passkey types;
3. the registration campaign is set to **Microsoft managed** and targets passkeys; and
4. the user can be nudged to register a passkey after completing MFA.

Microsoft says the registration prompt has unlimited snoozes by default. That makes September 1 a registration-driving change rather than a blocking passkey-enforcement event. The [Microsoft Security Blog announcement](https://www.microsoft.com/en-us/security/blog/2026/07/13/microsoft-entra-id-security-updates-passkeys-are-the-default-authentication-method-in-entra-id/) also limits its published dates to Microsoft Entra ID in the public cloud; other cloud environments are to receive separate timelines.

Keep these states separate during change review:

- **Enabled for SMS or voice:** the user is in policy scope, whether or not they used the method recently.
- **Enabled for passkeys:** policy permits the user to register and use a passkey.
- **Prompted by a registration campaign:** Entra offers a registration journey after the qualifying sign-in event.
- **Registered:** a passkey credential now exists for the user.
- **Required:** a Conditional Access authentication strength denies access unless the user supplies an allowed method.

Confusing enabled with registered is how an administrator concludes that the migration is complete while the user still has no phishing-resistant credential. Confusing registered with required is how a tenant keeps accepting weaker fallbacks on sensitive applications after issuing passkeys.

## The control planes behind the September 1 experience

The change crosses four controls that look adjacent in the portal but do different jobs.

**Authentication Methods Policy** decides which users may use SMS, voice, passkeys, Temporary Access Pass, and other methods. The September population is derived from SMS and voice scope, not only from recent usage.

**Passkey profiles** define the kinds of passkeys a target population may register, including device-bound or synced credentials and restriction settings. Microsoft says passkeys are available in every Entra ID edition without an extra passkey license, and its current procedure supports up to three profiles. It also warns that opting in to passkey profiles cannot be undone. [Microsoft's passkey enablement guide documents the profile model, licensing, and irreversible opt-in](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2).

**Registration campaign** decides who receives a prompt to set up a method. A nudge is not an authentication grant and does not prove successful registration.

**Conditional Access** decides what proof is required for a resource. If your objective is to require a passkey for an admin portal or other sensitive app, configure and test an authentication strength; merely enabling passkeys does not enforce their use. The site's [passkey architecture and registration-policy guide](/posts/microsoft-entra-passkeys-explained-architecture-registration-policy) explains that boundary in more depth.

> [!IMPORTANT]
> **Analysis:** the highest operational risk is not the prompt itself. It is an automatically broad passkey profile landing beside a carefully restricted device-bound or attestation-based design. Inventory assignments before the rollout so you can distinguish Microsoft's new targeting from your approved baseline.

## Inventory who is actually in scope

Start with policy scope, then add usage and registration evidence. Those are different populations.

Microsoft publishes an [Entra SMS/Voice Policy Scanner](https://github.com/microsoft/entra-sms-voice-usage-analyzer) that reports the registration-campaign state, SMS and voice policy state, included and excluded targets, and an impact summary. Its documented minimum role is Global Reader, Authentication Policy Administrator, or Security Reader, and the script requests read permissions for policy and group data.

After reviewing the repository and script through your normal code-approval process, run Microsoft's documented command from PowerShell:

```powershell
.\Get-SmsVoicePolicyUsers.ps1 `
  -TenantId "contoso.onmicrosoft.com"
```

Use the result to answer:

- Is SMS enabled, voice enabled, or both?
- Does either method include all users?
- Which groups and direct assignments are in scope?
- Which exclusions exist, and do nested memberships expand as expected?
- Is the registration campaign disabled, enabled, or Microsoft managed today?

Inspect passkey-profile assignments separately in the Authentication Methods Policy; the scanner's documented output is focused on SMS, voice, and registration-campaign scope.

Then open **Entra ID > Authentication methods > Activity** and compare policy scope with actual registrations and usage. Microsoft's [Authentication Methods Activity documentation](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-methods-activity) says the report separates registration from usage, requires Entra ID P1 or P2 for Usage and insights, and can lag by up to 36 hours. Do not use an empty or recently changed report as real-time proof.

Export three lists for the change record:

- users enabled for SMS or voice;
- users with a registered passkey, FIDO2 security key, or Windows Hello for Business credential; and
- users in the first list but not the second.

That third list is the support population. It is also the group most likely to see the new prompt without already understanding how passkeys are stored, recovered, or selected.

## Decide whether to accept, narrow, or temporarily defer

There are three defensible responses. Pick one deliberately.

### Accept the Microsoft-managed rollout

This is appropriate when the affected users are already approved for all passkey types, your registration support path is ready, and a broad nudge matches the tenant's adoption plan. Record the current policy, notify users, validate representative devices, and monitor registration outcomes.

### Narrow SMS and voice scope before September 1

Microsoft says administrators who do not want the auto-enablement can move users out of SMS or voice scope before September 1. Do not interpret that as permission to remove a user's only working MFA method. First confirm another allowed method is both registered and usable, then change the smallest approved group assignment. A user who loses their only usable factor can trade a registration prompt for a real lockout.

### Use Microsoft's temporary opt-out

Microsoft documents a tenant-level temporary opt-out through the beta Microsoft Graph authentication-methods policy endpoint. It requires the documented Graph write permission for authentication methods and sets the passkey dynamic-migration opt-out property to true. Use the exact request body from Microsoft's live documentation rather than copying it into an unreviewed script.

Use this only through your approved Graph change process, capture the pre-change policy, and remember that a beta API can change. The opt-out defers the automatic enablement and registration-campaign rollout; it is not a long-term passkey strategy. [Microsoft documents the opt-out request and permission on the passkeys-by-default page](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sms-voice-retirement#temporarily-opt-out-of-the-automatic-passkey-enablement).

## Validate passkey profiles before users are prompted

Open **Entra ID > Security > Authentication methods > Policies > Passkey (FIDO2)** and inspect every profile and assignment. Record:

- whether self-service setup is allowed globally;
- permitted passkey types;
- attestation enforcement;
- allowed or blocked AAGUIDs where configured;
- included groups and exclusions; and
- the intended recovery path for each population.

Do not assume an existing restricted profile automatically wins over a new broad assignment. Prove the effective result with a pilot user who has the same group memberships as the target population. The site's [passkey profile, AAGUID, and attestation guide](/posts/microsoft-entra-id-passkey-policy-profiles-attestation) is the companion design review for tenants that restrict authenticator types.

Test at least one approved example of every authenticator path you intend to support: synced passkey, Microsoft Authenticator passkey, Windows passkey, and hardware security key. Exclude a path from user instructions if you have not approved and validated it.

## Protect the registration ceremony without creating a loop

A passkey is phishing resistant after registration, but the registration ceremony inherits the trust of the method used to bootstrap it. Review any Conditional Access policy targeting the **Register security information** user action before the new campaign expands demand.

Microsoft recommends starting registration policies in report-only mode and excluding emergency access accounts. Its current [security-information registration policy guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration) also explains how Temporary Access Pass can bootstrap strong credentials when a user cannot satisfy an existing registration control.

For users who need bootstrap or recovery, enable Temporary Access Pass only for the intended group, keep its lifetime aligned with the onboarding task, and validate the exact passkey journey. Microsoft's [Temporary Access Pass guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass) notes that a one-time TAP used to register a passwordless method has a ten-minute registration window after sign-in.

Do not hand users a generic instruction that says “create a passkey.” Tell them which provider or device class is approved, where the credential will be stored, what local unlock gesture is expected, and whom to contact if the device is lost. The site's [Windows and mobile passkey registration walkthrough](/posts/microsoft-entra-id-passkey-registration-windows-mobile) can be adapted for that communication.

## A staged rollout plan that still works after September 1

**Baseline:** export SMS and voice scope, registration-campaign state, passkey profiles, Conditional Access registration policies, and method-registration counts. Preserve the UTC export time.

**Lab:** use non-privileged accounts representing each supported device, browser, and authenticator type. Confirm the nudge appears only after the documented MFA event, the approved passkey option is offered, registration succeeds, and the new method appears in Security info.

**Pilot:** choose a small group that includes remote users, managed and unmanaged devices where permitted, accessibility needs, and a help-desk recovery scenario. Avoid making privileged administrators the first population.

**Support readiness:** give the help desk a diagnostic decision tree: policy scope, effective passkey profile, registration-control result, device/provider compatibility, audit evidence, and TAP recovery. Do not begin by deleting credentials.

**Broad adoption:** expand only after registration success, snooze behavior, recovery volume, and sign-in results are understood. If a resource must require passkeys, roll out its authentication strength separately in report-only mode before enforcement.

## Monitor registration and sign-in evidence

For registration, use **Authentication methods > Activity** and review recent registration successes and failures. Remember the documented reporting latency. For a specific user, confirm the registered method under the user's Authentication Methods view rather than relying only on aggregate counts.

For sign-in behavior, open **Entra ID > Monitoring & health > Sign-in logs** and inspect **Authentication Details**. Microsoft's [sign-in log field reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details) says this tab shows the sequence of methods, success or failure, and policies applied. It also warns that authentication details can be incomplete while data is still aggregating. Preserve request and correlation IDs before retesting.

Track these operational measures by rollout ring:

- affected users in SMS or voice policy scope;
- passkey-capable users before and after the change;
- registration attempts, successes, failures, and snoozes where visible;
- help-desk contacts by device and provider path;
- TAP issuance and recovery completion; and
- sign-in failures where an authentication strength required a method the user had not registered.

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) provides the deeper procedure when registration succeeds but access still fails.

## Troubleshooting the September 1 rollout

**The user never sees a prompt.** Confirm that the user is enabled for SMS or voice, passkey policy permits the user, the registration campaign targets passkeys, and the user completed an MFA event. Then allow for policy propagation and report latency before repeatedly changing scope.

**The prompt appears, but the approved passkey type is missing.** Check the effective passkey profile, global self-service setting, device operating system, browser, provider configuration, and attestation or AAGUID restrictions. Do not broaden policy tenant-wide to repair one unsupported client path.

**The user can snooze forever.** That matches Microsoft's documented default for this campaign. If the business requires completion, build a separate adoption and enforcement plan; do not describe the September change as blocking when it is not.

**Registration is blocked by Conditional Access.** Read the sign-in record for the registration attempt and the policy targeting Register security information. Verify the user can satisfy the grant with an approved bootstrap method. Use report-only testing before changing the control.

**Registration succeeds, but the application still accepts SMS.** Passkey enablement does not create an authentication-strength requirement. Review the resource's Conditional Access policy and deploy phishing-resistant strength through its own tested ring.

**A user lost their only passkey.** Follow the approved identity-verification process, issue a narrowly scoped TAP when appropriate, register a replacement, and review audit events. Do not make SMS a permanent tenant-wide fallback to solve one recovery case.

## Administrator checklist

- [ ] Confirm the tenant is in the public cloud before applying the published September 1 timeline.
- [ ] Export current SMS and voice policy scope with Microsoft's scanner.
- [ ] Separate users enabled for a method from users who recently used it.
- [ ] Identify affected users without a registered phishing-resistant credential.
- [ ] Record the registration-campaign state and passkey-profile assignments.
- [ ] Validate passkey types, attestation, AAGUID restrictions, and self-service setup.
- [ ] Review Conditional Access for Register security information.
- [ ] Prepare a TAP-based bootstrap and recovery procedure.
- [ ] Notify users which passkey providers and device paths are approved.
- [ ] Pilot registration across representative devices and browsers.
- [ ] Monitor registration activity, sign-in Authentication Details, and help-desk volume.
- [ ] Enforce passkeys with a separate, tested authentication-strength policy when required.
- [ ] Use the temporary opt-out only as a documented bridge, not as the migration plan.

The clean operating model is simple: **policy makes the user eligible, the campaign asks them to register, the registration ceremony creates the credential, and Conditional Access decides when that credential is mandatory**. Keep those four stages visible and the September 1 change becomes a manageable rollout instead of a mysterious wave of sign-in tickets.
