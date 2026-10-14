---
title: "Microsoft Entra ServiceNow Access Packages: Setup Guide"
excerpt: "Deploy Microsoft Entra ServiceNow access packages safely: review Graph permissions, preserve Entra authority, pilot requests, monitor delivery, and recover."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-14T17:26:28-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra ServiceNow access packages** let users request governed access and let designated approvers act without leaving ServiceNow. The safe setup is to keep catalogs, access packages, policies, eligibility, approvals, assignments, and lifecycle controls authoritative in Microsoft Entra ID Governance; use the ServiceNow application as another user experience for those existing controls; and treat its app registration as a privileged integration.

That last point deserves attention before anyone clicks **Get** in the ServiceNow Store. The current installation guide requires delegated `User.Read` and **EntitlementManagement.ReadWrite.All**. Microsoft's [Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference#entitlementmanagementreadwriteall) says the latter requires administrator consent and can manage authorizations for resources onboarded to Entitlement Management catalogs. Those resources can include groups, applications, SharePoint sites, Microsoft Entra roles, API permissions, and Azure resource roles. This is not an ordinary catalog plug-in.

Microsoft announced the integration as **generally available** in the [October 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). GA describes the product state; it does not make the integration default-on, install it in a ServiceNow instance, grant Microsoft Graph consent, or migrate an existing request catalog automatically.

Grab a coffee and start with one low-impact package. The goal is not merely to make an approval button appear in ServiceNow. The goal is to prove that the same identity sees the same eligible package, answers the same policy questions, reaches the intended approver, receives the intended resources, expires on schedule, and leaves an evidence trail in both platforms.

## Microsoft Entra ServiceNow access packages: first decision

Use the integration when ServiceNow is already the place users and approvers expect to handle service requests, but Microsoft Entra should continue governing access.

| Requirement | Decision |
| --- | --- |
| Users need to request existing Entra access packages from ServiceNow | Good fit for a pilot |
| Approvers need to approve or deny those requests in ServiceNow | Good fit when the Entra policy already designates them |
| ServiceNow must create catalogs, packages, policies, or approver assignments | Not the documented model; administer those objects in Entra |
| The project expects ServiceNow records to become the source of truth for access | Redesign the operating model before installing |
| The security team cannot approve the current delegated Graph permission | Do not deploy the current store application |
| The target ServiceNow release is not in the current compatibility matrix | Stop and obtain explicit support confirmation |
| The team has not reconciled existing packages, policies, owners, and assignments | Clean up the Entra control plane first |

Microsoft's [integration overview](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-servicenow-integration) is explicit about the authority boundary. Administrators create and manage catalogs, access packages, assignment policies, requestor eligibility, approvers, and assignments in Microsoft Entra ID Entitlement Management. ServiceNow supplies an alternative request and approval experience.

This article therefore has a distinct purpose from the site's [Entitlement Management and access packages architecture guide](/posts/microsoft-entra-entitlement-management-access-packages), which explains how to model catalogs, packages, policies, and lifecycle. Here, the problem is how to add ServiceNow without creating a second policy authority or an unreviewed privileged OAuth path.

## Understand the two control planes

A request crosses four boundaries:

1. A signed-in user opens the Microsoft Entra ID Governance application in ServiceNow.
2. The ServiceNow application obtains a delegated Microsoft identity platform token through its OAuth configuration.
3. The application uses Microsoft Graph to discover packages the user can request, submit the request, retrieve its status, or act on an approval.
4. Microsoft Entra Entitlement Management evaluates the assignment policy and, when the request completes, delivers the package's resource roles.

ServiceNow does not replace the policy evaluation in step four. Microsoft Entra still decides which packages are visible, who can request them, what questions and approvals apply, how long an assignment lasts, and which resource grants result. The ServiceNow application guide says its search and package views follow the same fields and request experience as My Access.

That gives administrators a useful diagnostic split:

- **My Access and ServiceNow both show the wrong result:** investigate the Entra catalog, package, policy, eligibility, and assignment state.
- **My Access is correct but ServiceNow is wrong:** investigate the ServiceNow role, OAuth registry, app registration, Graph consent, token, application logs, and outbound request.
- **The request completes but access is missing:** investigate the Entra assignment request and resource delivery, not just the ServiceNow ticket or page.

