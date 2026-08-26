---
title: "Microsoft Entra Tenant Governance: A Safe Rollout Guide for Multi-Tenant Administration"
excerpt: "Microsoft Entra Tenant Governance is now generally available. Learn how discovery, governance relationships, delegated administration, configuration baselines, and drift monitoring fit together—and how to pilot them without over-granting access."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-26T13:35:00.000-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Most organizations do not set out to become multi-tenant. They acquire a company, build a test environment, inherit a billing account, or discover that a project team created a tenant three years ago and nobody remembers who owns it. Then the identity team ends up with ten different admin accounts, ten slightly different Conditional Access baselines, and no reliable answer to a simple question: *which tenants are actually ours?*

Grab a coffee. Microsoft Entra Tenant Governance is now **generally available**, and it gives administrators a supported control plane for that problem. Microsoft announced GA on August 10, 2026, covering related-tenant discovery, governance relationships, cross-tenant delegated administration, configuration management, and secure tenant creation. The announcement also draws an important boundary: the newer simplified admin-portal experiences for creating monitors from snapshots and checking permissions are still **in preview**. Do not treat every screen under the Tenant Governance blade as having the same release state. [Microsoft's GA announcement spells out that distinction](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/microsoft-entra-tenant-governance-is-now-generally-available/4543638).

This is not a switch that merges tenants, moves users, or copies every policy. It is a governance plane. It helps you discover relationships, establish explicitly approved administrative trust, describe a desired configuration in JSON, and report when a governed tenant drifts from that state.

## The status and defaults in one table

| Question | Confirmed answer |
|---|---|
| Overall release state | Generally available as of August 10, 2026 |
| Simplified monitor-from-snapshot portal experience | Preview |
| Tenant Configuration Management APIs | Generally available |
| Related-tenant discovery default | Off for new tenants |
| Can discovery be turned off after enablement? | No; enablement is permanent while the tenant remains eligible |
| Does discovery grant access to another tenant? | No; a signal is evidence of a relationship, not ownership or administrative trust |
| Are governance relationships automatic? | No; existing tenants complete a request-and-acceptance handshake |
| Does drift detection repair configuration automatically? | No; it reports the delta and remediation happens in the owning workload's admin surface |
| Mandatory enforcement | None; adoption, relationship creation, monitoring scope, and remediation remain administrator-controlled |

Microsoft documents the discovery default, the irreversible enablement action, and the Graph action at [Enable tenant discovery](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-enable-tenant-discovery). The configuration service and APIs are documented separately at [Configuration management in Tenant Governance](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/configuration-management).

## The architecture: four planes, four different jobs

Tenant Governance makes much more sense when you stop treating it as one large feature.

### 1. Discovery is an evidence plane

Related-tenant discovery evaluates existing Microsoft platform signals: B2B collaboration, multitenant application relationships, and shared billing accounts. Signals explain why two tenants appear related; metrics add direction, recency, and relative scale. Microsoft explicitly says the result is non-prescriptive. A related tenant is not necessarily owned by your organization, and its appearance does not grant your administrators access. [Microsoft's signals and metrics reference explains the model](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/signals-metrics).

That distinction protects you from a dangerous shortcut. A supplier tenant with regular B2B activity may appear more prominent than a forgotten internal lab tenant. The first can be expected and externally owned; the second can be an unmanaged part of your attack surface. Discovery gives you an investigation queue, not a legal ownership register.

### 2. A governance relationship is an administrative trust plane

A governance relationship is directional: one tenant governs and the other is governed. A policy template in the governing tenant defines the Microsoft Entra built-in roles assigned to named security groups and, optionally, a custom multitenant application to provision.

When the governed tenant accepts the request, Tenant Governance creates a relationship object in both tenants. Depending on the template, it also updates the governed tenant's partner-specific cross-tenant access configuration, creates granular delegated admin privileges (GDAP) role assignments, and provisions the selected application's service principal and permissions. These are real control-plane changes, not dashboard metadata. The complete object flow is documented in Microsoft's [end-to-end deployment guide](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/deployment-guide).

Delegated administrators then use their governing-tenant identity to enter supported admin portals for the governed tenant. They do not need a local account or B2B guest account in every tenant. Their effective permissions still come from the roles approved in the relationship, and the governed tenant's Conditional Access and logging controls still apply to their sessions. Microsoft's [tenant estate architecture guidance](https://learn.microsoft.com/en-us/entra/architecture/tenant-estate-guide) describes this GDAP model and recommends operating as few tenants as your security, compliance, and operational requirements allow.

> [!IMPORTANT]
> A governance relationship reduces administrator-account sprawl; it does not remove the governed tenant's security boundary. The governed tenant accepts the role package, can audit the remote administrators, and can terminate the relationship.

### 3. Configuration management is an observation plane

Tenant configuration management represents settings as resource types and properties. A baseline is JSON describing the desired state. A monitor compares the real tenant against that baseline and produces run results plus individual drift records.

Microsoft currently supports more than 200 resource types across Microsoft Entra, Intune, Exchange Online, Teams, Purview, and Defender. The Unified Tenant Configuration Management service principal needs explicit read permissions for every resource type included in a baseline. Exchange, Defender, Purview, and Teams can also require workload-specific authorization beyond Microsoft Graph permissions. The current monitor wizard's permission check does not prove that the signed-in administrator or every workload-local role is sufficient, so treat a green permission screen as one input rather than complete authorization evidence. [Microsoft documents that limitation in the monitor creation guide](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-create-monitor).

Monitors run every six hours. A detected difference becomes drift; Tenant Governance does not silently overwrite the tenant. You decide whether to restore the resource to the approved baseline or update the baseline because the production change was intentional. The next successful monitor run marks a corrected drift as fixed. That behavior is documented in [View monitor results and manage monitors](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-see-monitor-results).

### 4. Secure creation is a tenant-lifecycle plane

For new add-on workforce tenants, a default governance policy template can establish the relationship during creation. Microsoft also creates a Microsoft Entra ID Free billing asset and adds the new tenant to related-tenant inventory. If no default template exists, the tenant can still be created but the governance relationship is not established automatically. The prerequisites—including paid-customer status and supported billing/subscription models—are in [Create a governed workforce tenant](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-create-tenant).

This is about workforce tenants. Microsoft's current tenant-estate guidance explicitly excludes External ID external tenants used for customer identity and access management.

## Licensing without the hand-waving

Tenant Governance licensing is capability-specific, and Microsoft licenses the administrators using these features rather than every user in every governed tenant.

For configuration management, Entra P1 and P2 include Tenant Governance Basic capacity: up to 30 monitors, 800 configuration resources per tenant per day, 20,000 snapshot resources per tenant per month, and 12 active snapshot jobs. Microsoft Entra ID Governance adds capacity per license: 10 additional monitored resources per day and 35 additional snapshot resources per month.

Related-tenant discovery requires Microsoft Entra ID Governance for every administrator who uses discovery—including administrators who only view results. Governance relationships using cross-tenant GDAP are available with Entra P1, Entra P2, or Entra ID Governance; custom multitenant application provisioning requires Entra ID Governance. Relationship licenses are required in the governing tenant, not in each governed tenant, and one license is required for each administrator who configures relationships. Secure add-on tenant creation is available at the Free level for paid Microsoft customers, subject to the documented subscription requirements.

Those are current product terms, not assumptions; verify them against Microsoft's [Tenant Governance licensing guide](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/licensing) before procurement or rollout. Microsoft notes that Entra P1 is included in Microsoft 365 E3 and Business Premium, Entra P2 in Microsoft 365 E5, and Entra ID Governance in Entra Suite and Microsoft 365 E7.

## Inventory before you enable anything

Related-tenant discovery is the first deployment phase in Microsoft's guide, but its enablement cannot be reversed. Before pressing **Discover related tenants**, create the operating model that will receive the data:

1. Name the tenant-estate owner and the teams responsible for identity, security, billing, M&A, application ownership, and legal review.
2. Export the tenants you already know, including tenant ID, verified domains, billing relationship, business owner, purpose, data classification, production status, and local emergency-access contacts.
3. Define classifications such as approved internal, approved partner, requires governance review, quarantine candidate, and retirement candidate.
4. Decide who may view discovery results; each user of the feature has licensing implications.
5. Agree that a discovery signal alone never authorizes contact, quarantine, takeover, or a governance request.

Enablement is available at **Tenant Governance > Related tenants > Discover related tenants**. For controlled automation, Microsoft also documents this Graph action:

```http
POST /directory/tenantGovernance/settings/enableRelatedTenants
```

The setting defaults to `false`; after the call succeeds, `isRelatedTenantsEnabled` becomes `true` and cannot be reverted. Discovery data can take several days to populate, so an empty first screen is not proof that no related tenants exist. [Microsoft's deployment guide documents the expected delay](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/deployment-guide#phase-1-enable-related-tenant-discovery).

## A rollout plan that proves trust in small pieces

### Ring 0: choose the tenant architecture

Start with the architectural question, not the product blade. Which tenant is the governing tenant, and why is it trusted to hold administrator groups and policy templates for the estate? Which tenants genuinely require isolation? Which should be consolidated instead of permanently governed?

Microsoft's current architecture guidance treats the primary production tenant, collaborating production tenants, isolated critical-workload tenants, partner-access tenants, and nonproduction tenants as distinct patterns. Do not use Tenant Governance as justification to keep every inherited tenant forever.

### Ring 1: discovery and classification only

Enable discovery in the chosen governing tenant after stakeholders approve the irreversible setting. Wait for signal aggregation, then classify every result. Record the evidence behind each decision.

Do not send governance requests in the same change window. A separate discovery-only phase gives application owners and security teams time to explain B2B or multitenant-app signals that may be entirely legitimate.

### Ring 2: one nonproduction governance relationship

Build a policy template at **Tenant Governance > Templates** with the smallest useful role package. Assign roles to dedicated, role-assignable security groups in the governing tenant. Avoid custom multitenant application provisioning in the first pilot unless the application is the specific thing you need to validate.

The handshake depends on the relationship between tenants:

- When a billing signal or active relationship already exists, the governing tenant sends a governance request and the governed tenant accepts it. The request is valid for 14 days.
- Without that signal, the governed tenant first sends an invitation, the governing tenant sends the request, and the governed tenant accepts it. The invitation is valid for 30 days and the request for 14 days.

The exact portal paths and both handshake sequences are in [Set up a governance relationship](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-set-up-governance-relationship).

After acceptance, verify all expected objects: the relationship in both tenants, the partner-specific cross-tenant access entry, the GDAP assignments, and any intentionally provisioned service principal. Then add only the pilot administrators to the delegated groups and test supported admin portals with the governed tenant's domain or tenant ID.

### Ring 3: monitoring without remediation automation

Grant the configuration management service only the read permissions needed for a small, security-critical baseline. Good first resources are Conditional Access policies, authentication-method settings, and privileged-role controls that your team can independently verify.

Create a snapshot of a known-good tenant or author the JSON baseline directly. A snapshot is evidence of the current state, not proof that the state is secure. Review every resource and property before treating it as desired state. Snapshot jobs and their snapshots are retained for only seven days, so download and store required evidence before it expires. [Microsoft documents the retention window and matching baseline schema](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/configuration-management#snapshot-jobs).

Create the monitor, wait up to six hours for the first result, and deliberately change one low-risk pilot setting through its normal admin surface. Confirm that the expected property appears as drift. Restore the approved value manually, then confirm the next monitor run marks the drift fixed.

### Ring 4: representative tenants and workloads

Expand to tenants with different ownership and risk profiles: a subsidiary, a development tenant, and an acquired tenant are more useful than three identical labs. Add workload types gradually. Every expansion should answer four questions:

1. Which service principal permissions or workload roles are being added?
2. Which delegated administrator group receives which role?
3. Who in the governed tenant reviews sign-ins, audit events, and relationship changes?
4. Which team owns remediation when drift belongs to Entra, Exchange, Intune, Teams, Purview, or Defender?

Only after those paths work should you consider broader monitoring, custom application provisioning, or secure tenant creation.

## Monitoring the people and the monitors

The governed tenant retains its own evidence trail. Delegated administrators appear in sign-in and audit logs under a display pattern such as `{Governing tenant name} Technician`, with a generated username based on the governing-tenant user object ID. Review sign-ins at **Identity > Monitoring & health > Sign-in logs** and actions at **Identity > Monitoring & health > Audit logs**. Microsoft documents the supported roles, filters, and identity format in [Monitor governing tenant admin activity](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-monitor-governing-activity).

For configuration monitors, watch three separate signals:

- **Run health:** failed or partially successful runs mean you do not have reliable coverage.
- **Permissions readiness:** a baseline can outgrow the service principal permissions that were originally granted.
- **Configuration drift:** a delta needs ownership and triage; it is not automatically malicious.

Monitor pages also expose creation and update audit events. Export important evidence into your normal log-retention system rather than assuming the portal is your long-term audit archive.

## Rollback and containment

There is no rollback for related-tenant discovery. Once enabled, the supported setting remains on. The safe control is governance around who can use the data and what actions require independent approval.

For delegated access, containment can start by removing administrators from the governing-tenant security group while you investigate. To change the approved roles, update the policy template, send a new governance request, and have the governed tenant accept it. Updating the template alone does not alter an existing relationship.

To remove the trust entirely, terminate the governance relationship. A governing tenant initiates a termination request that the governed tenant must confirm; the governed tenant can terminate directly without approval from the governing tenant. Termination removes the partner-specific cross-tenant access entry, GDAP role assignments, and any service principal plus permissions created by multitenant application management. That last item can break dependent automation, so inventory it before termination. Microsoft's [termination guide](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-terminate-governance-relationship) is explicit about the resources deleted.

For monitoring, deleting a monitor is not a harmless pause. Microsoft says deletion immediately removes its results and drift records, and updating a monitor replaces its definition and deletes previously generated results and drifts. Export evidence before either action and use the documented [update or delete monitor behavior](https://learn.microsoft.com/en-us/entra/id-governance/tenant-governance/how-to-update-delete-monitor) in your change plan.

## Troubleshooting patterns worth knowing

**No tenants appear after discovery is enabled.** Allow several days for signals to aggregate. Confirm that the user has the required license and that you expected B2B, multitenant-app, or billing signals in the first place.

**A governance request cannot be completed.** Check which handshake applies, whether governance invitations are enabled for the three-step path, and whether the 30-day invitation or 14-day request expired. Confirm Tenant Governance Administrator on both sides.

**Delegated administrators can sign in but cannot perform a task.** Verify group membership in the governing tenant, the built-in role accepted by the governed tenant, and any workload-specific permission outside Entra. Do not widen the role package before confirming which authorization layer rejected the action.

**The first monitor result is missing.** The initial run can take up to six hours. If it fails, review the monitor's Permissions view and the workload-local authorization required by Exchange, Defender, Purview, or Teams.

**Drift appears immediately after monitor creation.** A snapshot may have captured a temporary or already-unapproved state, or the baseline may identify a resource instance differently from production. Compare the expected and actual properties before changing the tenant.

**A corrected drift remains open.** Wait for the next successful monitor run. Drift status changes when the monitor reevaluates the resource; the admin action alone does not close the record.

## The admin checklist

- [ ] Confirm Tenant Governance GA scope and identify any preview portal experiences in the change record.
- [ ] Choose a governing tenant and document why it is the appropriate administrative root.
- [ ] Verify administrator licensing by capability, not by tenant count.
- [ ] Define ownership and classification before enabling irreversible related-tenant discovery.
- [ ] Treat discovery signals as evidence, not proof of ownership or permission to govern.
- [ ] Build least-privilege policy templates with dedicated security groups.
- [ ] Pilot one nonproduction relationship and verify every provisioned object.
- [ ] Grant the configuration service only the read permissions required by the baseline.
- [ ] Review snapshots before calling them desired state; export them before seven-day retention expires.
- [ ] Test one deliberate drift, one manual remediation, and one failed-permission scenario.
- [ ] Monitor delegated administrator sign-ins and audit actions in every governed tenant.
- [ ] Export monitor evidence before updating or deleting a monitor.
- [ ] Inventory application dependencies before terminating a relationship.
- [ ] Keep local emergency access and tenant-specific Conditional Access controls in place.

Tenant Governance is valuable because it turns an informal estate into an inspectable one. The safest deployment keeps the same separation in your operating model that Microsoft keeps in the product: discover first, establish trust deliberately, observe configuration before enforcing change, and make every cross-tenant permission visible to the tenant that accepts it.
