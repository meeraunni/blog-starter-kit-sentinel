---
title: "AADSTS900561 Endpoint Only Accepts POST: Entra Fix"
excerpt: "Fix AADSTS900561 endpoint only accepts POST errors by separating harmless browser back navigation from a recurring application method or token-flow defect."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-30T09:20:40-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS900561 endpoint only accepts POST** error means Microsoft Entra received an HTTP method that the addressed identity endpoint does not support. First decide whether this was a one-off result of a user pressing the browser's Back button or a failure that repeats during normal sign-in. Microsoft says the back-button case can be ignored. A recurring case needs the application owner to prove the exact endpoint and HTTP method at the application's egress boundary before changing credentials, consent, or Conditional Access.

Microsoft names the error `BadResourceRequestInvalidRequest`. Its current definition says the response identifies the supported and received verbs, gives developer error and browser back navigation as possible causes, and says the latter can be ignored. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

## AADSTS900561 endpoint only accepts POST: the short answer

Use this decision path:

1. Preserve the complete error, UTC timestamp, request ID, correlation ID, application, tenant, and user action immediately before the failure.
2. If the user pressed **Back**, refreshed an old identity page, or replayed browser history and a fresh sign-in succeeds, close the event as a nonrecurring navigation artifact. Do not change the tenant.
3. If normal sign-in fails again, reproduce it once from the application's supported start URL. Record the requested host, path, and HTTP method at each redirect without recording secrets or token bodies.
4. If a `GET` reached an endpoint that reports `POST` as the valid verb, find which application, SDK wrapper, proxy, gateway, form, or redirect produced that request.
5. For authorization-code redemption, confirm the application sends a form-encoded `POST` to the intended `/token` endpoint. Do not send users or browser navigation directly to that endpoint.
6. Repair the smallest incorrect routing or method decision, begin a new authorization flow, and verify that AADSTS900561 disappears.
7. If the code changes, stop troubleshooting 900561 and follow the new evidence.

This is a source-derived administrator runbook, not a report of hands-on testing in a tenant.

## What AADSTS900561 proves—and what it does not

The response proves that the identity service received an unsupported HTTP verb for the endpoint named by the request. When the familiar message says **the endpoint only accepts POST requests; received a GET request**, the method mismatch is explicit.

It does not prove that:

- the user's password or MFA method is wrong;
- a client secret or certificate has expired;
- consent is missing;
- the redirect URI is unregistered;
- Conditional Access blocked token issuance;
- browser cookies are the root cause; or
- the Microsoft identity service is unavailable.

Keep adjacent failures separate. The [AADSTS900144 missing-parameter guide](/posts/aadsts900144-request-body-missing-parameter-microsoft-entra) covers a request that reached parsing without a required field. The [AADSTS9002326 cross-origin redemption guide](/posts/aadsts9002326-cross-origin-token-redemption-microsoft-entra) covers browser redemption from an origin that does not match the SPA registration. The [AADSTS50011 reply URL guide](/posts/aadsts50011-reply-url-mismatch-microsoft-entra) covers a callback address that does not match the app registration. None of those is repaired by changing an HTTP verb blindly.

## Separate harmless browser history from a recurring defect

Microsoft's definition gives administrators an unusually useful first branch: a user pressing the Back button can replay a browser navigation against an endpoint that is no longer valid for that step, and that instance can be ignored.

Treat it as a navigation artifact only when all of the following are true:

- the user confirms the error followed Back, refresh, or reopening an old history entry;
- starting again from the application's supported sign-in entry point succeeds;
- the failure does not recur during ordinary forward navigation; and
- there is no broader pattern for the same application or release.

“Can be ignored” does not mean every 900561 should be suppressed. If the user did not replay history, a clean start fails, multiple users are affected, or the error began after an application, proxy, or routing change, investigate the request path.

> **Analysis:** recurrence is the useful dividing line. A single back-navigation event describes a stale browser action. A repeatable event from the normal application entry point describes a deterministic method or routing decision somewhere in the sign-in chain.

## Understand the two authorization-code legs

The OAuth authorization-code flow has two different jobs:

1. The application directs the user to the `/authorize` endpoint. Microsoft Entra authenticates the user and returns an authorization code to the registered redirect URI.
2. The client redeems that code at the `/token` endpoint.

Microsoft's current protocol reference says the second leg is a `POST` to `/{tenant}/oauth2/v2.0/token` with `Content-Type: application/x-www-form-urlencoded`. The body includes values such as `client_id`, `code`, `redirect_uri`, `grant_type=authorization_code`, and the applicable PKCE verifier or confidential-client credential. ([OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#request-an-access-token-with-a-client_secret))

