---
title: "AADSTS700082 Refresh Token Expired: Microsoft Entra Fix"
excerpt: "Fix AADSTS700082 refresh token expired errors by tracing the failed non-interactive sign-in, restoring interaction, and fixing application token handling."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-23T09:10:10-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**AADSTS700082 refresh token expired** means a client tried to use a Microsoft Entra refresh token after that token had been inactive for the period stated in the error. Microsoft classifies this as `ExpiredOrRevokedGrantInactiveToken` and calls it an expected part of the token lifecycle when a user has not used the application for an extended time. It is not, by itself, proof of a tenant outage, a bad client secret, or a Conditional Access block. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

The immediate recovery is a new interactive authorization request so the user can authenticate and the application can obtain fresh token material. The durable fix is to determine why the application exposed an ordinary lifecycle boundary as a broken session: perhaps it never fell back from silent acquisition to interaction, kept retrying an unusable cached grant, ran without a user interface, or confused this code with a different expiry or revocation event.

Grab a coffee before clearing every cache in sight. The failed refresh attempt is useful evidence. Preserve the error, tenant, application, resource, user, UTC time, trace ID, correlation ID, and request ID before changing the session.

## AADSTS700082 refresh token expired: the fast path

Use this sequence for one affected user and application:

1. Capture the complete error response, including `invalid_grant`, `AADSTS700082`, the token issue date and inactivity period when shown, trace ID, correlation ID, and UTC timestamp.
2. Confirm the tenant, user, client application ID, target resource, and environment. Do not troubleshoot a test app, a guest's home tenant, or another app registration by mistake.
3. Open **Entra ID > Monitoring & health > Sign-in logs > Non-interactive user sign-ins** and find the failed token request by user, application, status, and time.
4. Expand any grouped row. Record the exact failed event, resource ID, client, IP context, Conditional Access result, and neighboring successes or failures.
5. Compare the code with the decision table below. `700082`, `700084`, `70043`, and `50173` do not have the same cause.
6. Start one approved interactive sign-in through the application. For a well-designed client, that means its normal sign-in, redirect, pop-up, or device-code recovery path—not manually copying tokens.
7. Verify a new successful interactive event followed by a successful non-interactive token request for the same application and resource.
8. If the app keeps surfacing the error, fix its authentication-library and token-cache behavior. Do not lengthen Conditional Access sessions or weaken MFA to hide an inactivity expiry.

This guide is based on current Microsoft documentation and operational analysis. It does not claim that the flow was reproduced in a production tenant for this article.

## What AADSTS700082 proves—and what it does not

`AADSTS700082` proves that Microsoft Entra rejected the refresh grant because of inactivity. The token endpoint normally returns the OAuth error `invalid_grant`; Microsoft's protocol guidance says unusable grant material requires a new request to the `/authorize` endpoint for a fresh authorization code. ([error response guidance](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#error-codes-for-authorization-endpoint-errors))

It does **not** prove any of the following:

- the user's password is wrong;
- the user account is disabled or locked;
- the application secret or certificate expired;
- an access token was rejected by the resource;
- Conditional Access sign-in frequency invalidated the grant;
- an administrator explicitly revoked the user's sessions; or
- every session for the user has expired.

A refresh token is sent to Microsoft Entra to obtain new access tokens. It is not the access token presented to Microsoft Graph, Exchange Online, SharePoint, or a custom API. The site's [access-token and refresh-token architecture guide](/posts/access-token-vs-refresh-token-in-microsoft-identity) explains that trust boundary in detail.

Keep these neighboring outcomes separate:

**`AADSTS700082` — inactive refresh token.** Preserve the failed redemption, then start a new interactive authorization flow.

**`AADSTS700084` — fixed SPA refresh-token lifetime.** Send the single-page app through the sign-in page. Replacement tokens inherit the original 24-hour boundary.

**`AADSTS70043` — Conditional Access sign-in frequency.** Read the applied session policy and require the intended reauthentication.

**`AADSTS50173` — revoked grant.** Investigate password, session-revocation, or administrator actions before restoring the session.

