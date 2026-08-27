---
title: "Revoke Microsoft Entra Service Principal Tokens with CAE"
excerpt: "Learn how to revoke Microsoft Entra service principal tokens with CAE, validate cp1 support, use the right kill switch, and prove containment in logs."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-27T17:14:32-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

If a Microsoft Entra service principal is compromised, changing its secret does not make an access token already in an attacker's hands disappear. A normal bearer token can remain usable until it expires. For a CAE-capable workload calling Microsoft Graph, you have a better containment path: disable or delete the tenant's service principal, or let a high-risk event invalidate the token through Continuous Access Evaluation.

Grab a coffee, but keep the incident channel open. To **revoke a Microsoft Entra service principal token with CAE**, first prove that the token was issued for a supported single-tenant service principal, targeted Microsoft Graph, and was requested with the `cp1` client capability. Then disable the **service principal object** in the affected tenant. Microsoft Graph should reject the revoked token with `401 Unauthorized`; the client must process the claims challenge instead of replaying the same token.

This is a narrow workload-identity incident guide. It does not cover user session revocation, managed identities, multitenant SaaS applications, or arbitrary custom APIs. For the secretless credential side of the design, see the [workload identity federation guide](/posts/microsoft-entra-federated-identity-credentials-workload-identity). For user sign-in failures, use the [Conditional Access sign-in-log troubleshooting guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs).

## Revoke a Microsoft Entra service principal token: decide first

Use this short decision flow before changing production state:

1. **Identity:** Is the caller a single-tenant line-of-business service principal registered in this tenant? If not, workload-identity CAE does not cover it.
2. **Resource:** Is the token for Microsoft Graph? If not, the current documented CAE scope does not cover it.
3. **Client:** Did the token request declare `cp1`? If not, CAE cannot make that already-issued token revocable retroactively.
4. **Containment:** Can you safely disable the tenant-local service principal? If yes, use it as the reversible kill switch. If no, escalate to the application and incident owners before changing state.
5. **Risk:** Is high-risk detection part of the design? Pair it with a blocking workload-identity Conditional Access policy; otherwise, stolen credentials might obtain another token after the current token is revoked.
6. **Recovery:** Does the client process a `401` claims challenge correctly? If not, it may loop, fail closed, or keep replaying a rejected token.

Microsoft's current [CAE for workload identities documentation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation-workload) confirms the supported identity, resource, events, token behavior, monitoring path, and known limitations. The [August 25 Microsoft Entra engineering post](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/instant-revocation-of-service-principal-bearer-tokens-with-cae/4548192) demonstrates the incident-response value and was updated on August 26.

### Support state, defaults, and rollout

Microsoft's current Learn page presents workload-identity CAE as a supported, opt-in capability, but it does **not** label the feature Public Preview or Generally Available and it gives no tenant rollout schedule. The August engineering post also does not assign a preview or GA label. That absence is not permission to invent one.

Operationally, the boundaries are clear:

- it is **not default-on** for an application; the client must declare `cp1`
- it is **not mandatory enforcement** across the tenant
- it is **not a general bearer-token revocation API**
- Microsoft Graph is the only documented resource provider for workload-identity CAE
- managed identities, third-party SaaS, and multitenant applications are outside the documented scope

Treat the feature as available only inside those published boundaries. Confirm behavior with a nonproduction service principal before making it part of your incident runbook, and recheck the Learn page for release-state or scope changes during each rollout review.

## The control plane: app object, service principal, token, resource

A service principal is the tenant-local security identity for an application. The application object is the blueprint; the service principal is the concrete object whose permissions and access policy apply in a particular tenant. Microsoft explains that distinction in its [application and service-principal object model](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals).

For a supported CAE flow, the workload sends a client-credentials token request with `cp1` to Microsoft Entra ID. Entra issues a CAE-enabled app-only access token with a lifetime of up to 24 hours. The workload presents it to Microsoft Graph, which evaluates supported revocation events and policy changes before returning Graph data.

If Entra signals that the service principal was disabled, deleted, or reached high risk, Microsoft Graph rejects the CAE token and returns a `401` claims challenge. The client must take that response back through token acquisition so Entra can evaluate the current state. Microsoft's workload CAE page documents the six-stage flow and the three supported revocation events.

