---
title: "Microsoft Entra Custom Provisioning Call-Outs Guide"
excerpt: "Deploy Microsoft Entra custom provisioning call-outs safely: scope create-only use, secure the Logic App, test failures, monitor logs, and roll back cleanly."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-15T09:14:06-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra custom provisioning call-outs** let a provisioning job send selected source attributes to a Lifecycle Workflows extensibility workflow, wait while an Azure Logic App runs custom business logic, and use the returned value for one target attribute. The safe use case is narrow: generate one deterministic value during an object's **create** event when Entra's built-in mapping expressions cannot implement the rule.

That sounds like a small extension point. Architecturally, it puts an Azure workflow directly in the identity-creation path. If the Logic App is unavailable, returns an invalid value, leaks employee data, or generates the same alias twice, the downstream account can fail before it exists.

Microsoft announced custom call-outs as **public preview** in the [October 2026 Microsoft Entra release roundup](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). Preview does not mean default-on, generally available, or mandatory. Microsoft has not published an enforcement deadline. An administrator must create the Logic App, custom extension, extensibility workflow, and attribute mapping, then start or continue the provisioning job.

Grab a coffee and treat the call-out as production code, not a clever expression box. The right design is deterministic, least privilege, observable, bounded by the provisioning job's scope, and reversible to a saved schema.

## Microsoft Entra custom provisioning call-outs: first decision

Start by deciding whether the custom call-out is actually the right mapping type.

| Requirement | Best fit |
| --- | --- |
| Copy or format values with supported provisioning expressions | Use a direct, constant, or expression mapping |
| Generate one value with business logic that built-in expressions cannot express | Consider a custom call-out pilot |
| Generate a value during an update or delete | Not supported by this preview |
| Use the generated value to match source and target objects | Not supported; keep a separate matching attribute |
| Run the call-out from Microsoft Entra Cloud Sync | Not supported |
| Generate several target attributes in one invocation | Redesign; the documented Logic App returns one value for one mapped target attribute |
| Set a custom security attribute | Microsoft does not explicitly support this scenario; do not make it a production design |

Microsoft's [custom call-out reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/extend-application-attributes) documents the supported provisioning flows as HR inbound, API-driven provisioning, SaaS outbound provisioning, and cross-tenant synchronization. It explicitly excludes Cloud Sync and limits the mapping to create events.

This article therefore has a different intent from the site's [Lifecycle Workflows introduction](/posts/what-are-entra-lifecycle-workflows-beginners-guide), which explains scheduled joiner, mover, and leaver automation, and the [Lifecycle Workflows safety-controls guide](/posts/microsoft-entra-lifecycle-workflows-safety-controls), which covers scope preview, thresholds, quarantine, and run cancellation. A provisioning call-out is a synchronous value-generation dependency inside a provisioning create operation.

## Understand the control plane before building

The data path has five parts:

1. A supported Microsoft Entra provisioning job evaluates one source object in scope.
2. The mapping for one target attribute invokes an extensibility workflow instead of calculating a direct or expression value.
3. The extensibility workflow runs its single supported task, **Run a Data-driven Custom Task Extension**.
4. The custom extension calls a consumption-based Azure Logic App and waits for its response.
5. The provisioning service applies the single returned value to the mapped target attribute, then continues the create operation.

The new workflow category is not a normal scheduled Lifecycle Workflow. Microsoft documents `provisioningAttributeMapping` as its only trigger type, one data-driven custom-extension task, `targetSubjectType` of `provisioningObject`, and scheduling disabled. It can run before an Entra user exists, which is why Microsoft uses unique alias generation as the example.

That boundary changes troubleshooting. An employee can be present in Workday, SuccessFactors, an API payload, another tenant, or an outbound source directory while no target account exists yet. A failed call-out is not necessarily a failed user sign-in, Conditional Access decision, or scheduled joiner workflow. Start with the provisioning record and Logic App invocation.

It also changes identity design. Microsoft says an attribute populated by this mapping cannot be used as a matching attribute. If the call-out generates `userPrincipalName`, use another stable source-to-target key for matching. The [attribute-mapping reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/customize-application-attributes) explains why matching must remain unique, present, and filterable by the target system.

> [!IMPORTANT]
> **Analysis:** a human-readable alias is usually a poor reconciliation key anyway. Names change, transliteration rules evolve, and collisions happen. Keep an immutable HR, source, or external identifier for matching; treat the generated alias as a create-time presentation value.

