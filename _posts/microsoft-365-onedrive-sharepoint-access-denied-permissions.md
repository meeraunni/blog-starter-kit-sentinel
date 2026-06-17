---
title: "OneDrive and SharePoint Access Denied in Microsoft 365: The Sharing Model Diagnostic"
excerpt: "Access denied after a sharing change, broken inheritance, external sharing disabled at the tenant level, and the Conditional Access policy that produces the same error. Walk the four layers of SharePoint permission and the OneDrive sync states that surface as access errors."
coverImage: "/assets/blog/microsoft-365-onedrive-sharepoint-access-denied-permissions/diagram.svg"
date: "2026-05-12T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/microsoft-365-onedrive-sharepoint-access-denied-permissions/diagram.svg"
---

## The shared link that worked yesterday

A user clicks a shared link to a SharePoint document they used last week. The browser shows "Access denied. You do not have permission to view this site or document." OneDrive sync starts showing red Xs on files in a folder they've always had. A guest user reports that an external share link bounces. Nothing was supposedly changed.

SharePoint and OneDrive access in Microsoft 365 is the result of four independent permission surfaces stacked on top of each other: tenant-level sharing settings, site-level permission, library/list-level permission, and per-item ACLs. A change at any layer can take effect anywhere downstream. The "nothing changed" claim is almost always wrong — *something* changed, somewhere in those four layers, by someone, sometime in the last few days. The diagnostic is figuring out which layer.

This article walks the four-layer model, the SharePoint admin centre and PnP PowerShell commands to inspect each, the OneDrive sync states that surface as access errors when they're really cache problems, and the Conditional Access overlap that produces the same error message. References: [SharePoint sharing overview](https://learn.microsoft.com/sharepoint/turn-external-sharing-on-or-off), [Permission levels in SharePoint](https://learn.microsoft.com/sharepoint/understanding-permission-levels), [Manage SharePoint permissions in PowerShell](https://learn.microsoft.com/powershell/sharepoint/sharepoint-online/connect-sharepoint-online).

## The four layers

| # | Layer | What controls it | Common cause of denial |
|---|---|---|---|
| 1 | **Tenant-level sharing** | SharePoint admin centre → Sharing | Tenant-wide external sharing disabled |
| 2 | **Site-level sharing** | Site → Site Permissions | Site sharing reduced below tenant level |
| 3 | **Library / list permission** | Library → Settings → Permissions | Broken inheritance with the user removed |
| 4 | **Per-item ACL** | Item → Manage Access | Per-item share revoked individually |

Plus a fifth, orthogonal layer:

| 5 | **Conditional Access** | Entra admin centre → Conditional Access | Sign-in to SPO blocked by device/location policy |

Walk these in order. Higher layers can override lower ones (a tenant-level external-sharing-off cuts every guest off, regardless of site or item grants).

## Layer 1: Tenant-level sharing settings

If guest users are denied access to a site that "worked last week," the most common cause is the tenant or site admin tightened external sharing in response to a policy review.

```powershell
# Connect to SharePoint Online
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# View tenant-wide sharing settings
Get-SPOTenant | Select-Object SharingCapability, RequireAcceptingAccountMatchInvitedAccount,
                              DefaultLinkPermission, DefaultSharingLinkType,
                              FileAnonymousLinkType, FolderAnonymousLinkType
```

The `SharingCapability` values:

- `Disabled` — no external sharing anywhere in the tenant
- `ExternalUserSharingOnly` — external users only (no anonymous links)
- `ExternalUserAndGuestSharing` — external users + anonymous links (most permissive)
- `ExistingExternalUserSharingOnly` — only previously-shared-with external users

A change from `ExternalUserAndGuestSharing` to `ExternalUserSharingOnly` cuts off every anonymous-link share immediately. If users report broken links, this is the first thing to check.

## Layer 2: Site-level sharing

A site's sharing capability can be more restrictive than the tenant's, but not more permissive.