The longer token lifetime is deliberate. Microsoft documents workload-identity CAE tokens as valid for **up to 24 hours** because the resource can reject them before expiry when a supported event occurs. Do not treat 24 hours as a guaranteed lifetime, and never build your containment plan around decoding `exp` and waiting.

> [!NOTE]
> **Analysis:** CAE changes where the kill decision can be enforced. Without end-to-end CAE, changing a credential blocks future token acquisition but does not necessarily invalidate a bearer token already accepted by the resource. With workload-identity CAE, Microsoft Graph can reject that unexpired token after a supported event. This does not make every service-principal token revocable; it makes one documented identity-resource-client combination continuously evaluable.

## Prove that `cp1` and claims-challenge handling exist

The client opts in by adding an `access_token` claims request containing `xms_cc`, whose `values` array contains `cp1`. In compact JSON, the value is `{ "access_token": { "xms_cc": { "values": ["cp1"] } } }`.

Microsoft says an application will not receive workload CAE tokens or claims challenges unless it explicitly declares `cp1`. The same documentation warns that requesting `xms_cc` as an optional token claim is a separate **resource API** action; it is not how a client opts in. The authoritative implementation details are in [claims challenges, requests, and client capabilities](https://learn.microsoft.com/en-us/entra/identity-platform/claims-challenge).

Do not stop at seeing a long-lived token or a claim in a decoder. Prove all four conditions:

1. The token request includes `cp1`.
2. The token audience is Microsoft Graph.
3. The identity is the expected tenant-local service principal, not merely the app registration with the same client ID.
4. The workload handles `401 Unauthorized` plus the `WWW-Authenticate` claims challenge by acquiring a new token.

Microsoft's [CAE application guidance](https://learn.microsoft.com/en-us/entra/identity-platform/app-resilience-continuous-access-evaluation) warns that a client which declares CAE support but does not handle the response can repeatedly retry with a token the resource has revoked. That is why `cp1` is a code change and test obligation, not an admin-center checkbox.

For a daemon using client credentials, involve the application owner. The identity team can inventory the enterprise application, permissions, policies, and logs, but the code that requests and caches the token owns the claims-challenge loop. Do not paste a production bearer token into a public decoder or incident ticket. Treat it like a password until it expires.

## Use the correct service-principal kill switch

During a confirmed incident, the reversible tenant-local action is to set the service principal's `accountEnabled` property to `false`. In the Entra admin center, the documented route is **Entra ID > Enterprise apps > All applications > [application] > Properties > Enabled for users to sign-in? > No**. Microsoft's [disable-sign-in procedure](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/disable-user-sign-in-portal) documents the required roles and the equivalent Microsoft Graph PowerShell command.

Before changing state, resolve and record both identifiers:

1. Connect with `Connect-MgGraph -Scopes "Application.ReadWrite.All"`.
2. Set the known client ID: `$appId = "00001111-aaaa-2222-bbbb-3333cccc4444"`.
3. Resolve the tenant object: `$servicePrincipal = Get-MgServicePrincipal -Filter "appId eq '$appId'"`.
4. Inspect it: `$servicePrincipal | Select-Object Id, AppId, DisplayName, AccountEnabled, ServicePrincipalType`.

Stop if the query returns zero objects, more objects than expected, the wrong tenant, or the wrong display name. The `Id` value is the **service-principal object ID**. It is not the application object ID shown on the App registrations overview.

When the incident commander has approved containment, run `Update-MgServicePrincipal -ServicePrincipalId $servicePrincipal.Id -AccountEnabled:$false`.

That syntax and property are documented in the current [Microsoft Graph service-principal update reference](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-update?view=graph-rest-1.0). Preserve the command time, operator, tenant ID, service-principal object ID, application ID, and reason in the incident record.

Do not substitute **Deactivate** on the App registrations page and assume it is the same containment event. Microsoft's [app deactivation documentation](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/deactivate-app-registration) says deactivation blocks new token issuance but existing access tokens remain valid until expiry. The Entra engineering post is more specific for workload CAE: direct service-principal disablement is the supported revocation event; deactivating the registered app is not that event.

Deleting the service principal is also a documented CAE revocation event, but it removes the tenant-local object and is a poor first response when reversible containment is available. Disable first, preserve evidence, rotate or replace credentials, review permissions and owners, and decide on deletion only after the application and incident owners understand the recovery path.

## High risk needs a blocking Conditional Access policy

Microsoft Entra ID Protection can mark a service principal high risk, and high service-principal risk is a documented CAE revocation event. That deals with the token currently in flight. It does not by itself prove that the attacker lost the credential used to ask for another token.

Pair risk with a Conditional Access policy that blocks the affected workload identity at the chosen risk levels. Microsoft's [Conditional Access for workload identities guide](https://learn.microsoft.com/en-us/entra/identity/conditional-access/workload-identity) documents the constraints:

- target the service principal directly as a workload identity
- a policy assigned to a group containing the service principal is not enforced for it
- **Block access** is the available grant control
- begin in report-only mode to inspect effect
- location and service-principal risk are supported conditions
- managed identities and multitenant or third-party SaaS apps are not covered

Workload Identities Premium is required to create or modify Conditional Access policies scoped to service principals. The Microsoft Graph action that marks a risky service principal compromised also requires Workload ID Premium, as stated in the [`confirmCompromised` v1.0 reference](https://learn.microsoft.com/en-us/graph/api/riskyserviceprincipal-confirmcompromised?view=graph-rest-1.0). These are product-entitlement facts; verify the licenses assigned to the protected workload identities before relying on risk-based containment.

The base workload CAE documentation does not state a separate SKU requirement merely for a client to declare `cp1` or for service-principal disable/delete to be recognized as a revocation event. Do not turn that documentation boundary into a licensing promise. Confirm your Microsoft agreement and tenant entitlements before production deployment.

## Prove containment with three evidence layers

One green portal banner is not enough. Keep evidence from the directory, token client, and resource.

### 1. Directory state and audit evidence

Confirm that the expected service principal now has `AccountEnabled` set to `False`. Export or retain the audit event that records the change, including initiator, target object, timestamp, and changed property. This proves the control-plane action occurred; it does not alone prove the stolen token was rejected.

### 2. Service-principal sign-in evidence

Open **Entra ID > Monitoring & health > Sign-in logs > Service principal sign-ins**. Select the relevant event and check whether **Continuous access evaluation** indicates that a CAE token was issued. Microsoft's workload CAE page documents that field and route. The broader [service-principal sign-in-log reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins) explains that events can be aggregated when principal, status, IP address, and resource match, so expand grouped rows and preserve individual timestamps.

Sign-in logs describe authentication and token acquisition. They are not a record of every Microsoft Graph API call. Filter by the service principal, resource, IP address, status, and incident window; then correlate with the application and resource evidence.

### 3. Resource and client evidence

Using an approved nonproduction probe or the application's existing telemetry, confirm that the **same previously issued token** now receives `401 Unauthorized`. Capture the `WWW-Authenticate` header without recording the bearer token. Then verify that the client does not loop with the rejected token and that a fresh token request fails while the service principal remains disabled.

Microsoft describes CAE as real-time enforcement and the engineering post demonstrates rapid rejection, but Microsoft publishes no incident-response SLO on the workload CAE page. Use a measured timestamp in your own drill; do not promise “instant” as a contractual number.

Retention is another trap. Microsoft currently retains Entra sign-in and audit data for seven days with Free and 30 days with P1 or P2; longer investigations require routing logs to storage or analytics. The [Microsoft Entra retention reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention) also notes that retention upgrades are not retroactive. Configure export before the incident, not after it.

## A safe production rollout and revocation drill

### Ring 0: inventory the eligible workloads

List single-tenant line-of-business service principals that call Microsoft Graph. Record owner, repository, authentication library, credential type, Graph application permissions, network origin, business criticality, and recovery contact. Exclude managed identities, multitenant apps, third-party SaaS, and tokens for other resources from this CAE project.

### Ring 1: make one nonproduction client CAE-correct

Update one nonproduction daemon to request `cp1` and correctly process claims challenges. Confirm normal Graph calls still succeed. Confirm the service-principal sign-in log marks the issued token for CAE. Avoid granting new broad Graph permissions merely to make the test convenient.

### Ring 2: test the reversible kill switch

Record the service principal's current state. Obtain a token through the normal application flow, make an approved benign Graph request, disable the service principal, and repeat the request with the same token. The expected result for the supported CAE path is `401 Unauthorized`. Confirm that new token acquisition is also blocked.

Re-enable only after the test owner has verified the object, credential, permissions, and dependency list. The corresponding command is `Update-MgServicePrincipal -ServicePrincipalId $servicePrincipal.Id -AccountEnabled:$true`.

For a real compromise, re-enabling is not rollback. Rotate or replace every suspect credential, remove unauthorized credentials and role grants, validate application code and infrastructure, review sign-in and audit evidence, and obtain incident-owner approval first.

### Ring 3: add Conditional Access in report-only mode

For licensed workloads, directly target a small service-principal set with the intended location or risk policy and keep it report-only while you compare expected and observed source IPs. The policy guide documents report-only evaluation in the service-principal sign-in event. Promote to On only after automation owners confirm that NAT, proxies, failover regions, and deployment agents are represented correctly.

### Ring 4: operationalize the runbook

For each protected workload, store the tenant ID, application ID, service-principal object ID, owners, dependency map, approved disable command, evidence queries, credential-rotation procedure, and re-enable authority. Run the drill after material authentication-library, hosting, Graph-permission, network, or Conditional Access changes.

## Troubleshoot workload CAE without weakening the control

- **No CAE field on the sign-in:** Check the token request and target resource. The usual causes are missing `cp1`, a non-Graph audience, or an unsupported identity type.
- **The token is rejected but the app keeps failing:** Inspect client logs and `WWW-Authenticate` handling. The workload probably does not process the claims challenge correctly.
- **Direct service-principal disable blocks new tokens but the old token still works:** Recheck identity type, resource, `cp1`, and the exact object changed. The token might be outside the current scope, or the app registration was deactivated instead of disabling the service principal.
- **High risk revokes a token, then access returns:** Check the risk-based Conditional Access policy and credential status. The attacker might be acquiring another token because no blocking policy prevents it.
- **The workload policy appears ignored:** Inspect policy targeting. A service principal included through a group is not directly targeted and the policy is not enforced for it.
- **A location policy blocks a legitimate daemon:** Compare the sign-in IP with proxy, NAT, failover, and named-location design. Entra might see a different public origin than the operator expected.
- **Evidence disappears during the investigation:** Check license retention and diagnostic settings. The logs might have aged out before export or never been routed.

Do not respond by disabling Conditional Access tenant-wide or turning off `cp1` in production before you understand the failure. To opt an application out, Microsoft says to stop sending `cp1` in future token requests. To roll back a workload-identity Conditional Access policy, disable or delete that specific policy. Those are separate controls with different security consequences.

## The incident checklist

- [ ] Confirm tenant, application ID, and service-principal object ID
- [ ] Confirm single-tenant line-of-business service principal and Microsoft Graph audience
- [ ] Confirm `cp1` was requested and the client handles claims challenges
- [ ] Preserve sign-in, audit, application, and resource evidence
- [ ] Disable the tenant-local service principal when containment is approved
- [ ] Verify the previously issued token now receives `401 Unauthorized`
- [ ] Confirm fresh token acquisition is blocked
- [ ] If risk is involved, confirm a direct blocking workload-identity CA policy exists
- [ ] Rotate or replace credentials and review permissions, owners, and infrastructure
- [ ] Re-enable only with incident-owner approval and a tested recovery plan
- [ ] Record measured enforcement time; do not assume an unpublished SLO
- [ ] Recheck Microsoft's current scope and release-state documentation before the next drill

The useful mental model is simple: `cp1` makes the client eligible, Microsoft Graph enforces the revocation signal, and the tenant-local service principal is the reversible kill switch. Miss any one of those three, and “revoke the token” becomes “wait for the token to expire.”
