---
title: "Microsoft Entra memberOf Retirement: Migration Guide"
excerpt: "Microsoft Entra memberOf retirement is November 3, 2026. Inventory dynamic groups, admin units, and access package policies, then migrate without stale access."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-31T09:09:04-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra `memberOf` retirement is **November 3, 2026**. After that date, dynamic groups and dynamic administrative units whose rules use the preview `memberOf` operator stop updating and remain at their last known membership. Entitlement Management auto-assignment policies using the operator are quarantined: the policies remain, but they stop adding and removing assignments.

The administrator answer is not to wait for a direct replacement. Inventory all three object types now, map what each one controls, rebuild the population with supported attributes where that is genuinely equivalent, and convert the rest to assigned membership or another owned assignment process before the deadline.

Grab a coffee. This is a small-looking rule retirement with a wide authorization blast radius. A stale group can keep an exited user licensed or authorized, fail to add a new employee, or leave Conditional Access targeting different from the source groups administrators believe it follows. Microsoft's current [`memberOf` migration guidance](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-rule-member-of#migrate-before-the-preview-ends) names dynamic groups, dynamic administrative units, and access package auto-assignment policies explicitly. Its separate [Entitlement Management guidance](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-auto-assignment-policy#find-automatic-assignment-policies-that-use-the-memberof-attribute) confirms the quarantine behavior and the same November 3 date.

## Microsoft Entra memberOf retirement: what actually stops

The retiring operator let a dynamic user or device group take the **direct members** of as many as 50 source groups and flatten them into one evaluated membership. It was a public-preview feature, available only in the global public cloud, with a limit of 500 `memberOf` dynamic groups per tenant. It could not be combined with other operators, could not use another `memberOf` dynamic group as a source, and did not automatically clean up affected members when a child group was deleted or a member was removed from that child group until the rule itself was modified. Microsoft now says the preview can slow dynamic membership processing across a tenant and is ending while it develops an alternative with the required scale and reliability. Microsoft has not published that alternative or an availability date. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-rule-member-of#preview-limitations))

This is a **retirement of a public-preview rule operator**, not a general availability transition, optional feature rollout, or change to every dynamic group. Only rules containing `memberOf` are affected. Supported property-based rules such as `user.department -eq "Sales"` continue to be processed.

The post-deadline state differs by object type:

- **Dynamic user or device group:** membership processing stops and the evaluated membership stays at its last known state. Apps, Teams, SharePoint, licensing, or Conditional Access consumers can drift from the source groups.
- **Dynamic administrative unit:** membership processing stops and the administrative scope stays at its last known state. Delegated administrators can retain or miss scope as people and devices move.
- **Access package auto-assignment policy:** the policy is quarantined, with no assignments added or removed until `memberOf` is removed. Joiners can miss access and movers or leavers can retain assignments.

Stale does not always mean overprivileged. A departed user who remains in an access-granting group is an obvious excess-access risk. A new administrator who never enters a policy-targeting group can instead miss a required Conditional Access control. The common failure is **divergence**: the Entra object no longer follows the source-group change that operators expect.

## Start with a tenant-wide read-only inventory

Search for the literal operator, not for a naming convention. A group called “All Sales” tells you nothing about how its membership is built, and a rule can reference several source object IDs without exposing those names in the display name.

Microsoft tells administrators to export dynamic groups from the Entra admin center and identify rules containing `memberOf`. The following read-only Microsoft Graph PowerShell inventory uses the documented `Get-MgGroup` and `Get-MgDirectoryAdministrativeUnit` cmdlets and asks only for read scopes. Review the output in the portal before changing anything. ([Get-MgGroup reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.groups/get-mggroup?view=graph-powershell-1.0), [Get-MgDirectoryAdministrativeUnit reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.directorymanagement/get-mgdirectoryadministrativeunit?view=graph-powershell-1.0))

```powershell
Connect-MgGraph -Scopes @(
  "Group.Read.All",
  "AdministrativeUnit.Read.All"
)

$groupProps = @(
  "Id",
  "DisplayName",
  "MembershipRule",
  "MembershipRuleProcessingState"
)

$memberOfGroups =
  Get-MgGroup `
    -All `
    -Property $groupProps |
  Where-Object {
    $_.MembershipRule -match
      '(?i)memberof'
  }

$memberOfGroups |
  Select-Object `
    Id,
    DisplayName,
    MembershipRuleProcessingState,
    MembershipRule
```

```powershell
$adminUnitProps = @(
  "Id",
  "DisplayName",
  "MembershipType",
  "MembershipRule",
  "MembershipRuleProcessingState"
)

$memberOfAdminUnits =
Get-MgDirectoryAdministrativeUnit `
    -All `
    -Property $adminUnitProps |
  Where-Object {
    $_.MembershipRule -match
      '(?i)memberof'
  }

