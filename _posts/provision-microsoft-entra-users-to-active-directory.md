---
title: "Provision Microsoft Entra Users to Active Directory"
excerpt: "Provision Microsoft Entra users to Active Directory with Cloud Sync. Plan scope, matching, passwordless Kerberos, validation, rollback, and monitoring safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-26T09:30:27-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **provision Microsoft Entra users to Active Directory**, create a Microsoft Entra ID-to-AD Cloud Sync configuration, scope a small pilot of cloud-managed users, verify its attribute and organizational-unit mappings, run on-demand provisioning, and enable the recurring job only after the match-or-create result is correct. The user remains managed in Microsoft Entra ID; Cloud Sync maintains the AD account needed by a supported on-premises workload.

The important boundary is authentication. This public-preview user-provisioning path does **not** write a cloud user's password to Active Directory. It is designed for Kerberos applications reached with passwordless authentication, such as Windows Hello for Business with Cloud Kerberos Trust—not applications that collect an AD password through LDAP bind or password-based Kerberos.

Grab a coffee before treating this as reverse synchronization. Microsoft's September 2026 Entra update introduced cloud-to-AD user provisioning in public preview, and Microsoft refreshed the operating documentation on September 24. Group provisioning to AD is generally available, but provisioning **users**, either alone or with groups, remains preview. It is administrator-configured, not default-on, and Microsoft has not published a mandatory rollout or GA date. ([September 2026 Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-september-2026/4545179), [feature overview](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/overview-provision-entra-id-to-active-directory))

## Provision Microsoft Entra users to Active Directory: the decision

Use this feature when Microsoft Entra ID is the intended source of authority for a user, but an AD account must still exist for Kerberos authorization or a cloud-managed security group's member reference. Do not deploy it merely because an application is “on-premises.”

Choose the path by workload:

- **Kerberos application, passwordless user:** evaluate the preview. Cloud Sync can create or maintain the AD user, and Cloud Kerberos Trust can supply the Kerberos ticket.
- **Application performs LDAP bind with the user's password:** stop. Password writeback is not available for these cloud-managed users.
- **Application accepts SAML or OpenID Connect directly:** modernize the application rather than preserving an AD account without a real dependency.
- **User is still authoritative in AD:** keep the normal AD-to-Entra provisioning direction. The reverse job does not provision an on-premises-authoritative user as a cloud-managed user.
- **User must exist in more than one AD domain, or relationships cross forests:** stop. Microsoft documents a single target domain per user and does not support cross-forest user relationships in this design.

This intent is different from [converting a synchronized Entra user to cloud-only management](/posts/convert-synced-microsoft-entra-user-cloud-only), which changes the user's source of authority. It is also different from [migrating Microsoft Entra Connect Sync to Cloud Sync](/posts/migrate-microsoft-entra-connect-sync-cloud-sync), which changes the synchronization engine for the traditional AD-to-cloud direction. This guide deals with what happens **after** the cloud owns the identity and AD still needs a controlled projection of it.

## Understand the control plane before creating the job

Microsoft Entra ID is the source. The cloud provisioning service evaluates the configured scope, finds or creates the corresponding AD object, applies attribute mappings, and sends an LDAP operation through the on-premises Cloud Sync provisioning agent. Subsequent cycles process incremental changes. ([provisioning behavior](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-provisioning-to-active-directory-works))

The join is not based on display name, UPN, or distinguished name. Cloud Sync stamps `msDS-ExternalDirectoryObjectId` on the AD object as a durable anchor:

- `User_<Entra object ID>` for a user; and
- `Group_<Entra object ID>` for a group.

On later cycles, a matching anchor means update the existing object; no match means create an object in the configured target container. That idempotent behavior prevents normal reruns from creating another AD account for the same Entra identity. The anchor is service-managed and should not become an administrator-maintained matching field.

The user path then splits:

- A **cloud-native user** has no matched AD account, so Cloud Sync creates one in the target OU.
- A **source-of-authority-converted user** is matched to the existing AD account and updated in place, preserving the original security identifier and, with the default mapping, the original OU.
- A **B2B guest** can be provisioned when the design genuinely requires an AD representation.
- An **on-premises-authoritative synchronized user** is not provisioned by the reverse user job; AD remains the source.

After provisioning, Cloud Sync writes the resulting on-premises distinguished name, SAM account name, security identifier, UPN, and domain name back to the Entra user object. Those values are identity continuity, not proof that a password exists in AD.

> **Analysis:** call the AD object a **projection**, not a second master account. That vocabulary keeps operations honest: lifecycle and managed attributes originate in Entra, while AD provides the object and SID that the legacy authorization path still consumes.

## Prove the prerequisites and licensing

