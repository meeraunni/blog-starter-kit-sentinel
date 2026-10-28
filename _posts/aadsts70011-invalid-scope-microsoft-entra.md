---
title: "AADSTS70011 Invalid Scope: Microsoft Entra Fix Guide"
excerpt: "Fix AADSTS70011 invalid scope errors by matching the endpoint, resource, delegated scope or /.default request, API registration, consent, and token flow."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-28T09:35:05-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS70011 invalid scope** error means Microsoft Entra rejected the value in the OAuth 2.0 `scope` parameter before it could issue the requested token. The dependable fix is to match the request to the token endpoint, target API, permission type, and grant flow. Do not rotate a secret, change a redirect URI, grant broad consent, or weaken Conditional Access until that request shape is proven.

Grab a coffee and preserve the failed request. Microsoft's current error reference defines AADSTS70011 as `InvalidScope`, while the authorization-code reference tells the client to replace the invalid scope with one the resource actually exposes. ([Microsoft Entra authentication error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes), [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#error-codes-for-token-endpoint-errors))

This guide is for Entra administrators, application owners, and API owners diagnosing interactive applications, daemons, on-behalf-of services, and custom APIs. It separates a malformed or unsupported scope from nearby resource, consent, credential, and policy failures so the repair stays narrow.

## AADSTS70011 invalid scope: the short answer

Work through these checks in order:

1. Capture the complete error, UTC timestamp, request ID, correlation ID, authority, endpoint version, client ID, grant type, and sanitized `scope` value.
2. Confirm the request uses a v2.0 endpoint. A v2 request uses `scope`; a v1 request uses `resource`.
3. Split the scope string on spaces after URL decoding. Make sure every resource-specific value belongs to one target API.
4. For delegated access, compare each requested value with the API's exact published scope: `{Application ID URI}/{scope-name}`.
5. For client credentials, request only `{resource-identifier}/.default`; do not request individual delegated scopes.
6. For on-behalf-of, request scopes that belong to the downstream API; use `/.default` only where the documented static or combined-consent pattern calls for it, and validate the middle tier's configured permissions.
7. Do not combine `/.default` with a dynamic delegated scope such as `Mail.Read` in the same request.
8. Confirm the scope still exists, is enabled, belongs to the intended API registration and tenant, and is appropriate for the client application's permission type.
9. Retest with a new authorization or token request, then validate the token audience and `scp` or `roles` claims before closing the incident.

The `scope` parameter is not a free-form label. It tells Entra which resource should receive the token and which delegated permissions or statically configured permissions the client is asking to use.

## Place the failure in the token flow

In a v2.0 authorization-code flow, scopes normally appear twice:

```text
GET  /oauth2/v2.0/authorize?...&scope=openid profile api://{api-id}/Orders.Read
POST /oauth2/v2.0/token        scope=openid profile api://{api-id}/Orders.Read
```

The authorization request establishes the permission request and user interaction. The token request redeems the code in that context. Microsoft documents `scope` as required on the authorization request and says the token request's scope must be equivalent to or a subset of the scopes requested originally. ([authorization-code request parameters](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#request-an-authorization-code), [authorization-code redemption parameters](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#redeem-a-code-for-an-access-token))

That gives you three useful branches:

- **The authorize request fails immediately:** inspect the scope spelling, resource prefix, endpoint, account type, and API registration.
- **Sign-in succeeds but code redemption fails:** compare the decoded scopes on both legs and confirm the token request did not introduce a new scope or switch resources.
- **A daemon fails at the token endpoint:** confirm it requests the target resource's `/.default` scope and uses `grant_type=client_credentials`.

Do not troubleshoot the API response yet. AADSTS70011 occurs while the authorization server is evaluating the token request. The client has not received a usable access token for the intended resource.

## Preserve a sanitized request before changing anything

Record:

- the exact AADSTS70011 description and any rejected scope shown in it;
- UTC timestamp, trace ID, correlation ID, and request ID when present;
- authority host and tenant segment;
- whether the endpoint contains `/oauth2/v2.0/` or `/oauth2/`;
- Application (client) ID and expected resource/API;
- grant type and application architecture;
- decoded scope names, preserving case, slashes, and punctuation;
- environment, release version, affected population, and last known success; and
- recent changes to configuration, exposed API scopes, Application ID URI, consent, or client library.

Do not save authorization codes, access tokens, refresh tokens, ID tokens, client secrets, certificate private keys, cookies, PKCE verifiers, or complete client assertions in the incident record. If a trace contains a token, sanitize it before attaching it to a ticket.