The shape matters:

```http
POST /{tenant}/oauth2/v2.0/token HTTP/1.1
Host: login.microsoftonline.com
Content-Type: application/x-www-form-urlencoded

client_id={application-client-id}
&code={authorization-code}
&redirect_uri={registered-callback}
&grant_type=authorization_code
&code_verifier={pkce-verifier-if-applicable}
```

Do not paste a token-endpoint URL into a browser and expect a valid redemption. Browser address-bar navigation produces a `GET`; authorization-code redemption is an application-to-endpoint exchange. Microsoft recommends using MSAL for token acquisition and caching instead of hand-building protocol calls. Its current guidance describes web apps acquiring tokens through the authorization-code flow after the user signs in through the authorization request URL. ([acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens))

## Prove the effective request before changing Entra

Start from evidence at the last boundary before Microsoft Entra. Application configuration may claim `POST` while the effective request is a `GET` because a redirect, HTML form, client helper, gateway, or error handler changed the method.

Record these fields for the failing hop:

- UTC time, correlation ID, and request ID;
- application ID and application display name;
- tenant or authority segment;
- destination host and path;
- HTTP method;
- response status and AADSTS code;
- the preceding URL and redirect status, if any;
- application build, identity library version, and last known successful build; and
- whether the user navigated Back, refreshed, or began a clean sign-in.

