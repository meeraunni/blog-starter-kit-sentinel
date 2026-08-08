---
title: "What is DHCP? A Beginner's Guide to How Devices Get IP Addresses"
excerpt: "You plug a laptop into a network. Within seconds it has an IP address, a subnet mask, a default gateway, and DNS server settings — and you never typed any of them. That magic is DHCP. Grab a coffee. We're going to demystify how devices get on the network without any manual configuration, and why it matters for Windows environments."
coverImage: "/assets/blog/what-is-dhcp/diagram.svg"
date: "2026-07-05T20:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/what-is-dhcp/diagram.svg"
---

Grab a coffee. DHCP is one of those things you probably rely on hundreds of times a day without realizing it — every time your phone connects to Wi-Fi, every time you plug a laptop into an ethernet cable, every time a printer boots up in the office.

Let's find out what it's actually doing.

## The problem DHCP solves

Every device on a network needs four things to actually work:

1. **An IP address** — like `192.168.1.42` — so other devices can talk to it.
2. **A subnet mask** — like `255.255.255.0` — so it knows what "local" means.
3. **A default gateway** — like `192.168.1.1` — so it knows where to send traffic that leaves the local network.
4. **DNS server** — so it can look up names like `google.com`.

Without these, the device is just a paperweight with an ethernet port.

Now, someone could go around and manually configure all of this on every device. And in the early days of networking, that's exactly what people did. In a small office with 10 devices, doable. In a company with 5,000 devices? A nightmare that consumes entire IT teams.

**DHCP is the solution.** A single server hands out the four pieces of network configuration automatically, whenever a device asks for them. Devices show up, get their config, and start working — no human involved.

## The valet analogy

Imagine you drive to a fancy restaurant. A valet stands at the door. You give them your car; they hand you a numbered ticket and drive your car to a specific parking spot. When you leave, you hand back the ticket and get your car back.

**DHCP is like a valet for IP addresses.**

- A device shows up on the network ("I just parked!")
- DHCP server hands out an available IP address from its pool ("Here's spot 42")
- The device uses that IP for a set period of time (called a **lease**)
- When the lease expires, the device either renews (keeps the same IP) or the IP goes back into the pool

Restaurant doesn't need to know your name, car, or plans in advance. It just needs to have parking spots available and a system for handing them out. Same idea.

## Vocabulary you need first

**DHCP server.** The thing that hands out IP addresses. In small home networks, this is usually your router. In enterprise Windows environments, it's a role installed on a Windows Server.

**DHCP client.** Any device asking for an IP address. Your laptop, phone, printer, IoT device — anything that connects to the network.

**Scope.** A range of IP addresses the DHCP server is allowed to hand out. For example, "give out addresses from `10.5.1.100` to `10.5.1.200`." The DHCP server won't give out `10.5.1.50` even if it's not in use — that's outside the scope.

**Lease.** The period of time a device gets to keep its assigned IP. Default is often 8 days on Windows DHCP servers. When the lease is up, the device asks to renew.

**Reservation.** An exception in the scope where a specific device (identified by its MAC address) always gets the same IP. Useful for printers or servers that need a stable IP.

**Option.** Extra configuration data the DHCP server sends along with the IP. The most common:
- **Option 3** — Default gateway
- **Option 6** — DNS servers
- **Option 15** — Domain name (the DNS suffix, like `contoso.local`)
- **Option 66** — TFTP server (used for booting devices like phones over PXE)

## The DORA process

When a device connects to a network and needs an IP, it goes through a four-step conversation with the DHCP server. This is called **DORA**: Discover, Offer, Request, Acknowledge.

Let me walk through it in plain terms.

### 1. Discover — "Anyone home?"

The device just booted up. It has no IP, doesn't know where the DHCP server is, doesn't know anything about the network. So it sends a broadcast message to the whole local network: **"Hey! I'm here! Anybody give out IPs?"**

Broadcast means every device on the local network receives this message. Most ignore it. But the DHCP server (or servers) hear it.

### 2. Offer — "How about this address?"

The DHCP server picks an available IP from its scope and replies: **"How about `192.168.1.42`? Here are the other network settings too. Lease is good for 8 days."**

If there are multiple DHCP servers on the network, the client might get several offers. It picks one (usually the first).

### 3. Request — "Yes, I'll take that one."

The client sends another broadcast saying: **"Thanks. I'll take `192.168.1.42` from the server that offered it."** The broadcast tells other DHCP servers "I picked someone else, feel free to release that offer."

### 4. Acknowledge — "Confirmed."

The chosen DHCP server sends the final confirmation: **"You've got `192.168.1.42`. Here's your lease. Talk again in 4 days when you should renew."**

Device now has an IP. It can talk on the network. Total time for DORA: usually under a second.

## The lease renewal cycle

The lease isn't forever — that's on purpose, so IPs get returned to the pool when devices leave.

Half-way through the lease (day 4 of an 8-day lease), the device automatically tries to renew. It sends a **request** directly to the DHCP server saying "still using this, please extend." If the server agrees, the lease resets.

If the device doesn't renew (say, it's off the network for a week), the lease expires and the IP goes back into the available pool for someone else.

**This is why static IPs and DHCP don't mix well.** If you manually configure a device with `192.168.1.42` but that address is also in the DHCP scope, DHCP might hand out `.42` to another device, causing an IP conflict. Two devices on the same network with the same IP = chaos. Fix: exclude static IPs from the DHCP scope range.

## Static vs DHCP: when to use which

