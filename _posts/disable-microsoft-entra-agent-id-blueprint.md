---
title: "Disable a Microsoft Entra Agent ID Blueprint Safely"
excerpt: "Disable a Microsoft Entra Agent ID blueprint safely, contain its agent identities, preserve evidence, account for live tokens, and restore access cleanly."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-29T17:09:06-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **disable a Microsoft Entra Agent ID blueprint**, open **Entra ID > Agents > Agent blueprints**, select the blueprint, and choose **Disable**. That reversible action blocks the blueprint and its linked agent identities from obtaining new access tokens without deleting their directory objects. Preserve the blueprint IDs, linked identities, owners, sponsors, permissions, and recent sign-ins before you act; then validate the block with a fresh token request, not just a portal status badge.

That is the short answer. The important caveat is token lifetime. Microsoft's current [agent identity blueprint resource reference](https://learn.microsoft.com/en-us/graph/api/resources/agentidentityblueprint?view=graph-rest-beta) says setting `isDisabled` to `true` prevents the associated principal from obtaining new access tokens or accessing protected resources, but existing tokens remain valid until their configured expiry. Disabling is a strong, reversible containment boundary. It is not proof that every already-issued token stopped working at the same instant.

Grab a coffee before treating the button as an agent-wide panic switch. A blueprint is a parent control plane, one agent can also have a user-shaped identity, older AI workloads might still use ordinary service principals, and a tenant-wide Conditional Access block solves a different problem. The goal is to stop the smallest correct scope, preserve evidence, and keep a tested recovery path.

## Disable a Microsoft Entra Agent ID blueprint at the right scope

Microsoft documents three distinct containment scopes in its [Agent ID administration guidance](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-admin):

- **Individual agent identity:** stop one agent identity while leaving sibling identities from the same blueprint available.
- **Blueprint:** stop the blueprint and the existing agent identities linked to it. This is the right scope when the shared template, credential path, permission model, or whole deployed agent family is suspect.
- **Tenant-wide Conditional Access:** block broad categories of agent authentication without changing each object. This is the emergency boundary when the incident or policy decision is not confined to one blueprint.

Do not choose the scope from the display name alone. Record the blueprint application object ID, Blueprint Application ID, blueprint principal object ID, and the object IDs of linked agent identities. Microsoft's [blueprint management guide](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-blueprint) exposes linked identities, permissions, owners and sponsors, audit logs, and sign-in logs from the blueprint management surface. Those relationships define the real blast radius.

The site's [Agent ID security architecture guide](/posts/microsoft-entra-agent-id-security-architecture-conditional-access-governance) explains how the blueprint, blueprint principal, agent identity, and optional agent user fit together. Keep that object model visible during an incident. Disabling the wrong application-shaped object can leave the intended workload running or interrupt an unrelated agent family.

### Use this decision boundary

- **One agent identity is malfunctioning:** disable that agent identity so sibling agents can remain available.
- **A blueprint credential or inherited design is suspect:** disable the blueprint to stop the linked agent family and new token acquisition.
- **An agent's user account is the risky subject:** contain the agent-user path too because the user-shaped token path is separate.
- **The tenant needs a temporary agent-wide hold:** use agent-specific Conditional Access to cover the broader authentication category without editing every object.
- **The blueprint is permanently retired:** disable and observe first, then use the documented deletion process because deletion has a different lifecycle and recovery model.

> [!IMPORTANT]
> **Analysis:** containment scope should follow the token subject and shared dependency, not the product name. If a failed sign-in is issued to an agent user or a legacy service principal, disabling a modern Agent ID blueprint might be operationally irrelevant.

## What disabling changes—and what it leaves behind

