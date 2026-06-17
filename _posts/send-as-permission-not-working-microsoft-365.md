---
title: "Send As Looks Granted But the Send Still Fails: Why, And How To Fix It"
excerpt: "The permission shows up in the admin centre. Propagation has long since finished. The user still gets 'The message could not be sent.' Almost always one of three things — confused with Send on Behalf, lost in Outlook's auto-complete cache, or pointing at a stale identity after a primary SMTP change. Here's the diagnostic and the PowerShell that closes most of these tickets."
coverImage: "/assets/blog/send-as-permission-not-working-microsoft-365/diagram.svg"
date: "2026-05-16T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/send-as-permission-not-working-microsoft-365/diagram.svg"
---

A user gets Send As on a shared mailbox. Sends fine for a week. Then one Tuesday they hit "The message could not be sent. You do not have permission to send this message on behalf of the specified user." They retry. Same error. The admin checks the Exchange admin centre, sees the permission is still there, and starts pulling at the threads.

Send As failures cluster into three causes, in the rough order they actually show up. Sometimes the grant was Send on Behalf and not Send As, which the user couldn't tell from the surface and which produces a different visible From line. Sometimes the permission is right but the EXO cache hasn't quite caught up. Most often, the Outlook auto-complete cache has resolved the From address to a stale identifier — the grant is fine, but the message is being composed against an old alias or a contact entry that doesn't have the permission attached. The grant isn't the problem; what the client is asking it to attach to is.

What follows is the four-step diagnostic I run, the PowerShell to inspect each layer, and the auto-complete cache fix that closes the "I sent from this yesterday" tickets. Microsoft's authoritative references are [Send As permissions](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients#send-as-permissions), [`Add-RecipientPermission`](https://learn.microsoft.com/powershell/module/exchange/add-recipientpermission), and [Send As vs Send on Behalf](https://learn.microsoft.com/microsoft-365/admin/email/send-on-behalf-permissions).

## First question to answer: Send As or Send on Behalf?

These are different permissions, different cmdlets, and very different user experiences, and people confuse them constantly.

| Property | Send As | Send on Behalf |
|---|---|---|
| What the recipient sees | `From: shared@contoso.com` | `From: alice@contoso.com on behalf of shared@contoso.com` |
| Cmdlet to grant | `Add-RecipientPermission` | `Set-Mailbox -GrantSendOnBehalfTo` |
| Cmdlet to check | `Get-RecipientPermission` | `Get-Mailbox \| Select GrantSendOnBehalfTo` |
| Where NDRs land | The shared mailbox | The original sender |
| Use case | Operating an alias or brand mailbox | Delegate scenarios (executive assistant) |

If the user "got Send As" but `Get-RecipientPermission` returns nothing, the grant was actually Send on Behalf. The visible-name rendering will always show the "on behalf of" line, which is the symptom they're really complaining about. The fix is to grant Send As properly:

```powershell
Connect-ExchangeOnline
Add-RecipientPermission -Identity "sales@contoso.com" `
    -Trustee "alice@contoso.com" -AccessRights SendAs -Confirm:$false
```

## The four-step diagnostic

The order matters. Most resolutions are at step three.

**Step one is confirming Send As is actually granted.** Different cmdlet from Full Access and from Send on Behalf, which is the trap that wastes the first thirty minutes if you skip it:

```powershell
Get-RecipientPermission -Identity "sales@contoso.com" |
    Where-Object { $_.Trustee -like "*alice@contoso.com*" } |
    Format-Table Trustee, AccessRights, AccessControlType
```

Empty output means Send As was never granted. `AccessRights : SendAs` with `AccessControlType : Allow` means the grant exists. If you see `Deny` instead of `Allow`, deny wins and you need to remove it.

**Step two is propagation.** Send As grants take fifteen to sixty minutes to flow through the EXO permission cache. If the grant was made within the last hour and you're testing during business hours in a large tenant, the cause might just be timing. Re-test after waiting. For new or quiet tenants the propagation is often near-instant; for busy tenants it's closer to the upper bound.

**Step three is inspecting the actual From address Outlook is using.** This is where most "the permission is right but it still doesn't work" tickets resolve, and it's also the step admins forget exists. Outlook's auto-complete cache (the suggestions that appear as you type) can hold a stale identifier for the shared mailbox. The user sees `sales@contoso.com` in the From dropdown, selects it, sends — and EXO interprets the From as a stale ID that no longer matches the granted address. The grant is on `sales@contoso.com`, but Outlook is sending from `oldsales@contoso.com` (a deleted former primary SMTP) because that's what's in the cache.

Fix on the user's machine: open a new message, click the From dropdown → Other E-mail Address → click the **From** button → Address Book → type the shared mailbox display name → select it from the directory, *not* from the suggestions. Send. Once that round-trips successfully, Outlook caches the correct identifier and subsequent sends from the dropdown will work.

The deeper fix if it keeps recurring is to empty the auto-complete cache entirely from File → Options → Mail → Empty Auto-Complete List, or to delete the single bad suggestion by hovering and clicking its X.

**Step four is orphaned grants on the wrong identity.** When a mailbox's primary SMTP changes — rebranding, domain migration, mailbox conversion — Send As grants don't automatically follow. The grant stays on the old identity. The user can still send via the old address if it's still an alias, but not from the new primary SMTP. Check the addresses on the mailbox:

```powershell
Get-Mailbox -Identity "sales@contoso.com" |
    Select-Object PrimarySmtpAddress, EmailAddresses

