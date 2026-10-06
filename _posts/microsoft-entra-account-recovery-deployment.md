---
title: "Microsoft Entra Account Recovery: Deployment Guide"
excerpt: "Deploy Microsoft Entra account recovery with Verified ID, Face Check, claim validation, staged testing, monitoring, troubleshooting, and safe rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-06T17:38:33-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra account recovery is the self-service path for a workforce user who has lost **all** usable authentication methods. It verifies the person through an approved identity-verification provider, Microsoft Entra Verified ID, and Face Check; validates the verified claims against the Entra account; then issues a Temporary Access Pass (TAP) so the user can register a new authentication method.

The short answer: treat this as a high-assurance identity-proofing system, not a nicer password-reset screen. Start in Evaluation mode with a small group, clean up first-name and last-name data, enable TAP for the same population, add an authoritative claim-validation extension where names alone are not unique enough, test real lockout cases, and move to Production in rings. Keep the staffed recovery path until the new route has proved its coverage.

Grab a coffee before opening the wizard. The configuration is short; the trust decision is not. A government document, a live face match, a directory record, an optional HR check, and a bootstrap credential all have to identify the same person without creating a new social-engineering shortcut.

## Microsoft Entra account recovery is not SSPR

Four identity operations are easy to blur together:

- **Sign-in** proves identity with a registered credential such as a password, passkey, certificate, or Windows Hello for Business.
- **Multifactor authentication** satisfies an MFA requirement, possibly at a specific authentication strength.
- **Self-service password reset (SSPR)** lets a user who still controls enough previously registered recovery methods reset a password.
- **Account recovery** re-establishes identity after the user has lost every usable authentication method.

Microsoft explicitly describes Verified ID as identity verification, not a sign-in, MFA, or SSPR method. In this recovery flow, Verified ID is the proofing layer and TAP is the temporary authentication bridge back into credential registration. Microsoft's [Verified ID identity-verification overview](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-verified-id) documents that boundary.

This separation matters operationally. Enabling account recovery does not make a user SSPR-capable, replace emergency-access accounts, or guarantee that the user can register the passkey your policy expects. The site's [security-questions retirement guide](/posts/microsoft-entra-security-questions-retirement) covers the SSPR problem; this guide covers total credential loss.

Microsoft announced Microsoft Entra ID account recovery as **generally available on May 7, 2026**. Evaluation and Production are profile modes, not preview and GA labels. Evaluation lets scoped users exercise identity verification without recovering the account; Production allows a successful flow to issue TAP. See Microsoft's [GA announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/passkeys-aren%E2%80%99t-the-finish-line-eliminating-fallbacks-and-fixing-recovery/3627345) and [Verified ID change record](https://learn.microsoft.com/en-us/entra/verified-id/whats-new).

## Understand the recovery control plane

The successful path crosses six boundaries:

1. **Discovery:** an eligible user with prior authentication activity selects **Recover your account** from the sign-in experience.
2. **External proofing:** the user completes the configured identity-verification provider's document process and receives a verifiable credential in Microsoft Authenticator.
3. **Proof of presence:** Verified ID Face Check compares a live capture with the credential's trusted photo and returns the verification result.
4. **Account match:** Entra matches the credential's first-name and last-name claims against the user's **First name** and **Last name** properties. Display name and user principal name are not used for this built-in match.
5. **Additional validation:** when configured, the `OnVerifiedIdClaimValidation` custom authentication extension asks an organization-controlled API to validate the claims against an authoritative source and return a pass or fail decision.
6. **Credential bootstrap:** after successful validation, Entra issues a TAP. The user signs in to Security info and registers a replacement method before the TAP expires.

Microsoft documents the end-user sequence in [Perform account recovery](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-account-recovery-for-users) and the policy model in its [account-recovery FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/self-service-account-recovery).

The important design point is that document verification and account matching answer different questions. The provider determines whether a government credential is valid. Face Check determines whether the presenter matches the credential photo. Entra and your optional extension determine whether those verified claims belong to this directory account. Passing one boundary does not prove the next.

