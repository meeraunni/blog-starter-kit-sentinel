---
title: "AADSTS90002 Invalid Tenant Name: Microsoft Entra Fix"
excerpt: "Fix AADSTS90002 invalid tenant name errors by validating the authority tenant ID, verified domain, cloud endpoint, app audience, and effective configuration."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-28T17:09:55-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS90002 invalid tenant name** error means Microsoft Entra could not resolve the tenant named in the authentication authority. The dependable fix is to validate the authority as one unit: **cloud host, tenant segment, and protocol path**. Use the tenant's immutable Directory (tenant) ID when possible, and confirm that the application is actually sending the value you reviewed.

Grab a coffee before changing the app registration. Microsoft's current error reference calls AADSTS90002 `InvalidTenantName` and identifies three common causes: an incorrect tenant ID, a tenant inferred from a domain that is not registered, or an application using the wrong Microsoft cloud. ([Microsoft Entra authentication error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [Microsoft Entra national-cloud endpoints](https://learn.microsoft.com/en-us/entra/identity-platform/authentication-national-cloud))

This is a **tenant-discovery failure**, not evidence that the client secret is wrong, the user lacks application assignment, consent is missing, or Conditional Access blocked access. Prove which tenant the request names and which cloud owns that tenant before touching any downstream control.

## AADSTS90002 invalid tenant name: the short answer

Work through these checks in order:

1. Capture the full error, UTC timestamp, request ID, correlation ID, authority URL, client ID, flow, and affected environment.
2. Split the authority into its host, tenant segment, and protocol path.
3. Compare the tenant segment with **Entra ID > Overview > Properties > Tenant ID** in the intended directory.
4. If the application uses a domain instead of the GUID, confirm that the domain appears as verified in that same tenant. A company name, email suffix, or DNS domain is not automatically a valid Entra tenant identifier.
5. Match the authority host to the tenant's cloud: global, US Government, or China operated by 21Vianet.
6. Fetch the tenant's OpenID Connect metadata document. A successful discovery response proves the host and tenant segment resolve together; it does not prove the client, redirect URI, permissions, or credential.
7. Find the effective runtime configuration. Check environment variables, secret-store references, deployment settings, reverse-proxy configuration, and library overrides rather than trusting one source file.
8. Retest the same environment with the corrected authority, then validate the new sign-in event and token issuer before closing the incident.

Do not replace a tenant-specific authority with `common` merely to make the error disappear. That changes the audience boundary and is valid only when the application's supported account types and authorization design permit it.

## Place AADSTS90002 in the authentication pipeline

A tenant-specific Microsoft identity platform authority has three parts:

```text
https://login.microsoftonline.com/{tenant}/v2.0
        \____________________/ \____/ \__/
                host           tenant  version
```

The host selects a Microsoft cloud instance. The tenant segment selects a directory or a supported audience alias. The remaining path selects the protocol endpoint and version. In Microsoft's tenant-specific OIDC authority, `{tenant}` can be the Directory (tenant) ID or a domain associated with that tenant. ([OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#fetch-the-openid-configuration-document))

AADSTS90002 occurs while Entra is resolving that authority. That is earlier than most application and user decisions. Keep it separate from these nearby failures:

- [AADSTS700016 application not found](/posts/aadsts700016-application-not-found-microsoft-entra) means Entra could not resolve the **client application** in the tenant handling the request.
- [AADSTS500011 resource principal not found](/posts/aadsts500011-resource-principal-not-found-microsoft-entra) means Entra could not resolve the **target API or resource service principal** in that tenant.
- [AADSTS50034 user account not found](/posts/aadsts50034-user-account-not-found-microsoft-entra) means the selected tenant does not contain the expected member or guest user.
- AADSTS90002 means the **tenant named by the authority itself** was not found at that cloud host.

Rotating a credential, adding a redirect URI, granting consent, inviting a guest, or excluding the request from Conditional Access cannot make an invalid authority resolve.

