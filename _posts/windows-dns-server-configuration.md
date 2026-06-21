---
title: "Windows DNS Server Configuration: What the Server-Level Settings Actually Do, and How To Harden a Fresh DNS Server in Ten Minutes"
excerpt: "Most Windows DNS servers run on defaults that worked fine in 2008 and haven't really been revisited. A handful of those defaults — open recursion, no cache-pollution protection, no scavenging, listening on every interface — don't hold up in a modern enterprise threat environment. Here's what every server-level DNS setting actually does, and a baseline configuration sequence that takes a fresh DNS server from 'installed' to 'production-ready' in about ten minutes."
coverImage: "/assets/blog/windows-dns-server-configuration/diagram.svg"
date: "2026-06-19T13:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/windows-dns-server-configuration/diagram.svg"
---

Install the DNS Server role on a fresh Windows Server, click through the post-install steps, and you have a working DNS server. It listens on every network adapter, recurses for any client that asks, caches everything it sees, never scavenges stale records, blocks a small list of names that have historically been attacker targets, and runs forever without you touching it again. Most environments do exactly this and it works for years. The default configuration is also the configuration that turns up in security audits with several findings, hosts running DNS on management subnets they shouldn't be reachable from, and registries full of stale records nobody has ever cleaned up.

This article is the layer underneath the wizard — what every server-level DNS setting actually does, why a handful of defaults haven't aged well, and the specific changes worth making on every DNS server in your forest before it goes live. The Access Reviews article in this series treats Microsoft Entra access reviews as a feature you set up once and operate on a schedule; DNS server configuration is similar in shape. You make a small number of decisions when the server is fresh, you script them so they're consistent across every DNS server in the forest, and then you don't touch the configuration again until something specific motivates a change.

For context, "server-level configuration" means the settings that apply to the whole DNS service on a particular server, not the settings on individual zones. Zone-level settings (replication scope, dynamic updates, aging) are covered in the forward and reverse lookup zone articles. This piece is about everything else: which interfaces the server listens on, whether and when it recurses on behalf of clients, how it manages its cache, when it cleans up stale dynamically-registered records across zones, the security guard rails that protect against well-known attack patterns, and a few protocol-level settings that close gaps the wizard doesn't surface.

## Where server-level configuration fits

Three layers of DNS configuration on a Windows DNS server, worth distinguishing because each is managed separately.

**Server-level settings** apply to the whole DNS service on this server. Examples: which IP addresses the server listens on, whether recursion is enabled, the size and behaviour of the cache, whether the scavenger is running. Set once per server, ideally identically across every DNS server in the forest. Managed via `Set-DnsServerSetting`, `Set-DnsServerRecursion`, `Set-DnsServerCache`, and a handful of related cmdlets.

**Zone-level settings** apply per zone. Examples: replication scope, dynamic update mode, aging configuration, zone transfer permissions. Different zones on the same server can have different settings.

**Record-level settings** apply per record. Examples: TTL on individual records, the data payload. Mostly automatic for dynamically-registered records; explicit when you create records by hand.

The three layers can interact. Scavenging requires the server-level scavenger to be running *and* per-zone aging to be enabled. Recursion requires server-level recursion to be on *and* (in modern configurations) a recursion-scope policy that allows the query's source. The right mental model is "server settings establish the chassis; zone settings configure each engine; records are the actual data."

## Vocabulary that runs through the rest of this article

Seven terms you'll see repeated, worth defining once.

**Listener.** The IP address (or addresses) on which the DNS server accepts queries. By default the server listens on every IP address the OS has. You can pin it to specific addresses to keep DNS off interfaces where it shouldn't be reachable.

**Recursion.** The DNS server's ability to walk the name-resolution chain on behalf of a client when the answer isn't already in the server's authoritative zones or cache. A recursive DNS server contacts other DNS servers (forwarders, root servers, authoritative servers for various TLDs) to find an answer. An *authoritative-only* server doesn't recurse — it only answers for the zones it's directly responsible for.

**Cache.** The in-memory store of answers the server has previously fetched (either authoritatively or via recursion). Cached answers serve subsequent queries for the same name without going back to the source, until the cached entry's TTL expires.

**Cache pollution protection.** A defence mechanism that causes the DNS server to discard records that arrive in responses but weren't asked for, and records that don't come from the authoritative source for the name being resolved. Mitigates a class of cache-poisoning attacks. On by default in recent Windows Server versions but worth explicitly confirming.

**Scavenger.** The background process that periodically deletes dynamically-registered records older than a configured age. Requires both server-level scavenging to be enabled and per-zone aging to be turned on. Without the scavenger, dynamically-registered records accumulate indefinitely.

