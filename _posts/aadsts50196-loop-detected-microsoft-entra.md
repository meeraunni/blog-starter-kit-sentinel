---
title: "AADSTS50196 Loop Detected: Microsoft Entra Fix Guide"
excerpt: "Fix AADSTS50196 loop detected errors by isolating repeated token requests, repairing cache and retry logic, and validating Microsoft Entra sign-in evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-11T17:04:34-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS50196 loop detected** error means Microsoft Entra ID received too many repeated requests from the same client in a short period. The safe repair is to stop the retry storm, identify the application and token flow, restore correct token-cache use, and allow only one supported interactive recovery when Microsoft Authentication Library (MSAL) says interaction is required.

Grab a coffee and resist the tempting tenant-wide fixes. Microsoft's current error reference names AADSTS50196 `LoopDetected` and directs the application owner to check token caching and error handling. It says the client has made too many of the same request too quickly, which can indicate faulty application state or abusive token requests. ([Microsoft Entra error-code reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

That definition places the first repair boundary in the **client's token-acquisition state machine**. It does not prove that the user's password is wrong, a client secret expired, Conditional Access is misconfigured, or the Microsoft Entra service is unavailable. This guide turns the short error definition into an evidence-based administrator and application-owner runbook. It is based on current Microsoft documentation and does not claim a tenant-specific lab test.

## AADSTS50196 loop detected: the short answer

Work through this sequence:

1. Stop automatic retries for the affected application path. If a recent authentication release started the loop, pause or roll back that release through the application's approved deployment process.
2. Capture the exact error, UTC timestamp, request ID, correlation ID, tenant ID, user or workload identity, application ID, resource, client type, and entry point.
3. Find the matching Microsoft Entra sign-in event and determine whether it is an interactive user, non-interactive user, service-principal, or managed-identity sign-in.
4. Prove the repetition pattern in application telemetry: which token API, authority, scopes or resource, account key, redirect URI, instance, and error branch repeated.
5. Confirm that the application tries its supported token cache before making another network request.
6. Repair the flow-specific state: redirect completion, interactive-request serialization, persistent or distributed cache, account selection, or retry handling.
7. Honour `Retry-After` on HTTP 429 responses. Back off on timeouts and HTTP 5xx responses instead of immediately resubmitting.
8. Validate one clean authentication journey, token reuse from cache, and a deliberate interaction-required journey.
9. Monitor recurrence by application, version, instance, result code, correlation pattern, and cache hit rate.

Do not disable Conditional Access, rotate credentials, revoke every user's sessions, delete the app registration, or add broad exclusions to clear AADSTS50196. None of those changes repairs a client that keeps resubmitting the same token request.

## What AADSTS50196 proves—and what it does not

AADSTS50196 proves that Microsoft Entra's loop protection observed repeated requests from a client within a short period. The error reference tells you to inspect the application's token cache and error handling. It does not identify the precise line of code, cache product, user action, or upstream condition that caused the repetition.

Use the evidence to separate these possibilities:

- **The application never reuses cached tokens.** Each page load, API call, worker, or request path goes back to Microsoft Entra.
- **The application has a cache but cannot find the right entry.** Account, authority, tenant, scopes, deployment slot, or instance state does not line up with the request.
- **More than one interactive operation starts at once.** A component, route guard, and API interceptor each try to recover the same session.
- **The redirect response is not allowed to finish.** Routing or page initialization launches a new authentication operation before the previous response is processed.
- **A retry handler treats every failure as immediately retryable.** HTTP 429, HTTP 5xx, timeouts, and interaction-required responses feed the same fast loop.
- **A downstream API error is mistaken for a token error.** The application requests another token even though the existing token was not the failure boundary.

Those are investigation branches, not conclusions from the code alone. Microsoft Entra records the service-side repetition. Application telemetry and the supported library's logs must prove which branch is real.

This distinction also keeps AADSTS50196 separate from the site's [AADSTS70043 sign-in-frequency guide](/posts/aadsts70043-sign-in-frequency-microsoft-entra). AADSTS70043 says a Conditional Access session control invalidated silent renewal. AADSTS50196 says the client repeated requests too quickly. A sign-in-frequency challenge can expose bad client handling, but changing the policy is not the default repair for a loop detector.

## Put the loop in the token-acquisition flow

MSAL divides clients into public and confidential applications. Browser, desktop, and mobile apps are public clients; web apps, web APIs, and daemons are confidential clients. Both types can maintain a user token cache, while confidential clients also maintain an application token cache for app-only acquisition. ([public and confidential clients](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications))

Microsoft's general MSAL guidance is simple: applications should attempt silent acquisition from the cache before using another acquisition method. MSAL caches tokens after acquisition and can refresh them when needed. For client-credentials workloads, the supported acquisition method manages the application token cache; application code should not build a parallel loop around the token endpoint. ([acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens))

