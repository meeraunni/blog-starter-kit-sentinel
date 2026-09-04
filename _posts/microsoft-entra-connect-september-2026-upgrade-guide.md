---
title: "Microsoft Entra Connect September 2026 Upgrade Guide"
excerpt: "Prepare for the Microsoft Entra Connect September 2026 upgrade: verify every server, choose a safe method, test exports, monitor health, and recover."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-04T12:31:14-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The Microsoft Entra Connect September 2026 upgrade is mandatory for every server running Connect Sync below version **2.5.79.0**. Microsoft says all synchronization services on an older build will fail after **September 30, 2026**. Do not treat 2.5.79.0 as the recommended destination, though: it is only the service-change floor, and its support ends on October 23, 2026.

As of this article's publication on September 4, Microsoft's current downloadable release is **2.6.84.0**. It includes security fixes, while the intervening 2.6.79.0 installer was recalled. The practical answer is therefore: inventory every active, staging, and disaster-recovery server; obtain the latest installer from the Microsoft Entra admin center; use a swing migration when risk or scale justifies it; and prove imports, synchronization, exports, password features, and monitoring before closing the change.

Microsoft places the deadline at the top of its [current Connect version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history) and repeats the same date, minimum version, and outage behavior in both the [hardening notice](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/harden-update-ad-fs-pingfederate) and the [upgrade procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-upgrade-previous-version). This is a mandatory service dependency, not a preview, optional rollout, or default-setting change.

Grab a coffee and open the change calendar. This guide is about upgrading **Microsoft Entra Connect Sync** safely. It does not tell you to replace Connect Sync with Cloud Sync during the same emergency change, and it does not assume that a green installer screen proves synchronization is healthy.

## Microsoft Entra Connect September 2026 upgrade: the decision table

| Your observed state | What it means | Administrator action |
| --- | --- | --- |
| Below 2.5.79.0 | The server does not contain the required service hardening change | Upgrade to the latest available release before September 30 |
| 2.5.79.0 | Meets the service-change floor, but support ends October 23, 2026 | Plan an immediate move to the latest supported release |
| 2.5.190.0 through 2.6.3.0 | Meets the service floor, but is not the current release | Check support dates and current known issues; move forward on your maintenance schedule |
| 2.6.79.0 | Microsoft recalled this installer | Follow Microsoft's version-history instruction to uninstall it and install 2.6.84.0 |
| 2.6.84.0 | Latest download release on September 4, 2026; includes security fixes | Validate configuration, sync health, and support status |
| Automatic upgrade is Enabled | The server can check for eligible auto-upgrade releases | Verify the installed file version anyway; not every release is offered through auto-upgrade |
| Automatic upgrade is Suspended or Disabled | The deadline will not repair itself | Read the suspension reason and plan a supported manual upgrade |

