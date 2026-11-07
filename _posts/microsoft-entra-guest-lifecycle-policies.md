---
title: "Microsoft Entra Guest Lifecycle Policies: Admin Guide"
excerpt: "Deploy Microsoft Entra guest lifecycle policies safely: scope guests, test sponsor and activity rules, stage disablement, and monitor enforcement."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-07T09:43:53-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra guest lifecycle policies let an administrator evaluate guest accounts against sponsor, activity, access-package, and invitation-redemption rules, then notify, disable, or delete accounts that no longer meet policy. The safe deployment is to start with a small, representative guest population, put specific policies above broad ones, use a grace period, and prove **scope, notification, disablement, recovery, and daily reevaluation** before allowing deletion.

That is the short answer to **how to deploy Microsoft Entra guest lifecycle policies**. Grab a coffee before you create the first policy, though. This Public Preview is not merely a stale-account report. It is an enforcement control that can act on existing guest objects from any invitation source.

Microsoft announced guest lifecycle policies in its November 2026 Entra roundup. The current documentation labels the capability **Public Preview**, limits the preview to the public cloud, and says preview features have no service-level agreement and are not recommended for production workloads. Microsoft has not published a general-availability date, a mandatory-enforcement date, or a default-on tenant rollout. ([November 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-november-2026/4556457), [guest lifecycle policy documentation](https://learn.microsoft.com/en-us/entra/id-governance/guest-lifecycle-policies))

> **Documentation boundary:** This guide is based on current Microsoft primary documentation. It does not claim hands-on validation in a production tenant. Preview labels, limits, portal paths, billing, and behavior can change; recheck the linked sources before enabling enforcement.

## Microsoft Entra guest lifecycle policies: what they control

A guest lifecycle policy is a policy engine inside Lifecycle Workflows. It has five parts:

1. **Scope** selects guest objects by tenant-wide coverage, creation date, supported attributes, direct group membership, or exclusions.
2. **Rules** test continuing business need through sponsor attestation, recognized activity, access-package assignment state, sponsor count, or invitation redemption.
3. **Precedence** chooses the one policy that governs a guest when several policies match.
4. **Actions** notify, disable, delete, or disable and later delete a noncompliant guest.
5. **Evaluation** runs enabled policies once per day and updates processing and compliance state.

Microsoft says the policy applies to any object whose `userType` is `Guest`, regardless of how the account was created or invited. Group inclusion and exclusion use **direct membership**; nested groups are not evaluated. A tenant can have up to 20 guest lifecycle policies, but a guest can be assigned to only one at a time: the highest-precedence matching policy wins. ([guest lifecycle policy concepts and limits](https://learn.microsoft.com/en-us/entra/id-governance/guest-lifecycle-policies))

This is broader than the site's [sponsorless guest cleanup workflow](/posts/microsoft-entra-sponsorless-guest-cleanup). That workflow starts from one condition—no sponsor—and runs a task sequence. Guest lifecycle policies can combine several continuing-need signals, resolve overlapping scopes through precedence, and drive a policy enforcement cycle.

It is also different from access-package lifecycle. An access package governs a particular bundle of resources and its assignment. A guest lifecycle policy governs the **guest account** and can use loss of the last access-package assignment as one rule. Read the [access-package lifecycle model](/posts/microsoft-entra-entitlement-management-access-packages) before treating account deletion and resource-assignment expiration as the same event.

## Decide whether this preview is the right control

Use a guest lifecycle policy when the organization can state an account-level rule such as:

- a project guest must have a sponsor who reconfirms the relationship every 90 days;
- an invited guest that remains in `PendingAcceptance` for 14 days should be removed;
- a guest must retain at least one sponsor and show recognized tenant activity within 120 days; or
- a guest should enter disablement after the last access-package assignment expires.

Do not use the preview as a substitute for an access review, an application-owner decision, or incident response. “No recent activity” does not prove that the business relationship ended. “Sponsor did not attest” can mean the sponsor left, missed the message, or lacks enough context. “No access package” does not prove the guest has no directly assigned group, application, SharePoint, Teams, Azure, or other resource access.

> **Analysis:** Treat a lifecycle rule as evidence that the account needs review or enforcement under an approved policy—not as a complete inventory of every authorization path attached to that account.

For external users deliberately onboarded through governance, the site's [external access-package assignment guide](/posts/assign-external-users-microsoft-entra-access-packages) shows how invitation, policy eligibility, resource delivery, and assignment expiry fit together. Use that model where the access package, rather than the directory object alone, should remain the lifecycle authority.

## Pass the preview, license, role, and billing gates

Before configuration, record four prerequisites.

**Preview acceptance.** The feature is Public Preview in the public cloud. Preview services can change and do not carry a service-level agreement. Put that limitation in the change record and business-owner approval.

**Identity Governance licensing.** Microsoft requires Microsoft Entra ID Governance for guest lifecycle policies. For guests, Identity Governance uses monthly active user billing rather than ordinary employee assignment. The tenant must be connected to an Azure subscription for the guest add-on meter. Microsoft defines a billable month around guest users that receive one or more governance actions, so finance and subscription owners should approve the pilot scope before it runs. ([Identity Governance licensing fundamentals](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals), [guest lifecycle policy prerequisites](https://learn.microsoft.com/en-us/entra/id-governance/guest-lifecycle-policies#before-you-begin))

**Administrative role.** Microsoft lists Lifecycle Workflows Administrator and Global Administrator for management, with Global Reader as read-only. Use the least-privileged eligible role and activate it only for the approved change window where Privileged Identity Management is in use.

**Recovery ownership.** Name the team allowed to stop enforcement, re-enable a disabled guest, or restore a deleted user. Microsoft keeps a deleted user in a restorable state for 30 days; after that window, permanent deletion begins and cannot be stopped. A restored object still needs an access and collaboration review before anyone calls the incident resolved. ([restore a recently deleted user](https://learn.microsoft.com/en-us/entra/fundamentals/users-restore))

## Build the guest inventory before writing policy

Export or record the before-state for the pilot population. At minimum, include:

- guest object ID, user principal name, `userType`, creation time, and account-enabled state;
- `externalUserState` and invitation age for pending guests;
- all recorded sponsors and whether each sponsor can still act;
- direct inclusion and exclusion group membership;
- last sign-in or other activity evidence exposed by the preview;
- current access-package assignments and their expiration state;
- directly assigned application, group, collaboration, and Azure access that the account team considers material; and
- the policy that should win if several scopes match.

Do not infer sponsorship from an email thread or a project roster. Microsoft stores sponsor relationships on the user object. The inviter is normally set as sponsor when no sponsor is supplied, but Microsoft documents a known exception: an external user invited through SharePoint might not receive a sponsor automatically. Reconcile that gap before a minimum-sponsor rule can enforce anything safely. ([Sponsors field for B2B users](https://learn.microsoft.com/en-us/entra/external-id/b2b-sponsors))

Also inspect `userType`, not the display name or invitation domain. The preview keys its supported population to `userType = Guest`. A business partner represented as a Member object will not enter the documented guest-policy population, while an internal account deliberately marked Guest can.

## Design scope and precedence before rules

The safest first policy is not **All guests**. Create a dedicated pilot group, add a handful of test or approved low-impact guests as direct members, and exclude emergency, legal-hold, executive, shared-resource, and other specially governed populations through documented controls.

Then draw the precedence order on paper before configuring the portal. A sample design might look like this:

1. **Regulated partner pilot:** highest priority because its contract-specific review interval must win; cap enforcement at Disable.
2. **Short-term project guests:** second priority because project sponsor and activity rules should override the baseline; consider Disable-then-delete only after the pilot.
3. **Broad guest baseline:** lowest priority because it supplies the minimum tenant standard; begin with notification or Disable.

The exact populations are organization decisions, not Microsoft defaults. The design rule comes from the service: only the highest-precedence matching policy is evaluated for a guest. A broad policy above a narrow exception can therefore suppress the narrow policy entirely. After every scope or priority change, recalculate which policy wins for every pilot guest.

Microsoft says a restored policy comes back **disabled** and at the lowest priority. Review its scope, rules, action, notification, and precedence before enabling it again; do not assume restore returns the policy to its former enforcement position. ([policy precedence and restore behavior](https://learn.microsoft.com/en-us/entra/id-governance/guest-lifecycle-policies#multiple-policies-and-precedence))

## Choose rules that represent continuing need

The preview currently documents these rule boundaries:

- **Sponsor attestation:** 30–365 days; default 90. It can prove that a sponsor recently reconfirmed need, not that every resource assignment is appropriate.
- **Activity requirement:** 30–730 days; default 90. It can prove that the service recognized qualifying activity, not that inactivity means the relationship ended.
- **Access-package assignment expiration:** enabled or disabled. It can prove that the guest lost the last package assignment, not that no direct access remains.
- **Minimum sponsor count:** 1–5; default 1. It can prove that enough sponsor relationships are recorded, not that every sponsor is active and informed.
- **Guest redemption:** 1–30 days; default 30. It can prove that an invited guest remains in `PendingAcceptance`, not why redemption failed or whether the invitation is still needed.

Source: [Microsoft's current guest lifecycle policy rule table](https://learn.microsoft.com/en-us/entra/id-governance/guest-lifecycle-policies#configure-policy-rules).

A policy can contain multiple rules. Microsoft says a guest becomes noncompliant when it violates the policy requirements and advises confirming rule-combination behavior in a test environment before production enforcement. Do not invent Boolean logic from the labels: build pilot identities that violate one rule at a time, then two together, and compare the observed compliance result with the intended policy.

Sponsor attestation happens in **My Access > Sponsored guests**. Extending sponsorship updates the attestation, but it does not prove that the guest satisfies the activity, access-package, or other rules. Ending one sponsorship removes only that relationship; if other sponsors remain, those relationships continue. ([manage sponsored guests in My Account](https://learn.microsoft.com/en-us/entra/id-governance/manage-sponsored-guests-my-access))

## Stage notification, disablement, and deletion

The preview offers three enforcement actions: **Delete**, **Disable**, and **Disable, then delete**. It also supports an action grace period of at least one day; the default is seven days. For disable-then-delete, Microsoft documents a deletion delay from 7 through 90 days, with 30 days as the default.

Start with the least destructive action that proves the policy:

1. Configure a grace period so the guest and sponsor can receive the pre-action notification.
2. Pilot **Disable** before any deletion path.
3. Verify that the intended guest becomes noncompliant, that unrelated guests remain untouched, and that notification reaches a monitored recipient.
4. Re-enable the pilot guest through the approved recovery procedure and verify the next daily evaluation.
5. Only after the account and resource owners accept the evidence should a separate change consider **Disable, then delete**.

Microsoft says notifications can occur before an action, on disablement, and on deletion, depending on the configured action and grace period. A sponsor needs a usable mail address; if no sponsor exists, validate the guest and additional-recipient design rather than assuming someone else will receive the warning.

Deletion is not a convenient cleanup button. Microsoft documents a 30-day user-object restoration window, but restoration should not be treated as proof that every downstream authorization, application state, or collaboration artifact returned exactly as intended. That is an operational acceptance test, not a promise in the guest-policy preview documentation.

## Pilot Microsoft Entra guest lifecycle policies safely

In the Microsoft Entra admin center, the documented path is **ID Governance > Lifecycle Workflows > Lifecycle Policies > Guest Lifecycle Policies > Create policy**. Use it only after the inventory and precedence review are signed off.

Run the pilot as a sequence of evidence gates:

### 1. Create the narrow scope

Use direct group membership or supported attributes for a small population. Confirm each guest appears in scope and each excluded guest does not. Record the object IDs, not just display names.

### 2. Enable one rule

Start with a rule that can be safely created in the lab—for example, minimum sponsor count or pending invitation redemption. Avoid combining every signal in the first test because a single unexpected result will be harder to attribute.

### 3. Select disablement and a grace period

Do not begin with Delete. Confirm notification recipients and give the service's daily evaluation enough time to produce a documented state transition.

### 4. Inspect the evaluated population

The policy view exposes guests in scope, compliance state such as Compliant, Noncompliant, or Not evaluated, and the policy enforced for a guest. Compare those results with the before-state inventory.

### 5. Prove the sponsor journey

Have the sponsor open **My Account > Sponsored guests**, review activity and assignment context, and extend only a guest whose business need is known. Verify the attestation update. A sponsor decision is a business assertion; preserve who made it and when.

### 6. Prove enforcement and recovery

Allow one approved test guest to reach disablement. Verify sign-in is blocked as intended, capture the policy state, then execute the documented recovery. Recheck the account after the next evaluation rather than assuming a manual enable permanently overrides an unresolved policy violation.

### 7. Add one variable at a time

Add the next rule, population, or more destructive action only after the prior gate passes. The site's [Lifecycle Workflows safety-controls guide](/posts/microsoft-entra-lifecycle-workflows-safety-controls) offers a useful general pattern for scope preview, quarantine, execution limits, and evidence even though guest lifecycle policies have their own policy experience.

## Monitor policy state and directory outcomes

Build an operations view around four evidence layers:

**Policy state:** policy ID, enabled state, scope, priority, rule values, grace period, action, and last configuration change.

**Evaluation state:** guests in scope, winning policy, compliance state, and processing status. Because Microsoft documents once-daily evaluation, avoid promising an immediate state change.

**Notification state:** intended recipients, delivery failure, sponsor response, and the business decision. A message sent is not the same as an attestation completed.

**Directory outcome:** account-enabled state, deletion or restoration state, invitation redemption, sponsor relationships, and material access after the action.

Microsoft Entra audit logs provide traceable tenant changes, and Lifecycle Workflows audit guidance says workflow actions are recorded for up to 30 days. Export evidence when the organization's retention requirement is longer; do not rely on the portal as an indefinite record. ([Microsoft Entra audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities), [Lifecycle Workflows auditing](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-audits))

> **Analysis:** The guest-policy page documents its own processing and compliance views. The general Lifecycle Workflows audit pages document workflow audit retention. Confirm the exact preview events emitted by your tenant before building an alert or compliance control around a specific activity name.

## Troubleshoot the first broken boundary

### Guest is missing from scope

Verify `userType = Guest`, the creation-date or attribute condition, and **direct** group membership. Check exclusions and every higher-priority policy. Nested group membership does not satisfy the documented group scope.

### Guest is controlled by the wrong policy

List every matching policy and compare priority. The service does not merge rules from several policies; the highest-precedence match wins. Move a policy only after calculating which other guests will change owner.

### Policy remains idle or guests show Not evaluated

Confirm the policy is enabled, the tenant has the Identity Governance entitlement and connected guest meter, and a daily evaluation has had time to run. Preserve the policy ID, tenant ID, UTC timestamps, and screenshots or exports of the observed state.

### Sponsor did not receive the message

Confirm that a sponsor is assigned, the sponsor object has a usable mail address, and the configured notification stage has actually been reached. Review additional-recipient settings and delivery errors. If the guest came through SharePoint, check the documented sponsor-population limitation.

### Sponsor extended access but the guest is still noncompliant

Verify the attestation timestamp, then inspect every other enabled rule. Sponsorship extension does not satisfy activity, redemption, access-package, or sponsor-count requirements by itself.

### Guest was re-enabled and disabled again

Treat this as evidence that the policy violation remains. Fix the verified sponsor, activity, assignment, redemption, scope, or precedence condition—or disable the policy under approved change control—before restoring service again.

### A guest was deleted unexpectedly

Stop wider enforcement by disabling the implicated policy if change authority permits, preserve the policy and directory evidence, and identify the remaining in-scope population. Microsoft says deleted users are restorable for 30 days. Restore only after confirming the exact object and business owner, then revalidate access rather than assuming restoration is complete rollback.

## Rollback and escalation

Rollback means stopping the policy from causing another unwanted action, not erasing the evidence. Disable the affected policy, preserve its scope and priority, and record every guest that was noncompliant, disabled, or deleted. Do not delete the policy as a first response; Microsoft soft-deletes policy objects, and a restored policy returns disabled at the lowest priority, which can complicate reconstruction.

Escalate to Microsoft when the documented scope, precedence, daily evaluation, rule result, or action differs from the observed tenant behavior. Include the tenant ID, policy ID, affected guest object IDs, UTC timestamps, preview region/cloud, license and meter evidence, exact scope and exclusions, full priority order, rule values, grace period, action, processing/compliance state, sponsor state, invitation state, and sanitized audit evidence. Do not include invitation secrets or personal data that the support case does not require.

## Guest lifecycle policy administrator checklist

- [ ] Record that the feature is Public Preview, public-cloud only, and has no SLA.
- [ ] Approve Identity Governance licensing and guest MAU billing through an Azure subscription.
- [ ] Use Lifecycle Workflows Administrator rather than a broader role where possible.
- [ ] Inventory guest objects, sponsors, direct groups, activity, invitations, access packages, and direct access.
- [ ] Define one primary search or operational intent for each policy population.
- [ ] Put narrow policies above broad policies and prove the winning policy per guest.
- [ ] Pilot direct membership; do not depend on nested groups.
- [ ] Test one rule at a time before combining conditions.
- [ ] Configure a grace period and monitored notification recipients.
- [ ] Pilot Disable before Disable-then-delete or Delete.
- [ ] Prove sponsor attestation in My Access.
- [ ] Verify policy state, directory outcome, recovery, and the next daily evaluation.
- [ ] Export evidence before the applicable portal retention window expires.
- [ ] Document the 30-day user restoration window without calling it complete rollback.

## Frequently asked questions

### Are Microsoft Entra guest lifecycle policies generally available?

No. Microsoft currently labels them Public Preview, available in the public cloud, without an SLA and not recommended for production workloads. Microsoft has not published a GA or mandatory-enforcement date in the cited sources.

### Do guest lifecycle policies evaluate nested groups?

No. Microsoft says group inclusion and exclusion use direct membership and nested groups are not evaluated.

### What happens when two policies match one guest?

The guest is assigned to only one policy. The highest-precedence matching policy is enforced; lower policies are not evaluated for that guest.

### Can a policy delete a guest automatically?

Yes. The preview supports Delete, Disable, and Disable-then-delete. Start with a narrow pilot, grace period, and disablement. Microsoft says a deleted user remains restorable for 30 days, but administrators should still validate downstream access after restoration.

### Is sponsor attestation the same as an access review?

No. Sponsor attestation confirms that a sponsor says the guest still has a business need. Other policy rules and resource-level authorization remain separate.

### How often are enabled guest lifecycle policies evaluated?

Microsoft currently documents once-daily evaluation. Design monitoring and support expectations around that schedule rather than promising an immediate transition.

## Microsoft primary sources

- [What's new in Microsoft Entra: November 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-november-2026/4556457)
- [Guest lifecycle policies in Lifecycle Workflows](https://learn.microsoft.com/en-us/entra/id-governance/guest-lifecycle-policies)
- [Manage sponsored guests in My Account](https://learn.microsoft.com/en-us/entra/id-governance/manage-sponsored-guests-my-access)
- [Sponsors field for B2B users](https://learn.microsoft.com/en-us/entra/external-id/b2b-sponsors)
- [Microsoft Entra ID Governance licensing fundamentals](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals)
- [Restore or remove a recently deleted user](https://learn.microsoft.com/en-us/entra/fundamentals/users-restore)
- [Microsoft Entra audit log activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities)
- [Auditing Lifecycle Workflows](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-audits)