```powershell
Get-SPOSite -Identity "https://contoso.sharepoint.com/sites/projectX" |
    Select-Object Title, SharingCapability, ConditionalAccessPolicy, AllowDownloadingNonWebViewableFiles
```

If the site's `SharingCapability` is `Disabled` while the tenant is `ExternalUserSharingOnly`, the site has been locked down independently. The fix:

```powershell
Set-SPOSite -Identity "https://contoso.sharepoint.com/sites/projectX" `
    -SharingCapability ExternalUserSharingOnly
```

`ConditionalAccessPolicy` is a separate concept that controls whether SharePoint requires the user's session to be from a compliant device or trusted location. `BlockAccess` here causes access errors even for users with full permission.

## Layer 3: Library/list permission and broken inheritance

By default, libraries and lists inherit permissions from the site. When someone clicks "Stop inheriting permissions" on a library and then customises (often to grant a specific user access to one folder), the library no longer reflects site-level changes. Site-level adds don't propagate; site-level removes do still apply via the membership lookup, but specific grants on the library can override.

```powershell
# Using PnP PowerShell — install via: Install-Module -Name PnP.PowerShell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/projectX" -Interactive

# Check inheritance on a library
Get-PnPList -Identity "Documents" | Select-Object Title, HasUniqueRoleAssignments

# If true (broken inheritance), list the actual permissions
Get-PnPGroup -AssociatedMemberGroup
Get-PnPListPermissions -Identity "Documents"
```

Broken inheritance is a frequent cause of "I had access yesterday." A new permission was applied at the site level, but the library doesn't inherit, so the user's view of the library didn't change while their view of the site did.

**To restore inheritance:**

```powershell
$list = Get-PnPList -Identity "Documents"
$list.ResetRoleInheritance()
$list.Update()
Invoke-PnPQuery
```

This is destructive — it removes all unique permissions on the library and reverts to site-level inheritance. Confirm before running.

## Layer 4: Per-item ACL

Individual files and folders can have unique permissions, particularly after a user shares a specific file with a specific person (which creates a per-item grant).

In the SharePoint UI: click the item → ⋮ → Manage Access. The flyout shows direct grants. In PowerShell:

```powershell
$item = Get-PnPListItem -List "Documents" -Id 42
$item.HasUniqueRoleAssignments  # true means unique permissions
```

If the user previously had access via a now-revoked direct share and the broader library permission doesn't include them, they lose access without any "removal" event in their view.

## Layer 5: Conditional Access blocking the sign-in

A Conditional Access policy that requires a compliant device for SharePoint Online produces "access denied" for users on non-compliant devices, regardless of perfect SharePoint permissions. The symptom is identical to a permission problem from the user's perspective.

The diagnostic is the same as for any CA issue: open the user's recent sign-ins in the Microsoft Entra admin centre, filter by `SharePoint Online`, look at the Conditional Access tab on failures. If a CA policy is in the verdict with `failure`, you have your cause.

The full walkthrough is in the [Conditional Access troubleshooting post](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs).

## The OneDrive sync states that look like permission errors

OneDrive sync has its own way of surfacing "I can't access this" that doesn't always reflect SharePoint permission. The most common:

| Symptom | Likely cause |
|---|---|
| Red X on a synced folder | Sync session expired; sign out and back in to OneDrive client |
| "Please sign in" persistent prompt | Modern auth token expired; the [Outlook password loop post](/posts/outlook-keeps-asking-for-password-microsoft-365-mfa) applies (same WAM cache) |
| "This item might not exist" on a synced file | The underlying SharePoint item was moved or deleted; remove the sync association and re-add |
| Sync stopped, "We're having trouble connecting" | Network egress filter blocks OneDrive endpoints; check enterprise firewall |
| Files-On-Demand placeholders unhydrate to errors | Storage quota exceeded, or selective sync excludes the folder |

For each, the OneDrive client's "Activity" panel (right-click the cloud icon → View activity) is the first diagnostic. The status messages there name the cause more specifically than the file-level X marks suggest.

## A useful one-shot diagnostic for a single user/file

When a user reports "I can't access this file," the fastest path to root cause:

```powershell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/projectX" -Interactive

