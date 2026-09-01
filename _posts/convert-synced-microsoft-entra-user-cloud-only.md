---
title: "Convert a Synced Microsoft Entra User to Cloud Only"
excerpt: "Convert a synced Microsoft Entra user to cloud only with verified prerequisites, Graph steps, audit evidence, staged rollout, and a rollback plan."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-01T09:04:12-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To convert a synced Microsoft Entra user to cloud only, transfer that user's source of authority by setting `isCloudManaged` to `true` through Microsoft Graph. Do it only after the user passes Microsoft's dependency checks, the last synchronization is complete, every upstream writer has been redirected, and you have a tested rollback window.

The switch is per object. It does not disable tenant synchronization, rebuild the user, or require a new object ID. Instead, Microsoft Entra stops accepting Active Directory changes for that user and makes the existing cloud object editable. Microsoft lists user source-of-authority transfer as **generally available**, supported by both Microsoft Entra Connect Sync and Cloud Sync. It is not a preview, default-on change, mandatory migration, or scheduled retirement. The [current Microsoft Entra release notes confirm the GA state](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---ability-to-convert-source-of-authority-of-synced-on-premises-ad-users-to-cloud-users-is-now-available), and Microsoft's [user source-of-authority overview](https://learn.microsoft.com/en-us/entra/identity/hybrid/user-source-of-authority-overview) defines the supported operating model.

Grab a coffee before the change window. The Graph request is the easy part. Proving that AD, Exchange, HR, MIM, federation, applications, groups, and rollback all agree about the new authority is the real work.

## Convert a synced Microsoft Entra user to cloud only: the decision

Use user source-of-authority transfer when an existing synchronized person no longer needs AD DS to govern the identity, but you need to preserve the Microsoft Entra user and its cloud relationships. It is a migration control, not a fix for a broken sync engine.

The object-state transition is:

- **Before transfer:** `isCloudManaged` is `false`, `onPremisesSyncEnabled` is `true`, and the supported synchronized properties are read-only in Microsoft Entra.
- **After transfer:** `isCloudManaged` is `true`, `onPremisesSyncEnabled` is `null`, and on-premises updates to that object are blocked in the cloud.
- **After rollback request, before sync takeover:** `isCloudManaged` is `false`, while `onPremisesSyncEnabled` remains `null` until the next sync cycle completes.

