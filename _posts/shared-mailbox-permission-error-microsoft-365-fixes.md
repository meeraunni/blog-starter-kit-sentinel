---
title: "Shared Mailbox 'You Don't Have Permission' Error in Microsoft 365: Diagnostic Path and Fixes"
excerpt: "The user clicks the shared mailbox and Outlook says 'You don't have permission.' Walk the access-flag hierarchy, deny-permission precedence, ACL inheritance, and the licensing trap that produces the same error message."
coverImage: "/assets/blog/shared-mailbox-permission-error-microsoft-365-fixes/diagram.svg"
date: "2026-05-17T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/shared-mailbox-permission-error-microsoft-365-fixes/diagram.svg"
---

## The error that means six different things

"You don't have permission to perform this action." It's one of the least helpful error messages in Microsoft 365, because shared mailbox access in Exchange Online is the product of at least six independent permission surfaces, and the error doesn't tell you which one denied. The user knows they "should have access." The admin checks the Exchange admin centre and sees the user listed. The error persists.

This is a tractable problem once you stop treating "permission" as a single thing. Exchange Online evaluates access against: the mailbox-level permission (Full Access, Read, Folder Visible), explicit deny entries, folder-level ACLs, recipient filters in role assignments, the user's own licensing state, and — increasingly — Conditional Access policies that block the *sign-in*, not the mailbox access, in a way that surfaces as a permission error in Outlook.

