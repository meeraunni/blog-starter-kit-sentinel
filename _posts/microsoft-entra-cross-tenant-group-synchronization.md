---
title: "Microsoft Entra Cross-Tenant Group Synchronization Guide"
excerpt: "Deploy Microsoft Entra cross-tenant group synchronization safely: verify supported groups, scope members, prevent bulk deletion, monitor logs, and roll back."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-01T17:04:23-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra cross-tenant group synchronization copies an assigned source group and its in-scope direct members into another tenant as a static security group. Use it when one organization owns multiple tenants and needs central group membership to drive access in a target tenant. Do not use it for nested groups, role-assignable groups, mail-enabled groups, distribution lists, or group synchronization between different Microsoft cloud environments.

The feature is **generally available**, but it is not default-on or mandatory. Microsoft Entra's [current release notes identify cross-tenant group synchronization as GA](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---cross-tenant-group-synchronization), and [Microsoft 365 Roadmap item 518221](https://www.microsoft.com/microsoft-365/roadmap?searchterms=518221) marks the feature launched after preview availability in January 2026 and GA rollout beginning in April 2026. The target tenant must explicitly allow inbound group synchronization, and the source provisioning configuration's group mapping is disabled by default. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure#step-2-enable-user-and-group-synchronization-in-the-target-tenant))

Grab a coffee before enabling it. The portal steps are short; the consequential decision is whether a source-side membership change should become an authorization change in every target tenant that consumes the synchronized group.

## Microsoft Entra cross-tenant group synchronization: the operating model

Cross-tenant synchronization uses the Microsoft Entra provisioning engine. It is a one-way push from a source tenant into a target tenant, configured per source-target pair. The target tenant controls whether that source may synchronize users and groups inbound; the source tenant owns the synchronization configuration, assignments, scoping filters, mappings, and job operation. A target administrator can stop inbound synchronization. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview#properties))

Group synchronization adds two related operations to the site's existing [cross-tenant user synchronization operating model](/posts/microsoft-entra-cross-tenant-synchronization):

1. Microsoft Entra creates a group object in the target tenant.
2. It synchronizes the assigned group's in-scope direct members, creating the required B2B collaboration user representations as part of the same provisioning relationship.

There are two switches to understand:

- **Assignment controls scope.** The synchronization configuration must use **Sync only assigned users and groups**. Assigning a group brings its direct members into scope; assignment does not cascade through nested groups.
- **The group mapping controls object creation.** Under **Provision Microsoft Entra ID Groups**, the **Enabled** toggle must be set to **Yes**. Microsoft documents that this toggle is **No** by default. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure#step-8-optional-define-who-is-in-scope-for-provisioning-with-scoping-filters))

If you assign a group but leave the group mapping disabled, its direct users can still be evaluated for user provisioning, but the group itself is not synchronized. That distinction explains many pilots where users appear in the target and the expected group does not.

## Know exactly which groups Microsoft supports

Microsoft's [cross-tenant synchronization group matrix](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview#group-synchronization) defines the boundary:

| Source object | Target result | Supported? |
| --- | --- | --- |
| Static security group | Static security group | Yes |
| Dynamic security group | Static security group | Yes |
| Microsoft 365 group | Static security group | Yes |
| Role-assignable group | None | No |
| Nested group membership | None | No |
| Mail-enabled security group | None | No |
| Distribution group or dynamic distribution group | None | No |

The conversion to a static target security group matters. A dynamic source group's rule is not copied into the target. Microsoft Entra evaluates the dynamic rule in the source tenant and then synchronizes the resulting in-scope direct membership. The target receives membership state, not the source's evaluation logic.

Group synchronization is also limited to tenant pairs in the same cloud. Microsoft documents cross-tenant synchronization within Azure commercial, within Azure Government, and within Azure operated by 21Vianet, but says group synchronization across those cloud boundaries is unsupported. Do not treat the separately documented cross-cloud user synchronization paths as proof that cross-cloud groups work.

Other boundaries deserve an explicit stop sign:

- an existing target group created outside cross-tenant synchronization is not adopted or updated;
- creating the target group as role assignable is unsupported;
- **Sync all users** cannot be used when group synchronization is enabled;
- a single source-target pair supports one synchronization instance, even though hub-and-spoke and mesh topologies can use multiple pairs; and
- performance depends on the count of users, groups, memberships, and other references, so a larger object graph can take longer to converge.

## Confirm licensing, roles, and ownership

For cross-tenant **group** synchronization in the same cloud, Microsoft requires Microsoft Entra ID Governance or Microsoft Entra Suite licensing in the source tenant; the target tenant does not need a cross-tenant synchronization license. That is different from user-only cross-tenant synchronization, which uses Microsoft Entra ID P1 in the source tenant. Target-side features can carry their own licensing or external-identity billing requirements. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview#license-requirements))

The current portal procedure lists these least-privilege administration roles:

- **Security Administrator** in the target tenant to configure the inbound cross-tenant access setting;
- **Security Administrator** in the source tenant for the corresponding cross-tenant access settings;
- **Hybrid Identity Administrator** in the source tenant to configure cross-tenant synchronization; and
- **Cloud Application Administrator** or **Application Administrator** to assign users and groups to a configuration and delete a configuration. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure#prerequisites))

Separate those duties where practical. The source group owner controls membership, the source identity team controls the provisioning job, and the target application owner decides what the target group authorizes. That separation prevents a routine source membership edit from silently becoming an unreviewed target resource grant.

If many tenants are involved, place the synchronization relationship inside the broader [Microsoft Entra Tenant Governance rollout model](/posts/microsoft-entra-tenant-governance-multitenant-rollout-guide). Tenant Governance and cross-tenant synchronization solve different problems: one governs the tenant estate and administrative relationships; the other provisions users and groups across a specific tenant pair.

## Run the preflight before enabling group synchronization

Create an inventory record for every candidate group:

- source tenant ID and target tenant ID;
- source group object ID, display name, type, membership type, and owner;
- direct member count and the identity status of each direct member;
- nested groups, mail settings, role-assignable state, and other unsupported characteristics;
- target applications, app roles, Azure resources, SharePoint sites, or other resources that will consume the target group;
- expected target group name and owner;
- approved membership authority and emergency removal process; and
- maximum acceptable provisioning delay.

Then check the target for a same-purpose group. Microsoft says a group created outside cross-tenant synchronization is not updated by the service. Do not try to force a match by renaming objects or changing identifiers. Decide whether the new synchronized group will replace the old authorization group, feed a separate access package, or remain unassigned during the pilot.

Use a dedicated pilot group with a few nonprivileged direct members. Do not pilot with a group that grants directory roles, production subscriptions, emergency access, payroll, or broad application administration. The feature cannot create a role-assignable target group, but a normal security group can still become highly privileged through downstream resource assignments.

## Configure cross-tenant group synchronization safely

These are the current Microsoft Entra admin center paths from Microsoft's [same-cloud configuration procedure](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure).

### 1. Allow inbound users and groups in the target tenant

In the target tenant, browse to **Entra ID > External Identities > Cross-tenant access settings > Organization settings**. Add the source tenant by tenant ID or domain, open its **Inbound access** settings, select the **Cross-tenant sync** tab, and enable both:

- **Allow user synchronization into this tenant**
- **Allow group synchronization into this tenant**

User synchronization is not optional for this design because group members need target-side B2B collaboration user objects. Save the settings.

### 2. Configure automatic redemption in both directions

In the target tenant's inbound trust settings for the source, enable **Automatically redeem invitations with the tenant**. In the source tenant's outbound trust settings for the target, enable the same automatic-redemption relationship. Microsoft requires the setting on both sides so synchronized users do not need to accept an invitation prompt. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure#step-3-automatically-redeem-invitations-in-the-target-tenant))

Automatic redemption removes the invitation interaction; it does not grant application access by itself. Target-side Conditional Access, cross-tenant trust settings, app assignments, and resource authorization remain separate controls.

