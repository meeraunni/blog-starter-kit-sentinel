---
title: "DNS Forwarders, Conditional Forwarders, and Stub Zones in Windows DNS: The Right Tool for the Right Resolution Path"
excerpt: "Three different mechanisms that all sound like they do the same thing. Forwarders are the catch-all for anything the server isn't authoritative for. Conditional forwarders route specific domains to specific upstream resolvers. Stub zones cache the authoritative nameserver list for another zone. Pick the wrong one and resolution silently fails or routes through the wrong path. Here's the decision tree."
coverImage: "/assets/blog/windows-dns-forwarders-conditional-stub/diagram.svg"
date: "2026-06-19T17:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/windows-dns-forwarders-conditional-stub/diagram.svg"
---

A new partner organisation gets added to a forest trust and suddenly nobody on the corporate network can resolve names in the partner's domain. The trust itself is fine, Kerberos works, the firewall lets the traffic through, but DNS resolution keeps returning `NXDOMAIN` for anything in `partner.local`. The reason is almost always that nobody configured the right kind of forwarder for the partner zone. There are three options, they look superficially alike, and picking the wrong one produces exactly this symptom.

Windows DNS has three mechanisms for routing queries to another DNS server: standard forwarders, conditional forwarders, and stub zones. Each solves a different problem and each is the wrong answer when applied to the other's problem. The decision tree is small and worth internalising once because it determines whether your resolver finds names quickly, slowly, or not at all.

