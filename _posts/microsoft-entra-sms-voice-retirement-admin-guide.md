---
title: "Microsoft Entra SMS and Voice Retirement: Admin Guide"
excerpt: "Prepare for Microsoft Entra SMS and voice retirement on February 1, 2027: find affected users, deploy passkeys, preserve recovery, and avoid disruption."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-13T18:52:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra SMS and voice retirement takes effect on **February 1, 2027** for Microsoft-provided telecom delivery in public-cloud workforce tenants. After that date, Microsoft-provided SMS and voice can no longer satisfy MFA or self-service password reset. Move affected users to a working phishing-resistant method before the deadline, or migrate a documented exception population to a customer-managed telecom provider through the Microsoft Security Store.

Microsoft's [retirement guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sms-voice-retirement) and its newer [retirement FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sms-voice-retirement-faq) now agree on the date, scope, enforcement behavior, and provider alternative. The February change has no opt-out. Users left with only Microsoft-provided SMS or voice will receive a blocking passkey-registration prompt and must register before continuing to sign in.

Grab a coffee before you call that a graceful migration. A prompt is not the same thing as readiness. The user still needs a supported device or portable authenticator, a policy that permits the credential, a Conditional Access path that allows registration, and a recovery route if the ceremony fails. The administrator's job is to prove those dependencies before Microsoft turns the old delivery path off.

This guide covers the retirement and cutover. The site's separate [passkey auto-enablement guide](/posts/microsoft-entra-passkey-auto-enablement-admin-guide) covers the September 1, 2026 policy and registration-campaign change that started the transition.

## Microsoft Entra SMS and voice retirement: what changes

Keep these control-plane events separate:

- **September 1, 2026:** public-cloud users enabled for SMS or voice in the Authentication Methods Policy or legacy MFA settings entered Microsoft's automatic passkey transition, unless the tenant used the documented temporary opt-out. Microsoft can enable an all-passkey-types profile for those users and set the registration campaign to Microsoft managed. The normal prompt allows unlimited snoozes.
- **September 18, 2026:** Microsoft says telecom-provider options and terms will become available through the Microsoft Security Store.
- **October 30, 2026:** Microsoft says customers that still need SMS or voice can begin selecting and configuring a provider through the Security Store.
- **February 1, 2027:** Microsoft-provided SMS and voice delivery retires. The temporary passkey-transition opt-out no longer helps, and Microsoft says there is no opt-out from enforcement.

The dates are current as of September 13, 2026. The provider milestones are future dates, not a claim that the marketplace or configuration workflow is already available. Recheck Microsoft's live retirement page and your tenant communications before procurement, pilot, and cutover.

### What is actually retiring

Microsoft is retiring its **native telecom delivery** for SMS and voice authentication. It is not removing every phone number from the directory, disabling all external MFA providers, or turning every Conditional Access policy into a phishing-resistant authentication-strength policy.

The change does include **MFA and SSPR**. Microsoft's FAQ says organizations with a legitimate business, regulatory, or technical need can continue SMS or voice through a customer-managed telecom provider. Provider price varies by region, volume, and vendor. Microsoft says migrating Microsoft-provided SMS and voice users to passkeys adds no passkey charge, while the [Authentication Methods Activity report](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-methods-activity) requires Microsoft Entra ID P1 or P2.

External MFA is not retired by this change. An external-MFA user enters this retirement scope only if the user is also enabled for SMS or voice. Treat a failing external-MFA path as a separate incident rather than blaming telecom retirement.

### Who is in scope

The published February 1 timeline applies to Microsoft Entra workforce tenants in the **public cloud**. Microsoft says Azure AD B2C and External ID external tenants are outside this announcement, and other cloud environments will receive later schedules.

B2B users and internal guests are included. Microsoft's FAQ says passkey support for those populations is planned by the end of calendar year 2026. That is a future commitment, not proof that every guest flow works today. Give guest and cross-tenant journeys their own acceptance tests, and do not remove a working method until the supported replacement is visible and successful in the actual tenant path.

## Build an inventory that does not lie to you

Start with three different questions:

1. Who is **enabled** for SMS or voice by policy?
2. Who has SMS or voice **registered**?
3. Who still **uses** SMS or voice for sign-in or password reset?

Those populations overlap, but they are not interchangeable. A policy target is not a user count. A registered phone is not evidence of recent use. A recent successful SMS event does not prove the user lacks another usable credential.

### Scan policy scope with Microsoft's read-only tool

