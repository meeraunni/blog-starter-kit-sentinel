---
title: "Microsoft Entra Account Discovery: Find Orphan Accounts"
excerpt: "Use Microsoft Entra account discovery to find local, unassigned, and orphaned application accounts, validate matches, and bring access under governance safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-31T17:04:02-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra account discovery finds accounts that already exist inside a connected application, correlates them with Microsoft Entra ID users, and separates the results into **local accounts**, **unassigned users**, and **assigned users**. The safe administrator workflow is to run discovery as a read-only inventory, validate the matching attribute and every account owner, then govern or remove access through the system that actually controls the target application.

Do not read “local” as “delete.” A local account can be a departed employee, but it can also be an approved service account, a shared account, a user from another identity provider, or a perfectly valid user whose matching data is wrong. Discovery gives you evidence. It does not make the access decision for you.

Grab a coffee. Microsoft moved Account Discovery from public preview in April 2026 to **general availability in May 2026**. It is an administrator-initiated Microsoft Entra ID Governance capability, not a default-on enforcement change, automatic cleanup job, or retirement deadline. Microsoft's [current release notes identify the GA state and licensing](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---account-discovery), while its [Account Discovery operating guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery) documents the correlation model, supported connectors, portal flow, and limitations.

## Microsoft Entra account discovery: what the report proves

Account Discovery asks the target application's provisioning interface for its user accounts, then uses the enterprise application's provisioning mappings to correlate those accounts with Microsoft Entra ID. The report has three primary outcomes:

- **Local accounts** have no matching Microsoft Entra ID user. Microsoft also describes these as uncorrelated accounts. They may be orphans, service or shared accounts, identities created through another process, or data-quality failures.
- **Unassigned users** match a Microsoft Entra ID user, but that user is not assigned to the enterprise application. The target account exists outside the assignment state that Entra provisioning expects to govern.
- **Assigned users** match a Microsoft Entra ID user who is assigned to the enterprise application. These are the accounts already inside the normal provisioning control path.

