---
title: "AADSTS9002326 Cross-Origin Token Redemption: Entra Fix"
excerpt: "Fix AADSTS9002326 cross-origin token redemption errors by matching the SPA redirect URI, browser Origin, PKCE request, and Entra app registration."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-27T09:14:48-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS9002326 cross-origin token redemption** error means browser code tried to redeem an authorization code at the Microsoft identity platform token endpoint, but the redirect URI used for that request was not registered as a **Single-page application (SPA)** redirect URI. The dependable fix is to prove what kind of client is redeeming the code, then align the redirect URI's Entra platform type with that architecture. Do not add a client secret to browser code, remove security headers, or disable Conditional Access.

Grab a coffee and keep the failed browser request open. Microsoft's current authorization-code reference says this `invalid_request` occurs when cross-origin token redemption is attempted with a redirect URI that is not marked `spa`. The same reference requires PKCE for SPAs and prevents client credentials from being used when an `Origin` header is present. ([OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#redirect-uris-for-single-page-apps-spas))

This guide is for Microsoft Entra administrators and application owners troubleshooting JavaScript, React, Angular, Vue, Blazor WebAssembly, or another browser-based client. It also covers the important opposite case: a server web app or native application that receives AADSTS9002326 because its token exchange accidentally moved into browser code.

## AADSTS9002326 cross-origin token redemption: the short answer

Work through these checks in order:

1. Capture the complete error, UTC timestamp, request ID, correlation ID, Application (client) ID, authority tenant, request origin, and redirect URI. Never capture the authorization code, tokens, cookies, or secrets.
2. In the browser network trace, confirm that JavaScript sent the failing `POST` to `/oauth2/v2.0/token` and that the request includes an `Origin` header.
3. Decide whether the component redeeming the code is truly a browser SPA, a server-side web application, or a native client.
4. For a real SPA, confirm the exact redirect URI is under **App registrations > the application > Authentication > Single-page application**, not only under **Web** or **Mobile and desktop applications**.
5. Confirm the authorization request and token request use the same redirect URI, the same client ID and tenant, and a matching PKCE `code_challenge` and `code_verifier`.
6. For a server web app, move code redemption back to the backend and keep the redirect URI under **Web**. Never solve the error by exposing the server's client secret to JavaScript.
7. For a native client, use the supported native library and redirect platform instead of redeeming the code through browser `fetch` or `XMLHttpRequest`.
8. Retest with a fresh authorization code, confirm the application works, and preserve the matching sign-in and application-change evidence.

The platform type is not cosmetic metadata. It tells Microsoft Entra which token-redemption security model applies to that exact redirect URI.

## Understand where the failure happens

The authorization code flow has two distinct legs:

```text
Browser -> /authorize -> sign-in -> redirect URI receives a short-lived code
Client  -> /token     -> redeems that code -> receives tokens
```

AADSTS9002326 happens on the second leg. The user can finish authentication and return to the application, but the browser's cross-origin token request is rejected because Entra does not see the redirect URI as an SPA redirect.

