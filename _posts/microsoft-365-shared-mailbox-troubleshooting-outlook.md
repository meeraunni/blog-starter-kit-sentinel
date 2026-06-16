---
title: "Shared Mailbox Not Showing Up in Outlook? A Microsoft 365 Admin's Troubleshooting Playbook"
excerpt: "Shared mailbox isn't appearing for a user. Send As is failing with a permission error. Automapping isn't working. The five-layer diagnostic for shared mailbox issues in Microsoft 365, the EXO PowerShell commands that actually fix them, and the Outlook profile reset sequence that resolves the rest."
coverImage: "/assets/blog/microsoft-365-shared-mailbox-troubleshooting-outlook/diagram.svg"
date: "2026-06-09T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/microsoft-365-shared-mailbox-troubleshooting-outlook/diagram.svg"
---

## Why this is the most common Microsoft 365 ticket

Of every Microsoft 365 administration topic, shared mailbox problems generate more help-desk tickets than anything else. The mailbox doesn't appear in the user's Outlook. The user can read it but can't send from it. They can send but the message lands in their personal Sent Items, not the shared mailbox's. They had access yesterday, today they don't. Permissions were granted but Outlook doesn't see them. A new device gets set up and the shared mailbox is missing again.

None of these are bugs. They're symptoms of a small set of underlying causes spread across three control surfaces — Exchange Online permissions, the autodiscover / automap subsystem, and the Outlook client cache — that combine in ways that look random unless you understand each layer separately. This article gives you the five-layer diagnostic, the Exchange Online PowerShell commands that fix the permission-side issues, and the Outlook profile reset sequence that fixes the client-side ones.

