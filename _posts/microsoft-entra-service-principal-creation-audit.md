---
title: "Microsoft Entra Service Principal Creation Audit Guide"
excerpt: "Investigate a Microsoft Entra service principal creation audit: identify the provisioning path, owning tenant, actor, permissions, risk, and response."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-14T09:04:12-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

A **Microsoft Entra service principal creation audit** should answer a precise question: why did this tenant-local application identity appear, and does its origin match an approved business or Microsoft service event? Start with the **Add service principal** audit event, then correlate its new `ServicePrincipalProvisioningType`, `SubscribedSkus`, and `AppOwnerOrganizationId` details with the actor, target object, permissions, credentials, sign-ins, and change record.

Microsoft lists these creation details as **generally available** in the [current Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---service-principal-creation-audit-logs-for-alerting--monitoring). This is a logging improvement, not a new block policy, default-on quarantine control, or proof that a service principal is safe. It makes the first classification faster; administrators still have to investigate what the object can do and whether it has been used.

Grab a coffee, but do not delete the unfamiliar enterprise application while the team is still asking what created it. A service principal can appear through application registration, consent to a multitenant app, an explicit API or administrator action, managed identity enablement, or Microsoft service provisioning. Deletion can interrupt a legitimate dependency and destroy the easiest path to its current configuration. Preserve the evidence, classify the creation path, contain only when the risk justifies it, and document the decision.

## Microsoft Entra service principal creation audit: the first decision

Use this sequence for a newly observed object:

1. **Identify the exact event.** Filter Microsoft Entra audit logs to category **ApplicationManagement** and activity **Add service principal**.
2. **Resolve the object.** Record the audit event ID, correlation ID, service principal object ID, application or client ID, display name, creation time, and result.
3. **Classify the provisioning path.** Read `ServicePrincipalProvisioningType` first. For the subscription provisioning type, inspect `SubscribedSkus`. Use `AppOwnerOrganizationId` to establish the application object's home tenant when that field exists.
4. **Resolve the initiator.** Examine `initiatedBy` and the target resources instead of treating the display name as attribution.
5. **Assess capability.** Inventory credentials, owners, delegated grants, application permissions, Microsoft Entra roles, Azure roles, assignments, and sign-in activity.
6. **Match an approved cause.** Correlate the event with consent, application onboarding, an Azure resource or managed identity deployment, a license or service-plan change, automation, or an administrator change record.
7. **Decide.** Mark the creation expected, hold it for owner validation, or contain it as suspicious. Do not make a Microsoft-owned `AppOwnerOrganizationId` or a subscription-triggered creation an automatic allow rule.

This intent is narrower than the site's [guide to revoking Microsoft Entra service principal tokens with CAE](/posts/revoke-microsoft-entra-service-principal-tokens-cae), which covers containment after compromise. It also differs from the [workload identity federation deployment guide](/posts/microsoft-entra-federated-identity-credentials-workload-identity), which removes stored credentials from approved workloads. Here, the problem is provenance: explain why the identity exists before deciding what to do with it.

## Understand the object before judging the event

Microsoft's [application and service-principal object model](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals) distinguishes the global **application object** from the tenant-local **service principal**. The application object is the blueprint in its home tenant. A service principal is the local instance used for sign-in and access in each tenant where the application is used.

That distinction explains several normal creation paths:

- registering an application creates its home-tenant service principal automatically;
- granting consent to a multitenant application creates a service principal in the consuming tenant;
- an administrator or automation can create a service principal from an application ID through Microsoft Graph, PowerShell, or Azure CLI;
- enabling a managed identity creates a service principal that represents that Azure identity; and
- a Microsoft subscription or service-plan dependency can cause just-in-time provisioning of a Microsoft service principal.

The audit event concerns the local object. `AppOwnerOrganizationId` describes the tenant that owns the backing application registration; it is not the object ID of the local service principal and not the identity of the person who approved its use. `initiatedBy` describes the actor recorded for the creation event. The permission-grant events tell you what access was added. Keep those facts separate.

> [!IMPORTANT]
> **Analysis:** provenance is necessary but not sufficient. A legitimately created service principal can later receive an unsafe credential or privileged permission. A suspiciously timed creation can also turn out to be an approved Microsoft service dependency. Alerting should prioritize the creation event, but disposition must include current privilege and subsequent activity.

