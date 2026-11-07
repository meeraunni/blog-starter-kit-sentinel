---
title: "Conditional Access Policy Plans: Safe Migration Guide"
excerpt: "Migrate to Conditional Access policy plans safely: map shared conditions, validate rules, avoid duplicate enforcement, and preserve a clean rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-07T17:02:51-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The Conditional Access estate has grown to 60 policies, six naming conventions, and three different versions of the emergency-access exclusion. Nobody planned it that way. Each policy made sense when it was created; years later, one change to the administrator population has to be repeated across a small forest of rules without missing a branch.

**Conditional Access policy plans** give you a safer way to organize that estate. A plan holds the assignments and conditions shared by one security objective, while its rules add the scenario-specific controls. The safe migration is to group only policies with the same intent, inspect what the migration tool promotes into shared conditions, run the new rules beside the originals in report-only mode, and cut over one controlled group at a time.

Grab a coffee before you merge anything. Policy plans are in **Public Preview**, not generally available, and they do not replace the Conditional Access evaluation engine. Existing policies and plan rules evaluate independently; every applicable control must still be satisfied. Microsoft announced the preview on November 4, 2026, and has not published a mandatory migration or general-availability date. ([Microsoft announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/scale-access-controls-with-microsoft-entra-conditional-access-policy-plans/4569647), [policy plan concepts](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policy-plans))

> **Documentation boundary:** This guide is based on current Microsoft primary documentation. It does not claim hands-on validation in a production tenant. Preview behavior, supported conditions, portal labels, and licensing can change, so recheck the linked sources before each deployment ring.

## Conditional Access policy plans: the short version

A policy plan has three layers:

1. **Plan details** record a name, description, optional tags, and owners. Owners document accountability; they do not grant permission to edit the plan.
2. **Shared conditions** define the identities, resources, actions, authentication contexts, risks, device platforms, network locations, or client app types that every rule should inherit.
3. **Rules** add the assignments, conditions, grant controls, and session controls that vary by scenario.

At sign-in, Entra combines a rule's settings with the plan's shared conditions and evaluates that rule as its own enforcement decision. Each rule appears separately in the sign-in log. Standalone policies continue to evaluate at the same time, with no precedence or automatic deduplication between the two models. ([policy plan runtime behavior](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policy-plans))

That last point is the migration risk. Creating a plan does not retire, suppress, or reinterpret the original policies. If the originals are On and the new rules are also On, both sets enforce. Depending on the controls, that can be harmless duplication, repeated prompts, a more restrictive combined result, or a lockout.

The site's [Conditional Access evaluation pipeline guide](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) explains why the most restrictive applicable outcome wins. Read it before treating a policy plan as a folder or a display-only grouping.

## Decide what belongs in one plan

A good plan represents one sentence that a policy owner can defend:

- “Protect privileged administrators with strong authentication and managed-device requirements.”
- “Apply the organization’s baseline controls to the finance population.”
- “Secure access to this regulated application family.”

A bad plan is “everything Conditional Access.” Shared conditions are inherited broadly, and one edit can affect every rule beneath the plan. The larger and less coherent the plan, the harder it is to predict the blast radius of that edit.

Microsoft recommends grouping migration candidates by a common protected resource, persona, or condition. The migration experience works best when the selected policies already share an intent. It identifies settings common to the selected policies, proposes those settings as shared conditions, and maps each original policy to a rule. Your job is to decide whether that mechanical intersection also represents the business intent. ([migration guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-conditional-access-policy-plan))

I would reject a proposed group when any of these are true:

- the policies have different owners, exception processes, or review cycles;
- a shared exclusion is legitimate for one control but unsafe for another;
- one policy is an emergency containment control that needs independent activation;
- the policies protect unrelated applications merely because their targeting happens to match today; or
- the plan would mix a user objective with a workload or agent objective that needs a different identity boundary.

Do not optimize for the fewest plans. Optimize for a change boundary that another administrator can understand during an incident.

