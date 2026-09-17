---
title: "Microsoft Entra External ID JIT Password Migration"
excerpt: "Deploy Microsoft Entra External ID JIT password migration safely with encrypted validation, rollout gates, monitoring, troubleshooting, and a clean cutover."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-17T09:13:08-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra External ID JIT password migration lets a customer keep the password they already know while an application moves to External ID. The first time a flagged customer signs in, External ID sends an encrypted password context to your customer-hosted validation API. If the legacy identity provider accepts the credential, External ID stores the password and marks that customer as migrated. Later sign-ins are validated by External ID rather than the legacy system.

That is the clean path. The operational catch is that your API becomes part of the sign-in path for every not-yet-migrated pilot user, and Microsoft currently labels the feature **Preview**. Build this as a short migration bridge with measurable exit criteria—not as a permanent password-validation dependency.

Grab a coffee before opening Graph Explorer. The difficult work is not creating the listener. It is proving that the right account was pre-created, the right app invokes the listener, the encrypted payload can be processed inside a two-second service limit, the legacy system returns an unambiguous decision, weak-password behavior is understood, and customers who never return still have a final migration path.

## Microsoft Entra External ID JIT password migration: the boundaries

Microsoft's [JIT password migration implementation guide](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-passwords-just-in-time) applies to **external tenants**. It does not describe workforce-tenant password hash synchronization, pass-through authentication, or an ongoing federation model.

The current service boundaries are precise:

- Microsoft lists JIT password migration as **Preview** in its [External ID documentation updates](https://learn.microsoft.com/en-us/entra/external-id/whats-new-docs). Microsoft has not published a GA date, mandatory enforcement date, automatic tenant rollout, or default-on behavior.
- Customer accounts must already exist in the destination external tenant. JIT migrates the password during sign-in; it does not create the user or reconcile the profile.
- The legacy provider validates the password only for the migration event. After a successful migration, External ID stores and validates the password directly.
- The documented configuration currently creates the custom extension and event listener through Microsoft Graph `/beta` endpoints. Preview API contracts can change and should be pinned to a tested deployment runbook.
- The listener can be scoped to specific client applications. Do not begin with all applications.

Microsoft's [credential-migration overview](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-users) also separates three choices that are easy to blur together:

1. **Do not preserve passwords.** Pre-create the accounts and have customers reset their password, or use a passwordless or social identity provider.
2. **Use External ID-initiated JIT migration.** Move the application to External ID first; validate and migrate a flagged customer's password at their next sign-in.
3. **Use legacy-provider-initiated credential harvesting.** Keep applications on the old provider while its policy or code validates and writes credentials into External ID, then cut the applications over later.

JIT is attractive when password preservation matters and the application can move before every customer has returned. It is a poor fit when the legacy provider cannot offer a fast, reliable credential-validation interface, when a long coexistence window would be unavoidable, or when the organization cannot safely process a password inside customer-owned code.

## How the OnPasswordSubmit control plane works

The flow has five control points:

1. **The destination account exists.** A bulk migration creates the External ID user with a unique strong random password and a Boolean migration property set to `true`.
2. **The listener matches.** An `onPasswordSubmitListener` evaluates the client application and the user's migration property.
3. **External ID encrypts the submitted credential.** The password, sign-in identifier, and nonce are carried in `encryptedPasswordContext` as an RSA-encrypted JWE. The public certificate is attached to the extension application; your private key stays in Azure Key Vault.
4. **Your HTTPS endpoint decides.** The customer-hosted function decrypts the context, validates the password against the legacy provider, and returns one documented action plus the original nonce.
5. **External ID completes or stops the migration.** A successful migration stores the password and clears the migration state. Future sign-ins bypass the extension.

The four response actions are not interchangeable:

- `MigratePassword` says the legacy credential is valid and External ID can continue. A password that fails External ID strength rules can still be routed into an update flow.
- `UpdatePassword` says the credential is valid but the user must replace it.
- `Retry` says the submitted credential is incorrect and another attempt may be allowed.
- `Block` ends the attempt, such as when the legacy account is locked.

The nonce matters. Microsoft includes it inside the encrypted context and expects the same value in the extension response. Treat a missing or mismatched nonce as a failed transaction, not something to patch over for availability.

Microsoft Graph now documents the [`onPasswordSubmitCustomExtension`](https://learn.microsoft.com/en-us/graph/api/resources/onpasswordsubmitcustomextension?view=graph-rest-1.0) and [`onPasswordSubmitListener`](https://learn.microsoft.com/en-us/graph/api/resources/onpasswordsubmitlistener?view=graph-rest-1.0) resource types in v1.0, while the implementation guide still uses beta collection endpoints to create the configuration. That is a reason to follow the current scenario guide exactly and revalidate it before each production change—not a reason to silently translate the examples to v1.0.

## Prerequisites, roles, and billing

The Microsoft procedure requires an active external tenant, access to the legacy credential validator, an application development environment, and knowledge of app registrations, Graph, directory extensions, Azure Functions, and Key Vault. It lists these Entra roles:

- **Application Administrator**;
- **User Administrator**; and
- **Authentication Extensibility Password Administrator**.

Separate the duties where practical. The operator who bulk-creates users does not need permanent control of the function, certificate, listener, and client application. Place production components in the secure identity subscription Microsoft recommends and use time-bound administrative access where your operating model supports it.

External ID billing is based on monthly active users, and the external tenant must be linked to an Azure subscription for billing. Microsoft's [current External ID pricing and billing overview](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing) does not list a separate JIT-migration add-on. The Azure Function, Key Vault, Azure Monitor, Log Analytics, networking, and any legacy-provider capacity remain separately operated and costed Azure or third-party resources. Validate those costs against the actual pilot load rather than assuming the External ID MAU meter covers the migration service.

## Design the migration contract before deploying code

Write one migration contract that both identity teams and application owners approve. At minimum, record:

- the stable legacy identifier and its matching External ID sign-in identifier;
- duplicate, missing, disabled, locked, expired, and merged-account behavior;
- the exact meaning of `MigratePassword`, `UpdatePassword`, `Retry`, and `Block` in the legacy system;
- the migration-property name, application object that defines it, and expected `true`/`false` lifecycle;
- included client application IDs;
- certificate owner, expiry, renewal, and emergency-rotation process;
- function endpoint, identity, Key Vault access, downstream dependencies, and data residency;
- prohibited log fields, including passwords, decrypted payloads, bearer tokens, and full request bodies;
- latency, failure-rate, throttling, and rollback thresholds; and
- the deadline and method for customers who never sign in during coexistence.

> [!IMPORTANT]
> **Analysis:** the legacy account key is the highest-risk design decision. Email addresses change, aliases can be recycled, and two old directories can contain the same address. Resolve the destination account before password validation, keep the mapping deterministic, and stop on ambiguity. A valid password against the wrong legacy record is an account-takeover path.

The site's [authentication protocol guide](/posts/microsoft-authentication-protocols-and-sign-in-models-kerberos-saml-oidc-oauth-adfs-entra) is useful when application owners need to separate this one-time credential bridge from the OAuth or OpenID Connect flow that follows it.

## Build the destination population first

Microsoft requires bulk account creation before JIT can work. Clean the source directory, reconcile duplicate identities, choose the attributes that genuinely belong in External ID, and exclude stale accounts instead of migrating them by default.

Create a Boolean directory extension such as `toBeMigrated`, then pre-create each in-scope consumer with:

- the intended local-account sign-in identifier;
- a unique, strong random temporary password;
- the migration property set to `true`; and
- only the profile and consent data approved for the destination.

The current guide constructs the extension property ID from the `b2c-extensions-app` application ID and the property name. Treat that generated ID as configuration data. A listener pointed at a look-alike property will never see the intended population.

Reconcile counts before enabling a listener:

- source accounts approved for migration;
- destination accounts successfully created;
- destination accounts flagged `true`;
- duplicate or rejected records;
- accounts using social or federated sign-in that do not need password migration; and
- accounts assigned to each pilot application.

Do not use successful bulk creation as proof that sign-in identifiers match. Test the exact identifier a customer will enter.

## Secure the function and encryption path

Microsoft's reference design generates an RSA certificate in Key Vault, gives the Function App's managed identity access to retrieve it, attaches the public key to the extension application, and uses the private key to decrypt the JWE inside the function. The `keyId` and `tokenEncryptionKeyId` must identify the same configured key.

The endpoint must be a customer-managed HTTPS API, typically an Azure Function. It must not be Microsoft Graph, an Entra service URL, or the legacy provider's interactive sign-in page. The extension app needs the [CustomAuthenticationExtension.Receive.Payload permission](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-passwords-just-in-time#312-api-permissions) with admin consent, and its identifier URI uses the documented `api://{function-hostname}/{app-id}` form.

Use the reference sample as a protocol illustration, not an untouched production control. Add your organization's required token validation, dependency timeouts, replay handling, certificate lifecycle, secret scanning, safe logging, release pipeline, and operational ownership. Never log `encryptedPasswordContext` or any decrypted password, even at debug level.

The listener should begin with one non-production client application and a tiny set of synthetic or dedicated test identities. Microsoft documents application conditions in the listener; use them as the first blast-radius boundary.

## Engineer for the two-second timeout

Microsoft's [External ID service limits](https://learn.microsoft.com/en-us/entra/external-id/customers/reference-service-limits) currently allow:

- a maximum **2,000 ms** custom-extension timeout;
- **one** maximum retry; and
- **50 custom-extension requests per second** combined across all extensions in the tenant.

Those are service ceilings, not a performance target. A cold function, a new token acquisition, a slow Key Vault read, and a cross-region legacy call can consume the budget before password validation finishes.

Microsoft's [custom-extension troubleshooting guidance](https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-troubleshoot) recommends caching downstream access tokens, timing downstream calls, using a hosting plan that keeps the function warm, and running automated integration and performance tests. Build load tests around the expected first-sign-in wave, then leave headroom for retries and other custom extensions in the tenant.

> [!NOTE]
> **Analysis:** release rings should be sized by tested extension throughput and legacy-provider capacity, not by the number of users an application owner wants to announce. A marketing email can turn dormant accounts into a synchronized first-sign-in spike.

## Decide how to handle legacy password complexity

By default, a legacy password that is valid but weaker than External ID's strong-password rules goes through `UpdatePassword`. Microsoft also documents a `disableStrongPassword` option for JIT migration:

- it avoids a reset solely because the migrated password misses the standard complexity rules;
- it still enforces a minimum length of eight characters;
- expired passwords still require an update; and
- it affects JIT migration, not already migrated users or newly created External ID accounts.

This option trades cutover friction for a period in which External ID can store a migrated password below its normal complexity standard. If the legacy policy is equivalent or stronger, leave the option disabled. If it is enabled, document the exception, time-box coexistence, and schedule a final rotation or forced-reset campaign.

Test browser and native-auth flows separately. Microsoft documents a known native-auth issue in which a correct but weak legacy password can return an error instead of redirecting to password reset. Do not infer browser behavior from a successful mobile test or vice versa.

## Run a staged Microsoft Entra External ID JIT migration

### Ring 0: prove failure safely

Use dedicated accounts to exercise every action: valid password, wrong password, locked account, expired or weak password, missing migration flag, already migrated account, duplicate identifier, unavailable legacy provider, invalid response, timeout, and throttling.

Confirm that a successful account changes from `true` to `false` and that its second sign-in does not call the legacy validator. Confirm that failures do not clear the flag or create a usable destination credential.

### Ring 1: one low-risk application

Include only one client app in the listener. Use a small customer or employee-test population, keep the legacy application path available, and monitor every migration transaction. Hold the ring long enough to observe cold starts, certificate access, peak latency, wrong-password retries, password resets, and support tickets.

### Ring 2: representative customers and clients

Add browser, mobile, localization, accessibility, and password-age cohorts. Include customers with dormant accounts and known source-directory edge cases. Increase volume only when latency and error budgets remain below the agreed thresholds.

### Ring 3: controlled production waves

Expand by application and population. Reconcile the migration flag after every wave, investigate every unexplained transition, and keep a count of flagged users who have not returned.

### Exit: close coexistence

JIT cannot migrate a customer who never signs in. Microsoft's [B2C-to-External-ID migration guidance](https://learn.microsoft.com/en-us/entra/external-id/customers/migrate-from-b2c-to-external-id) recommends a time-boxed coexistence period plus a final reset or migration plan for the remaining population. Complete that tail, remove the listener from production apps, retire the endpoint and certificate through change control, and only then decommission the legacy credential validator.

Application cutover also changes token issuance and session behavior. Review the site's [access-token and refresh-token guide](/posts/access-token-vs-refresh-token-in-microsoft-identity) when defining session invalidation, support testing, and the point at which an application is genuinely operating only on External ID.

## Monitor the migration with two evidence planes

Use both sides of the transaction.

**Microsoft Entra evidence:** open **Entra ID > Enterprise apps > Sign-in logs**, select the event, and inspect the **Authentication Events** tab. Microsoft documents the extension's HTTP status, error code, execution duration, and retry count there.

**Customer endpoint evidence:** use Function and legacy-provider telemetry to record a pseudonymous transaction key, correlation ID, decision, dependency duration, response action, and safe failure class. Do not record the password, encrypted context, token, or full authentication payload.

For retention, alerting, and cross-system queries, Microsoft's [Azure Monitor setup for external tenants](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-azure-monitor) routes logs to Log Analytics, Storage, or Event Hubs through a workforce-tenant Azure subscription. The site's [User Insights retirement migration guide](/posts/microsoft-entra-user-insights-retirement) explains why supported activity logs—not the retired External ID dashboard—should be the base of new operational reporting.

Track at least:

- migration attempts, successes, retries, updates, and blocks;
- `true` and `false` migration-property counts;
- unmigrated accounts with no recent sign-in;
- extension latency percentiles and timeout count;
- legacy-provider latency and availability;
- error codes by client application and release ring;
- weak-password and expired-password outcomes;
- password reset and support volume; and
- certificate expiry and function deployment health.

## Troubleshoot by the first broken boundary

### The function is never called

Confirm the customer account exists, its migration property is `true`, the entered identifier resolves to that account, and the client application's app ID is included in the listener. Then verify the listener points to the intended migration-property ID and custom-extension object.

### Error 1003014, 1003015, or 1003020

These are configuration-shape failures. Microsoft maps them to an invalid identifier URI, a function-domain mismatch between `targetUrl` and `resourceId`, or an invalid target URL. Use HTTPS and the documented identifier-URI format; compare exact hostnames rather than display names.

### Error 1003021

The extension service principal is missing admin consent for the [CustomAuthenticationExtension.Receive.Payload permission](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-passwords-just-in-time#312-api-permissions). Confirm it on the correct application and service principal in the external tenant.

### Error 1003003, 1003006, 1003009, 1003010, or 1003012

External ID reached the endpoint but rejected the response body, content type, action count, or action type. Return `application/json`, one supported action, the documented response schema, and the original nonce.

### Error 1003005 or 1003027

The call timed out or External ID could not connect. Correlate the Entra duration and retry count with Function cold-start, Key Vault, token acquisition, DNS, TLS, firewall, and legacy-provider timings. Optimize the slow boundary; increasing a client-side wait cannot change External ID's service timeout.

### Error 1003004

The tenant hit custom-extension throttling. Stop expanding the ring, inspect combined extension traffic, and reduce concurrency. The published limit is tenant-wide across all custom authentication extensions.

### The first sign-in works, but later sign-ins still call the legacy provider

Check whether the same destination user is resolving and whether the migration property actually changed to `false`. A successful HTTP response is not enough; prove the state transition and the second-sign-in behavior.

## Rollback and mitigation are not the same thing

**Analysis:** before any password has migrated, removing the pilot app from the listener or routing users back to the legacy application is a straightforward containment action.

After migration, the state is asymmetric. External ID now holds a password and the legacy system may later receive a different password change. Simply sending the customer back can create two valid-but-divergent credentials. Do not bulk-toggle migration flags back to `true` as an outage workaround.

Use this sequence when a wave fails:

1. stop adding applications and users;
2. keep already migrated users on the proven External ID path where possible;
3. preserve the legacy path for accounts that remain flagged;
4. correct the endpoint, mapping, permission, certificate, capacity, or response issue in the pilot scope;
5. retest every response action and the second-sign-in bypass; and
6. resume only after reconciling account state in both systems.

> [!IMPORTANT]
> **Analysis:** the rollback unit is an account state plus an application route, not only a Graph configuration object. Your change plan must say what happens to migrated, unmigrated, and partially failed users separately.

## Administrator checklist

- [ ] Confirm the tenant is an External ID external tenant and record Preview acceptance.
- [ ] Choose JIT only after comparing reset, social/passwordless, and legacy-initiated options.
- [ ] Approve a deterministic legacy-to-destination account-matching contract.
- [ ] Clean and pre-create the destination population with unique random passwords.
- [ ] Create and verify the Boolean migration property for every in-scope account.
- [ ] Separate application, user, extension, function, Key Vault, and monitoring duties.
- [ ] Store the private key in Key Vault and document certificate rotation.
- [ ] Grant only the documented payload-receive permission to the extension app.
- [ ] Scope the listener to one test application first.
- [ ] Prevent credentials, encrypted contexts, tokens, and full payloads from entering logs.
- [ ] Test all four response actions, weak and expired passwords, timeouts, and throttling.
- [ ] Prove the first-sign-in state change and second-sign-in legacy bypass.
- [ ] Monitor Entra Authentication Events and customer-hosted dependency telemetry.
- [ ] Define hold, containment, and reconciliation thresholds before production.
- [ ] Plan the non-returning-user tail and a dated end to coexistence.
- [ ] Remove the listener and retire migration infrastructure only after reconciliation.

## References

- [Just-in-time password migration to Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-passwords-just-in-time)
- [Migrate users and credentials to Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-migrate-users)
- [Migrate from Azure AD B2C to External ID](https://learn.microsoft.com/en-us/entra/external-id/customers/migrate-from-b2c-to-external-id)
- [Microsoft Entra External ID service limits](https://learn.microsoft.com/en-us/entra/external-id/customers/reference-service-limits)
- [Troubleshoot a custom authentication extension](https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-troubleshoot)
- [Set up Azure Monitor in external tenants](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-azure-monitor)
- [Microsoft Entra External ID pricing and billing](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing)
- [External ID documentation updates](https://learn.microsoft.com/en-us/entra/external-id/whats-new-docs)
