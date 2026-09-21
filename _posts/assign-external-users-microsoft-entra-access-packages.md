---
title: "Assign External Users to Microsoft Entra Access Packages"
excerpt: "Assign external users to Microsoft Entra access packages by email, validate policy scope, monitor delivery, and preserve a governed guest lifecycle."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-21T17:33:47-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

You can now **assign external users to Microsoft Entra access packages** with an email address even when the person does not yet have an account in your tenant. Microsoft Entra Entitlement Management creates the B2B guest, applies the access-package policy, delivers the package resources, and keeps the assignment inside a governed lifecycle.

That is the short answer. The operational answer needs one more sentence: the email field is not a side door around policy, B2B restrictions, or resource delivery. The chosen policy must allow identities outside the directory, the address must be in that policy's scope, tenant collaboration controls must permit the invitation, and every resource in the package must still provision successfully.

Microsoft listed direct administrator assignment to external users by email as generally available in its July 2026 Entra update. The current assignment documentation calls the capability **Directly assign any identity**. ([July 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-july-2026/4534631), [access-package assignments](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#directly-assign-any-identity))

Grab a coffee before the pilot. The click path is short; the safety work is deciding exactly who the policy admits and what happens to the guest when the assignment ends.

## How to assign external users to Microsoft Entra access packages

Use this sequence for a controlled first assignment:

1. confirm that the access package contains only the intended groups, applications, Teams, or SharePoint roles;
2. confirm that your tenant has the required Entitlement Management licensing;
3. review external-collaboration and cross-tenant access restrictions for the partner;
4. create or select an access-package policy for users not in your directory;
5. make the policy scope no broader than the partner population you intend to admit;
6. set an explicit assignment end date or verify the policy's lifecycle settings;
7. assign one pilot identity by email;
8. verify the request, guest object, package assignment, and each underlying resource; and
9. record the audit event and removal owner before expanding the pilot.

In the Microsoft Entra admin center, browse to **ID Governance > Entitlement management > Access packages**, open the package, select **Assignments**, and then select **New assignment**. Choose a policy configured for **For users not in your directory**, select **External user**, enter the person's name if useful and their email address, set the assignment dates, and select **Add**. Microsoft lists Identity Governance Administrator as the baseline administrative role and Catalog owner, Access Package manager, and Access Package assignment manager as less broadly privileged alternatives for package assignment work. ([direct-assignment procedure](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#directly-assign-any-identity))

Do not expand the operator's directory role merely because the package is partner-facing. Delegate at the catalog or access-package boundary when that meets the operating need.

## Understand the control plane before the first assignment

The administrator is creating an assignment request, not manually building an unrelated guest and then adding that guest to several resources. Entitlement Management evaluates the chosen package policy, invites the external identity through Microsoft Entra B2B when necessary, and delivers the resource roles represented by the package.

An access package can include Microsoft Entra security-group membership, Microsoft 365 Groups and Teams, enterprise-application assignments, and SharePoint Online site membership. The package policy supplies the assignment guardrails and lifecycle. Microsoft's Entitlement Management overview describes those policies as the controls that determine who can receive an assignment and how long that access lasts. ([Entitlement Management overview](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-overview))

If you are still deciding how to divide resources into catalogs and packages, start with the site's [Entitlement Management and access-package architecture guide](/posts/microsoft-entra-entitlement-management-access-packages). This article assumes the package itself is already a sound access boundary and concentrates on the new external-user assignment path.

### Existing guest and new external identity are different paths

Use **Identities in my directory** when the guest object already exists. Use **External user** when the person is not yet in the directory and you need to supply an email address. Microsoft documents that distinction in the direct-assignment flow. ([assign an identity](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#directly-assign-an-identity))

This matters during incident review. An existing guest has an object ID, creation history, sign-in history, and potentially access that predates the package. A newly invited guest begins its tenant lifecycle with this operation. Do not treat those two histories as interchangeable.

### The policy still decides whether the address is eligible

The policy selected in the assignment pane remains authoritative. If it targets **Specific connected organizations**, the email domain must match one of those organizations. If it targets **All connected organizations**, the domain must belong to a configured organization. Microsoft says the broad **All users (All connected organizations + any external user)** scope is required when you intend to assign any external identity rather than identities from configured organizations only. ([external identity policy scope](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#directly-assign-any-identity))

That broad option is useful, but it is not the safe default for every package. Prefer a specific connected organization when the business relationship is known. Use the any-external-user scope only when the business process genuinely accepts identities outside a preconfigured partner list, and compensate with tight resource scope, explicit expiry, named assignment operators, and regular review.

> **Analysis:** the administrator's ability to type an email address changes the onboarding mechanism, not the trust model. Policy scope and tenant B2B controls are still the places where you define who is admissible.

## Check prerequisites, licensing, and tenant restrictions

Microsoft's current overview says Entitlement Management requires Microsoft Entra ID Governance or Microsoft Entra Suite subscriptions for your organization's users, while some individual capabilities can operate with Entra ID P2. Review the current licensing terms for your exact scenario rather than assuming an older P2 deployment covers every governance feature. For external users, Microsoft's guest-licensing page identifies a successful direct assignment for an identity not yet in the directory as a billable governance event. ([Entitlement Management licensing](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-overview#license-requirements), [ID Governance guest licensing](https://learn.microsoft.com/en-us/entra/id-governance/microsoft-entra-id-governance-licensing-for-guest-users))

Before a pilot, confirm all of these:

- the catalog and package exist, and the package contains the intended resource roles;
- the operator has a suitable Entitlement Management role and can access the Entra admin center;
- the chosen policy permits administrator assignment and covers identities outside the directory;
- the assignment has an intentional start and end boundary;
- external collaboration restrictions do not block the email domain;
- inbound cross-tenant access settings permit the user and target application when the identity comes from another Entra tenant; and
- the destination groups, applications, and sites are healthy enough to accept the assignment.

External collaboration settings control who can invite guests, what guests can see, and which domains are allowed or denied. Cross-tenant access settings separately govern which external users and groups can access which applications. Microsoft documents that both the domain allow/block list and cross-tenant access settings are checked during an invitation. ([external collaboration settings](https://learn.microsoft.com/en-us/entra/external-id/external-collaboration-settings-configure), [cross-tenant access settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration))

An address that matches an access-package policy can therefore still be blocked by a tenant-level B2B control. Do not weaken a tenant-wide restriction merely to make one package assignment succeed. Confirm the intended partner and application scope with the external-identity owner first.

## Design the policy for a governed guest lifecycle

Direct assignment is best for a known person who needs access now and should not have to navigate a self-service request. It is not a reason to discard lifecycle controls.

For a partner pilot, define:

- **Population:** one connected organization, or another deliberately bounded external population.
- **Resources:** only the roles required for the partner task.
- **Duration:** the contract, project, or support window—not an arbitrary permanent grant.
- **Justification:** a ticket, sponsor, contract, or engagement reference recorded with the assignment where the interface permits it.
- **Review:** a named resource owner who can validate continued need.
- **Removal:** the expected resource revocation and guest-object outcome after the last governed assignment ends.

Microsoft lets administrators set assignment start and end times in the direct-assignment pane. If no end date is entered, the selected policy's lifecycle settings apply. ([assignment dates](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#directly-assign-an-identity))

Treat that fallback as a control to verify, not a reason to leave the date blank casually. During change review, capture the effective expiry that will actually govern the assignment.

### Decide what should happen to the guest object

Entitlement Management has tenant-level controls for external users who lose their last access-package assignment. The defaults described by Microsoft block a governed external user from signing in and remove the guest account after 30 days. Administrators can change whether the account is blocked, whether it is removed, and the delay before removal. ([external-user lifecycle settings](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-external-users#manage-the-lifecycle-of-external-users))

There are two sharp edges:

1. Entitlement Management only applies this cleanup to guests it invited or guests later converted to governed users.
2. A governed guest can be removed after losing the last package assignment even if someone later granted that guest direct access outside Entitlement Management, including a SharePoint or OneDrive assignment.

That second point is why direct grants and governed grants should not be mixed casually. Before enabling aggressive guest cleanup, find unmanaged access paths and give application and collaboration owners a documented migration plan.

For a recurring partner population that needs ongoing object synchronization rather than a handful of named, time-bound assignments, compare this design with the site's [cross-tenant synchronization guide](/posts/microsoft-entra-cross-tenant-synchronization). Direct-by-email assignment solves a specific onboarding event; it does not replace a lifecycle source for an entire partner workforce.

## Pilot the direct external assignment safely

Use one representative test identity from an approved partner domain. Avoid an executive, production break-glass account, or shared mailbox as the first subject.

Before selecting **Add**, capture:

- package name and ID;
- policy name and intended external scope;
- resource roles in the package;
- target email address and sponsoring owner;
- effective start and end time;
- applicable collaboration restriction and cross-tenant policy; and
- expected guest cleanup behavior.

After selecting **Add**, refresh the assignment list. Microsoft exposes active, expired, and **Delivering** states. A Delivering assignment indicates that not all resource roles have finished provisioning; Microsoft directs administrators to the corresponding request for detailed delivery errors. ([assignment states](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#view-who-has-an-assignment))

Validate four layers separately:

1. **Request:** the Entitlement Management request exists under the package.
2. **Identity:** the B2B guest exists with the expected email and tenant relationship.
3. **Package:** the assignment reaches its delivered state with the intended dates and policy.
4. **Resources:** each group, application, Team, or SharePoint role is present and usable.

Do not call the pilot successful because the guest object exists. Guest creation proves the invitation stage reached the directory; it does not prove every resource in a multi-resource package delivered.

## Monitor the assignment and preserve evidence

The access-package assignment list is the first operational view. For audit evidence, browse to **ID Governance > Entitlement management > Audit logs** and filter the category to `EntitlementManagement` or `UserManagement`. Microsoft documents the direct-assignment activity name as `Administrator directly assigns user to access package`; the record identifies the initiating operator through `ActorUserPrincipalName`. ([Entitlement Management reports and logs](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports#determine-the-status-of-a-users-request))

Preserve at least:

- the direct-assignment audit event;
- the package request and final delivery status;
- the created guest object ID;
- the policy and expiry applied to the assignment; and
- evidence that each intended resource received the grant.

Entitlement Management reports can also show which packages are assigned to a user and which package and policy delivered each governed resource role. Those reports do not claim to inventory unrelated access granted outside Entitlement Management. ([resource assignments for a user](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports#view-resource-assignments-for-a-user))

For high-value catalogs, add a user-centric review after the onboarding process is stable. The site's [catalog access-review deployment guide](/posts/microsoft-entra-catalog-access-reviews-deployment-guide) covers reviewer scope, applied decisions, monitoring, and recovery without turning this assignment guide into a second access-review article.

## Troubleshoot external access-package assignment failures

Work from policy to tenant restrictions to resource delivery. That order keeps you from changing a broad B2B setting when the package policy was the real blocker.

### The external email cannot be added

Confirm that you selected a policy for users not in the directory and then selected **External user**. Check whether the policy targets a specific connected organization, all connected organizations, or any external user. For organization-scoped policies, the email domain must match the configured organization. ([policy eligibility checks](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#directly-assign-any-identity))

If the policy scope is correct, inspect the tenant's domain allow/block list and inbound cross-tenant access settings. A blocked invitation should be fixed at the narrowest intended scope, with the external-identity owner involved.

### The assignment stays in Delivering

Open the package's **Requests** view and locate the request for the identity. Microsoft says the request contains more detail about delivery errors when an assignment has not provisioned every resource role. Then verify the failing resource directly: group membership, application assignment, Team, or SharePoint role. ([delivery-error workflow](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#view-who-has-an-assignment))

Do not remove and recreate the guest as a first response. That destroys useful correlation while leaving the resource or policy failure untouched.

### The guest exists but the application still blocks sign-in

Separate assignment from authentication. Confirm that the enterprise-application role was delivered, then inspect inbound cross-tenant access scope and the application's Conditional Access result. An access package can grant the application role while another control correctly denies the sign-in.

### The guest did not receive an invitation email

For external users brought in through Entitlement Management, Microsoft says the B2B guest is created without the ordinary invitation email; the user receives an email when the access-package assignment is delivered. Check delivery state and notification expectations before sending a second manual invitation. ([external-user delivery flow](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-external-users#how-access-works-for-external-users))

### The guest remains after access ends

Check whether the guest was originally invited through Entitlement Management or later converted to a governed user. Microsoft's automatic external-user cleanup applies only to those governed identities. Also confirm that this was the user's last access-package assignment and review the configured block and deletion delay. ([governed guest cleanup boundary](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-external-users#manage-the-lifecycle-of-external-users))

### The guest was removed while another team still expected access

Determine whether the remaining access was granted outside Entitlement Management. Microsoft warns that a guest governed by access-package lifecycle can be removed after losing the last package assignment even if direct SharePoint or OneDrive access was added later. Recover access according to your guest lifecycle procedure, then move the remaining legitimate grant into a governed model before enabling the package again.

## Roll back without erasing the trail

If the pilot reaches the wrong identity or grants the wrong bundle, remove the access-package assignment from **Assignments**. Microsoft also supports an `adminRemove` assignment request through Microsoft Graph, but use the portal for a one-user pilot unless your automation path is already reviewed. ([remove an assignment](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments#remove-an-assignment))

Then verify resource removal independently. If the package policy is too broad, disable or narrow that policy before assigning anyone else. If tenant B2B controls are wrong, pause the rollout and return ownership to the external-identity team. Do not delete a guest merely to make the package list look clean: preserve the request and audit evidence first, and confirm whether the identity has unrelated legitimate access.

Rollback ends only when the package assignment and its delivered resource roles are removed or intentionally retained, the guest-object decision is documented, and the policy no longer admits unintended identities.

## Microsoft Entra external access-package checklist

- [ ] The access package contains only approved resource roles.
- [ ] Current Entitlement Management and guest licensing has been confirmed.
- [ ] The operator uses the least-privileged suitable governance role.
- [ ] The selected policy covers users not yet in the directory.
- [ ] Connected-organization or any-external-user scope is intentional.
- [ ] Domain restrictions and inbound cross-tenant access allow the pilot.
- [ ] Assignment start, expiry, sponsor, and justification are recorded.
- [ ] The request, guest object, package state, and each resource are validated.
- [ ] Audit evidence identifies the administrator who made the assignment.
- [ ] Last-assignment guest cleanup behavior is understood.
- [ ] Unmanaged direct grants are not silently relying on a governed guest object.
- [ ] The removal owner and escalation path are documented before scale-out.

Direct assignment by email removes a needless staging step; it does not remove governance. Keep the policy narrow, give the assignment a real end, validate delivery at the resource layer, and decide the guest object's fate before onboarding the second person. That is how a convenient administrator action becomes a durable partner-access process instead of tomorrow's orphan-account queue.
