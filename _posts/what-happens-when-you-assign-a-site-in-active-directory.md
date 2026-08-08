---
title: "What Happens When You Assign a Site in Active Directory? A Step-by-Step Walkthrough"
excerpt: "You've opened Active Directory Sites and Services. You've added a subnet. You've clicked 'Assign to Site.' Now what — does anything actually change? Yes, and here's exactly what. Grab a coffee. We're going to walk through the moment you assign a site, what AD does under the hood, when clients notice, and what breaks when it doesn't take effect."
coverImage: "/assets/blog/assign-site-in-ad/diagram.svg"
date: "2026-07-06T10:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/assign-site-in-ad/diagram.svg"
---

Grab a coffee. This one's a follow-up to [What are Active Directory Sites?](/posts/what-are-active-directory-sites-beginners-guide) — if you haven't read that yet and terms like "site link" or "subnet" feel unfamiliar, start there and come back.

The scenario we're diving into: you've opened **Active Directory Sites and Services**, you've right-clicked on a subnet, and you've assigned it to a site. What actually happens? Because most of what changes is invisible unless you know where to look.

Let's go.

## The moment you click "assign"

You've done the click. Here's what happens in the following seconds and hours.

### Second 0: Change written to the AD database

The site assignment is stored in the **Configuration partition** of Active Directory. Every DC in the forest has a copy of this partition. The change is written first to whichever DC you're currently connected to in Sites and Services.

Objects that get updated:
- The **subnet object** itself, with a new `siteObject` attribute pointing to the site you assigned.
- The **site object** gets a reference back to the subnet in its `siteObjectBL` (back-link) attribute.

### Seconds 1–15: Local replication

