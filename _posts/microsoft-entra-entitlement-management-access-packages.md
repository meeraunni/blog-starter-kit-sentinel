---
title: "Entitlement Management and Access Packages: The Lifecycle Loop That Doesn't Drift"
excerpt: "Access in any tenant past a few hundred users always drifts. Someone leaves a project, nobody removes them from the SharePoint group. Six months later you discover thirty old contractors still in a finance distribution list. Entitlement Management is the answer that's supposed to make that not happen, and it works when you set it up right."
coverImage: "/assets/blog/microsoft-entra-entitlement-management-access-packages/diagram.svg"
date: "2026-06-17T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/microsoft-entra-entitlement-management-access-packages/diagram.svg"
---

Every tenant past a few hundred users has the same drift problem. A new hire needs access to four groups, two SharePoint sites, and a Teams team to do their job. Somebody adds them. Six months later they switch teams, and the additions never get removed. Eighteen months later they leave the company, and the security review finds them still in a distribution list with finance attachments. The individual mistakes aren't anyone's fault — it's that the system has no built-in lifecycle. Access flows in. Access doesn't flow out.

Microsoft Entra Entitlement Management is the answer designed to make that not happen. The unit is the **access package** — a bundle of related resources (groups, apps, SharePoint sites) packaged with policies that govern who can request it, who approves it, how long it lasts, and what happens when it expires. The user requests the package from a self-service catalog, approval flows automatically, the bundle gets granted, an expiry timer starts, and when the timer hits zero (or a recurring review says "no longer needed") the bundle gets revoked atomically. The lifecycle has a beginning, a middle, and an end, all in the same configured object.

