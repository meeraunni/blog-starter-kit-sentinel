---
title: "Microsoft Entra Global Secure Access Licensing Guide"
excerpt: "Understand Microsoft Entra Global Secure Access licensing, choose the right Private and Internet Access plan, and validate assignments safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-03T09:03:18-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra Global Secure Access licensing** has two layers for workforce users: an eligible Microsoft Entra ID foundation and a license for the traffic capability you use. Microsoft Entra ID P1 or P2 covers the Microsoft traffic profile and is also a prerequisite for Private Access and Internet Access. Private Access and Internet Access then require their applicable standalone entitlement, the new combined Global Secure Access purchasing option, or Microsoft Entra Suite.

Microsoft announced the combined purchasing option on **November 2, 2026**. It is not a new traffic service, a mandatory conversion, or a replacement for the individual products. Microsoft says Private Access and Internet Access remain available separately. The operational controls still live in the existing Global Secure Access service: traffic profiles, assignments, clients or remote networks, Conditional Access, and traffic evidence. ([Microsoft announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/global-secure-access-private-access-and-internet-access-in-one-offering/4569098), [Global Secure Access overview](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview))

Grab a coffee before turning a commercial change into a technical change. Buying a broader entitlement does not prove that a user is assigned correctly, that a profile acquired traffic, or that a security policy enforced. This guide separates those control planes and gives administrators a defensible way to choose, assign, and validate the license path.

> **Documentation boundary:** this article uses Microsoft's public licensing pages as of November 3, 2026. Microsoft's announcement does not publish a price, service-plan identifier, tenant migration procedure, or contract-conversion rule for the combined offering. Confirm the effective SKU, regional availability, agreement terms, and price with your licensing provider or Microsoft account team before placing an order. No tenant purchase or hands-on license transition was performed for this article.

## Microsoft Entra Global Secure Access licensing: the short answer

Choose the entitlement that matches the traffic your organization intends to acquire and protect:

- **Supported Microsoft services:** use Microsoft Entra ID P1 or P2. Verify the Microsoft traffic profile assignment and actual acquired traffic.
- **Private TCP or UDP resources:** use Entra ID P1 or P2 **plus** Private Access, the combined Global Secure Access offering, or Entra Suite. Verify the Private Access entitlement, application and profile assignments, connector path, and client state.
- **General internet and SaaS traffic:** use Entra ID P1 or P2 **plus** Internet Access, the combined Global Secure Access offering, or Entra Suite. Verify the Internet Access entitlement, profile assignment, client acquisition, and applicable security profile.
- **Both paid traffic planes:** use Entra ID P1 or P2 **plus** the combined offering, both individual products, or Entra Suite. Verify both service plans and traffic profiles separately.
- **B2B guest Private Access through the client:** use the documented monthly-active-user model and link a subscription in the resource tenant. Verify guest `userType`, resource-tenant assignments, billable sign-in evidence, and the subscription link.

Microsoft's current feature table says most Global Secure Access services use a per-user model unless a page states otherwise. It lists the Microsoft traffic, Private Access, and Internet Access profiles separately because a license grants rights to a capability; it does not merge the traffic paths. ([licensing and feature comparison](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview), [traffic forwarding profiles](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding))

This intent is narrower than the site's [Microsoft Entra Internet Access architecture and rollout guide](/posts/microsoft-entra-internet-access-overview) and [Private Access VPN replacement guide](/posts/microsoft-entra-private-access-vpn-replacement). Those pages help choose and deploy the controls. This one answers which entitlement boundary applies and how to prove that licensed scope matches enforced scope.

## What changed on November 2, 2026

Microsoft added a way to purchase Private Access and Internet Access together under a single **Microsoft Entra Global Secure Access offering**. The announcement makes four useful boundaries explicit:

1. the combined offering became available on November 2, 2026;
2. it combines the purchasing path for Private Access and Internet Access;
3. it is **not a new product**; and
4. Private Access and Internet Access continue to be sold individually.