**Global Query Block List (GQBL).** A list of names the DNS server refuses to answer queries for, regardless of whether those names exist in any zone. Defaults to `wpad` and `isatap` because both have been exploited in well-known attacks where an unauthenticated machine registers a record under those names and intercepts traffic. Worth confirming is on; don't disable it unless you legitimately use one of the blocked names.

**Recursion scope.** A configuration that limits recursion to queries coming from specific client subnets. Used together with DNS Server Policies to express "recurse for internal clients but refuse to recurse for external queries." The fine-grained alternative to the blunt server-wide on/off recursion setting.

## Three scenarios where server configuration becomes the focus

Most days, the DNS server is just running and nobody touches its server-level settings. The three scenarios where the configuration actively matters:

**Standing up a new DNS server in the forest.** New DC, new DNS server role, fresh server-level configuration to apply. You want the new server to match the configuration of every other DNS server in the forest so behaviour is consistent and predictable across the population. Without an automation script, configuration drifts — server A has recursion on, server B has it off, clients get different behaviour depending on which server happens to answer their query.

**Closing a security audit finding.** A penetration test or security audit returns findings like "DNS server listening on all interfaces including management subnet," "open recursion to external clients," "no cache pollution protection." Each finding maps to a specific setting that needs changing. This article gives you the change to make for each.

**Tightening configuration for split-brain or restricted-egress environments.** The default DNS server happily recurses to public DNS via root hints. Some environments deliberately don't want that — split-brain DNS where internal queries should never escape to the public internet, or restricted-egress environments where the DNS server can't actually reach public DNS anyway. Tightening involves disabling recursion or root hints, configuring forwarders that respect the security boundary, and verifying no fallback paths leak.

## Listener interfaces — pin them to where DNS should be reachable

The default is "listen on every IP address the server has." That's fine on a single-NIC server in a small environment. It becomes a finding when the server has multiple NICs — management network, backup network, replication interconnect, dual-homed across security zones. Each unintended listener is a potential ingress for queries from networks where the DNS service shouldn't be reachable.

Pin the listener to the IPs that legitimately need to serve DNS, usually just the production NIC:

```powershell
Set-DnsServerSetting -ListeningIPAddress 10.10.0.5 -PassThru
```

You can pass multiple addresses if there's a legitimate reason to listen on more than one. Anything not in the list stops accepting DNS queries.

Audit what a server is currently listening on:

```powershell
(Get-DnsServerSetting -All).ListeningIPAddress
```

If the result includes addresses on management or backup interfaces, those are interfaces where the DNS service is reachable but shouldn't be. Pin the listener.

## Recursion — turn it off where it doesn't belong; scope it where it does

Recursion is the most consequential server-level setting because it determines what the server will do when it gets a query for a name it isn't authoritative for. Three reasonable models for an enterprise environment.

**Authoritative-only.** The server only answers for zones it directly holds (its authoritative zones). For any other query it returns a referral (if it has a stub zone for the domain) or a refusal (if it has nothing useful to say). No recursion, no forwarders consulted, no contact with upstream DNS. Right for servers that exist purely to host zones and aren't intended as resolvers for internal clients.

**Recursion enabled, scoped to trusted internal client subnets.** The server recurses (via forwarders or root hints) for queries coming from internal client subnets, and refuses recursion for queries from anywhere else. Right for internal resolvers — the DNS servers your client devices point at as their primary DNS. The scope keeps the server from being exploited as an open recursive resolver if exposed to untrusted networks.

**Recursion enabled, no scoping.** Default behaviour when you enable DNS on a server. The server recurses for any query from any source. Fine in tightly-controlled networks; a finding in any environment that touches an untrusted segment.

Disable recursion entirely on an authoritative-only server:

```powershell
Set-DnsServerRecursion -Enable $false
```

For resolver servers, configure scoped recursion via DNS Server Policies. The pattern: create a recursion scope that's disabled by default, then add a query-resolution policy that enables recursion only for queries sourced from defined internal subnets.

```powershell
# Define the internal subnets that should be allowed to recurse
Add-DnsServerClientSubnet -Name "InternalClients" `
    -IPv4Subnet "10.0.0.0/8"

# Create a recursion scope (named "InternalOnly") that's disabled by default
Add-DnsServerRecursionScope -Name "InternalOnly" `
    -EnableRecursion $false

# Add a query-resolution policy: recursion allowed only from InternalClients
Add-DnsServerQueryResolutionPolicy `
    -Name "AllowInternalRecursion" `
    -Action ALLOW `
    -ClientSubnet "EQ,InternalClients" `
    -ApplyOnRecursion `
    -RecursionScope "."
