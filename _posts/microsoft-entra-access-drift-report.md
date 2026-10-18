---
title: "Microsoft Entra Access Drift Report: Admin Runbook"
excerpt: "Use Microsoft Entra access drift reports to find unauthorized and missing access across governed groups and apps, remediate safely, and preserve evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-18T17:08:30-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

A **Microsoft Entra access drift report** compares what Entitlement Management says a person should have with the access that actually exists on a governed Microsoft Entra group or enterprise application. It finds two conditions: **unauthorized access**, where a direct membership or app-role assignment exists without the matching access-package assignment, and **missing access**, where an active access-package assignment exists but the expected membership or app-role assignment does not.

The short answer is to start with the report timestamp, triage unauthorized and missing access separately, verify each row against the access package and the live resource, make the smallest approved correction, and wait for the next scheduled report before declaring the drift closed. Do not convert every direct assignment into an access-package assignment merely to make the report green. Some access should be governed; some should be removed.

Microsoft documents the admin-center report as **preview** and says it currently refreshes about once a day, so the data can be up to 24 hours old. Microsoft also added preview Microsoft Graph access-drift resources in October 2026 for tenant-scale read workflows. The Graph surface remains under `/beta`, which Microsoft says is unsupported for production applications and subject to change. ([Access drift reports](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports#view-access-package-drift), [October 2026 Microsoft Graph changes](https://learn.microsoft.com/en-us/graph/whats-new-overview#october-2026-new-in-preview-only))

Grab a coffee before opening a mass-remediation ticket. A drift row is evidence of a mismatch, not proof that the resource assignment is malicious or that the access package is correct. Your job is to determine which side reflects approved intent.

## Microsoft Entra access drift report: choose the right action

Start with four decisions.

**Unauthorized access, and the user still needs it.** Confirm the business owner, role, duration, policy, and approvals. Then put the identity through an access package that contains the resource and correct role. The admin-center remediation picker is scoped to the resource's catalog and indicates which packages include that resource.

**Unauthorized access, and the user does not need it.** Remove the direct group membership or enterprise-app role assignment through the resource owner's normal change process. Do not create a governed entitlement for access nobody approved.

**Missing access, and the access-package assignment is still valid.** Reprocess the selected access-package assignment so Entitlement Management delivers the expected resource role again. Confirm the resource result; a successful submission is not the same as successful delivery.

**Missing access, but the assignment is no longer valid.** Correct or remove the stale access-package assignment instead of repeatedly recreating access. Preserve the request, approval, expiration, and removal evidence.

Microsoft's [reconciliation overview](https://learn.microsoft.com/en-us/entra/id-governance/reconciliation-overview) frames the control correctly: visibility tells you where governed intent and actual access differ; remediation or enforcement brings them back into alignment. The site's [Entitlement Management and access packages guide](/posts/microsoft-entra-entitlement-management-access-packages) explains the request, approval, assignment, review, and expiration lifecycle that the drift report is checking.

## Understand what the report compares

An access package bundles resource roles from catalogs. For the currently supported drift report, the resources are Microsoft Entra groups and enterprise applications. Entitlement Management records an access-package assignment, then delivers the corresponding group membership or application role assignment.

The report compares those two planes:

1. **Governance plane:** active access-package assignments and their expected resource roles.
2. **Resource plane:** direct group membership or enterprise-application role assignments that currently exist.

An **unauthorized** row means the resource plane contains access without the corresponding governed assignment. Common causes include a help-desk administrator adding someone directly to a group, an application owner assigning an app role in Enterprise applications, or an old manual assignment predating the package.

A **missing** row means the governance plane expects access that is absent from the resource. Common causes include manual removal, a failed delivery operation, a resource-role change, or an assignment whose status no longer reflects the live resource.

The word “unauthorized” is the report's classification, not a completed security investigation. A direct assignment might be legitimate but unmanaged. Conversely, a matching access-package assignment proves that a governance object exists; it does not prove the package policy, approval, role, or duration is still appropriate.

> **Analysis:** treat the report as a reconciliation control, not a replacement for access reviews. Drift detection asks whether delivered access matches current package intent. An [access review](/posts/microsoft-entra-access-reviews) asks whether the person should continue to have the assignment at all. Mature programs use both.

## Confirm preview, license, scope, and roles

Microsoft documents access-package drift reports as preview. They require a **Microsoft Entra ID Governance** or **Microsoft Entra Suite** add-on license. This is not a generally available, default-on enforcement control, and viewing a report does not automatically change access.

The current admin-center view supports these roles:

- Global Administrator;
- Identity Governance Administrator;
- Directory Reader;
- Reports Reader;
- Catalog Owner; and
- Catalog Reader.

Downloading the tenant-wide report is limited to Global Administrator, Identity Governance Administrator, Directory Reader, and Reports Reader. Prefer a read-only role for investigation. Use a write-capable governance or resource role only for the approved remediation window.

For delegated Microsoft Graph reads, Microsoft lists `EntitlementManagement.Read.All` as the least-privileged permission and requires the signed-in user to have access to the relevant catalog; Catalog Reader is the least-privileged Entitlement Management role. App-only reads also require the `EntitlementManagement.Read.All` application permission. A catalog role does not replace that application permission. ([List accessDriftSummary](https://learn.microsoft.com/en-us/graph/api/accessdriftsummary-list?view=graph-rest-beta))

Keep the supported boundaries visible in the runbook:

- The report covers drift between access-package assignments and **Microsoft Entra groups or enterprise applications**.
- It does not include drift in third-party target applications, Azure roles, or SharePoint sites.
- It does not include nested-group drift; it compares access-package assignments with users directly assigned to the group.
- The portal download contains drift across all catalogs in the tenant and cannot currently be scoped to one catalog.
- The page lists only resources where drift is detected. A missing resource row is not an inventory of every governed resource.

For target-side local or orphan accounts, use [Microsoft Entra Account Discovery](/posts/microsoft-entra-account-discovery-orphan-accounts). That compares discovered accounts in a connected application with Microsoft Entra identities and assignments; it is a different boundary from access-package drift inside the Entra resource plane.

## Open the report and establish evidence freshness

In the Microsoft Entra admin center, browse to **ID Governance > Access Guardian > Reports > Access Drift**. Before filtering or opening a resource, record the **Access drift data as of** timestamp.

The landing page shows the number of resources with detected drift and separates the resource table into **Groups** and **Applications**. The table exposes the resource, total drift, unauthorized access, missing access, and catalog. You can search by resource or catalog name and filter by catalog.

If the same resource belongs to more than one catalog, it appears once for each catalog. Keep the catalog identifier with the resource object ID in every ticket so two rows for the same group are not treated as duplicate noise.

For the first pass, export the tenant-wide detail file before making changes. Store it with:

- the report's data-as-of timestamp;
- the download time in UTC;
- tenant ID and operator;
- preview status and documented refresh behavior;
- resource object ID, display name, type, and catalog;
- total, unauthorized, and missing counts; and
- the approved change or incident record.

Do not use the download time as the observation time. Microsoft says the report currently refreshes about once daily and can be up to 24 hours old. The data-as-of timestamp is the evidence boundary.

## Triage drift without normalizing bad access

Select a resource to open its detail page. Microsoft groups rows into **Unauthorized access**, **Missing assignments**, and **Total drift**. The detail table includes the identity, access package, expected access-package role, current Microsoft Entra role, and drift category.

Work in this order.

### 1. Verify identity and resource

Record immutable identifiers, not display names alone: user or agent identity object ID, group or service-principal object ID, catalog ID, access-package ID, assignment ID, and role ID where available. Confirm the tenant and resource owner.

For a group, distinguish member from owner and direct membership from transitive membership. For an enterprise application, distinguish the service principal from its app registration and record the assigned app role. A similarly named role is not the same role.

### 2. Reconstruct governed intent

Open the access package and confirm that it still contains the resource and expected role. Review the assignment's policy, requestor, approval, start, expiration, and current status. Check whether the same identity receives the same resource through another active access package.

This prevents two common mistakes: removing access that another valid package still grants, and reprocessing an assignment whose package no longer represents approved design.

### 3. Verify actual access

Open the underlying group or enterprise application from the report and inspect the live assignment. For a suspicious direct grant, use the Microsoft Entra audit log to establish who changed the resource, when, and through which client or application. For a missing assignment, inspect the Entitlement Management request and fulfillment events around the expected delivery time.

Microsoft's [Entitlement Management reports and logs reference](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports) documents request, approval, fulfillment, and removal audit activities. Preserve the relevant UTC window and correlation details before remediation.

### 4. Decide which side is wrong

Ask the resource owner to choose one outcome:

- govern the direct access through a package;
- remove the direct access;
- restore missing access by reprocessing a valid assignment;
- correct or remove an invalid package assignment; or
- defer with a named owner, expiry, and risk acceptance.

Do not let the operator silently choose business entitlement. The reconciliation team supplies evidence; the resource or access owner confirms intent.

## Remediate unauthorized access safely

The portal's documented remediation for unauthorized access is to assign the identity to an access package that includes the resource. Use that path only when the access is approved and the package's policy, role, and lifecycle fit the user.

Validate before submission:

- the package is in the expected catalog;
- it contains the exact group or enterprise-application role;
- the requestor is eligible under the intended policy;
- approval, questions, separation-of-duties checks, and expiration remain appropriate;
- the new assignment will not create duplicate or incompatible access; and
- the resource owner accepts the governed lifecycle.

When the direct assignment is not approved, remove it at the resource boundary instead. For a group, remove the direct member through the approved group-management path. For an enterprise application, remove the exact app-role assignment. Preserve the before state and audit evidence first.

> **Analysis:** “assign everything to a package” can turn unauthorized access into durable governed access without fixing the underlying decision. The security objective is approved least privilege, not a zero in the drift column.

After the change, verify the live resource, the access-package assignment when one was created, and the audit record. Do not wait for the next drift refresh to confirm whether the access itself changed.

## Remediate missing access without creating a second path

For a valid assignment whose group membership or application role is missing, select the affected identities and use the documented reprocess action. Microsoft says reprocessing adds the user back to the access package's resources when the assignment is shown as Delivered but the resource access is absent. ([Reprocess access-package assignments](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reprocess-access-package-assignments))

Reprocess a small pilot first when many identities are affected. Verify:

1. the assignment still has the correct policy and active dates;
2. the package still contains the intended resource role;
3. the reprocess request is accepted;
4. Entitlement Management records fulfillment activity;
5. the direct membership or app-role assignment appears on the resource; and
6. the user's real application access works as expected.

If reprocessing fails, do not add a manual resource assignment as a shortcut. That creates the same unmanaged path the report is designed to expose. Investigate package configuration, resource state, catalog ownership, fulfillment errors, and the audit trail. Escalate with identifiers and timestamps when the governance assignment is valid but delivery continues to fail.

If the assignment is stale, expired in business terms, or tied to the wrong role, correct the governance plane. Recreating resource access would preserve the wrong entitlement.

## Use Microsoft Graph for a controlled preview inventory

The October 2026 Microsoft Graph preview adds `accessDriftSummary`, its `details` relationship, and identity and resource types for access drift. A summary represents one governed-resource and drift-source combination with counts for unauthorized and missing assignments. The current supported drift source for list filters is `entra`.

The documented summary request is:

```http
GET https://graph.microsoft.com/beta/identityGovernance/insights/accessDriftSummary?$filter=resource/type eq 'application' and driftSource eq 'entra'
```

The list API supports `$filter`, `$search`, `$top`, `$skip`, `$orderby`, `$count`, and `$expand`. Every filter must include `resource/type`. You can order by unauthorized, missing, or total drift counts, creation time, and resource properties. `$top` is limited to 1,000, or 100 when you expand details. An expanded summary includes no more than five detail rows; follow `details@odata.nextLink` when Microsoft returns it.

Use the summary ID to retrieve detail rows:

```http
GET https://graph.microsoft.com/beta/identityGovernance/insights/accessDriftSummary/{accessDriftSummary-id}/details
```

The detail API supports up to 5,000 rows per page and can search identity principal names or access-package display names. Detail records classify drift as `unauthorized`, `missing`, `inSync`, or `unknownFutureValue`, while Entra-sourced details expose the assigned and expected roles. ([List drift details](https://learn.microsoft.com/en-us/graph/api/accessdriftsummary-list-details?view=graph-rest-beta), [accessDriftDetail resource](https://learn.microsoft.com/en-us/graph/api/resources/accessdriftdetail?view=graph-rest-beta))

Treat this as a read-only preview integration:

- keep the permission at `EntitlementManagement.Read.All`;
- use a nonproduction app and a narrow catalog-aware operator where possible;
- store raw response metadata with the retrieval time;
- handle pagination and `unknownFutureValue` defensively;
- do not make automated removal or assignment decisions from drift classification alone; and
- version the parser because beta types and properties can change.

The Graph API does not make the data fresher than the service's drift snapshot. Preserve `createdDateTime` and the portal data-as-of timestamp instead of presenting API retrieval time as real-time detection.

## Build an operating cycle around the report

A practical access-drift control has four cadences.

**Daily or weekly triage:** sort by unauthorized count, then prioritize privileged, regulated, and externally exposed resources. Separate new rows from known exceptions using immutable IDs.

**Change-window remediation:** make one approved class of change at a time. Confirm live resource state and audit evidence immediately after each batch.

**Post-refresh closure:** after the next documented refresh, confirm the specific summary and detail rows changed. If the row persists, compare its `createdDateTime`, resource, role, identity, and catalog with the original; do not assume the portal is merely cached.

**Monthly control review:** analyze recurring causes. Repeated direct grants can indicate an owner workflow that bypasses Entitlement Management. Repeated missing access can indicate package design, fulfillment, or resource-lifecycle failures.

For sensitive on-premises groups provisioned from Microsoft Entra, detection might not be enough. The site's [AD group enforcement pilot guide](/posts/microsoft-entra-ad-group-enforcement-pilot-guide) covers Microsoft's separate preview control for auditing or blocking unauthorized changes at the domain-controller boundary. That is preventive reconciliation; the access-drift report is visibility and remediation for its supported cloud resource boundary.

## Troubleshoot the report by failure pattern

### The report is empty, but you know direct access exists

Confirm the resource is a governed Microsoft Entra group or enterprise application included in an access package. The report does not list unsupported resources, nested-group drift, or every resource with zero drift. Check the data-as-of timestamp and validate the direct assignment with object IDs rather than names.

For a local account inside Salesforce, SAP, or another target application, use Account Discovery instead. For Azure roles or SharePoint sites, use the relevant resource and governance evidence because the current drift report excludes them.

### The same group appears more than once

Check the Catalog column. Microsoft says a resource included in multiple catalogs appears once per catalog. Preserve both the resource ID and catalog ID; do not close one row as a duplicate without comparing the expected packages and roles.

### A remediated row remains visible

Verify the live group membership or app-role assignment first. Then verify the access-package assignment and audit record. Finally, compare the current time with the report's data-as-of timestamp. The preview report refreshes about daily and can be up to 24 hours old.

If a newer snapshot still reports the same drift, inspect whether another direct assignment, a duplicate package path, or a failed fulfillment remains. Do not label it cache delay without timestamp evidence.

### Reprocess reports success, but access is still missing

Look for the fulfillment audit event and the actual resource assignment. Reconfirm that the package contains the current resource role and the resource still exists. Preserve the assignment, package, catalog, resource, identity, UTC window, and error details for escalation. Avoid a manual grant that would hide the delivery failure.

### Unauthorized access returns after removal

Use audit logs to identify the actor and management path that recreated it. Check application-owner procedures, group-management automation, scripts, access-review decisions, and emergency-change workflows. A recurring row is usually an ownership or process problem, not a report problem.

### The Graph query returns incomplete-looking detail

Do not rely on `$expand=details` as a full export; Microsoft limits expanded details to five rows per summary. Follow the detail collection and every `@odata.nextLink`. Respect the documented `$top` limits, preserve unknown enum values, and keep the beta contract isolated from production remediation.

## Containment, rollback, and escalation

Most reconciliation changes are individually reversible, but reversal must restore approved intent rather than blindly recreate the old state.

If a direct-access removal causes an outage, confirm the incident identity, resource, and role. Use the approved emergency-access path to restore only the required access with an owner and expiry, then reconcile it into the correct package or remove it after the incident. Do not bulk-restore the entire exported drift file.

If assigning through a package grants the wrong role or duration, remove or correct that package assignment and verify the resource result. If reprocessing delivers an incorrect role, stop the batch, preserve evidence, correct the package resource role or assignment, and retest one identity.

Escalate to Microsoft when a newer drift snapshot contradicts the live governance and resource states, or when a valid assignment repeatedly fails delivery through the supported path. Include tenant ID, catalog ID, package and assignment IDs, resource type and object ID, identity object ID, expected and assigned role, drift summary and detail IDs, data-as-of and UTC failure times, remediation attempt, audit correlation data, and sanitized response errors. Never include access tokens, client secrets, private keys, or an unrestricted tenant export.

## Microsoft Entra access drift report checklist

- [ ] Confirm preview state and Microsoft Entra ID Governance or Entra Suite licensing.
- [ ] Use the least-privileged report or catalog role for investigation.
- [ ] Record the report's data-as-of timestamp before triage.
- [ ] Export the tenant-wide detail report before changes.
- [ ] Keep resource, catalog, package, assignment, role, and identity IDs together.
- [ ] Separate unauthorized access from missing access.
- [ ] Verify the package and the live resource before choosing which side to correct.
- [ ] Route legitimate access through a suitable access package.
- [ ] Remove unapproved direct access instead of manufacturing an entitlement.
- [ ] Reprocess only valid missing assignments and verify fulfillment at the resource.
- [ ] Preserve audit evidence and confirm the live result immediately.
- [ ] Wait for a newer scheduled drift snapshot before closing the report row.
- [ ] Treat nested groups, third-party apps, Azure roles, and SharePoint sites as separate evidence boundaries.
- [ ] Keep Graph beta automation read-only, paginated, and isolated from production remediation.
- [ ] Investigate recurring drift as an ownership or process defect.

## FAQ

### Does the access drift report remove unauthorized access automatically?

No. The report is a preview visibility and remediation experience. Administrators review the row and choose an appropriate action. Microsoft's documented portal remediation can assign legitimate direct access through a suitable package or reprocess a valid missing assignment; the report does not silently enforce every row.

### Is unauthorized access always malicious?

No. It means the live resource assignment lacks the corresponding access-package assignment. The grant might be legitimate but unmanaged, obsolete, mistaken, or malicious. Validate business intent and audit evidence before changing it.

### Why does the report still show yesterday's state?

Microsoft says the preview report currently refreshes about once a day and can be up to 24 hours old. Use the **Access drift data as of** timestamp to distinguish stale evidence from a failed remediation.

### Does the report find nested-group or target-application drift?

Not currently. Microsoft documents no nested-group drift and excludes third-party applications, Azure roles, and SharePoint sites. Use Account Discovery for supported target-application account reconciliation and resource-specific evidence for the other boundaries.

### Can I automate remediation with Microsoft Graph?

The new access-drift Graph resources are beta and documented for reading summaries and details. Keep automation read-only. Microsoft explicitly says beta APIs can change and are not supported for production applications; a drift row also requires a business entitlement decision that should not be inferred from the classification alone.

## Microsoft sources

- [October 2026 Microsoft Graph changes](https://learn.microsoft.com/en-us/graph/whats-new-overview#october-2026-new-in-preview-only)
- [Reconciliation overview](https://learn.microsoft.com/en-us/entra/id-governance/reconciliation-overview)
- [View reports and logs in Entitlement Management](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports#view-access-package-drift)
- [List accessDriftSummary](https://learn.microsoft.com/en-us/graph/api/accessdriftsummary-list?view=graph-rest-beta)
- [List access-drift details](https://learn.microsoft.com/en-us/graph/api/accessdriftsummary-list-details?view=graph-rest-beta)
- [accessDriftSummary resource](https://learn.microsoft.com/en-us/graph/api/resources/accessdriftsummary?view=graph-rest-beta)
- [Reprocess access-package assignments](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reprocess-access-package-assignments)
