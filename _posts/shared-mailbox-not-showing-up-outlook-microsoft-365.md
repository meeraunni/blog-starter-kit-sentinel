---
title: "Shared Mailbox Not Showing Up in Outlook (Microsoft 365): Why It Happens and How to Fix It Properly"
excerpt: "Your user has Full Access to a shared mailbox but it isn't appearing in Outlook. Walk the five-step diagnostic — auto-mapping, replication, profile cache, mailbox type, and manual add — and fix the underlying cause, not the symptom."
coverImage: "/assets/blog/shared-mailbox-not-showing-up-outlook-microsoft-365/diagram.svg"
date: "2026-05-18T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/shared-mailbox-not-showing-up-outlook-microsoft-365/diagram.svg"
---

## The ticket you've definitely seen before

A manager opens a ticket: "I just got added to the shared mailbox three days ago. Other people can see it. I can't. Outlook restart doesn't help. New profile doesn't help. Help."

This is one of the highest-volume tickets in any Microsoft 365 tenant, and the reason it recurs is that the resolution most help-desk articles offer — "give it time, then rebuild the profile" — works often enough to feel right but doesn't address *why* it happened. Once a tenant has more than a handful of shared mailboxes, the same users hit the same problem repeatedly, and the help desk burns hours on a fix that the design itself prevents.

This article walks the actual decision path: what auto-mapping really does, where replication delays come from, which Outlook profile state is involved, and the rare-but-real edge cases (mailbox converted from a user mailbox, group-membership-based access, hidden-from-GAL flag) that the standard checklist misses. Microsoft's authoritative pages used here are [Manage shared mailbox permissions](https://learn.microsoft.com/microsoft-365/admin/email/about-shared-mailboxes) and [Auto-mapping in Outlook for shared mailboxes](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients#auto-mapping).

## How auto-mapping actually works

When you grant a user **Full Access** to a shared mailbox via the Exchange admin centre or `Add-MailboxPermission`, Exchange Online writes the assignee's identity into a property on the shared mailbox called `msExchDelegateListLink`. On the next Outlook restart, the user's Outlook profile (using Autodiscover) reads that property, discovers the additional mailbox, and adds it to the navigation pane automatically. No user action required.

That's the happy path. Here's where it breaks:

| Failure mode | Why it happens |
|---|---|
| Outlook doesn't restart | Auto-mapping only re-evaluates at profile boot. A user who keeps Outlook open for days never sees the new mailbox |
| Permission was granted with `AutoMapping:$false` | The PowerShell flag exists specifically to suppress the property write |
| The user has the mailbox manually added already | Outlook detects the duplicate and silently does nothing |
| The mailbox is hidden from the GAL | Autodiscover may not resolve it correctly in some client versions |
| Profile cache is stale | Newer Outlook (Cached Exchange Mode) holds onto its mailbox list across restarts in ways older Outlook didn't |
| Permission grant happened via group membership | Auto-mapping is per-user; group-granted permissions don't write to `msExchDelegateListLink` |

The last one — **group-based permission grants don't auto-map** — is by far the most common cause that the standard checklist misses. If the security team has built a clean RBAC model where "Sales team → can access Sales shared mailbox", auto-mapping doesn't apply, and every user has to add the mailbox manually. That isn't a bug; it's a documented behavior.

> [!IMPORTANT]
> If a tenant has decided to grant shared mailbox access via group membership for governance reasons, the trade-off is that users must manually add the mailbox. Document this in onboarding instead of treating each ticket as new.

## The five-step diagnostic

Run these in order. Each step rules out one cause cleanly.

### Step 1: Verify the permission grant actually exists

```powershell
Connect-ExchangeOnline
Get-MailboxPermission -Identity "sales@contoso.com" |
    Where-Object { $_.User -like "*alice@contoso.com*" }
```

Look at the output. You want to see `AccessRights : FullAccess`, `IsInherited : False`, and `Deny : False`. If `Deny : True`, someone explicitly denied access — that always wins. If the user isn't listed at all, the grant was never applied, or was applied to a group the user isn't a direct member of.