The Microsoft references throughout are [About shared mailboxes](https://learn.microsoft.com/microsoft-365/admin/email/about-shared-mailboxes), [Open and use a shared mailbox in Outlook](https://learn.microsoft.com/microsoft-365/admin/email/open-a-shared-mailbox), [Send email from a shared mailbox](https://learn.microsoft.com/exchange/collaboration-exo/shared-mailboxes), [Remove automapping for a shared mailbox](https://learn.microsoft.com/exchange/troubleshoot/recipients/remove-automapping-for-shared-mailbox), and the [Add-MailboxPermission](https://learn.microsoft.com/powershell/module/exchange/add-mailboxpermission) PowerShell reference.

## The three permission types and what they actually do

Most shared mailbox confusion comes from not knowing the difference between three permissions that sound similar:

| Permission | What it does | Send shows up as | Sent Items lands in |
|---|---|---|---|
| **Full Access** | Read, manage folders, treat as own | N/A — this is read/manage only | N/A |
| **Send As** | Send a message with the shared mailbox as the From address | `shared@contoso.com` | User's mailbox (unless changed — see below) |
| **Send on Behalf** | Send a message with the user as From, "on behalf of" shared | `user@contoso.com on behalf of shared@contoso.com` | User's mailbox |

The two send permissions are not interchangeable. Send As makes the message look like it came from the shared mailbox; Send on Behalf makes the recipient see both names. For most external-facing shared mailboxes (info@, sales@, support@), Send As is what you want — recipients should see the shared mailbox address, not a "user on behalf of shared" header that looks unprofessional.

The Full Access permission is what makes the mailbox *appear* in Outlook. Send As and Send on Behalf alone don't add the mailbox to the user's folder list — they just let the user *send* through addresses they already see somewhere.

> [!IMPORTANT]
> Granting Send As without Full Access is a valid configuration (the user can send from the shared address using the From dropdown), but the mailbox won't appear in their folder list. If users complain "I have Send As but the mailbox isn't there," that's working as designed — they need Full Access for the folder to show up.

## The five-layer diagnostic

When a user reports a shared mailbox issue, walk these in order:

| # | Layer | What's wrong | Where to look |
|---|---|---|---|
| 1 | **Permissions in EXO** | User doesn't have Full Access / Send As, or has it on the wrong identity | `Get-MailboxPermission` and `Get-RecipientPermission` |
| 2 | **Automapping** | Permission exists but automap is disabled, so Outlook doesn't auto-add | `Get-MailboxPermission` — look at `Automapping` column |
| 3 | **Sent Items routing** | Sent messages land in user's mailbox instead of the shared mailbox | EXO setting `MessageCopyForSentAsEnabled` / `MessageCopyForSendOnBehalfEnabled` |
| 4 | **Outlook profile cache** | Permissions are correct, but Outlook hasn't picked them up yet (1-2 hour delay common) | Restart Outlook, then `Update-OutlookProfile` workflow |
| 5 | **Autodiscover** | Outlook can't discover the shared mailbox (rare but real) | `Test-OutlookConnectivity`, autodiscover trace |

Walk these in order. Most tickets resolve at layer 1, 2, or 4. Layers 3 and 5 are rarer but worth knowing about.

## Layer 1: Permissions in Exchange Online

The first command for any shared mailbox issue is to check what's actually granted. Connect to EXO PowerShell:

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com -ShowBanner:$false
```

Then check Full Access:

```powershell
$shared = "info@contoso.com"
Get-MailboxPermission -Identity $shared |
    Where-Object { $_.User -notlike "NT AUTHORITY*" -and $_.User -ne "S-1-5-21-*" } |
    Select-Object User, AccessRights, IsInherited
```

The output should list the users (or groups) with Full Access. If the reporting user isn't on the list (and isn't a member of a group that is), Full Access isn't granted.

Check Send As:

```powershell
Get-RecipientPermission -Identity $shared |
    Where-Object { $_.Trustee -notlike "NT AUTHORITY*" } |
    Select-Object Trustee, AccessRights
```

Send As is a different cmdlet (`Get-RecipientPermission`) because it's a different ACL surface. Don't confuse them — I've seen tickets escalated for hours because someone checked `Get-MailboxPermission` for Send As and didn't find it.

Check Send on Behalf:

```powershell
(Get-Mailbox -Identity $shared).GrantSendOnBehalfTo
```

This one is yet another surface — Send on Behalf is a property of the mailbox itself, not a separate ACL. If the property is empty, no one has Send on Behalf.

### Granting the right permissions

```powershell
# Grant Full Access (with automapping enabled, which is the default)
Add-MailboxPermission -Identity $shared -User alice@contoso.com `
    -AccessRights FullAccess -InheritanceType All -AutoMapping $true

# Grant Send As
Add-RecipientPermission -Identity $shared -Trustee alice@contoso.com `
    -AccessRights SendAs -Confirm:$false

# Grant Send on Behalf
Set-Mailbox -Identity $shared -GrantSendOnBehalfTo @{Add="alice@contoso.com"}
```

Removing permissions follows the same pattern with `Remove-` instead of `Add-`. The change takes effect in EXO immediately; the lag is on the Outlook client side, not the server (see Layer 4).

## Layer 2: Automapping

Automapping is the feature that makes a shared mailbox automatically appear in the user's Outlook folder list after Full Access is granted. It's on by default. When users say "I have Full Access but the mailbox doesn't appear," automapping is the second thing to check.

```powershell
Get-MailboxPermission -Identity $shared |
    Where-Object { $_.User -notlike "NT AUTHORITY*" } |
    Format-Table User, AccessRights, IsInherited, Deny,
        @{n="Automapping"; e={"check via autoMapEnabled property"}}
```

The actual automap state per user is checked via:

```powershell
# In modern EXO, the Automapping value is set when granting permission
# To see current state, look at recent audit entries:
Search-MailboxAuditLog -Identity $shared -ShowDetails -StartDate (Get-Date).AddDays(-30) |
    Where-Object { $_.Operation -eq "Add-MailboxPermission" } |
    Select-Object UserId, Parameters
```

If automapping is off and you want it on, grant the permission again with `-AutoMapping $true`:

```powershell
# Re-grant with automapping enabled
Add-MailboxPermission -Identity $shared -User alice@contoso.com `
    -AccessRights FullAccess -AutoMapping $true
```

There are legitimate reasons to keep automapping *off*: a user is in many groups that each grant access to many shared mailboxes, and you don't want all of them in their Outlook folder list. In that case, the user manually adds the shared mailbox in Outlook (File → Account Settings → Add Mailbox).

> [!NOTE]
> Toggling automapping for a user who already has the mailbox visible doesn't immediately remove it from their Outlook. They'll need to manually remove the mailbox (right-click → Remove account) and let it stay removed across restarts.

## Layer 3: Sent items routing

The default behaviour is for Send As emails to land in the user's personal Sent Items, not the shared mailbox's Sent Items. This is almost always wrong for shared mailboxes — anyone replying to a Send As message expects to find the sent message in the shared mailbox.

The fix is a per-mailbox setting:

```powershell
# Make Send As messages land in the shared mailbox's Sent Items
Set-Mailbox -Identity $shared `
    -MessageCopyForSentAsEnabled $true `
    -MessageCopyForSendOnBehalfEnabled $true
```

This affects all users sending as the shared mailbox going forward. Users may need to restart Outlook for the new behaviour to take effect on already-cached folders.

> [!TIP]
> Set `MessageCopyForSentAsEnabled` and `MessageCopyForSendOnBehalfEnabled` as the default when *creating* shared mailboxes. Pre-existing shared mailboxes may have them off and produce confused users for months until someone notices the missing Sent Items.

## Layer 4: Outlook client cache

This is where most "I have access but Outlook doesn't show it" tickets actually live. The permission change is correct in EXO, but the Outlook client hasn't picked it up yet. Outlook caches mailbox-discovery information aggressively and refreshes on a schedule, not instantly.

The typical delay is 1-2 hours after a permission change. If the user can't wait, the diagnostic order is:

1. **Close Outlook completely.** Confirm `outlook.exe` is not running in Task Manager.
2. **Reopen Outlook.** In many cases, the mailbox now appears.
3. **If not, force a profile refresh.** Hold Ctrl + right-click the Outlook icon in the system tray → choose "Test Email AutoConfiguration" or close Outlook and run from CMD: `outlook.exe /resetnavpane`.
4. **If still not appearing, manually add the mailbox.** File → Account Settings → Change → More Settings → Advanced tab → Add → type the shared mailbox address.
5. **As a last resort, rebuild the Outlook profile.** Control Panel → Mail (32-bit) → Show Profiles → Add a new profile → set as default. Use this only after exhausting the above; it's high-friction for users.

For New Outlook (the rewritten client based on the web codebase), the picture is simpler — it pulls from the server on each connection, so closing and reopening generally resolves it. The legacy Outlook profile-rebuild path doesn't apply.

## Layer 5: Autodiscover

Rare, but worth knowing about. If the user's Outlook can't reach `autodiscover-s.outlook.com` because of network filtering or a misconfigured custom autodiscover record, Outlook can't discover the shared mailbox at all. Symptoms include the shared mailbox missing across multiple devices for one user but working for everyone else.

Diagnostic from the user's machine:

```powershell
# Check autodiscover endpoint reachability
Test-NetConnection -ComputerName "autodiscover-s.outlook.com" -Port 443

# Test the SCP / DNS path Outlook uses for discovery
nslookup autodiscover.contoso.com
# Should return a CNAME pointing to autodiscover.outlook.com for a tenant
# correctly onboarded to Microsoft 365
```

If the DNS record for `autodiscover.contoso.com` is wrong or missing, fix it (see the [DNS records guide](https://sentinelidentity.ca/posts/microsoft-entra-and-microsoft-365-custom-domains-dns-records-spf-dkim-dmarc) for the canonical setup). If the network can't reach `autodiscover-s.outlook.com`, work with the network team — proxy / firewall is the usual culprit.

## A complete diagnostic script

Save this as `Test-SharedMailbox.ps1` and hand it to the help desk:

```powershell
<#
.SYNOPSIS
  Diagnoses shared mailbox access for a user.

.PARAMETER User
  The user reporting the problem (UPN).

.PARAMETER SharedMailbox
  The shared mailbox they're trying to access (UPN or email).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $User,
    [Parameter(Mandatory)] [string] $SharedMailbox
)

try {
    Get-EXOMailbox -Identity $SharedMailbox -ErrorAction Stop | Out-Null
} catch {
    Write-Host "Connect to Exchange Online first: Connect-ExchangeOnline" -ForegroundColor Red
    return
}

Write-Host "`n=== Diagnostic for $User on $SharedMailbox ===" -ForegroundColor Cyan

# Layer 1: Full Access
$fullAccess = Get-MailboxPermission -Identity $SharedMailbox |
    Where-Object { $_.User -eq $User }
if ($fullAccess) {
    Write-Host "[Layer 1] Full Access: YES ($($fullAccess.AccessRights -join ','))" -ForegroundColor Green
} else {
    Write-Host "[Layer 1] Full Access: NO — grant with:" -ForegroundColor Red
    Write-Host "  Add-MailboxPermission -Identity $SharedMailbox -User $User -AccessRights FullAccess -AutoMapping `$true"
}

# Layer 1: Send As
$sendAs = Get-RecipientPermission -Identity $SharedMailbox |
    Where-Object { $_.Trustee -eq $User }
if ($sendAs) {
    Write-Host "[Layer 1] Send As: YES" -ForegroundColor Green
} else {
    Write-Host "[Layer 1] Send As: NO — grant with:" -ForegroundColor Yellow
    Write-Host "  Add-RecipientPermission -Identity $SharedMailbox -Trustee $User -AccessRights SendAs -Confirm:`$false"
}

# Layer 1: Send on Behalf
$sob = (Get-Mailbox -Identity $SharedMailbox).GrantSendOnBehalfTo
if ($sob -contains $User -or $sob -like "*$User*") {
    Write-Host "[Layer 1] Send on Behalf: YES" -ForegroundColor Green
} else {
    Write-Host "[Layer 1] Send on Behalf: NO" -ForegroundColor Gray
}

# Layer 3: Sent Items routing
$mbx = Get-Mailbox -Identity $SharedMailbox
if ($mbx.MessageCopyForSentAsEnabled -and $mbx.MessageCopyForSendOnBehalfEnabled) {
    Write-Host "[Layer 3] Sent Items lands in shared mailbox: YES" -ForegroundColor Green
} else {
    Write-Host "[Layer 3] Sent Items routing not set — fix with:" -ForegroundColor Yellow
    Write-Host "  Set-Mailbox -Identity $SharedMailbox -MessageCopyForSentAsEnabled `$true -MessageCopyForSendOnBehalfEnabled `$true"
}

Write-Host "`nIf Layer 1 is green and the mailbox still isn't visible in Outlook," -ForegroundColor Cyan
Write-Host "ask the user to close Outlook completely and reopen. Allow up to 2 hours for" -ForegroundColor Cyan
Write-Host "automapping to apply." -ForegroundColor Cyan
```

## License and lifecycle considerations

A few rules worth knowing:

- **Shared mailboxes under 50 GB don't need a license.** Above 50 GB, they need an Exchange Online Plan 2 license. Plan ahead — shared mailboxes used for retention can grow quickly.
- **Disabled user accounts whose mailboxes were converted to shared retain their permissions.** Cleaning up requires explicitly removing user permissions before / after disabling.
- **Litigation hold and archive require licensing on the shared mailbox.** A shared mailbox under hold or with an archive enabled needs Exchange Online Plan 2 regardless of size.

## Common questions

### Why is "Sent on Behalf" appearing on my message instead of just "From: shared"?

The user has Send on Behalf but not Send As. Recipients see `user@contoso.com on behalf of shared@contoso.com` because that's literally what's happening. Grant Send As (and revoke Send on Behalf if you want only the cleaner format), then restart Outlook.

### Why does my shared mailbox keep disappearing from Outlook?

Almost always: a group that granted Full Access lost the user, automapping kicked in to remove the auto-added mailbox, and Outlook now reflects the new state. Check group memberships and whether Full Access is granted directly or via group.

### Can a shared mailbox be a member of a Microsoft 365 group?

No — shared mailboxes can't join Microsoft 365 groups directly. They can be added as additional members via mail-flow rules for some scenarios, but the direct membership path isn't there.

### Why can the user see the mailbox in OWA but not in Outlook desktop?

OWA pulls live from the server; Outlook desktop uses local cache. If permissions were just changed, OWA shows the change immediately, Outlook desktop catches up within 1-2 hours.

### How do I make a shared mailbox secure (require MFA / not let people sign into it directly)?

Shared mailboxes have a hidden user account with a random password. By default, that account is `BlockCredential` (sign-in is blocked). Confirm with `Get-User -Identity shared@contoso.com | Format-List BlockCredential`. If it's false, set `Set-User -Identity shared@contoso.com -BlockCredential $true`. This is the right state — users get to the mailbox through their own credentials and the permissions granted on the shared mailbox.

### Outlook says "Cannot expand the folder. The set of folders cannot be opened." What does that mean?

Almost always a permission issue — the user has Full Access but the mailbox got deleted, renamed, or had its permissions revoked. Re-check `Get-MailboxPermission`, re-grant if needed, restart Outlook.

## What to take away

Shared mailbox tickets look chaotic until you separate the layers. Permissions live in three EXO surfaces (mailbox ACL, recipient ACL, mailbox property). Automap is the visibility trigger. Sent Items routing is a property you almost always want set. Outlook caches everything for 1-2 hours, which explains most "I have access but it doesn't work" reports. The five-layer diagnostic resolves most tickets in under five minutes once you internalise the order. The PowerShell script above takes the diagnostic from "I'll get to it next sprint" to "open a ticket, paste the output, the fix command is in the output."

## References

- [About shared mailboxes — Microsoft Learn](https://learn.microsoft.com/microsoft-365/admin/email/about-shared-mailboxes)
- [Open and use a shared mailbox in Outlook — Microsoft Learn](https://learn.microsoft.com/microsoft-365/admin/email/open-a-shared-mailbox)
- [Shared mailboxes in Exchange Online — Microsoft Learn](https://learn.microsoft.com/exchange/collaboration-exo/shared-mailboxes)
- [Remove automapping for a shared mailbox — Microsoft Learn](https://learn.microsoft.com/exchange/troubleshoot/recipients/remove-automapping-for-shared-mailbox)
- [`Add-MailboxPermission` — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/add-mailboxpermission)
- [`Add-RecipientPermission` — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/add-recipientpermission)
- [`Set-Mailbox` (`MessageCopyForSentAsEnabled`) — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/set-mailbox)
- [Custom domains and DNS records for Microsoft 365 — Sentinel Identity](https://sentinelidentity.ca/posts/microsoft-entra-and-microsoft-365-custom-domains-dns-records-spf-dkim-dmarc)
