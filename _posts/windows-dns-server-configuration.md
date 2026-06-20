---
title: "Windows DNS Server Configuration: The Settings That Don't Bite You in Production"
excerpt: "Most Windows DNS servers run on defaults that worked fine in 2008 and haven't really been revisited since. A handful of those defaults haven't aged well — the listening interfaces are too permissive, recursion is open, scavenging is off, the cache is wide open to poisoning. Here's the configuration pass worth doing on every DNS server in your forest."
coverImage: "/assets/blog/windows-dns-server-configuration/diagram.svg"
date: "2026-06-19T13:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/windows-dns-server-configuration/diagram.svg"
---

Windows DNS Server is one of the most stable services in the Windows Server family. Install the role, accept the wizard defaults, and it works for years. That stability is also what produces the most common operational problem: the defaults that shipped when most environments were single-site, single-subnet, low-threat. Run the same configuration in 2026 on a multi-site enterprise environment and several of the defaults are no longer the right answer.

This piece walks through the server-level configuration that's worth revisiting on every DNS server you run. Listening interfaces, recursion, the cache and how to protect it, scavenging, the global query block list, and a handful of registry and policy settings that close gaps the wizard doesn't surface. Each section is a small change with a real reason to make it, plus the PowerShell to apply it cleanly across the forest.

## Listen on the interfaces you actually use

The default is "Listen on all IP addresses." That's fine on a single-NIC server with one private IP. On a server with multiple NICs (management, backup, replication) or a server that's dual-homed across security zones, "listen on all" exposes the DNS service on interfaces where it shouldn't be reachable.

Pin the listener to the interfaces that legitimately need to serve DNS, usually just the production NIC:

```powershell
Set-DnsServerSetting -ListeningIPAddress 10.10.0.5 -PassThru
```

You can specify multiple addresses if you genuinely want to listen on more than one. Anything not in the list stops accepting DNS queries, which is what you want for the backup/management NIC that should never be answering client queries.

Audit which interfaces a server is currently listening on:

```powershell
(Get-DnsServerSetting -All).ListeningIPAddress
```

If the result includes interfaces in a security zone different from where DNS clients live, that's something to fix before it shows up in a pen-test report.

## Recursion — off where it doesn't belong, scoped where it does

Recursion is the DNS server's ability to walk the chain of authority when it doesn't already know the answer. It's required for serving internal clients that want to resolve internet names. It is not required, and shouldn't be enabled, on DNS servers that only need to answer for the zones they're authoritative for.

The cleanest model in a multi-server environment:

- **Authoritative-only servers** (DNS servers that exist purely to answer for the zones they host, with no internal clients pointed at them) → recursion disabled.
- **Resolver servers** (the DNS servers that internal clients use as their primary DNS) → recursion enabled, but scoped so it only fires for trusted internal client subnets.

Disable recursion on a server entirely:

```powershell
Set-DnsServerRecursion -Enable $false
```

For resolver servers, you can scope recursion per network using DNS Server Policies. The pattern: configure a recursion-scope policy that allows recursion only for queries sourced from internal subnets, and explicitly denies recursion from anywhere else.

```powershell
# Create a recursion scope that's disabled by default
Add-DnsServerRecursionScope -Name "InternalOnly" -EnableRecursion $false

# Create a policy that allows recursion only for internal client subnets
Add-DnsServerQueryResolutionPolicy `
    -Name "AllowInternalRecursion" `
    -Action ALLOW `
    -ClientSubnet "EQ,InternalClients" `
    -ApplyOnRecursion `
    -RecursionScope "."

