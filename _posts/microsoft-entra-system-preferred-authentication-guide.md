---
title: "Microsoft Entra System-Preferred Authentication Guide"
excerpt: "Roll out Microsoft Entra system-preferred authentication safely: compare modes, scope users, test first-factor prompts, monitor sign-ins, and recover quickly."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-08T02:03:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra system-preferred authentication is the likely reason a user who normally types a password is suddenly offered a passkey, certificate, or another stronger credential first. In the **Microsoft managed** state, Entra ranks the methods the user has registered and presents the strongest available option at both first-factor and multifactor authentication. Microsoft says this behavior is being deployed gradually to tenants through September 2026.

The important part is what it does **not** do. System-preferred authentication does not register a credential, remove weaker methods, or create a Conditional Access requirement. The user can still select **Sign in another way**, and an applicable Conditional Access authentication strength still takes priority over the preference order. Microsoft's current [system-preferred authentication documentation](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-system-preferred-authentication) confirms all three boundaries.

Grab a coffee before changing the setting tenant-wide. This is a sign-in presentation and credential-selection control, not a new access policy. Treat it separately from Microsoft's [passkey auto-enablement rollout](/posts/microsoft-entra-passkey-auto-enablement-admin-guide), which changes passkey eligibility and registration prompting for users in SMS or voice scope.

## Microsoft Entra system-preferred authentication: what changed

Microsoft documents three states for the control:

- **Microsoft managed:** Entra applies its ranked credential preference to both first-factor and second-factor authentication as the rollout reaches the tenant.
- **Enabled:** Entra applies the preference order only to second-factor authentication. Existing first-factor behavior remains.
- **Disabled:** Entra does not apply system-preferred sign-in logic.

The setting is **Microsoft managed by default for all users**. Microsoft also lists system-preferred authentication as enabled in its table of Microsoft-managed authentication settings. A Microsoft-managed value is not the same thing as mandatory enforcement: administrators can change it to Enabled or Disabled, and Microsoft explains that managed settings can be explicitly overridden. See Microsoft's [default-protection model](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-default-enablement) for that distinction.

Microsoft's feature page does not label this September change as Preview or GA, and it does not publish tenant rings or a tenant-specific completion date. It says only that the first-factor and second-factor behavior in the Microsoft-managed state is rolling out gradually through September 2026. Do not turn that broad window into a made-up date for your tenant.

## The credential order Entra evaluates

The current published order is:

1. Temporary Access Pass (TAP)
2. Passkey, including security keys, Authenticator passkeys, synced passkeys, Windows Hello for Business, and macOS Platform SSO
3. Certificate-based authentication (CBA)
4. Microsoft Authenticator notifications
5. External MFA
6. Time-based one-time password (TOTP)
7. Telephony, including SMS and voice
8. QR code for frontline workers
9. Password

