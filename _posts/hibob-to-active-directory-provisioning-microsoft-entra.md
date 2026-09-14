---
title: "HiBob to Active Directory Provisioning with Microsoft Entra"
excerpt: "Deploy HiBob to Active Directory provisioning through Microsoft Entra: validate permissions, mappings, approvals, agent health, monitoring, and rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-14T17:17:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

HiBob to Active Directory provisioning is now a generally available native integration with Microsoft Entra. For a hybrid workforce, HiBob sends employee changes into a Microsoft Entra API-driven provisioning job; Entra evaluates scope and mappings; and the Microsoft Entra provisioning agent creates or updates the account in the selected Active Directory domain and organizational unit.

That is the short answer. The safe answer is to treat the connector as a new HR-to-directory control plane, not a convenient sync toggle. A bad employee scope, matching identifier, target OU, approval rule, or attribute mapping can turn one HR change into an incorrect Active Directory write.

Microsoft announced the integration's [general availability on September 14, 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/simplify-employee-identity-lifecycle-with-hibob-and-microsoft-entra/4554510). Its current [HiBob-to-Active-Directory configuration guide](https://learn.microsoft.com/en-us/entra/identity/saas-apps/hibob-to-active-directory-user-provisioning-tutorial) documents the hybrid architecture, permissions, mappings, approval queue, monitoring, and troubleshooting path. Grab a coffee before granting consent: this rollout crosses HR, identity, and Active Directory boundaries, so all three owners need to agree on what a source change is allowed to do.

## How HiBob to Active Directory provisioning works

The hybrid flow has five control points:

1. **HiBob owns the workforce event.** An HR administrator creates or changes the employee record. HiBob applies the mappings configured in its integration and creates a bulk SCIM payload.
2. **A tenant application submits the payload.** The HiBob Hybrid AD Integration app uses Microsoft Entra's API-driven inbound provisioning endpoint.
3. **Microsoft Entra evaluates the record.** The provisioning job applies its scope and maps the incoming SCIM attributes to Active Directory attributes.
4. **The provisioning agent performs the write.** The cloud service sends the create or update operation through the on-premises Microsoft Entra provisioning agent to the configured AD domain and OU.
5. **Both sides expose evidence.** The agent reports the result to Microsoft Entra provisioning logs, and HiBob queries those logs for status in its synchronization records.

Microsoft's [API-driven inbound provisioning architecture](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/inbound-provisioning-api-concepts) explains why this is different from a script that writes users directly. The partner sends workforce records, but Microsoft Entra retains the identity-processing layer: endpoint isolation, scope, mappings, target writes, and provisioning evidence.

It is also different from Microsoft Entra Connect Sync. In this design, the provisioning agent carries the inbound HR-driven operation into Active Directory. Connect Sync or Cloud Sync can then synchronize the resulting AD identity to Microsoft Entra ID. Those are consecutive flows with separate configuration, health, and evidence.

> **Analysis:** the integration does not make HiBob the Active Directory administrator. It gives a HiBob-controlled application a bounded route into a Microsoft Entra provisioning job. Your real security boundary is the combined permission grant, employee scope, target OU, attribute mapping, approval policy, and provisioning-agent access.

### Hybrid and cloud-only are separate choices

Microsoft's announcement identifies two HiBob Marketplace integrations: **Microsoft Active Directory (Hybrid)** for employees who still require on-premises identities, and a separate **Microsoft Entra ID** integration for cloud-only identities. This guide covers the documented hybrid path only.

Do not point the hybrid connector at users whose source of authority is already cloud-only. If the longer-term plan is to retire their AD dependency, use a controlled [source-of-authority conversion plan](/posts/convert-synced-microsoft-entra-user-cloud-only) rather than letting two inbound processes compete for the same user.

### Release state and rollout behavior

The native integration is **generally available**. Microsoft does not describe a tenant rollout ring, default-on behavior, mandatory enforcement date, or automatic migration from an existing HiBob connector. An administrator chooses the matching integration in HiBob Marketplace, authorizes it, defines its target and mappings, and enables the desired synchronization behavior.

