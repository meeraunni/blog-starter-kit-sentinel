---
title: "How to Promote a Server to a Domain Controller: PowerShell and GUI Walkthrough"
excerpt: "You've got a Windows Server ready. It has an IP, a hostname, DNS pointing at the right place. Now you need to actually turn it into a Domain Controller. Grab a coffee. We'll walk through both the PowerShell way (fast, scriptable, professional) and the GUI way (visual, forgiving, good for learning). Then we'll verify it worked and cover what breaks."
coverImage: "/assets/blog/promote-server-to-dc/diagram.svg"
date: "2026-07-06T17:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/promote-server-to-dc/diagram.svg"
---

Grab a coffee. This is one of those tasks that sounds intimidating the first time and takes 15 minutes the tenth time.

"Promoting a server to Domain Controller" means taking a Windows Server that's currently a regular member server (or a fresh workgroup box) and making it a real DC — one that stores the AD database, responds to authentication requests, and participates in replication with other DCs.

Two paths: **PowerShell** (fast, scriptable, what professionals use) or **the GUI wizard** (visual, forgiving, what you'll want your first time). Both do exactly the same thing.

Let's do it.

## Prerequisites — check these before you start

Half the promotion failures I see are because one of these wasn't right. Verify all four before running the promotion:

**1. Windows Server is installed and patched.** Any current in-support Server version — Windows Server 2019, 2022, or 2025. Fully patched.

**2. The server has a static IP.** DCs must have static IPs, never DHCP. Confirm:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -eq 'Manual' }
```

**3. DNS is configured correctly.**
- **For a first DC in a new forest:** DNS points at `127.0.0.1` (localhost).
- **For an additional DC in an existing domain:** DNS points at an existing DC's IP, plus `127.0.0.1` as a secondary.

Verify:
```powershell
Get-DnsClientServerAddress -InterfaceAlias "Ethernet"
```

**4. The AD DS role is installed** (but not yet promoted). If not, run:
```powershell
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools
```

If any of these are wrong, fix them before continuing. Promotion will fail loudly (which is good).

## Two scenarios

There are two flavors of promotion. The commands are different — pay attention to which one you need.

**Scenario A: First DC in a new forest.** No AD exists yet. You're creating a new domain from scratch. Uses `Install-ADDSForest`.

**Scenario B: Additional DC in an existing domain.** AD already exists and you're adding a second (or third, or fourth) DC to it. Uses `Install-ADDSDomainController`.

If you're not sure which scenario you're in, you're probably scenario A. Companies that already have AD know they have AD.

## Scenario A: First DC in a new forest (PowerShell)

Straightforward, single command:

```powershell
Install-ADDSForest `
  -DomainName "contoso.local" `
  -DomainNetbiosName "CONTOSO" `
  -DomainMode "WinThreshold" `
  -ForestMode "WinThreshold" `
  -InstallDns:$true `
  -SafeModeAdministratorPassword (ConvertTo-SecureString -String "YourDsrmPassword!" -AsPlainText -Force) `
  -Force:$true
```

Breaking down what each parameter does:

- **`-DomainName`** — the FQDN of your new domain. Common conventions: `contoso.local`, `contoso.internal`, `ad.contoso.com` (a subdomain of a real public domain). Never use just `contoso.com` if that's also your public website — you'll create DNS chaos.
- **`-DomainNetbiosName`** — the short pre-Windows-2000 name. Convention: all-caps first part of the domain name. Legacy but still used for things like `CONTOSO\username` login format.
- **`-DomainMode` and `-ForestMode`** — the AD functional level. `WinThreshold` is the highest available in current Windows Server versions and unlocks all newest features.
- **`-InstallDns:$true`** — install DNS Server role on this DC. Almost always yes.
- **`-SafeModeAdministratorPassword`** — the DSRM password. Used only if you ever need to boot into Directory Services Restore Mode to fix a corrupted AD database. **Save this in a password vault. You will forget it, and you will need it.**
- **`-Force:$true`** — skip confirmation prompts.

The server reboots automatically when done. When it comes back, you have a functional forest.

## Scenario B: Additional DC in an existing domain (PowerShell)

Almost identical but the command is different, and you need domain admin credentials:

```powershell
Install-ADDSDomainController `
  -DomainName "contoso.local" `
  -Credential (Get-Credential) `
  -InstallDns:$true `
  -SiteName "Default-First-Site-Name" `
  -SafeModeAdministratorPassword (ConvertTo-SecureString -String "YourDsrmPassword!" -AsPlainText -Force) `
  -Force:$true
```

Key differences from Scenario A:

- **`-Credential (Get-Credential)`** — prompts you for domain admin credentials to authorize adding this DC to the domain.
- **`-SiteName`** — the AD site this DC belongs to. Default is `Default-First-Site-Name` if you haven't created custom sites. Change this to match your actual site name if you have a multi-site environment.

Server reboots when done. Now you have a second DC.

## The GUI wizard alternative

If you prefer visual confirmation, use the GUI. Open Server Manager, click the notification flag (top right) that says "Configuration required for Active Directory Domain Services." Click "Promote this server to a domain controller."

The wizard walks through:

1. **Deployment Configuration** — pick "Add a new forest" (Scenario A) or "Add a domain controller to an existing domain" (Scenario B). Type the domain name.

2. **Domain Controller Options** — pick forest/domain functional level, confirm DNS Server role, enter DSRM password.

3. **DNS Options** — usually a warning about DNS delegation. Safe to ignore for internal-only domains (`.local` names).

4. **Additional Options** — the NetBIOS domain name is auto-suggested; usually fine as-is.

