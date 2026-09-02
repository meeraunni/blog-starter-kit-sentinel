---
title: "Microsoft Entra MCP Firewall: Safe Deployment Guide"
excerpt: "Pilot Microsoft Entra MCP Firewall safely: map supported traffic, configure TLS inspection and Conditional Access, validate logs, and plan rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-02T17:04:36-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The Microsoft Entra MCP firewall is a **public-preview** Global Secure Access control for allowing or blocking Model Context Protocol traffic by remote server, primitive, method, protocol version, and transport. It is not automatically enabled, it does not inspect every MCP connection, and Microsoft has not published a general-availability date or mandatory-enforcement schedule.

The safe way to deploy it is to route a small pilot through Microsoft Entra Internet Access, enable TLS inspection, observe real MCP traffic, create a narrowly scoped MCP policy, link that policy to a security profile, and deliver the profile to the pilot with Conditional Access. Then prove both the allowed and blocked paths in the traffic and MCP logs before expanding.

Microsoft placed the feature under **New in Public Preview** in [What's new in Microsoft Entra for September 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-september-2026/4545179). The [current Microsoft Entra MCP firewall configuration guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-mcp-firewall) also labels it preview and describes an administrator-created enforcement chain. In other words, this is a controlled pilot, not a default-on tenant change. Grab a coffee; the policy itself is the easy bit. Traffic acquisition, certificate trust, policy delivery, evidence, and privacy are where the deployment succeeds or quietly fails.

## How the Microsoft Entra MCP firewall enforces traffic

The firewall sits in the Global Secure Access data path rather than inside an MCP client or server. For the documented end-user-device scenario, the control plane and data plane line up like this:

1. The **Internet Access traffic forwarding profile** assigns a pilot user and tells the Global Secure Access client which outbound internet traffic to acquire.
2. The client tunnels acquired traffic to Microsoft's Security Service Edge.
3. **TLS inspection** decrypts supported HTTPS traffic at the service edge, applies inspection, and re-encrypts it for the destination.
4. The MCP policy evaluates the server and any configured MCP conditions, then returns an Allow or Block decision.
5. A **security profile** contains the linked MCP policy.
6. A **Conditional Access policy** targeting **All internet resources with Global Secure Access** delivers that security profile to the selected user or group.
7. Traffic logs record the network decision, while **Generative AI Insights** records supported MCP protocol activity.

Microsoft's [Internet Access forwarding tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-enable-traffic-forwarding) confirms that the forwarding profile is what sends assigned users' internet traffic through the service edge, where security profiles are enforced. The site's broader [Microsoft Entra Internet Access rollout guide](/posts/microsoft-entra-internet-access-overview) explains that SSE foundation; this article stays focused on the MCP layer.

This architecture matters because an MCP policy object existing in the portal proves almost nothing by itself. Enforcement requires the acquired traffic, inspection, linked security profile, Conditional Access delivery, and an in-scope protocol flow to meet at the same time.

The firewall does not replace identity authorization at the remote server. OAuth scopes, server-side permissions, credentials, application consent, and tool-specific authorization still decide what the caller may do after the network permits a connection. The site's [Microsoft Entra agent identity security architecture](/posts/microsoft-entra-agent-id-security-architecture-conditional-access-governance) covers those identity and governance planes. Treat the MCP firewall as another boundary, not as proof that a permitted server or tool is safe.

## Confirm the supported MCP traffic before you design policy

Microsoft currently documents four important boundaries in the [MCP firewall known limitations](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-mcp-firewall#known-limitations):

- The firewall inspects JSON-RPC 2.0 over **streamable HTTP** and **Server-Sent Events**.
- It inspects **remote MCP servers**, not local servers running on the device.
- It does not inspect MCP over `stdio` or other non-HTTP transports.
- It does not inspect JSON-RPC batches.

Build the pilot inventory around those boundaries. For each client or agent, record its owner, device, user or workload identity, remote server URL, transport, protocol version, authentication method, exposed tools/resources/prompts, expected data classes, and business purpose. Mark local `stdio` servers and batched calls as uncovered rather than recording them as false negatives later.

Server and client names are useful labels but weak identifiers. Microsoft's [MCP traffic logging reference](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-model-context-protocol-logging) says those names can be missing or change and identifies the destination URL as the reliable server identifier. Use canonical HTTPS URLs in your allowlist and ownership register, and include redirects, regional endpoints, and alternate hostnames in the test plan.

Do not start with “block every MCP connection” simply because that is technically available. First answer three questions:

- Which MCP flows actually cross the Global Secure Access path?
- Which remote servers and primitives are business-approved?
- Which traffic is invisible because of transport, local execution, TLS bypass, or missing client assignment?

A deny-by-default policy is only as good as the inventory feeding it. Unknown-but-invisible traffic is not denied; it is outside this control.

## Meet the licensing, role, client, and certificate gates

The feature page requires a valid **Microsoft Entra Internet Access** license. Microsoft's [Global Secure Access licensing overview](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview) says Internet Access is included in the Microsoft Entra Suite or sold standalone, and that users of Microsoft Entra Internet Access also need Microsoft Entra ID P1 or P2. Validate the assigned pilot users against both requirements rather than assuming an Entra ID premium license alone enables the firewall.

Separate duties before configuration:

- **Global Secure Access Administrator** configures the forwarding, TLS inspection, MCP policy, and security-profile elements.
- **Conditional Access Administrator** creates the Conditional Access delivery policy.
- At least **Reports Reader** can review Global Secure Access traffic logs.
- At least **Security Reader** can review MCP activity in Generative AI Insights.

Those roles come from the live MCP configuration guide. Use PIM-eligible, time-bound administration where your tenant supports it; do not leave a broad standing role merely because the pilot crosses several portals.

For the documented device path, install the Global Secure Access client on a Microsoft Entra joined or hybrid joined device. Microsoft's configuration procedure supports Windows and macOS for the initial client setup. Confirm the client shows Internet Access rules under **Advanced Diagnostics > Forwarding Profile** before debugging MCP policy.

TLS inspection is a hard dependency for this path because MCP messages are inside encrypted HTTPS payloads. The [Microsoft Entra TLS inspection tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection) documents the two TLS connections: the client connects to Microsoft's service edge, the edge connects separately to the destination, and the edge decrypts, inspects, then re-encrypts traffic with a leaf certificate chaining to the enterprise CA.

That makes certificate distribution a production gate. The pilot device must trust the uploaded root chain, the TLS termination certificate must be active, and privacy-sensitive or technically incompatible destinations may match generated bypass rules. If the MCP destination is bypassed, the connection can still work while the MCP firewall sees nothing.

Microsoft documents a separate Copilot Studio integration path that can log MCP traffic without endpoint TLS inspection. Do not generalize that exception to ordinary end-user MCP clients or other agents; the standard client-mediated path still requires Internet Access forwarding and TLS inspection.

## Pilot the Microsoft Entra MCP firewall in five rings

### Ring 0: write the evidence and recovery plan

Choose one or two noncritical operators on managed devices and a harmless test MCP server. Do not use a production automation capable of deleting records, sending messages, changing infrastructure, moving money, or exposing regulated data as your first enforcement test.

Record the pilot group object ID, client versions, device join state, forwarding-profile assignment, CA policy name and state, TLS inspection policy and certificate expiry, security profile, MCP policy, server URLs, approved primitives, owner, test cases, expected log destinations, and recovery owner.

Keep emergency administration identities out of the pilot. The [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) is useful here: user scope, target resource, conditions, grant controls, and session controls all have to resolve as intended. An exclusion that is too broad defeats the control; no exclusion at all can make recovery unnecessarily hard.

### Ring 1: acquire and observe before blocking

Enable the Internet Access profile for the pilot group, distribute the Global Secure Access client, and confirm that Internet Access rules are present. Microsoft says profile changes are checked automatically by the client every five minutes; the MCP setup guide separately warns that initial profile configuration can take up to 15 minutes to appear.

Enable TLS inspection only for the pilot security profile and verify certificate trust on a non-Microsoft HTTPS destination. Then generate benign MCP discovery and tool-call traffic. In **Global Secure Access > Monitor > Generative AI Insights**, filter Activity to **MCP** and confirm the destination URL, session, event type, method, and primitive are visible.

This is also the privacy gate. Microsoft's logging reference says the `Content` field can include the MCP payload, including tool names and tool input arguments. Decide which security and privacy teams may read that content, where it may be exported, how long it is retained, and what secrets or personal data must never be placed in test prompts. Logging is not harmless simply because it is read-only.

### Ring 2: create one narrow enforcement rule

Create the MCP policy under **Global Secure Access > Secure > MCP policies (Preview)**. Give it an owner, purpose, change ticket, and expiry review in the description.

For the first enforcement test, keep the default action **Allow** and block one harmless test tool on one known server. Microsoft supports matching a server URL, discovered or manually entered Tool/Resource/Prompt primitives, MCP method, protocol version, transport, and protected-resource metadata. A single-tool block proves primitive inspection without turning every unknown inventory gap into an outage.

After that test works, create a separate deny-by-default pilot policy with a short allowlist of approved remote servers. Do not convert the first policy in place if doing so would erase the clean comparison between the two test stages.

Policy priority matters. Record the expected match and decision for every test rather than assuming a visually higher rule wins. Also capture the exact primitive configuration when you create it: Microsoft currently warns that configured tool, resource, and prompt details are not rendered in the portal when rules are retrieved later, although they can be verified with Microsoft Graph. That preview limitation is a change-control risk, not cosmetic polish.

### Ring 3: link and deliver the policy

Link the MCP policy to the pilot security profile. Then create a Conditional Access policy for only the pilot group, set the target to **All internet resources with Global Secure Access**, and choose **Use Global Secure Access Security Profile** under Session with the pilot profile selected.

Microsoft says the security profile can take up to an hour to take effect after Conditional Access assigns it. Separate propagation from troubleshooting: record the save time, client profile refresh time, first observed enforcement time, and test time in UTC.

Before expanding, verify that the same pilot identity is in all three relevant scopes:

- the Internet Access traffic-forwarding assignment;
- the TLS inspection and MCP security profile delivered by Conditional Access; and
- the test on a joined device running the client.

A mismatch between those scopes is the most likely reason for “the rule exists, but nothing happens.”

### Ring 4: prove the decision matrix

Run at least these tests from the same pilot device and identity:

- approved server and approved tool: allowed and logged;
- approved server and blocked tool: blocked and logged;
- unapproved remote server under the deny-default policy: blocked and logged;
- ordinary non-MCP HTTPS destination: unaffected except for the planned TLS inspection behavior;
- local `stdio` MCP server: explicitly recorded as outside firewall visibility;
- one server URL variation or redirect: result captured rather than assumed;
- client disconnected or forwarding rules missing: expected loss of this enforcement path documented.

Use **Traffic logs** to verify the network-level allow/block result and **Generative AI Insights** to verify the MCP session and operation. The protocol-generated Event ID correlates request and response; the Session ID groups activity; and the Global Secure Access Transaction ID connects the MCP event to the network traffic record.

### Ring 5: expand by failure domain

Expand one client platform, network path, server owner, and data classification at a time. A suitable ring is the number of endpoints and agents the team can restore to a known-good routing and policy state during the change window, not the number of users the assignment picker accepts.

For longer retention and cross-signal investigation, Microsoft's [Global Secure Access Sentinel integration](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-sentinel-integration) can stream `NetworkAccessTrafficLogs` to `NetworkAccessTraffic` and `NetworkAccessGenerativeAIInsights` to the table of the same name. Microsoft also provides an MCP Servers Dashboard in the Global Secure Access content package. Validate ingestion with a known pilot event before relying on the workbook during an incident.

## Build rollback into every policy change

Microsoft's current preview configuration article does not document automatic rollback. Your change plan therefore needs a tested way to stop enforcement without dismantling the entire Internet Access deployment.

**Analysis:** the smallest useful recovery action is the one that removes the faulty decision while preserving evidence. Depending on what failed, that can mean returning the affected MCP rule to Allow, unlinking the MCP policy from the pilot security profile, or removing only the pilot assignment that delivers that profile. Keep the traffic and MCP logs intact long enough to understand the false positive.

Do not disable TLS inspection tenant-wide to fix one misclassified tool. Do not bypass a whole server if a single primitive is wrong. And do not add an emergency identity to an allowlist intended for business traffic; emergency access belongs outside the pilot scope.

After recovery, prove that the previously blocked business operation works, capture the new policy state, and open a preview-feature support case if the portal state and observed decision disagree.

## Troubleshoot MCP firewall failures by layer

### No MCP events appear

First confirm whether the traffic is supportable: remote server, streamable HTTP or Server-Sent Events, and not a JSON-RPC batch. Local `stdio` traffic is expected to be absent.

Then check the pilot user's forwarding assignment, the client Advanced Diagnostics forwarding rules, device join, TLS certificate trust, active TLS inspection policy, and destination bypass rules. A successful direct connection proves the server is reachable; it does not prove Global Secure Access acquired or decrypted it.

### Events appear, but the rule is not enforced

Confirm the MCP policy is linked to the intended security profile and that Conditional Access delivers that exact profile to the pilot for **All internet resources with Global Secure Access**. Allow for the documented propagation interval, then compare the destination URL, method, protocol version, transport, and primitive name with the rule.

Check whether the client sent a JSON-RPC batch or used a redirect/alternate hostname outside the rule. Preserve the Traffic log transaction and related MCP event rather than repeatedly editing the policy without evidence.

### More traffic is blocked than expected

Review the default action, rule priority, server URL patterns, and any manually entered primitive. Test the server connection separately from the tool call so you can tell a server-level deny from a primitive-level deny. If the portal no longer displays the configured primitive detail, use the Microsoft-documented Graph verification path or escalate with the policy identifier; do not guess what the saved rule contains.

### TLS inspection breaks the destination

Confirm the device trusts the enterprise root chain and inspect the presented certificate. Certificate pinning, mutual TLS, and privacy-sensitive categories can require bypass treatment according to the TLS inspection guide. A bypass restores connectivity by removing decryption, but it also removes MCP inspection for that flow. Record that residual risk and choose a different compensating control; never report the firewall as covering bypassed traffic.

### Logs exist but cannot support investigation

Verify reader roles, diagnostic settings, workspace selection, ingestion timing, and the presence of both the network and Generative AI tables. Keep UTC timestamps, user principal name, destination URL, Event ID, Session ID, Transaction ID, CA policy, security profile, MCP policy and rule, action, client version, transport, and a redacted payload sample.

Do not paste unredacted tool arguments into support tickets. The arguments can contain secrets, record identifiers, prompts, or personal data even when the tool invocation itself looked routine.

## Microsoft Entra MCP firewall administrator checklist

- [ ] Confirm the Microsoft release post and configuration page still label the firewall public preview.
- [ ] Verify Microsoft has not published a GA date, default-on change, or mandatory-enforcement deadline.
- [ ] License pilot users for Microsoft Entra Internet Access and the required Entra ID P1 or P2 foundation.
- [ ] Separate Global Secure Access, Conditional Access, and log-reader duties.
- [ ] Inventory client, identity, device, server URL, transport, protocol version, primitives, owner, and data class.
- [ ] Mark local `stdio`, non-HTTP, and JSON-RPC batch traffic as unsupported.
- [ ] Enable Internet Access forwarding for a small pilot and verify client rules.
- [ ] Deploy and validate TLS inspection certificate trust before MCP enforcement.
- [ ] Review TLS bypasses and document every MCP destination they exclude from inspection.
- [ ] Observe benign MCP events and approve log-content access and retention.
- [ ] Start with one narrow block rule, then test a separate deny-default allowlist policy.
- [ ] Link the MCP policy to the intended security profile.
- [ ] Deliver that profile through Conditional Access only to the pilot group.
- [ ] Test allowed, blocked, redirected, unsupported, and disconnected-client paths.
- [ ] Correlate Traffic logs with MCP Event, Session, and Transaction IDs.
- [ ] Stream validated events to Sentinel if long-term investigation requires it.
- [ ] Test the smallest rollback action and preserve evidence after recovery.
- [ ] Expand by client platform, network path, server owner, and data classification.

The Microsoft Entra MCP firewall gives administrators a useful new network enforcement point for remote MCP traffic, but its security value depends on honest scope accounting. Pilot it as a preview control: acquire the right traffic, inspect it with trusted certificates, deliver policy to a tiny group, prove the decision in both log planes, and label every local or unsupported flow outside the boundary. That produces a defensible control instead of a reassuring policy object that may never see the traffic it was meant to govern.
