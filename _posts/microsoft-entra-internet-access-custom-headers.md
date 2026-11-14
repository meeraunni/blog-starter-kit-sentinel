---
title: "Microsoft Entra Internet Access Custom Headers Guide"
excerpt: "Deploy Microsoft Entra Internet Access custom headers safely: align TLS inspection, Web Filtering v2, SaaS IDs, security profiles, logs, and rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-14T09:26:53-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The security team wants one approved SaaS workspace, the browser still reaches every workspace, and the first instinct is to add another block rule. That can solve the wrong problem. If the SaaS provider supports a tenant-restriction header, Microsoft Entra Internet Access can add the provider's required header to selected outbound requests at the service edge.

**Microsoft Entra Internet Access custom headers** are now generally available. The control lives in a **Web Filtering v2** rule, requires TLS inspection for HTTPS destinations, and reaches users through a Global Secure Access security profile. The destination SaaS service, not Microsoft Entra, interprets the header and decides which tenant, organization, or workspace to allow. ([November 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-november-2026/4556457), [Microsoft's custom-header procedure](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers))

Grab a coffee before copying an FQDN list into production. A saved header rule proves very little by itself. Internet Access must acquire the request, TLS inspection must cover the destination, the correct v2 rule must match, Conditional Access must deliver the security profile, and the SaaS provider must recognize the exact header name and value. This guide keeps those decisions separate so that a failed pilot does not become a broad filtering exception.

> **Documentation boundary:** this article is based on Microsoft's public documentation current on November 14, 2026. No tenant, certificate, policy, client, SaaS workspace, or network path was changed or tested for this article. Provider header names, values, and destination lists can change, so confirm them in the destination service's current documentation before rollout.

## Microsoft Entra Internet Access custom headers: the short answer

Use this sequence for a controlled deployment:

1. Confirm the SaaS provider supports header-based tenant or workspace restrictions and record its current header name, value format, and required destinations.
2. Onboard and license the pilot for Microsoft Entra Internet Access, then prove that its traffic is acquired.
3. Configure TLS inspection for the selected HTTPS destinations and confirm the pilot device trusts the TLS root.
4. Add an **Allow** rule with custom headers to a Web Filtering v2 policy.
5. Link that v2 policy to a pilot security profile and assign the profile through Conditional Access.
6. Wait for the new profile claim to propagate, then verify the header modification in transaction logs and test both the approved and unapproved SaaS paths.

Microsoft says a new security profile can take **60 to 90 minutes** to take effect because the user needs a new Internet Access token containing the profile claim. A change to an existing security profile is documented as near real-time. Treat that difference as part of the test plan, not as evidence that the rule is broken. ([custom-header policy delivery](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#link-the-policy-to-a-security-profile))

The site's [Microsoft Entra Internet Access architecture and rollout guide](/posts/microsoft-entra-internet-access-overview) covers the broader Secure Web Gateway path. This article begins after that architecture decision and stays focused on header injection for SaaS tenant restrictions.

## Know what the control actually does

The request passes through five layers:

**Traffic acquisition decides whether Internet Access sees it.** The Internet Access forwarding profile acquires eligible internet traffic from the Global Secure Access client, a remote network, or the explicit forward proxy. A bypass rule or another route can keep the request out of the service before any header rule runs. Microsoft's profile documentation makes acquisition and bypass separate, ordered decisions. ([Internet Access traffic forwarding profile](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile))

**TLS inspection makes an HTTPS request editable.** Microsoft requires TLS inspection for destinations that use HTTPS. The pilot device must trust the TLS root, the destination must fall under an Inspect rule, and no applicable system or custom bypass can remove it from inspection. ([custom-header TLS prerequisite](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#review-the-tls-inspection-policy-and-create-it-for-custom-headers-if-necessary), [TLS inspection tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection))

**Web Filtering v2 selects the request and adds the header.** The rule matches the configured destination, keeps the action at Allow, and defines one or more headers. Global Secure Access adds the header at the service layer, so users cannot view, remove, or change that injected copy on the device. ([custom-header architecture](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#how-it-works))

**The security profile selects the policy for the user.** A security profile can link one Web Filtering v2 policy. Conditional Access provides user and context targeting because v2 rules themselves do not currently target users or groups. ([Web Filtering v2 policy model](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-web-filtering#policies-rules-and-security-profiles))

**The SaaS service enforces its own restriction.** Header injection does not create a tenant in the destination service, grant a user access, or replace the provider's identity and authorization controls. The service reads the supplied value and applies whatever tenant-selection behavior its documentation defines.

That last boundary is the one I would put in the change ticket. A transaction log showing a modified header proves that Global Secure Access acted on the request. It does not, by itself, prove that the SaaS provider accepted the value or blocked every unapproved path.

## Choose custom headers only for the right intent

Use custom headers when the destination service documents an HTTP header that selects an approved SaaS tenant, workspace, organization, or policy mode. Microsoft's current examples include ChatGPT, Claude, GitHub, Google Workspace, Slack, Dropbox, and YouTube, but Microsoft also warns that provider-defined names, supported values, and identifier locations can change. ([Microsoft's current service examples](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#common-services-and-headers))

Do not use this feature as a generic replacement for every adjacent control:

- **For Microsoft Entra tenant restrictions,** use universal tenant restrictions. Microsoft's custom-header documentation makes that distinction explicit.
- **For a website, URL, or category Allow/Block decision,** use Web Filtering v2 without assuming that header injection supplies the block.
- **For a port or protocol decision,** use the appropriate cloud-firewall control. The site's [Global Secure Access cloud firewall guide](/posts/global-secure-access-cloud-firewall-client-guide) explains that separate layer.
- **For file upload, download, or content decisions,** use a content policy. The [Internet Access content-policy runbook](/posts/microsoft-entra-internet-access-content-policy) covers its inspection and evidence requirements.
- **For a private application,** use Private Access application segments rather than an Internet Access header rule.

> [!IMPORTANT]
> A custom header is a provider-facing hint or restriction input, not a Microsoft Entra authorization grant. Keep the provider's SSO, account lifecycle, role assignment, data controls, and audit evidence in the design.

## Pass the role, license, traffic, and certificate gates

The pilot needs more than portal access.

**Roles:** Microsoft lists Global Secure Access Administrator for configuring the feature. For evidence review, the traffic-log documentation lists Global Secure Access Administrator and Global Secure Access Log Reader as prerequisites, while the portal procedure says at least Reports Reader can open the traffic logs. Use the least-privileged role that matches the task in your tenant and keep configuration separate from review where practical. ([custom-header prerequisites](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#prerequisites), [traffic-log prerequisites](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs#prerequisites))

**Licensing:** Microsoft Entra Internet Access is available standalone and in Microsoft Entra Suite, and users also need Entra ID P1 or P2. The site's [Global Secure Access licensing guide](/posts/microsoft-entra-global-secure-access-licensing) separates the foundation license from the traffic entitlement. Check the live service plan and the actual pilot assignment instead of treating a purchase record as enforcement evidence. ([Global Secure Access licensing overview](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview))

**Traffic path:** Internet traffic forwarding must be enabled. The pilot request must arrive through a supported client, remote network, or explicit forward proxy, and it must not match an applicable bypass before the custom-header rule can evaluate it. Record the source path and actual destination FQDNs for each test.

**TLS inspection:** HTTPS traffic needs an active inspection certificate, device trust, an Inspect policy covering the destinations, and a security-profile path that reaches the pilot. The [managed TLS inspection certificate guide](/posts/microsoft-entra-managed-tls-inspection-certificate) is useful if the certificate plane is not already operational. Microsoft's TLS FAQ documents important exceptions, including certificate pinning, incompatible destinations, and Encrypted Client Hello limitations. ([TLS inspection FAQ](https://learn.microsoft.com/en-us/entra/global-secure-access/faq-transport-layer-security))

Before changing policy, capture:

- the business owner and approved SaaS tenant or workspace;
- the provider's current header documentation and identifier source;
- exact FQDNs observed for sign-in, application, API, and supporting flows;
- pilot users, devices, client version, and traffic source;
- Internet Access and Entra ID license assignments;
- TLS certificate, trust deployment, Inspect rules, and bypass rules;
- current Web Filtering v1 and v2 policies, their default actions, and security-profile priority;
- Conditional Access scope, exclusions, and emergency-access handling;
- expected approved and unapproved test results; and
- a rollback owner and time limit.

## Design the Web Filtering v2 rule before you build it

Web Filtering v2 is not the old collection of independent v1 policies. One v2 policy contains multiple ordered rules, each rule carries its action, and the policy has a default action for unmatched traffic. A security profile links one v2 web-filtering policy. Microsoft documents **Continue** as a preview default action for passing unmatched traffic to the next applicable v2 policy in profile-priority order; Allow and Block are terminal within v2 evaluation. Existing v1 and v2 modules can also coexist, and a v1 Block can still deny traffic after a v2 Allow. ([Web Filtering v2 evaluation model](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-web-filtering))

For a header rule, design these fields explicitly:

- **Name:** include the SaaS service, approved tenant purpose, environment, and change owner.
- **Priority:** place it intentionally among existing v2 rules, then review what evaluates before it.
- **Status:** keep the pilot rule enabled only during the approved test window.
- **Destination:** use the provider's documented FQDN set and compare it with observed traffic.
- **Action:** Microsoft instructs administrators to keep the custom-header rule at Allow.
- **Header name and value:** copy the current provider-defined format, preserving case and separators where its documentation requires them.
- **Policy default:** understand what happens to unmatched traffic and whether another security profile must evaluate it.

Use a separate rule when another SaaS service requires a different destination set or header. That makes ownership, evidence, rollback, and future provider changes easier to isolate. Do not place a secret, password, token, or private key into a header value unless the provider explicitly requires that design and your security review approves it; Microsoft's documented examples use tenant, workspace, organization, domain, enterprise, team, or policy identifiers.

## Build a narrow pilot in the Microsoft Entra admin center

Start with one service and a small group whose normal access path you can observe.

### 1. Prove acquisition and TLS inspection first

Confirm that the pilot receives the Internet Access forwarding profile and that the target request is acquired. Then verify the destination certificate on a non-Microsoft HTTPS test path covered by the intended TLS policy. If the certificate chain does not show the expected inspection path, stop there. A header rule cannot modify encrypted traffic that the service never decrypted.

### 2. Create or reuse the v2 policy deliberately

In the Microsoft Entra admin center, browse to **Global Secure Access > Secure > Web Filtering Policies (V2)**. Use the existing v2 policy only when its owner, default action, rule order, and security-profile assignment match the proposed control. Otherwise create a pilot policy with a documented default action.

Microsoft's custom-header page still uses the older “Web content filtering policies” wording in one portal step, while the v2 concept page describes the current **Web Filtering Policies (V2)** experience. Use the v2 object model; custom headers are not available in v1. ([custom-header v2 requirement](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers), [Web Filtering v2 naming](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-web-filtering#overview))

### 3. Add the destination and custom header

Open the policy, select **Rules > Add rule**, enter the name and priority, and leave the status enabled for the pilot. Under destination matching, add the provider-documented URLs or FQDNs. Keep the rule action at **Allow**, choose **Configure custom headers**, and add the exact header name and value. Create a separate rule for each service with a different header contract. ([Microsoft's rule procedure](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#add-security-policy-rules-with-custom-headers))

### 4. Link the policy and deliver the profile

Open **Global Secure Access > Secure > Security profiles**, select the pilot profile, and link the existing Web Filtering v2 policy. Microsoft permits one v2 web-filtering policy per security profile. If this is a new profile, create a Conditional Access policy for the pilot group, target **All internet resources with Global Secure Access**, and select **Use Global Secure Access security profile** under Session. ([security-profile link](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#link-the-policy-to-a-security-profile), [TLS tutorial's Conditional Access delivery path](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection#step-4-assign-the-security-profile-via-conditional-access))

Keep emergency-access identities out of an experimental network-control assignment. Start with a pilot that has another tested path to the SaaS service and an administrator who can disable the specific rule if the provider changes behavior. ([Microsoft Entra emergency-access guidance](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access))

## Validate enforcement without guessing

Use a test matrix, not a single successful page load.

| Test | Expected evidence |
| --- | --- |
| Approved pilot user, approved SaaS tenant | Traffic is acquired and TLS-inspected; the matching transaction shows custom-header modification; the provider permits the documented tenant path. |
| Approved pilot user, unapproved tenant or workspace | The same header rule matches; the provider applies its documented restriction response. |
| Nonpilot user | The pilot security profile and header rule do not apply unless another intended profile supplies them. |
| Destination outside the rule | No custom-header modification appears for that transaction. |
| Provider API or secondary hostname | Behavior matches the provider's documented destination coverage; missing hostnames are recorded rather than added blindly. |
| Rollback | Disabling the specific rule or removing its pilot delivery restores the pre-change behavior without changing unrelated policies. |

In **Global Secure Access > Monitor > Traffic logs**, open the **Transactions** view and add the **Custom Headers** column. Microsoft says sessions contain connections and connections contain transactions; header evidence belongs at the request/response transaction level. Correlate the user, device, time, destination, transaction ID, security profile, policy, rule, action, and header-modification indicator. ([custom headers in traffic logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers#custom-headers-in-traffic-logs), [traffic-log data model](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs#how-the-traffic-logs-work))

Do not call the pilot successful because the approved workspace loads. It might have loaded without the header. Do not call it failed because an old browser tab still reaches another tenant. That tab might hold an established SaaS session. Start fresh test requests, preserve UTC timestamps, and compare the provider result with the corresponding Global Secure Access transaction.

## Troubleshoot the missing layer, not the symptom

**No transaction appears:** verify the pilot is assigned, the client or remote network is healthy, Internet Access rules reached the device, and no Custom or Default Bypass removed the destination. Confirm the request used the hostname you expected.

**A transaction appears but TLS inspection did not occur:** check the active certificate, root trust, TLS policy link, Inspect rule, system and custom bypasses, certificate pinning, and ECH behavior. Do not broaden TLS inspection merely to make one provider work.

**TLS inspection works but no custom header is recorded:** confirm the rule is in Web Filtering v2, enabled, higher-priority rules did not terminate evaluation, the destination expression matches the actual request, the policy is linked to the effective security profile, and the new profile claim had time to propagate.

**The header is recorded but the SaaS restriction fails:** compare the header name, value, allowed identifier, destination set, and provider account tier with the provider's current documentation. At this point Global Secure Access has evidence of modification; the remaining question is the provider contract or a missing application path.

**An unrelated site breaks:** identify the exact TLS inspection or web-filtering match. Roll back the narrow rule or pilot delivery that introduced the change. Avoid disabling the Internet Access profile, removing the inspection certificate, or rewriting the whole policy set when one destination or priority is wrong.

**The wrong users receive the header:** inspect Conditional Access assignments and exclusions, security-profile priority, existing profile membership, and the effective v2 policy. Remember that user and group targeting lives at the security-profile delivery layer, not inside the v2 rule.

## Roll out and roll back with evidence intact

Expand only after the approved and unapproved paths behave as documented across every supported client and network path in scope. Move in small groups, wait through the documented profile interval, and review custom-header transactions plus provider-side audit evidence before each expansion.

The rollback should remove the smallest faulty decision:

- disable the affected custom-header rule;
- correct or remove only the bad destination or value;
- unlink the v2 policy from the pilot security profile; or
- remove the pilot Conditional Access delivery when the profile itself is the fault boundary.

Preserve the traffic-log timestamps, transaction IDs, provider response, policy export or screenshots, and the before-and-after rule state. A broad TLS bypass may restore access quickly, but it also removes the inspection boundary that made the control possible and can hide the cause.

## The admin checklist

- [ ] Confirm the provider supports a header-based tenant, workspace, organization, or policy restriction.
- [ ] Record the current header name, value format, identifier source, and required FQDNs from provider documentation.
- [ ] Verify Entra ID P1/P2 plus Microsoft Entra Internet Access licensing for the pilot.
- [ ] Prove Internet Access acquires the target transactions.
- [ ] Verify the TLS certificate, device trust, Inspect coverage, and bypass behavior.
- [ ] Review existing Web Filtering v1 and v2 policies, rule priority, default actions, and profile priority.
- [ ] Create a narrowly scoped Allow rule with custom headers in Web Filtering v2.
- [ ] Link the v2 policy to one pilot security profile and deliver it through Conditional Access.
- [ ] Allow 60 to 90 minutes for a new profile before diagnosing propagation.
- [ ] Test approved, unapproved, nonpilot, unmatched, secondary-hostname, and rollback paths.
- [ ] Confirm the matching transactions in the Custom Headers log column.
- [ ] Correlate provider behavior and provider-side audit evidence.
- [ ] Expand in stages and keep the rule-level rollback ready.

## Things people ask

*Can I use custom headers without TLS inspection?* Not for HTTPS destinations. Microsoft says TLS inspection is required so Global Secure Access can modify the encrypted request.

*Can I use this to restrict users to my Microsoft Entra tenant?* No. Microsoft directs administrators to universal tenant restrictions for Entra tenants. Custom headers are for destination services that implement their own header contract.

*Can one rule cover several SaaS services?* A rule can include multiple destinations and headers, but separate service-specific rules are safer when providers use different header contracts. Microsoft tells administrators to create a separate rule for each distinct service requiring different headers.

*Does the header grant access to the approved workspace?* No. The user still needs whatever identity, account, license, role, and authorization the SaaS provider requires.

*Why does the new profile appear to do nothing?* A new security profile can require 60 to 90 minutes before the user's Internet Access token contains its claim. Check the assignment time, start a new request, and correlate the transaction before editing the rule.

*Is traffic logging generally available?* Microsoft's current Global Secure Access overview labels traffic logs as preview even though custom headers are GA. Keep feature status separate and do not treat preview log export as the only enforcement control.

## Where to read further

- [Configure custom HTTP headers in Global Secure Access](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-custom-headers)
- [Web filtering in Global Secure Access v2](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-web-filtering)
- [Enable TLS inspection](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection)
- [Review Global Secure Access traffic logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs)
- [November 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-november-2026/4556457)
