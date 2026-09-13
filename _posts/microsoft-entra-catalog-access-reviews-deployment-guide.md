---
title: "Microsoft Entra Catalog Access Reviews Deployment Guide"
excerpt: "Microsoft Entra catalog access reviews let managers assess one user's access across many resources. Pilot scope, licensing, evidence, and rollback safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-13T11:09:08-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra catalog access reviews** let a reviewer assess one person's access across the groups and applications in an entitlement management catalog, instead of opening a separate review for every resource. Put related resources in a catalog, create the multi-resource review, assign the user's manager as the first reviewer, and add resource owners as a later stage when the risk justifies it.

That is the short answer. The safe answer starts with a warning: the catalog is now a review boundary. A noisy catalog gives a manager a wall of decisions without enough context; an over-broad catalog can mix unrelated business owners; and a late membership change might not appear in the review at all. Microsoft says changes made within 12 hours of a review starting might not be reflected.

Grab a coffee before turning this on for the finance catalog. Microsoft announced user-centric access reviews as **generally available** in the [September 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-september-2026/4545179). The [catalog access reviews guide](https://learn.microsoft.com/en-us/entra/id-governance/catalog-access-reviews) is the operating source of truth for supported resource types, roles, the portal flow, reviewer experience, and result application. This is an administrator-created review capability—not a mandatory tenant-wide enforcement change—and Microsoft publishes no rollout ring that silently creates reviews for you.

## Microsoft Entra catalog access reviews: the control plane

Traditional access reviews are resource-centric: review one group, one application, one directory role, or one access package at a time. Catalog access reviews invert that view. The principal is the focus, and the reviewer sees that person's access across the supported resources contained in one catalog.

Four objects participate in the decision:

1. **Entitlement management catalog:** the administrative container that holds the groups, applications, and optional custom data provided resources in scope.
2. **Access review definition:** the recurring or one-time configuration that records the principal scope, catalog scope, reviewers, stages, schedule, notifications, and completion settings.
3. **Access review instance:** one execution of that definition, with the access present when the instance initializes.
4. **Decision items:** the approve or deny outcomes for each person's access to each resource.

Microsoft Graph exposes the model through its unified access-review route. The [unified access review resource](https://learn.microsoft.com/en-us/graph/api/resources/unifiedroot?view=graph-rest-1.0) explicitly contrasts the two models: the existing API reviews a single resource, while the unified route uses a principal-resource-memberships scope with a catalog resource scope to review a principal across the catalog.

> [!IMPORTANT]
> **Analysis:** a catalog review does not turn the catalog into a new authorization system. The group membership or app role assignment is still the access grant. The review gathers and applies governance decisions against those grants. Application sign-in, Conditional Access, provisioning, and downstream authorization continue to operate in their own control planes.

If the access review fundamentals are new, start with the site's [Microsoft Entra access reviews operating guide](/posts/microsoft-entra-access-reviews). If the catalog itself still needs a clean ownership and package model, first work through [Entitlement Management and access packages](/posts/microsoft-entra-entitlement-management-access-packages).

## Know the GA boundary before designing the review

The current native catalog review supports three resource classes:

- **Group or Team:** the reviewer decides whether the person should retain membership; Microsoft Entra applies the supported access decision at review completion.
- **Enterprise application:** the reviewer decides whether the person should retain the reviewed app role assignment; Microsoft Entra applies the supported access decision.
- **Custom data provided resource:** the reviewer decides whether an externally described permission should remain; your custom remediation process applies non-approved results.

Do not expand that list by analogy. Microsoft does not document catalog reviews as a way to review Microsoft Entra roles, Azure resource roles, SharePoint permissions outside the supported catalog model, dynamic authorization inside an application, or every account discovered in a disconnected system.

The Microsoft Graph v1.0 [create-definition reference](https://learn.microsoft.com/en-us/graph/api/unifiedroot-post-definitions?view=graph-rest-1.0) documents the unified API only in the global service. US Government L4, US Government L5/DoD, and China operated by 21Vianet are marked unsupported on that API page. Recheck the cloud matrix before treating a portal screenshot from a commercial tenant as proof of sovereign-cloud availability.

The review can be multi-stage. Microsoft's catalog guide documents managers reviewing their users first and group or application owners serving as secondary reviewers. A later resource-owner stage is valuable when a manager understands the person's job but not the risk encoded by an app role or group.

Custom data is a sharper edge. The current [custom data resource procedure](https://learn.microsoft.com/en-us/entra/id-governance/custom-data-resource-access-reviews) documents a manager-only, single-stage review for that path, a two-hour upload window while the instance is initializing, and manual or Logic App-driven remediation. Treat the custom-resource procedure as the narrower rule when it conflicts with what the native group-and-application experience can do.

## Meet the licensing, role, ownership, and data prerequisites

Microsoft's catalog review page requires **Microsoft Entra ID Governance or Microsoft Entra Suite** subscriptions for the organization's users. The broader [Microsoft Entra licensing reference](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#access-reviews) says member users being reviewed and employees performing reviews need coverage, while some basic access-review capabilities can operate with Entra ID P2.

Do not assume P2 covers this catalog capability just because it covers a simpler group review. Verify the catalog access review entitlement against your tenant's licenses and agreement. For guests, Microsoft's [Identity Governance guest licensing guide](https://learn.microsoft.com/en-us/entra/id-governance/microsoft-entra-id-governance-licensing-for-guest-users) lists catalog access reviews as a billable governance action when a guest is included, subject to the documented multitenant-organization exceptions.

Before creating the first review, verify:

- an Identity Governance Administrator owns the review design and change record;
- a catalog exists with a narrow, coherent business purpose;
- each native group and application has a current owner;
- the person adding resources is a catalog creator or Identity Governance Administrator and also owns or administers those resources;
- direct group memberships and app role assignments are the grants you actually intend to review;
- managers are populated and current for the people in scope;
- secondary resource owners are staffed for the entire review window;
- the reviewer population can open My Access and understands the decision language;
- licenses and guest billing are confirmed; and
- the evidence, escalation, and access-restoration owners are named before results are applied.

The owner check is not paperwork. A manager might know that Priya moved from Finance to Procurement, while the application owner knows that `Finance Ledger Export` includes bulk export privileges. A two-stage review is useful precisely because those are different facts.

## Build the catalog as a review boundary, not a filing cabinet

Create catalogs around one reviewable business question. Good examples are `Treasury payment operations`, `Clinical research partner access`, or `Production support exceptions`. Weak examples are `Important apps`, `All SaaS`, or the default catalog with whatever happened to be added over several years.

For each candidate resource, record:

- immutable object ID and current display name;
- group membership type or application role being reviewed;
- business owner and technical owner;
- how access is granted outside the catalog;
- whether another group, access package, provisioning job, or application rule can restore access;
- the human-readable risk of retaining the access;
- the approved recovery path after an incorrect denial; and
- the log source that proves the underlying grant changed.

Only then add resources through **Entitlement management > Catalogs > _catalog_ > Resources > Add resources**. Microsoft's guide currently supports **Groups and Teams**, **Applications**, and **Custom Data Provided Resource** in this experience.

> [!TIP]
> Keep the first production pilot to native groups and applications. A custom data resource adds an upload window, a mandatory CSV contract, external ownership, and a separate remediation action. That is a second control plane, not a harmless extra column.

If the project starts from accounts found outside Entra, use [Microsoft Entra Account Discovery](/posts/microsoft-entra-account-discovery-orphan-accounts) to classify and correlate those accounts first. Discovery evidence can inform a custom review, but discovery does not by itself make an external permission removable.

## Create a safe user-centric access review pilot

### Ring 0: define the decision and freeze the input window

Write the primary question in one sentence: “Should each Finance manager's direct reports retain their current access to the three payment-operation resources in this catalog?” If the sentence needs two business owners or contains unrelated risk classes, split the catalog.

Schedule the review so that catalog, user, group, and application changes are complete at least 12 hours before it starts. Microsoft's documented timing caveat means a same-morning membership fix is not a reliable input to that day's review. Preserve an independent membership and app-assignment export at the change freeze so you can explain discrepancies later.

Choose a pilot population small enough to investigate every decision. Include one user with legitimate access to all resources, one with partial access, one expected denial, and one user whose manager data is intentionally checked before launch. Do not manufacture access simply to make the test matrix symmetrical.

### Ring 1: create the review in the Entra admin center

Use the current documented path:

1. Open **ID Governance > Access Reviews > New access review**.
2. Select **Review users access across multiple resource types within a catalog**.
3. Enter the review name and administrator description.
4. Select the prepared catalog on the Resources page.
5. Choose the reviewers and schedule.
6. Add a secondary resource-owner stage only when the ownership data and escalation path are ready.
7. Enable appropriate email, reminder, justification, and completion settings.
8. Create the review and record its definition ID.

Use a name that survives an audit export, such as `Quarterly Finance payment access — managers then owners`. Avoid `Q3 Review` or `Test 2`; the evidence will outlive the administrator's memory.

### Ring 2: prove the reviewer experience in My Access

Reviewers receive an email and can open **My Access > Access reviews > Multi-resource**. The manager decides on each access item for each direct report, supplies a justification when required, and submits the decisions. Microsoft documents My Access as the end-user surface for pending reviews and approval or denial actions.

Ask reviewers to validate three things, not just click Approve:

1. **Identity:** is this the intended employee or guest?
2. **Entitlement:** does the displayed group or app role represent the access described in the review instructions?
3. **Need:** does the person's current work justify retaining that specific entitlement?

If reviewers cannot answer the entitlement question, improve the resource description or route it to a knowledgeable owner. A user-centric screen reduces navigation; it does not create missing business context.

### Ring 3: make the secondary stage earn its place

Microsoft's [multi-stage access review guidance](https://learn.microsoft.com/en-us/entra/id-governance/using-multi-stage-reviews) lets later stages see a reduced set of reviewees based on earlier decisions. For a high-impact catalog, progress only manager-approved items to the resource-owner stage. The manager confirms role need; the owner confirms entitlement appropriateness.

Define how later decisions interact with earlier ones before launch. Microsoft says the last recorded decision is the one applied at the end of a multi-stage review, and results are not applied until the overall review completes. A secondary stage is therefore a real decision boundary, not a ceremonial countersignature.

### Ring 4: verify applied results against the real resource

At the review end date, Microsoft automatically applies decisions for native resources. Custom disconnected resources are the exception. For every pilot denial, compare three pieces of evidence:

- the review decision and justification;
- the Microsoft Entra audit event for applying the decision; and
- the current group membership or app role assignment on the underlying resource.

Then test effective access through the application's normal evidence path. A removed Entra assignment does not prove an application has no local account, cached session, alternate group grant, or separate authorization path.

Expand only after the review object, resource state, and application evidence tell the same story.

## Use Microsoft Graph as an inventory and change-control surface

The GA unified API is useful for version-controlled definitions and preflight checks. List catalog-scope review definitions with the least-privileged documented read permission:

```http
GET https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/unified/definitions
```

The [list-definitions reference](https://learn.microsoft.com/en-us/graph/api/unifiedroot-list-definitions?view=graph-rest-1.0) documents `AccessReview.Read.All` as the least-privileged delegated or application permission, a default page size of 100, and `$select`, `$top`, `$skip`, and `$filter` support. Handle pagination; an unpaged inventory is not a tenant-wide inventory.

Creating a definition uses:

```http
POST https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/unified/definitions
```

The request requires `AccessReview.ReadWrite.All`. It uses a principal-resource-memberships scope, with a resource scope whose `scopeType` is `catalog` and whose `resourceId` is the catalog ID. For delegated writes, Microsoft's current reference lists User Administrator and Identity Governance Administrator as supported roles for group or application reviews.

Do not copy a sample POST directly into production. Read the current definition back, compare the catalog ID, reviewer scope, schedule, stage behavior, notification settings, and completion settings with the approved design, and keep the full response in the change record.

## Monitor decisions, application, and drift separately

Microsoft records access-review activity in Entra audit logs. The [access review deployment guide](https://learn.microsoft.com/en-us/entra/id-governance/deploy-access-reviews#monitor-access-reviews) lists create, update, end, delete, approve, deny, reset, and apply activities and recommends exporting logs to Log Analytics or Event Hubs for longer-term analysis.

Build operational checks around three streams:

1. **Definition and instance:** creation, modification, schedule, status, stage, reviewer, and completion.
2. **Decision and application:** approve, deny, not reviewed, justification, reviewer, and whether the decision was applied.
3. **Resource and effective access:** group membership, app role assignment, provisioning, application sign-in, and any alternate authorization path.

The portal's [downloadable review history](https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-downloadable-review-history) includes review IDs, resource, dates, principal, reviewer, outcome, and justification. Generated CSV reports remain available for download for 30 days. Export them into your approved evidence store before that window closes; do not treat the portal's temporary download list as a retention strategy.

Review or alert on:

- a catalog resource added or removed close to a review start;
- a manager or resource owner missing from the intended stage;
- a large rise in Not reviewed outcomes;
- approvals without usable justification where justification is required;
- denied decisions that do not produce the expected resource change;
- access restored by another assignment path after a denial;
- custom data instances stuck in Initializing; and
- review definitions changed outside the approved identity-governance operator group.

## Troubleshoot Microsoft Entra catalog access reviews in dependency order

### The catalog template or catalog does not appear

Confirm the tenant has the documented Identity Governance or Entra Suite entitlement, the operator has the required role, and the intended object is an entitlement management catalog. Then confirm the resources were added to that catalog by an owner or administrator of those resources. Do not grant Global Administrator as a visibility workaround.

### A user or access item is missing from the review

Compare the review start time with the membership, app-assignment, user, and catalog change times. If any changed inside Microsoft's 12-hour caution window, treat the review snapshot as potentially stale. Confirm the underlying grant exists now, then repeat the scenario in a later controlled instance rather than editing evidence to fit the expectation.

### The manager received no decisions

Verify the user's current manager relationship, review scope, instance status, and reviewer stage. Confirm the reviewer can open My Access and is looking under **Multi-resource**. Check notification delivery separately from reviewer assignment; a missing email does not prove the review object lacks a reviewer.

### The resource owner sees too many or too few items

Inspect which outcomes are configured to progress from the earlier stage. Then confirm ownership on every group and application in the catalog. A later-stage population is the product of the review's progression rule and the earlier decisions, not a fresh inventory of everything in the catalog.

### A denied user still has access

Start with the decision item and application status, then verify the exact group or app role assignment. Look for nested groups, another direct assignment, another access package, provisioning that restored the grant, or a local application account. Do not reverse the review merely because one access test still succeeds.

### A custom data review is stuck in Initializing

The custom-resource procedure requires all mandatory CSV columns, permits up to 10 CSV files, and gives you two hours from the Initializing state to upload. Check the review and instance IDs, file schema, principal IDs, upload audit logs, and Logic App run history. Native result application does not remediate the external permission; that must be handled by the documented custom process.

## Contain and recover without erasing the review trail

If the definition is wrong before the review starts, correct or replace it through the approved change process and keep the rejected configuration as evidence. If a running instance has bad scope or reviewer logic, stop expansion, preserve the definition and instance IDs, export the available decisions, and use the supported shared instance operations documented under the unified Graph resource rather than improvising direct edits to result data.

If a denial removed legitimate access:

1. preserve the review decision, reviewer, justification, apply event, and resource-change event;
2. confirm the business owner approves restoration;
3. restore only the specific group membership or app role assignment through its normal grant process;
4. verify effective access and any provisioning side effects;
5. correct the catalog, ownership, reviewer instructions, or stage rule that caused the mistake; and
6. rerun a narrow validation review before the next recurrence.

Restoring access is not the same as undoing the evidence. Keep the original denial and the approved restoration linked in the incident or change record.

## Microsoft Entra catalog access reviews checklist

- [ ] Confirm the catalog review capability and cloud availability are current
- [ ] Define one business decision and one accountable catalog owner
- [ ] Verify Identity Governance or Entra Suite licensing and guest billing
- [ ] Inventory group memberships and app role assignments independently
- [ ] Confirm manager data and resource ownership
- [ ] Freeze material changes at least 12 hours before the review starts
- [ ] Pilot native groups and applications before custom data resources
- [ ] Use a small review population with an expected approve and deny case
- [ ] Require clear reviewer instructions and useful justifications
- [ ] Add a resource-owner stage only when it supplies distinct knowledge
- [ ] Record catalog, definition, instance, resource, and principal IDs
- [ ] Verify decisions, apply events, and underlying resource state separately
- [ ] Test effective application access after a denial
- [ ] Export review history before the 30-day download window closes
- [ ] Document precise access restoration and escalation owners
- [ ] Recheck Microsoft documentation before each wider rollout ring

Microsoft Entra catalog access reviews solve a real reviewer problem: one manager can assess one person's related access in one place. The feature is most valuable when the catalog is narrow, owners are credible, timing is controlled, and every decision can be reconciled with the actual resource. Treat the unified screen as a better decision surface—not as proof that all access paths have become unified—and the GA capability can reduce review fatigue without reducing assurance.

## Microsoft sources

- [What's new in Microsoft Entra: September 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-september-2026/4545179)
- [Catalog Access Reviews](https://learn.microsoft.com/en-us/entra/id-governance/catalog-access-reviews)
- [Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#access-reviews)
- [Identity Governance licensing for guest users](https://learn.microsoft.com/en-us/entra/id-governance/microsoft-entra-id-governance-licensing-for-guest-users)
- [Unified access review resource in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/unifiedroot?view=graph-rest-1.0)
- [List unified access review definitions](https://learn.microsoft.com/en-us/graph/api/unifiedroot-list-definitions?view=graph-rest-1.0)
- [Create a unified access review definition](https://learn.microsoft.com/en-us/graph/api/unifiedroot-post-definitions?view=graph-rest-1.0)
- [Use multi-stage access reviews](https://learn.microsoft.com/en-us/entra/id-governance/using-multi-stage-reviews)
- [Review custom data provided resources](https://learn.microsoft.com/en-us/entra/id-governance/custom-data-resource-access-reviews)
- [Plan and monitor an access reviews deployment](https://learn.microsoft.com/en-us/entra/id-governance/deploy-access-reviews)
- [Download access review history](https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-downloadable-review-history)