A healthy delegated flow therefore looks like this:

1. identify the intended account, authority, and scopes;
2. ask the library for a token silently;
3. return a usable cached token or perform the library's supported refresh path;
4. if the library reports that user interaction is required, start one interactive operation;
5. process that operation to completion; and
6. cache and reuse the result.

An AADSTS50196 incident usually means the implementation is cycling around one of those boundaries. Draw the application's real sequence from telemetry instead of assuming every workload follows the same browser pattern.

## Preserve evidence before changing the application

Build one evidence bundle from the same failure window:

- full error text, result code, UTC timestamp, request ID, correlation ID, and trace ID when present;
- tenant ID, user object ID or service-principal object ID, application ID, resource ID, and application display name;
- sign-in log type, client app, browser or operating system, IP address, authentication requirement, Conditional Access status, and failure reason;
- application release, MSAL or Microsoft.Identity.Web version, deployment slot, region, instance, and feature flags;
- authority, redirect URI, normalized scopes or resource, and supported flow name;
- token-acquisition method, exception type, HTTP status, and `Retry-After` value when present;
- cache lookup result, cache key dimensions, cache provider, cache latency, and eviction or restart events;
- count and timing of repeated calls, including whether they share one correlation ID or create a new one each time; and
- last known successful version, first failure, affected population, and unaffected comparison path.

Do not put access tokens, refresh tokens, authorization codes, client secrets, session cookies, cache blobs, or full authentication headers in the incident ticket. Preserve identifiers, timings, sanitized request shape, and library diagnostics instead.