## Confirm preview, licensing, roles, and cost ownership

Before a prototype, confirm all four administrative planes:

- An **Azure subscription** and at least **Logic App Contributor** are required to create or configure the consumption Logic App.
- Microsoft documents an **Entra ID Governance license** and at least **Lifecycle Workflows Administrator** for the extensibility workflow.
- At least **Application Administrator** is required to configure the provisioning job and its attribute mappings.
- For inbound provisioning to on-premises Active Directory, Microsoft also requires **Hybrid Identity Administrator**.

These are creation and configuration permissions, not one permanent operator role. Separate the Logic App owner, Lifecycle Workflows owner, provisioning owner, security reviewer, and target-directory owner where practical. Time-bound the privileged roles through the organization's existing privileged-access process.

Consumption Logic Apps also create Azure usage and monitoring costs. Assign the Azure resource to an approved subscription, resource group, tags, budget owner, and operational support path before the provisioning team depends on it. The Entra license does not replace Azure resource governance.

No authenticated Microsoft 365 Message Center context was available for this review, so this guide does not claim a Message Center identifier, tenant rollout ring, or private deadline. Recheck the public-preview state and your tenant's **What's new** experience at change time.

## Design the function before the Logic App

Write the value contract in plain language before touching the designer. For a unique alias, define:

- the required inputs and their authoritative source;
- normalization for case, spaces, punctuation, diacritics, and unsupported characters;
- maximum length and target schema rules;
- reserved words and prohibited patterns;
- collision-detection source;
- deterministic suffix rules;
- the behavior for missing or malformed inputs;
- the one output type and format; and
- what the provisioning job should do when no safe value can be produced.

Do not use a random suffix as the first design choice. Provisioning services retry. A retry that receives a different alias can create confusing logs, break approval evidence, or make recovery depend on which attempt reached the target. Prefer a repeatable result for the same source object and approved inputs.

Collision handling must also be atomic enough for the workload. A Logic App that checks whether `jsmith` exists and then returns it can race with another invocation doing the same check. The durable uniqueness decision may need to live in a system that can reserve values, not in a read-then-return sequence. That is architectural analysis rather than a Microsoft product guarantee; the correct mechanism depends on the target system.

Minimize the inputs. The mapping lets administrators alias source attributes before passing them to the Logic App. Pass only fields the algorithm requires. Employee records can contain personal and regulated data, and Azure Logic Apps can retain trigger inputs and action outputs in run history unless secured appropriately.

## Secure the Logic App and call-out

Microsoft requires a **consumption-based** Logic App for this feature. The custom extension acts as the configured wrapper around that workflow, and the task behavior must be **Launch wait for result (Preview)** because provisioning needs the returned value.

For inbound authentication, new Lifecycle Workflows custom task extensions use proof-of-possession protection. Microsoft's [Logic App configuration guide](https://learn.microsoft.com/en-us/entra/id-governance/configure-logic-app-lifecycle-workflows) documents the required AAD PoP authorization policy, including the tenant issuer, Azure Resource Manager audience, calling application ID, HTTP method, host, and exact Logic App resource path. Do not reconstruct those claims from an old blog or another tenant.

Microsoft's [custom-extension security guidance](https://learn.microsoft.com/en-us/entra/id-governance/custom-extension-security) recommends five controls together:

1. secure administrative access to the Azure subscription;
2. disable shared access signature authentication for inbound calls;
3. use a managed identity for the Logic App's outbound authentication;
4. authorize that identity with least privilege; and
5. use proof-of-possession protection for the Entra-to-Logic-App call.

PoP protects the inbound invocation. It does not grant the Logic App permission to query a directory, database, or target API. Give the Logic App's managed identity only the read or write access required by the algorithm, at the smallest supported scope. Avoid stored client secrets when the downstream service supports managed identity.

Protect the data plane too. Microsoft's [Azure Logic Apps security guidance](https://learn.microsoft.com/en-us/azure/logic-apps/set-up-security-permissions) describes securing trigger inputs, action outputs, parameters, and run-history data. A technically successful workflow can still be unsafe if every employee's source attributes and generated identifiers are readable by a broad Azure operator group.

## Configure the preview in four controlled layers

### 1. Build a consumption Logic App that returns one value

