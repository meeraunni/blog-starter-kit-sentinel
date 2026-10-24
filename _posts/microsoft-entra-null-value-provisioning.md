---
title: "Microsoft Entra Null Value Provisioning: Admin Guide"
excerpt: "Enable Microsoft Entra null value provisioning safely across API-driven, Workday, and SuccessFactors inbound flows without accidentally clearing attributes."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-24T09:30:15-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra null value provisioning** lets a supported inbound provisioning job remove an existing target attribute when the source system returns that attribute as null or empty. The useful change is not that Entra can copy one more value. It is that Entra can now represent an intentional removal instead of silently leaving stale data behind.

The safe implementation is narrow: use the public preview only for an optional, single-valued attribute in a supported API-driven, Workday, or SAP SuccessFactors inbound flow; enable **Flow null values** on both the source schema attribute and target mapping; test one known object; and prove the empty result in both the provisioning log and target directory. Never enable it on a matching or creation-required attribute.

Grab a coffee before ticking the box across every mapping. For API-driven inbound provisioning, an omitted enabled attribute is treated as empty during an update. A partial payload can therefore erase a value that the sender merely forgot to include. That is a data contract change, not a cosmetic mapping option.

Microsoft announced the capability as **public preview** in the [October 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). It is opt-in, not default-on, generally available, or mandatory. This guide is based on current Microsoft documentation and operational analysis; it does not claim that the preview was reproduced in a production tenant for this article.

## Microsoft Entra null value provisioning: the safe path

Use this sequence before changing a production mapping:

1. Confirm that the job is one of the documented inbound integrations: API-driven provisioning, Workday, or SAP SuccessFactors to Microsoft Entra ID or on-premises Active Directory.
2. Choose one optional, single-valued attribute whose business meaning is genuinely “remove the target value when the source is empty.”
3. Exclude matching attributes, creation-required attributes, multivalued attributes, outbound application provisioning, Workday Writeback, and SuccessFactors Writeback.
4. Record the source schema entry, target mapping, current target value, matching key, scoping rules, job status, and recent provisioning-log baseline.
5. Confirm the source can distinguish a deliberate empty value from missing, unavailable, redacted, or not-yet-loaded data.
6. Enable **Flow null values** first on the source schema attribute and then on the corresponding target mapping. Both gates are required.
7. For API-driven provisioning, change the producer to send complete records and use explicit JSON `null` or an empty string for deliberate clearing. Do not rely on omission.
8. Test one known worker or API record with provision on demand where supported.
9. Verify the empty new value under **Modified properties**, then verify the attribute is actually absent in the target directory.
10. Observe at least one normal incremental cycle before widening the pilot. Watch failures, unexpected updates, job health, and downstream consumers.

Microsoft's dedicated [clear attribute values preview guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/clear-attribute-values) defines the supported scope, the two-gate configuration, the API omission behavior, and the verification path. The site's [provisioning quarantine guide](/posts/microsoft-entra-provisioning-quarantine-fix-guide) is the companion runbook if a broader mapping or connector problem starts driving repeated failures.

## Understand the control-plane change

Before this preview, administrators often had to choose between two imperfect outcomes when a source attribute became empty: preserve a stale target value, or invent a placeholder through an expression. Null value provisioning adds a third outcome for supported inbound flows: remove the mapped target value.

The decision still passes through the normal provisioning pipeline:

1. The connector imports the source object and its attributes.
2. The service identifies the target object through the configured matching attributes.
3. The source schema decides whether a null or empty value is eligible to flow.
4. The target mapping decides whether that eligible empty value may clear the target attribute.
5. The provisioning service issues the update and records the changed property.
6. The target directory and its downstream consumers interpret the missing value.

That last step matters. Clearing `department`, `division`, or `jobTitle` might be correct for the directory object while still changing dynamic-group membership, address-list behavior, application authorization, license assignment, workflow routing, or reporting. Microsoft Entra provisioning owns the attribute update; it does not validate every business rule that consumes the attribute afterward.

> [!IMPORTANT]
> **Analysis:** treat null as a business event with downstream consequences. “No value exists” is not automatically equivalent to “unknown,” “not applicable,” “temporarily unavailable,” or “the source did not send this field.” Write down which meaning the source guarantees before allowing it to delete the target value.

