---
title: "Microsoft Entra Internet Access: What It Actually Is, When To Use It, and How To Plan a Rollout"
excerpt: "An operator's guide to Microsoft Entra Internet Access — the identity-aware SSE for outbound internet and SaaS traffic. What problem it solves, how it compares to Defender for Cloud Apps, the rollout sequence, and the policy patterns that actually work."
coverImage: "/assets/blog/microsoft-entra-internet-access-overview/diagram.svg"
date: "2026-06-13T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/microsoft-entra-internet-access-overview/diagram.svg"
---

## Where this product sits in the Microsoft picture

Microsoft Entra Internet Access (EIA) is the **internet-and-SaaS** half of Microsoft's Security Service Edge (SSE) play. It pairs with Microsoft Entra Private Access (EPA) — the private-app half — and the shared Global Secure Access client and admin surface. Together they're Microsoft's first-party answer to the secure web gateway plus ZTNA categories that have been dominated by Zscaler, Netskope, and Cisco for the last decade.

EIA is interesting to enterprises in the Microsoft ecosystem for one specific reason: it makes the network the user is on a **signal Conditional Access can evaluate**. The "Compliant network" condition that EIA introduces is the first time the platform has been able to say, with confidence, that the request reached Entra through a known-trusted egress point. That changes what Conditional Access policies can express, and it changes the answer to "how do we replace IP-based named locations now that everyone works from anywhere."

This article is the operator's view: what EIA is, what it does and doesn't do, how it fits with Defender for Cloud Apps (the legacy session-policy surface), the rollout sequence that doesn't break existing CA policies, and the small set of patterns that capture most of what teams actually deploy.