Create the workflow in the approved Azure subscription and resource group. Implement the normalization, validation, collision, and error paths from the written contract. Return exactly the value type and format expected by the target attribute.

Test the Logic App independently with synthetic inputs. Include duplicate names, blank names, unsupported characters, very long values, reserved aliases, downstream timeouts, authorization failure, and a forced collision. Do not use production employee data to prove the algorithm.

### 2. Create the custom extension

In the Microsoft Entra admin center, browse to **ID Governance > Lifecycle workflows > Custom extensions**, add a custom extension, and select **Launch wait for result (Preview)**. Link the existing Logic App by subscription, resource group, and workflow name.

If configuring through Microsoft Graph, Microsoft's current reference uses `LifecycleWorkflows-CustomExt.ReadWrite.All` to create the extension. It also shows an Azure AD PoP authentication configuration and `replyMode` of `response`. Treat any timeout and retry values in Microsoft's sample as example configuration, not a universal default.

### 3. Create the real-time provisioning extensibility workflow

Browse to **ID Governance > Lifecycle Workflows > Create workflow**, choose the **Real-time Provisioning extensibility** template, and select the custom extension in the preconfigured data-driven task.

The corresponding Microsoft Graph path requires `LifecycleWorkflows-Workflow.ReadWrite.All`. Microsoft's example sets `continueOnError` to `false`; that matches the safer operating principle for an identity-creation value. Do not allow provisioning to continue with an unknown or invalid critical identifier merely to improve the success percentage.

### 4. Map one target attribute in the provisioning job

In **Enterprise apps > All applications > [application] > Provisioning > Attribute mapping**, edit the target attribute, choose **LCW extensibility workflow** as the mapping type, select the workflow, and define the minimum input attributes with clear aliases.

For Graph-managed schemas, Microsoft requires the mapping to be `ObjectAddOnly`, with `matchingPriority` set to `0`, the workflow GUID as the source expression and name, `LifecycleWorkflow` as the source type, and the source attributes in `parameters`. The schema update uses `Synchronization.ReadWrite.All` and replaces the schema through a `PUT` operation.

Before that `PUT`, export and securely retain the **entire current schema**. Microsoft explicitly recommends saving it before changes and says to submit the entire edited schema object, not one fragment. The saved schema is the clean configuration rollback.

## Run a five-stage pilot

### Stage 0: prove ordinary provisioning first

Start from a provisioning job whose source scope, matching attribute, create behavior, notifications, and target connector are already healthy. Capture a baseline create operation without the custom mapping. A new connector plus a new call-out creates too many simultaneous failure domains.

For an HR-to-AD scenario, the site's [HiBob-to-Active Directory provisioning guide](/posts/hibob-to-active-directory-provisioning-microsoft-entra) provides a broader pattern for source authority, agent placement, mapping, pilot scope, and target evidence. Keep the call-out change narrower than the provisioning deployment.

### Stage 1: test the algorithm outside provisioning

Run synthetic cases directly through the Logic App's approved test path. Confirm the same input always returns the same value, forbidden values fail closed, collision handling is repeatable, and logs do not expose more source data than the support team needs.

Capture the Logic App run identifier, input category, output, duration, and first failed action. Do not capture tokens, SAS URLs, or unnecessary employee attributes in the change record.

### Stage 2: use provisioning on demand for one disposable identity

Add the mapping while the job remains bounded to a test population. Use provisioning on demand for one synthetic identity if the connector supports it. Verify:

- the expected source attributes entered the mapping;
- one Logic App run occurred;
- the returned value matches the contract;
- the provisioning log records the intended target attribute;
- the target object was created once;
- the immutable matching attribute is correct; and
- a retry does not produce a different identifier.

Microsoft's [provisioning-log guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs) documents the portal, Graph, Azure Monitor, workbook, CSV, and JSON paths for reviewing provisioning events. Reports Reader is the least-privileged role it lists for tenant-wide provisioning logs; application owners can view logs for applications they own.

### Stage 3: force every failure path

Use synthetic identities to force missing inputs, a duplicate candidate, target rejection, a Logic App timeout, an authorization failure, and a malformed response. Confirm the provisioning operation fails visibly and the notification route reaches the correct owner.

Then repair the dependency and retry through the connector's documented recovery path. Do not repeatedly restart a production job without understanding its connector-specific queue behavior. Microsoft's [provisioning architecture reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works) explains that operations appear in provisioning logs and that persistent high error rates can quarantine a job.

