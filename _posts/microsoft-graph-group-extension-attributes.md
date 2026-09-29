---
title: "Microsoft Graph Group Extension Attributes: Admin Guide"
excerpt: "Use Microsoft Graph group extension attributes to read synced AD values, verify source and sync state, inventory usage, and avoid custom-data collisions."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-29T09:09:21-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Graph group extension attributes** now let administrators retrieve `extensionAttribute1` through `extensionAttribute15` for a group synchronized from Active Directory by using the Microsoft Graph v1.0 group resource. Request `onPremisesExtensionAttributes` explicitly with `$select`, keep the group object ID and synchronization state beside the values, and change the authoritative attribute in Active Directory rather than treating Graph as a new write path.

That is the short answer. The September 2026 [Microsoft Graph change log](https://learn.microsoft.com/en-us/graph/whats-new-overview#september-2026-new-and-generally-available) says the `onPremisesExtensionAttributes` property was added to the generally available group resource. Microsoft's [v1.0 group resource reference](https://learn.microsoft.com/en-us/graph/api/resources/group?view=graph-rest-1.0) defines it as the complex object containing group extension attributes 1–15 synchronized from on-premises Active Directory. The same reference says it is returned only when selected and supports exact-value filters.

Grab a coffee before wiring it into a production inventory. This is a useful visibility improvement, not a new attribute-governance system. It does not rename the fifteen generic fields, decide what your organization stores in them, repair a missing synchronization rule, or make a cloud group the source of authority for an AD-sourced value.

## Microsoft Graph group extension attributes: what changed

Until this v1.0 addition, administrators could see many hybrid group properties in Microsoft Graph but could not rely on the GA group model to return the familiar AD/Exchange custom attributes as one supported complex property. The new surface makes this request valid against v1.0:

```http
GET https://graph.microsoft.com/v1.0/groups/{group-id}?$select=id,displayName,onPremisesSyncEnabled,onPremisesLastSyncDateTime,onPremisesExtensionAttributes
```

The response places all fifteen values under `onPremisesExtensionAttributes`:

```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "displayName": "Finance Application Operators",
  "onPremisesSyncEnabled": true,
  "onPremisesLastSyncDateTime": "2026-09-29T11:42:18Z",
  "onPremisesExtensionAttributes": {
    "extensionAttribute1": "Tier-1",
    "extensionAttribute2": "Finance",
    "extensionAttribute3": null
  }
}
```

The shortened response is illustrative; Graph returns the complex object's documented fields, including nulls. The important operational point is that the attribute name alone is not enough evidence. Record the immutable group ID, display name, `onPremisesSyncEnabled`, and `onPremisesLastSyncDateTime` with it. A value without its object and sync context is easy to misapply after a rename, migration, or stale export.

Microsoft documents the group API in the global service, US Government L4, US Government L5/DoD, and China operated by 21Vianet. Availability of the API is not proof that your synchronization configuration populates the values. Validate one known group in each environment before designing a tenant-wide process.

This release is **generally available at the Microsoft Graph v1.0 API layer**. It is not a tenant-wide enforcement change, and Microsoft has not documented a switch that administrators must enable for Graph. It also does not mean every product that consumes group objects immediately supports these properties for policy, claims, scoping, or display.

## Follow the source of authority before troubleshooting Graph

Think of the data path as four separate proofs:

1. **Active Directory value:** the intended `extensionAttribute1–15` value exists on the correct on-premises group.
2. **Synchronization scope and rule:** the group and attribute are in scope for the active Microsoft Entra synchronization engine.
3. **Microsoft Entra group state:** the cloud object is the correct matched group and shows a fresh synchronization timestamp without a relevant provisioning error.
4. **Graph projection:** the v1.0 request explicitly selects `onPremisesExtensionAttributes` and the caller is authorized to read the group.

Microsoft's [Connect Sync attribute reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-sync-attributes-synchronized) lists `extensionAttribute1` through `extensionAttribute15` for groups. That confirms the default product model can synchronize them; it does not prove a particular tenant has kept the default rules, selected the relevant directory extension set, or synchronized the group successfully.

For a synchronized group, make the change at the authoritative on-premises object and wait for the supported synchronization path. The v1.0 update-group reference does not document `onPremisesExtensionAttributes` as a writable group property. Do not build a PATCH workflow by analogy with cloud-only users or devices. Similar names across Microsoft Graph resources do not guarantee the same source or write behavior.

The site's [September 2026 Microsoft Entra Connect upgrade guide](/posts/microsoft-entra-connect-september-2026-upgrade-guide) covers the broader health, version, and change-control checks for Connect Sync. If the organization is moving synchronization engines, use the [Connect Sync to Cloud Sync migration guide](/posts/migrate-microsoft-entra-connect-sync-cloud-sync) to keep platform migration separate from this data inventory.

## Do not mix up the four Microsoft extension models

“Extension attribute” is overloaded in Microsoft identity. Before putting a value into a report or automation, identify which model you actually have.

- **Group `onPremisesExtensionAttributes`:** the fifteen named string slots discussed here, exposed as one complex property on the v1.0 group resource and populated from synchronized Active Directory group attributes.
- **Directory extensions:** properties registered by an application and normally named like `extension_{appId}_PropertyName`. These can target groups, have their own schema definition, and are a different Graph surface.
- **Schema extensions:** custom, strongly typed schemas that can extend supported Microsoft Graph resources. Their lifecycle and naming are tied to a schema-extension definition.
- **Open extensions:** lightweight application data attached through the open-extension relationship. They are retrieved through their own extension operations rather than through `onPremisesExtensionAttributes`.

Microsoft's [Graph extensibility overview](https://learn.microsoft.com/en-us/graph/extensibility-overview) explains those models and warns organizations to track ownership of generic extension slots to avoid overwriting data. That warning matters even more for groups: `extensionAttribute7 = Finance` is meaningless unless your organization has a registry saying who owns slot 7, what values are allowed, where the source is maintained, and which consumers depend on it.

A current Cloud Sync example makes the distinction concrete. Microsoft's [directory-extension group-provisioning tutorial](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/tutorial-directory-extension-group-provisioning) creates a Boolean directory extension named `WritebackEnabled` for a group-scoping filter. The guide explicitly recommends that new property instead of extension attributes 1–15 because those predefined attributes are not managed in Entra for that scenario. Do not replace a purpose-built Boolean extension with a string in `extensionAttribute1` just because the new v1.0 property is easier to read.

## Run a safe single-group validation first

Start with a non-privileged group whose on-premises object and expected attribute value are already known. Do not choose a group that controls Conditional Access exclusions, privileged role assignment, emergency access, production application administration, or group-based licensing for the first test.

### 1. Record the authoritative object

Capture the AD distinguished name, object GUID, group type, expected extension values, and the change time. Confirm the group is in the synchronization scope. If your tenant has multiple forests or multiple groups with similar display names, do not use the name as the join key.

### 2. Resolve the Entra group by immutable ID

Use the Microsoft Entra group object ID already recorded in your configuration or resolve it through an approved inventory. Then make the narrow Graph request shown above. Microsoft's [Get group API](https://learn.microsoft.com/en-us/graph/api/group-get?view=graph-rest-1.0) says nondefault properties require `$select` and warns that recently changed objects can be subject to replication delay.

A missing property in a request that omitted `$select` is a query problem, not evidence that synchronization failed.

### 3. Compare value, sync state, and time

Validate all of these together:

- the cloud object ID is the expected match;
- `onPremisesSyncEnabled` is `true` for the currently synchronized group;
- `onPremisesLastSyncDateTime` is later than the authoritative change and the expected sync cycle;
- the intended extension attribute contains the exact value, including case and whitespace expectations; and
- no relevant `onPremisesProvisioningErrors` or synchronization-engine error explains a stale result.

If the value is blank while the timestamp is current, inspect the synchronization configuration and source attribute. If the timestamp is stale, fix the synchronization path before debating the Graph response. If `onPremisesSyncEnabled` is `false` or null, stop assuming the object participates in the current AD-to-Entra flow.

### 4. Repeat after one controlled change

Change one non-sensitive test value at the source, allow a normal synchronization cycle, and retrieve the object again. Preserve the before and after JSON in the change record after removing unrelated sensitive fields. This proves the complete path better than finding one value that might have been present for years.

This guide describes documented behavior and a validation method; it does not claim that the steps were executed in a Sentinel Identity tenant.

## Query group extension attributes with Microsoft Graph PowerShell

The Microsoft Graph PowerShell SDK maps `$select` to the `-Property` parameter. Microsoft's [Get-MgGroup reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.groups/get-mggroup?view=graph-powershell-1.0) documents that parameter and the single-group `-GroupId` form.

After connecting with an approved read permission listed by the live Graph group documentation, retrieve one group:

```powershell
$groupId = "11111111-2222-3333-4444-555555555555"

$group = Get-MgGroup -GroupId $groupId -Property @(
    "id"
    "displayName"
    "onPremisesSyncEnabled"
    "onPremisesLastSyncDateTime"
    "onPremisesExtensionAttributes"
    "onPremisesProvisioningErrors"
)

$group | Select-Object Id, DisplayName,
    OnPremisesSyncEnabled, OnPremisesLastSyncDateTime

$group | ConvertTo-Json -Depth 6
```

SDK model projection can change between module versions, so inspect the returned object before hard-coding a nested serialization path. The raw REST request is the clearest contract when you are validating the API itself. In automation, pin and test the Microsoft Graph PowerShell module version, log the request time and group ID, and fail visibly if the expected complex property is absent.

Do not request a directory-wide write permission for a read-only inventory. Microsoft Graph permission tables can evolve and can distinguish basic group reads from richer properties. Use the least-privileged permission that the current Get/List group documentation says returns the required field, obtain consent through the normal process, and test the exact token in a nonproduction scope.

## Build a tenant inventory without losing evidence

Microsoft's [List groups API](https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0) returns a limited default property set, supports `$select`, and uses pagination. Its default page size is 100 and maximum documented page size is 999. It also warns that newly created, changed, or deleted groups can be delayed by replication.

For a full inventory, use a request that explicitly selects only the evidence you need:

```http
GET https://graph.microsoft.com/v1.0/groups?$select=id,displayName,onPremisesSyncEnabled,onPremisesLastSyncDateTime,onPremisesExtensionAttributes
```

Then follow every `@odata.nextLink` until no next link remains. A script that exports only the first page is not a tenant inventory, however polished its CSV looks.

Keep the raw value and these context fields in the same record:

- retrieval timestamp in UTC;
- tenant ID and cloud environment;
- group object ID and current display name;
- group type and mail/security state when relevant to the consumer;
- `onPremisesSyncEnabled` and `onPremisesLastSyncDateTime`;
- the fifteen attribute values without renaming the raw fields; and
- the inventory script and module or API version.

Translate the raw slots into friendly meanings only in a governed reporting layer. For example, a registry might say that `extensionAttribute4` is “data owner code” for synchronized security groups. Keep both names in the output. If the meaning changes later, auditors can still reconstruct what Graph returned.

Do not export secrets, credentials, recovery data, personal identifiers, or access tokens into these slots or into the report. Extension attributes are directory data available to authorized callers; they are not a secret store.

## Use the values as metadata, not as unexamined authorization

The new Graph property is useful for discovery, reconciliation, migration assessment, ownership reporting, and controlled provisioning logic. It can answer questions such as:

- Which synchronized groups already carry a business-owner or tier marker?
- Which groups have an expected attribute blank even though synchronization is current?
- Do the cloud values match the AD source before a Connect-to-Cloud-Sync migration?
- Which existing consumers depend on a generic extension slot?
- Did an OU-preservation workflow populate the expected metadata before group provisioning?

Microsoft's [Cloud Sync guidance for preserving a group's original OU](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-preserve-original-organizational-unit) uses a group extension attribute as part of a documented provisioning design and validates it with a v1.0 Graph request. That is a bounded use: a known source populates a documented slot, the provisioning configuration reads it, and the operator verifies the result.

