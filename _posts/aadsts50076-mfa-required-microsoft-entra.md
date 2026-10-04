---
title: "AADSTS50076 MFA Required: Microsoft Entra Fix Guide"
excerpt: "Fix AADSTS50076 MFA required errors by tracing Conditional Access, per-user MFA, session changes, app interaction, registered methods, and sign-in evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-04T19:13:26-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS50076 MFA required** response means Microsoft Entra needs a fresh multifactor-authentication interaction before it can issue the requested token. The reliable fix is to identify the exact sign-in and resource, determine what introduced the MFA requirement, then either let the user complete a supported interactive flow or repair the application so it can handle that interaction. Disabling MFA, excluding the user from Conditional Access, or repeatedly clearing credentials treats the security requirement as the bug.

Microsoft defines AADSTS50076 as `UserStrongAuthClientAuthNRequired`: an administrator configuration change, per-user MFA enforcement, or a location change can require the user to perform MFA, and the client should retry with a new authorization request for the resource. In a well-built interactive application, that can be a normal control-plane response on the way to a successful prompt. It becomes an incident when the application cannot surface the prompt, the user cannot satisfy it, or the requirement is unexpected. ([Microsoft Entra authentication error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

## AADSTS50076 MFA required: the short answer

Work through these checks in order:

1. Capture the complete error, UTC timestamp, request ID, correlation ID, application, resource, tenant, client type, and last successful time.
2. Find the matching event in **Entra ID > Monitoring & health > Sign-in logs**. Confirm that it is the same user, app, resource, IP address, and correlation ID.
3. Decide whether the event is an expected interruption or a failed sign-in. If a later correlated event shows successful MFA and token issuance, the requirement worked.
4. Open **Authentication Details** and **Conditional Access**. Identify the policy source, authentication sequence, method result, requirement-satisfied detail, and any session control.
5. Check for Conditional Access changes, per-user MFA, Security Defaults, mandatory MFA for the resource, a new network location, sign-in-frequency expiry, or a stronger authentication requirement.
6. If the error came from silent token acquisition, make the client retry interactively for the same resource. For a downstream API, preserve and return the claims challenge to the user-facing client.
7. If the user reached an MFA prompt but could not finish, troubleshoot the registered method, authentication-method policy, device, network, and exact later error. Do not assume AADSTS50076 itself proves a bad method.
8. Retest once, then verify the successful event and the MFA evidence in the sign-in log.

These steps are an editorial troubleshooting sequence, not a report of a tenant test performed for this article.

## Understand what AADSTS50076 does—and does not—mean

Microsoft Entra evaluates the token request against the authentication state already present in the session and the requirements that apply to the requested resource. If the existing state does not contain acceptable MFA proof, Entra requires a new interaction. The user might have signed in successfully with a password moments earlier; that does not guarantee the session satisfies a later MFA requirement for another resource.

AADSTS50076 is therefore different from several adjacent results:

| Result | What it tells you | First investigation |
| --- | --- | --- |
| `AADSTS50076` | A new MFA interaction is required | Requirement source and client interaction handling |
| `AADSTS50074` | Strong authentication was required and the user did not pass the MFA challenge | Authentication Details and method failure |
| `AADSTS50078` | Previously presented MFA has expired under policy | Session and sign-in-frequency controls |
| `AADSTS50079` | A managed user needs MFA registration, or a federated user needs an MFA claim from the external IdP | Registration state or federated MFA claims |
| `AADSTS53003` | Conditional Access blocked token issuance | Failed policy result and unmet grant control |

Those codes can appear in the same support conversation, but they are not interchangeable. Microsoft's current error reference explicitly separates the required interaction, failed challenge, expired proof, enrollment requirement, and Conditional Access block. Read the exact event rather than a help-desk paraphrase such as “MFA is broken.” ([Microsoft Entra authentication error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

For a policy block, use the site's [AADSTS53003 Conditional Access guide](/posts/aadsts53003-access-blocked-by-conditional-access). For a broader field-by-field investigation, the [Conditional Access sign-in-log guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains how to follow the runtime evidence without starting in the policy editor.

## Step 1: preserve the failed request

Record the evidence before asking the user to clear cookies, re-register a method, or try five more times:

- complete error text and exact AADSTS code;
- UTC timestamp, request ID, correlation ID, and trace ID when present;
- user object ID and sign-in identifier;
- home tenant and resource tenant;
- application name and Application (client) ID;
- resource name and resource service-principal ID;
- interactive or non-interactive sign-in type;
- authentication protocol and client application;
- IP address, named location result, device state, operating system, and browser;
- last success, first failure, and recent policy, network, app, or method changes.

In the sign-in log, verify that the record actually belongs to the reported attempt. A user can generate several entries while one app acquires tokens for multiple resources. Correlation IDs are client-supplied and are not guaranteed to be accurate, so match the user, time, application, and resource as well. Microsoft documents the request ID and correlation ID as core sign-in fields, and events participating in one Conditional Access sequence can share the same correlation ID. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details), [Conditional Access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies))