# Define the InternalClients subnet
Add-DnsServerClientSubnet -Name "InternalClients" -IPv4Subnet "10.0.0.0/8"
```

The end result is a DNS server that recursively resolves on behalf of internal clients but refuses to recurse for queries arriving from outside that range. This closes one of the more common open-recursion findings in security audits.

## Cache settings — secure response cache, max size, TTL bounds

The DNS server's cache is what makes resolution fast. It's also a poisoning target if it's wide open. Two settings worth changing from defaults:

**Secure response (cache pollution protection).** The DNS server can be configured to discard records from non-authoritative DNS servers that the resolver wouldn't reasonably accept. This is enabled by default on recent Windows Server versions but worth explicitly confirming:

```powershell
Get-DnsServerCache | Select-Object EnablePollutionProtection
# Should be: True. If not:
Set-DnsServerCache -EnablePollutionProtection $true
```

**Max cache size.** Default is 0, meaning unbounded growth. On a high-traffic resolver this rarely causes problems (the OS reaps cache when memory pressure rises) but on a server with constrained RAM you want an explicit bound:

```powershell
Set-DnsServerCache -MaxKBSize 1048576    # cap at 1 GB
```

**TTL bounds.** The cache honours record TTLs by default but you can override them. The setting that matters most: `MaxNegativeTtl`, the maximum time a negative answer (`NXDOMAIN`, "no such record") is cached. Default is 15 minutes; that's reasonable for most environments. Setting it too high (hours) means failed lookups stay failed long after the underlying record is created. Setting it too low (seconds) means every name that doesn't exist gets re-queried constantly.

```powershell
# See current TTL bounds
Get-DnsServerCache | Select-Object MaxTtl, MaxNegativeTtl
```

## Scavenging — enable it, conservatively

Aging and scavenging is the cleanup mechanism for stale dynamically-registered records. Without it, an AD-integrated zone fills up over the years with records for laptops that were retired, VMs that were decommissioned, and Windows Update reimages that registered under slightly different names.

Two switches have to be on for scavenging to actually happen:

1. **Per-zone**: aging enabled on each zone you want scavenged.
2. **Per-server**: scavenging enabled on at least one DNS server in the zone's replication scope, with a scavenging interval.

Server-wide:

```powershell
Set-DnsServerScavenging -ScavengingState $true `
    -ScavengingInterval 7.00:00:00 -PassThru
```

Per-zone, conservatively at first:

```powershell
Set-DnsServerZoneAging -Name "contoso.com" -Aging $true `
    -RefreshInterval 14:00:00 -NoRefreshInterval 14:00:00
```

The double 14-day interval means a record won't be scavenged until it has been at least 28 days since the last refresh. That's safer than the default 7+7=14 days on first rollout. Watch the DNS server's Event Log for `DNS Server` event 2501 / 2502 (scavenging started / completed) to confirm the timer is firing as expected.

Don't enable aging on the `_msdcs` zone or on zones full of static infrastructure records. Aging is meant for end-user device records, not for service records that legitimately persist for years without being touched.

## Global Query Block List — leave WPAD and ISATAP blocked

Windows DNS Server ships with a small allowlist-style query block list that returns no answer for a defined set of name queries, regardless of whether the zone has records for those names. The list defaults to `wpad` and `isatap` because both names have been exploited in attacks where an unauthenticated machine registers `wpad.<domain>` in the zone and intercepts proxy auto-configuration traffic from every client in the domain.

Confirm the block list is enabled and includes those names:

```powershell
Get-DnsServerGlobalQueryBlockList
# EnableBlockList : True
# List            : {wpad, isatap}
```

If you legitimately use a WPAD or ISATAP record (rare in modern environments), you can remove the specific name from the list. If you don't, leave the defaults exactly where they are. Disabling the block list entirely opens the WPAD attack surface for no benefit.

## EDNS and response rate limiting

**EDNS** (Extension Mechanisms for DNS) is the mechanism that lets DNS responses exceed the original 512-byte UDP limit. It's required for DNSSEC and modern DNS in general. Enabled by default; verify it hasn't been disabled by some legacy config:

```powershell
Get-DnsServerEDns
# EnableProbes : True
# EnableReception : True
# CacheTimeout : 15 minutes
```

**Response Rate Limiting (RRL)** caps the rate at which the DNS server responds to repeated identical queries from the same source. Important on internet-facing DNS to mitigate amplification attacks. Less important on purely internal resolvers, but enabling it costs nothing operationally:

```powershell
Set-DnsServerResponseRateLimiting -Enable $true
```

The defaults for RRL are conservative and rarely produce false positives on legitimate traffic. Worth turning on as part of standard server hardening.

## Audit the configuration across all DNS servers

The point of the per-server configuration is that it should be consistent across every DNS server in the forest. A configuration audit script that runs against every DNS server and reports drift:

```powershell
# Pull a configuration snapshot from every DC running DNS
$dcs = Get-ADDomainController -Filter * | Select-Object -ExpandProperty Hostname

