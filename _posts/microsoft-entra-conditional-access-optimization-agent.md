---
title: "Microsoft Entra Conditional Access Optimization Agent"
excerpt: "Deploy the Microsoft Entra Conditional Access Optimization Agent safely: validate roles, SCU capacity, report-only suggestions, phased rollout, and rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-27T17:06:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The **Microsoft Entra Conditional Access Optimization Agent** reviews your Conditional Access estate for gaps, overlap, and unusual policy activity, then gives administrators suggestions to review. The safe deployment pattern is to start with read-and-recommend behavior, prove the agent's identity and Security Copilot capacity, review every proposed policy against real sign-in evidence, and keep new policies in report-only mode until a bounded pilot is ready for enforcement.

Grab a coffee before selecting **Start agent**. This is not a background wizard that should inherit authority by accident. Microsoft's current overview says the agent can suggest new policies, changes to existing policies, and consolidation of similar policies. It also makes two important control promises: an administrator must explicitly approve a change to an existing policy, and a newly suggested policy is created in report-only mode. ([Conditional Access Optimization Agent overview](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization))

This guide is for Entra and security administrators deciding whether to enable the agent, migrating an older deployment to an Agent ID, or building a review and rollout process around its suggestions. It does not claim hands-on tenant testing. Product behavior, limits, licensing, and preview boundaries below come from current Microsoft documentation; operational recommendations are labeled as analysis where they go beyond the documented product behavior.

## Microsoft Entra Conditional Access Optimization Agent: the short answer

Use this sequence:

1. Confirm the tenant has Microsoft Entra ID P1 and usable Microsoft Security Copilot capacity. Confirm whether capacity is included for the tenant or must be provisioned; do not assume the agent is free because it is visible in the admin center.
2. Assign the narrowest supported Entra and Security Copilot access. Security Administrator is required for initial activation; readers can view, while Conditional Access Administrator and Security Administrator can act on suggestions.
3. Inventory enabled and report-only Conditional Access policies, emergency access exclusions, authentication-method readiness, recent sign-in volume, and policy owners before the first run.
4. For a new deployment, verify the agent uses its Microsoft Entra Agent ID. For an older deployment, review the one-way migration from user context before selecting **Create agent identity**.
5. Start with report-only policy creation disabled. Review the first suggestions, rationale, impacted objects, and policy details without authorizing a change.
6. Enable report-only creation only after the review path, change owner, monitoring window, and rollback authority are documented.
7. Treat phased rollout as a public-preview deployment assistant, not a substitute for policy design, pilot evidence, emergency access, or administrator approval.
8. Correlate the agent's suggestion with report-only results, sign-in logs, the Conditional Access Insights workbook where configured, support impact, and the live policy definition.
9. Enforce one bounded policy change at a time. If impact is wrong, disable the policy or use a tightly controlled temporary exclusion, then investigate before retrying.
10. Monitor Security Copilot consumption as well as policy outcomes. Removing the agent does not remove policies already created or changed from its suggestions.

The agent improves the review loop. It does not become the owner of your Conditional Access risk decision.

## Understand the control plane before enabling the agent

The agent joins four different controls that should remain distinguishable.

**Conditional Access** is the enforcement plane. Enabled policies evaluate sign-in context and apply grant or session controls. Report-only policies evaluate without enforcing those controls. The site's [Conditional Access evaluation pipeline guide](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) explains why several policies can contribute to one final sign-in result.

**The Optimization Agent** is the analysis and suggestion plane. Microsoft says it scans Conditional Access policies, checks for coverage gaps and possible consolidation, and avoids repeating an earlier suggestion. It can identify unprotected users, applications, and agent identities; recommend MFA, device, legacy-authentication, device-code, or risk controls; and surface unusual changes in policy activity. Some suggestion types require additional licenses or integrations. ([agent overview](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization))

