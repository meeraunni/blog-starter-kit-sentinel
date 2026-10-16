---
title: "Microsoft Entra Application Group Discovery Admin Guide"
excerpt: "Discover Microsoft Entra application groups: classify local and unassigned groups, validate matching and membership, govern access, and recover from drift."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-16T17:25:38-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The application owner expects twenty governed groups. The first discovery report returns two hundred, including old project teams, local administrator groups, and names that look familiar but do not match anything in Microsoft Entra ID. That is not a cleanup queue yet. It is a correlation problem with an authorization blast radius.

**Microsoft Entra application group discovery** extends Account Discovery so administrators can retrieve group objects from a supported target application, match them to Entra groups, and classify them as local, unassigned, assigned, or failed to correlate. Group discovery is a **public-preview** addition to an established discovery experience. It is opt-in, requires a configured provisioning connection, and does not automatically delete, import, assign, or govern a target group.

Microsoft announced the group and membership expansion in the [October 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). The current [Account Discovery operating guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery) documents the preview state, matching model, connector exclusions, portal path, and report categories for users and groups.

Grab a coffee before anyone turns “local group” into “delete group.” The report tells you what the provisioning service could retrieve and correlate. It does not tell you why a group exists, what every member can reach, which application-native role the group holds, or whether removing it is safe.

## Microsoft Entra application group discovery: what changed

The new preview applies the existing Account Discovery correlation model to target-side groups. Microsoft Entra asks the application's provisioning interface to list identities, compares target groups with Entra groups using the configured matching property, and sorts the results into these states:

- **Local identities (`uncorrelated`)** have a target group but no matching Entra group. The group might be obsolete, locally authoritative, created by another provisioning path, or simply unmatched because its identifier is wrong.
- **Unassigned identities (`correlatedNotAssigned`)** match an Entra group that is not assigned to the enterprise application. The same group exists on both sides, but the assignment state does not put it under this provisioning job's normal scope.
- **Assigned identities (`correlatedAssigned`)** match an Entra group already assigned to the enterprise application.
- **Correlation failures (`failToCorrelate`)** could not be evaluated successfully. Treat these as errors, not local groups.

Those status values are also used by the Microsoft Graph beta identity-correlation API. Microsoft explicitly says the beta API can change and is unsupported for production applications, so the portal report should remain the reviewed control plane for a production rollout. ([Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/identitycorrelation-list-identities?view=graph-rest-beta))

This is a narrower intent than the site's [Account Discovery orphan-account guide](/posts/microsoft-entra-account-discovery-orphan-accounts), which focuses on target user accounts and the decision to match, govern, retain, or remove them. Here the subject is the target **group object**, its correlation to an Entra group, its application assignment, and the membership and authorization evidence that must be checked before remediation.

## Start with the support gate, not the report button

Group discovery is useful only when the connector can enumerate target groups completely. Microsoft requires the target application to support SCIM pagination, and it separates unsupported scenarios into two sets.

These connectors and scenarios currently support neither user nor group discovery:

- Adobe Identity Management;
- Amazon Web Services;
- Cloud Sync;
- cross-tenant and cross-cloud synchronization;
- Freshservice;
- group provisioning to Active Directory;
- Workday, SAP SuccessFactors, HiBob, and API-driven HR provisioning;
- LinkedIn Learning and LinkedIn Sales Navigator;
- N-able;
- ServiceNow; and
- Snowflake.

ECMA, Google Cloud, and Google Workspace currently support user discovery but **not** group discovery. The feature is otherwise enabled for provisioning connectors, but availability in the portal is not proof that a target returns every group. The target still needs working list and pagination behavior. Microsoft points application developers to RFC 7644 section 3.4.2.4 for that pagination contract.