Microsoft documents those states in its [current user SOA configuration procedure](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure#status-of-attributes-after-you-transfer-soa). Treat the `onPremisesSyncBehavior` response, the audit event, and sync-client evidence as the control-plane proof. Do not infer success from a writable display-name field alone.

Do **not** transfer a user yet when any of these statements is true:

- the user still depends on password-based on-premises applications;
- AD FS is still authenticating the user;
- an on-premises Exchange workload still governs the mailbox or recipient;
- HR, MIM, a script, certificate services, or another system still writes authoritative data to the AD user;
- unsupported reference-valued attributes are present;
- the object is excluded from synchronization or is an administrative object that Microsoft says cannot be transferred; or
- no owner can explain how to return authority to AD safely.

If federation is still in the path, finish the site's [AD FS retirement plan](/posts/how-to-migrate-from-adfs-to-entra-id) first. Microsoft says AD FS users are not supported for user SOA transfer; third-party federation requires separate password maintenance through that provider's synchronization tooling.

## Understand the control plane before changing it

`isCloudManaged` is an authority switch on the existing directory object. When it becomes `true`, current Connect Sync and Cloud Sync clients honor the setting and stop flowing AD changes into that Microsoft Entra user. For Connect Sync, Microsoft exposes the `blockOnPremisesSync` connector property set to `true` and records event ID **6956** when an on-premises change is not exported because the object is cloud-managed. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure#connect-sync-client))

That does not automatically erase the AD account. Microsoft describes two supported end states:

- remove or disable the AD user after every AD-dependent workload has been retired; or
- retain the AD account for supported Kerberos scenarios, using Cloud Kerberos Trust and passwordless authentication while Microsoft Entra remains authoritative for the cloud identity.

If the retained AD object is still referenced by AD-managed groups, devices, or contacts, Microsoft's preparation sequence says it may need to remain in synchronization scope so those references stay coherent. That is different from continuing to let AD write the user's cloud-owned attributes. The [Microsoft preparation guide distinguishes reference preservation from identity authority](https://learn.microsoft.com/en-us/entra/identity/hybrid/prepare-user-source-of-authority-environment#sequence-of-steps-for-using-soa).

Exchange has a separate source-of-authority boundary. User SOA moves the identity object to cloud management; it is not the same as moving only Exchange attributes for a synchronized remote mailbox. If that narrower design is what you need, use the site's [Exchange attribute writeback rollout guide](/posts/microsoft-entra-cloud-sync-exchange-attribute-writeback) instead.

## Prove every prerequisite before the first Graph request

Microsoft's configuration guide currently documents these minimum technical requirements:

- Microsoft Entra Free licensing for user SOA itself;
- Hybrid Identity Administrator for the user SOA read and update operation;
- Application Administrator or Cloud Application Administrator to grant the Graph permission to the client application;
- [User-OnPremisesSyncBehavior.ReadWrite.All](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure#prerequisites) for the application calling the API;
- Microsoft Entra Connect Sync **2.5.76.0 or later**; or
- Microsoft Entra Provisioning Agent **1.1.1370.0 or later** for Cloud Sync.

Those are product prerequisites, not the complete change checklist. Before selecting a pilot user, Microsoft's [environment preparation guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/prepare-user-source-of-authority-environment#confirm-your-ad-objects-are-ready-to-have-their-soa-changed) also requires you to confirm that:

- the user is already synchronized to Microsoft Entra;
- every attribute you plan to manage is present in Microsoft Entra as a directory attribute or schema extension;
- reference-valued attributes other than the documented manager and AD backlinks are absent;
- manager and member references, when present, point to synchronized users in the same AD domain; and
- another on-premises Microsoft technology is not maintaining an attribute such as `userCertificate`.

For a partial migration, move candidates into a dedicated AD OU that signals “do not manage here,” but do not use the OU move itself as the authority change. Microsoft's [operational guidance warns that editing a transferred object with AD tools can create inconsistencies](https://learn.microsoft.com/en-us/entra/identity/hybrid/user-source-of-authority-guidance#move-users-to-an-ou).

### Exchange, HR, MIM, and application gates

Treat these as stop/go decisions:

1. **Exchange:** Microsoft requires hybrid mailboxes to be migrated to Exchange Online before user SOA is switched. Complete the supported Exchange-management transition and stop the on-premises Exchange writer before the identity transfer.
2. **HR provisioning:** redirect the selected population from HR-to-AD into HR-to-Microsoft Entra provisioning. Use mutually exclusive scoping filters and preserve out-of-scope objects while moving the cohort.
3. **MIM:** stop exporting the selected users through the AD management agent and prepare the Microsoft Graph connector path before transferring authority.
4. **Applications:** inventory LDAP, Kerberos, password, certificate, and federation dependencies. Microsoft specifically says password-based application dependencies are unsupported for transferred users.
5. **Groups:** Microsoft says to switch group SOA before user SOA where both are moving. Do not strand a cloud-managed user inside an unresolved AD-owned group design.

The preparation steps are detailed in Microsoft's [Exchange, HR, and MIM migration sequence](https://learn.microsoft.com/en-us/entra/identity/hybrid/prepare-user-source-of-authority-environment). Preserve a directory-state export and change record before proceeding; the site's [Microsoft Entra backup and recovery operating model](/posts/microsoft-entra-id-backup-recovery-strategy) explains why a backup is evidence and recovery support, not a substitute for a product-specific rollback.

## Run a one-user source-of-authority pilot

Use a nonprivileged test user that represents the real identity path but does not own production automation, emergency access, or business-critical data. This rollout sequence is **analysis**, not a Microsoft rollout schedule.

### Ring 0: freeze writers and capture state

Finish the current sync cycle and confirm the AD and Microsoft Entra values agree. Record:

- Microsoft Entra object ID and user principal name;
- `isCloudManaged` and `onPremisesSyncEnabled` values;
- sync client and agent versions;
- OU, source anchor, group references, manager, and authoritative attribute list;
- Exchange recipient and mailbox authority;
- HR, MIM, certificate, federation, LDAP, Kerberos, and password dependencies; and
- current owners, licenses, app assignments, and access-package relationships.

Stop every writer that should no longer target AD. Do not delete the AD user as part of this ring.

### Ring 1: verify the current SOA

In Microsoft Graph Explorer or an approved client with the documented permission, use method `GET`, Microsoft Graph `v1.0`, the `users` resource, the Microsoft Entra **object ID**, and the `onPremisesSyncBehavior` relationship. Add the optional `$select=isCloudManaged` query when you want only the authority property.

For a synchronized user that has not been transferred, the expected value is `false`. Confirm that ordinary cloud edits to synchronized properties are blocked before the change; this proves the test object is exercising the expected control path.

### Ring 2: transfer the user to cloud authority

Send a `PATCH` request through Microsoft Graph `v1.0` to the same user object's `onPremisesSyncBehavior` relationship with this JSON body:

```json
{
  "isCloudManaged": true
}
```

Microsoft's [configuration procedure publishes this exact endpoint and payload](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure#transfer-soa-for-a-test-user). This is a write to the production identity object. Review the object ID and cohort immediately before sending it.

### Ring 3: prove three independent signals

Do not call the transfer successful until all three evidence layers agree:

1. **Graph:** repeat the GET request and confirm `isCloudManaged` is `true`.
2. **Microsoft Entra audit:** find **Change Source of Authority from AD DS to cloud** for the correct target, actor, and time.
3. **Sync client:** after a sync cycle, confirm the `blockOnPremisesSync` property is `true`; for Connect Sync, a deliberate nonproduction AD change should produce event ID 6956 rather than overwrite the cloud object.

Microsoft documents the audit and event evidence in its [user SOA monitoring guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/user-source-of-authority-audit-monitor). Validate a harmless cloud-managed attribute change only after the authority signals are green, then confirm sign-in and application access still work.

### Ring 4: expand by dependency, not headcount

Broaden to a small cohort with the same Exchange, HR, application, and group pattern. Hold the cohort long enough to observe at least one normal identity-lifecycle change from its new upstream system. Expand only after the change reaches Microsoft Entra, downstream access remains correct, AD writes remain blocked, and the rollback runbook has been reviewed against the actual object relationships.

## Roll back without weakening the tenant permanently

Rollback is not simply the inverse user PATCH. Microsoft requires you to remove cloud-only references that AD cannot take over, including cloud users in transferred groups and relevant access-package relationships. The sync client must then reclaim the object in a subsequent cycle.

There is also a tenant-wide safeguard. Microsoft's current procedure says rollback requires temporarily disabling the [blockCloudObjectTakeoverThroughHardMatchEnabled](https://learn.microsoft.com/en-us/graph/api/resources/onpremisesdirectorysynchronizationfeature?view=graph-rest-1.0) flag, setting the user's `isCloudManaged` value to `false`, completing sync takeover, and re-enabling the safeguard. The user PATCH uses Microsoft Graph v1.0, but the documented safeguard toggle still uses a **beta** directory synchronization endpoint. ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure#roll-back-soa-update))

That distinction is operationally important:

- a beta API can change and is not a safe foundation for unattended rollback automation;
- the hard-match safeguard affects the tenant, not only the pilot user;
- Microsoft Graph documents Global Administrator as the supported role for updating the directory synchronization configuration; and
- leaving the safeguard disabled expands takeover risk beyond the incident you are fixing. ([Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/onpremisesdirectorysynchronization-update?view=graph-rest-1.0))

Use a controlled rollback window:

1. remove or resolve cloud references that would block AD takeover;
2. confirm the AD object is in scope and contains the approved recovery state;
3. record the current tenant safeguard value;
4. temporarily disable the safeguard exactly as Microsoft documents;
5. set the user's `isCloudManaged` value to `false`;
6. run or wait for the next supported sync cycle;
7. verify AD has reclaimed authority and the expected properties flow;
8. immediately restore the safeguard to its prior secure value; and
9. confirm the **Undo changes to Source of Authority from AD DS to cloud** audit event.

If the beta safeguard call, object relationships, or sync takeover are not completely understood, stop and open a Microsoft support case. Do not improvise with `onPremisesImmutableId`, hard matching, deletion, or object recreation.

## Troubleshoot a user SOA transfer safely

### The SOA request returns 403

Check both authorization layers. The calling client needs the [User-OnPremisesSyncBehavior.ReadWrite.All](https://learn.microsoft.com/en-us/entra/identity/hybrid/how-to-user-source-of-authority-configure#prerequisites) permission, and the signed-in operator needs the supported role. If you also test an ordinary user-property update, Microsoft's guide notes that the client needs `User.ReadWrite.All` for that separate operation. Do not grant a broader directory permission merely to make the error disappear.

### The transfer succeeds, but AD changes still appear in Microsoft Entra

Confirm the sync client meets the minimum version, repeat the SOA GET request, and inspect the exact connector object. A value other than `isCloudManaged: true`, a `blockOnPremisesSync` property not set to `true`, or the absence of the expected 6956 evidence points to an incomplete or incorrectly observed transfer. Also look for a second writer—HR, MIM, Exchange, or automation—that is updating Microsoft Entra directly rather than through AD.

### Cloud edits work, but an application stops authenticating

Authority transfer does not modernize the application's authentication path. Check whether the app depended on AD password validation, LDAP, AD FS, a certificate attribute, or another unsupported on-premises dependency. Preserve the audit and sign-in correlation data, contain the pilot, and use the reviewed rollback plan if the dependency cannot be removed within the window.

### `onPremisesSyncEnabled` is null and the team thinks the user was deleted

That null value is the documented state after a successful transfer. Verify the stable object ID, `isCloudManaged: true`, owners, licenses, assignments, audit event, and sign-in behavior. Do not recreate the user or hard-match another AD object to it.

### Rollback is waiting for AD takeover

Setting `isCloudManaged` to `false` permits takeover; it does not complete it. The user can remain cloud-editable until the next sync cycle. Confirm the object is in scope, run the supported sync cycle, inspect the connector state, and keep the tenant safeguard change tightly bounded until takeover is proven.

## Administrator checklist

- [ ] Confirm user SOA transfer is GA for the tenant and cloud.
- [ ] Define the exact pilot cohort and primary identity owner.
- [ ] Verify Microsoft Entra Connect Sync 2.5.76.0+ or Provisioning Agent 1.1.1370.0+.
- [ ] Assign only the documented operator roles and Graph permissions.
- [ ] Confirm the user is already synchronized and not an excluded administrative object.
- [ ] Inventory Exchange, HR, MIM, AD CS, federation, LDAP, Kerberos, password, device, group, and application dependencies.
- [ ] Migrate all relevant mailboxes to Exchange Online and stop the old Exchange writer.
- [ ] Redirect upstream provisioning before changing authority.
- [ ] Move the cohort to a clearly designated AD OU where appropriate.
- [ ] Capture stable IDs, attributes, references, memberships, assignments, and current SOA state.
- [ ] Complete the last sync cycle and freeze direct AD changes.
- [ ] Transfer one nonprivileged test user with the documented v1.0 Graph request.
- [ ] Verify Graph state, audit activity, connector state, and event ID 6956.
- [ ] Prove sign-in, application access, group behavior, and one normal lifecycle change.
- [ ] Review rollback cloud references and the tenant-wide hard-match safeguard step.
- [ ] Re-enable the safeguard immediately after any successful rollback.
- [ ] Escalate instead of deleting, recreating, or manually hard-matching the user.

Converting a synced Microsoft Entra user to cloud only is a small API change with a large ownership consequence. A safe migration makes that ownership explicit: one authoritative writer, supported application dependencies, three layers of evidence, and a rollback path that does not leave the tenant's hard-match protection weakened.