Do not paste access tokens, refresh tokens, authorization codes, one-time passcodes, or complete claims challenges into the ticket. Keep identifying details in your approved internal support system; redact them before sharing publicly.

## Step 2: decide whether the requirement actually failed

An AADSTS50076 response can be the middle of a successful flow. A silent request cannot display an MFA prompt, so Entra returns an interaction requirement. The client then opens an interactive authorization request, the user completes MFA, and a later sign-in succeeds.

Search a narrow time window for the same user, application, resource, and correlation context:

- **AADSTS50076 followed by success:** likely expected silent-to-interactive behavior. Confirm the successful event contains the required authentication evidence.
- **AADSTS50076 with no interactive follow-up:** likely a client that swallowed the interaction requirement, blocked a pop-up, lost the redirect, or failed before launching a user-facing flow.
- **AADSTS50076 followed by another MFA error:** the client reached the next stage; troubleshoot the later result rather than continuing to diagnose the initial interruption.
- **Repeated AADSTS50076 loops:** compare the resource, tenant, session, browser storage, claims request, and redirect handling across every attempt. Do not assume repeated prompts mean the policy evaluated incorrectly.

Microsoft warns that one sign-in-log field cannot tell the whole MFA story. A prior strong-authentication claim can satisfy a requirement without a new prompt, and some records can look single-factor when the relevant MFA proof came from an earlier session. Review **Authentication Details**, the method sequence, policy source, and requirement-satisfied information together. Newly logged Authentication Details can be incomplete until aggregation finishes; recheck a fresh record before drawing conclusions. ([MFA sign-in reporting](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-reporting))

## Step 3: identify what required MFA

Open the matching sign-in and read the **Conditional Access** and **Authentication Details** tabs before editing anything. Microsoft documents that Authentication Details exposes the sequence of methods, success or failure, and the policy sources applied, including Conditional Access, per-user MFA, and Security Defaults. ([MFA sign-in reporting](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-reporting))

### Read the actual method result

1. Open the matching sign-in event and select **Authentication Details**.
2. Read the method sequence, result, and detail explaining how the requirement was satisfied or denied.
3. Compare that evidence with the **Conditional Access** policy result before proposing a change.