**`AADSTS70000` — generic invalid refresh grant.** Use the full response and protocol evidence; do not assume inactivity.

Microsoft lists `70008` as an older or broader inactive-grant result as well. Match the exact code emitted by the tenant instead of normalizing every refresh failure to `700082`.

## Understand the inactive refresh-token boundary

Microsoft's current default-lifetime table lists **Refresh Token Max Inactive Time** as 90 days. It also states that refresh and session token lifetimes have not been configurable through token lifetime policies since January 30, 2021; properties that attempted to set those lifetimes are ignored for new tokens. Conditional Access **sign-in frequency** is the supported control for how often users must sign in, but that is a separate policy path with a separate error result. ([configurable token lifetimes](https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes#token-lifetime-policies-for-refresh-tokens-and-session-tokens-retired))

Do not turn that default into a universal promise. Microsoft documents important scenario-specific behavior:

- refresh tokens issued to redirect URIs registered as `spa` have a fixed 24-hour lifetime;
- extra SPA refresh tokens obtained from the initial token carry over that original expiration time;
- refresh tokens for email one-time-passcode authentication also use a 24-hour default; and
- refresh tokens can be revoked before their expected lifetime because of credential, user, administrator, or policy events.

The current [refresh-token reference](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens) says clients should securely discard an old refresh token after receiving a replacement and must handle expiration or revocation by sending the user through interactive authentication. An application that stores a refresh token without maintaining a supported cache and recovery flow is holding a perishable credential, not a permanent session.

**Analysis:** treat the inactivity period in the actual `700082` response as evidence for that failed grant. Use the 90-day default to understand the normal model, not to overrule a scenario-specific lifetime or the tenant's emitted result.

## Find the failed refresh in non-interactive sign-in logs

Refresh-token redemption normally appears under **Non-interactive user sign-ins**. Microsoft defines these as delegated sign-ins performed by a client app or operating-system component on behalf of a user without a fresh factor. Its examples explicitly include an OAuth 2.0 refresh token being used to obtain an access token. ([non-interactive user sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins))

Start with the UTC timestamp and identifiers from the error. Then record:

- user display name, sign-in identifier, and object ID;
- home tenant and resource tenant;
- application name and application ID;
- resource name and resource ID;
- client app and client credential type;
- status, failure reason, error code, and additional details;
- IP address and location context;
- Conditional Access status and applied session policies when available;
- request ID, correlation ID, and unique token identifier when present; and
- the expanded event time inside any grouped non-interactive row.