$memberOfAdminUnits |
  Select-Object `
    Id,
    DisplayName,
    MembershipType,
    MembershipRuleProcessingState,
    MembershipRule
```

> [!NOTE]
> The backtick is PowerShell's line-continuation character. Run the inventory in a controlled administrative shell; it reads directory configuration but does not update it.

For Entitlement Management, use Microsoft's maintained [read-only auto-assignment policy scan](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-auto-assignment-policy#find-automatic-assignment-policies-that-use-the-memberof-attribute). It requests `EntitlementManagement.Read.All`, follows Graph pagination, filters automatic policies, checks their membership rules for `memberOf`, and writes a CSV even when no policy matches. Reusing that published scanner is safer than maintaining a shortened copy that can miss a policy type or page.

Do not stop at an object count. For every match, record:

- object ID, display name, object type, rule, and processing state;
- every source group object ID embedded in the rule;
- current evaluated member IDs and member count;
- business owner and technical owner;
- direct consumers: applications, licenses, Teams, SharePoint sites, Conditional Access policies, administrative-unit-scoped roles, access packages, and automation;
- whether the object grants access, removes access, applies a security control, or only drives communications; and
- the replacement design, test owner, change window, and rollback evidence.

That consumer map matters more than the rule text. The site's [Conditional Access evaluation pipeline guide](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) explains why a group used in policy targeting affects token decisions, while the [Entitlement Management access-package operating guide](/posts/microsoft-entra-entitlement-management-access-packages) covers the lifecycle boundary behind auto-assigned access.

## Choose a replacement based on the source of truth

There is no universal mechanical rewrite from group membership to a user attribute. The right replacement depends on what the source groups represented.

### Use a supported attribute rule when the attribute is authoritative

If the source groups were merely proxies for a stable identity fact—department, country, employee type, extension attribute, or another supported user or device property—replace the rule in the existing object with a property-based dynamic rule. This preserves the consuming object's identity while moving evaluation to supported syntax.

Do not invent an attribute just to make the expression compile. Confirm who owns the attribute, how it is populated, how quickly it changes, what null means, and how terminated or disabled identities are handled. Microsoft's [dynamic membership rule reference](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership) is the authority for supported properties and operators. Its [rule-efficiency guidance](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-rule-more-efficient) prefers exact equality where possible and recommends `-in` over long repeated `-or` expressions.

Before enabling the replacement:

1. export the current evaluated members;
2. calculate the expected population from the authoritative attributes;
3. compare additions and removals by object ID;
4. obtain owner approval for every unexplained difference;
5. validate representative joiner, mover, leaver, disabled-account, guest, and null-attribute cases; and
6. change one low-risk object before migrating security-critical consumers.

A perfectly valid rule can still be operationally wrong. If Sales membership was manually curated because the HR department value is unreliable, `user.department -eq "Sales"` changes the source of truth. That is a governance decision, not syntax cleanup.

### Convert to assigned membership when group membership is the source of truth

If the business meaning really is “the direct members of these source groups,” no other supported dynamic-rule operator provides the same relationship-based population today. Convert the existing group to assigned membership and choose an explicit owner for ongoing updates.

Microsoft documents that changing a group's membership type in place preserves its name and object ID, so references to the group do not need to be repointed. It also publishes a Graph PowerShell conversion pattern that removes `DynamicMembership` from `groupTypes` and pauses the old rule. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/groups-change-type))

Use the portal or Microsoft's documented conversion pattern, then compare the assigned membership with the pre-change snapshot immediately. Preserve the current group object rather than creating a new group during the first migration pass; retaining the object ID reduces the chance of missing an application assignment, license, Teams connection, SharePoint permission, or policy reference.

Assigned membership needs an operating model. Choose one:

- a named group owner maintains it manually under a ticketed process;
- an existing identity-governance or HR-driven process owns adds and removals;
- supported provisioning writes the final membership; or
- a separately reviewed automation reconciles the approved source groups into the assigned target.

That last option is **custom automation**, not a Microsoft-provided replacement for `memberOf`. If you use it, define least-privileged credentials, idempotent reconciliation, retry and throttling behavior, alerting, a protected exclusion list, and a safe response when a source group is missing. Never interpret a failed source lookup as permission to empty a production authorization group.

### Retire objects that no longer have a consumer

Unused objects should not be migrated reflexively. Prove the object has no consumers, save the inventory and approval, pause processing first, observe for an agreed window, and delete only in a separately reviewed cleanup change. Pausing is reversible; deletion can sever references that the initial inventory missed.

Microsoft publishes [PowerShell samples to pause specific dynamic groups and administrative units](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership-powershell-samples). The documentation explicitly recommends testing those scripts outside production and notes that pausing stops rule evaluation rather than reversing membership changes already completed.

## Migrate dynamic administrative units without widening delegated scope

