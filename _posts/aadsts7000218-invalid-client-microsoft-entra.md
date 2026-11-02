---
title: "AADSTS7000218 Invalid Client Error: Microsoft Entra Fix"
excerpt: "Fix AADSTS7000218 invalid client errors by identifying the OAuth flow, classifying the app, supplying the right credential, and validating the repair."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-02T17:25:35-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS7000218 invalid client** error means Microsoft Entra expected the token request to authenticate a confidential client, but the request contained neither a `client_secret` nor a `client_assertion`. The safe fix is not automatically “create a secret.” First identify the OAuth flow, decide whether the software can keep a credential confidential, and then align the app registration, authentication library, and deployed configuration with that client type.

Grab a coffee before changing **Allow public client flows** or creating a credential. A server-side web app, daemon, browser-based single-page app, desktop client, and device-code client do not have the same trust boundary. Microsoft documents AADSTS7000218 as a missing-client-credential error for an application Entra is treating as confidential, while its client-type guidance defines public and confidential clients by whether they can securely prove their own identity. ([Microsoft's AADSTS7000218 troubleshooting article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/confidential-client-application-authentication-error-aadsts7000218), [public and confidential client applications](https://learn.microsoft.com/en-us/entra/msal/msal-client-applications))

This guide is based on current Microsoft documentation and does not claim a live tenant test. It is for Entra administrators, application owners, and platform teams who need to restore token acquisition without putting a secret in a browser, native app, ticket, log, or source repository.

## AADSTS7000218 invalid client: the short answer

Work the failure in this order:

1. Preserve the complete sanitized error, UTC timestamp, trace ID, correlation ID, tenant, Application (client) ID, token endpoint, grant type, redirect URI, and deployment environment. Never capture the credential value or complete assertion.
2. Identify the actual OAuth flow from the outgoing request and application code. Do not infer it from the app's display name.
3. Classify the runtime. A backend or daemon that can protect a credential is a confidential client. Code distributed to a browser, mobile device, or desktop is a public client and cannot safely hold a shared secret.
4. For a confidential client, repair the credential path so the supported library sends either a secret or an assertion in the token request.
5. For a legitimate public-client flow, correct the platform and flow configuration instead of adding a secret the runtime cannot protect.
6. Retest through the application's normal library and deployment path, correlate the new event in the correct sign-in-log category, and prove a real resource operation.
7. Review the app-registration and deployment audit trail. If a credential was added, confirm its owner, storage, lifetime, and rotation plan.

The key boundary is simple: **AADSTS7000218 means the credential was absent, not that Entra rejected its value.** If a secret is present but wrong, the nearby error is normally AADSTS7000215. If a signed assertion is present but fails validation, investigate AADSTS700027.

## Put the error at the right token boundary

A token request contains several different kinds of evidence. The `client_id` identifies the application. A user authorization code or device code represents a user-facing authorization step. A client secret or client assertion lets a confidential application authenticate itself to the token endpoint.

Microsoft's client-credentials documentation describes the clearest app-only case: a web service authenticates as itself with a secret, certificate assertion, or federated credential. The authorization-code flow has a second case: a server-side web application redeems a code and also authenticates as a confidential client. Public clients use flows and safeguards designed for software that cannot keep a credential secret. ([OAuth 2.0 client-credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow), [OAuth 2.0 authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow))

AADSTS7000218 occurs when Entra reaches the client-authentication step, expects confidential-client proof, and receives neither of the supported credential parameters. That separates it from several adjacent incidents:

- **AADSTS700016:** the client application cannot be found in the target directory. Use the [AADSTS700016 application-not-found guide](/posts/aadsts700016-application-not-found-microsoft-entra).
- **AADSTS7000215:** a client secret was presented but did not validate. Use the [AADSTS7000215 invalid-client-secret guide](/posts/aadsts7000215-invalid-client-secret-microsoft-entra).
- **AADSTS700027:** a signed client assertion was presented but failed certificate or signature validation. Use the [AADSTS700027 invalid-client-assertion guide](/posts/aadsts700027-invalid-client-assertion-microsoft-entra).
- **AADSTS7000218:** Entra expected a confidential-client credential, but neither `client_secret` nor `client_assertion` arrived.
- **A resource HTTP 401 or 403 after token issuance:** client authentication succeeded; troubleshoot the issued token and resource authorization instead.

Read the full error returned by the token endpoint or authentication library. A wrapper may reduce several different failures to `invalid_client`; the AADSTS code, timestamp, trace ID, and correlation ID preserve the useful boundary.

## Prove the OAuth flow before changing the registration

Start with the request that failed. Record parameter **names and nonsecret identifiers**, not sensitive values. The following fields normally reveal the flow:

- `grant_type=client_credentials` identifies an app-only confidential-client request.
- `grant_type=authorization_code` identifies code redemption; the runtime and registered platform determine whether the redeemer is public or confidential.
- a `device_code` grant identifies device-code redemption by a public client;
- a redirect URI and authorization code point to an interactive authorization-code path;
- `client_secret` identifies shared-secret authentication when the field is actually present;
- `client_assertion_type` plus `client_assertion` identifies assertion-based client authentication.

Inspect the effective request after framework configuration, secret-store resolution, environment-variable substitution, proxying, and deployment overrides. A configuration file can name a secret while the emitted form body still omits it because the process read the wrong environment, failed to resolve a vault reference, or instantiated a public-client builder.

Do not log the token body to prove this. Use the authentication library's sanitized diagnostics, a controlled debugger that redacts values, or application telemetry that records only field presence, identifiers, and correlation data.

> [!NOTE]
> **Analysis:** When every deployment begins failing after the same release, suspect a client-builder or configuration change. When only one region or slot fails, compare its effective credential reference, deployment version, and process reload state. When a desktop or CLI fails after a registration change, revisit the public/confidential classification before creating any credential.

## Decide whether the app is public or confidential

Microsoft defines the difference by credential custody, not by whether the application is “internal.” A confidential client runs where it can protect a secret or private key, such as a server-side web app, web API, daemon, or backend service. A public client runs in an environment where a user can inspect or extract its code and storage, such as a browser, desktop, or mobile device. ([MSAL client application types](https://learn.microsoft.com/en-us/entra/msal/msal-client-applications))

Use this decision path:

### Server-side web app or backend

Treat the token-redeeming component as confidential. It should authenticate with a supported server-held credential. If a frontend receives the authorization code but a backend redeems it, trace the exact component making the token call; that component owns the credential boundary.

### Daemon, scheduled job, or service-to-service workload

Treat it as confidential and use the client-credentials flow. Microsoft recommends a managed identity when the workload runs on a supported Azure service, workload identity federation for a trusted external platform, or a certificate before a client secret. ([application-registration security best practices](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration))

### Browser single-page application

Treat it as public. Do not place a client secret in JavaScript, bundled configuration, browser storage, or a build-time environment variable that is delivered to the browser. Use the supported authorization-code flow with PKCE and register the redirect URI under the **Single-page application** platform.

### Desktop, mobile, or command-line client

Treat it as public. Use the supported MSAL public-client implementation and the platform-appropriate interactive, broker, or device-code path. A secret shipped with the executable is not confidential, even if it is obfuscated.

### Split frontend and backend

Classify each component separately. The browser or native frontend is public; the backend can be confidential. Do not copy the backend credential into the frontend to make one registration appear simpler.

If the intended flow and runtime do not fit the existing registration, stop and design the correction. Turning a genuine web backend into a public client merely to suppress AADSTS7000218 removes client authentication from a component that can and should prove its identity.

## Fix a confidential client safely

For a confirmed confidential client, repair the deployed credential path rather than weakening the registration.

### 1. Resolve the exact application and tenant

Match the request's `client_id` to the **Application (client) ID** in **Entra ID > App registrations**. Match the authority tenant to the intended directory and environment. Then confirm the workload owner, target resource, sign-in audience, and service principal in the resource tenant.

Do not create a look-alike registration because the display name seems familiar. A new application has a different client ID, service principals, permissions, owners, assignments, policies, and audit history.

### 2. Find why the credential disappeared

Check the complete path from the app registration and credential metadata, through the secure store and deployment reference, into the process configuration, authentication library, and final token request.

Common causes include:

- the deployment never received the secret-store reference;
- the environment variable name differs by case or prefix;
- a vault reference points to another subscription, vault, secret name, or version;
- the process started before the setting changed and has not reloaded;
- a framework upgrade switched from a confidential-client builder to a public-client builder;
- a token request was rebuilt manually and omitted the client-authentication fields;
- a certificate or federated-credential callback returned no assertion; or
- one slot, region, namespace, or scheduled runner uses an older configuration source.

Inventory every deployment before adding a new credential. If a valid credential already exists and the failure is only a missing reference, restore the approved reference rather than multiplying credentials.

### 3. Choose the credential type deliberately

Microsoft's current guidance recommends, in order of fit, managed identity, workload identity federation, certificate credentials, and then client secrets. The **Certificates & secrets** page can add a certificate, federated identity credential, or secret to an app registration, but creation alone does not update the workload. ([add and manage app credentials](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials), [authorize applications and workloads](https://learn.microsoft.com/en-us/entra/architecture/authorize-applications-resources-workloads))

If a client secret is the only supported short-term repair:

1. add it to the verified existing application through the approved change process;
2. copy the **Value** once into the approved secure store, never into a ticket or source file;
3. update one canary deployment's reference;
4. retest token acquisition and a representative resource operation;
5. roll the reference through every dependency; and
6. remove obsolete credentials only after all consumers are proven.

Do not confuse the portal's Secret ID with the secret Value. The ID identifies credential metadata; it cannot authenticate the client.

### 4. Let a supported library build the request

Use MSAL, Microsoft.Identity.Web, Azure Identity, or another supported Microsoft library where possible. Configure the library as a confidential client and supply the chosen credential through its documented credential provider. This reduces the chance of omitting form fields, using the wrong assertion type, or leaking a value through custom request logging.

For direct protocol work, Microsoft's client-credentials and authorization-code references define the exact required parameters. A secret-based request sends `client_secret`. A certificate or federated path sends the fixed `client_assertion_type` plus `client_assertion`. Do not send both as a guessing strategy.

## Fix a legitimate public-client mismatch

If the software is truly a public client, do not add a secret. Align the app registration and library with the supported public-client flow.

1. Confirm that the runtime is browser, mobile, desktop, or another environment that cannot protect a credential.
2. Confirm the intended flow in current Microsoft documentation and the supported MSAL scenario for that platform.
3. Under **App registrations > the verified application > Authentication**, configure the correct platform and redirect URI.
4. Use a public-client application builder in the authentication library.
5. Enable **Allow public client flows** only when the selected documented flow requires it. Microsoft's dedicated AADSTS7000218 article identifies ROPC and device authorization as examples where that setting can be relevant; it also warns that changing client type has security implications.
6. Retest with the normal user interaction and Conditional Access policy still in place.

Do not use the toggle as a universal retry button. ROPC has significant limitations and is incompatible with MFA; prefer interactive authorization code with PKCE or device code when the scenario supports them. A server-side web application remains confidential even if it uses authorization code and PKCE. ([resource owner password credentials limitations](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth-ropc))

## Validate the repair with sign-in evidence

Microsoft Entra separates interactive user, non-interactive user, service principal, and managed-identity sign-ins. Choose the category that matches the flow instead of searching only the default interactive view. Service-principal sign-ins cover app-only requests where an application presents its own credential; user-delegated token activity can appear in the user sign-in views. ([Microsoft Entra sign-in log types](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins))

For the failed and successful attempts, preserve:

- UTC timestamp, error code, failure reason, trace ID, and correlation ID;
- application and service-principal IDs;
- tenant, resource, and resource-tenant IDs;
- sign-in category, client application, and source IP address;
- deployment instance, release, and sanitized credential type; and
- the outcome of a representative resource operation.

Microsoft's sign-in troubleshooting procedure recommends filtering failures, selecting the event, and preserving the correlation and sign-in details before remediation. Reports Reader is the documented least-privileged role for activity-log access, while licensing and retention determine how far back the evidence remains available. ([troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors), [access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs))

Then review **Audit logs** around the first failure and every repair. For a confidential client, confirm changes to credentials, application authentication settings, owners, and service principals. Microsoft treats credentials added to existing applications as high-value security events that should be monitored. ([security operations for applications](https://learn.microsoft.com/en-us/entra/architecture/security-operations-applications#application-credentials))

A successful token response is necessary but not sufficient. Run a bounded application-level operation against the intended resource to prove the token audience, permission, assignment, and runtime path.

## Do not fix the wrong control plane

These actions do not safely repair AADSTS7000218:

- **Do not paste a secret into a browser, desktop binary, mobile app, or public repository.** That changes a missing credential into a credential exposure.
- **Do not enable public-client flows for a backend or daemon.** The runtime can protect a credential and should remain confidential.
- **Do not create a new app registration by default.** It changes identity and authorization instead of repairing the existing request.
- **Do not grant broader API permissions or repeat admin consent.** A missing client credential fails before resource authorization can solve anything.
- **Do not disable Conditional Access.** Preserve policy while you fix the application authentication boundary.
- **Do not rotate a valid secret merely because it was absent from one deployment.** First repair the reference and process configuration.
- **Do not log the full token request, secret, private key, or assertion.** Preserve field presence and correlation evidence instead.
- **Do not switch to `/common` to escape a tenant mismatch.** Prove the intended authority and tenant.

If the repaired request now returns AADSTS7000215, the secret is present but does not validate; investigate value versus Secret ID, app ID, tenant, encoding, and secure-store version. If it returns AADSTS700027, the assertion is present but its key, claims, time window, or signature failed validation. Those new errors are evidence that the request moved to the next boundary.

## Prevent AADSTS7000218 from returning

Build one control around application classification and one around credential delivery.

For classification:

- document the OAuth flow, application components, and public or confidential status;
- keep browser and native components separate from credential-holding backends;
- register only platform types and redirect URIs the application actually uses;
- use the matching public- or confidential-client library builder; and
- threat-model any proposed change to public-client settings.

For credential delivery:

- assign a business owner and technical owner to every app registration;
- prefer managed or federated identity over stored credentials;
- record credential metadata and secure-store references without recording secret values;
- test configuration resolution and token acquisition in each deployment ring;
- monitor failed service-principal sign-ins by error code and application;
- alert before credential expiry and rehearse overlap rotation; and
- audit application and credential changes against approved change records.

The site's [workload identity federation guide](/posts/microsoft-entra-federated-identity-credentials-workload-identity) explains how supported external workloads can replace stored secrets with a federated trust. That is a better long-term fix than making a manual secret dependable forever.

## AADSTS7000218 admin checklist

- [ ] Preserve the full error, UTC time, trace ID, correlation ID, tenant, client ID, and endpoint.
- [ ] Prove the OAuth grant from the effective request.
- [ ] Classify the actual token-calling component as public or confidential.
- [ ] Match the client ID and authority to the intended app registration and tenant.
- [ ] For a confidential client, trace the credential from registration through secure store, deployment, library, and request.
- [ ] For a public client, configure the supported platform and flow without adding a secret.
- [ ] Keep Conditional Access, permissions, and tenant boundaries unchanged during diagnosis.
- [ ] Retest through the normal application path.
- [ ] Correlate the failure and success in the correct sign-in-log category.
- [ ] Confirm any credential or authentication-setting change in audit logs.
- [ ] Prove a real resource operation after token issuance.
- [ ] Record ownership, monitoring, rotation, and a migration path away from stored secrets.

## FAQ

### Does AADSTS7000218 mean the client secret is wrong?

No. It means the expected `client_secret` or `client_assertion` was missing from the request. A present but invalid secret is normally investigated as AADSTS7000215.

### Should I enable Allow public client flows?

Only when the application is genuinely a public client and the selected Microsoft-documented flow requires that setting. Do not enable it for a server-side web app, daemon, or backend simply to suppress the error.

### Can a single-page app use a client secret?

No secret delivered to browser code remains confidential. Use the supported SPA authorization-code flow with PKCE and the SPA platform registration. Put any credential-requiring operation behind a confidential backend.

### Can PKCE replace client authentication for a web backend?

No. PKCE protects authorization-code exchange from interception, but a confidential web application still authenticates itself when Microsoft requires client authentication. Use both controls where the documented flow calls for them.

### Why does one deployment work while another returns AADSTS7000218?

That pattern usually points to deployment drift: a missing secret-store reference, different environment-variable name, stale process, wrong client builder, or older release. Compare nonsecret effective configuration and the emitted parameter names across instances.

### Does the fix require a Microsoft Entra premium license?

The client-type and token-request repair is an application configuration issue, not a premium feature gate. Investigation depth, built-in log retention, risk features, and exporting capabilities can depend on tenant licensing and role. Check the current Microsoft activity-log documentation for the evidence you plan to use.

## The practical takeaway

AADSTS7000218 is a design clue, not just a missing form field. Microsoft Entra expected the application to prove its own identity, and the request did not contain that proof. The durable repair is to identify the real OAuth flow, classify the token-calling component correctly, and make the registration, library, credential store, and deployment agree.

For a confidential client, restore a supported server-held credential and validate the complete workload path. For a public client, use a supported public-client flow and never manufacture confidentiality by embedding a secret. Preserve the correlation evidence, keep security policy intact, and let the next error—if there is one—show which boundary to investigate next.