## Read the three new audit details correctly

Microsoft's [service-principal creation investigation guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-view-service-principal-creation-with-audit-log-properties) documents the three details and their boundaries. Its companion [provisioning-type reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/understand-service-principal-creation-with-new-audit-log-properties) explains the enum values and the structure of `SubscribedSkus`.

- **`ServicePrincipalProvisioningType`:** identifies the provisioning mechanism, including subscription-driven creation. It does not prove that the object is trusted, approved, or low privilege.
- **`SubscribedSkus`:** identifies the subscription SKUs or service plans that made a subscription-provisioned Microsoft service principal eligible for just-in-time creation. It does not prove that the tenant intentionally enabled this exact dependency at this exact time.
- **`AppOwnerOrganizationId`:** identifies whether the backing application is homed in this tenant, a Microsoft services tenant, or another external tenant. It does not identify who initiated consent, who currently owns the local enterprise application, or whether the publisher is verified.

Microsoft currently documents these provisioning classifications:

- `defaultMicrosoft` for default eligibility or another Microsoft-managed provisioning process;
- `subscription` for commerce-based just-in-time provisioning made eligible by a subscription SKU or service plan;
- `managerApplications` when a Microsoft-managed manager application creates the object;
- `AzureResourceProvider` when an Azure resource provider creates it during service onboarding;
- `ManagedServiceIdentity` for a system-assigned or user-assigned managed identity; and
- `Other` for mechanisms outside those categories, including delegated and app-only creation flows.

Two absence rules matter. Microsoft says `SubscribedSkus` appears only for the subscription provisioning type. `AppOwnerOrganizationId` appears only when the event has a backing application object. A missing conditional field is therefore not, by itself, an ingestion failure.

There is a small but operationally important documentation inconsistency: the enum reference renders the value as lowercase `subscription`, while the companion investigation page's conditional note renders `Subscription`. Preserve the value emitted by your tenant and use case-insensitive comparison in detections until Microsoft aligns the documentation. Do not discard unknown or empty classifications; route them for review.

### Read the event in the admin center

With **Reports Reader**, **Security Reader**, **Security Administrator**, or an equivalent custom role, browse to **Entra ID > Monitoring & health > Audit logs**. Filter category to **ApplicationManagement**, activity to **Add service principal**, open the event, and expand **Additional details**.

Record the whole event before pivoting elsewhere:

- activity and result;
- event, correlation, and tenant identifiers;
- time in UTC;
- `initiatedBy.user` or `initiatedBy.app` identifiers;
- every target resource and modified property;
- the three new additional details when present; and
- the export or case location where the evidence is preserved.

Do not rely on the actor display name. Compare the actor's immutable object ID, app ID, or user principal name with your approved automation and administrator inventory. Likewise, do not resolve the target by name alone; application names are not unique security identifiers.

### Retrieve the same evidence through Microsoft Graph

Microsoft documents the v1.0 `directoryAudits` operation and the least-privileged `AuditLog.Read.All` permission for both delegated and application access. With delegated access, the signed-in identity also needs a supported Entra role such as Reports Reader, Security Reader, or Security Administrator. The documented filtered request is:

```http
GET https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?$filter=activityDisplayName eq 'Add service principal'
```

The three details are returned in the event's `additionalDetails` key-value collection. The surrounding [directoryAudit resource](https://learn.microsoft.com/en-us/graph/api/resources/directoryaudit?view=graph-rest-1.0) also exposes `activityDateTime`, `category`, `correlationId`, `initiatedBy`, `result`, and `targetResources`.

Use Graph for repeatable retrieval, not as a reason to grant a broad directory permission to an ad hoc script. Prefer a governed investigation identity, read-only permission, documented query window, protected output, and normal consent review. The Microsoft Learn activity-log schema guidance also notes that programmatic log download requires a premium license; validate the target tenant's licensing before depending on an automated collector.

## Build a Log Analytics view without losing unknown values