Administrative units are authorization boundaries for delegated administration, so treat their member list as privileged configuration.

The replacement choices are the same—supported attribute rule, assigned membership, or retirement—but validation is stricter. Compare both the member population and every role assignment scoped to the administrative unit. A population that looks nearly identical can still put a sensitive user or device inside the scope of a delegated role.

Microsoft documents the in-place path under **Entra ID > Roles & admins > Admin units > Properties**. When a dynamic administrative unit is changed to **Assigned**, its current members remain intact and manual membership becomes available. The documented Graph form sets `membershipRuleProcessingState` to `Paused` and `membershipType` to `Assigned`. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/admin-units-members-dynamic#change-a-dynamic-administrative-unit-to-assigned))

For each affected administrative unit:

1. export current users or devices and the `memberOf` rule;
2. export scoped role assignments and identify the human owners of those delegations;
3. test the proposed attribute rule or assigned population;
4. compare additions and removals by object ID;
5. have the delegated-administration owner approve the exact scope delta;
6. migrate in place; and
7. verify that scoped administrators can manage only the intended objects.

Licensing also differs by surface. Microsoft says dynamic administrative units require Entra ID P1 or P2 coverage for each administrator and each unique user member; devices do not need a license for dynamic device administrative-unit membership. The retiring `memberOf` group preview itself required Entra ID P1 or P2 for the tenant. ([Administrative-unit prerequisites](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/admin-units-members-dynamic#prerequisites), [`memberOf` prerequisites](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-rule-member-of#prerequisites))

## Rebuild access-package auto-assignment before removing the old rule

Auto-assignment policies need the most careful ordering. Microsoft states that on November 3 an affected policy is quarantined and assignment processing stops. It also warns administrators to plan an alternative **before removing** a policy whose rule has no equivalent, so identities do not lose assignments. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-auto-assignment-policy))

Where an authoritative supported attribute exists, rebuild the policy's membership rule and validate the resulting access-package assignments. Auto-assignment rules can use documented user properties, extension attributes, and custom extension properties; the required data can come from systems such as HR, Cloud Sync, or Entra Connect Sync. This feature requires Microsoft Entra ID Governance or Microsoft Entra Suite licensing.

Where no equivalent attribute exists:

1. export the affected policy, package, catalog, rule, and current assignments;
2. identify assignment expiration, approval, custom-extension, and removal behavior;
3. design the supported alternative assignment path;
4. create and test that path without overlapping unsupported automatic policies;
5. verify that existing assignments remain and expected new assignments appear;
6. stop the old `memberOf` logic only after the replacement is proven; and
7. review removed and retained assignments against the business owner-approved population.

Microsoft recommends only one automatic assignment policy per access package unless scopes are guaranteed not to overlap, because overlapping automatic policies can create access-loss problems when a user falls out of one scope. Do not create a temporary second automatic policy casually. The [access-package assignment view](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments) is the final evidence surface for confirming who actually retained or received access.

## Use a staged migration with an explicit rollback boundary

The following sequence is **analysis**, not a Microsoft rollout schedule. It is a practical way to finish before November 3 without making the deadline itself the change window.

**Inventory and freeze new use.** Find all three object types, block new `memberOf` rules through change governance, save membership snapshots, and map consumers.

**Design and prove equivalents.** Select attribute-based, assigned, or retirement paths. Test member deltas with real tenant data and obtain application, security, licensing, and governance owner approval.

**Migrate low-risk objects first.** Start with objects that do not drive privileged access, Conditional Access, licensing, or automated removal. Observe normal joiner, mover, and leaver events.

**Migrate security-critical objects in controlled rings.** Change one consumer class at a time. Keep emergency access accounts outside broad Conditional Access policy dependencies, and confirm both access-granting and control-applying groups.

**Finish with a clean rescan.** Rerun the group, administrative-unit, and auto-assignment inventories. The success condition is zero rules containing `memberOf`, not “all planned tickets closed.”

Before November 3, rollback can mean restoring the saved rule temporarily while you fix the replacement, but that only returns you to a retiring preview feature. After the deadline, restoring `memberOf` is not a supported operating model. Your durable rollback is the saved member snapshot plus assigned membership or another already-tested supported path.

For a failing change, contain the object before editing more dependencies. Pause the affected dynamic rule where supported, restore the last approved membership state, and re-evaluate the consumer. The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) helps distinguish a group-population error from a policy or device failure during validation.

## Monitor the migration and preserve audit evidence

For each migrated object, capture evidence before and after the change:

- object ID and display name;
- old and new rule or membership type;
- source-group IDs and replacement source of truth;
- member count plus added and removed object IDs;
- direct consumer list;
- change timestamp, operator, approval, and ticket;
- validation results for joiners, movers, leavers, guests, devices, and disabled identities as applicable; and
- rollback state and owner.

