---
title: "Migrate Microsoft Entra Risk Policies to Conditional Access"
excerpt: "Migrate legacy Microsoft Entra risk policies to Conditional Access before October 1, 2026, with report-only testing, evidence, rollback, and monitoring."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-06T03:20:03-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

If your tenant still enforces **User risk policy** or **Sign-in risk policy** from the Microsoft Entra ID Protection dashboard, the clock is running. Microsoft says those legacy risk policies retire on **October 1, 2026**. The replacement is not a new risk engine. It is a pair of risk-based Conditional Access policies that consume the same Microsoft Entra ID Protection signals and give you better testing, diagnostics, and control.

Here is the short answer: to **migrate Microsoft Entra risk policies to Conditional Access**, document the two legacy policies, build separate user-risk and sign-in-risk Conditional Access policies in report-only mode, validate real sign-ins and recovery paths, enable the new policies, and only then disable the legacy policies. Do not combine both risk conditions in one policy, and do not wait until retirement day to discover that users cannot complete MFA or secure remediation.

Grab a coffee and protect the emergency accounts first. This is a control-plane migration, but a bad cutover can still become an authentication outage.

Microsoft confirms the deadline in both its current [risk-policy configuration guide](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-risk-policies#migrate-risk-policies-to-conditional-access) and [risk-based access policy reference](https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-policies#migrate-id-protection-risk-policies-to-conditional-access). This is a **retirement of the legacy policy configuration**, not a retirement of ID Protection risk detections. It is not a preview, an optional portal refresh, or a default-on policy rollout: administrators must create and enable the Conditional Access replacements.

## Migrate Microsoft Entra risk policies without changing the decision model

Keep the two risk objects separate:

- **Sign-in risk** belongs to one authentication request. ID Protection estimates the probability that the request is not from the authorized user and passes that level to Conditional Access.
- **User risk** belongs to the account. It represents the probability that the identity itself is compromised and can persist across sign-ins until it is remediated or dismissed.

Conditional Access then evaluates the applicable user, target resource, conditions, grant controls, and session controls. The site's [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) explains that control plane in depth; the existing [ID Protection risk-policy guide](/posts/microsoft-entra-id-protection-risk-policies) covers the underlying difference between user risk and sign-in risk.

Microsoft explicitly says not to combine the two risk conditions in one Conditional Access policy. Separate policies preserve separate response logic and make report-only evidence understandable. A sign-in-risk event normally asks the user to prove the sign-in with strong authentication. A user-risk event can invoke the newer **Require risk remediation** control, which selects the appropriate remediation path for the user's authentication model.

The migration should therefore preserve intent, not blindly copy labels:

- **Legacy sign-in risk policy → Conditional Access sign-in-risk policy.** Microsoft's baseline is Medium and High sign-in risk, the built-in Multifactor authentication strength, and Sign-in frequency set to Every time.
- **Legacy user risk policy → Conditional Access user-risk policy.** Microsoft's current baseline is High user risk with Require risk remediation. That selection automatically adds an authentication-strength grant and makes Sign-in frequency — Every time mandatory.
- **Tenant-specific exclusions and thresholds → reviewed Conditional Access scope.** Preserve justified exceptions, but do not copy years of accumulated exclusions without confirming their owners and compensating controls.

Those baselines come from Microsoft's [current configuration procedure](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-risk-policies#enable-policies). Microsoft also says the acceptable thresholds can differ by organization. Treat its configuration as a strong starting point, then validate your own population and risk appetite.

## Know what changes when Conditional Access owns enforcement

ID Protection still detects and scores risk. Conditional Access becomes the policy engine that decides what must happen when the sign-in or user matches the configured risk level. Microsoft lists several advantages of the move: report-only evaluation, Microsoft Graph policy management, sign-in-frequency controls, more granular conditions, clearer sign-in-log diagnostics, and support for the backup authentication system.

The security consequence is straightforward. If you disable the legacy policies before an equivalent Conditional Access path is enabled, matching risk can go without your intended automated response. If you enable an over-broad replacement without validating registration and recovery, legitimate users can be blocked.

The new user-risk control also deserves a fresh design review. Microsoft's [risk-based policy reference](https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-policies#require-risk-remediation-control) describes adaptive behavior:

- for password users, the flow can require MFA and a secure password change, then revoke previous sessions;
- for passwordless users whose risk is not tied to a compromised password, it can revoke sessions and require sign-in again;
- for an attacker-added device detection, it can disable the Entra device, revoke sessions, and require reauthentication.

Require risk remediation applies to **user risk**, not sign-in risk. It is not supported for external and guest users. Microsoft also documents policy precedence: Require risk remediation overrides Require password change, while Block overrides both. Avoid assigning one person to multiple conflicting user-risk policies.

> [!NOTE]
> **Analysis:** this makes a one-for-one screenshot copy a weak migration method. The current Conditional Access control can behave differently for password, passwordless, guest, and device-compromise scenarios. Preserve the business outcome, then compare the old and new enforcement paths.

## Meet the licensing, role, and recovery prerequisites

[Microsoft's current prerequisites](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-risk-policies#prerequisites) require **Microsoft Entra ID P2 or Microsoft Entra Suite** for full ID Protection capability and list **Conditional Access Administrator** as the least-privileged role for creating or editing these policies. The [risk-investigation prerequisites](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-investigate-risk#prerequisites) list Reports Reader for sign-in and audit logs and Global Reader for the ID Protection risk reports.

Before building replacements, confirm:

- affected member users have the required entitlement;
- users can complete an MFA method that satisfies the chosen authentication strength;
- hybrid password users have the required password-change path, including password writeback where applicable;
- passwordless users have been included in the design rather than treated as a password-reset exception;
- at least two emergency access accounts are available, monitored, and excluded from policies that could block or restrict their sign-in;
- interactive service accounts have an explicit disposition, and service principals are governed with workload-identity controls rather than user-scoped Conditional Access;
- the support team knows how to distinguish a risky sign-in, a risky user, and a separate Conditional Access failure.

Microsoft warns that users who cannot perform the required MFA or remediation step are blocked and require administrator intervention. Its [emergency access guidance](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access) recommends at least two cloud-only emergency accounts, separate credentials, monitoring, and regular validation. Report-only policies do not block sign-in, but exclude the emergency accounts before the policy is turned on.

## Inventory the legacy policies before creating replacements

Open **ID Protection > Dashboard**, then inspect both the legacy User risk and Sign-in risk policies. Capture their state before changing anything:

- included users or groups;
- exclusions, group owners, and the reason for each exception;
- selected risk levels;
- the legacy control or response;
- whether the policy is currently enforced;
- operational owners, help-desk documentation, and any known problem populations.

Then inventory the surrounding controls that can change the outcome:

- existing Conditional Access policies that already target user risk or sign-in risk;
- authentication strengths and registered methods;
- sign-in-frequency controls;
- named locations that influence some risk calculations;
- emergency access exclusions;
- policies scoped to guests, service accounts, or passwordless cohorts;
- recent risky users, risky sign-ins, and unresolved detections.

Do not use the retirement as an excuse to carry duplicate or contradictory policies into the new plane. If Conditional Access already contains a risk policy, compare its immutable policy ID, scope, risk threshold, grant control, session control, and state with the proposed replacement.

For a read-only programmatic inventory, Microsoft documents the v1.0 endpoint **GET /identity/conditionalAccess/policies** with the least-privileged **Policy.Read.All** permission. The [Microsoft Graph list-policies reference](https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-list-policies?view=graph-rest-1.0) is the authoritative schema. Treat exported policy JSON and screenshots as evidence, not as a substitute for reviewing the effective result.

## Build the two replacements in report-only mode

### Create the user-risk policy

In the Microsoft Entra admin center, go to **Entra ID > Conditional Access**, create a new policy, and use a name that clearly identifies the migration and control. Microsoft's current baseline is:

1. Include All users.
2. Exclude the emergency access accounts.
3. Include All resources.
4. Set User risk to High.
5. Grant access with Require risk remediation.
6. Choose the authentication strength appropriate for the organization.
7. Confirm that Sign-in frequency — Every time is automatically applied and mandatory.
8. Set the policy to Report-only and create it.

Do not silently convert an old Require password change policy into Block. That is a different response with a different recovery burden. Do not target guests with Require risk remediation; Microsoft's documented control does not support them.

### Create the sign-in-risk policy

Create a second policy. Microsoft's current baseline is:

1. Include All users.
2. Exclude the emergency access accounts.
3. Include All resources.
4. Set Sign-in risk to Medium and High.
5. Grant access with the built-in Multifactor authentication strength.
6. Add Sign-in frequency — Every time.
7. Set the policy to Report-only and create it.

If a distinct passwordless cohort needs Passwordless MFA or Phishing-resistant MFA, Microsoft documents a separately scoped passwordless sign-in-risk policy. Confirm that every targeted user can satisfy the strength before enforcement. A stronger control that nobody can complete is a block policy wearing a nicer label.

## Validate policy impact with three evidence streams

### 1. Use What If for deterministic scope checks

Run **Entra ID > Conditional Access > Policies > What If** for representative users and resources. Microsoft's [current What If documentation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool) says enabled and report-only policies are included, and the result shows policies that apply, policies that do not apply, grant controls, session controls, and the first unmet condition.

Provide every relevant condition, especially the identity, target resource, device platform, client app, and risk level. Microsoft warns that an omitted condition can prevent the new What If API from evaluating a policy as expected. Also remember that What If does not evaluate service dependencies, so a simulation is necessary but not sufficient.

Test at least:

- a normal member user at no, medium, and high sign-in risk;
- a high-risk password user;
- a high-risk passwordless user;
- an emergency access account;
- an excluded service account;
- an external or guest user;
- an administrator and a normal user;
- one application with known service dependencies.

### 2. Read report-only results from real sign-ins

Allow the report-only policies to collect representative production evidence. In **Entra ID > Monitoring & health > Sign-in logs**, open a sign-in and inspect both the Conditional Access and Report-only tabs. Microsoft's [sign-in activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details#report-only) recommends report-only mode so administrators can evaluate potential effect before enabling a policy.

For each sample, preserve:

- sign-in time and correlation ID;
- user, client app, and target resource;
- user-risk and sign-in-risk levels;
- the new policy's report-only result;
- other applicable Conditional Access policies;
- the predicted grant and session controls;
- whether the user has a registered method that can satisfy the result.

Use the site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) when the result is unexpected. A report-only Success does not mean a user completed the new control; it means the log can show how the report-only policy would have evaluated.

### 3. Inspect current risk and remediation readiness

Microsoft recommends reviewing active risks before enabling new policies. Use the ID Protection dashboard, Risky users, Risky sign-ins, and Risk detections to find accounts that could hit the replacement immediately. The [ID Protection investigation guide](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-investigate-risk) also points administrators to the Risk policy impact analysis workbook and sign-in logs.

If sign-in logs already flow to Log Analytics, the impact workbook can show which users or sessions might be blocked, challenged for MFA, or sent through secure password change. This is especially useful before report-only has collected enough new data.

Do not manufacture a production risk event just to prove the policy. Microsoft publishes controlled simulation guidance, but it requires dedicated test accounts and, for some scenarios, unusual network tooling. Use it only in an approved test plan.

## Cut over in rings before October 1

> [!NOTE]
> **Operational recommendation:** Microsoft defines the report-only, enable, then legacy-disable order. The ring structure below is Sentinel Identity analysis for applying that order with a smaller blast radius.

### Ring 0: evidence and emergency access

Record the legacy configurations, export existing Conditional Access policies, validate emergency accounts, review active risks, and establish success and rollback criteria. Leave both replacements in report-only.

### Ring 1: test identities

Use dedicated test users representing password, passwordless, hybrid, administrative, and exception paths. Review What If, report-only sign-in results, authentication-method readiness, and the expected self-remediation experience.

### Ring 2: low-risk production cohort

Turn on the replacement policies for a bounded pilot group while the remaining population stays on the legacy path. Monitor risky sign-ins, risky users, sign-in failures, help-desk contacts, and unexpected authentication-strength failures.

### Ring 3: broad production scope

Expand the Conditional Access policies to the intended production population. Confirm the new policies are enforcing the expected risk thresholds and that exclusions remain narrow. Avoid unrelated threshold, authentication-strength, or named-location changes during the same cutover window.

### Ring 4: disable the legacy policies

Only after the Conditional Access policies are on and evidence shows the intended result, return to **ID Protection > Dashboard**, open the legacy User risk and Sign-in risk policies, and set **Enforce policy** to Disabled. This is the order Microsoft publishes: create equivalent Conditional Access policies in report-only, validate and turn them on, then disable the old policies.

Record the change time, operator, legacy settings, new Conditional Access policy IDs, pilot evidence, and any remaining exceptions. Complete the migration before October 1, 2026; the retirement date is not a safe cutover window.

## Roll back without reopening a protection gap

Your rollback unit is the **new Conditional Access policy**, not ID Protection as a whole.

- If one cohort cannot satisfy the control, move the affected users into a time-bound, owner-approved exclusion while you repair authentication readiness.
- If one replacement policy is broadly mis-scoped, set that policy to Report-only while the legacy equivalent remains enforced.
- If the new user-risk flow is the problem, investigate authentication strength, user method registration, passwordless behavior, and hybrid password-change prerequisites before weakening the sign-in-risk policy.
- If users remain blocked after a policy correction, investigate and remediate their risk state; changing policy scope does not prove the identity is safe.
- If both new policies behave correctly, do not re-enable a legacy policy merely because an unrelated Conditional Access policy failed.

Microsoft's [risk remediation guide](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-remediate-unblock) explains the difference between self-remediation, dismissing a false positive, confirming compromise, password recovery, and emergency containment. Preserve that distinction during a migration incident.

If your tenant cannot produce a clean comparison, keep the replacements in report-only, leave the legacy controls enforced, and open a Microsoft support request. Microsoft publishes the support routing under the migration section: describe the issue as **Migrate legacy ID Protection policy**, select Microsoft Entra Sign-in and Multifactor Authentication, and use Identity Protection / Configure risk policies.

## Monitor the replacement after cutover

**Operational recommendation:** for the first two weeks, review the following daily:

- Conditional Access failures involving either new policy;
- report-only-versus-enabled differences from the migration window;
- risky users who cannot self-remediate;
- sign-in risks that remain at risk instead of moving to remediated;
- authentication-strength failures by method and cohort;
- emergency account activity;
- exclusion-group membership changes;
- help-desk volume and repeat failure patterns.

After stabilization, move to the tenant's normal identity-risk review cadence. Microsoft documents that a successful MFA challenge can remediate sign-in risk, while user-risk remediation depends on the configured flow and authentication model. Do not measure success only by fewer tickets. Measure whether risky events receive the intended control and reach the expected remediated state.

The site's [Microsoft Entra backup and recovery strategy](/posts/microsoft-entra-id-backup-recovery-strategy) is useful for the broader question of capturing configuration state and operating recovery evidence. It does not replace a policy-specific rollback plan.

## Administrator checklist

- [ ] Confirm whether both legacy ID Protection risk policies are enabled
- [ ] Record legacy scope, exclusions, risk levels, controls, and owners
- [ ] Inventory existing Conditional Access risk policies and duplicates
- [ ] Verify Microsoft Entra ID P2 or Microsoft Entra Suite licensing
- [ ] Verify MFA, password, passwordless, and hybrid remediation readiness
- [ ] Validate at least two monitored emergency access accounts
- [ ] Create separate user-risk and sign-in-risk replacement policies
- [ ] Start both replacements in report-only mode
- [ ] Run What If with complete sign-in conditions
- [ ] Review real report-only results and active risk populations
- [ ] Pilot a bounded cohort and preserve correlation IDs
- [ ] Expand the new policies without bundling unrelated changes
- [ ] Enable the Conditional Access replacements before disabling legacy enforcement
- [ ] Disable both legacy policies before October 1, 2026
- [ ] Monitor failures, remediation states, exclusions, and emergency access
- [ ] Record the new policy IDs, cutover evidence, rollback, and support path

The safest migration is deliberately boring: two policies, two risk objects, one controlled overlap, and evidence at every step. Microsoft Entra ID Protection keeps producing the risk signal; Conditional Access becomes the supported enforcement plane. Move early enough to validate real behavior, and October 1 becomes a completed change record instead of an outage deadline.