Microsoft Entra Suite remains the broader bundle. It includes Global Secure Access alongside identity-governance, identity-protection, and identity-verification capabilities. The public [Microsoft Entra plans and pricing page](https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing) remains the authoritative public comparison for Entra ID, Suite, and the individually listed products, but a quote or contract is the authority for the combined offering's actual price and service plans.

> **Analysis:** the new option changes the procurement decision, not the network architecture. An existing tenant should not disable profiles, recreate Private Access applications, redeploy clients, or rewrite Conditional Access merely because its commercial path changes. First compare the old and new service plans and effective user assignments. Make a configuration change only when an evidenced entitlement or target-state difference requires one.

Microsoft has not said in the cited announcement that existing individual subscriptions automatically convert, that every region or agreement exposes the offer simultaneously, or that the combined option replaces Suite. Treat each of those as a commercial question until the tenant's order and service plans prove the answer.

## Understand the four licensing layers

Most licensing incidents become easier when you separate four layers: foundation, product, assignment, and acquired traffic.

### 1. Entra ID P1 or P2 is the foundation

The Microsoft traffic profile requires Microsoft Entra ID P1 or P2. Microsoft's licensing overview also says users of Private Access and Internet Access need P1 or P2. A Private Access or Internet Access purchase therefore does not remove the identity-license prerequisite. ([traffic-profile licensing](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding#licensing), [Global Secure Access licensing overview](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview))

The foundation matters because Conditional Access, profile assignment, and the resulting identity-aware decision are part of the same operating model. Do not approve an add-on count without comparing it with the population carrying the required foundation license.

### 2. The product entitlement defines which traffic capability is allowed

The traffic-profile documentation maps rights to capabilities:

- **Microsoft traffic:** Entra ID P1 or P2;
- **Private Access:** Entra ID P1 or P2 plus Private Access or Entra Suite; and
- **Internet Access:** Entra ID P1 or P2 plus Internet Access or Entra Suite.

The November 2 combined offering adds another purchasing route for the last two rows. It does not make the Microsoft, private, and internet profiles interchangeable.

That distinction prevents two expensive assumptions. A user licensed only for Private Access does not automatically gain Internet Access rights. A user with Entra ID P1 does not automatically gain the general-internet secure web gateway merely because the same client can display more than one channel.

### 3. The entitlement must reach the intended user

Microsoft manages workforce license assignments in the Microsoft 365 admin center. Direct and group-based assignment are supported, but Microsoft's current group-licensing guidance says nested groups are not supported: only direct user members of the licensed group receive the license. It also exposes assignment failures under **Errors & issues**. ([assign licenses to users](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/assign-licenses-to-users?view=o365-worldwide), [group-based licensing](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-group-licenses?view=o365-worldwide))

Use a dedicated, owned licensing group for each intended population. Record the group object ID, source of membership, product and disabled service plans, change owner, and exception process. Do not use a nested authorization group as proof that its members inherited a license.

### 4. Acquired traffic proves the control is operating

A green license assignment is necessary but not sufficient. Traffic is protected only when the relevant profile is enabled, the user or device is assigned as documented, and the client or remote-network path actually acquires it.

The profiles remain separate:

- the Microsoft profile acquires supported Microsoft 365 and Microsoft Entra traffic;
- the Internet profile acquires other public internet and SaaS traffic; and
- Private Access profiles acquire traffic for configured private destinations.

Microsoft explicitly notes that Microsoft traffic is not acquired by the Internet Access profile. For complete public-cloud coverage, the Internet profile documentation tells administrators to enable the Microsoft profile as well. ([traffic-forwarding model](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding), [manage the Internet Access profile](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile))

Validate the effective forwarding rules in the client, then correlate a controlled request with Global Secure Access traffic logs and any applicable Conditional Access result. Licensing evidence answers “may this identity use the service?” Traffic evidence answers “did this connection use the service?”

