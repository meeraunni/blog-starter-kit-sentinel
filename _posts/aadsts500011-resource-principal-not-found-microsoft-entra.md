---
title: "AADSTS500011 Resource Principal Not Found: Entra Fix"
excerpt: "Fix AADSTS500011 resource principal not found by validating the target API URI, tenant, local service principal, consent path, and sign-in evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-26T09:31:06-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS500011 resource principal not found** error means Microsoft Entra could not resolve the **target resource or API** in the tenant that handled the token request. The reliable fix is to validate the **requested resource identifier and tenant as one pair**, then confirm that the resource has the expected local service principal in that tenant. Rotating the client secret, changing the redirect URI, or disabling Conditional Access does not repair a resource lookup failure.

Grab a coffee and keep the complete failure open. Microsoft's error reference names AADSTS500011 `InvalidResourceServicePrincipalNotFound`: the resource may not be installed or consented in the tenant, or the request may have gone to the wrong tenant. Microsoft's dedicated troubleshooting article adds two practical causes: an incorrect resource URL and a resource application that was never provisioned locally. ([authentication error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [AADSTS500011 troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts500011-resource-principal-not-found))

This guide is for Entra administrators, application owners, and API owners troubleshooting delegated or app-only token requests. It is intentionally separate from the site's [AADSTS700016 application-not-found guide](/posts/aadsts700016-application-not-found-microsoft-entra): 700016 is about resolving the **client application**, while 500011 is about resolving the **resource the client wants to call**.

## AADSTS500011 resource principal not found: the short answer

Work through these checks in order:

1. Copy the resource value and tenant from the exact AADSTS500011 response. Preserve the timestamp, request ID, and correlation ID.
2. Identify whether the request used the v1 `resource` parameter or the v2 `scope` parameter.
3. For a v2 request, remove the permission suffix only for comparison: `api://<app-id>/.default` targets the resource identified by `api://<app-id>`.
4. Verify that the resource identifier exactly matches the API's configured **Application ID URI** or another valid `servicePrincipalNames` value.
5. Confirm that the authority points to the tenant where the resource service principal is supposed to exist.
6. Locate the resource service principal in that tenant by immutable identifier, not display name.
7. If it is absent, prove whether the API is single-tenant, multitenant, deleted, or never onboarded before creating or consenting to anything.
8. Retest the same flow and confirm a new sign-in event resolves the intended resource service principal.

The order matters. A correct client ID and credential cannot compensate for a nonexistent target resource. Likewise, a legitimate resource in tenant A is not automatically addressable through tenant B.

## Separate the client from the resource

An OAuth token request has at least two application identities worth naming:

- The **client application** asks for the token. Its Application (client) ID is sent as `client_id`.
- The **resource application or API** is the intended audience of the access token. It is identified by the v1 `resource` value or by the resource portion of a v2 `scope` value.

Each application registration is a blueprint. A **service principal** is its local representation in a tenant. Microsoft documents that a multitenant application or API needs a service principal in every tenant where it is used; consent is one supported way that local representation is created. ([Microsoft identity platform application model](https://learn.microsoft.com/en-us/entra/identity-platform/application-model), [application and service principal objects](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals))

That produces two different missing-object branches:

- **AADSTS700016:** Entra cannot resolve the client application in the tenant receiving the request.
- **AADSTS500011:** Entra cannot resolve the requested resource principal in the tenant receiving the request.

Do not let a shared display name blur that boundary. Client and resource can be separate registrations, with separate owners, home tenants, service principals, permissions, and deployment histories.

## Preserve the failed request before changing anything

Capture a small, sanitized evidence bundle:

- the full AADSTS500011 description, including the resource name and tenant;
- UTC timestamp, request ID, correlation ID, and trace ID when present;
- authorization or token endpoint, including the authority tenant;
- effective `client_id` and requested `resource` or `scope` value;
- interactive user, non-interactive user, service principal, or managed identity flow;
- affected environment, deployment ring, and configuration version;
- last known successful time for the same client-resource-tenant combination; and
- recent API registration, consent, tenant-routing, or deployment changes.

Do not put access tokens, authorization codes, client secrets, certificate private keys, cookies, or complete client assertions in the incident record. Identifiers and correlation data are enough to establish the lookup boundary.

Microsoft describes a sign-in as **who** accessed, **how** the client attempted access, and **what** resource was targeted. The sign-in record can expose the resource ID, resource tenant ID, and resource service-principal ID alongside the request and correlation identifiers. ([sign-in activity detail reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

## Decode the resource value exactly

The token endpoint version changes the shape of the request, not the need for a valid resource.

### v1 endpoint: inspect `resource`

A v1 token request identifies one target through `resource={resource-identifier}`. The value should match a resource identifier that Entra can resolve for the API in the selected tenant.

### v2 endpoint: inspect `scope`

A v2 request uses `scope`. For a custom delegated permission, a scope might look like:

```text
api://11111111-2222-3333-4444-555555555555/Orders.Read
```

For client credentials, Microsoft requires the resource identifier followed by `/.default`:

```text
api://11111111-2222-3333-4444-555555555555/.default
```

Microsoft's scope reference says `scope={resource-identifier}/.default` is functionally equivalent to the v1 `resource={resource-identifier}` form. The client-credentials reference also requires `/.default` for the resource whose configured application permissions should be issued. ([scopes and permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc#the-default-scope), [client credentials token request](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow#get-a-token))

Compare exact strings. Typical failures include:

- a typo, wrong scheme, obsolete hostname, or missing path segment in the App ID URI;
- a resource identifier copied from development into production;
- a client application ID, object ID, or service-principal object ID used where an App ID URI belongs;
- `/.default` appended to the wrong identifier;
- a request for a scope exposed by another API registration;
- a tenant-specific API identifier paired with another tenant's authority; or
- an old identifier left in deployed configuration after the API registration changed.

The **Expose an API** experience calls the resource identifier the **Application ID URI**. Microsoft documents that it prefixes the API's scopes and that the corresponding identifiers are copied to the service principal's `servicePrincipalNames` collection. ([expose a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis), [servicePrincipal resource](https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal?view=graph-rest-1.0))

Do not “normalize” a URI by instinct. A trailing slash can be significant, and Microsoft's `.default` guidance documents cases where a resource identifier ending in `/` produces a double slash before `.default`. Compare the deployed request with the registered value and the API owner's documentation.

## Prove which tenant handled the request

Inspect the authority or token endpoint that received the failing request:

```text
https://login.microsoftonline.com/{tenant}/oauth2/token
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
```

For a tenant-specific flow, `{tenant}` should be the Directory (tenant) ID or verified domain for the directory where the client is expected to obtain access to that resource. `common` and `organizations` are discovery authorities for supported multitenant scenarios; they do not make a single-tenant API multitenant and do not create a missing resource principal by themselves.

Use the tenant named in the AADSTS500011 message as the first diagnostic truth. Then compare it with:

- the tenant configured at runtime;
- the API registration's home tenant;
- the expected resource tenant for this business transaction;
- the client service principal's tenant; and
- the `ResourceTenantId` or resource-owner fields in matching sign-in evidence when populated.

Microsoft warns that multitenant apps do not operate across Microsoft cloud boundaries because service-principal authorities are separated. A commercial-cloud resource registration cannot be made reachable through a US Government or China authority by granting consent again. ([application model cloud boundary](https://learn.microsoft.com/en-us/entra/identity-platform/application-model#important))

## Locate the resource service principal

In the tenant named by the failure, open **Entra ID > Enterprise applications > All applications**. Search with an immutable identifier and include all relevant application types and statuses. Do not conclude the object is absent because a display-name search or default filter returned nothing.

For a read-only Microsoft Graph PowerShell check, start with the exact resource identifier:

```powershell
Connect-MgGraph -Scopes "Application.Read.All"

$resource = "api://11111111-2222-3333-4444-555555555555"

Get-MgServicePrincipal -Filter "servicePrincipalNames/any(name:name eq '$resource')" |
    Select-Object Id, AppId, DisplayName, AppOwnerOrganizationId, AccountEnabled,
        ServicePrincipalNames
```

If the failure names a known resource application ID rather than a URI, query its `appId`:

```powershell
$resourceAppId = "11111111-2222-3333-4444-555555555555"

Get-MgServicePrincipal -Filter "appId eq '$resourceAppId'" |
    Select-Object Id, AppId, DisplayName, AppOwnerOrganizationId, AccountEnabled,
        ServicePrincipalNames
```

`Id` is the tenant-local service-principal object ID. `AppId` identifies the backing application. `ServicePrincipalNames` contains the identifiers by which the resource can be addressed. Microsoft Graph documents filtering service principals, the `appId` alternate key, and the `any` operator requirement for `servicePrincipalNames`. ([list service principals](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0), [servicePrincipal properties](https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal?view=graph-rest-1.0))

Interpret the result carefully:

- **One expected object with the exact identifier:** the local resource exists. Recheck the actual request value, authority, cloud, and timestamp; do not troubleshoot a nearby tenant or stale deployment.
- **No object, but the API is multitenant:** the resource may never have been onboarded or consented into this tenant, or its service principal may have been deleted.
- **No object, and the API is single-tenant in another directory:** this tenant is not a valid token-issuance context for that resource. Correct the architecture or tenant routing with the API owner.
- **Multiple plausible objects:** stop. Compare `AppId`, `AppOwnerOrganizationId`, publisher, owners, identifiers, and consent history. Never pick by display name.
- **Object exists but is disabled:** that is a different control state. A disabled resource service principal can surface a different error; preserve the current code and investigate the exact object rather than recreating it.

## Decide whether onboarding or consent is actually missing

An absent resource service principal is not permission to manufacture one.

First establish:

1. who owns and publishes the API;
2. whether its registration supports accounts in this tenant;
3. the approved Application ID URI and resource application ID;
4. which delegated scopes or application roles the client requires;
5. whether user consent is permitted or admin consent is required;
6. whether the client itself is approved in this tenant; and
7. whether deletion or offboarding was intentional.

Microsoft's consent troubleshooting guidance says AADSTS500011 can mean the App ID URI is invalid, the resource is single-tenant, the resource is unavailable to external organizations, or it does not exist. It directs administrators to validate both the App ID URI and tenant with the application owner. ([troubleshoot consent issues](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/troubleshoot-consent-issues#error-aadsts500011-resource-principal-not-found))

For an approved multitenant application, Microsoft documents supported ways to create its tenant-local enterprise application, including the publisher's admin-consent flow or an explicit service-principal creation operation performed by an Application Administrator or Cloud Application Administrator. Creating the object alone does **not** invent an authorization grant, and consent should not be treated as a harmless repair button. ([create an enterprise application from a multitenant app](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant), [application consent experience](https://learn.microsoft.com/en-us/entra/identity-platform/application-consent-experience))

This is the security boundary: consent authorizes a client to access a resource. Before using it, review the publisher, permissions, tenant scope, business owner, and app-governance policy. If the requested permissions are unexpected, stop and escalate rather than clearing the error.

## Check deletion and audit evidence

If the same client-resource-tenant path worked previously, investigate change history before onboarding it as though it were new.

Review **Entra ID > Monitoring & health > Audit logs** around the first failure. Filter **ApplicationManagement** events for the resource application's `AppId`, the missing service-principal object ID if known, and relevant actors. Look for:

- deletion or restoration of the resource service principal;
- changes to the API application's identifier URIs;
- a newly added service principal;
- delegated permission grants or app-role assignments;
- consent events; and
- application registration audience changes.

Microsoft's audit guidance identifies **Add service principal** as the activity that creates the local instance and exposes provisioning-type and owner-tenant evidence. Its application-permission audit reference separately identifies delegated grants, app-role assignments, and consent activities. ([service-principal creation evidence](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/understand-service-principal-creation-with-new-audit-log-properties), [application permission audit logs](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-perms-audit-logs))

If deletion was intentional—vendor offboarding, resource retirement, incident containment, or tenant cleanup—do not restore or recreate the principal merely because a caller still retries. Fix or retire the caller. If deletion was accidental, use the supported recovery path and then verify the identifiers and grants that actually returned.

The site's [service-principal creation audit guide](/posts/microsoft-entra-service-principal-creation-audit) provides a deeper workflow for proving why a new enterprise application appeared and who initiated it.

## Monitor AADSTS500011 without hiding the caller

The portal can show interactive, non-interactive, service-principal, and managed-identity sign-ins in separate categories. Search the category that matches the caller. If logs are routed to Log Analytics, start with user sign-ins and preserve the client and resource dimensions:

```kusto
union withsource=LogTable SigninLogs, AADNonInteractiveUserSignInLogs
| where ResultType == "500011"
| project TimeGenerated, LogTable, AppDisplayName, AppId,
    ResourceDisplayName, ResourceIdentity, ResourceServicePrincipalId,
    ResourceTenantId, CorrelationId, ResultDescription
| order by TimeGenerated desc
```

For app-only or managed-identity callers, run the equivalent filter against the service-principal or managed-identity sign-in table that your diagnostic settings route. Microsoft's `SigninLogs` reference documents `ResultType` as the error code and includes `ResourceIdentity`, `ResourceServicePrincipalId`, and `ResourceTenantId`. ([SigninLogs schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs), [logs available for streaming](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-diagnostic-settings-logs-options))

Analysis: if `ResourceServicePrincipalId` is empty on the failing event, that is consistent with Entra failing to resolve a local resource principal, but it is not enough by itself to authorize creation. The full error, resource string, tenant, registration ownership, and onboarding evidence still decide the repair.

## Apply the least disruptive repair

Choose the branch supported by evidence:

- **Wrong resource string:** restore the approved App ID URI or scope in the caller's effective configuration. Do not edit the API registration to accommodate a typo.
- **Wrong tenant:** correct the runtime authority or customer-tenant routing. Do not copy the API into the accidental tenant.
- **Stale resource identifier:** coordinate a client migration to the API's current documented identifier. Keep any compatibility window owned and time-bound by the API team.
- **Approved multitenant API not onboarded:** use the publisher's approved onboarding or admin-consent path after permission review.
- **Accidentally deleted local resource service principal:** use the documented recovery procedure, then validate object identity and grants.
- **Single-tenant API called from another tenant:** return to the application architecture. Either call it through its supported home-tenant design or have the API owner perform a reviewed multitenant conversion; do not change `signInAudience` during an incident without that design work.
- **Intentional removal or untrusted publisher:** leave the resource unavailable, stop retries, and escalate to the business, security, and application owners.

Rollback should be equally narrow. If a deployment introduced the wrong resource or authority, roll back that configuration. If onboarding created unexpected access, follow the organization's app-governance and permission-revocation process; do not delete evidence reflexively.

## Avoid the fixes that create a second incident

- **Do not rotate the client secret.** AADSTS500011 is a resource lookup failure, not client credential validation.
- **Do not change the redirect URI.** That belongs to errors such as AADSTS50011; see the [reply URL mismatch guide](/posts/aadsts50011-reply-url-mismatch-microsoft-entra).
- **Do not disable Conditional Access.** The request has not established a valid resource boundary for policy troubleshooting.
- **Do not grant broad admin consent blindly.** First verify the resource publisher and every requested permission. The [AADSTS65001 consent-required guide](/posts/aadsts65001-consent-required-microsoft-entra) covers the next authorization boundary.
- **Do not create a look-alike application registration.** A duplicate display name does not reproduce the original App ID URI, service principals, permissions, owners, or trust.
- **Do not convert a single-tenant API to multitenant as a quick fix.** That expands who can instantiate and request access to the API and requires issuer, tenant, consent, and authorization review.
- **Do not use a successful request to a different resource as proof.** Microsoft Graph working does not prove that a custom API principal exists.

## Validate the repair end to end

Use a fresh token request through the same application path; do not rely on a cached access token.

1. Confirm the deployed authority and requested resource or scope match the approved values.
2. Query the tenant-local resource service principal and record its `Id`, `AppId`, owner tenant, enabled state, and identifiers.
3. Run one approved delegated or app-only request.
4. Find the new sign-in event by timestamp and correlation ID.
5. Verify the event names the expected client, resource, resource tenant, and resource service-principal ID.
6. Confirm the issued access token is intended for the expected audience using safe application diagnostics; do not paste the token into public tools or tickets.
7. Verify the API transaction succeeds with the intended permission.
8. Run a negative test: a wrong scope, unconsented client, or unassigned caller should remain blocked at its proper authorization boundary.
9. Watch for continued 500011 attempts from stale deployment rings or jobs.

If the error changes, stop troubleshooting 500011. AADSTS700016 means the client lookup is failing; AADSTS65001 means consent is missing; AADSTS7000215 means a client secret is invalid; and AADSTS50011 means the callback URI does not match. A new code often proves that the request reached the next control plane.

## Licensing, roles, and escalation

There is no special Microsoft Entra feature license that makes an invalid resource URI valid. The practical dependencies are access to the correct tenant, retained sign-in and audit evidence, and authority to manage applications or consent.

Microsoft documents sign-in and audit data in Microsoft Entra ID Free, with seven days of built-in retention; P1 and P2 provide 30 days. Longer investigations require logs to have been routed to another destination in advance. ([Microsoft Entra activity-log retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention))

Use read-only access for diagnosis. The Graph service-principal listing API documents `Application.Read.All` as its least-privileged delegated permission, subject to the signed-in user's supported directory role and tenant policy. Creating a multitenant enterprise application requires an appropriately authorized application administrator under Microsoft's procedure. Consent authority depends on the permission type and tenant consent policy.

Escalate with:

- sanitized complete AADSTS500011 text;
- UTC timestamp, request ID, correlation ID, and trace ID;
- authority and tenant ID;
- client application ID;
- exact requested `resource` or `scope`;
- resource application ID and expected App ID URI;
- resource home tenant and intended resource tenant;
- relevant sign-in and audit events;
- last known success and recent changes; and
- the business and technical owners for both client and API.

Never attach secrets, private keys, tokens, or session cookies.

## AADSTS500011 administrator checklist

- [ ] Confirm error code 500011 on the exact failed request.
- [ ] Preserve the resource value, tenant, UTC time, request ID, and correlation ID.
- [ ] Identify v1 `resource` versus v2 `scope` semantics.
- [ ] Compare the exact resource identifier with the API's Application ID URI.
- [ ] Prove the authority routed to the intended tenant and Microsoft cloud.
- [ ] Locate the resource service principal by `servicePrincipalNames` or `appId`.
- [ ] Distinguish single-tenant, multitenant, deleted, and never-onboarded states.
- [ ] Review publisher, permissions, owners, and consent policy before onboarding.
- [ ] Check deletion, service-principal creation, and grant audit events.
- [ ] Apply the narrowest supported repair.
- [ ] Retest with a fresh token request and correlate the new sign-in event.
- [ ] Prove the expected resource audience and permission at the API.
- [ ] Run a negative test and monitor stale callers.

## FAQ

### What does AADSTS500011 mean?

It means Microsoft Entra could not find the service principal for the requested resource in the tenant handling the token request. The resource identifier can be wrong, the tenant can be wrong, the API can be single-tenant elsewhere, or the expected local resource principal can be absent.

### Is AADSTS500011 the same as AADSTS700016?

No. AADSTS500011 is a **resource** lookup failure. AADSTS700016 is a **client application** lookup failure. Capture both the `client_id` and the requested resource so you repair the correct object.

### Can I fix AADSTS500011 by granting admin consent?

Only when an approved multitenant resource is genuinely missing its tenant-local onboarding and the requested permissions pass review. Consent creates authorization; it should never be used blindly to make the error disappear.

### Does AADSTS500011 mean the API was deleted?

Deletion is one possibility, especially when a previously healthy path fails across every caller. Wrong resource identifiers and wrong tenants are also common. Check audit history and the API's home registration before recovering or recreating anything.

### Why does the resource exist in App registrations but the request still fail?

You may be looking in the API's home tenant while the token request is addressed to another tenant, or the local enterprise application can be missing. You may also be comparing the correct registration with a different runtime resource string. Match tenant, `AppId`, App ID URI, and service principal together.

### Should I add `/.default` to every scope?

No. `/.default` asks for the statically configured permissions for one resource and is required for client-credentials token requests. Delegated flows can request named scopes exposed by the API. In both cases, the resource portion must resolve to the intended API.

AADSTS500011 is usually repaired without touching credentials or Conditional Access. Name the client, resource, and tenant separately; compare the exact identifier Entra evaluated; then restore only the missing routing, registration, or approved onboarding relationship that the evidence proves.
