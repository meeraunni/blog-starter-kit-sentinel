---
title: "Microsoft Entra Sponsorless Guest Cleanup: Safe Pilot Guide"
excerpt: "Pilot Microsoft Entra sponsorless guest cleanup safely with scope checks, licensing, execution limits, audit evidence, rollback, and staged deletion."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-28T17:03:34-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra sponsorless guest cleanup can find guest users with no sponsor relationship and process them through a Lifecycle Workflow. The important answer, before anyone enables it, is this: **the preview does not decide whether a guest is inactive, unneeded, or safe to delete. It selects guests whose recorded sponsor count is zero.**

That distinction is the whole deployment.

Grab a coffee. The feature is genuinely useful for closing an ownership gap in B2B collaboration, but the built-in template includes **Delete User Account** by default. A rushed rollout can therefore turn missing directory metadata into deleted guest objects. A safe rollout inventories sponsorship first, inspects the evaluated population, puts scheduled execution behind a small threshold, proves notification and recovery, and only then introduces deletion.

Microsoft announced the capability as **public preview** in its August 10, 2026 Entra release roundup. Microsoft has not published a general-availability date, a mandatory-enforcement deadline, or a tenant-wide default-on rollout for it. [Microsoft's August release post lists sponsorless guest cleanup under public preview](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-august-2026/4545172).

## Microsoft Entra sponsorless guest cleanup: status and boundaries

- **Release state — public preview.** Treat it as a separately approved pilot, not an assumed production default.
- **Selection signal — Guest sponsor status with Number of sponsors = 0.** Zero sponsors does not by itself prove inactivity or unnecessary access.
- **Sponsor-count condition — nonconfigurable.** Reconcile the complete zero-sponsor population before scheduling.
- **Default destructive task — Delete User Account.** Review, disable, or remove it during discovery and notification-only testing.
- **Optional communication task — Send email about unsponsored guest removal (Preview).** Use notification as an evidence-producing stage before deletion.
- **Licensing — Microsoft Entra ID Governance or Microsoft Entra Suite, plus guest billing.** Validate the subscription link and expected charges first.
- **Required portal role — at least Lifecycle Workflows Administrator.** Separate workflow administration from guest-owner approval where possible.
- **Rollback — deleted users are restorable for 30 days.** Run cancellation does not undo completed tasks, so preserve evidence and do not permanently purge users during the pilot.

The dedicated procedure is unusually explicit: the workflow is a **leaver** template, its trigger is fixed to **Guest sponsor status (Preview)**, the sponsor count is fixed to zero, and the template contains Delete User Account by default. [Microsoft's unsponsored-guest procedure documents the trigger, condition, role, and default task](https://learn.microsoft.com/en-us/entra/id-governance/how-to-lifecycle-workflow-unsponsored-guest-removal).

## The control plane: sponsorship is not access or activity

A sponsor is a person or group recorded on a B2B user's `sponsors` relationship. Microsoft describes the sponsor as the party responsible for monitoring the guest's lifecycle and keeping access appropriate. The relationship does **not** grant the sponsor administrative privileges by itself. It can, however, be used in governance scenarios such as entitlement-management approval. [Microsoft's B2B sponsor guidance defines the relationship and its authority boundary](https://learn.microsoft.com/en-us/entra/external-id/b2b-sponsors).

Keep four signals separate:

1. **Identity relationship:** Is the directory object a guest?
2. **Ownership:** Does the object have one or more sponsors?
3. **Activity:** Has the guest recently authenticated or used the resource tenant?
4. **Authorization:** What groups, applications, roles, sites, or access packages currently grant access?

The preview automates the second signal. It does not replace the third or fourth.

That creates two important false conclusions to avoid. A guest with zero sponsors might still be actively working on a legitimate project. A guest with one sponsor might be stale, over-permissioned, or abandoned. **Analysis:** sponsorless cleanup is best treated as an ownership-remediation workflow first and an account-deletion workflow only after the tenant has proved that its sponsorship process is reliable.

Use [guest access reviews](/posts/microsoft-entra-access-reviews) when the question is whether specific resource access should continue. Use [Entitlement Management access packages](/posts/microsoft-entra-entitlement-management-access-packages) when the relationship should have request, approval, expiry, and revocation built into the grant. Sponsorless cleanup solves a different problem: no accountable party is recorded on the guest object.

## Prerequisites and licensing without surprises

Microsoft's current feature page requires Microsoft Entra ID Governance or Microsoft Entra Suite licensing and at least the Lifecycle Workflows Administrator role. Because the workflow targets guest users, the separate guest-governance billing model also applies.

The guest model is monthly active user billing for governance actions. Microsoft says a tenant must be linked to an Azure subscription with the **Microsoft Entra ID Governance for guests add-on** to use ID Governance capabilities for guests. Since January 2026, a tenant without that guest billing meter cannot create or update a Lifecycle Workflow whose scope includes `userType=Guest`. Microsoft also provides an EIG Guest Usage Monitoring Workbook for estimating historical usage. [The guest licensing page documents the billing model, subscription-link requirement, enforcement date, and Lifecycle Workflows restriction](https://learn.microsoft.com/en-us/entra/id-governance/microsoft-entra-id-governance-licensing-for-guest-users).

Before creating the preview workflow, prove all of these:

- the tenant has the required ID Governance or Entra Suite licensing;
- the guest-governance add-on is connected to the intended Azure subscription;
- finance or licensing owners understand which workflow executions can become billable guest-governance actions;
- the operator has Lifecycle Workflows Administrator, while sponsor correction is performed by an appropriately authorized user administrator;
- the team has an owner for B2B lifecycle policy, not only an owner for the workflow;
- deleted-user recovery is assigned to an operator who can act inside the 30-day window.

Do not treat a successful template-creation screen as the licensing test. Confirm the subscription and meter deliberately so that a later update or expanded scope does not fail during an incident.

## Inventory sponsorless guests before creating deletion automation

Start with the directory, not the workflow wizard.

For a single guest, call `GET /users/{guest-id}/sponsors` in Microsoft Graph v1.0. Add the optional query parameter `$select=id,displayName` when you only need stable IDs and readable names.

The response is a collection of user or group objects. Microsoft lists Guest Inviter and Directory Readers among the least-privileged supported delegated roles for reading sponsors, provided the calling identity also has the required Graph permission. [The v1.0 list-sponsors reference documents the endpoint, result types, and role boundary](https://learn.microsoft.com/en-us/graph/api/user-list-sponsors?view=graph-rest-1.0).

For portal review, go to **Entra ID > Users > [guest] > Properties > Job information > Sponsors**. Microsoft says the inviter becomes the sponsor by default when a guest is invited through the supported Entra invitation flow unless another person or group is specified. It also documents a current gap: guests invited through SharePoint do not receive a sponsor automatically and need manual remediation. [The sponsor-field guide documents the portal path, invitation default, and SharePoint exception](https://learn.microsoft.com/en-us/entra/external-id/b2b-sponsors).

Build a reconciliation sheet with at least:

- **Guest object ID and user principal name:** gives recovery and audit teams an immutable identifier.
- **Sponsor count and sponsor object IDs:** proves why the preview trigger should or should not match.
- **Guest creation and invitation state:** separates unredeemed invitations from established relationships.
- **Current group, app, role, site, and access-package grants:** shows the authorization impact that deletion could interrupt.
- **Recent sign-in or resource-owner evidence:** helps the owner decide whether collaboration is still active.
- **Business relationship and expected end date:** converts cleanup from guesswork into a lifecycle decision.
- **Approved outcome:** records whether to add a sponsor, revoke access, delete later, or preserve a documented exception.

Do not assign a generic identity-team group as sponsor merely to make the report green. A group can be a valid sponsor object, but it should contain people who can make an informed lifecycle decision and have an offboarding process of its own.

## A safe sponsorless guest cleanup pilot

### Ring 0: define what zero sponsors means in your tenant

Document every guest-creation path: Entra invitations, SharePoint sharing, Teams and Microsoft 365 collaboration, Entitlement Management, provisioning, scripts, and partner-operated processes. Identify which paths set a sponsor and which leave the field empty.

The SharePoint exception alone can explain a large historical population. If zero sponsors mostly means “created through a path that did not write sponsorship,” deletion is the wrong first remediation.

Define exception classes before the first execution: emergency collaboration accounts, migration objects, service-like guest objects, legal-hold populations, guests managed by another authoritative workflow, and active projects awaiting sponsor backfill. The preview's fixed zero-sponsor trigger will not understand those business reasons for you.

### Ring 1: repair sponsor data at the source

For active guests, assign a real person or accountable group as sponsor. When the guest is created through the Entra admin center, the invitation flow supports up to five sponsors; for existing guests, edit the Sponsors field under Job information. When a sponsor leaves or a project changes ownership, transfer the relationship instead of letting it silently decay. [Microsoft documents sponsor assignment and transfer in the B2B sponsor guide](https://learn.microsoft.com/en-us/entra/external-id/b2b-sponsors).

Then fix the upstream process. A cleanup project that corrects 2,000 objects but leaves SharePoint or custom invitations sponsor-blind will recreate the same backlog.

### Ring 2: create the workflow without trusting its defaults

In the Microsoft Entra admin center, browse to **ID Governance > Lifecycle workflows > Workflows > Create new workflow**, then select **Unsponsored guest cleanup (Preview)**.

Review every task before creation. The template includes Delete User Account. For the discovery stage, disable or remove that task and add **Send email about unsponsored guest removal (Preview)** if the notification recipients and message are appropriate. Lifecycle Workflow templates allow tasks to be enabled, disabled, or removed during creation. Newly created workflows are disabled by default unless scheduling is enabled during creation, which is specifically intended to support smaller-audience testing. [Microsoft's workflow-creation guide documents task controls and the disabled-by-default behavior](https://learn.microsoft.com/en-us/entra/id-governance/create-lifecycle-workflow).

Record the workflow version, trigger, task order, schedule state, notification recipients, and change approval. Preview UI can change; the recorded configuration is the evidence that matters.

### Ring 3: inspect the actual execution population

Open **Execution conditions > Execution User Scope** and reconcile every returned guest with the approved inventory. This view lists users that currently meet the workflow's conditions; it does not run the tasks. Microsoft warns that the workflow engine evaluates scope periodically, so recent condition or attribute changes might not appear immediately. [The execution-scope guide documents the portal path and evaluation behavior](https://learn.microsoft.com/en-us/entra/id-governance/check-workflow-execution-scope).

Treat any unexpected object as a failed pilot. Correct the sponsor or upstream process, wait for reevaluation, and inspect again.

Microsoft Graph also exposes the workflow's `executionScope` relationship, but its v1.0 reference says results are returned only when workflow scheduling is enabled. That makes the portal view the safer pre-schedule inspection path for this pilot. [The Graph execution-scope reference documents the endpoint and schedule boundary](https://learn.microsoft.com/en-us/graph/api/workflow-list-executionscope?view=graph-rest-1.0).

### Ring 4: set a hard execution limit before enabling the schedule

Configure a workflow-specific fixed-user limit only slightly above the approved pilot population. A workflow-specific limit overrides the tenant-wide limit; the two are not combined. If both percentage and fixed-count limits are set, Microsoft evaluates them with OR logic and quarantines the scheduled workflow when either is exceeded.

Execution limits protect **scheduled runs only**. They do not protect on-demand runs, and an on-demand run can bypass quarantine. [Microsoft's execution-limit guide documents the threshold types, precedence, quarantine, and on-demand bypass](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-execution-limits).

For that reason, do not use an on-demand run with Delete User Account enabled as a casual test. A notification-only or otherwise nondestructive on-demand test can validate task processing against controlled guest objects; the destructive pilot should remain behind the scheduled-run threshold.

### Ring 5: prove notification and evidence first

Run the workflow with deletion disabled. Verify:

- the evaluated guest list equals the approved list;
- the configured recipients receive the expected notice;
- Workflow History shows the correct run, users, and tasks;
- directory audit events identify the workflow action and target object IDs;
- the guest usage and billing evidence is visible to the responsible owner;
- no unrelated guest object is processed.

Lifecycle Workflow History provides user, run, and task summaries and can export reports as CSV. The Entra audit log records each workflow action for up to 30 days in the portal view. [Microsoft explains the three history views](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-history) and [the Lifecycle Workflows audit evidence](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-audits).

If you need a broader explanation of execution scope, thresholds, quarantine, and cancellation, use the [Lifecycle Workflows safety-controls playbook](/posts/microsoft-entra-lifecycle-workflows-safety-controls) as the control baseline.

### Ring 6: introduce deletion for a tiny approved cohort

Only after the notification run is clean should a new workflow version enable Delete User Account. Recheck Execution User Scope after the version change. Keep the fixed execution limit small, schedule it inside a staffed change window, and have the recovery operator watching Workflow History and Deleted users.

Expand only after the identity inventory, workflow history, audit log, deleted-user list, and resource-owner confirmation all reconcile. Preview status is not the reason for caution by itself; automatic deletion based on a single metadata relationship is.

## Containment and rollback when the match is wrong

If an unexpected guest enters a queued or in-progress run:

1. **Cancel the run** from **Workflow History > Runs**.
2. **Disable scheduling** so the same scope is not evaluated again.
3. **Export Workflow History and audit evidence** before changing sponsor data.
4. **List completed tasks by object ID**; cancellation stops unprocessed tasks but does not reverse completed work.
5. **Restore incorrectly deleted users** from **Entra ID > Users > Deleted users**.
6. **Revalidate access in every owning resource** and confirm the business owner can use the restored identity as intended.
7. **Correct the sponsor relationship or source process**, wait for scope reevaluation, and obtain a new approval before re-enabling.

Microsoft's cancellation control works at run level for queued or in-progress runs. It does not cancel one user or task, and it does not roll back completed tasks. [The cancellation guide documents those boundaries](https://learn.microsoft.com/en-us/entra/id-governance/cancel-workflow-runs).

A deleted user remains restorable for 30 days, along with its directory properties. After that window, permanent deletion starts and cannot be stopped; a manually permanently deleted user cannot be restored even by Microsoft Support. During the pilot, do not permanently purge these objects. [Microsoft's deleted-user recovery guide documents the 30-day window and permanent-deletion boundary](https://learn.microsoft.com/en-us/entra/fundamentals/users-restore).

Restoring the directory object is necessary, but do not treat it as proof that every resource-local permission, cached session, invitation state, or application experience is healthy. That is an operational validation step across the resources the guest used.

## Troubleshooting sponsorless guest cleanup

**The workflow cannot be created or updated with guests in scope.** Confirm the tenant is linked to an Azure subscription with the Microsoft Entra ID Governance for guests add-on. Microsoft documents that restriction for Lifecycle Workflows when the guest billing meter is not enabled.

**Far more guests match than expected.** Verify creation paths before assuming the population is stale. SharePoint-created external users are a documented source of missing sponsors. Remember that the trigger tests sponsor count, not recent sign-in or current access.

**A recently sponsored guest still appears in Execution User Scope.** The engine evaluates scope periodically. Preserve the sponsor evidence, allow reevaluation time, and do not enable deletion while the portal result and directory relationship disagree.

**The workflow is quarantined.** Compare the evaluated population with both the fixed and percentage limits. Either can trigger quarantine. Correct the population before approval; approving execution does not repair a bad scope and does not run the workflow immediately.

**The workflow ran despite an execution limit.** Determine whether it was started on demand. Microsoft explicitly excludes on-demand runs from threshold protection.

**Cancel did not bring a deleted guest back.** Cancellation is containment, not rollback. Restore the guest from Deleted users inside 30 days, then validate resource-level access separately.

**A guest has a sponsor but nobody owns the decision.** A recorded group still counts as a sponsor relationship. Review the group's membership and operating model; sponsor-count compliance without accountable people is metadata theatre.

## Administrator checklist

- [ ] Record the feature as public preview; do not invent a GA date or mandatory rollout.
- [ ] Define the primary purpose as ownership remediation before account deletion.
- [ ] Confirm Entra ID Governance or Entra Suite licensing and the guest-governance add-on.
- [ ] Assign least-privilege workflow, sponsor-management, billing, and recovery owners.
- [ ] Inventory every B2B guest creation path and document which paths populate sponsors.
- [ ] Reconcile zero-sponsor guests with activity, authorization, relationship, and owner evidence.
- [ ] Backfill accountable sponsors and fix upstream invitation processes.
- [ ] Create the preview workflow with deletion disabled for the first stage.
- [ ] Inspect Execution User Scope and resolve every unexpected object.
- [ ] Configure a small workflow-specific fixed-user execution limit.
- [ ] Document that thresholds protect scheduled runs, not on-demand runs.
- [ ] Prove notification, Workflow History, audit evidence, and billing visibility.
- [ ] Enable deletion only in a new, approved version for a tiny cohort.
- [ ] Recheck scope after every task, condition, sponsor, or workflow-version change.
- [ ] Keep a staffed 30-day deleted-user recovery process and avoid permanent purge during pilot.
- [ ] Expand only when directory, workflow, audit, billing, and resource-owner evidence agree.

The broader [Lifecycle Workflows beginner guide](/posts/what-are-entra-lifecycle-workflows-beginners-guide) explains the joiner-mover-leaver model. The operational lesson here is narrower: sponsorless guest cleanup is not a stale-account detector. It is a precise automation around one directory relationship. Make that relationship trustworthy first, and the cleanup workflow becomes useful. Automate the deletion first, and missing metadata becomes an outage mechanism.