This piece walks through what each mechanism actually does, the order Windows DNS consults them, when each is the right answer, and the PowerShell to configure them properly. The Microsoft reference set is [Configure forwarders](https://learn.microsoft.com/windows-server/networking/dns/manage-dns-server-conditional-forwarders), [Conditional forwarders](https://learn.microsoft.com/windows-server/networking/dns/manage-dns-server-conditional-forwarders), and the [`Add-DnsServerStubZone`](https://learn.microsoft.com/powershell/module/dnsserver/add-dnsserverstubzone) reference.

## The resolution order, written out

When a Windows DNS Server receives a query, it walks a specific sequence to find an answer. Understanding this order is the prerequisite for picking the right forwarder type.

1. **Local cache.** If the answer (positive or negative) is still cached and within TTL, return it. No upstream call.
2. **Authoritative zones.** If a primary, secondary, AD-integrated, or stub zone matches the query, answer from that zone.
3. **Conditional forwarders.** If a conditional forwarder is configured for the query's domain (or a parent of it), forward to the specified upstream server.
4. **Standard forwarders.** If standard forwarders are configured and conditional forwarders didn't apply, forward to one of them.
5. **Root hints / recursion.** If recursion is enabled and no forwarder produced an answer (and the forwarder's "Use root hints if no forwarders are available" option is set), walk the root chain.
6. **SERVFAIL.** If none of the above produces an answer, return SERVFAIL.

The crucial implication: conditional forwarders are consulted *before* standard forwarders. A conditional forwarder for `partner.local` overrides what a standard forwarder for everything else would do. This is what makes the decision-tree approach to forwarder configuration clean — specific routes win over general routes.

The other crucial implication: stub zones are checked at step 2 (authoritative zones), not at step 3 (forwarders). A stub zone for `partner.local` is consulted *before* any conditional forwarder for the same domain.

## Standard forwarders — the catch-all for everything else

A standard forwarder is an upstream DNS server that this server consults for any query it can't answer from its own zones (and that no more-specific conditional forwarder handled). The classic use case is an internal DNS resolver that forwards all internet-bound queries to an upstream resolver — your ISP's DNS, your security vendor's DNS-filtering service, Cloudflare (`1.1.1.1`), Google Public DNS (`8.8.8.8`).

```powershell
# Configure two standard forwarders, with a 3-second timeout each
Set-DnsServerForwarder -IPAddress "1.1.1.1", "8.8.8.8" -Timeout 3
```

The forwarders are tried in the order specified. If the first one fails or times out, the server moves to the second. If all standard forwarders fail and the "Use root hints if no forwarders are available" option is on (the default), the server falls back to root-hints recursion. Turn that fallback off if you don't want any leakage to the public root chain:

```powershell
Set-DnsServerForwarder -UseRootHint $false
```

Use standard forwarders when:

- You want a single upstream resolver to handle anything the server isn't directly authoritative for.
- You're consolidating internet resolution onto a security-filtered upstream (DNS over HTTPS, a corporate DNS proxy, a Defender-style filtered resolver).
- You want a simple "default route" for DNS that the server's authoritative zones and conditional forwarders override case-by-case.

Don't use standard forwarders for inter-zone routing within a forest or to a partner domain. Conditional forwarders or stub zones are the right tool for that.

## Conditional forwarders — per-domain routing

A conditional forwarder is exactly like a standard forwarder except scoped to a specific domain name. A conditional forwarder for `partner.local` says "any query whose name ends in `partner.local` (or matches `partner.local` exactly) goes to these specific upstream servers."

```powershell
# Conditional forwarder for partner.local pointing at the partner's DNS
Add-DnsServerConditionalForwarderZone `
    -Name "partner.local" `
    -MasterServers "10.20.0.10", "10.20.0.11" `
    -ReplicationScope "Forest"
```

The `-ReplicationScope` parameter (when the conditional forwarder is stored in AD rather than per-server) means every DC running DNS in the forest gets the same conditional forwarder configuration. Without it, you'd configure the conditional forwarder server-by-server, which is operational drudgery and inevitably drifts.

Use conditional forwarders when:

- A specific external domain (partner, vendor, parent company in a trust scenario) needs to be resolved through specific upstream DNS servers.
- You're operating split-brain DNS where an internal name needs to resolve internally but the public version of the same name needs to resolve externally — the conditional forwarder routes the public side to a public resolver.
- A forest trust requires DNS resolution to flow between forests without making either forest's DNS authoritative for the other.

Conditional forwarders are the workhorse for inter-organisation DNS routing. Most enterprises end up with a handful of them — one per partner, one per acquired company, one per cloud-hosted service that needs custom resolution.

## Stub zones — the authoritative-aware alternative

A stub zone is the lightest possible representation of an external zone. The local server holds only the NS (nameserver) records and the corresponding glue A/AAAA records for the zone. When a client queries the local server for a name in the stubbed zone, the server uses the stub data to figure out which authoritative servers hold the real answer and queries them directly.

```powershell
Add-DnsServerStubZone `
    -Name "partner.local" `
    -MasterServers "10.20.0.10", "10.20.0.11" `
    -ReplicationScope "Forest"
```

That syntactically looks identical to a conditional forwarder, and the behaviour is similar, with two differences that matter.

**Stub zones discover authoritative servers automatically.** The stub server periodically pulls the NS record list from the master servers (the IPs you initially configured). If the partner reorganises their DNS and the authoritative servers for `partner.local` move to new IPs, the stub zone learns the new IPs at the next refresh. A conditional forwarder, by contrast, has its server list hard-coded — change happens at the partner, you have to manually update the conditional forwarder.

**Stub zones produce iterative queries to the authoritative servers.** When the stub server queries the upstream authoritative server, it does so iteratively (asking for a specific answer), rather than recursively (asking the upstream to do the work). The upstream just returns the answer it's authoritative for. A conditional forwarder, in contrast, asks the configured server to recursively resolve, which the upstream might or might not be willing to do.

Use stub zones when:

- The upstream zone's authoritative server list changes occasionally and you don't want to manually track those changes.
- The upstream server isn't willing to do recursion for your queries (often the case for production DNS servers that disable recursion for external clients).
- You want the cleaner separation of "I know who's authoritative for that zone; let them answer" rather than "I'm forwarding to a generic resolver."

Use conditional forwarders when:

- The upstream resolver is willing to recurse on your behalf.
- The upstream isn't authoritative for the zone but is a resolver that knows how to find the answer (e.g., the partner publishes a corporate DNS resolver IP rather than authoritative IPs).

In a forest-trust scenario where the partner has standard AD-integrated DNS, either model works. Stub zones tend to be the cleaner long-term choice because they survive partner reorganisations transparently. Conditional forwarders are simpler to explain and a marginally lower operational footprint.

## The decision tree

A practical sequence for picking the right tool when a new external domain needs to be reachable:

1. **Do you operate that domain's authoritative DNS yourself?** If yes, the domain is just another zone on your DNS servers. Use AD-integrated primary, not any of the forwarding mechanisms.
2. **Does the external domain have authoritative DNS that you can reach directly?** If yes, use a stub zone. The stub auto-discovers their NS records and queries them iteratively.
3. **Is the external resolution served by a corporate DNS resolver (not an authoritative server) that's willing to recurse for you?** If yes, use a conditional forwarder pointing at that resolver.
4. **None of the above, but you have an upstream "default" DNS that should answer everything else.** Use a standard forwarder. This is the only mechanism that makes sense for "anything I don't specifically know about."

Most enterprise resolvers end up with the layered configuration: AD-integrated zones for internal domains, a handful of stub zones or conditional forwarders for partner / acquired / cloud-hosted domains, and one or two standard forwarders as the default route for internet resolution.

## Audit and operational hygiene

What's actually configured on a given DNS server:

```powershell
# Standard forwarders
Get-DnsServerForwarder

# Conditional forwarders (these show as zones with type "Forwarder")
Get-DnsServerZone | Where-Object ZoneType -eq "Forwarder"

# Stub zones (these show as zones with type "Stub")
Get-DnsServerZone | Where-Object ZoneType -eq "Stub"
```

Run that across every DC and reconcile. A forest where some DCs have a conditional forwarder for `partner.local` and others don't is a forest where partner resolution works for some users and not others, depending on which DC happens to answer their query. The fix is to make all conditional forwarders AD-integrated (`-ReplicationScope Forest` at creation time) so the configuration replicates.

Test resolution from a specific DNS server for a name in a forwarded domain:

```powershell
Resolve-DnsName -Name "dc01.partner.local" -Server "your-dns-server" -DnsOnly
```

`-DnsOnly` makes the cmdlet skip any local cache and go straight to the named server for resolution. Useful for verifying a fresh configuration without restarting any services.

## Common misconfigurations

**Conditional forwarder pointing at a server that doesn't recurse.** The upstream returns a referral instead of the answer; the local server doesn't follow the referral and just returns whatever the upstream sent. End result: client gets a useless response. Fix: use a stub zone instead, which expects iterative behaviour from the upstream.

**Standard forwarder for the partner domain.** All traffic forwards through the standard forwarder, which has no idea about `partner.local`. Resolution fails. Fix: use a conditional forwarder or stub zone scoped to the partner domain.

**Conditional forwarder for a zone you're authoritative for.** Confuses the resolution order — the server tries to forward queries for its own zone to an upstream that may or may not have the data. Fix: delete the conditional forwarder. Authoritative zones take precedence anyway, so this is usually a leftover from a misconfigured setup.

**Stub zone with stale master servers list.** The original IPs you configured no longer respond, the stub can't refresh its NS list, and resolution fails. Fix: update the master server IPs (or, if the partner's NS records are stable, the stub's auto-refresh handles it as long as at least one of the originally-configured masters responds).

**Forwarder timeout too short.** Default is 3 seconds. On a slow path (cross-WAN to a distant partner), 3 seconds isn't enough and queries fail intermittently. Bump to 5–10 seconds for known-slow paths.

## Things people ask

*Is there a performance difference between a conditional forwarder and a stub zone for the same domain?* In normal operation, no meaningful difference. The stub adds a small amount of metadata maintenance (refresh of NS records) but query latency is comparable.

*Can I have both a conditional forwarder and a stub zone for the same domain?* No. Each domain name can have one zone (which a stub zone is) on a server. Adding a conditional forwarder for a domain that already has a stub zone produces an error.

*Do conditional forwarders work across forest trusts automatically?* No. The trust enables AD authentication; DNS is a separate service. You explicitly configure conditional forwarders (or stub zones) for the trusted forest's domains on your DNS servers.

*If a forwarder fails, will the server keep trying it?* Yes — Windows DNS retries failed forwarders. If you have multiple forwarders configured and the first one is consistently slow or unresponsive, the server tracks that and may deprioritise it temporarily, but the configured order is the strong preference.

*What's the difference between a "forwarder" in the General tab versus the Forwarders tab in DNS Manager?* The Forwarders tab manages server-level standard forwarders. The "Forwarder" zone type (visible as a zone in the zone list) is a conditional forwarder. Two different concepts, slightly confusing GUI naming.

## Where to read further

- [Configure forwarders — Microsoft Learn](https://learn.microsoft.com/windows-server/networking/dns/manage-dns-server-conditional-forwarders)
- [`Set-DnsServerForwarder` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/set-dnsserverforwarder)
- [`Add-DnsServerConditionalForwarderZone` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/add-dnsserverconditionalforwarderzone)
- [`Add-DnsServerStubZone` — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/add-dnsserverstubzone)
- [DNS resolution order in Windows — Microsoft Learn](https://learn.microsoft.com/troubleshoot/windows-server/networking/dns-resolution-process)