# Inspect the file's permissions
$file = Get-PnPFile -Url "/sites/projectX/Documents/Report.docx" -AsListItem
$file.HasUniqueRoleAssignments
Get-PnPProperty -ClientObject $file -Property "RoleAssignments" |
    ForEach-Object {
        $member = Get-PnPProperty -ClientObject $_ -Property "Member"
        $roleBindings = Get-PnPProperty -ClientObject $_ -Property "RoleDefinitionBindings"
        [pscustomobject]@{
            Member = $member.Title
            Login  = $member.LoginName
            Roles  = ($roleBindings | ForEach-Object Name) -join ","
        }
    }
```

The output shows exactly who can access this specific file and what they can do. Compare against the requesting user — if they're not in the list directly or via a listed group, they don't have permission.

## Common questions

### Why does the user see "access denied" but their colleague with the same role can access?

Most often: the colleague has direct per-item access that was granted in an old share, and the user (with the same group membership) doesn't. Direct per-item grants override broader group-level permissions. Use Manage Access on the item to see who actually has direct grants.

### A guest user's link works for them but not for another guest. Why?

Anonymous links work for anyone who has the URL; "specific people" links require the recipient's email to match the invitation. If you invited `alice@partner.com` and `bob@partner.com` tries the same link, Bob is denied.

### Why does the file work in the browser but not when synced via OneDrive client?

Different authentication paths. Browser uses the user's interactive session; OneDrive client uses the WAM token broker. A WAM token cache issue (cause 3 in the Outlook password loop post) affects sync but not the browser. The fix is the same: reset Credential Manager entries and the TokenBroker cache, restart the OneDrive client.

### Can I see who removed permission from a folder?

Yes — the unified audit log captures permission changes:

```powershell
Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-30) `
    -EndDate (Get-Date) -RecordType SharePointFileOperation `
    -Operations SharingSet, SharingRevoked, AccessInvitationRevoked `
    -FreeText "projectX" |
    Format-Table CreationDate, UserIds, Operations, ObjectId
```

This shows every sharing-related change in the last 30 days for matches against `projectX`.

### What's the difference between "external user" and "anonymous link"?

External user = a person you've invited by email; they sign in with their own credentials before accessing. Anonymous link = anyone with the URL, no authentication required. Anonymous links are more permissive and a more common audit/compliance concern.

### How do I bulk-audit per-item unique permissions across a site?

Sites with many broken-inheritance items become impossible to govern. The PnP cmdlet `Get-PnPSiteSearchQueryResults` plus item-level checks can produce a CSV of every item with unique permissions on a site — useful for periodic cleanup of forgotten direct shares.

## What to take away

SharePoint and OneDrive access denial maps to a four-layer permission model (plus the orthogonal Conditional Access layer). Tenant-level sharing changes are the most disruptive and the most likely cause of "nothing changed, but it broke." Site-level and library-level permission changes account for most narrower complaints. Per-item ACLs and Conditional Access cover the remainder. The PnP PowerShell scripts above resolve individual tickets in minutes; the audit-log query catches the change that nobody documented but absolutely happened.

## References

- [SharePoint external sharing settings — Microsoft Learn](https://learn.microsoft.com/sharepoint/turn-external-sharing-on-or-off)
- [Permission levels in SharePoint — Microsoft Learn](https://learn.microsoft.com/sharepoint/understanding-permission-levels)
- [Default SharePoint groups — Microsoft Learn](https://learn.microsoft.com/sharepoint/default-sharepoint-groups)
- [PnP PowerShell — Microsoft Learn](https://learn.microsoft.com/powershell/sharepoint/sharepoint-pnp/sharepoint-pnp-cmdlets)
- [Conditional Access for SharePoint Online — Microsoft Learn](https://learn.microsoft.com/sharepoint/control-access-from-unmanaged-devices)
- [Search the audit log — Microsoft Learn](https://learn.microsoft.com/purview/audit-log-search)
