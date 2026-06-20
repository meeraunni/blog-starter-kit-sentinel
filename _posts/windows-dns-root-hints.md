---
title: "Root Hints in Windows DNS: What They Are, When They Matter, When They're a Liability"
excerpt: "Root hints are the recursion starting point baked into every DNS server, the bootstrap list of root nameservers your resolver consults when it has nothing else to go on. Useful, until your environment is one where direct outbound DNS to root servers is exactly what shouldn't happen. Here's the model, the cases where root hints help, and the cases where you should empty the file."
coverImage: "/assets/blog/windows-dns-root-hints/diagram.svg"
date: "2026-06-19T15:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/windows-dns-root-hints/diagram.svg"
---

Open DNS Manager on any Windows DNS Server, expand the server node, and one of the tabs in the server properties dialog is "Root Hints." The list shows thirteen entries named `a.root-servers.net` through `m.root-servers.net`, each with an IPv4 and IPv6 address. These are the official root nameservers of the DNS hierarchy, the same set every recursive resolver on the public internet uses to bootstrap name resolution. Windows DNS ships preloaded with this list and most admins never touch it.

The "never touch it" approach is mostly fine. It also misses two scenarios where the right answer is to actively clear or override the root hints — split-brain DNS environments and resolvers that are intentionally walled off from direct outbound DNS to the internet. Knowing when to leave root hints alone and when to break out the `Remove-DnsServerRootHint` cmdlet is the difference between a resolver that does what you intend and one that has a quiet failure mode you'll discover only when something else goes wrong.

This piece covers what root hints actually do during recursion, the cases where they help, the cases where they hurt, how to refresh them when the public root server list changes, and the PowerShell that manages them without clicking through the GUI.

## What root hints actually do

When a Windows DNS Server gets a query for a name in a zone it's not authoritative for, and the recursion path is enabled, the server has two ways to find an answer.