Microsoft's current [Cloud Sync prerequisites](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-prerequisites) require a domain-joined supported Windows Server for the provisioning agent, a non-guest Hybrid Identity Administrator, an AD schema that contains `msDS-ExternalDirectoryObjectId`, the documented network path to domain controllers, and an agent service account with the required user and group permissions. The agent host is a control-plane asset; harden and administer it accordingly. Microsoft recommends multiple active agents for production high availability.

For the reverse-provisioning scenario, verify these gates on the live prerequisite page immediately before the pilot:

- the current supported Cloud Sync provisioning-agent build;
- schema and domain-controller compatibility;
- TCP connectivity for LDAP and Global Catalog lookups;
- permissions to read, create, update, and delete the object types in the intended target containers;
- the required Entra custom domains and cloud-only recovery administration path; and
- no unsupported application dependency on an AD password.

Do not copy an old minimum build into a change record and treat it as evergreen. Microsoft updated this documentation during September; the prerequisite page is the operational source of truth.

Licensing is configuration-based. Microsoft's current overview says the first two new configurations in a tenant require Microsoft Entra ID P1. New configurations three through twenty require Microsoft Entra ID Governance, and the tenant maximum is twenty configurations. A single AD domain can have only one Entra-to-AD configuration, so users and groups for that domain share the same configuration rather than being split into competing jobs. ([overview and licensing](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/overview-provision-entra-id-to-active-directory), [deployment options](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/concept-deployment-options-provision-to-active-directory))

Preview status still matters. It means you need an explicit workload owner, a limited blast radius, support expectations appropriate to preview terms, and an exit plan. GA group provisioning does not make preview user provisioning GA by association.

## Design scope before mappings

The configuration offers two scope patterns:

- **Selected users and groups:** best for a pilot and for a deliberately bounded population. Microsoft recommends not adding attribute filters here because selection already narrows the scope.
- **All users and groups:** intended for attribute-driven scale. Add at least one attribute filter for every enabled object type; otherwise the service evaluates every user and group in the tenant on every cycle.

Start with selected objects. Choose one non-privileged cloud-native test user, one low-risk source-of-authority-converted user when that scenario is in scope, and one security group only if the application authorizes through group membership. Exclude emergency accounts, administrators, service identities, and users with unresolved Exchange or password-based application dependencies.

Scope is a lifecycle control, not just a performance option. Microsoft's documented delete behavior is consequential:

- soft-deleting a user in Entra disables the matched AD account;
- hard-deleting the user deletes the matched AD account;
- moving a user out of provisioning scope disables the matched AD account; and
- removing a group member removes the corresponding AD membership reference.