Using a generic string directly as a high-impact authorization decision is riskier. A value can be stale, malformed, duplicated, changed by an unexpected source administrator, or reused by another integration. If an application will grant privilege from the field, add schema validation, an allowlist, ownership controls, change monitoring, a deny-by-default path, and an independent review of the effective grant. The site's [AD group enforcement pilot guide](/posts/microsoft-entra-ad-group-enforcement-pilot-guide) covers the wider safety pattern for turning group metadata or membership into an enforced control.

> [!IMPORTANT]
> **Analysis:** Graph returning a value proves that the directory currently projects that value. It does not prove that the value is correct, current enough for the business decision, uniquely owned, or safe to use as authorization.

## Troubleshoot missing or stale values in dependency order

### The property is absent from the JSON

Confirm the request uses `/v1.0/groups` and explicitly includes `onPremisesExtensionAttributes` in `$select`. Check the actual request URL produced by the SDK. A successful 200 response with only default group properties does not mean the extension data is empty.

### All fifteen fields are null

Check the AD source object first, then synchronization scope and rules. Confirm the object is a synchronized group and not a cloud group with the same display name. Compare the group IDs and the most recent sync timestamp. Do not populate a value in a random extension slot as a diagnostic shortcut.

### One group's value is stale

Compare the source change time, the synchronization run, `onPremisesLastSyncDateTime`, and the Graph retrieval time. Review synchronization-engine or provisioning errors. Allow for Microsoft's documented replication delay after recent updates, but do not use “eventual consistency” to excuse a value that remains stale across completed cycles.

