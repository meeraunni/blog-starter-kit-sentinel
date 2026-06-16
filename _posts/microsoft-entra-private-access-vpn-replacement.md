---
title: "Microsoft Entra Private Access: A VPN Replacement Playbook for IT Teams"
excerpt: "Microsoft Entra Private Access (EPA) is Microsoft's ZTNA answer to legacy VPN. This is the practitioner's view: connector deployment, application segments, the rollout sequence that doesn't strand users, and the operational telemetry to watch."
coverImage: "/assets/blog/microsoft-entra-private-access-vpn-replacement/diagram.svg"
date: "2026-06-12T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/microsoft-entra-private-access-vpn-replacement/diagram.svg"
---

## Why VPN replacement is the conversation worth having

Every enterprise has the same conversation. The VPN concentrator is end-of-life, the maintenance contract is up, and somebody has noticed that the entire user base authenticating against a single appliance to reach forty private applications is not a model anyone would design today. The replacement conversation surfaces three options: renew the existing vendor, deploy a third-party ZTNA (Zscaler, Cloudflare, Tailscale, Twingate), or use Microsoft Entra Private Access if you're already deep in the Microsoft ecosystem.

EPA is the path I'll cover here because it has properties that are hard to get elsewhere: identity is the unit of access (no IP allowlists), Conditional Access policies apply directly to private apps (not just SaaS), and the deployment fits in your existing Entra admin surface without a new control plane. The trade-off is that EPA is younger than the established ZTNA vendors and the supported-protocol coverage is still expanding. This article is the operator's guide to deciding when EPA is the right call, deploying it without stranding users, and avoiding the four mistakes that account for most rollout regrets.