When `AuditLogs` is routed to Log Analytics or Microsoft Sentinel, the new fields are inside the `AdditionalDetails` dynamic array. The [official AuditLogs table reference](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/auditlogs) documents the surrounding columns. The following query keeps the raw array, turns its key-value pairs into a property bag, and exposes the documented values without discarding unexpected keys:

```kusto
AuditLogs
| where Category == "ApplicationManagement"
| where ActivityDisplayName == "Add service principal"
| mv-apply Detail = AdditionalDetails on (
    summarize DetailBag = make_bag(
        pack_dictionary(tostring(Detail.key), tostring(Detail.value))
    )
)
| extend ServicePrincipalProvisioningType = tostring(DetailBag.ServicePrincipalProvisioningType),
         SubscribedSkus = tostring(DetailBag.SubscribedSkus),
         AppOwnerOrganizationId = tostring(DetailBag.AppOwnerOrganizationId)
| project TimeGenerated,
          Result,
          CorrelationId,
          Identity,
          InitiatedBy,
          TargetResources,
          ServicePrincipalProvisioningType,
          SubscribedSkus,
          AppOwnerOrganizationId,
          AdditionalDetails
| order by TimeGenerated desc
```

Validate the field names and sample output in your workspace before turning this into an alert. Schema mappings, connector transformations, and tenant data can differ. Keeping `AdditionalDetails`, `InitiatedBy`, and `TargetResources` in the result makes a new or malformed value visible instead of silently classifying it as benign.

Microsoft's [diagnostic-settings guidance](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-configure-diagnostic-settings) says a Security Administrator can route activity logs to Log Analytics, an event hub, or storage, and that a new destination can take up to three days to begin receiving logs. Build and verify the pipeline before relying on it during an incident.

Retention is a separate design decision. Microsoft's [current retention table](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention) lists Entra audit logs at seven days for Free and 30 days for P1 or P2. Routing is required when the investigation, compliance, or detection period must be longer. An upgrade does not restore audit events that have already aged out.

## Correlate creation with permission and sign-in evidence

The creation event tells you how the object appeared. It does not tell you the object's complete effective access. Build a short timeline around the event and look for:

1. **Application creation or consent.** Was an application registered in the home tenant, or did user/admin consent instantiate a multitenant app locally?
2. **Permission grants.** Microsoft's [application-permission audit reference](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-perms-audit-logs) identifies **Add app role assignment to the service principal** for app-only access, **Add delegated permission grant**, and **Consent to application** as separate audit activities.
3. **Credentials.** Review application and service-principal credential changes. Microsoft's [application security-operations guidance](https://learn.microsoft.com/en-us/entra/architecture/security-operations-applications) recommends monitoring credentials added outside expected procedures and privileged app-role or directory-role assignments.
4. **Owners and assignments.** Identify application owners, service-principal owners, user/group assignments, and assignment-required state. Ownership is accountability and administrative capability, not proof of business approval.
5. **Sign-ins.** The [service-principal sign-in log](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins) records app-only authentication with a secret or certificate and groups rows by service principal, status, IP address, and resource. Expand grouped events to see their timestamps.
6. **Workload risk.** If licensed, review **ID Protection > Risky workload identities**. Microsoft documents suspicious sign-ins, leaked credentials, malicious applications, and anomalous service-principal activity among the available detections.
7. **External change evidence.** Match the event to the service catalog, CI/CD deployment, Azure activity record, managed-identity creation, license purchase, or Microsoft service onboarding that should have caused it.

If a sign-in fails because the enterprise application is missing, the [AADSTS700016 application-not-found guide](/posts/aadsts700016-application-not-found-microsoft-entra) helps separate a wrong tenant or client ID from a genuinely absent local service principal. Do not create another object merely to clear an error until the expected application and consent path are understood.

## Classify the service principal creation evidence