## Understand inheritance before you migrate

Policy plans are useful because inheritance removes repeated scope, but inheritance is also where a small edit becomes a large change.

**Plan targeting flows into every rule.** If the plan includes a group, every rule inherits that group. Rules can add their own conditions and exclusions, but they cannot narrow away an inherited inclusion by pretending it was never set.

**Exclusions accumulate.** An exclusion at the plan level applies to every rule and cannot be removed by a rule. A rule can add another exclusion. This makes the plan level a sensible home for genuine, universal emergency-access exclusions, but a dangerous place for a temporary app-specific exception.

**Identity types must stay coherent.** Shared conditions cannot mix identity types. If a design needs separate rules for people and agents, leave identity assignment at the rule level rather than forcing both into the plan scope. For service principals, Microsoft directs administrators to Conditional Access for workload identities. Agent-targeted Conditional Access also carries additional Microsoft Agent 365 licensing requirements. ([policy plan targeting rules](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policy-plans), [Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing))

**Some broad assignments belong on the rule.** Microsoft says **All users** is not available in shared conditions, and **All resources** is selected at the rule level. Build the design around the documented model instead of trying to reproduce a standalone policy field for field at the plan layer. ([create a policy plan](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-create-conditional-access-policy-plan))

Before configuration, draw the effective scope for each proposed rule as:

`plan inclusions + rule inclusions + plan conditions + rule conditions - all plan and rule exclusions`

That notation is analysis, not Microsoft syntax. It forces the reviewer to calculate the effective rule instead of reading only the rule pane and forgetting inherited scope.

## Pass the preview, role, license, and recovery gates

The preview should enter the same change process as any control that can block token issuance.

**Preview status.** Policy plans are available in Public Preview under the Supplemental Terms of Use for Microsoft Azure Previews. Record that status in the change ticket and avoid describing the control as mandatory or generally available.

**Role.** Microsoft requires the **Conditional Access Administrator** role to create, modify, or delete a policy plan. Use an eligible, time-bound activation where your administrative model supports it. The owner field inside a plan is descriptive; it does not make someone a Conditional Access Administrator. ([policy plan roles](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policy-plans))

**License.** Conditional Access requires Microsoft Entra ID P1. Risk-based controls require P2 capabilities, and agent-targeted controls have their own Agent 365 requirements. License the users and scenarios covered by the rules rather than assuming the preview label makes enforcement free. ([Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing))

**Emergency access.** Maintain at least two tested, cloud-only emergency access accounts and exclude their dedicated group from policies that block or restrict sign-in. Microsoft says report-only policies do not require the exclusion because they do not enforce, but the exclusion must be present before a rule moves On. The site's [emergency access account runbook](/posts/microsoft-entra-emergency-access-accounts-admin-guide) covers the separate credentials, monitoring, and validation drill this requires. ([Microsoft emergency access guidance](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access))

**Rollback authority.** Name who can set plan rules Off and who can restore the original policies. A rollback that depends on the same population, device state, or authentication method being changed is not a recovery path.

## Build a migration evidence pack

Before opening the migration wizard, export or record the current configuration for every candidate policy. Capture at least:

- policy display name, object identifier, state, owner, purpose, and change record;
- included and excluded identities, groups, roles, resources, actions, and authentication contexts;
- conditions for risk, platform, location, client app, device filters, and authentication flows;
- grant and session controls, including whether multiple grant controls use AND or OR;
- named-location definitions and the teams that own their IP data;
- recent sign-in evidence showing Success, Failure, Not applied, and report-only outcomes; and
- the emergency accounts and service identities expected to remain outside enforcement.

Use the inventory to create an equivalence matrix: one row per original policy, one proposed rule, and columns for every setting. Mark settings promoted to the plan separately from settings retained on the rule. A reviewer should be able to explain every difference before the new plan exists.

