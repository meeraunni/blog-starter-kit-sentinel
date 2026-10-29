---
title: "AADSTS50079 MFA Registration Required: Entra Fix Guide"
excerpt: "Fix AADSTS50079 MFA registration required errors by separating managed-user enrollment from federated MFA claims, then validating policy and audit evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-29T09:02:30-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS50079 MFA registration required** response means Microsoft Entra has reached an MFA requirement but cannot use the identity's current state to satisfy it. For a managed user, that normally means the user must register security information that is both present and allowed for MFA. For a federated user, it can instead mean the federated identity provider did not return the MFA claim Entra expected. Prove which branch you are in before changing Conditional Access, authentication methods, or federation.

Microsoft names the error `UserStrongAuthEnrollmentRequired`. Its current definition explicitly separates those two branches: a managed user needs to register security information, while a federated user needs an MFA claim from the federated identity provider. The definition also lists an administrator configuration change, per-user enforcement, and a location change as examples that can expose the requirement. ([Microsoft Entra authentication error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

## AADSTS50079 MFA registration required: the short answer

Work through the incident in this order:

1. Preserve the full error, UTC time, request ID, correlation ID, user, tenant, application, resource, client type, IP address, and last successful sign-in.
2. Find the matching event under **Entra ID > Monitoring & health > Sign-in logs**. Confirm the exact error code and whether the identity authenticated as managed or federated.
3. Read **Authentication Details** and **Conditional Access**. Identify what required MFA and whether a later correlated attempt succeeded.
4. For a managed user, compare the user's registered methods with the methods currently allowed by the Authentication methods policy. A method can be registered but no longer usable for MFA.
5. Determine which control forced registration: an immediate MFA requirement, the ID Protection MFA registration policy, per-user MFA, Security Defaults, or another supported policy source visible in the evidence.
6. If the user has no usable bootstrap method, follow the tenant's identity-verification procedure and issue a time-limited Temporary Access Pass when the account type and policy support it. Do not create a broad Conditional Access exclusion.
7. For a federated user, inspect the domain's federation MFA behavior and the claim actually emitted after second-factor authentication. Do not reset the user's cloud methods to repair a missing federation claim.
8. Retest one interactive sign-in. Verify successful registration in the Authentication Methods audit log and successful MFA in the sign-in record.

This is a source-derived troubleshooting sequence, not a report of hands-on testing in a tenant.

## Separate enrollment from an ordinary MFA prompt

AADSTS50079 is close to several other strong-authentication results, but the repair is different:

- **`AADSTS50076` — fresh MFA interaction required:** investigate the requirement source and the client's interaction handling.
- **`AADSTS50079` — enrollment or federated MFA claim required:** investigate managed registration state or the federation claim path.
- **`AADSTS50074` — strong-authentication challenge not passed:** investigate Authentication Details and the method failure.
- **`AADSTS53003` — Conditional Access blocked token issuance:** investigate the failed policy and unmet grant control.

The site's [AADSTS50076 MFA required guide](/posts/aadsts50076-mfa-required-microsoft-entra) covers a client that must perform an MFA interaction. AADSTS50079 is narrower: Entra does not yet have acceptable enrollment evidence for a managed identity, or it did not receive acceptable MFA evidence from federation. Registering another method is not automatically the answer for the federated branch.

Treat the result as an interruption, not proof that the sign-in ultimately failed. Microsoft documents `interaction_required` as a response that should be retried interactively so the user can complete the additional step. A silent request can produce the error before a supported client opens the registration experience. ([Microsoft identity-platform error handling](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#handling-error-codes-in-your-application))

## Preserve the failed sign-in before changing policy

Capture these fields from the error and the matching sign-in record:

- complete error text and exact AADSTS code;
- UTC timestamp, request ID, correlation ID, and trace ID when present;
- user principal name and user object ID;
- home tenant and resource tenant;
- application name and Application (client) ID;
- resource name and resource service-principal ID;
- interactive or non-interactive sign-in type;
- authentication protocol and client application;
- IP address, named-location result, device state, operating system, and browser;
- last successful sign-in and recent policy, network, method, or federation changes.

Filter **Entra ID > Monitoring & health > Sign-in logs** by request ID when available, then cross-check the user, application, resource, and time. Microsoft documents **Authentication Details** as the place to see the policy sources, method sequence, success or failure, and reason. The **Conditional Access** tab lists every policy evaluated and its result. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details), [Conditional Access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies))

Do not rely on the location label as proof of travel. IP geolocation is best-effort, and VPN, mobile, proxy, and Global Secure Access egress can change the apparent location. Microsoft lists location change as one possible trigger for 50079; the matching policy and sign-in evidence must show whether it mattered.

Also look for a later sign-in from the same user and application. The portal can aggregate multiple MFA events into one record, while Log Analytics can show intermediate failures and the final success separately. If registration completed and the later token request succeeded, troubleshoot any remaining application symptom rather than the original interruption. ([analyze sign-in activity in Log Analytics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-log-analytics))

## Decide whether the identity is managed or federated

Use the sign-in record and the user's verified UPN domain—not a help-desk description—to classify the identity path.

### Managed user branch

Microsoft Entra owns the authentication step and expects the user to register or use a strong method in Entra. Continue with the Authentication methods policy, registration report, combined registration audit, and any policy that required MFA.

### Federated user branch

The sign-in was redirected to a federated identity provider such as AD FS. Microsoft says AADSTS50079 can mean that the federated user needs to obtain the MFA claim from that provider. Continue with the federation configuration, the second-factor event at the IdP, and the outgoing claim. Do not assume the user's Entra method list explains the result.

### Guest or cross-tenant branch

Record both the home and resource tenants. Authentication method ownership, MFA trust, and recovery normally follow the home identity. An external guest cannot be issued a Temporary Access Pass by the resource tenant; Microsoft documents that only internal guests can receive a TAP there. A home-tenant TAP can work for an external guest only when the home-tenant authentication requirement and cross-tenant MFA trust are configured appropriately. ([Temporary Access Pass guest behavior](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass#guest-access))

## Prove the managed user's MFA registration state

Open **Entra ID > Authentication methods > Activity > Registration** and find the user. The report distinguishes two states that are easy to collapse into “registered”:

- **MFA registered** means the user has registered a strong authentication method, even if policy no longer allows that method.
- **MFA capable** means the user has a registered strong method that the current Authentication methods policy allows for MFA.

Microsoft Graph exposes the same distinction as `isMfaRegistered` and `isMfaCapable` in `userRegistrationDetails`. **Analysis:** a user can therefore be registered but not capable, which is one plausible explanation when 50079 begins after method-policy targeting changes. Prove it against that user's current state rather than inferring it from timing alone. ([userRegistrationDetails resource](https://learn.microsoft.com/en-us/graph/api/resources/userregistrationdetails?view=graph-rest-1.0))

For a read-only tenant inventory, use the v1.0 report endpoint with the least-privileged `AuditLog.Read.All` permission:

```http
GET https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?$filter=isMfaCapable eq false
```

The documented endpoint supports filters on `isMfaCapable`, `isMfaRegistered`, and `methodsRegistered`. Reports Reader and Security Reader are among the supported delegated roles. ([list user registration details](https://learn.microsoft.com/en-us/graph/api/authenticationmethodsroot-list-userregistrationdetails?view=graph-rest-1.0))

Treat the report as inventory, not live transaction proof. Microsoft says it can lag by up to 36 hours, and its **Last Updated Time** is the report update time—not the time the user registered a method. Disabled and recently deleted users are not listed. Use the user's Authentication methods view and audit events for the immediate incident. ([Authentication Methods Activity](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-methods-activity))

## Inspect the policy layers in dependency order

AADSTS50079 tells you that MFA registration or federation evidence is missing. It does not identify which administrative control introduced the requirement. Read the runtime policy source, then compare these layers.

### Authentication methods policy

Open **Entra ID > Authentication methods > Policies** and confirm that the user is in scope for at least one method that can satisfy the tenant's MFA requirement. Check direct and transitive group targeting, exclusions, method-specific settings, and any authentication strength that applies to the target resource.

Microsoft notes that a method can become nonusable—for example, an expired TAP or a FIDO2 key that fails attestation—and the portal surfaces usable methods before nonusable ones. It also warns that settings across the Authentication methods policy and remaining legacy policy surfaces are not synchronized. ([manage authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage))

Do not re-enable a retired weak method tenant-wide simply to make the prompt offer something. Restore an intended strong method or correct the narrow targeting error.

### ID Protection MFA registration policy

Open **ID Protection > Dashboard > Multifactor authentication registration policy** when the sign-in evidence and licensing indicate this policy is in use. Microsoft documents a 14-day registration window: users can skip during that period when MFA is not otherwise required, but after the window they must register before completing sign-in. Modifying this policy requires Microsoft Entra ID P2 or Microsoft Entra Suite and at least Security Administrator. ([MFA registration policy](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-mfa-policy))

A user who first encounters a protected application during the grace period might still have to register immediately because that application requires MFA. Do not promise that the 14-day window postpones every MFA requirement.

### Conditional Access for Register security information

Registration itself can be protected by a Conditional Access policy targeting the **Register security information** user action. Microsoft requires combined registration for this design and recommends report-only validation before enforcement. Starting July 6, 2026, those policies also apply during Windows Hello for Business and macOS Platform SSO credential registration. ([protect security information registration](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration))

**Analysis:** this is where a bootstrap loop can appear: the user must register a strong method, but the registration ceremony requires a strong method the user does not yet have. Fix the bootstrap path; do not disable the resource's MFA policy. Microsoft's documented pattern uses a time-limited Temporary Access Pass so an administrator can establish trust and let the user register securely.

### Registration campaign

A registration campaign is a nudge to set up Authenticator or a passkey after an interactive MFA sign-in. It is not interchangeable with the ID Protection registration deadline or an immediate MFA requirement. Microsoft also says Conditional Access policies governing security-information registration evaluate before the campaign nudge. Record the campaign state when it affects the user experience, but do not label every 50079 event a registration-campaign failure. ([MFA registration campaign](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-registration-campaign))

## Recover a managed user without weakening MFA

If the user has an allowed working method, let the supported interactive flow continue to **Security info** and register the intended method. If the method picker does not show an expected option, Microsoft recommends checking whether the interruption comes from MFA or SSPR enforcement, whether the method is enabled, and whether a recent policy change has propagated. Registration events appear in the audit log under the **Authentication Methods** service. ([combined registration troubleshooting](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-registration-mfa-sspr-combined-troubleshoot))

If the user has no usable method, use the tenant's approved identity-proofing and recovery process before issuing a Temporary Access Pass:

1. Verify the requester's identity through the approved help-desk or privileged recovery procedure.
2. Confirm TAP is enabled for the user's group in the Authentication methods policy.
3. Have an Authentication Administrator create a short-lived TAP for a member account. A Privileged Authentication Administrator is required when the target is an administrator.
4. Deliver the pass through the approved secure channel; never paste it into an ordinary ticket or public chat.
5. Have the user sign in interactively to **Security info** and register the intended durable method.
6. Confirm the registration audit event and a successful MFA sign-in, then remove obsolete methods and the recovery artifact according to policy.

Microsoft documents TAP as a time-limited passcode for bootstrap and recovery. It can be scoped for one use or multiple sign-ins, and a federated-domain user who signs in with TAP authenticates in Entra instead of being redirected to the federated IdP. TAP does not replace the user's password, and only users included in the TAP policy can use it. ([Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass))

Do not select **Require re-register for multifactor authentication** as a generic repair. Microsoft documents that the action deactivates hardware OATH tokens and deletes the user's phone, Microsoft Authenticator, and software OATH methods before requiring setup again. Use it only when the existing registration must be invalidated under an approved recovery or compromise procedure. Deleting a healthy method can turn a recoverable prompt into a lockout. ([manage a user's MFA methods](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-userdevicesettings))

For a broader recovery design, the site's [Microsoft Entra account recovery deployment guide](/posts/microsoft-entra-account-recovery-deployment) covers identity proofing, privileged roles, TAP, and evidence handling. The [MFA rollout guide](/posts/microsoft-365-mfa-rollout-strategy-conditional-access-authentication-strength) explains how to stage method and authentication-strength changes before they become incident traffic.

## Repair the federated MFA claim path

For a federated user, start with read-only evidence. Retrieve the domain's current federation configuration:

```powershell
Connect-MgGraph -Scopes "Domain-InternalFederation.Read.All"
Get-MgDomainFederationConfiguration -DomainId "contoso.com" |
  Format-List DisplayName,IssuerUri,PassiveSignInUri,FederatedIdpMfaBehavior
```

Microsoft's federation guidance tells administrators to document `federatedIdpMfaBehavior`, legacy `SupportsMfa` when the newer property is unset, and `PromptLoginBehavior`. The newer property controls whether Entra accepts, enforces, or rejects MFA performed by the federated IdP. Changing it affects the federated domain, so do not patch it during one user's incident without proving the intended tenant-wide design. ([federation configuration guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/migrate-from-federation-to-cloud-authentication#document-current-federation-settings))

Then correlate three facts:

1. Did the IdP actually perform a second factor for this request?
2. Did its outgoing assertion include the documented MFA authentication-method claim?
3. Was the domain configured for Entra to accept or require that federated claim?

For AD FS, Microsoft documents the `multipleauthn` claim as the evidence passed to Entra after successful two-step verification. Validate the MFA adapter event and the outgoing Microsoft Office 365 Identity Platform relying-party assertion; do not create a rule that asserts MFA when no second factor occurred. ([secure Entra resources with MFA and AD FS](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-adfs))

If one federated user needs to bootstrap an Entra authentication method, a properly issued TAP can provide a controlled Entra-authenticated path without changing the domain's federation behavior. That is a recovery tool, not a substitute for repairing a broken federated MFA claim path that affects the domain.

## Make applications surface the registration interaction

A compliant interactive client should treat the interruption as a signal to perform an interactive authorization request. If a custom application displays AADSTS50079 as a terminal error, verify that it follows the supported silent-then-interactive MSAL pattern and preserves the same tenant, resource, scopes, and claims challenge.

Do not put an interactive human account into an unattended script and then exempt it from MFA when enrollment is required. Where the API supports application permissions, redesign legitimate daemon work to use a workload identity. If the operation requires delegated user context, choose a supported interactive workflow with the application owner rather than weakening the user policy.

## Validate registration and token issuance separately

Retest one controlled interactive sign-in and collect both evidence streams.

In **Entra ID > Monitoring & health > Audit logs**, filter the Service to **Authentication Methods** and confirm the intended event. Microsoft documents distinct events for an individual method registration and for “User registered all required security information.” A canceled interrupt-mode flow is recorded as a failure for the latter event. ([combined registration audit events](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-registration-mfa-sspr-combined-troubleshoot#audit-logs))

In the new sign-in record, verify:

- the intended user, home tenant, resource tenant, application, and resource;
- a supported interactive request;
- the expected policy source and Conditional Access result;
- the method sequence and successful MFA evidence;
- successful token issuance and resource access;
- no unexpected exclusion or weaker grant;
- no repeated 50079 interruption on a fresh session.

The registration report may still show its old state because of its documented latency. The audit and sign-in events are the transaction evidence; the report is the later inventory check. For field-by-field log interpretation, use the [Conditional Access sign-in-log guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs).

## Mitigation, rollback, and escalation

Use the narrowest mitigation that matches the failed branch:

- **Managed user has no method:** issue a controlled TAP after identity verification, then register an allowed durable method.
- **Method is registered but not capable:** correct the intended Authentication methods policy scope or use an allowed method; do not enable a weak method tenant-wide.
- **Registration ceremony is blocked:** repair the specific Register security information policy or bootstrap design, preserving equivalent protection.
- **ID Protection registration deadline expired:** complete registration; do not extend or disable the policy for a single avoidable enrollment issue.
- **Federated IdP omitted MFA evidence:** repair the IdP's second-factor and outgoing-claim path after validating the domain-wide federation setting.
- **Custom client remains silent:** implement the supported interactive fallback instead of retrying the same silent request.
- **Suspected service incident:** preserve identifiers and check Microsoft 365 service health through authorized tenant access before changing policy.

Rollback means restoring the last known-good narrow configuration: the intended method targeting, registration policy scope, or federation claim behavior. It does not mean disabling MFA, converting administrators to permanent exclusions, trusting an unverified MFA claim, or leaving a recovery pass valid indefinitely.

Escalate to Microsoft or the responsible identity-provider/application owner when the audit and sign-in records contradict each other, registration succeeds but every fresh sign-in returns 50079, multiple users cross the same failure boundary, or the federated IdP demonstrably emits MFA evidence that Entra does not accept under the documented configuration. Include the sanitized error, user and tenant IDs, application and resource IDs, UTC window, request and correlation IDs, policy results, registration audit event, federation behavior, IdP event identifiers, and last known success.

## AADSTS50079 administrator checklist

- [ ] Capture the complete error, UTC time, request ID, correlation ID, user, app, and resource.
- [ ] Find the matching sign-in and confirm error code 50079.
- [ ] Read Authentication Details and every Conditional Access result.
- [ ] Classify the identity as managed, federated, or cross-tenant.
- [ ] For managed users, compare MFA registered with MFA capable.
- [ ] Confirm at least one intended method is allowed by current policy.
- [ ] Identify the control that forced registration.
- [ ] Check Register security information policy scope and bootstrap design.
- [ ] Issue TAP only after identity verification and only where supported.
- [ ] For federated users, preserve domain settings and validate the actual MFA claim.
- [ ] Confirm Authentication Methods audit success.
- [ ] Confirm a fresh sign-in satisfies MFA and issues the intended token.
- [ ] Remove temporary recovery artifacts according to policy.
- [ ] Escalate with one correlated evidence package when the control-plane records disagree.

## Frequently asked questions

### Is AADSTS50079 the same as AADSTS50076?

No. AADSTS50076 says the request requires a new MFA interaction. AADSTS50079 says a managed user needs security-information enrollment or a federated user needs an MFA claim from the IdP. A client might encounter both during one recovery, but they identify different boundaries.

### Why does the user show MFA registered but still receive AADSTS50079?

Registered does not always mean capable. Microsoft Graph defines `isMfaRegistered` without requiring the method to be allowed by current policy, while `isMfaCapable` requires a registered strong method that the Authentication methods policy permits. Also account for report latency and prove the live transaction with audit and sign-in evidence.

### Will clearing browser cookies fix AADSTS50079?

Clearing cookies can force a fresh session, but it cannot register an allowed method or repair a missing federated MFA claim. Preserve the original sign-in evidence, fix the identified enrollment or federation boundary, and then retest in a clean session if needed.

### Can I exclude the user from Conditional Access temporarily?

Not as the default fix. A broad exclusion hides the requirement and can leave the account weaker. Use a documented bootstrap credential such as TAP where supported, or correct the narrow policy-targeting error with an owner, expiry, monitoring, and rollback plan.

### Can an external guest receive a TAP from the resource tenant?

No. Microsoft documents that a TAP can be issued to an internal guest but not an external guest. An external guest can use a TAP from the home tenant only when the home requirements and cross-tenant MFA trust support it.

### Does a successful registration audit event prove application access works?

No. It proves the registration transaction. Verify a separate fresh sign-in showing successful MFA, token issuance, and access to the intended resource. Registration, authentication, and application authorization are distinct stages.

The operating rule is simple: **classify first, then repair the missing proof**. For a managed identity, make an intended strong method usable and complete registration. For a federated identity, prove the second factor and the outgoing MFA claim. In both cases, let the audit and sign-in records—not a broad policy change—tell you when the incident is actually resolved.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Authentication Methods Activity](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-methods-activity)
- [userRegistrationDetails resource](https://learn.microsoft.com/en-us/graph/api/resources/userregistrationdetails?view=graph-rest-1.0)
- [List userRegistrationDetails](https://learn.microsoft.com/en-us/graph/api/authenticationmethodsroot-list-userregistrationdetails?view=graph-rest-1.0)
- [Manage authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage)
- [Configure the MFA registration policy](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-mfa-policy)
- [Protect security information registration with Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-security-info-registration)
- [Troubleshoot combined security information registration](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-registration-mfa-sspr-combined-troubleshoot)
- [Configure Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [Manage user authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-userdevicesettings)
- [Secure Entra resources with multifactor authentication and AD FS](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-adfs)
- [Migrate from federation to cloud authentication](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/migrate-from-federation-to-cloud-authentication)