The Microsoft references throughout are [Global Secure Access overview](https://learn.microsoft.com/entra/global-secure-access/overview-what-is-global-secure-access), [What is Internet Access](https://learn.microsoft.com/entra/global-secure-access/concept-internet-access), [Compliant network in Conditional Access](https://learn.microsoft.com/entra/global-secure-access/how-to-compliant-network), and the [Global Secure Access client](https://learn.microsoft.com/entra/global-secure-access/how-to-install-windows-client) installation pages.

## What EIA actually does

EIA is a Microsoft-operated egress edge that sits between your users and the public internet. The Global Secure Access (GSA) client on the user's device routes selected outbound traffic through that edge. The edge:

- Enforces a set of access policies (web filtering, threat protection, TLS inspection where configured).
- Identifies the user via the GSA client's Entra identity, not just an IP address.
- Stamps the connection with a **Compliant network** signal that downstream Conditional Access policies can require.
- Logs the traffic to a workspace where you can KQL it for incident investigation and usage reporting.

What it does *not* do, despite some of the marketing positioning:

- It is not a full secure web gateway replacement on day one — the URL category coverage is still maturing relative to incumbent SWGs.
- It does not inspect every protocol; the default forwarding profile targets Microsoft traffic and a defined set of internet categories. UDP, niche protocols, and some peer-to-peer flows are out of scope.
- It does not magically protect SaaS apps that don't sit behind it — if a user reaches a SaaS app from an unmanaged personal device that has no GSA client, EIA has no opinion on that session.

> [!IMPORTANT]
> EIA is *additive* to your existing identity and endpoint stack. It does not replace Conditional Access, Defender for Cloud Apps session policies, or your existing endpoint web filtering on day one. Plan it as a new control surface that complements them, not as a forklift.

## The forwarding profiles, in operator terms

EIA's behaviour on the client is governed by a small set of forwarding profiles:

| Profile | What it forwards | Use case |
|---|---|---|
| **Microsoft 365 profile** | Outbound to Microsoft 365 service IPs | Tenant-restrictions v2, conditional access for M365 |
| **Internet profile** | Outbound to public internet (URL filtering, threat) | Web protection, compliance signal |
| **Private Access profile** | Outbound to enterprise-defined private apps | EPA scenarios (covered separately) |

A single GSA client can enable any combination. The right shape for most enterprises starting out is **Microsoft 365 + Internet**: that turns on the Compliant network signal for CA purposes and gives you a base level of web protection. Private Access is a separate rollout that follows once you've tested the client and policy stack.

## The Compliant network signal — why this is the headline feature

For ten years, "named locations" in Conditional Access have been IP-range lists that you maintain manually. Office moves to a new floor, the egress NAT IP changes, your CA policy still references the old range, and a hundred people get prompted for MFA they don't expect. The fix has always been operational discipline you don't really have time for.

EIA introduces a different signal: instead of asking "is the request coming from an IP I trust," CA can ask "did this request transit a known-trusted Microsoft Entra egress." That signal is stamped by the EIA edge and validated by Entra. The result is a Conditional Access **Compliant network** condition that's true whenever the user is on a device running the GSA client with the Internet profile enabled.

The patterns this enables:

- **Block legacy authentication unless on a compliant network.** Legacy auth from on-network risk is bounded; from anywhere else it's an immediate red flag.
- **Require MFA for high-sensitivity apps unless on a compliant network.** The "trusted office IP doesn't need MFA" pattern, now expressed without IP allowlisting.
- **Restrict admin operations to compliant network.** A Global Administrator can only run admin actions from a session that transited EIA — meaning either an office, a managed device with GSA, or a known remote path. Personal laptop on hotel wifi is excluded.

> [!NOTE]
> The Compliant network condition only fires when *both* the GSA client is active *and* the traffic is being forwarded through the Internet profile. A laptop with the client installed but the profile disabled does *not* satisfy the condition. Confirm in `Get-EntraGlobalSecureAccessClient` status output during testing.

## How EIA compares to Defender for Cloud Apps

Microsoft has had a session-control story for SaaS for years through Defender for Cloud Apps (formerly MCAS) Conditional Access App Control. The two products do different things:

| Concern | Defender for Cloud Apps | Entra Internet Access |
|---|---|---|
| Where it sits | Reverse proxy, inserted via Entra OIDC session policy | Outbound forward proxy on the client |
| Granularity | Per session, per app, per action | Per connection, per URL category |
| Examples of what it does | Block downloads, watermark, paste-clipboard restrictions | URL category filtering, threat detection |
| Signal to CA | Session policies (separate from CA grants) | Compliant network condition (CA grant input) |
| Visibility to user | URL is rewritten (`*.mcas.ms`) | Transparent to user |

The two are complementary, not competitive. A mature deployment uses EIA for the broad "network protection + identity stamp" layer and Defender for Cloud Apps for the specific "block downloads of customer PII from Salesforce on a personal device" layer.

## A rollout sequence that doesn't break production

The mistake that costs the most time is enabling EIA on all users on the day before a CA policy starts requiring it. The order below is the one that works.

### Phase 1: Pilot, observe only

1. Identify a pilot of 25-50 users (IT team + 2-3 power-user volunteers).
2. Enable Microsoft Entra Internet Access on the tenant (admin centre → Global Secure Access).
3. Configure the Microsoft 365 traffic forwarding profile only — not Internet, not Private Access — to limit scope.
4. Deploy the GSA client via Intune. The MSI is signed by Microsoft; configure it with the tenant ID.
5. Verify in `Traffic logs` (Entra admin centre → Global Secure Access → Monitor → Traffic logs) that pilot users' Microsoft 365 traffic is being captured.
6. **Don't change any Conditional Access policies yet.** This phase is pure observation.

Run this for at least 2 weeks. Watch traffic logs for unexpected blocks, latency complaints, or DNS resolution oddities. Microsoft 365 connectivity tools (`Test-NetConnection` to Exchange Online endpoints) should still succeed end-to-end through the GSA forwarding path.

### Phase 2: Add Internet profile, still observe

1. Add the Internet traffic forwarding profile to the same pilot group.
2. Verify the Compliant network signal appears in pilot sign-in logs:

```kql
SigninLogs
| where TimeGenerated > ago(7d)
| where UserPrincipalName in ("pilot.user1@contoso.com", "pilot.user2@contoso.com")
| extend Network = tostring(NetworkLocationDetails)
| project TimeGenerated, UserPrincipalName, AppDisplayName,
          Network, ConditionalAccessStatus
| order by TimeGenerated desc
```

3. The `NetworkLocationDetails` field should show a network type indicating GSA / Compliant network when traffic transits EIA.
4. Still no CA policy changes yet.

### Phase 3: First CA policy, report-only

Create a new Conditional Access policy in **report-only** mode. The cleanest first policy is *"Block legacy authentication unless on a compliant network"* — legacy auth is well below your floor anyway, so the worst case is acceptable.

Watch sign-in logs for the policy's verdict for at least 7 days. If pilot users see report-only `failure` results when they shouldn't, your GSA client deployment isn't reaching everyone in the pilot — find the gap before you flip from report-only to enforced.

### Phase 4: Expand the pilot and add policies

Move from 50 to 500 users. Add the next CA policy (typically *"Require compliant network for privileged role actions"*). Hold for another 14 days.

### Phase 5: General availability

Roll the GSA client to all users and start enforcing the policies you've been running in report-only. Monitor the [Global Secure Access dashboard](https://learn.microsoft.com/entra/global-secure-access/concept-traffic-dashboard) and the help-desk queue.

> [!WARNING]
> Don't enable the Internet profile and a *Require compliant network* enforced policy in the same change window. The blast radius if either is misconfigured is the whole user base. Separate the changes by at least a week.

## Operational telemetry

A small KQL toolkit keeps you ahead of incidents. Each query assumes you've enabled the Diagnostic Settings on Global Secure Access to ship logs to a Log Analytics workspace.

```kql
// 1. Top blocked URL categories for the past 7 days
EnrichedMicrosoft365AuditLogs
| where TimeGenerated > ago(7d)
| where Workload == "MicrosoftGlobalSecureAccess"
| where Action == "Blocked"
| summarize Blocks = count() by Category, tostring(Reason)
| order by Blocks desc
```

```kql
// 2. Users hitting the compliant-network condition most often
SigninLogs
| where TimeGenerated > ago(7d)
| mv-expand policy = ConditionalAccessPolicies
| where tostring(policy.displayName) startswith "Require compliant network"
| summarize Hits = count() by UserPrincipalName, tostring(policy.result)
| order by Hits desc
```

```kql
// 3. Users with the GSA client *expected* but not reporting traffic
SigninLogs
| where TimeGenerated > ago(7d)
| where UserPrincipalName in (
    // your pilot user list
    "pilot.user1@contoso.com", "pilot.user2@contoso.com"
)
| extend Network = tostring(NetworkLocationDetails)
| summarize CompliantNetworkSignIns = countif(Network has "compliantNetwork"),
            TotalSignIns = count()
    by UserPrincipalName
| extend Coverage = round(100.0 * CompliantNetworkSignIns / TotalSignIns, 1)
| where Coverage < 80
| order by Coverage asc
```

The third query is the one I run weekly during a rollout. Users with low Compliant network coverage are either (a) frequently working on a device without the client, (b) having a client-side issue, or (c) on a network path that bypasses the client unexpectedly. All three are worth a ticket before they become a CA-policy failure.

## Common questions

### Does enabling EIA require a separate license?

Yes. Microsoft Entra Internet Access is part of the Microsoft Entra Suite (or licensed standalone). It is not included in Entra ID P1 or P2 alone. Check the current SKU map on the [Microsoft Entra plans page](https://www.microsoft.com/security/business/microsoft-entra-pricing).

### Will the GSA client conflict with our existing VPN client?

Usually not for the Microsoft 365 profile (it routes Microsoft service traffic via Microsoft's edge, which most VPN split-tunnel configs already excluded). For the Internet profile, test in your pilot — some VPN clients with full-tunnel and custom routes can have ordering conflicts. The [client co-existence notes](https://learn.microsoft.com/entra/global-secure-access/how-to-install-windows-client) document the supported scenarios.

### What happens when the GSA client can't reach the EIA edge?

The client falls back to direct internet routing for the traffic it would have forwarded. The Compliant network signal is not stamped on those sessions, so any Conditional Access policy requiring it will fail those sign-ins. Build a CA exclusion for verifiable break-glass scenarios (a separate, monitored group).

### Can I use EIA on macOS, iOS, Android, and Linux?

Windows is the most mature client. macOS support is current. iOS and Android coverage is growing — verify against the current [supported clients table](https://learn.microsoft.com/entra/global-secure-access/concept-internet-access) before planning a multi-OS rollout. Linux support is limited at the time of writing.

### How does Compliant network interact with Trusted named locations?

They're separate conditions. A Trusted named location is IP-range based; a Compliant network signal is identity-and-edge based. You can use both in the same CA policy if you want either one to satisfy the condition. Most teams reduce reliance on named locations over time as Compliant network adoption matures.

### Will EIA inspect TLS traffic to non-Microsoft destinations?

Optionally, depending on your TLS inspection configuration. Default behaviour is no TLS interception for non-Microsoft traffic. If you turn it on, plan certificate rollout to clients carefully and audit what gets logged.

## What to take away

Microsoft Entra Internet Access is the first-party SSE for the Microsoft ecosystem. The thing that matters for identity teams is the **Compliant network** signal it gives Conditional Access — that is the real product. Plan rollout as five staged phases (pilot M365 profile, add Internet profile, report-only CA, broader pilot, GA), keep the KQL queries above on a weekly schedule, and treat EIA as additive to Defender for Cloud Apps and your existing endpoint stack rather than as a replacement. Done that way, you end up with a meaningfully tighter Conditional Access posture without a help-desk surge.

## References

- [Global Secure Access overview — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/overview-what-is-global-secure-access)
- [What is Microsoft Entra Internet Access — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/concept-internet-access)
- [Compliant network in Conditional Access — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/how-to-compliant-network)
- [Global Secure Access client for Windows — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/how-to-install-windows-client)
- [Global Secure Access traffic dashboard — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/concept-traffic-dashboard)
- [Microsoft Entra plans and pricing](https://www.microsoft.com/security/business/microsoft-entra-pricing)