This is also the time to clean up ambiguity, not necessarily the time to delete anything. A policy with no owner, no known business purpose, or no recent matching sign-ins should be investigated separately. Moving an unexplained policy into a plan gives the mystery a nicer container; it does not make the policy understood.

## Run the Conditional Access policy plan migration safely

### 1. Choose one small, related policy family

Start with two or three well-understood policies protecting the same resource or persona. Avoid the tenant-wide baseline, privileged administrators, and high-risk blocks for the first migration. The first ring is proving the operating model as much as the feature.

In the Microsoft Entra admin center, browse to **Entra ID > Conditional Access > Policies**, open **Migrate to Conditional Access Policy plans (Preview)**, select the related policies, and choose **Merge policies into a plan**. ([migration procedure](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-conditional-access-policy-plan))

### 2. Review the proposal as a new control

The tool identifies common settings and proposes shared conditions. Do not approve the proposal because the counts look right. Compare every inclusion, exclusion, condition, grant control, session control, and state with the evidence pack.

Add a clear plan description, tags that match the change-management model, and named owners. Remember that ownership is documentation, not authorization. Confirm that plan-level exclusions are truly universal for every rule now and every likely rule later.

### 3. Leave every generated rule Off

Microsoft says rules generated by migration start **Off**, and the original policies are not changed. That is the correct first state: the new structure exists, but it produces neither enforcement nor report-only evidence yet. ([migration state behavior](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-conditional-access-policy-plan))

Take another configuration snapshot now. If the proposal is wrong, edit or remove the preview plan while the originals continue to protect access.

### 4. Move the new rules to Report-only

Set each reviewed rule to **Report-only**. Entra evaluates report-only rules during sign-in but does not enforce them, and results appear in sign-in details. Templates also create rules Off; Microsoft directs administrators to review them, then move them through report-only before enforcement. ([create and validate policy plans](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-create-conditional-access-policy-plan), [analyze Conditional Access policy impact](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only))

Keep the original policies On during this phase. You are comparing proposed behavior with the controls that still enforce, not creating a gap.

Report-only is not completely invisible to users. Microsoft documents that a report-only policy requiring a compliant device can prompt people on macOS, iOS, and Android to select a device certificate, even though compliance is not enforced. It also says items in the **User Actions** scope cannot be evaluated in report-only mode. Account for both limits in the pilot rather than promising a zero-touch observation period. ([report-only limitations](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only))

### 5. Compare runtime results, not just configuration

Browse to **Entra ID > Monitoring & health > Sign-in logs**. For representative users, applications, devices, networks, and client types, compare each plan rule's report-only result with its original policy's enforced result.

Each rule appears as a separate entry. Check expected matches and expected nonmatches, especially:

- emergency and service-account exclusions;
- admin, guest, and pilot-group membership;
- managed, compliant, registered, and unmanaged device states;
- trusted, untrusted, VPN, and home-network paths;
- browser, mobile, desktop, and noninteractive requests; and
- grant controls that can be satisfied by an existing authentication claim.

The [Conditional Access sign-in log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) shows how to preserve the correlation ID and read every policy result. Report-only is evidence about requests that occurred; it is not proof for a scenario the pilot never exercised.

> **Location caveat:** During the preview, Microsoft says policy plans targeting users with Location as a condition receive one-hour access tokens without instant IP enforcement check. Microsoft's CAE documentation also describes named-location cases where real-time location enforcement is unavailable. Treat that as a documented design constraint, not a portal defect. ([policy plan preview limitation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policy-plans), [CAE named-location limitations](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation#named-location-limitations))

### 6. Cut over one rule family

Choose a maintenance window with the rollback operator online. Set the validated plan rules On, then disable the corresponding original policies. Keep the interval between those changes short, preserve the exact timestamps, and test the same representative paths again.