Open **Entra ID > Monitoring & health > Sign-in logs** with at least Reports Reader. Microsoft recommends filtering by user or application, selecting the failed event, and preserving the correlation ID, error code, failure reason, username, user ID, and sign-in identifier. ([troubleshoot sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors), [sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains the wider event tabs and evidence model. Use it to read policy context, but do not assume a Conditional Access result caused the application's repeated requests.

The portal can merge related steps of one interactive flow, while Log Analytics can show the individual records. Microsoft documents that requests sharing a correlation ID can appear separately in Log Analytics even when the portal presents one final event. Grouping by correlation ID is therefore useful, but it is not enough by itself: a faulty loop can also generate many correlation IDs. ([multiple sign-in records in Log Analytics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-log-analytics#multiple-sign-in-records-in-log-analytics))

## Classify the AADSTS50196 repetition pattern

Use the pattern, not the user's last click, to choose the repair branch.

### One application version fails across many users

This points toward a shared release, redirect handler, cache configuration, middleware version, or retry policy. Compare the first AADSTS50196 time with deployment events and application telemetry. Contain the version before asking every user to clear local state.

### One instance or region fails while peers succeed

Compare cache connectivity, cache namespace and encryption configuration, instance clocks, deployment settings, and health. A server-side web app can keep its authentication cookie while losing the matching token-cache entry after a restart or eviction.

Microsoft's dedicated troubleshooting guidance for missing `AcquireTokenSilent` account state describes that exact class of split state: an authentication cookie can refer to an account that no longer exists in a volatile token cache after restart, memory pressure, inactivity, or eviction. Its recommended repair is a persistent token cache, not an endless acquisition retry. ([persistent token-cache troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/no-account-login-hint-passed-acquire-token-silent))

### Only the browser or SPA path fails

Inspect redirect completion, routers, protected redirect pages, components that start authentication on load, and simultaneous requests from tabs or interceptors. Microsoft says `handleRedirectPromise()` must process a redirect response before another redirect operation begins. It also documents `interaction_in_progress` when an interactive API is invoked while another is still running. ([initialize MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization), [MSAL.js errors](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors))

If a silent flow uses an iframe, verify that the redirect page does not strip the response hash, run a router that navigates away, or start another MSAL operation. Microsoft recommends a dedicated redirect page without routing logic for silent and popup flows. Treat that as an application configuration repair, not a reason to weaken browser security globally.

### Only background or app-only traffic fails

Confirm that the workload uses the supported client-credentials library path and its application token cache. Microsoft says `AcquireTokenForClient` checks the application cache itself; calling `AcquireTokenSilent` is not the app-only pattern. Check whether every job item or concurrent worker constructs a new client, bypasses shared cache state, or retries token acquisition independently. ([MSAL.NET cache guidance](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/acquire-token-silently))

### The loop starts after an interaction-required response

Do not catch every exception and start a redirect. The supported MSAL.js pattern catches `InteractionRequiredAuthError` specifically, then falls back to one popup or redirect. Other errors belong in their own handling path. ([acquire tokens with MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/acquire-token))

If the interaction is required because a Conditional Access control, consent prompt, account selection, or another user-visible step must run, allow that step once and complete its result. If a headless workload cannot perform user interaction, redesign its identity flow rather than replaying a delegated request.

## Contain the loop without weakening identity controls

Containment should reduce request volume and user impact while preserving the evidence needed for a real fix.

Use the smallest applicable action:

- disable the affected authentication feature flag or route;
- roll back the authentication-specific application release;
- remove one unhealthy instance from service;
- stop the worker or queue consumer issuing repeated token requests;
- apply a client-side circuit breaker that stops retries and shows a recoverable error;
- serialize interactive acquisition so only one operation can run per browser context; or
- restore the last-known-good cache provider and namespace.

Do not respond to a retry storm with more token requests. Microsoft's client-resilience guidance says an application that receives HTTP 429 must wait until the `Retry-After` time before another acquisition attempt. For HTTP 5xx responses or timeouts, it says to avoid fast retry loops and use exponential backoff, with the first retry at least five seconds later when no `Retry-After` is present. ([Microsoft Entra client resilience](https://learn.microsoft.com/en-us/entra/architecture/resilience-client-app#response-code-handling))

Analysis: AADSTS50196 and HTTP 429 are different signals, but they can be adjacent evidence of the same faulty request pattern. Preserve both. Do not claim throttling when the response does not show it, and do not keep probing simply to see when a provider-side protection clears.

## Repair token caching for the client type

The cache must match the application's architecture.

### Browser, desktop, and mobile public clients

Use the platform's supported MSAL cache and silent-acquisition method. Supply the intended account and scopes, let the library select or refresh a usable entry, and escalate only the documented interaction-required condition to a single interactive call. Avoid custom token storage and avoid parsing access or refresh tokens to invent expiry or retry logic.

For SPAs, complete `handleRedirectPromise()` before route guards or components can launch authentication. Coordinate concurrent token requests and interactive state through the wrapper library or a single application-level service. A login component, API interceptor, and page-load hook should not each own their own recovery loop.

### Server-side web apps and web APIs

Keep the authentication cookie and token cache coherent across restarts and instances. Microsoft's MSAL.NET cache-serialization guidance recommends Microsoft.Identity.Web for new confidential clients and a distributed token cache, such as Redis, SQL Server, Azure Cosmos DB, or another supported `IDistributedCache` provider, for web apps and web APIs. It describes in-memory cache as temporary and appropriate for local development or app-only scenarios that can tolerate process-local state. ([MSAL.NET token-cache serialization](https://learn.microsoft.com/en-us/entra/msal/dotnet/how-to/token-cache-serialization))

Do not treat “a cache is configured” as proof. Validate cache hit rate, key partitioning, encryption and data-protection continuity, eviction, latency, failover, and whether every instance uses the same namespace. Microsoft's cache guidance explicitly recommends monitoring cache hit ratio and performance.

### Daemons and service-to-service clients

Use the supported confidential-client acquisition method and let it manage the application token cache. Reuse the client object according to the library's guidance, bound concurrency, and make the retry policy aware of `Retry-After`, timeouts, and 5xx responses. A queue with one token request per item is an architecture smell; reuse a valid app token until the library determines another is needed.

## Validate the repair from cache to resource

A disappearing browser page is not enough. Validate the whole path:

1. Start with a fresh application session in the repaired version.
2. Complete one supported sign-in and record its UTC time, request ID, and correlation ID.
3. Call the intended resource and prove the expected authorization result.
4. Repeat the same operation within the token's usable period and confirm the application reuses cache state instead of starting another interactive flow.
5. Exercise the documented interaction-required path and confirm exactly one popup or redirect runs and completes.
6. Restart one test instance or move between two instances, where applicable, and prove cache continuity or a graceful reauthentication path.
7. Simulate a transient downstream failure in an approved test environment and confirm retries are bounded and back off.
8. Verify AADSTS50196 does not recur in the sign-in logs for the pilot population.
9. Confirm Conditional Access, consent, app assignment, and resource authorization remain enforced.

If silent sign-in still fails before a loop forms, the site's [AADSTS50058 silent-sign-in guide](/posts/aadsts50058-silent-sign-in-failed-microsoft-entra) covers browser session and interaction recovery. If Microsoft Entra says the grant itself was revoked or expired, use the [AADSTS50173 grant-revocation guide](/posts/aadsts50173-grant-expired-revoked-microsoft-entra) instead of retrying the old grant.

## Monitor AADSTS50196 without collecting secrets

Create application and tenant signals that answer four questions:

- **How often does the app ask for a token?** Track calls by supported acquisition method, flow, app version, instance, and result class.
- **How often does the cache answer?** Track hit, miss, eviction, error, and latency without logging token contents.
- **How often does interaction start?** Track start, completion, cancellation, timeout, and concurrent-interaction suppression.
- **How often does Entra reject repetition?** Alert on AADSTS50196 by application ID and version, then correlate with HTTP 429, 5xx, timeout, and library exceptions.

Use stable identifiers rather than display names. Keep authority and normalized scope set, but exclude secrets, tokens, authorization codes, cookies, proof keys, and personal claims that are not necessary for diagnosis.

Microsoft Entra sign-in logs are available in Free, P1, and P2 editions. Microsoft's current retention reference lists seven days for Free and 30 days for P1 or P2; longer retention requires routing to an Azure storage or monitoring destination before the data expires. Reports Reader is the least-privileged role for portal access, while configuring diagnostic settings requires a separate privileged role. ([activity-log access and licensing](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs), [Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention))

Analysis: the error itself does not create a premium-license dependency. Licensing changes retention and advanced monitoring options; it does not remove the application's responsibility to cache and reuse tokens correctly.

## AADSTS50196 administrator checklist

- [ ] Stop the automatic retry storm before collecting more failures.
- [ ] Record the exact error, UTC time, request ID, correlation ID, tenant, app, identity, and resource.
- [ ] Identify the sign-in log type and match the exact application ID.
- [ ] Compare the first failure with application releases, restarts, cache events, and policy changes.
- [ ] Map the real token-acquisition sequence from application telemetry.
- [ ] Confirm silent or app-cache acquisition happens before a network or interactive request.
- [ ] Prove whether repetitions share one correlation ID or create many.
- [ ] Check redirect completion and concurrent interactive calls for SPA and browser paths.
- [ ] Check persistent or distributed cache continuity for web apps and web APIs.
- [ ] Check client reuse, concurrency, and app-token caching for daemon workloads.
- [ ] Honour `Retry-After` and use bounded exponential backoff for transient failures.
- [ ] Keep Conditional Access, consent, assignment, and resource authorization intact.
- [ ] Test one normal sign-in, token reuse, interaction-required recovery, and instance restart.
- [ ] Monitor cache hit rate, token-call volume, interaction count, and AADSTS50196 recurrence.
- [ ] Record the repaired version, owner, evidence, rollback boundary, and observation period.

## Frequently asked questions

### Is AADSTS50196 a password or MFA failure?

No. Microsoft's error definition says the client repeated the same request too many times. A password, MFA, Conditional Access, or consent event might have triggered an application error branch, but the loop code does not prove which upstream event occurred.

### Should I clear every user's sessions?

No. Session revocation does not repair broken cache or retry logic and can increase interactive load. Revoke sessions only when a separate security decision requires it.

### Should I disable Conditional Access?

No. Keep the policy in place and inspect the sign-in event. If an interaction requirement is legitimate, the application must surface and complete one supported interactive flow instead of retrying silently.

### Why does only one application instance fail?

That pattern often points to process-local cache, a wrong cache namespace, lost encryption keys, eviction, an unhealthy deployment, or instance-specific configuration. Compare that instance with a healthy peer and prove the difference before changing tenant controls.

### Can browser cookies cause AADSTS50196?

The code alone does not prove a cookie problem. Microsoft documents a related split-state case where an authentication cookie survives while a volatile server token cache loses the account entry. Diagnose the application and cache state; do not turn “clear cookies” into the permanent fix for a repeatable product defect.

### Does an HTTP 429 mean the same thing as AADSTS50196?

No. HTTP 429 is a throttling response and AADSTS50196 is the Entra loop-detection error. They can appear near the same request storm. Preserve both signals and follow `Retry-After` when Microsoft Entra returns it.

### What should I send to Microsoft support?

Provide the tenant ID, application ID and object ID, identity type, resource, UTC failure window, request and correlation IDs, exact error, affected and healthy client versions, MSAL or Microsoft.Identity.Web version, sanitized request sequence, cache provider and hit/miss evidence, HTTP status and `Retry-After`, relevant sign-in events, and the outcome after the application stops retrying. Do not send secrets, tokens, cookies, authorization codes, or raw cache entries.

AADSTS50196 is a protection signal, not a reason to weaken tenant controls. Stop the repetition, prove which token-acquisition boundary is cycling, repair cache and interaction state for that client type, and validate that the application reuses tokens before it returns to normal traffic.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes)
- [Acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens)
- [Public and confidential client applications](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications)
- [Acquire tokens with MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/acquire-token)
- [Initialize MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization)
- [Common errors in MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors)
- [MSAL.NET token-cache serialization](https://learn.microsoft.com/en-us/entra/msal/dotnet/how-to/token-cache-serialization)
- [Acquire a token from the MSAL.NET cache](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/acquire-token-silently)
- [Persistent token-cache troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/no-account-login-hint-passed-acquire-token-silent)
- [Microsoft Entra client resilience](https://learn.microsoft.com/en-us/entra/architecture/resilience-client-app)
- [Troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors)
- [Microsoft Entra sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Analyze activity logs in Log Analytics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-log-analytics)
- [Access Microsoft Entra activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs)
- [Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)