Do not record authorization codes, access tokens, refresh tokens, client secrets, signed client assertions, passwords, session cookies, or PKCE verifier values. Microsoft warns that network traces can contain personally identifiable information and credentials and should be sanitized before sharing. ([MSAL.NET logging and network-trace guidance](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/msal-logging#network-traces))

If a trace is necessary, capture the smallest reproducible window in a controlled environment, store it under the incident's approved access controls, and remove sensitive contents before it leaves that boundary. A request method, endpoint path, status, and correlation identifiers are usually enough to classify 900561; a raw production HAR is not the first step.

## Find where POST became GET

Walk the request chain in order.

### Application or identity-library path

Confirm that the production code uses the supported library call for the intended client type and flow. Compare the deployed identity configuration and library version with the last known good release. Look for code that builds a token URL and then redirects the browser to it, uses a link where a server-side token call belongs, or treats a failed redemption as a navigation destination.

For a web application, code redemption belongs in the server-side authorization-code handler. For an SPA, use the supported MSAL browser flow and its redirect or pop-up handling. Microsoft's SPA guidance says MSAL first tries silent acquisition and falls back to an interactive method when interaction is required; custom navigation around those handlers can break the state machine. ([SPA token acquisition](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token))

### Redirect and form path

Inspect each redirect immediately before the unsupported request. A `Location` header that points at `/token`, an HTML link to a token endpoint, or a form with the wrong method can turn a server exchange into browser navigation.

Do not “fix” the symptom by accepting `GET` on your own callback or moving credentials into a query string. The Microsoft endpoint contract is the boundary to meet. The repair is to restore the correct flow and keep sensitive redemption material out of URLs, browser history, referrer data, and intermediary logs.

### Proxy, gateway, WAF, and load-balancer path

Compare the request method before and after every intermediary. Review recent routing, rewrite, authentication, and redirect-rule changes. A component that converts a request into a redirect can cause the next browser hop to use `GET`, even when the original application request used `POST`.

Do not bypass the proxy, disable a WAF, or weaken a Conditional Access policy tenant-wide as a diagnostic shortcut. Reproduce through a controlled route, compare both sides of the boundary, and roll back the specific faulty rule when change records support it.

### Browser navigation path

Reproduce from a new application entry point rather than the error page or browser history. Record whether the issue occurs only after Back or refresh. A successful clean attempt supports the documented ignorable branch; a repeatable clean failure returns ownership to the application or intermediary path.

Do not make third-party-cookie changes merely because the error appeared in a browser. Microsoft's current AADSTS900561 definition does not make cookie policy the meaning of the code. Investigate a cookie restriction only when separate browser or application evidence supports it.

## Correlate the Entra evidence

In the Microsoft Entra admin center, browse to **Entra ID > Monitoring & health > Sign-in logs** and locate the event by user, application, time, request ID, or correlation ID. Microsoft documents the error code and failure reason in the Basic info tab and recommends retaining request and correlation identifiers when details are uncertain. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

Capture:

- application and application ID;
- resource and resource tenant;
- client app and sign-in event type;
- sign-in error code and failure reason;
- Conditional Access status, if evaluation was reached; and
- request ID, correlation ID, and event time.

Do not infer policy causation from proximity. If the event did not reach Conditional Access evaluation, changing a policy cannot repair the rejected HTTP method. If the log shows another failure after 900561 is corrected, diagnose that later boundary separately.

The Sign-in diagnostic can search with the application, correlation or request identifier, and a date/time within the documented window. It can also launch directly from a sign-in event for a user with the required reporting access. ([Microsoft Entra Sign-in diagnostic](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics))

## Apply the least disruptive repair

Match the repair to the proven boundary:

- **Back or refresh only:** restart from the supported application URL; no tenant change.
- **Application navigates to `/token`:** restore library-managed or server-side code redemption.
- **Application sends the wrong method:** correct the HTTP client call and retain form encoding for the documented flow.
- **Redirect rule changes POST into browser GET:** remove or correct the specific rewrite or redirect.
- **Stale deployment or mixed nodes:** align the identity configuration and release across nodes, then validate a new flow.
- **Vendor application:** provide the vendor with sanitized endpoint, method, UTC time, correlation ID, request ID, build, and reproduction steps. Do not send tokens or secrets.

Rotate credentials only if separate evidence proves credential exposure or a credential error. Regrant consent only for a consent failure. Change redirect URIs only for a callback mismatch. AADSTS900561 is valuable precisely because it points to the HTTP request contract.

## Validate the fix end to end

Run a new sign-in from the supported application entry point. Do not reuse the failed authorization code or replay an old browser page.

Confirm that:

1. the authorization request reaches the intended authority;
2. the callback returns to the registered application route;
3. code redemption is an application-issued, form-encoded `POST` to the intended `/token` endpoint;
4. AADSTS900561 no longer appears;
5. the application receives and caches the result through its supported library path;
6. sign-in logs show the expected application, tenant, client, and outcome; and
7. no credentials, codes, tokens, or cookies were written to diagnostic logs.

Test Back and refresh after the successful flow as a separate usability case. If that action still produces one ignorable 900561 page, decide whether the application should intercept stale navigation or send the user to a fresh start. Do not confuse that browser-experience improvement with the token-flow repair.

## AADSTS900561 administrator checklist

- [ ] Preserve the complete error, UTC time, request ID, and correlation ID
- [ ] Record the application, tenant, endpoint, received method, and valid method
- [ ] Ask whether Back, refresh, or old browser history immediately preceded the error
- [ ] Reproduce once from the supported application entry point
- [ ] Treat a successful clean retry after Back as the documented ignorable branch
- [ ] For recurrence, trace the effective method across the app and each intermediary
- [ ] Confirm authorization-code redemption uses form-encoded `POST` to `/token`
- [ ] Keep tokens, codes, assertions, secrets, cookies, and PKCE values out of logs
- [ ] Correlate the event in Entra sign-in logs
- [ ] Repair the smallest proven application or routing defect
- [ ] Validate with a brand-new authorization flow
- [ ] Escalate with sanitized identifiers and reproduction evidence

## Frequently asked questions

### Can AADSTS900561 be ignored?

Yes, when it followed browser Back navigation and a fresh sign-in succeeds without recurrence. Microsoft's error reference explicitly identifies that case and says it can be ignored. A recurring failure from normal application navigation should not be dismissed.

### Does AADSTS900561 mean the password is wrong?

No. It reports an unsupported HTTP method at the addressed endpoint. Password, MFA, consent, credential, redirect, and Conditional Access failures have different evidence and often different AADSTS codes.

### Should I clear cookies or disable browser privacy controls?

Not as a default repair for this code. First use the current error definition: distinguish browser-history replay from a recurring unsupported method. Change cookie policy only when independent evidence shows a cookie-specific failure, and keep any exception narrowly scoped and reviewed.

### Why does a GET reach the token endpoint?

Common structural paths include browser navigation to a token URL, an HTML link or form with the wrong method, or an intermediary redirect that causes the next browser hop to use `GET`. Prove the actual chain before assigning a cause.

### What should go in an escalation package?

Include the sanitized error text, UTC time, request and correlation IDs, tenant, application ID, endpoint host and path, received and expected methods, client and library versions, last known success, reproduction sequence, affected scope, recent changes, and the boundary where the method first differs. Exclude credentials, tokens, codes, assertions, cookies, and raw production traces unless an approved secure support channel requests them.

AADSTS900561 is usually a small error with a clean lesson: HTTP method and endpoint are part of the authentication contract. Respect the documented back-button exception, but make every recurring request prove its route.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes)
- [Microsoft identity platform OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens)
- [Acquire a token in a single-page application](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token)
- [Microsoft Entra sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Use Microsoft Entra Sign-in diagnostics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics)
- [MSAL.NET logging and network traces](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/msal-logging)