### The REST result and PowerShell output look different

Request the same properties with the same identity and permission, then inspect the PowerShell object's nested and additional properties. Confirm the installed module version. Serialize the object to sufficiently deep JSON for diagnosis; a shallow formatter can hide nested fields even when the SDK received them.

### A filter returns no groups

Validate the value on one known group with a direct GET first. Then compare the filter syntax with the current group resource documentation, encode the URL correctly, and check whether the query requires advanced-query headers. A direct object read separates a data problem from a collection-query problem.

### A consumer acts on the wrong group

Stop the consumer and compare immutable IDs. Display names, mail aliases, and friendly attribute meanings can change. Restore the last known safe authorization or provisioning boundary through the consumer's documented rollback path; do not edit many directory attributes to make the mistaken match look correct.

## Microsoft Graph group extension attributes checklist

- [ ] Confirm the use case needs the fifteen AD/Exchange extension slots rather than a directory, schema, or open extension.
- [ ] Assign an owner, meaning, format, allowed values, and consumers to every slot in use.
- [ ] Verify the intended value on the authoritative AD group.
- [ ] Select a non-privileged pilot group and record immutable source and Entra identifiers.
- [ ] Use Microsoft Graph v1.0 and explicitly select the group extension property.
- [ ] Record `onPremisesSyncEnabled` and `onPremisesLastSyncDateTime` with every value.
- [ ] Validate one source change through a normal synchronization cycle.
- [ ] Use only the least-privileged read permission documented for the exact query.
- [ ] Follow every `@odata.nextLink` during tenant-wide inventory.
- [ ] Preserve raw field names alongside friendly reporting labels.
- [ ] Keep secrets and sensitive personal data out of extension attributes and exports.
- [ ] Add validation, monitoring, and deny-by-default behavior before any authorization use.
- [ ] Recheck Microsoft Graph documentation before moving a preview or beta script to v1.0.

