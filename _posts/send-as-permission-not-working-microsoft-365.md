---
title: "Send As Permission Not Working in Microsoft 365: Why the Grant Looks Right but the Send Still Fails"
excerpt: "Send As is granted, propagation has completed, the user still gets 'The message could not be sent.' Walk the difference between Send As and Send on Behalf, the auto-complete cache that breaks new addresses, the From-field display rule, and the 60-minute permission-cache window."
coverImage: "/assets/blog/send-as-permission-not-working-microsoft-365/diagram.svg"
date: "2026-05-16T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/send-as-permission-not-working-microsoft-365/diagram.svg"
---

## The "I just sent from this address yesterday" ticket

A user gets Send As permission on a shared mailbox. Sends fine for a week. Then suddenly: *"This message could not be sent. You do not have permission to send this message on behalf of the specified user."* The admin checks Exchange admin centre, sees the permission is still there, and starts pulling at threads.

Send As failures in Microsoft 365 fall into three categories: the permission is wrong (often confused with Send on Behalf), the permission is right but stale in the EXO cache, or — most often — the Outlook **auto-complete cache** has resolved the From address to the wrong underlying identity. The actual permission grant is fine; the message is being sent from an alias or a contact entry that doesn't have the Send As permission attached.

This article walks the four-step diagnostic, the PowerShell to inspect each layer, and the auto-complete cache fix that solves the "I just sent from this address yesterday" pattern. References: [Manage Send As permissions](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients#send-as-permissions), [Add-RecipientPermission](https://learn.microsoft.com/powershell/module/exchange/add-recipientpermission), [Send As vs Send on Behalf](https://learn.microsoft.com/microsoft-365/admin/email/send-on-behalf-permissions).

## The first question: Send As or Send on Behalf?

These are different permissions with different cmdlets and very different user experience. People confuse them constantly.

| Property | Send As | Send on Behalf |
|---|---|---|
| Recipient sees | `From: shared@contoso.com` | `From: alice@contoso.com on behalf of shared@contoso.com` |
| Cmdlet to grant | `Add-RecipientPermission` | `Set-Mailbox -GrantSendOnBehalfTo` |
| Cmdlet to view | `Get-RecipientPermission` | `Get-Mailbox \| Select-Object GrantSendOnBehalfTo` |
| Bounce / NDR routing | To shared mailbox | To original sender |
| Use case | Operating an alias / brand mailbox | Delegate scenarios (executive assistant) |

If the user "got Send As" but `Get-RecipientPermission` returns nothing, the grant was actually Send on Behalf and the visible-name rendering will always show "on behalf of." The fix is to grant Send As properly:

```powershell
Connect-ExchangeOnline
Add-RecipientPermission -Identity "sales@contoso.com" `
    -Trustee "alice@contoso.com" -AccessRights SendAs -Confirm:$false
```

## The four-step Send As diagnostic

### Step 1: Confirm Send As is granted (not just Send on Behalf)

```powershell
Get-RecipientPermission -Identity "sales@contoso.com" |
    Where-Object { $_.Trustee -like "*alice@contoso.com*" } |
    Format-Table Trustee, AccessRights, AccessControlType
```

If the output is empty, Send As was never granted. If it shows `AccessRights : SendAs` with `AccessControlType : Allow`, the grant exists. If `AccessControlType : Deny`, deny wins — remove it.

### Step 2: Check propagation

Send As grants take 15-60 minutes to propagate through EXO's permission cache. If the grant was made within the last hour, the cause is timing, not the permission itself. Re-test after waiting.

For new tenants with low load, propagation is often near-instant; for large tenants during business hours, it can take the full 60 minutes.

### Step 3: Inspect the actual From address Outlook is using

This is where most "the permission is right but it still doesn't work" tickets resolve. Outlook's auto-complete cache (the suggestions that appear when you start typing a recipient or a From address) can hold a stale or wrong identifier for the shared mailbox.

The symptom: the user sees "sales@contoso.com" in the From dropdown, selects it, sends — and EXO interprets the From as a stale ID that no longer matches the granted address. The grant is on `sales@contoso.com`, but Outlook is sending from `oldsales@contoso.com` (a deleted former primary SMTP) because that's what's in the cache.

**Fix:**

1. In Outlook, open a new message.
2. Click the From dropdown → Other E-mail Address.
3. Click **From** button → Address Book → type the shared mailbox display name → select it from the directory (not from suggestions).
4. Send the message.

Once that succeeds, Outlook caches the *correct* identifier and subsequent sends from the dropdown will work.

The deeper fix, if this happens repeatedly: clear the auto-complete cache.

```
File → Options → Mail → Empty Auto-Complete List
```

Or for a single bad entry, in a new message hover over the suggestion in the dropdown and click the X to remove it.

### Step 4: Check for orphaned Send As grants on the wrong identity

When a mailbox's primary SMTP changes (rebranding, domain migration, mailbox conversion), Send As grants don't automatically follow. The grant stays on the old identity. The user can still send via *the old address* (if it's still an alias) but not from the new primary SMTP.

```powershell
# Look at the mailbox's email addresses
Get-Mailbox -Identity "sales@contoso.com" |
    Select-Object PrimarySmtpAddress, EmailAddresses

# Look at all Send As grants on the mailbox, including ones that might
# reference the old name
Get-RecipientPermission -Identity (Get-Mailbox sales@contoso.com).Guid.Guid
```

If you see grants on the old name and the new primary is what the user is sending from, re-grant Send As on the current identity.

## The OnPremisesUserPrincipalName trap

In a hybrid Exchange tenant (Exchange Online + on-prem AD via Entra Connect), Send As permissions can live in two places: in EXO via `Add-RecipientPermission` and on the on-prem AD object as `msExchSendAsRights`. The on-prem ACL syncs to EXO via Entra Connect's mailbox-on-premises sync. If the two get out of sync — typically because someone granted Send As on-prem after the mailbox was migrated to EXO — the EXO-visible permission and the actual evaluating permission can diverge.

**Diagnostic for hybrid tenants:**

```powershell
# On-prem (run from a domain-joined PowerShell with AD module)
$user = Get-ADUser "salesmbx" -Properties msExchSendAsRights
$user.msExchSendAsRights | ForEach-Object { (Get-ADObject -Identity ([System.Security.Principal.SecurityIdentifier]$_).Translate([System.Security.Principal.NTAccount]).Value) }

# In EXO (compare)
Get-RecipientPermission -Identity "sales@contoso.com" | Where-Object AccessRights -eq SendAs
```

If the two lists differ, decide which is authoritative (post-migration, EXO should be authoritative; remove the on-prem entries via `Remove-ADPermission`).

## The DLP and mail-flow rule overrides

Send As can also fail because an outbound mail-flow rule (transport rule) or DLP policy intercepts the message based on the From address. Common patterns:

- A transport rule that blocks outbound mail from `sales@contoso.com` unless it matches a specific subject prefix.
- A DLP policy that quarantines outbound mail from finance addresses pending approval.

Both surface as send failures to the user but show as `Pending` or `Failed` in the message trace, not as permission errors. Check:

```powershell
Get-MessageTrace -SenderAddress "alice@contoso.com" -StartDate (Get-Date).AddHours(-1) -EndDate (Get-Date) |
    Where-Object { $_.RecipientAddress -eq "<the-recipient>" } |
    Select-Object Received, Status, Subject
```

If the message status is `FilteredAsSpam`, `Quarantined`, or `Pending`, the cause is downstream, not Send As.

## Common questions

### Can a user have Send As on a distribution group?

Yes — Send As on a distribution group (and on mail-enabled security groups) is supported. The cmdlet is the same `Add-RecipientPermission`. The grant lets the user send messages that appear to be from the group's primary SMTP.

### Why does the From field show the user's name instead of the shared mailbox?

Outlook composes the From with the mailbox's display name. If the shared mailbox's display name in EXO is empty or matches the user's name, the rendering looks wrong. Set the mailbox's display name explicitly: `Set-Mailbox -Identity sales@contoso.com -DisplayName "Sales Team"`.

### Does Send As work in OWA?

Yes. In OWA, click the From dropdown in a new message and select the shared mailbox (or click "Other email address" and type it). OWA does not have the auto-complete cache trap that Outlook desktop has, so OWA is often a faster test than Outlook for verifying that the permission itself is correct.

### What does "Send As permission is supported for shared mailboxes only" mean?

You may see this error when granting Send As on certain mailbox types (resource mailboxes in some states, or mailboxes during a hybrid migration). The fix is usually to wait until the migration completes, or to convert the recipient type before granting.

### Can I script the Send As grant for many users at once?

Yes — wrap `Add-RecipientPermission` in a ForEach over a list of users and mailboxes:

```powershell
$grants = Import-Csv send-as-grants.csv  # columns: Mailbox, User
foreach ($g in $grants) {
    Add-RecipientPermission -Identity $g.Mailbox -Trustee $g.User `
        -AccessRights SendAs -Confirm:$false -ErrorAction Continue
}
```

### Why does the user receive bounces sent to the shared mailbox address?

That's the documented behaviour — Send As routes NDRs to the actual sender (the granted user), not the shared mailbox. If you need NDRs to go to a shared monitoring inbox, configure a transport rule to redirect bounces matching specific patterns.

## What to take away

Send As failures almost always resolve to one of three causes: it's actually Send on Behalf, the auto-complete cache has resolved to a stale identifier, or the grant is on an old mailbox identity after a primary SMTP change. The four-step diagnostic isolates which one in under five minutes. The fix isn't usually to re-grant the permission — it's to clear the Outlook cache or pick the address from the directory instead of the suggestions.

## References

- [Manage Send As permissions — Microsoft Learn](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients#send-as-permissions)
- [Add-RecipientPermission — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/add-recipientpermission)
- [Get-RecipientPermission — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/get-recipientpermission)
- [Send on Behalf permissions — Microsoft Learn](https://learn.microsoft.com/microsoft-365/admin/email/send-on-behalf-permissions)
- [Message trace in EXO — Microsoft Learn](https://learn.microsoft.com/exchange/monitoring/trace-an-email-message/trace-an-email-message)
