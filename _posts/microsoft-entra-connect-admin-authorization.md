---
title: "Microsoft Entra Connect Admin Authorization: Prep Guide"
excerpt: "Prepare for Microsoft Entra Connect admin authorization: map interactive prompts, fix unattended runbooks, stage changes, audit results, and recover safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-25T09:33:24-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra Connect admin authorization** is changing so that an authorized cloud administrator must sign in interactively and approve configuration changes made through the Connect wizard or PowerShell. Scheduled synchronization is not becoming an interactive job. The human approval protects changes to the sync control plane; the connector identity still performs routine imports and exports after the approved configuration is in place.

The preparation work is straightforward: update every Connect Sync server to the current supported release, identify scripts that change cloud configuration, give the change operator the exact local and Microsoft Entra roles the task requires, preserve the current configuration, and test the real change through an interactive session. Do not try to preserve unattended configuration writes by storing an administrator password or bypassing the prompt.

Grab a coffee before editing a runbook. Microsoft describes this as an **upcoming change**, not a completed global rollout, and its public announcement does not give a universal enforcement date or tenant ring. At the same time, version 2.6.91.0 already changed several cloud-configuration cmdlets so that omitting `-AADUserName` opens an interactive prompt. Treat prompt behavior as build- and operation-specific until Microsoft publishes a broader schedule. ([Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#may-2026), [Microsoft Entra Connect version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history))

## Microsoft Entra Connect admin authorization: what changes

Microsoft says configuration changes that enable or disable sync features will require verified administrator sign-in. The announced boundary includes:

- Microsoft Entra Connect installation and configuration wizard flows;
- PowerShell paths that change cloud-backed sync settings; and
- uninstall workflows that make a cloud-side change, such as converting the tenant to cloud-only synchronization.

The announcement says delegated administrator tokens will authorize the cloud write. It also says synchronization behavior and the end-user experience do not change merely because this approval boundary is added. A running scheduler does not wait for a human every 30 minutes. ([Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#may-2026))

Version 2.6.91.0, released September 16, 2026, provides the clearest current implementation evidence. Microsoft names five cmdlets that derive a sign-in hint from connector configuration and open an interactive prompt when `-AADUserName` is omitted:

- `Set-ADSyncAADCompanyFeature`
- `Set-ADSyncAADPasswordSyncState`
- `Enable-ADSyncExportDeletionThreshold`
- `Set-ADSyncScheduler`
- `Set-ADSyncDirSyncConfiguration`

That list is evidence for those cmdlets on that release; it is not a promise that every local ADSync command behaves identically. Recheck the live version notes before each change window.

At publication time, Microsoft lists **2.6.92.0** as the current hotfix release and recommends upgrading because it includes security fixes. It also repairs a 2.6.91.0 failure when the wizard enables Pass-through Authentication and registers the local authentication agent. Do not design the authorization pilot around the superseded build simply because it introduced the prompt behavior. ([Microsoft Entra Connect version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history))

## Keep the three identities separate

Most bad runbooks collapse three different security boundaries into “the Connect account.” They are not the same.

- **Interactive Microsoft Entra administrator:** authorizes a cloud-backed configuration decision. The operator signs in and approves the change with an authorized role.
- **Local server, ADSync, and SQL permissions:** authorize use of the wizard and changes to the local engine or database. These rights remain necessary; cloud sign-in does not replace them.
- **Microsoft Entra connector identity:** performs ongoing directory synchronization. Scheduled sync continues with its configured service account or application identity.

The interactive administrator is the accountable human making a control-plane decision. The connector identity is the nonhuman identity that carries approved directory changes during normal operation. Local Administrator, `ADSyncAdmins`, and database permissions control what the operator can do on the server. Success at one boundary does not prove success at the others.

Microsoft's current account reference uses **Hybrid Identity Administrator** for the normal Connect configuration path and documents local Administrator plus the appropriate AD DS and SQL permissions for installation or upgrade. Particular features can require a higher role; use the role named by the current procedure for the exact task rather than granting Global Administrator by habit. ([Connect accounts and permissions](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-accounts-permissions))

The connector identity deserves a separate migration plan. Microsoft requires Connect Sync 2.6.84.0 or later with application-based authentication by April 7, 2027, but that retirement deadline does not replace the interactive administrator requirement. Microsoft's [current Connect upgrade guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-upgrade-previous-version) documents the deadline and failure boundary. The site's [Microsoft Entra Connect application-based authentication guide](/posts/microsoft-entra-connect-application-based-authentication) covers the connector certificate, ownership, rotation, and deadline. This guide covers the human approval path.

## Decide which runbooks are affected

Inventory automation by effect, not by filename. A script called `health-check.ps1` can change state; a script called `sync.ps1` might only start an already-approved cycle.

| Runbook behavior | Expected treatment |
| --- | --- |
| Reads version, scheduler, connector, or run-history state | Keep read-only and validate it on the current build |
| Starts an ordinary delta or initial synchronization cycle | Routine engine operation; do not add an admin credential merely because the script uses ADSync |
| Changes the scheduler, password-sync state, deletion threshold, company features, or tenant sync configuration | Put it in an attended change window and expect current or future interactive authorization |
| Opens the wizard to change domains, OUs, features, staging state, or authentication | Require an authorized operator, current configuration evidence, and post-change validation |
| Uninstalls Connect and changes the tenant to cloud-only synchronization | Treat as a high-impact cloud configuration change, not software cleanup |
| Runs under Task Scheduler, a service identity, or a CI runner and writes cloud configuration | Redesign the runbook around an explicit human approval step; do not embed an admin password |

> **Analysis:** the new boundary intentionally makes some old “automation” a controlled administrative action. Converting an unattended write into a human-approved change is not an availability regression if the write changes tenant-wide synchronization state. The safe design is to automate evidence collection and validation while keeping the authorization decision explicit.

Routine synchronization still needs monitoring. `Get-ADSyncScheduler` exposes scheduler state, and `Start-ADSyncSyncCycle` can start a supported cycle. The scheduler documentation distinguishes those engine operations from settings such as `SyncCycleEnabled`, `MaintenanceEnabled`, and the customized interval. ([Microsoft Entra Connect scheduler](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-feature-scheduler))

## Build the pre-change evidence package

For every active, staging, disaster-recovery, and powered-off Connect host, record:

- hostname, owner, installed Connect version, Windows version, and database type;
- active or staging state, scheduler state, last successful import, synchronization, and export;
- connector identity type, application ID or legacy account, and certificate state;
- connected forests, enabled features, writeback paths, domain and OU scope, and custom rules;
- pending exports, deletion threshold, normal cycle duration, and Connect Health status;
- every PowerShell runbook that imports ADSync and whether it reads or writes configuration;
- change operator, local permissions, Microsoft Entra role, authentication method, and PIM activation requirement; and
- rollback owner, stop conditions, validation objects, and Microsoft Support path.

Open **View or Export Current Configuration** and save the supported JSON export in the protected change record. Microsoft says wizard changes automatically create timestamped settings files under `%ProgramData%\AADConnect`, but PowerShell, Synchronization Service Manager, and Synchronization Rules Editor changes do **not** automatically update that export. Export on demand after those changes. Do not hand-edit the JSON; Microsoft says importing a manually edited file is unsupported. ([Import and export Connect configuration](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-import-export-config))

Also preserve pending-export counts and inspect the actual changes before the window. An authorization prompt can succeed while the configuration it approves is unsafe. Identity verification answers **who may change the setting**; it does not prove the setting is correct.

## Stage the change without assuming staging is a sandbox

A Connect server in staging mode imports and synchronizes but normally suppresses exports. That makes it valuable for comparing rules, scope, and pending changes before promotion. Microsoft supports an active-passive design and warns that only one server should actively export. ([Connect Sync staging operations](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-staging-server))

But staging mode is not an isolated tenant. Microsoft documents that scheduler configuration is stored in Microsoft Entra ID and that changes on the primary server also affect the staging server, except for `StagingModeEnabled`. A PowerShell change made “on staging” can therefore still alter shared cloud-backed state. ([Microsoft Entra Connect scheduler](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-feature-scheduler))

Use this rollout sequence:

1. **Confirm the live release.** Upgrade the intended test and production servers to the current supported build. Use the [Connect 2.6.92.0 hotfix guide](/posts/microsoft-entra-connect-2-6-92-hotfix) for the current release-specific risk and validation path.
2. **Freeze unrelated work.** Do not combine the authorization pilot with new filtering, a connector-identity migration, Cloud Sync migration, federation change, or broad rule rewrite.
3. **Activate the operator's approved role.** Use the exact role required by the task, a managed administrator workstation, and the tenant's approved phishing-resistant sign-in method where available.
4. **Export and compare configuration.** Capture the supported settings export, current scheduler output, pending exports, and recent run history before opening the wizard or executing a write cmdlet.
5. **Run the real approved change interactively.** Do not create a meaningless production change only to test the prompt. Use a scheduled, reversible configuration task with a documented expected result.
6. **Verify all three planes.** Confirm the administrator authorization completed, the intended setting changed and nothing else did, and a controlled sync produces the expected cloud result.
7. **Export again.** Preserve a post-change configuration export, diff it against the baseline, and attach the relevant local audit events.
8. **Observe one business cycle.** Monitor scheduler state, imports, sync, exports, deletion counts, password and writeback paths, and the test object's tenant result before closing the change.

If the environment needs a platform migration, plan it separately with the [Connect Sync to Cloud Sync migration guide](/posts/migrate-microsoft-entra-connect-sync-cloud-sync). Interactive authorization is not evidence that the two synchronization engines support the same scenarios.

## Audit the administrator and the outcome

Connect Sync 2.4.129.0 and later enables administrator action logging by default. Wizard, PowerShell, and Synchronization Rules Editor actions appear in the Windows **Application** log under the **Entra Connect Admin Actions** source. Microsoft recommends increasing the Application log from the Windows default 20 MB to approximately 250–500 MB so change evidence is not overwritten. ([Connect administrator audit logging](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/admin-audit-logging))

The audit table includes separate events for directory changes, Express setup, domain and OU scope, Password Hash Synchronization, sync-start state, connector accounts, authentication settings, federation, and other administrative actions. Preserve:

- the UTC change window and operator;
- the authorization error or success shown by the wizard or cmdlet;
- the exact Entra Connect Admin Actions events and affected setting;
- pre- and post-change configuration exports;
- scheduler and run-profile results;
- pending-export and accidental-delete evidence; and
- the cloud result for a named low-risk validation object.

A local event proves Connect recorded an administrative action. It does not prove every intended object reached Microsoft Entra. Conversely, a successful object export does not prove the change was authorized through the intended administrator path. Close the record only when both evidence trails agree.

## Troubleshoot the authorization boundary safely

### The cmdlet now stops for sign-in

Confirm the installed build and compare the command with the version-specific notes. If it changes cloud configuration, move it from a background task into an interactive administrator session. Preserve its input parameters and expected setting, but do not solve the prompt by storing credentials or running it under a more privileged service identity.

### The prompt opens for the wrong account or tenant

Stop before approving. Verify the Connect server, connector configuration, tenant ID, administrator account, and active role. Version 2.6.91.0 can derive a sign-in hint from connector configuration when `-AADUserName` is omitted; a hint is not proof that the selected account or tenant is correct. Record the displayed context and restart only after the mismatch is understood.

### The administrator signs in but the change is denied

Separate cloud role authorization from local execution rights. Confirm the exact Microsoft Entra role is active, then check local Administrator or `ADSyncAdmins` membership and SQL rights required by the task. Do not promote the operator to Global Administrator until the current Microsoft procedure proves the narrower role is insufficient.

### Pass-through Authentication setup fails on 2.6.91.0

Do not weaken authentication or repeatedly register agents. Microsoft documents that 2.6.91.0 can fail while the wizard registers the local Pass-through Authentication agent and that 2.6.92.0 fixes the issue. Upgrade through the approved current-release procedure, preserve the original error, and retest once. ([Microsoft Entra Connect version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history))

### The prompt succeeds but sync behavior changes unexpectedly

Stop further configuration work. Compare the pre- and post-change exports, scheduler state, scope, custom rules, pending exports, and local admin events. If the scheduler was disabled for a configuration change, re-enable it only after the intended setting and pending changes are verified. Microsoft's configuration-change guidance explicitly requires validation before resuming the scheduler. ([Change the default Connect configuration](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-change-the-configuration))

### Scheduled synchronization stops after an unrelated admin change

Interactive approval is not a reason to label the outage expected. Check the ADSync service, scheduler flags, staging mode, connector authentication, certificate state, run history, and pending exports. The public announcement says ongoing sync functionality is unchanged; investigate the actual engine, identity, or configuration failure.

## Roll back the setting, not the security control

If authorization fails before the change is committed, preserve the error and leave the configuration untouched. Fix the administrator, role, tenant, build, or interactive-session problem and retry inside the same approved scope.

If the authorized change commits but produces the wrong result:

1. stop expansion and prevent another overlapping configuration change;
2. preserve the post-change export, audit events, scheduler state, and pending exports;
3. restore the exact previous setting through the supported wizard or PowerShell path with interactive authorization;
4. run only the import, synchronization, or export steps required by that reverted setting;
5. verify the low-risk object and every affected password or writeback path; and
6. export configuration again and record the final evidence.

Do not restore an old virtual machine, enable a second active exporter, edit the exported JSON, delete the connector application, or disable the administrator-authorization protection as a shortcut. A staging-server failover is a disaster-recovery action for a failed sync host, not the first response to an authentication prompt.

## Microsoft Entra Connect admin authorization checklist

- [ ] Confirm the public announcement still labels the broader change accurately and check for a newly published enforcement date.
- [ ] Confirm the current supported Connect release; at publication time it is 2.6.92.0.
- [ ] Inventory every active, staging, recovery, and powered-off Connect server.
- [ ] Separate interactive administrator, local server, SQL, AD DS, and connector identities.
- [ ] Classify every ADSync script as read-only, routine engine operation, or configuration write.
- [ ] Remove unattended administrator-password dependencies from configuration runbooks.
- [ ] Assign and activate the exact Microsoft Entra role required by the task.
- [ ] Export current configuration and preserve scheduler, run-history, and pending-export evidence.
- [ ] Remember that staging mode does not isolate tenant-wide scheduler configuration.
- [ ] Run the actual approved change from an interactive administrator session.
- [ ] Validate administrator authorization, the configuration diff, and the tenant-side object result.
- [ ] Preserve Entra Connect Admin Actions events and increase Application-log capacity if necessary.
- [ ] Observe password, writeback, deletion-threshold, and synchronization health before closing.
- [ ] Roll back the exact setting through the same supported authorized path if validation fails.

## Frequently asked questions

### Will Microsoft Entra Connect ask for an administrator every sync cycle?

No. Microsoft says synchronization functionality is unchanged. Interactive authorization protects configuration changes; scheduled synchronization continues with the configured connector identity.

### Is this the same as application-based authentication?

No. Application-based authentication governs how the connector authenticates for ongoing synchronization. Admin authorization governs which human may approve configuration changes. A production deployment needs both boundaries designed correctly.

### When will Microsoft enforce the change for every tenant?

Microsoft's public release note calls it an upcoming change but does not publish a universal enforcement date or rollout ring. Version 2.6.91.0 already introduced interactive behavior for named cloud-configuration cmdlets. Verify the live announcement and build notes before the window.

### Can I keep a configuration script unattended by saving an admin password?

Do not do that. The announced design requires a verified administrator sign-in. Automate discovery, exports, comparisons, and validation, but keep the cloud configuration decision in an attended, auditable change workflow.

### Is a staging server safe for testing every PowerShell setting?

No. Staging mode suppresses normal exports, but Microsoft says scheduler configuration is stored in Microsoft Entra ID and is shared across servers except for staging state. Classify the setting before testing it and never assume the passive server creates a separate tenant control plane.

The operational goal is not merely “the prompt worked.” It is **the right administrator approved the right setting on the right tenant, the configuration diff is bounded, scheduled synchronization still uses the intended connector identity, and local plus tenant evidence proves the result**.