```

The end result is a resolver that recurses normally for queries from internal subnets and returns a refusal for queries from anywhere else. Closes the open-recursion finding without breaking internal clients.

## Cache settings — pollution protection on, max size if memory is tight

The cache makes resolution fast. It's also a poisoning target if it's wide open. Two settings worth changing from defaults.

**Cache pollution protection.** Causes the server to discard records that don't belong to the answer it asked for, or that come from outside the authoritative chain. Mitigates the class of attacks where a malicious nameserver tries to insert extra records into a legitimate response. On by default in recent Windows Server versions; worth explicitly confirming:

```powershell
Get-DnsServerCache | Select-Object EnablePollutionProtection
# Should be: True. If not:
Set-DnsServerCache -EnablePollutionProtection $true
```

**Maximum cache size.** Default is 0, meaning unbounded growth. On a high-traffic resolver this rarely causes problems (the OS reaps cache under memory pressure), but on a server with constrained RAM you can set an explicit bound:

```powershell
Set-DnsServerCache -MaxKBSize 1048576    # cap at 1 GB
```

**TTL bounds.** Two relevant defaults: `MaxTtl` (the longest time any cached entry is held; default 24 hours) and `MaxNegativeTtl` (the longest time negative answers — "no such name" — are cached; default 15 minutes). The MaxNegativeTtl is the more impactful setting in most environments; too high and failed lookups stay failed long after the underlying record is created, too low and every name that doesn't exist gets re-queried repeatedly. Defaults are reasonable; verify before changing.

```powershell
Get-DnsServerCache | Select-Object MaxTtl, MaxNegativeTtl
```

## Scavenger — enable it conservatively to clean up stale records

Dynamically-registered records accumulate. A workstation gets retired, its A record sticks around. Multiply by a few hundred end-of-life devices a year and your AD-integrated zones fill with names that don't resolve to anything useful.

Aging and scavenging is the cleanup mechanism. When aging is enabled on a zone, every dynamically-updated record gets a timestamp. When the scavenger runs periodically, it deletes records whose timestamp is older than `RefreshInterval + NoRefreshInterval`.

Two switches have to be on for scavenging to actually happen:

1. **Per-zone**: aging enabled on each zone you want scavenged.
2. **Per-server**: scavenging enabled on at least one DNS server in the zone's replication scope, with a scavenging interval defined.

Server-wide:

```powershell
Set-DnsServerScavenging -ScavengingState $true `
    -ScavengingInterval 7.00:00:00 -PassThru
```

Per-zone, conservatively:

```powershell
Set-DnsServerZoneAging -Name "contoso.com" -Aging $true `
    -RefreshInterval 14:00:00 -NoRefreshInterval 14:00:00
```

The double 14-day interval means a record won't be scavenged until at least 28 days since the last refresh. That's safer than the default 7+7 on first rollout. The forward and reverse lookup zone articles cover the per-zone aging trade-offs in more depth; the server-side switch above is the part to do at the server-configuration layer.

Don't enable aging on `_msdcs` or on zones holding static infrastructure records. Aging is for zones full of end-user device records, not for zones whose records legitimately persist for years without being touched.

## Global Query Block List — keep WPAD and ISATAP blocked

Windows DNS ships with a small list of names the server refuses to answer queries for, regardless of whether the zone has records for them. The list defaults to `wpad` and `isatap` because both have been exploited in attacks where an unauthenticated machine registers `wpad.<your-domain>` in the zone and intercepts proxy auto-configuration traffic from every client in the domain.

Confirm the block list is enabled and includes both names:

```powershell
Get-DnsServerGlobalQueryBlockList
# EnableBlockList : True
# List            : {wpad, isatap}
```

If you legitimately use a WPAD or ISATAP record (rare in modern environments), you can remove the specific name from the list. If you don't, leave defaults exactly where they are. Disabling the block list entirely opens the WPAD attack surface for no benefit.

## EDNS and Response Rate Limiting

**EDNS (Extension Mechanisms for DNS)** is the mechanism that lets DNS responses exceed the original 512-byte UDP limit. Required for DNSSEC and modern DNS in general. Enabled by default; verify it hasn't been disabled by legacy configuration:

```powershell
Get-DnsServerEDns
```

**Response Rate Limiting (RRL)** caps the rate at which the DNS server responds to repeated identical queries from the same source. Important on internet-facing DNS to mitigate amplification attacks. Less important on purely internal resolvers, but enabling it costs nothing operationally and is good practice:

```powershell
Set-DnsServerResponseRateLimiting -Enable $true
```

The RRL defaults are conservative and rarely produce false positives on legitimate traffic. Worth turning on as part of standard server hardening.

## A baseline configuration sequence for a fresh DNS server

Walking the order I'd apply on a new DNS server in an AD environment.

1. Install the DNS Server role and let the AD-integration take effect (usually via the DC promotion wizard).
2. Pin the listener to the production NIC only.
3. Decide whether this server is authoritative-only (for a server that hosts zones but isn't a client resolver) or a resolver. Disable recursion entirely if authoritative-only.
4. If it's a resolver, configure recursion scopes via DNS Server Policies to allow only internal client subnets.
5. Confirm cache pollution protection is on.
6. Set a max cache size if the server has constrained RAM.
7. Enable server-wide scavenging with a 7-day interval.
8. Confirm the Global Query Block List is on with the default names.
9. Verify EDNS is enabled and enable Response Rate Limiting.
10. Snapshot the configuration and add the server to your audit script.

That sequence takes about ten minutes once scripted, and is the difference between a DNS server that's "installed" and one that's "configured for production."

## Auditing configuration drift across the forest

The point of having a baseline is that every DNS server in the forest should match it. Drift happens when someone adds a new DC without running the standard config script, or when an admin flips a setting in the GUI without recording it.

A weekly audit that pulls the relevant settings from every DC running DNS:

```powershell
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

