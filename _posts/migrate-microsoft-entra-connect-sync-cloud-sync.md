---
title: "Migrate Microsoft Entra Connect Sync to Cloud Sync"
excerpt: "Migrate Microsoft Entra Connect Sync to Cloud Sync safely: pass readiness checks, validate transferred settings, activate in stages, and preserve rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-22T17:46:45-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **migrate Microsoft Entra Connect Sync to Cloud Sync**, do not start by uninstalling Connect Sync or rebuilding its configuration by hand. Upgrade the active Connect Sync server to a supported release, run Microsoft's readiness assessment, transfer only the supported configuration, validate representative objects before activation, let the tool place Connect Sync in staging mode, and keep the old installation available for the documented two-week validation period.

That is the short answer. The important boundary is eligibility: the guided migration workflow introduced in **Microsoft Entra Connect Sync 2.6.91.0** is not a universal conversion button. Microsoft's current tool supports an eligible Azure public-cloud organization with one Active Directory forest, no more than 2,000 in-scope objects, additive OU inclusion scoping, no more than 30 included containers per domain, and none of the migration-blocking features documented below.

Grab a coffee before opening the wizard. A sync-engine migration changes the component that owns identity provisioning, password flow, and writeback. The safe outcome is not “Cloud Sync says healthy.” It is **one intended writer, reconciled users and groups, intact references, proven password and writeback paths, retained rollback, and no unexplained provisioning error**.

