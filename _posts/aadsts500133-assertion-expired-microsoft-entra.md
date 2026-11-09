---
title: "AADSTS500133 Assertion Expired: Microsoft Entra Fix"
excerpt: "Fix AADSTS500133 by tracing the expired OBO assertion, checking clock skew and token reuse, repairing cache flow, and validating Entra evidence safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-09T17:24:42-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS500133 assertion not within valid time range** error means Microsoft Entra rejected the user assertion in a token exchange because it was no longer valid at the service's current time. In the common on-behalf-of (OBO) case, a middle-tier API tried to exchange an expired incoming user access token for a token to a downstream API. The safe fix is to prove which token was used as the assertion, compare its validity window with the failure time, correct clock or token-lifecycle handling, and start a supported fresh authentication path when user interaction is required.

Grab a coffee before rotating the API's secret or disabling Conditional Access. Microsoft's error reference tells administrators to ensure the access token has not expired before using it as a user assertion or to request a new token. Microsoft's current Microsoft.Identity.Web troubleshooting guidance names three practical causes to check: clock skew, an expired token, and token-cache behavior. ([Microsoft Entra error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [Microsoft.Identity.Web downstream API guidance](https://learn.microsoft.com/en-us/entra/msidweb/call-downstream-apis/from-web-apis#resolve-aadsts500133-assertion-is-not-within-its-valid-time-range))

> **Documentation boundary:** this guide is based on current Microsoft documentation and operational analysis. It does not claim that the error was reproduced in a production tenant. It focuses on a user access token supplied as an OBO assertion; client assertions, SAML assertions, refresh tokens, and revoked grants have different evidence and repair paths.

## AADSTS500133 assertion not within valid time range: the fast path

Work the failure in this order:

1. Capture the complete sanitized error, UTC timestamp, trace ID, correlation ID, tenant, client application, middle-tier API, downstream resource, deployment version, and affected instance. Never copy the raw assertion into a ticket.
2. Identify the token-exchange stage. Prove whether the failed request is OBO and whether the `assertion` field contains the access token issued **to the middle-tier API**.
3. Separate the user assertion from client authentication. The user token belongs in `assertion`; the API's secret or certificate proof belongs in `client_secret` or `client_assertion`.
4. Compare the failure's current time and assertion expiry from the error. If the middle tier owns the incoming JWT, validate its `aud`, `iss`, `nbf`, and `exp` through supported server middleware and approved diagnostics.
5. Check authoritative time synchronization on the client, API nodes, gateways, job workers, and containers. Compare failing and healthy instances rather than changing a clock by hand.
6. Trace how the token reached the exchange. Look for a queued job, retry loop, raw bearer-token cache, delayed request, replayed message, or node-local cache that kept the assertion beyond its lifetime.
7. For request-bound OBO, obtain a fresh access token for the middle tier through the client application's normal supported flow, then retry one controlled request.
8. For long-running work, use the library's documented long-running OBO pattern and a distributed token cache, or redesign truly unattended work around separately approved application permissions. Do not keep replaying the original bearer token.
9. Correlate the failed and successful attempts in the appropriate user sign-in evidence and application telemetry.
10. If the error changes, stop troubleshooting `AADSTS500133` and follow the new control boundary.

The key distinction is pleasantly mechanical: `AADSTS500133` is about the validity window of the **user assertion being exchanged**. It does not, by itself, say that the API's secret expired, the user grant was revoked, consent is missing, or Conditional Access blocked the downstream request.

## Put the failure at the OBO exchange

OBO lets a protected web API call another API while preserving the user's delegated identity. Microsoft documents this chain:

1. a client obtains an access token for the middle-tier API;
2. the client sends that token to the middle tier;
3. the middle tier validates the token because it is the intended audience;
4. the middle tier sends the token to Microsoft Entra as the OBO `assertion`;
5. Entra issues a separate access token for the downstream API when the exchange satisfies protocol, permission, consent, and policy requirements.

Microsoft's protocol reference requires the OBO assertion to be an access token whose `aud` claim identifies the middle-tier application making the exchange. It also requires `requested_token_use=on_behalf_of` and the JWT-bearer grant type. A token intended for Microsoft Graph cannot be handed to a custom middle tier and redeemed as though that API owned it. ([Microsoft identity platform OBO flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow))

The important fields have different jobs:

```text
grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
assertion=<user access token issued to the middle-tier API>
requested_token_use=on_behalf_of
scope=<delegated scope on the downstream API>
client_id=<middle-tier API application ID>
client_secret or client_assertion=<middle-tier client authentication>
```

Never put a raw token or credential value in a diagnostic document. This shape is here to identify boundaries, not to encourage hand-built production token requests. Use a supported Microsoft authentication library for acquisition and middleware for validation.

