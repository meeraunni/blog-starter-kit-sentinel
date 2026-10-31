---
title: "AADSTS7000222 Client Secret Expired: Microsoft Entra Fix"
excerpt: "Fix AADSTS7000222 client secret expired errors by proving the affected app, rotating safely, validating every deployment, and preventing repeat outages."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-31T17:05:27-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS7000222 client secret expired** error means Microsoft Entra found the client application, but every client secret presented for that app is past its usable end time. The safe fix is to identify the exact app registration and runtime dependency, add one replacement secret, deploy the new **secret value** through the approved secure store, prove token acquisition and application function, and only then remove the expired credential.

Grab a coffee before clicking **New client secret**. Creating a secret is only the first control-plane change. It does not update an Azure DevOps service connection, container secret, function setting, Key Vault reference, vendor appliance, scheduled script, or second region that still holds the expired value. Microsoft documents AADSTS7000222 as an expired-client-secret condition and separately recommends a new-first, validate, old-last rotation sequence. ([Microsoft Entra error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [Microsoft.Identity.Web client-secret guidance](https://learn.microsoft.com/en-us/entra/msidweb/authentication/client-secrets#manage-secret-expiration-and-rotation))

This guide is based on current Microsoft documentation and does not claim a live tenant test. It is for Entra administrators, application owners, and platform teams restoring an app-only workload without exposing a credential, deleting the wrong app object, or turning one outage into the next rotation failure.

## AADSTS7000222 client secret expired: the short answer

Work the incident in this order:

1. Preserve the full error, UTC time, request ID, correlation ID, application ID, tenant, resource, environment, and last successful time. Never capture the secret value.
2. Resolve the failed `client_id` to the intended **app registration** in the tenant that received the token request.
3. Inventory every active deployment and secret-store reference that depends on that credential.
4. Confirm the relevant password credential's `EndDateTime` is in the past. Do not collapse AADSTS7000222 into a generic secret error.
5. Add one replacement credential to the existing application. Store its **Value** immediately; Microsoft Entra will not show it again.
6. Update one canary instance, acquire a token through the workload's normal library and path, and test the workload's real resource operation.
7. Roll the new reference through every deployment, region, slot, service connection, and scheduled process.
8. Correlate successful service-principal sign-ins, preserve the application-management audit events, and remove the expired credential only after the dependency inventory is clear.
9. Replace manual secrets with managed identity, workload identity federation, or certificate credentials where the platform supports them.

The distinction is important. **AADSTS7000222 proves an expiry boundary.** It does not mean the application's API permissions disappeared, Conditional Access blocked a user, the service principal was disabled, or the resource returned an authorization failure.

## Place the failure in the app-only token flow

A confidential client normally asks a tenant-specific token endpoint for an access token and authenticates with a client secret, certificate, federated credential, or another supported credential. In a client-credentials request, Microsoft Entra must resolve the application and validate its credential before it can issue a token for the requested resource. ([OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow))

AADSTS7000222 occurs at that client-authentication gate. Separate it from nearby failures:

- **AADSTS700016:** Microsoft Entra could not find the application in the target directory. Use the [AADSTS700016 application-not-found guide](/posts/aadsts700016-application-not-found-microsoft-entra).
- **AADSTS7000215:** the presented secret is invalid, which can mean the wrong value, wrong app, encoding damage, or another mismatch. Use the [AADSTS7000215 invalid-client-secret guide](/posts/aadsts7000215-invalid-client-secret-microsoft-entra).
- **AADSTS7000222:** the client secret keys for the resolved app are expired.
- **AADSTS700027:** a certificate-signed client assertion failed validation; that is not a password-credential rotation.
- **AADSTS7000112:** the application is disabled.
- **HTTP 401 or 403 from the API after token issuance:** client authentication succeeded and the failure moved to token validation or resource authorization.

Read the exact error returned by the token endpoint or the workload's authentication library. A wrapper can shorten multiple failures to `invalid_client`; the complete AADSTS code, request ID, correlation ID, and timestamp preserve the useful boundary.

## Prove the application, tenant, and credential object

Microsoft Entra represents an application with two related objects. The **application object** is the registration in its home tenant. A **service principal** is the application's local identity in a tenant and carries local assignments and permissions. Registering an app normally creates a service principal automatically. ([application and service-principal objects](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals))

For the ordinary app-registration secret path, start at **Entra ID > App registrations**, not by creating a new enterprise application. Match all of these values:

- the token request's `client_id` to the **Application (client) ID**;
- the token authority's tenant to the app registration's home directory or supported tenant path;
- the affected workload to the expected environment and owner;
- the password credential's description, key ID, start time, and end time to the deployment record; and
- the target resource to the workload's intended API.

A read-only Microsoft Graph PowerShell inventory can expose credential metadata without exposing a secret:

```powershell
$clientId = "00000000-0000-0000-0000-000000000000"

Connect-MgGraph -Scopes "Application.Read.All"

$application = Get-MgApplication `
    -Filter "appId eq '$clientId'" `
    -Property Id,AppId,DisplayName,SignInAudience,PasswordCredentials

$application | Select-Object Id, AppId, DisplayName, SignInAudience
$application.PasswordCredentials |
    Select-Object DisplayName, KeyId, StartDateTime, EndDateTime, Hint
```

Interpret the identifiers carefully:

- `AppId` is the Application (client) ID sent as `client_id`.
- `Id` is the directory object ID of the application registration.
- `KeyId` is the credential identifier, shown as the Secret ID in the portal.
- `SecretText` or the portal's **Value** is the confidential credential the workload must present.

The Secret ID is not a usable secret. Microsoft states that the generated secret value is returned only when the credential is created and cannot be retrieved later. ([Microsoft Graph PowerShell `Add-MgApplicationPassword`](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/add-mgapplicationpassword?view=graph-powershell-1.0))

If the client ID resolves to no application in that tenant, stop. The incident is not a normal AADSTS7000222 rotation until the identifier and authority mismatch is explained. Do not create a look-alike app registration merely to obtain a fresh secret; that produces a new identity with different permissions, owners, assignments, policies, and audit history.

## Inventory every dependency before rotation

The expired credential is usually easy to see. The difficult part is proving where it is still used. Build the dependency map from the app registration outward:

```text
app registration -> credential metadata -> secure store -> deployment reference
                 -> process configuration -> token endpoint -> protected resource
```

Check, as applicable:

- Azure Key Vault secret names and pinned version URIs;
- App Service and Functions application settings and deployment slots;
- Container, Kubernetes, and orchestration secrets;
- Azure DevOps service connections, variable groups, and pipeline libraries;
- GitHub Actions environments and repository or organization secrets;
- Automation accounts, runbooks, Logic Apps, schedulers, and integration platforms;
- on-premises services, Windows scheduled tasks, appliances, and vendor products;
- development, test, disaster-recovery, and dormant regional deployments; and
- the configuration source and restart or reload behavior for every running instance.

Record the reference name, version identifier, deployment owner, last execution, last successful token time, and rollback method. Do not record the secret value.

> [!NOTE]
> **Analysis:** When every instance fails at nearly the credential's `EndDateTime`, expiry is the likely common boundary. When one region or slot fails and another succeeds, the incident is more likely deployment drift, a pinned secret version, or a process that never reloaded. The same AADSTS code can therefore require different operational repairs.

Do not assume a disabled job is harmless. Weekly reports, quarterly access reviews, failover automation, and disaster-recovery instances can stay silent through the rotation window and fail after the old secret is removed. The inventory must include infrequent dependencies, not only currently noisy ones.

## Rotate the expired secret without avoidable downtime

Microsoft's current app-credential guidance says client secrets are less secure than certificates or federated credentials, limits new client-secret lifetimes to 24 months or less, and recommends less than 12 months. Those limits do not remove the need for an owner, warning window, overlap procedure, and tested deployment path. ([add and manage application credentials](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials))

Use a controlled overlap rotation:

### 1. Preserve the baseline

Record the application object ID, Application (client) ID, tenant ID, affected resource, owners, current credential metadata, dependency inventory, approval reference, and last known success. Export the relevant sign-in and audit events before retention removes them.

### 2. Add one replacement credential

In **Entra ID > App registrations > the verified application > Certificates & secrets > Client secrets**, create a credential with a descriptive environment and owner label plus the shortest lifetime your operating process can reliably rotate.

Copy the **Value** immediately into the approved secret store. Do not put it in a ticket, chat, terminal history, source file, deployment log, or shared note. If the value is lost, create another controlled credential; the existing value cannot be revealed.

Microsoft Graph's `application: addPassword` and the `Add-MgApplicationPassword` cmdlet can automate this operation, but they require write permission and return the secret only in the creation response. Use automation only when its output is captured directly into an approved secure store with access, audit, and redaction controls. ([Microsoft Graph `application: addPassword`](https://learn.microsoft.com/en-us/graph/api/application-addpassword?view=graph-rest-1.0))

### 3. Update a canary deployment

Point one low-impact instance to the new secret-store version. Reload or restart it only through the application's documented configuration procedure. Use the workload's normal authentication library and authority; a portal-only test does not prove the runtime can read the new value.

Validate two outcomes:

1. the workload obtains a token with the intended client ID, tenant, and resource; and
2. the workload completes a representative protected operation.

A token proves authentication. The resource operation proves audience, permissions, assignment, and the application's own behavior.

### 4. Roll through every dependency

Promote the new reference through each region, slot, namespace, service connection, scheduled process, and failover path. Compare the deployment version and secure-store version—not the secret value. Retest the low-frequency jobs deliberately rather than waiting for their next schedule.

Where the framework supports multiple credentials, overlap lets the application try the new credential while the previous one still exists. Microsoft.Identity.Web, for example, can process a `ClientCredentials` array in order. That does not mean every framework, appliance, or vendor product supports two active configuration values; follow the product's documented reload path. ([Microsoft.Identity.Web credential rotation](https://learn.microsoft.com/en-us/entra/msidweb/authentication/client-secrets#manage-secret-expiration-and-rotation))

### 5. Remove only the obsolete credential

After every dependency is proven on the new value, remove the expired password credential by its exact `KeyId`. Preserve the audit event and retest the canary plus representative scheduled workloads.

Do not replace the whole `passwordCredentials` collection with an incomplete update. Microsoft Graph exposes explicit `addPassword` and `removePassword` actions for controlled password-credential management. ([Microsoft Graph application-management operations](https://learn.microsoft.com/en-us/graph/api/resources/applications-api-overview?view=graph-rest-1.0))

## Validate the repair in sign-in and audit evidence

Open **Entra ID > Monitoring & health > Sign-in logs > Service principal sign-ins**. Microsoft documents this report for nonuser sign-ins in which an app or service authenticates with its own secret or certificate. Equivalent events can be grouped by service principal, status, IP address, and resource, so expand the row and match the exact timestamp. ([service-principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins))

For the failed and successful attempts, preserve:

- UTC timestamp, request ID, and correlation ID;
- application and service-principal IDs;
- resource and resource-tenant IDs;
- source IP address and deployment instance;
- status, error code, and failure reason;
- client credential type and credential key ID when shown; and
- the tested operation's application result.

Then review **Audit logs** with the `ApplicationManagement` category. Microsoft classifies credentials added to existing applications as a high-risk event worth monitoring and notes that application and service-principal updates can appear as separate audit entries. Confirm the approved operator, target application, added credential, removed credential, and change time. ([Microsoft Entra security operations for applications](https://learn.microsoft.com/en-us/entra/architecture/security-operations-applications#application-credentials))

Reports Reader is the documented least-privileged role for viewing activity logs. Audit and sign-in logs are available with Microsoft Entra ID Free, but built-in retention is seven days at Free and 30 days at P1 or P2. Export or route logs when the incident, compliance, or rotation interval requires longer evidence. ([activity-log access and licensing](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs), [Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention))

## Do not repair the wrong control plane

These actions do not fix an expired app-registration secret:

- **Do not reset a user password or MFA method.** An app-only client credential is not a user's authentication factor.
- **Do not grant admin consent again.** Consent controls API authorization after client authentication.
- **Do not add broader API permissions.** Permissions cannot make an expired secret valid.
- **Do not disable Conditional Access.** AADSTS7000222 is not an AADSTS53003 policy block.
- **Do not change the token endpoint to `/common`.** Prove the intended tenant instead of changing authority semantics.
- **Do not recreate the app registration.** A new app has a new client ID and a different authorization and governance surface.
- **Do not delete all credentials before testing the replacement.** That removes the rollback path and guarantees an outage for any missed dependency.
- **Do not leave emergency secrets indefinitely.** Unused credentials remain valid attack paths until removed or expired.

If the new credential produces AADSTS7000215, verify that the runtime uses the **Value**, not the Secret ID, and inspect whitespace, encoding, secure-store version, application ID, and tenant. If token acquisition succeeds but the resource denies access, preserve the new evidence and troubleshoot that later authorization boundary.

## Prevent the next AADSTS7000222 outage

Microsoft Entra's **Renew expiring application credentials** recommendation lists application-registration credentials expiring within 30 days. The documented recommendation is named `applicationCredentialExpiry` in Microsoft Graph, requires Microsoft Entra Workload ID for the recommendation experience, and supports read-only access with Reports Reader, Security Reader, or Global Reader. It is an early-warning input, not a complete dependency inventory. ([renew expiring application credentials recommendation](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/recommendation-renew-expiring-application-credential))

Build a rotation control with:

- a named business owner and technical owner for every application;
- an approved credential type and maximum lifetime;
- alerts well before the shortest deployment and change window;
- inventory of application object ID, app ID, credential key ID, secure-store reference, and dependencies;
- a new-first, canary, staged rollout, old-last runbook;
- positive token and resource tests plus a negative test for the retired credential;
- exported audit and sign-in evidence; and
- an escalation path when an app has no owner or no supported reload mechanism.

The better long-term control is often to remove the manually rotated secret. Microsoft's application-registration security guidance recommends this order:

1. **Managed identity** when the workload runs on a supported Azure service.
2. **Workload identity federation** when a trusted external platform can present its own short-lived identity.
3. **Certificate credentials** when managed or federated identity is not suitable.
4. **Client secrets** only when the previous options do not fit and the secret has a controlled lifetime, storage, and rotation process.

The site's [workload identity federation guide](/posts/microsoft-entra-federated-identity-credentials-workload-identity) explains the trust boundary and rollout path for supported external workloads. Microsoft likewise advises against production password credentials because they are easily mismanaged and compromised. ([application registration security best practices](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration#credentials-including-certificates-and-secrets))

## Troubleshoot the remaining failure by evidence

### The new secret works in development but not production

Compare the effective secure-store URI and version, environment-variable precedence, deployment slot, container revision, restart time, tenant, and client ID. Do not compare secret values in a ticket. A successful development token proves only that one deployment can use one credential path.

### One instance still returns AADSTS7000222

That instance still presents an expired value or has not reloaded the new reference. Identify it by source IP, region, deployment telemetry, and sign-in timestamp. Drain or repair the specific instance rather than rotating the tenant again.

### The replacement returns AADSTS7000215

Check that the workload received the secret **Value**, not the Secret ID. Then verify the app and tenant pairing, secure-store version, whitespace, encoding, and framework configuration. The exact error changed because the request reached a different credential-validation result.

### The token succeeds but the API returns 403

The secret rotation worked. Validate the token audience, application permissions, admin consent, resource-side role or ACL, tenant, and workload Conditional Access. Do not keep generating credentials for an authorization problem.

### The app has no identifiable owner

Do not guess at its dependencies or delete its credentials. Preserve sign-in frequency, resource targets, source IPs, audit history, directory owners, configuration references, and business impact. Escalate through the application-governance process and use the smallest approved containment measure if the credential change appears suspicious.

### The expired secret was exposed during troubleshooting

Treat exposure as a credential incident even though the old value is expired. Preserve where it was disclosed, remove it from recoverable logs or tickets through the approved process, verify no other environment reused the same value, complete the controlled replacement, and investigate unexpected credential or application changes.

## AADSTS7000222 administrator checklist

- [ ] Capture the complete error, UTC time, request ID, and correlation ID.
- [ ] Match `client_id` to the intended app registration and authority tenant.
- [ ] Confirm the exact password credential is expired by `KeyId` and `EndDateTime`.
- [ ] Inventory every secure-store reference, deployment, region, slot, job, and service connection.
- [ ] Preserve credential metadata without revealing a secret value.
- [ ] Add one replacement credential to the existing application.
- [ ] Store the new Value immediately in the approved secure store.
- [ ] Update and test a canary through its normal authentication path.
- [ ] Prove both token acquisition and a representative resource operation.
- [ ] Roll the new reference through every dependency, including dormant and scheduled paths.
- [ ] Correlate successful service-principal sign-ins.
- [ ] Review ApplicationManagement audit events for the add and remove operations.
- [ ] Remove only the obsolete credential after dependency validation.
- [ ] Retest after removal and preserve the evidence.
- [ ] Configure an expiry warning, named owners, and the next rotation date.
- [ ] Plan migration to managed identity, federation, or certificates where supported.

## Frequently asked questions

### Does AADSTS7000222 mean the service principal expired?

No. The error identifies expired client-secret keys for the application. Service principals do not have a general expiration date. Resolve the client ID to the application registration and inspect its password-credential metadata.

### Can Microsoft Entra show the old secret value?

No. Microsoft returns the generated secret value only when the password credential is created. The portal's Secret ID and Microsoft Graph `KeyId` identify the credential; they are not the secret value.

### Should I delete the expired secret before adding a new one?

No. Add and deploy the replacement first, prove every dependency, then remove the expired credential by its exact key ID. New-first and old-last preserves evidence and avoids deleting the wrong credential during an outage.

### Does rotating a secret change application permissions?

No. The credential proves the application's identity. API permissions, admin consent, service-principal assignments, and resource authorization are separate controls. Recreating the app would change the identity; rotating a credential on the existing app does not.

### How early does the Microsoft Entra recommendation warn?

Microsoft documents the `applicationCredentialExpiry` recommendation for app-registration credentials expiring within 30 days. Use it as one alert source and set an earlier organizational threshold when dependency discovery, vendor coordination, or change windows require more lead time.

### Is a longer-lived secret the safest way to avoid another outage?

No. A longer lifetime reduces rotation frequency but increases exposure if the secret is compromised. Use a credential type that does not require manual secret handling where possible, then build tested rotation and ownership for any remaining secret.

AADSTS7000222 is an expiry fact, not a license to rotate blindly. Prove the application, map the dependencies, add the replacement, validate each runtime, and remove only the credential you intended to retire. The best post-incident outcome is not a longer secret—it is a credential path that can rotate without a production surprise.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes)
- [Use client secrets with Microsoft.Identity.Web](https://learn.microsoft.com/en-us/entra/msidweb/authentication/client-secrets)
- [Microsoft identity platform client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Application and service-principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Add and manage application credentials](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials)
- [Microsoft Graph application addPassword](https://learn.microsoft.com/en-us/graph/api/application-addpassword?view=graph-rest-1.0)
- [Microsoft Graph application-management operations](https://learn.microsoft.com/en-us/graph/api/resources/applications-api-overview?view=graph-rest-1.0)
- [Add-MgApplicationPassword reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/add-mgapplicationpassword?view=graph-powershell-1.0)
- [Service-principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins)
- [Microsoft Entra security operations for applications](https://learn.microsoft.com/en-us/entra/architecture/security-operations-applications#application-credentials)
- [Access Microsoft Entra activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs)
- [Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)
- [Renew expiring application credentials recommendation](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/recommendation-renew-expiring-application-credential)
- [Application registration security best practices](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration)