This is a deployment project, not a Microsoft-enforced service change. Existing CSV jobs, scripts, identity-manager products, or partner connectors remain separate until you deliberately replace or retire them.

## Confirm roles, licensing, and agent prerequisites

Microsoft's HiBob guide lists these prerequisites:

- a HiBob tenant and permission to install and configure Bob Marketplace integrations;
- a Microsoft Entra tenant connected to the target Active Directory environment;
- a Microsoft Entra provisioning agent installed and configured for the target AD domain;
- the target domain name and OU;
- a Privileged Role Administrator or Global Administrator for the initial consent; and
- a test employee record for validating mappings and behavior.

The integration requests three Microsoft Graph application permissions:

- `Application.ReadWrite.OwnedBy`
- `SynchronizationData-User.Upload.OwnedBy`
- `ProvisioningLog.Read.All`

Read those as a control map. The application can manage applications it owns, upload workforce records to provisioning jobs it owns, and read provisioning results. Record the consenting administrator, tenant, enterprise application object, publisher verification, owners, permission set, approval, and review date. Do not leave a day-to-day Global Administrator account attached to the operating process merely because a high-privilege role was needed at consent time.

Microsoft's current [Entra licensing reference](https://learn.microsoft.com/en-us/entra/fundamentals/licensing) lists API-driven provisioning with Microsoft Entra ID P1, P2, ID Governance, or Entra Suite. The [ID Governance licensing guidance](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals#api-driven-provisioning) says you need enough subscription seats for every identity sourced through `/bulkUpload` and provisioned to AD or Entra ID. HiBob licensing and Marketplace entitlement are separate; confirm them with the HR-system owner before the pilot.

Lifecycle Workflows, Entitlement Management, and Access Reviews have their own Entra ID Governance licensing rules. The connector can populate the identity attributes those services consume, but installing the connector does not license or automatically enable downstream governance.

### Treat the provisioning agent as control-plane infrastructure

The agent can create or update identities in Active Directory, so host and operate it as a privileged control-plane component. Microsoft's current [Cloud Sync prerequisite and hardening guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-prerequisites) recommends a hardened domain-joined server, a group managed service account, restricted administration, current supported Windows Server, and multiple active agents for high availability.

Before connecting HiBob, verify:

- the agent appears **Active** in the Entra admin center;
- the Microsoft Azure AD Connect Provisioning Agent and updater services are running;
- the installed agent is on a current supported build;
- outbound connectivity, proxy, TLS inspection, and certificate-revocation checks work;
- the agent identity has only the AD permissions required for the target objects and attributes;
- the target OU exists and its inheritance is understood; and
- alert ownership and a second healthy agent are established before production scale.

Use Microsoft's [provisioning-agent installation and verification procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install) for the portal and local-service checks. A green partner connection cannot compensate for a stopped agent, broken gMSA, blocked endpoint, or incorrect OU delegation.

## Design the source-of-authority contract first

Write down which system owns every attribute before opening the configuration wizard. A practical contract includes:

- worker identifier and account-match key;
- legal and preferred name;
- employee type and status;
- start, termination, and effective dates;
- manager, department, job title, location, and cost center;
- target domain and OU selection;
- user principal name and mail-related values;
- enable, disable, rehire, and out-of-scope behavior; and
- downstream consumers such as dynamic groups, licenses, applications, address lists, and Lifecycle Workflows.

For each field, record the authoritative system, transformation, target attribute, whether blank is meaningful, whether a change needs approval, and what rollback data must be retained.

The matching identifier deserves its own design review. Microsoft's HiBob guide warns that changing an identifier or required mapping can affect user matching and updates. A collision can update the wrong account; a mutable value can create a duplicate when it changes; an empty value can produce a failed record. Use an immutable, unique worker identifier and prove new-hire, rehire, name-change, and duplicate-record behavior with synthetic employees.

### Keep lifecycle dates intact