For a browser application, capture the effective authorization URL and form-encoded token request in developer tools. For a server or daemon, log parameter names and sanitized identifiers at the authentication boundary. Configuration can be overridden by deployment variables, managed identity settings, a reverse proxy, or library defaults; inspect the effective request, not only the source file you expected to run.

## Decode the scope value exactly

The v2 endpoint accepts a space-delimited scope list. URL encoding can hide the problem, so decode the value once before comparing it. A healthy delegated request to a custom API might contain:

```text
openid profile offline_access api://11111111-2222-3333-4444-555555555555/Orders.Read
```

Microsoft documents `openid`, `profile`, `email`, and `offline_access` as OpenID Connect scopes. A resource-specific delegated scope combines the API's Application ID URI with the scope name the API exposes. ([Microsoft identity platform scopes and permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc), [configure an application to expose a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis#add-a-scope))

Check for these common defects:

- a comma-separated list instead of spaces;
- a missing resource prefix on a custom API scope;
- an application object ID or service-principal object ID used as the resource identifier;
- a scope copied from another environment or API registration;
- an obsolete scope name that the API owner disabled or replaced;
- an unexpected trailing slash in the Application ID URI;
- `resource=` semantics copied into a v2 `scope=` parameter;
- one request mixing Microsoft Graph and a custom API's resource-specific scopes; or
- `/.default` combined with a dynamically requested delegated scope.

Compare strings, not display names. `Orders.Read` exposed by one API is not interchangeable with a scope bearing the same name on another API.

### Keep one resource in one token request

