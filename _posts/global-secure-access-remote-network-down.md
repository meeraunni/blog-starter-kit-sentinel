---
title: "Global Secure Access Remote Network Down: Admin Fix"
excerpt: "Fix a Global Secure Access remote network outage by separating IPsec, BGP, route, and traffic-profile failures, then prove recovery with Entra logs."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-05T17:04:56-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

When a **Global Secure Access remote network is down**, start by deciding which layer failed. An IPsec tunnel failure, a BGP session failure, a missing route, and an unassigned traffic profile can all look like “the branch lost access,” but they leave different evidence and require different repairs.

The fastest safe sequence is: identify the affected remote network and UTC start time, match the CPE-to-Entra tunnel by its source and destination IP addresses, confirm IPsec state, confirm BGP state and advertised-route count, verify the assigned traffic profiles, then prove that bytes and user traffic resumed. Do not rotate a pre-shared key, restart every tunnel, or bypass Global Secure Access before you know which layer is broken.

Grab a coffee and keep two consoles open: the Microsoft Entra evidence on one side and the customer premises equipment, or CPE, evidence on the other. Microsoft highlighted **Microsoft Entra Health and Alerts for Global Secure Access** as a public-preview capability in its [November 2026 Global Secure Access announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/global-secure-access-private-access-and-internet-access-in-one-offering/4569098). The current [remote-network health investigation guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-investigate-remote-networks-scenario-signals) provides the operational sequence used here. This article is a documentation-derived runbook; it does not claim a live tenant or CPE test.

## Global Secure Access remote network down: triage first

Use the first matching branch below. The point is to narrow the fault domain before changing configuration.

**No IPsec tunnel is connected**

- Layer: CPE, internet path, IKE/IPsec policy, public IP, endpoint, or pre-shared key.
- Entra evidence: `tunnelDisconnected` for the source/destination IP pair, followed by no healthy heartbeat.
- First check: the CPE interface and logs, ISP reachability, public IP, IKEv2/IPsec parameters, tunnel endpoints, and matching secret.

**IPsec is connected, but BGP is disconnected**

- Layer: the BGP neighbor relationship running over the established tunnel.
- Entra evidence: `tunnelConnected` plus `bgpDisconnected`; the next `remoteNetworkAlive` record can show no expected advertised routes.
- First check: peer and local BGP addresses, autonomous system numbers, and route advertisements on the exact CPE link.

**IPsec and BGP are connected, but the destination still fails**

- Layer: route advertisement, traffic-profile assignment, forwarding-profile scope, security policy, DNS, or the destination itself.
- Entra evidence: healthy tunnel/BGP state with an unexpected `BgpRoutesAdvertisedCount`, no byte movement, or traffic records that show a drop.
- First check: expected route count, sent and received bytes, associated Microsoft or Internet Access traffic profile, and the Global Secure Access traffic log.

**The branch flaps between healthy and unhealthy**

- Layer: unstable CPE, ISP, tunnel, BGP session, or a single-path design with no failover.
- Entra evidence: repeated connected/disconnected events for the same link.
- First check: event frequency, CPE and ISP timestamps, tunnel redundancy, BGP behavior, and maintenance history.

Microsoft documents these as separate health signals because BGP depends on IPsec, while a connected IPsec tunnel does not prove BGP is exchanging routes. The alert is a starting point, not a root-cause verdict. ([Microsoft Entra remote-network health scenarios](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-investigate-remote-networks-scenario-signals))

## Understand the control plane before repairing it

A Global Secure Access remote network is a branch connectivity object, not an endpoint-client deployment. The branch CPE initiates an IKEv2 connection to a Global Secure Access endpoint and establishes an IPsec tunnel. BGP can then exchange routes over that tunnel. A traffic forwarding profile decides which acquired traffic the service accepts, and a security profile decides which policy applies to accepted traffic.

That produces five proof points:

1. **Remote-network object:** identifies the site and region.
2. **Device link:** binds the CPE public IP, BGP addresses, ASN, bandwidth, redundancy, IKE/IPsec configuration, and secret to one tunnel path.
3. **IPsec state:** proves the encrypted link exists.
4. **BGP and route state:** proves the branch and service are exchanging the routes required for forwarding.
5. **Traffic-profile and policy state:** proves the traffic type is accepted and evaluated after it enters the tunnel.

Microsoft's current configuration reference says the CPE must initiate the connection, the remote-network design uses route-based VPN with any-to-any traffic selectors, and only IKEv2 is supported. The policy configured on the device link must match the CPE policy. ([Create a Global Secure Access remote network](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-create-remote-networks), [manage remote-network device links](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-remote-network-device-links))

