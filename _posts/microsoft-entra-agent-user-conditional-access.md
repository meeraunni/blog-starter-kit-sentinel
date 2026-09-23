---
title: "Microsoft Entra Agent User Conditional Access Guide"
excerpt: "Configure Microsoft Entra agent user Conditional Access safely: choose the right scope, validate endpoint signals, monitor logs, and roll out cleanly."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-23T09:37:19-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An AI agent with its own mailbox, calendar, or Teams presence is not just another service principal. Microsoft Entra represents this “digital worker” pattern with an **agent's user account**, and that account needs its own Conditional Access scope. A policy aimed at all human users does not include it. A policy aimed at the parent agent identity does not include it either.

That is the short answer to **Microsoft Entra agent user Conditional Access**: create an agent-targeted policy, choose **All agent users (Preview)** or a deliberately selected set of agent users, protect the exact Entra-secured resources they call, and use **Agent execution environments (Preview)** before requiring a compliant device. Start in report-only mode, generate real agent traffic, and inspect the agent-specific sign-in evidence before enforcing anything.

Grab a coffee before opening the policy builder. The dangerous mistake is not a complicated rule; it is protecting the wrong token subject and believing the digital worker is covered.

## Microsoft Entra agent user Conditional Access: the decision map

First identify whose identity appears as the access token's subject:

| Access pattern | Token subject | Conditional Access target |
| --- | --- | --- |
| Agent acts for a signed-in person | Human user | Users and groups |
| Agent acts as an application | Agent identity | Agent identities |
| Agent acts as a digital worker | Agent's user account | Agent users |

Microsoft's [Conditional Access for agents architecture](https://learn.microsoft.com/en-us/entra/identity/conditional-access/agent-id) documents all three patterns. In an on-behalf-of flow, the person remains the subject. In an autonomous app flow, the agent identity is the subject. In the digital-worker flow, the agent's user account is the subject, even though the parent agent identity authenticates through the agent-user OAuth flow.

Those are not interchangeable policy targets. Microsoft explicitly says:

- an all-users policy does not include agents' user accounts;
- a policy targeting an agent identity does not apply to its agent's user account;
- targeting an agent identity blueprint covers derived agent identities, not their agent users; and
- group membership cannot currently be used to include or exclude an agent's user account in Conditional Access.

The site's broader [Microsoft Entra Agent ID architecture guide](/posts/microsoft-entra-agent-id-security-architecture-conditional-access-governance) explains blueprints, agent identities, governance, and risk. This guide stays narrower: how to put Conditional Access around the user-shaped identity an autonomous agent uses to reach user-only services.

> [!IMPORTANT]
> **Analysis:** naming creates false confidence here. An object can look like a user, belong to groups, hold workload licenses, and still sit outside the human “All users” assignment. Build the policy from the token subject and audience, not from the object's display name or the team that owns it.

## Know the preview, licensing, and default boundaries

The **agent users assignment and its agent-specific conditions are preview capabilities**. Microsoft's [public Entra release notes](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new) introduced extended Conditional Access protections for agents' user accounts as Public Preview. The current policy guide documents the assignment as **All agent users (Preview)** or **Select agent users (Preview)** and says the associated agent-user conditions should also be treated as preview. This is available functionality, not a tenant-wide default, mandatory enforcement, or permission to place every agent behind one production block policy. ([Agent policy configuration](https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-target-agent-identities))

Microsoft's current prerequisites list either Microsoft 365 E7, or Microsoft Agent 365 paired with at least Microsoft Entra ID P1 or Microsoft 365 E3. The overview separately states that Conditional Access for agents requires Entra ID P1 or P2 plus an Agent 365 license for each user, with Agent 365 licensing enforcement coming later. Network controls for agents also require Microsoft Entra Internet Access. Confirm the commercial terms for your tenant before treating a successful preview configuration as proof of future licensing. ([Conditional Access for agents licensing](https://learn.microsoft.com/en-us/entra/identity/conditional-access/agent-id#conditional-access-for-agents))