### Stage 4: a small scheduled or incremental cohort

Expand to a few low-risk create events from one business unit or test source population. Reconcile source object, Logic App run, extensibility workflow, provisioning log, target object, and generated value for every pilot identity.

Measure latency rather than promising a fixed completion time. The call-out adds a networked Azure dependency to each create event, and end-to-end duration depends on the provisioning flow, Logic App, downstream calls, throttling, and target connector.

### Stage 5: expand only with operating evidence

Increase scope by a controlled cohort after successful creates, expected failures, retries, alerts, and rollback have all been observed. Keep the prior mapping and schema export until the preview has passed the organization's full acceptance and change window.

## Monitor three evidence layers

**Provisioning evidence:** use the provisioning job status and logs to see which source object was evaluated, which action Entra attempted, which target attributes were produced, and where the operation failed.

**Workflow evidence:** use Lifecycle Workflows history and audit events for workflow and task activity. Microsoft's [Lifecycle Workflows history reference](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-history) separates user, run, and task summaries and points to detailed audit logs for service actions.

**Azure evidence:** use Logic App run history, action status, duration, managed-identity authentication results, dependency response, and Azure resource changes. Export or route the evidence required by the organization's retention policy; do not assume interactive portal history is a permanent audit archive.

Alert on these conditions:

- call-out failures or timeouts above the pilot baseline;
- provisioning creates that fail on the mapped target attribute;
- duplicate or invalid generated values;
- the provisioning job entering quarantine or stopping;
- unexpected changes to the schema, workflow, custom extension, Logic App, authorization policy, managed-identity role assignments, or SAS setting;
- a sudden increase in Logic App executions relative to source create volume; and
- Logic App calls or downstream access outside the approved subscription, identity, or endpoint boundary.

Use one correlation record per source object: source ID, provisioning job and event identifiers, UTC time, workflow and custom-extension IDs, Logic App run ID, target object ID when created, and the sanitized failure. Never place bearer tokens, PoP tokens, trigger URLs, or personal data beyond the approved minimum in a support ticket.

## Troubleshoot from the first broken boundary

### The LCW extensibility mapping option is missing

Confirm the tenant has the required Entra ID Governance license, the administrator holds the documented roles, the flow is HR inbound, API-driven, SaaS outbound, or cross-tenant synchronization, and the event is a create. Cloud Sync is not supported.

### The attribute cannot be selected for matching

That is a documented limitation. A target attribute generated by the custom call-out cannot also be a matching attribute. Restore a stable source-to-target matching key instead of editing the schema to bypass the guardrail.

### The Logic App never starts

Check that the custom extension points to the intended subscription, resource group, and workflow; the consumption Logic App still exists; the request trigger and PoP authorization policy match Microsoft's required claims exactly; SAS is not being used as a fallback; and the extensibility workflow task references the correct extension ID.

### The Logic App runs but provisioning fails

Compare the returned value with the target attribute's type, length, allowed-character, uniqueness, and required-value rules. Then inspect the provisioning log's modified properties and target response. A green Logic App run proves only that the workflow completed; it does not prove the target accepted the value.

### Existing users do not receive the new value

The preview mapping is create-only. It does not run on update or delete events. Do not force recreation of production identities to backfill an attribute. Use a separately designed, supported remediation process for existing objects.

### Retries produce inconsistent values

Stop expanding the pilot. Make the algorithm deterministic for the same source identity and inputs, or introduce an authoritative reservation store. Clean up any partial target objects only through the connector and target system's supported recovery procedure.

### The provisioning job enters quarantine

Inspect the provisioning logs for the shared root cause before restarting. Correct the Logic App, authorization, mapping, or target rejection, then use the connector's documented restart or retry behavior. Restarting is not a substitute for fixing a call-out that fails every object.

## Roll back without creating a second identity

Rollback should remove the dependency before it removes evidence:

1. Pause or bound new create events through the provisioning job's supported control.
2. Export provisioning failures and Logic App run evidence for the change window.
3. Restore the saved, known-good provisioning schema or replace the target mapping with its approved prior mapping.
4. Confirm the custom call-out no longer appears in the effective mapping.
5. Test one synthetic create through the restored path.
6. Reconcile every pilot source object with the target so that partial, duplicate, or missing identities are handled explicitly.
7. Disable or retire the extensibility workflow and Logic App only after no provisioning job references them and retention requirements are satisfied.

