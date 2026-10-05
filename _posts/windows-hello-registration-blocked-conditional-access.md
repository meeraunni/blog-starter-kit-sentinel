---
title: "Windows Hello Registration Blocked by Conditional Access"
excerpt: "Fix Windows Hello registration blocked by Conditional Access: trace the policy, break bootstrap loops, validate TAP, and restore provisioning safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-05T17:43:29-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

When **Windows Hello registration is blocked by Conditional Access**, do not start by deleting the device, clearing the user's methods, or excluding the user from every policy. First prove which registration stage failed and which grant control made the decision. A Windows Hello for Business policy can be enabled, the device can be joined, and the user can have a valid Temporary Access Pass while the credential-registration transaction is still denied.

The important change is that Microsoft Entra Conditional Access policies targeting the **Register security information** user action now apply during Windows Hello for Business and macOS Platform SSO credential registration. Microsoft says the rollout started July 6, 2026; its June release notes describe completion by July 13. Passwordless registration already required multifactor authentication by default, but the registration attempt must now also satisfy applicable grant controls such as authentication strength, trusted location, or a specified MFA method. ([registration-policy guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration), [June 2026 Entra release notes](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-june-2026/4517885))

Grab a coffee before widening an exclusion. The shortest safe path is to correlate the failed provisioning attempt with Entra sign-in evidence, identify every policy in scope, separate authentication bootstrap from device compliance, and retest one representative user. Temporary Access Pass (TAP) often solves the authentication bootstrap problem. It does not automatically satisfy an unrelated compliant-device, trusted-location, platform, or block requirement.

## Windows Hello registration blocked by Conditional Access: quick decision guide

- **Windows Hello provisioning never launches:** the device, user, or policy prerequisites may have failed before credential registration. Check Windows Hello enablement, join state, user sign-in context, Remote Desktop use, and User Device Registration logs.
- **Provisioning launches, then Entra denies the flow:** authentication reached the cloud control plane and an applicable policy or authentication requirement failed. Find the matching sign-in event and read every Conditional Access result.
- **TAP is accepted, but registration is still blocked:** TAP handled authentication, but another grant or condition remains unsatisfied. Inspect compliant-device, location, platform, client, terms, and block controls.
- **The user must present the phishing-resistant method they are trying to create:** the bootstrap design is circular. Use a registration-specific bootstrap authentication strength that permits TAP or another approved existing method.
- **A single-use TAP worked for enrollment but fails later at Hello setup:** the credential ceremony may be outside the allowed authentication window. Issue a second approved single-use TAP or use a suitable limited-use TAP according to policy.
- **Entra registration succeeds, but on-premises access still fails:** the problem has moved past registration. Validate key synchronization, trust model, Kerberos path, and application authorization.

This intent is narrower than the site's broad [Windows device join and registration diagnostic walkthrough](/posts/microsoft-entra-windows-device-join-registration-failures). That guide decides whether device identity exists and is healthy. This guide starts with a Windows Hello credential ceremony and follows the Conditional Access decision that can now govern it.

## Understand the control-plane sequence before changing policy

Windows Hello for Business is not simply a PIN stored on a laptop. During provisioning, Windows creates a protected credential and registers its public portion with the identity provider. For cloud and hybrid deployments, that identity provider is Microsoft Entra ID. Microsoft divides the workflow into device registration, credential provisioning, optional key synchronization or certificate enrollment, and later authentication. ([how Windows Hello for Business works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works), [deployment planning](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/deploy/))

The failure can therefore sit in one of four planes:

1. **Windows eligibility:** the device does not meet hardware, join, user, policy, or session prerequisites, so provisioning never begins.
2. **Entra authentication:** the user cannot establish an allowed bootstrap authentication for credential registration.
3. **Conditional Access:** a policy targeting Register security information or another applicable resource requires a control the current session cannot satisfy.
4. **Post-registration trust:** the key is registered, but synchronization, certificate issuance, Kerberos trust, or downstream authorization fails.