Microsoft publishes an [Entra SMS/Voice Policy Scanner](https://github.com/microsoft/entra-sms-voice-usage-analyzer). It reports the registration-campaign state, SMS and voice method state, included and excluded targets, and the authentication-methods migration state. Its documented permissions are `Policy.Read.All` and `Group.Read.All`, with Global Reader, Authentication Policy Administrator, or Security Reader as the minimum role.

Run the current script from Microsoft's repository under your normal code-review and PowerShell controls:

```powershell
.\Get-SmsVoicePolicyUsers.ps1 -TenantId "contoso.onmicrosoft.com"
```

Read the limitations before reading the CSV. The scanner does **not** expand group membership, calculate effective user counts, inspect registered methods, read sign-in activity, detect the temporary opt-out, or verify customer-managed provider configuration. An `AllUsers` row is a policy target, not millions of enumerated identities.

The migration-state warning matters. Only `migrationComplete` proves that legacy MFA and SSPR policies are ignored. If the state is incomplete, missing, or unknown, the scanner cannot certify legacy coverage. Follow Microsoft's [Authentication Methods Policy migration procedure](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-methods-manage) and inspect the legacy policies before declaring the tenant clean.

### Compare registration and usage

Open **Entra ID > Authentication methods > Activity** and separate the **Registration** and **Usage** evidence. Microsoft's activity documentation says the report can show who is passwordless-capable, methods registered per user, recent registration success or failure, sign-ins by method, and password resets by method.

Two cautions belong in the migration workbook:

- reporting can lag by up to **36 hours**; and
- disabled and recently deleted users are omitted from user registration details.

Treat the dashboard as a trend and reconciliation source, not a real-time cutover signal. Export a dated baseline, then join it to current HR or identity-lifecycle scope so leave, disability, inactivity, and account-state edge cases do not vanish from the project simply because one report omits them.

For recent incidents, use **Entra ID > Monitoring & health > Sign-in logs**. The [sign-in activity detail reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details) says **Authentication Details** records the method sequence, success or failure, and applied authentication policies. Preserve the request ID, correlation ID, UTC time, application, resource, device, and Conditional Access result. A token claim can satisfy MFA without a fresh prompt, so one quiet sign-in does not prove the user's replacement credential works interactively.

### Create an accountable migration roster

For every in-scope identity, record:

- identity type, owner, business unit, country, cloud environment, and enabled state;
- Authentication Methods Policy and legacy-policy scope, including exclusions;
- registered and recently used methods, with the evidence timestamp;
- normal devices, operating systems, browsers, and accessibility requirements;
- MFA, SSPR, Conditional Access authentication-strength, and guest dependencies;
- selected replacement credential and a second recovery path;
- pilot result, support owner, exception reason, and target completion date.

Do not put service accounts, Teams resource accounts, emergency access identities, guests, and normal employees through one undifferentiated migration. The control and recovery models are different even when the report displays the same phone method.

## Choose the replacement by user journey

Microsoft's [phishing-resistant passwordless deployment guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-deploy-phishing-resistant-passwordless-authentication) recommends a persona-based rollout. That matters here because a credential that works beautifully on a managed laptop can be useless to a user borrowing a kiosk, recovering a lost phone, or crossing tenants.

### Prefer a portable credential first

For most users, register a credential that can travel across device journeys. Microsoft's current deployment guidance classifies synced passkeys, passkeys in Microsoft Authenticator, and FIDO2 security keys as portable options. Use the [passkey policy guide](/posts/microsoft-entra-id-passkey-policy-profiles-attestation) to decide which providers, AAGUIDs, attestation states, and passkey types the organization will allow.

Then add local convenience where appropriate. Windows Hello for Business and Platform Credential for macOS can provide strong device-bound sign-in, but a local credential alone is a weak recovery design when the laptop is lost or replaced. The practical target is one approved portable method, the normal device-bound experience, and a rehearsed service-desk bootstrap.

Enable and scope passkeys through **Entra ID > Security > Authentication methods > Policies > Passkey (FIDO2)** using Microsoft's current [passkey configuration procedure](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2). Verify the effective profile before instructing users to register. A registration campaign cannot create a credential type that the user's policy blocks.

### Use customer-managed telecom only for a defined exception

If an operational or regulatory requirement genuinely needs SMS or voice, identify the smallest population and write down the requirement before reviewing providers. Microsoft's current guidance says provider information arrives September 18 and configuration begins October 30, so this article does not invent providers, portal labels, regions, service levels, or contract terms that Microsoft has not yet published.

**Analysis:** a responsible provider decision should at least assess supported countries, sender and caller behavior, delivery latency, accessibility, number portability, data residency, privacy terms, outage handling, fraud controls, support escalation, billing, and what happens when the provider cannot deliver. Validate those criteria against the actual marketplace listing and contract once available.

Do not keep the whole tenant on telecom because a small field population needs it. Segment the exception, pilot it, monitor it, and retain a non-telecom recovery method.

## Prove registration and recovery before enforcement

The September registration campaign is an adoption mechanism, not proof of completion. Microsoft says users can snooze the pre-retirement prompt without limit. Measure successful registrations rather than counting prompts or emails.

### Protect the registration path

Review any Conditional Access policy targeting the **Register security information** user action. Microsoft's [registration-policy guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration) recommends securing registration while excluding emergency access accounts and ensuring users can meet the policy from the registration location and device.

Test the complete ceremony for each persona:

1. start with the identity's real policy and supported device;
2. complete the required bootstrap authentication;
3. register the approved portable passkey;
4. sign out and prove a fresh interactive sign-in;
5. test the normal application and its authentication-strength requirement;
6. prove a second device or recovery path; and
7. confirm the registration and sign-in evidence after normal reporting latency.

Do not test only at `mysignins.microsoft.com`. The target application can introduce a different Conditional Access scope, browser path, or authentication context.

### Prepare Temporary Access Pass without making it casual

A Temporary Access Pass is a time-limited passcode for bootstrapping or recovering passwordless methods. Microsoft's [TAP configuration guide](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass) requires the method to be enabled and the user to be in scope; Authentication Policy Administrator is the least role documented for updating the policy.

Create a service-desk runbook that verifies the person through an approved channel, uses the shortest workable lifetime, records the issuer and ticket, transmits the pass through an approved secure path, and confirms that the user replaces it with the intended credential. A TAP is not a permanent fallback and should not be issued from a phone call that relies on the same number being retired.

External guests require special care. Microsoft documents that an internal guest can receive a TAP in the tenant where its methods are registered, but an external guest cannot. An external guest can use a TAP issued by the home tenant only when it satisfies the home tenant's requirements and cross-tenant access settings trust that MFA. Prove the authentication source, recovery owner, and cross-tenant trust before removing the old method.

### Keep emergency access independent

Exclude monitored emergency access accounts from user-facing registration campaigns and Conditional Access policies that could create a circular dependency. Protect them with strong credentials and verify them on a schedule. Do not use a personal mobile number, a single employee's device, or the customer-managed telecom provider as the only recovery path for the tenant itself.

## A staged retirement plan

### Ring 0: freeze the facts

Capture policy scope, legacy migration state, registered methods, recent usage, Conditional Access registration controls, SSPR configuration, guest populations, provider requirements, help-desk capacity, and emergency access. Assign an owner and deadline to every non-zero group.

### Ring 1: administrators and recovery operators

Move privileged administrators, Authentication Policy Administrators, Conditional Access Administrators, and service-desk credential issuers first. Register at least one approved portable phishing-resistant method and prove an independent recovery route. If the team operating the migration cannot recover itself, the rest of the plan is theatre.

### Ring 2: representative pilot

Pilot across managed and unmanaged devices, Windows, macOS, iOS, Android, remote users, frontline journeys, accessibility cases, federated users, and supported guest scenarios. Test MFA and SSPR separately. Preserve sign-in and registration evidence for both success and failure.

### Ring 3: broad migration

Expand by business unit or persona. Send targeted instructions only after the policy and help-desk path are ready. Track completed registration, successful fresh sign-in, recovery readiness, and open exceptions—not merely enrollment-page visits.

### Ring 4: telecom exceptions

When Microsoft publishes the Security Store details, contract and configure the selected provider for the approved exception group. Pilot delivery in every required region, prove MFA and SSPR behavior, test provider failure, and confirm that the Microsoft-provided policy population is actually migrated before February 1.

### Final rehearsal

At least one full support cycle before cutover, disable Microsoft-provided SMS and voice for a small migrated cohort whose evidence is complete. Test normal sign-in, step-up MFA, new-device registration, lost-device recovery, password reset, guest access, and after-hours escalation. Restore scope only through the approved rollback record if a prerequisite fails.

## Troubleshoot the migration by failure layer

### The user sees a passkey prompt but keeps snoozing

That is expected before retirement: Microsoft documents unlimited snoozes for the current campaign. Confirm the user is in policy scope, explain the approved provider and device path, and measure completion. Do not mistake repeated prompts for a registered credential.

### The scanner reports no enabled targets, but users still receive SMS

Check the authentication-methods migration state. The scanner explicitly warns that a clean Authentication Methods Policy result does not cover legacy MFA or SSPR unless the state is `migrationComplete`. Inspect the legacy policies, registered methods, and sign-in evidence before changing anything.

### Passkey registration is blocked

Confirm that the user is allowed by the effective passkey profile, the provider and authenticator are permitted, and the device and browser meet current support requirements. Then inspect Conditional Access for **Register security information** and preserve the failing sign-in's request and correlation IDs. Use a properly scoped TAP when the normal bootstrap factor is unavailable.

### A passkey works at My Account but not at the application

Read the application's sign-in event. The credential can be valid while the application is subject to a different authentication strength, device condition, risk policy, authentication context, or federation flow. The site's [Conditional Access sign-in-log guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) provides the evidence sequence.

### The user depends on SMS for password reset

Treat this as an SSPR migration, not only an MFA migration. Confirm that the replacement method is supported for the tenant's reset policy and that the user has enough registered methods to meet the configured reset requirement. The site's [security questions retirement guide](/posts/microsoft-entra-security-questions-retirement) covers the adjacent March 2027 recovery change; design both cutovers together so one retiring method is not replaced with another retiring dependency.

### A guest cannot register the planned method

Stop that ring. Microsoft's FAQ says guest passkey support is planned by the end of 2026, but planned availability is not tenant proof. Preserve the home and resource tenant IDs, user type, invitation state, authentication source, request ID, correlation ID, UTC time, device, browser, and failing policy result. Keep a supported access path until Microsoft documentation and the tested tenant behavior agree.

### A customer-managed provider is configured, but the user gets the blocking prompt

Confirm the user was migrated to the provider rather than merely left enabled for Microsoft-provided SMS or voice. Microsoft's FAQ says users remaining on Microsoft-provided delivery are still subject to the February enforcement. Capture provider assignment, policy scope, Authentication Details, and the exact prompt before escalating to the provider and Microsoft.

## Microsoft Entra SMS and voice retirement checklist

- [ ] Confirm the February 1, 2027 retirement date in Microsoft's live guidance.
- [ ] Confirm the tenant is in the public-cloud workforce scope.
- [ ] Record Authentication Methods Policy and legacy MFA/SSPR migration state.
- [ ] Run Microsoft's read-only SMS/Voice Policy Scanner and retain its limitations.
- [ ] Expand policy groups and exclusions into an accountable user roster.
- [ ] Compare enabled scope, registered methods, recent sign-in use, and SSPR use.
- [ ] Include disabled users, guests, emergency accounts, resource identities, and recovery operators in separate reviews.
- [ ] Select an approved portable phishing-resistant credential for each user persona.
- [ ] Validate passkey profiles, providers, attestation, devices, and browsers.
- [ ] Review Conditional Access for Register security information.
- [ ] Prepare and test a tightly controlled TAP bootstrap and recovery runbook.
- [ ] Prove fresh sign-in, application access, step-up MFA, and SSPR for every pilot persona.
- [ ] Track successful credential use, not only registration prompts.
- [ ] Document the smallest population with a real telecom requirement.
- [ ] Recheck Security Store options on September 18 and configuration guidance on October 30.
- [ ] Pilot the selected provider by region and test its failure path.
- [ ] Rehearse the cutover with a small completed cohort before February 1.
- [ ] Preserve request IDs, correlation IDs, UTC times, policy exports, and support ownership.
- [ ] Keep emergency access independent of Microsoft-provided and customer-managed telecom delivery.

## FAQ

### Is Microsoft Entra retiring all SMS and voice authentication?

Microsoft is retiring **Microsoft-provided** SMS and voice delivery for public-cloud workforce tenants. Organizations with a documented need can use a customer-managed telecom provider through the Microsoft Security Store after Microsoft makes that option available.

### Can administrators opt out of the February 1, 2027 retirement?

No. Microsoft documents a temporary Graph beta opt-out for the automatic passkey-profile and registration-campaign transition, but explicitly says it does not exempt the tenant from February 1 enforcement.

### Will every SMS-only user be locked out on February 1?

Microsoft says users whose only available MFA method is SMS or voice receive a blocking passkey-registration prompt rather than a simple dead end. Administrators should still treat an untested user as disruption risk because successful registration depends on policy, device, browser, credential-provider, Conditional Access, and recovery readiness.

### Does the retirement include self-service password reset?

Yes. Microsoft's FAQ explicitly says native SMS and voice retirement applies across Entra, including SSPR. Test the replacement against both MFA and the tenant's configured password-reset method count.

### Are external MFA providers affected?

External MFA is not retired by this announcement. An external-MFA user is affected only if the user is also enabled for Microsoft-provided SMS or voice.

The deadline is a service change; the migration is an identity program. The safe finish line is **no unexplained policy scope, a tested portable credential for each person, an independent recovery path, verified MFA and SSPR evidence, a bounded telecom exception, and a support team that has already rehearsed the failure cases**.
