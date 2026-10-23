---
title: "AADSTS50173 Grant Expired or Revoked: Microsoft Entra Fix"
excerpt: "Fix AADSTS50173 grant expired or revoked errors by tracing the token cutoff, finding the revocation event, and restoring access through fresh sign-in."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-23T17:10:46-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**AADSTS50173 grant expired or revoked** means Microsoft Entra rejected an existing user grant and needs the application to start a fresh authentication flow. The useful evidence is in the error itself: compare when the grant was issued with the `TokensValidFrom` cutoff. Then find the failed refresh in non-interactive sign-in logs and identify the password, session-revocation, or security event that moved the cutoff forward.

The immediate fix is a supported interactive sign-in for the intended user, tenant, application, and resource. The investigation still matters. A routine password reset, a deliberate incident-response action, an unexplained administrator change, and an application that keeps replaying stale cache state can all end with the same visible error but require different follow-up.

Grab a coffee before clearing every session in sight. Preserve the full error, UTC time, trace ID, correlation ID, request ID, tenant, user, application, and resource. Microsoft's dedicated guidance identifies password change or reset, refresh-token expiry, and administrator revocation as causes of AADSTS50173. It also directs the application to obtain a fresh token through reauthentication. ([Microsoft support guidance for AADSTS50173](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50173-grant-expired-revoked))

## AADSTS50173 grant expired or revoked: the fast path

Use this sequence for one affected user and application:

1. Capture the complete response, especially `authTime`, `TokensValidFrom`, trace ID, correlation ID, and UTC timestamp.
2. Confirm the home tenant, resource tenant, user object ID, client application ID, target resource, and environment.
3. Open **Entra ID > Monitoring & health > Sign-in logs > Non-interactive user sign-ins** and locate the failed token request.
4. Expand grouped rows and record the exact failed event, resource, client, IP context, Conditional Access result, and neighboring events.
5. Compare `authTime` with `TokensValidFrom`. A grant issued before the cutoff is no longer acceptable even if its cached artifact still exists.
6. Review Entra audit logs around the cutoff for a password change, password reset, user update, or session-revocation action. Confirm the initiator, target, result, and correlation ID.
7. If the revocation was expected and the account is safe, use the application's normal interactive sign-in path to obtain new token material.
8. If the event is unexplained or tied to suspected compromise, contain and investigate first. Do not tell the user to approve a prompt until the identity and application are verified.
9. Verify a new successful interactive sign-in and a later successful non-interactive token request for the same user, client, and resource.
10. If the error returns, fix the application's token-cache and interaction-required handling instead of repeatedly revoking sessions.

This guide is based on current Microsoft documentation and operational analysis. It does not claim that AADSTS50173 was reproduced in a production tenant for this article.

## What AADSTS50173 proves—and what it does not

Microsoft's current error reference says that the presented grant was issued at `authTime`, but the user's token-validity boundary is now `TokensValidFrom`. The security token service therefore refuses to turn that older grant into new token material. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

That proves a server-side validity boundary rejected the grant. It does **not** prove any one cause by itself:

- the administrator intentionally revoked sessions;
- the user changed or reset a password;
- the account is compromised;
- Conditional Access blocked the request;
- the user account is disabled;
- the client secret or certificate expired;
- an access token presented to a resource was malformed; or
- every application-owned browser session has already ended.

Keep the adjacent outcomes separate:

**`AADSTS50173` — grant revoked against a token-validity cutoff.** Find the change that advanced the boundary, then obtain a fresh grant if recovery is authorized.

**`AADSTS700082` — refresh token expired after inactivity.** Use the site's [AADSTS700082 inactive refresh-token guide](/posts/aadsts700082-refresh-token-expired-microsoft-entra) when the error names inactivity rather than revocation.

**`AADSTS70043` — Conditional Access sign-in frequency invalidated the refresh path.** Read the applied session control and require the intended reauthentication.

**`AADSTS700084` — a single-page application's fixed refresh-token lifetime ended.** Send the SPA through a supported sign-in-page flow.

**`AADSTS50076` — a fresh MFA interaction is required.** That can be the next step after revocation; it is not evidence that MFA caused the earlier grant to be invalidated.

The site's [access-token versus refresh-token guide](/posts/access-token-vs-refresh-token-in-microsoft-identity) explains why a rejected refresh grant and an already-issued access token are different artifacts.

## Read the token cutoff before changing anything

The two times in the AADSTS50173 response provide a compact causal boundary:

**`authTime`** is the issuance time Microsoft reports for the rejected grant.

**`TokensValidFrom`** is the date before which token material is no longer valid for that user in this decision.

If `authTime` is earlier than `TokensValidFrom`, the grant belongs to the invalidated side of the line. The correct recovery is new authentication after the cutoff—not extending the old grant, editing its cache entry, or retrying it until it works.

Microsoft Graph's `revokeSignInSessions` operation makes the same control-plane idea visible through a current API. It invalidates the user's refresh tokens and browser session cookies by resetting `signInSessionsValidFromDateTime` to the current time. Microsoft notes a possible delay of a few minutes before revocation takes effect. ([Microsoft Graph `revokeSignInSessions`](https://learn.microsoft.com/en-us/graph/api/user-revokesigninsessions))

Do not treat the error's `TokensValidFrom` label and the Graph property name as interchangeable fields in every log or API. Treat them as evidence of the same operational boundary: token material rooted before the applicable validity time is rejected. Preserve the exact names and values emitted by each source.

## Find the failed refresh in non-interactive sign-in logs

Refresh-token redemption normally appears under **Non-interactive user sign-ins**. Microsoft defines these events as delegated requests made by a client or operating-system component on behalf of a user without a fresh authentication factor. Its examples explicitly include a client using an OAuth 2.0 refresh token to obtain an access token. ([Non-interactive sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins))

Start with the error's UTC timestamp and identifiers. Then record:

- user display name, sign-in identifier, and object ID;
- home tenant ID and resource tenant ID;
- application name and application ID;
- resource name and resource ID;
- client app and client credential type;
- status, error code, failure reason, and additional details;
- IP address and location context;
- Conditional Access status and applied session policies when shown;
- request ID, correlation ID, and unique token identifier when present; and
- the expanded event time within a grouped row.

Microsoft groups otherwise identical non-interactive events when application, user, IP address, status, and resource ID match. Expand the row before deciding there was one attempt. Microsoft also cautions that a confidential client's non-interactive IP address can reflect the original token issuance rather than the later refresh request's network source. ([Non-interactive sign-in log considerations](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins#special-considerations))

The sign-in detail model separates **who**, **how**, and **what**: user, client, and resource. Request ID corresponds to an issued token; correlation ID is supplied by the client and is useful but not guaranteed to be correct or unique. Use several fields when correlating application telemetry. ([Sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

For a broader field-by-field workflow, use the site's [Conditional Access sign-in-log guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs). AADSTS50173 is a revoked-grant result, but the new interactive recovery still evaluates the policies that apply now.

## Identify what moved the validity boundary

The failed sign-in tells you which grant was rejected. Audit and security evidence should explain why.

### The user changed or reset a password

Microsoft's refresh-token revocation table is intentionally nuanced. A user password change, self-service password reset, or administrator password reset can revoke password-based tokens, but the outcome differs for non-password-based cookies, non-password-based tokens, and confidential-client tokens. The exact reset path also matters. ([Refresh-token revocation behavior](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens#token-revocation))

Do not reduce the investigation to “the password changed, therefore every token died.” Confirm the authentication method and client type, locate the password event, and compare its time with the error cutoff. Microsoft Entra audit activities include **Change password (self-service)**, **Reset password (self-service)**, and **Reset password (by admin)**. ([Microsoft Entra audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities#self-service-password-management))

If the password action was expected and the user is safe, a new interactive sign-in is normal recovery. If it was unexpected, treat the password event as an incident signal, not a help-desk explanation.

### An administrator or automation revoked sessions

In the Entra admin center, the documented user path is **Entra ID > Users > All users > select the user > Overview > Revoke sessions**. Microsoft Graph exposes the `revokeSignInSessions` user action; Microsoft Graph PowerShell exposes `Revoke-MgUserSignInSession -UserId <id>`. The Graph API's least-privileged permission is `User.RevokeSessions.All`. ([Revoke user access in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access), [Microsoft Graph `revokeSignInSessions`](https://learn.microsoft.com/en-us/graph/api/user-revokesigninsessions))

Record who initiated the action, the target user, the success or failure result, its UTC time, the incident or change record, and whether the action was manual or automated. Microsoft Entra audit records expose fields such as `activityDateTime`, `activityDisplayName`, `initiatedBy`, `targetResources`, `result`, and `correlationId`. ([Microsoft Graph `directoryAudit` resource](https://learn.microsoft.com/en-us/graph/api/resources/directoryaudit))

Do not “undo” a deliberate revocation by immediately signing the user back in. Confirm that the incident owner, termination workflow, risk remediation, or policy-change owner authorizes restoration.

### A security response invalidated the old session

Revocation can be the desired outcome after suspected credential theft, a lost device, account disablement, elevated user risk, or another containment event. Microsoft's emergency-access guidance warns that invalidating refresh tokens is only part of access removal: already-issued access tokens, application session cookies, devices, and product-local sessions have their own enforcement paths. ([Revoke user access in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access))

Continuous Access Evaluation can enforce critical events such as password change or reset, account disablement, high user risk, and explicit refresh-token revocation near real time when the client and resource support CAE. Microsoft documents that propagation can still take up to 15 minutes, and unsupported combinations fall back to their ordinary token behavior. ([Continuous Access Evaluation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation))

Analysis: AADSTS50173 is evidence that this particular token request reached Microsoft Entra and was rejected. It is not proof that every earlier access token, third-party application cookie, offline session, or resource-local token has been invalidated. Validate containment at each relevant control plane.

### No matching change is visible

Do not invent an administrator action. Check whether your retention window still covers the event, whether the relevant logs are being exported, whether the user is external, and whether the change occurred in another tenant.

Microsoft documents seven days of sign-in and audit-log retention for Entra ID Free and 30 days for P1 or P2 unless the data is routed to longer-term storage. Audit and sign-in logs are distinct from the Microsoft 365 unified audit log. ([Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention))

For B2B users, Microsoft says refresh tokens are not revoked from the resource tenant; revocation must occur in the home tenant. The Graph `revokeSignInSessions` documentation likewise says the API does not revoke external-user sessions because those users authenticate through their home tenant. ([Refresh-token revocation behavior](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens#token-revocation), [Microsoft Graph `revokeSignInSessions`](https://learn.microsoft.com/en-us/graph/api/user-revokesigninsessions))

If the cutoff remains unexplained, preserve the error and log exports and escalate with the tenant IDs, user object ID, application and resource IDs, UTC times, trace ID, request ID, correlation ID, client version, and evidence window.

## Restore access without weakening the revocation

Choose the recovery path by security state.

### Expected change, trusted user, interactive client

Use the application's supported sign-out/sign-in, redirect, pop-up, broker, or device-code recovery flow. The user must satisfy the authentication, MFA, consent, device, and Conditional Access requirements that apply now. A browser session may make part of that flow silent, but the application still needs new token material rooted after the cutoff.

Verify the tenant, application name, publisher, requested permissions, and resource before the user approves anything. Revocation does not make an unexpected consent or MFA prompt safe.

### Suspected compromise or unexplained revocation

Keep the session invalidated. Follow the organization's identity incident procedure: confirm the user through an approved channel, review risky-user and sign-in evidence, protect the account, check registered authentication methods and devices, inspect application consent and inbox or workload persistence where relevant, and document the authority that permits restoration.

Do not ask the user to keep trying prompts while the incident is unresolved. Repeated successful reauthentication can issue fresh token material to an attacker who still controls the password, factor, device, or browser session.

### Background process using a user's grant

A background job with a delegated user refresh token needs an owner and a supported reauthorization path. If it is supposed to run indefinitely without a user, review whether the workload should use an application identity, managed identity, or workload identity federation instead. That is an authorization redesign, not a quick fix: application permissions can be broader and require explicit consent, ownership, monitoring, and least-privilege review.

Do not replace a revoked user token with a shared client secret simply to restore uptime.

## Fix an application that keeps replaying AADSTS50173

Microsoft recommends that MSAL applications try silent acquisition first and fall back to an interactive method when the library reports that user interface is required. MSAL maintains the token cache and can refresh token material; application code should not parse English error text or implement its own refresh-token lifecycle. ([Acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens))

Review these controls with the application owner:

1. **Supported library:** use a current MSAL or supported platform library for the client type.
2. **One authoritative cache:** prevent an old process, node, profile, or browser tab from restoring pre-cutoff state after another instance recovers.
3. **Silent first, interactive on demand:** handle the library's interaction-required result and preserve the user's intended destination.
4. **Bounded retries:** the same revoked grant does not become valid after rapid retry. Stop the loop and request one approved interaction.
5. **Correct authority and account:** bind cache entries to the intended account, tenant, client ID, and scopes.
6. **Protected web-app cache:** partition server-side caches by user and tenant; do not fall back to process memory for a multi-instance production app.
7. **No token logging:** record identifiers, error classification, library version, and recovery outcome—not access tokens, refresh tokens, cookies, or authorization responses.
8. **Revocation tests:** in a nonproduction tenant, validate user password change, admin session revocation, browser-cookie behavior, app restarts, multi-node caches, and recovery under current Conditional Access.

For MSAL.NET, Microsoft's error-handling guidance uses interactive acquisition for UI-required failures. For single-page applications, Microsoft similarly documents that silent requests can fail after password changes or policy updates and must fall back to a supported pop-up or redirect. ([MSAL.NET error handling](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/msal-error-handling), [MSAL.js token acquisition](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token))

## Validate recovery and watch for recurrence

Successful recovery has four layers:

1. the approved interactive sign-in succeeds for the intended user, tenant, and application;
2. the application receives and stores fresh token material through its supported library;
3. a later non-interactive request succeeds for the intended resource; and
4. the business action succeeds without an unexpected account, tenant, permission, or policy change.

Compare the new event with the failed one. Confirm that the new token material was issued after the cutoff, then match user, application, resource, request and correlation identifiers, Conditional Access result, and client context. Do not use “the error disappeared” as the only proof.

Monitor repeated AADSTS50173 failures by application, user, tenant, client version, and time window. A short cluster immediately after a deliberate bulk revocation may be expected while clients discover that interaction is required. A long tail from one application points to stale cache or weak recovery handling. Repeated cutoffs without a matching approved action require a security investigation.

The site's [token lifetime, revocation, and CAE guide](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) provides the wider session model when the incident also involves already-issued access tokens or application cookies.

## AADSTS50173 administrator checklist

- [ ] Preserve the complete error, `authTime`, `TokensValidFrom`, IDs, and UTC time.
- [ ] Confirm the home tenant, resource tenant, user, application, and resource.
- [ ] Find and expand the failed non-interactive sign-in.
- [ ] Compare the rejected grant time with the validity cutoff.
- [ ] Review password, user, session-revocation, risk, and incident evidence around the cutoff.
- [ ] Confirm whether the revocation was expected and who authorized restoration.
- [ ] For B2B, investigate the user's home tenant rather than assuming the resource tenant can revoke the session.
- [ ] Use one supported interactive sign-in only after the identity and application are trusted.
- [ ] Verify a new successful interactive event and a later successful token request.
- [ ] Fix stale cache, retry loops, wrong authority, or missing interaction-required handling.
- [ ] Validate access-token, application-session, device, and product-local containment separately when security is involved.
- [ ] Escalate unexplained cutoffs with exported evidence and stable identifiers.

## Frequently asked questions

### Can an administrator make the old grant valid again?

No supported action turns the rejected pre-cutoff grant into a valid one. The application must obtain new token material through a fresh authorization flow after the user satisfies current controls.

### Does AADSTS50173 mean the user's password was reset?

Not necessarily. Password changes and resets are documented causes, but an administrator can also revoke sessions, and token behavior varies by credential and client type. Prove the cause from audit and security evidence.

### Does Revoke sessions instantly end every session?

No. Microsoft Graph notes a possible delay of a few minutes for the refresh-token revocation. Existing access tokens, CAE support, and application-issued session cookies also affect when access actually stops. Validate the relevant resource and application instead of treating the button as a universal logout receipt.

### Why does only one application keep failing?

That application may still hold cache state rooted before the cutoff, may use a different account or authority, or may not implement interactive fallback. Compare the application's user, tenant, client ID, resource, cache, and library version with a working client.

### Should I revoke sessions again to fix AADSTS50173?

Usually not. Another revocation moves the validity boundary forward again; it does not repair the application's recovery logic. Revoke again only when a new security or policy reason justifies invalidating the newly issued session.

## Final takeaway

AADSTS50173 is a boundary, not a mystery expiry. Microsoft Entra received grant material rooted before the user's current validity cutoff and refused to extend it. Preserve the failed non-interactive event, use audit and security evidence to explain the cutoff, and authorize one fresh interactive sign-in only when the account and application are safe. Then fix any client that keeps resurrecting the revoked state.

## Microsoft sources

- [AADSTS50173 support guidance](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50173-grant-expired-revoked)
- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes)
- [Refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [Non-interactive sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins)
- [Sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Microsoft Entra audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities)
- [Revoke user access in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access)
- [Microsoft Graph `revokeSignInSessions`](https://learn.microsoft.com/en-us/graph/api/user-revokesigninsessions)
- [Continuous Access Evaluation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation)
- [Acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens)
- [Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)