Do not treat a Windows prompt disappearing as proof of a Conditional Access denial. Microsoft documents that provisioning launches only when the device supports Windows Hello, is joined appropriately, the user signed in with an eligible account, Windows Hello policy is enabled, and the session is not Remote Desktop. The User Device Registration log records prerequisite evaluation. ([Windows Hello provisioning prerequisites](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works#provisioning), [known deployment issues](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-deployment-issues))

Conversely, a healthy join does not prove credential registration is allowed. A joined device provides identity context; it does not override a Conditional Access grant decision.

## What changed for Register security information

The **Register security information** target is a Conditional Access user action. It lets administrators protect the ceremony used to add authentication methods for MFA and self-service password reset. Microsoft previously enforced this target in experiences such as My Security Info and Microsoft Authenticator, but Windows Hello for Business and macOS Platform SSO registration did not evaluate those registration-targeting policies. The 2026 enforcement change closes that gap. ([Microsoft Entra security update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/microsoft-entra-id-security-updates-what-organizations-need-to-do-now/4522024), [Conditional Access user-action procedure](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration))

This is not a new Windows Hello license, a new credential format, or a requirement to create a registration policy. Organizations without a Conditional Access policy targeting that user action do not gain one automatically. The operational change is that an existing policy's scope is now consistently evaluated during these additional credential-registration paths.

The distinction between **registration** and **resource access** matters. A policy that requires phishing-resistant authentication for normal application access can coexist with a registration policy that permits an approved bootstrap credential. Microsoft documents special evaluation for authentication strengths during security-info registration: the strength targeting Register security information is preferred over authentication strengths targeting All resources. Other grant controls from applicable policies, including compliant-device requirements, still apply. ([authentication-strength evaluation](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strength-how-it-works#how-multiple-authentication-strength-policies-are-evaluated-for-registering-security-info))

> [!IMPORTANT]
> **Analysis:** a registration-specific authentication strength can break an authentication bootstrap loop, but it cannot silently waive a device-compliance control from another applicable policy. If the new device cannot become compliant before the user registers Windows Hello, the policy design still has a circular dependency.

## Confirm licensing, roles, and recovery paths

Conditional Access requires Microsoft Entra ID P1 or a suite that includes it. Features layered into a policy, such as risk conditions or Intune device compliance, retain their own licensing requirements. Use Microsoft's current [Conditional Access licensing reference](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview#license-requirements) for the tenant's exact subscriptions.

Microsoft's registration-policy procedure requires at least **Conditional Access Administrator** to create or change the policy. Sign-in-log visibility has separate roles and licensing; use a supported read role such as Reports Reader for investigation rather than giving the help desk policy-write authority. Microsoft's [activity-log access guidance](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs) documents the supported read roles. The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains the evidence model without expanding administrator access.

TAP administration is also privileged. Limit who can issue it, use the shortest practical lifetime and use count, deliver it through an approved channel, and record who requested and approved it. Microsoft says TAP can bootstrap first sign-in, device setup, and passwordless-method registration, but it cannot be added to an external guest account in the resource tenant. ([Temporary Access Pass guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass))

Before testing, verify two recovery paths:

- emergency access accounts remain excluded according to the organization's tested design; and
- a Conditional Access administrator can revert only the new or changed registration policy if the pilot blocks legitimate enrollment.

Do not use an emergency account as a routine pilot identity. Its exclusions make it a poor representation of the user journey you need to validate.

## Inventory every policy that can affect the ceremony

Start with the policy that targets **Register security information**, but do not stop there. Export or record:

- included and excluded users, groups, roles, and external identities;
- target resources or user actions;
- device platform, location, client app, device filter, risk, and authentication-flow conditions;
- each grant control and whether multiple controls use `AND` or `OR`;
- session controls;
- policy state: Off, Report-only, or On;
- emergency-access exclusions;
- owner, change record, approval, and last review date; and
- every other enabled policy evaluated in the failing sign-in.

Microsoft recommends deploying the registration policy in **Report-only** first. Its example excludes emergency accounts and uses an authentication strength outside trusted locations. Treat that as a reference design, not a command to copy the trusted-location model into every tenant. ([protect security-info registration](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration))

Watch for three common circular designs:

### Phishing-resistant authentication is required before creation

The user must satisfy a phishing-resistant strength to reach the ceremony that creates the first phishing-resistant credential. If no acceptable credential already exists, the user cannot bootstrap. Microsoft documents a custom **Bootstrap and recovery** strength that includes TAP, paired with a separate normal sign-in strength that excludes TAP. Use the same architectural separation when it matches the organization's approved methods. ([bootstrap authentication-strength example](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strength-how-it-works#how-multiple-authentication-strength-policies-are-evaluated-for-registering-security-info))

### A compliant device is required before enrollment finishes

The device needs the new credential or completed management flow to reach the expected state, but an All resources policy requires compliance during the registration transaction. Authentication-strength preference does not remove that grant. Decide whether the device can legitimately become compliant earlier, whether the enrollment architecture needs an approved exclusion, or whether policy targeting is wrong. Do not mark a device compliant manually to get past the symptom.

### Trusted location assumptions do not match provisioning

The policy permits registration only from a trusted named location, while Autopilot, remote onboarding, VPN timing, proxy egress, or macOS enrollment presents a different public IP. Compare the sign-in event's observed address and named-location result with the actual design. Do not add a broad IP range from a user's screenshot or assume that “on corporate Wi-Fi” equals the egress Microsoft evaluated.

## Use Temporary Access Pass without overestimating it

TAP is a time-limited passcode designed for recovery and passwordless bootstrap. Microsoft classifies it as capable of satisfying both first-factor and MFA requirements. During a TAP sign-in, a federated user authenticates in Entra rather than being redirected to the federated identity provider. ([system-preferred authentication order](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-system-preferred-authentication), [TAP sign-in behavior](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass#use-a-temporary-access-pass))

That does **not** make TAP a policy bypass. The session still faces applicable conditions and grant controls. A TAP can be valid while registration fails because:

- the user is outside the TAP authentication-method policy scope;
- the code expired, was already consumed, or exceeds its allowed use count;
- a registration authentication strength does not include TAP;
- a second policy requires a compliant device, accepted terms, an allowed location, or another control;
- a block policy applies;
- the user is an external guest for whom the resource tenant cannot create TAP; or
- the device enrollment and credential ceremony are separated by too much time.

Microsoft documents an important single-use case: if device enrollment takes longer than ten minutes and Windows Hello registration occurs later, a second single-use TAP may be required. Its guidance supports either two single-use TAPs or an appropriately governed limited-use design. Do not respond by making every TAP reusable for a long period. ([TAP device enrollment and passwordless registration](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass#device-enrollment-and-passwordless-registration))

Also remember that deleting or expiring TAP does not retroactively erase every established session. Microsoft says session and token behavior depends on issuance and Conditional Access session controls. Revoke or contain access according to the incident objective rather than assuming TAP expiry is session revocation.

## Trace a failed registration from endpoint to Entra

Use one user, one device, and one UTC time window. Reproduce once after enabling appropriate support logging; repeated blind attempts create overlapping events and can consume single-use credentials.

### 1. Prove Windows reached provisioning

Confirm the Windows Hello policy is enabled and that provisioning is allowed after sign-in. Microsoft exposes the relevant `UsePassportForWork` and `DisablePostLogonProvisioning` policy settings for Windows Hello. ([Windows Hello policy settings](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/policy-settings))

Then inspect **Applications and Services Logs > Microsoft > Windows > User Device Registration > Admin**. Microsoft says the provisioning prerequisite result is recorded there; event 362 is one documented example when device authentication did not succeed and provisioning is not launched. Treat the complete event text as evidence—do not diagnose from an event ID alone. ([Windows Hello known deployment issues](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-deployment-issues))

Capture the device ID, tenant ID, join state, user UPN, UTC time, policy source, enrollment stage, and visible error. If device join itself is uncertain, stop here and use the site's [Windows device join and registration workflow](/posts/microsoft-entra-windows-device-join-registration-failures) before changing Conditional Access.

### 2. Find the matching Entra sign-in event

In the Microsoft Entra admin center, open the user's sign-in logs and bound the search to the reproduction time. Preserve:

- UTC timestamp, correlation ID, request ID, user, and tenant;
- application, resource, client type, and authentication requirement;
- device ID, operating system, join state, and compliance claim;
- IP address, location, and named-location evaluation;
- authentication details;
- Conditional Access status;
- every applied and report-only policy result; and
- failure code, failure reason, and additional details.

Microsoft's sign-in troubleshooting guide recommends isolating the actual event rather than inferring from a generic user-facing message. A failure such as “strong authentication not completed” needs the additional details and authentication steps to explain whether the prompt was unavailable, cancelled, or unsatisfied. ([troubleshoot Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

If the event is absent, verify the directory, UTC interval, sign-in type, role, and retention window. Then return to the endpoint evidence: the transaction may have failed before it reached Entra.

### 3. Read all policy results, not only the expected one

Open the Conditional Access detail and identify the exact failed grant. A registration-specific policy may succeed while an All resources device-compliance policy blocks the same journey. Report-only results are useful for scope validation, but they do not block the user and do not prove that an active challenge can be completed.

The **What If** tool helps explain policy targeting for a modeled user, device, location, and resource. It does not reproduce Windows provisioning, create a credential, consume a TAP, or prove that the runtime device supplied the claim you modeled. Use it to test a hypothesis after reading the real event.

### 4. Separate authentication failure from device-state failure

Ask two independent questions:

1. Did the user present an allowed method that satisfies the registration authentication strength?
2. Did the request satisfy every remaining condition and grant control?

This prevents a classic misdiagnosis: issuing another TAP when the failed grant is compliant device, or changing device policy when the authentication strength excludes the user's bootstrap method.

## Fix the narrowest broken control

Use the evidence to select one remedy:

- **Bootstrap strength is circular:** create or correct a narrowly scoped registration strength that permits the approved bootstrap method, then keep stronger requirements for normal resource access.
- **TAP timing is wrong:** issue the approved second single-use TAP or adjust the limited-use design within the documented enrollment model.
- **Device compliance is circular:** redesign the enrollment and compliance sequence or narrow the exact policy scope through change control. Do not grant a broad user exclusion.
- **Named location is wrong:** correct the known egress definition only after network ownership and observed IP evidence agree.
- **Multiple policies conflict:** consolidate or adjust only the policy whose business objective is duplicated or incorrectly scoped.
- **Windows prerequisites failed:** repair join, policy delivery, supported hardware, or session context before retesting registration.
- **Credential registered successfully:** move to key synchronization, trust, or application access; stop changing the registration policy.

For a user-facing `AADSTS53003`, remember that the code says Conditional Access blocked token issuance; it does not identify the responsible policy. Follow the site's [AADSTS53003 Conditional Access diagnostic path](/posts/aadsts53003-access-blocked-by-conditional-access) with the actual sign-in record.

## Pilot and rollback without creating a standing bypass

Use a small pilot group that represents the real onboarding paths: Entra joined and hybrid joined Windows, Autopilot and existing device, office and remote egress, new hire and recovery, plus macOS Platform SSO if deployed. Keep emergency accounts separate.

1. Export the current policies and authentication-method targeting.
2. Put the proposed registration policy in Report-only.
3. Test successful and intentionally denied paths with recorded UTC windows.
4. Validate TAP issuance, expiration, use count, delivery, and audit ownership.
5. Turn on the policy for the pilot only after the policy result is understood.
6. Monitor sign-ins, User Device Registration events, help-desk contacts, and successful credential registrations.
7. Expand only when every failed path has an owner or an approved design reason.

If the change blocks production onboarding, revert the specific registration-policy change to its last approved state. Preserve the failed sign-in and endpoint events before rollback, repeat the same test afterward, and prove that the expected behavior returned. Do not disable unrelated All resources protections or permanently exclude the affected users.

Escalate to Microsoft when the endpoint reaches the registration transaction but Entra evaluates policy contrary to the documented target and grant behavior. Include sanitized tenant and user identifiers, device ID, UTC interval, correlation and request IDs, policy IDs and exported settings, authentication-method scope, Windows build, join type, enrollment path, and relevant event text. Never send TAP values, tokens, private keys, PINs, or device secrets.

## Administrator checklist

- [ ] Confirm Windows Hello provisioning launched and record the endpoint stage.
- [ ] Capture User Device Registration evidence and the exact UTC window.
- [ ] Find the matching Entra sign-in event by user, time, and correlation data.
- [ ] Read every active and report-only Conditional Access result.
- [ ] Identify the exact failed condition or grant control.
- [ ] Confirm the Register security information policy scope and exclusions.
- [ ] Check overlapping All resources, device, location, platform, and block policies.
- [ ] Verify Conditional Access, Intune, and risk-feature licensing as applicable.
- [ ] Confirm the user is enabled for the required authentication methods.
- [ ] Use a bootstrap authentication strength that permits the approved recovery method.
- [ ] Validate TAP lifetime, use count, consumption, and delivery path.
- [ ] Break device-compliance or authentication bootstrap loops deliberately.
- [ ] Keep emergency access accounts tested and outside routine pilot use.
- [ ] Retest one user and one device before broadening scope.
- [ ] Roll back only the specific changed policy if the pilot fails.
- [ ] Close the incident only after registration and downstream sign-in both succeed.

The reliable mental model is simple: **Windows Hello provisioning is an identity registration transaction, and Conditional Access now sees that transaction more consistently**. A joined device, valid TAP, or enabled Windows Hello policy proves only one layer. The fix comes from matching endpoint evidence to the Entra policy result, then repairing the smallest control that actually failed.

## FAQ

### Why did Windows Hello registration start failing when the policy did not change?

An existing policy targeting Register security information may now apply to Windows Hello for Business credential registration. Microsoft documents rollout in July 2026. Confirm the real sign-in result before attributing the failure to the rollout; Windows eligibility and other Conditional Access policies can produce similar symptoms.

### Does Temporary Access Pass bypass Conditional Access?

No. TAP can satisfy supported authentication requirements and bootstrap passwordless registration, but other applicable conditions and grants still run. A compliant-device, location, terms, platform, or block control can still deny the transaction.

### Can a user register Windows Hello with phishing-resistant MFA already required?

Yes, if the bootstrap design provides an allowed existing method. Microsoft documents a registration-specific authentication strength that can include TAP while normal resource access uses a different strength. Requiring a credential before the user can create their first such credential is a circular design.

### Why did one single-use TAP work during Autopilot but not for Windows Hello?

Microsoft says a second single-use TAP can be needed when enrollment takes longer than ten minutes before passwordless registration. Preserve the timing and consumption evidence, then use the documented two-TAP or governed limited-use approach.

### Should we exclude Windows devices from the registration policy?

Not as a first response. That removes the control from a broad class without identifying the failed grant. Use sign-in and endpoint evidence, repair the bootstrap or policy dependency, and make any exception narrow, approved, monitored, and time-bound.

### Does this change also affect macOS Platform SSO?

Yes. Microsoft includes macOS Platform SSO credential registration in the same enforcement change. Validate its actual platform, location, authentication, and device-management claims separately rather than assuming the Windows pilot proves the macOS path.

## References

- [Protect security information registration with Conditional Access — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration)
- [How Conditional Access authentication strengths work — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strength-how-it-works)
- [Configure Temporary Access Pass — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [How Windows Hello for Business works — Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works)
- [Windows Hello for Business known deployment issues — Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-deployment-issues)
- [Troubleshoot Microsoft Entra sign-in errors — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors)
- [Microsoft Entra ID security updates — Microsoft Entra Blog](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/microsoft-entra-id-security-updates-what-organizations-need-to-do-now/4522024)
- [What's New in Microsoft Entra: June 2026 — Microsoft Entra Blog](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-june-2026/4517885)
