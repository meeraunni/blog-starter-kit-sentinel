---
title: "Azure RBAC Access Packages in Microsoft Entra: Admin Guide"
excerpt: "Govern Azure RBAC access with Microsoft Entra access packages: scope roles safely, choose active or eligible access, pilot approvals, and verify removal."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-05T09:40:08-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Azure RBAC access packages** let Microsoft Entra ID Governance grant an employee or guest an Azure role at management-group, subscription, or resource-group scope through an access-package assignment. The role can be **active**, which grants standing access for the assignment's lifetime, or **eligible**, which requires the user to activate it through Privileged Identity Management (PIM) before using it.

Microsoft announced direct Azure RBAC roles in access packages as a **public preview** in May 2026. Treat that release state as a real production-design constraint: prove the complete request, assignment, activation, expiration, and audit path in a noncritical scope before expanding it. Microsoft's current [Azure RBAC access-package configuration guide](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-azure-role-assignments) documents the supported scopes, built-in and custom roles, active and eligible assignment types, licensing, and required permissions. The [Microsoft Entra release record](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#may-2026) is the source for the preview status.

Grab a coffee before adding a subscription to a catalog. This feature joins two authorization planes: Microsoft Entra entitlement management decides who receives the package and for how long, while Azure Resource Manager enforces the resulting Azure role assignment. A clean approval in My Access is not enough. You need evidence that the correct role appeared at the correct Azure scope, that eligible access follows the intended PIM policy, and that access disappears when the package assignment ends.

## Azure RBAC access packages: the control-plane model

The simplest useful model has five objects:

1. **Azure scope:** a management group or subscription is onboarded into an entitlement-management catalog. A resource-group role can be selected beneath an onboarded subscription.
2. **Azure role definition:** a built-in role such as Reader or a custom Azure role defines the allowed actions.
3. **Access package:** the package includes that role at one supported scope and marks it active or eligible.
4. **Assignment policy:** the policy defines who can request the package, approval, justification, duration, renewal, and review behavior.
5. **Access-package assignment:** approval or direct assignment gives the identity the package. Entitlement management then delivers the Azure role assignment; eligible assignments use PIM for activation.

Microsoft's [entitlement-management overview](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-overview) describes access packages as lifecycle containers governed by policies for request, approval, and expiration. The Azure-specific guide adds direct Azure RBAC roles to that lifecycle. Do not confuse this with three adjacent designs:

- **A group in an access package with Azure RBAC assigned to the group** uses group membership as the bridge. That remains useful when many systems consume the same group.
- **A Microsoft Entra directory role in an access package** controls administration of Entra and Microsoft 365 services, not Azure resources. Microsoft's [resource-role guide](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-resources#add-a-microsoft-entra-role-assignment) currently labels that separate path as preview.
- **A direct PIM assignment** governs one Azure role without bundling it into an access package request and lifecycle.

Use direct Azure RBAC access packages when the business request is naturally a bundle or job entitlement: for example, temporary Reader access to a project subscription plus its application and collaboration resources. Use direct PIM assignment when the only requirement is one privileged Azure role and a package adds no useful lifecycle context.

## Supported scope and assignment decisions

Microsoft documents three supported combinations:

- **Management group in the catalog:** assign an active or eligible role at that management group.
- **Subscription in the catalog:** assign an active or eligible role at that subscription.
- **Subscription in the catalog, resource-group scope selected:** assign an active or eligible role at that resource group.

The current guide does not list an individual resource—such as one virtual machine, vault, or storage account—as a supported access-package scope. Do not quietly widen an intended resource-level permission to the full resource group. If the supported scope is too broad, retain the existing Azure RBAC or PIM design until Microsoft documents an acceptable boundary.

Both built-in and custom Azure roles are supported. That does not make every selectable combination safe. Start with the narrowest role and scope that complete the task. **Analysis:** a custom role also creates a second dependency: a later edit to the role definition changes effective permissions without changing the access package. Put role-definition ownership and review in the change record.