### 3. Create and connect the source configuration

In the source tenant, browse to **Entra ID > Cross-tenant synchronization > Configurations**, create a new configuration, enter the target tenant ID under **Admin credentials**, and select **Test connection**. Do not continue if the test does not confirm that the credentials are authorized for provisioning.

### 4. Set assignment-only scope

Open the configuration's **Properties**, edit **Basics**, and select **Sync only assigned users and groups**. Then open **Users and groups**, assign at least one internal test user, and assign the dedicated pilot group.

Microsoft says only direct members of an assigned group are in scope; static and dynamic source groups can be assigned, but nested assignment does not cascade. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure#step-7-define-who-is-in-scope-for-provisioning))

### 5. Enable and review group mappings

Under **Provisioning > Mappings**, open **Provision Microsoft Entra ID Groups** and set **Enabled** to **Yes**. Review the group mappings and any group scoping filter. Avoid custom mappings unless each source and target property has a documented purpose, an owner, and a test case.

Save carefully: Microsoft warns that changing scoping filters can cause all assigned users and groups to be resynchronized, which can take significant time in a large directory.

### 6. Turn on deletion protection before the first cycle

Under the configuration's properties, set a monitored notification address and enable **Prevent accidental deletion**. Microsoft's procedure currently shows a default threshold of **500**, but the correct operational threshold is the smallest legitimate bulk removal your process must support—not a number copied blindly from a default. If the pending deletion count reaches the configured threshold, the provisioning job enters quarantine and requires an administrator to allow or reject the deletions. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/accidental-deletions))

For a one-group pilot, 500 is usually too permissive. Set the threshold from the known pilot object count, document who may release quarantine, and test the alert path before production expansion.

### 7. Provision one group on demand

Use **Provision on demand** to select the pilot group. Microsoft documents on-demand provisioning for a user or group as the supported way to validate scoping and mapping without waiting for the regular cycle. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand))

In the target tenant, verify all of the following before assigning the new group to a resource:

- one new static security group was created;
- its display name and mapped attributes are correct;
- only expected direct members are present;
- each synchronized member has the intended B2B collaboration representation;
- no unsupported or nested member appeared; and
- the provisioning detail shows a successful group action rather than only successful user actions.

### 8. Start the job, then grant low-impact access

Start provisioning only after the on-demand result is clean. Microsoft says incremental cycles occur approximately every 40 minutes after the longer initial cycle, but this is not an access-removal service-level objective. Test real propagation in your object volume and keep an incident path that does not depend on waiting for the next cycle. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure#step-12-start-the-provisioning-job))

Assign the target group to one low-impact test application or resource. Add and remove one direct source member, observe the complete cycle, and verify both the group membership and the user's effective access in the target.

## Monitor the control plane and catch target drift

The source configuration's progress and provisioning logs are the first evidence layer. The logs show which users and groups were created, updated, skipped, or failed. Audit logs provide the configuration-change trail. In the target tenant, Microsoft identifies cross-tenant synchronization activity with the **Microsoft.Azure.SyncFabric** application actor. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-configure#step-13-monitor-provisioning))

Build operational checks for:

- a job that has not completed within its expected interval;
- quarantine or rising failure counts;
- `EntityTypeNotSupported`, which Microsoft associates with group synchronization not being enabled in the source mapping;
- target membership count diverging from the approved source direct membership;
- a source group owner or membership rule change;
- target resource assignments added to the synchronized group; and
- a deletion count approaching the configured threshold.

One behavior is easy to misread: Microsoft says a manual target-side change to a synchronized group can persist until a source-side change causes the synchronization engine to update the target. The engine does not continuously query the target for drift and immediately overwrite it. That means a momentarily correct target group is not proof that local edits are impossible. Restrict target-side group administration, detect changes in audit logs, and treat the source as the operating authority. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/cross-tenant-synchronization-overview#group-synchronization))

## Roll back without leaving stale authorization

