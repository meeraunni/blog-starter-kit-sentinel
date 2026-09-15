---
title: "Microsoft Entra SOC Identity Responder: Admin Guide"
excerpt: "Deploy the Microsoft Entra SOC Identity Responder role for least-privilege containment: scope its four actions, use PIM, preserve evidence, and test recovery."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-15T17:49:15-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The Microsoft Entra SOC Identity Responder role is the narrow built-in role for analysts who must contain a compromised non-administrator account from Microsoft Defender without receiving the much broader Security Operator or Security Administrator role. It grants four directory actions: disable a user, enable a user, invalidate refresh tokens, and reset a password.

That is the short answer. The important part over coffee is what the role does **not** solve. It does not make an analyst a full incident investigator, it cannot contain privileged accounts, and revoking refresh tokens does not directly destroy every application session already issued. A safe deployment therefore joins three control planes: Defender permissions for investigation, Entra permission for containment, and an incident procedure that handles cloud, hybrid, and application sessions correctly.

Microsoft introduced the role in **public preview** in its June 2026 Entra release notes. The current role definition is now explicit enough to operate against, but public preview is still not general availability. Pilot it, record the dependency, and keep a supported escalation path for incidents outside its boundary. [Microsoft's release record identifies the status and least-privilege purpose](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#public-preview---new-built-in-entra-role-for-soc-identity-response-in-microsoft-defender).

## Microsoft Entra SOC Identity Responder: what it grants

Microsoft's [built-in role reference](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference#entra-soc-identity-responder) lists role definition ID `58f930cc-fcf4-4152-852c-1d7dbf502139` and exactly four actions in the `microsoft.directory/users` namespace:

- disable users;
- enable users;
- invalidate all refresh tokens; and
- update passwords.

Those permissions map to four incident-response outcomes for a supported user account:

1. **Disable** blocks new authentication by setting the account unavailable for sign-in.
2. **Enable** reverses that account-state control after recovery is approved.
3. **Revoke sessions** invalidates Microsoft Entra refresh tokens so clients cannot silently use them to obtain new access tokens.
4. **Reset password** changes the compromised credential or forces the relevant password-remediation path exposed by the connected identity experience.

The role is classified as privileged because each action can interrupt access or change credentials. Narrow does not mean low impact. A mistaken disable or reset can stop a worker, service owner, executive, or incident responder at the worst possible time.

### The hard boundary: non-administrator users

The role is limited to non-administrative user accounts. Microsoft's current [privileged roles and permissions reference](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions) says SOC Identity Responder, Security Operator, and Security Administrator cannot perform these sensitive actions on privileged accounts.

Treat that boundary as deliberate separation of duties, not a defect to work around. If the suspected identity holds an Entra administrative role, owns or belongs to a role-assignable group, or is otherwise treated as privileged, escalate to the approved Privileged Authentication Administrator or Global Administrator response path. Do not temporarily strip protection from the target simply to make a containment button work.

> [!IMPORTANT]
> **Analysis:** build privileged-account containment as a separate, preapproved runbook. An incident is the wrong time to discover that the SOC role cannot act on the compromised administrator and nobody with the stronger recovery role is available.

### It is not a general user-management role

The four-action definition does not grant user creation, deletion, group management, license changes, profile edits, authentication-method administration, Conditional Access management, or role assignment. That is the role's value: an analyst can perform identity containment without inheriting a general administration surface.

It is also why you should assign the built-in role instead of recreating a custom role casually. Microsoft owns the preview role definition and can evolve the supported integration. If your automation refers to it, use the immutable role definition ID rather than matching only the display name.

## Separate investigation permission from containment permission

The SOC Identity Responder definition contains the four write actions and no broad read permission for incidents, alerts, identities, sign-ins, or audit logs. An analyst still needs the appropriate Microsoft Defender permission to see the evidence that justifies containment.

Microsoft Defender unified RBAC is the control plane for portal data and tasks across supported Defender workloads. Its current [permission reference](https://learn.microsoft.com/en-us/defender-xdr/custom-permissions-details) defines **Security data basics (read)** for incidents, alerts, investigations, hunting, devices, and reports, and **Response (manage)** for response and remediation actions. Microsoft also documents full unified-RBAC support for Microsoft Defender for Identity data and actions. [Review the active permission model before designing the analyst role](https://learn.microsoft.com/en-us/defender-xdr/manage-rbac).

Use two explicit grants:

- a Defender unified-RBAC assignment that gives the analyst only the investigation data and portal operations required by the SOC operating model; and
- the Entra SOC Identity Responder role that authorizes the four directory changes.

Do not assume one automatically supplies the other. The effective experience depends on the Defender workloads licensed and connected, the unified-RBAC activation state, data-source scope, the analyst's Defender assignment, the Entra role assignment, and the target account's privilege state.

> **Analysis:** this split is healthy. Read access can be scoped to the data an analyst supports, while the Entra role remains a small, auditable authority for high-impact containment. Document both assignments in the same access design even though they are managed in different control planes.

## Know what each containment action actually changes

The incident ticket should name the expected technical effect before the analyst selects an action. “Lock the account” is too vague for a defensible runbook.

### Disable the user

Disabling a cloud user prevents new sign-ins at Microsoft Entra ID. It does not guarantee that every existing access token or application-owned session disappears at that moment. Use it when the identity remains untrusted, the investigation is active, or credential reset alone cannot establish control.

For a synchronized hybrid identity, disable the source Active Directory account as well. Microsoft's [emergency user-revocation procedure](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access) separates the on-premises and Entra steps because a cloud-side action is not a replacement for containing the authoritative directory account.

Record the source of authority before acting. If the account supports a human-operated critical process, notify the incident commander and service owner where the response plan permits; containment remains a security decision, but avoid turning one compromised identity into an undocumented operational outage.

### Enable the user

Enable is recovery, not an automatic inverse button. Re-enable only after the incident owner confirms that credentials, registered authentication methods, devices, mailbox persistence, application consent, group or role changes, and other relevant footholds have been reviewed.

Re-enabling too early restores the attacker's opportunity. Re-enabling without fixing the on-premises source can also produce confusing state in a hybrid identity. Put the approval, recovery evidence, and intended source-of-authority state into the incident record first.

### Revoke active sign-in sessions

The role's `invalidateAllRefreshTokens` action invalidates refresh tokens. This forces clients back to Microsoft Entra when they need a new token, subject to application behavior and Continuous Access Evaluation support.

It is not a universal remote kill switch for every active session. Microsoft explains that an application can issue its own browser session cookie and controls when that session returns to Entra for reevaluation. Microsoft Entra cannot directly revoke a session token owned by an application. [The emergency revocation guidance documents that boundary](https://learn.microsoft.com/en-us/entra/identity/users/users-revoke-access#session-tokens-cookies).

Use the site's [token revocation and Continuous Access Evaluation guide](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) to set expectations with the incident team. Pair refresh-token invalidation with account disablement when immediate containment is warranted, and follow workload-specific revocation procedures when the application maintains its own session.

### Reset the password

A password reset removes one compromised secret. It does not prove that the device is clean, remove an attacker's registered authentication method, revoke malicious OAuth consent, rotate application credentials, or remediate an on-premises compromise.

For hybrid users, follow the source-of-authority and password-writeback design. Microsoft's emergency guidance recommends containing and resetting the Active Directory account in the on-premises directory before completing the Entra response. Do not let a convenient Defender action hide which directory owns the password.

## Build the access model before the incident

Start with a named responder group, an owner, an approver, and an expiry policy. Avoid assigning the preview role permanently to every SOC analyst merely because the permission set is small.

Microsoft's [Entra role best practices](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/best-practices) recommend least privilege, just-in-time access through Privileged Identity Management, recurring access reviews, multifactor authentication, and role assignments through groups where appropriate. Translate those principles into an operating design:

- keep a small on-call responder population;
- prefer eligible, time-bound access when incident latency and licensing permit;
- require phishing-resistant authentication for the analyst's privileged session;
- require a ticket or incident justification during activation;
- set a short activation duration that covers the response window;
- alert on assignment, activation, and sensitive user actions;
- review membership and activation history; and
- maintain a stronger escalation path for privileged targets.

### Use PIM when the activation delay is acceptable

PIM can make the role eligible instead of standing active. Microsoft's [PIM assignment procedure](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-how-to-add-role-to-user) distinguishes eligible from active assignments and supports time-bound access. Its [role-settings guide](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-how-to-change-default-settings) supports activation duration, MFA, authentication context, approval, justification, and notification settings.

For a 24-by-7 SOC, decide whether approval helps or delays urgent containment. A reasonable pattern is eligible access with strong activation controls but no human approval for the primary on-call group, combined with immediate activation alerts and post-incident review. A higher-risk environment might require approval from a continuously staffed independent team.

That is a risk decision, not a product default. Test the actual activation time during an exercise. The site's [PIM operator playbook](/posts/microsoft-entra-pim-roles-operator-playbook) covers the control design; do not add an approval dependency that disappears outside business hours.

PIM requires Microsoft Entra ID P2 or Microsoft Entra ID Governance licensing for covered users and approvers. Direct active role assignments remain available at lower Entra tiers, but they remove the just-in-time control. [Microsoft's current licensing guide separates those models](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-privileged-identity-management).

### Keep emergency access outside the same dependency chain

The responder role cannot contain privileged identities and a PIM-eligible responder might be unable to activate during an identity control-plane outage. Maintain tested emergency access accounts under the separate recovery design described in the site's [Entra emergency access guide](/posts/microsoft-entra-emergency-access-accounts-admin-guide).

Emergency access is not the normal way to bypass the SOC role's target boundary. It is the last-resort administrative path when the approved privileged response cannot operate.

## Pilot the role with a disposable non-admin account

Because the role is in public preview, test in the production tenant only with an approved, low-impact test identity and reversible steps. A development tenant can prove the interaction, but it cannot prove your production Defender RBAC, PIM, synchronization, Conditional Access, and logging paths.

### Phase 1: record the baseline

Before assignment, capture:

- the analyst's Entra object ID and Defender group membership;
- the SOC Identity Responder role definition ID;
- assignment type, scope, start, and expiry;
- PIM settings and approver path, if used;
- active Defender permission model and data-source scope;
- the test user's object ID and source of authority;
- expected audit and incident evidence; and
- the stronger-role escalation contacts.

Confirm that the test target has no Entra administrative role and is not a member or owner of a role-assignable group. Use a separate privileged administrator to observe and recover the test.

### Phase 2: prove portal visibility separately

Sign in as the analyst and open the test identity from a Microsoft Defender incident, alert, identity inventory, or another supported entry point. Microsoft's [identity investigation guide](https://learn.microsoft.com/en-us/defender-xdr/investigate-users) describes the identity page and notes that available actions depend on connected providers and services.

If the analyst cannot see the incident or identity, debug the Defender assignment and scope first. Do not broaden the Entra role; its four permissions will not create missing Defender read access.

### Phase 3: exercise each action deliberately

Run one action at a time and verify its control-plane result:

1. Revoke sessions and confirm the action record, refresh-token behavior, and any workload session that remains.
2. Disable the test user and verify a new sign-in is blocked.
3. Enable the test user only after the recovery approval step is recorded.
4. Reset the test password through the supported identity path, then verify the old credential fails and the recovery process behaves as expected.

Do not infer success from a toast message. Correlate the Defender action, the Entra audit event, the user object's final state, and a controlled sign-in test. Where the target is hybrid, repeat the runbook with a hybrid test identity and prove which actions must occur in Active Directory.

### Phase 4: prove the boundary

Use a designated test administrator identity to confirm the SOC role cannot perform the sensitive action on a privileged target. Stop at the expected authorization failure; do not remove the target's administrative role to make the test pass.

Then execute the approved escalation path with the correctly privileged responder. The exercise is complete only when both the narrow path and the privileged-target path work.

## Monitor assignments, activations, and containment actions

Microsoft Entra audit logs record changes to users and role assignments. Microsoft describes them as the history of logged directory tasks and supports routing activity logs to Log Analytics, Event Hubs, storage, or partner solutions for longer retention and analysis. [Use the audit log as the directory evidence plane](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-audit-logs).

Monitor at least these events:

- role assignment created, updated, or removed;
- eligible assignment activated, extended, renewed, or denied;
- user account disabled or enabled;
- password changed or reset;
- refresh tokens invalidated or sessions revoked;
- responder-group membership changed; and
- Defender role or data-source scope changed.

Preserve the initiating actor, target object ID, operation, result, UTC timestamp, correlation ID, incident ID, and approval or justification. Keep the Defender action record beside the Entra audit record; either one alone can leave an incomplete story.

The responder role itself does not grant broad audit-log access. Give investigators a separate read role or SIEM view that fits the operating model. The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is useful when the responder's own privileged sign-in or PIM activation fails.

> **Analysis:** alert on successful enable as aggressively as successful disable. Disable is usually containment; enable restores access and deserves evidence that recovery was authorized.

## Troubleshoot the role by control plane

When an action is missing or fails, classify the first boundary without evidence of success.

### The identity page or incident is not visible

Check the Defender permission model, unified-RBAC activation, analyst assignment, data-source scope, and workload licensing. The Entra containment role is not a substitute for **Security data basics (read)** or the appropriate Defender access.

### The identity is visible but the action is missing

Confirm that the analyst has an active SOC Identity Responder assignment, not only an eligible assignment waiting for activation. Confirm the current role definition ID, refresh the privileged session, and check whether the connected identity provider supports that action for the selected account.

### The action is present but authorization fails

Check whether the target is privileged. Review every active and eligible administrative assignment and role-assignable group relationship rather than checking only the most obvious role in the portal. Escalate through the privileged-account runbook when the boundary applies.

### The action succeeds but the user still has access

Identify which layer still accepts the session: an unexpired access token, a Continuous Access Evaluation gap, an application-owned cookie, an on-premises account, a connected SaaS identity, or another credential. The Entra action result proves a directory operation, not universal application logout.

### A hybrid account changes back or remains usable

Verify the source directory and synchronization path. Contain the authoritative Active Directory account, then confirm the expected cloud state after synchronization. Do not alternate cloud and on-premises changes without a declared source-of-authority plan.

## Rollback and escalation

Rollback means removing or expiring the responder assignment and restoring only deliberately contained test identities. It does not mean reversing a real incident action before the identity is trusted.

If the preview role produces an unexpected portal or permission result:

1. stop the pilot and preserve the failed action, correlation ID, timestamps, target ID, role assignment, and screenshots;
2. use a known-good higher-privilege response path for a live incident;
3. remove or expire the preview assignment through the approved role-management process;
4. confirm the analyst no longer has the four actions; and
5. open a Microsoft support case with the evidence package if the documented role definition and observed behavior disagree.

Do not replace the role with Security Administrator or Global Administrator as an unreviewed convenience. Revisit the required tasks, Defender read scope, privileged-target coverage, and response-time objective, then approve the least-privilege alternative explicitly.

## Microsoft Entra SOC Identity Responder checklist

- [ ] Confirm the role remains public preview and record that dependency.
- [ ] Use role definition ID `58f930cc-fcf4-4152-852c-1d7dbf502139` in inventory and automation.
- [ ] Define the non-administrator target boundary and a privileged-account escalation path.
- [ ] Separate Defender investigation access from Entra containment permission.
- [ ] Decide between active and PIM-eligible assignment based on response time and licensing.
- [ ] Require strong authentication, justification, short duration, and alerts where PIM is used.
- [ ] Test with a disposable cloud non-admin account under an approved change.
- [ ] Test the hybrid source-of-authority path separately when hybrid users exist.
- [ ] Correlate Defender action evidence with Entra audit evidence and final object state.
- [ ] Verify that session revocation expectations account for access tokens and app-owned cookies.
- [ ] Alert on assignment, activation, disable, enable, password reset, and token invalidation.
- [ ] Review access after every exercise and real incident.
- [ ] Keep emergency access and higher-privilege responders tested and available.

## FAQ

### Is Microsoft Entra SOC Identity Responder generally available?

No. Microsoft's Entra release record labels it **public preview**. The current built-in role reference documents the role and permissions, but that does not change the release state to GA.

### Can the role disable a Global Administrator?

No. Microsoft limits SOC Identity Responder, Security Operator, and Security Administrator containment actions to non-administrative accounts. Use the separately approved privileged-account response path.

### Does the role let an analyst investigate Microsoft Defender incidents?

Not by itself. Its Entra definition contains four user write actions. The analyst still needs suitable Microsoft Defender permissions and data-source scope to see incidents, alerts, and identity evidence.

### Does Revoke sessions sign the user out of every application immediately?

No. It invalidates Microsoft Entra refresh tokens. Existing access tokens and application-issued session cookies follow their own validation and reevaluation behavior. Pair the action with disablement and workload-specific controls when the incident requires immediate containment.

### Should every SOC analyst receive a permanent assignment?

Usually not. Start with the smallest on-call population and use PIM eligibility where licensing and response-time requirements allow. Test the activation path so governance does not become an outage dependency.

The operating model is simple once the boundaries are visible: Defender supplies the evidence, the SOC Identity Responder role supplies four narrow Entra actions, the source directory controls hybrid truth, and the target application controls its own session. Test each plane separately, join the evidence in one incident record, and escalate privileged identities through a path designed before the breach.
