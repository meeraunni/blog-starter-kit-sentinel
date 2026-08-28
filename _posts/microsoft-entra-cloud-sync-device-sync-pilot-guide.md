---
title: "Microsoft Entra Cloud Sync Device Sync: Safe Pilot Guide"
excerpt: "Microsoft Entra Cloud Sync device sync is now in preview. Learn the prerequisites, SCP risks, pilot sequence, validation checks, rollback, and recovery."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-28T09:04:07-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra Cloud Sync device sync is now in public preview. It can copy Active Directory computer objects into Microsoft Entra ID through a dedicated `AD2AADDeviceSync` job, after which eligible Windows devices can complete Microsoft Entra hybrid join.

That second half matters. A synchronized device object is not proof that the endpoint joined successfully, obtained a Primary Refresh Token, or can satisfy device-based Conditional Access. Grab a coffee: the safe rollout has two evidence trails—**Cloud Sync provisioning** and **Windows device registration**—and you need both.

This guide is for administrators who already have an **AD to Microsoft Entra ID** Cloud Sync configuration and want to evaluate the new device-sync preview. It does not replace the existing [Windows device join and registration troubleshooting guide](/posts/microsoft-entra-windows-device-join-registration-failures), and it is not a general migration plan from Microsoft Entra Connect Sync.

## Microsoft Entra Cloud Sync device sync: status and boundaries

- **Release state:** Public preview.
- **Default:** Disabled.
- **Tenant rollout:** No mandatory rollout or enforcement date is published.
- **Sync mechanism:** A dedicated `AD2AADDeviceSync` synchronization job.
- **Source object:** A computer object in Active Directory.
- **Result of synchronization:** A device object in Microsoft Entra ID that can proceed to hybrid join.
- **Minimum provisioning agent:** Version `1.1.1107` or later.
- **Portal role:** At least Hybrid Identity Administrator.
- **Forest configuration:** A correct service connection point in every forest that contains participating domain-joined computers.
- **Automation:** Microsoft Graph can create and start the job and provision one device on demand.

Microsoft's [device-sync configuration page](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/device-sync) documents the preview label, disabled default, prerequisites, mappings, portal path, Graph template ID, and deletion-recovery behavior. The [August 2026 Microsoft Entra release post](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172) independently lists device synchronization with Cloud Sync under public preview.

This is not generally available, default-on, or mandatory. Azure preview terms apply, and Microsoft has published no GA date or tenant rollout rings. Do not make this preview the only recovery path for a production fleet until your support, change, and risk owners accept that status.

Microsoft's older [supported hybrid-scenarios matrix](https://learn.microsoft.com/en-us/entra/identity/hybrid/common-scenarios) still shows Microsoft Entra hybrid join as unavailable with Cloud Sync. Read that as the generally available support matrix, not as evidence that the July preview is GA. The preview-specific page is the current authority for this feature; keep the state recorded as **preview** in every change ticket.

## The control plane: object synchronization is not device registration

There are two distinct flows. First, the `AD2AADDeviceSync` job carries the Active Directory computer object through the Cloud Sync provisioning agent to a Microsoft Entra device object. Second, Windows reads the forest SCP, contacts Device Registration Service, and completes Microsoft Entra hybrid join.

The provisioning agent is the on-premises bridge. It maintains an outbound connection to Microsoft services, queries Active Directory when the cloud provisioning service requests work, and returns the objects for Microsoft Entra ID to write. Microsoft's [Cloud Sync architecture reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/concept-how-it-works) describes that agent-and-service split.

For device sync, Microsoft maps the AD computer's `objectGUID` to both the Entra `DeviceId` and source anchor, `objectSid` to the on-premises security identifier, `userAccountControl` to `AccountEnabled`, and `userCertificate` to the device certificate field. `DeviceTrustType` is set to `ServerAd`. The registered-owner mapping from `mS-DS-CreatorSID` is applied only the first time Cloud Sync finds the computer object. The full mapping table belongs in your design record, because it tells you which on-premises changes can alter the cloud device.

The endpoint then performs registration. It reads the forest's service connection point (SCP) to discover the tenant, reaches Microsoft Entra's Device Registration Service, and completes hybrid join. Microsoft's [manual hybrid-join reference](https://learn.microsoft.com/en-us/entra/identity/devices/hybrid-join-manual) documents the SCP location and its `azureADName` and `azureADId` keywords.