Choose **eligible** when the user should possess eligibility for the package lifetime but activate privilege only when needed. PIM role settings can require MFA, a Conditional Access authentication context, justification, approval, and a bounded activation duration. Those settings are defined per role and resource, as Microsoft explains in [Configure Azure resource role settings in PIM](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-configure-role-settings).

Choose **active** only when the workload genuinely needs continuous human access and the approved risk decision says activation is impractical. Active means the Azure role is usable while the access-package assignment is active; the package approval is not a substitute for just-in-time activation.

> [!IMPORTANT]
> **Analysis:** package approval and PIM activation answer different questions. Package approval asks whether the identity may hold the entitlement during a business period. PIM activation asks whether eligible privilege may become usable now, under the role's current activation policy. Keep both controls when the role is sensitive.

## Meet the licensing and permission gates

Microsoft's Azure RBAC access-package guide requires **Microsoft Entra ID Governance or Microsoft Entra Suite** licensing. Licensing terms can change, so confirm the population and guest model against the current [ID Governance licensing fundamentals](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals) before procurement or rollout.

The authorization path has two independent halves.

### Onboard the Azure resource into a catalog

The operator needs the documented entitlement-management role—Identity Governance Administrator or Privileged Role Administrator with Catalog Owner permissions—and Azure authorization at the selected management group or subscription. During onboarding, entitlement management checks for:

- namespace: `Microsoft.Authorization`;
- resource: `roleAssignments`; and
- actions: `read`, `write`, and `delete`.

If any check fails, onboarding fails. These are powerful permissions: they allow management of role assignments at the selected scope. Use a dedicated, time-bound administrative session, record who approved it, and onboard the smallest viable scope. A directory role in Microsoft Entra does not automatically grant Azure RBAC permission, and an Azure role does not automatically grant entitlement-management authority.

### Add an Azure role to the package

After the management group or subscription is in the catalog, the operator configuring the package needs:

That check is `read` on the `roleDefinitions` resource in the `Microsoft.Authorization` namespace.

at the exact management-group, subscription, or resource-group scope so entitlement management can enumerate the available role definitions. Microsoft lists Identity Governance Administrator as the portal prerequisite and also names Catalog Owner or Access Package Manager as least-privilege alternatives for the access-package task.

Do not grant Owner permanently because a role picker is empty. First identify which authorization-plane check failed and at which scope.

## Design the package before touching production

The package name and policy should tell an approver exactly what becomes possible. `Project Falcon access` is weak. `Falcon production subscription — eligible Reader — 30 days` exposes scope, privilege mode, and duration before approval.

Record these decisions:

- Azure tenant, management-group, subscription, and resource-group identifiers;
- built-in or custom role definition ID and its current allowed actions;
- active or eligible assignment, including the reason;
- requestor population, guest eligibility, and connected-organization boundary;
- primary and fallback approvers, with separation from the requestor;
- required business justification and ticket or project identifier;
- assignment duration, renewal decision, and access-review cadence;
- PIM activation requirements for eligible access;
- monitoring owner, rollback owner, and evidence retention;
- known direct, inherited, and group-based assignments that could preserve access outside the package.

Microsoft supports single- and multistage approval, requestor justification, and scoped requestor populations in [access-package approval policies](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-approval-policy). Use those controls to express the business decision, but keep the package small enough that one approval has one understandable blast radius. For periodic recertification of package assignments, the site's [catalog access-review deployment guide](/posts/microsoft-entra-catalog-access-reviews-deployment-guide) keeps reviewer, fallback, and apply-results decisions separate from the initial request.

Avoid putting Reader, Contributor, and Owner for several subscriptions into one convenience package. Different privilege levels or scopes should usually be separate packages so approval, expiration, review, and incident containment remain precise. The broader [Entitlement Management and access packages guide](/posts/microsoft-entra-entitlement-management-access-packages) covers the catalog and policy model; this guide stays focused on the Azure RBAC bridge.

## A safe Azure RBAC access-package pilot

### Ring 0: freeze current access

Export or record the pilot identity's effective Azure access before the change. Capture direct role assignments, group-derived assignments, inherited scope, PIM eligibility, package assignments, and the role definition. Without that baseline, a successful post-expiration sign-in cannot tell you whether removal failed or another assignment still grants access.

