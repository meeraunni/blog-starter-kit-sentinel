---
title: "Microsoft Entra PIM API Migration Before Retirement"
excerpt: "Migrate Microsoft Entra PIM Iteration 2 APIs before October 28, 2026: inventory legacy calls, map replacements, test permissions, and cut over safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-19T09:35:44-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra PIM API migration is now deadline work. On **October 28, 2026**, the deprecated Privileged Identity Management Iteration 2 beta APIs stop returning data. Any inventory, activation, assignment, approval, policy, or reporting workflow that still depends on the retired API family can fail after that date.

The fix is not a global change from `beta` to `v1.0`. You have to route each workload to the current provider-specific control plane: **Microsoft Graph for Microsoft Entra roles, Microsoft Graph for PIM for Groups, and Azure Resource Manager for Azure resource roles**. Microsoft's [PIM API concepts page](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-apis) identifies those three providers and marks the current assignment APIs as generally available. Microsoft's [retirement notice](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new-archive#october-2025) says Iteration 2 calls will fail after the deadline.

Grab a coffee before changing an endpoint in production. This migration also changes resource models, token audiences, permissions, query shapes, and the meaning of “current assignment.” A successful HTTP response is not enough; the replacement must produce the same privileged-access outcome and audit evidence.

This guide is source-derived and does not claim a tenant-specific lab run. Use a nonproduction principal, a low-impact role, and your organization's privileged-change process for the write tests.

## Microsoft Entra PIM API migration: what must change

Iteration 2 lives under the Microsoft Graph `/beta/privilegedAccess` family. Microsoft documents `/aadRoles` and `/azureResources` as its two legacy provider segments and says the endpoint will stop returning data on October 28, 2026. Microsoft also says not to start new development on it. The [Iteration 2 reference carries the same retirement warning](https://learn.microsoft.com/en-us/graph/api/resources/privilegedidentitymanagement-root?view=graph-rest-beta) and points Azure resource automation to Azure Resource Manager and Entra role automation to the current PIM APIs.

Treat these as high-confidence legacy indicators:

- `https://graph.microsoft.com/beta/` plus `privilegedAccess/aadRoles`
- `https://graph.microsoft.com/beta/` plus `privilegedAccess/azureResources`
- Iteration 2 types such as `governanceRoleAssignment`, `governanceRoleAssignmentRequest`, `governanceRoleSetting`, or `privilegedRoleAssignmentRequest`
- code that explicitly registers or onboards an Azure resource in PIM before managing it

Do not search for the word `privilegedAccess` alone. The current PIM for Groups path legitimately runs through `identityGovernance`, `privilegedAccess`, and `group`. Search for the complete legacy namespace and old resource types, then inspect every match.

```bash
rg -n -i \
  'graph\.microsoft\.com/beta/privilegedAccess/(aadRoles|azureResources)|governanceRole(Assignment|Setting)|privilegedRoleAssignmentRequest' \
  .
```

That repository search is only a starting point. Also inspect automation accounts, Azure Functions, Logic Apps, runbooks, CI/CD variables, API Management policies, integration-platform connectors, scheduled jobs, packaged vendor products, Graph SDK wrappers, monitoring queries, and service-desk tooling. A retired call hidden in a weekly access report is still a production dependency.

### Resolve Microsoft's “Groups” wording precisely

The retirement announcement describes affected automation for Azure resources, Microsoft Entra roles, and Groups. The detailed API-history page defines the retired Iteration 2 namespace by the `/aadRoles` and `/azureResources` segments, while the current PIM for Groups API uses a different v1.0 path.

That wording is a reason to inventory by **actual request URL and API version**, not by workload label. A group workflow on Graph v1.0 using the `identityGovernance` → `privilegedAccess` → `group` path is on the documented current surface. If it uses a beta route or an old SDK model, validate the exact operation against today's v1.0 reference and move it where v1.0 is available. Do not declare every “PIM for Groups” integration safe or broken from its name alone.

## Map each legacy workflow to the right control plane

Build three migration tracks. Combining them behind one old abstraction can hide permission and state-model differences that matter during a privileged change.

### Microsoft Entra roles move to Microsoft Graph v1.0

Use the `/roleManagement/directory` family for Microsoft Entra directory roles. Under that base path, use:

- active assignment requests: `roleAssignment` → `ScheduleRequests`
- eligible assignment requests: `roleEligibility` → `ScheduleRequests`
- current active assignment instances: `roleAssignment` → `ScheduleInstances`
- current eligible assignment instances: `roleEligibility` → `ScheduleInstances`
- role settings: `unifiedRoleManagementPolicy` and its policy-assignment collection

Microsoft's [current Entra role PIM API overview](https://learn.microsoft.com/en-us/graph/api/resources/privilegedidentitymanagementv3-overview?view=graph-rest-1.0) maps assignment, eligibility, policy, alert, and audit scenarios to their resources. The v1.0 [role eligibility request reference](https://learn.microsoft.com/en-us/graph/api/rbacapplication-list-roleeligibilityschedulerequests?view=graph-rest-1.0) also documents the request path, permissions, national-cloud availability, and response shape.

The important design split is **request versus state**. A request records an operation such as `adminAssign`, `selfActivate`, `adminRemove`, `adminExtend`, or `adminRenew`. A schedule represents the assignment lifecycle, and an instance represents access effective now. If the old integration used one collection both as workflow history and current-state inventory, replace it with separate queries and reconciliation logic.

### Azure resource roles move to Azure Resource Manager

Azure subscription, management-group, resource-group, and resource PIM no longer belong in Microsoft Graph. Use the `Microsoft.Authorization` resources through `https://management.azure.com`:

- eligible writes: `roleEligibilityScheduleRequests`
- active writes: `roleAssignmentScheduleRequests`
- current eligible state: `roleEligibilityScheduleInstances`
- current active state: `roleAssignmentScheduleInstances`
- settings: `roleManagementPolicies` and `roleManagementPolicyAssignments`

Microsoft's migration table says Resource Manager does not require the legacy explicit resource-registration step; you operate directly at the Azure scope. It also maps legacy role-assignment requests to eligible or active schedule requests and maps legacy settings to ARM policies. The [Azure PIM REST guide](https://learn.microsoft.com/en-us/rest/api/authorization/privileged-role-eligibility-rest-sample) documents scope shapes, list filters, write operations, and common policy-validation failures.

This track needs a different access token audience and authorization model from Microsoft Graph. A token intended for `https://graph.microsoft.com` cannot be reused as an ARM token. Microsoft says callers need Azure Resource Management consent and that write operations require the caller to hold an appropriate role at the target scope; Owner and User Access Administrator include the necessary role-assignment write operation. Preserve the smallest possible scope instead of granting tenant-wide Graph permissions to solve an Azure RBAC problem.

### PIM for Groups uses Microsoft Graph v1.0

For eligible or active membership and ownership, use the Graph v1.0 path through `identityGovernance`, `privilegedAccess`, and `group`:

- active membership or ownership requests: `assignmentScheduleRequests`
- eligibility requests: `eligibilityScheduleRequests`
- current active state: `assignmentScheduleInstances`
- current eligible state: `eligibilityScheduleInstances`

The current v1.0 [PIM for Groups assignment request reference](https://learn.microsoft.com/en-us/graph/api/privilegedaccessgroup-post-assignmentschedulerequests?view=graph-rest-1.0) documents the endpoint, `member` and `owner` access IDs, actions, response, and least-privileged permission family. It also separates the Graph permission from the signed-in administrator's role requirements for delegated calls.

Do not translate an Entra role payload into a group payload mechanically. Entra roles use `roleDefinitionId` and `directoryScopeId`; PIM for Groups uses `groupId` and `accessId`; Azure resource roles use an ARM scope and a fully qualified Azure role-definition resource ID.

## Five migration traps that cause silent access drift

### 1. Requests are not the current assignment inventory

A request can be Pending, Provisioned, Denied, Revoked, Failed, or Canceled. It is evidence of an attempted operation, not proof that access is active at the time of your query. Current PIM APIs distinguish:

- `*ScheduleRequest`: an operation and its workflow status;
- `*Schedule`: the assignment lifecycle, including future assignments; and
- `*ScheduleInstance`: an assignment effective now.

Microsoft's PIM API concepts page says schedule instances show current assignments, while schedules can also include assignments that become active later. Build the validation contract from the business question. “Did the request complete?” and “Does the principal have access now?” require different queries.

### 2. Permissions do not migrate one-for-one

Re-consent only the replacement application's documented minimum permissions. For example, the current Entra role eligibility request API lists `RoleEligibilitySchedule.` `ReadWrite.Directory` as its least-privileged permission for delegated and application access, with `RoleManagement.ReadWrite.Directory` as a broader alternative. Current PIM for Groups writes use the `PrivilegedAssignmentSchedule.` `ReadWrite.AzureADGroup` permission family. Azure resource PIM uses Azure RBAC at scope rather than Microsoft Graph application permissions.

App-only support is available in the current PIM APIs, but it is not an excuse to preserve an oversized grant. Inventory the old service principal, credential type, owners, consent grants, Azure role assignments, sign-in activity, and last observed call before approving the replacement. The site's [service-principal creation audit guide](/posts/microsoft-entra-service-principal-creation-audit) is useful when ownership or provenance is unclear.

### 3. Query parameters and identifiers have changed

Do not carry a legacy filter, expansion, or resource identifier into the new API without checking its reference. Graph request collections and ARM scope collections support different filters. Azure role definition IDs are ARM resource IDs; Entra role definition IDs are directory objects. PIM for Groups requires a `groupId` and `accessId` of `member` or `owner`.

Capture an identifier crosswalk for every test case:

- tenant ID and cloud;
- principal object ID and principal type;
- provider: Entra role, Azure resource role, or group;
- role definition ID or group ID;
- directory scope or ARM scope;
- access kind: active or eligible;
- action and expected duration; and
- legacy request ID, replacement request ID, schedule ID, and instance ID.

### 4. Not every adjacent API is generally available

Microsoft labels the current assignment APIs for Entra roles, Azure resources, and Groups as generally available. The same overview labels PIM alerts as preview and notes that `roleAssignmentApprovals` APIs are available only in `/beta`.

So “Iteration 3 is current” does not mean every related endpoint can be switched to v1.0. Split the dependency inventory by operation. Migrate the retired assignment and policy surface now, but record any required approval or alert operation that remains preview, its support boundary, its owner, and its contingency. Never disguise a remaining beta dependency by placing it behind a v1.0-named internal wrapper.

### 5. A 2xx response can still violate policy intent

PIM evaluates role-management policy. A request can fail because the duration exceeds the allowed maximum, justification or ticket information is missing, an eligibility does not exist, approval is required, or authentication requirements are unsatisfied. The Azure REST guide documents the `RoleAssignmentRequest` `PolicyValidationFailed` error family; the Entra role API uses the same schedule-request design principle.

Your migration test must compare more than response codes. Compare principal, role, scope, active-versus-eligible state, start and end times, policy result, approval path, audit actor, and final schedule instance.

## Build an evidence-backed migration inventory

Create one record for every caller and every distinct operation. At minimum, capture:

- application or script name, repository, runtime, environment, business owner, and technical owner;
- schedule, trigger, calling identity, credential type, and credential expiry;
- exact URL, API version, method, query parameters, request body shape, and SDK or module version;
- Graph permissions, Azure role assignments, delegated administrator roles, and target scopes;
- operation type: inventory, assignment, eligibility, activation, deactivation, policy, approval, alert, or audit;
- downstream consumer and consequence if the call returns no data;
- normal call frequency, last success, last observed legacy call, and evidence source; and
- replacement endpoint, migration status, test result, rollback owner, and cutover deadline.

Source-code search cannot find a URL assembled at runtime or a connector configured in a portal. Correlate repository results with API gateway logs, application sign-ins, workload logs, job history, network telemetry, and vendor attestations. Keep secrets, tokens, request bodies containing personal data, and full privileged inventories out of the migration worksheet.

**Analysis:** prioritize silent read failures ahead of obvious write failures. A failed assignment job usually creates a ticket. A compliance report that quietly returns an empty set can falsely state that no privileged assignments exist.

## Migrate in rings, not in one endpoint swap

### Ring 0: freeze and baseline

Stop new Iteration 2 development. Freeze the caller inventory and record successful legacy results for controlled test cases. Export only the minimum fields needed to compare state, and protect the export as privileged-access data.

For each provider, establish test cases for:

1. list current eligible access;
2. list current active access;
3. read role or group policy;
4. create one short, low-impact eligible assignment;
5. activate it if the workflow requires activation;
6. observe approval or policy enforcement where configured;
7. deactivate or remove it; and
8. prove the final state and audit record.

### Ring 1: create separate read-only clients

Build provider-specific readers first. Request the correct token audience, apply the documented least privilege, handle paging and throttling, and normalize results only after you preserve provider-native identifiers.

Run legacy and replacement reads close together, then classify differences. Expected differences include renamed fields, request-versus-instance semantics, future schedules appearing in a schedule collection, inherited Azure scope, or group-derived access. Unexpected missing principals, roles, scopes, expirations, or policies block the migration.

Do not compare only row counts. A row-count match can hide one missing Global Administrator and one duplicated low-impact assignment.

### Ring 2: test one reversible write per provider

Use a test principal and a role or group with minimal blast radius. Submit a time-bound request, preserve its request ID, wait for its terminal status, and query the resulting schedule instance. Verify the portal and audit record as independent evidence.

For Azure resources, test at the intended ARM scope. For Entra roles, confirm `directoryScopeId`. For PIM for Groups, test member and owner flows separately only if both exist in production. Do not use Global Administrator, Privileged Role Administrator, Owner, or User Access Administrator as a convenient smoke-test role.

The site's [PIM activation failure guide](/posts/microsoft-entra-pim-activation-failed) explains how to separate request validation, approval, authentication, assignment creation, and workload propagation when a canary does not complete.

### Ring 3: shadow production reads

Run replacement readers without feeding their output into enforcement, removal, approval, or compliance decisions. Compare provider-native results and investigate every unexplained delta. Monitor permission errors, policy-validation failures, throttling, paging gaps, token-audience errors, latency, and missing audit correlation.

### Ring 4: controlled cutover

Cut over one caller at a time. Keep the reviewed old implementation available for rollback before October 28, but do not let both writers operate on the same assignment stream. Dual writes can create duplicate requests, conflicting removals, or misleading audit history.

Rollback means routing the caller back to its last reviewed implementation during the pre-retirement window. It does not mean assuming the retired API will work after October 28. After the replacement proves stable, disable the old schedule or deployment and preserve evidence of the last legacy call.

## Validate outcomes and audit evidence

For every migrated operation, retain a compact evidence package:

- legacy caller and exact deprecated endpoint;
- replacement provider, endpoint, API version, and token audience;
- old and new permission grants or Azure role assignments;
- test principal, role or group, scope, assignment kind, and schedule;
- request ID, status, schedule ID, instance ID, and timestamps in UTC;
- portal state and Microsoft Entra or Azure audit record;
- read-parity result and explanation for every accepted difference;
- negative test result for unauthorized scope or missing permission;
- cutover time, last observed legacy call, monitor owner, and rollback window.

PIM operations for Microsoft Entra roles are written to Microsoft Entra audit logs, and Microsoft's current API overview points to the directory-audits API for retrieval. Azure resource PIM changes also belong in the Azure control plane's activity and authorization evidence. Preserve both when an automation spans providers; a Graph audit cannot prove an ARM write.

Monitor the retired signatures after cutover. Alert on any request containing the `beta/privilegedAccess` path followed by either `aadRoles` or `azureResources`, and include caller identity, workload, environment, operation, timestamp, and owner. A falling count is not the finish line. The finish line is **zero unexplained calls from every production and disaster-recovery path**.

## Troubleshoot the replacement by failure layer

- **401 Unauthorized:** verify the token audience, tenant, cloud endpoint, credential validity, and requested application permission or delegated scope. A Graph token sent to ARM is the wrong token even if the identity is correct.
- **403 Forbidden:** verify admin consent or the caller's directory role for Graph; for ARM, verify the caller's Azure role assignment at the exact target scope and inheritance path.
- **404 or empty collection:** verify provider, API version, scope construction, identifier type, filter, and whether you queried requests, schedules, or instances. Do not interpret empty as compliant until the query is proven.
- **400 policy validation failure:** compare duration, justification, ticket, eligibility, activation, MFA, approval, and role-management policy requirements.
- **Request is Provisioned but access appears missing:** query the relevant schedule instance, then validate scope and the target workload's session or authorization cache.
- **Legacy and replacement counts differ:** compare individual principal-role-scope tuples, future schedules, inherited access, group-derived access, paging, and filters before accepting the result.
- **Group migration is ambiguous:** record the full URL and version. Validate the operation against the current v1.0 PIM for Groups reference instead of relying on the generic product label.

If you must escalate, include sanitized request and response metadata, UTC time, request and correlation IDs, provider, tenant, target scope, caller object ID, permissions or Azure role, expected outcome, actual outcome, and the smallest reproducible case. Do not attach bearer tokens or client secrets.

## Microsoft Entra PIM API migration checklist

- [ ] Confirm the October 28, 2026 retirement date in current Microsoft documentation and tenant communications.
- [ ] Search for the complete legacy `beta/privilegedAccess` signatures ending in `aadRoles` or `azureResources`.
- [ ] Inventory hidden portal, runbook, connector, vendor, monitoring, and disaster-recovery callers.
- [ ] Separate Entra roles, Azure resource roles, and Groups into provider-specific tracks.
- [ ] Map request, schedule, and schedule-instance queries to the business question they answer.
- [ ] Request the correct Graph or ARM token audience.
- [ ] Replace legacy Graph grants with documented least-privileged permissions or Azure RBAC at scope.
- [ ] Record remaining approval or alert beta dependencies instead of calling them GA.
- [ ] Prove read parity by principal, role, scope, state, and time—not only row count.
- [ ] Run a reversible, low-impact write canary for every production operation type.
- [ ] Verify request status, resulting schedule instance, portal state, and audit evidence.
- [ ] Test paging, throttling, token failure, permission failure, policy rejection, and retry behavior.
- [ ] Cut over one caller at a time and prevent dual writers.
- [ ] Alert on every remaining Iteration 2 request signature.
- [ ] Reach zero unexplained legacy calls before October 28.
- [ ] Remove obsolete permissions and credentials only after the observation window and approved rollback period.

## FAQ

### Can I migrate by replacing `beta` with `v1.0`?

No. Entra roles move to `/roleManagement/directory`, Azure resource roles move from Microsoft Graph to Azure Resource Manager, and PIM for Groups uses the Graph path through `identityGovernance`, `privilegedAccess`, and `group`. Payloads, permissions, token audiences, identifiers, and query behavior differ.

### What happens on October 28, 2026?

Microsoft says applications and scripts using PIM Iteration 2 beta APIs will fail and the deprecated endpoint will stop returning data. Do not build a plan around a grace period that Microsoft has not documented.

### Are all current PIM APIs generally available?

No. Microsoft marks current assignment APIs for Entra roles, Azure resources, and Groups as generally available. It currently marks PIM alert APIs as preview and notes that role-assignment approval APIs remain available only in `/beta`. Inventory by operation.

### How do I prove an assignment is active now?

Query the provider's assignment schedule **instance** collection. A successful request or a schedule that starts in the future does not prove current access.

### Should I keep the old app permissions during migration?

Keep only what an approved parallel validation requires, with an owner and expiry. After cutover and the observation window, remove obsolete Graph grants, Azure role assignments, secrets, certificates, and schedules through normal change control. The broader [PIM operator playbook](/posts/microsoft-entra-pim-roles-operator-playbook) provides the assignment and activation design context; this migration should preserve those controls, not weaken them.

The deadline is close, but the migration is manageable when you treat it as three control planes and validate privileged state—not as a URL edit. Finish with a provider-specific inventory, least-privileged callers, matched schedule instances, complete audit evidence, and zero unexplained Iteration 2 traffic.