The traffic-profile boundary is just as important. Remote networks support the Microsoft traffic and Internet Access profiles. They do not support the Private Access traffic profile; Private Access requires the Global Secure Access client on the endpoint. The gateway forwards only traffic that matches an enabled and associated profile and drops other traffic sent over the device link. Microsoft's guidance recommends associating both Microsoft and Internet Access profiles when licensing and design permit, so one category is not silently discarded. ([Remote-network connectivity and traffic-profile enforcement](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-remote-network-connectivity))

> **Analysis:** a green tunnel icon proves only one layer. It does not prove the expected routes exist, that the right traffic profile is attached, that policy allows the request, or that the destination is healthy.

## Preserve evidence before making a change

Open the incident record and capture:

- tenant ID, remote-network name and object ID;
- site, business impact, affected destinations, and whether the failure is all traffic or one traffic type;
- first known failure time in UTC and the last known successful transaction;
- device-link name, CPE public IP, Microsoft endpoint IP, and whether redundancy is configured;
- tunnel and BGP state for every link, not only the first link displayed;
- expected and observed BGP route counts;
- `SentBytes` and `ReceivedBytes` before and during the incident;
- current traffic-profile assignments;
- recent Entra audit events and CPE configuration changes; and
- CPE, ISP, Entra, and destination-owner incident references.

Do not copy the pre-shared key into the ticket. Record that both sides were compared through an approved secret-handling path, who performed the comparison, and when.

The built-in remote-network health log identifies a tunnel by its source/destination IP pair. Microsoft says `remoteNetworkAlive` is emitted every 15 minutes for active tunnels and carries the route count plus bytes transferred during the interval. State-change records use `tunnelConnected`, `tunnelDisconnected`, `bgpConnected`, or `bgpDisconnected`; their route and byte fields are zero by design. ([Remote-network health-log fields](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-remote-network-health-logs), [Azure Monitor table schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/remotenetworkhealthlogs))

## Investigate Microsoft Entra Health and remote-network logs

In the Microsoft Entra admin center, browse to **Entra ID > Monitoring & health > Health > Health Monitoring**. Open either **Global Secure Access requiring remote network tunnel connectivity** or **Global Secure Access requiring remote network BGP connectivity**, then open the active alert.

Microsoft documents different access boundaries for this preview:

- Microsoft Entra ID P1 or P2 is required to view health-scenario signals.
- Alerts and alert notifications require non-trial P1 or P2 plus at least 100 monthly active users.
- A Global Secure Access license is also required for this scenario.
- Reports Reader is the least-privileged role to view health signals, alerts, and alert configurations.
- Helpdesk Administrator is the least-privileged role to update alerts and notification configurations.
- Global Secure Access Administrator or Security Administrator is required to access the remote-network logs.

Keep the preview label visible in the runbook. Microsoft Entra Health monitoring uses tenant-specific anomaly detection, not a fixed universal threshold. Microsoft's general health documentation also says a newly onboarded tenant can need about 30 days of data before it generates alerts. Absence of an alert is therefore not proof that every branch is healthy. ([Microsoft Entra Health investigation and prerequisites](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-investigate-health-scenario-alerts))

Next browse to **Global Secure Access > Monitor > Remote network health logs** and filter on the remote-network ID and alert interval. Work from the bottom of the stack upward:

1. Find the last `tunnelConnected` or `tunnelDisconnected` record for each source/destination IP pair.
2. If the tunnel is connected, find the last BGP state event for that same link.
3. Review subsequent `remoteNetworkAlive` records for advertised-route count and byte movement.
4. Compare the alert start time with Entra audit events and CPE or ISP changes.
5. If traffic reaches the service, use Global Secure Access traffic logs to determine whether the request was forwarded, blocked, or absent.

Do not treat a zero byte count in a state-change event as an outage. Microsoft populates byte totals on the periodic alive record, not on the connected/disconnected event.

## Use Log Analytics when the incident crosses shifts

Microsoft retains Global Secure Access traffic and remote-network health logs in the service for 30 days. Diagnostic settings can export `RemoteNetworkHealthLogs` to Log Analytics, storage, or an event hub for longer retention and correlation. Microsoft notes that a newly configured export can take up to three days before records appear in the destination, so create the pipeline before an outage rather than during one. ([Global Secure Access log retention](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-global-secure-access-logs-monitoring), [remote-network diagnostic settings](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-remote-network-health-logs))

This query uses the current Microsoft-published table and column names:

```kusto
RemoteNetworkHealthLogs
| where TimeGenerated > ago(24h)
| where RemoteNetworkId == "<remote-network-id>"
| project TimeGenerated, Status, SourceIp, DestinationIp,
          BgpRoutesAdvertisedCount, SentBytes, ReceivedBytes, Description
| order by TimeGenerated asc
```

Read it as a timeline, not as a binary health check. A recovery should normally show the expected state transition, then alive records with the normal route count and renewed byte movement. Compare with the same weekday and time window only when that baseline is operationally meaningful.