Configure accidental-delete protection and a monitored notification address before enabling the job. Then write the expected result for add, update, out-of-scope, soft-delete, restore, and hard-delete events into the change plan. ([test and enable provisioning](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-test-and-enable-provisioning-entra-to-active-directory), [delete behavior](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-provisioning-to-active-directory-works#how-deletes-work))

## Review target OUs and mappings as security controls

In the Entra admin center, browse to **Entra ID > Entra Connect > Cloud sync**, create a **Microsoft Entra ID to AD sync** configuration for the pilot domain, and review all five areas: scope, mappings, test, default properties, and enablement. ([configuration guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-configure-entra-to-active-directory))

For a cloud-native user, the `parentDistinguishedName` mapping decides the creation OU. Use a dedicated pilot OU with delegated permissions limited to the provisioning service and the recovery team. Keep ordinary help-desk automation, logon scripts, application policies, and broad group-policy inheritance out of that OU until each dependency has been reviewed.

For a source-of-authority-converted user, the default expression uses `onPremisesDistinguishedName` to preserve the original OU. Changing the configuration's constant target OU does not automatically move that existing user. A one-user move requires updating the documented on-premises distinguished-name property in Entra; a domain move requires removing the user from one domain configuration and adding it to the other.

Review the default user mappings field by field. Microsoft currently documents mappings for enabled state, common name, company, department, employee ID, manager, address fields, SAM account name, surname, and UPN, plus service-managed identity fields. Treat every customization as code:

1. name the source-of-truth owner;
2. define null and truncation behavior;
3. prove uniqueness for SAM account name and UPN;
4. test non-ASCII, long, renamed, and duplicate-like identities;
5. record the downstream consumer; and
6. preserve the prechange schema and result.

Do not create a second naming algorithm simply because the default value is unattractive. A prettier SAM account name that collides in AD is worse than a deterministic generated value.

## Add group provisioning only when the application needs it

An AD account lets Kerberos identify the user; the application may still authorize through an AD security group. In that case, enable users and security groups in the **same** domain configuration.

Only security groups are supported. Mail-enabled groups and distribution groups are not. Cloud Sync provisions the AD group as a Universal security group and writes a member reference only when that member has an AD account to reference. A cloud-managed group member therefore needs to be inside the user-provisioning scope; a synchronized member already has an AD account. Membership to on-premises-authoritative users is a separate setting and is off by default. ([deployment options](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/concept-deployment-options-provision-to-active-directory), [membership behavior](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-provisioning-to-active-directory-works#how-groups-and-memberships-are-provisioned))

Nested groups need deliberate testing. Microsoft documents different results depending on whether the parent and member groups are cloud-managed, synchronized from AD, or converted to cloud source of authority. Do not assume a mixed nested structure is flattened or that every nested reference will appear in AD.

For a simple Kerberos application, the clean target is usually:

1. a cloud-managed security group owns access intent;
2. selected cloud-managed users and the group are in the reverse-provisioning scope;
3. Cloud Sync creates or matches the AD users and group;
4. Cloud Sync writes direct membership references; and
5. the application continues reading the AD group.

That design makes the cloud group the governed authorization source without pretending the old application understands Entra tokens.

## Validate one object before enabling the cycle

Use **Provision on demand** for each representative user and the pilot group. On-demand provisioning executes the configured pipeline for the selected object and exposes the import, scope evaluation, match, mapping, and target action. For a group, Microsoft limits the accompanying member test to five selected members, so a successful test does not validate a large membership set. ([test and enable guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-test-and-enable-provisioning-entra-to-active-directory))

Require all of this evidence before enabling:

- the expected Entra object ID and source-of-authority state;
- an expected **create** for the cloud-native user or **match/update** for the converted user;
- the correct target domain and OU;
- a unique SAM account name and correct UPN;
- expected enabled state, manager, and business attributes;
- no unexpected delete, disable, or move action;
- the intended group type and direct member references; and
- a clean result in AD Users and Computers for the exact object.

Matching deserves extra care. If the preview proposes creating a new AD object where you expected an in-place update, stop. Do not manually stamp the service anchor or delete either identity to force a match. Preserve the on-demand result, the Entra object ID, the AD object GUID, current source-of-authority state, and the provisioning logs for escalation.

After the test passes, review accidental-delete settings and notifications again, then use **Overview > Review and enable > Enable configuration**. The service performs an initial run for all in-scope objects and then recurring delta cycles.

## Prove passwordless Kerberos end to end

The created AD account does not receive the user's Entra password. Microsoft explicitly says password writeback is unavailable for cloud-managed users in this scenario. The supported application pattern is passwordless sign-in to Entra followed by Kerberos access using Windows Hello for Business with Cloud Kerberos Trust or another currently documented supported passwordless path. ([user SOA scenarios](https://learn.microsoft.com/en-us/entra/identity/hybrid/user-source-of-authority-overview), [provisioning limitations](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/overview-provision-entra-id-to-active-directory#what-isnt-supported))

Validate the whole chain as the pilot user:

1. sign in to the supported Entra-joined Windows device with the approved passwordless method;
2. confirm the Entra authentication and Conditional Access result;
3. obtain a Kerberos ticket through the approved Cloud Kerberos Trust design;
4. access the target application by its production name;
5. confirm the application sees the expected AD user and group authorization; and
6. remove and restore the pilot's access through the cloud group to prove deprovisioning and recovery.

A green Cloud Sync event proves the directory write. It does not prove the endpoint received the right ticket, name resolution reached the intended service, the service principal name is correct, or the application evaluated the intended group.

Do not broaden the pilot to an LDAP-bind application after a Kerberos test passes. The password boundary is architectural, not a missing checkbox.

## Prevent two administrators from owning the same object

Cloud Sync can provision an object while an AD administrator, script, or legacy identity process still writes to it. That is configuration drift with two apparent owners.

Microsoft's documentation contains scenario-specific behavior: a cloud-managed attribute can be overwritten from Entra on a later cycle, while a direct AD change to some source-of-authority-converted objects can cause Cloud Sync to skip the object and log the ownership conflict. Either result is a reason to prohibit ordinary AD writes, not a recovery mechanism. ([configuration and verification](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-configure-entra-to-active-directory#verify-and-manage-provisioned-objects), [feature overview](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/overview-provision-entra-id-to-active-directory#key-behaviors))

Inventory scheduled tasks, HR connectors, help-desk tools, delegated OU permissions, group-management portals, and human operating procedures before expansion. Move their write path to the cloud source or remove the object from this design.

Microsoft also documents preview AD user and group enforcement that can block out-of-band writes to marked cloud-owned objects. Treat it as a separate control rollout. Follow the site's [Microsoft Entra AD group enforcement pilot guide](/posts/microsoft-entra-ad-group-enforcement-pilot-guide): prepare every writable domain controller, begin in Audit, inspect the write attempts, and move to Enforced only when the supported Cloud Sync and emergency paths are proven.

## Monitor the job, agent, and workload separately

Monitor three evidence planes:

1. **Provisioning agent:** service availability, agent version, gMSA health, certificate state, domain-controller connectivity, CPU, memory, and outbound Microsoft endpoints.
2. **Cloud provisioning job:** last successful cycle, duration, quarantine, scope skips, create/update/disable/delete counts, accidental-delete threshold, and object errors.
3. **Business result:** AD object state, Kerberos sign-in, expected group authorization, application access, and leaver removal.

Microsoft says a configuration can enter quarantine when most or all target calls repeatedly fail, including credential or target-system failures. Correct the root cause and use the documented restart action; do not create a second configuration against the same domain. If the agent itself is unhealthy, use the [Cloud Sync agent inactive troubleshooting guide](/posts/microsoft-entra-cloud-sync-agent-inactive) to preserve evidence before reinstalling anything.

Alert on changes that are security-relevant even when the job remains technically healthy:

- a privileged or service identity enters scope;
- a target OU mapping changes;
- a user is disabled or deleted in AD;
- the accidental-delete threshold is reached;
- an expected group loses membership;
- a source-of-authority ownership conflict causes a skip; or
- the Kerberos application fails after a successful directory update.

Provisioning logs should identify the source object, target object, match step, modified properties, action, and failure. Keep the pilot evidence long enough to compare later behavior with the approved baseline.

## Roll back without losing the identity boundary

Rollback depends on what you changed.

If a **cloud-native pilot user** should no longer have an AD projection, first remove application access, preserve the object's anchor and lifecycle evidence, and confirm the documented out-of-scope result. Moving the user out of scope disables the AD account; a later hard delete is a separate destructive event. Do not delete the AD object manually while Cloud Sync still considers the user in scope.

If a **source-of-authority-converted user** must return to AD management, use Microsoft's documented SOA rollback procedure. Remove cloud references that block rollback, change the SOA state through the supported Graph operation, let Connect Sync take ownership on its next cycle, verify audit and connector evidence, and restore the hard-match protection Microsoft requires after the takeover. The rollback is not complete when the API call returns; it completes when AD-to-Entra synchronization owns the object again. ([configure and roll back user SOA](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure#roll-back-soa-update))

If the **configuration** is wrong, disable expansion, capture the current scope and mappings, and determine whether the initial cycle already created, updated, disabled, or deleted objects. Removing a configuration is not an undo operation for directory changes that already occurred. Restore object state from the approved baseline, not from guesswork.

## Administrator checklist

- [ ] Confirm user provisioning is still public preview and group provisioning is GA.
- [ ] Define the specific Kerberos application and why an AD account is still required.
- [ ] Reject LDAP bind and other user-password dependencies.
- [ ] Confirm one target AD domain per user and no unsupported cross-forest relationship.
- [ ] Verify current agent, schema, network, role, permission, and license prerequisites.
- [ ] Treat the provisioning-agent host as a control-plane asset.
- [ ] Use the existing single configuration for the target domain.
- [ ] Start with selected, non-privileged pilot users and a dedicated target OU.
- [ ] Review every user, group, membership, and target-container mapping.
- [ ] Configure accidental-delete protection and monitored notifications.
- [ ] Run on-demand provisioning and require the intended create or match result.
- [ ] Stop on any unexpected duplicate, delete, disable, or OU action.
- [ ] Verify AD object identity, SID continuity, attributes, and direct membership.
- [ ] Test passwordless Kerberos and the real application end to end.
- [ ] Prove access removal and restoration from the cloud control plane.
- [ ] Inventory and eliminate direct AD writers for managed objects.
- [ ] Pilot AD object enforcement separately, beginning in Audit.
- [ ] Monitor agent, provisioning-job, and application evidence independently.
- [ ] Document cloud-native removal and SOA rollback as different procedures.
- [ ] Expand only after a full joiner, mover, leaver, and recovery cycle passes.

The safe model is narrow and useful: **Microsoft Entra owns the identity; Cloud Sync maintains one AD projection; passwordless authentication supplies Kerberos; and every lifecycle change is proven at the application, not just in a green sync log**.

## References

- [What's new in Microsoft Entra: September 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-september-2026/4545179)
- [Overview of Microsoft Entra ID to Active Directory provisioning](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/overview-provision-entra-id-to-active-directory)
- [Choose a deployment option for provisioning to Active Directory](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/concept-deployment-options-provision-to-active-directory)
- [Configure Microsoft Entra ID to Active Directory provisioning](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-configure-entra-to-active-directory)
- [How provisioning from Microsoft Entra ID to Active Directory works](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-provisioning-to-active-directory-works)
- [Test and enable Microsoft Entra ID to Active Directory provisioning](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-test-and-enable-provisioning-entra-to-active-directory)
- [Cloud Sync prerequisites](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-prerequisites)
- [Transfer user Source of Authority to Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/hybrid/user-source-of-authority-overview)
- [Configure user Source of Authority](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure)
