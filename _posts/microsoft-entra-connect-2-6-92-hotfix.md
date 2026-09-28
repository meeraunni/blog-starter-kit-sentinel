---
title: "Microsoft Entra Connect 2.6.92.0 Hotfix: Admin Guide"
excerpt: "Deploy Microsoft Entra Connect 2.6.92.0 safely: scope the PTA registration fix, upgrade the right server, validate sync and sign-in, and preserve rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-28T17:08:37-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra Connect 2.6.92.0** is the September 23, 2026 hotfix for Connect Sync. Microsoft says the release includes security fixes and recommends upgrading as soon as possible. It also corrects a specific regression in version 2.6.91.0: enabling Pass-through Authentication through the Connect wizard could fail while registering the Authentication Agent installed on that Connect server.

The short answer is to move supported Connect Sync servers to 2.6.92.0 through a controlled change, even if you do not use Pass-through Authentication. If you are on 2.6.91.0 and the wizard failed while enabling PTA, preserve the failure evidence, install 2.6.92.0, confirm the local agent registers as Active, and then retest the configuration. Do not respond by uninstalling a healthy agent, disabling Conditional Access, or switching authentication methods in the middle of the incident.

Those release facts come directly from Microsoft's [current Connect version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history#26920). The page labels 2.6.92.0 a hotfix, lists it as available for download from the Microsoft Entra admin center, and does not publish a CVE or further security-fix detail. That is the boundary: treat the security update as urgent, but do not invent a vulnerability, exploit path, or affected component that Microsoft has not disclosed.

Grab a coffee and keep the change narrow. This guide handles the 2.6.92.0 decision, the 2.6.91.0 PTA registration failure, a safe upgrade sequence, validation, and escalation. The site's broader [September 2026 Connect Sync upgrade runbook](/posts/microsoft-entra-connect-september-2026-upgrade-guide) remains the place to inventory an entire estate and address the September 30 minimum-version deadline.

## Microsoft Entra Connect 2.6.92.0: who should act

Use the installed version and observed behavior to choose the path:

- **2.6.91.0 and PTA enablement fails while the local agent registers:** this matches the documented regression. Preserve logs, upgrade to 2.6.92.0, then retry and validate registration.
- **2.6.91.0 and PTA is already healthy:** the documented regression concerns enabling PTA; it does not say every existing deployment fails. Upgrade promptly for the security fixes, but do not manufacture an authentication outage.
- **2.6.91.0 without PTA:** the PTA regression does not apply, but Microsoft's security-update recommendation still does. Plan the 2.6.92.0 upgrade through the normal change process.
- **Earlier supported 2.x version:** review that build's support date and known issues, then upgrade to the current release.
- **Below 2.5.79.0:** Microsoft says all Connect Sync synchronization services will stop after September 30, 2026. Treat that deadline as a separate urgent requirement and upgrade to the latest release.
- **2.6.79.0:** Microsoft recalled the installer. Follow the current version-history instruction to uninstall it and install 2.6.92.0.
- **Cloud Sync only:** this hotfix is for Microsoft Entra Connect Sync, not the Cloud Sync provisioning agent. Do not install Connect Sync merely to consume it.