Microsoft groups otherwise identical non-interactive events by application, user, IP address, status, and resource ID. A row can therefore represent several attempts. Expand it before concluding that there was one failure. Microsoft also cautions that the IP address shown for a non-interactive sign-in performed by a confidential client can be the IP from the original token issuance rather than the network source of the later refresh request. Do not use that field alone to locate a daemon, server, or user. ([non-interactive log considerations](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins#special-considerations))

The sign-in activity model is **who, how, and what**: user, client, and resource. The request ID corresponds to an issued token, while the correlation ID is supplied by the client and is useful but not guaranteed to be unique or correct. Compare several fields before joining application telemetry to the Entra event. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is useful when an interactive recovery produces several resource and policy events.

## Choose the correct recovery path

### A normal desktop, mobile, or web client can show interaction

Use the application's supported sign-out/sign-in or interactive token-acquisition path. A valid recovery may complete silently if the browser still has an eligible Microsoft Entra session; otherwise the user will see the authentication, MFA, consent, or Conditional Access challenges that currently apply.

For MSAL.NET, Microsoft documents that `AcquireTokenSilent()` can raise `MsalUiRequiredException` with an invalid-grant result and that the application should retry through an appropriate interactive method. ([understanding `MsalUiRequiredException`](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/understanding-msaluirequiredexception)) For MSAL.js, an expired refresh token leads the library to attempt a silent authorization-code path; when that cannot complete, the app receives `InteractionRequiredAuthError` and should use a login or interactive acquire-token call. ([MSAL.js token lifetimes](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/token-lifetimes))

The app should return the user to the intended route after recovery, preserve anti-forgery state and PKCE protections, and avoid creating an interaction loop. Do not display raw tokens, complete authorization responses, or cache contents in a support page.

### A background process has no user interface

Stop and classify the workload. A refresh token obtained for a user is a delegated credential. If the process is expected to run indefinitely without a user, repeatedly asking someone to perform interactive recovery may be the wrong architecture.

Where the API and business authorization model permit, evaluate an application identity—managed identity, certificate-based client credentials, or workload identity federation—with only the application permissions required. That is an architecture decision, not an automatic fix: application permissions can be more powerful than delegated access and require explicit consent, ownership, monitoring, and credential controls. Do not convert a delegated job to app-only merely to suppress `700082`.

If delegated user context is genuinely required, document who owns the account, how reauthorization is initiated, what happens while it is unavailable, and how the operator verifies that the restored grant has the same intended scopes.

### A script copied a refresh token into storage

Replace the hand-built lifecycle with a supported authentication library and secure token cache. Microsoft's MSAL guidance recommends acquiring from the cache silently and falling back to an interactive flow when the library reports that user interface is required. It explicitly advises applications not to implement token expiration and refresh logic themselves. ([MSAL.NET best practices](https://learn.microsoft.com/en-us/entra/msal/dotnet/getting-started/best-practices#token-cache))

Never paste a refresh token into a ticket, chat, source file, pipeline variable, or diagnostic bundle. Treat exposure as credential exposure and follow the organization's incident and revocation process.

## Fix repeated AADSTS700082 errors in the application

One successful sign-in clears the immediate incident. Repetition points to an application defect or an unsuitable operating model. Review these controls with the application owner:

1. **Supported library:** use a current MSAL or supported platform library for the application's language and client type.
2. **One authoritative cache:** avoid parallel caches that keep resurrecting an old grant after another component has recovered.
3. **Silent-first, interactive-second:** attempt silent acquisition, then branch on the library's interaction-required exception rather than parsing English error text.
4. **No blind retries:** an inactive refresh token will not become usable because the same request is sent faster. Stop bounded retries and request interaction once.
5. **Account and authority match:** bind cached entries to the intended account, tenant authority, client ID, and scopes. A new token for another account does not repair the failed session.
6. **Stateful web sessions:** server-side web apps need a durable, protected, partitioned token cache. A process restart should not mix or orphan user grants.
7. **User-safe recovery:** keep the original destination and explain that sign-in is required; do not label an expected reauthentication as an outage.
8. **Telemetry without secrets:** log the error code, request and correlation IDs, tenant, client, resource, account identifier, UTC time, library version, and recovery outcome—never the token.
9. **Test the lifecycle boundary:** validate cache loss, inactive accounts, revoked grants, MFA changes, Conditional Access changes, browser cookie restrictions, and a genuinely expired refresh token in a nonproduction tenant.

Do not catch every `invalid_grant` and automatically erase the entire application's cache. That can sign out unaffected users, destroy evidence, and conceal a wrong-authority or PKCE defect. Classify the response and remove only the unusable account entry when the library's supported pattern calls for it.

## Do not weaken security to hide the prompt

The wrong fixes are tempting because they appear to restore silence:

- do not disable Conditional Access;
- do not increase sign-in frequency solely because `700082` appeared;
- do not create a broad client secret for a user-delegated job without an authorization review;
- do not grant `offline_access` or new API permissions unless the application actually requires and is approved for them;
- do not keep retrying with a copied refresh token; and
- do not instruct a user to approve an unexpected MFA prompt merely to make the application reconnect.

`700082` is an inactivity boundary. Conditional Access sign-in frequency generates `70043` when that policy invalidates the refresh path. Microsoft's token-lifetime guidance also says refresh and session lifetimes are no longer adjustable through token lifetime policies. A policy relaxation therefore does not repair the expired grant and may weaken unrelated sign-ins.

If the new interactive attempt triggers MFA that the user did not initiate or shows an unexpected tenant, application, consent request, or scope, stop. Verify the application and user through an approved channel before continuing.

## Validate recovery and monitor recurrence

Successful recovery has four layers:

1. the interactive authorization event succeeds for the intended user, tenant, and application;
2. the application obtains fresh token material through its supported library;
3. a following non-interactive request succeeds for the intended resource; and
4. the intended business action succeeds without an unexpected permission, account, or tenant change.

Do not use “the window closed” as proof. Compare the new request and correlation IDs, application and resource IDs, UTC time, account, and Conditional Access outcome. The [Microsoft Entra token lifetime and revocation guide](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) provides the broader session model when an incident also involves revocation or Continuous Access Evaluation.

For recurring failures, alert on error code `700082` grouped by application and user, not on a single isolated event. A lone failure after a long-unused app is normal. A sudden tenant-wide cluster can indicate a broken cache deployment, an authority change, a library regression, a mass reimage, or a background design that depends on unattended delegated grants.

**Analysis:** the operational threshold should reflect the app's expected use. Ten inactive users returning to a seasonal app are different from ten active users failing in the same hour after a release.

## AADSTS700082 administrator checklist

- [ ] Preserve the full error and UTC identifiers before clearing session state.
- [ ] Confirm error `700082`, not `700084`, `70043`, `50173`, or generic `invalid_grant`.
- [ ] Confirm the user, home and resource tenants, client application, and target resource.
- [ ] Find and expand the failed non-interactive sign-in event.
- [ ] Check neighboring interactive and non-interactive events for the same app and user.
- [ ] Use one supported interactive authorization flow to recover.
- [ ] Verify a fresh successful interactive event and subsequent token request.
- [ ] Review application cache, authority, account selection, retry, and UI-required handling.
- [ ] Reassess unattended delegated workloads instead of normalizing manual reauthorization.
- [ ] Keep tokens and authorization responses out of support records.
- [ ] Monitor recurrence by app, user, release, and time window.
- [ ] Escalate with request ID, correlation ID, trace ID, UTC time, tenant, client, resource, and library version.

## Frequently asked questions

### Is AADSTS700082 a Microsoft Entra outage?

Not by itself. Microsoft documents the code as an expected refresh-token inactivity expiry. Check service health when there are broader symptoms, but first verify the specific non-interactive event and application recovery behavior.

### Can an administrator renew the expired refresh token?

No supported admin action turns that expired grant back into a valid one. The application must start a new authorization flow and obtain new token material after the user satisfies the current authentication and policy requirements.

### Should I change the 90-day refresh-token lifetime?

No. Microsoft says refresh and session token lifetimes are no longer configurable through token lifetime policies. Use the default lifecycle and implement correct interactive recovery. Use Conditional Access sign-in frequency only when the organization intentionally requires more frequent reauthentication.

### Why did the user not see a prompt?

Refresh redemption is a non-interactive operation. A prompt appears only when the client recognizes that silent acquisition cannot continue and starts an interactive flow. If the app only displays the raw error, its recovery handling is incomplete.

### Why does the same application work for another user?

Refresh-token state belongs to a particular user-client relationship and cache entry. Another user's active grant does not prove this user's inactive grant is valid. Compare account, authority, tenant, scopes, application version, and last successful use.

### Does signing in to another Microsoft 365 app refresh this app's token?

Do not assume it does. Microsoft Entra and Microsoft authentication libraries have family and single-sign-on behaviors in supported scenarios, but the failing app still needs a valid supported acquisition path for its client, account, authority, and requested resource. Verify the new event rather than inferring recovery from another app.

## Final takeaway

AADSTS700082 is usually a routine lifecycle event made painful by weak recovery design. Preserve the failed non-interactive request, prove the user-client-resource boundary, start one supported interactive authorization flow, and verify the next token request. Then fix the application so silent acquisition can hand off cleanly to interaction without loops, secret leakage, policy weakening, or a permanent human dependency for an unattended workload.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [Configurable token lifetimes](https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes)
- [Non-interactive user sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins)
- [Sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Understanding `MsalUiRequiredException`](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/understanding-msaluirequiredexception)
- [Manage token lifetimes in MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/token-lifetimes)
- [MSAL.NET best practices](https://learn.microsoft.com/en-us/entra/msal/dotnet/getting-started/best-practices)