This piece is the shape of an Entitlement Management rollout that holds up — what to model as an access package versus what to leave alone, how to design the catalogs, how to set policies that don't either block legitimate requests or rubber-stamp every request, and the queries that prove your access actually got cleaned up. Microsoft's references throughout are [Entitlement Management overview](https://learn.microsoft.com/entra/id-governance/entitlement-management-overview), [Create a new access package](https://learn.microsoft.com/entra/id-governance/entitlement-management-access-package-create), and the [Graph API for entitlement management](https://learn.microsoft.com/graph/tutorial-access-package-api).

## What an access package actually is

An access package has four configurable parts. **Resources** are the things being granted — security groups, Microsoft 365 groups, applications (with one or more app roles), or SharePoint Online sites. A single package can bundle any combination. **Catalogs** are the containers that group related packages together and delegate management — a Finance catalog, an Engineering catalog, a Partner catalog. **Policies** define who can request the package, what approvals are required, how long the grant lasts, and whether a recurring access review applies. **Assignments** are the actual grants — once a user satisfies a policy, they have an assignment to the package, with a start and end date.

The mental model that helps: don't think about access packages as "ways to grant access." Think about them as "ways to govern the entire lifecycle of a grant." The grant itself is one moment in a longer arc that includes the request, the approval, the duration, the renewal, and the revocation.

> [!IMPORTANT]
> A user can have multiple assignments to different packages, and packages can overlap on resources. Two packages that both grant membership in `Finance-Read` don't conflict — the user has membership, and removing one assignment doesn't remove the membership if the other assignment still grants it. This matters for how you model overlapping scenarios.

## What to model as a package, what to leave alone

A common first-rollout mistake is modelling every group as an access package. That's bureaucracy without value. The rule that works: model as a package when the resource has a *lifecycle* — when there's a meaningful question of who should have it, how they got it, when it should end, and who decided.

Good candidates for access packages:

- Cross-team access. A finance person who needs to view a specific HR SharePoint site for a six-month audit. A consultant who needs the dev environment for the duration of an engagement.
- Time-bound role-style access. Anything where the user needs a bundle of things for a project that has a known end.
- B2B partner access. External users who get a defined set of resources for a defined relationship — the perfect access-package shape, because the entire grant is supposed to be lifecycle-managed.
- Privileged access to specific apps. The CRM admin role, the Defender for Cloud Apps console, the on-call rotation for a specific platform.

Bad candidates for access packages:

- Day-one employee access. New hires get a baseline set of resources via your HR-driven joiner process (dynamic groups, attribute-based provisioning). Don't make people request "the basic employee bundle."
- Anything that genuinely should be permanent. A staff engineer's access to the engineering wiki isn't a package. It's a permanent membership driven by employment.
- Individual SharePoint files. Packages bundle sites, not files. Files belong in the site, governed at the site level.

If you find yourself making twenty packages where each grants one tiny thing to one specific person, you're using the feature wrong. Packages exist to model patterns, not exceptions.

## Catalog design and delegation

Catalogs are how you give access-package management to the people who actually own the underlying resources. The default catalog (the one Entitlement Management creates on enable) is fine for the identity team's own packages but shouldn't be used for everything. The pattern that scales:

- One catalog per major resource owner — Finance, Engineering, HR, Sales, Partner-X.
- The catalog has explicit **catalog owners** (the team's identity coordinator) and **catalog readers** (the team's manager, security analyst).
- Resources used by the catalog's packages are added by the catalog owner, who must already have the equivalent privilege on the resource (group owner, app owner, site owner). This is the security pivot — Entitlement Management can't grant access to resources the catalog manager doesn't already control.

```powershell
# Create a catalog via Graph PowerShell
Connect-MgGraph -Scopes "EntitlementManagement.ReadWrite.All"

$catalog = New-MgEntitlementManagementCatalog -DisplayName "Finance" `
    -Description "Access packages owned by the Finance identity team" `
    -State "published" -IsExternallyVisible $false
$catalog.Id   # save for next step

# Add a group as a catalog resource (catalog admin must already own it)
$resource = @{
    catalog        = @{ id = $catalog.Id }
    resource       = @{
        id            = "<group-object-id>"
        originId      = "<group-object-id>"
        originSystem  = "AadGroup"
    }
    accessTypes    = @("member")
}
New-MgEntitlementManagementResourceRequest -BodyParameter $resource
```

> [!TIP]
> Catalogs without explicit owners default to the global Entitlement Management admins. That works for small tenants and turns into a bottleneck the moment you have multiple business units. Give every catalog two named owners on creation, not as an afterthought.

## Policy design — the part where most rollouts fall down

A single access package can have multiple policies. Each policy defines a *different population* and the rules that apply to them. The pattern:

- **Policy for internal users.** Request scope = `All members can request`. Approval = manager approval, single stage. Lifecycle = 6 months with auto-renewal review.
- **Policy for B2B guests already in directory.** Request scope = `Specific connected organisations` (the pre-approved partner). Approval = catalog owner approval, single stage. Lifecycle = 90 days, no auto-renewal.
- **Policy for new B2B guests not yet in directory.** Request scope = `All users including users not in your directory`. Approval = catalog owner + sponsor in user's home tenant (two-stage). Lifecycle = 90 days. Requires acceptance of Terms of Use.

Three policies on one package. Each captures a different request pattern, with different friction calibrated to risk. A staff member requesting access to their own department's tools needs less friction than a partner contractor onboarding for the first time.

The settings worth changing from defaults:

**Require justification.** Always on. Free-text field. The user writes one sentence explaining why. This is the audit trail for everything that follows.

**Multi-stage approval.** Use for high-value packages (privileged role bundles, regulated data). The two-stage shape is typically "user's manager approves first, then resource owner approves." Don't make the same person both stages — that's not approval, that's a click-through.

**Approval timeouts.** Default is 14 days. Drop to 5-7 for most internal packages. Long approval timeouts mean stale requests pile up in approver inboxes; tight timeouts force decisions or force a re-request that the user has to justify again.

**Assignment duration.** Pick something that matches the actual access pattern. Project access = the project duration. Periodic review = 6 to 12 months with a recurring review. Permanent access = it's not an access package.

**Recurring access reviews.** Configure these to fire 30 days before expiry. Reviewer is the user's manager or the package's catalog owner. Auto-apply decisions: yes. If the reviewer doesn't respond, treat that as a "no" and let the assignment expire. The whole point is that the system, not a calendar reminder, drives the cleanup.

## Common questions

*Can a single access package grant resources across two catalogs?* No. A package belongs to exactly one catalog and grants only resources that are in that catalog. If you need cross-catalog grants, model it as two packages and have the user request both, or move the resources into a shared catalog.

*What happens to a user mid-assignment if their assignment is revoked early?* The bundle is removed atomically — every resource the package granted is unassigned. If the user has the same resource granted via a different package or directly outside Entitlement Management, that grant survives. Only the package's grant is removed.

*Do guests get re-invited every time they request a package?* If they're not yet in your directory, the first request triggers the B2B invitation flow. After that they're a directory object and subsequent requests are evaluated against their existing user identity. Their guest status persists between assignments unless an admin removes them.

*How does this interact with PIM?* Entitlement Management governs *resource access* — group memberships, app role assignments, site memberships. PIM governs *directory role activations*. You can use Entitlement Management to make someone PIM-eligible for a role (the access package grants the eligibility), and PIM to govern the actual activation. The two layer cleanly.

*What's the licensing requirement?* Entitlement Management requires Microsoft Entra ID Governance, which is part of the Microsoft Entra Suite or licensed standalone. Anyone targeted by a policy as a *requester* needs an Entra ID Governance license, not just the admin.

## Where to read further

- [Entitlement Management overview — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/entitlement-management-overview)
- [Create a new access package — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/entitlement-management-access-package-create)
- [Create and manage a catalog — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/entitlement-management-catalog-create)
- [Policies for an access package — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/entitlement-management-access-package-request-policy)
- [Entitlement Management via Microsoft Graph — Microsoft Learn](https://learn.microsoft.com/graph/tutorial-access-package-api)
- [Access reviews for access packages — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/entitlement-management-access-reviews-create)