Rollback has two planes: stop the synchronized membership change, then remove or replace every target resource assignment that depended on the target group. Reversing only one plane can leave either unwanted access or a business outage.

For a failed pilot:

1. Remove the target group's application and resource assignments first if access must stop immediately.
2. Preserve provisioning and audit evidence from both tenants.
3. Pause the synchronization job while you determine whether scope, mapping, licensing, or the inbound group permission caused the failure.
4. Correct the source assignment or mapping and use on-demand provisioning to retest one object.
5. If deprovisioning is intended, verify the expected deletion set before allowing it.
6. Keep the target tenant's inbound permission in place until the planned deprovisioning operation has completed and evidence is captured.
7. Remove the source-target group permission only after the synchronized objects and downstream assignments are in the approved end state.

Do not manually delete and recreate synchronized target objects to “unstick” matching. Do not reuse a same-name target group as if it were the synchronized object. If the service's action, object match, or deletion set is ambiguous, stop the job and escalate with the source object ID, target object ID, configuration service principal ID, provisioning event ID, correlation ID, and timestamps.

## Troubleshoot the failures that matter

### Users appear, but the group does not

Open **Provisioning > Mappings > Provision Microsoft Entra ID Groups** and confirm **Enabled** is **Yes**. Microsoft documents `EntityTypeNotSupported` as the typical skip when group synchronization is not enabled in the source mapping. Then confirm the target tenant enabled **Allow group synchronization into this tenant** for the exact source organization.

### The group appears without an expected member

Confirm the member is internal to the source tenant, directly assigned to the group, and in scope for user provisioning. Nested group membership does not cascade. Review the provisioning detail for that member before editing the target group manually.

### The target group type is not what the source team expected

That is normally by design. Static security groups, dynamic security groups, and Microsoft 365 groups in the source are synchronized as static security groups in the target. The target does not become a Microsoft 365 group and does not receive the source dynamic rule.

### A target administrator's change persists

This matches Microsoft's documented drift behavior until the source changes and triggers an update. Remove the unauthorized target edit, inspect who made it, restrict local administration, and verify the next source-originated change produces the expected target state.

### The job enters deletion quarantine

Do not release it because the count “looks plausible.” Compare the pending deletion set with the approved source change, group assignments, scoping filters, and target resource dependencies. Reject or remediate the change when the deletion was accidental; allow it only when the complete set is expected and the target application owners have approved the access impact.

## Administrator checklist

- [ ] Confirm Roadmap item 518221 and Microsoft Entra release notes still show GA for the intended cloud.
- [ ] Verify Microsoft Entra ID Governance or Microsoft Entra Suite licensing in the source tenant.
- [ ] Assign the documented least-privilege roles in source and target tenants.
- [ ] Record source and target tenant IDs, group IDs, owners, and resource dependencies.
- [ ] Reject nested, role-assignable, mail-enabled, distribution, and cross-cloud group designs.
- [ ] Use a dedicated nonprivileged pilot group with direct members only.
- [ ] Enable inbound user and group synchronization for the exact source tenant.
- [ ] Configure automatic redemption in both tenants.
- [ ] Set scope to **Sync only assigned users and groups**.
- [ ] Enable **Provision Microsoft Entra ID Groups**; it is off by default.
- [ ] Configure a monitored notification address and a risk-based deletion threshold.
- [ ] Provision one group on demand and verify the target static security group.
- [ ] Test one add and one removal through a complete cycle.
- [ ] Confirm provisioning logs, target audit evidence, and effective resource access.
- [ ] Detect target-side membership and authorization drift.
- [ ] Keep an immediate access-removal path that does not depend on the next sync cycle.
- [ ] Document how to pause, remediate, deprovision, and escalate with correlation evidence.

Cross-tenant group synchronization is valuable because it turns a source membership decision into consistent target membership. That is also its risk. A world-class rollout treats the source group as an authorization control plane, scopes the first change to a harmless resource, protects bulk deletion, and proves every membership transition in both tenants before expanding.
