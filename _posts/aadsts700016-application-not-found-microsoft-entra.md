---
title: "AADSTS700016 Application Not Found: Microsoft Entra Fix"
excerpt: "Fix AADSTS700016 application not found by checking the client ID, authority tenant, service principal, consent state, and deletion history in Microsoft Entra."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-25T09:33:32-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS700016 application not found** error means Microsoft Entra could not resolve the client application in the directory that received the authentication request. The dependable fix is to verify the **Application (client) ID and authority tenant as one pair**, then confirm that the required application object or service principal exists in that tenant. Rotating a secret, weakening Conditional Access, or inviting the user again does not repair a failed application lookup.

Grab a coffee and keep the complete error open. The application identifier, directory name, timestamp, request ID, and correlation ID tell you which object Entra tried to find and where it looked. Microsoft's error-code reference says AADSTS700016 can result from an incorrect application identifier, a request sent to the wrong tenant, or an application that has not been installed or consented in that tenant. ([Microsoft Entra authentication error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

This guide is for Entra administrators and application owners fixing **AADSTS700016 application not found** in interactive OAuth/OpenID Connect sign-in or a confidential-client token request. It separates the app registration from the enterprise application, because searching the wrong object type is how a five-minute configuration fix turns into an afternoon of credential rotation.

## AADSTS700016 application not found: the short answer

Work through these checks in order:

1. Copy the application identifier and directory from the actual failure. Do not use a display name or a value from an old runbook.
2. Confirm the application is sending its **Application (client) ID**, not an application object ID, service-principal object ID, secret ID, or App ID URI.
3. Resolve the configured authority and prove its `{tenant}` segment is the directory where this request is supposed to run.
4. In the home tenant, search **App registrations** by Application (client) ID and **Enterprise applications** by Application ID.
5. For a multitenant app in a customer tenant, confirm the local enterprise application (service principal) exists and that onboarding or consent was legitimately completed.
6. If the object was recently deleted, inspect deleted applications and service principals before creating anything new.
7. Reproduce with one known test path and correlate the new request ID and timestamp in the correct sign-in-log category.

That order matters. AADSTS700016 is an identity-object and routing problem. Establish the intended client ID, tenant, and local representation before changing authorization, credentials, or policy.

## Understand the three identifiers before changing anything

Microsoft Entra's application model has two directory objects and several IDs that operators routinely confuse.

- The **application object**, shown under **App registrations**, is the definition or blueprint. Its `appId` is displayed as the **Application (client) ID**.
- The **service principal**, shown under **Enterprise applications**, is the application's local representation in one tenant. It has its own object ID, while its `appId` normally matches the client ID of the application it represents.
- Every object also has a tenant-local **Object ID**. That value identifies the directory object for Microsoft Graph administration; it is not the OAuth `client_id`.
- An **App ID URI** identifies a resource/API, often in the form `api://<guid>` or another verified URI. It is not automatically the client ID for the calling application.

Microsoft describes the application object as the blueprint and the service principal as the concrete instance that defines what the app can do in a tenant. For a multitenant app, the application object remains in its publisher's home tenant while consent creates a service principal in each consuming tenant. ([Microsoft identity platform application model](https://learn.microsoft.com/en-us/entra/identity-platform/application-model), [service-principal architecture](https://learn.microsoft.com/en-us/entra/architecture/service-accounts-principal))

If a deployment variable named `CLIENT_ID` contains an Object ID copied from an overview page, Entra looks for an application whose client ID equals that unrelated GUID. The values look equally plausible in a ticket, but they have different meanings. Search and compare by the exact `appId` from the failed request.

## Step 1: preserve the failed request

Capture this evidence before anybody edits the registration:

- the full AADSTS700016 message, including the application identifier and directory name;
- timestamp with time zone, request ID, and correlation ID;
- the authority or token endpoint used by the application;
- whether the flow is interactive or app-only;
- the deployed environment, release, configuration source, and secret-store version;
- whether every tenant and user fails or only one customer tenant;
- the last known successful time and the most recent deployment or object-management change.

Do not copy access tokens, authorization codes, client secrets, certificates, cookies, or complete client assertions into an incident ticket. The identifiers and correlation data are enough for the first diagnostic pass.

Microsoft's sign-in diagnostic can work from a failed sign-in event or from its request/correlation details. Start with the exact event rather than a nearby failure for the same application name. ([Microsoft Entra sign-in diagnostics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics))