> [!IMPORTANT]
> **Analysis:** first name plus last name is rarely a sufficient enterprise identity key. Shared names, preferred names, transliteration, compound surnames, legal-name changes, and stale HR data can create false rejects or ambiguous matches. For broad production use, treat the custom extension and an authoritative workforce identifier as a control, not decorative integration work.

## Confirm prerequisites, licensing, and ownership

Microsoft's current setup guidance requires:

- Microsoft Entra ID P1 for users who use account recovery;
- Microsoft Entra Verified ID and Face Check configured in the tenant;
- a Face Check license, either through Microsoft Entra Suite or the standalone add-on;
- an approved identity-verification provider subscribed through Microsoft Security Store;
- Authentication Administrator for the Entra account-recovery configuration; and
- Contributor or Billing Administrator on the Azure subscription used for the provider subscription.

Costs have separate meters. Microsoft says Face Check is included with Entra Suite or can use pay-as-you-go billing, while the identity-verification provider's charge depends on the Security Store offer. A Face Check verification that returns a match score—or fails the facial match—creates a billing event; a request that fails before processing or returns a service error does not. Recheck the live [Face Check billing model](https://learn.microsoft.com/en-us/entra/verified-id/verified-id-pricing) and the chosen provider's offer before forecasting cost.

Also establish named owners for:

- Entra authentication policy and recovery profiles;
- Verified ID and Face Check billing;
- the external provider contract, privacy review, and support path;
- authoritative identity data such as the HR system;
- the custom validation API and its monitoring;
- TAP policy and credential-registration policy; and
- the help-desk fallback and security escalation path.

The provider processes government-document data under its own privacy and retention terms. Microsoft directs customers to review those terms. Record allowed countries and documents, accessibility requirements, regional restrictions, data residency, retention, support hours, and the fallback for people who cannot or should not use biometric proofing.

Do not place emergency administrators into the first recovery ring. Account recovery is a workforce recovery path, not a substitute for tenant break glass. Keep the independently protected identities described in the [Microsoft Entra emergency-access account guide](/posts/microsoft-entra-emergency-access-accounts-admin-guide).

## Prepare the directory before enabling recovery

### Build populations, not one global toggle

Use dedicated groups for the pilot, broader deployment rings, exclusions, and TAP scope. Record who owns each group and whether membership is static or dynamic. Profile exclusions are feature-wide, so review them as carefully as inclusions.

Microsoft supports multiple identity-verification profiles for different populations and providers. When a user matches more than one profile, Entra evaluates profiles in priority order and applies the first match. Keep group membership mutually understandable, set priority deliberately, and include an overlap test in every change.

Suggested rings are:

1. identity and service-desk testers;
2. users with clean authoritative data and supported documents;
3. a representative business population across names, regions, and device types; and
4. broader workforce groups only after failure and fallback data are acceptable.

Exclude emergency accounts, service accounts, shared identities, unsupported user types, and populations without an approved proofing path.

### Clean the properties the service actually matches

Microsoft says the built-in account match uses the user's **First name** and **Last name**, not display name or UPN. Blank values prevent a match. Before the pilot, compare those properties with the authoritative legal-name source and define how preferred names, previous names, accents, transliteration, and multipart surnames should be handled.

Do not rewrite directory names simply to make one test pass. That can affect address books, downstream provisioning, HR reconciliation, and legal records. Fix the source-of-authority process or add the validation logic needed for the population.

### Prepare the bootstrap destination

TAP must be enabled in the Authentication methods policy and the recovering user must be in its target scope. The replacement method—often a passkey—must also be enabled for that user. Microsoft's [TAP configuration guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass) documents its policy, lifetime, and issuance behavior.

Align the account-recovery group, TAP group, and intended credential-policy group before testing. Otherwise identity verification can succeed and the flow can still fail at TAP issuance or replacement-method registration.

The site's [passkey registration troubleshooting guide](/posts/microsoft-entra-passkey-not-showing-up-fixes-security-info-authenticator-fido2) is the next runbook when recovery succeeds but the new credential cannot be registered.

### Treat Conditional Access as a separate gate

Microsoft says Conditional Access policies can apply during account recovery. A requirement for a compliant device, trusted location, MFA, or another control can interrupt or block a user who is recovering precisely because the normal device or credential is gone. That is a policy result, not an identity-provider failure.