**The forwarder path.** If forwarders are configured, the server asks the forwarder to resolve the name on its behalf. The forwarder does the work and returns an answer (or a failure). This is the path most enterprise DNS resolvers use because it offloads the recursion work to upstream resolvers (an ISP's DNS, Cloudflare, Google Public DNS, etc.) that have warm caches and faster resolution.

**The recursion path.** If no forwarder can answer (or no forwarders are configured), the server walks the DNS hierarchy itself starting from the root. This is where root hints come in. The server picks one of the root nameservers from the root-hints list, asks it about the requested name, gets back a referral to the relevant TLD nameserver (`.com`, `.org`, `.ca`, etc.), asks that nameserver, gets a referral to the authoritative nameserver for the domain, asks that nameserver, gets the final answer. Multiple round-trips, slower than a forwarded query, but it works without any upstream dependency.

The order in Windows DNS is: cache first, then zones the server is authoritative for, then conditional forwarders, then standard forwarders. Only if all of those miss does the server fall back to root hints and full recursion. That's why root hints often look unused even on a busy server — most queries get answered before they reach that fallback.

## When root hints help

Three legitimate scenarios.

**The DNS server doesn't use forwarders.** Some teams deliberately point their resolver at root hints rather than forwarders, on the principle that depending on a third-party resolver (ISP DNS, public DNS) introduces a trust and reliability dependency they don't want. Root hints let the resolver work without that dependency. Performance is slower (cold lookups walk the full chain) and operationally it's more work to keep the root hints file fresh, but for a small environment or a high-trust resolver it's a defensible choice.

**Forwarder failure resilience.** Even when forwarders are configured, you usually want root hints available as a fallback so that if the forwarders become unreachable the resolver can still answer queries for internet names. The behaviour is automatic — if the forwarder is configured with the default "Use root hints if no forwarders are available" option, the server falls back gracefully. Removing that option means a forwarder outage produces SERVFAIL responses for all external queries.

**Public-facing DNS infrastructure.** If you operate authoritative DNS for a domain on a public-facing Windows DNS server (rarer than it used to be, but it happens), root hints can be useful for the server's own outbound queries during DNSSEC validation or chained lookups. Not strictly necessary, but consistent with the default.

## When root hints hurt

Two scenarios where leaving the default root hints in place causes real problems.

**Split-brain DNS where you don't want internal recursion to reach the public internet at all.** Some highly-regulated environments require that internal DNS resolvers never make queries to the public root servers. The reason is leakage — if an internal hostname accidentally matches a public TLD pattern (because of a naming collision, a typo, or a renamed corporate zone), a recursive lookup against root hints leaks the query to the public DNS system, which is observable by upstream parties. Clearing the root hints forces the resolver to depend exclusively on the zones it's authoritative for and the forwarders you've explicitly configured. Queries for anything else fail closed rather than escaping to the internet.

**Resolvers in air-gapped or restricted-egress environments.** A DNS server that can't actually reach the root servers on the internet shouldn't have them in its root hints, because if it ever attempts the recursion path (because of a misconfigured forwarder or a transient forwarder outage), it'll waste time timing out against unreachable IPs before giving up. Clearing the root hints in restricted-egress environments produces an immediate `SERVFAIL` instead of a multi-second timeout, which is better operationally because it surfaces the failure quickly.

In both cases, the explicit clear is preferable to leaving the default in place and "hoping nothing happens." Hoping isn't a configuration.

## Inspecting and managing root hints

The full list of current root hints on a server:

```powershell
Get-DnsServerRootHint
```

Each entry shows the nameserver hostname plus its A and AAAA records. The thirteen root nameservers exist in real life as anycast clusters of dozens of servers each; the IPs in the root-hints file are the anycast IPs.

To **clear root hints entirely** (the split-brain or air-gapped scenario):

```powershell
# Remove every root hint, one at a time
Get-DnsServerRootHint | ForEach-Object {
    Remove-DnsServerRootHint -NameServer $_.NameServer.RecordData.NameServer -Force
}
```

After clearing, queries that would have walked the root chain instead get `SERVFAIL` quickly. Verify by doing a deliberate lookup for a name your server isn't authoritative for and doesn't have a forwarder route to:

```powershell
Resolve-DnsName -Name "example.com" -Server "your-dns-server" -DnsOnly
# Should fail immediately if root hints are cleared and no forwarder handles it
```

To **refresh root hints from the live root zone** (if a root nameserver IP changes, which does happen occasionally), the GUI has a "Copy from Server" button that pulls the current list from the configured authoritative server. Via PowerShell, this is awkward and is usually scripted by downloading the official `named.root` file from `https://www.internic.net/domain/named.root` and parsing it into individual `Add-DnsServerRootHint` calls. For most environments this comes up once every few years.

```powershell
# Add a single root hint manually
Add-DnsServerRootHint -NameServer "a.root-servers.net" `
    -IPAddress "198.41.0.4", "2001:503:ba3e::2:30"
```

## How forwarders and root hints interact

The forwarder configuration has a "Use root hints if no forwarders are available" checkbox. Three states matter:

| Forwarders | Root hints | Behaviour for an unanswered query |
|---|---|---|
| Configured, fallback enabled | Present | Try forwarder, fall back to root hints if forwarder fails |
| Configured, fallback disabled | Present | Try forwarder, return SERVFAIL if forwarder fails. Root hints unused even though present |
| Configured, fallback enabled | Cleared | Try forwarder, return SERVFAIL if forwarder fails. Same as fallback disabled |
| None configured | Present | Walk the root hints chain |
| None configured | Cleared | Return SERVFAIL for anything outside authoritative zones and conditional forwarders |

The combination most teams want for tightened security: forwarders configured (pointing at trusted upstream DNS), fallback disabled, root hints cleared. That produces a resolver that only answers from authoritative zones, conditional forwarders, or the explicit forwarder list. Anything else fails. No leakage.

Set the forwarder fallback explicitly:

```powershell
Set-DnsServerForwarder -UseRootHint $false
```

## A note on the root hints file itself

Windows DNS reads its root hints from a file at `%windir%\System32\dns\cache.dns`. The file is a standard DNS zone file in BIND format. You can replace the file's contents directly if you want to bootstrap a new server with a specific root-hints list rather than the Microsoft-shipped default. After replacing the file, restart the DNS Server service for the change to take effect:

```powershell
Restart-Service DNS
```

Some teams maintain their own `cache.dns` template (with custom root-hint entries that point at internal authoritative servers rather than public roots) and deploy it as part of standard server provisioning. That's the high-effort version of the "no internet DNS leakage" pattern and is genuinely useful in environments where you operate internal "root" infrastructure (e.g., a private DNS root for an isolated network).

## Things people ask

*Are the thirteen root servers literal single machines?* No — each "root server" letter (a, b, c, …) is operated by a different organisation and exists as an anycast cluster of dozens to hundreds of physical servers spread across continents. The anycast IPs in the root-hints file route to the nearest instance of each cluster. You don't need to do anything special to get reasonable latency.

*Will clearing root hints break Active Directory?* No. AD-internal name resolution uses the authoritative zones the DCs hold; it doesn't depend on recursion to public DNS. Clearing root hints affects only the resolver's ability to answer queries for names outside its authoritative zones and configured forwarders.

*The root hints file shows IPv6 entries — do I need IPv6 connectivity to use root hints?* No. Each root server has both IPv4 and IPv6 addresses listed. Windows DNS uses whichever transport works; if your server has no IPv6 routing it'll fall back to the IPv4 addresses transparently.

*If I clear root hints, what about reverse lookups for public IPs?* Same model — reverse lookups for public IPs walk a chain that eventually reaches the IANA root for `in-addr.arpa`. Without root hints and without a forwarder that handles reverse zones, queries for public IP reverses return `SERVFAIL`. This rarely matters for internal-only resolvers.

*How do I know whether the root hints file is current?* The list of root server IPs changes very rarely (the last significant change was in 2015 when one root operator updated its anycast IP). When it does change, the new IPs are published at `https://www.internic.net/domain/named.root`. Compare your current `cache.dns` against that file once every couple of years and you'll be fine.

## Where to read further

- [DNS root hints (TechNet legacy) — Microsoft Learn](https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2003/cc758353(v=ws.10))
- [`Get-DnsServerRootHint` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/get-dnsserverroothint)
- [`Add-DnsServerRootHint` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/add-dnsserverroothint)
- [`Set-DnsServerForwarder` (UseRootHint) — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsserverforwarder)
- [Current named.root file — IANA](https://www.internic.net/domain/named.root)
- [Root server operators](https://www.iana.org/domains/root/servers)