## Step 2: verify the client ID at runtime

Compare the identifier in the AADSTS700016 message with all four locations below:

1. the deployed application's effective configuration;
2. the intended app registration's **Application (client) ID**;
3. the local enterprise application's **Application ID**;
4. the value in the token or authorization request's `client_id` parameter.

Do not stop at a repository setting. Environment variables, deployment slots, Helm values, Key Vault references, CI/CD substitutions, and vendor consoles can override the source value. The runtime request is the truth Entra evaluated.

For Microsoft Graph PowerShell, this read-only inventory uses the application ID rather than the display name:

```powershell
$clientId = "00000000-0000-0000-0000-000000000000"

Connect-MgGraph -Scopes "Application.Read.All"

Get-MgApplication -Filter "appId eq '$clientId'" |
    Select-Object Id, AppId, DisplayName, SignInAudience, PublisherDomain

Get-MgServicePrincipal -Filter "appId eq '$clientId'" |
    Select-Object Id, AppId, DisplayName, ServicePrincipalType, AccountEnabled
```

`Id` in the output is the tenant-local Object ID; `AppId` is the Application (client) ID. Microsoft's Graph PowerShell reference documents the `appId` filter for application objects, and the service-principal API supports filtering its collection in the same way. ([Get-MgApplication](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/get-mgapplication), [list service principals](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0))

Interpret the result in context:

- **Application and service principal found:** the app is homed in this tenant; check runtime client ID and authority again.
- **Only a service principal found:** this can be the expected customer-tenant state for a multitenant app whose application object lives in the publisher tenant.
- **Neither found:** the client ID is wrong, the request reached the wrong tenant, onboarding never created the local representation, the object was deleted, or the application belongs to another cloud.
- **Only an application object found:** verify that its local service principal exists before assuming the registration is operational.

Do not create a new app registration just to make the search return something. A replacement has a new client ID and does not inherit the original permissions, assignments, policies, credentials, ownership, or publisher trust.

## Step 3: prove which tenant received the request

The directory named in the error is as important as the client ID. Inspect the authority configured in MSAL or the exact endpoint receiving the token request:

```text
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
```

