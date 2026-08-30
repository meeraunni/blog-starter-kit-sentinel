---
title: "Microsoft Entra User Insights Retirement: Migration Guide"
excerpt: "Microsoft Entra User Insights retires August 31, 2026. Replace External ID dashboards and beta Graph endpoints with supported logs before data disappears."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-30T17:05:54-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra User Insights retirement is **August 31, 2026**. After that date, the Application user activity dashboards in External ID and the Microsoft Graph `reports/userInsights/*` beta endpoints stop returning data. Microsoft says there is no end-user impact, but it also says the historical dashboard data is **not migrated automatically**.

The administrator answer is urgent but manageable: inventory every dashboard and API consumer today, route External ID sign-in and audit logs to Log Analytics, rebuild only the measures the business actually uses, and validate the replacement beside the old report while the old surface still answers.

Grab a coffee. This is not an authentication outage or a tenant-wide policy rollout. It is an observability cutover. Your customers can still sign up and sign in, but an operations team that waits can lose its familiar view of active users, application authentications, MFA activity, and the reports built on the retiring beta endpoints. Microsoft's maintained [User Insights migration guidance](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-insights#migrate-from-user-insights) and [External ID tenant overview](https://learn.microsoft.com/en-us/entra/external-id/customers/overview-customers-ciam#analyze-user-activity-and-engagement) agree on the date, scope, and replacement paths.

## Microsoft Entra User Insights retirement: what stops

The retirement applies to **Microsoft Entra External ID external tenants** and removes two related reporting surfaces:

- **Application user activity dashboards** under **Entra ID > Monitoring & health > Usage & insights**; and
- **Microsoft Graph beta endpoints** under `reports/userInsights/*`, including integrations and Power BI reports that call them.

Microsoft's current guidance says both surfaces stop returning data after August 31. This is a retirement, not a preview-to-GA transition, staged rollout, default-on change, or optional enforcement control. Microsoft does not document a tenant opt-out or rollback switch.

The customer authentication control plane is separate. User flows, application registrations, identity providers, Conditional Access, and token issuance do not depend on these dashboards for runtime decisions. That is why Microsoft describes no end-user impact. The operational impact lands on the administrators, developers, and analysts who use the retired views for:

- daily and monthly active-user trends;
- new-user growth by application;
- authentication volume and location trends;
- MFA registration, success, failure, and telecom signals; or
- custom reports built from the beta User Insights API.

> [!IMPORTANT]
> Microsoft says historical User Insights data is not migrated automatically. A diagnostic setting created now begins collecting supported activity logs going forward; it does not reconstruct expired dashboard history.

## The replacement is raw evidence, not a renamed dashboard

Microsoft recommends **Azure Monitor with Log Analytics** as the primary replacement. The supported design routes activity logs from the external tenant into a Log Analytics workspace associated with an Azure subscription in a workforce tenant. Workbooks, KQL, Power BI, or Microsoft Sentinel can then consume the workspace.

The alternative is to query the Microsoft Graph v1.0 activity-log APIs directly:

- `GET /auditLogs/signIns` for sign-in activity; and
- `GET /auditLogs/directoryAudits` for directory audit activity.

Microsoft documents `AuditLog.Read.All` as the least-privileged delegated or application permission for both APIs. A delegated caller also needs a supported Entra role. [The sign-ins API reference](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0) recommends filtering by a bounded time range to avoid timeouts, returns at most 1,000 records per page, and exposes only events still inside Entra's default retention window. [The directory-audit API reference](https://learn.microsoft.com/en-us/graph/api/directoryaudit-list?view=graph-rest-1.0) documents the matching audit endpoint and permission model.

This replacement is not one-to-one. User Insights gave you pre-aggregated product metrics. Activity logs give you event evidence with a documented schema. You now own the definitions, deduplication, retention, visualizations, and alert thresholds.

> [!NOTE]
> **Analysis:** write a metric contract before writing KQL. Define what counts as an active user, an authentication, a failure, and an MFA event; identify the stable application ID; state the time zone; and record exclusions. Otherwise two correct queries can produce different numbers while answering different questions.

