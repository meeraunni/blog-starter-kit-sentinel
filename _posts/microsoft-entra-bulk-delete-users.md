---
title: "Bulk Delete Users in Microsoft Entra: Safe Admin Guide"
excerpt: "Bulk delete users in Microsoft Entra safely: scope cloud-only accounts, validate every CSV row, preserve workload data, verify results, and restore mistakes."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-25T17:25:38-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **bulk delete users in Microsoft Entra**, use the current CSV template under **Entra ID > Users > All users > Bulk operations > Bulk delete**, identify each account by user principal name or object ID, submit the smallest approved batch, and verify every row in the result file. A successful upload is only template validation. A completed job can still contain failed rows, and a directory deletion does not finish the mailbox, OneDrive, records-retention, or source-of-authority work around that identity.

The safe pattern is **export, classify, approve, delete, reconcile, and observe**. Start with cloud-only nonprivileged users whose owners and workload-data disposition are known. Keep synchronized identities, emergency-access accounts, administrators, service identities, guests with active sponsorship, and users under investigation or legal hold out of the first batch.

Grab a coffee before turning an offboarding spreadsheet into a deletion file. Microsoft keeps a deleted user in a restorable state for 30 days, but that safety net is not a tenant rollback button. Restoration can return the user and assigned licenses; it does not excuse an unreviewed destructive batch or replace workload-specific retention planning. ([bulk delete users](https://learn.microsoft.com/en-us/entra/identity/users/users-bulk-delete), [restore a recently deleted user](https://learn.microsoft.com/en-us/entra/fundamentals/users-restore))

Microsoft's bulk-delete procedure was updated October 1, 2026. This guide is based on current Microsoft documentation and operational analysis; it does not claim that the workflow was reproduced in a production tenant for this article.

## Bulk delete users in Microsoft Entra: the safe path

Use this sequence for a routine, approved cloud-only-user cleanup:

1. Export the candidate population with stable object IDs and the attributes needed to classify ownership, source of authority, privilege, licensing, and workload use.
2. Remove every account that is synchronized, privileged, shared, nonhuman, break-glass, under hold, involved in an investigation, or missing an accountable owner.
3. Resolve mailbox, OneDrive, Teams, SharePoint, application, and records-retention requirements before deletion.
4. Have a second operator compare the approved object-ID list with the final CSV and the live directory.
5. Activate only the role required for the approved population. Microsoft documents User Administrator as the minimum for bulk deletion, but the role cannot delete every class of administrator.
6. Download a fresh bulk-delete template. Preserve its header exactly and use one user principal name or object ID per row.
7. Start with a small batch whose expected effects you can verify quickly.
8. Submit the file once, monitor **Bulk operation results**, and download the row-level result file.
9. Reconcile successful, failed, and unattempted rows. Do not rerun the original file blindly.
10. Confirm successful objects appear under **Deleted users**, preserve audit evidence, and monitor downstream workload and automation effects.

Microsoft's [bulk-delete procedure](https://learn.microsoft.com/en-us/entra/identity/users/users-bulk-delete) defines the current portal path, minimum role, exact CSV header, template rules, job-status location, and result-file workflow. The site's [Microsoft Entra backup and recovery operating model](/posts/microsoft-entra-id-backup-recovery-strategy) explains why recoverability must be designed before a destructive directory change, not discovered afterward.

## Define the deletion boundary before building the CSV

A row in the CSV names a directory object. It does not explain why that identity exists, who owns its data, or which system is authoritative. Build the approved manifest with at least these fields:

- Microsoft Entra object ID;
- current user principal name and display name;
- `userType` and source-of-authority classification;
- account owner, manager, sponsor, or service owner;
- administrator roles and role-assignable-group membership;
- assigned licenses and group, application, and access-package relationships;
- mailbox, OneDrive, Teams, SharePoint, Power BI, Azure, and line-of-business dependencies;
- retention, legal-hold, investigation, and records-management disposition;
- deletion reason, approver, ticket, planned time, and restore owner; and
- expected source-system action for synchronized identities.

Use the object ID as the primary reconciliation key. A UPN can be renamed, mistyped, or later reused. The bulk service accepts either UPN or object ID, but the stable GUID is the safer evidence key when two operators compare the approval, CSV, result file, Deleted users view, and audit record.

> **Analysis:** the CSV is an execution payload, not the change record. Keep the richer approved manifest outside the upload file and generate or compare the final one-column payload from that manifest. That separation makes it possible to prove why each row was present without adding unsupported columns that Microsoft says are ignored.

## Separate cloud-only, synchronized, guest, and privileged users

Do not send unlike identity classes through one batch merely because they all appear on the Users page.

### Cloud-only member users

These are the cleanest starting scope when the organization has completed mailbox, OneDrive, application, licensing, and retention decisions. They are still not disposable: a cloud-only identity can own applications, automation, groups, Azure resources, Power BI content, or records that outlive employment.

### Synchronized users

Microsoft says a synchronized user can be deleted in Microsoft Entra for security purposes, but Microsoft Entra is not the source of authority. If the object still exists on-premises, the sync engine can restore it on a later cycle. For a normal leaver process, change or delete the identity in the authoritative on-premises system and let the supported synchronization path carry the result. Reserve tenant-side deletion for a documented containment scenario with the hybrid identity owner involved. ([restore or remove a recently deleted user](https://learn.microsoft.com/en-us/entra/fundamentals/users-restore))

### Guest users

A guest object can still represent an active supplier, customer, project member, sponsor relationship, Teams membership, access package assignment, or application entitlement. Validate the collaboration owner and access lifecycle instead of treating `userType = Guest` as evidence that deletion is safe. The site's [sponsorless guest cleanup guide](/posts/microsoft-entra-sponsorless-guest-cleanup) covers the governance path when guest ownership is the real problem.

### Privileged and nonhuman identities

Keep administrators, emergency-access accounts, automation identities, shared operational accounts, and application-dependent users out of a routine bulk job. Microsoft documents that User Administrators can delete nonadmins and certain limited administrators, while Privileged Authentication Administrators can delete a broader administrator population. A role's ability to delete an account is not evidence that the account belongs in the batch. ([create, invite, and delete users](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-create-delete-users))

For administrators, use a separate privileged-access removal runbook that preserves role, PIM, sign-in, device, and incident evidence. For nonhuman access, first identify the actual application or workload identity and its owner. Deleting a user-shaped service account without migrating its dependency is an outage plan.

## Preserve Microsoft 365 data before directory deletion

The Entra bulk-delete page validates a directory CSV and submits a directory job. Microsoft's Microsoft 365 deletion guidance separately asks what should happen to licenses, email, and OneDrive data. Treat that separation as an explicit precondition: complete workload disposition before sending the Entra batch.

For each user, decide:

- whether the mailbox must be converted, delegated, retained, or preserved as an inactive mailbox;
- who receives access to OneDrive files and whether content must be moved;
- whether retention policies, labels, eDiscovery holds, or a legal matter govern the data;
- who owns Teams, Microsoft 365 groups, SharePoint sites, Power BI workspaces, Azure resources, applications, and automation after departure;
- when licenses may be removed or reassigned; and
- which aliases, phone numbers, devices, or application assignments must not be reused yet.

Microsoft says the Microsoft 365 guided deletion flow can give another user access to email and choose what to do with OneDrive, while a deleted account has a 30-day restoration window. Its OneDrive documentation says access delegation and retention settings have their own behavior and can alter how long content remains available. Do not assume the Entra CSV job makes those decisions for you. ([delete a user from Microsoft 365](https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/delete-a-user), [OneDrive retention and deletion](https://learn.microsoft.com/en-us/sharepoint/retention-and-deletion))

> **Analysis:** directory recovery and data retention are related clocks, not one clock. A user object being restorable does not prove that every workload is in the intended ownership, license, hold, or retention state. Record the controlling policy for each workload instead of repeating “30 days” as a universal recovery promise.

## Build and review the bulk-delete CSV

Download the template immediately before the change. Microsoft's current header is:

```text
UserPrincipalName or Object ID [UPN or objectId] Required
```

Preserve the downloaded header exactly. Microsoft advises using the latest template, keeping any version row if the operation includes one, entering one identity per row, and not adding extra columns. Additional columns are ignored, so an `ApprovedBy` or `Ticket` column does not strengthen the change record. ([bulk delete users](https://learn.microsoft.com/en-us/entra/identity/users/users-bulk-delete))

Before upload, have a second operator verify:

- the tenant ID and production environment;
- the number of approved objects and CSV rows;
- every object ID against the live user object;
- exclusions for administrators, emergency access, synchronization, holds, and nonhuman use;
- the workload-data plan and owner for every row;
- the exact header, delimiter, encoding, blank-row handling, and absence of example data; and
- the stop condition if validation or execution returns unexpected results.

Never use a filter-only export as the final approval. Filters can be stale, overly broad, or based on attributes that changed after review. Freeze the object-ID manifest for the window, then recheck live object state just before submission.

## Understand validation, execution, and partial failure

The portal first validates the file. If validation passes, Microsoft reports **File uploaded successfully** and allows submission. That message proves the template was accepted; it does not prove that every named object is still present, still in scope, or deletable by the operator.

After submission, the job runs asynchronously. Microsoft directs administrators to **Bulk operation results** and says the downloadable result file contains the reason for each error. Reconcile the output into three explicit sets:

- **Succeeded:** expected users that reached Deleted users.
- **Failed:** rows that need a named cause and a new decision.
- **Unresolved:** approved rows that do not appear as either a confirmed success or an understood failure.

Do not treat the job as an atomic transaction. If 98 rows succeed and two fail, retrying the original 100-row file mixes already-deleted objects with unresolved failures and muddies the evidence. Create a new remediation file containing only still-approved failed rows after their cause is understood.

Microsoft's current bulk-delete page still warns that a bulk operation can fail if it does not complete within one hour and recommends smaller batches. Use batch size as a safety control even when the tenant normally processes large jobs quickly. Smaller batches shorten reconciliation, reduce the incident radius, and make a stop decision meaningful. ([bulk delete users](https://learn.microsoft.com/en-us/entra/identity/users/users-bulk-delete), [bulk operations service limitations](https://learn.microsoft.com/en-us/entra/fundamentals/bulk-operations-service-limitations))

## Verify the result with three evidence layers

### Job evidence

Preserve the submitted CSV, job identifier or timestamp, final status, and downloaded row-level result. Record the exact counts for submitted, succeeded, failed, and unresolved rows.

### Directory evidence

Microsoft instructs administrators to verify that deleted users no longer appear in the active Users view. Also confirm each successful object appears under **Deleted users** while it is recoverable. Do not use a broad `Get-MgUser` count as proof for a particular object; reconcile the exact IDs from the approved manifest.

### Audit and workload evidence

Microsoft's audit reference lists **Bulk delete users - finished (bulk)** and **started (bulk)** under UserManagement. Preserve the initiating actor, UTC window, correlation details, target information available in the tenant, and the matching change record. A Reports Reader can access audit logs through **Entra ID > Monitoring & health > Audit logs**. ([Microsoft Entra audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities))

Then verify the effects that matter outside the directory: sign-in is no longer available, licenses and ownership changes match the plan, mailbox and OneDrive handling is active, automation has not failed, and authoritative HR or directory systems will not recreate the identity unexpectedly.

The site's [Microsoft Entra access drift report runbook](/posts/microsoft-entra-access-drift-report) is useful after a cleanup when governed group or application access must be reconciled against approved entitlements. It is not a substitute for the deletion job's own row-level evidence.

## Restore a mistaken deletion safely

If the wrong user is deleted, stop the remaining batches and preserve the submitted file, results, audit events, object ID, and discovery time. Do not permanently delete the object to “clean up” the mistake.

Microsoft keeps deleted users in a suspended, restorable state for 30 days. During that window, the user and organization information can be restored from **Entra ID > Users > Deleted users**. Microsoft also says the licenses assigned at deletion are restored even if none are currently available, which can temporarily put the tenant out of compliance. Check license capacity before restoration when possible and reconcile it immediately afterward. ([restore a recently deleted user](https://learn.microsoft.com/en-us/entra/fundamentals/users-restore))

Use this recovery sequence:

1. Stop further batches and identify whether the mistake is isolated or systematic.
2. Confirm the deleted object's stable ID, UPN, source of authority, workload ownership, and deletion time.
3. Restore the user from Deleted users using the approved role.
4. Verify the active directory object, assigned licenses, administrator roles, group and application access, authentication methods, device relationships, mailbox, OneDrive, and business application behavior.
5. Re-enable only the access required by the approved recovery; do not blindly reconstruct from memory.
6. Document the gap that admitted the row and rebuild the next batch from the corrected manifest.

Permanent deletion is not rollback. Microsoft says neither the tenant nor Microsoft Support can restore a permanently deleted user. Keep permanent deletion outside this runbook and behind its own evidence, retention, and approval controls.

## Troubleshoot without widening the blast radius

### The file will not validate

Download a fresh template and compare the exact header. Remove unsupported columns, sample content, extra delimiters, and malformed identifiers. Confirm one identity per row. Do not “fix” validation by pasting the list into a different bulk operation.

### Some rows fail after submission

Download the result file and classify each failure. Recheck live object state, operator role, source of authority, and whether the object is an administrator the current role cannot delete. Build a new file only for still-approved failures.

### A synchronized user returns

Check the authoritative on-premises object and synchronization evidence. Microsoft warns that a synced user deleted in Entra can be restored by the sync engine if the source object still exists. Fix the lifecycle action at the source rather than repeatedly deleting the cloud object.

### A mailbox or OneDrive owner is missing

Stop the next batch. Use the Microsoft 365, Exchange, SharePoint, Purview, and legal processes that govern that data. Restore the user first if doing so is the supported way to recover access within the current window. Do not improvise ownership with a new look-alike account.

### The bulk job approaches the service limit

Do not submit an overlapping copy. Wait for a final state, preserve the result, and split only the unresolved approved population into smaller batches. Duplicate submissions make it harder to distinguish a retry from an independent deletion attempt.

## Bulk delete Microsoft Entra users checklist

- [ ] Define the approved cloud-only population and preserve stable object IDs.
- [ ] Exclude synchronized, privileged, emergency-access, nonhuman, shared, held, and investigation accounts.
- [ ] Record owner, reason, approver, ticket, time, and restore owner for every row.
- [ ] Complete mailbox, OneDrive, application, ownership, license, and retention decisions first.
- [ ] Download the current CSV template and preserve its exact header.
- [ ] Compare the final file with the approval manifest using a second operator.
- [ ] Activate only the role needed for the approved identity class.
- [ ] Start with a small batch and define an explicit stop condition.
- [ ] Treat upload validation, job completion, and row success as separate states.
- [ ] Download and reconcile the result file; never rerun the original batch blindly.
- [ ] Confirm each success in Deleted users and preserve bulk-job plus audit evidence.
- [ ] Monitor synchronization, licenses, workload ownership, automation, and data retention.
- [ ] Keep permanent deletion out of the routine bulk-delete runbook.
- [ ] If restoration is needed, verify the directory and every affected workload before closing.

## Frequently asked questions

### What role is required to bulk delete users in Microsoft Entra?

Microsoft documents User Administrator as the minimum role for the bulk-delete workflow. That role cannot delete every administrator. Use the least-privileged role appropriate to the approved population and keep privileged identities in a separate runbook.

### Can I bulk delete synchronized users from Microsoft Entra?

Microsoft allows tenant-side deletion of synchronized users for security purposes, but Entra is not their source of authority. If the on-premises object remains, synchronization can restore the cloud object. Use the authoritative source for normal lifecycle deletion.

### Does a successful CSV upload mean every user was deleted?

No. Upload success means the file passed validation. Monitor Bulk operation results, download the result file, and reconcile every row against Deleted users and audit evidence.

### How long can a deleted Microsoft Entra user be restored?

Microsoft documents a 30-day suspended state. After the window, permanent deletion begins and cannot be stopped. A permanently deleted user cannot be restored by Microsoft Support.

### Will restoring the user restore licenses?

Microsoft says licenses assigned at deletion are restored with the user, even if no licenses are currently available. Check capacity and compliance immediately after recovery.

### Does the Entra bulk-delete job preserve email and OneDrive?

Do not treat it as a data-preservation workflow. Microsoft documents mailbox and OneDrive decisions in the Microsoft 365 deletion and retention guidance. Resolve those workload requirements before the directory batch and verify them afterward.

The objective is not “the CSV ran.” It is **every deletion was authorized, every row is accounted for, every workload has an owner and retention decision, and every mistake remains recoverable through a tested path**.