Use at least Conditional Access Administrator to create or manage the policy. Reports Reader is sufficient for the agent sign-in-log view documented by Microsoft. Agent-risk investigation has its own role requirements: Security Reader, Security Operator, or Security Administrator for the risky-agent reports, and Conditional Access Administrator for policies that consume Agent risk. ([ID Protection for agents](https://learn.microsoft.com/en-us/entra/id-protection/concept-risky-agents))

There is another hard boundary: Conditional Access only evaluates requests for resources protected by Microsoft Entra ID. An agent using an API key to call a tool bypasses Entra token issuance, so this policy cannot protect that call. Register custom MCP servers, OpenAPI tools, and APIs in Entra and expose the required permissions if they belong inside this control plane.

## Prove that an agent user is the identity you need to protect

Do not create a policy until the application owner can answer five questions:

1. **Why does the agent need a user-shaped identity?** Agent users are intended for digital-worker scenarios such as a dedicated mailbox, chat presence, or an API that requires a user identity. They should not be created merely to avoid designing application permissions.
2. **Which parent agent identity is linked to it?** Record the blueprint, agent identity, agent user, owner, sponsor, and workload owner as separate objects and responsibilities.
3. **Which resources receive its tokens?** Record every audience, including Microsoft Graph and each Entra-registered custom API. One token has one audience, and each resource can produce a different policy result.
4. **Where does execution happen?** Distinguish cloud-hosted service execution from a managed endpoint such as a Windows 365 Cloud PC for Agents.
5. **Which credentials authenticate the parent?** Microsoft describes agent entities as confidential clients and recommends managed identities or federated identity credentials instead of client secrets for production. ([Agent authentication protocols](https://learn.microsoft.com/en-us/entra/agent-id/agent-oauth-protocols))

Microsoft's [agent-user account reference](https://learn.microsoft.com/en-us/entra/agent-id/agent-users) explains why this subtype exists. An agent user receives tokens with `idtyp=user`, cannot hold a normal password or passkey, authenticates through its parent relationship, and cannot receive privileged administrator roles. It can receive workload licenses, join ordinary groups, and belong to administrative units. Those similarities to a human user do not change the Conditional Access targeting boundary.

For application teams that are still holding secrets, the site's [federated identity credentials guide](/posts/microsoft-entra-federated-identity-credentials-workload-identity) covers the secretless credential design. Conditional Access governs token issuance; it does not repair a weak credential supply chain by itself.

## Build the first policy around one verifiable path

Create a separate policy rather than editing a broad human-user baseline:

1. Sign in to the Microsoft Entra admin center as a Conditional Access Administrator.
2. Go to **Entra ID > Conditional Access > Policies** and create a new policy.
3. Under **Users, agents (Preview) or workload identities**, select **Agents**.
4. For the first pilot, choose **Select agent users (Preview)** and select one noncritical agent user. Do not use a security group as a substitute; group-based include and exclude scoping for agent users is not supported.
5. Under **Target resources**, select one resource the pilot agent actually calls. The resource must have an enterprise application in the tenant.
6. Leave device and network conditions out of the first control-plane proof unless the pilot is known to run from an endpoint.
7. Choose the smallest useful control, set the policy to **Report-only**, and save it.

For a first cloud-hosted pilot, a risk-based block is usually easier to reason about than a device grant. Agent risk is available as a condition for both agent identities and agents' user accounts. The control is meaningful only when the ID Protection detection and response process is staffed; a high-risk block without an investigation owner turns an alert into an outage queue.

For an endpoint-hosted pilot, a compliant-device grant can be appropriate, but only after the execution boundary is explicit. Under **Agent execution environments (Preview)**, select **Agent user sessions initiated from endpoints** before requiring the device to be marked compliant. Microsoft warns that a cloud-hosted agent may have no device-compliance signal and therefore no way to satisfy the control.

Do not copy a familiar human MFA policy into this flow. An agent's user account has no password or passkey and does not perform an interactive remediation ceremony. The current agent-user grant controls documented by Microsoft are **Block access** and **Require device to be marked as compliant**. Design around supported noninteractive evidence.

## Treat endpoint and cloud execution as different trust paths

An agent user can run from two very different environments:

- **Endpoint execution:** a local or cloud-hosted endpoint can present device platform, device identity, and—when managed by Intune—compliance state.
- **Cloud service execution:** a managed service might not present a device at all.

The **Agent execution environments (Preview)** condition exists to keep an endpoint-only requirement from swallowing the cloud path. Microsoft documents two choices: all agent-user sessions, or sessions initiated from endpoints. Device platform and device-filter conditions also require endpoint device information.

Compliant-network evaluation is narrower again. It depends on an endpoint with the Global Secure Access client and the corresponding compliant-network signal. A cloud service without that client cannot satisfy the same location proof. Do not label a named network “agent trusted” and assume it represents every runtime.

Use separate policies when the controls differ:

- **Policy A:** selected endpoint-hosted agent users, endpoint execution only, selected resources, require compliant device;
- **Policy B:** selected cloud-hosted agent users, selected resources, block when Agent risk is high; and
- **Policy C:** a deliberately reviewed denial boundary for resources no agent user should reach.

> [!NOTE]
> **Analysis:** separate policies cost a little more inventory work, but they make failures explainable. One mixed policy can turn “not evaluated because no endpoint exists” and “evaluated but device is noncompliant” into the same operational mystery.

## Roll out Microsoft Entra agent user Conditional Access in rings

### Ring 0: inventory subjects, audiences, and recovery owners

Map the agent user to its parent agent identity and blueprint. Record each resource audience, authentication path, execution environment, owner, sponsor, and business recovery contact. Confirm that the custom APIs actually validate Entra tokens. Keep the broad [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) nearby when separating assignment, condition, grant, and resource behavior.

### Ring 1: one agent user and one low-impact resource

Select the individual agent user and a resource with a safe synthetic transaction. Use report-only mode. Generate the same token request and API operation the production runtime uses; an interactive browser test does not prove an autonomous flow.

Microsoft's [report-only guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only) says the policy is evaluated without enforcing its grant or session controls, and the result appears in the Conditional Access and Report-only tabs of the sign-in event. Keep the existing enforced policies in place while observing the new result.

### Ring 2: prove every expected branch

Test a permitted request, an out-of-scope resource, a risk or block condition that your security team is authorized to simulate, and—when applicable—a compliant and noncompliant endpoint. Confirm that the matched policy, identity type, target resource, and grant result tell one coherent story.

The Conditional Access What If tool now supports simulations for a user, agent identity, or single-tenant service principal, but it does not replace real agent-user traffic. Its result depends on the conditions supplied and it does not model service dependencies. Use it to catch obvious targeting errors, then use sign-in logs for the actual agent flow. ([What If tool](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool))

### Ring 3: enforce one resource

Move the verified policy from report-only to on for the pilot agent user and one resource. Observe at least one complete business cycle, including scheduled and retry behavior. Confirm the application fails closed and emits a usable error when Entra denies token issuance.

### Ring 4: expand by evidence, not by object count

Add agent users that share the same token pattern, resource audience, runtime signal, and recovery owner. Re-run the evidence set when any of those four properties changes. Keep preview-specific policy design documented so the team knows to revalidate it before general availability.

## Monitor the agent evidence plane

Microsoft added agent-aware audit and sign-in fields rather than placing every event in a new silo. Agent-user lifecycle activity still appears as user activity, while its agent context is exposed through `agentType`.

Go to **Entra ID > Monitoring & health > Sign-in logs**. Filter **Is Agent = Yes**, then set **Agent type = Agent ID user** for the digital-worker path. Microsoft notes that agent traffic can appear across all four sign-in-log types because agents can use delegated or app-only flows. Do not stop after searching only interactive sign-ins. ([Microsoft Entra Agent ID logs](https://learn.microsoft.com/en-us/entra/agent-id/sign-in-audit-logs-agents))

For each pilot request, preserve:

- time, correlation ID, agent user, parent context, application, and resource;
- the sign-in event type and agent type;
- Conditional Access policies applied, not applied, or evaluated in report-only mode;
- the device, platform, network, and compliance signals when an endpoint is expected; and
- the final failure code and application-side error.

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains how to separate the policy result from the authentication result and how to preserve evidence for escalation.

## Troubleshoot by the first incorrect boundary

### The agent succeeds, but the new policy is not applied

Confirm the token subject. If a person is the subject, this is an on-behalf-of flow and the user policy is relevant. If the agent identity is the subject, target agent identities. If the agent's user account is the subject, target agent users. Then confirm the token audience matches the resource selected in the policy.

Also check for an API key or another authentication path outside Entra. Conditional Access cannot evaluate a request that never asks Entra for a protected-resource token.

### The all-users baseline applies to people but not the digital worker

This is documented behavior, not propagation delay. Policies targeting all users do not include agents' user accounts. Add a separate agent-user policy; do not convert the identity into a normal user or add a password to work around the boundary.

### A selected security group does not bring the agent user into scope

Group membership is not a supported Conditional Access include or exclude mechanism for an agent's user account. Select the agent user directly or use the agent-specific selection mechanisms Microsoft exposes. Keep ordinary group membership for application authorization separate from Conditional Access assignment.

### The compliant-device policy blocks a cloud-hosted agent

The request probably has no endpoint signal. Restrict the device policy with **Agent execution environments > Agent user sessions initiated from endpoints**, or remove the device requirement from the cloud execution path. Do not mark a nonexistent device compliant or exempt the target resource merely to clear the failure.

### The endpoint agent is compliant, but access is still denied

Verify that the sign-in contains the expected device identity and compliance state, not merely that the device looks compliant in Intune. Then check the policy audience, device platform, device filter, network condition, and every other enforced policy. A successful device control does not override a different policy's block.

### Agent sign-ins are missing from the expected report

Use **Is Agent** and **Agent type** filters and search across the sign-in types. Agent-user events use `agentIDuser` in agent-aware audit data. If Graph export is used, note that Microsoft's current Agent ID log queries are on the `/beta` endpoint; treat the schema as preview and preserve a portal evidence path.

## Mitigation, rollback, and escalation

If enforcement breaks a production agent, change the specific new policy back to **Report-only** or **Off** according to the approved incident procedure. Do not weaken human baselines, disable unrelated policies, or broaden resource exclusions. Preserve the failed sign-in, policy version, agent identity relationships, and application logs before retesting.

If compromise is suspected rather than misconfiguration, containment is a security decision. The risky-agent report can confirm compromise, confirm safe, dismiss risk, or disable an agent. Microsoft says confirming compromise sets the risk level to high and can trigger a configured risk-based Conditional Access block. Disabling prevents sign-ins across Entra-connected applications. Coordinate those actions with the agent owner and incident commander; a policy rollback is not a substitute for credential and access investigation.

Escalate to Microsoft with the tenant ID, UTC timestamps, correlation and request IDs, agent user and parent object IDs, target resource, policy IDs and export, sign-in details, runtime type, and a statement of whether the failure reproduces in report-only or enforced mode. Do not include access tokens, client secrets, or private keys.

## Administrator checklist

- [ ] Classify the flow as human OBO, agent identity, or agent user
- [ ] Record the agent user, parent agent identity, blueprint, owner, and sponsor
- [ ] Inventory every Entra-protected resource audience and any API-key bypass
- [ ] Confirm current licensing, roles, and preview acceptance
- [ ] Select agent users directly; do not rely on an all-users or group assignment
- [ ] Separate endpoint-hosted and cloud-hosted execution paths
- [ ] Use Agent execution environments before requiring device compliance
- [ ] Create the first policy for one agent user and one resource
- [ ] Start in report-only mode and generate real autonomous traffic
- [ ] Filter sign-ins by Is Agent and Agent ID user across log types
- [ ] Validate allowed, denied, out-of-scope, and recovery paths
- [ ] Enforce one resource, watch a full business cycle, then expand
- [ ] Keep a policy-specific rollback and security-containment procedure

## FAQ

### Does an all-users Conditional Access policy include Microsoft Entra agent users?

No. Microsoft explicitly documents that policies targeting all users do not include agents' user accounts. Use the agent-user assignment in an agent-targeted policy.

### Is an agent's user account the same as an agent identity?

No. The agent identity is the application-shaped identity. The optional agent's user account is a user subtype for digital-worker scenarios. A policy aimed at one does not automatically cover the other.

### Can I require MFA for an agent's user account?

The current agent-user account cannot hold a password or passkey and does not perform an interactive remediation flow. Microsoft's documented agent-user controls are block access and require a compliant device. Use supported noninteractive signals rather than copying a human MFA grant.

### Can I scope an agent-user policy with a security group?

Not currently. Microsoft lists group-based include and exclude scoping for agent users as unsupported. Select agent users through the agent-specific policy assignment instead.

### Why does Microsoft Entra agent user Conditional Access not protect an API-key call?

Conditional Access is evaluated during Entra token issuance for an Entra-protected resource. An API key bypasses that token request, so the policy has no event to evaluate. Move the resource to Entra authentication if it belongs inside this control plane.

### Should I enforce a compliant-device requirement for every agent user?

No. Use it only when the agent runs from an endpoint that can present device compliance. Scope the policy to endpoint-initiated agent-user sessions so cloud-hosted agents are not blocked without a remediation path.