## Map each old use case to supported telemetry

Do not attempt to clone every retired chart automatically. Start with the business question and choose the narrowest supported evidence.

**Daily or monthly active users:** use successful interactive events in `SigninLogs`, group by the stable `AppId`, and count distinct `UserId` values over a declared window. Keep `AppDisplayName` for readability, not identity.

**Authentication volume and failure rate:** use `SigninLogs`, deduplicate records that share a `CorrelationId`, separate `ResultType == "0"` from failures, and retain `ResultDescription` for investigation. Microsoft's [SigninLogs schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs) documents these fields and states that zero represents success.

**MFA usage:** use the sign-in record's Authentication Details and overall result. Microsoft's [sign-in activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details) warns that `AuthenticationRequirement` can describe the stage reached rather than a completed prompt, and that Azure Monitor can contain multiple records with the same correlation ID for one MFA sign-in. Do not call every `multiFactorAuthentication` record a successful MFA challenge.

**New accounts and directory changes:** use `AuditLogs` and validate the operation names produced in your tenant before building a long-lived query. The [AuditLogs table reference](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/auditlogs) documents `OperationName`, `Result`, `ResultReason`, `TargetResources`, and `TimeGenerated`. External ID sign-up logs can add sign-up-stage detail, but Microsoft currently labels that log type **preview**. Do not make a preview-only dataset the sole source for a mandatory production control.

**Dashboards and trend reporting:** use Azure Monitor workbooks, Power BI against the workspace, or your existing analytics platform. Use Microsoft Graph directly when an application needs the event feed but not long-term analytical storage.

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is a useful companion when you need to turn one of those aggregate failures into a request-level investigation.

## Build the External ID monitoring path

External tenants need a slightly different Azure Monitor setup from workforce tenants. Microsoft says an external tenant cannot have its own associated Azure subscription, so the setup authenticates to a subscription through a workforce tenant and uses Azure Lighthouse to grant selected external-tenant identities access to the workspace.

Microsoft's [Azure Monitor setup for external tenants](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-azure-monitor) lists these prerequisites:

- an Azure subscription;
- an account with the Azure RBAC **Owner** role on that subscription; and
- an account in the external tenant assigned **Security Administrator** or **Application Administrator**.

In the external tenant, open **Entra ID > Monitoring & health > Diagnostic settings** and start the setup wizard. Select or create the workforce-tenant subscription, resource group, and Log Analytics workspace. Then choose the external-tenant users or groups that need workspace access and assign the smallest Azure role that supports their task.

After the workspace relationship exists:

1. add a diagnostic setting in the external tenant;
2. select the log categories needed for the approved metrics;
3. choose the Log Analytics workspace as the destination;
4. save the setting; and
5. prove new records arrive before changing any report connection.

At minimum, a User Insights replacement normally needs interactive sign-in and audit data. Add other categories only when a documented use case consumes them. Microsoft's [diagnostic-log category reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-diagnostic-settings-logs-options) distinguishes `SignInLogs`, `AuditLogs`, and the separate non-interactive, service-principal, and managed-identity streams.

Treat the workspace as identity data. Microsoft's external-tenant monitoring guide explicitly warns that exported logs can contain personal data. Scope workspace access, document the processing purpose, choose an appropriate region, and apply your organization's retention and deletion controls.

## Start with a transparent active-user query

The following KQL is a **starting point**, not a Microsoft-provided clone of User Insights. It calculates successful distinct interactive users and deduplicated sign-in outcomes per application and UTC day. Validate it against representative events and your own metric contract before putting it on an executive dashboard.

```kql
SigninLogs
| where TimeGenerated > ago(30d)
| where IsInteractive == true
| extend EventKey = iff(
    isempty(CorrelationId),
    Id,
    CorrelationId
)
| summarize arg_max(
    TimeGenerated,
    *
) by EventKey
| summarize
    ActiveUsers = dcountif(
        UserId,
        ResultType == "0"
    ),
    SuccessfulSignIns = countif(
        ResultType == "0"
    ),
    FailedSignIns = countif(
        ResultType != "0"
    )
    by
        AppId,
        AppDisplayName,
        bin(TimeGenerated, 1d)
| order by TimeGenerated desc
```