## Preserve the failed authority before changing it

Capture a sanitized incident bundle:

- complete error description and numeric code;
- UTC timestamp, trace ID, request ID, and correlation ID when present;
- effective authorization, token, device-code, or metadata URL;
- authority host and tenant segment as separate values;
- Application (client) ID and expected app-registration tenant;
- user-interactive, non-interactive, device-code, daemon, managed-identity, or other flow;
- application version, deployment ring, environment, and last known success;
- configuration source and the component that assembled the final URL; and
- recent tenant migration, domain, cloud, deployment, or identity-library changes.

Do not attach authorization codes, access tokens, refresh tokens, ID tokens, client secrets, certificate private keys, cookies, PKCE verifiers, or complete client assertions to the incident. A request URL can also contain login hints or other user data; sanitize it before sharing.

The effective URL matters more than the intended setting. A correct value in source control can be replaced by an environment variable, Helm value, app-service setting, secret-store entry, desktop policy, tenant-selection cache, or library default at runtime.

## Validate the tenant identifier against an authoritative source

For the intended directory, sign in to the Microsoft Entra admin center as at least Global Reader and browse to **Entra ID > Overview > Properties**. Copy the **Tenant ID** from the directory itself. Microsoft's tenant-ID procedure also documents `Get-AzTenant`, `az account tenant list`, and `m365 tenant id get` as supported discovery methods. ([How to find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-find-tenant))

Compare the copied GUID character for character with the authority's tenant segment. Check for:

- a client ID, subscription ID, object ID, or service-principal ID pasted into the tenant field;
- a GUID from a development, partner, or former tenant;
- a truncated value, extra whitespace, braces, or quotation marks introduced by templating;
- a placeholder such as `Enter_the_Tenant_Info_Here` reaching production;
- a display name such as `Contoso Production` used where an ID or verified domain is required; or
- a value composed from the user's full email address instead of an approved tenant identifier.

Microsoft's app-registration guidance distinguishes the **Directory (tenant) ID** from the **Application (client) ID** and tells programmatic clients to pass both in their respective places. They are both GUIDs, which makes a syntactically valid swap easy to miss during review. ([Register an app and create its service principal](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#sign-in-to-the-application))

### Inventory the tenant and its verified domains with Microsoft Graph

If Microsoft Graph PowerShell is already approved and installed in the administrator's environment, this read-only query returns the organization ID, display name, and verified domains:

```powershell
Connect-MgGraph -Scopes "User.Read"

Get-MgOrganization -Property Id,DisplayName,VerifiedDomains |
  Select-Object Id, DisplayName,
    @{Name = "VerifiedDomains"; Expression = {
      ($_.VerifiedDomains | ForEach-Object Name) -join ", "
    }}
```

Microsoft's v1.0 `GET /organization` reference says delegated `User.Read` can read exactly these three organization properties. The returned `id` is the tenant ID; `verifiedDomains` is the collection of domains associated with that tenant. ([Get organization](https://learn.microsoft.com/en-us/graph/api/organization-get?view=graph-rest-1.0), [organization resource type](https://learn.microsoft.com/en-us/graph/api/resources/organization?view=graph-rest-1.0))

Use the query as evidence, not as a repair. It reads the tenant represented by the signed-in Graph context. Record that context so output from one directory is not pasted into another application's configuration.

## Decide whether a domain is safe to use as the tenant segment

A tenant-specific authority can use a verified domain such as `contoso.onmicrosoft.com` in place of the GUID. The initial `onmicrosoft.com` domain is created with the tenant, and organizations can add verified custom domains. Microsoft's OIDC reference accepts a Directory (tenant) ID or domain in the tenant position. ([Create a Microsoft Entra tenant](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-create-new-tenant), [OIDC tenant values](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#fetch-the-openid-configuration-document))

That does **not** mean every familiar domain is a tenant identifier. Classify the value:

- **Tenant ID GUID:** preferred for stable, tenant-specific application configuration.
- **Initial `onmicrosoft.com` domain:** tenant-owned and cannot be changed or deleted.
- **Verified custom domain:** valid only while associated with that tenant.
- **Primary SMTP domain or public website domain:** not proof of Entra verification.
- **User's complete UPN or email address:** an identity hint, not the tenant segment.
- **Tenant display name:** a label, not a supported authority identifier.
- **Unverified or misspelled domain:** cannot identify the intended directory.

Microsoft's error reference specifically warns that AADSTS90002 can occur when an application derives the tenant from an email address but that domain is not registered. The domain-management documentation explains that verified custom domains are explicit tenant objects and that a domain cannot be verified in more than one tenant at the same time. ([AADSTS90002 definition](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [manage custom domains](https://learn.microsoft.com/en-us/entra/identity/users/domains-manage))

Do not add, re-verify, move, or force-delete a domain merely to repair an application authority. Those are tenant-wide administrative changes with effects on users, groups, applications, and Microsoft 365 workloads. If the application already knows the intended tenant, use its verified GUID and handle domain governance as a separate change.

## Match the authority host to the Microsoft cloud

Microsoft Entra's cloud instances are separate environments. Microsoft documents these authentication hosts:

- **Global service:** `login.microsoftonline.com`
- **Microsoft Entra ID for US Government:** `login.microsoftonline.us`
- **Microsoft Entra China operated by 21Vianet:** `login.partner.microsoftonline.cn`