**Microsoft Security Copilot** supplies access control and compute. The agent requires Security Copilot access and available Security Compute Units, or SCUs. Microsoft documents average consumption of less than one SCU per agent run, but actual capacity planning still belongs to the tenant. ([review suggestions and prerequisites](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-review-suggestions), [Security Copilot capacity](https://learn.microsoft.com/en-us/copilot/security/security-compute-units-capacity))

**The agent identity and administrator** supply authorization. New installations use a Microsoft Entra Agent ID by default. An administrator starts or configures the agent and separately decides whether to apply a suggestion. The identity that runs analysis is therefore not the same thing as the human approval for a policy change.

> [!IMPORTANT]
> **Analysis:** treat every suggestion as a proposed change record. Preserve the agent's rationale, independently export the before-and-after policy definition, identify the affected population, record who approved enforcement, and link the monitoring window. That evidence lets you explain the decision without treating an AI-generated recommendation as authority.

## Confirm licensing, capacity, and roles

Microsoft's current prerequisites require at least **Microsoft Entra ID P1**, available Security Copilot capacity, and a supported role. Risky-user and risky-sign-in suggestions require Entra ID P2, while device-based suggestions require Microsoft Intune licensing. Do not translate the baseline P1 requirement into a claim that every suggestion type is covered by P1. ([agent prerequisites and suggestion types](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization))

Security Copilot capacity has more than one acquisition model. Microsoft documents automatically included default capacity for eligible, onboarded Microsoft 365 E5 and E7 customers; other customers provision SCUs. Provisioned and overage capacity have different billing behavior, and usage can be reviewed in the Security Copilot monitoring experience. Confirm the model actually present in your tenant rather than copying an older cost assumption into the change ticket. ([SCU capacity and billing](https://learn.microsoft.com/en-us/copilot/security/security-compute-units-capacity), [manage Security Copilot usage](https://learn.microsoft.com/en-us/copilot/security/manage-usage))

Separate the role boundaries:

- **Security Administrator** can activate the agent for the first time and can act on suggestions.
- **Conditional Access Administrator** can review and act on suggestions when the administrator also has the required Security Copilot access.
- **Security Reader** and **Global Reader** can view the agent and suggestions but cannot take action.
- Some integrations add requirements. For example, Microsoft's Intune integration guidance says the agent needs Global Administrator, or Conditional Access Administrator together with Global Reader, to produce Intune suggestions; Conditional Access Administrator alone is insufficient for that integration.

Security Copilot roles are not Microsoft Entra roles. Microsoft's authentication reference explains that Security Copilot RBAC controls access to Copilot capabilities, while Entra roles determine access to identity data and actions. Validate both layers. ([Security Copilot authentication and roles](https://learn.microsoft.com/en-us/copilot/security/authentication))

**Analysis:** separate activation, policy approval, and monitoring across people or groups where staffing permits. A reader can validate impact, a Conditional Access Administrator can own the policy change, and a Security Copilot owner can monitor capacity. That separation is operational design, not a Microsoft product requirement.

## Build a baseline before the first run

The agent reviews the tenant it sees. A weak baseline makes a reasonable suggestion difficult to evaluate.

Capture:

- every enabled and report-only Conditional Access policy, including object ID, state, included and excluded identities, target resources, conditions, grant controls, session controls, and last modification time;
- the two or more cloud-only emergency access accounts and their exclusions;
- authentication-method registration and device-compliance readiness for populations that a suggestion might target;
- named locations, authentication strengths, terms of use, authentication contexts, and Global Secure Access conditions referenced by policy;
- policy owners, change windows, support contacts, and the last known normal sign-in baseline;
- current Security Copilot role assignments, agent configuration, SCU capacity, and usage owner; and
- existing alerts or incidents that could explain a sudden spike or dip in policy activity.

Microsoft's Conditional Access deployment plan says to exclude emergency access accounts, test with a pilot group, confirm authentication-method readiness, communicate impact, and use report-only mode before enforcement. It recommends at least one week of report-only observation before turning on a policy. ([Conditional Access deployment plan](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access))

Use the site's [emergency access accounts operating guide](/posts/microsoft-entra-emergency-access-accounts-admin-guide) to test the recovery path, not merely the exclusion checkbox. An account excluded from one proposed policy can still be affected by another policy, a missing credential, or an untested operational dependency.

## Start with the safest agent settings

Browse in the Microsoft Entra admin center to **Security Copilot agents**, open the **Conditional Access Optimization Agent**, and select **Start agent**. Microsoft also exposes the agent from Conditional Access. The agent runs on a daily schedule based on initial configuration, and administrators can run it manually. Activity-triggered runs are a separate preview capability. ([agent overview](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization), [agent settings](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-settings))

For the first observation period:

1. monitor the user and application object types relevant to the pilot;
2. leave the ability to create report-only policies disabled;
3. keep activity-based runs disabled unless their preview behavior is explicitly in scope;
4. configure a small notification audience with a named response owner; and
5. do not enable ServiceNow implementation automation or upload knowledge files until their data, permission, and change-control implications have separate approval.

With report-only creation disabled, Microsoft says the agent still provides the suggestion, insights, and policy details; an administrator must approve before a report-only policy is created. That is the cleanest first-run boundary. Once reviewers can consistently reconcile suggestions with tenant evidence, the setting can allow the agent to create a new policy in report-only mode. It still does not authorize enforcement. ([agent settings](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-settings))

The documented agent limits matter when interpreting silence. Microsoft currently lists a 24-hour scan window, up to 300 users and 150 applications per run, and 40 similar policy pairs per consolidation run. No suggestion does not prove universal coverage. It can mean the observed objects did not produce a new finding within those boundaries. ([review suggestions and limitations](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-review-suggestions))

## Verify or migrate the Microsoft Entra Agent ID

New installations default to a Microsoft Entra Agent ID. Older installations can move from a specific user's context to an agent identity. Microsoft says the migration does not change existing policies, recommendations, reporting, or analytics, but the tenant cannot switch back to the former user-context model. A Security Administrator performs the change. ([agent identity settings](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-settings#agent-identity))

Before selecting **Create agent identity**:

- record the current execution identity and its effective roles;
- preserve the latest successful run and recent failures;
- review the proposed agent identity and permissions;
- identify monitoring and incident owners for the new identity;
- confirm the irreversible migration is approved; and
- schedule a post-change run that can be compared with the pre-change baseline.

After migration, verify that the agent identity appears in Microsoft Entra Agent ID, the next run succeeds, expected suggestions remain visible, and no role was granted more broadly to compensate for a failed run.

**Analysis:** do not keep the former user privileged as a fallback merely because the new identity needs troubleshooting. Preserve evidence, repair the documented agent path, and use an approved administrator session for diagnosis.

## Review a suggestion before any policy change

Open **Review suggestion** and answer five questions.

### What problem did the agent identify?

Distinguish a coverage gap, proposed modification, policy consolidation, and an activity anomaly. A report that activity changed is a prompt to investigate; it is not proof that the policy is wrong.

### Which exact objects and time window informed it?

Record the users, groups, applications, agent identities, platforms, and policy IDs shown. Compare the suggestion with the documented scan limits and with sign-ins outside the observed window.

### What would the policy definition change?

Export or capture the current policy and proposed state. Review every include, exclude, target resource, condition, grant control, session control, and policy state. For consolidation, check semantic differences rather than accepting a similar-looking pair. Microsoft says consolidation considers policies that differ by no more than two conditions or controls, but administrative review is still required. ([agent overview](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization))

### Can the population satisfy the control?

Check authentication registration, device state, supported client paths, guest behavior, service dependencies, and help-desk readiness. If the recommendation uses risk, Intune, Defender, or Global Secure Access signals, validate the extra integration and license boundary.

### What evidence will authorize enforcement?

Define the report-only window, pilot group, expected sign-in outcomes, error budget, support threshold, rollback owner, and approval record before creating or turning on the policy.

Use the [Conditional Access sign-in-log troubleshooting guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) to inspect the policy result, conditions, grant controls, and authentication details for representative successes and failures. Do not rely only on the agent's summary.

## Use report-only and phased rollout without confusing them

Report-only mode evaluates a Conditional Access policy but does not enforce its grant or session controls. Microsoft explicitly says it does not block the user or require MFA. There is an important exception in the user experience: a report-only compliant-device policy can still cause certificate-selection prompts on macOS, iOS, and Android. That behavior belongs in the pilot plan. ([Conditional Access report-only insights](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only), [review suggestions](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-review-suggestions))

Microsoft lists **phased rollout with the Conditional Access Optimization Agent** as public preview. The release note says the agent analyzes sign-in data to recommend a staged plan for a report-only policy, starting with smaller groups and expanding. The report-only guidance clarifies that this is not classical A/B testing: the report-only policy remains available for comparison while ordered cohorts move through enforcement. ([Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#october-2026), [report-only policy insights](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only))

The dedicated phased-rollout procedure currently requires authorized Microsoft Learn access, so this article does not invent tenant-specific buttons, timing, eligibility rules, or ring calculations that cannot be independently reviewed here. Use the current procedure available in the tenant for the mechanics, preserve the preview label, and apply these gates to every ring:

- emergency access remains excluded and tested;
- the group membership for the next ring is exported and approved;
- the previous ring completed its monitoring window;
- report-only and enforced outcomes match the expected decision;
- sign-in failures and support contacts stay within the approved threshold;
- required authentication methods and devices are ready; and
- one named administrator can pause expansion and disable the enforced policy.

**Analysis:** the agent can recommend ring order, but the organization still owns business criticality. A technically low-risk cohort can contain executives, responders, kiosk accounts, or a time-sensitive workload. Overlay the agent's plan with operational context before approval.

## Monitor policy outcomes and Security Copilot usage

Monitor three evidence layers after every accepted suggestion.

**Agent evidence:** preserve the suggestion type, rationale, impacted objects, proposed definition, reviewer, decision, and agent run time. A later run should not replace the evidence used for the earlier approval.

**Conditional Access evidence:** inspect the live policy object and representative sign-ins. Compare report-only and enforced results over the same period. Microsoft's Conditional Access Insights and Reporting workbook can compare outcomes by time range, application, and user; it requires Entra ID P1 and a Log Analytics workspace receiving sign-in logs. ([report-only policy insights](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only))

**Capacity evidence:** review SCU consumption by capability and the tenant's provisioned, included, or overage capacity. Agent documentation describes average consumption, not a guaranteed maximum. Set a budget owner and investigate unexpected usage rather than silently increasing capacity. ([manage Security Copilot usage](https://learn.microsoft.com/en-us/copilot/security/manage-usage))

Track at least:

- coverage changes for users, applications, and agent identities;
- report-only success, failure, not-applied, and user-action results;
- policy-specific sign-in failures and authentication interruptions;
- support volume by platform, client, and location;
- unexpected exclusions, duplicate controls, and new policy overlap;
- agent run failures, stale suggestions, and identity or permission changes; and
- SCUs consumed by the agent compared with expected run frequency.

## Troubleshoot by the failed boundary

### The agent is not available

Confirm the tenant has the required Entra license, Security Copilot onboarding or included capacity, usable SCUs, and supported administrator access. Visibility in one portal does not prove that all prerequisites are active.

### The agent starts but the run fails

Check the identity model first. Microsoft notes that older deployments activated before the Agent ID model can fail when they depend on a user's PIM-eligible role that is not active at run time. Review the current execution identity and consider the documented Agent ID migration instead of permanently activating the human role. ([agent overview FAQ](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization#faqs))

### The agent produces no suggestions

Confirm monitored object types, last run time, scan window, documented per-run limits, existing suggestions, and whether the relevant population is already covered. No new suggestion is not a compliance attestation. Perform an independent policy and sign-in review.

### Intune suggestions are missing

Verify Intune licensing and the documented role combination. Conditional Access Administrator alone is not enough for the agent to produce Intune suggestions. Confirm that relevant compliance or app-protection policies exist and target the expected platform and group.

### A report-only policy surprises users

Check whether it requires a compliant device and the user is on macOS, iOS, or Android. Microsoft documents repeated certificate-selection prompts even without enforcement. Narrow the test scope or exclude those platforms from that report-only compliance test while redesigning the pilot; do not infer that the policy already blocked the user.

### A suggestion would widen an exclusion

Stop and compare the affected accounts with the break-glass inventory and compensating controls. A convenient exclusion can create a durable coverage gap. Use the smallest temporary scope, owner, expiry, and follow-up action if a production recovery needs an exception.

### SCU usage is higher than expected

Review run frequency, manual runs, other Security Copilot workloads, overage configuration, and usage by capability. Do not attribute all tenant consumption to the Optimization Agent without the usage evidence.

## Roll back without losing the evidence

For a newly enforced policy, Microsoft's deployment guidance supports disabling the policy or temporarily excluding a trusted user or group. Prefer disabling the one new policy when the policy itself is wrong. Use exclusions sparingly, record an owner and expiry, and remove them after repair. ([Conditional Access deployment and rollback](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access#roll-back-policies))

For a suggested modification to an existing policy, restore the approved pre-change definition rather than guessing which field caused impact. Retest in report-only mode before enforcement.

Removing the Optimization Agent is a separate action. Microsoft says removal deletes the agent's activity, suggestions, and metrics, but policies created or updated from accepted suggestions remain. Export the evidence you are authorized to retain before removal, then review every surviving policy explicitly. ([agent removal behavior](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization#agent-removal))

Do not delete the agent as an emergency response to one bad policy. Disable or contain the policy first, preserve the suggestion and sign-in evidence, then decide whether the agent configuration also needs to change.

## Conditional Access Optimization Agent checklist

- [ ] Define the primary security and operational outcome for enabling the agent.
- [ ] Confirm Entra P1 and any P2 or Intune requirements for intended suggestion types.
- [ ] Confirm Security Copilot access, capacity model, SCU availability, and usage owner.
- [ ] Assign the narrowest Entra and Security Copilot roles.
- [ ] Export Conditional Access policies and validate emergency access before the first run.
- [ ] Verify a new deployment uses Microsoft Entra Agent ID.
- [ ] Review the one-way Agent ID migration before changing an older deployment.
- [ ] Start with report-only policy creation disabled.
- [ ] Preserve each suggestion's rationale, objects, proposed definition, and reviewer decision.
- [ ] Compare suggestions with sign-in logs and report-only results.
- [ ] Validate authentication-method, device, guest, client, and service readiness.
- [ ] Keep phased rollout labeled public preview.
- [ ] Approve one bounded policy change at a time.
- [ ] Monitor policy outcomes, support impact, agent health, and SCU consumption.
- [ ] Keep a tested disable or narrow-exclusion rollback path.
- [ ] Remember that removing the agent does not remove applied policies.

The useful outcome is not more Conditional Access policies. It is a smaller, explainable set of policies with fewer coverage gaps and a review trail that survives an incident. Let the agent find patterns humans might miss, but keep identity, approval, evidence, enforcement, and rollback under explicit administrative control.

## Microsoft sources

- [Microsoft Entra Conditional Access Optimization Agent](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization)
- [Conditional Access Optimization Agent settings](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-settings)
- [Review suggestions from the Conditional Access Optimization Agent](https://learn.microsoft.com/en-us/entra/security-copilot/conditional-access-agent-optimization-review-suggestions)
- [Conditional Access report-only insights and evaluation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only)
- [Plan a Microsoft Entra Conditional Access deployment](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access)
- [Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#october-2026)
- [Security Copilot authentication and roles](https://learn.microsoft.com/en-us/copilot/security/authentication)
- [Security Copilot SCU capacity](https://learn.microsoft.com/en-us/copilot/security/security-compute-units-capacity)
- [Manage Security Copilot usage](https://learn.microsoft.com/en-us/copilot/security/manage-usage)