5. **Paths** — where AD stores its database, log, and SYSVOL. Defaults (`C:\Windows\NTDS`, `C:\Windows\SYSVOL`) are fine unless you have a specific reason to move them.

6. **Review Options** — confirms what you've chosen. You can click "View script" to see the PowerShell command it will run — useful for learning.

7. **Prerequisites Check** — the wizard runs a series of checks. Address any errors before proceeding. Warnings are usually fine to ignore.

8. **Install** — click Install. The wizard runs, promotes the DC, and reboots automatically.

The GUI is slower than PowerShell but shows you exactly what's happening at every step. Great for learning.

## What actually happens during promotion

This is what's going on under the hood as the promotion runs:

1. **AD DS binaries are configured.** The role is already installed; promotion configures the actual DC-specific services.
2. **The AD database is created.** `ntds.dit` is the SQL-Server-like file that stores all AD data. Created and initialized here.
3. **SYSVOL is created.** SYSVOL is the replicated share containing GPO templates and login scripts.
4. **DNS zones are created.** If you're the first DC and installing DNS, a `contoso.local` forward lookup zone is created.
5. **Kerberos KDC is started.** The DC can now issue Kerberos tickets.
6. **Replication is configured.** If joining an existing domain, initial replication with existing DCs begins.
7. **The domain and forest schema is registered.** For a new forest, the initial schema is written.
8. **Server reboots.** When it comes back, it's a fully-functional DC.

## Post-promotion verification

Don't just trust that it worked. Verify:

### `dcdiag /v`

Runs a comprehensive suite of DC health tests.

```powershell
dcdiag /v
```

Every test should pass. Common issues:
- **DNS test fails:** DNS is misconfigured. Verify the DC can resolve its own domain name.
- **Replications test fails:** For a second DC, initial replication may still be in progress. Wait 15 minutes and retry.
- **Advertising test fails:** The DC isn't advertising itself in DNS. Restart Netlogon service (`Restart-Service Netlogon`).

### `repadmin /showrepl`

Confirms replication status.

```powershell
repadmin /showrepl
```

For a new forest, shows the DC replicating with itself (no partners yet). For an additional DC, shows replication with existing DCs. All should show "Last attempt @ ... was successful."

### Verify DNS records

```powershell
nslookup -type=srv _ldap._tcp.dc._msdcs.contoso.local
```

Should return the DC's hostname and IP. If it returns nothing, DNS registration didn't complete.

### Check event logs

Look at the Directory Service log:

```powershell
Get-EventLog -LogName "Directory Service" -Newest 20
```

Should see start-up events. Any red errors need investigation.

## What breaks and how to fix it

**"The wizard is greyed out and won't let me proceed."** Usually one of the prerequisites failed. Check the exact error — it's often a DNS problem or a "server is not in a workgroup or domain-joined" issue.

**"Promotion fails with 'RPC server is unavailable' (for scenario B)."** Network issue between this box and existing DCs. Check firewall rules. AD requires ports 135, 445, 389, 636, 3268, 3269, 88, and 464 (among others).

**"Promotion succeeds but `dcdiag` reports repeated failures."** Give it 15 minutes for initial replication and DNS registration to complete. If persistent, look at the specific failing test and Google the exact error. Rarely, requires demoting and re-promoting.

**"After promotion, users can log in but Group Policy doesn't apply."** DNS. The domain-joined machines can't find the DC's SRV records. Fix DNS on the clients and DC.

**"The DC won't advertise in DNS."** Restart Netlogon service. If that doesn't work, check that DNS Server role is running on the DC and that dynamic updates are enabled on the AD-integrated zone.

**"I forgot my DSRM password."** You can reset it while the DC is online (weirdly enough):
```powershell
ntdsutil "set dsrm password" "reset password on server null" q q
```

## The FAQ

**How long does promotion take?**
5–15 minutes for the promotion itself, plus a reboot. Adding a DC to a large existing domain (many GB of AD data) can take longer because of initial replication.

**Can I demote a DC later?**
Yes. Same steps but with `Uninstall-ADDSDomainController`. Best practice: demote through the GUI or PowerShell first, don't just shut down the server and delete it.

**What's the difference between DSRM and Domain Admin passwords?**
DSRM is a local password used only when the DC boots into Directory Services Restore Mode (offline recovery). Domain Admin is your normal admin credential for the domain. They're independent. Both matter.

**Do I need Enterprise Admin for scenario B?**
For adding a DC to an existing domain, Domain Admin credentials of the target domain are enough. Enterprise Admin is only needed for creating new domains within an existing forest or making schema changes.

**Can I promote a DC without an internet connection?**
Yes. AD is entirely on-prem — no cloud dependency for on-prem AD (unless you're joining Entra Connect after, which is separate).

**Should the DC be a member server first, or a workgroup box?**
For a new forest (Scenario A): can be either — the promotion converts it into a DC. Workgroup is slightly cleaner.
For adding to an existing domain (Scenario B): must be a workgroup box, not already domain-joined.

**Can I promote a Windows Server Core installation?**
Yes. Both `Install-ADDSForest` and `Install-ADDSDomainController` work fine on Server Core. The GUI wizard obviously isn't available on Core.

## Where to go next

- **[How to Build a Physical Domain Controller](/posts/how-to-build-a-physical-domain-controller)** — the full hardware-to-DC walkthrough this post is the middle of.
- **[What is Active Directory?](/posts/what-is-active-directory-beginners-guide)** — the conceptual foundation.
- **[What are Active Directory Sites?](/posts/what-are-active-directory-sites-beginners-guide)** — you'll want to assign your new DC to a site once you have multiple.

Now go grab a coffee. Every senior admin has done this hundreds of times. The first ten feel intimidating; the eleventh takes 5 minutes.