The Microsoft references throughout are [What is Microsoft Entra Private Access](https://learn.microsoft.com/entra/global-secure-access/concept-private-access), [Configure connectors](https://learn.microsoft.com/entra/global-secure-access/how-to-configure-connectors), [Quickstart: Configure Quick Access app](https://learn.microsoft.com/entra/global-secure-access/quickstart-configure-quick-access), and [Per-app access](https://learn.microsoft.com/entra/global-secure-access/how-to-access-private-apps).

## What EPA does in one paragraph

EPA gives users access to private (internal) applications without putting them on the corporate network. A lightweight **connector** runs inside your network, makes an outbound connection to the Microsoft service edge, and waits for client requests for a defined set of internal applications. The Global Secure Access (GSA) client on the user's device routes requests for those applications through the Microsoft edge, the edge authenticates and authorises the request against Conditional Access, and only then does the connector relay the traffic to the internal application. The internal app sees the connector as the client. The user never touches the corporate network IP space.

That's it. No inbound firewall rules to the data centre, no client-side IP allowlists, no full-tunnel routing, no broad network access — just per-application connections, each one identity-evaluated.

> [!NOTE]
> The connector's connection to Microsoft is outbound-only. You do not need to publish anything to the internet. This is the security property that makes EPA fundamentally different from a VPN concentrator.

## The three building blocks

EPA has three configurable parts. Get these right and most of the rollout falls into place.

**Connectors** are lightweight Windows Server agents that run inside your private network. Each connector authenticates to Microsoft Entra using a service-side identity (issued during connector setup) and maintains a persistent outbound connection to the service edge. Connectors are deployed in groups; each connector group is associated with a network — typically one group per data centre, one per major office, one per Azure region. Group multiple connectors per location for high availability.

**Application segments** define which internal applications EPA routes. A segment is a logical app entry that maps a name (`hr.contoso.internal`) or IP range (`10.50.0.0/16`) plus port to a connector group. Users target the app by its friendly name; the connector in the right group handles the relay. Segments are what Conditional Access binds against — you grant access to a *segment*, not to a network.

**Quick Access** is a one-click app entry that covers the broad VPN-style use case. It's effectively a single application segment that covers "the corporate intranet" — a defined set of subnets or wildcards. Useful for early pilots and for the long-tail of one-off apps that don't justify their own segment.

## Where EPA fits and where it doesn't

EPA is the right call when:

- Identity-aware access to a defined set of internal apps is the goal.
- The protocol mix is HTTP(S), RDP, SSH, SMB — the supported protocols and growing.
- You want Conditional Access policies (including device compliance, risk, MFA strength) to apply per-app.
- You're already on Microsoft Entra ID P1 or higher, and either have the Microsoft Entra Suite licensed or can add Private Access separately.

EPA is the wrong call when:

- You need broad layer-3 connectivity (some specialised tools require full IP routing into the corporate network — a small list, but real).
- You have a multi-cloud setup where AWS, GCP, and Azure private apps all need uniform access from clients that aren't Entra-managed.
- Connector OS requirements are a problem (currently Windows Server only — there are roadmap items for Linux, verify the current state).

## The pre-deployment inventory

Before touching anything in the admin portal, build a small spreadsheet. It should have:

- Every private application that currently goes over VPN.
- The DNS name(s) and IP(s) each uses.
- The protocol and port set.
- The criticality (P1 / P2 / P3) and the population that uses it.
- The current authentication model (Kerberos? SAML? Forms? IP-allowlist?).
- The expected client OS mix per app.

This inventory is the input to your application segments. You'll thank yourself when the rollout starts producing tickets and you can map "user X can't reach app Y" to "app Y is in connector group Z, which lives in data centre W" in thirty seconds.

> [!TIP]
> The inventory is also where you discover apps that nobody currently uses. EPA migration is a great forcing function for retiring them rather than carrying them forward.

## A rollout sequence that doesn't strand users

The mistake that produces the worst rollouts is cutting users over to EPA while the VPN concentrator is still active and accepting connections. Users hit a problem, fall back to VPN, you can't tell which population is actually on EPA, and the migration drags out for a year. The order below is the one that works.

### Phase 1: Connector deployment and pilot apps

Deploy two connectors in your primary data centre (always two — single-connector deployments break during patching).

```powershell
# On the Windows Server hosting the connector
# 1. Download the connector MSI from the Entra admin centre
# 2. Run silently with your tenant ID and a one-time setup token
msiexec.exe /i GlobalSecureAccessConnector.msi /qn `
    /l*v C:\Logs\connector-install.log
```

After install, the connector registers itself with Entra. Confirm in Entra admin centre → Global Secure Access → Connect → Connectors that the new connector shows as `Active`.

Now define **one** application segment that points at a low-risk internal app — typically an internal status page or test web app that doesn't take you down if it's misconfigured. Test access for a single pilot user with the GSA client installed.

```kql
// Verify EPA traffic is being processed
EnrichedMicrosoft365AuditLogs
| where TimeGenerated > ago(1h)
| where Workload == "MicrosoftGlobalSecureAccess"
| where Category == "PrivateAccess"
| project TimeGenerated, UserPrincipalName, AppDisplayName, Action,
          tostring(ApplicationDetails)
| order by TimeGenerated desc
```

### Phase 2: Pilot expansion

Add the next 5-10 application segments. Pilot 25-50 users. Both the GSA client and the existing VPN client stay installed on the pilot users' machines — you want them to be able to fall back to VPN if EPA has a gap.

Watch the EPA traffic logs daily. Anything unexpected (an app you didn't add a segment for, traffic to an internal IP not covered by any segment) is data you need before scaling.

### Phase 3: Conditional Access integration

Now create Conditional Access policies *targeted at the application segments*. The first policy is usually one of:

- *Require multifactor authentication for access to all private apps.*
- *Require compliant device for access to high-sensitivity private apps.*
- *Block legacy authentication to internal SMB shares.*

Run these in **report-only** for at least 7 days. Watch sign-in logs for unexpected failures. The Conditional Access tab on the sign-in entry tells you which application segment was being targeted.

### Phase 4: VPN deprecation per population

Cut populations off the VPN by group. Start with IT (you wrote the migration, you eat your own dog food), then power users, then department by department. Each cohort:

1. Move them from VPN-allowed to VPN-blocked at the concentrator.
2. Ensure they have the GSA client deployed and connected.
3. Communicate the change with one specific contact channel for "what isn't working."
4. Hold for 1-2 weeks before the next cohort.

> [!WARNING]
> Don't deprecate the VPN entirely until the last cohort has been on EPA for at least 30 days without help-desk volume. The cost of keeping the concentrator alive for an extra month is small compared to a rushed cutover.

## Operational telemetry

A small KQL toolkit keeps the rollout honest.

```kql
// 1. Which apps are most-used through EPA in the last 7 days
EnrichedMicrosoft365AuditLogs
| where TimeGenerated > ago(7d)
| where Workload == "MicrosoftGlobalSecureAccess"
| where Category == "PrivateAccess"
| where Action == "Allowed"
| summarize Sessions = count() by ApplicationName = tostring(ApplicationDetails.name)
| order by Sessions desc
```

```kql
// 2. Failures, broken down by reason — the daily review query
EnrichedMicrosoft365AuditLogs
| where TimeGenerated > ago(24h)
| where Workload == "MicrosoftGlobalSecureAccess"
| where Action != "Allowed"
| summarize Failures = count() by Action, Reason = tostring(Reason)
| order by Failures desc
```

```kql
// 3. Connector health — sessions per connector
EnrichedMicrosoft365AuditLogs
| where TimeGenerated > ago(7d)
| where Workload == "MicrosoftGlobalSecureAccess"
| extend Connector = tostring(ConnectorDetails.name)
| summarize Sessions = count() by Connector
| order by Sessions desc
```

The third query is the one that catches connector imbalance — if 90% of sessions are hitting one connector in a two-connector group, the other is unhealthy or unreachable on the internal network even though Entra reports it as Active.

## The four mistakes to avoid

After enough rollouts, the same four mistakes account for most of the regret.

### Mistake 1: One connector per group

Always deploy at least two connectors per group. Patching, hardware failure, or a Windows update reboot takes a single connector offline, and a single-connector group breaks the application during that window. Two is the minimum; three is appropriate for high-traffic data centres.

### Mistake 2: Overly broad application segments

It's tempting to define an application segment as `10.0.0.0/8` "to cover everything." That works on day one and then makes it impossible to apply per-app Conditional Access later. Define segments at the level you intend to govern — usually per-application or per-cluster.

### Mistake 3: Forgetting DNS

The GSA client on the user's device needs to resolve the internal DNS names to the right virtual IPs that get routed through EPA. The connector then re-resolves against internal DNS. If your DNS suffix list isn't right, the client doesn't know which traffic to route through EPA. The fix is either pushing the right DNS suffix configuration to clients (Intune / Group Policy) or using the Private DNS feature in EPA to publish suffixes globally.

### Mistake 4: Treating VPN deprecation as a single date

A single-date cutover where the VPN concentrator goes offline and EPA is "production starting Monday" is the rollout pattern that produces the worst week of help-desk volume in a year. Stage it.

## Common questions

### Does EPA require a specific license?

Yes — Microsoft Entra Private Access is part of the Microsoft Entra Suite or licensed standalone. Entra ID P1 or P2 alone is not sufficient. Verify on the [Microsoft Entra plans page](https://www.microsoft.com/security/business/microsoft-entra-pricing) for current SKU mapping.

### Can the GSA client coexist with our existing VPN?

In most pilots, yes. The GSA client routes only the traffic that matches its forwarding profile and configured application segments. Other traffic falls through to the host's normal routing, which is what the VPN client uses. Some VPN clients with aggressive full-tunnel configurations require ordering tweaks; test in pilot.

### What protocols does EPA support today?

HTTP/HTTPS, RDP, SSH, SMB are the well-supported scenarios. UDP-based protocols and some legacy thick-client protocols have variable support; verify against the [supported protocols documentation](https://learn.microsoft.com/entra/global-secure-access/concept-private-access) before committing a specific application to EPA.

### How does EPA handle Kerberos auth against internal AD-integrated apps?

EPA passes the SMB / HTTP / RDP session through transparently; the user's Windows token continues to authenticate against the internal app the same way it would over a VPN. The connector does not impersonate or modify the Kerberos exchange.

### What's the failure mode if all connectors in a group are offline?

The application segment becomes unreachable through EPA. The GSA client reports a connection failure for that app. If you have a CA policy requiring access through EPA, users cannot reach the app at all — design the connector group's HA accordingly.

### Can we use EPA from unmanaged personal devices?

Only with the GSA client installed, which is the friction point on personal devices. For the personal-device scenario, most teams use a different pattern (browser-based remote access via Entra Application Proxy for the specific apps that warrant it).

## What to take away

Microsoft Entra Private Access is a credible VPN replacement when you're already on Microsoft Entra and the protocol mix fits. The architecture (outbound-only connector, per-app segments, Conditional Access per segment) is fundamentally cleaner than a VPN concentrator. The rollout pattern that works is staged: connector deploy, pilot apps, CA integration in report-only, population-by-population VPN deprecation. Keep two connectors per group, scope segments at the level you'll govern, fix DNS before users notice, and don't try to cut over in one date. Done that way, you finish the migration with a meaningfully tighter access posture and a smaller security surface than the VPN it replaces.

## References

- [What is Microsoft Entra Private Access — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/concept-private-access)
- [Configure connectors for Global Secure Access — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/how-to-configure-connectors)
- [Quickstart: Configure Quick Access app — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/quickstart-configure-quick-access)
- [Per-app access in Private Access — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/how-to-access-private-apps)
- [Global Secure Access traffic dashboard — Microsoft Learn](https://learn.microsoft.com/entra/global-secure-access/concept-traffic-dashboard)
- [Microsoft Entra plans and pricing](https://www.microsoft.com/security/business/microsoft-entra-pricing)