Do not freeze that list into a permanent design standard. Microsoft explicitly says the ranking is dynamic and can change with the security landscape. Capture the live [system-preferred authentication order](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-system-preferred-authentication#how-does-system-preferred-authentication-determine-the-most-secure-method) in each change record instead of trusting an old screenshot or runbook.

Two details deserve extra attention.

First, Microsoft moved CBA to third place on March 18, 2026 after resolving earlier compatibility issues. The current documentation warns that a user can be sent to CBA first and fail immediately when the current device has no usable certificate; the user must then choose another sign-in method. If your certificate population is device-specific, this is a real help-desk scenario even when the CBA configuration itself is healthy. The site's [Microsoft Entra CBA scoping guide](/posts/microsoft-entra-cba-ca-scoping-safe-rollout) covers the separate trust and issuer controls.

Second, Windows Hello for Business and macOS Platform SSO are device-bound credentials that work only as first factor. Entra offers either one first only when the user's recent sign-in history indicates passkey use. A user whose only passkey is one of those device-bound methods can therefore see different first-factor prompts depending on their most recent sign-in.

## Four control planes that administrators must keep separate

Most rollout confusion comes from treating four different controls as one.

**Authentication methods policy** decides which methods a user is allowed to register and use. It is the supply of available credentials.

**Registration and recovery** determine whether the user actually owns a working credential and how the service desk restores access when it is lost. A preference engine cannot select a method that was never registered.

**System-preferred authentication** decides which registered, allowed method Entra presents first. It changes the front door, not the admission rule.

**Conditional Access authentication strength** decides which methods can satisfy access to a protected resource. Microsoft documents that a method must be allowed, registered, and accepted by the applicable authentication strength. If a strength requires phishing-resistant MFA, choosing a lower-ranked fallback does not bypass it. Read Microsoft's [authentication-strength evaluation model](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strength-how-it-works) before interpreting a prompt as a policy result.

The clean mental model is: **policy permits, registration equips, system preference presents, and Conditional Access enforces**.

## Prerequisites, roles, and licensing boundaries

Use at least the **Authentication Policy Administrator** role to change the setting in the Microsoft Entra admin center. The verified path is:

**Microsoft Entra ID > Authentication methods > Settings > System-preferred authentication**

Choose Microsoft-managed, Enabled, or Disabled, set the required user or group scope, and save. Exclusions take precedence over inclusions. Microsoft also makes the scoping boundary explicit: the feature targets users and groups, not devices or device groups.

Microsoft's system-preferred authentication page does not publish a separate feature-specific license requirement. Do not infer one. Licensing still applies to adjacent controls and evidence sources:

- Microsoft Entra **Usage and insights** requires Entra ID P1 or P2.
- Conditional Access requires Entra ID P1; risk-based Conditional Access requires P2.
- The authentication methods available to a user can have their own platform, configuration, or license prerequisites.

Microsoft's current [Entra licensing reference](https://learn.microsoft.com/en-us/entra/fundamentals/licensing) documents those adjacent requirements. Confirm entitlement for the method and policy you plan to use rather than assuming the preference setting licenses the whole sign-in design.

Microsoft also documents a Microsoft Graph route for this setting on the feature page. However, at publication time, the standalone [`authenticationMethodsPolicy` resource](https://learn.microsoft.com/en-us/graph/api/resources/authenticationmethodspolicy?view=graph-rest-1.0) and [update reference](https://learn.microsoft.com/en-us/graph/api/authenticationmethodspolicy-update?view=graph-rest-1.0) did not enumerate `systemCredentialPreferences` consistently. This guide therefore uses the verified admin-center path and does not publish a Graph write command. That avoids turning a documentation gap into a production change script.

## Baseline the tenant before changing the state

Start with evidence, not a toggle.

1. Record the current system-preferred state, include scope, exclusions, and UTC capture time.
2. Export the authentication methods permitted for the pilot population.
3. Identify what those users have actually registered.
4. Map each pilot user to their normal devices and federation path.
5. Record Conditional Access authentication strengths that protect their common applications.
6. Document a recovery route for every stronger method that may appear first.

The **Authentication methods > Activity** report separates registration from usage and shows passwordless-capable users, registered methods, recent registration events, and sign-ins by method. Microsoft warns that the report can lag by up to 36 hours and requires P1 or P2. Use the [Authentication Methods Activity documentation](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-methods-activity) to interpret it, and do not use a recently changed dashboard as real-time proof.

Build a pilot matrix with at least these personas:

- a user with a synced or portable passkey;
- a user whose only passkey is Windows Hello for Business;
- a user with CBA who signs in from both a certificate-ready and certificate-less device;
- a user who normally selects external MFA or TOTP;
- a federated user; and
- an NPS extension user, if that path exists in the environment.

Microsoft states that federated users continue to use their external identity provider for first factor and receive system-preferred behavior only at second factor. It also states that NPS extension sign-ins are unaffected. Those are different control paths, not failed rollout tests.

## Choose a safe rollout state

### Keep Microsoft managed

Keep Microsoft managed when the tenant is ready for Entra to apply the ranked order to both authentication stages. This gives users the strongest available registered option first while retaining the documented fallback choice.

### Use Enabled for a second-factor-only pilot

Use Enabled when the second-factor behavior is acceptable but the organization is not ready to change the first-factor prompt. Microsoft explicitly recommends this state when administrators want to avoid first-factor system preference.

This is often the safest bridge for environments with device-specific CBA, uneven passkey support, tightly scripted user journeys, or a support desk that has not yet rehearsed the new prompt.

### Use a scoped exclusion or Disabled as mitigation

Exclude the smallest affected user group when one population needs temporary mitigation. Use Disabled when the tenant needs the previous sign-in behavior while administrators investigate.

Do not call Disabled a rollback of registered methods or Conditional Access. It changes the system-preference layer only. Registered credentials, authentication-method assignments, and access policies remain separate controls.

## Test the user journey, not just the saved setting

For each pilot persona, test both a first-factor sign-in and a sign-in that requires MFA. Record:

- the account, application, device, operating system, and browser;
- the system-preferred state and effective user scope;
- the registered and allowed methods at test time;
- the method shown first;
- whether **Sign in another way** exposes the expected fallback;
- the method actually completed;
- the Conditional Access result; and
- the request ID, correlation ID, and UTC time.

Run a recovery exercise as well. A Temporary Access Pass ranks first in Microsoft's current order and can bootstrap passwordless methods, but it works only when TAP is enabled for the user and a valid pass has been issued. Microsoft's [Temporary Access Pass guide](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass) documents its policy, issuance, lifetime, and recovery behavior.

Do not test by deleting a user's only working method. Use a dedicated test identity or a rehearsed recovery process with another verified credential available.

## Monitor system-preferred authentication in sign-in evidence

Open **Microsoft Entra ID > Monitoring & health > Sign-in logs**, select the interactive sign-in, and preserve the request and correlation IDs. In **Authentication Details**, review the sequence of methods, success or failure, and the authentication policies applied. In the **Conditional Access** tab, confirm whether a strength or other grant control changed the result.

Microsoft warns that Authentication Details can be incomplete while log data is still aggregating. A primary-authentication row may initially be absent, and a previously satisfied claim can make the event look different from the user-visible journey. Use the [sign-in log field reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details) and retest only after preserving the original identifiers.

The log proves the methods attempted and the policy result; it does not always prove the exact prompt order the user saw. **Analysis:** pair the sign-in record with a timestamped pilot observation or support screenshot when the incident is specifically “the wrong method appeared first.” The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) provides a deeper evidence workflow.

Track these measures by rollout ring:

- successful and failed interactive sign-ins by authentication method;
- fallback selection rate reported by pilot users;
- CBA failures from devices without a usable certificate;
- passkey and passwordless-capable population;
- recovery events and TAP issuance; and
- help-desk cases categorized by first-factor, MFA, registration, or Conditional Access.

## Troubleshoot the common failure patterns

### A user still sees a password first

Confirm the setting and effective user scope. If the state is Enabled, first-factor behavior is intentionally unchanged. If it is Microsoft managed, Microsoft says the tenant rollout might not have arrived yet.

Then inspect registered methods. Entra cannot prefer a passkey or certificate the user does not have. For Windows Hello for Business or macOS Platform SSO as the user's only passkey, recent passkey usage also affects whether that device-bound method is offered first.

Federated first-factor and NPS extension flows are documented exceptions. Do not “fix” them by repeatedly changing the cloud preference setting.

### CBA appears first and immediately fails

Confirm whether the current device has the required certificate and private key. Microsoft documents this precise prompt problem for users without a usable certificate. Ask the user to select **Sign in another way** for immediate mitigation, then decide whether a scoped exclusion or the second-factor-only Enabled state is appropriate while the certificate fleet is corrected.

Do not weaken CBA issuer or binding controls merely to make the first prompt disappear.

### Conditional Access asks for a different method

That is not system preference overriding policy. Authentication strengths take precedence. Verify that the required method is allowed, registered, and usable on the device. If none of the user's methods satisfies the strength, fix registration or policy scope through the normal Conditional Access change process.

### A device behaves differently from another device

System-preferred authentication is user-scoped, not device-scoped. Differences can still come from which credential is usable on the device, whether a device-bound passkey is present, recent sign-in behavior, federation, browser support, or Conditional Access conditions. Compare the two sign-in records before changing the tenant state.

### The change did not affect the next sign-in

Microsoft lists propagation as a known limitation: a target-group policy change might not affect the very next sign-in, but should apply to subsequent sign-ins. Preserve the first result, retry after propagation, and escalate with the setting, scope, UTC timestamps, request IDs, and correlation IDs if the behavior persists.

## Administrator checklist

- [ ] Record the current Microsoft-managed, Enabled, or Disabled state.
- [ ] Capture included users or groups and precedence-setting exclusions.
- [ ] Separate allowed methods from actually registered methods.
- [ ] Inventory Conditional Access authentication strengths for pilot applications.
- [ ] Test portable passkeys, device-bound passkeys, CBA, external MFA, and TOTP where used.
- [ ] Test both first-factor and MFA journeys.
- [ ] Include federated and NPS extension paths where relevant.
- [ ] Rehearse recovery without deleting the only working credential.
- [ ] Preserve request IDs, correlation IDs, and UTC timestamps.
- [ ] Use Enabled if the tenant needs system preference at second factor only.
- [ ] Use a narrow exclusion or Disabled for prompt-related mitigation.
- [ ] Keep registration, method policy, system preference, and Conditional Access changes in separate records.
- [ ] Recheck Microsoft's live ranking before each broad rollout.

## FAQ

### Is Microsoft Entra system-preferred authentication mandatory?

No. Microsoft managed is the default state, but Microsoft documents Enabled, Disabled, and user or group scoping controls. Enabled limits the preference logic to second factor; Disabled restores the prior selection behavior.

### Does system-preferred authentication disable passwords or SMS?

No. It presents the highest-ranked allowed and registered method first. Users can choose another available method unless another policy, such as a Conditional Access authentication strength, requires a specific method.

### Does system-preferred authentication enforce passkeys?

No. It can present a registered passkey ahead of a password, but passkey registration and phishing-resistant Conditional Access enforcement are separate controls.

### Can I pilot system-preferred authentication by device group?

No. Microsoft documents user and group scoping, not device or device-group assignment. Build user groups whose members represent the devices and workflows you need to test.

### What should I send Microsoft Support?

Send the tenant's effective setting and scope, the affected user's registered and allowed methods, application and device details, UTC test times, request and correlation IDs, Authentication Details, Conditional Access results, and whether the account is federated or uses an NPS extension path. That evidence separates a rollout-state question from a credential, client, or policy failure.

System-preferred authentication is a useful security improvement when administrators keep its role precise. It chooses the first door a user sees. Registration determines which keys they possess, and Conditional Access still decides which key opens the protected resource.
