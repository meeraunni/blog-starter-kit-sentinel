---
title: "Microsoft Entra Cloud Sync Exchange Attribute Writeback: A Safe Rollout Guide for Hybrid Mailboxes"
excerpt: "Exchange attribute writeback for cloud-managed remote mailboxes is now generally available. Learn how the source-of-authority split works, what writes back to Active Directory, and how to pilot and roll back the change safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-25T17:00:00.000-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

If your mailboxes live in Exchange Online but your users still synchronize from Active Directory, you have probably met the last-Exchange-server problem. The mailbox is in the cloud, yet many Exchange attributes are still mastered on-premises. An administrator changes them with Exchange Server recipient tools, and directory synchronization carries the result to Microsoft 365.

Grab a coffee, because that control-plane boundary can now move without moving the whole user object.

Microsoft made **Exchange attribute writeback for cloud-managed remote mailboxes generally available on August 3, 2026**. The feature lets Exchange Online become the source of authority for a directory-synchronized mailbox's Exchange attributes while Active Directory remains authoritative for the user's identity attributes. Microsoft Entra Cloud Sync can then write a supported subset of Exchange changes back to Active Directory. Microsoft announced the GA milestone in the [Exchange Team release post](https://techcommunity.microsoft.com/blog/exchange/writeback-for-cloud-managed-remote-mailboxes-now-generally-available/4543507), and the [August 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172) independently lists the capability as GA.

That sounds like a simple writeback toggle. It is not. You are changing which system wins when two directories hold values for the same mailbox, so the rollout needs the same care as any other source-of-authority migration.

## Status and scope in one minute

| Question | Confirmed answer |
|---|---|
| Release state | Generally available: Phase 1 for cloud-managed Exchange attributes and Phase 2 for Cloud Sync writeback |
| Default behaviour | Per-mailbox cloud management is off; `IsExchangeCloudManaged` is `false` by default |
| Identity source of authority | Remains in on-premises Active Directory |
| Exchange attribute source of authority | Moves to Exchange Online for each opted-in mailbox |
| Writeback engine | Microsoft Entra Cloud Sync provisioning agent and configuration |
| Supported object | Directory-synchronized users with mailboxes in Exchange Online |
| Mail-enabled groups and contacts | Not covered by `IsExchangeCloudManaged`; they have separate object-level SOA paths |
| Supported scale | Up to 600,000 cloud-managed mailboxes per tenant |
| Supported clouds | Commercial, GCC High, DoD, and Gallatin/21Vianet |
| Mandatory enforcement | No; administrators opt in per mailbox or deliberately enable the tenant-wide default |

Microsoft's current [cloud-based Exchange attribute management documentation](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/enable-exchange-attributes-cloud-management) confirms both phases as GA, the supported cloud environments, the per-mailbox default, and the 600,000-mailbox ceiling.

One label deserves special attention: the same Microsoft Learn procedure currently tells administrators to select **EXO to AD attribute sync (Preview)** when creating the Cloud Sync configuration. That is the documented menu text even though the feature-availability section and both Microsoft release posts say Phase 2 is GA. Do not reinterpret the menu label as a separate rollout announcement; record the mismatch in your change evidence and follow the current Microsoft Learn page for supported status and configuration.

## The architecture: two sources of authority, one user

Before this change, a typical hybrid mailbox follows this path:

```text
Exchange recipient tools
        |
        v
Active Directory  -- Connect Sync / Cloud Sync -->  Microsoft Entra ID and Exchange Online
  identity SOA
  Exchange-attribute SOA
```

After you set `IsExchangeCloudManaged` to `true`, the paths split:

```text
Active Directory  -- Connect Sync / Cloud Sync -->  Microsoft Entra ID
  identity SOA                                      directory-synchronized user

Exchange Online  -- Microsoft Entra Cloud Sync -->  Active Directory
  Exchange-attribute SOA                             supported Exchange attributes only
```

The user does **not** become cloud-only. `IsDirSynced` remains true, and identity fields such as the user's name, department, user principal name, and account state continue to be governed by Active Directory. Exchange properties become editable through Exchange Online PowerShell, the Exchange admin center, or the Microsoft 365 admin center. Microsoft documents this boundary explicitly in its [source-of-authority overview for remote mailboxes](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/enable-exchange-attributes-cloud-management#relationship-to-object-level-source-of-authority).

Writeback is a second, optional layer. It exists for on-premises applications that still read Exchange data from Active Directory. If nothing on-premises consumes those values, Microsoft says the mailbox can remain fully cloud-managed without writeback. If an HR connector, identity manager, address-book process, application, or script reads `proxyAddresses`, `mail`, or extension attributes from AD, writeback keeps that local copy current. The distinction is important: **cloud management changes authority; writeback preserves a downstream replica**.

> [!NOTE]
> **Analysis:** The security benefit is not that Cloud Sync makes Exchange attributes inherently safer. The benefit is a clearer administrative boundary: Exchange administrators can manage mailbox properties in Exchange Online without sharing an on-premises Exchange management path. The new risk is that an unrecorded AD consumer may now receive values authored in the cloud.

## What actually writes back

The GA writeback set contains 24 attributes:

- `extensionAttribute1` through `extensionAttribute15`
- `msExchExtensionCustomAttribute1` through `msExchExtensionCustomAttribute5`
- `msExchRecipientDisplayType`
- `msExchRecipientTypeDetails`
- `proxyAddresses`
- `mail`

Microsoft's attribute matrix distinguishes properties that are editable in Exchange Online from the smaller subset that writes back to AD. For example, `HiddenFromAddressListsEnabled` is cloud-editable after the SOA transfer but its corresponding AD value is not in the writeback set. The full, current mapping belongs in your change record; use Microsoft's [Identity, Exchange Attributes and Writeback table](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/enable-exchange-attributes-cloud-management#identity-exchange-attributes-and-writeback) instead of assuming that every `Set-Mailbox` change will appear on-premises.

The `mail` attribute is the important GA addition. A change to `WindowsEmailAddress` in Exchange Online can now write back to Active Directory's `mail` attribute. Configurations created on or after August 3, 2026 include the `Mail` to `mail` mapping by default. Earlier preview configurations are **not** upgraded automatically.

If you created the job before August 3, inspect its mappings. Microsoft documents a **Restore default mappings** action to add the missing mapping, but that action also removes customized mappings and scoping filters and restarts the synchronization job. Export or record every customization before using it. This is not a button to click casually during business hours.

## Prerequisites and licensing

For the Exchange attribute SOA feature, Microsoft currently requires:

1. directory-synchronized users whose mailboxes are hosted in Exchange Online
2. Microsoft Entra Connect Sync version `2.5.190.0` or later when Connect Sync is in use
3. a supported administrator role to change `IsExchangeCloudManaged`: Exchange Administrator is recommended; Hybrid Identity Administrator and Global Administrator are also accepted
4. for writeback, Microsoft Entra Cloud Sync provisioning agent version `1.1.1107.0` or later
5. an Active Directory schema extended with the Exchange attributes that receive writeback
6. Hybrid Identity Administrator for creating and operating the Cloud Sync writeback configuration

These versions, roles, and paths are documented in the [Exchange attribute management prerequisites](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/enable-exchange-attributes-cloud-management#prerequisites) and the dedicated [Exchange hybrid writeback with Cloud Sync guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/exchange-hybrid).

You do not need to remove Entra Connect Sync to add writeback. Microsoft supports Connect Sync and Cloud Sync side by side: Connect Sync can continue the existing inbound identity synchronization while Cloud Sync handles the Exchange attribute writeback job.

Microsoft lists Entra Connect as included with an Azure subscription in its [Microsoft Entra licensing reference](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-connect). The mailbox itself still needs an appropriate Exchange Online service plan. Licensing agreements and sovereign-cloud terms can change, so verify the exact entitlements for your tenant before production deployment rather than treating an implementation article as your product terms.

## Inventory before you touch the switch

Start with the questions that are hardest to answer after authority has moved:

1. Which directory-synchronized mailboxes are still managed on-premises?
2. Which on-premises applications read any of the 24 writeback attributes?
3. Which systems currently write those attributes in AD?
4. Are extension attributes used by dynamic groups, application authorization, mail routing, address lists, or third-party identity tools?
5. Does any provisioning workflow still call `Set-RemoteMailbox`?
6. Are any mailboxes expected to move back on-premises?

Use Exchange Online PowerShell to capture the current mailbox state:

```powershell
Get-Mailbox -ResultSize Unlimited |
    Where-Object { $_.IsDirSynced -eq $true } |
    Select-Object DisplayName, PrimarySmtpAddress, IsExchangeCloudManaged |
    Export-Csv .\DirSyncedMailboxSOA.csv -NoTypeInformation
```

Microsoft includes the same inventory pattern in its [last Exchange Server decommissioning guidance](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/decommission-last-exchange-server#2-exchange-attribute-soa-transferred-for-all-directory-synchronized-mailboxes). The CSV proves which mailboxes were in each authority state before the change; it does not inventory every attribute value, so take a separate export of the properties your rollback plan must preserve.

Treat any dual-writer discovery as a design blocker. Once a mailbox becomes cloud-managed, on-premises Exchange attribute changes stop flowing up for that mailbox. A script that keeps writing `extensionAttribute7` in AD may still report success locally while no longer controlling the Exchange Online value.

## A staged rollout that exposes mistakes early

### Ring 0: establish the writeback plane

Install or upgrade the Cloud Sync provisioning agent on a supported host and confirm it appears **Active** under **Identity > Hybrid management > Microsoft Entra Connect > Cloud Sync > Agents**. If Connect Sync remains your inbound engine, leave it in place.

Create the Exchange Online attribute writeback configuration from **Entra Connect > Cloud Sync > New configuration > EXO to AD attribute sync (Preview)**, select the correct agent and domain, review mappings and scoping filters, then start provisioning. Those are the current Microsoft-documented labels and sequence.

Do not flip hundreds of mailboxes merely because the job status is healthy. First use **Provision on demand** and the Cloud Sync provisioning logs to prove that the correct connector, domain, object, and mapping are involved.

### Ring 1: one disposable or low-impact mailbox

Choose a test mailbox that is directory-synchronized, hosted in Exchange Online, and free of business-critical routing or application dependencies. If you have just changed its attributes on-premises with `Set-RemoteMailbox`, Microsoft says to wait for the normal synchronization cycle **plus 24 hours** before transferring authority.

Move that mailbox's Exchange attribute authority:

```powershell
Set-Mailbox -Identity pilot.user@contoso.com -IsExchangeCloudManaged $true

Get-Mailbox -Identity pilot.user@contoso.com |
    Format-List Identity, IsDirSynced, IsExchangeCloudManaged
```

Then modify a harmless, writeback-enabled test attribute in Exchange Online:

```powershell
Set-Mailbox -Identity pilot.user@contoso.com `
    -CustomAttribute1 "WritebackPilot-20260825"
```

Microsoft says the next Cloud Sync cycle is approximately 20 minutes, or you can run Provision on demand. Confirm the result through Cloud Sync provisioning logs and then read the on-premises value with supported Exchange recipient tools:

```powershell
Get-RemoteMailbox -Identity pilot.user@contoso.com |
    Format-List CustomAttribute1
```

These commands and the on-demand verification flow come directly from Microsoft's [writeback verification procedure](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/enable-exchange-attributes-cloud-management#verify-writeback-is-working). Replace the sample value with one approved by your change process.

### Ring 2: representative production mailboxes

Expand to a small set that exercises real dependencies:

- a mailbox whose aliases are consumed on-premises
- a mailbox whose extension attributes drive a workflow
- a room or equipment scenario if your design supports it
- a mailbox managed by each delegated Exchange administrator group
- a mailbox in each relevant AD domain

For every pilot, test both directions of operational ownership: confirm identity fields still originate in AD, and confirm supported Exchange fields now originate in Exchange Online and write back. Also test a cloud-editable property that is **not** in the writeback set so your operators see the expected asymmetry before production.

### Ring 3: controlled expansion

Expand by an explicit mailbox list or a tightly reviewed scope. Monitor:

- Cloud Sync provisioning failures
- Entra audit logs for configuration changes
- Exchange admin audit activity for mailbox changes
- mismatches between Exchange Online values and the 24 AD replica attributes
- service-desk reports involving aliases, address lists, application lookups, or provisioning

The absence of sync errors is not enough. A clean job cannot tell you that a line-of-business application is reading a non-writeback attribute or that an old automation still believes AD is authoritative.

## Rollback and containment

There are two different rollback actions.

**Pause the writeback job** when the connector is writing unexpected values to AD or affecting too broad a scope. Microsoft exposes **Pause provisioning** on the Cloud Sync configuration. Pausing contains new writeback operations but does not undo completed changes.

**Return one mailbox to on-premises Exchange authority** when the mailbox should no longer be cloud-managed:

```powershell
Set-Mailbox -Identity pilot.user@contoso.com -IsExchangeCloudManaged $false
```

Before doing that, export the cloud values you need to preserve. Microsoft warns that after the flag returns to `false`, the next synchronization cycle updates cloud Exchange attributes from the on-premises values. In other words, rollback changes the winning writer again; it is not a data merge.

If you plan to migrate a mailbox back on-premises, set `IsExchangeCloudManaged` to `false` first. Microsoft's FAQ says leaving it true blocks on-premises Exchange attribute updates and breaks synchronization during offboarding.

## The tenant-wide switch is a separate change

Microsoft also provides:

```powershell
Set-OrganizationConfig -ExchangeAttributesCloudManagedByDefault
```

This makes newly created mailboxes cloud-managed by default. It does not convert existing mailboxes. Microsoft explicitly warns that enabling it before **all on-premises mailboxes are migrated**—or while you still create on-premises mailboxes, mail-enabled users, or remote mailboxes—is unsupported and can prevent the expected Exchange Online `MailUser` from being created.

The documented recovery is not a tidy toggle: stop creating or synchronizing affected recipients, disable the tenant-wide default for future objects, and contact Microsoft Support for users already caught in the bad state. That is why the organization-wide switch belongs in a later project phase, after per-mailbox operation and new-user provisioning are proven.

To return the default for future mailboxes to server-managed:

```powershell
Set-OrganizationConfig -ExchangeAttributesServerManagedByDefault
```

Disabling the tenant-wide default does not automatically repair objects already affected. The [tenant-wide SOA warnings and recovery steps](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/enable-exchange-attributes-cloud-management#how-to-enable-the-feature-at-a-tenant-level) should be attached to the production change.

## Security and operational consequences

This design can reduce dependency on an on-premises Exchange management surface, and Microsoft's [last Exchange Server guidance](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/decommission-last-exchange-server) now treats Exchange-attribute SOA transfer as one path toward removing that server. But writeback alone is not permission to uninstall Exchange.

Mail-enabled groups and contacts have separate SOA transfers. Mail routing, Autodiscover, public folders, SMTP relay, hybrid connectors, migration endpoints, and system mailboxes all have their own decommissioning checks. Treat last-server removal as a separate project with its own rollback boundary.

The main security change is administrative: Exchange Online administrators can now author values that may be consumed by on-premises systems. Review who holds Exchange Administrator and Hybrid Identity Administrator, retain privileged-role controls, and alert on changes to sensitive aliases and extension attributes. If an extension attribute drives authorization in an on-premises application, its Exchange Online writer is now inside that application's trust boundary.

> [!IMPORTANT]
> **Analysis:** Classify every writeback attribute by consequence, not by name. `extensionAttribute4` looks harmless until a dynamic group, application, or access rule interprets it as “finance-approved.”

## Troubleshooting map

| Symptom | First checks |
|---|---|
| `IsExchangeCloudManaged` cannot be set | Mailbox is in Exchange Online, user is directory-synchronized, administrator role, Connect Sync version |
| Cloud change never appears in AD | Attribute is in the 24-attribute writeback set, Cloud Sync agent is active and current, job is running, object is in scope |
| `mail` does not write back | Configuration creation date and presence of the direct `Mail` to `mail` mapping |
| Custom mappings disappeared | Whether **Restore default mappings** was used; restore from the recorded pre-change mapping and scoping design |
| On-premises change no longer reaches Exchange Online | Expected for Exchange attributes after `IsExchangeCloudManaged = true`; make the change in Exchange Online |
| Identity field is still read-only in Exchange Online | Expected; identity SOA remains in Active Directory |
| Offboarding to on-premises fails | Return `IsExchangeCloudManaged` to `false` before the move |
| New hybrid mailbox does not provision as expected | Check whether the tenant-wide cloud-managed default was enabled too early; stop and follow Microsoft's support guidance |

## Admin checklist

- [ ] Confirm the GA status and supported scope against the current Microsoft Learn and Exchange Team documentation.
- [ ] Inventory all directory-synchronized Exchange Online mailboxes and their `IsExchangeCloudManaged` state.
- [ ] Find every on-premises reader and writer of the 24 writeback attributes.
- [ ] Upgrade Entra Connect Sync to at least `2.5.190.0` when it is in use.
- [ ] Install or upgrade the Cloud Sync provisioning agent to at least `1.1.1107.0`.
- [ ] Verify the agent, domain, mappings, scoping filters, and administrator roles.
- [ ] For preview-era jobs, check the `Mail` to `mail` mapping before changing defaults.
- [ ] Pilot one mailbox and verify identity flow, Exchange authority, writeback, logs, and rollback.
- [ ] Export cloud and on-premises values needed for rollback before each ring.
- [ ] Monitor Cloud Sync provisioning logs and Exchange administrative changes.
- [ ] Keep tenant-wide SOA disabled until all on-premises mailboxes are migrated and on-premises recipient creation has ended.
- [ ] Treat last Exchange Server removal as a separate, fully validated project.

The headline is writeback. The real change is authority. If you document who owns each attribute, pilot the Cloud Sync path, and make rollback a deliberate source-of-authority decision, this feature can remove a stubborn hybrid-management dependency without turning Active Directory into a mystery replica.

## References

- [Writeback for Cloud-Managed Remote Mailboxes: Now Generally Available](https://techcommunity.microsoft.com/blog/exchange/writeback-for-cloud-managed-remote-mailboxes-now-generally-available/4543507)
- [What's New in Microsoft Entra: August 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172)
- [Cloud-based management of Exchange attributes for remote mailboxes](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/enable-exchange-attributes-cloud-management)
- [Exchange hybrid writeback with Microsoft Entra Cloud Sync](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/exchange-hybrid)
- [Decommission the last Exchange Server after transferring SOA to the cloud](https://learn.microsoft.com/en-us/exchange/hybrid-deployment/decommission-last-exchange-server)
- [Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)
