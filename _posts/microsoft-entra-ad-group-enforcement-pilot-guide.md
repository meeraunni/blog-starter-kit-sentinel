---
title: "Microsoft Entra AD Group Enforcement: Safe Pilot Guide"
excerpt: "Pilot Microsoft Entra AD group enforcement safely: prepare every writable domain controller, audit blocked writes, test Cloud Sync, and plan rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-06T12:40:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra AD group enforcement** is a public-preview control for cloud-managed security groups that Microsoft Entra Cloud Sync provisions to on-premises Active Directory. It lets a domain controller reject an out-of-band LDAP change before that change creates drift from the group managed in Microsoft Entra ID.

Here is the short answer: update and enable the feature on **every writable domain controller**, install the source-of-authority policy in **Audit** mode, mark one low-risk cloud-provisioned group, test writes against every writable domain controller, and move to **Enforced** only after the logs prove that Cloud Sync and the emergency path work. If one writable domain controller cannot run the feature, do not treat the group as protected.

Grab a coffee before touching the policy. This preview moves the decision point into Active Directory's write path, which is exactly why a partial deployment creates a dangerous false sense of control.

Microsoft lists the capability as [public preview in the current Entra release notes](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#public-preview---prevent-unauthorized-changes-to-ad-groups-with-ad-group-enforcement). The [current configuration guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-ad-group-enforcement) confirms that the preview is opt-in, requires both an Active Directory enforcement engine and Cloud Sync configuration, and is not a generally available, default-on, or mandatory change. Microsoft has not published a GA date or an enforcement deadline.

## Microsoft Entra AD group enforcement: what it protects

The feature applies only after a cloud security group is provisioned to Active Directory through Microsoft Entra Cloud Sync and marked for enforcement. It does not make every AD group cloud-managed, and installing the provisioning agent does not turn on domain-wide protection.

Two controls work together:

1. A domain-level policy is stored in a `SOA-Policies` container under the domain's `CN=System` container. Its `Cloud` policy records whether enforcement is in Audit or Enforced mode and which security identifiers are allowed to modify protected objects.
2. A per-group `msDS-ObjectSoa` marker with the value `Cloud` tells Active Directory that the policy applies to that group. Cloud Sync sets the marker through the group's attribute mapping.

When an LDAP write reaches a domain controller, that domain controller checks the group marker and the policy. In **Audit** mode, an unauthorized change is allowed but can be recorded in the Directory Service log. In **Enforced** mode, an unauthorized modify, rename or move, or recycle-bin restore is rejected before it is committed. The existing AD access-control list still applies; enforcement adds a restriction and does not grant new access.

That is a different model from post-change reconciliation. There is no interval in which an unauthorized membership change is accepted and later overwritten by Cloud Sync. The domain controller that receives the write either permits it or rejects it.

> [!NOTE]
> **Analysis:** this control is most valuable where a Microsoft Entra group is the approved source for access to an AD-dependent application. It prevents a local operator, script, or legacy tool from quietly changing the protected group's own membership or attributes outside the cloud governance path.

The site's [Microsoft Entra Cloud Sync device pilot guide](/posts/microsoft-entra-cloud-sync-device-sync-pilot-guide) explains the same agent-and-cloud service boundary in a different scenario. For group enforcement, add a third evidence source: the Active Directory policy state on every writable domain controller.

## Know the preview gaps before you approve a pilot

AD group enforcement is narrow by design. Microsoft's configuration guide and [group-provisioning FAQ](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-provision-to-active-directory-faq) document boundaries that belong in the change record:

- **Groups only:** user objects are not supported in this preview.
- **Marked objects only:** a group without `msDS-ObjectSoa=Cloud` is not protected.
- **Every writable domain controller matters:** a write sent to a writable domain controller that is not updated and enabled is processed normally.
- **Deletion remains possible:** the preview does not prevent deletion of an enforced group.
- **LDAP Add remains possible:** enforcement permits an Add operation even when the new object includes the marker.
- **Nesting is not a complete boundary:** protecting Group A does not stop an administrator from adding Group A to an unprotected Group B.
- **Source-of-authority conversion is separate:** converting a group's source of authority to Microsoft Entra does not automatically enforce the group in AD.
- **Existing group-provisioning limits remain:** enforcement does not expand the object types, membership combinations, scale, or topologies supported by group provisioning to AD.

These are not reasons to dismiss the feature. They are reasons to define the promise accurately: it protects supported write operations against the marked group's own AD object when the receiving writable domain controller is participating.

If deletion recovery is part of your risk claim, treat it as a separate control. The [Microsoft Entra backup and recovery strategy](/posts/microsoft-entra-id-backup-recovery-strategy) explains why prevention, soft-delete recovery, and configuration reconstruction are different jobs.

## Prove the prerequisites before changing a domain controller

Do not begin with the PowerShell script. Begin with a written inventory.

Microsoft's current preview prerequisites require:

- Microsoft Entra ID P1 licensing for group provisioning to AD;
- a cloud security group that is supported for provisioning to Active Directory;
- a Microsoft Entra Cloud Sync provisioning configuration and healthy agent;
- at least Hybrid Identity Administrator for the Cloud Sync setup;
- Domain Admin to install and manage the AD source-of-authority policy;
- Windows Server 2022 or Windows Server 2025 on **every writable domain controller** in the domain;
- a Windows Server 2019 or Windows Server 2022 host for the provisioning agent; and
- the existing `msDS-ObjectSoa` schema attribute, which has been present since the Windows Server 2016 schema. No schema extension is required.

Microsoft's [group provisioning tutorial](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/tutorial-group-provisioning) confirms the P1 requirement, Hybrid Identity Administrator role, selected-group scoping recommendation, supported member requirements, and the Cloud Sync operating path. The [group source-of-authority guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/concept-group-source-of-authority-guidance) is the source to use when the pilot also involves converting an existing AD-managed group to cloud management.

Inventory all writable domain controllers with the Microsoft-published command:

```powershell
Get-ADDomainController `
    -Filter * |
    Where-Object {
        -not $_.IsReadOnly
    }
```

For each result, record the domain, site, operating system, patch level, restart state, policy application, and a named owner. Read-only domain controllers are not the enforcement completeness gate, but every writable domain controller is.

Also capture:

- the Cloud Sync configuration ID, provisioning agent host, service status, and agent version;
- the provisioning agent's group managed service account (gMSA) and SID;
- the current group-provisioning scope and attribute mappings;
- the cloud group object ID, current membership, on-premises distinguished name, and business owner;
- every tool or process that currently modifies that AD group;
- the current ACL, delegated administrators, automation identities, and emergency change path; and
- recovery ownership if the group is deleted or the Cloud Sync path becomes unavailable.

Use a group whose owner understands that on-premises edits will stop being authoritative. Do not choose an emergency-access group, a domain-wide access group, or a group with undocumented provisioning consumers for the first test.

## Build the control plane in Audit mode first

### 1. Update and enable every writable domain controller

Microsoft ships the enforcement engine in Windows Server cumulative updates, but the feature remains disabled until the matching Group Policy package enables it during the preview. The current guide publishes minimum file versions and separate packages for Windows Server 2022 and Windows Server 2025. Read those values from the guide at change time rather than copying an old threshold into a permanent runbook.

Deploy the current cumulative update and matching package to every writable domain controller, restart where required, and verify the resulting policy application. Microsoft's [Known Issue Rollback deployment guide](https://learn.microsoft.com/en-us/troubleshoot/windows-client/group-policy/use-group-policy-to-deploy-known-issue-rollback) explains how the policy-definition package, Group Policy Object, restart, and result monitoring fit together.

After the primary domain controller emulator is updated and enabled, confirm that `CN=SOA-Policies` exists beneath the domain's `CN=System` container and has replicated. Do not assume that seeing the container on one domain controller proves the enforcement engine is active everywhere.

### 2. Install the Cloud policy in Audit mode

Run Microsoft's `Set-CloudSyncSOAPolicy.ps1` from the server that hosts the Cloud Sync provisioning agent. The script discovers the agent gMSA, creates the `Cloud` policy object, and adds the gMSA SID to the allow list.

Start with Audit:

```powershell
$credential = Get-Credential

.\Set-CloudSyncSOAPolicy.ps1 `
    -EnforcementMode Audit `
    -Credential $credential
```

Download the script only from the repository linked by Microsoft's current configuration guide, review it under your code-signing and change-control process, and preserve the version or commit used. Do not type a copied internet script directly into a production domain controller.

Confirm the `Cloud` policy says Audit and that the expected gMSA SID is present. Allow AD replication to converge before marking a production group.

### 3. Enable useful Directory Service evidence

With the default Security Diagnostics value of `0`, Microsoft says only policy-load events are recorded; individual Audit-mode or blocked-write events are not. Follow Microsoft's [AD and LDS diagnostic event logging guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/configure-ad-and-lds-event-logging) and the preview guide to set Security Diagnostics to `1` on the domain controllers used in the pilot, then verify the Directory Service log is collected and retained.

Do not enable broad diagnostic categories without a retention and capacity plan. The requirement here is the specific policy evidence Microsoft documents for this feature.

### 4. Mark one cloud-provisioned group

In the group-provisioning-to-AD configuration, add `msDS-ObjectSoa` as a target attribute with the value `Cloud`. Microsoft supports a constant mapping for all groups in the configuration's scope or an expression mapping for a bounded subset.

For a first pilot, keep the provisioning scope itself narrow. A constant mapping applied to an unexpectedly broad configuration can mark far more groups than the change owner intended.

Provision the selected group on demand or allow the scheduled job to run. In ADSI Edit, enable Advanced Features, open the on-premises group, and verify that `msDS-ObjectSoa` is exactly `Cloud`. The [on-demand provisioning guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-on-demand-provision-entra-to-active-directory) documents the portal path and its five-member test limit.

## Test every write path, not just one AD console

Audit mode is your dependency discovery phase. Test the operations and identities that could touch the group:

1. Change membership from the approved Microsoft Entra and Cloud Sync path. Confirm the intended change reaches AD and the provisioning result is successful.
2. Attempt a direct AD membership change with an unauthorized administrative identity.
3. Attempt an attribute change and a rename or move with the same identity.
4. Repeat an unauthorized write against **each writable domain controller**, explicitly targeting the server rather than relying on locator selection.
5. Exercise the documented emergency identity only if your design includes one.
6. Review the Directory Service log on the domain controller that processed each write.
7. Review Cloud Sync provisioning logs for the same group and preserve the job ID, action, status, modified properties, and timestamps.

In Audit mode, the unauthorized writes should still succeed under the existing AD ACL while creating the expected policy evidence. That is the point: you are discovering tools, service accounts, help-desk procedures, and applications that would fail in Enforced mode.

Microsoft's [provisioning-log analysis guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs) documents the portal, CSV, JSON, Microsoft Graph, and Azure Monitor paths. Reports Reader is the least-privileged role for provisioning logs, and routing the logs to Azure Monitor provides retention beyond the built-in window.

> [!NOTE]
> **Operational recommendation:** run Audit mode through at least one representative operational cycle for the selected group. The duration is tenant-specific; the evidence gate is more important than an arbitrary number of days.

## Move one group to Enforced mode

Before enforcement, require four green signals:

- every writable domain controller is on a supported OS, updated, restarted, enabled, and individually tested;
- the `SOA-Policies` container and `Cloud` policy have replicated correctly;
- the marked pilot group receives approved Microsoft Entra changes through Cloud Sync; and
- every Audit-mode event has an owner, an approved replacement path, or an intentional exception.

Then run the same Microsoft script with Enforced mode:

```powershell
$credential = Get-Credential

.\Set-CloudSyncSOAPolicy.ps1 `
    -EnforcementMode Enforced `
    -Credential $credential
```

Repeat the test matrix. Approved Cloud Sync writes should succeed. Unauthorized membership, attribute, rename, move, and restore attempts should be blocked. Confirm the failure against every writable domain controller and record the evidence.

Do not test deletion on a group you need. Microsoft explicitly says deletion remains permitted in this preview; proving that limitation by deleting a production object adds risk without increasing confidence.

## Design the emergency path without weakening the policy

Microsoft lets you add authorized SIDs to the `msDS-Settings` attribute of the `Cloud` policy. This can provide an emergency path when cloud provisioning is unavailable, but it is a permanent bypass for any identity whose SID appears there.

The current guide documents two sharp edges:

- the allow list supports at most 64 SIDs; and
- one invalid or stale SID can make the policy fail to load, leaving no identities authorized until the error is corrected.

Keep the list as small as possible. If an emergency account is required, make it dedicated, strongly protected, monitored, periodically tested, and excluded from normal administration. Record its current SID and the process for updating the policy if the account is recreated.

An ordinary Domain Admin should not become the default bypass. The purpose of the control is to stop direct AD changes that circumvent the cloud governance path, including changes made by identities that the normal ACL would otherwise permit.

## Roll back at the policy boundary

The documented reversible containment action is to switch the domain's `Cloud` policy from Enforced back to Audit with `Set-CloudSyncSOAPolicy.ps1`. Audit mode returns authorization decisions to the existing AD ACL while retaining evidence of writes that enforcement would have blocked.

Use that rollback when a legitimate dependency is blocked broadly or the Cloud Sync route is unavailable and the emergency path is not ready. Record the time, reason, operator, affected group, and next review point. Do not leave the tenant quietly in Audit and continue reporting the group as enforced.

If Cloud Sync is changing the wrong group or wrong attributes, stop expansion and contain that provisioning configuration through its supported controls. Switching enforcement to Audit does not reverse completed Cloud Sync changes, and pausing Cloud Sync does not make direct AD edits authoritative. Those are different planes.

Microsoft has not documented a one-click transaction rollback for this preview. Preserve the known-good group membership and attributes before the pilot, and make recovery an owned procedure rather than an assumption.

## Troubleshoot Microsoft Entra AD group enforcement

### An unauthorized AD change still succeeds

Check the domain controller that accepted the write. It might be unsupported, missing the cumulative update, missing the feature-enablement policy, not restarted, or still processing an old policy state. Also confirm that the domain policy is Enforced and the target group's `msDS-ObjectSoa` value is `Cloud`.

Use Microsoft's `Check-CloudSyncSOAPolicy.ps1` from the repository linked in the configuration guide on the specific domain controller. `nltest /dsgetdc:<your domain>` can show which domain controller a client locates, but the validation gate remains an explicit test of every writable domain controller.

### An approved Cloud Sync change is blocked

Confirm that the provisioning agent gMSA SID is present in `msDS-Settings`, the SID is current, and the policy has replicated to the domain controller handling the write. A recreated account receives a new SID even if it has the same name.

Inspect the Directory Service policy-load events before changing ACLs. AD group enforcement is additive; granting more rights in the group ACL does not bypass a source-of-authority policy that does not authorize the caller.

### The group is provisioned but not protected

Cloud provisioning success is not the enforcement signal. Verify the group's `msDS-ObjectSoa` marker in AD, confirm the mapping used by the correct Cloud Sync configuration, and check whether the object is inside the intended provisioning scope.

### Audit mode produces no individual events

Confirm Security Diagnostics is set to the Microsoft-documented value and that you are reading the Directory Service log on the domain controller that processed the test. At the default value, individual Audit-mode writes are not logged.

### The group is protected, but an access path still changes

Check for nesting. The preview protects changes to the marked group's own object. It does not stop an administrator from placing that group inside an unprotected group whose access is broader. Review the full authorization chain, not just the protected group's direct members. The site's [memberOf migration guide](/posts/microsoft-entra-memberof-retirement-migration-guide) covers why group relationships need an explicit source of truth and lifecycle owner.

## Administrator checklist

- [ ] Record the feature as public preview with no published GA or mandatory date.
- [ ] Confirm Microsoft Entra ID P1 and a supported group-provisioning-to-AD configuration.
- [ ] Inventory every writable domain controller and confirm Windows Server 2022 or 2025.
- [ ] Update, enable, restart, and individually validate every writable domain controller.
- [ ] Verify the Cloud Sync agent, gMSA, SID, configuration ID, scope, and mappings.
- [ ] Capture the pilot group's object ID, membership, attributes, ACL, owner, and recovery plan.
- [ ] Install the source-of-authority policy in Audit mode first.
- [ ] Enable the documented Directory Service evidence and retain it centrally.
- [ ] Mark one low-risk group and verify `msDS-ObjectSoa=Cloud` in AD.
- [ ] Test approved and unauthorized changes against every writable domain controller.
- [ ] Resolve every unexpected Audit-mode writer before Enforced mode.
- [ ] Treat deletion, LDAP Add, nesting, and unmarked objects as explicit preview gaps.
- [ ] Keep emergency SIDs minimal, monitored, current, and tested.
- [ ] Document switching Enforced back to Audit as the control-plane rollback.
- [ ] Expand only after Cloud Sync logs and AD logs tell the same story.

Microsoft Entra AD group enforcement can close a real hybrid governance gap, but only if the control is complete at the domain-controller layer. Marking the group is the visible step. Proving every writable domain controller, every writer, and the emergency path is the work that makes the preview defensible.

## Microsoft sources

- [Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#public-preview---prevent-unauthorized-changes-to-ad-groups-with-ad-group-enforcement)
- [Configure AD group enforcement in Microsoft Entra Cloud Sync](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-ad-group-enforcement)
- [Provision groups to Active Directory with Microsoft Entra Cloud Sync](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/tutorial-group-provisioning)
- [Provisioning to Active Directory with Cloud Sync FAQ](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-provision-to-active-directory-faq)
- [Guidance for using Group Source of Authority](https://learn.microsoft.com/en-us/entra/identity/hybrid/concept-group-source-of-authority-guidance)
- [Install the Microsoft Entra provisioning agent](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install)
- [On-demand provisioning from Microsoft Entra ID to Active Directory](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-on-demand-provision-entra-to-active-directory)
- [Analyze Microsoft Entra provisioning logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs)
- [Use Group Policy to deploy a Known Issue Rollback](https://learn.microsoft.com/en-us/troubleshoot/windows-client/group-policy/use-group-policy-to-deploy-known-issue-rollback)
- [Configure AD and LDS diagnostic event logging](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/configure-ad-and-lds-event-logging)