Microsoft documents the new workflow in the [Connect Sync 2.6.91.0 release history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history#26910) and the current [guided Cloud Sync migration procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/migrate-connect-sync-cloud-sync-tool). The release is downloadable from the Microsoft Entra admin center and includes security fixes. The migration option itself appears only for organizations and Connect Sync installations eligible for the current rollout wave.

## Migrate Microsoft Entra Connect Sync to Cloud Sync: first decision

Use the guided tool only when every eligibility gate passes. A failed readiness result is a design signal, not a prompt to bypass the check.

| Your environment | Decision |
| --- | --- |
| One forest, 2,000 or fewer in-scope objects, simple additive OU inclusion, and only supported features | Evaluate the guided migration workflow |
| More than one forest, more than 2,000 objects, or more than 30 included containers in a domain | The current guided tool does not fit; keep Connect Sync and follow Microsoft's eligibility guidance |
| Custom synchronization rules, group filtering, custom UPN handling, or directory extensions | Stop; the current tool treats these as migration-blocking features |
| Device synchronization or an unsupported writeback scenario | Stop; do not trade a working hybrid function for a simpler sync engine |
| Connect Sync is already in staging mode | Run the migration from the active server; the tool cannot start from a staging server |
| Microsoft has not exposed the migration option for the tenant and installation | Do not infer eligibility from the installed version alone |
| Microsoft sent a tenant-specific migration window, but a verified blocker remains | Open a Microsoft Support request for a temporary exception before the stated tenant deadline |

Microsoft's [migration FAQ](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/cloud-sync-migration-faq) is explicit that eligibility is phased and depends on the current configuration and supported scenarios. There is no public date on which every Connect Sync tenant must use this wizard. The tool is not default-on, it does not activate Cloud Sync without an administrator completing the workflow, and a general announcement is not a substitute for a tenant-specific notification.

This intent is different from the site's [September 2026 Connect Sync upgrade guide](/posts/microsoft-entra-connect-september-2026-upgrade-guide). The upgrade guide gets every Connect server onto a safe, supported build. This guide decides whether and how an eligible environment can change synchronization platforms after that prerequisite is met.

## Understand what changes in the control plane

Connect Sync runs its synchronization engine and stores its configuration on the Windows server. Cloud Sync stores provisioning configuration in Microsoft Entra and uses a lightweight on-premises provisioning agent to query Active Directory and return changes to Microsoft's cloud provisioning service. Microsoft's [Cloud Sync architecture deep dive](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/concept-how-it-works) says the agent maintains an outbound connection, while the cloud service schedules user and group provisioning changes approximately every two minutes.

The guided tool coordinates four separate transitions:

1. **Assessment:** it reads the current Connect Sync configuration and identifies unsupported topology, scope, or feature dependencies.
2. **Preparation:** it installs or configures the Cloud Sync provisioning agent and creates the supported cloud configuration without making it the active writer.
3. **Activation:** it enables the Cloud Sync jobs, places Connect Sync in staging mode, and starts the initial Cloud Sync synchronization.
4. **Validation:** it compares aggregate counts and job state, while the administrator verifies object-level and business-function evidence.

Connect Sync in staging mode still imports and synchronizes locally, but it does not perform normal exports to Microsoft Entra ID. That preserved local calculation is the rollback boundary during validation. Cloud Sync becomes the active provisioning path.

Do not confuse identity provisioning with authentication. Password Hash Synchronization can move with the supported configuration, but Pass-through Authentication and Seamless Single Sign-On are separate hybrid authentication services. Microsoft says those services can continue after the migration and remain managed through the Connect Sync configuration wizard. The site's [hybrid Microsoft sign-in architecture guide](/posts/hybrid-microsoft-sign-in-architectures-phs-pta-federation-adfs) explains why a synchronization-engine change does not automatically change the user's sign-in authority.

> [!IMPORTANT]
> **Analysis:** a green Cloud Sync job proves that its scheduler and agent can process work. It does not prove that the correct engine owns every object, that every manager and membership reference survived, or that a password and writeback transaction reaches the intended directory.

## Prove prerequisites and feature parity before migration

Start with the current [Connect Sync versus Cloud Sync decision guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/connect-to-cloud-sync-decision-guide), not a comparison copied into an old project document. Microsoft is actively closing feature gaps, so both supported capabilities and migration-tool limits are perishable.

The guided migration tool currently requires:

- an eligible Connect Sync installation on the active server;
- Azure public cloud;
- one Active Directory forest;
- no more than 2,000 objects in the synchronized scope;
- additive OU inclusion, with no more than 30 included containers in each domain;
- a non-guest account with the **Hybrid Identity Administrator** role;
- Domain Admin credentials for every selected forest so the wizard can configure the provisioning agent's group managed service account;
- no custom synchronization rules, group filtering, custom UPN behavior, directory extensions, device synchronization, or unsupported writeback dependency; and
- an approved two-week validation period during which Connect Sync remains installed.

The tool supports transferring user synchronization, group synchronization, Password Hash Synchronization, password writeback, Exchange hybrid writeback, and supported domain and OU scoping. “Supported” is doing real work in that sentence. Inventory the configuration that actually exists rather than checking only the features the design document says should exist.

The broader [Cloud Sync prerequisites](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-prerequisites) apply to the destination agent. Microsoft recommends Windows Server 2025 or 2022, requires a domain-joined supported Windows Server with the necessary schema, runtime, credential-manager, firewall, and proxy conditions, and treats the agent host as a control-plane asset. Microsoft recommends three active agents for high availability.

Keep privilege time-bound. Use the Hybrid Identity Administrator for the cloud configuration and the required AD administrative credential for gMSA setup, then remove or deactivate temporary privilege through the organization's normal process. Do not install the agent on an ordinary management server used for email or browsing.

Basic hybrid identity synchronization is included with the Azure subscription, but migrated functions can carry their own license requirements. For example, Microsoft documents Entra ID P1 for provisioning cloud security groups back to Active Directory. Record the licenses for each enabled feature; do not turn “Cloud Sync is included” into a blanket license statement for writeback, governance, or monitoring.

## Build a migration evidence pack

Before launching the tool, export the Connect Sync configuration using Microsoft's supported import/export function. Capture the installed version, active and staging servers, scheduler state, connectors, domains, OU scope, object counts, synchronization rules, attribute flow, source anchors, sign-in model, password features, writeback selections, deletion threshold, recent run history, and Connect Health alerts.

Create a representative test set that covers more than happy-path employees:

- a standard user in every included OU;
- a user with manager and direct-report references;
- a member of small, large, and nested business groups;
- a disabled account and a recently created account;
- a user who must change a password and a user testing password writeback, when those functions are in scope;
- a mail-enabled user with expected Exchange hybrid attributes, when writeback is in scope;
- an account near a scoping boundary; and
- an object intentionally excluded from synchronization.

For each test object, preserve the AD `objectGUID`, distinguished name, expected source anchor, Microsoft Entra object ID, UPN, proxy addresses, manager, critical memberships, enabled state, and the attributes the business actually consumes. This baseline makes object-level drift visible after activation.

Count references separately from objects. A total of 1,800 users and groups can reconcile while manager links or memberships are wrong. Microsoft's general [Connect-to-Cloud-Sync migration guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/migrate-azure-ad-connect-to-cloud-sync) warns that removing OUs, domains, users, groups, contacts, or related objects from Connect Sync scope too early can export reference deletions. Keep the original scope intact until the supported workflow has completed and the references are proven.

## Run the guided migration in controlled stages

### Stage 1: update Connect Sync and freeze unrelated change

Install the current supported Connect Sync release from the Microsoft Entra admin center, following the site's existing upgrade runbook. Version 2.6.91.0 added the guided workflow, fixed several 2.6.84.0 problems, and includes security fixes. Verify the local file version and one clean synchronization cycle before treating the server as a migration source.

Freeze unrelated synchronization-rule, OU, UPN, domain, password, and writeback changes. The readiness snapshot and the activation evidence need to describe the same configuration.

### Stage 2: launch the workflow from the active server

Open the Microsoft Entra Connect wizard on the active server, select **Configure**, and then select **Transition to Cloud Sync**. Authenticate with the approved Hybrid Identity Administrator and provide the required forest credentials through the wizard.

Review every readiness result. Save the report with the change record. If the tool identifies a blocker, stop and decide whether to remediate the dependency, remain on Connect Sync, or request an exception when Microsoft has assigned a migration deadline. Do not edit the production configuration merely to make the report turn green unless the application owners have approved the functional change.

### Stage 3: review the transferred configuration before activation

The tool creates the supported Cloud Sync configuration and prepares the agent. Compare its scope and mappings with the baseline:

- selected forest, domains, and OUs;
- user and group scope;
- source-anchor behavior;
- attribute mappings;
- Password Hash Synchronization;
- password writeback;
- Exchange hybrid writeback; and
- agent health and connectivity.

Use the wizard's preactivation **Provision on Demand** check for the representative objects. Microsoft's [Cloud Sync on-demand provisioning guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/on-demand-provision) describes it as a way to validate one object and inspect the attribute flow. It is not a production export and does not validate every group member, password operation, or writeback transaction.

Stop when the destination mapping differs from the approved source. Correct the supported configuration, repeat the test, and preserve the failed and successful results.

### Stage 4: activate once, then protect the boundary

When the preactivation evidence passes, select the tool's transfer action. Microsoft says activation enables the transferred Cloud Sync configuration and jobs, places Connect Sync in staging mode, and starts the initial Cloud Sync synchronization.

Immediately verify:

- Connect Sync reports staging mode;
- the expected Cloud Sync configuration is enabled;
- the provisioning agent is active;
- only the intended Cloud Sync jobs are running;
- the initial cycle starts without quarantine; and
- no administrator has separately enabled another writer for the same object scope.

Do not uninstall Connect Sync. Do not remove its OU scope. Do not delete the old configuration. The point of the activation stage is to make the writer transition observable while the rollback path still exists.

### Stage 5: validate for two weeks before decommissioning

The migration tool compares one aggregate **Total Objects** value, Cloud Sync job health, and whether Connect Sync is in staging mode. Microsoft explicitly says that it does not automatically validate individual users, groups, memberships, or writeback operations.

Manually prove the representative set and at least one controlled operation for every enabled path:

- create and update a user in an included OU;
- disable a low-risk test identity;
- add and remove a group membership;
- change a manager relationship;
- synchronize a password hash when PHS is enabled;
- complete a password writeback when configured;
- validate the expected Exchange hybrid writeback attributes when configured; and
- verify that an excluded object remains excluded.

Review **Entra ID > Entra Connect > Cloud sync** for job status and synchronization information, then inspect the provisioning logs at object level. Search by the AD `ObjectGuid` when an object is missing or skipped. Microsoft's [Cloud Sync troubleshooting guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-troubleshoot) explains that a skipped event containing only a source ID can indicate that the object was filtered out of scope.

Keep the Connect Sync installation during Microsoft's required two-week validation period. If the wizard must wait for another Connect Sync staging cycle, close it so it releases the Connect Sync configuration mutex; the tool preserves transition state and can resume later.

## Monitor the new operating model

Cloud Sync moves useful evidence into the cloud provisioning plane, but the on-premises agent still matters. Monitor three layers:

1. **Agent:** service state, connectivity, certificate and gMSA health, CPU and memory, outbound network failures, and agent version.
2. **Provisioning job:** current cycle, last success, quarantine, object failures, scope skips, throttling, and deletion-threshold events.
3. **Directory result:** expected object state, references, password behavior, writeback, and downstream application function.

Deploy multiple agents for production high availability according to Microsoft's prerequisite guidance. The service selects an active agent; adding agents is resilience, not permission to create overlapping Cloud Sync configurations.

If an agent later reports inactive, use the site's [Cloud Sync agent inactive troubleshooting guide](/posts/microsoft-entra-cloud-sync-agent-inactive) to separate service, gMSA, network, and registration failures. Do not use a reinstall as the first diagnostic step because it can erase evidence and still leave the underlying dependency broken.

Define alerts for job quarantine, repeated object failures, stale last-success time, unexpected count changes, agent loss, and password or writeback failures. Preserve the change-window dashboard as the post-migration baseline.

## Troubleshoot migration failures without creating two writers

### The Transition option does not appear

Confirm the active server is on a supported release, the organization is eligible for the current migration wave, the server is not in staging mode, and the tenant is Azure public cloud. Version 2.6.91.0 supplies the workflow, but installed version alone does not grant tenant eligibility.

Do not hand-build an equivalent production cutover simply because the button is missing. Use the current decision guide and Microsoft Support path for the environment's topology.

### Readiness reports an unsupported feature

Map the reported feature to a real consumer. A custom rule might normalize a UPN, generate an application attribute, or suppress an unsafe export. Device synchronization might be part of hybrid join. An unsupported writeback might be the only path maintaining an on-premises dependency.

Remain on Connect Sync until the function has a supported destination or the business formally retires it. The migration FAQ says organizations that depend on a feature not yet available in Cloud Sync can continue using Connect Sync until support exists.

### Provision on Demand succeeds, but the first cycle differs

Compare the affected object's AD `objectGUID`, source anchor, OU scope, attribute mappings, and provisioning-log event. Check reference objects such as manager and group members independently. One-object testing does not exercise every reference or batch condition.

Pause expansion. Do not solve a mismatch by deleting the cloud object or clearing an immutable identifier. Preserve both engines' evidence and escalate when the join result is ambiguous.

### Cloud Sync goes into quarantine

Open the configuration's provisioning logs and identify the dominant failure. Microsoft says a job can be quarantined when most or all target calls repeatedly fail, such as an authentication or service condition. Correct the root cause, then resume or restart through the documented workflow. Do not activate Connect Sync exports at the same time merely to hide a Cloud Sync outage.

### Deletes are blocked after cutover

Cloud Sync can encounter the tenant's Microsoft Entra accidental-deletion prevention setting left by Connect Sync. Treat the threshold as a safety control. Reconcile the proposed deletions against the approved scope before changing it. Microsoft's troubleshooting guide documents the `AADCloudSyncTools` remediation path for a confirmed, expected deletion batch; never disable protection to clear an unexplained queue.

## Rollback, exception, and decommissioning

Rollback is safest before the migration is marked complete and before Connect Sync is uninstalled. Stop the change, preserve the Cloud Sync and Connect Sync evidence, identify whether Cloud Sync exported an incorrect value, and use the wizard's supported recovery path to restore the intended writer. Verify staging and active states explicitly; do not leave both engines exporting the same objects.

The rollback decision must account for changes already accepted from Cloud Sync. Re-enabling Connect Sync exports with an older calculation can overwrite newer cloud state. Compare pending exports before moving the writer boundary back.

When Microsoft has issued a tenant-specific migration window and a confirmed technical or business blocker prevents completion, open a support request for a temporary exception. Microsoft's guided-tool page asks for the tenant ID and organization, requested end date, readiness report, blocker and error evidence, business impact, attempted mitigations, and a milestone-based migration plan. An exception is reviewed individually and is not guaranteed.

After two clean weeks, complete the migration in the tool, archive the evidence, and follow Microsoft's supported Connect Sync decommissioning process. Remove obsolete credentials, monitoring, firewall rules, service accounts, software, and server records through change control. Keep the documentation needed to explain the current Cloud Sync configuration and recover its agents.

## Microsoft Entra Connect to Cloud Sync checklist

- [ ] Define the intent as a sync-engine migration, not a general identity modernization project.
- [ ] Upgrade the active Connect Sync server to the current supported release.
- [ ] Confirm the tenant and installation are eligible for the current migration wave.
- [ ] Verify Azure public cloud, one forest, 2,000-object limit, and supported OU scoping.
- [ ] Inventory custom rules, UPN logic, directory extensions, device sync, and writeback dependencies.
- [ ] Compare every required function with the current Microsoft decision guide.
- [ ] Export the Connect Sync configuration and preserve run history and alerts.
- [ ] Build a representative object and reference baseline.
- [ ] Approve Hybrid Identity Administrator and required AD privileges for the window.
- [ ] Treat the provisioning-agent host as a control-plane asset.
- [ ] Run the readiness assessment and preserve its report.
- [ ] Compare transferred scope, mappings, password, and writeback settings.
- [ ] Run Provision on Demand for representative objects before activation.
- [ ] Confirm Connect Sync enters staging mode when Cloud Sync activates.
- [ ] Reconcile aggregate totals and object-level users, groups, memberships, and managers.
- [ ] Test Password Hash Synchronization, password writeback, and Exchange hybrid writeback when enabled.
- [ ] Monitor agent, provisioning-job, and final directory evidence separately.
- [ ] Keep Connect Sync installed throughout the two-week validation period.
- [ ] Use Microsoft Support for a verified blocker tied to a tenant-specific deadline.
- [ ] Decommission only after the evidence is clean and the rollback window closes.

The migration tool removes a lot of mechanical work, but it does not remove the administrator's judgment. The durable operating model is simple: **one writer per object, current feature parity, explicit scope, object-level evidence, a tested rollback boundary, and no decommissioning until the new control plane has survived a full validation period**.