The tenant GUID alone is not enough. A valid tenant in one cloud does not become resolvable by sending the same GUID to another cloud's authority. Microsoft requires applications to be registered separately in the appropriate cloud portal and to use that cloud's authentication and resource endpoints. ([Microsoft Entra authentication and national clouds](https://learn.microsoft.com/en-us/entra/identity-platform/authentication-national-cloud), [use MSAL in a national cloud](https://learn.microsoft.com/en-us/entra/identity-platform/msal-national-cloud))

Check the complete endpoint family, not only the login hostname:

- application registration portal;
- authorization and token authority;
- OpenID metadata and issuer;
- Microsoft Graph service root and scopes; and
- any cloud-specific resource audience.

Do not mix a government-cloud authority with global Microsoft Graph, or copy a global sample and change only the tenant GUID. AADSTS90002 may be the first visible symptom, but a partial cloud correction can leave discovery, token validation, or API calls inconsistent.

## Use OIDC discovery as a narrow resolution test

Microsoft publishes an OpenID Provider Configuration Document at a public well-known endpoint. Build it from the exact host and tenant you intend to use:

```text
https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration
```

For US Government or China, substitute the correct cloud host documented above. This read-only PowerShell check returns selected metadata without requesting a token:

```powershell
$authorityHost = "https://login.microsoftonline.com"
$tenantId = "00000000-0000-0000-0000-000000000000"
$metadataUri = "$authorityHost/$tenantId/v2.0/.well-known/openid-configuration"

$metadata = Invoke-RestMethod -Method Get -Uri $metadataUri

[pscustomobject]@{
  Issuer = $metadata.issuer
  AuthorizationEndpoint = $metadata.authorization_endpoint
  TokenEndpoint = $metadata.token_endpoint
}
```

Replace the placeholder with the copied tenant ID. Do not suppress TLS validation, follow an unexpected host, or treat a response from `common` as proof that a tenant-specific authority is correct.

A successful metadata response proves only that the **host and tenant segment resolve** and that discovery returned protocol metadata. It does not prove:

- the client ID exists in that tenant;
- the application's supported account types are correct;
- the redirect URI matches;
- a service principal exists in a resource tenant;
- permissions or consent are present;
- the credential is valid; or
- Conditional Access will grant the eventual sign-in.

That narrow meaning is useful. If discovery fails for the same host and tenant, stay at the authority layer. If discovery succeeds, move to client, resource, credential, user, and policy checks based on the next actual error.

## Do not use `common` as an emergency bypass

Microsoft supports four broad tenant selectors in OIDC authorities:

- `common` for work, school, and personal Microsoft accounts supported by the app;
- `organizations` for work or school accounts from Microsoft Entra tenants;
- `consumers` for personal Microsoft accounts; and
- a tenant ID or verified domain for one specific directory.

Those selectors express application audience. They are not interchangeable spellings for a tenant. Microsoft's OIDC documentation also says the app registration's `signInAudience` must support the account types sent through the chosen authority. ([OIDC authority tenant values](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#fetch-the-openid-configuration-document), [register an application and choose supported account types](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app#register-an-application))

Changing a single-tenant application from `{tenant-id}` to `common` can alter home-realm discovery and which identities reach the application, while downstream authorization may still reject them. It can also hide the original configuration defect until another environment or flow restores tenant-specific behavior.

Use a broad selector only when the application was designed, registered, and tested for that audience. Keep authorization tenant-aware after authentication; accepting a multitenant issuer does not grant every authenticated principal access to business data.

## Find the effective configuration that built the bad authority

Once the correct host and tenant ID are proven, trace configuration in runtime order:

1. application defaults and checked-in configuration;
2. environment-specific configuration files;
3. environment variables and deployment substitutions;
4. secret or configuration store references;
5. platform settings such as App Service, container, Kubernetes, or desktop policy;
6. identity-library constructor options and authority validation settings;
7. reverse-proxy or middleware rewrites;
8. tenant-selection or home-realm-discovery logic; and
9. cached configuration in a long-running process, job agent, or deployed client.

Compare a working and failing environment by immutable values, not screenshots of display names. Record the source of each value and the component that wins when settings conflict.

Common patterns include:

- production receiving the development tenant ID from a shared variable group;
- an infrastructure template passing `clientId` into a field named `tenantId`;
- a SaaS onboarding form storing a customer's email suffix as its authority tenant;
- a renamed variable leaving one scheduled job on the retired key;
- a national-cloud deployment inheriting the global login host;
- one replica or desktop version retaining old configuration; or
- a library being initialized before the environment-specific settings load.

**Analysis:** if only one node, ring, region, or client version fails, prioritize effective configuration and cache state over tenant-wide Entra changes. A tenant lookup is deterministic for the same host and identifier; inconsistent results usually indicate that the requests are not actually identical.

## Read sign-in evidence without overclaiming it

Use the correlation ID, request ID, timestamp, client ID, and user from the failure to search **Entra ID > Monitoring & health > Sign-in logs** in the tenant you expected to receive the request. Microsoft describes the sign-in event in terms of who signed in, how the client performed the request, and what resource it targeted; the details include application, resource tenant, error code, and unique identifiers. ([Sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details), [troubleshoot sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

An early tenant-resolution failure might not produce the complete event you expected inside the intended tenant, because the request did not successfully identify that directory. Treat an absent event as a routing clue, not proof that the client made no request. Preserve the client-side error and IDs, then search the actual tenant and cloud named by the effective authority when you have authorized access.

If a corrected request reaches the tenant and produces a different AADSTS code, do not keep troubleshooting 90002. The new code shows that tenant resolution advanced and the pipeline stopped at another layer.

## Mitigation, rollout, and rollback

For a business-critical application, the safest immediate mitigation is usually a configuration-only correction to the approved tenant ID and cloud host in the affected environment. Avoid concurrent app-registration, permission, credential, redirect, and Conditional Access changes; they destroy the diagnostic value of the retest.

Roll out in stages:

1. correct one nonproduction or canary instance;
2. fetch OIDC metadata from the effective runtime environment;
3. complete one representative interactive or app-only flow;
4. verify the issuer, tenant context, client, resource, and sign-in evidence;
5. expand by ring while monitoring AADSTS90002 and adjacent codes; and
6. remove or lock the obsolete configuration key after every consumer is migrated.

Rollback means restoring the last known-good authority configuration for the same tenant and cloud. It does not mean switching to `common`, creating another tenant, moving a domain, rotating credentials, or disabling policy. If the old value points to the wrong directory, preserve it as evidence rather than reintroducing it.

Escalate to Microsoft or the application vendor with the sanitized authority, cloud, tenant ID source, metadata result, client ID, UTC timestamp, request ID, correlation ID, trace ID, environment, and last known success. State whether the tenant resolves through its documented cloud's metadata endpoint and whether the application actually emitted that same authority.

## AADSTS90002 invalid tenant name checklist

- [ ] Capture the full error and all request identifiers before changing configuration.
- [ ] Separate the authority host, tenant segment, and protocol path.
- [ ] Copy the intended Directory (tenant) ID from the tenant itself.
- [ ] Confirm the value is not a client ID, subscription ID, object ID, display name, or email address.
- [ ] If a domain is used, verify it belongs to the intended tenant.
- [ ] Match global, US Government, or China tenants to the documented authentication host.
- [ ] Fetch the tenant-specific OIDC metadata document.
- [ ] Confirm supported account types before considering `common`, `organizations`, or `consumers`.
- [ ] Trace the effective runtime setting through deployment overrides and caches.
- [ ] Retest one canary without unrelated identity changes.
- [ ] Validate the issuer, tenant context, and new sign-in evidence.
- [ ] Remove obsolete configuration only after every consumer is proven.

## FAQ

### Does AADSTS90002 mean the Microsoft Entra tenant was deleted?

Not necessarily. Microsoft's error description says the tenant name was not found at the authority being used. A typo, wrong identifier type, unregistered domain, or cross-cloud host mismatch can produce the same outcome. Confirm the intended tenant from an authoritative directory context before concluding that it no longer exists.

### Can I use the tenant's display name in the authority URL?

No. Use the Directory (tenant) ID, a domain associated with the tenant, or a supported audience alias such as `organizations` when the application design permits it. A friendly display name is not a documented tenant selector.

### Is the user's email domain always a valid tenant name?

No. Microsoft explicitly lists a tenant derived from an email address whose domain is not registered as an AADSTS90002 cause. Use the tenant GUID or verify the domain against the organization object before constructing an authority from it.

### Will rotating the client secret fix AADSTS90002?

No. The tenant must resolve before Entra can evaluate the client credential in that directory. Preserve the credential and test the corrected authority first. Rotate a secret only for its own lifecycle or compromise reason.

### Why does `common` work when the tenant ID fails?

`common` is a valid global audience selector, so it avoids resolving the bad tenant segment at the same point. That does not prove it is correct for the application. Confirm the registration's supported account types, issuer validation, tenant authorization, and intended single- or multitenant design before using it.

### Can Conditional Access cause AADSTS90002?

The documented error is a tenant-name lookup failure. Conditional Access evaluates access in a resolved tenant; it cannot correct an invalid tenant identifier or cloud host. Investigate policy only if a later request reaches the tenant and the sign-in evidence identifies a policy result.

The clean operating rule is simple: **resolve the directory before troubleshooting anything inside it**. Prove the exact host and tenant pair, use the immutable tenant ID where possible, validate discovery, then follow the next layer of evidence instead of changing unrelated controls.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [Microsoft Entra authentication and national clouds](https://learn.microsoft.com/en-us/entra/identity-platform/authentication-national-cloud)
- [Use MSAL in a national cloud app](https://learn.microsoft.com/en-us/entra/identity-platform/msal-national-cloud)
- [How to find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-find-tenant)
- [Get organization with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/organization-get?view=graph-rest-1.0)
- [Microsoft Graph organization resource](https://learn.microsoft.com/en-us/graph/api/resources/organization?view=graph-rest-1.0)
- [Manage custom domain names in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/domains-manage)
- [Register a Microsoft Entra application](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Microsoft Entra sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