Why the shape matters:

- `AppId` is the stable grouping key; display names can change.
- `UserId` avoids treating a renamed sign-in identifier as a new person.
- `IsInteractive` keeps background token activity out of an interactive-user measure.
- `EventKey` uses the record ID when a correlation ID is empty, then reduces repeated records sharing a correlation ID; and
- `ResultType` separates overall success from failure without guessing from the human-readable message.

Do not silently change a monthly active-user definition by switching from interactive users to every token event. If the old dashboard's exact calculation is not publicly documented, label the new measure as a replacement definition and preserve the query version with the report.

For MFA, begin with a diagnostic view rather than an executive percentage:

```kql
SigninLogs
| where TimeGenerated > ago(7d)
| where IsInteractive == true
| where AuthenticationRequirement
    == "multiFactorAuthentication"
| extend EventKey = iff(
    isempty(CorrelationId),
    Id,
    CorrelationId
)
| summarize arg_max(
    TimeGenerated,
    *
) by EventKey
| project
    TimeGenerated,
    AppId,
    AppDisplayName,
    UserId,
    ResultType,
    ResultDescription,
    AuthenticationMethodsUsed,
    AuthenticationDetails,
    CorrelationId
| order by TimeGenerated desc
```

This identifies sign-ins whose highest recorded requirement was MFA and preserves the evidence needed to interpret them. It does **not** claim that each row represents a fresh MFA prompt or a successfully completed second factor. For deeper method interpretation, use the site's [Microsoft Entra backup and recovery operating model](/posts/microsoft-entra-id-backup-recovery-strategy) alongside Microsoft's live schema and retention guidance so the reporting pipeline is recoverable as well as readable.

## Retention, licensing, and cost boundaries

Do not confuse the retirement date with the amount of source history still available.

Microsoft's [current Entra retention policy](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention) says External ID Basic activity logs are retained in Entra for **seven days**. It recommends Azure Monitor when an external tenant needs longer retention. A later license or monitoring change is not retroactive; already expired activity is not recovered.

For the Log Analytics replacement, Microsoft's external-tenant setup guide documents a default retention of **30 days** and says workspace retention can be increased to **up to two years**. Longer storage and collected volume can create Azure Monitor charges. Choose retention from the operational and regulatory requirement, not from the maximum available slider.

External ID's underlying billing model remains based on monthly active users with optional add-ons, as described in the [Microsoft Entra External ID pricing and billing overview](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing). The monitoring replacement also needs an Azure subscription and has its own ingestion and retention cost model. Put both in the architecture decision record; do not assume an Entra user license alone funds the workspace.

For Graph-based replacements, the v1.0 sign-in endpoint requires `AuditLog.Read.All`, appropriate directory roles for delegated use, pagination handling, and bounded time filters. Applied Conditional Access policy details need additional role and policy-read permission. The API is a retrieval path, not archival storage; it returns only events inside Entra's default retention window.

## A safe cutover and rollback plan

There is no rollback after Microsoft retires User Insights, but you can make the report migration reversible before the deadline.

**Baseline:** list every person, app registration, service principal, Power BI dataset, scheduled job, workbook, and alert that calls `reports/userInsights/*` or depends on an Application user activity chart. Record owners and business decisions tied to each measure.

**Preserve:** retain the current report definitions, API queries, filters, time zones, screenshots or approved exports, and refresh timestamps according to your data-handling policy. This is reference evidence, not a way to keep the retired endpoint alive.

**Collect:** configure the supported log stream and confirm recent sign-in and audit events appear. Record the UTC timestamp when collection started; no earlier coverage should be implied.

**Rebuild:** implement one metric at a time. Store the KQL, semantic definition, workspace, retention period, and application identifiers with the report.

**Compare:** run old and new reports side by side while User Insights still responds. Investigate differences in population, time zone, event type, deduplication, and delayed ingestion. Do not force a numerical match by deleting unexplained events.