**Use DHCP for:**
- End-user devices (laptops, phones, tablets)
- Anything that moves around the network
- Anything you don't need to reach by IP (users generally reach services by name, not IP)

**Use static IPs (or DHCP reservations) for:**
- Servers — anything providing a service
- Network gear (routers, switches, firewalls)
- Printers (users often reach them by IP)
- Domain Controllers — must have static IPs
- Anything referenced by IP in someone's configuration

**Reservations are the best of both worlds** for servers: DHCP still hands out the address (so it's centrally managed), but the same MAC always gets the same IP. Change the reservation once in the DHCP console, no per-server reconfiguration.

## DHCP in a Windows Server environment

In enterprise Windows environments, DHCP is a Windows Server role. Install it via Server Manager, authorize it in Active Directory (which prevents rogue DHCP servers from stealing traffic), then create scopes for each network segment.

Best practices:
- **Two DHCP servers per environment** — for redundancy. Windows Server supports "DHCP failover" where two servers actively share a scope. One dies, the other picks up seamlessly.
- **Scope size = subnet size minus statics.** If your subnet is `/24` (254 usable addresses), reserve some for static devices, put the rest in the DHCP scope.
- **DNS integration.** Windows Server DHCP can automatically register clients in DNS (called **Dynamic DNS** or DDNS). This is what makes a domain-joined laptop's hostname resolvable — DHCP hands out the IP and updates DNS with the hostname.
- **Reservations for anything important.** Any device that needs to be reachable at a known IP gets a reservation, not a static.

## What breaks in real deployments

**"A new device won't get an IP."** Either the DHCP server is out of addresses (scope exhausted), the client can't reach the DHCP server (network issue, DHCP relay misconfigured across subnets), or the DHCP server is down. `ipconfig` on the client shows an APIPA address (`169.254.x.x`) — that's the client giving up and self-assigning.

**"Two devices have the same IP."** Someone manually set a static IP within the DHCP scope. Move the static outside the scope, or add it as an exclusion.

**"Devices in a remote office aren't getting IPs."** DHCP broadcasts don't cross subnets by default. Remote offices need either a local DHCP server or a **DHCP relay** (a small forwarder on the router) that forwards the DHCP broadcast to your central DHCP server.

**"The DHCP scope is exhausted every afternoon."** Either your lease time is too long for a mobile environment (people connecting and leaving), or your scope is genuinely too small. Shorten the lease to 24 hours for guest Wi-Fi; expand the scope for main office.

**"A device shows up in DNS with the wrong IP."** DHCP handed it a new address but DNS still has the old one. DHCP should be configured to update DNS when leases change. Check the DHCP server's "DNS" tab and make sure "always dynamically update" is enabled.

## Try it in your lab

In your home lab, try this:

1. On DC01, install the DHCP Server role (it's a separate Windows role from AD DS).
2. Create a scope: range `10.10.0.100` to `10.10.0.200`, subnet mask `255.255.255.0`, gateway `10.10.0.1`, DNS `10.10.0.10` (DC01 itself).
3. On CLIENT01, change the network adapter from Static to "Obtain automatically."
4. Restart the adapter or run `ipconfig /renew`. Watch CLIENT01 get `10.10.0.100` (or whatever's next in the pool).
5. Look at DHCP → Address Leases in DHCP Manager. You'll see the lease listed.
6. On the DC, add a reservation for CLIENT01's MAC address to always get `10.10.0.150`. Renew the lease on the client. It now has `10.10.0.150`.

Once you've done this, DHCP is no longer mysterious.

## The FAQ

**Does my home router use DHCP?**
Yes. Every consumer router has a built-in DHCP server. It typically hands out `192.168.0.x` or `192.168.1.x` addresses.

**Can I have multiple DHCP servers on the same network?**
Yes — that's how failover works. But if they're not configured as a failover pair, they'll fight over who gives out IPs, causing conflicts. Either use proper failover or make sure only one is active per scope.

**What's IPv6 DHCP (DHCPv6)?**
Same idea as IPv4 DHCP but for IPv6 addresses. Increasingly relevant as IPv6 rollout continues, but most enterprises are still IPv4-primary for internal networks.

**Why does my printer keep losing its IP?**
Its DHCP lease expired while it was off. Fix: add a DHCP reservation so the printer always gets the same IP.

**What's the difference between a static IP and a DHCP reservation?**
Static: manually configured on the device itself. If you change the network, you have to change every device. DHCP reservation: assigned by the DHCP server based on the device's MAC address. Change the reservation once, done. Reservations are almost always the better choice.

**Do domain controllers use DHCP?**
No. DCs must have static IPs because clients cache "here's where my DC is" and can't handle it changing constantly.

**What happens if the DHCP server dies?**
Existing leases keep working until they expire. New devices can't get IPs. That's why you deploy two DHCP servers in failover mode.

## Where to go next

Now that DHCP makes sense:

- **[What is DNS?](/posts/what-is-dns-beginners-guide)** — DHCP hands out IPs, DNS translates names to IPs. Together they form the foundation of any network.
- **[Windows DNS forward lookup zones](/posts/windows-dns-forward-lookup-zones)** — since DHCP integrates so closely with DNS.
- **[Home lab guide](/posts/minimum-viable-windows-server-home-lab-for-active-directory)** — set up DHCP as part of your practice environment.

Now go grab a coffee. And next time your Wi-Fi "just works" when you connect, remember there's a DHCP conversation happening in the background.