If you plan to use Entra ID Governance Lifecycle Workflows, Microsoft tells administrators to map HiBob start and end or termination dates into Active Directory, then synchronize them to Microsoft Entra ID through Connect Sync or Cloud Sync. Validate type, time zone, empty-value behavior, and the final Entra attribute before attaching a workflow.

The site's [Lifecycle Workflows introduction](/posts/what-are-entra-lifecycle-workflows-beginners-guide) explains how those dates become joiner and leaver triggers. The [Lifecycle Workflows safety-controls guide](/posts/microsoft-entra-lifecycle-workflows-safety-controls) covers execution scope, thresholds, cancellation, quarantine, and monitoring once the attributes are trustworthy.

Do not let an HR date trigger access changes merely because it arrived successfully. First prove that the date means what the workflow assumes—for example, last working day versus benefits end date—and that future-dated, rescinded, and rehired employees behave correctly.

## Build a safe HiBob provisioning pilot

### Ring 0: inventory every current writer

Find every process that can create or change the pilot users: HR exports, PowerShell, Microsoft Identity Manager, service-desk runbooks, Entra Connect rules, Cloud Sync jobs, payroll interfaces, application-specific workflows, and delegated AD administration.

Choose one writer per attribute. Freeze or exclude overlapping automation for the pilot population. Preserve the current enterprise-application configuration, attribute mappings, AD values, OU ACLs, agent inventory, and owners. Microsoft's [provisioning configuration export guidance](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/export-import-provisioning-configuration) provides a supported way to retain mappings and schema for recovery and change comparison.

### Ring 1: isolate the target

Start with a dedicated test OU and synthetic employee records that have no production mailboxes, privileged roles, license automation, dynamic-group dependencies, or application access. In HiBob Marketplace, select **Microsoft Active Directory Hybrid**, add a clearly named connection, authorize it in the correct Entra tenant, and confirm the exact AD domain and OU.

After consent, independently inspect the enterprise application in Microsoft Entra. Match its name, object ID, owners, permissions, and provisioning configuration to the change record. A successful OAuth consent only proves that the authorization transaction completed; it does not prove the target or mappings are safe.

### Ring 2: narrow who is provisioned

Use **Who to provision** to include only the synthetic test records. Review every default and required mapping. Remove optional data you do not need, and add a custom attribute only after its AD schema, syntax, length, permissions, and downstream use are understood.

For sensitive changes, use HiBob's approval-required synchronization. Good first candidates include new-account creation, department, target OU, manager, employment status, and any field that drives downstream access. Routine low-risk fields can move to automatic synchronization later, after evidence shows the mapping and approval model work.

### Ring 3: test the lifecycle, not one happy path

Run a test matrix that includes:

- a new hire with complete valid data;
- a new hire with a missing required value;
- an update to a low-risk field;
- a department, manager, or location change that requires approval;
- a declined change;
- a future-dated change;
- an employee moved outside the configured scope;
- a termination or leave event;
- a rescinded termination and a rehire;
- a duplicate or conflicting worker identifier;
- a custom attribute with a blank or invalid value; and
- an agent or network interruption during submission.

For every case, define the expected HiBob queue state, SCIM submission, Entra provisioning action, AD result, downstream sync result, and rollback. The Microsoft announcement says employment-status changes can initiate account deactivation and other configured lifecycle processes; the setup guide does not promise one universal deletion outcome. Prove your exact offboarding behavior rather than assuming that “terminated” means disabled, moved, or deleted.

Microsoft's general provisioning engine can disable accounts that move out of scope unless the app-level behavior is changed. Review the supported [out-of-scope deletion control](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/skip-out-of-scope-deletions), but do not change it globally to make a failed pilot look successful. Decide whether scope loss represents termination, data-quality failure, or temporary exclusion in your own process.

### Ring 4: expand by business cohort

After synthetic testing, add a small real cohort whose HR partner, manager, service desk, AD administrator, and application owners are present for the change window. Expand by stable business unit or location, not an arbitrary percentage that mixes unrelated OU, naming, payroll, and access rules.

Hold each ring long enough to observe scheduled changes, approvals, failures, downstream synchronization, help-desk impact, and a complete offboarding case. Do not retire the previous process until the new connector has produced repeatable evidence for every lifecycle state it replaces.