Microsoft added the `isDisabled` property to the Microsoft Graph beta `agentIdentityBlueprint` resource in the [September 2026 Graph update](https://learn.microsoft.com/en-us/graph/whats-new-overview#september-2026-new-in-preview-only). The property deactivates a blueprint without deleting it. The portal provides the supported administrator action, while the Graph property gives automation and inventory tooling an explicit state to read or change.

When a blueprint is disabled:

- the blueprint remains in Microsoft Entra;
- its metadata, owners, sponsors, credentials, permissions, linked identities, and logs remain available for investigation;
- the blueprint and linked agent identities cannot obtain new access tokens; and
- the action can be reversed by re-enabling the blueprint after remediation.

Disabling does **not**:

- delete the blueprint, principal, linked agent identities, or agent users;
- erase credentials or permissions;
- guarantee that an access token already held by a workload is rejected immediately by every resource;
- stop a non-Entra API key, product-local credential, or ordinary service principal that is outside the blueprint path; or
- prove the application tier stopped queued work, retries, or cached operations.

Microsoft's [agent identity deletion reference](https://learn.microsoft.com/en-us/entra/agent-id/concept-agent-identity-deletion) makes the disable-versus-delete distinction explicit. Disabling preserves objects and is appropriate for temporary investigation or gradual decommissioning. Deleting the blueprint or principal starts asynchronous cascade cleanup of child identities and agent users, with a 30-day soft-delete window. Do not delete simply because the incident bridge wants a more dramatic-looking status.

## Preserve evidence before the disable action

If active harm is occurring, contain first under the incident procedure and collect the remaining evidence immediately afterward. Otherwise, take a narrow pre-change snapshot:

1. Record the tenant ID, UTC time, incident or change number, operator, and reason.
2. Capture the blueprint name, object ID, app ID, principal ID, current status, and creation time.
3. Export the linked agent identity IDs and names.
4. Record owners and sponsors, including the accountable business contact.
5. Capture granted permissions, role assignments, credentials by identifier and expiry, and relevant Conditional Access scope. Never export credential values or access tokens.
6. Preserve recent blueprint and agent sign-ins, correlation IDs, target resources, source network, authentication method, and result.
7. Preserve the audit events that created or changed the blueprint, its identities, permissions, and sponsors.
8. Identify the runtime owner who can stop schedulers, queues, or product-local execution if directory containment is not enough.

Microsoft's [Agent ID logs reference](https://learn.microsoft.com/en-us/entra/agent-id/sign-in-audit-logs-agents) explains why a normal application or service-principal search can miss context. Blueprint activity appears as application events, agent identity activity appears as service-principal events, and agent-user activity appears as user events. Use the `agentType` and `blueprintId` fields to correlate them. In the admin center, go to **Entra ID > Monitoring & health > Sign-in logs**, set **Is Agent** to **Yes**, and use the **Agent type** filter.

Bring the sponsor into the decision without handing them technical recovery authority they do not have. The [Agent ID sponsors guide](/posts/microsoft-entra-agent-id-sponsors-admin-guide) separates business accountability from owner and administrator actions.

## Disable the blueprint in the Microsoft Entra admin center

Microsoft documents **Agent ID Administrator** as the least-privileged administrator role for this portal procedure. An owner can manage an owned blueprint within the boundaries Microsoft documents, but an incident runbook should name the authorized role and approver explicitly. Microsoft does not list a separate license requirement for the object-level disable action in its current management prerequisite table; agent-targeted Conditional Access requires Microsoft Entra ID P1, and risk features can have additional licensing.

Use the portal for the first controlled response:

1. Sign in to the Microsoft Entra admin center with the approved role.
2. Browse to **Entra ID > Agents > Agent blueprints**.
3. Search by the recorded object ID or Blueprint Application ID, not only the display name.
4. Open the blueprint principal and compare its linked identity count, owners, sponsors, and permissions with the evidence snapshot.
5. Select **Disable** and confirm the warning.
6. Record the completion time and resulting status.
7. Generate a fresh token request from one known linked agent in a controlled path and confirm the denial.
8. Check sibling agents, agent users, and legacy service principals that might represent alternate execution paths.

The portal confirmation is configuration evidence. The failed fresh token request is enforcement evidence. Keep both.

## Use Microsoft Graph beta only with an explicit preview boundary

The Graph automation surface is **preview**, even though Agent ID itself is generally available and the portal exposes the disable action. Microsoft states that `/beta` APIs can change and are not supported for production applications. Do not silently make a beta PATCH the only emergency control in a production runbook.

The [update agentIdentityBlueprint method](https://learn.microsoft.com/en-us/graph/api/agentidentityblueprint-update?view=graph-rest-beta) documents this request path and the `isDisabled` property:

```http
PATCH https://graph.microsoft.com/beta/applications/{blueprint-object-id}/microsoft.graph.agentIdentityBlueprint
Content-Type: application/json

{
  "isDisabled": true
}
```

A successful update returns `204 No Content`. The path uses the **blueprint application object ID**, not the app ID and not the blueprint principal object ID. Read the object back and validate a fresh token request; a 204 response alone does not prove the correct workload was selected.

For delegated administration, Microsoft's current update-method reference names Agent ID Administrator for a nonowner and documents `AgentIdentityBlueprint.ReadWrite.All` as the broader permission for properties outside the credential-only and branding-only scopes. Recheck the live permission table before implementation. Do not grant a tenant-wide write permission to a permanent automation merely to avoid an incident-time approval step.

To re-enable after approval, send the same PATCH with `isDisabled` set to `false`, then repeat the validation sequence. Keep the portal procedure as a fallback until the API becomes generally available and your automation has been revalidated against v1.0.

This article describes the documented request; it does not claim that Sentinel Identity executed it in a tenant.

## Account for tokens that already exist

The most dangerous interpretation of “disabled” is “every session is dead.” Microsoft's Graph resource and update references say existing tokens remain valid until they expire. Treat the action as blocking new token acquisition, then assess residual access separately.

For each high-impact resource, determine:

- whether the workload already holds an access token;
- its audience and expiry;
- whether the resource supports Continuous Access Evaluation for this workload pattern;
- whether the client requests CAE-capable tokens and handles claims challenges;
- whether the resource has a separate session, queue, API key, or cached authorization state; and
- whether the resource owner has an emergency deny or credential-rotation procedure.

Do not promise near-real-time revocation from a generic CAE statement. Microsoft's [workload-identity CAE reference](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation-workload) currently documents specific identity, client, and resource constraints. The site's [service-principal token revocation guide](/posts/revoke-microsoft-entra-service-principal-tokens-cae) covers those boundaries. When compromise is suspected, coordinate blueprint disablement with stopping the runtime, rotating exposed credentials, revoking product-local sessions where supported, and blocking or removing unauthorized grants.

> [!WARNING]
> Never paste an access token, client secret, certificate private key, or federated credential assertion into a ticket, chat, or article evidence bundle. Preserve identifiers, hashes, timestamps, claims metadata, and secure vault audit records instead.

## Validate containment with control-plane and data-plane evidence

Use a four-part validation:

### 1. Directory state

Confirm the blueprint shows **Disabled** and the recorded ID still matches. Confirm the objects remain present; absence would indicate deletion rather than disablement.

### 2. Token issuance

Request a new token through the real workload path. Record the UTC time, correlation or request ID, identity, audience, and error. A portal page refresh is not a token test.

### 3. Resource access

Test the intended protected operation with a fresh authentication attempt. If an old token still works, record its audience and expiry and invoke the resource-specific containment procedure. Do not re-enable the blueprint to make troubleshooting easier.

### 4. Alternate identities

Search agent sign-ins, agent-user sign-ins, ordinary service-principal sign-ins, and application logs. Older agents might not use Agent ID at all. Agent-user flows have a separate Conditional Access and containment path; the [agent user Conditional Access guide](/posts/microsoft-entra-agent-user-conditional-access) explains that boundary.

Continue watching for new token requests and resource actions after containment. A quiet sign-in log can mean the agent stopped, or simply that it switched to a different credential path.

## Re-enable only after the cause and recovery criteria are clear

Define recovery before changing the status back:

- the triggering incident is classified and an owner approves restoration;
- compromised credentials are removed and replaced through an approved method;
- unauthorized grants, role assignments, or inheritable permissions are removed;
- the agent code, deployment, data source, and downstream resources are assessed;
- owners and sponsors are current;
- a low-impact synthetic transaction is ready;
- monitoring is watching the blueprint, linked identities, and target resource; and
- a second operator can disable the same scope again.

Re-enable the blueprint, request a new token for one known agent, and execute one bounded transaction. Confirm the token subject, audience, sign-in classification, Conditional Access result, and application-side outcome. Expand only after the expected evidence appears.

If the blueprint is being retired, leave it disabled for the organization's observation period before deletion. Export the object relationships and recovery decision first. Once deletion starts cascade cleanup, restoring the parent alone might not restore child identities that the background cleanup has already removed.

## Troubleshoot the common containment failures

### The portal says Disabled, but the agent still succeeds

Check whether the request uses an already-issued token. Record its expiry and resource. Then verify the token subject is a linked Agent ID identity rather than an agent user, managed identity, legacy service principal, or product-local identity. Stop any cached or queued resource operation through the resource owner's procedure.

### One linked agent is blocked, but another is not

Compare both agents' `blueprintId` values and token subjects. Similar names do not prove a shared blueprint. Also check whether one runtime falls back to an ordinary service principal.

### The Graph PATCH returns success, but the wrong object changed

Confirm the request used the application object ID in the documented agent-blueprint update path. Compare the read-back `id`, `appId`, display name, linked identities, and portal status with the pre-change record.

### The Graph call returns 403

Check the token's delegated or application permission, the caller's ownership, and the Agent ID Administrator role requirement for nonowner delegated scenarios. Do not solve a 403 by immediately granting Global Administrator or broad directory write access.

### A tenant-wide block breaks Microsoft product experiences

Microsoft warns that broad agent blocking can disrupt existing agents and some Microsoft product experiences, or cause fallback to less visible standard service principals. Return only the new policy to its approved rollback state, preserve the impacted sign-ins, and narrow the scope. Do not disable human Conditional Access baselines to recover an agent.

### Re-enabling does not restore the workload

Confirm the blueprint is enabled, then inspect the linked agent identity, agent user, Conditional Access result, credentials, grants, product-local status, and target resource. Re-enable does not recreate a deleted object, restore an expired credential, undo a revoked grant, or restart a stopped runtime.

## Microsoft Entra Agent ID blueprint disable checklist

- [ ] Identify the real token subject and target resource
- [ ] Record blueprint, principal, linked identity, and agent-user object IDs
- [ ] Preserve owners, sponsors, permissions, credentials metadata, sign-ins, and audit evidence
- [ ] Choose individual, blueprint, or tenant-wide scope deliberately
- [ ] Use Agent ID Administrator or an approved owner path
- [ ] Disable through the portal for the first controlled response
- [ ] Treat the Graph `isDisabled` automation path as beta
- [ ] Validate with a fresh token request and protected operation
- [ ] Account for existing tokens, CAE limits, queues, sessions, and non-Entra credentials
- [ ] Search agent, agent-user, and ordinary service-principal paths
- [ ] Rotate exposed credentials and remove unauthorized access before recovery
- [ ] Re-enable one bounded test first and monitor the result
- [ ] Keep the blueprint disabled through an observation period before permanent retirement

## Frequently asked questions

### Does disabling a blueprint delete its agent identities?

No. Disabling preserves the blueprint and linked directory objects. Deleting is a separate action that can trigger asynchronous cascade cleanup and a 30-day soft-delete lifecycle.

### Does disabling a Microsoft Entra Agent ID blueprint revoke every token immediately?

Do not assume it does. Microsoft states that existing tokens remain valid until their configured expiry. Near-real-time enforcement depends on the identity, client, resource, and CAE support. Validate at the target resource.

### Can I disable a blueprint with Microsoft Graph v1.0?

The September 2026 `isDisabled` property and update method are currently documented on Microsoft Graph `/beta`, not v1.0. Use the portal as the supported operational path and treat API automation as preview.

### Which ID belongs in the Graph PATCH path?

Use the agent identity blueprint **application object ID** in the `{blueprint-object-id}` position of the documented request. Do not substitute the app ID or blueprint principal object ID.

### Should I delete a compromised blueprint instead?

Usually disable first so you can preserve and investigate the object graph. Delete only when the recovery owner has decided the blueprint is permanently retired and has planned for cascade cleanup and the soft-delete window.

### Does blueprint disablement also contain an agent's user account?

Do not treat that as automatic proof. An agent user is a separate user-shaped identity and can have its own token and Conditional Access path. Validate and contain that subject explicitly when it is present.

## Microsoft sources

- [What's new in Microsoft Graph: September 2026](https://learn.microsoft.com/en-us/graph/whats-new-overview#september-2026-new-in-preview-only)
- [Disable agent identities in your tenant](https://learn.microsoft.com/en-us/entra/agent-id/disable-agent-identities)
- [Manage agent identities in your organization](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-admin)
- [View and manage agent identity blueprints](https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-blueprint)
- [Agent identity blueprint resource type](https://learn.microsoft.com/en-us/graph/api/resources/agentidentityblueprint?view=graph-rest-beta)
- [Update agentIdentityBlueprint](https://learn.microsoft.com/en-us/graph/api/agentidentityblueprint-update?view=graph-rest-beta)
- [Microsoft Entra Agent ID logs](https://learn.microsoft.com/en-us/entra/agent-id/sign-in-audit-logs-agents)
- [Agent identity deletion](https://learn.microsoft.com/en-us/entra/agent-id/concept-agent-identity-deletion)
- [Continuous access evaluation for workload identities](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation-workload)