Inventory the policies that can reach the pilot population and test recovery from the devices and locations the design intends to support. Use report-only evaluation and the sign-in logs to understand policy outcomes before enforcing a change. Do not create a broad permanent exclusion merely to make the pilot green; decide which recovery contexts are allowed, document the residual risk, and keep emergency access independent.

## Add authoritative claim validation

The Account validation step offers exact or relaxed matching for the provider's first-name and last-name claims. Exact matching is predictable but sensitive to legitimate formatting differences. Relaxed matching can accommodate variations, but it is not a substitute for a unique workforce record.

Microsoft recommends an additional custom authentication extension. The extension listens for `OnVerifiedIdClaimValidation`, receives the verified claims, checks an authoritative source through your Azure Function, Logic App, or REST endpoint, and returns a decision. Microsoft's [custom extension tutorial](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-custom-authentication-extension-account-recovery) uses an HR lookup as the production pattern.

Microsoft lists both Application Administrator and Authentication Administrator among the prerequisites for the extension tutorial. Use just-in-time assignments where available and remove the deployment access after the integration is configured.

Design that endpoint like an authentication dependency:

- accept only authenticated calls from the documented Entra path;
- validate tokens, audience, issuer, and required claims;
- use a minimal identifier set and return only the required decision;
- fail closed on malformed requests or unavailable authoritative data;
- prevent one name match from selecting among multiple workers;
- redact documents, biometric data, claims, tokens, and TAP values from logs;
- record correlation data, policy version, decision, latency, and reason category;
- alert on unusual volume, repeated failures, and availability degradation; and
- publish a tested fallback that does not weaken identity proofing.

Microsoft says data processed by this extension stays within the organization's trust boundary and only the match result returns to the account-recovery flow. That statement does not remove your responsibility to minimize, secure, and retain the data correctly inside your environment.

## Configure an Evaluation profile first

In the Microsoft Entra admin center, go to **Entra ID > Account recovery** and complete the getting-started prerequisites. On **Profiles**, add a profile and configure:

1. a name and description that identify the population and owner;
2. **Evaluation** recovery mode;
3. the pilot include group and explicit exclusions;
4. the subscribed identity-verification provider;
5. exact or relaxed first-name and last-name matching; and
6. the custom authentication extension for additional validation, when used.

Complete the wizard, then review profile priority and audit logs. Microsoft's [configuration guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-account-recovery-enable) documents the current labels and notes that Evaluation mode verifies the flow without issuing recovery access.

Do not confuse a successful Evaluation run with a recovered account. The expected Evaluation result stops after verification. That is the safety feature: you can validate document coverage, Face Check, claim matching, extension decisions, and user instructions without creating a credential that changes access.

## Test the full failure matrix

A happy-path test account with a perfect legal name is necessary and insufficient. Exercise at least these cases before Production:

- exact name match;
- preferred name versus legal name;
- compound or hyphenated surname;
- accents or transliteration;
- duplicate names in the workforce;
- missing First name or Last name;
- user included in more than one profile;
- user excluded from the feature;
- unsupported document or region;
- provider denial or abandoned document capture;
- Face Check nonmatch;
- custom extension pass, fail, timeout, and unavailable states;
- user outside TAP scope;
- expired TAP; and
- successful TAP followed by both successful and failed replacement-method registration.

Use synthetic or approved test identities and documents according to the provider's test rules. Do not ask employees to upload real government documents merely to create test data outside the approved production process.

For every case, record the UTC attempt time, test identity, intended profile, provider transaction reference when available, Entra correlation information, extension decision category, expected result, actual result, and fallback outcome. Never paste a government document image, biometric artifact, verifiable credential, access token, or TAP into the ticket.

Account recovery is designed for actively used accounts with prior authentication events. Microsoft notes that a newly scoped test user may need to authenticate once before **Recover your account** appears. Include that precondition in the test script instead of treating a fresh, never-used account as representative.

## Move to Production in controlled rings

After Evaluation results meet the written acceptance criteria, edit the profile and change **Recovery mode** to **Production**. In Production, a successful identity-verification and account-validation flow can issue TAP so the user can re-enroll methods.

Use these release gates for each ring:

- provider coverage and privacy approval are documented for the population;
- directory name quality and extension match results meet the threshold;
- profile overlap and exclusions are understood;
- TAP and replacement-method scopes align with the ring;
- service desk knows what Evaluation and Production failures look like;
- provider, extension, Entra, and credential-registration evidence can be correlated;
- the fallback path is staffed during the deployment window; and
- rollback conditions have an owner and decision time.

Do not remove the staffed recovery path on launch day. First measure how many eligible users see the option, start proofing, finish provider verification, pass Face Check, pass account validation, receive TAP, and register a durable credential. Those are different conversion points with different owners.

**Analysis:** the meaningful success metric is not “recovery started.” It is “the correct user registered an approved new method and the temporary credential expired without policy weakening.” Track the whole chain.

## Monitor configuration and recovery evidence

Use the recovery profile's **View audit logs** entry for configuration changes, and retain the provider and custom-extension evidence required by your incident process. Separate at least four evidence streams:

- **configuration evidence:** profile creation, edits, priority, group scope, exclusions, mode, and extension association;
- **proofing evidence:** provider success or reason category and Face Check outcome, subject to provider privacy constraints;
- **validation evidence:** custom-extension request correlation, pass/fail decision, latency, and sanitized reason;
- **credential evidence:** TAP issuance and the subsequent authentication-method registration audit event.

Alerts should cover Production-mode changes, scope expansion, exclusion changes, profile-priority changes, extension failures, unexpected recovery spikes, repeated attempts for one account, TAP issuance without a subsequent method registration, and privileged users entering the flow.

Do not equate an audit-log event with a complete recovery. Correlate the proofing, validation, TAP, and registration stages by identity and time. If retention requirements exceed the portal window, export the approved fields to the organization's monitored log platform without copying sensitive credential content.

## Troubleshoot by the first broken boundary

### Recover your account does not appear

Confirm the user is in the effective profile scope, is not excluded, and has prior authentication activity. Microsoft says a user might need an initial authentication after recovery is enabled or its scope changes. Also confirm that the test is using the documented sign-in path and an actively used workforce account.

### Identity verification fails at the provider

Use the provider's approved support route. Document support, region, image quality, name rules, and provider-specific issuance errors sit outside the Entra claim-matching stage. Do not make repeated directory or TAP changes for a document-verification failure.

### Face Check fails

Treat this as proof-of-presence failure, not an invitation to bypass it. Follow the provider and Microsoft guidance for a clean retry, accessibility accommodation, or approved fallback. Face Check failures that reach facial matching can be billable according to Microsoft's current billing model.

### Verification succeeds but Entra cannot match the account

Compare the credential's first-name and last-name claims with the Entra **First name** and **Last name** properties. Display name and UPN are irrelevant to this built-in match. Review exact versus relaxed behavior and the custom-extension decision. Correct authoritative data or validation logic; do not loosen the match for the whole tenant to solve one exception.

### The user is not issued a TAP

Confirm the user is enabled for TAP in Authentication methods policy and that the identity and Graph data match the real name. Microsoft calls out both claim mismatch and TAP scope as causes. Also confirm the profile is in Production: Evaluation deliberately does not issue recovery access.

### TAP works but the replacement method fails

Move to the authentication-method evidence. Confirm the user is targeted by the intended passkey or other method policy, the device and browser are supported, and the TAP is still valid. If no durable method is registered before expiry, Microsoft says the user must restart account recovery to receive a new TAP.

### The wrong profile appears to apply

Review every include group, the feature-wide exclusions, and profile priority. A user in multiple included groups receives the first matching profile. Fix deterministic scoping before editing provider or claim settings.

## Mitigation and rollback

Account recovery adds a route; it does not require deleting the existing staffed recovery process. That gives you a controlled rollback:

1. stop the next deployment ring;
2. move the affected profile from Production back to Evaluation, or remove only the newly added ring from scope;
3. preserve Entra, provider, extension, TAP, and registration evidence;
4. route affected users through the approved staffed process;
5. fix the first broken boundary; and
6. repeat Evaluation tests before returning the ring to Production.

Do not delete the profile, Verified ID authority, provider subscription, extension, or diagnostic evidence during an incident. Do not disable TAP tenant-wide if other onboarding or recovery processes depend on it. Do not weaken Conditional Access, expand passkey policy broadly, or bypass Face Check to make the symptom disappear.