## Monitor both the partner and Microsoft Entra evidence

Use four evidence streams:

1. **HiBob connection records:** submitted employee, trigger, prior and new values, effective date, approval decision, synchronization status, and error.
2. **Microsoft Entra provisioning logs:** source identity, action, status, provisioning steps, modified properties, target, job, and change ID.
3. **Provisioning-agent health:** active agents, installed version, Windows service state, connectivity, and agent diagnostics.
4. **Active Directory and downstream state:** target object, OU, match identifier, changed attributes, account state, Entra sync result, and any access automation triggered by those values.

Microsoft's [provisioning-log analysis guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs) identifies Reports Reader as the least-privileged directory role for tenant-wide log access. It also documents CSV and JSON downloads, Microsoft Graph access, a 30-day portal retention period for premium tenants, and Azure Monitor routing for longer retention.

Build alerts for failed or skipped records, missing expected updates, unusual create or disable volume, repeated approval backlog, agent inactivity, and a growing gap between HR effective time and completed AD write. A successful HiBob submission is not a successful AD change, and a successful AD change is not proof that downstream Entra access changed correctly.

## Troubleshoot by control-plane boundary

### The authorization or connection fails

Confirm the administrator is consenting in the intended tenant and holds Privileged Role Administrator or Global Administrator. Inspect the requested permission set and verify the target tenant is associated with the correct hybrid AD environment. If consent completed but the app is missing or owned objects cannot be managed, capture the tenant ID, application and service-principal IDs, consent time, and correlation details before retrying.

### A change remains pending

Open the HiBob integration's approval queue. Confirm that the changed field requires approval, identify the intended reviewer, and check whether the notification was delivered. Preserve the employee, trigger, old and new values, effective date, and approval decision. Do not bypass a queue by turning all changes automatic during an incident.

### The user is not created or updated

Walk the path in order:

1. Is the employee inside **Who to provision**?
2. Did HiBob build and submit the record?
3. Did the Entra job accept, skip, or fail it?
4. Which matching rule and target attribute were evaluated?
5. Is the agent active and connected?
6. Can its identity write the intended object and attribute in the target OU?
7. Did AD accept the change?
8. Did Connect Sync or Cloud Sync carry the expected result to Entra ID?

Microsoft's [inbound provisioning troubleshooting guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/inbound-provisioning-api-issues) covers expired tokens, invalid payloads, schema problems, throttling, paused jobs, and the delay between submission and log availability. Keep partner-submission errors separate from Entra-processing and AD-agent failures.

### A custom AD attribute is missing

In the **HiBob to Active Directory user provisioning** enterprise app, open **Provisioning**, **Edit provisioning**, the attribute mapping, and **Edit Active Directory attribute list**. Add the schema attribute, save, and then confirm it appears in HiBob. Validate its syntax and agent permissions with one synthetic record before adding it to a production mapping.

### The wrong account or OU changes

Stop expansion immediately. Preserve the HiBob record, Entra provisioning log and change ID, mapping version, target DN, agent, and AD evidence. Compare the match identifier and precedence, source value, target OU selection, scope, and any other writer. Do not “fix” the target manually while the same connector can submit another incorrect update.

### Records are throttled or delayed

API-driven provisioning accepts bulk payloads and processes them asynchronously. Microsoft documents tenant-level request quotas and a maximum of 50 operations per bulk request, with `429 Too Many Requests` when the quota is exceeded. HiBob owns the partner client's pacing and retry behavior; the administrator should preserve the response, request time, job ID, and affected employee set, then confirm that retries do not create duplicates or reorder effective-dated changes.

## Containment, rollback, and escalation

The Microsoft HiBob guide does not describe transactional rollback for a completed AD write. Your recovery plan therefore needs two parts:

- **Containment:** stop or narrow submissions through supported HiBob controls, hold pending approvals, and prevent scope expansion. If the partner UI does not expose a safe stop control, engage HiBob support rather than guessing at an Entra object deletion.
- **Repair:** restore the affected AD values or object state from the pre-change record, then verify downstream synchronization and access consequences. Fix the mapping or match rule before resuming.