**Cut over:** switch consumers only after the replacement has current data, expected access controls, an owner, monitoring for ingestion gaps, and a documented support path.

**Rollback before retirement:** point users back to the old dashboard or beta endpoint while fixing the new report. **Mitigation after retirement:** keep authentication running, use current sign-in and audit views for short-window operations, repair the Azure Monitor or Graph pipeline, and disclose any visibility gap. There is no supported switch that makes the retired User Insights data return.

## Troubleshooting the migration

**The workspace is empty.** Confirm the diagnostic setting is saved in the external tenant, the intended categories are selected, the workforce subscription and workspace are still linked, and the operator can access the workspace. Check the recorded collection start time before expecting historical rows.

**The report shows more authentications than the old dashboard.** Check whether you included non-interactive events or counted multiple Azure Monitor rows that share a correlation ID. Confirm whether the old measure counted users, requests, or completed sign-ins.

**Active-user counts change after an app rename.** Group by `AppId`, not only `AppDisplayName`. Keep the display name as a label.

**The MFA chart looks implausibly high.** `AuthenticationRequirement` does not prove a new MFA prompt occurred, and one sign-in can create multiple monitor records. Inspect Authentication Details and the overall result before changing the metric.

**Graph returns an empty page or times out.** Confirm the event is inside the default retention window, apply an explicit time-range filter, follow `@odata.nextLink`, and check `AuditLog.Read.All`. Microsoft's activity-log access guidance also recommends smaller date chunks when queries encounter throttling or empty results.

**KQL works in one tenant but not another.** Verify that the same diagnostic categories and table collection modes are enabled. Inspect actual schema values before assuming operation names or optional fields are identical.

**Power BI still calls the beta API.** Update the data source, credential, pagination logic, and semantic model. Removing the old Graph permission from an app registration is a cleanup step only after no production report depends on it.

## Administrator checklist

- [ ] Confirm this is an External ID external tenant, not a workforce-only reporting scenario.
- [ ] Inventory the Application user activity dashboards people actually use.
- [ ] Search code, app registrations, Power BI, and scheduled jobs for `reports/userInsights`.
- [ ] Record each metric's owner, definition, filter, time zone, and decision purpose.
- [ ] Preserve approved report evidence before August 31.
- [ ] Choose Azure Monitor or Microsoft Graph v1.0 for each supported replacement.
- [ ] Assign only the documented Azure and Entra roles needed for setup and access.
- [ ] Route the required sign-in and audit categories to the workspace.
- [ ] Record when collection begins and do not imply earlier coverage.
- [ ] Validate `SigninLogs` and `AuditLogs` against representative tenant events.
- [ ] Deduplicate sign-in records where the metric requires request-level counts.
- [ ] Treat MFA requirements, prompts, methods, and overall results as separate facts.
- [ ] Set retention deliberately and estimate ingestion and storage cost.
- [ ] Run old and new reports side by side while the old surface still responds.
- [ ] Add monitoring for ingestion gaps, query failures, and Graph pagination failures.
- [ ] Remove retired beta permissions and connections only after cutover is proven.
- [ ] Document the visibility gap and escalation evidence if collection starts late.

The clean operating model is this: **User Insights was a product-owned aggregation; the replacement is an administrator-owned telemetry pipeline**. Preserve what you can, collect supported evidence now, write down the metric definitions, and make the new report honest about where its history begins.

## References

- [Migrate from User Insights — Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-insights#migrate-from-user-insights)
- [External tenant overview and retirement notice — Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/overview-customers-ciam#analyze-user-activity-and-engagement)
- [Set up Azure Monitor in external tenants — Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-azure-monitor)
- [Integrate Microsoft Entra logs with Azure Monitor — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-integrate-activity-logs-with-azure-monitor-logs)
- [Microsoft Graph list signIns — Microsoft Learn](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0)
- [Microsoft Graph list directoryAudits — Microsoft Learn](https://learn.microsoft.com/en-us/graph/api/directoryaudit-list?view=graph-rest-1.0)
- [SigninLogs table reference — Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs)
- [AuditLogs table reference — Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/auditlogs)
- [Microsoft Entra data retention — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)
