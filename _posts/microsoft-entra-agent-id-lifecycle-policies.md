---
title: "Microsoft Entra Agent ID Lifecycle Policies: Admin Guide"
excerpt: "Deploy Microsoft Entra Agent ID lifecycle policies safely: compare default and custom rules, pilot priority, monitor enforcement, and recover agents."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-08T09:30:10-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra Agent ID lifecycle policies evaluate whether an agent identity is still active, accountable, and needed, then notify its responsible people and eventually disable or delete the identity when the policy is not satisfied. The safe starting point is a small pilot with **specific agent identities**, named fallback recipients, disablement before deletion, and evidence from the policy view, audit logs, and agent sign-in logs.

That is the short answer to **how to deploy Microsoft Entra Agent ID lifecycle policies**. Grab a coffee before enabling one across the tenant, though. The word *lifecycle* can sound like housekeeping. This control can stop token issuance or soft-delete a directory object that an active business process still depends on.

Microsoft announced the capability in its November 2026 Entra roundup. Both the fixed default inactivity policy and custom lifecycle policies are in **Public Preview**. Microsoft says previews have no service-level agreement and are not recommended for production workloads. No general-availability date or mandatory-enforcement date is published, and the documented setup still requires an administrator to enable the policy. ([November 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-november-2026/4556457), [Agent ID lifecycle policy documentation](https://learn.microsoft.com/en-us/entra/id-governance/agent-lifecycle-policies), [default inactivity policy](https://learn.microsoft.com/en-us/entra/id-governance/agent-default-inactivity-policy))

> **Documentation boundary:** This guide is based on current Microsoft primary documentation. It does not claim hands-on validation in a production tenant. Preview labels, roles, licensing, portal paths, timing, and enforcement behavior can change; recheck the linked sources before every rollout ring.

## Microsoft Entra Agent ID lifecycle policies: choose the right model

There are two policy models, and they solve different operational problems.

**The default inactivity policy** is available without an Agent 365 license. Its rule and enforcement milestones are fixed. An administrator can scope it to all agent identities or all except selected identities, add fallback notification recipients, and enable or disable it. Use this when the organization accepts Microsoft's fixed inactivity sequence and needs a broad baseline.

**Custom Agent ID lifecycle policies** require the documented agent-governance licensing. They can combine periodic reconfirmation, a minimum sponsor count, and inactivity monitoring; target selected agents; choose disable, delete, or disable-then-delete actions; use grace periods; and establish priority between overlapping policies. Use these when business populations need different accountability or retirement rules. ([custom policy model](https://learn.microsoft.com/en-us/entra/id-governance/agent-lifecycle-policies), [default policy model](https://learn.microsoft.com/en-us/entra/id-governance/agent-default-inactivity-policy))

This intent is distinct from assigning sponsors. The site's [Agent ID sponsors guide](/posts/microsoft-entra-agent-id-sponsors-admin-guide) explains who is accountable, how ownership differs from sponsorship, and how sponsor succession works. A lifecycle policy consumes that accountability relationship and can enforce when the relationship or continuing need is missing.

It is also narrower than the overall [Microsoft Entra Agent ID security architecture](/posts/microsoft-entra-agent-id-security-architecture-conditional-access-governance). Conditional Access controls the conditions under which an agent requests access; access packages govern assigned resources; lifecycle policies decide whether the agent identity should remain usable at all.

## Understand the default Agent ID inactivity policy

Microsoft's current default policy has a fixed timeline measured from inactivity:

- At **60 days inactive**, notify the agent identity's sponsors and owners.
- At **90 days inactive**, disable the agent identity.
- At **455 days inactive**, delete the agent identity.

Those milestones are not customizable. Microsoft defines inactivity here as the agent identity not causing token issuance during the period. A user can return the agent to active status by interacting with it or otherwise causing it to take action. Once the identity is disabled or deleted, only an owner or administrator can recover it; a sponsor cannot re-enable or restore it. ([default policy behavior](https://learn.microsoft.com/en-us/entra/id-governance/agent-default-inactivity-policy#agent-id-default-inactivity-policy-behavior))

Do not translate “available to all tenants” into “already enforcing in every tenant.” The documented procedure says an authorized administrator opens **ID Governance > Lifecycle Workflows > Lifecycle Policies > Agent ID (Preview)**, selects **Default Agent Identity Inactivity Lifecycle Policy**, turns on **Enable policy**, and saves. Capture that enabled state in the change record.

The default policy supports two scopes:

- **All Agent IDs** includes every agent identity.
- **All Agent IDs except selected** lets an administrator exclude named identities that legitimately remain quiet, such as seasonal or limited-use agents.

Exclusions need an owner and an expiry review. An exclusion is not a pause button with a built-in end date; it allows the selected identity to remain inactive indefinitely under the default policy. Record why each object is excluded, who approved it, and when the exception will be reconsidered.

The default policy notifies sponsors and owners. When neither exists, it uses the fallback recipients configured by the administrator. Microsoft supports individual addresses and group mailboxes for that fallback. Use a monitored team mailbox rather than one employee whose departure can recreate the orphaning problem the policy is meant to solve. ([default policy scope and notification](https://learn.microsoft.com/en-us/entra/id-governance/agent-default-inactivity-policy#configure-the-agent-id-default-inactivity-policy))

## Design custom rules around continuing need

A custom policy can use one or more of three rules.

### Periodic reconfirmation

Periodic reconfirmation asks a sponsor or owner to confirm that the agent is still required. Microsoft allows a frequency from **30 through 730 days**. If reconfirmation is overdue, the agent enters the configured notification and enforcement process, and the responsible person can use the Manage Agents experience to extend the agent's lifecycle.

Choose a period based on the business decision, not the technical convenience. A high-impact finance agent might justify a shorter review than a well-controlled annual process. Reconfirmation proves that a person asserted continuing need; it does not prove that every permission remains least-privileged.

### Minimum sponsor requirement

The minimum-sponsor rule checks whether the agent has the configured number of sponsors. If the identity falls below that number, the available accountable people are prompted to update sponsorship. If no accountable person exists, the fallback recipient becomes the recovery boundary.

Do not set a higher number merely because more sounds safer. Every sponsor should understand the agent's purpose, data access, owner, and retirement authority. Two decorative names are weaker than one active sponsor backed by a monitored succession process.

### Inactivity monitoring

Custom inactivity monitoring evaluates whether the agent identity has gone without token issuance beyond the configured duration. Microsoft documents token issuance—not “useful business output,” job completion, API success, or downstream data access—as the service signal. ([custom lifecycle rules](https://learn.microsoft.com/en-us/entra/id-governance/agent-lifecycle-policies#configure-lifecycle-rules))

> **Analysis:** Token issuance is a control-plane signal. It can prove that Entra issued no token for the identity during the measured period, but it does not prove that the business process is unused. An agent might use a non-Entra credential, a different identity, a long-lived downstream session, or a schedule that runs less often than the threshold. Reconcile the policy signal with the agent owner's workload evidence before destructive enforcement.

## Calculate policy priority before enabling anything

Custom policies do not merge. When several enabled policies include the same agent identity, the **highest-priority matching policy** applies. The default inactivity policy is always last, so any active matching custom policy takes precedence over it. ([policy priority](https://learn.microsoft.com/en-us/entra/id-governance/agent-lifecycle-policies#set-policy-priority), [default-policy precedence](https://learn.microsoft.com/en-us/entra/id-governance/agent-default-inactivity-policy#policy-priority))

Build a precedence register with one row per policy and record:

- policy name, identifier, enabled state, and priority;
- intended population and individual exclusions;
- reconfirmation, sponsor, and inactivity rules;
- action, grace period, and deletion delay where applicable;
- sponsors, owners, fallback recipients, and operational owner; and
- the test identity that proves the expected winning policy.

A sensible order might put a narrow regulated-agent policy first, an application-family policy second, a broad custom baseline below it, and the Microsoft default last. The specific order is an organization decision. The safety rule comes from the service: changing priority can change which enforcement model owns every overlapping agent.

After any scope or priority change, calculate the winning policy for the whole pilot population again. Do not review only the policy you moved.

## Pass the preview, license, and role gates

The default and custom paths have different prerequisites.

**Default inactivity policy:** Microsoft says no license is required. The documented roles are Lifecycle Workflows Administrator, AI Administrator, or Agent ID Administrator.

**Custom lifecycle policies:** Microsoft documents Microsoft 365 E7, which includes Agent 365 and the Entra Suite, or Microsoft Agent 365 paired with at least Microsoft Entra ID P1 or Microsoft 365 E3. The policy-management roles are Lifecycle Workflows Administrator or AI Administrator. ([Agent ID lifecycle prerequisites](https://learn.microsoft.com/en-us/entra/id-governance/agent-lifecycle-policies#prerequisites), [Identity Governance licensing fundamentals](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals))

Verify the products actually present in the tenant rather than inferring entitlement from an edition name in a procurement sheet. Microsoft's licensing page directs administrators to **Billing > Licenses > Licensed features** and **All products** for the tenant's current state.

Use the least-privileged eligible role for configuration and separate policy administration from business approval. A person who can create a lifecycle policy should not be the only person deciding whether the population may be disabled or deleted.

## Build an agent inventory before policy scope

For every pilot identity, record at least:

- agent identity display name, object ID, status, creation date, and blueprint ID;
- business purpose, normal execution schedule, and expected periods of silence;
- technical owner, human sponsor, cosponsors, and escalation mailbox;
- access packages, group memberships, app roles, OAuth grants, and Entra roles considered material;
- last known agent sign-in and token activity, with UTC timestamps;
- parent blueprint and any paired agent user;
- recovery owner and whether the workload can tolerate disablement; and
- expected policy, rule result, notification recipient, and action.

Microsoft's tenant view is **Entra ID > Agents > Agent identities**. It exposes status, owners, sponsors, granted permissions, sign-in logs, object ID, and blueprint application ID. Owners and sponsors can also use **My Account > Manage agents** for identities they own or sponsor. ([manage agent identities as an administrator](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-admin), [Manage Agents experience](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-end-user))

Do not scope by display name alone. Agent identities are represented by service-principal-derived directory objects, blueprints are application-derived objects, and an agent user is user-derived. The site's [blueprint disable runbook](/posts/disable-microsoft-entra-agent-id-blueprint) explains why choosing the parent blueprint instead of the individual agent changes the blast radius.

## Pilot Microsoft Entra Agent ID lifecycle policies safely

Microsoft's custom-policy procedure supports **Specific agents** as the verification scope. Use it.

### 1. Start with test identities that represent real boundaries

Choose a few low-impact agent identities with known owners and sponsors. Include one normally active agent, one intentionally quiet agent, one with insufficient sponsors, and one whose owner can execute recovery. Do not use a production-critical agent as the first enforcement proof.

### 2. Configure one rule at a time

Begin with either minimum sponsors or periodic reconfirmation so the responsible-person journey can be observed without pretending a short inactivity window represents normal business use. Microsoft sets **30 days** as the minimum periodic-reconfirmation frequency even for testing, so plan for a real preview window rather than inventing an instant lifecycle result.

### 3. Use disablement before deletion

Custom policies support **Disable**, **Delete**, and **Disable and delete**. A grace period gives accountable people time to remediate the violation before action. For the first pilot, choose Disable. Prove the scope, notification, blocked issuance, owner recovery, and next policy evaluation before considering deletion. ([custom policy actions and verification](https://learn.microsoft.com/en-us/entra/id-governance/agent-lifecycle-policies#configure-policy-actions))

### 4. Prove notifications reach people who can act

Trigger an approved violation and confirm the expected sponsor, owner, or fallback recipient receives enough context to make a decision. Then open **My Account > Manage agents** as the responsible person and verify the supported action. Microsoft says a sponsor can disable an agent but cannot re-enable it; an owner or administrator must handle recovery. ([owner and sponsor actions](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-end-user#enable-or-disable-an-agent))

### 5. Allow one approved test identity to be disabled

Capture the before-state, notification, policy result, audit event, and sign-in evidence. Verify that the identity cannot obtain new tokens through its expected path. Also test the business process and downstream application rather than treating a disabled directory flag as complete operational proof.

### 6. Recover through the named owner

Resolve the rule violation first: add the required sponsor, complete reconfirmation, or document why the inactivity threshold is wrong. Have an authorized owner or administrator re-enable the identity, then verify token issuance and the actual business transaction. If the unresolved rule still applies, the next evaluation can place the identity back into enforcement.

### 7. Expand only one variable per ring

Add one population, one rule, or one action after the previous ring has produced expected evidence. The site's [Lifecycle Workflows safety-controls guide](/posts/microsoft-entra-lifecycle-workflows-safety-controls) provides a useful operating pattern for scope review, bounded pilots, monitoring, and cancellation even though Agent ID lifecycle policies use their own preview experience.

## Monitor policy enforcement with the right evidence

Use four evidence layers.

**Policy evidence:** identifier, enabled state, scope, rules, action, grace period, priority, fallback recipients, and last change.

**Directory evidence:** agent object ID, enabled or deleted state, owner, sponsors, blueprint, access relationships, and recovery state.

**Audit evidence:** agent events appear under their base directory types. An agent identity creation, update, or deletion appears as a service-principal event, while a blueprint appears as an application event and an agent user appears as a user event. Use the `agentType` and `blueprintId` fields to prove that the event is agent-related and correlate the identity with its blueprint. ([Microsoft Entra Agent ID audit logs](https://learn.microsoft.com/en-us/entra/agent-id/sign-in-audit-logs-agents#audit-logs))

**Sign-in evidence:** agent requests can appear across the sign-in log types because agents can use delegated or app-only permissions. In **Entra ID > Monitoring & health > Sign-in logs**, filter by **Is Agent** or **Agent type**. Microsoft also documents an `agentSignIn` event type and a beta Microsoft Graph query for agent identity sign-ins. Treat the beta endpoint as preview evidence, not a stable automation contract. ([Agent ID sign-in logs](https://learn.microsoft.com/en-us/entra/agent-id/sign-in-audit-logs-agents#sign-in-logs))

Preserve exact UTC timestamps, tenant ID, object ID, blueprint ID, policy name and ID, audit correlation data, sign-in request or correlation ID where present, and the expected versus observed action. “The agent stopped working yesterday” is not enough for a Microsoft escalation.

## Recover from disablement or deletion

Disablement and deletion are not equivalent.

**Disablement** leaves the object in place and prevents future sign-ins or token issuance. Microsoft documents that owners or administrators can re-enable an agent identity; sponsors cannot. Before re-enabling, verify that the policy violation is fixed and that the identity has not become a security incident.

**Deletion** is a soft deletion. Microsoft Graph documentation says a deleted agent identity is moved to a temporary container and can be restored within **30 days**. After that, it is permanently deleted. The recovery owner should capture permissions and relationships before destructive tests and validate them after restoration rather than assuming every downstream system repairs itself. ([delete agent identity behavior](https://learn.microsoft.com/en-us/graph/api/agentidentity-delete?view=graph-rest-1.0), [delete and restore agent identity objects](https://learn.microsoft.com/en-us/entra/agent-id/howto-delete-agent-identity))

Do not confuse deleting one agent identity through a lifecycle policy with deleting its parent blueprint. Microsoft documents that deleting a blueprint or blueprint principal can start asynchronous cascade cleanup of child agent identities and paired agent users. Restoring the parent after cleanup has run does not automatically restore every child. ([agent identity deletion and cascade behavior](https://learn.microsoft.com/en-us/entra/agent-id/concept-agent-identity-deletion))

> **Analysis:** A deletion feature with a 30-day restoration window is still destructive production change. Recovery time, recreated credentials, permission continuity, downstream caches, and missed business executions need an application-owner test; the directory recycle bin alone is not a rollback plan.

## Troubleshoot the first broken boundary

### An active agent is marked inactive

Confirm that the observed work actually causes token issuance for this specific agent identity. Check the object ID and blueprint ID in the sign-in evidence. The workload might be using a different identity, an agent user, an API key, a cached downstream session, or a parent blueprint path. Do not shorten or lengthen the threshold until the identity boundary is proven.

### The wrong lifecycle policy applies

List every active custom policy whose scope contains the identity and compare priority. The highest-priority matching custom policy wins; the default policy is last. Correct the scope or priority only after recalculating every other overlapping agent.

### Nobody received the notification

Verify that the identity has a current owner or sponsor, that those objects have usable delivery addresses, and that the configured fallback recipients are monitored. Confirm that the identity reached the documented notification stage. Preserve the policy and identity IDs before escalating.

### A sponsor cannot re-enable the agent

That is documented behavior, not a role propagation delay. Sponsors can disable an identity in Manage Agents but cannot re-enable it. Route recovery to an owner or administrator, then review whether the support process made that boundary clear.

### The agent is re-enabled and then disabled again

Check whether the underlying rule violation remains. Re-enabling the object does not remove an overdue reconfirmation, missing sponsor, or inactivity condition. Repair the policy evidence first, then validate the next evaluation.

### Audit logs show ordinary service-principal events

That is expected. Agent identity activity is recorded under base identity types. Inspect `agentType` for `agenticAppInstance` and use `blueprintId` for correlation rather than filtering only on an imagined “agent lifecycle” activity name.

### The policy page or controls are missing

Confirm the tenant has received the Public Preview experience, the operator has one of the documented roles, and custom-policy licensing is present where required. Preserve the tenant ID, role activation, license view, portal path, UTC time, and screenshots. Do not infer a rollout ring or invent a Message Center identifier when authenticated evidence is unavailable.

## Microsoft Entra Agent ID lifecycle policy checklist

- [ ] Record Public Preview status and obtain change approval.
- [ ] Choose the fixed default policy or licensed custom policy deliberately.
- [ ] Confirm the exact tenant products and least-privileged role.
- [ ] Inventory agent object IDs, blueprints, owners, sponsors, permissions, activity, and recovery owners.
- [ ] Document expected silent periods and non-Entra authentication paths.
- [ ] Add a monitored fallback recipient before broad scope.
- [ ] Map every overlapping policy and prove the winning priority.
- [ ] Pilot with Specific agents and one rule at a time.
- [ ] Use Disable before Delete or Disable and delete.
- [ ] Verify notification, sponsor action, owner recovery, and the real business transaction.
- [ ] Monitor policy state, directory state, audit logs, and agent sign-ins.
- [ ] Preserve exact identifiers and UTC timestamps for escalation.
- [ ] Test restoration inside the documented 30-day soft-delete window before trusting it as recovery.
- [ ] Review exclusions and priority after every policy change.

## Things people ask

*Is the default Agent ID inactivity policy automatically on?* Microsoft's current setup documentation tells an administrator to open the policy and toggle **Enable policy**. Treat availability and enabled enforcement as separate states.

*Does the default policy require Microsoft Agent 365?* No. Microsoft says no license is required for the default inactivity policy. Custom lifecycle policies require Microsoft 365 E7 or Microsoft Agent 365 paired with the documented Entra P1 or Microsoft 365 E3 prerequisite.

*What counts as inactivity?* For these policies, Microsoft describes inactivity as no tokens issued for the agent identity during the configured period. That is not the same as proving no business value or downstream activity.

*What happens if a custom and default policy both match?* The active custom policy takes precedence. Among custom policies, the highest-priority matching policy applies. The default policy is always last.

*Can a sponsor recover a disabled agent?* No. Microsoft says sponsors can disable an agent but cannot re-enable or restore it. An owner or administrator must recover it.

*Can a deleted agent identity be restored?* Microsoft documents a 30-day soft-delete restoration window for agent identities. Validate access, credentials, and the business workflow after restoration; recovering the directory object is only one layer of recovery.

## Where to read further

- [Microsoft Entra Agent ID lifecycle policies](https://learn.microsoft.com/en-us/entra/id-governance/agent-lifecycle-policies)
- [Agent ID default inactivity policy](https://learn.microsoft.com/en-us/entra/id-governance/agent-default-inactivity-policy)
- [Governing agent identities](https://learn.microsoft.com/en-us/entra/id-governance/agent-id-governance-overview)
- [Manage Agent ID identities in the organization](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-admin)
- [Manage agents as an owner or sponsor](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-end-user)
- [Microsoft Entra Agent ID logs](https://learn.microsoft.com/en-us/entra/agent-id/sign-in-audit-logs-agents)
- [Delete and restore Agent ID objects](https://learn.microsoft.com/en-us/entra/agent-id/howto-delete-agent-identity)
- [Microsoft Entra ID Governance licensing](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals)
