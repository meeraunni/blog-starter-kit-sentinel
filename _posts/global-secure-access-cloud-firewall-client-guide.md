---
title: "Global Secure Access Cloud Firewall: Safe Admin Guide"
excerpt: "Deploy Global Secure Access cloud firewall for clients safely: align traffic acquisition, rule priority, security profiles, logs, rollback, and preview limits."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-08T17:04:22-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

You create a Block rule, connect a test device, and the destination still opens. That does not immediately mean the firewall is broken. The connection might never have entered Microsoft Entra Internet Access, the rule might still be disabled, or a higher-priority security profile might have selected a different firewall policy.

**Global Secure Access cloud firewall** for client traffic is a **public preview** that applies Allow or Block rules to outbound connections acquired from supported Global Secure Access clients. A working deployment has four linked decisions: the Internet Access profile acquires the connection, a firewall rule matches it, a security profile contains the firewall policy, and Conditional Access assigns that profile to the intended user. ([Microsoft's client cloud firewall procedure](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients), [November 2026 Microsoft Entra release announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-november-2026/4556457), [Global Secure Access product announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/global-secure-access-private-access-and-internet-access-in-one-offering/4569098))

Grab a coffee before treating it like a traditional perimeter firewall. The policy-level default is **Allow**, Conditional Access report-only mode does not enforce the firewall, and an FQDN rule alone does not block a direct-IP connection when no destination name is available at the firewall decision. The safe rollout proves acquisition and enforcement separately, uses a narrow pilot, and keeps a rule-disable rollback ready.

> **Documentation boundary:** this guide is based on Microsoft's public preview documentation current on November 8, 2026. No tenant, client, policy, or network path was changed for this article, and no hands-on behavior is claimed. Preview behavior can change; validate the current Learn pages and supported client before production use.

## Global Secure Access cloud firewall: the short answer

Use this sequence for client traffic:

1. Enable and scope the **Internet Access** traffic forwarding profile.
2. Confirm its acquisition rules cover the destination, port, and protocol you intend to control.
3. Create a cloud firewall policy with narrowly defined Allow or Block rules.
4. Link that firewall policy to a security profile.
5. Assign the profile to a small pilot group through a Conditional Access policy targeting **All internet resources with Global Secure Access**.
6. Create a new test connection and correlate the result with **Global Secure Access > Monitor > Traffic logs > Connections**.

The core troubleshooting rule is simple: **a firewall rule cannot evaluate traffic the Internet Access profile did not acquire**. Microsoft's current Internet Access profile documentation says Default Acquire covers TCP ports 80 and 443. Nonstandard TCP ports and UDP require matching Custom Acquire coverage. A firewall rule does not create that coverage. ([Internet Access profile and acquisition rules](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile))

This guide focuses on Global Secure Access **client** traffic. Microsoft's [separate remote-network cloud firewall procedure](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall) uses a different delivery model for branch traffic; do not copy its baseline-profile or FQDN limitations into a client change without checking the client-specific page.

## Separate traffic acquisition from firewall enforcement

Think of the data path as two control planes followed by one evidence plane.

**Acquisition asks whether the connection enters the service.** The Internet Access profile evaluates bypass and acquire policies. Custom Bypass and Microsoft's Default Bypass can keep traffic out. Custom Acquire can include named or IP destinations on selected TCP or UDP ports. Default Acquire covers TCP 80 and 443 after higher-precedence bypass and custom rules. Private Access routing takes precedence over Internet Access, so traffic already routed through Private Access is not evaluated by Internet Access cloud firewall rules. ([traffic acquisition behavior](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile#internet-access-traffic-forwarding-profile-policies))

**Cloud firewall asks what to do with acquired traffic.** The policy matches the configured source and destination information, ports, and protocol. Conditions configured in one rule are logically ANDed, and a lower priority number evaluates before a higher number. New rules start with action Allow and status Disabled, so record both fields rather than assuming that a saved rule is active. The policy default action is Allow and cannot be turned into an implicit deny in the documented client preview. ([rule planning and behavior](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients#plan-your-firewall-rules))

**Connection logs show the observed decision.** A successful application response proves reachability; it does not prove which control path allowed it. A timeout proves failure; it does not prove a firewall Block. Microsoft directs administrators to correlate the connection's time, destination, port, protocol, action, security profile, firewall policy, and rule where those fields are available. ([cloud firewall verification](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients#verify-the-configuration))

That separation prevents the most common false diagnosis: editing firewall priorities when the missing layer is acquisition.

## Know which Global Secure Access control you need

Cloud firewall and the other Internet Access controls answer different questions.

**Use cloud firewall** when the decision is based on an outbound connection's destination, port, and protocol. Examples include blocking acquired UDP 443 for selected destinations or restricting a nonstandard TCP service for a pilot population.

**Use web filtering** when the decision is about a website, domain, URL, or web category. The site's [Microsoft Entra Internet Access overview](/posts/microsoft-entra-internet-access-overview) explains how the Secure Web Gateway, forwarding profiles, security profiles, and Conditional Access fit together.

**Use content policy** when the decision is about an upload or download activity and supported file type or content inspection. That path has different TLS inspection and content-processing prerequisites; see the [Internet Access content policy runbook](/posts/microsoft-entra-internet-access-content-policy).

**Use Private Access application segments** when the destination is a private corporate resource. Internet Access cloud firewall is not the repair for a Quick Access segment, connector, or private-routing failure.

> [!IMPORTANT]
> **Analysis:** write the desired outcome as one sentence before creating any object: “Block protocol X on port Y to destination Z for pilot group G.” If the sentence needs a URL path, file type, malware verdict, or private application name, cloud firewall is probably not the only—or the correct—control.

## Pass the preview, role, license, and client gates

Microsoft's client procedure lists these prerequisites:

- Global Secure Access Administrator for the Global Secure Access configuration;
- Conditional Access Administrator for the policy that assigns a security profile;
- Microsoft Entra Internet Access licensing;
- an enabled Internet Access profile whose acquisition rules cover the intended traffic; and
- a supported Global Secure Access client on the protected devices.

Microsoft's licensing overview says Internet Access is available standalone or through Microsoft Entra Suite, and users also need Microsoft Entra ID P1 or P2. Most Global Secure Access services use per-user licensing unless Microsoft states otherwise. Recheck the tenant's agreement rather than inferring entitlement from a visible portal blade. ([Global Secure Access licensing overview](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview))

The site's [Global Secure Access licensing guide](/posts/microsoft-entra-global-secure-access-licensing) covers workforce, guest, branch, and prerequisite boundaries in more depth.

Build the pilot record before creating the policy:

- pilot users, devices, operating systems, and client versions;
- effective Internet Access profile and its user/group assignment;
- relevant Custom Bypass, Default Bypass, Custom Acquire, and Default Acquire behavior;
- destination FQDN and resolved IPv4 addresses;
- source and destination ports plus TCP or UDP;
- proposed firewall policy, rule priorities, and enabled states;
- security profile priority and Conditional Access policy scope;
- one expected Block, one expected Allow, and one unrelated control connection;
- owner, test window, support route, and rollback decision; and
- baseline client diagnostics and connection-log evidence.

Do not use a production service you do not control as a synthetic Block target. An application outage, rate limit, or protocol fallback can produce the same user-visible symptom as enforcement.

## Build a narrow pilot firewall policy

In **Microsoft Entra admin center > Global Secure Access > Secure > Cloud firewall policies**, create a policy with a name and description tied to the change record. Review the documented default Allow action. Add rules only after the destination and protocol evidence is complete.

For each rule, record:

- a unique priority, with lower numbers evaluated first;
- the exact source and destination conditions that are required;
- the destination port or bounded port range;
- TCP, UDP, or the explicitly intended protocol selection;
- Allow or Block; and
- Enabled or Disabled.

Configured conditions in the same rule must all match. If the rule specifies both destination FQDN and port, a connection with the right name on a different port does not match. If an overlapping higher-priority Allow rule matches first, enabling a lower-priority Block rule does not override it. ([rule matching and priority](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients#add-firewall-rules))

Start with the rule disabled. This is not a simulation mode; it is a control-plane staging step. Review the complete priority order, then enable the narrow rule only during the approved pilot window.

### Treat FQDN and direct-IP traffic as separate tests

Microsoft warns that FQDN rules depend on a destination name being available when the firewall makes its decision. A direct-IP connection with no associated FQDN does not match that hostname rule. Learning a name later from TLS Server Name Indication does not cause the earlier firewall decision to run again. If policy requires direct-IP blocking, design and test the applicable IP restriction rather than claiming the FQDN rule covers both paths. ([FQDN matching boundary](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients#fqdn-matching-and-direct-ip-connections))

Also record address-family coverage. Microsoft's documented examples cover IPv4, and `0.0.0.0/0` acquisition does not include IPv6. Do not write “all internet traffic” in the change record when the test and configuration prove only IPv4.

### Do not turn wildcard acquisition into an accidental full tunnel

Custom Acquire supports `*` for FQDNs and `0.0.0.0/0` for IPv4 in the preview. Microsoft also says DNS acquisition is not supported, bypass rules still win, and Private Access retains routing precedence. Broad acquisition can change far more application traffic than the firewall rule you meant to test. ([wildcard acquisition preview](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile#acquire-traffic-with-wildcard-destinations-preview))

Prefer the smallest destination, port, and protocol set that can prove the use case. If broad acquisition is genuinely required, treat it as a separate architecture and performance change with its own regression matrix.

## Deliver the firewall through a security profile

Creating the firewall policy does not assign it to users.

1. Open **Global Secure Access > Secure > Security profiles**.
2. Create or select the pilot profile.
3. Link the existing cloud firewall policy, enable the link, and save.
4. Review the security profile's priority against every profile that can apply to the pilot.
5. Create a Conditional Access policy for the dedicated pilot group.
6. Target **All internet resources with Global Secure Access**.
7. Under Session, select **Use Global Secure Access security profile** and choose the pilot profile.
8. Exclude emergency access identities according to the tenant's approved Conditional Access standard, then enable only when the pilot is ready.

Microsoft documents an important evaluation boundary: cloud firewall uses the firewall policy from **one selected security profile** rather than combining firewall policies from all matching profiles. The highest-priority applicable profile has the lowest priority number, and that firewall policy's default action is terminal. If no applicable profile contains a firewall policy, cloud firewall uses the baseline profile. ([security profile selection](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients#understand-security-profile-selection))

That model is different from assuming that every matching Conditional Access policy contributes another firewall rule set. Before enforcement, draw the applicable profiles in priority order and identify the single firewall policy expected to win.

Conditional Access report-only mode is useful for understanding Conditional Access scope, but Microsoft explicitly says it **does not enforce** the firewall configuration. Use a tightly scoped pilot policy set to On when testing the actual network decision. The [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) helps when the user or session did not match the delivery policy you expected.

## Validate the decision with connection logs

Run a small matrix with new connections after the configuration reaches the client:

**Expected Block:** connect to the exact destination, port, and protocol covered by the enabled Block rule. Preserve the user-visible result and matching connection record.

**Expected Allow:** use the same controlled destination on a different explicitly allowed port or a separate approved control destination. This proves the service path still works.

**Out-of-scope control:** use an unrelated destination or protocol. Its behavior should remain unchanged unless another policy applies.

**Direct-IP control:** when the rule uses an FQDN, repeat the test against the resolved IP only if the service safely supports it. Record that this is a separate matching path.

**Non-pilot control:** repeat with a user outside the pilot to confirm Conditional Access targeting did not expand unexpectedly.

For Windows client traffic, Microsoft recommends Advanced diagnostics to confirm acquisition. In the admin center, open **Global Secure Access > Monitor > Traffic logs > Connections** and filter by the test time, user, destination, port, and protocol. Connection logs aggregate related transactions and expose Allowed or Denied action plus policy context used for troubleshooting. Traffic logs remain preview. ([Global Secure Access traffic logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs))

For UDP, use an application-level request that returns a verifiable response when allowed. A timeout alone cannot distinguish firewall enforcement from an unresponsive service, return-path problem, or unsupported application behavior.

Preserve administrative evidence too. Global Secure Access changes appear in Microsoft Entra audit logs, available under **Global Secure Access > Monitor > Audit logs** or Entra monitoring with the Global Secure Access service filter. Keep the before-and-after policy state, actor, timestamp, and change record with the connection evidence. ([Global Secure Access audit logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-access-audit-logs))

## Troubleshoot the first broken boundary

### The destination is unaffected

Confirm the client is connected and received the expected Internet Access profile. Verify that no Custom or Default Bypass rule excludes the traffic. Then prove an acquire rule covers the exact destination, port, and protocol. Only after acquisition is established should you check rule status, rule priority, policy link state, security profile priority, and Conditional Access assignment.

### TCP 443 works, but another port or UDP does not

Default Acquire covers TCP 80 and 443, not every protocol on those port numbers. Add only the required Custom Acquire coverage and retest. A cloud firewall UDP rule does not make the client acquire UDP.

### The log names a different firewall rule

Review overlapping rules and lower-number priorities. Confirm that every condition in the named rule matches the observed connection. Do not move the intended Block to priority 1 merely to “make it win”; correct the overlap and preserve space for future rules.

### The FQDN is blocked, but its IP is reachable

Check whether the direct-IP connection had a destination name available when the decision occurred. Microsoft documents that a later SNI name does not rerun firewall evaluation. Use an applicable IP rule if the requirement includes direct-IP access, and test address changes operationally rather than pinning a volatile SaaS IP without an owner.

### QUIC fails even though UDP 443 is allowed

Confirm the traffic is acquired and inspect the logged firewall action. Microsoft says the preview supports acquisition and blocking for QUIC traffic on UDP 443, but **not end-to-end QUIC forwarding**. An Allow rule cannot turn an unsupported forwarding path into a supported one. ([QUIC preview boundary](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients#control-quic-traffic-on-udp-port-443))

### DNS traffic does not appear in the firewall evidence

That is a documented preview limitation. The Internet Access profile does not acquire DNS traffic in this preview, including with wildcard acquisition, and cloud firewall does not filter DNS queries. FQDN matching applies to a connection decision; it is not DNS filtering.

## Roll out and roll back without widening the blast radius

Expand only after the pilot proves both enforcement and non-impact.

- **Ring 0:** identity, network, endpoint, security, application, and support owners agree on the matching requirement and rollback.
- **Ring 1:** a small technical pilot proves acquisition, firewall selection, Block, Allow, direct-IP behavior, logs, and unrelated traffic.
- **Ring 2:** a representative business group tests real protocols, roaming networks, application fallbacks, and support messaging.
- **Ring 3:** measured expansion proceeds only while connection decisions, false positives, bypass changes, and client health remain within the approved threshold.

The narrow rollback is to set the failing firewall rule to **Disabled** and confirm a new connection follows the documented default or next matching rule. If the policy selection is wrong, disable the firewall-policy link or remove the pilot Conditional Access assignment according to the change record. Preserve the object and evidence long enough to understand the failure.

Do not disable the entire Internet Access profile, add an all-destinations bypass, uninstall clients, or delete the policy to repair one bad rule. Those actions alter a much larger data path and discard useful evidence.

For longer investigation and alerting, Microsoft supports exporting `NetworkAccessTrafficLogs` through Entra diagnostic settings to Log Analytics, storage, Event Hubs, or a partner solution. Treat the export and its retention as a separate logging decision with the required roles and cost review. ([traffic-log diagnostic settings](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs#configure-diagnostic-settings-to-export-logs))

## Global Secure Access cloud firewall checklist

- [ ] Define the exact destination, port, protocol, action, and pilot population.
- [ ] Confirm the client capability remains public preview.
- [ ] Validate Internet Access plus Entra ID P1/P2 licensing for the pilot.
- [ ] Assign Global Secure Access and Conditional Access roles through the approved process.
- [ ] Record the effective Internet Access profile and bypass/acquire rules.
- [ ] Prove acquisition covers the intended traffic before editing firewall rules.
- [ ] Create uniquely prioritized rules and verify action plus enabled state.
- [ ] Test FQDN and direct-IP paths as separate matching cases.
- [ ] Link the firewall policy to the intended security profile.
- [ ] Prove which single firewall policy wins profile selection.
- [ ] Assign only the dedicated pilot through an enabled Conditional Access policy.
- [ ] Test expected Block, expected Allow, unrelated, and non-pilot controls.
- [ ] Correlate each result with client diagnostics and a connection-log decision.
- [ ] Preserve Global Secure Access audit evidence for the change.
- [ ] Document DNS, IPv6, FQDN, and QUIC preview boundaries.
- [ ] Keep a rule-disable rollback ready before expanding.

## FAQ

### Is Global Secure Access cloud firewall for clients generally available?

No. Microsoft's November 2026 announcement and client configuration page identify client cloud firewall as public preview. Internet Access as a product is generally available, but that does not make every capability inside it GA.

### Does a cloud firewall rule automatically capture the traffic?

No. The Internet Access profile's acquisition rules decide which traffic enters the service. The firewall evaluates acquired traffic. Confirm both layers.

### Can I use Conditional Access report-only mode to test a Block rule?

Not for actual firewall enforcement. Microsoft states that a report-only Conditional Access policy does not enforce the cloud firewall configuration. Use a narrowly scoped enabled pilot and controlled destinations.

### Does an FQDN Block also stop the destination's IP address?

Not necessarily. If the direct-IP connection has no FQDN available at the firewall decision, the hostname rule does not match it. Add and validate the appropriate IP restriction when the requirement includes direct-IP access.

### Can the preview filter DNS traffic?

No. Microsoft says the Internet Access profile does not acquire DNS traffic in this preview, and cloud firewall does not filter DNS queries.

### What is the safest rollback?

Disable the narrow failing rule, create a new connection, and verify the connection log. If delivery rather than rule logic is wrong, disable the firewall-policy link or remove the pilot assignment according to the approved change record. Avoid broad bypasses or disabling the whole traffic profile.

## Microsoft primary sources

- [Configure cloud firewall for Global Secure Access clients](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-cloud-firewall-clients)
- [Manage the Internet Access traffic forwarding profile](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile)
- [What is Global Secure Access?](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access)
- [Use Global Secure Access traffic logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs)
- [Access Global Secure Access audit logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-access-audit-logs)
- [What's new in Microsoft Entra: November 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-november-2026/4556457)
- [Global Secure Access: Private and Internet Access in one offering](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/global-secure-access-private-access-and-internet-access-in-one-offering/4569098)
