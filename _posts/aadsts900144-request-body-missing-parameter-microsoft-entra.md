---
title: "AADSTS900144 Request Body Missing Parameter: Entra Fix"
excerpt: "Fix AADSTS900144 request body missing parameter errors by proving the OAuth grant, form encoding, and exact fields Entra received before changing credentials."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-29T17:03:16-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS900144 request body must contain** error means Microsoft Entra received an authentication request without a parameter required for that request. Read the parameter named in the error, identify the OAuth grant the application is actually sending, and compare the effective `application/x-www-form-urlencoded` body with Microsoft's parameter list for that exact flow. Do not rotate a secret, grant consent, or weaken Conditional Access until the missing-field problem is fixed.

Microsoft classifies AADSTS900144 as a developer error: the application attempted sign-in without the necessary or correct authentication parameters. The surrounding OAuth result is `invalid_request`, for which Microsoft's documented client action is to fix and resubmit the request. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

## AADSTS900144 request body must contain: the short answer

Use this order:

1. Preserve the complete response, including the parameter name, UTC timestamp, trace ID, correlation ID, application, tenant, token endpoint, and last known success.
2. Determine whether the failed call is authorization-code redemption, refresh-token redemption, client credentials, on-behalf-of, or device-code polling.
3. Capture the effective outbound request at the application's HTTP boundary with secrets and tokens redacted. Confirm that it is a `POST` to the intended `/token` endpoint with the documented form-encoded content type.
4. Compare the body keys—not a configuration screen or source template—with the current Microsoft flow reference.
5. If the field exists before a proxy, gateway, SDK adapter, or templating step but not at egress, repair that transformation.
6. Retest one request and verify that the response advances past AADSTS900144. Then diagnose any new, more specific error on its own evidence.
7. Correlate the result with the appropriate user or service-principal sign-in record where one is available.

This is a source-derived troubleshooting sequence, not a report of hands-on testing in a tenant.

## What AADSTS900144 proves—and what it does not

The error proves that the identity platform did not receive a required parameter in the form it expected for the submitted request. The response names the missing field as `{name}`. It does not, by itself, prove that:

- the client secret is expired or invalid;
- the requested scope is valid;
- the tenant or application registration is correct;
- user or administrator consent is missing;
- Conditional Access blocked the request; or
- Microsoft Entra is experiencing an outage.

Keep adjacent failures separate. The site's [AADSTS70011 invalid-scope guide](/posts/aadsts70011-invalid-scope-microsoft-entra) covers a `scope` value Entra received but rejected. The [AADSTS7000215 invalid-secret guide](/posts/aadsts7000215-invalid-client-secret-microsoft-entra) covers a confidential-client credential that failed validation. The [AADSTS90002 invalid-tenant guide](/posts/aadsts90002-invalid-tenant-name-microsoft-entra) covers authority resolution. AADSTS900144 occurs earlier: a required input is absent from the request body Entra parsed.

Microsoft's error response schema is useful here. Preserve `error`, `error_description`, `error_codes`, `timestamp`, `trace_id`, and `correlation_id`. Microsoft says applications should react to the stable `error` field, not parse `error_description` as program logic; the description is diagnostic text for developers. ([error-response handling](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#handling-error-codes-in-your-application))

## Check the wire format before the app registration

Microsoft's token-flow references consistently show a form-encoded `POST` body:

```http
POST /{tenant}/oauth2/v2.0/token HTTP/1.1
Host: login.microsoftonline.com
Content-Type: application/x-www-form-urlencoded

client_id={application-client-id}
&grant_type={grant-type}
&scope={resource-scope}
&...
```

The response is JSON; the request body is not. A JSON object that looks correct in an application log does not satisfy the documented token request if the HTTP client sends it as `application/json`. Likewise, putting a required body field only in the query string is not the same as form-encoding it in the body.

Inspect the final outbound request after every serializer, SDK hook, reverse proxy, API gateway, service mesh, and environment-variable expansion. Record parameter **names** and redacted value metadata, such as present/absent and length. Never log a client secret, authorization code, refresh token, device code, user assertion, or signed client assertion.

> **Analysis:** when the source object contains a field but Entra names that field as missing, the highest-value comparison is the serialized egress request. That comparison can expose a wrong content type, empty-value omission, renamed key, stale configuration binding, or intermediary rewrite without changing any tenant control.

## Match the required fields to the actual OAuth flow

Do not repair a request from a generic list. Each grant has a different contract.

### Client credentials

For a daemon using a shared secret, Microsoft's current example includes:

- `client_id` with the Application (client) ID;
- `scope`, normally the target resource followed by `/.default`;
- `client_secret`, unless the supported HTTP Basic pattern is used; and
- `grant_type=client_credentials`.

For certificate authentication, replace the shared secret with the documented `client_assertion_type` and signed `client_assertion`; keep `client_id`, `scope`, and `grant_type`. Microsoft's daemon guidance shows both request shapes with `application/x-www-form-urlencoded`. ([daemon token acquisition](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token#protocol))

