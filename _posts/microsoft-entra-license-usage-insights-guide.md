---
title: "Microsoft Entra License Usage Insights: Admin Guide"
excerpt: "Use Microsoft Entra license usage insights to interpret P1 and P2 activity, investigate usage spikes, separate guests, and run an evidence-based review."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-21T09:31:29-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra license usage insights** gives administrators a six-month view of paid Entra entitlements and two representative usage signals: users evaluated by Conditional Access for P1, and users evaluated by risk-based Conditional Access for P2. Use it to find adoption gaps and possible over-usage, then validate the affected population against policy scope, sign-in evidence, license assignments, and Microsoft's current product terms before changing licenses.

That last part matters. The dashboard is an excellent front door for a license review, but it is not a user-by-user invoice, a complete inventory of every premium capability, or proof that a policy granted or blocked access. Microsoft describes each P1 and P2 number as a single **hero metric** representing paid-feature adoption. The data reports the previous month's activity and can take up to three days to update. ([Microsoft Entra license usage insights](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights))

Grab a coffee before opening the blade. The chart is simple; the interpretation is where administrators can either save a clean month of work or remove the wrong license from the wrong population.

## How to use Microsoft Entra license usage insights

Run the review in this order:

1. confirm the tenant and reporting period;
2. record current P1 and P2 entitlements;
3. capture the Conditional Access and risk-based Conditional Access hero metrics;
4. split active users from guest users;
5. compare the current month with the previous six-month pattern;
6. investigate any spike, drop, or sustained entitlement gap with policy and sign-in evidence;
7. reconcile actual license assignments in the Microsoft 365 admin center; and
8. approve license changes only after the security and application owners confirm the intended coverage.