## Repair an IPsec tunnel failure

When no tunnel is connected, stay on the link layer.

1. Confirm the CPE itself, WAN interface, and ISP path are healthy.
2. Match the Entra source/destination IP pair to the exact CPE tunnel.
3. Confirm that the configured CPE public IP still matches the device link.
4. Compare the IKEv2 and IPsec parameters on both sides. If the device link uses a custom policy, every selected algorithm and parameter must be in Microsoft's supported configuration set.
5. Compare the pre-shared key through the approved secret path. Rotate it only when evidence shows a mismatch or compromise and both sides can be coordinated.
6. Confirm the CPE is initiating the connection; Global Secure Access uses responder mode.
7. Review the Entra audit log for a device-link, remote-network, IPsec, or traffic-profile change near the incident start.
8. Correct the smallest confirmed mismatch and watch for `tunnelConnected`.

After the tunnel returns, do not close the incident. Confirm BGP and application traffic separately.

If multiple branches fail at once, compare their Microsoft endpoint region, ISP path, change window, and Entra audit trail. A shared pattern can narrow the fault domain, but it does not prove a Microsoft service incident. Check the applicable service-health channel and preserve the case ID when escalation is required.

## Repair BGP without disturbing a healthy tunnel

If IPsec is connected but BGP is down, do not rotate the IPsec secret. The encrypted carrier is already up.

1. Match the CPE peer to the device link's local and peer BGP addresses. Microsoft warns that the labels appear reversed depending on whether you are viewing Entra or the CPE.
2. Confirm that the two gateways use different valid ASNs.
3. Confirm the BGP neighbor is established over the intended IPsec link.
4. Compare the current advertised-route count with the approved baseline.
5. Review route filters, prefix lists, redistribution, maximum-prefix controls, and recent CPE changes.
6. Correct the confirmed neighbor or route-advertisement fault, or restart only that BGP session according to the CPE vendor's procedure.
7. Prove `bgpConnected`, the expected `BgpRoutesAdvertisedCount`, and subsequent byte movement.

A connected BGP session with zero or sharply reduced expected routes is still a routing incident. Conversely, a stable route count with no bytes can indicate a traffic-profile, policy, DNS, destination, or demand issue rather than BGP failure.

## Fix the green-tunnel, broken-traffic case

When both IPsec and BGP are healthy, compare the symptom with the intended traffic path.

**Only Microsoft 365 traffic fails:** verify the Microsoft traffic profile is enabled and associated with the remote network. Confirm the destination belongs to the traffic category expected by that profile.

**Only general internet traffic fails:** verify the Internet Access profile is enabled and associated. Then review traffic and security-policy evidence. The site's [Microsoft Entra Internet Access content-policy guide](/posts/microsoft-entra-internet-access-content-policy) explains the policy-evaluation and evidence boundaries after traffic is acquired.

**Private Access fails from a branch device without the client:** remote networks do not support the Private Access forwarding profile. Validate the endpoint-client design instead of repeatedly changing the branch tunnel.

**Traffic disappears after TLS inspection or content controls:** first prove tunnel, BGP, route, and profile health; then investigate the specific enforcement layer. Use the [managed TLS inspection certificate guide](/posts/microsoft-entra-managed-tls-inspection-certificate) for certificate deployment evidence rather than treating every HTTPS failure as a tunnel problem.

**The branch is healthy but costs, bandwidth, or entitlements are unclear:** keep licensing and outage diagnosis separate. The [Global Secure Access licensing guide](/posts/microsoft-entra-global-secure-access-licensing) covers product entitlements, remote-network minimums, and capacity planning.

> **Analysis:** bypassing the service can restore productivity while silently removing the inspection and policy path. Treat fail-open behavior as an approved business-continuity decision, not a routine network fix.

## Design the mitigation before the next outage