Version status is perishable. Recheck the [release-history page](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history#looking-for-the-latest-versions) at the start of the window. On September 28, it lists 2.6.92.0 as the latest release and says that new installers are downloaded from the **Manage** tab of the Microsoft Entra Connect **Get started** page in the admin center.

Microsoft's release status currently says **released for download via the Microsoft Entra admin center**. Its [automatic-upgrade documentation](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-install-automatic-upgrade) warns that not every release enters the auto-upgrade channel and that an Enabled state does not mean the server has the newest downloadable build. Verify the installed file version; do not wait for an automatic upgrade that Microsoft has not announced for this hotfix.

## What the 2.6.91.0 PTA failure does—and does not—prove

Pass-through Authentication keeps Microsoft Entra as the cloud sign-in control plane while an on-premises Authentication Agent validates the submitted username and password against Active Directory. The agent makes outbound connections and uses certificate-based authentication to communicate with Microsoft Entra. Multiple agents can provide sign-in high availability. Microsoft's [PTA architecture overview](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta) documents those boundaries.

Version 2.6.91.0 changed several things in the Connect wizard and also introduced the known issue. Microsoft describes the failure narrowly: **enabling Pass-through Authentication through the wizard might fail while registering the locally installed Authentication Agent**. The 2.6.92.0 hotfix fixes that registration path.

That wording supports three important incident decisions:

1. A wizard failure on 2.6.91.0 during PTA enablement is a strong match for the regression.
2. The release note does not say that already-registered agents stop processing existing sign-ins.
3. A registration failure on another version, or on a standalone agent, still requires normal account, token, port, proxy, and service diagnostics.

Do not let the new hotfix hide an unrelated failure. Microsoft's [PTA troubleshooting guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/tshoot-connect-pass-through-authentication) separately documents registration failures caused by blocked service URLs or ports, token or account authorization errors, and unexpected agent errors. It also says PTA cannot be enabled until at least one agent is Active.

Preserve these facts before rerunning the wizard:

- Connect server name, active or staging role, installed Connect version, and Windows Server version;
- exact wizard step, error text, UTC timestamp, and operator account type;
- whether PTA was being enabled for the first time or reconfigured;
- every Authentication Agent shown in the portal and its Active or Inactive state;
- whether other agents continue to serve sign-ins;
- recent proxy, firewall, Conditional Access, credential, or server changes; and
- relevant Connect and Authentication Agent logs.

Microsoft places Connect installation traces under `%ProgramData%\AADConnect\trace-*.log`. Authentication Agent events are under **Applications and Services Logs > Microsoft > AzureAdConnect > AuthenticationAgent > Admin**, while detailed sign-in traces are under `%ProgramData%\Microsoft\Azure AD Connect Authentication Agent\Trace\`. Preserve the relevant window before reinstalling or repeatedly retrying the wizard.

## Preflight the hotfix without touching production

First, identify every Connect Sync server, including staging and disaster-recovery hosts. A successful upgrade on the visible active server does not update a powered-off recovery server. Record the installed version, active or staging state, scheduler state, last successful import/synchronization/export, pending exports, configured password features, custom rules, and Connect Health alerts.

On each server, confirm the **Microsoft Entra ID Sync** service exists and inspect the product version of `C:\Program Files\Microsoft Azure AD Connect\AzureADConnect.exe` in **Properties > Details**. Microsoft's [Connect Sync version-verification procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/verify-sync-tool-version#verify-connect-sync) documents those exact checks. Then record the supported scheduler and auto-upgrade state:

```powershell
Import-Module ADSync
Get-ADSyncScheduler
Get-ADSyncAutoUpgrade
Get-ADSyncAutoUpgrade -Detail
```

Export the configuration through **Microsoft Entra Connect > View or Export Current Configuration** and store the JSON in the protected change record. Microsoft says the wizard also writes time-stamped configuration exports under `%ProgramData%\AADConnect`; its [import and export guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-import-export-config) warns not to hand-edit those JSON files. The same page lists settings that are not fully captured or reapplied, so preserve custom rules and advanced configuration separately rather than treating the JSON as a complete backup.

Confirm the current prerequisites before download. Microsoft's [upgrade procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-upgrade-previous-version) calls out TLS 1.2 and .NET Framework 4.7.2, says the MSI is available only through the Microsoft Entra admin center, and recommends a swing migration for older or materially changed environments. Its [accounts and permissions reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-accounts-permissions#permissions-required-to-upgrade) requires the installer operator to be a local Administrator and ADSyncAdmins member, with database-owner-equivalent rights when full SQL Server is used. Do not elevate a daily user simply because the previous wizard attempt failed.

If PTA is in scope, prove high availability before taking a working agent out of service. Microsoft's troubleshooting documentation warns that uninstalling Connect while no other PTA agent is available can prevent users from signing in. The site's [hybrid sign-in architecture guide](/posts/hybrid-microsoft-sign-in-architectures-phs-pta-federation-adfs) explains why PTA has a real-time on-premises dependency while Password Hash Synchronization does not.

## Upgrade 2.6.92.0 through the safest available path

### With an active and staging pair

Microsoft recommends upgrading the staging server first. That preserves an active exporter while you prove the new build.

1. Confirm the staging server has synchronized recently and `StagingModeEnabled` is `True`.
2. Export and compare its configuration with the active server, including custom rules and scope.
3. Download the current installer from the Microsoft Entra admin center during the approved window.
4. Upgrade the staging server to 2.6.92.0.
5. Run the required imports and synchronization, then inspect pending exports. Do not promote it while the proposed changes are unexplained.
6. If PTA is used, verify the Authentication Agent on the upgraded host and the tenant's other agents before any role switch.
7. Put the old active server into staging mode before promoting the upgraded server. Keep exactly one active exporter.
8. Validate a complete production cycle, then upgrade the former active server and leave it as the current staging server.

Microsoft's [staging-server procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-staging-server) requires an initial cycle and pending-export review before a switch. It also states that Connect supports Active-Passive, not Active-Active, operation. A staging server imports and synchronizes but suppresses normal exports, Password Hash Synchronization, and password writeback until staging mode is disabled.

### With a single Connect server

An in-place upgrade has no ready Connect server to promote if the change fails. Confirm the business accepts that boundary, preserve the configuration and evidence, verify that another PTA agent can carry sign-ins when PTA is in use, and reserve time for a full import or synchronization if the upgrade requires one.

Do not call an uninstall and reinstall a rollback plan. Microsoft documents rebuild and swing-migration paths, but it does not document downgrading a current Connect installation as a safe recovery technique. If the upgraded host is unhealthy, stop at the failed layer, preserve logs, and use the approved staging or rebuild path rather than exporting from two servers or restoring an old VM that can reappear as a rogue exporter.

The existing [Connect Sync to Cloud Sync migration guide](/posts/migrate-microsoft-entra-connect-sync-cloud-sync) is a separate architecture change. Do not combine a hotfix, a PTA repair, and a synchronization-platform migration into one emergency window.

## Validate sync, PTA, and the cloud result

An installer-complete message is not the success criterion. Validate each control plane independently.

### 1. Confirm the local Connect state

- `AzureADConnect.exe` reports product version 2.6.92.0.
- The Microsoft Entra ID Sync service is running.
- `Get-ADSyncScheduler` shows the intended active or staging state.
- The expected connectors, domain and OU scope, custom rules, and feature selections remain present.
- The latest import, synchronization, and—on the active server—export complete without a new error.
- Pending adds, updates, and deletes match the approved change.

For a controlled active-server test, use the documented scheduler cmdlet only after confirming the intended server is active:

```powershell
Start-ADSyncSyncCycle -PolicyType Delta
```

Then prove a low-risk attribute or membership change reached Microsoft Entra. A green local run with no correct cloud result is not a successful validation.

### 2. Confirm the PTA agent state

In the Microsoft Entra admin center, browse to **Entra ID > Entra Connect > Connect sync**, open **Pass-through Authentication**, and confirm the intended agents are Active. Check the local Authentication Agent Admin log for new registration or runtime errors.

If the original 2.6.91.0 failure occurred during enablement, retry the supported wizard operation once after the hotfix and correlate it with the preserved logs. Do not keep cycling enablement while evidence is changing.

Microsoft notes that an agent upgrade can temporarily leave one Active and one Inactive portal entry for the same server; the inactive record is removed after a few days. That expected stale entry is different from having no Active agent. The [agent upgrade procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta-upgrade-preview-authentication-agents) documents this portal behavior.

### 3. Test authentication without creating an outage

Use approved non-privileged test identities whose password authority and expected sign-in path are known. Validate at least one managed, browser-based sign-in through PTA and review the Microsoft Entra sign-in record. Confirm the test actually used the intended tenant and username; a successful token refresh or an alternate authentication path does not prove that PTA password validation succeeded.

Do not disable Conditional Access to make the test simpler. PTA validates the password against Active Directory; Microsoft Entra still evaluates Conditional Access, MFA, and other cloud controls. If the password step succeeds and Conditional Access blocks the request, troubleshoot the policy result as a separate stage.

### 4. Watch health through a normal operating interval

Review Connect Health alerts, sync latency, local Application events, Authentication Agent events, and the Entra last-sync timestamp. Microsoft's [Connect Health for Sync guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-health-sync) exposes active and resolved alerts, sync latency, and object-level errors. Close the change only after the expected scheduler cycle and the tenant's important password or writeback paths have produced fresh evidence.

## If PTA registration still fails after 2.6.92.0

Do not assume the hotfix failed. It removes one known 2.6.91.0 defect; it does not remove the other registration prerequisites.

Work in this order:

1. Confirm the installed Connect file version is actually 2.6.92.0 and the failing host is the one you upgraded.
2. Preserve the exact post-upgrade timestamp and error so it is not confused with the earlier attempt.
3. Confirm at least one Authentication Agent is Active before enabling PTA.
4. Validate required outbound service URLs and ports from the agent host.
5. Validate the operator account and authorization against Microsoft's current PTA troubleshooting page.
6. Review `%ProgramData%\AADConnect\trace-*.log` and the AuthenticationAgent Admin log together.
7. Compare the failure across another supported agent host only if that test is already within the change plan.
8. Escalate with sanitized evidence when the supported prerequisites pass but registration still fails.

Microsoft's current troubleshooting page includes a documented account/MFA workaround for certain agent registration errors. Treat that page as the authority at incident time; do not turn a narrow temporary workaround into a standing MFA exclusion, and never disable tenant-wide MFA or Conditional Access to troubleshoot a local registration problem.

Send Microsoft Support the tenant ID, Connect version before and after upgrade, server role, exact UTC failure time, sanitized wizard error, agent portal state, correlation or request identifiers if present, Connect trace excerpt, Authentication Agent Admin events, network test result, and whether other agents remain Active. Remove passwords, tokens, private keys, and unredacted configuration exports.

## Microsoft Entra Connect 2.6.92.0 administrator checklist

- [ ] Recheck the live version history and confirm 2.6.92.0 is still the current target.
- [ ] Inventory every active, staging, recovery, and powered-off Connect Sync server.
- [ ] Record installed versions, scheduler state, last successful cycles, pending exports, and Health alerts.
- [ ] Separate the 2.6.91.0 local PTA registration regression from unrelated PTA failures.
- [ ] Preserve Connect traces and Authentication Agent events before retrying the wizard.
- [ ] Export the Connect configuration and protect the unedited JSON.
- [ ] Verify TLS, .NET, Windows, SQL, proxy, firewall, disk, and administrator prerequisites.
- [ ] Download the installer only from the Microsoft Entra admin center.
- [ ] Prove another PTA agent can serve sign-ins before removing a working agent from service.
- [ ] Upgrade and validate the staging server first when one exists.
- [ ] Keep exactly one Connect Sync server active during a role switch.
- [ ] Confirm 2.6.92.0 locally and validate connectors, rules, scope, cycles, and pending exports.
- [ ] Prove an approved test change reaches Microsoft Entra.
- [ ] Confirm the intended Authentication Agents are Active and perform a controlled PTA sign-in test.
- [ ] Keep Conditional Access and MFA findings separate from password-validation findings.
- [ ] Review Connect Health and local logs through a normal scheduler interval.
- [ ] Escalate with one sanitized evidence package if registration still fails.

The useful mental model is simple: **2.6.92.0 is both a security-recommended Connect Sync update and a repair for one specific 2.6.91.0 wizard-to-agent registration path**. Upgrade promptly, but diagnose precisely. The version number, agent state, synchronization evidence, and real sign-in result should all agree before the change is complete.