An access token has one audience. The client-credentials protocol reference explicitly requires all scopes in the request to belong to one resource and says including multiple resources produces an error. ([client-credentials token request](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow#get-a-token))

If an application needs Microsoft Graph and a custom orders API, acquire two tokens:

```text
Token 1 audience: https://graph.microsoft.com
Token 2 audience: api://11111111-2222-3333-4444-555555555555
```

Do not concatenate both APIs' permissions into one scope request and do not reuse the Graph token against the custom API. The API should validate that the token's `aud` claim identifies it.

## Match the scope shape to the grant flow

### Delegated authorization code or interactive flow

For delegated access, request the API's published delegated scope. A custom scope's full value is:

```text
{Application ID URI}/{scope-name}
```

For example:

```text
api://11111111-2222-3333-4444-555555555555/Orders.Read
```

In **Entra ID > App registrations**, inspect the API registration under **Expose an API**. Confirm the Application ID URI, exact scope name, enabled state, who can consent, and descriptions. Then inspect the client registration under **API permissions** to confirm the intended API and delegated permission. Microsoft's configuration guidance distinguishes the client registration from the web API registration and shows the delegated permission being selected from the API the client will call. ([configure client permissions for a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-access-web-apis))

Do not add an application permission when the code expects a delegated `scp` claim, or request a delegated scope from a non-interactive daemon. Those are different authorization models.

### Client credentials

A daemon or service authenticating as itself must request:

```text
{resource-identifier}/.default
```

For Microsoft Graph:

```text
https://graph.microsoft.com/.default
```

For a custom API:

```text
api://11111111-2222-3333-4444-555555555555/.default
```

Microsoft says client-credentials requests must use `/.default`; individual application permissions cannot be requested by name at runtime. The issued token contains the application roles that were configured for that resource and granted by an administrator. ([daemon token acquisition](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token#scopes-to-request), [the `/.default` scope](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc#client-credentials-grant-flow-and-default))

If the request uses `api://.../Orders.Read`, first decide whether `Orders.Read` is a delegated scope or an app role. Replacing it with `/.default` is correct only after the client registration has the required **application permission** and the tenant has the intended admin grant.

Some resource identifiers end with `/`. Microsoft documents that the slash must be preserved, producing a double slash before `.default` for resources such as Azure Resource Manager:

```text
https://management.azure.com//.default
```

Do not remove a slash because the value looks unusual; compare it with the resource's documented identifier. ([trailing slash and `/.default`](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc#trailing-slash-and-default))

### On-behalf-of flow

In the on-behalf-of flow, a middle-tier API exchanges a user's token for a token to a downstream API. The `scope` parameter is required and must identify permissions on that downstream resource. Microsoft's protocol example requests the Microsoft Graph delegated `user.read` scope; its separate combined-consent guidance uses `/.default` for statically configured permissions and known-client applications. The middle tier must have the downstream API permissions configured and consented appropriately. ([OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow))

Do not request the incoming token's `scp` string as though those permissions belonged to the downstream resource. The incoming and outgoing tokens have different audiences and can represent different permissions. For a SAML token obtained through OBO, Microsoft documents a different rule: the SAML entity ID is requested with `/.default` appended.

### Never combine `/.default` with dynamic consent scopes

This request shape is invalid:

```text
https://graph.microsoft.com/.default Mail.Read
```

Microsoft states that clients cannot combine static `/.default` consent with dynamic delegated consent in one request. Use the request model appropriate to the flow, or perform separate authorization work where the application design genuinely requires it. ([static and dynamic consent boundary](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc#the-default-scope))

## Verify the API registration rather than guessing

For a custom API, work with the API owner and check:

1. **Application ID URI:** this prefixes the full delegated scope value.
2. **Exposed scope:** the exact scope name exists and is enabled.
3. **Permission type:** delegated scope versus application role matches the client flow.
4. **Supported tenant model:** the client is requesting the API through a valid tenant and cloud.
5. **Client configuration:** the intended delegated permission or application role is configured on the client registration.
6. **Consent:** the required grant exists or the approved consent workflow is available.

For a read-only inventory, retrieve the API application by its Application (client) ID and select only the relevant properties:

```http
GET https://graph.microsoft.com/v1.0/applications(appId='{api-application-id}')
    ?$select=id,appId,displayName,identifierUris,api,appRoles,signInAudience
```

Then retrieve the client application separately and inspect its configured resource access:

```http
GET https://graph.microsoft.com/v1.0/applications(appId='{client-application-id}')
    ?$select=id,appId,displayName,requiredResourceAccess
```

Microsoft Graph documents the application object's `identifierUris`, `api`, `appRoles`, `signInAudience`, and `requiredResourceAccess` properties, and supports addressing an application by its `appId` alternate key. ([application resource](https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0), [get application](https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0))

Treat `requiredResourceAccess` as configured intent, not proof that consent was granted. A client can also request delegated permissions dynamically. Validate the actual request and tenant grants separately.

## Separate AADSTS70011 from nearby failures

These errors can occur in the same application, but their repairs are different:

- **AADSTS500011 resource principal not found:** Entra cannot resolve the target resource in the request tenant. Use the [AADSTS500011 resource-principal guide](/posts/aadsts500011-resource-principal-not-found-microsoft-entra) to validate the resource identifier, authority, and service principal.
- **AADSTS65001 consent required:** the permission can be valid, but the client lacks the required user or admin grant. Use the [AADSTS65001 consent guide](/posts/aadsts65001-consent-required-microsoft-entra) after the scope itself is proven.
- **AADSTS7000215 invalid client secret:** Entra resolved the client but rejected its credential. The [AADSTS7000215 guide](/posts/aadsts7000215-invalid-client-secret-microsoft-entra) covers credential validation and rotation.
- **AADSTS9002326 cross-origin token redemption:** browser code is redeeming a code with a redirect URI that is not classified as SPA. The [AADSTS9002326 guide](/posts/aadsts9002326-cross-origin-token-redemption-microsoft-entra) covers the platform and PKCE boundary.
- **AADSTS53003 Conditional Access block:** token issuance reached policy evaluation and was blocked. A malformed scope is not repaired by a policy exclusion.

Do not grant consent just to see whether AADSTS70011 changes. First prove that the requested permission belongs to the expected resource and flow. Consent is an authorization decision, not a parser repair.

## Apply the least disruptive repair

Choose the branch supported by evidence:

- **Typo or stale scope:** update the caller to the exact current scope published by the API owner.
- **Wrong environment:** restore the production API's resource identifier and tenant authority in the deployed configuration.
- **v1/v2 mismatch:** either use the documented v1 `resource` request or migrate the caller deliberately to v2 `scope` semantics; do not mix them.
- **Daemon requests a named delegated scope:** configure the required application permission, obtain approved admin consent, and request the resource's `/.default` scope.
- **Delegated client requests `/.default` plus a dynamic scope:** use one valid consent model for that request instead of combining both forms.
- **Multiple resources in one request:** acquire one token per resource.
- **Scope was disabled or renamed:** coordinate a versioned client migration with the API owner. Re-enable an old permission only after reviewing why it was retired and who could use it.
- **Wrong application registration:** correct the client or API identifier; never create a look-alike scope under an unrelated registration to silence the error.

Keep rollback equally narrow. If a deployment changed a scope string, roll back that configuration. If the API owner changed a published permission, preserve the old and new definitions, affected clients, approval, and retirement window in the change record.

## Validate the repair end to end

1. Start a new authorization or token request; do not reuse an authorization code from the failed flow.
2. Confirm AADSTS70011 no longer appears and the response comes from the intended tenant.
3. Decode the access token only in approved local tooling. Verify its issuer and audience before looking at permissions.
4. For delegated access, confirm the expected permission appears in `scp`.
5. For app-only access, confirm the expected application permission appears in `roles`.
6. Call only the intended API operation and prove least-privilege behavior with positive and negative tests.
7. Correlate the successful request with sign-in evidence and preserve the request and correlation IDs.
8. Verify that Graph, the custom API, and any other resource each use their own token acquisition path.
9. Monitor the previous error rate through at least one normal workload cycle.

Microsoft's sign-in troubleshooting guidance recommends using the error code, failure reason, request ID, and correlation ID to locate the matching event. Its sign-in activity model separates the client application, resource, user or service principal, and authentication details. ([troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors), [sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

**Analysis:** a token being issued proves only that Entra accepted one request. Production readiness requires the correct audience, permission claim, tenant, workload identity, and API authorization behavior. A broader `/.default` grant that happens to work is not a substitute for least privilege.

## Troubleshoot the remaining symptom

### The scope works in one tenant but not another

Compare the API's supported account type, the authority tenant, and whether the resource service principal exists in the failing tenant. Do not assume a multitenant client makes a single-tenant custom API available everywhere.

### The error changed to AADSTS65001

The scope is now recognizable, but consent is missing or insufficient. Review the client, resource, permission type, publisher, and tenant consent policy before approving anything.

### The error changed to AADSTS500011

Entra is now evaluating a resource identifier it cannot resolve in that tenant. Confirm the Application ID URI, authority, cloud, and resource service principal.

### The daemon gets a token but the API returns 403

Verify the token audience and `roles` claim, then confirm the API enforces the expected app role. AADSTS70011 is resolved; the remaining failure is API authorization or permission assignment, not scope syntax.

### The delegated token lacks the expected `scp` value

Confirm the client requested that exact delegated scope, the permission was granted, and the token is for the intended resource. Do not read permissions from an ID token or from an access token issued to another API.

### The request is correct in source control but wrong on the wire

Trace configuration precedence. Check deployment variables, secret-store values that contain nonsecret endpoint configuration, framework configuration, reverse proxies, tenant-specific overrides, and stale application instances. Preserve the effective decoded scope from the failing request as the comparison point.

## Escalation package for Microsoft or the application owner

If the exact request still fails after the registration and flow are proven, provide:

- UTC failure time and region;
- AADSTS70011 description, trace ID, request ID, and correlation ID;
- tenant ID, client ID, resource application ID, and sanitized scope;
- endpoint version and grant type;
- whether the failure occurs at authorize or token redemption;
- API Application ID URI, exposed-scope name and enabled state;
- client permission type and consent state;
- affected and unaffected tenants, clients, or deployment rings;
- last known success and recent configuration changes; and
- a minimal reproduction with all credentials, codes, and tokens removed.

That package lets support correlate the server-side event without exposing authentication material.

## Admin checklist

- [ ] Capture the complete error and correlation evidence
- [ ] Decode the effective scope string once
- [ ] Confirm v1 `resource` versus v2 `scope` semantics
- [ ] Keep every resource-specific scope in the request on one API
- [ ] Match delegated, client-credentials, or on-behalf-of flow
- [ ] Use `/.default` where the flow requires it
- [ ] Never combine `/.default` with dynamic delegated scopes
- [ ] Verify the API's Application ID URI and enabled scope
- [ ] Confirm the client registration and permission type
- [ ] Treat consent as a separate authorization gate
- [ ] Retest with a fresh request and verify `aud`, `scp`, or `roles`
- [ ] Preserve sign-in and change evidence
- [ ] Monitor through a normal workload cycle

## Final word

AADSTS70011 is usually precise once you stop treating “scope” as a generic permission label. Follow the request from endpoint to resource, then from grant flow to the exact permission the API publishes. Fix that one boundary, validate the token the API actually receives, and leave credentials, redirects, Conditional Access, and unrelated consent untouched.

### Microsoft primary sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [OAuth 2.0 on-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Configure an application to expose a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis)
- [Configure client permissions for a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-access-web-apis)
- [Microsoft Graph application resource](https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0)