The site's [AADSTS900144 missing-parameter guide](/posts/aadsts900144-request-body-missing-parameter-microsoft-entra) covers malformed requests where a required field is absent. `AADSTS500133` occurs later: Entra received an assertion, but its time validity failed.

## Read the validity window without exposing the token

Microsoft's access-token claims reference defines the relevant JWT time claims:

- `iat` records when authentication for the token occurred;
- `nbf` is the time before which the token cannot be processed;
- `exp` is the expiration time before which the token can be accepted, although a resource can reject it earlier for revocation or a required authentication change.

These values are Unix timestamps. The error response can include Entra's current time and the assertion expiry time, which is safer to preserve than the complete bearer token. ([Access-token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference))

Only the resource that owns an access token should validate it. Microsoft says client applications should treat access tokens as opaque strings; a web API must validate tokens presented to that API and accept only an intended audience. Microsoft recommends supported middleware, including Microsoft.Identity.Web for ASP.NET and ASP.NET Core, rather than custom validation code. ([Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#validate-tokens))

That creates a safe diagnostic rule:

- If the middle tier is the token's intended audience, its validated claims principal and server middleware can supply time, issuer, tenant, subject, and audience evidence without logging the raw token.
- If the token belongs to Microsoft Graph or another API, the middle tier is not entitled to validate it as its own assertion. Correct the audience and acquisition path instead of building a decoder around someone else's token.
- If the token is opaque or the format is not contractually available to the client, use Entra's error details, library metadata, and resource-owned validation evidence.

Microsoft currently assigns a variable default access-token lifetime, commonly between 60 and 90 minutes. Do not build a queue delay, refresh schedule, or retry budget around a fixed one-hour assumption. Use the token and library's supported lifetime behavior. ([Microsoft identity platform access-token lifetime](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#token-lifetime))

## Choose the cause from the evidence

### The incoming access token expired before the exchange

This is the direct case. A client called the middle tier with an access token near the end of its lifetime, or the API waited before starting OBO. By the time Entra evaluated the assertion, `exp` was in the past.

Confirm:

- assertion expiry from the sanitized error;
- UTC arrival time at the middle tier;
- UTC time when the OBO request left the API;
- gateway, retry, and application latency between those points;
- whether the caller can silently acquire a fresh token or must return to interaction.

The repair is not to extend, edit, or replay the assertion. The client should use its supported library and cache to obtain a usable access token for the middle tier. The middle tier should begin a request-bound exchange promptly after validating the incoming token.

### A queue or background worker replayed the original bearer token

An HTTP request can be valid when a job is accepted and stale when a worker runs ten minutes, an hour, or a day later. Putting the bearer token itself in a queue does not give the job a renewable delegated session. It also expands the places where a sensitive credential exists.

Microsoft documents a separate long-running OBO pattern. The API initiates the process while it has a valid user token, stores a session key with the work item, and later acquires downstream tokens through the long-running cache flow. Microsoft.Identity.Web guidance says background processes should use a distributed cache. ([MSAL.NET long-running OBO](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/web-apps-apis/on-behalf-of-flow#long-running-obo-processes), [Microsoft.Identity.Web long-running process guidance](https://learn.microsoft.com/en-us/entra/msidweb/call-downstream-apis/from-web-apis#handle-long-running-processes-with-obo))

If the work is genuinely unattended and does not require a user's delegated authorization, a separately reviewed client-credentials design with least-privileged application permissions may be more honest. That is an authorization redesign requiring admin consent and security review, not an `AADSTS500133` shortcut.

### One or more clocks are wrong

Microsoft's dedicated troubleshooting guidance lists clock skew as a cause. Compare time from authoritative sources across:

- every API replica and deployment slot;
- containers and their hosts;
- reverse proxies and API gateways;
- queue producers and workers;
- the client platform when it contributes timestamps to application telemetry.

Do not manually set one production node until the error disappears. Correct the time-synchronization source, prove convergence, and test the same release on every ring. If only one instance fails, preserve its clock offset, image version, host, and request path before remediation.

### A custom cache stored the raw assertion instead of library state

Search for code or infrastructure that persists the incoming `Authorization` header, `UserAssertion`, request object, queue payload, or retry envelope. A cache hit is not healthy when the cached object is an expired bearer token.

For web APIs calling downstream APIs, Microsoft recommends Microsoft.Identity.Web and a distributed cache for production, especially across multiple instances. MSAL's OBO acquisition checks its cache itself; calling a separate silent-acquisition method is not the repair. Microsoft also documents that OBO cache entries are session-oriented and, by default, can be associated with the upstream assertion hash. ([MSAL token cache serialization](https://learn.microsoft.com/en-us/entra/msal/dotnet/how-to/token-cache-serialization), [MSAL OBO cache behavior](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/web-apps-apis/on-behalf-of-flow))

Inspect cache topology, key construction, eviction, encryption, and instance sharing. Do not flush every token cache as a first step; that can increase sign-in load and user prompts while erasing evidence. Prove the stale key and affected session, then make the smallest safe correction.

### The application used the wrong token type or assertion field

Microsoft's MSAL OBO guidance explicitly says to pass an access token, not an ID token, to `AcquireTokenOnBehalfOf`. An ID token proves authentication to a client; it is not the delegated authorization artifact for the API exchange. ([On-behalf-of flows with MSAL.NET](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/web-apps-apis/on-behalf-of-flow))

Also keep these two assertions separate:

- `assertion` carries the user's access token for OBO;
- `client_assertion` is a certificate-signed JWT that authenticates the confidential middle-tier application.

If a certificate-backed **client assertion** is outside its valid time, the neighboring error is commonly `AADSTS700024`, not `AADSTS500133`. Microsoft's certificate-credential reference defines the client assertion's `nbf`, `iat`, and `exp` claims and recommends keeping its lifetime short. If signature validation fails instead, follow the [AADSTS700027 invalid client assertion guide](/posts/aadsts700027-invalid-client-assertion-microsoft-entra). ([Microsoft identity platform certificate credentials](https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials))

## Do not misdiagnose neighboring token failures

Use the complete response, not the word “expired,” to choose the runbook.

**`AADSTS500133` — user assertion outside its valid time.** Trace the inbound access token used in OBO, its timing, the exchange, and cache or queue behavior.

**`AADSTS700024` — client assertion outside its valid time.** Inspect the confidential client's signed credential assertion and its clock or generation path.

**`AADSTS700027` — client assertion signature validation failed.** Inspect the certificate, signing key, algorithm, header, and registered credential.

**`AADSTS50173` — grant expired or revoked against a validity cutoff.** Use the [AADSTS50173 revoked-grant runbook](/posts/aadsts50173-grant-expired-revoked-microsoft-entra) to find the password, session-revocation, or security event and require fresh authentication when appropriate.

**`AADSTS700082` — refresh token expired after inactivity.** Follow the [AADSTS700082 refresh-token recovery guide](/posts/aadsts700082-refresh-token-expired-microsoft-entra); do not treat a refresh token as an OBO assertion.

**`AADSTS50013` — invalid assertion for a broader set of reasons.** Microsoft's error reference includes issuer, malformed-token, expiry, and refresh-token-shape causes. Preserve the exact subreason rather than collapsing every assertion failure into clock skew.

## Preserve evidence without logging credentials

Record:

- sanitized error code and full description;
- Entra current time and assertion expiry from the error;
- trace ID, correlation ID, request ID, and UTC timestamp;
- tenant ID, client ID, middle-tier API audience, downstream resource, and requested scopes;
- library name and version;
- application build, region, replica, slot, host, and container image;
- request arrival, validation, OBO start, and OBO failure timestamps;
- cache source, cache key type, and hit or miss metadata without the token;
- queue enqueue, dequeue, retry, and dead-letter timestamps;
- last successful time and the first failing release or instance.

Never record the full access token, refresh token, client assertion, secret, authorization code, cookie, or private key. Microsoft documents that MSAL logging excludes tokens and other sensitive protocol artifacts, and its production guidance keeps personally identifiable information logging disabled. Use correlation IDs and approved claims-level evidence instead. ([MSAL handling of personally identifiable information](https://learn.microsoft.com/en-us/entra/msal/dotnet/resources/handling-pii), [Microsoft.Identity.Web logging guidance](https://learn.microsoft.com/en-us/entra/msidweb/advanced/logging))

If an existing trace, queue, or ticket contains a bearer token, treat that as a credential-exposure event under the organization's incident process. Do not copy it into a new tool to make the investigation easier.

## Find the right Microsoft Entra sign-in evidence

Open **Entra ID > Monitoring & health > Sign-in logs** and search around the UTC failure time. Microsoft separates activity into interactive user sign-ins, non-interactive user sign-ins, service-principal sign-ins, and managed-identity sign-ins. Non-interactive user sign-ins cover client activity performed on behalf of a user without a fresh factor; service-principal sign-ins cover an application acting without a user. ([Microsoft Entra sign-in log categories](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-customize-filter-logs))

For an OBO failure, start with the user-related record and correlate it with the middle tier's application telemetry. Preserve:

- exact failure reason and error code;
- application and resource IDs;
- user and tenant identifiers;
- IP, client app, and authentication context where present;
- Conditional Access result rather than assuming policy caused the failure;
- matching trace and correlation identifiers;
- grouped-event details and individual UTC timestamps.

The portal is not a packet capture. If the relevant request is not visible in the first category, check the architecture and adjacent categories before concluding Entra never received it. A middle tier's own client authentication and the user's delegated exchange are related but distinct evidence.

## Repair and validate without weakening security

### For an immediate request-bound failure

1. Confirm the client can acquire a new access token for the middle tier through its supported library.
2. Confirm the API validates the fresh token for its own audience and issuer.
3. Start OBO promptly with the new user assertion.
4. Confirm the downstream token has the intended audience and delegated permission shape at the receiving API.
5. Prove one real least-privileged operation, not merely an HTTP 200 from the token endpoint.
6. Correlate the successful attempt by UTC time and identifier.

Do not ask the user to repeat sign-in indefinitely. If silent acquisition cannot recover, the client must surface a supported interaction-required path. If the account or session is under investigation, complete containment before inviting new authentication.

### For a background or multi-instance failure

1. Stop new work from persisting raw bearer tokens.
2. Keep the existing failed work item and timestamps as evidence.
3. Implement the supported long-running OBO initiation and session-key pattern while a valid user assertion is present.
4. Put the token cache in an approved distributed store for every worker that must continue the session.
5. Protect cache data at rest, bound its retention, and document eviction and user-revocation behavior.
6. Canary one user, one work item, one worker pool, and one downstream permission set.
7. Test token renewal, consent removal, session revocation, cache loss, worker failover, and job cancellation.
8. Expand only after monitoring shows fresh acquisition and no raw-token replay.

If long-running user delegation cannot satisfy the workload's reliability and authorization requirements, pause and review the identity model. Changing to application permissions can widen access dramatically; it requires explicit scope design, admin consent, workload credential protection, and separate monitoring.

## AADSTS500133 administrator checklist

- [ ] Capture the sanitized error, UTC time, trace ID, and correlation ID.
- [ ] Prove the failed exchange is OBO.
- [ ] Confirm `assertion` is an access token issued to the middle-tier API.
- [ ] Separate the user assertion from `client_assertion` or `client_secret`.
- [ ] Compare Entra current time with assertion expiry.
- [ ] Validate the middle tier's own token through supported middleware.
- [ ] Check authoritative clock synchronization on every involved node.
- [ ] Trace gateway delay, retries, queues, workers, and raw-token caches.
- [ ] Use a fresh supported user token for request-bound OBO.
- [ ] Use long-running OBO plus distributed caching for approved background delegation.
- [ ] Keep tokens and credentials out of logs, tickets, and queue payloads.
- [ ] Correlate the repair in sign-in and application evidence.
- [ ] Stop when the error changes and follow the new failure.

## FAQ

### Does AADSTS500133 mean the client secret expired?

No. It identifies a time-validity problem with the assertion in the exchange. In OBO, that assertion is the incoming user access token. An expired or invalid client credential produces a different error family and must be diagnosed from its own response.

### Should I clear the token cache?

Not as a blind first step. Prove which cache contains what, whether the stale object is a raw upstream assertion or library-managed downstream token state, and which replicas share it. A broad flush can create sign-in load, user prompts, and lost evidence without fixing a queue or replay defect.

### Can I decode the assertion to check `exp`?

Only the API that owns the token should validate and consume it. Use supported server middleware and approved diagnostics for a token whose audience is your middle tier. Client applications should treat access tokens as opaque, and you should never paste a production token into an external decoder or ticket.

### Why does the failure appear only on one API node?

That pattern points to node-specific time, deployment, cache, retry, or routing state. Compare the failing replica with a healthy one using UTC clock offset, release, host, cache source, request path, and OBO timing before restarting it.

### Can Conditional Access cause AADSTS500133?

The code itself says the assertion is outside its valid time. Conditional Access, sign-in frequency, or revocation can still affect the broader session and the next acquisition, but disabling policy does not repair an expired assertion. Read the Conditional Access result and any subsequent error as separate evidence.

### How should a long-running job act for a user after the original token expires?

Use the supported long-running OBO pattern: initiate while a valid user token is present, keep a session key with the job, and use a distributed library-managed cache for later downstream acquisition. If the work does not truly require user delegation, review a least-privileged application-permission architecture instead of storing the original bearer token.

`AADSTS500133` is usually a lifecycle bug wearing an identity-error badge. Preserve the timestamps, prove the assertion and its audience, and follow the token from request arrival to OBO exchange. Once the team stops treating a bearer token as a durable job credential, the durable fix becomes clear: supported acquisition, synchronized time, library-managed cache state, and a deliberate interaction or long-running authorization path.