- **Likely Microsoft service provisioning:** subscription-driven creation, an expected SKU, a Microsoft-owned application, no unexpected privilege, and an approved service enablement align. Record the dependency, baseline the object, and continue monitoring.
- **Likely internal onboarding:** a tenant-owned application, known CI/CD or administrator actor, matching application registration, and approved change record align. Verify owners, credential design, permissions, and lifecycle before closing.
- **Likely multitenant SaaS consent:** an external home tenant, matching consent event, and approved vendor onboarding align. Validate the publisher, requested permissions, assignment policy, owners, and contract.
- **Likely Azure workload creation:** a known managed-identity deployment matches the Azure resource and time. Verify the Azure resource owner and role assignments, then monitor the separate managed-identity sign-in log.
- **Suspicious:** the actor is unknown, the home tenant is unexpected, privileged grants or credentials appear near creation, or unfamiliar sign-ins begin immediately. Preserve evidence, involve incident response, and use a reversible containment action.
- **Unresolved:** the provisioning value is missing or unfamiliar and no change record explains the event. Escalate for owner and Microsoft support validation; do not auto-allow or auto-delete.

These are investigation hypotheses, not Microsoft trust labels. A first-party or subscription-provisioned object can still be misconfigured. An external application can be legitimate. Make the final decision from the combined provenance, permission, credential, ownership, and activity evidence.

## Contain suspicious creation without destroying the case

When the evidence indicates active risk, stop future access at the narrowest useful boundary. Microsoft documents disabling the service principal as a response available from the Risky workload identities investigation, and its application-object guidance recommends deactivation for temporary suspension because it preserves the objects while preventing new token issuance.

Before containment, record:

- service principal and application IDs;
- current enabled state;
- owners and assignments;
- credentials and their identifiers, types, start dates, and expiry dates without exporting secret material;
- delegated and application permissions;
- Entra and Azure role assignments;
- relevant audit, sign-in, risk, and Microsoft Graph activity events; and
- business owner, dependent workload, incident number, and UTC timeline.

Then disable the tenant-local service principal if the incident owner determines that interruption is justified. Do not assume that deleting a credential revokes every token already issued. The site's [service-principal CAE containment guide](/posts/revoke-microsoft-entra-service-principal-tokens-cae) explains the current end-to-end boundaries for immediate token enforcement.

Deletion is cleanup, not first response. It can remove configuration needed to understand the blast radius and can trigger an avoidable outage if the object is legitimate. If the object must ultimately be removed, retain the investigation package and obtain the application and service owners' approval first.

## Roll out the monitoring change in stages

### Stage 1: prove collection

Confirm that **Add service principal** events reach the intended destination with `AdditionalDetails`, `InitiatedBy`, and `TargetResources` intact. Compare one portal event, one Graph response, and one Log Analytics row. Record ingestion latency and retention.

### Stage 2: observe before alerting

Run the query over the available retention period. Inventory provisioning types, common Microsoft-owned applications, approved automation actors, managed-identity patterns, external home tenants, and normal creation volume. Do not suppress a whole class merely because it is noisy.

### Stage 3: alert on review-worthy combinations

Start with high-signal combinations: unresolved provisioning type, unexpected actor, external home tenant plus privileged permission, credential addition near creation, role assignment, or sign-in before ownership is established. Route the raw event and identifiers to the responder.

### Stage 4: rehearse response

Use a nonproduction application to validate the portal, Graph, and SIEM timeline; owner lookup; permission review; sign-in pivot; reversible disable action; approval path; and recovery. This article does not claim a tenant test was performed—your own rehearsal supplies that operational evidence.

## Troubleshoot common gaps

### The new properties are missing

First check the conditional rules: `SubscribedSkus` appears only for subscription-driven provisioning, and `AppOwnerOrganizationId` requires a backing application object. Then compare the same event in the portal, Graph, and raw `AuditLogs` row. If the portal has the details but the destination does not, inspect diagnostic settings, ingestion delay, connector transformations, and the event time.

### The service principal exists but no creation event is available

Compare the object's creation time with the tenant's retention window and the date diagnostic routing began. Free audit retention is seven days; P1 and P2 retain 30 days in Entra. Routing is not retroactive. Search archived storage, the SIEM, Azure activity records, deployment logs, consent records, and change management rather than inferring an origin from the current object.

### `AppOwnerOrganizationId` points to Microsoft

Treat that as ownership evidence, not approval. Check the provisioning type, subscription detail, application ID, first-party reference material where available, enabled service or license change, permissions, actor, and sign-ins. Do not whitelist every Microsoft-owned app ID as a category.

### The actor is an application

