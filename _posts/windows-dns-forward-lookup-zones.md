---
title: "Forward Lookup Zones in Windows DNS: How AD-Integrated Zones Actually Work"
excerpt: "The forward lookup zone is where name-to-address resolution happens for everything an Active Directory client cares about — DCs, SRV records, member servers, services. Get the zone type, replication scope, and dynamic update settings right at creation time and the rest of the directory's life is easier. Get them wrong and you'll find out three years later during an upgrade."
coverImage: "/assets/blog/windows-dns-forward-lookup-zones/diagram.svg"
date: "2026-06-19T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/windows-dns-forward-lookup-zones/diagram.svg"
---

A domain controller boots, the DNS service comes up, the zone for the AD forest loads, and within seconds clients on the network are resolving hostnames against it. That's the happy path. Most forward lookup zone problems trace back to one of three decisions made at zone creation time that the admin didn't think about: the zone type (primary, secondary, stub, AD-integrated), the replication scope, and the dynamic update mode. Each of those decisions has a default the wizard offers, and the defaults aren't always what you want for a production AD environment.

This piece walks through what a forward lookup zone actually does, why AD-integrated is almost always the right zone type for an AD-DS environment, how replication scope decides who sees what, why secure dynamic updates matter, and the small set of PowerShell commands that let you skip the GUI entirely. References throughout point at the Microsoft Learn documentation for the DNS Server role.

## What a forward lookup zone is

A forward lookup zone holds the records that map names to addresses (and to other things like mail exchanger names, service locations, and aliases). When a client asks "what's the address of `dc01.contoso.com`," the DNS server looks for a zone authoritative for `contoso.com`, finds the matching A record, returns the address. The zone is the unit of authority. One server can host many zones, each independently configured.

In an AD-DS environment, the forward lookup zone for the AD domain is more than a name-to-address store. It also holds the SRV records that AD clients use to locate domain controllers, Kerberos KDCs, global catalog servers, and LDAP endpoints. Lose the zone and the entire forest stops working from the client's perspective. Get the zone subtly wrong (replication scope too narrow, dynamic updates open) and you get failures that are hard to diagnose because the records *look* right but aren't where they need to be.

## Zone types — primary, secondary, stub, AD-integrated

Four zone types, and 99% of the time AD-integrated is correct. The other three exist for specific scenarios that are increasingly rare.

**Primary** holds the master read-write copy of the zone in a flat file on disk (`%windir%\System32\DNS\<zonename>.dns`). Changes happen on the primary, and the primary is responsible for replicating to secondaries. Useful when you're standing up DNS for a non-AD environment, or when you need a single point of authority for some reason.

**Secondary** holds a read-only copy of a zone hosted elsewhere. The secondary pulls zone data via zone transfer (AXFR or IXFR) from a primary or another secondary on a schedule. Common in mixed environments where the authoritative DNS lives on BIND or another non-Windows server and you want a local read replica.

**Stub** holds just the NS and glue records for a zone that's authoritative elsewhere. The stub server doesn't answer queries for the zone authoritatively; it just knows where to find the real authoritative servers and can refer queries efficiently without recursion.

**AD-integrated** stores the zone in Active Directory itself, not in a flat file. Every DC running DNS that's in the zone's replication scope holds a writable copy. Changes happen on any DC and replicate via AD replication to the others. This is the default and correct choice for any zone that lives in an AD environment because it gives you multi-master writes, AD ACLs on records, secure dynamic updates, and the same replication topology you already use for everything else AD.

If you find yourself creating a primary zone on a domain controller in 2026, stop and ask why it isn't AD-integrated. The answer is occasionally legitimate (e.g., the zone needs to be readable by a non-AD server) but most often the answer is "I clicked through the wizard too fast."

## Replication scope is the trap

When you create an AD-integrated zone, the wizard asks where to replicate it. Three options that look similar and aren't:

| Option | Where it lives | Who sees it |
|---|---|---|
| All DNS servers in the forest | The `ForestDnsZones` application partition | Every DC in every domain in the forest that runs the DNS role |
| All DNS servers in the domain | The `DomainDnsZones` application partition | Every DC in the same domain that runs the DNS role |
| All DCs in the domain (legacy) | The domain partition itself | Every DC in the domain whether or not they run DNS |
| Custom directory partition | A named application partition you create | Whichever DCs you've enlisted in that partition |

The default the wizard offers depends on the zone. For the domain's primary AD zone, it's typically "All DNS servers in the domain." For a parent forest zone (like `_msdcs.contoso.com` in some configurations), it's "All DNS servers in the forest."

The trap: if you create an AD-integrated zone for a child domain and leave the replication scope at "All DNS servers in the domain," the parent domain's DCs and any forest-level DNS resolvers won't see the child zone directly. They'll work because of the trust topology, but if you ever need DCs from another domain to resolve names in this zone without forwarding, you've got a gap you didn't expect. Decide replication scope deliberately at creation time.

```powershell
# Create a new AD-integrated forward lookup zone with forest-wide replication
Add-DnsServerPrimaryZone -Name "contoso.com" `
    -ReplicationScope "Forest" `
    -DynamicUpdate "Secure"
```

Replication scope can be changed after the fact, but only one direction tends to be safe in production: widening it. Narrowing (forest → domain) sometimes loses records that were created on DCs that fall outside the new scope, and the lost records have to be recreated.

## Dynamic updates — secure or nothing

A zone's dynamic update setting decides whether clients (and DHCP servers acting on behalf of clients) can register their own records. Three values:

**None.** No dynamic updates accepted. All records have to be created and maintained manually. Sensible for static-only zones (e.g., a zone for infrastructure names that should never change unexpectedly). Painful for any zone that holds end-user device records.

**Nonsecure and secure.** The zone accepts updates from any client, no authentication required. *Never* configure this in a production AD environment. Anyone on the network can spoof a record for any name and the DNS server will accept it. It exists for backward compatibility and should be treated as a misconfiguration if you see it.

**Secure only.** The zone accepts updates only from authenticated clients that own the record being updated. The authentication uses Kerberos via GSS-TSIG. A user can update their own machine's A record but can't update someone else's. This is the only safe choice for any AD-integrated zone holding end-user records.

```powershell
# Lock an existing zone down to secure-only updates
Set-DnsServerPrimaryZone -Name "contoso.com" -DynamicUpdate "Secure"
```

The zone for the AD forest root should be Secure only from day one. Audit existing zones with:

```powershell
Get-DnsServerZone | Where-Object { $_.IsAutoCreated -eq $false } |
    Select-Object ZoneName, ZoneType, DynamicUpdate, ReplicationScope
```

Anything reporting `NonsecureAndSecure` needs to be fixed before someone notices.

## Record types that matter in an AD zone

Most of the records in an AD-integrated zone get created automatically by the DCs as they register their services. You don't usually touch them directly, but knowing they exist matters when you're debugging:

- **A / AAAA**: address records for DCs, member servers, workstations.
- **CNAME**: aliases. Often used for service-name redirection (e.g., `intranet → web01.contoso.com`).
- **MX**: mail exchanger. Less relevant on an internal AD zone unless you run on-prem mail.
- **SRV**: the workhorse of AD. SRV records under `_ldap._tcp`, `_kerberos._tcp`, `_gc._tcp` and similar are how clients locate domain services. The `_msdcs.<forestRoot>` zone holds the forest-wide SRV records used for cross-domain discovery.
- **TXT**: free-form text. Used for SPF, DKIM, DMARC on external zones, and occasionally for arbitrary discovery hints internally.

If the SRV records under `_ldap._tcp.dc._msdcs.<forest>` go missing or stale, AD clients can't find DCs and authentication breaks. The records re-register automatically on DC startup (via the `Netlogon` service) but if the zone isn't writable from that DC at startup time, the registration fails silently. Watch the DC's Event Log for `Netlogon` event 5774 if you suspect this.

## Aging and scavenging — useful but slow to enable safely

Stale records accumulate. A workstation gets retired, its A record sticks around. Multiply by a few hundred end-of-life devices a year and the zone fills up with names that don't resolve to anything useful.