> [!NOTE]
> **Analysis:** Cloud Sync changes how the Entra device object is provisioned. It does not remove the endpoint's need for domain-controller line of sight, correct tenant discovery, outbound registration connectivity, or a successful client registration task. Treat provisioning success and join success as separate gates.

## Prerequisites worth proving before you enable the preview

Build a written preflight record rather than clicking **Enable device sync** and hoping the fleet tells you what was missed.

1. **Preview approval:** Record the feature owner, business reason, test scope, rollback authority, and acceptance of the [Azure preview terms](https://azure.microsoft.com/en-us/support/legal/preview-supplemental-terms/).
2. **Existing Cloud Sync configuration:** Confirm an AD to Microsoft Entra ID configuration already exists for the intended domain. The device-preview page does not describe device sync as a standalone agent deployment.
3. **Agent health and version:** Confirm the provisioning agent is Active and at least `1.1.1107`. Microsoft's [agent installation guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install) documents the portal and local-service checks; the [agent release history](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-version-history) identifies currently available builds.
4. **Tenant and domain:** Record the tenant ID and the verified domain that devices should use for authentication. For a federated environment, Microsoft says to use a federated domain; otherwise, use the primary `*.onmicrosoft.com` domain.
5. **Privileged access:** Use at least Hybrid Identity Administrator for the Cloud Sync change. SCP creation needs temporary Enterprise Admin access in each affected forest. Activate it just in time, record the change, and remove or deactivate it afterward.
6. **SCP state:** Export the current SCP path and keyword values from every participating forest before writing anything. A wrong tenant ID here can direct device registration at the wrong directory.
7. **Client connectivity:** From device system context, validate access to enterpriseregistration.windows.net, login.microsoftonline.com, and device.login.microsoftonline.com. Microsoft's [hybrid-join configuration guide](https://learn.microsoft.com/en-us/entra/identity/devices/how-to-hybrid-join) warns that TLS inspection can break client-certificate authentication and registration.
8. **Recovery:** Confirm who can pause the synchronization job, restore a deleted device, revert SCP keywords, and troubleshoot endpoints before the first production change.

### Licensing without guesswork

The current device-sync preview page specifies the agent version, roles, tenant data, Cloud Sync configuration, and forest access, but it does not name a separate per-user premium SKU for device sync. That absence is not a licensing guarantee. The preview terms apply, and downstream features such as Conditional Access, Intune, and Log Analytics have their own licensing or consumption requirements. Check the current [Microsoft Entra plan comparison](https://www.microsoft.com/en-us/security/microsoft-entra-pricing) and your agreement before the pilot; do not copy a license claim from an unrelated Cloud Sync feature.

## The SCP is the highest-blast-radius step

Microsoft's device-sync page provides a PowerShell script that creates or updates an SCP beneath **Device Registration Configuration**, under **Services**, in the forest configuration naming context. The object name is the fixed GUID **62a0ff2e-97b9-4513-943f-0d221bd30080**.

The dangerous part is explicit in Microsoft's warning: if the SCP already exists, the script clears the current `keywords` collection and replaces it with the supplied `azureADName` and `azureADId`. Those two values decide which tenant the Windows device discovers.

Before running it, read and preserve the existing keywords. If they already identify the intended tenant, do not rewrite them. If they point elsewhere, stop and resolve the ownership conflict. In a multi-forest environment, verify each forest independently; do not assume a correct SCP in one forest protects another.

Microsoft's general [targeted hybrid-join guidance](https://learn.microsoft.com/en-us/entra/identity/devices/hybrid-join-control) describes a client-side registry SCP override delivered by Group Policy for a subset of devices. The new Cloud Sync device-preview page does not explicitly document that pattern as a Cloud Sync device-job scoping mechanism. Do not assume a user or group scope on the existing Cloud Sync configuration automatically creates a safe computer-object pilot. If you cannot prove the device-job scope from the preview configuration and provisioning logs, use an isolated test forest or obtain written Microsoft support guidance before enabling it in a broad production forest.

## A safe Microsoft Entra Cloud Sync device-sync pilot

### Ring 0: capture the current state

Export the Cloud Sync configuration, agent inventory and versions, current SCP keywords, expected computer-object count, existing Entra devices, and current pending-device count. Select endpoints that represent each relevant forest, domain, site, proxy path, Windows version, and managed or federated authentication path.

Record the device's AD distinguished name, `objectGUID`, `objectSid`, DNS name, enabled state, current Entra Device ID if one exists, and local `dsregcmd /status` output. This becomes the before-state for matching, rollback, and duplicate detection.

### Ring 1: validate in an isolated environment

In a test forest or other scope whose blast radius you can prove:

1. Verify the SCP values against the intended tenant.
2. Open **Entra ID > Entra Connect > Cloud sync**, select the existing AD-to-Entra configuration, open **Properties**, edit **Basics**, select **Enable device sync**, and apply.
3. Open **Provision on demand**, select the **Device** tab, enter one computer's AD distinguished name, and provision it.
4. Confirm the provisioning result and find the object in Cloud Sync provisioning logs.
5. Match the Entra device to the AD `objectGUID` and expected attributes.
6. On the endpoint, let the normal registration task run, then verify local and cloud join state.

Those portal labels and the device distinguished-name input are documented in the [device-sync procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/device-sync). Provision on demand is a diagnostic for one object; it is not proof that the full recurring job has the scope you intended.

### Ring 2: validate the recurring job

Let the scheduled job run only after the single-device path is clean. Filter provisioning evidence by the device job ID and inspect device Create, Update, and Delete actions together with Success, Skipped, and failure results. Microsoft's [Cloud Sync insights workbook](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-cloud-sync-workbook) documents job-ID, status, action, and synchronization-type views, plus alerts for failure or deletion spikes.

Set stop criteria before broadening:

- any unexpected forest, domain, or computer object appears;
- an existing device matches incorrectly or duplicates;
- the SCP points to an unexpected tenant;
- deletes or disables exceed the approved test set;
- provisioning succeeds but endpoints remain Pending;
- Conditional Access sees missing or wrong device state;
- the job enters Paused or Quarantine.

### Ring 3: broaden only with two green evidence trails

Expand to another controlled device group only when both trails are green:

- **Cloud Sync:** Correct source computer, correct job, expected mappings, successful action, and no unexpected deletes or enabled-state changes.
- **Device registration:** Matching Device ID, `DomainJoined : YES`, `AzureAdJoined : YES`, a registered timestamp in Entra, and the expected enabled state.

Do not use a successful cloud object creation as the change-complete signal. A Pending device cannot yet complete authentication or authorization operations that depend on the device, including Primary Refresh Token and device-based Conditional Access scenarios. Microsoft's [pending-device troubleshooting article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/dir-dmns-obj/pending-devices) documents that security consequence.

## Verify device sync and hybrid join without mixing the signals

On the Windows endpoint, run `dsregcmd /status`.

For completed hybrid join, Microsoft says both `DomainJoined` and `AzureAdJoined` must be `YES`. Record the local `DeviceId`, then match it to the cloud object. In **Entra ID > Devices > All devices**, a Registered value of **Pending** means registration has not completed; a registration date and time means it has. Microsoft's [hybrid-join verification guide](https://learn.microsoft.com/en-us/entra/identity/devices/how-to-hybrid-join-verify) documents those checks and the equivalent Microsoft Graph PowerShell inventory.

If the object is present but join fails, do not keep reprovisioning it. Use `dsregcmd /status` to identify the failed phase and client error, then inspect **Applications and Services Logs > Microsoft > Windows > User Device Registration**. Microsoft's [hybrid-join troubleshooting flow](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-hybrid-join-windows-current) separates precheck, discovery, and join failures and maps them to domain-controller reachability, SCP discovery, network access, and Device Registration Service responses.

The existing [Primary Refresh Token troubleshooting guide](/posts/microsoft-entra-primary-refresh-token-prt-failures-windows) starts after join state is understood. Use it when `DomainJoined` and `AzureAdJoined` are correct but SSO state or `AzureAdPrt` is not.

## Containment, rollback, and deleted-device recovery

If the recurring device job starts producing unexpected changes, pause the specific synchronization job first. Microsoft Graph v1.0 documents the pause action on the service principal's synchronization job; it preserves progress so a later start continues from the same point. The [pause API reference](https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-pause?view=graph-rest-1.0) also lists Hybrid Identity Administrator as a supported role for Cloud Sync. Do not delete the configuration as an improvised pause: deletion permanently removes job state and has different object consequences.

Pausing stops new synchronization work. It does not undo objects already created, updated, disabled, or deleted. Revert the SCP only when the preserved before-state proves the old values and the device-identity owner approves the forest-wide change. Do not bulk-delete Entra devices to make the portal look clean.

The preview documentation identifies three ways an Entra device can disappear: Cloud Sync processes deletion of the source AD computer; `dsregcmd /leave` causes Device Registration Service to delete the cloud device; or an administrator deletes it in Entra. If something other than Cloud Sync deletes the Entra device, the next cycle does not recreate it unless the AD computer object changes.

Microsoft documents three recovery choices: restore the object under **Entra ID > Devices > Deleted devices**, change the AD computer object and wait for the next cycle, or provision that device on demand. Choose based on the incident record; do not generate a meaningless AD change merely to wake the connector when restoration is available.

## Troubleshooting Microsoft Entra Cloud Sync device sync

- **Device tab or toggle is missing:** Test preview availability, role, configuration type, and agent version. Capture the tenant, role assignment, configuration type, and installed version.
- **On-demand provisioning cannot find the computer:** Test the exact AD distinguished name, agent-to-domain-controller reachability, and device-job scope. Keep the provisioning result.
- **The Entra object never appears:** Stay in the Cloud Sync boundary. Correlate the provisioning log, job status, and source `objectGUID`.
- **The Entra object is Pending:** Move to the Windows-registration boundary. Check SCP keywords, the `dsregcmd` error phase, and the User Device Registration log.
- **`DomainJoined` is `YES`, but `AzureAdJoined` is `NO`:** Test discovery and join. Capture the SCP, system-context network path, Device Registration Service error, and request ID.
- **The device joins, but SSO fails:** Test PRT and user authentication. Check `AzureAdPrt`, sign-in logs, and broker state.
- **The device is disabled unexpectedly:** Test the AD-to-Entra enabled-state mapping. Correlate `userAccountControl`, the provisioning action, and Entra audit evidence.
- **A deleted cloud device does not return:** Identify the deletion actor and whether the AD computer changed. Correlate the Entra audit event, Cloud Sync log, and AD change history.
- **Unexpected broad changes appear:** Test job scope and SCP blast radius. Capture the job ID, action counts, and forest SCP export.

If the preview behavior contradicts the provisioning log, device-registration evidence, or current Microsoft documentation, pause the job and escalate with the tenant ID, service-principal ID, job ID, device ID, AD `objectGUID`, UTC timestamps, provisioning result, `dsregcmd` diagnostics, and Device Registration Service request ID.

## Administrator checklist

- [ ] Record public-preview status; do not label the feature GA.
- [ ] Verify an existing AD-to-Entra Cloud Sync configuration.
- [ ] Verify provisioning-agent health and version `1.1.1107` or later.
- [ ] Export every participating forest's current SCP path and keywords.
- [ ] Confirm tenant ID and verified-domain values before any SCP write.
- [ ] Validate required endpoints from Windows system context.
- [ ] Prove the device-job scope; use an isolated forest if the production scope is unclear.
- [ ] Provision one device on demand and match its AD and Entra identifiers.
- [ ] Validate the recurring job by job ID and action type.
- [ ] Require both Cloud Sync success and completed hybrid join before expanding.
- [ ] Preauthorize job pause, SCP restoration, and deleted-device recovery procedures.
- [ ] Monitor Create, Update, and Delete actions, enabled-state changes, and Skipped, Paused, or Quarantine results.
- [ ] Keep downstream Conditional Access, Intune, and logging licenses separate from the preview's documented prerequisites.

The useful mental model is simple: **Cloud Sync provisions the device object; Windows completes the trust.** If you preserve the SCP, prove the job scope, and require evidence from both halves before expanding, you can evaluate the preview without turning the whole forest into the test ring.

## Microsoft sources

- [Configure device sync with Microsoft Entra Cloud Sync (preview)](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/device-sync)
- [What's New in Microsoft Entra: August 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172)
- [Cloud Sync architecture](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/concept-how-it-works)
- [Configure Microsoft Entra hybrid join manually](https://learn.microsoft.com/en-us/entra/identity/devices/hybrid-join-manual)
- [Verify Microsoft Entra hybrid join](https://learn.microsoft.com/en-us/entra/identity/devices/how-to-hybrid-join-verify)
- [Troubleshoot Microsoft Entra hybrid joined devices](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-hybrid-join-windows-current)
- [Pending devices in Microsoft Entra ID](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/dir-dmns-obj/pending-devices)
- [Pause a synchronization job with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-pause?view=graph-rest-1.0)