Microsoft reported license usage insights as generally available in its May 2026 Entra update. The current page is under **Microsoft Entra admin center > Billing > Licenses**. A tenant needs a paid Microsoft Entra license, the experience is limited to public clouds, and **Reports Reader** is the least-privileged role Microsoft lists for access. Global Reader and several application and security roles can also open it. ([May 2026 Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-may-2026/4517884), [license usage prerequisites](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights#prerequisites))

Use Reports Reader for a recurring analyst or FinOps workflow unless the operator genuinely needs a broader role. Reading a license trend should not require granting power to change applications, security configuration, or the directory.

## Understand what the dashboard actually counts

The page has two different layers: **entitlements** and **product usage insights**. Do not blend them into one number.

### Entitlements are purchased capacity

The entitlement section shows the current month's purchased licenses. Microsoft calculates the total from products that include Entra functionality, not only standalone P1 and P2 subscriptions. Its current list includes Microsoft Entra ID P1, Entra ID P2, Entra Suite, ID Governance, Verified ID, Private Access, and Internet Access. The result is the total entitlement inherited through those products for each tier. ([license entitlements](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights#license-entitlements))

That explains a common surprise: the P1 or P2 entitlement count can be larger than the quantity on one procurement line. A Microsoft 365 bundle, an Entra add-on, and a standalone purchase can all contribute relevant service-plan rights.

Record the source subscriptions before escalating a mismatch. Procurement needs to know whether the number changed because of a renewal, a new product, a non-renewal, or an assignment problem. The dashboard documents the capacity; the Microsoft 365 admin center remains the place where Microsoft says user and group license assignments are managed. ([Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#overview))

### P1 usage means Conditional Access evaluation

The Entra ID tab uses **Conditional Access users** as its P1 hero metric. Microsoft defines it as the number of unique users for whom at least one Conditional Access policy was evaluated during the measurement period. ([P1 usage metric](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights#microsoft-entra-id-p1-usage))

Read those words literally:

- **unique users** means repeated sign-ins do not create a new user count each time;
- **evaluated** does not mean a policy necessarily blocked the sign-in or forced MFA;
- **at least one policy** means the number does not tell you which policy produced the evaluation; and
- **measurement period** means a newly scoped population might not appear in the previous-month view yet.

Conditional Access evaluation is a policy-engine event. A user can be in scope while the result is success, failure, not applied, report-only, or interrupted by another requirement. To understand why a specific sign-in was counted or what the policy did, move to the sign-in record. The site's [Conditional Access evaluation pipeline guide](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) explains the control-plane sequence, while the [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) covers the evidence to preserve.

### P2 usage means risk-based Conditional Access evaluation

The ID Protection tab uses **risk-based Conditional Access users** as its P2 hero metric. Microsoft defines it as the number of unique users for whom at least one risk-based Conditional Access policy was evaluated during the measurement period. ([P2 usage metric](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights#microsoft-entra-id-p2-usage))

Microsoft's current licensing reference places ordinary Conditional Access in P1 and risk-based Conditional Access in P2. Its risk-policy guidance describes the P2 conditions as **sign-in risk** and **user risk**. A P2 count is therefore evidence that risk-based policy evaluation touched that population; it is not the number of risky users, confirmed compromises, remediations, or blocked attacks. ([Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-conditional-access), [risk-based access policies](https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-policies))

If P2 usage rises sharply, do not weaken a risk policy simply to make the chart smaller. Determine whether the change came from broader policy scope, more active identities, a guest-access pattern, a policy migration, or a genuine risk event. The site's [risk-policy migration guide](/posts/migrate-microsoft-entra-risk-policies-conditional-access) is the relevant companion if the rise follows migration from legacy ID Protection policies to Conditional Access.

## Read the three usage states without jumping to conclusions

Microsoft labels the bar-chart segments **Licenses Used**, **Licenses Not Used**, and **Usage Spike**. The chart compares the previous month's hero-metric activity with the entitlement count. ([feature usage report](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights#feature-usage-report))

Use this interpretation model:

- **Licenses Used:** the representative metric observed active use within the entitlement count. It proves activity, not complete adoption of every feature included in that license.
- **Licenses Not Used:** the entitlement count exceeded the representative activity count. It can indicate spare capacity, phased rollout, dormant assignments, or a metric that does not represent the premium feature your organization bought the license to use.
- **Usage Spike:** representative activity exceeded the entitlement count. Treat it as an investigation trigger. Confirm policy scope and assignments before deciding whether to buy licenses, narrow scope, or correct stale data.

> **Analysis:** a hero metric is intentionally a compression of reality. Conditional Access can be the most meaningful signal for P1 while still saying nothing about whether a particular user uses Application Proxy, dynamic groups, or another P1 capability. Risk-based Conditional Access can represent P2 activity while not inventorying every PIM or ID Protection use case. Use the chart to prioritize evidence collection, not to declare a tenant compliant or noncompliant by itself.

The same caution applies to low usage. A low P2 bar does not automatically mean P2 licenses are waste. A small privileged population may use PIM extensively while only a subset encounters a risk-based policy during that month. Microsoft's licensing reference separately lists PIM as requiring Entra ID P2 or ID Governance licensing, which demonstrates why one risk-based hero metric cannot describe the whole P2 estate. ([PIM licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-privileged-identity-management))

## Separate active users from guest users

The six-month usage-pattern view can switch between **Active users** and **Guest users**. Microsoft says this differentiation helps administrators understand how internal identities and external collaborators contribute to the usage metric. ([monthly usage patterns](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights#monthly-usage-patterns))

Make that split part of every review. A guest-driven rise has different owners and remedies from an employee-driven rise:

- **Active-user growth:** compare new-hire volume, merger populations, policy scope, license-assignment groups, and changes to included Microsoft 365 products.
- **Guest-user growth:** compare external collaboration campaigns, cross-tenant access, new SaaS or SharePoint sharing patterns, and policies that started targeting guests.
- **Both rise together:** look for a tenant-wide Conditional Access scope change, a baseline rollout, or a subscription change before assuming organic growth.
- **Entitlements rise but usage does not:** check procurement timing, rollout status, assignment errors, and whether the business case depends on a premium feature outside the hero metric.

Do not convert the guest chart into an invented licensing formula. Guest and governance licensing models can differ by feature. Use the current Microsoft licensing page and product terms for the feature under review, especially when ID Governance, External ID, cross-tenant synchronization, or monthly-active-user billing is involved.

## Run a defensible monthly license review

A repeatable review needs an evidence packet, an owner, and a decision date. Screenshots pasted into a renewal deck are not enough.

### 1. Freeze the reporting context

Record:

- tenant ID and tenant display name;
- date and time of collection;
- dashboard reporting month;
- P1 and P2 entitlement counts;
- P1 and P2 active-user counts;
- P1 and P2 guest-user counts;
- any displayed usage spike; and
- known subscription additions, removals, or renewals.

The page shows last month's data and may lag by up to three days, so note that boundary in every ticket. A review on the first morning of a month can be comparing a fresh entitlement count with usage that has not fully settled.

### 2. Compare the six-month shape

Classify the movement before investigating identities:

- **one-month spike:** likely scope, campaign, guest, or organizational event;
- **steady growth:** likely adoption or headcount trend;
- **step change that persists:** likely policy, subscription, or population change;
- **sudden drop:** likely policy exclusion, reduced sign-in activity, reporting delay, or changed identity population; or
- **flat unused capacity:** possible over-purchase, reserved rollout capacity, or use of premium features outside the hero metric.

The trend gives you a question, not the answer. Put the suspected change date beside Conditional Access audit changes, subscription events, and major onboarding activity.

### 3. Map the hero metric to policy scope

For P1, inventory enabled and report-only Conditional Access policies and identify the populations that can reach them. For P2, isolate policies containing sign-in-risk or user-risk conditions. Record includes, excludes, target resources, conditions, grant controls, session controls, and change owners.

Do not infer the counted population only from a policy's current configuration. A policy edited halfway through the month can produce a metric covering both the old and new scopes. Audit logs establish when the configuration changed; sign-in logs establish which policy was evaluated for an individual event.

### 4. Validate representative sign-ins

Sample sign-ins from before and after the movement. Preserve:

- user and user type;
- sign-in time and correlation ID;
- application and resource;
- Conditional Access status;
- policy name, result, and report-only result;
- sign-in risk and user risk where licensed and relevant;
- authentication requirement and result; and
- device, client, and location context when they explain the scope.

The objective is not to reconstruct Microsoft's private aggregation logic. It is to prove that the tenant behavior matches the operational explanation: a new policy reached a new group, a guest campaign became active, or risk-based evaluation expanded.

### 5. Reconcile assignments separately

Open the Microsoft 365 admin center and reconcile the relevant product assignments. Microsoft supports direct and group-based license assignment there. For group-based licensing, its current guidance warns that nested groups are not supported: only first-level users receive the license. The same guidance exposes assignment failures under **Errors & issues**. ([group-based licensing](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-group-licenses?view=o365-worldwide))

Check:

- direct assignments that should have been group-based;
- group members who are outside the intended policy population;
- policy users who are missing the required product;
- assignment errors caused by insufficient licenses, conflicting service plans, missing dependencies, or usage-location problems;
- leavers and dormant accounts still consuming assigned capacity; and
- group changes that have not finished processing.

Do not remove a license simply because the user had no hero-metric activity last month. Confirm whether the user needs another feature in that product and whether inactivity was expected because of leave, seasonality, or role design.

### 6. Make one of four explicit decisions

End every review with one decision:

- **No change:** entitlement and usage are aligned, and no assignment problem needs repair.
- **Repair assignments:** the purchased capacity is sufficient, but users or groups do not carry the intended service plan.
- **Correct policy scope:** the policy reaches identities the control owner did not intend to cover, after security review and staged validation.
- **Change capacity:** procurement should add, reduce, or rebalance subscriptions after confirming all premium-feature dependencies.

Attach the evidence and name the security, identity, procurement, and application owners who approved the decision. A licensing change that silently removes a security control is not optimization.

## Troubleshoot mismatches and surprising numbers

### The page is missing or access is denied

Confirm the tenant has a paid Entra license, is in the public cloud, and the operator has Reports Reader or another supported role. Verify the operator is in the intended tenant; license work across several directories makes wrong-tenant diagnosis surprisingly common.

Do not grant Global Administrator to solve a reporting-page access problem. Use the least-privileged documented role and allow normal role-assignment propagation before retesting.

### Entitlements do not match the purchase order

Compare all products that can contribute P1 or P2 rights, not only standalone Entra SKUs. Confirm the effective renewal period and whether the commercial document represents seats, add-ons, or a bundle whose service plans roll into the entitlement total.

If the mismatch remains, preserve the tenant ID, subscription names, counts, collection time, and a redacted screenshot before opening a Microsoft support or licensing-partner case. Do not include billing contacts or contract data in a general identity ticket unless the receiving team needs it.

### A usage spike appeared after a policy rollout

First, wait for the documented reporting delay if the period has just closed. Then compare the policy's include and exclude population with the assignment population. Sample sign-ins and determine whether the evaluation was expected.

If the policy scope is correct and the users require the feature, repair the entitlement or assignment gap. If the policy scope is wrong, use the normal Conditional Access safety process: make the correction in report-only mode where possible, exclude emergency access accounts appropriately, pilot a small population, validate sign-in logs, and retain rollback. Do not disable the policy tenant-wide to make a chart reconcile.

### Usage looks low after deployment

Confirm users actually signed in to targeted resources during the measured month. Check whether the policy stayed in a disabled state, targeted the wrong group, excluded the expected resources, or never reached the intended client flow.

Then ask the business question: was the license purchased for Conditional Access or risk-based Conditional Access, or for another included feature? If another feature drove the purchase, the low hero metric can be accurate without proving waste.

### P2 usage rose but risky-user counts did not

That can be a coherent result. The hero metric counts users for whom a risk-based Conditional Access policy was evaluated. It does not claim to count only users ultimately classified as risky. Validate policy evaluation in sign-in evidence and use ID Protection reports for risk investigation rather than forcing the two totals to match.

### Assigned licenses exceed dashboard usage

This is not automatically an error. The dashboard uses representative activity during a time window; assignment describes rights available to a user. Investigate dormant assignments and rollout gaps, but keep identities licensed when another used capability, support requirement, or documented deployment phase justifies the assignment.

## Security and rollback guardrails

License optimization touches the security control plane. Treat every bulk removal or policy-scope correction like a production change.

Before removing capacity or assignments:

- inventory the premium features in use beyond the dashboard's two metrics;
- identify emergency access, privileged, automation, service, guest, and synchronized populations;
- preserve before-state exports or screenshots from the entitlement, assignment, and policy surfaces;
- define the exact group or user cohort changing;
- add users to a destination licensed group and confirm the new assignment before removing the source assignment; and
- name a rollback owner and observation window.

Microsoft's group-based licensing guidance explicitly recommends adding a user to the destination group, confirming the license, and only then removing the source-group membership to avoid a temporary loss of service. ([move users between licensed groups](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-group-licenses?view=o365-worldwide#move-users-between-licensed-groups))

After the change, verify license assignment, Conditional Access evaluation, risk-policy behavior where applicable, and application access for the pilot cohort. Watch the next complete dashboard period, but do not wait a month to discover that a security or application dependency broke.

## Microsoft Entra license usage insights checklist

- [ ] Confirm the correct tenant, public-cloud availability, and Reports Reader access.
- [ ] Record the dashboard's reporting month and up-to-three-day data delay.
- [ ] Capture current P1 and P2 entitlements and their source products.
- [ ] Capture P1 Conditional Access and P2 risk-based Conditional Access usage.
- [ ] Split active-user and guest-user trends.
- [ ] Compare the current result with the previous six months.
- [ ] Treat Licenses Used, Licenses Not Used, and Usage Spike as investigation signals.
- [ ] Map P1 activity to Conditional Access policy evaluation.
- [ ] Map P2 activity to user-risk and sign-in-risk policy evaluation.
- [ ] Validate representative sign-ins and relevant audit changes.
- [ ] Reconcile user and group assignments in the Microsoft 365 admin center.
- [ ] Check group-assignment errors and unsupported nested-group assumptions.
- [ ] Inventory premium capabilities that the two hero metrics do not measure.
- [ ] Obtain security and application-owner approval before narrowing scope.
- [ ] Pilot license moves, verify the destination assignment first, and retain rollback.
- [ ] Document the decision, evidence, owner, and next review date.

Microsoft Entra license usage insights is most valuable when it ends the old argument between “we bought the licenses” and “the policy is turned on.” It shows entitlement and representative activity on one page, then gives you a six-month trail and a guest split to ask better questions. Use that signal with policy scope, sign-in evidence, and real assignments, and the review becomes defensible. Use the bar chart as the whole licensing model, and it becomes a very tidy way to make the wrong change.

### Sources

- [Microsoft Entra license usage insights — Microsoft Learn](https://learn.microsoft.com/en-us/entra/fundamentals/concept-license-usage-insights)
- [What's New in Microsoft Entra: May 2026 — Microsoft Entra Blog](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-may-2026/4517884)
- [Microsoft Entra licensing — Microsoft Learn](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)
- [Risk-based access policies — Microsoft Learn](https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-policies)
- [Configure and enable risk policies — Microsoft Learn](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-risk-policies)
- [Assign or unassign licenses to a group — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-group-licenses?view=o365-worldwide)