[![Microsoft Entra sign-in Authentication Details tab showing authentication methods and results](https://learn.microsoft.com/en-us/entra/identity/authentication/media/howto-mfa-reporting/auth-details-tab.png)](https://learn.microsoft.com/en-us/entra/identity/authentication/media/howto-mfa-reporting/auth-details-tab.png)

*Microsoft-published product screenshot from [MFA sign-in reporting](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-reporting). This illustrates the tab, not a captured AADSTS50076 incident from this site. Your tenant’s interface and results may differ. [Open full-size screenshot](https://learn.microsoft.com/en-us/entra/identity/authentication/media/howto-mfa-reporting/auth-details-tab.png).*

Check these sources separately:

### Conditional Access

Record every policy evaluated for the event, not only the one with the most recognizable name. Confirm:

- user and group targeting;
- resource targeting;
- client application and authentication-flow conditions;
- location, platform, device, and risk conditions;
- grant controls, including MFA or authentication strength;
- session controls, especially sign-in frequency;
- report-only versus enabled state;
- exclusions and emergency-access design.

The policy editor describes configuration; the sign-in event records what Entra evaluated for this request. If you cannot see both sign-in logs and policy details, Microsoft lists **Security Reader** as the least-privileged built-in role that provides both views. ([Conditional Access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies))

### Per-user MFA and Security Defaults

Do not assume every MFA requirement comes from Conditional Access. Authentication Details can expose per-user MFA or Security Defaults as the source. If per-user MFA is still part of the tenant's design, document it explicitly rather than creating a compensating Conditional Access exclusion. If the long-term design is Conditional Access, migrate deliberately and test; do not toggle enforcement during an incident without understanding who else relies on it.

### Resource-driven and mandatory MFA

Some Microsoft administration resources enforce MFA independently of customer-created exclusions. Microsoft’s mandatory MFA guidance says existing stricter Conditional Access requirements still apply and recommends preparing users and workloads with supported authentication patterns. Treat the target resource as evidence, not just the front-end application's name. ([mandatory Microsoft Entra MFA](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-mandatory-multifactor-authentication))

### Location and session change

The AADSTS50076 definition includes movement to a new location as an example because a new network context can cause policy to evaluate differently. Compare the failing IP address, named location, Global Secure Access path, VPN or proxy egress, and prior successful event. A location change is a policy input; it is not proof that the user travelled or that the IP is malicious.

Sign-in frequency can also require reauthentication when an otherwise valid session reaches the configured interval. Microsoft documents periodic or every-time reauthentication and notes that overly frequent prompting can reduce productivity and encourage unsafe approval habits. Verify the session control that actually applied before lengthening it. ([Conditional Access session lifetime](https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-session-lifetime))

## Step 4: make the client handle interaction correctly

If a browser or first-party Microsoft client displays the prompt and the user completes it, the application path is probably working. If a custom application surfaces AADSTS50076 as a terminal error, the application owner has work to do.

Microsoft's supported MSAL pattern is:

1. try to acquire a token silently;
2. catch the library's interaction-required result;
3. acquire a token interactively for the same scopes and resource;
4. allow Entra to display the MFA experience;
5. cache and use the resulting token through the library.

For MSAL.NET, an MFA or Conditional Access requirement during silent acquisition can raise `MsalUiRequiredException`. Microsoft instructs the client to fall back to interactive acquisition. For a single-page application, the equivalent pattern is `acquireTokenSilent()` followed by `acquireTokenPopup()` or `acquireTokenRedirect()` when interaction is required. ([MSAL.NET error handling](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/msal-error-handling), [single-page app token acquisition](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token))

Do not build logic that retries the same silent request forever. Silent acquisition is silent by definition; it cannot collect the additional factor Entra just required.

### Downstream APIs and claims challenges

The more subtle case is a client calling web API A, which then calls protected web API B on the user's behalf. API B can require claims that the incoming user token does not contain. Microsoft documents this interaction-required pattern: the middle-tier API returns the claims challenge to the interactive client, and the client makes a new authorization request with those claims so the user can satisfy MFA. ([Conditional Access developer guidance](https://learn.microsoft.com/en-us/entra/identity-platform/v2-conditional-access-dev-guide), [claims-challenge guidance](https://learn.microsoft.com/en-us/entra/identity-platform/claims-challenge))

The middle tier cannot complete a user MFA prompt by itself. Preserve the challenge, return it through the trusted application path, and let the client that owns the user interaction request a new token. Never log the complete challenge or invent a broader scope as a shortcut.

### Non-interactive scripts and services

A user-delegated flow that depends on silent interaction is fragile for unattended automation because no person is present to satisfy a newly required prompt. Do not exempt a human account from MFA to keep a scheduled job alive. Where the target API supports application permissions, redesign legitimate daemon work to use an app-only client-credentials flow with an appropriate workload identity, permissions, and credential lifecycle. If the operation requires delegated user context, app-only access is not a drop-in replacement; choose a supported workflow with the application owner. Microsoft distinguishes client credentials from user-delegated flows precisely because the daemon acts as itself, not as an interactive user. ([MSAL authentication flows](https://learn.microsoft.com/en-us/entra/identity-platform/msal-authentication-flows))

## Step 5: prove the user can satisfy the requirement

If the interactive prompt appears but the user cannot complete it, move from requirement diagnosis to method diagnosis. Verify:

- the user has a usable authentication method registered;
- the method is allowed for the user by the Authentication Methods policy;
- the method satisfies any applied authentication strength;
- the authenticator, security key, passkey, phone, or certificate is available and healthy;
- the device clock and network path are sane;
- the user did not deny, time out, or report the prompt as suspicious;
- the final sign-in error and Authentication Details match the reported symptom.

Do not delete all registered methods as a first step. That can remove a working recovery path and convert AADSTS50076 into an enrollment problem such as AADSTS50079. If a passkey-specific path fails, use the site's [Microsoft Entra passkey troubleshooting guide](/posts/microsoft-entra-passkey-troubleshooting-common-issues-fixes) to separate policy, platform, transport, and credential-state issues.

A user having “MFA enabled” does not establish that the configured method meets the policy’s [authentication strength](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths). Check the allowed combinations for the actual requirement.

## Step 6: mitigate without weakening the tenant

Choose the mitigation that repairs the failed boundary:

- **Expected prompt, successful completion:** no policy change. Close the ticket with the correlated success evidence.
- **Custom client never becomes interactive:** fix the MSAL or protocol interaction path and claims-challenge handling.
- **Pop-up or redirect is blocked:** repair the supported browser flow, redirect URI behavior, or client configuration.
- **Method cannot satisfy authentication strength:** register or use an allowed method that meets the existing requirement.
- **Unexpected Conditional Access scope:** correct the narrow targeting error through a tested policy change, preferably in report-only or a pilot group first.
- **Unattended job uses a human identity:** redesign it as a workload identity; do not create an MFA bypass for the user.
- **Suspected service issue:** check Microsoft service health, preserve the sign-in identifiers and UTC window, and avoid policy churn while escalating.

For emergency restoration, follow the tenant’s approved emergency-access procedure and verify the resource’s MFA requirements. An exception to a customer Conditional Access policy cannot bypass Microsoft’s mandatory MFA enforcement. Record the owner, expiry, monitoring, and post-incident review for any permitted exception. Do not create a broad “temporary” exclusion from all MFA policies. Verify that the intended security control still applies after access is restored.

## Verify the repair

Retest one controlled attempt and inspect the new sign-in record. A complete verification should show:

- the intended user, tenant, application, and resource;
- an interactive request when interaction was required;
- the expected Conditional Access and authentication policy sources;
- the method sequence and successful MFA result;
- the detail showing how the requirement was satisfied;
- successful token issuance and resource access;
- no unexpected exclusion, weaker grant, or repeated interaction loop.

If the change was in application code, test the initial sign-in, silent renewal, forced reauthentication, downstream API challenge, user cancellation, and an unavailable-method case. One happy-path prompt does not prove the client handles Conditional Access safely.

## Frequently asked questions

### Does AADSTS50076 mean the user entered the wrong MFA code?

No. It means a fresh MFA interaction is required. If the user later fails or cancels the challenge, inspect the later sign-in event and its exact error. AADSTS50074 is the adjacent code Microsoft uses when strong authentication was required and the user did not pass the challenge.

### Why does the user see AADSTS50076 instead of an MFA prompt?

The request might be silent, the custom client might not handle an interaction-required response, a pop-up or redirect might be blocked, or a middle-tier API might not return a claims challenge to the interactive client. Confirm the sign-in type and then inspect the application's token-acquisition path.

### Why did this start after the user changed networks?

The new IP address or named-location result can cause a different Conditional Access outcome. Compare the failing event with the last success, including IP address, named location, resource, device, and policies. Do not add the new address to a trusted location merely to stop the prompt.

### Can clearing the browser fix AADSTS50076?

It can force a new session, but it does not explain or remove the MFA requirement. Use it only as a bounded client-state test after preserving the original event. The durable fix is to satisfy the requirement or repair the client's interactive flow.

### Should I exclude the service account from MFA?

Not as a troubleshooting shortcut. If a job has no user present and its target API supports application permissions, use an app-only workload identity with least privilege. Operations that require delegated user context need a different supported design. If a person is present, the client must support interactive authentication when policy requires it.

AADSTS50076 is best understood as a **transition request**, not automatically a denial: the current session is insufficient, and Entra needs a new interactive authorization step. Follow the evidence from sign-in record to policy source to client behavior to method result. That path repairs the actual boundary while keeping MFA intact.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes)
- [Use sign-in logs to review Microsoft Entra MFA events](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-reporting)
- [Learn about sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [View Conditional Access details in activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [Handle errors and exceptions in MSAL.NET](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/msal-error-handling)
- [Developer guidance for Microsoft Entra Conditional Access](https://learn.microsoft.com/en-us/entra/identity-platform/v2-conditional-access-dev-guide)
- [Claims challenges, claims requests, and client capabilities](https://learn.microsoft.com/en-us/entra/identity-platform/claims-challenge)
- [Configure adaptive session lifetime policies](https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-session-lifetime)
- [Plan for mandatory Microsoft Entra MFA](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-mandatory-multifactor-authentication)
- [Authentication flow support in MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-authentication-flows)
