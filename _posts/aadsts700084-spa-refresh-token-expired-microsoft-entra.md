---
title: "AADSTS700084 SPA Refresh Token Expired: Entra Fix Guide"
excerpt: "Fix AADSTS700084 SPA refresh token expired errors by restoring top-level interaction, repairing MSAL fallback, and validating the 24-hour token boundary."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-13T09:40:36-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**AADSTS700084 SPA refresh token expired** means Microsoft Entra rejected a refresh token that was issued to a single-page application because that token reached its fixed lifetime. Microsoft says the lifetime cannot be extended and the SPA must send a new sign-in request to the sign-in page. This is not, by itself, evidence of a tenant outage, a bad client secret, or a Conditional Access block. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

The immediate recovery is a new authorization-code flow through a top-level browser navigation or an approved interactive popup. The durable fix is in the client: use a supported Microsoft Authentication Library (MSAL), try silent token acquisition first, and fall back to one controlled interactive request when the library reports that interaction is required.

Grab a coffee before deleting every browser cache. The failed request contains the evidence that separates an expected 24-hour SPA boundary from an application loop, a browser-cookie limitation, or a different token failure.

## AADSTS700084 SPA refresh token expired: the fast path

1. Capture the complete error, token issue time and lifetime when shown, UTC timestamp, trace ID, correlation ID, request ID, tenant ID, application ID, and resource.
2. Confirm that the failed redirect URI is registered as platform type **Single-page application**, not Web or Mobile and desktop applications.
3. Find the failed request in **Entra ID > Monitoring & health > Sign-in logs**. Start with **Non-interactive user sign-ins**, which include refresh-token use, then correlate the interactive recovery event. ([non-interactive user sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins))
4. Confirm that the code is `700084`, not `700082`, `70043`, `50173`, or a generic `invalid_grant`.
5. Start one supported interactive acquisition through the SPA. Use a top-level redirect when popup behavior is unreliable or the application is embedded.
6. Verify that the SPA completes the authorization-code flow with Proof Key for Code Exchange (PKCE), returns to an exact registered redirect URI, and can then obtain an access token silently.
7. If the raw error returns after every 24-hour boundary, fix the SPA's MSAL initialization, account selection, redirect handling, cache, and interaction fallback. Do not weaken MFA or Conditional Access.
8. Monitor the next lifecycle boundary in a controlled browser test before closing the incident.

This guide uses current Microsoft documentation and operational analysis. It does not claim that the flow was reproduced in a production tenant.

## What AADSTS700084 proves—and what it does not