### Step 2: Check the auto-mapping flag on the permission

The Microsoft Graph and EXO PowerShell expose the `AutoMapping` parameter. Once a permission is granted, you can't *change* the auto-mapping flag retroactively without re-granting:

```powershell
# Remove the permission, then re-add with auto-mapping enabled
Remove-MailboxPermission -Identity "sales@contoso.com" `
    -User "alice@contoso.com" -AccessRights FullAccess -Confirm:$false

Add-MailboxPermission -Identity "sales@contoso.com" `
    -User "alice@contoso.com" -AccessRights FullAccess -AutoMapping:$true
```

If the original grant had `AutoMapping:$false`, the user will never see auto-discovery do its thing. This is a one-line fix that solves a surprisingly high percentage of tickets.

### Step 3: Confirm replication has completed

Exchange Online doesn't propagate permission changes instantly. The propagation typically completes in **15-60 minutes**, but can take up to several hours on busy tenants. If the grant happened within the last hour and Outlook has been restarted, give it time and check back.

You can verify replication is done by looking at the user's Outlook Autodiscover XML:

```powershell
# From the user's machine, in Outlook File menu, hold Ctrl and right-click
# the Outlook tray icon → Test E-mail AutoConfiguration → enter user's email.
# The XML response includes <Mailbox> entries for every accessible mailbox.
```

If the shared mailbox shows up in the Autodiscover XML but not in the Outlook navigation pane, the issue is local profile cache, not server replication.

### Step 4: Rebuild the Outlook profile (the actual fix, when needed)

If steps 1-3 show the permission is correct and replicated but Outlook still doesn't show it, the user's profile cache is stale. The reliable fix:

1. Close Outlook.
2. Control Panel → Mail (Microsoft Outlook) → Show Profiles.
3. Add a new profile (don't modify the existing one — that often re-uses the cache).
4. Open Outlook and select the new profile when prompted.
5. Sign in. Wait for the full mailbox list to populate (can take 5-15 minutes for users with many mailboxes).
6. Once confirmed working, you can delete the old profile.

The reason "new profile" works where "restart Outlook" doesn't: Outlook caches the mailbox list in the `.ost` file and in profile registry keys. A profile rebuild forces re-creation of both.

> [!TIP]
> Don't tell the user to delete the existing `.ost` file — that triggers a full re-download of their primary mailbox (potentially gigabytes) for no benefit. Profile rebuild is the right scope.

### Step 5: Add it manually as a last resort

If the permission is correct, replicated, and the profile is fresh — and the mailbox still doesn't appear — add it manually:

1. Outlook → File → Account Settings → Account Settings → Email tab → Change → More Settings → Advanced → Add → enter the shared mailbox's primary SMTP address.
2. Click OK and Next. The mailbox appears in the navigation pane below the user's primary mailbox.

This bypasses auto-mapping entirely. It works in the group-membership scenario described above, and it works as a fallback for the rare cases where Autodiscover doesn't include the mailbox in its response.

## The mailbox-type trap nobody mentions

There's one specific edge case worth knowing about: a mailbox that was *originally* a user mailbox and later converted to a shared mailbox. The conversion sometimes leaves residual flags that confuse auto-discovery in older Outlook versions. The symptom is that the mailbox shows up for everyone except the user(s) who had access *before* the conversion.

```powershell
# Check the mailbox type and conversion history
Get-Mailbox -Identity "sales@contoso.com" |
    Select-Object Identity, RecipientTypeDetails, WhenChanged, WhenCreated
```

If `RecipientTypeDetails` shows `SharedMailbox` but the user still has it auto-mapped from the user-mailbox era, the fix is either to manually add it (step 5 above) or, in some cases, to remove and re-grant the permission to refresh the auto-mapping state.

## A weekly proactive query

Find users who have Full Access to mailboxes but for whom the mailbox almost certainly isn't auto-mapping (group-granted, or `AutoMapping:$false`):

```powershell
Connect-ExchangeOnline
$sharedMailboxes = Get-Mailbox -RecipientTypeDetails SharedMailbox -ResultSize Unlimited

$report = foreach ($mbx in $sharedMailboxes) {
    $perms = Get-MailboxPermission -Identity $mbx.Identity |
        Where-Object {
            $_.AccessRights -contains "FullAccess" -and
            $_.IsInherited -eq $false -and
            $_.User -notlike "NT AUTHORITY*" -and
            $_.User -notlike "S-1-*"
        }
    foreach ($p in $perms) {
        [pscustomobject]@{
            Mailbox      = $mbx.PrimarySmtpAddress
            User         = $p.User
            AccessRights = ($p.AccessRights -join ",")
            Deny         = $p.Deny
        }
    }
}

$report | Export-Csv shared-mailbox-permissions.csv -NoTypeInformation
```

Cross-reference against the `msExchDelegateListLink` property on each mailbox to identify users granted via group membership (and therefore not auto-mapped). Use the result to seed a user-onboarding email that tells them how to add the mailbox manually if it doesn't appear.

## Common questions

### How long does auto-mapping actually take?

15-60 minutes after the permission is granted, plus one Outlook restart. If a user keeps Outlook open all day, they won't see the new mailbox until they next restart Outlook regardless of how long ago the permission was granted.

### Does the user need Send As permission too?

Full Access lets the user *read* the mailbox. Send As (separate permission) lets the user send mail *from* the mailbox's address. They're independent. A user with Full Access but no Send As can read the mailbox but replies will go from their own address.

### Does Outlook on the web (OWA) auto-map shared mailboxes?

No. OWA does not implement auto-mapping at all. Users must always add shared mailboxes manually in OWA via the navigation pane → right-click "Folders" → Add shared folder.

### What if the user is on Outlook for Mac?

Outlook for Mac supports auto-mapping but the timing and cache behaviour differ from Windows. The reliable fix sequence is: confirm permission, wait an hour, restart Outlook, close and reopen the Mac account in System Settings → Internet Accounts if still not visible.

### Why does removing and re-adding the permission with `AutoMapping:$true` sometimes still not work?

The `msExchDelegateListLink` property write does happen, but Outlook's local Autodiscover cache may still hold the stale view. Force a refresh by clearing the Autodiscover cache (`%LocalAppData%\Microsoft\Outlook\AutoDiscover.xml`) and restarting Outlook.

### Can I script the manual-add for users via Group Policy or Intune?

Outlook profile prepopulation via the **Office Customization Tool** and Group Policy ADMX templates supports configuring additional mailboxes at profile creation. This is the right answer for tenants with hundreds of users who all need access to the same set of shared mailboxes via group-granted access. It moves the problem from "user must add manually" to "Outlook is provisioned with the mailbox list when the profile is created."

## What to take away

Shared mailbox not appearing in Outlook is almost always one of three things: the permission was granted with `AutoMapping:$false`, the access was granted via group membership and auto-mapping doesn't apply to that path, or replication hasn't completed yet. The five-step diagnostic resolves nearly every individual ticket; the weekly PowerShell report turns the recurring problem into a documented onboarding step. The fix isn't always "rebuild the profile" — most of the time the underlying grant just needs to be re-issued correctly.

## References

- [Manage shared mailbox permissions — Microsoft Learn](https://learn.microsoft.com/microsoft-365/admin/email/about-shared-mailboxes)
- [Add-MailboxPermission — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/add-mailboxpermission)
- [Auto-mapping in Outlook — Microsoft Learn](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients#auto-mapping)
- [Convert a user mailbox to a shared mailbox — Microsoft Learn](https://learn.microsoft.com/microsoft-365/admin/email/convert-user-mailbox-to-shared-mailbox)
- [Outlook profile prepopulation — Microsoft Learn](https://learn.microsoft.com/deployoffice/configure-update-channels-for-microsoft-365-apps)