For tenant-wide administrative lockout, use the separate [emergency-access runbook](/posts/microsoft-entra-emergency-access-accounts-admin-guide). A user's self-service recovery profile should never be the only route back into tenant administration.

## Microsoft Entra account recovery checklist

- [ ] Confirm account recovery is GA and recheck the current Microsoft documentation.
- [ ] Approve the identity-verification provider's coverage, privacy, retention, support, and cost.
- [ ] Confirm Entra ID P1, Face Check entitlement, provider subscription, roles, and Azure billing ownership.
- [ ] Define supported users, exclusions, regions, documents, and accessibility fallback.
- [ ] Clean First name and Last name from the authoritative source.
- [ ] Build deliberate Evaluation, deployment-ring, exclusion, and TAP groups.
- [ ] Enable TAP and the intended replacement authentication method for the same population.
- [ ] Evaluate every Conditional Access policy that can affect the recovery path.
- [ ] Add authoritative custom claim validation where names alone are insufficient.
- [ ] Protect, minimize, monitor, and fail closed at the validation endpoint.
- [ ] Create the profile in Evaluation mode and review profile priority.
- [ ] Test happy paths, name variations, duplicate identities, provider failures, extension failures, and TAP failures.
- [ ] Preserve only sanitized correlation evidence; never log documents, biometrics, tokens, credentials, or TAP values.
- [ ] Define Production acceptance, rollback, fallback, and escalation criteria.
- [ ] Move one representative ring to Production and monitor the complete recovery chain.
- [ ] Keep emergency access and staffed recovery independent until the new route is proven.

## Frequently asked questions

### Is Microsoft Entra account recovery generally available?

Yes. Microsoft announced general availability on May 7, 2026. Evaluation and Production are deployment modes inside a recovery profile, not preview and GA product states.

### Is account recovery the same as self-service password reset?

No. SSPR relies on qualifying registered recovery methods to reset a password. Account recovery is for users who have lost all usable methods and must re-establish identity before registering a new credential.

### What licenses and charges apply?

Microsoft documents Entra ID P1 for users, plus a Face Check license through Entra Suite or the standalone add-on. Face Check can be metered, and the approved identity-verification provider has its own Security Store offer and charges.

### Does Verified ID satisfy MFA during account recovery?

No. Microsoft describes Verified ID here as identity verification, not an authentication method that satisfies sign-in, MFA, or SSPR requirements. The recovery flow uses successful proofing to issue TAP, which then bootstraps credential registration. Conditional Access still applies and can interrupt recovery when its controls cannot be satisfied.

### Why did verification pass but no TAP appear?

The most common documented boundaries are Evaluation mode, a first-name or last-name mismatch, and the user not being in TAP policy scope. Check those before changing Conditional Access or the provider.

### Should privileged administrators use this instead of emergency accounts?

No. Recovery can be one controlled option for an eligible administrator, but it does not replace cloud-only emergency identities with independent credentials, monitored use, and a tested break-glass process.

Microsoft Entra account recovery is ready for production when the identity proof, account match, authoritative validation, TAP issuance, and durable credential registration all agree—and when users who cannot complete that path still have a secure, documented fallback.

## Microsoft sources

- [Passkeys aren't the finish line: eliminating fallbacks and fixing recovery](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/passkeys-aren%E2%80%99t-the-finish-line-eliminating-fallbacks-and-fixing-recovery/3627345)
- [Enable and configure account recovery in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-account-recovery-enable)
- [Verified ID identity verification overview](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-verified-id)
- [Perform account recovery in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-account-recovery-for-users)
- [Frequently asked questions about account recovery](https://learn.microsoft.com/en-us/entra/identity/authentication/self-service-account-recovery)
- [Create a custom authentication extension for account-recovery claim validation](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-custom-authentication-extension-account-recovery)
- [Face Check with Microsoft Entra Verified ID pricing](https://learn.microsoft.com/en-us/entra/verified-id/verified-id-pricing)
- [Configure Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [What's new for Microsoft Entra Verified ID](https://learn.microsoft.com/en-us/entra/verified-id/whats-new)
