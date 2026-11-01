---
title: "AADSTS700003 Device Object Not Found: Microsoft Entra Fix"
excerpt: "Fix AADSTS700003 device object not found errors by proving deletion, choosing restore or re-registration, and validating device trust without weakening policy."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-01T17:08:56-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS700003 device object not found** error means the device identity presented during sign-in no longer resolves to an active device object in the user's home tenant. The safe fix is to preserve the failed sign-in and deletion evidence, prove the device's join type and Device ID, then decide whether a current soft-deleted object can be restored or the device must be registered again. Do not delete another device record, weaken Conditional Access, or reset the user's password to make the message disappear.

Grab a coffee before touching the join state. Microsoft documents two common messages for this error: **Device object was not found in the tenant directory** and **Your organization has deleted this device**. Registration or join creates a device identity that Microsoft Entra uses for device authentication, device-based Conditional Access, and management integrations. When the cloud object is missing, a local device can still look joined while its cloud trust is unusable. ([Microsoft's dedicated AADSTS700003 guidance](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts700003-device-object-not-found))

This guide is based on current Microsoft documentation and does not claim a live tenant or endpoint test. It is for Entra, Intune, Windows, and service-desk administrators who need to recover the intended device identity without erasing evidence or turning a deliberate offboarding action into unauthorized access.

## AADSTS700003 device object not found: the short answer

Work the incident in this order:

1. Capture the full error, UTC time, correlation or request ID, user, application, tenant, client, and device name.
2. Find the failed event in **Entra ID > Monitoring & health > Sign-in logs** and preserve its Device ID, device detail, application, resource, and Conditional Access result.
3. On Windows, run `dsregcmd /status` in the affected user's session. Record `AzureAdJoined`, `DomainJoined`, `WorkplaceJoined`, `DeviceId`, tenant details, `DeviceAuthStatus`, and SSO state.
4. Search the home tenant by the exact Device ID. Do not rely on the display name; duplicate names are normal after reimage or repeated registration.
5. Review audit logs for the device target and determine who or what deleted, unregistered, or moved it out of synchronization scope.
6. Determine whether the device is soft deleted and still restorable, hard deleted, unsupported by soft delete, merely disabled, or present under another Device ID.
7. If the deletion was intentional for a lost, retired, compromised, or offboarded device, stop. Do not restore or re-register it until the security owner authorizes recovery.
8. If recovery is authorized, use the path for the proven join type: restore an eligible soft-deleted object, reconnect a registered device, run `dsregcmd /forcerecovery` for an Entra-joined Windows device, or leave and re-establish hybrid registration for a hybrid-joined device.
9. Validate the new or restored Device ID, `DeviceAuthStatus`, Primary Refresh Token state, management check-in, compliance, and a fresh application sign-in.
10. Preserve the successful sign-in and registration or restore audit events, then monitor for recurrence.

The error identifies a device-directory boundary. It is not evidence that the password is wrong, MFA failed, the user signed in too many times, or Conditional Access evaluated incorrectly.

## Understand the device identity that AADSTS700003 cannot find

A Windows device can be Microsoft Entra registered, Microsoft Entra joined, or Microsoft Entra hybrid joined. Those states are not interchangeable:

- **Microsoft Entra registered** usually represents a personal or bring-your-own device connected with a work or school account. On Windows, `WorkplaceJoined` appears in the user-state section of `dsregcmd /status`.
- **Microsoft Entra joined** represents a device joined directly to Entra. `AzureAdJoined` is `YES` and `DomainJoined` is normally `NO`.
- **Microsoft Entra hybrid joined** represents an on-premises AD domain-joined device also registered with Entra. Both `AzureAdJoined` and `DomainJoined` are `YES`.

Microsoft's `dsregcmd` reference says the Device ID is the unique identifier of the device in the Entra tenant. It also defines `DeviceAuthStatus = SUCCESS` as present and enabled in Entra; `FAILED` can mean disabled or deleted. That status is useful evidence, but it does not by itself distinguish a deliberate disablement from a deleted object. ([troubleshoot devices with `dsregcmd`](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd))

AADSTS700003 is therefore a mismatch between local state and the cloud control plane: the client presents or relies on a device identity, but the active tenant directory cannot resolve that identity. The local certificate, cached broker state, workplace connection, or join metadata can remain after an administrator, device owner, synchronization change, or lifecycle process removes the cloud object.

That is different from the broader failures in the site's [Windows device join and registration diagnostic](/posts/microsoft-entra-windows-device-join-registration-failures), which can occur before a usable cloud identity is created. It is also narrower than a [Primary Refresh Token failure](/posts/microsoft-entra-primary-refresh-token-prt-failures-windows): AADSTS700003 tells you the referenced device object is missing, while PRT failures can also come from user, key, network, policy, or broker boundaries.

## Preserve the failed sign-in and deletion evidence

Record the original user-facing error before the user clears accounts or an administrator changes the device:

- complete AADSTS700003 text;
- UTC timestamp, trace ID, correlation ID, and request ID when present;
- user and home tenant;
- application and resource;
- client application, operating system, and device name;
- Device ID shown in the sign-in record;
- last successful use and first known failure;
- recent device cleanup, Intune retirement, Autopilot, reimage, sync-scope, ownership, or offboarding actions; and
- whether the device might be lost, stolen, compromised, or intentionally retired.

In **Entra ID > Monitoring & health > Sign-in logs**, filter by the narrow time window, user, application, and status, then open the failed record. Microsoft documents Reports Reader as the least-privileged role for viewing activity logs; standard audit and sign-in logs are available with Entra ID Free as well as P1 or P2. ([access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs))

Preserve the Basic info, Device info, Authentication Details, and Conditional Access tabs that are relevant to the event. Microsoft documents the sign-in record's user, client, application, resource, unique identifiers, device management and compliance values, authentication sequence, and Conditional Access result as separate evidence fields. A failed device identity can make the device fields incomplete, so an empty trust type or compliance value is not proof that the endpoint was never joined. ([sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

Then review **Entra ID > Devices > Audit logs** or the tenant audit log around the deletion time. Microsoft states that device operations such as deletion and update are recorded and exposes the target, actor, time, and activity. The audit activity reference also separates Device Registration Service events such as **Register device** and **Unregister device**. ([manage device identities](https://learn.microsoft.com/en-us/entra/identity/devices/manage-device-identities), [audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities#device-registration-service))

Do not recreate the device before collecting this evidence. A later successful registration does not explain why the original object disappeared or whether recovery should have been blocked.

## Prove the local join type and exact Device ID

On an affected Windows endpoint, run this read-only command in the signed-in user's context:

```powershell
dsregcmd /status
```

Capture these fields rather than pasting only the first page of output:

- `AzureAdJoined`, `DomainJoined`, and `WorkplaceJoined`;
- `DeviceId` and tenant identifiers;
- `DeviceAuthStatus`;
- device certificate validity and thumbprint;
- `AzureAdPrt` and its update time;
- `AadRecoveryEnabled` and `KeySignTest` when present; and
- pre-join diagnostic error phase, server message, HTTP status, and request ID when the device is attempting hybrid join.

Microsoft notes that device details and tenant details are shown for Entra-joined and hybrid-joined devices, while the registered state appears under user state. It also documents a pre-join response where the server says the object for a given Device ID is not found. ([`dsregcmd` device state and diagnostics](https://learn.microsoft.com/en-us/entra/identity/devices/troubleshoot-device-dsregcmd))

Search **Entra ID > Devices > All devices** by the exact Device ID. Microsoft specifically recommends Device ID when an owner-based search is unreliable. Compare object ID, Device ID, join type, enabled state, owner, management authority, compliance, and approximate registration time. ([manage device identities](https://learn.microsoft.com/en-us/entra/identity/devices/manage-device-identities))

Do not pick the record with the matching display name and delete the others. Microsoft's device FAQ explains that repeated joins, separate Windows users connecting work accounts, and reimages can create multiple records with the same name. The Device ID is the binding that matters. ([Microsoft Entra device management FAQ](https://learn.microsoft.com/en-us/entra/identity/devices/faq))

## Decide whether to restore, re-register, or stop

Use the evidence to choose one branch.

### The deletion was intentional

Stop if the device was deleted because it was lost, stolen, compromised, retired, transferred, or removed during offboarding. Microsoft says deletion prevents access to Entra resources and removes attached details; the newer soft-delete preview still prevents authentication while the object is suspended. Restoring or re-registering without authorization can undo a containment decision. ([manage device identities](https://learn.microsoft.com/en-us/entra/identity/devices/manage-device-identities), [device soft delete overview](https://learn.microsoft.com/en-us/entra/identity/devices/concept-soft-delete-devices))

Escalate with the user, Device ID, audit actor, deletion time, business owner, endpoint ownership, and security disposition. A support ticket is not authorization to reverse security lifecycle state.

### The device is soft deleted and recovery is authorized

Microsoft's current **device soft delete** feature is in preview. For supported Entra-registered, Entra-joined, and hybrid-joined device types, a deleted device can remain recoverable for up to 30 days. During that state it is hidden from active device lists and ordinary Graph queries, cannot authenticate, and keeps its Device ID reserved. ([device soft delete overview](https://learn.microsoft.com/en-us/entra/identity/devices/concept-soft-delete-devices))

During the preview, there is no portal restore experience. Microsoft documents discovery through the deleted-items Microsoft Graph endpoint and restoration through Microsoft Graph or PowerShell. Only Cloud Device Administrators, Intune Administrators, and Global Administrators can restore. After restore, compliance remains false until the management authority performs a fresh check-in and evaluation.

This creates an important current decision point that older recovery habits miss: **check the soft-deleted container before creating a replacement identity**. A supported soft-deleted object reserves its Device ID, so attempting to register the same identity can fail until the object is restored or permanently deleted. Do not permanently delete the object as a shortcut; Microsoft says hard deletion permanently loses its associated BitLocker and LAPS data.

Use Microsoft's current soft-delete documentation for the restore operation rather than an improvised beta command. Preview interfaces and behavior can change. After restoration, reboot or sign in as required, force the management check-in through the approved endpoint process, and wait for a fresh compliance result before judging Conditional Access.

### The object is hard deleted or the type does not support soft delete

If the object aged beyond the soft-delete window, was permanently deleted, or belongs to an unsupported device type, Microsoft says it cannot be recovered and must be recreated. The dedicated AADSTS700003 guidance provides the recovery path by join type:

- **Windows 10/11 Entra registered:** go to **Settings > Accounts > Access work or school**, select the affected work account, choose **Disconnect**, then connect and register it again.
- **iOS or Android Entra registered:** unregister the device in Microsoft Authenticator, then register it again.
- **macOS Entra registered:** use Microsoft Intune Company Portal to unenroll and remove the registration, then register again.
- **Windows Entra joined:** from an elevated console, run `dsregcmd /forcerecovery`, complete the sign-in dialog, then sign out and back in.
- **Windows Entra hybrid joined:** from an elevated console, run `dsregcmd.exe /debug /leave`, then restart and sign in with domain credentials so the supported registration process runs again.

Those are state-changing recovery actions. Prove the join type, confirm that recovery is authorized, preserve BitLocker and endpoint-management recovery material, and understand the user's ability to sign back in before executing them. Never run the hybrid leave command on an Entra-joined device simply because both are called “joined.”

For hybrid devices, investigate the authoritative cause before the retry. Microsoft lists removal of the computer's OU from synchronization scope as one reason the Entra device can be deleted. If that scope or source object remains wrong, local re-registration only repeats the failure. ([Microsoft Entra device management FAQ](https://learn.microsoft.com/en-us/entra/identity/devices/faq))

### The active object exists but is disabled

If the exact Device ID is present and disabled, do not call it a deletion. Microsoft says disabling a device prevents Entra authentication and revokes its PRT and refresh tokens. An Intune Administrator or Cloud Device Administrator can enable a device, but only after confirming why it was disabled and that re-enablement is authorized. ([manage device identities](https://learn.microsoft.com/en-us/entra/identity/devices/manage-device-identities))

If the active and enabled Device ID matches yet the client still reports AADSTS700003, re-check the tenant in the error, the local Device ID, account broker state, and whether the failed sign-in came from another endpoint or an older device identity. Do not delete the healthy object to make the evidence fit the theory.

## Validate device trust, management, and application access

After restore or re-registration, run `dsregcmd /status` again and compare it with the preserved baseline. Confirm:

- the intended join state is present;
- the Device ID matches the restored object or the newly created authorized object;
- tenant identifiers are correct;
- `DeviceAuthStatus` reports `SUCCESS` when the check can run;
- the device certificate and key test are healthy;
- the user has a current PRT where the scenario expects one;
- Intune or the configured management authority recognizes the device;
- compliance has completed a fresh evaluation; and
- a new application sign-in succeeds with the expected device details.

Do not stop at a successful `dsregcmd` command. A restored soft-deleted device intentionally returns with compliance reset, and a new registration can need management enrollment and policy evaluation before it satisfies device-based Conditional Access. The site's guide to a [compliant device still blocked by Conditional Access](/posts/microsoft-entra-conditional-access-compliant-device-blocked-sign-in) covers that next boundary.

In the sign-in log, verify the new event's user, tenant, application, resource, Device ID, trust type, managed and compliant values, authentication details, and Conditional Access result. The site's [Conditional Access sign-in log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is useful when AADSTS700003 is gone but another policy result remains.

Preserve the successful sign-in and the related **Restore device**, **Register device**, or other registration audit event. If the Device ID changed, update approved inventory, endpoint records, device-based groups, deployment rings, certificates, and support documentation that used the old ID. Do not assume a matching display name updates those dependencies.

## Prevent another AADSTS700003 incident

Treat device deletion as a controlled identity-lifecycle action:

1. **Disable before delete when investigation or containment needs reversibility.** Microsoft distinguishes disabling from deletion; disabling blocks device authentication without immediately removing the object.
2. **Coordinate Entra, Intune, Autopilot, and other authorities.** Microsoft says an Intune-managed device should be wiped or retired before its Entra object is deleted, and Autopilot devices must be removed from Intune first.
3. **Preserve recovery data.** Confirm BitLocker and LAPS recovery requirements before any permanent deletion.
4. **Use the Device ID in tickets and cleanup reports.** Display names are not unique.
5. **Protect hybrid scope changes.** Review OU filtering and staged sync changes for unexpected device deletion.
6. **Retain audit evidence.** Route logs to an approved destination when the investigation or compliance window must exceed native retention.
7. **Pilot stale-device cleanup.** Exclude active, recovery, shared, VDI, Autopilot, and special-purpose populations until their lifecycle is proven.
8. **Monitor deletion clusters.** Multiple device deletions by one actor, automation, or sync change deserve rapid review even before users report sign-in failures.

> [!NOTE]
> **Analysis:** AADSTS700003 volume is a lagging signal: users report it only when a deleted identity is needed again. Audit alerts on unexpected device deletion, sync-scope changes, and bulk cleanup provide an earlier control point.

## Troubleshoot the remaining failure

### `DeviceAuthStatus` still says FAILED

Confirm that the check ran with network access under system context, then compare the exact local Device ID with the active tenant object. Microsoft says FAILED can indicate disabled or deleted; use the portal, soft-deleted-object check, audit trail, and tenant ID to separate those states.

### `dsregcmd /forcerecovery` completes but the application still fails

Sign out and back in as Microsoft documents, then recheck the Device ID, PRT, management enrollment, compliance, and fresh sign-in record. If AADSTS700003 changed to another error, troubleshoot the new boundary instead of repeating recovery.

### A hybrid device returns after you delete it

Microsoft says hybrid objects can be recreated or re-enabled through synchronization. Inspect the on-premises computer object, OU filtering, source of authority, and sync result. If the device must remain blocked, apply the control at the authoritative on-premises boundary as well as in Entra.

### A restored device is not compliant

That is expected immediately after soft-delete restoration: Microsoft resets compliance-related properties and requires a fresh management check-in. Verify Intune ownership, enrollment, last check-in, policy assignment, and evaluation before adding Conditional Access exclusions.

### Another object has the same device name

Compare Device IDs, join types, owners, registration times, management state, and local evidence. Do not delete by name. Reimages, repeated joins, and separate user registrations can legitimately create duplicate display names.

### The object is missing from All devices but registration says the ID already exists

Check the device soft-deleted container. During preview, a soft-deleted object is hidden from normal device lists and ordinary Graph queries but keeps its Device ID reserved for up to 30 days. Restore it when authorized; do not permanently delete it merely to unblock registration.

## AADSTS700003 administrator checklist

- [ ] Capture the complete error, UTC time, correlation or request ID, user, app, and tenant.
- [ ] Preserve the failed sign-in record and relevant device details.
- [ ] Record `dsregcmd /status` before changing local state.
- [ ] Prove the join type and exact Device ID.
- [ ] Search the active tenant by Device ID, not display name.
- [ ] Review device and tenant audit logs for deletion or unregistration.
- [ ] Identify the actor, automation, or hybrid sync change that removed the object.
- [ ] Confirm whether the deletion was intentional or security-driven.
- [ ] Check the current soft-deleted-device container before re-registering.
- [ ] Verify whether the device type and deletion age permit restore.
- [ ] Obtain authorization before restore, reconnect, recovery, or leave operations.
- [ ] Use the Microsoft-documented recovery path for the proven join type.
- [ ] Correct hybrid synchronization scope before re-registration.
- [ ] Revalidate Device ID, tenant, certificate, key, and PRT state.
- [ ] Confirm management check-in and a fresh compliance evaluation.
- [ ] Prove one successful application sign-in with the expected device details.
- [ ] Preserve restore or registration audit evidence.
- [ ] Monitor for repeated deletion or cleanup activity.

## Frequently asked questions

### Does AADSTS700003 mean the user account was deleted?

No. The code refers to a missing device object in the user's home tenant. Preserve the user and tenant evidence, but investigate the device identity and its deletion history.

### Will a password reset fix AADSTS700003?

No. A password reset does not recreate a missing device object. It can add unrelated recovery work while leaving the device-directory mismatch unchanged.

### Should I delete the device again and reconnect it?

No. First determine whether the object is soft deleted and restorable, hard deleted, disabled, or intentionally removed. Permanent deletion can destroy BitLocker, LAPS, and device-identity continuity.

### Can I restore a deleted device in the Entra admin center?

Not during Microsoft's current device soft-delete preview. Microsoft documents restoration through Microsoft Graph or PowerShell and says a portal experience is planned for general availability. The preview supports common Entra registered, joined, and hybrid-joined types, but not every specialty device.

### Why does Windows still show the device as joined?

Local join metadata and credentials do not disappear automatically when the cloud object is deleted or disabled. `dsregcmd /status`, the exact Device ID, tenant state, and audit logs establish whether local and cloud state still agree.

### Is AADSTS700003 a Conditional Access error?

No. The missing device identity can prevent device-based Conditional Access from receiving usable device evidence, but the error itself occurs at device lookup. Restore or recreate the authorized identity first, then troubleshoot any remaining policy result.

### Is it safe to run `dsregcmd /leave` on any affected Windows device?

No. Microsoft documents that path for hybrid-joined recovery. Entra-joined Windows devices use `dsregcmd /forcerecovery`, while registered devices use their account-registration workflow. Prove the join type and recovery prerequisites before changing state.

The useful mental model is **failed sign-in, exact Device ID, audit cause, deletion state, join type, authorized recovery, post-recovery evidence**. Follow that order and AADSTS700003 becomes a bounded device-identity incident instead of a reason to delete more records or weaken device policy.