## Choose between individual products, the combined offering, and Entra Suite

Use capability scope, not the product name, as the first filter.

### Choose an individual product for a bounded need

An individual entitlement is the clearest match when the approved architecture uses only one paid traffic plane:

- Private Access for a defined ZTNA or legacy-VPN replacement program; or
- Internet Access for web, SaaS, AI, threat, and content-control requirements.

Build the quantity from the identities that will use that plane, not from total directory objects. Compare the proposed group with actual rollout rings and with the P1/P2 prerequisite population.

### Choose the combined offering when both traffic planes are in scope

The combined option fits an organization that has approved both Private Access and Internet Access but does not need the wider Suite solely to obtain those network controls. Require the quote to state the exact product name, quantity, term, service plans, prerequisite, renewal treatment, and effective date.

Do not assume the combined label means one forwarding profile or one rollout. Private applications and internet traffic have different destinations, policy controls, failure modes, owners, and rollback plans. License together if appropriate; deploy and validate them as separate change streams.

### Choose Entra Suite when the program needs the broader capabilities

Entra Suite is the relevant comparison when the same population also needs the Suite's broader identity governance, identity protection, or verified-identity value. The public pricing page currently lists Entra Suite as requiring Entra ID P1 or a package that includes P1. Review the complete current feature table and product terms rather than treating Suite as “Global Secure Access with extras.” ([Microsoft Entra plans and pricing](https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing))

> **Analysis:** compare the options on effective licensed population, existing bundle rights, required non-network capabilities, contract term, and operational ownership. Public list prices can orient a conversation, but they do not represent every currency, agreement, tax, promotion, or negotiated term. Record the quote used for the decision without copying confidential contract data into a broad admin runbook.

## Account for guests, branches, and agents separately

Three populations do not fit a simple “one employee, one add-on” spreadsheet.

### B2B guest Private Access uses a monthly-active-user model

Microsoft's guest licensing reference says Global Secure Access guest billing applies when a user whose `userType` is `Guest` signs in to Private Access tunnels through the Global Secure Access client during the month. The resource tenant must link a subscription. The first-50,000-monthly-active-user allowance for Entra ID P1/P2 external identities does not extend to Global Secure Access guest usage. ([guest licensing](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-licensing-guest-users))

The document gives a sign-in-log evidence pattern: **User type: Guest**, **Cross tenant access type: B2B collaboration**, **Application: Global Secure Access Client**, and **Client app: Mobile Apps and Desktop clients**. Use that evidence for usage investigation, then take detailed billing validation to the Microsoft account team as the page directs.

The site's [Private Access for B2B guests guide](/posts/microsoft-entra-private-access-b2b-guests) covers the client, tenant-switching, assignment, Conditional Access, and monitoring path that sits behind this licensing boundary.

### Remote-network capacity uses a license-derived bandwidth model

