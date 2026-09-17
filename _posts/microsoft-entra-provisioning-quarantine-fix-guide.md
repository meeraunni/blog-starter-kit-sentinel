---
title: "Microsoft Entra Provisioning Quarantine: Fix Guide"
excerpt: "Fix Microsoft Entra provisioning quarantine by finding the failed boundary, correcting credentials or SCIM errors, and restarting without widening impact."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-17T17:10:34-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra provisioning quarantine means the provisioning service has reduced a job's run frequency because the target is failing consistently or too many objects are failing. It is a protection state, not proof that Microsoft Entra stopped evaluating the job forever—and not a reason to click **Restart provisioning** before you understand the failure.

The safe recovery order is: preserve the evidence, identify the first broken boundary, correct it, prove the correction with a narrow test, and only then clear quarantine or restart the job. A restart launches a new initial cycle and reevaluates the full scope. That can be exactly what you need, but it also turns a small configuration mistake into a tenant-wide create, update, disable, or delete wave.

Grab a coffee before touching the restart button. The incident is usually recoverable. The dangerous part is confusing a quarantined control plane with a bad object, an expired target credential, a noncompliant SCIM response, or a scope change—and applying the wrong reset to all of them.

## Microsoft Entra provisioning quarantine: what changed

Microsoft's [application-provisioning quarantine reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/application-provisioning-quarantine-status) says a job enters quarantine when most or all calls to the target consistently fail, or when failure thresholds are exceeded. While the job is quarantined:

- incremental cycles are gradually reduced to once per day;
- a successful retry can automatically return the job to its normal schedule;
- unresolved quarantine continues retrying for up to 28 days; and
- after more than four weeks in quarantine, the job is disabled and stops running.

This guide focuses on automatic application provisioning jobs exposed under **Entra ID > Enterprise apps > _application_ > Provisioning**. Cloud Sync, cross-tenant synchronization, API-driven inbound provisioning, and on-premises ECMA connectors use the same synchronization-job control plane in places, but their source, agent, queue, and recovery details differ. Use their scenario-specific guidance before applying a general app-provisioning recovery step.

Microsoft does not publish a preview or rollout state for quarantine itself. It is an operating behavior of the provisioning service, not a feature you enable. The documented thresholds are approximate and Microsoft says the logic can differ for some connectors.

## First decide whether the job or one object is failing

A single failed user is not the same incident as a quarantined job. Classify what you see before changing anything:

- **Provisioning page explicitly shows Quarantine:** treat it as a job-wide health state. Record the quarantine reason, job ID, time, and last successful cycle.
- **Many failures share the same HTTP, credential, or connection error:** test the target credential and connector endpoint without changing scope.
- **Many failures share one missing or invalid source value:** fix the mapping or source population, then retest representative objects.
- **One user fails while the job remains healthy:** use on-demand provisioning and inspect that object's steps.
- **Users are skipped rather than failed:** inspect assignments, scoping filters, and matching—not quarantine.
- **The job is paused, stopped, or disabled with no quarantine reason:** verify who changed the job and use the correct start or enable procedure.

The [provisioning summary report](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/check-status-user-account-provisioning) calls **Current Status** the first place to check job health. Capture the current cycle, last successful cycle, source and target system, synchronized counts, and displayed reason before making a configuration change.

Then open **Entra ID > Monitoring & health > Provisioning logs**. Microsoft's [provisioning-log guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs) says Reports Reader is the least-privileged role for tenant-wide log access; application owners can view logs for applications they own. Filter to the affected application and time window, and download JSON or the full CSV set if the incident could become a support case.

Do not treat a skipped record as a failed export. Microsoft notes that out-of-scope or unchanged users can appear as skipped because of how the service reads directory changes.

## Read the quarantine reason before the object errors

The job status can expose one of three high-level reasons:

- `EncounteredQuarantineException`: the service could not establish the source-to-target connection, commonly because of invalid credentials;
- [EncounteredEscrowProportionThreshold](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/application-provisioning-quarantine-status#why-is-my-application-in-quarantine): enough provisioning events failed to cross the escrow threshold; or
- `QuarantineOnDemand`: Microsoft detected an application issue and placed it in quarantine.

For escrow-based quarantine, the current reference describes the approximate evaluation this way:

- evaluation generally starts at 5,000 failures;
- quarantine occurs when more than 40% of provisioning events fail or more than 40,000 non-reference failures occur; and
- an absolute threshold of 60,000 combined reference and non-reference failures also applies.

Reference failures such as a manager or group-member update do not count toward the 40% or 40,000 thresholds, but they do count toward the absolute 60,000 threshold. Those numbers are diagnostic context, not safe operating targets. A smaller job can still enter quarantine for invalid credentials, endpoint behavior, or connector-specific handling.

The retry cadence also matters during an incident. Microsoft documents retries roughly six hours after the first failure, 12 hours after the first failure, 24 hours after the first failure, and then every 24 hours. Do not wait for the next retry when joiners, movers, or leavers are accumulating. Equally, do not repeatedly start a running job: the [Graph start action](https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-start?view=graph-rest-1.0) explicitly warns that continuous start calls can cause the service to stop running.

## Find the first broken provisioning boundary

Provisioning is a chain:

1. Microsoft Entra selects an in-scope source object.
2. Mapping expressions produce the target attributes.
3. The connector authenticates to the target.
4. The target is queried by the configured matching attribute.
5. Microsoft Entra decides whether to create, update, disable, or skip.
6. The target accepts or rejects the operation.
7. The result, modified properties, and processing steps are written to the provisioning log.

Troubleshoot the earliest failed step, not the loudest downstream symptom.

### Credential or authorization failure

Reauthorize the connector with an account or token that is valid, not expired, and permitted to perform every required lifecycle operation. A successful interactive sign-in to the target does not prove the provisioning credential can query, create, update, and disable accounts through the target API.

Use **Test Connection** after correcting the secret, token, URL, or provider-side permission. Microsoft's [on-demand provisioning guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand) explains that the test authorizes to the target and queries for a test object. Passing it proves a narrow connection check; it does not prove every mapping, target license, role import, or lifecycle operation.

### SCIM endpoint or protocol failure

For a generic SCIM connector, compare the request and response with the target's contract. Microsoft's quarantine guidance calls out a `404 Not Found` where `200 OK` was expected as a common SCIM compliance problem. The provisioning-log reference also maps errors such as [SystemForCrossDomainIdentityManagementServiceIncompatible](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs#error-codes), `MethodNotAllowed`, `UnprocessableEntity`, and timeout conditions to target behavior or configuration.

Check:

- the tenant URL and base path;
- TLS and DNS reachability;
- bearer-token validity and audience;
- filtering on every configured matching attribute;
- unique results for filtered `GET` requests;
- supported `POST`, `PATCH`, and deactivate behavior;
- response status, content type, schema, pagination, and identifier stability; and
- target throttling, retry guidance, and response latency.

Do not change a matching attribute merely to make a test return one result. A new match rule can attach an Entra identity to the wrong target account.

### Mapping or source-data failure

Errors such as `MandatoryFieldsMissing`, `MissingValues`, `SchemaAttributeNotFound`, `InvalidDomain`, and `SchemaPropertyCanOnlyAcceptValue` point to the produced payload or target schema. Inspect the failed step and modified-property data, then compare a successful object with a failing object.

Correct the authoritative source when the data is wrong. Change a mapping only when the contract is wrong for the population. Before widening the fix, test null values, multi-valued attributes, long strings, diacritics, renamed users, disabled users, guests, and every role value the target accepts.

### Matching or duplicate failure

`DuplicateSourceEntries`, `DuplicateTargetEntries`, `EntryConflict`, and `InvalidAnchor` are identity-correlation problems. Resolve duplicates and confirm the immutable target identifier before forcing a new match. Microsoft's log guidance says `InvalidAnchor` can require a restart to rematch all users, but a restart also deletes the provisioning cache and can drop certain events. That is a recovery decision, not a routine retry.

Use the site's [account-discovery guide](/posts/microsoft-entra-account-discovery-orphan-accounts) when you need to reconcile existing target accounts before changing a match rule or allowing the connector to create replacements.

### Capacity, throttling, or target-license failure

`TooManyRequests`, `Timeout`, `InternalServerError`, and `LicenseLimitExceeded` require different owners. Preserve the target request ID and retry information, confirm the connector's documented retry behavior, and involve the application vendor when the target rejects valid SCIM traffic.

Adding licenses fixes a target-license ceiling; it does not correct scope. Before buying or assigning capacity, verify that the intended users are in scope and that the selected Entra app role maps to a valid target role.

## Start, restart, or wait: choose the smallest recovery

The [Microsoft Graph synchronization-job resource](https://learn.microsoft.com/en-us/graph/api/resources/synchronization-synchronizationjob?view=graph-rest-1.0) distinguishes two operations that the portal language can make easy to blur.

### Start the job

Use start when the root cause is fixed and you need a paused or quarantined job to continue from its persisted state. For a quarantined job, start clears the quarantine state. It does not intentionally discard the watermark and reevaluate the full directory.

```http
POST https://graph.microsoft.com/v1.0/servicePrincipals/{servicePrincipalId}/synchronization/jobs/{jobId}/start
```

The documented least-privileged delegated permission is `Synchronization.ReadWrite.All`. For application access, `Application.ReadWrite.OwnedBy` is least privileged when the app owns the target service principal; `Synchronization.ReadWrite.All` is the higher-privileged option. The supported delegated roles include Application Administrator, Cloud Application Administrator, and Hybrid Identity Administrator for Cloud Sync scenarios.

### Restart the job

Use restart when you deliberately need a new initial cycle—for example, after a mapping or scope correction that must reevaluate all objects, or when a documented error such as `InvalidAnchor` requires rematching.

```http
POST https://graph.microsoft.com/v1.0/servicePrincipals/{servicePrincipalId}/synchronization/jobs/{jobId}/restart
Content-Type: application/json

{
  "criteria": {
    "resetScope": "Watermark, Escrows, QuarantineState"
  }
}
```

Microsoft's [restart action reference](https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-restart?view=graph-rest-1.0) says this forces a stopped job to reprocess all directory objects. The [restart-criteria reference](https://learn.microsoft.com/en-us/graph/api/resources/synchronization-synchronizationjobrestartcriteria?view=graph-rest-1.0) warns not to clear `ConnectorDataStore` without Microsoft Support and explains that clearing escrows stops the service from retrying those failures.

The portal's **Restart provisioning** performs a broad restart: it clears escrows, quarantine, and watermarks, then runs a new initial cycle. Use it only after reviewing the full scope, mappings, and expected target actions.

### Wait for automatic recovery

Waiting is reasonable only when the root cause is fixed, the affected lifecycle backlog is acceptable, and you are actively watching the next retry. A successful retry can remove quarantine automatically. Waiting without evidence leaves joiners unprovisioned and leavers active for longer, while the cycle frequency decays toward once per day.

> [!IMPORTANT]
> **Analysis:** clearing quarantine without correcting the root cause does not restore service; it only gives the same failing configuration another opportunity to accumulate errors. Repeated clears can also hide the real incident duration from an operator who looks only at current status.

## Use a controlled recovery ring

Before a full restart, record a recovery manifest:

- service principal object ID and synchronization job ID;
- current scope mode, assigned groups, and scoping filters;
- matching attributes and precedence;
- enabled create, update, and disable operations;
- current mappings and target roles;
- quarantine reason and first-failure time;
- last successful cycle and last successful export;
- counts of expected creates, updates, disables, and skips; and
- target credential owner and expiry.

Then validate one object from each meaningful cohort with on-demand provisioning: a new user, an existing matched user, a mover whose mapped attributes changed, an out-of-scope user, and a disabled or removed user. On-demand provisioning is a diagnostic lens, not a replacement for watching the next scheduled cycle.

If the target population contains unmanaged accounts, reconcile them before recovery. The site's [cross-tenant synchronization guide](/posts/microsoft-entra-cross-tenant-synchronization) provides a useful model for treating source scope, matching, target objects, and deprovisioning as separate control points. For HR-driven inbound provisioning to Active Directory, use the [HiBob-to-AD provisioning guide](/posts/hibob-to-active-directory-provisioning-microsoft-entra) to account for the on-premises agent and downstream sync boundary as well.

After start or restart:

1. confirm that the job state changed as intended;
2. watch the first objects, not only the summary count;
3. compare planned and actual create, update, disable, and skip actions;
4. confirm successful exports in the target application;
5. monitor error percentage and repeated error classes;
6. verify that no excluded or privileged population entered scope; and
7. hold the rollout if target deletes, disables, duplicate creates, or match changes appear unexpectedly.

## Monitoring that catches quarantine before email does

Microsoft sends a one-time email when an application enters quarantine and another when the reason changes. Configure a valid notification address on every production provisioning job, allow mail from `azure-noreply@microsoft.com`, and use a monitored distribution list rather than an individual mailbox.

Email is not enough. Review current status and audit history, then route `ProvisioningLogs` through Microsoft Entra diagnostic settings to Log Analytics, Event Hubs, or Storage. Microsoft documents 30 days of provisioning-log retention for premium tenants and seven days for free tenants in the admin center. Longer retention requires an export path configured before the incident; retention changes are not retroactive.

Alert on operational symptoms that matter:

- quarantine or disabled job state;
- no successful export within the expected schedule;
- rising failure ratio or repeated credential errors;
- target `401`, `403`, `404`, `429`, and `5xx` responses;
- creates or disables outside the change window;
- duplicate and invalid-anchor errors;
- credential expiry approaching; and
- a growing gap between the authoritative source and target population.

Use `changeId`, `jobId`, source ID, target ID, and application ID in incident evidence. Microsoft recommends `changeId` as a support correlation key. Redact secrets, access tokens, and personal data before sharing logs with the application vendor.

## Rollback and escalation

Provisioning has no universal transaction rollback. A corrected mapping can restore future updates, but it does not automatically reverse a wrong target role, recreate a disabled account exactly as it was, or merge a duplicate created under a new identifier.

If recovery produces unexpected changes:

1. pause the job to preserve its state;
2. stop changing mappings and scope;
3. export the affected provisioning and audit records;
4. contain target-side access through the application's supported controls;
5. classify objects as created, updated, disabled, deleted, skipped, or unmatched;
6. agree on object-specific repair with the application owner; and
7. resume only after on-demand tests reproduce the intended result.

Escalate to the application vendor when valid requests receive undocumented statuses, filters return multiple or malformed objects, or the target fails its own SCIM contract. Escalate to Microsoft when the job state, Graph status, and provisioning logs disagree; a supported connector remains quarantined after the root cause is corrected; or the service reports an internal failure that survives a documented retry.

Provide the tenant ID, service principal object ID, job ID, UTC incident window, quarantine reason, last successful execution, sanitized failing and successful examples, `changeId` values, connector type, target response codes, and the exact start or restart action already attempted. Do not include credentials or raw bearer tokens.

## Administrator checklist

- [ ] Confirm that **Quarantine** is the current job state, not a single-object failure.
- [ ] Record the application, service principal object ID, job ID, reason, and timestamps.
- [ ] Export the provisioning steps and modified properties before changing configuration.
- [ ] Identify the first failed boundary: scope, mapping, credential, match, endpoint, or target capacity.
- [ ] Correct the root cause and pass **Test Connection** where applicable.
- [ ] Use on-demand provisioning for representative create, update, skip, and disable cases.
- [ ] Reconcile unmanaged and duplicate target accounts before changing match rules.
- [ ] Choose **start** to continue persisted state or **restart** only for a deliberate full reevaluation.
- [ ] Never clear `ConnectorDataStore` without Microsoft Support guidance.
- [ ] Review full scope and expected target actions before clearing a watermark.
- [ ] Monitor the first recovered cycle at object level.
- [ ] Confirm the target application—not only Entra—shows the intended state.
- [ ] Configure a shared notification address and long-term `ProvisioningLogs` export.
- [ ] Document containment, object-level repair, and escalation evidence.

## References

- [Application provisioning in quarantine status](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/application-provisioning-quarantine-status)
- [Report automatic user account provisioning](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/check-status-user-account-provisioning)
- [Analyze Microsoft Entra provisioning logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs)
- [Provision a user or group on demand](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand)
- [Microsoft Graph synchronization-job resource](https://learn.microsoft.com/en-us/graph/api/resources/synchronization-synchronizationjob?view=graph-rest-1.0)
- [Start a synchronization job](https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-start?view=graph-rest-1.0)
- [Restart a synchronization job](https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-restart?view=graph-rest-1.0)
- [Synchronization-job restart criteria](https://learn.microsoft.com/en-us/graph/api/resources/synchronization-synchronizationjobrestartcriteria?view=graph-rest-1.0)
- [Configure Microsoft Entra diagnostic settings](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-configure-diagnostic-settings)