# All grants on the mailbox, by GUID so the old name surfaces too
Get-RecipientPermission -Identity (Get-Mailbox sales@contoso.com).Guid.Guid
```

If you see grants on an old name and the new primary is what the user wants to send from, re-grant Send As on the current identity.

## The hybrid trap

In a hybrid Exchange tenant (EXO plus on-prem AD via Entra Connect), Send As can live in two places: in EXO via `Add-RecipientPermission`, and on the on-prem AD object as `msExchSendAsRights`. The on-prem ACL syncs to EXO through the mailbox-on-premises sync, and if the two get out of step — typically because someone granted Send As on-prem after the mailbox migrated to EXO — the EXO-visible permission and the actual evaluating permission can diverge in confusing ways.

Diagnostic for hybrid:

```powershell
# On-prem (domain-joined PowerShell with AD module)
$user = Get-ADUser "salesmbx" -Properties msExchSendAsRights
$user.msExchSendAsRights | ForEach-Object {
    (Get-ADObject -Identity ([System.Security.Principal.SecurityIdentifier]$_) `
        .Translate([System.Security.Principal.NTAccount]).Value)
}

# In EXO (compare)
Get-RecipientPermission -Identity "sales@contoso.com" | Where-Object AccessRights -eq SendAs
```

If the two lists differ, decide which is authoritative. Post-migration the EXO side should be authoritative; remove the on-prem entries with `Remove-ADPermission` once you're sure.

## DLP and mail-flow rules pretending to be permission failures

Send As can also fail because something downstream is blocking the message based on the From address. Common culprits: a transport rule that blocks outbound mail from `sales@contoso.com` unless it matches a specific subject prefix, or a DLP policy that quarantines outbound mail from finance addresses pending approval. Both surface to the user as a send failure but show as `Pending`, `Quarantined`, or `Failed` in the message trace, not as a permission error:

```powershell
Get-MessageTrace -SenderAddress "alice@contoso.com" `
    -StartDate (Get-Date).AddHours(-1) -EndDate (Get-Date) |
    Where-Object { $_.RecipientAddress -eq "<the-recipient>" } |
    Select-Object Received, Status, Subject
```

`FilteredAsSpam`, `Quarantined`, or `Pending` mean the cause is downstream of permissions and the permission diagnostic above is a dead end.

## Things people ask

*Can a user have Send As on a distribution group?* Yes. Send As on a distribution group, and on mail-enabled security groups, is supported. Same `Add-RecipientPermission` cmdlet. The grant lets the user send messages that appear to be from the group's primary SMTP.

*Why does the From field show the user's name instead of the shared mailbox's?* Outlook composes From with the mailbox's display name. If the shared mailbox's display name in EXO is empty or matches the user's name, the rendering looks wrong. Set it explicitly: `Set-Mailbox -Identity sales@contoso.com -DisplayName "Sales Team"`.

*Does Send As work in OWA?* Yes. In OWA, click the From dropdown in a new message and select the shared mailbox (or click "Other email address" and type it). OWA doesn't have the auto-complete cache trap that Outlook desktop has, which makes it a useful confirmation step — if Send As works in OWA but not desktop, the auto-complete cache is the cause.

*"Send As permission is supported for shared mailboxes only" — what does that mean?* You'll see it when granting Send As on certain recipient types (some resource mailbox states, mailboxes mid-migration). The fix is usually to wait for the migration to complete, or to convert the recipient type before granting.

*Can I script Send As for many users at once?* Yes, wrap `Add-RecipientPermission` in a ForEach:

```powershell
$grants = Import-Csv send-as-grants.csv  # columns: Mailbox, User
foreach ($g in $grants) {
    Add-RecipientPermission -Identity $g.Mailbox -Trustee $g.User `
        -AccessRights SendAs -Confirm:$false -ErrorAction Continue
}
```

*Why do bounce messages go to the granted user instead of the shared mailbox?* That's the documented behaviour. Send As routes NDRs to the actual sender, not the shared mailbox. If you need bounces to land in a shared monitoring inbox, configure a transport rule to redirect them based on specific patterns.

## Where to read further

- [Manage Send As permissions — Microsoft Learn](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients#send-as-permissions)
- [`Add-RecipientPermission` — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/add-recipientpermission)
- [`Get-RecipientPermission` — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/get-recipientpermission)
- [Send on Behalf permissions — Microsoft Learn](https://learn.microsoft.com/microsoft-365/admin/email/send-on-behalf-permissions)
- [Message trace in EXO — Microsoft Learn](https://learn.microsoft.com/exchange/monitoring/trace-an-email-message/trace-an-email-message)