Microsoft Graph represents those categories as `uncorrelated`, `correlatedNotAssigned`, and `correlatedAssigned`. A fourth Graph status, `failToCorrelate`, means the service could not evaluate the identity successfully; it is an error to investigate, not a fourth ownership category. The [Account Discovery documentation maps the portal categories to these statuses](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery#understand-correlation-statuses).

The report proves what the provisioning service could retrieve and correlate **at that run time**. It does not prove that:

- a local account is unused or malicious;
- an assigned account has the correct target-side role or entitlements;
- the application accepts only Microsoft Entra authentication;
- a user signed in recently;
- the matching attribute is authoritative; or
- deleting an Entra assignment will remove the target account safely.

That boundary matters. Account Discovery is visibility into an application's identity store, not a replacement for the application owner's access model, sign-in evidence, or a reviewed deprovisioning process.

## Confirm licensing, roles, mappings, and connector support

Microsoft documents four prerequisites for running Account Discovery:

1. Microsoft Entra ID Governance or Microsoft Entra Suite licensing.
2. An enterprise application configured for provisioning, with valid credentials and a successful test connection.
3. A **direct** matching-attribute mapping between Microsoft Entra ID and the target application.
4. Application Administrator, Cloud Application Administrator, or Hybrid Identity Administrator.

The feature uses the **first** matching attribute. Expression-based transformations are not supported for discovery correlation, and configuring several matching attributes does not make the report combine them. Confirm the first direct mapping before trusting the categories. Microsoft's [licensing reference](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-id-governance) also confirms that Microsoft Entra Suite includes the Identity Governance capabilities.

Connector support is just as important as permission. Microsoft currently lists consistently complete discovery behavior for Atlassian Cloud, generic SCIM, Salesforce, SAP Cloud Identity Services, ECMA connectors, and GitHub Enterprise Cloud subject to GitHub's SCIM limitations. It currently lists these scenarios as unsupported:

- HR provisioning for Workday, SAP SuccessFactors, and API-driven provisioning;
- ServiceNow;
- Amazon Web Services;
- Snowflake;
- cross-tenant synchronization;
- Cloud Sync; and
- group provisioning to Active Directory.

Other supported connectors can expose Account Discovery, but result completeness depends on whether the target can list users and paginate correctly. For SCIM applications, Microsoft requires the target to support the pagination behavior in RFC 7644 section 3.4.2.4. A visible **Discover identities** button is not proof that a custom connector returns every page.

## Run the first discovery as a controlled baseline

Start with one application whose owner, data model, and provisioning configuration are understood. Do not choose the largest or most privileged application as the pilot.

In the Microsoft Entra admin center:

1. Browse to **Identity > Applications > Enterprise applications**.
2. Select the application.
3. Open **Provisioning**.
4. Confirm that the credentials pass the test connection and review the attribute mappings.
5. Select **Discover identities**.

Microsoft says a report takes at least 30 minutes. A target with 250,000 accounts can take 12 hours or more, so an in-progress report is not automatically a failure. The target application's size and pagination behavior influence completion time. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery#discover-identities-in-a-target-application))

Before remediation, preserve a baseline containing:

- enterprise application display name, service principal ID, and owner;
- report ID, start and completion time, and report status;
- matching source and target attributes;
- connector type and target environment;
- counts for assigned, unassigned, local, and failed-to-correlate identities;
- target account identifier, display name, status, and imported attributes;
- correlated Entra user object ID where present; and
- the business owner, technical owner, disposition, evidence, and approval for each exception.

Keep stable IDs, not only display names or email addresses. Names and email aliases change; an account remediation record must still identify the exact directory object and target account six months later.

## Triage local, unassigned, and assigned accounts differently

### Local accounts: establish identity and purpose before cleanup

A local result means the configured correlation did not find a Microsoft Entra user. Work through these possibilities in order:

1. **Matching-data defect.** Compare the exact target value with the Entra attribute used by the first direct matching rule. Check normalization, stale aliases, reused email addresses, missing values, and duplicate target records.
2. **Legitimate nonhuman account.** Identify service, integration, emergency, or shared accounts. Record an accountable owner, purpose, permissions, credential custody, review date, and replacement plan where interactive user accounts are being used for automation.
3. **Alternate identity path.** Confirm whether another identity provider, local authentication, a partner directory, or an application-native administrator created and still governs the account.
4. **Likely orphan.** Correlate the target account with HR departure evidence, application activity, the former manager or resource owner, and any authoritative account inventory.

Only then decide to correct the match, retain the account with governance, disable it, or remove it. Use the target application's supported disable and deletion behavior. Microsoft Entra cannot safely infer whether a local account owns data, jobs, API credentials, workflows, or application records that need transfer.

### Unassigned users: resolve the control-plane gap

An unassigned result is often more actionable: the target account correlates with an Entra user, but Entra has no enterprise-application assignment for that person.

Do not mass-assign the entire bucket. First ask why the account exists. It might be a valid legacy user that should be brought under provisioning, an unauthorized direct assignment, an account governed by a different group or service principal, or a user whose access should end.

For approved users, create the correct app-role assignment or access-package assignment through the governed path. For unapproved users, remove access through the target-side control that currently grants it. If the application is moving under Entitlement Management, the site's [access-package operating guide](/posts/microsoft-entra-entitlement-management-access-packages) explains the request, approval, expiry, and assignment lifecycle that should replace ad hoc access.

Microsoft publishes an `Assign-CorrelatedUsers.ps1` helper for correlated accounts. Its documented `-DryRun` option previews changes, duplicate detection avoids recreating assignments, and `-OutputFile` writes a CSV audit trail. Run the downloaded Microsoft script in PowerShell 7.x, review it under your software-control process, use dry-run first, and approve the exact output before a write run. The [current guide documents the script and its safety parameters](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery#assign-correlated-users-to-your-enterprise-application-andor-access-packages).

### Assigned users: validate scope, not just existence

Assigned is the expected category, but it is not a certification. Confirm that the app role, group, access package, target-side permissions, and user state are still appropriate. If the application is sensitive, use an application or access-package review to recertify the approved baseline. The site's [Microsoft Entra access reviews guide](/posts/microsoft-entra-access-reviews) covers reviewer selection and auto-apply decisions.

Microsoft's application-review guidance adds an important control: the enterprise application's **User assignment required?** setting must be **Yes** for an application review to represent the population allowed through Entra assignments. If it is No, unassigned directory users can still obtain Entra-issued access, and the review cannot attest to that wider population. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/id-governance/deploy-access-reviews#plan-access-reviews-for-applications))

## Bring approved accounts under provisioning without creating drift

Account Discovery is read-only, but the remediation steps are not. An app-role assignment, access-package assignment, attribute correction, disable action, or deletion can change authentication and target-side lifecycle behavior.

Use this staged sequence. It is **analysis**, not a Microsoft rollout schedule:

**Prove the pilot.** Choose one lower-risk application. Confirm target count, pagination, first matching attribute, and owner-approved classifications.

**Fix correlation before access.** Correct data-quality defects and rerun discovery. Do not create assignments merely to hide false local results.

**Dry-run approved assignments.** Use Microsoft's helper only after reviewing the script and rules file. Save the dry-run CSV, then compare the planned users, app roles, access packages, and policies with owner approval.

**Change a small ring.** Assign a small, representative group. Confirm provisioning matched existing accounts rather than creating duplicates, and verify expected sign-in and target permissions.

**Observe an incremental cycle.** Microsoft documents that the provisioning service performs an [initial source-and-target cycle followed by incremental cycles](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works#provisioning-cycles-initial-and-incremental) using stored state. Monitor the [provisioning logs](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/check-status-user-account-provisioning) for creates, updates, skips, failures, and unexpected deprovisioning.

**Expand and certify.** Process the remaining owner-approved accounts in bounded batches, rerun Account Discovery, investigate every delta, and place the resulting assignments under access reviews or access-package lifecycle controls.

The success metric is not “zero local accounts.” A healthy application can retain documented local service accounts. The useful metric is **zero unexplained accounts**, with every retained exception owned, least-privileged, monitored, and periodically reviewed.

## Troubleshoot Microsoft Entra Account Discovery safely

### The report returns zero identities

Check the basics before concluding the application is empty:

- Is this connector on Microsoft's unsupported list?
- Does the provisioning configuration have valid credentials and a successful test connection?
- Is there one direct matching attribute, with no expression, in the first matching position?
- Can the target list users and paginate its SCIM response correctly?
- Did the report complete, or is it still running?

For a custom SCIM connector, ask the vendor to confirm RFC 7644 pagination support and compare the target's authoritative user count with the discovery count. Zero can be a connector limitation, not evidence of zero accounts.

### Nearly every account is local

Treat this as a likely correlation failure. Compare a few known users manually, inspect the first matching attribute, and verify that the target identifier is populated and unique. Do not delete the local bucket. Correct the mapping or source data, run a new report, and compare the status changes by stable account ID.

### One Entra user appears to match several target records

Stop bulk remediation. Determine whether the target has duplicate user records, aliases represented as accounts, or reused identifiers. Select the authoritative target account with the application owner and preserve any data-transfer requirement. A matching rule is not a deduplication policy.

### Users are assigned but provisioning skips them

Open the provisioning log entry and inspect its steps and skip reason. Microsoft lists scoping filters, disabled users, ineffective entitlement, mapping problems, and other configuration conditions as causes of skipped provisioning. Its [no-users-provisioned guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/application-provisioning-config-problem-no-users-provisioned) also explains that initial cycles can take from 20 minutes to several hours depending on scope.

### Automation sees different results from the portal

The Account Discovery portal experience is GA, but Microsoft currently exposes identity-correlation report retrieval through the **Microsoft Graph beta** endpoint. Microsoft explicitly says beta APIs can change and are not supported for production applications. Use the portal or exported, reviewed evidence for the production control until Microsoft publishes a supported v1.0 contract. Do not build a destructive cleanup workflow on the beta status values. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery#retrieve-results-with-microsoft-graph))

## Rollback and escalation boundaries

Running discovery does not change an account, so there is nothing to roll back from the report itself. Rollback applies to the remediation that follows.

Before each write batch, save the exact app-role assignments, access-package assignments, target account states, matching values, and owner approvals. If a batch creates unexpected target objects, removes access, or changes privileges:

1. stop the batch and preserve the provisioning logs;
2. pause further remediation without changing unrelated provisioning settings;
3. identify which writes actually completed;
4. restore only the last owner-approved assignment or target state through the supported control plane;
5. verify sign-in and target permissions for affected users; and
6. correct the mapping or scope before rerunning discovery.

Escalate to the application vendor when listing or pagination is incomplete, target identifiers are ambiguous, or the connector returns behavior that conflicts with its SCIM contract. Escalate to Microsoft when a supported connector, valid test connection, direct matching rule, and completed report still produce reproducibly incorrect correlation or missing pages. Include tenant and service principal IDs, report ID and time, sanitized example identities, connector type, target count, mapping configuration, and relevant provisioning-log correlation details.

## Administrator checklist

- [ ] Confirm Account Discovery is GA for the feature, while Graph correlation APIs remain beta.
- [ ] Verify Microsoft Entra ID Governance or Microsoft Entra Suite licensing.
- [ ] Use an approved Application Administrator, Cloud Application Administrator, or Hybrid Identity Administrator account.
- [ ] Confirm the target application has valid provisioning credentials and a successful test connection.
- [ ] Verify the first matching rule is a direct attribute mapping with no expression.
- [ ] Confirm the connector is supported and can return every page of accounts.
- [ ] Pilot one lower-risk application before privileged or high-volume targets.
- [ ] Save the report ID, time, mappings, category counts, and stable identity IDs.
- [ ] Treat every local account as unexplained until ownership and purpose are proven.
- [ ] Do not bulk-assign correlated users without an owner-approved dry run.
- [ ] Monitor provisioning logs for creates, matches, skips, failures, and deprovisioning.
- [ ] Rerun discovery after data corrections and each remediation ring.
- [ ] Put approved application access under access reviews or Entitlement Management.
- [ ] Track documented local-account exceptions with owners and review dates.
- [ ] Escalate incomplete pagination or reproducible correlation defects with report evidence.

Microsoft Entra account discovery closes a visibility gap, but it is deliberately not an automatic delete button. Use it to turn “we think Entra governs this app” into a reconciled inventory: every target account matched where possible, every exception explained, and every approved user placed inside a lifecycle the application owner can defend.