The [access-package visibility model](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-visibility) explains the Entra-side checks. The catalog must be enabled, the package must be visible as intended, and at least one enabled policy must match the requestor. A beautiful ServiceNow catalog cannot make an ineligible package requestable.

> [!IMPORTANT]
> **Analysis:** treat the ServiceNow application as a privileged presentation tier over Entra governance. It is not the policy engine, but a compromised registration, client secret, administrator configuration, or delegated session can expose a powerful path into that engine.

## Prove prerequisites before installation

The current Microsoft page lists a **Microsoft Entra ID P2 or Microsoft Entra Suite** license for the integration. Confirm licensing for the people and governance operations in scope rather than assuming a ServiceNow subscription includes the Entra entitlement.

Download the application only from the [Microsoft Entra ID Governance listing in the ServiceNow Store](https://store.servicenow.com/store/app/9c8ca6a087c80fd4a6c6fc48cebb3560). The linked [version 1.0.0 installation and configuration guide](https://store.servicenow.com/api/sn_store/v1/store/attachment/9837597d97428f503fa8b84bf253af41) is dated January 15, 2026 and lists compatibility with ServiceNow Xanadu, Yokohama, and Zurich. Compatibility is perishable: confirm the store listing and guide again at change time, especially after a ServiceNow family upgrade.

Assign responsibilities before granting access:

- a **ServiceNow System Administrator** installs or uninstalls the scoped application;
- a ServiceNow application administrator with `x_mioms_meig.admin` administers its configuration;
- the application administrator also needs `oauth_admin` to configure OAuth credentials;
- application users receive `x_mioms_meig.user`; and
- an authorized Microsoft Entra administrator reviews the app registration and grants the required Microsoft Graph consent.

Do not leave the installer as the permanent integration owner by accident. Record a business owner, Entra technical owner, ServiceNow technical owner, security reviewer, support route, and expiry date for the initial pilot approval.

On the Entra side, prepare one access package whose behavior is already proven in My Access. Use a nonprivileged test resource, a small eligible group, a named approver with a fallback, required justification, a short assignment duration, and an unambiguous package description. The package should have no unresolved **Partially Delivered** or **Failed** requests before it becomes the integration test.

If the archive contains unmanaged or orphaned accounts for the target application, reconcile them first with the site's [Microsoft Entra Account Discovery guide](/posts/microsoft-entra-account-discovery-orphan-accounts). Adding a new request surface does not clean up pre-existing access outside the package lifecycle.

## Review the Microsoft Graph permission before consent

The current store guide specifies these delegated permissions:

- `User.Read`
- **EntitlementManagement.ReadWrite.All**

The permission type matters. A delegated token combines what the application is allowed to do with what the signed-in user and the Entitlement Management policy permit. It is not an application-only daemon token. It is still highly privileged.

Microsoft describes delegated **EntitlementManagement.ReadWrite.All** as allowing an application to request access to and manage access packages and related Entitlement Management resources on behalf of the signed-in user. Administrator consent is required. Microsoft also warns that the permission can manage authorization for every resource onboarded to Entitlement Management catalogs, including sensitive directory and resource roles.

Microsoft Graph now documents the narrower delegated **EntitlementMgmt-SubjectAccess.ReadWrite** as least privileged for end-user operations such as `userAdd`, `userUpdate`, `userRemove`, and `approverRemove`. The [create assignment request API](https://learn.microsoft.com/en-us/graph/api/entitlementmanagement-post-assignmentrequests?view=graph-rest-1.0) explains that policy eligibility still governs those actions.

Do not silently substitute that narrower permission for the permission required by the store application's current guide. The published application may call other endpoints or expect the broader scope. Instead:

1. record the exact version being installed;
2. capture its requested permissions before consent;
3. compare them with the current store guide and Graph permission reference;
4. ask the publisher for a supported least-privilege profile if the broader permission is unacceptable; and
5. do not deploy if the requested scopes and documented functionality cannot be reconciled.

That is a security gate, not a documentation nit. An application that can only request and approve for the signed-in user has a different blast radius from an application consented to manage all Entitlement Management resources.

## Register and configure the integration safely

Follow the current store guide rather than copying values from an old project ticket. At a high level, the documented setup is:

1. Create or select the dedicated Microsoft Entra app registration for this ServiceNow integration.
2. Add the web redirect URI `https://<instance-name>.service-now.com/oauth_redirect.do`, replacing the placeholder with the exact instance name.
3. Add the documented delegated Microsoft Graph permissions and complete the organization's administrator-consent review.
4. Record the tenant ID and client ID.
5. Create the client credential required by the current application version and store its value only in the ServiceNow OAuth configuration process.
6. Install the store application from **All Available Applications** in the intended ServiceNow instance.
7. As the ServiceNow application administrator with `oauth_admin`, configure the application's user authentication registry with the client ID, client secret, authorization URL, token URL, and redirect URL required by the guide.
8. Assign `x_mioms_meig.user` only to the pilot population.

Use separate nonproduction and production registrations when the organization maintains separate ServiceNow instances. Give each registration its own owner set, redirect URI, credential, change record, and consent review. Reusing one credential across development, test, and production turns an instance-level problem into a shared control-plane incident.

Never paste the client secret into the change ticket, chat, test script, or validation screenshot. Record its owner and rotation date in the approved secret-management process. The store guide tells administrators to copy the secret into the OAuth configuration; it does not authorize treating the value as ordinary project data.

After configuration, verify the enterprise application rather than stopping at a successful OAuth callback. Confirm the service principal exists in the expected tenant, the publisher and application identifiers match the reviewed store application, delegated consent matches the approved scopes, the redirect URI belongs to the intended ServiceNow instance, named owners exist, and sign-in activity comes from the planned pilot.

## Run a four-stage pilot

### Stage 1: prove read-only discovery

Assign the ServiceNow application user role to one test requestor and one test approver. Do not submit a request yet.

Compare the same identity in ServiceNow and My Access:

- available packages;
- package name, description, and resource count;
- active packages;
- expired packages;
- request history; and
- pending approvals for the designated approver.

The integration's Microsoft Learn page places the experience under **Service Catalog > Microsoft Entra ID Governance**, with **Access Package**, **Request History**, and **Approvals**. If a label or navigation path differs in the installed release, use the store documentation for that exact version and record the difference rather than inventing a tenant-wide configuration problem.

### Stage 2: submit one low-risk request

Choose the pilot package, answer its configured questions, supply the required justification, and request the shortest useful duration. Preserve:

- requestor object ID and user principal name;
- access package, policy, catalog, and assignment-request IDs;
- request creation time in UTC;
- business justification and requested duration;
- ServiceNow application-log correlation data; and
- the matching Entra request state.

The [My Access request documentation](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-request-access) remains the control comparison. A request requiring approval should enter a pending approval state; a request should not bypass the Entra policy because it originated in ServiceNow.

### Stage 3: prove approval and delivery

Have the designated approver review the request details and reason, then approve it in ServiceNow. Confirm the decision, decision maker, and time in Microsoft Entra. Verify the assignment becomes active and every resource role is delivered.

Do not equate **request completed** with **all resources delivered**. Microsoft's [request administration guidance](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-requests) distinguishes request state from assignment delivery and exposes **Partially Delivered** and **Failed** outcomes. Validate the actual group membership, app role, site role, Entra role, API permission, or Azure role represented by the package.

Run a negative test too. A user outside the policy's allowed target scope should not discover or request the package. A user who is not the designated approver should not be able to approve it. The integration is ready only when the deny paths match Entra policy, not merely when the happy path works.

### Stage 4: prove removal and expiry

Use the pilot package's intended lifecycle. Test a user-initiated removal or a short expiry, then confirm the assignment ends and the granted resource access is removed. Preserve the request and assignment evidence before cleanup.

After the technical pilot, expand by access-package cohort, not by enabling the ServiceNow role for everyone. Start with low-impact packages, then ordinary business packages, then higher-impact packages only after the security team accepts the permission and monitoring model.

## Monitor the integration end to end

Use evidence from both platforms because each sees a different failure domain.

**In ServiceNow:** the installation guide exposes application logs to the System Administrator and application administrator, with Error, Warn, Info, and Debug levels. It also documents outbound HTTP request logs for inspecting API calls and errors.

**In Microsoft Entra:** use Entitlement Management requests, assignments, resource-assignment status, and audit events. Microsoft's [Entitlement Management reports and logs guide](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports) explains how to inspect who is assigned, which packages a user can request, resource assignments, request status, access-package events, and drift.

**In identity sign-in evidence:** monitor the enterprise application's sign-ins for unexpected users, tenants, locations, failures, or activity outside the rollout window. Alert on changes to the app registration, enterprise application, redirect URIs, credentials, owners, and consent grants through the organization's existing application-governance monitoring.

> [!IMPORTANT]
> **Analysis:** the store guide's outbound HTTP diagnostic settings can expose request content in ServiceNow logs. Enable verbose or body-level logging only for a bounded troubleshooting window, restrict access to the log, and return the setting to the approved production level when evidence is captured.

A useful operating dashboard separates these states:

| Layer | Healthy evidence | Failure owner |
| --- | --- | --- |
| ServiceNow UI | Package or approval visible to the intended identity | ServiceNow application owner |
| OAuth | Successful token acquisition for the reviewed app registration | Joint Entra and ServiceNow owners |
| Microsoft Graph | Expected response with no consent or authorization error | Entra application owner |
| Entitlement policy | Correct eligibility, questions, approver, and lifecycle | Access-package owner |
| Resource delivery | Every intended resource role delivered | Resource and access-package owners |
| Expiry or removal | Assignment and downstream grants removed as designed | Access-package and resource owners |

## Troubleshoot without weakening policy

### The access package is missing in ServiceNow

Open My Access as the same user. If the package is missing there too, verify the catalog is enabled, the package is not hidden for this discovery scenario, the policy is enabled, and the requestor matches the allowed target scope. Do not broaden the policy to **All users** merely to make the test pass.

If the package is visible in My Access but absent in ServiceNow, check the user's `x_mioms_meig.user` role, OAuth token acquisition, tenant and client identifiers, delegated consent, ServiceNow application logs, and outbound Graph response.

### Sign-in succeeds but Graph returns authorization errors

Compare the consented delegated scopes with the versioned installation guide. Confirm the OAuth registry uses the intended tenant, app registration, redirect URI, and active credential. Then verify the signed-in user is actually eligible to perform the operation. Do not add an Entra administrator role to an ordinary requestor as a troubleshooting shortcut.

### The approval does not appear

Confirm the request is pending approval in Entra, the signed-in ServiceNow identity is the designated approver for the active stage, and the policy has not moved to another stage or fallback approver. Compare the same approver's **Approvals** view in My Access. Microsoft's [approval guidance](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-request-approve) notes that one approver's decision completes a stage when multiple approvers are configured for that stage.

### The request is Partially Delivered or Failed

Inspect the assignment request and individual resource delivery results in Entra. Correct the resource-specific problem first. Microsoft supports [reprocessing a failed or partially delivered request](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reprocess-access-package-requests) for up to 14 days after the original request completes. Reprocessing is preferable to asking the user to create duplicate requests while the failed grant still exists.

### The client credential expired or was replaced

Update the reviewed app registration and ServiceNow OAuth configuration through the change process, then run token, discovery, request, approval, and delivery validation again. Do not temporarily grant broader Graph permissions or share a credential from another environment.

## Roll back without orphaning access

The first rollback is to remove the ServiceNow application role from the pilot cohort and direct users back to My Access while the integration is repaired. That stops new use of the alternate front end without dismantling the Entra packages and policies that remain authoritative.

If the app registration or credential is suspected compromised, follow the organization's incident process to contain the enterprise application, revoke or replace the credential, investigate sign-ins and consent, and review Entitlement Management changes. Security containment should be evidence-driven; do not delete the registration before preserving its identifiers, owners, permissions, sign-ins, and audit trail.

The store guide documents uninstalling the scoped application through **System Applications > All Available Applications > All** as a ServiceNow System Administrator. Uninstallation is not an access revocation workflow.

> [!IMPORTANT]
> **Analysis:** because Entra remains the system of record, removing the ServiceNow user experience should not be treated as removing existing access-package assignments. Review and remove unwanted assignments in Microsoft Entra, then verify the downstream resource grants separately.

After rollback, confirm users can still request the approved packages through My Access, approvers can act there, existing assignment lifecycles continue, and the ServiceNow integration no longer obtains tokens or produces unexpected Graph activity.

## Administrator checklist

- [ ] Confirm the integration is GA but not default-on or automatically installed.
- [ ] Define ServiceNow as the request and approval surface, not the access-policy authority.
- [ ] Verify Microsoft Entra ID P2 or Microsoft Entra Suite licensing for the scope.
- [ ] Confirm the exact store application version and ServiceNow compatibility matrix.
- [ ] Review the app registration, redirect URI, owners, and environment boundaries.
- [ ] Review `User.Read` and **EntitlementManagement.ReadWrite.All** before administrator consent.
- [ ] Document why the current store version needs the broader delegated entitlement permission.
- [ ] Keep the client secret out of tickets, chat, scripts, and screenshots.
- [ ] Start with one low-impact package already proven in My Access.
- [ ] Compare package visibility, questions, approvals, duration, and history in both portals.
- [ ] Test an eligible requestor, an ineligible requestor, the intended approver, and a non-approver.
- [ ] Verify each downstream resource grant, not only the request status.
- [ ] Capture ServiceNow application logs and Entra request, assignment, audit, and sign-in evidence.
- [ ] Test removal or expiry and prove that downstream access is removed.
- [ ] Keep My Access available as the recovery path.
- [ ] Review consent, credentials, owners, sign-ins, and compatibility on a recurring schedule.

## FAQ

### Does the ServiceNow integration replace My Access?

No. It provides another request and approval experience. Microsoft Entra Entitlement Management remains the system of record, and My Access remains a valuable comparison and recovery path.

### Can ServiceNow administrators create access packages and policies through this integration?

The current Microsoft integration page says catalogs, access packages, policies, approvers, and assignments are managed in Microsoft Entra. Do not design a second policy-authoring workflow in ServiceNow unless Microsoft documents and supports it for the installed version.

### Why is the broad delegated permission a concern?

Delegated does not mean low risk. Microsoft requires administrator consent and warns that the permission can manage authorization for resources onboarded to Entitlement Management catalogs. Review the signed-in user's authority, the Entra policy, the app registration, and the breadth of cataloged resources together.

### Can I replace the required permission with a narrower scope?

Microsoft Graph documents **EntitlementMgmt-SubjectAccess.ReadWrite** as least privileged for end-user request and approval operations. The current store guide nevertheless requires **EntitlementManagement.ReadWrite.All**. Do not change the application contract without publisher support; instead, make the difference an explicit security acceptance or deployment blocker.

### What should I send to support?

Include the ServiceNow family and application version, instance URL without secrets, tenant and client IDs, correlation and request IDs, UTC timestamps, signed-in user and role, access package and policy IDs, consented scopes, sanitized application and outbound HTTP errors, matching Entra request state, and whether the same action succeeds in My Access. Never attach the client secret or bearer token.

## Microsoft sources

- [What's new in Microsoft Entra: October 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460)
- [Microsoft Entra ID Entitlement Management integration with ServiceNow](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-servicenow-integration)
- [Microsoft Entra ID Governance application in the ServiceNow Store](https://store.servicenow.com/store/app/9c8ca6a087c80fd4a6c6fc48cebb3560)
- [ServiceNow installation and configuration guide, version 1.0.0](https://store.servicenow.com/api/sn_store/v1/store/attachment/9837597d97428f503fa8b84bf253af41)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference#entitlementmanagementreadwriteall)
- [Create an access-package assignment request with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/entitlementmanagement-post-assignmentrequests?view=graph-rest-1.0)
- [Understand access-package visibility](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-visibility)
- [Request access to an access package](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-request-access)
- [View and remove access-package requests](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-requests)
- [View Entitlement Management reports and logs](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports)
- [Approve or deny access-package requests](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-request-approve)
- [Reprocess failed or partially delivered requests](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reprocess-access-package-requests)

Microsoft Entra ServiceNow access packages are useful when they reduce user friction without moving access policy into the service desk. Keep Entra authoritative, scrutinize the delegated permission, test both allow and deny paths, and make My Access the control comparison. Then ServiceNow becomes a governed doorway into the lifecycle you already designed—not a second source of truth.
