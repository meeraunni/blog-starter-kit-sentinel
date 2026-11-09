---
title: "AADSTS700025 Client Is Public: Microsoft Entra Fix"
excerpt: "Fix AADSTS700025 by proving why Entra treats the request as public, removing misplaced credentials, aligning the OAuth flow, and validating safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-09T09:05:00-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS700025 client is public** error means Microsoft Entra classified the token request as coming from a public client, but the request also presented a `client_secret` or `client_assertion`. A public client cannot safely prove its identity with a private application credential. The reliable fix is to determine why Entra classified this request as public, then either remove the misplaced credential from a legitimate public-client flow or correct a server-side application's registration and code so it operates as a confidential client.

Grab a coffee before creating another secret or flipping **Allow public client flows**. Microsoft's error reference says `AADSTS700025` is returned when a public client presents a secret or assertion. Its client-type guidance defines the real boundary: software distributed to a browser, desktop, or mobile device cannot keep an application credential secret, while a server-side web app or daemon can authenticate as a confidential client. ([Microsoft Entra error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [public and confidential client applications](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications))

> **Documentation boundary:** this guide is based on current Microsoft documentation and does not claim a live tenant test. It is for Entra administrators, application owners, and platform teams repairing token acquisition without placing credentials in public code or changing an unrelated security policy.

## AADSTS700025 client is public: the short answer

Work the failure in this order:

1. Capture the sanitized error, UTC time, trace ID, correlation ID, tenant, client ID, token endpoint, grant type, redirect URI, and deployed release. Never capture the credential value or complete assertion.
2. Inspect the actual token request and the code path that created it. Prove whether it is authorization code with PKCE, device code, ROPC, client credentials, on-behalf-of, or another supported flow.
3. Classify the runtime. Browser, desktop, and mobile code are public clients. A backend web app, API, daemon, or service can be confidential only when it protects its credential from users and untrusted software.
4. Prove why Entra treated this request as public. For many flows, the registered redirect-URI platform supplies that signal. For flows without a redirect URI, the fallback public-client setting can decide it.
5. If the runtime is legitimately public, remove `client_secret` and `client_assertion` from the request and use a supported public-client library and flow.
6. If the runtime is genuinely confidential, correct the platform registration and confidential-client code path; keep the credential on the server and use the supported grant.
7. Retest one controlled path, correlate the new event in the correct sign-in-log category, and prove the application can call its intended resource.
8. If a secret was distributed in browser, desktop, or mobile code, treat that value as exposed. Inventory every legitimate dependency before replacing or removing it, then follow the organization's credential-incident process.

The mirror-image error is [AADSTS7000218, where Entra expected a confidential-client credential but none arrived](/posts/aadsts7000218-invalid-client-microsoft-entra). `AADSTS700025` says a credential **did** arrive on a request Entra considered public.

## Put the failure at the token endpoint

`client_id` and client authentication are not the same thing. The client ID is a public identifier for the app registration. A client secret, certificate-backed assertion, managed identity, or federated credential is proof used by a confidential client to authenticate itself.

Microsoft's client-type documentation makes the security consequence explicit: a public client runs where users or attackers can inspect its source, package, memory, or browser execution. It cannot keep a shared secret. A confidential client runs on controlled server infrastructure and can protect a credential from the user. ([MSAL client types](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications), [Microsoft identity platform application types](https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types))

That is why adding a secret to a native application does not make it confidential. It only embeds a reusable credential in software you distribute. Likewise, removing a credential from a daemon does not turn client credentials into a public-client flow. The runtime, registration, library object, and OAuth grant must agree.

`AADSTS700025` occurs before Microsoft Entra can issue a token for the requested resource. Changing API permissions, granting more consent, resetting a user's MFA method, or excluding the app from Conditional Access cannot resolve a client-type contradiction.

## Preserve the evidence without preserving the secret

Record these fields from the failed response and application telemetry:

- error code and complete sanitized description;
- UTC timestamp, trace ID, correlation ID, and request ID when available;
- authority host and tenant value;
- Application (client) ID and deployment environment;
- token endpoint version and OAuth grant type;
- redirect URI, if the flow uses one;
- whether the request contained `client_secret` or `client_assertion`—not its value;
- library name and version, application release, and last successful time;
- whether the failure affects every instance or only one region, slot, device type, or release ring.

