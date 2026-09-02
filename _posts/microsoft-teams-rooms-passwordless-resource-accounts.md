---
title: "Microsoft Teams Rooms Passwordless Resource Accounts"
excerpt: "Migrate Microsoft Teams Rooms to passwordless resource accounts safely: check prerequisites, Conditional Access, recovery, monitoring, and password cleanup."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-02T09:07:06-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Teams Rooms passwordless resource accounts replace the password stored on an eligible shared Teams device with a secure, device-bound credential. The migration is **generally available**, administrator-initiated, optional, and not default-on. It supports eligible Teams Rooms on Windows, Teams Rooms on Android, Teams panels, and Teams phones, including common-area phones that use a supported resource account and license.

Microsoft lists the capability as GA in [What's new in Microsoft Entra for September 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-september-2026/4545179). Its [current migration guide](https://learn.microsoft.com/en-us/microsoftteams/rooms/passwordlessentraresourceaccounts) explicitly says Microsoft does not migrate devices automatically and does not currently require customers to migrate. There is no published mandatory-enforcement date or automatic rollout ring to plan around.

That makes this a controlled identity migration, not an emergency switch. Grab a coffee, choose one low-impact room, and prove the complete recovery path before scheduling a building or campus.

## Microsoft Teams Rooms passwordless resource accounts: what changes

A Teams Rooms resource account is still the Microsoft Entra identity that signs the device into Microsoft 365 and the Exchange resource mailbox that people invite when they book the room. It is not the similarly named Teams resource account used by call queues and auto attendants. Microsoft's [resource-account configuration guide](https://learn.microsoft.com/en-us/microsoftteams/rooms/create-resource-account) explains the distinction and recommends one dedicated account per Teams Rooms deployment.

The passwordless transition changes the device's authentication method; it does not turn the room into a human user and does not replace the mailbox, calendar, Teams, Intune, or Pro Management relationships. Microsoft documents this control-plane sequence:

1. The migration marks the account with **Set as Resource**.
2. For Teams Rooms on Windows, it moves the Teams Rooms app away from the local `Skype` Windows user and signs Windows in with the resource account, while moving the app settings.
3. The device requests a secure, device-bound credential from Microsoft Entra ID.
4. The device signs in and connectivity is validated. If that validation fails during migration, Microsoft says the transition rolls back automatically.
5. Teams Rooms Pro Management records the migration state.

The password does **not** disappear merely because the device has moved to passwordless authentication. It remains a usable account credential until an administrator removes or rotates it. That separation is important: a successful device migration and password cleanup are two different change records.

Microsoft also allows administrators to apply [Set as Resource without moving to passwordless authentication](https://learn.microsoft.com/en-us/microsoftteams/rooms/set-as-resource-account-for-shared-teams-devices). The marker tells supported Microsoft 365 services that the identity belongs to a shared device; Microsoft says this removes the account from meeting chats after a call and removes its access to shared files and recordings. The passwordless migration applies that marker automatically.

## Confirm every prerequisite before scheduling a device

Start with an inventory, not the migration button. Record the resource account UPN and object ID, cloud-only or synchronized source, associated mailbox, device platform, physical room, license, current device and app versions, Entra join state, Intune compliance state, Conditional Access group membership, network or proxy dependency, and accountable owner.

Then prove these Microsoft requirements from the [live prerequisite table](https://learn.microsoft.com/en-us/microsoftteams/rooms/passwordlessentraresourceaccounts#prerequisites) on the day of the change:

- The resource account already exists, is assigned to the device, and can sign in successfully before migration.
- The device and account are visible in Teams Rooms Pro Management.
- Teams Rooms on Windows and Android have a Teams Rooms license; Teams panels and Teams phones have the supported shared-space license. A panel using the same account as its Teams Room does not need another shared-space license.
- The operator scheduling the transition has the **Teams Administrator** role. Microsoft's current page says other admin roles, including Global Administrator, are planned but do not yet perform this step.
- Password cleanup is performed separately by an identity allowed to reset the account password, normally a User Administrator or Global Administrator, or an appropriately scoped custom role.
- The platform, operating system, Teams app, Authenticator app, and Teams Admin Agent meet Microsoft's current minimum versions.

For Teams Rooms on Windows, the current design also requires Windows 11 24H2 and Microsoft Entra join to the same tenant that owns the resource account; hybrid Microsoft Entra join is not supported for this migration. Microsoft publishes exact minimum builds and app versions in the prerequisite table. Check that table immediately before each ring instead of relying on a copied version number that might age between maintenance windows.

The August 12 migration guidance also says proxy-configured Teams Rooms on Windows are not yet supported. If a Windows room depends on a proxy, stop at preflight and verify the live Microsoft page before proceeding. Do not assume the Teams app reaching Microsoft 365 proves that Pro Management migration operations will follow the same proxy path.

Check the known-issues section as a hard gate too. Microsoft's current page says Crestron Teams Rooms on Windows are not compatible with passwordless resource accounts and should remain on password authentication for now. It also documents that delayed network availability during Windows startup can leave a migrated room at the sign-in page. Exclude those devices and correct startup network readiness before a pilot; do not discover either condition during a production meeting window.

Cloud-only and synchronized resource accounts can both migrate, and Microsoft says third-party federated identity providers are supported. The cleanup behavior differs later: the Pro Management cleanup wizard can remove a cloud-only account's password, while a synchronized account's password cannot be removed there. Microsoft recommends rotating the synchronized password to a complex unknown value after the device credential is proven.

## Fix Conditional Access before changing authentication

Passwordless does not make Conditional Access irrelevant. The resource account continues to request Microsoft 365 access, and policies can still block the sign-in even when the device-bound credential is healthy.

Microsoft's [Teams Rooms Conditional Access guidance](https://learn.microsoft.com/en-us/microsoftteams/rooms/conditional-access-and-compliance-for-devices) recommends putting resource accounts in a dedicated Microsoft Entra group, excluding that group from general user policies, and creating policies specifically for the shared-device design. The accounts must not be required to perform interactive MFA or register security information during the device sign-in flow; the device cannot complete those human prompts. Use supported device, platform, compliant-device, network-location, client-app, and resource conditions instead.

That exception must be narrow. A room account is represented as a user object in Microsoft Entra ID, so a broad user exclusion can expose more cloud resources than the room needs. Scope the dedicated policy to the documented Microsoft 365 resources and supported controls, keep the group owner-controlled, and review the effective policy set with the [Conditional Access evaluation model](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) before the pilot.

Device code flow needs equally careful treatment. Microsoft's [current device-code-flow policy guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-teams-devices-device-code-flow) says Teams resource accounts using passwordless authentication need device code flow for initial provisioning rather than routine reauthentication. Microsoft still recommends keeping genuine Teams device resource accounts in a persistent, monitored exception group so reset, replacement, and reprovisioning are not blocked. The exception is account-scoped, not limited to one device or one application, so record the room, device, owner, and approval for every member and remove retired accounts promptly.

Before migration, capture one successful resource-account sign-in and its applied Conditional Access policies. Use the site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) to verify the result instead of trusting only the device's home screen.

## Run a one-room passwordless pilot

Use a room that can be taken out of service without affecting executive, emergency, clinical, production, or public-facing operations. A useful pilot represents the same identity source, device platform, network path, compliance policies, and booking configuration as a larger production ring.

### Ring 0: prove the old path and the recovery path

Before changing anything:

- verify a meeting can be booked and joined;
- confirm calendar, calling, content sharing, and device management work;
- capture the room's Pro Management health and current software versions;
- export or record the relevant Entra sign-in result, Conditional Access details, request ID, correlation ID, and timestamp;
- confirm an authorized administrator can reset the resource-account password; and
- obtain the manufacturer's Windows recovery image or document the supported reset and sign-out procedure for the device platform.

Do not clean up the password during this ring. It is the bootstrap credential you may need if the device is reset or the passwordless credential is removed.

### Ring 1: schedule one migration

In Teams Rooms Pro Management, browse to **Planning > Resource Accounts > Migration**, select the eligible pilot account, and choose **Schedule migration**. Microsoft supports migrating immediately or during the next maintenance window. Review the selected account and device carefully before confirming; similar room names are not sufficient identity proof.

After the scheduled operation, verify all four signals Microsoft calls out:

- the room reports healthy in Pro Management;
- the device signs in successfully;
- it starts without repeated sign-in prompts; and
- expected Teams device functions still work.

For a stronger pilot, reboot once and repeat the meeting and calendar tests. Microsoft says a migrated device should continue signing in automatically after restart.

### Ring 2: prove policy and token resilience

Inspect Microsoft Entra sign-in logs for the exact resource-account UPN. Microsoft's [sign-in-log documentation](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins) separates the identity, client application, and target resource; the activity detail also shows Conditional Access status and supplies request and correlation IDs for escalation.

Confirm that:

- the expected device and client details appear;
- only the intended Microsoft 365 resources are being accessed;
- no general-user MFA or registration policy interrupts the account;
- the purpose-built Teams device policies evaluate as designed; and
- there are no repeated failures hidden behind an apparently healthy console.

Do not interpret a single `Success` value as proof that every policy granted access. Microsoft notes that the Conditional Access status can show success when policies were evaluated but their other conditions did not apply. Read the individual policy results and authentication details.

### Ring 3: clean up the password only after soak time

Once the device has survived the agreed soak period, a restart, a representative meeting, and log review, remove or neutralize the old credential.

For a cloud-only resource account, use **Planning > Resource Accounts > Migration > Cleanup password** in Pro Management. For a synchronized account, Microsoft says the wizard cannot remove the password; rotate it to a complex value that device operators do not know. A post-migration password change should not sign the device out because the device no longer uses that password for normal authentication.

Record the cleanup as its own evidence point. Confirm the device remains healthy after the password action and that the old password no longer provides an unintended interactive route.

### Ring 4: expand by failure domain

Expand by one platform, building, network path, and identity source at a time. Do not mix Windows, Android, panels, phones, cloud-only accounts, synchronized accounts, and proxy-dependent sites into a single first wave. Each category has a different recovery boundary.

**Analysis:** a ring should be sized by the number of rooms the operations team can physically recover before the next business-critical meeting window, not by how many rows the portal lets an administrator select.

## Recovery is platform-specific

The passwordless credential is bound to the device and cannot be transferred. Reimaging, replacing, resetting, or manually signing out can remove it. Microsoft does not currently provide a passwordless bootstrap from the device login screen, so recovery returns to a password long enough to sign in and migrate again.

For a Teams Rooms on Windows failure, Microsoft's supported reversion requires resetting the device with the manufacturer's recovery image or the Teams Rooms recovery tool. For Teams Rooms on Android, Teams panels, and Teams phones, a full local or remote sign-out removes the passwordless credential and returns the device to username-and-password sign-in. ([Microsoft Learn](https://learn.microsoft.com/en-us/microsoftteams/rooms/passwordlessentraresourceaccounts#troubleshooting-known-issues-and-faqs))

That is why password cleanup needs a recovery owner. If a cloud-only account no longer has a password, an authorized administrator must reset one before reimaging or replacing the device. If a synchronized account has an unknown rotated password, the on-premises identity owner must create a temporary known credential through the approved source-of-authority process. After the device is healthy, migrate it again and repeat cleanup.

Do not delete the resource account to fix a device-bound credential problem. The account also anchors the mailbox, calendar, license, policies, logs, and room identity. Preserve evidence, recover the device, and change the account only when the identity itself is proven defective.

## Troubleshoot the failure by layer

### The account is not eligible in Pro Management

Confirm that the account and device are visible in the portal, the account is assigned to the correct device, the license matches the platform, the operator is a Teams Administrator, and every platform component meets the current minimum version. For Windows, confirm same-tenant Microsoft Entra join and reject hybrid-joined or currently unsupported proxy designs.

### Migration starts and then rolls back

Microsoft says connectivity validation can trigger automatic rollback. Open the failed migration detail in Pro Management and capture its reason before retrying. Then find the same timestamp in Entra sign-in logs and inspect status, failure code, client, resource, device details, authentication details, and each Conditional Access result. Do not weaken tenant-wide policies to make one room pass.

### The device is healthy but keeps prompting

Check for a general-user policy that requires interactive MFA, security-information registration, a terms or consent interaction, or another unsupported sign-in action. Confirm the room account is in the dedicated policy and device-code-flow exception groups and that those memberships have converged. Then verify the prompt is actually from Microsoft Entra rather than the Teams app, mailbox, network, or device-management plane.

### Password cleanup fails

First classify the identity source. The Pro Management password-removal workflow is for cloud-only accounts; synchronized accounts retain their source-controlled password and must be rotated instead. Confirm the cleanup operator has password-reset permission over the account, including any administrative-unit scope.

### A reset or replacement device cannot sign in

This is expected if the device-bound credential was removed with the old device. Restore a temporary usable password through the correct source of authority, verify the account remains in the device-code-flow exception, sign the replacement device in, and schedule a new passwordless migration. Do not attempt to copy the credential from the retired device.

### Escalation evidence is incomplete

**Analysis:** a useful Microsoft support package should contain the tenant ID, resource-account UPN and object ID, device platform and model, software versions, Entra join and compliance state, Pro Management migration state and failure reason, UTC and local timestamps, sign-in request and correlation IDs, Conditional Access results, identity source, license, network or proxy path, and the last known-good operation. Redact secrets; never send the password or a device credential.

## Administrator checklist

- [ ] Confirm the September 2026 Entra release still lists passwordless Teams resource accounts as GA.
- [ ] Verify the migration remains optional and administrator-initiated.
- [ ] Inventory each account, mailbox, device, room, identity source, license, owner, policy, and network path.
- [ ] Distinguish Teams device resource accounts from voice-application resource accounts.
- [ ] Check the live Microsoft prerequisite table immediately before every ring.
- [ ] For Windows, verify Windows 11 24H2, same-tenant Microsoft Entra join, and current proxy support.
- [ ] Use a Teams Administrator for migration and a separately authorized identity for password cleanup.
- [ ] Put device accounts in dedicated Conditional Access and device-code-flow exception groups.
- [ ] Exclude interactive MFA and security-information registration from the shared-device sign-in flow.
- [ ] Limit resource access and review the complete effective Conditional Access set.
- [ ] Capture a successful pre-migration sign-in and the platform-specific recovery procedure.
- [ ] Migrate one noncritical room and verify health, reboot, booking, meeting, and sign-in evidence.
- [ ] Remove or rotate the password only after the device credential has soaked successfully.
- [ ] Expand by platform, building, network, and identity-source failure domain.
- [ ] Keep reset, reimage, temporary-password, reprovisioning, and account-retirement runbooks current.
- [ ] Escalate with Pro Management evidence and Entra request and correlation IDs, never credentials.

Passwordless Teams resource accounts remove a fragile stored password from normal device authentication, but they do not remove identity operations. The durable design is a small migration ring, purpose-built Conditional Access, tightly governed device-code-flow exceptions, deliberate password cleanup, and a tested path back to password bootstrap when hardware is reset or replaced.