The change replicates to other DCs in your **local site** within about 15 seconds (that's the intra-site replication default).

### Minutes 15–180: Cross-site replication

The change replicates across site links to DCs in **other sites**. Default schedule is every 180 minutes (3 hours) for inter-site replication, but it can be configured shorter.

Until every DC has the new subnet definition, you have inconsistent behavior — clients that talk to a DC that already got the change will act on the new site assignment; clients talking to a DC that hasn't received it yet will still use the old assignment.

### Hours 1–24: Clients pick up the change

**This is where the real "when does it take effect for users" question gets answered.** Clients don't ask AD about site membership on every login — they cache it. Two things happen:

1. **Existing sessions keep using the old site.** They already have a cached DC binding. They'll continue using it until the cache expires or the machine reboots.
2. **New sessions pick up the new site.** When a fresh login happens, or when a client explicitly refreshes its DC binding (via `nltest /dsgetdc:contoso.com /force`), it discovers the new site.

The DC locator cache on Windows lasts roughly one hour by default, so most clients pick up site changes within that time.

## What actually changes for clients

Once a client has re-run DC locator and gotten the new site assignment, three things change for that client:

**1. DC locator uses the new site.** Every future "where's my DC?" query returns DCs in the newly-assigned site. The client no longer talks to a DC across the WAN — it talks to a local DC.

**2. Group Policy sourcing changes.** GPOs are downloaded from the client's site's DCs. New site = new source for GPOs. Behavior of GPOs shouldn't change (same GPOs apply), but the source servers do.

**3. DFS namespace lookups become site-aware.** If your organization uses DFS with site-cost-aware referrals, clients will now prefer file server targets in their new site.

Nothing else changes at the client level — a site assignment is purely about "which DC and which local services do I use." The user experience should be **faster** (local instead of WAN), but functionally identical.

## The DC locator process in more detail

The actual mechanic that turns a site assignment into "the client uses a local DC" is called **DC locator**. Let me walk through it.

1. **Client boots up (or DC locator cache expires).** Client needs a DC.
2. **Client does a DNS query.** Asks DNS: "give me the SRV records for `_ldap._tcp.dc._msdcs.contoso.com`." This returns a list of all DCs in the domain.
3. **Client picks any DC to start.** It picks one from the list, connects to it, and asks a specific question: "here's my IP address (say, `10.6.42.15`). What site am I in?"
4. **DC does a subnet-to-site lookup.** The DC checks its site database. It finds subnet `10.6.0.0/16` is assigned to the **London** site.
5. **DC responds.** "You're in London. Here are the DCs in London — you should use one of them."
6. **Client switches to a London DC.** The client discards the initial random DC and connects to a London DC instead. It caches this binding.
7. **All future requests go to London DC.** Until the cache expires (usually an hour) or someone manually forces a re-lookup, the client uses the London DC.

**This entire process happens automatically.** The site assignment you made is what enables step 4 to return the right answer.

## Before vs after example

Say you have a laptop with IP `10.6.42.15` in London. The laptop was using a DC in Toronto because London's subnet was never registered.

**Before you assign `10.6.0.0/16` to the London site:**
- DC locator returns: any DC in the domain (random)
- Laptop connects to: possibly `TorontoDC01`
- Login speed: slow (WAN round-trips)
- Group Policy source: `TorontoDC01`
- Every operation involves the Toronto office

**After you assign `10.6.0.0/16` to the London site (and the cache expires or is flushed):**
- DC locator returns: the London site DCs first
- Laptop connects to: `LondonDC01`
- Login speed: fast (LAN speed)
- Group Policy source: `LondonDC01`
- Only WAN traffic is background replication, which is optimized

**The user notices logins are faster.** Everything else is the same. That's the payoff.

## What breaks when it doesn't take effect

Three things prevent your site assignment from working the way you'd expect.

### 1. Replication hasn't reached all DCs yet

You made the change on `DC01`. If a client talks to `DC02` that hasn't received the update yet, `DC02` doesn't know about the new subnet-to-site mapping and returns "you're in the default site" or gives back a DC in the wrong site.

**Check:** run `repadmin /showrepl` on all DCs to confirm replication is healthy. Force a sync with `repadmin /syncall /Ad` if needed.

### 2. Client DC locator cache hasn't expired

The client is still using its old DC binding. Even though the site assignment is correct in AD, the client hasn't re-asked.

**Fix:** on the affected client, run:
```powershell
nltest /dsgetdc:contoso.com /force
```
This forces a fresh DC locator lookup. The client should now find the correct site.

### 3. Client's IP isn't in any assigned subnet

If the client has an IP that's not covered by any subnet in Sites and Services, AD can't decide which site they belong to. The client falls back to "any DC in the domain," which is exactly what you were trying to avoid.

**Check:** open the DC's Netlogon log at `C:\Windows\debug\netlogon.log`. Look for warnings like `NO_CLIENT_SITE`. If you see them, the subnet the client is coming from isn't registered.

**Fix:** add the missing subnet(s) to the appropriate site in Sites and Services.

## Verifying it worked

Three ways to confirm your site assignment is working:

**1. Check the client's current site (on the client).**
```powershell
nltest /dsgetsite
```
Should return the site name you assigned. If it returns the wrong site, either the cache hasn't expired (see fix above) or something is misconfigured.

**2. Check which DC the client is using.**
```powershell
nltest /dsgetdc:contoso.com
```
The DC returned should be in the correct site.

**3. Check the Netlogon log on a DC** for any `NO_CLIENT_SITE` warnings for the IPs you expect to be covered. Zero warnings = clean subnet definitions.

## The FAQ

**How quickly does the change replicate across the forest?**
Intra-site: 15 seconds. Cross-site: 3 hours (default). You can lower the inter-site interval if you need faster convergence, but 3 hours is usually fine.

**Do I need to restart anything after assigning a site?**
No. DCs pick up the change through replication. Clients pick it up when their DC locator cache expires (usually within an hour) or when forced via `nltest`.

**Can I assign the same subnet to two sites?**
No. Each subnet belongs to exactly one site. AD will reject the second assignment.

**What if my subnet is huge and spans multiple physical locations?**
Split the subnet at the routing layer so each location has its own subnet, then assign each to the appropriate site. Sites are about network topology, so the subnet definitions need to reflect that topology.

**Does site assignment affect Entra ID at all?**
No. Site assignment is purely for on-prem AD DC locator logic. Entra ID handles geographic routing on its own via Microsoft's global network.

**I have a VPN user with an unusual IP. Should I add their VPN subnet to a site?**
Yes. Add the VPN pool's subnet range to the site where the VPN concentrator lives. VPN users will authenticate against that site's DCs, which is usually what you want.

## Where to go next

- **[What are Active Directory Sites?](/posts/what-are-active-directory-sites-beginners-guide)** — the foundational post if you haven't read it yet.
- **[Home lab guide](/posts/minimum-viable-windows-server-home-lab-for-active-directory)** — build a two-site lab and watch this work with your own eyes.
- **[Windows DNS server configuration](/posts/windows-dns-server-configuration)** — because DC locator is entirely DNS-driven, DNS misconfigs will look like site problems.

Now go grab a coffee. Site assignment is the sort of thing you set once and forget about for years. Set it right the first time.