Aging and scavenging is the cleanup mechanism. When enabled on a zone, every dynamically-updated record gets a timestamp. The DNS server periodically (default every 7 days) scavenges records whose timestamp is older than `RefreshInterval + NoRefreshInterval` (default 7 days + 7 days = 14 days).

It's safe to enable on most production zones, but turn it on cautiously:

1. Enable aging on the zone itself first, watch for two refresh intervals, confirm nothing legitimate is getting timestamps that wouldn't get refreshed.
2. Enable aging on the DNS server (server-wide setting) so the scavenger actually runs.
3. Set conservative intervals on first rollout (14 / 14 instead of 7 / 7).

```powershell
# Enable aging on a zone (without scavenging yet)
Set-DnsServerZoneAging -Name "contoso.com" -Aging $true `
    -RefreshInterval 14:00:00 -NoRefreshInterval 14:00:00

# Enable server-wide scavenging (after you're confident about the zone settings)
Set-DnsServerScavenging -ScavengingState $true -ScavengingInterval 7.00:00:00
```

> [!WARNING]
> Don't enable aging on the `_msdcs` zone or on zones that contain mostly static infrastructure records. Aging on those zones can scavenge a record that should be permanent simply because the registering process hasn't touched it recently. Aging belongs on zones full of end-user device records, not on infrastructure zones.

## Zone delegation versus sub-zones

If you have `contoso.com` and you want `eng.contoso.com` to be a separate zone (e.g., managed by a different team, or hosted on different DNS servers), you have two options. Delegate the subdomain by creating an NS record in the parent for `eng` that points at the authoritative servers for the child zone. Or create a sub-zone in the parent zone's records directly, in which case the parent server is authoritative for both.

Delegation is the cleaner architecture when the subdomain genuinely belongs to a different team or infrastructure. Sub-zones are fine for small, single-team setups where the operational overhead of separate authority isn't worth it.

## Things people ask

*Can I host the AD zone on a non-Microsoft DNS server?* Yes. BIND has long supported the SRV record model AD requires, and AD will register its records via dynamic update if the BIND zone is configured to accept them. The trade-off is that you lose secure dynamic updates (BIND doesn't support GSS-TSIG natively) and AD-integrated replication (the zone is a flat file on the BIND server, not in AD). Most teams that try this come back to Windows DNS within a few years.

*What happens to records when I demote a DC?* The DC's own A, PTR, and SRV records get removed during demotion. The zone itself persists on the remaining DCs if the zone's replication scope still has other holders.

*Why does my zone show records I didn't create?* Almost certainly client dynamic updates registering A records as workstations boot and join the network. That's the design. If you don't want this, set the zone's dynamic update to None and provision records manually. Most environments accept the trade and rely on aging/scavenging to clean up over time.

*How big can a single zone get?* AD-integrated zones replicate over standard AD replication, so the practical limit is the size your DC replication topology can handle. Tens of thousands of records is normal. Millions is exotic and warrants splitting into multiple zones via delegation.

*The `_msdcs` zone is in a weird place in DNS Manager — what is it?* `_msdcs.<forest-root>` is a forest-wide AD-integrated zone that holds the SRV records used for cross-domain DC discovery. In single-domain forests it's nested under the main zone; in multi-domain forests it's a separate top-level zone replicated to every DC in the forest. Don't delete it, don't move it, don't change its replication scope.

## Where to read further

- [Add a forward lookup zone — Microsoft Learn](https://learn.microsoft.com/windows-server/networking/dns/quickstart-install-configure-dns-server)
- [Active Directory–integrated zones — Microsoft Learn](https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc726034(v=ws.11))
- [`Add-DnsServerPrimaryZone` reference — Microsoft Learn](https://learn.microsoft.com/powershell/module/dnsserver/add-dnsserverprimaryzone)
- [Aging and scavenging — Microsoft Learn](https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2003/cc757041(v=ws.10))
- [DNS dynamic updates — Microsoft Learn](https://learn.microsoft.com/windows-server/identity/ad-ds/manage/component-updates/ad-ds-component-updates)