## Frequently asked questions

### Can I read group extensionAttribute1–15 from Microsoft Graph v1.0?

Yes. Request the group `onPremisesExtensionAttributes` property explicitly with `$select`. Microsoft added it to the v1.0 group resource in September 2026.

### Why does a normal Get-MgGroup call not show the values?

The group resource does not return this property by default. Include `onPremisesExtensionAttributes` in `-Property`, which maps to Graph `$select`, and inspect the nested returned object.

### Can I update a synchronized group's values through Microsoft Graph?

Do not assume so. The group resource defines these as values synchronized from on-premises Active Directory, and the current v1.0 update-group documentation does not list this complex property as a writable field. Update the authoritative source through the approved AD process and validate synchronization.

### Is this the same as a directory extension on a group?

No. A directory extension is registered by an application and has an application-derived property name. `onPremisesExtensionAttributes` is the fixed complex property containing the fifteen predefined slots.

### Can these values drive access decisions?

Technically, an application can consume directory metadata. Operationally, do not trust a generic string by itself for high-impact authorization. Govern the source, schema, allowed values, change path, monitoring, and failure behavior first.

The useful mental model is: **Graph v1.0 is now a supported window into synchronized group extension attributes, not a new source of authority**. Select the property, prove the object and sync state, govern every slot, and make downstream automation fail safely when the evidence is incomplete.

## Microsoft sources

- [Microsoft Graph September 2026 changes](https://learn.microsoft.com/en-us/graph/whats-new-overview#september-2026-new-and-generally-available)
- [Microsoft Graph v1.0 group resource](https://learn.microsoft.com/en-us/graph/api/resources/group?view=graph-rest-1.0)
- [Get a group with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/group-get?view=graph-rest-1.0)
- [List groups with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0)
- [Get-MgGroup command reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.groups/get-mggroup?view=graph-powershell-1.0)
- [Connect Sync attributes synchronized to Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-sync-attributes-synchronized)
- [Microsoft Graph extensibility options](https://learn.microsoft.com/en-us/graph/extensibility-overview)
- [Preserve a group's original OU with Cloud Sync](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-preserve-original-organizational-unit)
- [Use directory extensions with Cloud Sync group provisioning](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/tutorial-directory-extension-group-provisioning)