Resolve the initiating app ID and service-principal object ID, then review its owners, credentials, permissions, sign-ins, and normal automation purpose. An automation identity can legitimately create objects, but it can also be compromised or overprivileged. The creator deserves the same investigation as the created identity.

### A consent event and creation event have different actors

Build the full timeline. Service-principal instantiation, consent, permission grants, assignments, and credential changes are distinct operations and can be logged separately. Use correlation IDs, immutable object IDs, timestamps, and target resources; do not force them into one actor narrative because their display names look related.

## Administrator checklist

- [ ] Confirm the event is **ApplicationManagement / Add service principal**.
- [ ] Preserve event ID, correlation ID, UTC time, actor, target, result, and raw additional details.
- [ ] Record the service principal object ID and application/client ID separately.
- [ ] Read `ServicePrincipalProvisioningType` before interpreting conditional fields.
- [ ] Review `SubscribedSkus` only for subscription-driven provisioning.
- [ ] Use `AppOwnerOrganizationId` as the application home tenant, not the local owner or consent actor.
- [ ] Match the event to registration, consent, managed identity, subscription, automation, or change records.
- [ ] Inventory credentials, owners, grants, Entra roles, Azure roles, assignments, and sign-ins.
- [ ] Check workload-identity risk detections when licensed.
- [ ] Preserve unknown provisioning values and route them for review.
- [ ] Validate portal, Graph, and SIEM representations before enabling an alert.
- [ ] Export logs before the seven- or 30-day tenant retention window expires.
- [ ] Disable suspicious service principals only through the incident-response decision path.
- [ ] Keep deletion out of first response; preserve the evidence and rollback path.
- [ ] Document the final classification, owner, business purpose, and monitoring disposition.

## FAQ

### Why did a service principal suddenly appear in Microsoft Entra?

Common paths include application registration, consent to a multitenant app, explicit creation by an administrator or API, managed identity enablement, and Microsoft service provisioning tied to a subscription or service plan. Use the **Add service principal** audit event and its provisioning, SKU, home-tenant, initiator, and target details to identify the actual path.

### Does `AppOwnerOrganizationId` identify who consented to the app?

No. It identifies the home tenant of the backing application registration when one exists. Use the audit event's initiator and separate consent or permission-grant events to determine who acted in the local tenant.

### Is a subscription-provisioned service principal automatically safe?

No. It explains a Microsoft-driven provisioning mechanism and the enabling SKU or service plan. You should still verify the application ID, expected service dependency, current permissions, credentials, owners, assignments, and activity.

### Can I query the new details in Microsoft Sentinel?

Yes. Route `AuditLogs` through Microsoft Entra diagnostic settings and parse the `AdditionalDetails` key-value array. Validate the raw schema in your workspace before using the query for production alerting.

### What belongs in a Microsoft support escalation?

Include the tenant ID, audit event and correlation IDs, UTC time, activity result, service principal object ID, application ID, `ServicePrincipalProvisioningType`, `SubscribedSkus`, `AppOwnerOrganizationId`, sanitized initiator and target details, portal-versus-Graph-versus-SIEM comparison, licensing, retention window, and the smallest reproducible example. Do not include secrets, access tokens, or unrelated personal data.

## Microsoft sources

- [Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---service-principal-creation-audit-logs-for-alerting--monitoring)
- [Investigate why a service principal was created](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-view-service-principal-creation-with-audit-log-properties)
- [Understand service principal provisioning types](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/understand-service-principal-creation-with-new-audit-log-properties)
- [Application and service principal objects](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [List directoryAudits with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/directoryaudit-list?view=graph-rest-1.0)
- [directoryAudit resource type](https://learn.microsoft.com/en-us/graph/api/resources/directoryaudit?view=graph-rest-1.0)
- [View application-permission activity logs](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-perms-audit-logs)
- [Microsoft Entra security operations for applications](https://learn.microsoft.com/en-us/entra/architecture/security-operations-applications)
- [Service principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins)
- [Securing workload identities with ID Protection](https://learn.microsoft.com/en-us/entra/id-protection/concept-workload-identity-risk)
- [Configure Microsoft Entra diagnostic settings](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-configure-diagnostic-settings)
- [Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)
- [AuditLogs table reference](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/auditlogs)
