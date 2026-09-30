---
title: "Prevent Nested Groups in Microsoft Entra: Admin Guide"
excerpt: "Prevent nested groups in Microsoft Entra with the new disableNesting preview control. Inventory dependencies, pilot safely, monitor changes, and roll back."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-30T09:15:20-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **prevent nested groups in Microsoft Entra**, set the target security group's new `disableNesting` property to `true` through Microsoft Graph beta. The control stops other groups from being added as members of that group. It does not turn off ordinary user, device, service-principal, or organizational-contact membership, and Microsoft documents it only for security groups that are not role-assignable.

That is the short answer. The operational answer starts one step earlier: inventory any group objects that are already direct members, trace where the target group grants access, and test the change on a disposable security group. Microsoft's property description says `true` prevents groups from being added; it does not say the setting removes an existing nested relationship. Treat cleanup of existing nesting as a separate, approved access change.

Grab a coffee before making this a tenant-wide switch. It is a per-group, opt-in preview control, not a ban on group nesting across Microsoft Entra. Microsoft added `disableNesting` to the Graph beta group resource in the [September 2026 Microsoft Graph update](https://learn.microsoft.com/en-us/graph/whats-new-overview#september-2026-new-in-preview-only). Microsoft has not announced a general-availability date, default-on rollout, or mandatory enforcement schedule.

## Prevent nested groups in Microsoft Entra at the right boundary

The new property protects the **parent** group: the group that would otherwise receive another group as a direct member. Microsoft's [beta group resource reference](https://learn.microsoft.com/en-us/graph/api/resources/group?view=graph-rest-beta) documents these boundaries:

- `disableNesting` defaults to `false`;
- setting it to `true` prevents other groups from being added as members;
- it can be set only on security groups where `isAssignableToRole` is `false`;
- it is read-only for Microsoft 365 groups and role-assignable groups;
- it is not returned by default, so a read must explicitly select it; and
- the least-privileged Graph permission for reading or writing it is `Group-NestingSupport.ReadWrite.All`.

This is a structural membership guardrail. It does not decide what a user can do with an application, Azure resource, SharePoint site, or Conditional Access policy. Those systems continue to evaluate the group's membership according to their own supported model.

That distinction matters because nested groups do not behave consistently across workloads. Microsoft's [directory limits and restrictions](https://learn.microsoft.com/en-us/entra/identity/users/directory-service-limits-restrictions) says nested membership is supported for group claims, Conditional Access scoping, self-service password reset scoping, and device registration restrictions. The same page says nested groups are not supported for application role assignment, group-based licensing, or Microsoft 365 Groups.

The control is therefore useful when the group's owner wants a stable promise: access can be granted only through the group's supported direct-member paths, not by attaching an entire child group later.

> [!IMPORTANT]
> **Analysis:** `disableNesting` reduces one form of authorization drift. It does not prove that the group's current direct members are correct, that the group is used only in workloads that honor direct membership, or that another group cannot grant the same resource access independently.

## Decide whether this control fits the group

Use `disableNesting` when all of these statements are true:

- the target is a Microsoft Entra security group;
- `isAssignableToRole` is `false`;
- the owner intentionally wants direct membership rather than group-of-groups administration;
- the group is important enough that a future child-group addition would create material access drift;
- existing direct and transitive membership has been reviewed; and
- the operating team can support a beta Graph dependency and revalidate it before every rollout ring.

Do not use the preview as a shortcut around an unresolved group design. A nested structure can be deliberate when regional or departmental groups need to feed a parent authorization group and the consuming workload supports transitive membership. Blocking future nesting on the parent without mapping that dependency can break an established joiner, mover, or acquisition workflow.

### Keep adjacent controls separate

**Role-assignable groups** already reject group nesting. Microsoft's [role-assignable group guidance](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/groups-concept) says a group cannot be added as a member of a role-assignable group. That is why `disableNesting` is read-only when `isAssignableToRole` is `true`.

**Microsoft 365 groups** do not support group nesting. They are collaboration objects with users as members, so `disableNesting` is not a new control for Teams or Microsoft 365 group membership.

**Security-group sensitivity labels** govern a different problem. The site's [security-group sensitivity labels guide](/posts/microsoft-entra-security-group-sensitivity-labels) explains how preview labels can restrict guests and require compatible labels on supported child groups. `disableNesting` simply prevents a child group from being added to the protected parent; it does not classify the group or apply a guest policy.

**Workload support** still wins. The site's [AADSTS50105 troubleshooting guide](/posts/aadsts50105-user-not-assigned-microsoft-entra) explains that a user in a nested child group does not inherit an enterprise-application assignment from the parent. Turning nesting off can simplify that design, but it does not retroactively convert transitive users into direct app assignments.

## Preserve the current authorization graph first

Before setting the property, record the target group's object ID, display name, security state, role-assignable state, ownership, source of authority, current `disableNesting` value, and every downstream resource that uses the group.

Then inventory two different views:

1. **Direct child groups** answer whether another group is currently nested immediately inside the target.
2. **Transitive members** show the larger effective membership graph below those direct children.

Microsoft's [list group members reference](https://learn.microsoft.com/en-us/graph/api/group-list-members?view=graph-rest-1.0) says `/members` is direct and not transitive. It supports an OData cast to return only member objects of type group. Use that view to find the relationships the new guardrail is meant to stop:

```http
GET https://graph.microsoft.com/v1.0/groups/{group-id}/members/microsoft.graph.group?$select=id,displayName
```

Follow every `@odata.nextLink`; an empty first page is not a complete inventory when pagination is present.

Microsoft's [transitive-members reference](https://learn.microsoft.com/en-us/graph/api/group-list-transitivemembers?view=graph-rest-1.0) provides the effective group graph and supports a group type cast:

```http
GET https://graph.microsoft.com/v1.0/groups/{group-id}/transitiveMembers/microsoft.graph.group?$count=true&$select=id,displayName
ConsistencyLevel: eventual
```

The direct query identifies relationships that may need an explicit design decision. The transitive query shows how far the authorization graph reaches. Neither query tells you where the parent group is assigned, so also inspect Conditional Access, enterprise applications, Azure role assignments, application configuration, SharePoint, Intune, and any custom authorization store that consumes the group.

Do not remove a child group merely to make the preview rollout look clean. First compare the child's effective users, devices, and service principals with the approved direct-membership model. Removing a nested relationship can revoke access wherever the parent is evaluated transitively.

## Confirm preview, permission, and licensing boundaries

The property is listed under **September 2026: New in preview only**. Microsoft's Graph documentation warns that beta APIs can change and are not supported for production applications. A production access model should not depend on a beta write without an explicit risk decision, a tested read-back, and a manual recovery path.

Microsoft's [Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference#group-nestingsupportreadwriteall) documents `Group-NestingSupport.ReadWrite.All` for both delegated and application access. Both forms require administrator consent. The permission is narrowly described as reading and writing groups' `disableNesting` property; use it instead of a broad directory-write permission when this is the only required action.

The current `disableNesting` property and permission references do not state a dedicated product-license prerequisite. Do not turn that absence into a licensing promise. Confirm preview availability in the target tenant and check the live Microsoft documentation and your agreement before a broad deployment.

Also separate Microsoft Graph permission from directory role. An OAuth permission authorizes the client to call the API; it should not be described as proof that a human operator has the organization's required change authority. Use privileged access approval, separate consent administration from execution, and remove temporary access after the pilot when your governance process requires it.

## Pilot `disableNesting` with Microsoft Graph beta

Start with a disposable cloud security group that is not connected to an application, role, policy, license, device deployment, or synchronization workflow. Do not begin with a highly privileged production group.

### 1. Read the target and prove eligibility

The property requires an explicit `$select`:

```http
GET https://graph.microsoft.com/beta/groups/{group-id}?$select=id,displayName,securityEnabled,isAssignableToRole,groupTypes,mailEnabled,onPremisesSyncEnabled,disableNesting
```

Stop if `securityEnabled` is not `true` or `isAssignableToRole` is `true`. Record the entire response in the change evidence, excluding authorization headers and tokens.

### 2. Confirm there are no direct child groups

Run the direct group-member query from the inventory section. For the first pilot, use a group with no child groups. This avoids making an undocumented assumption about what happens when the property is enabled on a parent that already contains nested groups.

### 3. Set the property in its own PATCH

Send only the intended property. The [Graph beta update-group method](https://learn.microsoft.com/en-us/graph/api/group-update?view=graph-rest-beta) says omitted properties retain their current values and a successful update normally returns `204 No Content`:

```http
PATCH https://graph.microsoft.com/beta/groups/{group-id}
Content-Type: application/json

{
  "disableNesting": true
}
```

Do not interpret `204` as complete validation. Read the group back with the same explicit `$select` and confirm the object ID and `disableNesting` value.

### 4. Test both the blocked and allowed paths

Use two disposable member objects:

- attempt to add a disposable security group to the protected parent and confirm the relationship is not created;
- add and remove a disposable user through the normal approved path and confirm ordinary membership still works.

Microsoft's [add-members reference](https://learn.microsoft.com/en-us/graph/api/group-post-members?view=graph-rest-1.0) documents `POST /groups/{group-id}/members/$ref` as the member-add operation and notes that group membership writes can have brief replication delays after a group is created. Re-read membership after each test. Preserve the response status, body, request ID, UTC time, actor, target group ID, and candidate member ID without storing access tokens.

Microsoft has not documented a stable, `disableNesting`-specific error string in the current property reference. Validate the resulting relationship instead of building monitoring or automation around a guessed message.

## Roll out in rings without changing existing access by accident

### Ring 0: classify groups by authorization purpose

Identify security groups that are intended to contain only direct members. Record the resource owner, group owner, supported member types, source of authority, automation accounts, break-glass process, and whether each consuming workload evaluates direct or transitive membership.

### Ring 1: protect unused or low-impact groups

Choose groups with no child groups and no high-impact assignments. Enable the property, read it back, test a blocked group addition, test an allowed user addition, and review the audit trail.

### Ring 2: protect one production group with simple dependencies

Choose a parent whose owners already agree that child groups are prohibited. Monitor helpdesk, identity-governance, provisioning, and deployment tooling for failed writes. Keep the rollout bounded long enough to cover the normal membership-update cycle.

### Ring 3: expand by workload

Move through groups used for one resource class at a time. Conditional Access groups deserve separate change windows because nested membership is supported there and a mistaken cleanup can change policy scope. Application-assignment and licensing groups need different validation because those workloads do not honor nested membership in the first place.

### Ring 4: automate drift detection before mass enforcement

Inventory groups with the property explicitly selected, compare the result with the approved control list, and alert on unexpected changes. Do not assume a normal v1.0 group export contains the preview property. Keep the beta dependency isolated so it can be replaced cleanly when Microsoft publishes a v1.0 surface.

## Monitor configuration and membership separately

Microsoft Entra audit logs capture changes to groups and their membership. Microsoft's [audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities) lists `Update group`, `Add member to group`, and `Remove member from group` under GroupManagement. The [activity-log access guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs) directs administrators to **Entra ID > Monitoring & health > Audit logs** and notes that opening logs from the Groups area prefilters the category to GroupManagement.

For every rollout ring, retain:

- the `Update group` event that changed the property;
- the read-back showing the expected value;
- the failed child-group addition test and final direct-member list;
- the successful allowed-member test and cleanup event;
- changes made by owners, automation, entitlement workflows, and privileged applications; and
- any downstream access failure that begins after the change.

Audit the control and the authorization graph as different things. A group can remain protected from new child groups while its direct users, devices, or service principals drift. Conversely, an owner can change `disableNesting` back to `false` without immediately adding a child group. Both events matter.

## Roll back without erasing the evidence

If a legitimate workflow needs to add a child group and the organization approves that design, set the property back to `false` through the same beta group PATCH:

```http
PATCH https://graph.microsoft.com/beta/groups/{group-id}
Content-Type: application/json

{
  "disableNesting": false
}
```

Read the property back, preserve the audit event, and test only the intended relationship. Setting the property to `false` removes the preventive guardrail; it does not add a child group by itself.

Do not broaden application permissions, grant Global Administrator, recreate the group, or disconnect a resource merely to work around a failed PATCH. If the target is unsupported, the beta contract changed, or preview availability is uncertain, leave production membership unchanged and escalate with the target object ID, request ID, UTC time, tenant cloud, response, and current documentation URL.

If an existing child group must be removed during remediation, treat that as a separate access revocation. Preserve the before-and-after member graph and validate every downstream workload. The site's [memberOf retirement migration guide](/posts/microsoft-entra-memberof-retirement-migration-guide) is useful when group relationships are also being moved to a new source-of-authority model.

## Troubleshoot the common failure patterns

### The property is missing from the GET response

Confirm the request uses the `/beta` endpoint and explicitly includes `disableNesting` in `$select`. The property is not returned by default and is not currently documented on the v1.0 group resource.

### The PATCH returns 403

Inspect the access token's Microsoft Graph permissions and consent state. The least-privileged permission documented for this property is `Group-NestingSupport.ReadWrite.All`, and it requires admin consent. Do not add a broad directory-write permission without proving it is necessary.

### The property is read-only

Check the target type and `isAssignableToRole`. Microsoft documents the property as read-only for Microsoft 365 groups and role-assignable groups. Select a normal security group with `isAssignableToRole` set to `false`.

### A nested group still appears after enablement

Determine whether it existed before the setting changed. The current property definition promises to prevent groups from being added; it does not document automatic removal of existing child groups. Preserve the relationship, analyze the access impact, and remove it only through an approved access change.

### A user loses access after cleanup

Check whether the user reached a Conditional Access scope, group claim, password-reset scope, device-registration scope, or custom resource through the removed child group. Microsoft documents those as scenarios where nested groups can be effective. Restore only the approved relationship or grant the correct direct access; do not disable unrelated security controls.

### The add test fails for an unrelated reason

Newly created groups can take time to replicate, and the add-members API documents other failures for unsupported member types, missing permissions, or nonexistent objects. Confirm replication, IDs, group type, caller permission, and the final member list before attributing the result to `disableNesting`.

## Prevent nested groups in Microsoft Entra checklist

- [ ] Confirm the target is a security group with `isAssignableToRole` set to `false`
- [ ] Define the intended direct-member types and authorization purpose
- [ ] Export direct child groups and the transitive membership graph
- [ ] Map every Conditional Access, application, Azure, Microsoft 365, Intune, and custom dependency
- [ ] Record owners, source of authority, automation, and current property value
- [ ] Approve the Microsoft Graph beta dependency explicitly
- [ ] Use `Group-NestingSupport.ReadWrite.All` instead of broad directory write access
- [ ] Start with a disposable group that has no child groups or production assignments
- [ ] PATCH only `disableNesting` and read it back with `$select`
- [ ] Test a blocked child-group addition and an allowed ordinary-member change
- [ ] Preserve request IDs, timestamps, audit events, and resulting membership
- [ ] Roll out by workload and monitor a complete membership-update cycle
- [ ] Keep a tested PATCH-to-`false` rollback procedure
- [ ] Treat removal of existing child groups as a separate access change
- [ ] Recheck the live Graph documentation before every production ring

## Frequently asked questions

### Is `disableNesting` generally available?

No. Microsoft lists it under Microsoft Graph features that are new in preview for September 2026. The property is documented on the beta group resource, not the v1.0 group resource.

### Does `disableNesting` remove groups that are already nested?

Microsoft's current property definition says `true` prevents other groups from being added. It does not document automatic removal of existing members. Inventory the target first and treat any cleanup as a separate access change.

### Can I prevent nesting on a role-assignable group?

Role-assignable groups already do not support group nesting. Microsoft documents `disableNesting` as read-only for groups where `isAssignableToRole` is `true`.

### Can I use the control on a Microsoft 365 group?

No. Microsoft 365 groups do not support groups as members, and the property is read-only for that group type.

### Does the control block users and devices from joining the group?

No. The documented property prevents **other groups** from being added as members. Validate user, device, service-principal, and organizational-contact workflows separately according to the group design.

### Which Graph permission should automation request?

Microsoft documents `Group-NestingSupport.ReadWrite.All` as the least-privileged permission to read or write `disableNesting`. It is available for delegated and application access and requires admin consent.

### Is there a tenant-wide switch to prevent all nested groups?

The September 2026 release documents a Boolean property on each group. It does not describe a tenant-wide default or mandatory rollout. Build an approved target inventory and apply the control per eligible group.

## Microsoft sources

- [What's new in Microsoft Graph: September 2026](https://learn.microsoft.com/en-us/graph/whats-new-overview#september-2026-new-in-preview-only)
- [Microsoft Graph beta group resource](https://learn.microsoft.com/en-us/graph/api/resources/group?view=graph-rest-beta)
- [Update group with Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/group-update?view=graph-rest-beta)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference#group-nestingsupportreadwriteall)
- [Manage groups in Microsoft Entra](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups)
- [Microsoft Entra service limits and restrictions](https://learn.microsoft.com/en-us/entra/identity/users/directory-service-limits-restrictions)
- [Use groups to manage Microsoft Entra role assignments](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/groups-concept)
- [List direct group members](https://learn.microsoft.com/en-us/graph/api/group-list-members?view=graph-rest-1.0)
- [List transitive group members](https://learn.microsoft.com/en-us/graph/api/group-list-transitivemembers?view=graph-rest-1.0)
- [Add group members](https://learn.microsoft.com/en-us/graph/api/group-post-members?view=graph-rest-1.0)
- [Microsoft Entra audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities)
- [Access Microsoft Entra activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs)