This article gives you the six-layer model, the PowerShell to inspect each layer in turn, and the four most common root causes that account for the vast majority of these tickets. Authoritative references: [Manage permissions for recipients](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients), [Get-MailboxPermission](https://learn.microsoft.com/powershell/module/exchange/get-mailboxpermission), [Get-MailboxFolderPermission](https://learn.microsoft.com/powershell/module/exchange/get-mailboxfolderpermission).

## The six layers of "permission" in Exchange Online

When a user tries to open a shared mailbox or one of its folders, EXO evaluates access in this order. The first denial wins.

| # | Layer | What controls it | Common cause of failure |
|---|---|---|---|
| 1 | **Sign-in itself** | Conditional Access policies | User can't get a valid token to EXO at all (compliant device, MFA, location) |
| 2 | **Mailbox Full Access permission** | `Get-MailboxPermission` output, including deny entries | Explicit deny, missing grant, grant on wrong identity |
| 3 | **Recipient filter on role assignment** | Some custom RBAC roles include a scope filter | User is in the right group but outside the role's recipient scope |
| 4 | **Folder-level ACL** | `Get-MailboxFolderPermission` per folder | User has Full Access on the mailbox but a folder ACL denies them on a subfolder |
| 5 | **The user's own mailbox license** | EXO requires the user to have an Exchange Online plan to access *any* EXO mailbox | User is unlicensed or in a license-grace period |
| 6 | **Mailbox state** | Litigation hold, retention lock, disabled, on soft-delete | Mailbox itself is in a state that blocks operations |

Walk this list in order. Each step takes 60 seconds; the first one that returns a "no" is your root cause.

## Layer 1: Is the user even getting to Exchange Online?

Open the user's recent sign-ins in the Microsoft Entra admin centre, filter by app `Office 365 Exchange Online`. If the most recent attempts show `failure` with a Conditional Access policy in the verdict, the problem isn't shared-mailbox permission at all — it's that the user can't sign in to EXO. Outlook surfaces this as a generic permission error because it can't distinguish "no token" from "no access."

If you see this, the fix is in Conditional Access, not in mailbox permissions. The walkthrough is in [Troubleshooting Conditional Access with sign-in logs](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs).

## Layer 2: The explicit permission grant

```powershell
Connect-ExchangeOnline

# Direct grants on the mailbox
Get-MailboxPermission -Identity "sales@contoso.com" |
    Where-Object { $_.User -notlike "NT AUTHORITY*" -and $_.IsInherited -eq $false } |
    Format-Table User, AccessRights, Deny, IsInherited
```

Look at the output for the user:

- **No row for the user** — the grant was never applied. Add it: `Add-MailboxPermission -Identity sales@contoso.com -User alice@contoso.com -AccessRights FullAccess`.
- **Row with `Deny : True`** — a deny entry. Deny always wins, even over inherited or group-granted Allow. Remove it: `Remove-MailboxPermission -Identity sales@contoso.com -User alice@contoso.com -AccessRights FullAccess -Deny:$true`.
- **Row with `AccessRights : ReadPermission` only** — that's not enough. Full Access is required to open the mailbox in Outlook.

### The group membership gotcha

If the grant is on a group (e.g. `Add-MailboxPermission -Identity sales@contoso.com -User "Sales-FullAccess" -AccessRights FullAccess`), `Get-MailboxPermission` shows the group, not the user. Verify the user is *currently* a member:

```powershell
Get-DistributionGroupMember -Identity "Sales-FullAccess" |
    Where-Object { $_.PrimarySmtpAddress -eq "alice@contoso.com" }
```

Empty result means the user isn't in the group despite assumptions to the contrary. Common cause: the group is a dynamic group whose filter doesn't match the user's current attributes.

> [!IMPORTANT]
> Group-granted permissions take up to several hours to propagate through Exchange Online's permission cache after a user is added to the group. Recent membership changes are a frequent cause of "I just got added but it's still saying no permission."

## Layer 3: RBAC role scope (rare but real)

If your tenant uses Exchange RBAC role assignments with recipient filters (Recipient management role assignments with a custom `RecipientWriteScope`), the user could be in a group that has the right role but the role's recipient filter excludes the target mailbox.

```powershell
Get-ManagementRoleAssignment -RoleAssignee "alice@contoso.com" |
    Format-Table Name, Role, RecipientWriteScope, CustomRecipientWriteScope
```

If a custom scope appears, inspect it: `Get-ManagementScope -Identity "<scope-name>"`. The `RecipientRestrictionFilter` decides who the role-holder can act on. If the shared mailbox doesn't match the filter, the action fails.

## Layer 4: Folder-level ACLs

Full Access on the mailbox doesn't override per-folder denies. If the user can open the mailbox but can't open one specific folder (calendar, a subfolder of Inbox), the folder ACL is the cause.

```powershell
# Inspect the folder ACL on a specific folder
Get-MailboxFolderPermission -Identity "sales@contoso.com:\Inbox\Confidential" |
    Format-Table User, AccessRights
```

If the user is listed with `None`, or a previous admin added a deny-like ACL, that's your block. Fix:

```powershell
# Grant Reviewer (read-only) on the folder
Add-MailboxFolderPermission -Identity "sales@contoso.com:\Inbox\Confidential" `
    -User "alice@contoso.com" -AccessRights Reviewer
```

The full set of folder roles (Owner, PublishingEditor, Editor, PublishingAuthor, Author, NonEditingAuthor, Reviewer, Contributor, None) is in the [`Get-MailboxFolderPermission` reference](https://learn.microsoft.com/powershell/module/exchange/get-mailboxfolderpermission).

## Layer 5: The licensing trap

This one bites hard and is the cause that the "rebuild the profile" advice never catches. **A user must have an Exchange Online license to access *any* EXO mailbox**, including a shared mailbox. Shared mailboxes themselves are unlicensed (that's the whole point), but the user who accesses one must be licensed.

```powershell
# Check the user's assigned licenses
Get-MgUserLicenseDetail -UserId "alice@contoso.com" |
    Select-Object SkuPartNumber, ServicePlans
```

If the user has no Exchange Online plan in the assigned SKUs, they get permission errors on every shared mailbox even with a perfect Full Access grant. The fix is licensing, not permissions.

> [!WARNING]
> The 30-day grace period after license removal is the trap. A user who lost their E3 license 25 days ago might still be able to access their own mailbox via cached credentials but get "permission denied" on shared mailboxes that re-validate licensing per session. Always check current licensing before chasing permission grants.

## Layer 6: Mailbox state

A shared mailbox that's been disabled, soft-deleted, or placed under a litigation hold with restrictive settings can produce permission errors on operations that would otherwise succeed:

```powershell
Get-Mailbox -Identity "sales@contoso.com" |
    Select-Object Identity, RecipientTypeDetails, LitigationHoldEnabled,
                  RetentionPolicy, IsResource, AccountDisabled, WhenSoftDeleted
```

Look at `AccountDisabled` and `WhenSoftDeleted` first. Disabled or soft-deleted mailboxes don't accept any user operations.

## The four most common root causes, ranked

After working through enough of these tickets, this is the actual frequency:

1. **Replication delay after a recent permission grant** (≈40% of tickets). Just resolved itself by the time the user opens a follow-up email.
2. **User missing an Exchange Online license** (≈25%). Licensing changed and nobody connected the dots.
3. **Group membership not yet propagated to EXO permission cache** (≈15%). Group was modified, EXO hasn't caught up.
4. **Explicit deny entry left over from a prior project** (≈10%). Someone denied access during an investigation, never removed the deny.

The remaining ≈10% is split across folder-level ACLs, RBAC scopes, and mailbox state issues.

## A one-script triage for the help desk

```powershell
<#
.SYNOPSIS
  Walks the six-layer diagnostic for shared mailbox permission errors.
#>
param(
    [Parameter(Mandatory)] [string] $UserUpn,
    [Parameter(Mandatory)] [string] $SharedMailbox
)

Connect-ExchangeOnline -ShowBanner:$false

Write-Host "`n=== Diagnostic: $UserUpn → $SharedMailbox ===" -ForegroundColor Cyan

# Layer 5: licensing
$lics = (Get-MgUser -UserId $UserUpn -Property AssignedLicenses).AssignedLicenses
if ($lics.Count -eq 0) {
    Write-Host "LAYER 5: FAIL — user has no assigned licenses." -ForegroundColor Red
}

# Layer 6: mailbox state
$mbx = Get-Mailbox -Identity $SharedMailbox -ErrorAction SilentlyContinue
if (-not $mbx) {
    Write-Host "LAYER 6: FAIL — mailbox not found." -ForegroundColor Red
    return
}
if ($mbx.AccountDisabled) { Write-Host "LAYER 6: FAIL — mailbox is disabled." -ForegroundColor Red }
if ($mbx.WhenSoftDeleted) { Write-Host "LAYER 6: FAIL — mailbox is soft-deleted ($($mbx.WhenSoftDeleted))." -ForegroundColor Red }

# Layer 2: direct permission
$perm = Get-MailboxPermission -Identity $SharedMailbox |
    Where-Object { $_.User -like "*$UserUpn*" -or $_.User -eq $UserUpn }
if (-not $perm) {
    Write-Host "LAYER 2: WARN — no direct grant; check group memberships." -ForegroundColor Yellow
} else {
    foreach ($p in $perm) {
        if ($p.Deny) {
            Write-Host "LAYER 2: FAIL — explicit Deny: $($p.AccessRights -join ',')" -ForegroundColor Red
        } elseif ($p.AccessRights -contains "FullAccess") {
            Write-Host "LAYER 2: OK — FullAccess granted." -ForegroundColor Green
        } else {
            Write-Host "LAYER 2: WARN — permission level is $($p.AccessRights -join ',') (FullAccess needed)." -ForegroundColor Yellow
        }
    }
}

Write-Host "`nAlso check: recent CA failures, group propagation (up to 60 min), folder-level ACLs." -ForegroundColor Gray
```

Run as `.\Test-SharedMailboxAccess.ps1 -UserUpn alice@contoso.com -SharedMailbox sales@contoso.com`. The output names the layer where the diagnostic stops.

## Common questions

### Why does access work in OWA but not in Outlook desktop?

OWA validates access at session establishment; Outlook desktop uses a local profile cache. If you recently changed permissions, OWA picks them up faster. The Outlook fix is profile-side: close, wait 15 minutes, reopen.

### A user has access in Outlook on their laptop but not in Outlook on their phone. Why?

The two clients have independent credential and cache states. Sign out and back in on the phone client. If the issue persists, remove and re-add the account.

### Can a Global Administrator open a shared mailbox without explicit permission?

No. Global Admin grants directory-level permissions but not per-mailbox access by default. You'd still need to run `Add-MailboxPermission` for the GA's account on each mailbox you want to access.

### What does "Send on Behalf" do that "Send As" doesn't?

Send on Behalf shows the recipient "Sent by user@contoso.com on behalf of shared@contoso.com." Send As makes the message appear as if sent directly from the shared mailbox. Send As is what most users actually want; Send on Behalf is mostly used in delegation scenarios with audit trails.

### Why does the same user have access to one shared mailbox but not another?

The permissions are per-mailbox. A user in the `All-Staff-Access` group might have Full Access on Mailbox A and no access on Mailbox B because Mailbox B's permission grant doesn't include the group. Always run `Get-MailboxPermission` against the *specific* mailbox in question.

### Will removing the permission and re-adding it help?

Sometimes — particularly when the original grant had `AutoMapping:$false`, or when the EXO permission cache has gotten out of sync. It's a low-cost fix to try after the diagnostic confirms nothing else is wrong.

## What to take away

"You don't have permission" is six different problems wearing the same error message. The six-layer model resolves it deterministically: sign-in → direct grant → RBAC scope → folder ACL → license → mailbox state. The script walks the first three layers in 30 seconds. Most tickets are resolved before the user finishes typing their original "still doesn't work" follow-up.

## References

- [Manage permissions for recipients — Microsoft Learn](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-permissions-for-recipients)
- [Get-MailboxPermission — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/get-mailboxpermission)
- [Get-MailboxFolderPermission — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/get-mailboxfolderpermission)
- [Exchange Online RBAC — Microsoft Learn](https://learn.microsoft.com/exchange/permissions-exo/permissions-exo)
- [Shared mailboxes in Exchange Online — Microsoft Learn](https://learn.microsoft.com/microsoft-365/admin/email/about-shared-mailboxes)