If the missing name is `client_id`, verify that the application sends the **Application (client) ID**, not the service-principal object ID, credential ID, tenant ID, or display name. Do not rotate a working credential to repair a missing client identifier.

If the missing name is `scope`, confirm the client is using the v2.0 token endpoint and the scope belongs to the intended resource. After the field is present, an invalid value can correctly produce a different error such as AADSTS70011. That progression is useful: it shows parsing advanced to scope validation.

### Authorization-code redemption

For the token leg of authorization-code flow, Microsoft's reference requires:

- `client_id`;
- `code` returned by the authorization endpoint;
- `redirect_uri` matching the one used to obtain the code;
- `grant_type=authorization_code`; and
- `code_verifier` when PKCE was used.

A confidential web application also authenticates with its secret or certificate assertion. Microsoft explicitly warns not to put a client secret in a native app or single-page app, where it cannot be stored safely. ([authorization-code token request](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#redeem-a-code-for-an-access-token))

If an SDK generated the authorization request but custom code redeems the code, compare the callback state with the token request. A missing `code_verifier` is a PKCE transaction problem; adding a secret to a public client is not the supported substitute. A missing `redirect_uri` should be repaired with the exact value used in the first leg, not an arbitrary registered URI.

### Refresh-token redemption

Microsoft's refresh request includes `client_id`, `refresh_token`, and `grant_type=refresh_token`; `scope` is optional within the documented constraints, and confidential web apps authenticate with their registered credential. ([refresh an access token](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#refresh-the-access-token))

Do not copy the authorization-code body and change only the grant type. A refresh request does not redeem `code`, while an authorization-code request does not redeem `refresh_token`. Build and validate each request from the flow-specific contract.

### On-behalf-of flow

An on-behalf-of request has several easy-to-confuse assertions. Microsoft's OBO reference requires:

- `grant_type` set to the documented JWT bearer grant value;
- `client_id` for the middle-tier application;
- `assertion`, which is the incoming user access token whose audience is that middle tier;
- `scope` for the downstream resource;
- `requested_token_use=on_behalf_of`; and
- a confidential-client credential, either `client_secret` or the certificate-based `client_assertion_type` plus `client_assertion`.

The user `assertion` and the app's `client_assertion` are not interchangeable. One carries delegated user context into the exchange; the other authenticates the confidential client. ([Microsoft identity platform OBO flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow#first-case-access-token-request-with-a-shared-secret))

The exact OBO grant value is:

```text
urn:ietf:params:oauth:grant-type:jwt-bearer
```

If AADSTS900144 names `requested_token_use`, add the documented field only after proving this is truly an OBO exchange. Do not turn a client-credentials request into OBO merely to satisfy the parser.

### Device-code polling

The device authorization request goes to `/devicecode` with `client_id` and `scope`. Polling then goes to `/token` with:

- `grant_type` set to the documented device-code grant value;
- the same `client_id`; and
- the `device_code` returned by the first request.

Microsoft documents expected polling responses such as `authorization_pending`, `authorization_declined`, `bad_verification_code`, and `expired_token`. Those are not AADSTS900144 and should be handled according to the device-code protocol. ([device authorization grant](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code))

The exact polling grant value is:

```text
urn:ietf:params:oauth:grant-type:device_code
```

## Find where the parameter disappeared

Compare four representations of the same attempt:

1. **Configuration source:** the application setting, managed configuration, secret reference, or deployment variable intended to supply the field.
2. **Runtime object:** the grant-specific request object immediately before serialization.
3. **Egress HTTP request:** method, host, path, content type, form key names, and redacted value presence after local networking components.
4. **Entra response:** named missing parameter, timestamp, trace ID, and correlation ID.

Common boundaries to prove include:

- an environment variable exists in one deployment slot but not another;
- a serializer omits empty or undefined values;
- a framework sends JSON despite a form-content header, or form data despite a JSON header;
- a gateway policy rebuilds the body and drops an unrecognized key;
- a wrapper uses the wrong parameter name or capitalization;
- code sends the authorize-leg fields to `/token`, or token-leg fields to `/authorize`;
- a v1 endpoint request is assembled from a v2 scope-based template, or the reverse; and
- a public-client configuration is reused by a confidential-client deployment, or the reverse.

Do not capture raw production secrets to prove these cases. At the safe logging boundary, emit a sorted list of form keys, the grant type, host, path, content type, request timestamp, application build, deployment slot, and a generated diagnostic correlation value. Hashing or truncating a secret is still unnecessary disclosure when present/absent and length are enough.

## Use sign-in evidence without overclaiming it

For app-only client-credentials requests, look under **Entra ID > Monitoring & health > Sign-in logs > Service principal sign-ins**. Microsoft describes these as nonuser sign-ins where an application or service principal presents a certificate or secret. Events with the same service principal, status, IP address, and resource can be aggregated, so expand a row to inspect individual timestamps. ([service-principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins))

For delegated flows, inspect the appropriate interactive or non-interactive user sign-in category. The Basic info tab can show the error code and failure reason, while the record's identifiers help correlate the attempt. Microsoft cautions that the portal localizes the displayed date and time to the administrator viewing it, so preserve the UTC time from the error response as well. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

Absence of an obvious log row is not permission to guess. A malformed request can fail before the service resolves all the identity objects an operator expects to filter by. Use the response identifiers, exact UTC window, effective endpoint, application telemetry, and egress evidence for escalation.

Also keep Conditional Access in the right place. AADSTS900144 says a required request parameter is missing; it does not say a policy denied a correctly formed token request. Once the request parses, a later sign-in can legitimately reach consent, credential, risk, or Conditional Access evaluation. Diagnose that later result separately.

## Mitigate and roll back safely

The narrow mitigation is to restore the missing grant-specific field at the last component that is proven to drop it.

- If a deployment variable is missing, restore the approved reference or configuration binding without exposing the value.
- If serialization is wrong, send the documented form body and content type.
- If a proxy rewrite drops the key, correct or bypass that specific transformation under change control.
- If the wrong OAuth flow was selected, restore the application's approved client type and grant instead of adding unrelated fields.
- If an SDK upgrade changed request construction, revert to the last supported build or correct the documented adapter configuration while preserving security updates elsewhere.

Rollback means returning to the last known-good request construction and deployment configuration. It does not mean disabling Conditional Access, granting broader permissions, changing the application to multitenant, putting a secret in browser code, switching to a weaker legacy flow, or issuing a new credential before the existing one is actually rejected.

Retest one canary request. A successful token response is the end-to-end proof. A different error is not success, but it can prove the request passed the missing-parameter boundary. Preserve both attempts and continue from the new exact code.

Escalate to the application owner when the deployed build does not emit the documented request; to the gateway or platform owner when the body changes in transit; and to Microsoft when the wire request visibly contains the required field in the documented form but Entra continues to return AADSTS900144 for that field. Include the tenant ID, Application (client) ID, grant type, endpoint, UTC timestamp, trace and correlation IDs, sanitized form-key list, content type, client or SDK version, network path, last known success, and a redacted minimal reproduction. Never include credentials, codes, tokens, or assertions.

## AADSTS900144 administrator checklist

- [ ] Capture the complete response and the parameter named as missing.
- [ ] Preserve UTC time, trace ID, correlation ID, tenant, app, resource, and endpoint.
- [ ] Classify the actual OAuth flow and client type.
- [ ] Confirm a `POST` to the intended endpoint.
- [ ] Confirm `Content-Type: application/x-www-form-urlencoded`.
- [ ] Compare the final form-key list with the current Microsoft flow reference.
- [ ] Distinguish application client ID from tenant, object, and credential IDs.
- [ ] Check serialization, empty-value omission, proxy rewrites, and deployment bindings.
- [ ] Keep secrets, codes, tokens, and assertions out of logs and tickets.
- [ ] Do not rotate credentials or weaken policy to repair a missing field.
- [ ] Retest one canary and preserve the new exact result.
- [ ] Correlate the request with the correct sign-in log category where available.
- [ ] Escalate with a redacted wire-level evidence package if parser behavior contradicts the documentation.

## Frequently asked questions

### Does AADSTS900144 mean my client secret expired?

No. It means a required parameter was missing from the request body. An expired or invalid credential has a different validation path and error. Fix the named missing field first; rotate a credential only when evidence shows that credential is expired, exposed, or rejected.

### Why does the field appear in my code but Entra says it is missing?

Source code is not the wire request. A serializer can omit an empty value, a framework can send the wrong content type, a gateway can rebuild the body, or a deployment binding can resolve differently at runtime. Compare the redacted final form keys at egress with the Microsoft contract.

### Can I send the token request as JSON?

Microsoft's published token-flow examples use `application/x-www-form-urlencoded`. Send the required parameters as form data. A JSON response from the token endpoint does not imply that the request body should also be JSON.

### Should a client secret always appear in the form body?

No. Microsoft's authorization-code, client-credentials, and OBO references also support the HTTP Basic authentication pattern for client credentials. Use the supported pattern chosen by the application architecture. Never place a secret in a SPA, native client, browser log, or ticket.

### Is AADSTS900144 a Conditional Access failure?

Not by itself. It is an invalid request caused by a missing required parameter. A correctly formed retry can later reach Conditional Access and produce a separate result; investigate that result in its own sign-in record.

### Is a new error after the fix a regression?

Not necessarily. If the request now passes body parsing, Entra can evaluate the tenant, application, credential, grant, scope, consent, and policy. Preserve the new code and treat it as the next failed boundary rather than adding fields until the request happens to succeed.

The operating rule is simple: **debug the request Entra received, not the request the code intended to send**. Identify the grant, validate the documented form keys at egress, repair the first component that drops the named parameter, and let the next exact response determine the next step.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Daemon application token acquisition](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token)
- [On-behalf-of flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow)
- [Device authorization grant](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)
- [Service principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins)
- [Sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