Do not delete the enterprise application, provisioning job, or agent as a first response. Those actions can remove evidence, affect other integrations, or make recovery harder. Do not clear a provisioning watermark or restart a job unless current Microsoft or vendor guidance says the action is appropriate for the observed failure.

Escalate to HiBob when the employee scope, approval queue, partner mapping, payload submission, or synchronization record is wrong. Escalate to Microsoft when the Entra job mishandles a valid submitted payload, the owned permission path fails, provisioning logs disagree with the operation, or the agent cannot process a supported write. In either case include sanitized payload identifiers, UTC timestamps, tenant and enterprise-app IDs, job and change IDs, agent version, target domain and OU, expected versus actual attributes, and a minimal reproduction.

## HiBob to Active Directory provisioning checklist

- [ ] Confirm the native hybrid integration is the correct path; keep cloud-only users out of scope.
- [ ] Assign enough Entra P1, P2, ID Governance, or Entra Suite seats for every sourced identity.
- [ ] Verify HiBob subscription, Marketplace access, HR owner, and change authority.
- [ ] Record the consenting admin, tenant, enterprise application, owners, and three requested permissions.
- [ ] Harden the provisioning-agent servers and verify at least one independent healthy path.
- [ ] Inventory every current writer for the pilot identities and attributes.
- [ ] Define an immutable matching identifier and test collisions, name changes, and rehires.
- [ ] Record source ownership, transformation, target, blank behavior, approval, and rollback for every field.
- [ ] Use a dedicated test OU and synthetic employees first.
- [ ] Narrow **Who to provision** before authorizing automatic changes.
- [ ] Require approval for account creation and access-driving attributes during the pilot.
- [ ] Test create, update, decline, future-date, scope loss, termination, rehire, duplicate, and outage cases.
- [ ] Prove HiBob, Entra, agent, AD, and downstream evidence for every case.
- [ ] Export provisioning configuration and preserve original AD values.
- [ ] Route provisioning logs to longer retention if the audit requirement exceeds 30 days.
- [ ] Document containment, repair, partner escalation, and Microsoft escalation paths.
- [ ] Retire overlapping automation only after every lifecycle state is repeatable.

## FAQ

### Is the HiBob Microsoft Entra integration generally available?

Yes. Microsoft announced general availability on September 14, 2026. The hybrid integration is administrator-configured and is not documented as default-on or mandatory.

### Does HiBob write directly to Active Directory?

No. HiBob sends a bulk SCIM payload to a Microsoft Entra API-driven provisioning job. Microsoft Entra evaluates scope and mappings, then sends the operation through the on-premises provisioning agent to Active Directory.

### Which Microsoft Entra permissions does the integration request?

Microsoft documents `Application.ReadWrite.OwnedBy`, `SynchronizationData-User.Upload.OwnedBy`, and `ProvisioningLog.Read.All`. Privileged Role Administrator or Global Administrator is required for the initial consent described in the setup guide.

### Does the integration automatically disable terminated employees?

Microsoft's announcement says a change in employment status can initiate deactivation and configured lifecycle processes, but the setup guide does not define one universal termination result. Test and document whether your configuration disables, moves, excludes, or otherwise changes the account before using it for production offboarding.

### Can approval be required for sensitive HR changes?

Yes. HiBob supports automatic synchronization and approval-required synchronization. You can require approval for new-account creation and selected changed fields, then review the old value, new value, effective date, and employee before approving or declining the operation.

### Where should an administrator start troubleshooting?

Start with the employee's HiBob synchronization record, then follow the same record through Microsoft Entra provisioning logs, provisioning-agent health, the target AD object, and downstream Entra synchronization. The first boundary without expected evidence is the best place to investigate.

The integration is ready for production when you can prove more than “the connector is green.” You need a bounded employee scope, deterministic matching, reviewed mappings, controlled approvals, resilient agents, correlated logs, tested offboarding, reversible changes, and one accountable owner at every hop from HR to Active Directory.