Do not delete the Logic App first. That converts a controlled mapping rollback into a new outage for every in-scope create. Do not change the generated attribute into a matching attribute during recovery. And do not assume restoring the schema recalculates users already created—the feature is create-only.

> [!IMPORTANT]
> **Analysis:** if the generated value is an identifier consumed by email, applications, scripts, or people, changing it after creation can be more disruptive than leaving a technically imperfect but unique value in place. Make per-object remediation a target-system decision, not an automatic consequence of rolling back the mapping.

## Administrator checklist

- [ ] Record that custom provisioning call-outs are public preview, opt-in, and create-only.
- [ ] Confirm the flow is supported and is not Microsoft Entra Cloud Sync.
- [ ] Define one primary target attribute and keep a separate immutable matching attribute.
- [ ] Document normalization, length, reserved-name, collision, and missing-input rules.
- [ ] Make the result deterministic across retries.
- [ ] Confirm Entra ID Governance licensing, Azure subscription ownership, and least-privilege roles.
- [ ] Use a consumption Logic App and **Launch wait for result (Preview)**.
- [ ] Configure the documented PoP authorization policy and disable inbound SAS authentication.
- [ ] Use managed identity and least privilege for downstream access.
- [ ] Minimize source attributes and protect Logic App inputs, outputs, and run history.
- [ ] Export the complete provisioning schema before changing it.
- [ ] Test the Logic App with synthetic inputs before connecting provisioning.
- [ ] Pilot one disposable create and verify source, workflow, provisioning, and target evidence.
- [ ] Force timeout, authorization, collision, invalid-output, and target-rejection paths.
- [ ] Alert on failure rate, quarantine, configuration drift, and execution-volume anomalies.
- [ ] Keep a known-good schema rollback and reconcile every pilot identity after recovery.
- [ ] Recheck preview status, licensing, limits, and documentation before wider rollout.

## FAQ

### Can a custom call-out update an existing user's alias?

No. Microsoft currently supports the LCW extensibility workflow mapping only on create events, not updates or deletes.

### Can the generated `userPrincipalName` also match the source and target user?

No. An attribute populated by this mapping cannot be a matching attribute. Use a separate stable identifier for reconciliation.

### Does this work with Microsoft Entra Cloud Sync?

No. Microsoft lists HR inbound, API-driven provisioning, SaaS outbound provisioning, and cross-tenant synchronization as supported, and explicitly excludes Cloud Sync.

### Does the Logic App need a client secret?

Not for downstream services that support managed identity. Microsoft recommends managed identities and least-privilege authorization. The inbound Lifecycle Workflows call should use the documented PoP authorization configuration rather than a shared SAS fallback.

### What should I send to support?

Include the provisioning flow and job ID, source object ID, UTC timestamp, target attribute, workflow and custom-extension IDs, Logic App run ID, sanitized error, provisioning log event, target response, preview state, and whether a synthetic retry returns the same value. Do not include tokens, trigger URLs, secrets, or unnecessary employee attributes.

## Microsoft sources

- [What's new in Microsoft Entra: October 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460)
- [Extend attribute mappings with custom call-outs](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/extend-application-attributes)
- [Customize provisioning attribute mappings](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/customize-application-attributes)
- [Lifecycle Workflows custom task extensions](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-extensibility)
- [Configure a Logic App for Lifecycle Workflows](https://learn.microsoft.com/en-us/entra/id-governance/configure-logic-app-lifecycle-workflows)
- [Secure custom extensions for Azure Logic Apps](https://learn.microsoft.com/en-us/entra/id-governance/custom-extension-security)
- [Secure access and data in Azure Logic Apps](https://learn.microsoft.com/en-us/azure/logic-apps/set-up-security-permissions)
- [Analyze Microsoft Entra provisioning logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs)
- [Understand how Microsoft Entra application provisioning works](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works)
- [Lifecycle Workflows history](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-history)

Microsoft Entra custom provisioning call-outs solve a real gap: create-time business logic that built-in attribute expressions cannot express. Keep the design smaller than the feature makes possible. One value, one deterministic contract, one least-privilege Logic App, one bounded pilot, and one saved schema rollback are the difference between useful extensibility and a fragile identity-creation dependency.