Microsoft's migration guidance says originals remain unchanged throughout migration and should be disabled only after the plan rules are enabled and validated. Do not delete them during the cutover. Retain the disabled originals for the organization's approved validation and evidence period. ([decommission guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-conditional-access-policy-plan#decommission-the-original-policies))

The site's [MFA rollout strategy](/posts/microsoft-365-mfa-rollout-strategy-conditional-access-authentication-strength) is useful when one of the migrated rules changes authentication strength or registration expectations. A structural migration and an authentication-method migration should not be hidden inside the same change window.

## Roll back without opening an enforcement gap

Rollback is a state transition, not a deletion exercise:

1. Set the affected plan rules Off.
2. Re-enable the preserved original policies from the evidence pack.
3. Verify emergency access first, then the failed pilot path, then representative normal access.
4. Record sign-in correlation IDs and exact change times.
5. Leave the plan in place but Off while the team identifies the mismatch.

If the incident is a duplicate-enforcement problem and the originals are still On, turning the new plan rules Off removes the new enforcement layer. If the originals were already disabled, re-enable them as part of the same controlled rollback. Do not delete either model while an incident is active; the configuration is evidence.

Escalate to Microsoft when the effective configuration and sign-in evidence contradict the documented evaluation result. Include tenant ID, UTC time window, request and correlation IDs, plan and rule names, original policy names, observed result, expected result, and the change sequence. Screenshots without identifiers are not enough for backend tracing.

## Conditional Access policy plans checklist

- [ ] Record Public Preview status and obtain change approval.
- [ ] Confirm Conditional Access Administrator access and applicable P1, P2, or Agent 365 licensing.
- [ ] Group only policies with one shared security objective.
- [ ] Export every original policy and build a setting-by-setting equivalence matrix.
- [ ] Verify two tested emergency access accounts and universal exclusions.
- [ ] Review every shared condition, inherited inclusion, and accumulated exclusion.
- [ ] Keep generated rules Off until the proposal is reviewed.
- [ ] Run the new rules in report-only while originals continue enforcing.
- [ ] Compare sign-in results across representative identities, resources, devices, networks, and clients.
- [ ] Account for the preview's location and token limitation.
- [ ] Enable plan rules and disable originals in one controlled cutover.
- [ ] Preserve disabled originals through the validation and retention period.
- [ ] Test rollback before expanding to another policy family.

## Things people ask

*Do policy plans replace existing Conditional Access policies?* No. They are an additional model. Existing policies and plan rules evaluate side by side, and every applicable control must be satisfied.

*Does migrating a policy turn the original off?* No. Microsoft says the original policy is unchanged and the generated rule starts Off. You decide when to move the rule to report-only or On and when to disable the original.

*Can a rule override a plan-level exclusion?* No. Plan and rule exclusions accumulate. A plan-level exclusion applies to every rule and cannot be removed by one rule.

*Can I put users, workload identities, and agents into one shared scope?* Shared conditions cannot mix identity types. Leave identity assignment at the rule level when different rule types must coexist, and apply the separate licensing and feature requirements for workload or agent scenarios.

*Should I delete the original policies after cutover?* Not immediately. Disable them after the plan is enabled and validated, then retain them for the organization's approved observation and evidence period. Delete only after the team has proved stable behavior and the rollback record is no longer required.

*Is report-only enough to prove the migration?* It proves how the rule evaluated for sign-ins that actually occurred. It cannot prove an untested identity, device, network, client, or resource path. Pair report-only evidence with controlled test cases and the configuration equivalence matrix.

## Where to read further

- [Conditional Access policy plan concepts](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policy-plans)
- [Create a Conditional Access policy plan](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-create-conditional-access-policy-plan)
- [Migrate policies to a policy plan](https://learn.microsoft.com/en-us/entra/identity/conditional-access/how-to-migrate-conditional-access-policy-plan)
- [Analyze Conditional Access policy impact](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only)
- [Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)
- [Manage emergency access accounts](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)
- [Microsoft policy plans announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/scale-access-controls-with-microsoft-entra-conditional-access-policy-plans/4569647)