For a broader picture of how an HR source, provisioning service, and Active Directory target interact, read the site's [HiBob-to-Active Directory provisioning guide](/posts/hibob-to-active-directory-provisioning-microsoft-entra). Null clearing changes one mapping decision inside that lifecycle; it does not replace authoritative-source, matching, scoping, or downstream ownership design.

## Keep the preview boundary explicit

Microsoft currently documents null clearing only for these inbound paths:

- API-driven inbound provisioning to Microsoft Entra ID;
- API-driven inbound provisioning to on-premises Active Directory;
- Workday inbound user provisioning to Microsoft Entra ID;
- Workday inbound user provisioning to on-premises Active Directory;
- SAP SuccessFactors inbound user provisioning to Microsoft Entra ID; and
- SAP SuccessFactors inbound user provisioning to on-premises Active Directory.

The same preview page limits the feature to single-valued attributes. It explicitly excludes outbound application provisioning, Workday Writeback, SAP SuccessFactors Writeback, and multivalued attributes. It says the feature can be enabled for custom security attribute provisioning, but that does not expand support to unrelated connector directions or attribute types. ([Microsoft Learn: preview scope and limitations](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/clear-attribute-values#preview-scope-and-limitations))

There is a documentation boundary administrators should notice. Microsoft's generic [provisioning known-issues page](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/known-issues#attribute-mappings) still says a null user attribute is skipped. The newer dedicated preview documentation defines a scoped exception for the named inbound integrations when both null-flow gates are enabled.

The conservative interpretation is operationally useful:

- assume null values are skipped unless the exact connector direction is listed in the preview guide;
- do not generalize the preview to SaaS outbound provisioning, cross-tenant synchronization, Cloud Sync, or writeback;
- recheck the dedicated feature page before each rollout wave because preview scope can change; and
- preserve evidence of the exact connector, source schema, mapping, and observed result for support.

The dedicated preview page lists at least **Application Administrator**, an existing provisioning application, a source attribute in the application schema, and a corresponding target mapping as prerequisites. It does not publish a separate feature-specific licensing statement. Validate the preview's availability and the underlying connector licensing in the tenant rather than inferring a new SKU from the UI.

## Choose attributes that are safe to clear

A good pilot attribute has all of these properties:

- **Optional:** the target object remains valid without it.
- **Single-valued:** the preview does not support multivalued clearing.
- **Nonmatching:** the attribute does not identify or join the source object to the target.
- **Noncreating:** user creation does not require it.
- **Authoritative:** the source system owns the value and its removal.
- **Unambiguous:** null or empty always means remove, not not-yet-known or temporarily unavailable.
- **Observable:** the target state and affected downstream behavior can be checked.
- **Reversible:** the previous value can be restored from an approved source or recorded baseline.

Avoid enabling null flow for `employeeId`, `userPrincipalName`, mail identifiers, or any field used as a matching key merely because the control appears in the editor. Microsoft explicitly says not to enable clearing for attributes required to match or create a user. Its [attribute-mapping reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/customize-application-attributes) separately explains that every source user needs at least one populated matching attribute and that matching attributes must be unique and filterable by the target.

Also classify downstream dependencies. An optional directory attribute may be mandatory to another process. Before a pilot, search for dynamic groups, Conditional Access filters, entitlement policies, license rules, application mappings, Logic Apps, scripts, reports, and manual operating procedures that read it.

The site's [custom provisioning call-outs guide](/posts/microsoft-entra-custom-provisioning-callouts) covers a different intent: generating a create-time value through a Lifecycle Workflows extensibility workflow and Logic App. Use a custom call-out when supported business logic must produce a value; use null clearing when an authoritative source has deliberately removed one.

## Decide between clear, preserve, and default

For every candidate mapping, make one explicit choice.

**Clear the target value.** Enable null flow on both gates only when source null means the existing target value must be removed.

**Preserve the target value.** Keep null clearing disabled or use Microsoft's documented `IgnoreFlowIfNullOrEmpty` expression when an empty source value means “do not change what is already there.”

**Write a fallback value.** Use a supported expression such as `Switch` when the target requires a nonblank value and the organization has an approved placeholder. A fake phone number or invented department can create more risk than it removes, so the fallback needs a business owner.

**Default only on creation.** The mapping property's **Default value if null** applies when creating a user, not when updating an existing user. When null clearing is enabled, a later update clears the target value rather than reapplying that creation-time default. Microsoft documents this distinction in both the [clear-values guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/clear-attribute-values#how-attribute-values-are-cleared) and its [HR user-creation troubleshooting guidance](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/hr-user-creation-issues#null-and-empty-values-during-user-creation).

Do not blend these choices. “Clear,” “preserve,” “fallback,” and “creation default” are different lifecycle contracts. Record the chosen contract beside the mapping and test creation and update separately.

## Configure both Flow null values gates

In the Microsoft Entra admin center, open **Entra ID > Enterprise apps**, select the provisioning application, and go to **Provisioning > Attribute mapping**. Open the relevant object mapping.

First, expand **Advanced options** and open the source-attribute editor named for the connector. Enable **Flow null values** only for the selected source attribute and save.

Second, open the corresponding target attribute mapping, enable **Flow null values**, select **OK**, and save the mappings. Microsoft requires both settings. Enabling only the source gate does not authorize the mapped target attribute to be cleared; enabling only the target mapping does not make the source null eligible to flow. ([Microsoft Learn configuration steps](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/clear-attribute-values#enable-null-value-flow-for-the-source-attribute))

Record the exact pre-change and post-change mapping state. Microsoft notes that changing attribute mappings or scoping filters triggers a new initial cycle that clears the stored watermark and reevaluates source objects. Do not casually click **Restart provisioning** as an extra safety step: Microsoft says a restart also starts a full initial cycle. Plan for the blast radius and duration of reevaluation. ([How Microsoft Entra application provisioning works](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works))

## Treat API omission as a delete request

The most important API-driven rule is simple:

> Once null flow is enabled for an API source attribute, omitting that attribute during an update is treated as empty and clears the mapped target value.

Microsoft recommends sending the complete source user record in every full and delta `/bulkUpload` request and using explicit JSON `null` or an empty string for deterministic clearing. The payload must still include the matching attribute that identifies the existing target user. ([Microsoft Learn API-driven example and warning](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/clear-attribute-values#api-driven-provisioning-example))

That means the producer contract should distinguish three intentions before the preview is enabled:

- **Preserve:** send the current nonempty value.
- **Change:** send the new nonempty value.
- **Clear:** send explicit `null` or an empty string.

There is no safe fourth state where an enabled field is absent and the service guesses that the sender meant “leave it alone.” If a delta producer currently emits only changed fields, fix or front the producer before enabling null flow. Otherwise, the first ordinary partial update can erase every enabled-but-omitted attribute on that record.

> [!WARNING]
> Do not copy Microsoft's sample payload into production unchanged. Use the source schema names, matching key, and complete record contract for your provisioning application. A syntactically valid sample can still target the wrong user or clear the wrong fields when identifiers and mappings differ.

## Handle Workday and SuccessFactors differently

Workday and SAP SuccessFactors connectors retrieve the source record during a provisioning cycle; administrators do not submit `/bulkUpload` to clear the attribute. Workday uses XPath expressions and SuccessFactors uses JSONPath expressions to retrieve source values. The attribute must exist in the provisioning application schema and be returned by the connector before Entra can evaluate whether it is null or empty.

Microsoft's current [Workday integration reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/workday-integration-reference) and [SAP SuccessFactors integration reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/sap-successfactors-integration-reference) independently confirm that optional, single-valued inbound source attributes can clear their mapped target attributes under this preview.

For Workday, pay special attention to incremental detection. Microsoft says incremental sync reads changes recorded in the Workday transaction log. A source value can be empty in the HR interface while the connector's current transaction does not retrieve the change you expected. Use the imported-source evidence and provision-on-demand result instead of assuming the UI field is what the connector received.

For SuccessFactors, confirm the JSONPath returns the intended value and effective-dated record. A placeholder, whitespace, missing navigation path, or unexpected effective record is not automatically the same as an intentional empty value. Preserve the connector's imported attributes in your test evidence.

## Pilot one removal end to end

Microsoft recommends piloting automatic provisioning in a test environment with a small subset of users before scaling it. The [provisioning deployment plan](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/plan-auto-user-provisioning) also recommends testing every organizational use case and widening scope in controlled waves.

Use a test object with:

- a stable matching identifier;
- a known nonempty current value in the target;
- no production-critical downstream dependency;
- permission to change the authoritative source; and
- an approved expected empty state.

Then run this test matrix:

1. **Preserve:** send or retrieve the current nonempty value; expect no clear.
2. **Change:** replace it with another approved value; expect one targeted update.
3. **Clear:** make the source explicitly null or empty; expect the target attribute to be removed.
4. **Restore:** repopulate the approved source value; expect the target to receive it again.
5. **Creation:** create a test object with the source empty; verify the target behavior, including any creation-only default.
6. **Required or matching guard:** confirm those attributes never had null flow enabled.
7. **API omission:** in a nonproduction API test, prove what the producer sends for enabled fields during delta processing. Do not perform an omission test against a production object.

For Workday, search provision on demand with the worker ID or WID. For SuccessFactors, use `personIdExternal`. The [on-demand provisioning guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand) shows the import, scope, match, and final action stages and exposes the attributes the service attempted to modify.

## Verify logs and target state separately

A successful job status is not enough. In the provisioning event for the test object, open **Modified properties** and confirm that the intended target attribute has an empty new value. Then inspect the target directory and prove the attribute is absent there. Microsoft notes that for on-premises Active Directory, the service removes the value instead of writing an empty string. ([Microsoft Learn verification steps](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/clear-attribute-values#verify-the-attribute-was-cleared))

Capture these fields for the change record:

- UTC time window;
- provisioning application and job;
- source object and stable matching ID;
- target object ID;
- source attribute and observed source value;
- target attribute, old value, and empty new value;
- action, status, provisioning steps, and change ID;
- connector cycle type;
- operator and approved change record; and
- target-directory and downstream validation.

Microsoft's [provisioning-log analysis guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs) explains that CSV downloads separate the main event, provisioning steps, and modified properties, joined by change ID. It also documents 30 days of portal retention for premium tenants and seven days for free tenants, with diagnostic settings available for longer retention. Preserve the exact evidence window required by your audit and rollback plan.

## Roll back without creating a second incident

Rollback starts by stopping new unintended clears, not by restarting the job repeatedly.

1. Pause or contain the producer or source change that is generating incorrect nulls.
2. Preserve provisioning logs, target values, source payloads or connector evidence, mapping state, and UTC times.
3. Disable **Flow null values** on the affected target mapping and source schema attribute.
4. Restore each cleared value from the authoritative source or an approved baseline.
5. Test one known object before allowing normal cycles to continue.
6. Review every object processed since the change; a successful provisioning event can still be an undesired business change.
7. If the job entered quarantine, resolve the actual errors and follow the documented recovery path. Do not clear quarantine until the connector and mapping problem is fixed.

Disabling the feature prevents future null-driven clears; it does not reconstruct values already removed. Microsoft also notes that selecting **Stop** does not interrupt the cycle already in progress—it prevents future cycles after the current one completes. Factor that delay into containment. ([Known provisioning behavior](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/known-issues#service-issues))

## Troubleshoot the common failure patterns

### The null or empty value is ignored

Confirm **Flow null values** is enabled on both the source schema attribute and the target mapping. Verify the job direction is in the documented preview scope and the attribute is single-valued.

### The wrong target attribute is cleared

Stop widening the pilot. Compare the source schema name, target mapping, expression, and target object. Restore the approved value and correct the mapping before resuming.

### An API record clears values unexpectedly

Inspect the exact `/bulkUpload` payload. For every enabled attribute, omission is destructive during an update. Change the producer to send complete records and explicit nulls only for intentional removal.

### Workday or SuccessFactors shows empty, but the target does not clear

Use provision on demand and inspect the imported source attributes. Confirm the XPath or JSONPath retrieved the change, the source attribute is in the app schema, and the target mapping has the second gate enabled.

### Creation fails with an Active Directory syntax error

Do not assume enabling clear is always the answer. Microsoft's [HR creation troubleshooting guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/hr-user-creation-issues) separates three designs: clear an optional field, use a nonblank fallback for a required field, or preserve the existing value with `IgnoreFlowIfNullOrEmpty`. Choose based on the target schema and business contract.

### The provisioning job restarts or reevaluates more users than expected

Mapping and scoping changes can trigger a new initial cycle. Review the job status, scope, source-object count, and logs. Avoid another manual restart unless the documented recovery requires it.

### The job enters quarantine

Check the application provisioning status and audit history, then use provisioning logs to identify the cause. Microsoft's [quarantine documentation](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/application-provisioning-quarantine-status) says broad or persistent failures reduce cycle frequency and can eventually disable the job. Fix the mapping, schema, credentials, or target response before restarting.

## Microsoft Entra null value provisioning checklist

- [ ] Confirm the feature is still public preview and recheck its current supported scope.
- [ ] Confirm the connector is API-driven, Workday, or SuccessFactors inbound to Entra ID or Active Directory.
- [ ] Select one optional, single-valued, nonmatching, noncreating attribute.
- [ ] Define what null, empty, missing, unavailable, and placeholder mean in the source.
- [ ] Inventory dynamic groups, policies, apps, workflows, and reports that consume the attribute.
- [ ] Record the current mapping, scope, job status, target value, and rollback source.
- [ ] Enable **Flow null values** on both the source schema attribute and target mapping.
- [ ] For API-driven flows, require complete records and explicit nulls; never depend on omission.
- [ ] Test preserve, change, clear, restore, and creation behavior on one approved object.
- [ ] Verify both the provisioning-log modified property and the target-directory state.
- [ ] Observe a complete normal cycle before widening scope.
- [ ] Monitor unexpected clears, failures, job restarts, quarantine, and downstream effects.
- [ ] Keep the rollback owner, evidence window, and authoritative restoration source ready.

## Frequently asked questions

### Is Microsoft Entra null value provisioning generally available?

No. Microsoft's current feature page labels clearing attribute values as public preview. Preview is not default-on or mandatory, and its supported scope can change.

### Does an omitted API attribute preserve the existing target value?

Not when null flow is enabled for that source attribute. During an update, Microsoft says omission is treated as empty and clears the mapped target value. Send the complete record and use an explicit null or empty string only when deletion is intended.

### Can I clear a multivalued attribute?

No. The current preview supports only single-valued attributes.

### Can I enable it for outbound SaaS provisioning or HR writeback?

No. Microsoft's current preview excludes outbound application provisioning, Workday Writeback, and SAP SuccessFactors Writeback.

### Should I enable it for a matching attribute?

No. Microsoft explicitly warns not to enable clearing for attributes required to match or create a user. Losing the match key can turn an attribute-cleanup project into duplicate creation or failed reconciliation.

### Does disabling Flow null values restore cleared data?

No. Disabling the gates prevents later null-driven clears. Restore existing losses from the authoritative source or an approved baseline, then verify the target and downstream systems.

## The operating rule

Null value provisioning closes a real identity-lifecycle gap: when the authoritative system removes an optional value, the directory no longer has to carry stale data forever. The preview is useful precisely because it can delete data, and that is why it deserves a tighter rollout than an ordinary copy mapping.

Keep the contract explicit: one supported inbound connector, one optional single-valued attribute, two enabled gates, complete API records, one-object testing, two-layer verification, and a rehearsed restoration source. If the source cannot distinguish “delete this value” from “I did not send this field,” the integration is not ready for null clearing.

## Microsoft sources

- [Clear attribute values (Preview)](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/clear-attribute-values)
- [What's new in Microsoft Entra: October 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460)
- [Customize Microsoft Entra attribute mappings](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/customize-application-attributes)
- [On-demand provisioning in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand)
- [Analyze Microsoft Entra provisioning logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs)
- [Microsoft Entra ID and Workday integration reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/workday-integration-reference)
- [Microsoft Entra ID and SAP SuccessFactors integration reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/sap-successfactors-integration-reference)
- [Plan an automatic user provisioning deployment](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/plan-auto-user-provisioning)