Choose a noncritical subscription or resource group, one low-risk role, and one test identity. For the first pass, avoid a role that can write role assignments, change policy, expose secrets, or disable monitoring.

### Ring 1: onboard only the approved Azure scope

In the Microsoft Entra admin center, browse to **ID Governance > Catalogs**, open the pilot catalog, select **Add resources**, and choose **Azure Resources**. Select the approved management group or subscription and add it.

Capture the Azure Activity Log around the operation. Microsoft documents the `write` and `delete` actions on the `roleAssignments` resource in the `Microsoft.Authorization` namespace as the create and delete operations for Azure role assignments in [Azure RBAC change history](https://learn.microsoft.com/en-us/azure/role-based-access-control/change-history-report).

### Ring 2: add one role and one policy

Open the access package under **ID Governance > Entitlement management > Access packages**, select **Resources**, and add the Azure resource. If the catalog contains a subscription, choose either the subscription or a resource group within it. Select **Active** or **Eligible**, then select the approved built-in or custom role.

Create a pilot policy with a short duration, named approver, required justification, and a narrow requestor set. For eligible access, review the PIM policy at the exact role and scope before assigning anyone. The site's [PIM operator playbook](/posts/microsoft-entra-pim-roles-operator-playbook) is useful for the activation-policy discipline, while Microsoft's [PIM deployment plan](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-deployment-plan) distinguishes Azure roles, Microsoft Entra roles, and PIM for Groups.

### Ring 3: test delivery, use, and removal

Have the test identity request the package through My Access and complete the real approval path. Then prove all of the following:

1. the access-package request is approved and its resource delivery completes;
2. the exact Azure role appears at the intended scope;
3. active access works without activation, or eligible access is unusable until PIM activation;
4. the eligible activation enforces the expected MFA, authentication context, justification, approval, and duration;
5. Azure activity performed during the test is attributable to the test identity;
6. manual removal or natural expiration removes the package assignment and its delivered Azure role;
7. the identity no longer has the tested capability after tokens and control-plane state have refreshed; and
8. any remaining access is explained by a separately approved direct, inherited, group, or package path.

Do not stop at the My Access success screen. In entitlement management, filter the package's **Assignments** and **Requests** views. Microsoft says a request stuck in **Delivering** can expose resource-delivery errors; the steps are in [View, add, and remove access-package assignments](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-access-package-assignments).

### Ring 4: expand by scope, not by enthusiasm

Add a representative business requestor, approver, guest if guests are in scope, and support operator. Exercise denied, expired, renewed, removed, and failed-delivery paths. Expand to another resource group or subscription only after the first scope's evidence is complete.

Keep preview expansion reversible. Do not retire a proven PIM or group-based process until the new path has survived assignment expiry, approver absence, role-definition change, delivery failure, and incident response.

## Monitor all three evidence layers

One screen cannot prove this control.

**Entitlement-management evidence** shows the package, policy, request, approval, assignment, expiration, and delivery status. Microsoft's [reports and logs guide](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-reports) documents package assignments, request status, resource assignments, and audit events.

**Azure RBAC evidence** shows role-assignment creation and deletion at the Azure scope. Filter the Azure Activity Log for the Administrative category and the create/delete role-assignment operations. Record timestamp, scope, caller, status, role definition, principal, and correlation data.

**PIM evidence** shows eligibility and activation for eligible roles. Under **ID Governance > Privileged Identity Management > Azure resources**, select the scope and review assignments, activations, and Resource audit. Microsoft's [Azure-resource PIM audit guide](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/azure-pim-resource-rbac) documents those views and the approval evidence available in Microsoft Entra audit logs.

There is one important monitoring gap: Microsoft's current access-package drift report covers governed groups and enterprise applications, but explicitly **does not include Azure roles**. It also refreshes on a schedule rather than in real time. Do not advertise that report as proof that Azure RBAC matches package assignments. Reconcile package assignments against Azure RBAC and PIM evidence yourself until Microsoft documents direct Azure-role drift coverage.

## Troubleshoot by authorization plane

### Azure Resources is missing or onboarding fails

Confirm the feature is available in the tenant and that the operator has both sides of authorization: the required entitlement-management role and Azure permissions for role-assignment read, write, and delete at the management-group or subscription scope. Validate the selected scope, not just a nearby resource group.

### The resource is onboarded but the role list is empty

Check `read` access to the `roleDefinitions` resource in the `Microsoft.Authorization` namespace at the exact scope where the package will assign the role. For a custom role, also verify that its assignable scopes include the target. Do not replace a missing custom role with a broader built-in role simply to finish the wizard.

### The request is approved but Azure access is absent

Open the access-package request and assignment. Look for **Delivering** state or a resource-delivery error. Then check the Azure Activity Log for a failed role-assignment write at the target scope. Preserve the request ID, UTC window, identity object ID, scope, role definition ID, Activity Log correlation data, and sanitized error before retrying.

### Eligible access appears, but activation fails

The package has completed its job when eligibility exists. Troubleshoot the separate PIM activation layer: role settings, assignment window, activation duration, approver, MFA or authentication context, Conditional Access result, and the user's current sign-in state. Do not convert the role to active merely to bypass an activation failure.

### The package expires, but the user still has access

Compare effective access with the Ring 0 baseline. Look for a direct assignment, group-based assignment, inherited parent-scope role, another access package, or a separate eligible/active PIM assignment. Confirm the expected delete operation in the Azure Activity Log. The absence of one package assignment does not prove the absence of all Azure access paths.

### Reporting shows no drift

That result is not evidence for Azure roles. Microsoft's documented access-package drift report excludes Azure roles. Use entitlement-management assignments, Azure RBAC assignments and Activity Logs, plus PIM eligibility and activation evidence.

## Rollback and escalation

For a pilot, stop new requests first: narrow or disable the request policy, or hide the package while preserving evidence. Remove the pilot assignment through entitlement management and confirm the Azure role assignment is removed. Do not manually delete an Azure role and declare the package fixed while the entitlement remains active; the two control planes would disagree.

If removal fails, contain access using the least disruptive supported action at the Azure scope, preserve the package request and delivery error, and escalate. Include tenant ID, package and catalog IDs, identity object ID, role definition ID, Azure scope, active or eligible choice, assignment and expiration times, request ID, UTC failure window, Entra audit correlation data, Azure Activity Log event, and PIM audit evidence. Do not include access tokens, secrets, or unredacted sensitive justification text.

Because this is preview, keep the previous supported assignment path documented until the pilot exits. Rollback means restoring the last approved access model and removing the preview-delivered entitlement—not leaving both paths active indefinitely.

## Azure RBAC access packages administrator checklist

- [ ] Confirm the feature's current preview or GA state in Microsoft release documentation.
- [ ] Confirm Microsoft Entra ID Governance or Microsoft Entra Suite licensing for the in-scope population.
- [ ] Choose one supported management-group, subscription, or resource-group boundary.
- [ ] Select the least-privileged built-in or custom Azure role.
- [ ] Decide active versus eligible explicitly; prefer eligible for sensitive access.
- [ ] Record PIM activation settings at the exact role and resource.
- [ ] Baseline direct, group, inherited, PIM, and other package assignments.
- [ ] Grant the onboarding operator only the required directory and Azure permissions for the change window.
- [ ] Require a clear business justification, named approver, and bounded package duration.
- [ ] Pilot one noncritical scope and one test identity.
- [ ] Verify request, approval, delivery, Azure role scope, and effective permission.
- [ ] Test PIM activation controls for eligible assignments.
- [ ] Test denial, delivery failure, expiration, removal, and approver absence.
- [ ] Correlate entitlement-management, Azure Activity Log, and PIM evidence.
- [ ] Remember that the current access-package drift report excludes Azure roles.
- [ ] Expand one scope at a time and retain a documented rollback path.

The useful promise here is not “self-service Owner access.” It is a governed bridge from business request to bounded Azure authorization. Keep the package understandable, the Azure scope narrow, privileged access eligible, and the evidence joined across entitlement management, Azure RBAC, and PIM. That is what turns a convenient preview into a defensible access lifecycle.
