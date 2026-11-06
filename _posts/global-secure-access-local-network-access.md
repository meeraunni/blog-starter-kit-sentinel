---
title: "Global Secure Access Local Network Access: Admin Guide"
excerpt: "Restore Global Secure Access local network access safely: enable Private Access home-network support, prove local bypass, and contain subnet-overlap risk."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-06T09:27:48-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The user's printer disappears as soon as Microsoft Entra Private Access connects. Turning off the Global Secure Access client makes it return, but that workaround also removes the private-application path you deployed the client to provide. The printer is not the real conflict. A broad Private Access application segment and the user's directly connected network are claiming the same private address.

**Global Secure Access local network access** can resolve that collision without disabling Private Access. An administrator enables **Allow local subnet bypass** on the applicable Private Access traffic forwarding profile, and the user turns on **Prefer Local Network** in the client. Traffic to an eligible destination in the directly connected local subnet then stays local; other Private Access traffic continues to follow the configured tunnel path. ([Microsoft's home-network support guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-home-network-support))

Microsoft lists this home-network support capability as **public preview**. It is not default-on, a general split-tunnel switch, or an invisible repair for every local-network problem. It supports directly connected RFC 1918 IPv4 subnets, not routed networks, IPv6 local subnets, or mobile clients. Microsoft's November 2026 [Global Secure Access announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/global-secure-access-private-access-and-internet-access-in-one-offering/4569098) identifies the feature as a way to reach local printers, routers, and wireless displays while Private Access remains connected.

Grab a coffee before enabling it tenant-wide. The setting deliberately changes which network wins when address space overlaps, so the pilot must prove both sides of the decision: the local resource works, and the corporate resource still takes the intended path.

> **Documentation boundary:** this guide is based on Microsoft's public preview documentation and client release information as of November 6, 2026. No tenant or endpoint was changed for this article, and no hands-on behavior is claimed. Preview behavior can change; validate the current client build and Microsoft documentation before production rollout.

## Global Secure Access local network access: the short answer

Use home-network support only when all of these are true:

1. Private Access is connected and the expected traffic forwarding profile reached the device.
2. A local destination sits inside the device's directly connected RFC 1918 IPv4 subnet.
3. Private Access would otherwise acquire that destination because an application segment overlaps the local subnet.
4. The user has a supported client, and local access is an approved requirement.
5. You can test a corporate destination in the overlapping range as well as the local resource.

The administrator path is **Microsoft Entra admin center > Global Secure Access > Connect > Traffic forwarding > applicable Private Access profile > Allow local subnet bypass**. After the profile reaches the device, the user opens the Global Secure Access client, selects **Settings**, and enables **Prefer Local Network**. Microsoft says the client calculates the local subnet from the active adapter's IP address and subnet mask. ([configuration steps and routing model](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-home-network-support#how-home-network-support-works))

Do not use this as a substitute for fixing unnecessarily broad application segments. If `192.168.0.0/16` exists only because the rollout copied a legacy VPN route, publish the actual corporate destinations where practical. A smaller segment removes ambiguity instead of teaching every endpoint how to resolve it.

## Understand the address collision before changing policy

Private Access traffic acquisition begins with the destinations defined in Quick Access and Private Access enterprise applications. The client receives the applicable traffic forwarding profile and tunnels matching traffic toward Microsoft's service edge and the private network connectors. Enabling a profile alone does not grant access; the destination, application assignment, profile assignment, connector path, and any Conditional Access policy remain separate gates. ([Private Access traffic forwarding](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-private-access-enable-traffic-forwarding))

Now place a home network inside that model. Suppose a user's Wi-Fi adapter is `192.168.4.69/22`. Microsoft documents that the client calculates the directly connected network as `192.168.4.0/22`. If a corporate application segment also covers that space, a request to a printer at `192.168.4.25` can match Private Access even though the printer is one hop away on Wi-Fi.

With Prefer Local Network enabled, an eligible destination inside that calculated subnet takes the local path. The setting affects **Private Access traffic only**. It does not bypass the Microsoft or Internet Access traffic forwarding profiles. The preference persists when the device moves to another network, while the client recalculates which subnet is directly connected. ([home-network routing behavior](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-home-network-support#understand-routing-behavior))

This creates one unavoidable trade-off. If a local device and a corporate private application use the same address, the local destination wins while Prefer Local Network is enabled. The corporate destination is not reachable through Private Access from that network until the user turns the preference off. That is documented routing behavior, not a connector outage.

> [!IMPORTANT]
> **Analysis:** local bypass narrows the traffic path, but it also moves the destination decision onto the directly connected network. Treat untrusted Wi-Fi, shared RFC 1918 ranges, and a corporate application addressed only by an overlapping IP as a risk condition. Prefer specific FQDN application segments or a non-overlapping addressing plan for sensitive resources instead of making permanent user-side switching part of the design.

## Choose home-network support, Intelligent Local Access, or a segment fix

These controls solve different routing problems.

**Use home-network support for a directly connected personal or small-office subnet.** The user needs a printer, router, casting adapter, or local virtual machine while Private Access stays connected. The client derives the subnet from the local adapter, and the user's preference decides whether eligible Private Access destinations stay local.

**Use Intelligent Local Access for a known corporate network.** Intelligent Local Access uses an administrator-defined DNS probe to identify a corporate network, then allows selected Private Access applications to take a local route on that network. Microsoft says the normal Private Access tunnel remains the path off-network and that application Conditional Access still applies. ([Intelligent Local Access tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-private-access-intelligent-local-access))

**Fix the application segment when the overlap is accidental.** Replace a broad range with the specific FQDNs, addresses, and ports the corporate application needs. The current Private Access deployment guidance recommends using FQDNs for environments with overlapping or duplicated IP address space. ([Private Access deployment guide](https://learn.microsoft.com/en-us/entra/architecture/gsa-deployment-guide-private-access))

Microsoft's documented routing order is Intelligent Local Access first, home-network support second, and normal Private Access acquisition third. Do not enable both local-routing features without testing the precedence on every relevant network. ([routing order](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-home-network-support#understand-routing-behavior))

## Pass the preview, license, role, and client gates

Before opening a change, confirm the prerequisites Microsoft documents:

- Microsoft Entra Private Access or Microsoft Entra Suite licensing;
- a configured and enabled Private Access traffic forwarding profile;
- a supported Global Secure Access client with Private Access connected; and
- Global Secure Access Administrator for the profile change.

Microsoft's current licensing overview also states that Private Access users need Microsoft Entra ID P1 or P2 as the identity prerequisite. The site's [Global Secure Access licensing guide](/posts/microsoft-entra-global-secure-access-licensing) explains the workforce, guest, branch, and agent boundaries without turning this routing change into a procurement guess.

On Windows, Microsoft introduced the **Prefer local network** option in client version `2.32.294`, released on August 26, 2026. The option appears only after an administrator enables it. Treat that release as provenance, not a version-pinning recommendation: deploy the latest supported client and validate the current [Windows client release notes](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-windows-client-release-history) before the pilot.

Also verify assignment, not just profile existence. Microsoft says user/device and platform assignment conditions are evaluated together. If several enabled Private Access profiles apply, only the applicable profile with the highest priority is used. The client fetches profiles for the Entra user signed in to the device, which can differ from the identity someone assumes the tray client is using. ([traffic forwarding profile assignments](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-users-groups-assignment))

## Pilot the local subnet bypass without hiding the failure

Build the pilot around a reproducible collision. Record the following before changing anything:

- user, device, operating system, and Global Secure Access client version;
- active adapter IPv4 address and subnet mask;
- local resource IP, port, and expected protocol;
- effective Private Access traffic forwarding profile;
- the Quick Access or enterprise-application segment that overlaps the subnet;
- one corporate destination inside the overlapping range;
- one unaffected Private Access application as a control; and
- the time, owner, rollback decision, and help-desk route.

Then use a small dedicated pilot assignment rather than an all-user change.

1. Open the applicable Private Access profile in **Global Secure Access > Connect > Traffic forwarding**.
2. Enable **Allow local subnet bypass** and save the profile.
3. Wait for the updated profile to reach the supported client. Refresh or restart the client if the option does not appear after the normal policy-refresh window.
4. Have the pilot user enable **Settings > Prefer Local Network**.
5. Reproduce access to the local resource by IP and, where used, by name.
6. Test the overlapping corporate destination and the unaffected Private Access control application.
7. Move the device to a second network and repeat the tests. The preference persists, but the calculated local subnet changes.

Do not declare success because a printer responds once. A cached print queue, an already-open session, or a name that resolves to a different address can create a false positive. Start a new connection and preserve the destination shown by diagnostics.

## Prove the routing decision on the endpoint

Microsoft directs administrators to the Global Secure Access client's Advanced diagnostics for verification:

1. confirm the expected Private Access profile under **Forwarding Profile**;
2. open the network traffic view and start collecting;
3. create a new connection to the local resource;
4. filter on the destination IP address; and
5. confirm the action shows local bypass.

Remove any default filter that shows only tunneled traffic, or the local result can be hidden. Microsoft's [Advanced diagnostics reference](https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-global-secure-access-client-advanced-diagnostics) also documents connection destination, port, process, rule, channel, action, and correlation fields that help separate acquisition from application failure.

For each pilot, preserve four outcomes:

- local destination with Prefer Local Network **off**;
- local destination with Prefer Local Network **on**;
- corporate overlapping destination with the preference **on** and then **off**; and
- an unrelated Private Access destination in both states.

This matrix proves that the setting changed the intended route and nothing broader. The cloud traffic log is still useful for tunneled Private Access connections, while the client trace is the direct evidence for a connection that stayed local.

## Control the security and support consequences

Home-network support contains two approvals. The administrator permits local-subnet bypass on a profile, and the user chooses whether to prefer the local network. Document both. If users must toggle the preference every day to reach a critical corporate app, the address design or application segmentation is not finished.

Use these guardrails:

- scope the enabled profile to the users and platforms that need the feature;
- avoid broad RFC 1918 application segments where specific FQDNs and ports are available;
- keep privileged and high-impact applications out of ranges likely to overlap home networks;
- publish a clear explanation that local preference can make an overlapping corporate destination unavailable;
- require endpoint firewall and local-resource authentication rather than treating the subnet as trusted;
- review Global Secure Access audit logs for unexpected forwarding-profile changes; and
- set an end date for the preview pilot.

The [Private Access VPN replacement guide](/posts/microsoft-entra-private-access-vpn-replacement) covers connector, application-segment, Conditional Access, and phased-migration design. Home-network support should refine that architecture, not recreate a wide VPN route with a local exception switch.

## Troubleshoot the first broken boundary

**Prefer Local Network is missing.** Confirm the device runs a supported current client, the administrator enabled Allow local subnet bypass on the effective profile, the user/device and platform assignments match, and the updated profile reached the device. Microsoft's Windows release history says the option first appeared in `2.32.294`.

**The local device is still unreachable.** Verify that the destination is in the adapter's directly connected subnet and uses an RFC 1918 IPv4 address. Confirm the local operating-system firewall, printer or device firewall, service port, and name resolution independently. Home-network support cannot create reachability that the local network itself denies.

**The resource sits behind the home router.** A routed downstream network is outside the feature's documented scope. Home-network support covers the directly connected subnet, not a general collection of routes behind the gateway.

**A corporate application stopped working.** Check whether its address overlaps the current local subnet. Turn off Prefer Local Network and create a new connection. If the corporate app returns, the local path was taking precedence. Narrow the application segment, use a specific FQDN where supported, or correct the addressing plan instead of leaving the conflict unresolved.

**The printer works but its hostname does not.** Compare the name's resolved address with the printer IP used in the successful test. The routing feature follows the destination; it does not repair multicast discovery, DNS suffixes, or vendor discovery protocols.

**The behavior differs on mobile.** Microsoft's preview limitations explicitly say mobile clients are not supported. Keep mobile behavior outside the success criteria for this feature. ([home-network support limitations](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-home-network-support#limitations))

## Roll back without disabling Private Access

The smallest rollback is to have the pilot user turn off **Prefer Local Network**. That restores normal Private Access acquisition for overlapping destinations while leaving the client and profile connected.

If the feature should no longer be available to that population, disable **Allow local subnet bypass** on the relevant Private Access traffic forwarding profile, save the profile, and confirm the setting disappears after client refresh. Preserve the before-and-after diagnostics and audit record.

Do not uninstall the client, disable the whole Private Access profile, delete application segments, or widen a bypass rule merely to fix one local destination. Those actions change a much larger control plane than the incident requires.

## Global Secure Access local network access checklist

- [ ] Prove a Private Access segment overlaps the directly connected subnet.
- [ ] Record the client version, effective profile, local destination, and corporate control destination.
- [ ] Confirm Private Access licensing and the Entra ID P1/P2 prerequisite.
- [ ] Scope Allow local subnet bypass to a dedicated pilot profile or population.
- [ ] Enable Prefer Local Network on a supported client.
- [ ] Verify local bypass in Advanced diagnostics with a new connection.
- [ ] Test the overlapping corporate destination with the preference on and off.
- [ ] Test an unrelated Private Access application for regression.
- [ ] Repeat the test on a second network.
- [ ] Document the user-visible trade-off and the rollback.
- [ ] Narrow broad application segments where possible.
- [ ] Set a review date while the capability remains in preview.

## Things people ask

*Does Prefer Local Network disable Global Secure Access?* No. Microsoft's guide says it changes Private Access routing for eligible destinations in the directly connected local subnet. Microsoft and Internet Access forwarding are not bypassed by this setting.

*Can an administrator force every local route to bypass?* The documented design has an administrator permission on the traffic forwarding profile and a user preference in the client. Do not describe the preview as a universal administrator-authored route table.

*Does it work for a printer on another VLAN?* Not through home-network support unless that VLAN is the device's directly connected eligible subnet. The feature does not provide a general bypass for routed networks behind the gateway.

*Is this the same as Intelligent Local Access?* No. Intelligent Local Access identifies a configured corporate network by DNS probe and locally routes selected Private Access applications. Home-network support derives the directly connected subnet and lets the user prefer local access for an address collision. Intelligent Local Access has higher routing precedence.

*Can I solve the problem by turning off Private Access?* That can prove the conflict during diagnosis, but it is not the production fix. Use the narrow local preference, correct the application segment, or change the overlapping address design.

## Microsoft primary sources

- [Configure home network support for Microsoft Entra Private Access](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-home-network-support)
- [Global Secure Access: Private and Internet Access in one offering](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/global-secure-access-private-access-and-internet-access-in-one-offering/4569098)
- [Global Secure Access Windows client release notes](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-windows-client-release-history)
- [Configure Intelligent Local Access](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-private-access-intelligent-local-access)
- [Assign users and devices to traffic forwarding profiles](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-users-groups-assignment)
- [Private Access deployment guide](https://learn.microsoft.com/en-us/entra/architecture/gsa-deployment-guide-private-access)
- [Global Secure Access client Advanced diagnostics](https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-global-secure-access-client-advanced-diagnostics)
- [What is Global Secure Access? Licensing overview](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview)