Microsoft defines `AADSTS700084` narrowly: the refresh token was issued to an SPA, its fixed limited lifetime elapsed, and the SPA must send a new sign-in request to the sign-in page. ([error-code reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

It does **not** prove that:

- the user's access token was valid for 24 hours;
- the user must type a password every 24 hours;
- the Microsoft Entra browser session disappeared;
- an administrator revoked every user session;
- Conditional Access sign-in frequency caused the failure;
- the client secret expired; or
- a longer refresh-token policy would repair the application.

The 24-hour boundary belongs to refresh tokens sent to a redirect URI registered with the `spa` platform type. Microsoft documents a 24-hour default for SPAs and says that replacement refresh tokens acquired from the initial token **carry over the original expiration time**. Repeated refreshes do not slide that boundary forward. ([refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens#token-lifetime))

This is the first critical distinction: a newly returned refresh token is not necessarily a new 24-hour clock.

The second distinction is between **interaction** and **credential entry**. When the browser still has an eligible Entra session, a top-level redirect can complete without asking the user to enter credentials. Current authentication requirements still apply, however, so the user might see MFA, consent, a device requirement, or another Conditional Access challenge.

## Put the failure in the SPA token flow

A modern SPA should use the OAuth 2.0 authorization-code flow with PKCE. Microsoft requires a redirect URI configured for the SPA platform to enable the browser's cross-origin token redemption and recommends authorization code with PKCE over the implicit flow. An SPA must not contain a client secret. ([authorization-code flow for SPAs](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#redirect-uris-for-single-page-apps-spas))

The healthy sequence is:

1. the browser navigates to Microsoft Entra and obtains an authorization code;
2. the SPA redeems that code with its PKCE verifier;
3. MSAL caches the resulting account and token material;
4. the SPA requests access tokens with `acquireTokenSilent`;
5. MSAL uses the cache and refresh mechanism while they remain valid; and
6. when silent acquisition can no longer continue, the SPA starts one interactive redirect or popup and rebuilds the supported cache state.

`AADSTS700084` appears at step 4 or 5 when the fixed SPA refresh-token chain has expired. The correct transition is to step 6. Blindly repeating the same refresh request cannot extend an already expired chain.

The site's [access-token and refresh-token architecture guide](/posts/access-token-vs-refresh-token-in-microsoft-identity) explains why the access token sent to an API and the refresh token redeemed at Microsoft Entra have different jobs and lifetimes.

## Preserve evidence before forcing interaction

Capture the browser and Entra evidence before signing the user out or clearing storage:

- complete OAuth error and numeric AADSTS code;
- error description with token issue time and lifetime when present;
- UTC event time, request ID, correlation ID, and trace ID;
- home tenant and resource tenant;
- user object ID and sign-in identifier;
- application name, client ID, and deployed application version;
- target resource and requested scopes;
- redirect URI and its configured platform type;
- MSAL package and version;
- browser, operating system, embedded or top-level context, and cookie restrictions; and
- the last successful silent request and the first failed request.

Do not record authorization codes, access tokens, ID tokens, refresh tokens, session cookies, PKCE verifiers, or browser-storage contents. Those are credentials or credential-adjacent material, not support evidence.

Microsoft lists **Reports Reader** as the least-privileged role for access to tenant activity logs, while each user can review their own sign-ins at My Sign-Ins. The documented admin path is **Entra ID > Monitoring & health > Sign-in logs**. ([troubleshoot sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors#gather-sign-in-details))

Use the who-how-what model in the event: user, authentication path, and resource. The Basic info tab exposes the error code, failure reason, and identifiers; the Conditional Access and Authentication details show what the recovery request evaluated. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details#sign-in-activity-details))

## Separate neighboring refresh-token failures

Treat the exact code as a routing decision:

**`AADSTS700084` — fixed SPA lifetime.** The token came from an SPA redirect URI and its fixed chain expired. Send the browser through a supported interactive authorization flow.

**`AADSTS700082` — inactive refresh token.** The grant expired after an extended period without use. The site's [AADSTS700082 inactivity guide](/posts/aadsts700082-refresh-token-expired-microsoft-entra) covers that different lifecycle boundary.

**`AADSTS70043` — sign-in frequency.** Conditional Access required reauthentication based on a session policy. Review the applied policy with the [AADSTS70043 sign-in-frequency guide](/posts/aadsts70043-sign-in-frequency-microsoft-entra).

**`AADSTS50173` — expired or revoked grant.** A password, session-revocation, or other event can invalidate the grant. Preserve the initiating evidence and use the [AADSTS50173 revoked-grant runbook](/posts/aadsts50173-grant-expired-revoked-microsoft-entra).

**Generic `invalid_grant`.** Read the complete response. Wrong authority, redirect, code reuse, PKCE, consent, and other grant problems require their own evidence; do not relabel all of them as `700084`.

This comparison prevents two common security mistakes: relaxing Conditional Access to repair an ordinary SPA lifetime, and revoking every user session when only one application's supported refresh chain reached its designed boundary.

## Restore top-level interaction safely

Microsoft says the browser must visit the sign-in page in a **top-level frame** when the SPA refresh-token chain expires. Browser privacy controls that block third-party cookies are the reason a hidden iframe cannot always use the Microsoft Entra session. ([refresh-token lifetime note](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens#token-lifetime))

Choose the recovery interaction according to the application's context.

### Top-level redirect

Use a redirect when it is acceptable to navigate the current page away and back. Preserve the intended in-app destination in application state, validate the returned state, and complete redirect processing before calling another login or acquire-token method.

A redirect is usually the cleanest option when the SPA is embedded, popup blocking is common, or browser privacy behavior is inconsistent. It makes the Microsoft Entra page first-party in the current tab, allowing the browser to present the eligible Entra session.

### Interactive popup

A popup can preserve the SPA's current page, but it must be opened from a user gesture where the browser requires one. Microsoft notes that popup reliability varies and recommends an interactive fallback whenever silent acquisition fails. ([third-party-cookie guidance for SPAs](https://learn.microsoft.com/en-us/entra/identity-platform/reference-third-party-cookies-spas#performance-and-ux-implications))

Do not launch multiple popups for parallel API calls. Serialize the interaction so one user action repairs the account session and waiting requests can reuse the result.

### Embedded SPA

An iframe cannot navigate its top-level parent unless the embedding design permits it. Microsoft says silent token acquisition no longer works in an iframe when third-party cookies are blocked; the embedded app must use a popup or coordinate authentication with its top-level host. Do not work around this boundary by asking users to disable browser privacy protections tenant-wide.

## Repair the MSAL fallback instead of hiding the error

Microsoft's MSAL.js guidance is explicit: request tokens with `acquireTokenSilent` first, then fall back to an interactive method when `InteractionRequiredAuthError` is raised. ([acquire and use tokens with MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/acquire-token#attempt-silent-request-first-then-interactive), [MSAL.js error handling](https://learn.microsoft.com/en-us/entra/identity-platform/msal-error-handling-js#errors-that-require-interaction))

Review these implementation boundaries with the application owner:

1. **Initialize once.** Await MSAL initialization before redirect handling or token acquisition.
2. **Finish redirect handling.** Complete the redirect promise before starting another interactive or silent request. Microsoft documents both ordering requirements in its [common MSAL.js errors reference](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors).
3. **Select the intended account.** Bind the request to the correct cached account and authority rather than assuming the first entry belongs to the user.
4. **Request silently first.** Let MSAL own access-token cache and refresh behavior; do not implement a raw refresh-token loop in application code.
5. **Classify interaction-required errors.** Move to one redirect or popup rather than retrying the failed refresh grant.
6. **Serialize interaction.** Prevent parallel API calls from starting competing redirects or popups.
7. **Preserve claims challenges.** When a resource returns a Conditional Access claims challenge, pass the claims through the supported request instead of discarding them.
8. **Keep telemetry token-free.** Record code, identifiers, authority, account key, scopes, library version, and recovery outcome—not token values.
9. **Use exact redirect URIs.** Confirm scheme, host, path, case behavior, environment, and platform type for every deployed SPA route.
10. **Test the fixed boundary.** A successful login today does not prove that tomorrow's interactive fallback works.

Microsoft warns that silent acquisition is never guaranteed, even when the refresh token has not yet expired. Optimization settings can reduce inconvenient interruptions, but they do not remove the requirement for a correct interactive fallback. ([MSAL.js token lifetime guidance](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/token-lifetimes))

## Do not use the tempting fixes

- **Do not add a client secret to the SPA.** Browser code cannot keep a secret, and Microsoft prevents client-credential use when an `Origin` header identifies a browser flow.
- **Do not change the redirect URI to Web just to seek a longer token.** Platform type describes the real client architecture and controls CORS and token handling. Misclassification creates a different security problem.
- **Do not disable MFA or Conditional Access.** The 24-hour SPA boundary is independent of those controls.
- **Do not force-refresh on every API call.** That increases network traffic and does not extend the original SPA refresh-token expiration.
- **Do not parse English error text.** Route on supported library exceptions and structured codes.
- **Do not clear all site data as the normal recovery.** It destroys evidence and can hide broken redirect or account-selection logic.
- **Do not log tokens to prove expiry.** Use the emitted issue time, lifetime, correlation identifiers, and Entra evidence.

If a new interactive request prompts for unexpected consent, shows the wrong tenant, requests unfamiliar scopes, or triggers MFA the user did not initiate, stop and verify the application through an approved channel.

## Validate the repair across the full boundary

Validation needs more than a successful redirect:

1. reproduce the expired or interaction-required branch in a nonproduction account or controlled browser session;
2. confirm that exactly one interactive request begins;
3. confirm the request uses authorization code with PKCE and an exact registered SPA redirect URI;
4. verify the user returns to the intended application state;
5. verify a new interactive sign-in event for the correct user, client, tenant, and resource;
6. confirm the next `acquireTokenSilent` call succeeds without another interaction;
7. confirm the protected API accepts the new access token;
8. test a browser with third-party-cookie restrictions and the application's embedded mode, if supported; and
9. repeat the lifecycle test at the next fixed boundary or with a supported test harness.

Keep Conditional Access in the validation. A successful user should satisfy the current policy, while an out-of-scope device, account, or authentication method should remain blocked. Recovery is complete only when availability returns **and** neighboring controls still enforce their intended boundaries.

**Analysis:** alert on clusters by application version and browser, not on one expected expiry. A single event near the designed boundary can be normal. A release that causes every active user to see a raw `700084` error indicates a broken fallback. A browser-specific spike points toward popup, iframe, redirect, or cookie behavior.

## Troubleshoot the failure that remains

**The SPA loops between the app and Microsoft Entra.** Confirm that redirect handling completes before another login call, state is preserved, the redirect URI does not immediately trigger a second interaction, and only one component owns authentication.

**A popup opens and closes without recovery.** Inspect popup blocking, user-gesture requirements, redirect completion, router behavior, and competing interactive requests. Prefer a top-level redirect when popup support is unreliable.

**The event changes to a Conditional Access failure.** The fixed token boundary is cleared and the new authorization attempt reached current policy. Investigate that policy result; do not call it a persistent `700084` failure.

**The application works in one browser only.** Compare third-party-cookie restrictions, tracking prevention, embedded context, popup behavior, extensions, and deployment version. Do not instruct users to disable browser security globally.

**The app registration shows a Web redirect URI.** Verify the actual architecture. If the code runs entirely in the browser, migrate through an approved change to the SPA platform and authorization code with PKCE. Do not flip the type during an incident without testing every environment.

**No matching sign-in event appears.** Recheck the UTC time, tenant, client ID, account, log tab, grouping, and identifiers. Correlate application telemetry with the request and correlation IDs rather than a display name.

**The failure returns immediately after interaction.** Confirm that the deployed client is using the newly created MSAL cache entry, that another tab or worker is not restoring stale state, and that the request targets the same account, authority, scopes, and redirect URI that just succeeded.

For Microsoft escalation, provide the UTC time, trace ID, correlation ID, request ID, tenant ID, client ID, redirect URI and platform type, resource, sanitized scopes, browser and operating system, MSAL package/version, deployment version, sign-in event, and a token-free network trace. Never attach credentials or complete authorization responses.

## AADSTS700084 administrator checklist

- [ ] Capture the complete error and UTC identifiers before clearing state.
- [ ] Confirm code `700084` and the issue-time/lifetime evidence.
- [ ] Verify the user, tenant, SPA client ID, resource, scopes, and environment.
- [ ] Confirm the failing redirect URI is registered as platform type SPA.
- [ ] Find the failed non-interactive event and correlate the interactive recovery.
- [ ] Separate `700084` from `700082`, `70043`, `50173`, and generic `invalid_grant`.
- [ ] Use one supported top-level redirect or interactive popup.
- [ ] Verify authorization code with PKCE and exact redirect handling.
- [ ] Confirm a later silent token acquisition and protected API call succeed.
- [ ] Keep Conditional Access, MFA, consent, and assignment controls intact.
- [ ] Test embedded and privacy-restricted browser scenarios where supported.
- [ ] Monitor recurrence by app version, browser, and time since authorization.

## Frequently asked questions

### Can an administrator extend the AADSTS700084 token lifetime?

No. Microsoft defines this SPA lifetime as fixed and says replacement refresh tokens inherit the original expiration. The application must be ready to run a new authorization-code flow.

### Does the user need to type a password every 24 hours?

Not necessarily. The browser must visit the sign-in page in a top-level context, but an eligible Entra session can let that interaction complete without credential entry. Current Conditional Access and authentication requirements still decide whether the user must perform a factor.

### Why did a newly returned refresh token expire so soon?

SPA refresh tokens obtained from the original refresh token carry over the original chain's expiration. A replacement issued near the end of that chain can therefore have much less than 24 hours remaining.

### Is clearing local storage the fix?

It can force a clean start, but it is not the durable application fix. A healthy SPA recognizes that silent acquisition requires interaction, starts one supported redirect or popup, and reconstructs its library-managed cache.

### Should the app use a Web redirect URI for a longer session?

Only if the architecture is actually a server-side confidential web application. A browser-only SPA cannot safely keep a client secret. Its redirect URI must represent the real platform and use the supported SPA flow with PKCE.

### Why does AADSTS700084 appear in non-interactive sign-ins?

The failed operation is refresh-token redemption without a fresh user interaction. The recovery creates an interactive authorization event, followed by later non-interactive token acquisitions. Correlate both sides of that transition.

## Final takeaway

AADSTS700084 is an expected security boundary that becomes an outage only when a SPA has no clean way back to interaction. Preserve the failed request, prove the SPA redirect and fixed token chain, send the browser through one top-level authorization flow, and verify the next silent acquisition. Then repair the MSAL fallback so the same boundary is routine rather than a support incident.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Acquire and use tokens with MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/acquire-token)
- [Handle errors and exceptions in MSAL.js](https://learn.microsoft.com/en-us/entra/identity-platform/msal-error-handling-js)
- [Manage token lifetimes in MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/token-lifetimes)
- [Common errors in MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors)
- [Handle third-party cookie blocking in SPAs](https://learn.microsoft.com/en-us/entra/identity-platform/reference-third-party-cookies-spas)
- [Troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors)
- [Non-interactive user sign-ins](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-noninteractive-sign-ins)
- [Sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