Remote networks acquire traffic from branch equipment rather than from an individual endpoint client. Microsoft currently requires at least 50 qualifying licenses for remote-network connectivity and derives included bandwidth from the combined qualifying license count. It documents extra bandwidth as a separate purchasable increment. ([remote-network connectivity and bandwidth](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-remote-network-connectivity#bandwidth-allocation))

Do not translate a user count directly into guaranteed site performance. Validate the current bandwidth table, traffic type, high-availability design, branch concurrency, and observed throughput before approving a site migration.

### Network controls for agents have an additional license boundary

Microsoft's current Global Secure Access feature comparison marks network controls for agents under Internet Access and notes that they require a Microsoft Agent 365 license. Do not infer that a human user's Internet Access entitlement licenses every agent identity or traffic path. ([Global Secure Access feature comparison](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#feature-comparison-table))

Inventory human, guest, branch, and agent use cases as separate rows. A single total hides different meters and prerequisites.

## Audit the current tenant before changing a subscription

Create a before-state evidence packet before procurement or renewal:

1. export purchased Entra ID P1/P2, Private Access, Internet Access, and Suite quantities;
2. capture their exact tenant product and service-plan names;
3. export direct and group-based assignments for each relevant product;
4. resolve assignment errors and confirm no design depends on nested licensed groups;
5. export Microsoft, Internet, and Private Access profile assignments;
6. list Private Access enterprise applications and their assigned populations;
7. identify guest Private Access use and confirm the resource-tenant subscription link;
8. list remote networks and compare their required capacity with the current qualifying-license count;
9. identify agent traffic in scope and its separate licensing prerequisite; and
10. preserve a sample of recent traffic and sign-in evidence for every active plane.

The site's [Microsoft Entra license usage insights guide](/posts/microsoft-entra-license-usage-insights-guide) is useful for entitlement and adoption trend review, but its Conditional Access hero metrics are not a product-by-product Global Secure Access billing report. Reconcile actual assignments and service use separately.

Classify every identity into one target state:

- Microsoft traffic only;
- Private Access only;
- Internet Access only;
- both paid traffic planes;
- Suite for broader capabilities;
- guest Private Access monthly-active-user path;
- agent path with its additional requirement; or
- no Global Secure Access entitlement required.

If an identity appears in more than one paid workforce row, document whether the overlap is intentional or a transition artifact.

## Migrate license assignments without creating an access gap

When a commercial decision changes the assigned product, treat it as a production access change.

### Ring 0: prove the service-plan mapping

Obtain the exact tenant-visible service plans for the destination product. Compare them with the source product and the approved feature set. Do not build automation around a marketing label or guessed SKU identifier.

Use a small nonproduction or IT pilot population. Assign the destination license while preserving the source assignment, wait for successful processing, and verify the expected service plans before removing anything.

### Ring 1: prove each active traffic plane

For the pilot, validate separately:

- Microsoft traffic acquisition and the intended Microsoft-profile controls;
- Internet traffic acquisition, security-profile selection, and an allowed and blocked test case;
- Private Access resolution, connector health, assignment, and a permitted private connection;
- sign-in and Global Secure Access traffic evidence; and
- the documented emergency path when the client or service is unavailable.

Use benign test destinations and approved test identities. Do not weaken Conditional Access or add broad bypass rules merely to make the pilot pass.

### Ring 2: move a controlled production cohort

Microsoft's group-licensing guidance recommends confirming the destination assignment before removing the source-group membership when moving users between licensed groups. That ordering prevents a temporary loss of service. ([move users between licensed groups](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-group-licenses?view=o365-worldwide#move-users-between-licensed-groups))

Keep the cohort small enough to inspect every assignment error and help-desk case. Hold long enough to exercise the private and internet paths actually used by that population.

### Ring 3: complete the move and reconcile

Expand only after assignment, traffic, policy, and application owners approve the evidence. At completion, compare purchased quantity, assigned quantity, intended population, assignment errors, and observed active use. Remove obsolete source assignments only when the destination rights and control behavior are proven.

Rollback means restoring the known-good source assignment for the affected cohort, confirming its service plans, and revalidating traffic. It does not mean disabling Global Secure Access or Conditional Access tenant-wide.

## Troubleshoot Global Secure Access licensing failures

### The user has a license, but traffic is not acquired

Check the whole chain:

1. confirm the correct tenant and identity;
2. confirm P1 or P2 plus the applicable product service plan;
3. inspect Microsoft 365 admin center **Errors & issues**;
4. confirm the user is a direct member of the licensing group;
5. confirm profile and application assignments;
6. inspect the client's effective forwarding rules and channel state;
7. check connector or remote-network health where applicable; and
8. correlate the request with traffic and sign-in logs.

A license never substitutes for a forwarding rule, application assignment, connector, client, or policy.

### Private Access works, but Internet Access does not

Prove that the user has an Internet Access-capable entitlement, not only Private Access. Then verify the Internet profile is enabled and assigned, the client received its rules, and the destination is not part of the separate Microsoft profile or an intended bypass. Microsoft's Internet-profile procedure says rule changes can take **10 to 20 minutes** to appear in the client and documents the Advanced diagnostics validation path. ([manage and validate the Internet Access profile](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile#validate-the-internet-access-traffic-forwarding-profile))

Do not repeatedly toggle a production profile while propagation is still within the documented window.

### A group is licensed, but some members are not

Check direct membership first. Nested groups do not assign Microsoft 365 licenses to their transitive members. Then inspect assignment errors for insufficient quantity, conflicting plans, dependency problems, or invalid usage location. Repair the assignment boundary instead of adding ad hoc direct licenses that conceal the broken group design.

### The guest can authenticate but cannot reach the private resource

Authentication alone does not prove the guest Private Access path. Confirm the resource tenant's subscription link, guest `userType`, Private Access profile assignment, enterprise-application assignment, selected resource tenant in the client, connector and DNS path, and Conditional Access result. Use the documented billable sign-in fields to separate a client sign-in from an application-routing failure.

### The new combined offer is missing from the tenant or quote

Preserve the tenant ID, region, agreement or purchasing channel, requested quantity, current products, and the November 2 announcement link. Ask the licensing provider to confirm availability, product identifier, service plans, prerequisites, and effective date in writing.

Do not delete existing assignments, cancel products, disconnect integrations, or rebuild profiles to make a purchasing option appear. The public announcement establishes availability, but the tenant's commerce catalog and contract establish what can actually be ordered for that customer.

## Microsoft Entra Global Secure Access licensing checklist

- [ ] Define whether the target needs Microsoft, private, internet, or both paid traffic planes.
- [ ] Confirm Entra ID P1 or P2 for every in-scope workforce user.
- [ ] Compare individual products, the combined offering, and Entra Suite against the same population.
- [ ] Obtain the exact destination product and service-plan identifiers.
- [ ] Confirm regional, agreement, term, renewal, and pricing details with the licensing provider.
- [ ] Separate workforce, guest, remote-network, and agent licensing models.
- [ ] Reconcile purchased quantity, direct assignments, group assignments, and assignment errors.
- [ ] Remove nested-group assumptions from license design.
- [ ] Capture current traffic-profile and Private Access application assignments.
- [ ] Preserve before-state traffic and sign-in evidence.
- [ ] Add and verify the destination assignment before removing the source.
- [ ] Pilot Microsoft, Internet, and Private Access paths separately.
- [ ] Keep Conditional Access and traffic-policy rollback bounded to the pilot cohort.
- [ ] Reconcile entitlements, assignments, acquired traffic, and errors after the move.
- [ ] Retain the quote and approval record without exposing confidential commercial data broadly.

The durable model is simple: **license the capability, assign it to the correct identity, and prove the traffic path independently**. The November 2 combined offer can simplify buying Private Access and Internet Access together. It does not collapse their control planes or remove the P1/P2 foundation. Keep those boundaries visible, and a commercial change stays a controlled identity-and-network change instead of becoming an avoidable outage.

## Microsoft sources

- [Global Secure Access combined offering announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/global-secure-access-private-access-and-internet-access-in-one-offering/4569098)
- [Global Secure Access overview, licensing, and feature comparison](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access)
- [Global Secure Access traffic forwarding profiles](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding)
- [Microsoft Entra plans and pricing](https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing)
- [Global Secure Access licensing for guest users](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-licensing-guest-users)
- [Global Secure Access remote-network connectivity and bandwidth](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-remote-network-connectivity)
- [Manage the Internet Access traffic profile](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-internet-access-profile)
- [Assign licenses to users in Microsoft 365](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/assign-licenses-to-users?view=o365-worldwide)
- [Manage group-based licensing in Microsoft 365](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-group-licenses?view=o365-worldwide)