Use that list as a current preflight, not a permanent compatibility matrix. This is preview software, and the [operating guide's application-support section](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery#application-support) is the authority to recheck immediately before a pilot.

## Confirm licensing, role, connection, and matching

Microsoft documents four prerequisites:

1. Microsoft Entra ID Governance or Microsoft Entra Suite licensing.
2. An enterprise application configured for provisioning, with valid credentials and a successful test connection.
3. A direct matching-attribute mapping between Microsoft Entra ID and the target application.
4. Application Administrator, Cloud Application Administrator, or Hybrid Identity Administrator for the portal operation.

The matching rule deserves more attention than the button. Account Discovery uses the **first** matching attribute. It does not combine several candidates, and expression-based transformations are unsupported for correlation. If the target uses a locally generated ID while the first Entra group matching property is a display name, a technically complete report can still classify valid groups incorrectly.

Before the first run, record the group source attribute, target attribute, uniqueness expectation, case behavior, and examples for renamed groups. Confirm that the target value is actually populated on every in-scope group. A matching property is evidence only if the application treats it consistently.

Microsoft's [application-provisioning architecture](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works) also makes an important distinction: assigning a group to an application can scope its users, while provisioning the group object and its members is a separate connector capability. Do not assume that seeing an Entra group under **Users and groups** means the target group object or its membership is already synchronized.

## Run a baseline without turning it into remediation

Choose a lower-risk application with an engaged owner and a target-side group inventory you can compare. Do not begin with a payroll, production-administration, or emergency-access application.

In the Microsoft Entra admin center:

1. Browse to **Identity > Applications > Enterprise applications**.
2. Select the enterprise application and open **Provisioning**.
3. Confirm the provisioning credentials pass **Test Connection**.
4. Review the group attribute mapping and verify the first direct matching attribute.
5. Select **Discover identities**.

Microsoft says a discovery report takes at least 30 minutes. A target containing 250,000 identities can take 12 hours or more. Wait for a completed status and compare the result with the target application's authoritative group count before classifying anything. A short report can be a pagination defect, not a clean application.

Save a baseline containing:

- enterprise application name, service principal ID, owner, and connector type;
- report ID, start and completion time, and status;
- matching attributes and relevant group mappings;
- target group stable ID, name, status, owners, and imported attributes;
- correlated Entra group object ID where present;
- local, unassigned, assigned, and failed-to-correlate counts;
- target and Entra membership counts captured at the same review point; and
- target-side roles, permissions, or resources granted to each sensitive group.

The membership counts and application roles are validation evidence gathered from their authoritative systems. They are not a claim that the Account Discovery report certifies effective access.

## Triage each application group by control plane

### Local groups need an owner before a disposition

A local group has no matching Entra group under the configured rule. Work through four explanations before proposing removal.

**The match is wrong.** Compare the target matching value with the first direct Entra mapping. Look for renamed groups, stale aliases, case or formatting differences, duplicate values, missing values, and a target group that was recreated with a new stable ID.

**The target is authoritative.** Some applications use local groups for built-in administration, service accounts, license boundaries, record ownership, workflows, or API authorization. Document the application owner, purpose, membership owner, privileged roles, and review process.

**Another system owns the lifecycle.** A separate identity provider, vendor integration, merger tenant, or application-native automation may legitimately create the group. Confirm the source before introducing a second controller.

**The group is probably stale.** Prove it with application activity, membership, resource assignments, workflow dependencies, and owner evidence. Disable or remove it only through the application's supported process, after transferring anything it owns.

The correct success metric is not zero local groups. It is zero **unexplained** local groups.

### Unassigned groups expose a scope gap

An unassigned group matches an Entra group but is not assigned to the enterprise application. That can mean a legacy target group should be brought under Entra provisioning, or it can mean the match joined two unrelated groups that happen to share a value.

Validate the Entra object ID, target stable ID, owners, purpose, member population, and effective target permissions. If the pair is approved and the connector supports group provisioning, assign the Entra group through the governed application path and observe a provisioning cycle. Confirm the service matches the existing target group instead of creating a duplicate.

If the target group is not approved, remove its application permissions or retire it through the target owner's process. Assigning every correlated group merely to make the report green would convert unmanaged access into governed-looking unmanaged access.

### Assigned groups still need an access review

Assigned means the provisioning control plane recognizes the group. It does not certify its members, owners, target role, nested access, or continuing business need.

Compare the Entra membership with the target membership, then verify that the target role attached to the group is the one the application owner approved. For a sensitive population, use the site's [Microsoft Entra access reviews guide](/posts/microsoft-entra-access-reviews) to select accountable reviewers and decide whether results can be applied automatically. If the group is delivered through an access package, the [Entitlement Management operating guide](/posts/microsoft-entra-entitlement-management-access-packages) covers request, approval, expiration, and removal controls.

> [!IMPORTANT]
> Microsoft's October announcement says the preview discovers application groups **and group memberships**. The operating guide documents group retrieval, group correlation, and identity categories, but it does not define a separate membership-remediation workflow. Treat discovered membership as visibility to validate against the target and Entra. Do not infer that discovery imports members, resolves drift, or makes target-side membership safe to overwrite.

## Move approved groups under control in small rings

Use this sequence as an operational design, not a Microsoft rollout schedule.

**Fix correlation first.** Correct stale identifiers or the matching configuration, run a fresh discovery report, and prove that known groups move into the expected category. Do not change application assignments to conceal bad matching.

**Freeze local edits for the pilot.** Ask the application owner to avoid manual changes to the pilot groups during the comparison window. If the application cannot provide a change log, shorten the window and capture before-and-after exports.

**Assign one representative group.** Pick a nonprivileged group with enough members to test membership handling. Observe the next provisioning cycle and review the provisioning logs for a match, create, update, skip, or failure.

**Test both directions of change.** Add and remove one approved test member through the authoritative path. Confirm the target result and the expected time. Do not use a production leaver or administrator as the test identity.

**Expand by consequence.** Move ordinary access groups before groups tied to administrative roles, sensitive records, billing authority, or automation. Require the target owner to approve each ring.

**Rerun discovery.** Compare stable IDs and category changes with the baseline. Investigate every new local group and every unexpected membership difference.

## Read the logs without confusing visibility and control

All operations performed by the provisioning service are recorded in provisioning logs. Microsoft documents source and target reads and writes, affected attributes, status, and error information in the [provisioning architecture](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works#how-to-tell-if-users-are-being-provisioned-properly).

For each pilot group, keep four evidence layers separate:

- **Discovery report:** could Microsoft retrieve and correlate the target group?
- **Provisioning log:** did the provisioning service match, create, update, skip, or fail the group or membership operation?
- **Directory state:** what are the Entra group object ID, owners, direct members, and assignment?
- **Target state:** what group, members, roles, resources, and activity exist in the application?

A green discovery status cannot replace a provisioning log, and a successful provisioning event cannot prove the target role is appropriate.

Microsoft Graph can retrieve identity-correlation reports and their identities through `/beta/reports/correlations`. The current API documentation lists `ProvisioningLog.Read.All` as the least-privileged delegated or application permission, with a supported Entra role also required for delegated access. It is available only in the global service, not US Government or China clouds. ([list reports](https://learn.microsoft.com/en-us/graph/api/reportroot-list-correlations?view=graph-rest-beta), [list identities](https://learn.microsoft.com/en-us/graph/api/identitycorrelation-list-identities?view=graph-rest-beta))

Use that API for reviewed investigation or export, not unattended destructive remediation. Beta status, a 1,000-item maximum page size, and `@odata.nextLink` pagination all need explicit handling.

## Troubleshoot the preview without guessing

**The report shows no groups.** Recheck the connector exclusion list, successful test connection, direct first matching rule, target support for listing groups, and SCIM pagination. Compare the target's group count with the report rather than accepting zero as authoritative.

**Nearly every group is local.** Sample known pairs and compare exact matching values. If those values differ, stop classification work and fix correlation. A high local percentage is more likely to be a mapping problem than proof that every target group is rogue.

**One Entra group appears to match the wrong target group.** Stop the pilot. Check whether the matching value is unique and stable on both sides. Rename or identifier reuse can make a plausible-looking match dangerous. Preserve both stable IDs and have the application owner identify the authoritative pair.

**The group is assigned but does not provision.** Confirm that the connector supports provisioning group objects, group provisioning is enabled in mappings, the group is in scope, and the relevant target object actions are enabled. Remember that assigning a group for user scope is not the same as provisioning the group object.

**Membership differs after a successful group match.** Inspect provisioning logs for membership operations, target API limits, unsupported nested groups, and locally edited members. Microsoft's provisioning model reads only direct members for assignment-based group scope; nested-group behavior should never be assumed. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works#assignment-based-scoping))

**The report is incomplete or takes much longer than expected.** Confirm it finished, then compare counts page by page. Escalate incomplete listing or pagination to the application vendor when the target does not meet its SCIM contract. Escalate to Microsoft when a supported connector, valid credentials, direct match, completed report, and vendor-confirmed pagination still produce reproducibly missing or incorrect groups.

## Roll back the write, not the report

Running discovery is read-only, so it does not need rollback. Assignment, mapping, membership, and target-group changes do.

Before each remediation ring, export the Entra group object IDs, owners, direct members, enterprise-application assignments, target group IDs, target members, target roles, and any owned resources. If provisioning creates a duplicate, removes members, or changes target permissions unexpectedly:

1. stop the expansion and preserve the discovery and provisioning evidence;
2. identify which writes completed in both systems;
3. restore only the last approved membership or assignment through the authoritative control plane;
4. transfer or restore target-owned resources before removing a duplicate group;
5. verify access for the affected pilot members; and
6. correct the matching rule, scope, or connector behavior before another run.

Do not restart provisioning as a reflex. Microsoft says a restart clears the stored watermark and causes all source objects to be evaluated again. That can widen the blast radius when the mapping or scope is still wrong. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works#provisioning-cycles-initial-and-incremental))

## Administrator checklist

- [ ] Confirm group discovery is public preview, optional, and not a default-on cleanup action.
- [ ] Recheck the current connector support and exclusion list.
- [ ] Verify Microsoft Entra ID Governance or Microsoft Entra Suite licensing.
- [ ] Use an approved Application Administrator, Cloud Application Administrator, or Hybrid Identity Administrator.
- [ ] Confirm a valid provisioning connection and successful test.
- [ ] Verify the first matching rule is direct, populated, stable, and unique enough for groups.
- [ ] Prove the target can list and paginate every group.
- [ ] Pilot a lower-risk application and preserve a complete baseline.
- [ ] Treat local as uncorrelated, not automatically unauthorized.
- [ ] Validate target roles and memberships outside the category label.
- [ ] Distinguish group assignment for user scope from provisioning the group object.
- [ ] Watch provisioning logs after every approved assignment or membership change.
- [ ] Keep Graph beta retrieval out of destructive production automation.
- [ ] Rerun discovery after mapping fixes and every remediation ring.
- [ ] Require zero unexplained groups, not zero local groups.

Microsoft Entra application group discovery gives administrators a map of target-side group drift. The map becomes useful only after you prove the connector returned the full population, the matching rule joined the right objects, and the application owner can explain what each group actually authorizes. Do that work first, then move approved groups under provisioning and governance one small ring at a time.

## Where to read further

- [October 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460)
- [Discover identities with Account Discovery](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-to-account-discovery)
- [How Microsoft Entra application provisioning works](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works)
- [List identity correlation reports in Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/reportroot-list-correlations?view=graph-rest-beta)
- [List correlated identities in Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/identitycorrelation-list-identities?view=graph-rest-beta)
- [Microsoft Entra ID Governance reconciliation overview](https://learn.microsoft.com/en-us/entra/id-governance/reconciliation-overview)