Microsoft recommends multiple IPsec tunnels to different Global Secure Access edges or points of presence. Zone redundancy creates two tunnels in different availability zones within one Azure region. Geographic redundancy uses a second remote network in another region. CPE tunnel weighting supports active-active or active-standby routing, and BGP is the preferred dynamic route-learning mechanism. ([Global Secure Access remote-network resilience](https://learn.microsoft.com/en-us/entra/global-secure-access/remote-network-resilience))

The failover design is a security decision:

- A **fail-closed** route keeps traffic from reaching the destination unless it passes through Global Secure Access. It preserves the control boundary but can extend an outage.
- A **productivity-first default route** lets traffic continue directly if the service path fails. It can preserve business availability but bypasses the Global Secure Access inspection path.

Microsoft's resilience guide recommends an IP SLA Layer 7 probe for a productivity-first design and publishes a service-specific probe endpoint. Use that documented endpoint only through remote-network connectivity, record the chosen failover behavior, test it in a change window, and make the resulting security gap visible to the risk owner.

For monitoring, export health logs, baseline route counts and tunnel byte patterns, alert on state changes and prolonged absence of expected alive records, and test that the on-call team can join Entra, CPE, ISP, and destination evidence. Do not wait for a user ticket to discover that the second tunnel never carried traffic.

## Prove recovery before closing the incident

Recovery needs evidence from every affected layer:

- the intended IPsec link records `tunnelConnected`;
- BGP records `bgpConnected` when BGP is part of the design;
- the advertised-route count returns to its approved range;
- subsequent alive records show expected sent and received bytes;
- the required traffic profiles remain associated;
- a controlled branch test reaches the intended Microsoft or internet destination;
- Global Secure Access traffic evidence shows the expected action;
- no unauthorized bypass, broad policy disablement, or emergency route remains; and
- redundant links and failover behavior are returned to their approved state.

Review **Global Secure Access > Monitor > Audit logs** or filter the Microsoft Entra audit log to the Global Secure Access service. Microsoft documents remote-network management and forwarding-profile changes in that audit surface. Preserve the actor, target, UTC timestamp, result, correlation ID, and approved change reference. ([Global Secure Access audit logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-access-audit-logs))

If evidence still disagrees, escalate with the tenant ID, remote-network and device-link IDs, source/destination IP pair, UTC window, tunnel and BGP events, expected and observed route counts, sanitized CPE logs, traffic-profile assignments, audit changes, affected destinations, and a fresh test result. Never include the pre-shared key, private certificate material, user tokens, or unredacted sensitive traffic payloads.

## Global Secure Access remote network checklist

- [ ] Record the affected site, remote-network ID, UTC start time, and business impact.
- [ ] Match every device link by source/destination IP pair.
- [ ] Separate IPsec, BGP, route, traffic-profile, policy, DNS, and destination state.
- [ ] Preserve the last healthy and first failed records before changing anything.
- [ ] Compare CPE and Entra IKE/IPsec parameters without exposing the secret.
- [ ] Verify peer/local BGP addresses, ASNs, and advertised-route count.
- [ ] Confirm Microsoft and Internet Access traffic-profile assignments.
- [ ] Review Entra audit events and CPE/ISP changes near the failure.
- [ ] Apply the smallest evidence-backed repair.
- [ ] Prove tunnel, BGP, routes, bytes, and an end-to-end transaction.
- [ ] Remove emergency bypasses and restore the approved redundant state.
- [ ] Export health logs and test alerts before the next incident.

## FAQ

### Why is the Global Secure Access tunnel connected but the branch still has no traffic?

The IPsec link can be healthy while BGP is disconnected, required routes are missing, the wrong traffic profile is associated, a security policy blocks the request, or the destination itself is unavailable. Confirm each layer in order.

### Does a BGP disconnect mean the IPsec tunnel is down?

No. Microsoft treats tunnel and BGP connectivity as separate health signals. BGP requires an established tunnel, but the tunnel can remain connected while the BGP neighbor relationship is down.

### Can a remote network carry Microsoft Entra Private Access traffic?

No. Microsoft's current connectivity table supports Microsoft traffic and Internet Access for remote networks. Private Access requires the Global Secure Access client on the endpoint.

### How often does the remote-network alive record appear?

Microsoft documents a `remoteNetworkAlive` statistic every 15 minutes for active tunnels. It contains the advertised-route count and byte totals for the interval.

### How long are the built-in health logs retained?

Microsoft documents 30-day in-service retention for Global Secure Access traffic and remote-network health logs. Export them through diagnostic settings when the investigation, audit, or compliance period is longer.

### Should I rotate the pre-shared key first?

No. First confirm an IPsec-layer mismatch or compromise. A key rotation cannot fix a BGP neighbor, missing route, traffic-profile assignment, security policy, DNS, or destination failure, and an uncoordinated rotation can extend the outage.

## Closing view

When a Global Secure Access remote network is down, the reliable mental model is **site, device link, IPsec, BGP, routes, traffic profile, policy, destination**. Move through it in that order, preserve the evidence before repair, and prove every affected layer afterward. That turns a vague branch outage into a bounded control-plane incident—and keeps a hurried network workaround from becoming a silent security bypass.

## Microsoft primary sources

- [Investigate Global Secure Access remote-network health scenarios](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-investigate-remote-networks-scenario-signals)
- [Understand Global Secure Access remote-network connectivity](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-remote-network-connectivity)
- [Use Global Secure Access remote-network health logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-remote-network-health-logs)
- [Create a Global Secure Access remote network](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-create-remote-networks)
- [Manage remote-network device links](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-remote-network-device-links)
- [Build Global Secure Access remote-network resilience](https://learn.microsoft.com/en-us/entra/global-secure-access/remote-network-resilience)
- [Access Global Secure Access audit logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-access-audit-logs)