Version numbers are perishable facts. Recheck the [Microsoft Entra Connect version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history#looking-for-the-latest-versions) on the change date rather than downloading an installer saved in an old software share.

## Why old Connect Sync builds stop working

Connect Sync has an on-premises synchronization engine and a service-side component in Microsoft Entra ID. The engine imports identity data from connected directories, applies synchronization rules in its metaverse, and exports the resulting changes. Microsoft describes those two components in its [Connect Sync architecture index](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-whatis).

The September cutoff hardens the cloud side of that relationship. Microsoft deployed a dedicated first-party application named **Microsoft Entra AD Synchronization Service**, with application ID `6bf85cfa-ac8a-4be5-b5de-425a0d0dc016`, and shipped the corresponding service change in Connect 2.5.79.0. Microsoft calls that first-party service principal critical to continued on-premises-to-Entra synchronization through Connect Sync.

Do not delete, disable, or “clean up” that enterprise application because it appeared unexpectedly. Confirm its application ID against Microsoft's [hardening documentation](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/harden-update-ad-fs-pingfederate), then treat any look-alike object with a different application ID as a separate investigation.

Microsoft's stated failure mode is broad: **all synchronization services in Microsoft Entra Connect Sync will fail** on builds below the minimum when the service change takes effect. Operationally, that can freeze new users, group and attribute updates, deletions, password-hash changes, and configured writeback paths at their last successful state.

> [!IMPORTANT]
> **Analysis:** this is not a blanket Microsoft Entra sign-in shutdown. Existing cloud state and tokens do not disappear because Connect Sync stops. The user-visible blast radius depends on what the server synchronizes and which authentication model the tenant uses. A tenant using password hash synchronization can keep authenticating with the last synchronized cloud hash while newer on-premises password changes fail to arrive. That stale-success state is dangerous because a working sign-in page can hide a broken identity control plane.

The site's [hybrid sign-in architecture guide](/posts/hybrid-microsoft-sign-in-architectures-phs-pta-federation-adfs) explains why Password Hash Synchronization, Pass-through Authentication, and federation have different runtime dependencies. Use that model when deciding which sign-in tests belong in the upgrade plan.

## Inventory every server before choosing an upgrade method

Start with evidence, not the installer.

On each server that might run Connect Sync, verify the **Microsoft Entra ID Sync** service is present and running. Then inspect the product version of `C:\Program Files\Microsoft Azure AD Connect\AzureADConnect.exe` from the file's **Properties > Details** tab. Microsoft's [sync-tool version procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/verify-sync-tool-version#verify-connect-sync) documents both checks.

In the Microsoft Entra admin center, use **Entra ID > Entra Connect > Connect sync** and record the last synchronization time. That portal timestamp is useful for finding the active exporter, but it is not an inventory of every staging or powered-off server. Search configuration management, virtualization, backup, and monitoring records for old Connect hosts as well. Microsoft's upgrade guide warns that a forgotten “rogue” server can later export stale data and repeatedly revert cloud attributes.

Capture this inventory for every candidate server:

- hostname, owner, environment, installed Connect version, Windows Server version, and patch state;
- active or staging mode, scheduler state, last import, synchronization, and export results;
- connected forests and connectors, object count, SQL LocalDB or full SQL, and database location;
- domain and OU filtering, custom synchronization rules, non-standard connectors, and accidental-delete threshold;
- Password Hash Synchronization, Pass-through Authentication, Seamless SSO, password writeback, group or device writeback, and Exchange hybrid dependencies;
- Connect Health status, proxy and firewall path, service accounts, certificate state, and available recovery server;
- exported configuration, change owner, test identities, rollback boundary, and Microsoft support escalation path.

Check automatic-upgrade state locally with the ADSync module:

```powershell
Import-Module ADSync
Get-ADSyncAutoUpgrade
Get-ADSyncAutoUpgrade -Detail
Get-ADSyncScheduler
```

Microsoft documents these cmdlets in the [automatic-upgrade guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-install-automatic-upgrade) and the [ADSync PowerShell reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-adsync). `Enabled` is intent, not proof. The file version and successful sync evidence decide whether the deadline is satisfied.

## Choose automatic, in-place, or swing migration deliberately

Microsoft supports three upgrade shapes.

**Automatic upgrade** fits eligible Express installations using SQL Express LocalDB, the default account pattern, and fewer than 100,000 metaverse objects. A server can become ineligible because TLS is below 1.2, the installation is not an eligible Express state, it uses non-LocalDB SQL, the LocalDB is at least 8 GB, or Health upload is disabled. The Synchronization Service Manager also suspends upgrade while it is open. Not every Connect release is published to the auto-upgrade channel.

**In-place upgrade** keeps one server and upgrades its installed instance. Microsoft describes it as preferred for a single server with fewer than about 100,000 objects, but there is no product rollback if the upgrade fails. The normal delta scheduler is suspended during the upgrade while password synchronization continues. Modified default rules can trigger a full import and full synchronization that takes hours.

**Swing migration** builds or upgrades a second server in staging mode, validates its configuration and pending exports, then makes it active. Microsoft calls this the safest route for substantial changes, older installations, operating-system changes, or environments where an in-place failure would create unacceptable production risk. A staging server imports and synchronizes but does not export, run password sync, or run password writeback until staging mode is disabled. [Microsoft's staging-mode documentation](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-staging-server) defines that boundary.

Use swing migration when the server is old, the operating system also needs replacement, object processing takes a long time, custom rules or connectors exist, a remote SQL design is involved, or the business cannot tolerate an in-place repair window. If you already operate an active/staging pair, upgrade the staging server first and keep only one active exporter.

Do not turn the September deadline into an unplanned synchronization-platform migration. Microsoft recommends evaluating Cloud Sync, but its supported scenarios are not identical. Patch Connect Sync first when that is the bounded way to remove the immediate outage risk; evaluate Cloud Sync as a separately designed change. The site's [cloud-managed user source-of-authority guide](/posts/convert-synced-microsoft-entra-user-cloud-only) and [Cloud Sync Exchange attribute writeback guide](/posts/microsoft-entra-cloud-sync-exchange-attribute-writeback) cover two of the control-plane decisions that deserve their own pilots.

## Meet the installation, role, and licensing gates

Use the latest installer from the **Microsoft Entra admin center**. Microsoft no longer publishes new Connect Sync builds through the Download Center. Its current version page places the download under the Manage area of the Microsoft Entra Connect **Get started** page.

For this mandatory service change, Microsoft explicitly calls out **.NET Framework 4.7.2** and **TLS 1.2** as minimum requirements. Its broader [Connect prerequisites](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-install-prerequisites) also require a domain-joined Windows Server with the full GUI, supported connectivity to every configured forest and Microsoft Entra endpoint, and an execution policy that permits signed PowerShell scripts. Microsoft recommends Windows Server 2025 or 2022 for a new Connect host.

The installer operator needs local Administrator rights and an appropriate Microsoft Entra administrator. Microsoft documents **Hybrid Identity Administrator** as the least-privilege cloud role for the normal Connect configuration path, with Global Administrator or additional roles required for particular federation or Connect Health tasks. The prerequisite page says the Global Administrator or Hybrid Identity Administrator assignment used for setup must be direct, not inherited through group membership. Review the exact AD DS, SQL, and cloud permissions in Microsoft's [Connect accounts and permissions reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-accounts-permissions) before the window.

Connect Sync itself is free and included with an Azure subscription. Microsoft Entra Connect Health requires Microsoft Entra ID P1. Licensing the sync engine does not license the users or premium features that depend on the synchronized identities; keep those separate in the change record. Microsoft's [current Entra licensing page](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-connect) documents that split.

## A staged Microsoft Entra Connect upgrade plan

### Ring 0: freeze the facts

Record every server and version, current active/staging roles, last successful cycles, scheduler state, pending exports, Connect Health alerts, enabled features, and sign-in dependencies. Export the Connect configuration and preserve custom-rule source files. Capture normal cycle duration and a small set of known test objects.

Check the current release page immediately before download. As of September 4, 2026, Microsoft recommends 2.6.84.0 because it contains security fixes. Do not use the recalled 2.6.79.0 installer, and do not target 2.5.79.0 merely because it clears the September service floor.

### Ring 1: prove prerequisites off the active exporter

Validate TLS 1.2, .NET, Windows support, free disk, proxy access, SQL access, local and cloud roles, service accounts, and installer signature. Close the Synchronization Service Manager and Connect wizard when they are not actively in use; Microsoft notes that the wizard suspends the scheduler while it remains open.

For a swing migration, import the supported configuration onto the staging server. Let it complete full import and full synchronization. Compare the old and new server configurations and examine pending exports without disabling staging mode.

### Ring 2: upgrade and validate the staging server

Upgrade the staging server first. Confirm:

- the Windows service starts and the installed file version matches the approved target;
- the ADSync scheduler reports `StagingModeEnabled : True`;
- every connector completes its required import and synchronization run;
- the pending exports are expected and remain below the approved deletion threshold;
- custom rules, filters, connector schemas, password features, and writeback selections match the baseline;
- Connect Health and local application logs show no new upgrade or synchronization error.

Microsoft's [upgrade procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-upgrade-previous-version#use-a-swing-migration-to-upgrade) requires this verification before switching active servers.

### Ring 3: switch one exporter and watch a full business cycle

Put the old active server into staging mode before disabling staging mode on the upgraded server. Confirm there is exactly one active exporter. Run the approved synchronization cycle or wait for the scheduler, then validate both the engine and the cloud result.

```powershell
Import-Module ADSync
Get-ADSyncScheduler
Start-ADSyncSyncCycle -PolicyType Delta
```

Test low-risk creates and attribute changes, a group-membership change, the tenant's password path, and every configured writeback feature. Confirm the changes appear in the correct target, not merely that a run profile says Success. Check **Entra ID > Entra Connect > Connect sync** for the new last-sync time and review [Microsoft Entra Connect Health sync alerts](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-health-sync).

### Ring 4: upgrade the former active server

Keep the former active server in staging mode, upgrade it to the same approved release, and repeat import, sync, and pending-export validation. Microsoft recommends keeping an active/staging pair at the same version. Update the configuration inventory, monitoring rules, and recovery runbook, then permanently decommission any obsolete server so it cannot later return as a rogue exporter.

For a single-server in-place upgrade, use the same evidence gates but acknowledge the missing rollback boundary. Schedule enough time for any full import and full synchronization, keep the scheduler state explicit, and do not close the change until a post-upgrade delta is visible in Microsoft Entra ID.

## Troubleshoot the upgrade without guessing

### Automatic upgrade never arrived

Run `Get-ADSyncAutoUpgrade -Detail`. If the state is Suspended, use the returned reason rather than toggling the setting blindly. Microsoft lists common blocks including unsupported SQL layout, LocalDB size, disabled Health uploads, insufficient disk or database permissions, an open Synchronization Service Manager, and a sync or configuration operation already in progress.

Filter the Windows Application log for source **Microsoft Entra Connect Upgrade** and event IDs **300–399**. Microsoft classifies results as Success, UpgradeAborted, or UpgradeNotSupported and documents the common reason strings in the [automatic-upgrade troubleshooting table](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-install-automatic-upgrade#troubleshooting).

### Synchronization fails after upgrading a customized server

The current version page documents a known `System.IO.FileLoadException` involving `System.Diagnostics.DiagnosticSource` when `miiserver.exe.config` was modified before upgrading to 2.5.190.0 or 2.6.1.0. Do not copy a configuration file from another server. Follow the exact binding-redirect remediation in the [current known-issue section](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history#known-issue-synchronization-fails-after-upgrade-if-miiserverexeconfig-was-previously-modified), preserve the file first, and restart the ADSync service only inside the approved window.

### A non-standard connector fails after in-place upgrade

Microsoft says Generic LDAP and Generic SQL connector configurations must be refreshed in Synchronization Service Manager after an in-place upgrade. Otherwise import and export steps can fail with an assembly-version mismatch. Use the error and procedure in the [official upgrade troubleshooting guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-upgrade-previous-version#in-place-upgrade); do not rebuild the connector before preserving its configuration and run history.

### The server is still below 2.5.79.0 after September 30

Microsoft says synchronization remains failed until you upgrade to the latest release. Preserve the current version, service state, scheduler state, last successful run, and errors; validate prerequisites; install the current supported build; and then verify a controlled import, sync, and export. Do not force a stale server to export or delete the Microsoft first-party synchronization service principal.

### The staging server looks healthy but nothing writes back

That is expected while staging mode is enabled. A staging server imports and synchronizes but does not export, run password sync, or run password writeback. Verify `StagingModeEnabled`, confirm the intended server is active, and switch roles through the documented wizard sequence. Never solve this symptom by enabling both exporters.

## Rollback and incident containment

For a swing migration, the safest rollback is before promotion: leave the existing server active, keep the upgraded server in staging, and correct the configuration until pending exports and test results are clean. That is why swing migration is valuable.

If a newly promoted server misbehaves, stop expansion and preserve both servers' run histories, scheduler states, and pending exports. Coordinate the active/staging transition using the documented procedure and ensure only one server exports. Do not power on an old host casually; Microsoft warns that a stale server can overwrite cloud attributes every cycle.

An in-place upgrade does not provide a supported product rollback. Microsoft's comparison explicitly says you cannot roll back the new release or configuration after a failed in-place upgrade. Repair forward on the current supported release or escalate to Microsoft. Do not downgrade to DirSync or Azure AD Sync; Microsoft calls that unsupported and warns it can cause data loss.

Escalate with the tenant ID, Connect version before and after, host and Windows versions, topology, database type, UTC failure window, event IDs, connector and run-profile names, scheduler output, last successful export, pending-export count, Health alerts, custom-rule inventory, and sanitized installer logs. Never include credentials, private keys, password hashes, or an unredacted configuration export in a general support ticket.

## Microsoft Entra Connect upgrade administrator checklist

- [ ] Confirm the September 30, 2026 deadline in current Microsoft documentation.
- [ ] Inventory every active, staging, disaster-recovery, powered-off, and legacy Connect server.
- [ ] Verify each installed `AzureADConnect.exe` product version locally.
- [ ] Treat 2.5.79.0 as the minimum service floor, not the recommended destination.
- [ ] Recheck the latest release; as of publication it is 2.6.84.0 and 2.6.79.0 is recalled.
- [ ] Download the installer only from the Microsoft Entra admin center.
- [ ] Validate TLS 1.2, .NET Framework 4.7.2, Windows, disk, SQL, proxy, and firewall prerequisites.
- [ ] Use local Administrator and directly assigned Hybrid Identity Administrator or required higher roles.
- [ ] Export configuration and preserve custom rules, filters, feature selections, and run history.
- [ ] Check `Get-ADSyncAutoUpgrade -Detail`; do not assume Enabled means upgraded.
- [ ] Prefer swing migration for old, large, customized, OS-change, or low-tolerance environments.
- [ ] Upgrade and validate the staging server before promotion.
- [ ] Confirm exactly one active exporter throughout the switch.
- [ ] Validate imports, synchronization, pending exports, deletions, password behavior, writeback, and cloud results.
- [ ] Review local event logs, Connect Health, and the Entra last-sync timestamp.
- [ ] Upgrade the former active server to the same release and keep it in staging.
- [ ] Decommission obsolete servers so they cannot return as rogue exporters.
- [ ] Document the incident path for a failed in-place upgrade; do not plan a downgrade.

The deadline is simple; the production change is not. The right outcome is not “the installer completed.” It is **every Connect Sync host on a current supported build, one active exporter, expected pending changes, healthy password and writeback paths, fresh cloud evidence, and a staging server that can take over without improvisation**.