Use Microsoft Entra audit logs to confirm configuration changes and sign-in or application evidence to verify downstream behavior. Microsoft describes audit logs as the record of changes to directory objects and sign-in logs as the evidence of access attempts. ([Microsoft Entra monitoring overview](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/overview-monitoring-health))

Watch for two kinds of drift during the observation window:

- **membership drift:** the replacement group or administrative unit differs from the approved population; and
- **control drift:** the population is correct, but an application, license, policy, role scope, or access package no longer consumes it as expected.

Member count alone is not enough. A count of 500 before and after can hide 20 incorrect removals and 20 incorrect additions. Compare stable object IDs and investigate every delta.

## Troubleshooting the common migration failures

**The inventory returns no rules, but the portal shows one.** Confirm the Graph command selected `MembershipRule`, used `-All`, and connected to the expected tenant. Check the signed-in context and permissions before concluding the tenant is clean.

**The replacement rule has far more users.** You likely replaced curated group membership with a broad or unreliable attribute. Inspect nulls, casing, synchronized values, guests, disabled users, and the authoritative source. Do not accept the wider set because the rule is syntactically valid.

**The replacement rule has fewer users.** Check whether source groups contained manual exceptions or whether direct group membership encoded information absent from user attributes. Decide explicitly whether those exceptions remain, move to another governed attribute, or require assigned membership.

**A group conversion breaks an application or license.** Verify that the same object ID remains, compare current members with the saved snapshot, and check the consumer's own assignment state. The problem may be a membership delta rather than the conversion itself.

**A delegated administrator can see too much or too little.** Compare the administrative-unit member delta and its scoped role assignments. Restore the last approved assigned membership while correcting the source rule.

**Access-package assignments start disappearing.** Stop the migration, verify whether the old policy was removed before the replacement became effective, and inspect the package's assignment list. Restore the approved assignment path before doing cleanup.

**Dynamic membership processing slows across the tenant.** Microsoft says `memberOf` itself can contribute to tenant-wide processing delays. Use the official dynamic-processing guidance, pause only the known affected objects when possible, and resume critical objects first after recovery. Do not unpause a large backlog all at once. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/manage-dynamic-group))

## Administrator checklist

- [ ] Confirm the tenant is in the global public cloud and identify every `memberOf` use.
- [ ] Scan dynamic groups with all pages and the `MembershipRule` property selected.
- [ ] Scan dynamic administrative units with `AdministrativeUnit.Read.All`.
- [ ] Run Microsoft's read-only Entitlement Management auto-assignment scanner.
- [ ] Export current rules, processing states, member object IDs, and member counts.
- [ ] Resolve every source group ID to a display name and owner.
- [ ] Map applications, Teams, SharePoint, licenses, Conditional Access policies, scoped roles, access packages, and automation that consume each object.
- [ ] Freeze creation of new `memberOf` rules through the change process.
- [ ] Choose a supported attribute rule only where the attribute is authoritative.
- [ ] Convert relationship-based populations to assigned membership or another explicitly owned process.
- [ ] Preserve existing group and administrative-unit object IDs where possible.
- [ ] Validate exact member additions and removals, not only counts.
- [ ] Test joiner, mover, leaver, guest, disabled-account, and device cases as applicable.
- [ ] Validate administrative-unit scope with each delegated role owner.
- [ ] Build an alternative access-package assignment path before removing an unmatched policy.
- [ ] Migrate low-risk objects before security-critical groups and scopes.
- [ ] Capture audit, sign-in, assignment, licensing, and application evidence.
- [ ] Define rollback as a supported assigned or attribute-based state, not a return to `memberOf` after November 3.
- [ ] Rerun all three inventories and require zero `memberOf` rules before closure.

The clean operating model is this: **`memberOf` flattened source-group relationships into evaluated authorization objects; after November 3, those relationships stop moving**. Preserve the object IDs that consumers already trust, replace the rule with an authoritative source of truth, and prove both membership and downstream control behavior before calling the migration done.

## References

- [`memberOf` preview limitations and migration guidance — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-rule-member-of)
- [Automatic assignment policies and the November 3 quarantine — Microsoft Learn](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-auto-assignment-policy)
- [Dynamic administrative-unit membership and conversion — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/admin-units-members-dynamic)
- [Change group membership type in place — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/groups-change-type)
- [Dynamic membership rule syntax — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership)
- [Efficient dynamic membership rules — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-rule-more-efficient)
- [PowerShell samples for pausing and resuming dynamic processing — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership-powershell-samples)
- [List groups with Microsoft Graph — Microsoft Learn](https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0)
- [List administrative units with Microsoft Graph — Microsoft Learn](https://learn.microsoft.com/en-us/graph/api/directory-list-administrativeunits?view=graph-rest-1.0)
- [Microsoft Entra activity-log overview — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/overview-monitoring-health)