Keep tokens, authorization codes, assertions, secrets, cookies, and private keys out of tickets. Microsoft says MSAL does not log tokens, authorization codes, PKCE codes, client assertions, passwords, or certificate private keys. Its production guidance also keeps PII logging disabled and recommends correlation IDs for troubleshooting. ([MSAL handling of PII](https://learn.microsoft.com/en-us/entra/msal/dotnet/resources/handling-pii), [Microsoft.Identity.Web logging](https://learn.microsoft.com/en-us/entra/msidweb/advanced/logging))

If the failure began after a deployment, compare the effective runtime configuration rather than only the repository default. A stale environment variable, secret-store reference, Helm value, application setting, or library constructor can keep sending a credential after the app registration was changed.

## Prove why Microsoft Entra classified the client as public

Microsoft's AADSTS7000218 troubleshooting article documents the same classification boundary from the opposite direction. Entra can use the redirect URI's registered platform type: a **Web** redirect URI identifies a confidential-client path, while **Mobile and desktop applications** identifies a public-client path. When a flow has no redirect URI, Entra can use **Enable the following mobile and desktop flows**, represented in Microsoft Graph as `isFallbackPublicClient`, as the fallback. ([Microsoft's client-type determination](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/confidential-client-application-authentication-error-aadsts7000218#how-microsoft-entra-id-determines-the-client-type), [Microsoft Graph application resource](https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0))

Use the client ID from the error, not a display name:

1. Open **Entra ID > App registrations > All applications**.
2. Search for the exact Application (client) ID.
3. Open **Authentication** and inventory every platform section and redirect URI.
4. Record **Allow public client flows** under Advanced settings.
5. Open **Certificates & secrets** only to inventory credential metadata. Do not create or delete a credential while you are still classifying the runtime.

For a read-only application-object view, Microsoft Graph can address the object by its Object ID or `appId`. `Application.Read.All` is the least-privileged Microsoft Graph permission listed for reading an application you do not merely own. After locating the registration by client ID, copy its Object ID and read it with this request; use `$select` when you want to limit the returned properties. ([Get application](https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0))

```http
GET /v1.0/applications/{object-id}
Host: graph.microsoft.com
```

Read the result as evidence, not as a one-field verdict:

- `web.redirectUris` describes server-side web callbacks.
- `spa.redirectUris` describes browser-based single-page application callbacks.
- `publicClient.redirectUris` describes native public-client callbacks.
- `isFallbackPublicClient` supplies the fallback when Entra cannot infer the type from a redirect URI.
- `passwordCredentials` and `keyCredentials` show registered credential metadata; their presence does not prove the failing runtime should use them.

Microsoft documents that one app registration can participate in public and confidential workflows. The individual request still has to use a coherent flow and platform signal. That mixed capability is useful, but it makes evidence from the actual failed request more important than the app registration's display name or the mere existence of a secret.

## Classify the intended workload before changing the registration

Use the runtime boundary to choose the repair branch.

### Public client: remove the application credential

This branch fits a desktop app, mobile app, command-line client, device-code client, or browser SPA whose code and configuration reach an end-user environment.

The repair is to:

1. remove `client_secret` and `client_assertion` from the token request;
2. instantiate the supported library as a public client rather than a confidential client;
3. use the documented public-client flow for that application type;
4. keep the correct native or SPA redirect URI registered under its proper platform;
5. use authorization code with PKCE for a SPA or other supported public-client journey;
6. validate that no build artifact, browser bundle, mobile package, desktop binary, log, or configuration download contains the old credential.

Microsoft recommends authorization code with PKCE for SPAs and describes device code as a public-client flow. Its client-credentials documentation explicitly says never to publish a credential in source code, embed it in a web page, or place it in a widely distributed native application. ([Application types](https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types), [desktop-app registration](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-app-registration), [client-credentials security boundary](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow))

Do not move a secret from JavaScript into an obfuscated string, mobile secure storage, desktop registry key, or packaged configuration file and call the problem fixed. Those locations can protect user data from casual access, but they cannot turn software distributed to an untrusted device into a confidential OAuth client.

### Confidential client: correct the public classification

This branch fits a server-side web application, API, daemon, worker, or automation running in an environment that can protect its credential from users.

Check for these mismatches:

- a server-side authorization-code callback registered under **Mobile and desktop applications** instead of **Web**;
- backend code accidentally using a public-client library constructor;
- a daemon or service using a public-client grant or fallback setting instead of client credentials;
- an environment-specific redirect URI selecting a different platform than production;
- shared configuration that injects a public-client redirect URI into the server deployment;
- a client ID copied from the mobile or SPA registration into the backend service.

Correct the smallest boundary. Register the approved server callback as **Web** when the application is a server-side web app, use the confidential-client library path, and keep client authentication on the backend. For an app-only daemon, use the client-credentials grant with `/.default` for the intended resource and a supported confidential credential. ([Redirect URI platform guidance](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url), [client-credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow))

If the workload runs on Azure, Microsoft's current Microsoft.Identity.Web guidance recommends managed identity plus workload identity federation when supported. It recommends certificates over shared secrets for production when certificateless authentication is unavailable. Those are security improvements after the client type is correct; they do not repair a request that Entra still classifies as public. ([Microsoft.Identity.Web credential choices](https://learn.microsoft.com/en-us/entra/msidweb/authentication/credentials-overview), [certificate guidance](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates))

### One product has both a public front end and confidential backend

A SPA plus API, mobile app plus backend, or desktop client plus daemon contains separate trust boundaries. Do not give the public component the backend's credential.

The clean design is often separate app registrations:

- the public front end uses delegated permissions, a public-client platform, and a public-client flow;
- the backend or daemon uses its own app registration, confidential credentials, and only the application or delegated permissions it needs;
- the API exposes scopes or app roles and validates tokens for its own audience.

One registration can technically support more than one platform, but separate registrations make ownership, redirect URIs, permissions, credential exposure, audit evidence, and incident containment easier to reason about. That is an architectural recommendation, not a Microsoft requirement for every application.

## Do not use the tempting shortcuts

Avoid these repairs:

- **Do not add another secret.** The error says a credential is already arriving on a public-classified request.
- **Do not set Allow public client flows to No without proving the intended flow.** That can break device code, ROPC, or integrated Windows authentication paths that legitimately depend on the fallback.
- **Do not set it to Yes to make a server-side app easier to test.** Microsoft says the default should stay disabled unless the application is actually built for a documented public-client feature.
- **Do not move a secret into a public package.** Obfuscation is not client authentication.
- **Do not change both code and registration at once.** You lose the evidence of which boundary was wrong.
- **Do not rotate every credential before inventorying dependencies.** A rushed deletion can turn one broken flow into a broad outage.
- **Do not change permissions or consent.** The failure is client authentication, not resource authorization.
- **Do not weaken Conditional Access.** A client-type mismatch is evaluated at a different control boundary.

The neighboring errors help keep the diagnosis narrow. [AADSTS7000215 means the supplied client secret is wrong](/posts/aadsts7000215-invalid-client-secret-microsoft-entra). [AADSTS700027 means a client assertion failed signature validation](/posts/aadsts700027-invalid-client-assertion-microsoft-entra). If the error changes after your repair, stop troubleshooting `700025` and follow the new evidence.

## Validate the fix in a controlled release

Use a canary instance, test device, or narrow release ring that follows the same deployment path as production.

For a public-client repair:

1. confirm the outgoing token request no longer contains `client_secret` or `client_assertion`;
2. confirm the correct SPA or native redirect URI and public-client library path;
3. complete the interactive, device-code, or other intended public flow;
4. inspect the returned token only with an approved claims viewer and never write the raw token to a ticket;
5. prove one intended API operation with the least-privileged delegated permission.

For a confidential-client repair:

1. confirm the deployed process uses the intended client ID, tenant, authority, grant type, and server-side credential source;
2. confirm the redirect URI is registered as **Web** when the server-side authorization-code flow uses one;
3. confirm the credential remains outside the browser or distributed package;
4. acquire a token through the supported confidential-client library;
5. prove one intended resource operation and inspect the token audience and permission claim shape.

Then expand only after the canary succeeds. If the old credential was exposed publicly, replacement and removal require a separately reviewed sequence: identify every legitimate consumer, register the replacement where needed, deploy and validate each confidential consumer, then remove the exposed value and monitor for rejected reuse.

## Find the right sign-in evidence

Microsoft Entra exposes different sign-in-log categories:

- **Interactive user sign-ins** when a user provides an authentication factor;
- **Non-interactive user sign-ins** when a client acts on behalf of a user without a fresh interaction;
- **Service principal sign-ins** when an application authenticates as itself;
- **Managed identity sign-ins** when an Azure resource uses its managed identity.

The portal path is **Entra ID > Monitoring & health > Sign-in logs**. Filter around the UTC failure time and application ID, then preserve the error code, failure reason, correlation ID, client app, resource, tenant, IP, and Conditional Access result where present. Microsoft lists Reports Reader as the least-privileged role for user sign-in logs and documents application-only activity under the service-principal category. ([Troubleshoot sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors), [sign-in log categories](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-customize-filter-logs))

Absence from the interactive log does not prove Entra never received the request. A daemon belongs under service-principal sign-ins; a silent delegated request can appear under non-interactive user sign-ins. Also correlate application telemetry by the same UTC time and correlation ID.

For Microsoft support, prepare a sanitized package with:

- tenant ID, client ID, and affected deployment;
- UTC timestamps, trace IDs, request IDs, and correlation IDs;
- full sanitized error text;
- token endpoint, grant type, redirect URI, and library/version;
- application-object export showing platform collections and `isFallbackPublicClient`;
- whether a credential field was present, without its value;
- last successful time, first failing release, and reproduction scope;
- relevant sign-in and application logs;
- each configuration change and its observed result.

## AADSTS700025 administrator checklist

- [ ] Capture the complete sanitized error and correlation evidence.
- [ ] Identify the actual client ID, tenant, endpoint, grant type, and redirect URI.
- [ ] Prove whether the runtime is public or confidential.
- [ ] Inventory Web, SPA, mobile/desktop, and fallback public-client settings.
- [ ] Confirm which code path added `client_secret` or `client_assertion`.
- [ ] Remove application credentials from legitimate public clients.
- [ ] Correct platform registration and library type for legitimate confidential clients.
- [ ] Keep browser, mobile, and desktop packages free of reusable application credentials.
- [ ] Retest in a narrow ring and prove a real resource operation.
- [ ] Correlate the correct user or workload sign-in log.
- [ ] If a credential was distributed publicly, inventory dependencies and complete the approved replacement process.
- [ ] Stop when the error changes and investigate the new control boundary.

## FAQ

### Should I disable Allow public client flows to fix AADSTS700025?

Only after proving that the failing workload is confidential and no legitimate no-redirect public-client flow depends on the fallback. Microsoft says public-client flow is disabled by default and should be enabled only for documented public-client scenarios. The redirect URI's platform can still classify requests that include a redirect URI.

### Can a mobile or desktop app safely use a client secret?

No reusable application secret is confidential once it is shipped to an end-user device. Use a supported public-client flow. If a backend needs to authenticate as the application, keep that credential on the backend and give the backend its own coherent confidential-client boundary.

### Why does the app registration contain a secret if Entra says the client is public?

Credential presence and request classification are different facts. The same registration can contain public and confidential platform settings, or the secret can be stale and unused. Entra evaluates the actual request, including its redirect platform or fallback public-client setting.

### What is the difference between AADSTS700025 and AADSTS7000218?

`AADSTS700025` means a public-classified request improperly presented a secret or assertion. `AADSTS7000218` means a confidential-classified request failed to present the credential Entra expected. They are opposite client-type mismatches.

### Will rotating the secret fix AADSTS700025?

No. A new secret is still a credential on a request Entra considers public. First align the runtime, registration, flow, and library. Rotate only as part of exposure response or normal credential lifecycle after you know which confidential consumers depend on the value.

The useful version of this incident is pleasantly mechanical: preserve the request, prove the runtime boundary, prove Entra's classification signal, and change only the side that is wrong. `AADSTS700025` is not asking for a better secret. It is asking you to make the client type and the credential behavior agree.