Run weekly. Any drift shows up immediately and is easier to fix on one server than to discover during an incident.

## What goes wrong — the patterns that produce incidents

**A DC was added to the forest without the standard server configuration applied.** Recursion ends up enabled where it shouldn't be, scavenging is off, the new server doesn't match the others. Clients sometimes get answers from the configured DCs and sometimes from the unconfigured one, and behaviour looks inconsistent. Fix: apply the baseline configuration, then re-run the audit.

**Recursion was disabled on a DC that's actually a resolver.** Internal clients pointed at that DC stop being able to resolve internet names. The server still answers for its authoritative zones, so AD itself works, but client browsers and tools that need external resolution fail. Fix: enable recursion (scoped to internal subnets).

**Cache pollution protection was disabled at some point and never re-enabled.** Often a remnant of a long-ago test where someone wanted to validate a specific response. Fix: re-enable, and add a check to the audit script.

**Scavenging was turned on without per-zone aging.** The scavenger runs but finds nothing to scavenge because no records have timestamps. People assume scavenging is broken when it's just not enabled at the zone level. Fix: enable aging per-zone for the zones you want cleaned up.

**Server-wide scavenging is on but only on one DNS server in the forest.** When that server is down, no scavenging happens. Not strictly a problem (records just don't get cleaned for a few days), but fragile. Fix: enable scavenging on multiple DNS servers; they don't double-scavenge because the scavenger checks whether another server already did the work.

## Things people ask

*The DNS server is on a domain controller — do I have to harden it separately from the DC?* Yes. The DNS role's configuration is distinct from the DC's configuration. The DNS service has its own listener bindings, recursion settings, and policies. Default DC installation gives you the DNS role with default DNS settings, not hardened DNS settings.

*Will disabling recursion break AD?* No. AD-integrated authoritative responses don't go through the recursion code path. The DC will still answer queries for the zones it's authoritative for. Recursion only kicks in for queries for names the server doesn't have a zone for — typically internet names. If your clients use a different resolver for internet lookups (which is normal in many enterprises), disabling recursion on the DC's DNS service is operationally invisible.

*What's a typical cache size in practice?* On a typical enterprise resolver, the cache hovers in the tens to hundreds of megabytes depending on query mix. Hitting GB-scale cache is rare and usually indicates extremely diverse query patterns or a leak somewhere upstream. Default unbounded behaviour is fine in nearly every scenario.

*Should I enable DNSSEC?* Conditionally. DNSSEC for zones you're authoritative for adds operational complexity (key management, NSEC/NSEC3 records, parent-zone DS records) that's only justified if you publish names to the internet that benefit from cryptographic authentication of the zone data. For purely internal AD zones, DNSSEC is rarely worth the operational overhead.

*How do I know pollution protection is doing anything?* The protection is silent — there's no Event Log entry that says "rejected a polluted response." The way to know it's enabled is via PowerShell. The way to know it's *needed* is to read the historical record of DNS cache poisoning attacks, all of which would have been mitigated by the protection.

*The audit shows my DCs have different ListeningCount values — what does that mean?* The DCs have different numbers of network interfaces, or some have explicit listener pins and others don't. Investigate per-DC: pinned listeners are intentional, unpinned listeners listening on everything are the finding. Standardise.

## Where to read further

- [DNS Server role overview — Microsoft Learn](https://learn.microsoft.com/windows-server/networking/dns/dns-overview)
- [DNS Server Policies — Microsoft Learn](https://learn.microsoft.com/windows-server/networking/dns/deploy/scenario-using-dns-policy-for-split-brain)
- [`Set-DnsServerRecursion` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsserverrecursion)
- [`Set-DnsServerCache` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsservercache)
- [`Set-DnsServerScavenging` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsserverscavenging)
- [DNS Global Query Block List — Microsoft Learn](https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/cc794902(v=ws.10))
- [Response Rate Limiting — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsserverresponseratelimiting)