$report = foreach ($dc in $dcs) {
    try {
        $recursion = Get-DnsServerRecursion -ComputerName $dc
        $cache     = Get-DnsServerCache     -ComputerName $dc
        $scavenge  = Get-DnsServerScavenging -ComputerName $dc
        $listen    = (Get-DnsServerSetting  -ComputerName $dc -All).ListeningIPAddress
        $block     = Get-DnsServerGlobalQueryBlockList -ComputerName $dc

        [pscustomobject]@{
            Server          = $dc
            Recursion       = $recursion.Enable
            PollutionProt   = $cache.EnablePollutionProtection
            ScavengingState = $scavenge.ScavengingState
            ListeningCount  = ($listen | Measure-Object).Count
            BlockListOn     = $block.EnableBlockList
        }
    } catch {
        [pscustomobject]@{ Server = $dc; Error = $_.Exception.Message }
    }
}

$report | Format-Table -AutoSize
```

Run weekly. Anything that drifts (a new DC added without the standard config, an admin who flipped a setting in the GUI) shows up immediately.

## A baseline configuration sequence for a new DNS server

Walking the order I'd apply on a fresh DNS server in an AD environment:

1. Install the DNS Server role and let the AD-integration take effect.
2. Pin listening interfaces to the production NIC only.
3. Decide whether this server is authoritative-only or a resolver. Disable recursion entirely if authoritative-only.
4. If it's a resolver, configure recursion scopes via DNS Server Policies to allow only internal client subnets.
5. Confirm cache pollution protection is on.
6. Set a max cache size if the server has constrained RAM.
7. Enable server-wide scavenging with a 7-day interval.
8. Confirm Global Query Block List is on with the default names.
9. Enable EDNS (verify it's already on) and RRL.
10. Snapshot the config and add the server to your audit script.

That sequence takes about ten minutes once you've scripted it and is the difference between a DNS server that's "installed" and one that's actually configured for production.

## Things people ask

*The DNS server is on a domain controller — do I have to harden it separately from the DC?* Yes. The DNS role's configuration is distinct from the DC's configuration. The DNS server has its own listener bindings, recursion settings, and policies. Default DC installation gives you the DNS role with default DNS settings, not hardened DNS settings.

*Will disabling recursion break AD?* No. AD-integrated authoritative responses don't go through the recursion code path. The DC will still answer queries for the zones it's authoritative for. Recursion only kicks in for queries for names the server doesn't have a zone for — typically internet names. If clients use a different resolver for internet lookups (which is normal in many enterprises), disabling recursion on the DC's DNS service is operationally invisible.

*What's the cache size in practice?* On a typical enterprise resolver, the cache hovers in the tens to hundreds of megabytes depending on query mix. Hitting GB-scale cache is rare and usually indicates extremely diverse query patterns or a leak somewhere upstream. Default unbounded behaviour is fine in nearly every scenario.

*How do I know if pollution protection is doing anything?* You won't see explicit events for "I rejected a polluted response" — the protection is silent. The way to know it's enabled is to confirm via PowerShell. The way to know it's *needed* is to read the historical record of DNS cache poisoning attacks, all of which would have been mitigated by the protection.

*Should I enable DNSSEC?* Conditionally. DNSSEC for zones you're authoritative for adds complexity (key management, NSEC/NSEC3 records, parent-zone DS records) that's only justified if you publish names to the internet that benefit from cryptographic authentication. For purely internal AD zones, DNSSEC is rarely worth the operational overhead.

## Where to read further

- [DNS Server role overview — Microsoft Learn](https://learn.microsoft.com/windows-server/networking/dns/dns-overview)
- [DNS Server Policies — Microsoft Learn](https://learn.microsoft.com/windows-server/networking/dns/deploy/scenario-using-dns-policy-for-split-brain)
- [`Set-DnsServerRecursion` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsserverrecursion)
- [`Set-DnsServerCache` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsservercache)
- [`Set-DnsServerScavenging` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsserverscavenging)
- [DNS Global Query Block List — Microsoft Learn](https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/cc794902(v=ws.10))