For a tenant-specific authority, `{tenant}` can be a Directory (tenant) ID or a verified tenant domain. For supported multitenant experiences, Microsoft also defines `organizations` and `common`; `consumers` is for personal Microsoft accounts. The selected authority must agree with the app registration's supported account types and the application's intended audience. ([MSAL client application configuration](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-application-configuration), [OpenID Connect authority values](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#find-your-apps-openid-configuration-document-uri))

Common routing failures include:

- production using a development tenant ID from a copied configuration file;
- a customer-specific token request sent to the software vendor's home tenant—or the reverse;
- an app-only job using the tenant of the resource owner when its client service principal exists elsewhere;
- a multitenant interactive app changed to a tenant-specific authority without provisioning that customer tenant;
- a commercial-cloud registration used against a sovereign-cloud authority.

That last case is not a normal consent gap. Microsoft states that multitenant applications do not function across cloud boundaries because the service-principal authorities are separated. Do not try to solve a cloud-instance mismatch by repeatedly granting consent. ([Microsoft identity platform application model](https://learn.microsoft.com/en-us/entra/identity-platform/application-model#important))

For client credentials, Microsoft requires the tenant in the token endpoint and the application's client ID as separate values. Verify both; a correct secret attached to a correct app still fails when the request is addressed to a directory that cannot resolve that client. ([OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow#get-a-token))

## Step 4: decide whether a service principal should exist

The answer depends on the tenancy model.

### Single-tenant application

A single-tenant app is available only in its home tenant. Its registration should be in that tenant, and users or workloads should request tokens from that tenant-specific authority. Changing the registration to multitenant is an architectural and security decision, not an AADSTS700016 quick fix. Microsoft's tenancy guidance explicitly limits **Accounts in this directory only** apps to their home tenant. ([single- and multitenant applications](https://learn.microsoft.com/en-us/entra/identity-platform/single-and-multi-tenant-apps))

### Multitenant application in its home tenant

Verify the application object, home service principal, supported account types, and publisher configuration. If the runtime points at a customer tenant, move to the next case.

### Multitenant application in a customer tenant

The publisher's application object does not get copied into the customer directory. The customer tenant needs a local service principal. Microsoft documents that consent uses the home application object as a blueprint and creates the local service principal. ([application model and consent](https://learn.microsoft.com/en-us/entra/identity-platform/application-model#multitenant-apps))

If the service principal is absent, do not bypass the organization's app-governance process. Confirm the publisher, requested permissions, verified publisher state, owners, business purpose, and approved onboarding path. Then use the vendor's documented consent/onboarding flow or an administrator-approved service-principal creation procedure. Microsoft's cross-tenant procedure requires the multitenant application's client ID and an Application or Cloud Application Administrator role. ([create an enterprise application from a multitenant app](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant))

Consent is not a repair button. It creates an authorization relationship. Review exactly what will be granted, particularly application permissions that operate without a signed-in user.

## Step 5: check deletion and recovery evidence

If the application worked and then failed across every user or workload, check audit logs for application-management changes and inspect deleted objects before rebuilding.

Microsoft Entra retains soft-deleted enterprise applications for 30 days. The restore guidance lets administrators locate deleted service principals and filter them by the application's `appId`. ([restore a deleted enterprise application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application))

Treat the application object and service principal as separate recovery checks:

- In **App registrations > Deleted applications**, look for the deleted application object in its home tenant.
- Query deleted service principals for the same `appId` when the enterprise application is missing.
- Follow the recovery procedure for the interface you use and verify both active objects afterward.
- Revalidate permissions, assignments, credentials, owners, and policies; do not assume every relationship returned with the object.

This verification is important because Microsoft's Graph restore reference says restoring an application through that API does not automatically restore its service principal, while the portal-oriented enterprise-app recovery guide describes the paired recovery behavior for an app registration restored in the admin center. Use the documented path that matches your recovery operation, then prove the resulting state instead of relying on a general assumption. ([Microsoft Graph deleted-item restore](https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore?view=graph-rest-1.0), [enterprise-application restore guidance](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application))

If the recovery window has expired, rebuilding is a controlled application-onboarding project. Inventory dependencies first. A new registration means a new `appId`; every caller, redirect URI, API permission, credential, assignment, policy, and monitoring rule must be reviewed.

## Step 6: read the correct sign-in log

Choose the log based on the subject that requested the token:

- **Interactive user sign-ins** for a browser flow where a user actively authenticates.
- **Non-interactive user sign-ins** for background token activity performed on behalf of a user.
- **Service principal sign-ins** for app-only authentication using the application's credential.
- **Managed identity sign-ins** for Azure-managed identities.

Microsoft documents service-principal sign-ins as nonuser authentication by an app using a certificate or secret, and notes that equivalent events are grouped when service principal, status, IP address, and resource match. Expand grouped rows so you do not miss the timestamp you reproduced. ([service-principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins))

For the matching failure, preserve:

- application ID and displayed application name;
- service principal ID, if populated;
- resource ID and resource tenant ID;
- home tenant ID and sign-in tenant ID where present;
- error code and failure reason;
- request ID, correlation ID, IP address, client, and timestamp.

Absence from one log category is not proof that no request occurred. Confirm the flow type and tenant, then search the corresponding category. If the application failed before a local service principal could be resolved, some service-principal fields can be empty; Microsoft notes that an all-zero service principal ID means no client service principal existed for that authentication instance. ([Microsoft Entra monitoring FAQ](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reports-faq))

## Troubleshoot by the evidence pattern

- **Wrong runtime identifier:** the error shows a client ID that matches no deployment record. Trace the effective configuration and restore the approved client ID.
- **Wrong authority or environment:** the client ID exists, but only in a different tenant. Correct the tenant or authority after confirming the intended tenancy model.
- **Onboarding or consent incomplete:** the app exists in its publisher tenant, but no service principal exists in the customer tenant. Validate the publisher and permissions, then use the approved onboarding path.
- **Deletion or administrative change:** the app worked until an `ApplicationManagement` audit event. Inspect deleted objects and recover through the documented path.
- **Configuration drift:** only one deployment ring fails. Compare effective client ID, authority, cloud instance, and release values between rings.
- **Credential validation instead:** AADSTS7000215 or AADSTS7000222 appears. Diagnose the invalid or expired secret; do not classify it as AADSTS700016.
- **Callback validation instead:** AADSTS50011 appears. Follow the [AADSTS50011 reply URL mismatch guide](/posts/aadsts50011-reply-url-mismatch-microsoft-entra).
- **User or tenant resolution instead:** AADSTS50020 appears for an external user. Follow the [AADSTS50020 external-user diagnostic](/posts/microsoft-entra-aadsts50020-external-user-sign-in-failures).

The last three rows are useful guardrails. Similar-looking sign-in failures occur at different stages. If you want the protocol-level map behind those stages, read the [Microsoft Entra federation and token protocol guide](/posts/federation-and-token-protocols-explained-saml-ws-fed-oauth-openid-connect).

## Avoid the fixes that create a second incident

- **Do not rotate the secret first.** AADSTS700016 says the client could not be resolved in the target directory. Secret errors have their own codes, including AADSTS7000215 and AADSTS7000222 in Microsoft's error reference.
- **Do not disable Conditional Access.** The request has not reached the policy problem described by AADSTS53003.
- **Do not switch the app to multitenant casually.** That changes who can establish a tenant-local representation and requires a deliberate token-validation and consent design.
- **Do not grant tenant-wide admin consent until the publisher and permissions are approved.** Consent creates authorization; it is not merely object repair.
- **Do not create a look-alike registration with the same display name.** Display names are not the client identifier, and a new object does not preserve the old trust relationships.
- **Do not hard-delete the soft-deleted object.** Hard deletion removes the recovery path.
- **Do not conflate lookup with containment.** If the app may be compromised, use a containment plan such as the [service-principal token revocation and CAE guide](/posts/revoke-microsoft-entra-service-principal-tokens-cae); do not assume breaking object lookup is a clean kill switch.

## Validate the repair

Use a narrow test that exercises the original path:

1. Record the active app registration and service principal IDs, owners, enabled state, and tenant.
2. Confirm the deployed client ID and authority after the configuration change reaches the affected instance.
3. Repeat the same OAuth/OIDC flow with one test user or workload.
4. Capture the new request ID, correlation ID, and timestamp.
5. Confirm the matching sign-in event is in the intended tenant and log category.
6. Confirm AADSTS700016 is gone without introducing a consent, credential, redirect, assignment, or Conditional Access failure.
7. Validate the token only at the receiving API, including issuer, audience, signature, and lifetime; client applications should not treat token acquisition alone as proof of correct authorization.
8. Monitor the affected ring before broad rollout, then close the incident with the old and new configuration values recorded.

If the next error is different, that is progress only in a narrow sense: the request passed application lookup and reached a later control. Diagnose the new code on its own evidence. Do not keep making unrelated changes until a token appears.

## AADSTS700016 administrator checklist

- [ ] Capture the exact client ID, directory, request ID, correlation ID, and timestamp.
- [ ] Confirm the runtime sent the Application (client) ID, not an Object ID or App ID URI.
- [ ] Confirm the authority tenant and cloud instance.
- [ ] Search app registrations and enterprise applications by `appId`.
- [ ] Confirm the intended single-tenant or multitenant audience.
- [ ] For a customer tenant, verify the legitimate local service principal and consent path.
- [ ] Review application-management audit events and deleted objects.
- [ ] Use the sign-in-log category that matches the flow.
- [ ] Avoid credential rotation, policy bypass, or replacement registration without evidence.
- [ ] Reproduce narrowly and preserve the successful correlation data.

AADSTS700016 is one of the cleaner Entra errors once you respect the object model. The question is not simply “does an app with this name exist?” It is “did this request present the correct client ID to the tenant and cloud where the required application representation exists?” Answer that precisely, and the repair is usually small, reviewable, and safe.

## References

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Troubleshoot confidential client applications](https://learn.microsoft.com/en-us/entra/msal/dotnet/advanced/exceptions/confidential-client-troubleshoot)
- [Microsoft identity platform application model](https://learn.microsoft.com/en-us/entra/identity-platform/application-model)
- [Single- and multitenant applications](https://learn.microsoft.com/en-us/entra/identity-platform/single-and-multi-tenant-apps)
- [Create an enterprise application from a multitenant application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant)
- [Restore a soft-deleted enterprise application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application)
- [Microsoft Graph deleted-item restore](https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore?view=graph-rest-1.0)
- [Microsoft Entra service-principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins)