Microsoft documents the required SPA model as **authorization code flow with Proof Key for Code Exchange (PKCE)**. The browser obtains a code, then redeems it without a client secret. The redirect URI must be marked `spa` to enable Cross-Origin Resource Sharing (CORS) on the Microsoft login endpoints. ([browser privacy and SPA authorization guidance](https://learn.microsoft.com/en-us/entra/identity-platform/reference-third-party-cookies-spas#overview-of-the-solution), [Microsoft Entra CORS troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/troubleshoot-cross-origin-resource-sharing-issues#scenario-5-cors-error-on-token-endpoint))

That makes AADSTS9002326 different from nearby failures:

- **AADSTS50011** means the callback URI in the request did not match a registered reply URL. Use the [AADSTS50011 reply URL mismatch guide](/posts/aadsts50011-reply-url-mismatch-microsoft-entra).
- A browser message saying **No `Access-Control-Allow-Origin` header** can be the same platform-registration problem, but preserve the token response because AADSTS9002326 gives the more specific Entra reason.
- **AADSTS7000215** means a confidential client presented an invalid secret. A public SPA must not have a secret in browser code. The [AADSTS7000215 guide](/posts/aadsts7000215-invalid-client-secret-microsoft-entra) covers the server-side credential path.
- **`invalid_grant`** after correcting the platform type normally points to a used or expired authorization code, a mismatched redirect URI, or an incorrect PKCE verifier. Start a fresh flow rather than replaying the old code.
- **AADSTS53003** is a Conditional Access block. A platform-type mismatch is not repaired by excluding the user or app from policy.

The site's [federation and token protocol guide](/posts/federation-and-token-protocols-explained-saml-ws-fed-oauth-openid-connect) provides the wider OAuth and OpenID Connect context. Keep this incident narrow: the immediate question is who redeems the code and how that exact redirect URI is classified.

## Preserve browser and Entra evidence first

Open the browser developer tools, reproduce once, and inspect the failed request to a URL shaped like:

```text
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
```

Record only nonsecret evidence:

- complete AADSTS code and sanitized description;
- UTC timestamp, request ID, correlation ID, and trace ID when present;
- Application (client) ID and authority tenant;
- request `Origin`, including scheme, hostname, and port;
- redirect URI, including scheme, hostname, port, path, case, and trailing slash;
- grant type and the presence—not the value—of `code`, `code_verifier`, and `client_secret` parameters;
- application release, environment, browser, and affected user population;
- last known successful time and recent authentication or app-registration changes.

Do not save the authorization code, access token, refresh token, ID token, session cookie, PKCE verifier, client secret, or complete request body in a ticket. Authorization codes are short-lived, but they are still security material. Browser developer tools can also show tokens in responses after a successful test, so sanitize exports before sharing them.

Then correlate the failure in **Entra ID > Monitoring & health > Sign-in logs**. Microsoft recommends capturing the sign-in error code, failure reason, user, request ID, and correlation ID. Its activity-detail model separates **who** signed in, **how** the client participated, and **what** resource was targeted. ([troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors), [sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

The browser trace and sign-in record answer different questions. The browser proves the request origin and token-exchange parameters. The sign-in record proves the tenant, client, resource, user, result, and correlation evidence Entra retained.

## Classify the application before changing the registration

The same callback URL can look plausible for three different client architectures. Follow the executing component, not the framework's marketing label.

### Browser single-page application

The browser downloads JavaScript or WebAssembly, sends the authorization request, receives the code, and calls the token endpoint itself. This is a public client. The supported Entra shape is:

- the exact callback is registered under **Single-page application**;
- authorization code flow uses PKCE;
- the browser sends the matching `code_verifier` during redemption;
- no client secret or certificate private key exists in browser code; and
- an appropriate client library such as MSAL handles token acquisition and caching.

Microsoft's app-registration guidance maps JavaScript, Angular, React, Blazor WebAssembly, and Vue clients to the SPA platform. ([add a redirect URI](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri), [redirect URI platform guidance](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url#what-platform-should-i-add-my-redirect-uris-to))

### Server-side web application

The browser receives a code at a server endpoint, but backend code redeems it. The supported shape is:

- the callback is registered under **Web**;
- the server-to-server token request has no browser `Origin` header;
- the backend protects its client secret or certificate; and
- credentials never enter the JavaScript bundle, browser storage, page source, or browser network request.

If a server web app suddenly produces AADSTS9002326, inspect a recent front-end refactor, authentication proxy, framework adapter, or deployment change that moved token redemption into the browser. Changing the redirect URI to SPA may suppress the immediate error while silently changing the application's trust model.

### Native mobile or desktop application

A native client uses the mobile and desktop platform, a system browser or broker, and the library's native redirect behavior. It does not become an SPA merely because a browser appeared during authentication. If a desktop shell, extension, or embedded runtime calls the token endpoint through a browser-like networking layer that sends `Origin`, verify that the chosen client library and redirect URI are supported for that application type. Do not relabel the registration until the application owner confirms the architecture.

**Analysis:** when one app registration serves SPA, server, and native clients, platform troubleshooting becomes harder because one client ID contains several redirect and credential models. Separate registrations are often easier to own, test, and roll back, but Microsoft does not require a universal one-registration-per-platform design. Treat separation as an architecture decision, not an emergency edit.

## Prove the exact redirect URI and platform type

In the affected tenant:

1. Open **Microsoft Entra admin center > Entra ID > App registrations**.
2. Find the application by the client ID from the failed request, not only by display name.
3. Open **Authentication**.
4. Locate the exact redirect URI used to obtain the code.
5. Record whether it appears under **Single-page application**, **Web**, or **Mobile and desktop applications**.

Compare the strings exactly. Microsoft documents redirect URI paths as case-sensitive. Scheme, hostname, path, and non-localhost port must match; a missing or added trailing slash can also change the effective value. ([redirect URI restrictions](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url#what-are-the-restrictions-of-redirect-uris-for-microsoft-entra-applications))

Local development has one extra trap. Microsoft ignores the port when matching `localhost` redirect URIs, and warns against registering several localhost URIs that differ only by port because Entra can select one registration and its associated platform behavior arbitrarily. Use different paths when local SPA, web, or native clients share an application registration. ([localhost redirect URI behavior](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url#localhost-exceptions))

For a read-only inventory through Microsoft Graph, address the application by client ID and select the three platform collections:

```http
GET https://graph.microsoft.com/v1.0/applications(appId='{client-id}')
    ?$select=id,appId,displayName,spa,web,publicClient
```

The `spa.redirectUris`, `web.redirectUris`, and `publicClient.redirectUris` collections expose the classification without changing it. Microsoft Graph distinguishes the Application (client) ID from the tenant-local application object ID and documents `spa` as the settings container for a single-page application. ([get an application](https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0), [application resource](https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0), [spaApplication resource](https://learn.microsoft.com/en-us/graph/api/resources/spaapplication?view=graph-rest-1.0))

## Repair a true SPA safely

If browser code legitimately owns token redemption, align the implementation and registration as one change.

### 1. Inventory every client using the registration

Record production, test, and local redirect URIs; owners; libraries and versions; implicit-flow dependencies; web backends; native clients; and automation using the same app registration. Moving a shared URI can fix the SPA and break a server client that depended on its previous platform type.

### 2. Prove the code flow and PKCE pair

The authorization request should contain `response_type=code`, a `code_challenge`, and an appropriate challenge method. The token request should contain the returned code, the same redirect URI, `grant_type=authorization_code`, and the matching `code_verifier`. Microsoft requires PKCE for SPA authorization-code flow and recommends supported authentication libraries instead of hand-built requests. ([authorization request parameters](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#request-an-authorization-code), [token redemption parameters](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#redeem-a-code-for-an-access-token))

Do not add `client_secret` to a SPA token request. Microsoft classifies SPAs as public clients and says public clients must not use secrets or certificates when redeeming a code. A value shipped to the browser is no longer confidential.

### 3. Pilot with a distinct callback

Where the application supports it, create a separate pilot callback path such as `/auth/callback-spa-pilot`, register it under **Single-page application**, and point only a test deployment at it. A distinct path prevents Entra from confusing platform behavior for otherwise equivalent localhost or shared callbacks.

Run positive and negative tests:

- expected user, tenant, origin, redirect URI, and resource succeeds;
- a wrong redirect URI remains blocked;
- an incorrect PKCE verifier fails;
- no secret appears in the bundle, browser storage, or request;
- sign-out and interactive fallback behave as designed; and
- Conditional Access still applies as intended.

### 4. Migrate the production URI

Use the app registration's supported migration experience to move the production callback from **Web** to **Single-page application** when it was previously classified as Web. Microsoft's MSAL migration guide describes the Authentication-page migration prompt and recommends moving JavaScript SPAs to MSAL.js 2.x authorization code flow before disabling old implicit-grant settings. ([migrate an SPA from implicit to authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/migrate-spa-implicit-to-auth-code))

Retest with a completely new authorization request. Do not replay the code from the failed attempt: Microsoft documents authorization codes as short-lived, and the old code was issued in the previous request context.

### 5. Retire old behavior only after evidence is clean

Remove unused callback URIs and implicit-grant settings only after every client has moved and a rollback window has passed. Keep the change small and auditable. Do not bulk-delete platform settings as “cleanup” during the repair.

## Repair a web or native client without turning it into an SPA

For a server web application, the correct repair is architectural: let the backend redeem the code. The browser should navigate to the callback, the server should validate the request and exchange the code, and the server should keep confidential credentials in protected server-side storage. Preserve the URI under **Web**.

If a client secret was ever embedded in JavaScript, source maps, browser storage, a static configuration file, or a captured browser request, treat it as exposed. Rotate it through the application's approved process after moving redemption server-side. Do not reuse it simply because it still works.

For a native client, restore the supported MSAL, broker, system-browser, and mobile/desktop redirect pattern. A browser window used for interactive sign-in does not authorize the app to perform an arbitrary browser-origin token request. Confirm the application's redirect type against Microsoft's native platform guidance before changing the registration.

Do not try to “fix” either case by stripping the `Origin` header. Browsers control that header, and hiding the browser origin through an unreviewed proxy does not transform public JavaScript into a confidential server client.

## Validate the repair end to end

A successful token response is necessary, but it is not the whole validation.

1. Start a fresh private browser session or clear only the test application's session state.
2. Run a new authorization request through the intended tenant, client ID, redirect URI, and scopes.
3. Confirm the `/token` response succeeds without AADSTS9002326.
4. Confirm PKCE is present and no secret is present for an SPA.
5. Call the intended API and verify the token audience and delegated scopes through approved local tooling.
6. Review the matching sign-in record using the UTC time, request ID, and correlation ID.
7. Confirm Conditional Access results remain consistent with the approved policy design.
8. Review **Audit logs** for the app-registration change and retain the before-and-after platform inventory.
9. Test sign-in, token renewal, sign-out, and interactive fallback in the supported browser set.

The site's [Conditional Access sign-in log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains how to read the policy result without confusing a successful platform repair with a policy exception.

**Analysis:** a repair is production-ready only when the original browser flow works and the server or native clients sharing the registration still work. A successful test from one localhost origin does not prove the production callback, tenant route, or other platform entries are safe.

## Troubleshoot the remaining symptom

### The error changed to AADSTS50011

The platform type is now being considered, but the redirect URI does not exactly match a registered value. Compare the request and registration character for character, including path case and trailing slash.

### The browser now reports only a CORS error

Confirm the token request uses the exact URI registered under SPA and that the application is using authorization code flow with PKCE. Microsoft does not add token-endpoint CORS headers for unsupported SPA flows.

### The token endpoint returns `invalid_grant`

Start a fresh authorization request. Then compare the code verifier with the challenge that created the code, confirm the code has not already been redeemed, and confirm the token request repeats the same redirect URI.

### The SPA works locally but fails in production

Compare the complete origins and callbacks. Production usually differs by scheme, hostname, path, reverse-proxy base path, or deployment configuration. Do not add wildcards; Microsoft recommends exact absolute redirect URIs and warns about wildcard security risks.

### One client works and another client using the same app ID fails

Inventory each client's executing architecture and exact redirect URI. One can be a correctly registered server web app while another is an SPA with the wrong platform type. Do not change the shared registration based on one client alone.

### Token redemption succeeds but the API returns 401 or 403

AADSTS9002326 is fixed. Move to token audience, scopes, consent, app roles, assignment, resource authorization, and API-side validation. Do not reopen the platform-type repair simply because the next control plane denied access.

### The change works only after disabling Conditional Access

Restore the policy and investigate the new sign-in result separately. Conditional Access can interrupt a sign-in, but it does not classify a redirect URI as SPA. A policy exclusion hides a second problem; it is not a valid repair for AADSTS9002326.

## Rollback and escalation

Rollback should restore the last reviewed application version and its matching platform configuration together. If the SPA code was reverted to an older implicit-flow client, restore only the settings required by that approved version while the migration is corrected. If a server token exchange was accidentally moved into JavaScript, revert the deployment rather than relabeling the redirect URI.

Escalate when the same fresh request still returns AADSTS9002326 after the exact URI is visible under SPA, Graph and portal disagree about the platform collection, the error appears only in one tenant for an otherwise identical supported configuration, or a shared registration cannot be changed without breaking an unknown consumer.

Provide Microsoft support or the application vendor with a sanitized package containing tenant ID, client ID, application object ID, UTC timestamp, request ID, correlation ID, trace ID, origin, redirect URI, platform inventory, flow type, library and version, browser and version, sign-in result, change history, and minimal reproduction. Do not attach codes, tokens, cookies, PKCE verifiers, client secrets, or certificate private keys.

## AADSTS9002326 administrator checklist

- [ ] Capture the exact error and sanitized correlation evidence.
- [ ] Prove that browser code sent the token request with an `Origin` header.
- [ ] Classify the redeemer as SPA, server web app, or native client.
- [ ] Resolve the client ID to the exact app registration and tenant.
- [ ] Compare the authorization and token request redirect URIs.
- [ ] Locate the URI under `spa`, `web`, or `publicClient` without changing it first.
- [ ] For an SPA, verify authorization code flow with PKCE and no client secret.
- [ ] For a web app, keep code redemption and credentials on the backend.
- [ ] For a native app, use its supported MSAL and redirect pattern.
- [ ] Inventory every client sharing the registration before migration.
- [ ] Pilot with a distinct callback path where practical.
- [ ] Retest with a new authorization code.
- [ ] Validate API access, token audience, scopes, sign-in evidence, and Conditional Access.
- [ ] Preserve the application audit change and rollback record.
- [ ] Remove old platform settings only after every consumer is verified.

## Frequently asked questions

### Does AADSTS9002326 mean the redirect URI is missing?

Not necessarily. The same URI can exist under the wrong platform. AADSTS50011 is the usual mismatch error; AADSTS9002326 specifically points to a cross-origin redemption whose redirect URI is not marked as an SPA redirect URI.

### Can I fix the error by adding a client secret?

No. Browser SPAs are public clients. Microsoft prevents client credentials from being used when an `Origin` header is present so secrets are not used from the browser. If the app genuinely requires a secret, code redemption belongs on a protected backend.

### Should I register every callback under SPA?

No. Register each callback for the architecture that redeems its authorization code. Server web callbacks belong under Web; native callbacks use their supported mobile and desktop platform; browser SPA callbacks belong under SPA.

### Why did the error appear after moving from implicit flow to MSAL.js 2.x?

MSAL.js 2.x uses authorization code flow with PKCE. A callback left under Web or another platform might have worked with the old implicit design but is not enabled for the SPA's cross-origin token redemption. Migrate both the client code and the redirect platform deliberately.

### Is changing CORS on my API enough?

No. Your API's CORS policy controls browser calls to your API. AADSTS9002326 is returned by Microsoft's token endpoint because of the Entra app registration and token-redeeming client type.

The useful mental model is **redeeming component, request origin, exact callback, platform type, PKCE pair, then evidence**. Follow that order and AADSTS9002326 becomes a bounded application-registration repair instead of a reason to weaken browser security or identity policy.

## Microsoft sources

- [Microsoft identity platform OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Add a redirect URI to an application](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri)
- [Redirect URI restrictions and platform guidance](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url)
- [Handle third-party cookie blocking in SPAs](https://learn.microsoft.com/en-us/entra/identity-platform/reference-third-party-cookies-spas)
- [Migrate a JavaScript SPA to authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/migrate-spa-implicit-to-auth-code)
- [Troubleshoot Microsoft Entra CORS issues](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/troubleshoot-cross-origin-resource-sharing-issues)
- [Troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors)
- [Microsoft Entra sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Get an application with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0)
- [Microsoft Graph application resource](https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0)
- [Microsoft Graph spaApplication resource](https://learn.microsoft.com/en-us/graph/api/resources/spaapplication?view=graph-rest-1.0)
