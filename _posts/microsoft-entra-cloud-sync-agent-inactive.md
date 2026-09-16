---
title: "Microsoft Entra Cloud Sync Agent Inactive: Fix Guide"
excerpt: "Fix a Microsoft Entra Cloud Sync agent that shows inactive: trace services, outbound connectivity, gMSA access, portal health, logs, and safe recovery."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-16T17:12:10-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

A Microsoft Entra Cloud Sync agent shows **Inactive** when the cloud service can no longer see a healthy, registered agent for the on-premises domain. Start with the agent host, not the object that failed to synchronize: confirm both agent services are running, prove outbound connectivity to Microsoft, verify the portal assignment and registration, and only then inspect the gMSA, provisioning job, or object scope.

That sequence saves a lot of coffee. An inactive agent is a transport or registration problem. A quarantined job is a provisioning-health problem. One skipped user or group is usually a scope, mapping, or source-data problem. They can appear together, but they are not interchangeable diagnoses.

Microsoft's current [Cloud Sync troubleshooting guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-troubleshoot) makes the same first distinction: verify that the agent is installed, running locally, present in the portal, and marked healthy. This guide turns those checks into an incident runbook without assuming that a restart is always the fix.

## Microsoft Entra Cloud Sync agent inactive: find the failed layer

Cloud Sync has a cloud control plane and an on-premises data plane. The [Cloud Sync architecture reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/concept-how-it-works) describes this flow:

1. The Microsoft Entra provisioning service schedules work in the cloud.
2. The hybrid identity service places a request on Azure Service Bus.
3. The provisioning agent maintains an outbound connection and receives the request.
4. The agent queries Active Directory, applies scope and transformation logic, and returns a SCIM response.
5. The cloud provisioning service writes the result and advances its synchronization watermark.

The agent also bootstraps periodically to obtain configuration and current Service Bus endpoints. A Windows service can therefore be **Running** while the portal still sees no usable agent: the process exists, but registration, certificate, bootstrap, proxy, TLS, DNS, or Service Bus communication is broken.

Use this symptom map before changing anything:

- **Agent missing or Inactive in the portal:** investigate host service, registration, certificate, outbound network, proxy, and domain assignment.
- **Agent Active, job quarantined:** inspect the job error, target authorization, credentials, and repeated target failures before clearing quarantine.
- **Agent Active, job healthy, one object absent:** search provisioning logs by the AD `ObjectGuid`; verify scope, attribute mapping, source data, and skip reason.
- **Agent Active, all objects delayed:** confirm configuration state, scheduler evidence, backlog, and service health before forcing a restart.

Do not rebuild the agent because one object was skipped. Do not clear quarantine while no agent is listening. The first useful action is the one that matches the failed layer.

## Capture evidence before restarting the Cloud Sync agent

Record the incident start in UTC and preserve:

- tenant ID, Cloud Sync configuration ID, and affected AD domain;
- agent host name, operating system, agent version, and last known healthy time;
- portal agent status and any configuration error code;
- the state of the two services Microsoft's current guide labels **Microsoft Azure AD Connect Provisioning Agent** and **Microsoft Azure AD Connect Agent Updater**;
- recent server, firewall, proxy, certificate, Group Policy, service-account, and patch changes;
- affected object count and whether password hash synchronization is also delayed; and
- the last successful provisioning-log event and its job identifier.

This evidence separates a single-host failure from a domain-wide registration problem. It also prevents a service restart from erasing the timing needed to correlate proxy, firewall, or Windows events.

Microsoft publishes a live [provisioning-agent version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-version-history). Compare the installed binary with that page rather than copying a version into a permanent runbook. The agent is designed for automatic updates, but a running updater service does not prove the installed agent is current.

## Confirm roles and feature licensing

Use a cloud-only, non-guest account with at least the **Hybrid Identity Administrator** role for portal configuration and recovery. Microsoft's [Cloud Sync account reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/accounts) separately requires Domain or Enterprise Administrator credentials during installation when the agent creates its gMSA. Those elevated AD credentials are an installation dependency, not a reason to give the daily Cloud Sync operator standing Domain Admin membership.

Licensing follows the provisioning scenario, not the colour of the agent-status icon. For example, Microsoft's prerequisite page explicitly requires Microsoft Entra ID P1 for provisioning groups from Entra ID to AD DS. Other Cloud Sync workloads and companion controls have their own terms. Confirm the license on the feature-specific guide for every configuration attached to the agent; do not infer that one healthy agent licenses every scenario it can technically transport.

## Check the portal and the Windows host

Sign in as at least a **Hybrid Identity Administrator**, then browse to **Entra ID > Entra Connect > Cloud sync > Agents**. The agent should exist, be associated with the expected domain, and show **Active** in green.

An absent agent and an inactive agent are different clues. Microsoft's [Cloud Sync error reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-error-codes) distinguishes:

- [`HybridIdentityServiceNoAgentsAssigned`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-error-codes): no agent is assigned to the domain; and
- [`HybridIdentityServiceNoActiveAgents`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-error-codes): an assigned agent is not listening to the Service Bus endpoint.

On the host, open `Services.msc` and confirm both agent services are present and running. Microsoft documentation still shows the legacy **Microsoft Azure AD Connect** display names, even though the product is now Microsoft Entra Cloud Sync. If the provisioning service is stopped, preserve its Windows event evidence, start it through the approved operations process, and watch the portal for recovery. Microsoft's supported command-line installation guide documents the service name used for a controlled restart:

```powershell
Restart-Service -Name AADConnectProvisioningAgent
```

Do not put that command in a blind monitoring loop. A service that repeatedly stops needs its exit reason, policy, dependency, or account problem fixed; repeated restarts only change the timestamps.

### If the service will not start

Microsoft documents a common installation failure where Group Policy prevents the required rights from being applied to [`NT SERVICE\AADConnectProvisioningAgent`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-troubleshoot). Treat that as a policy conflict, not a reason to leave the service running permanently as a Domain Admin.

Microsoft's troubleshooting page includes a temporary diagnostic step that changes the service logon account. Use it only within an approved recovery window and return the service to the supported design after proving the cause. The long-term answer is to correct the applicable user-rights policy and verify the agent's managed service account, not to normalize standing domain credentials on a control-plane server.

## Prove outbound connectivity, TLS, DNS, and proxy behavior

The agent initiates outbound communication; it does not require an inbound Internet listener. Microsoft's [Cloud Sync prerequisites](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-prerequisites) require TLS 1.2 and document the Microsoft endpoints used for cloud and certificate-status communication. The troubleshooting guide calls out outbound TCP 443 for service communication and TCP 80 for certificate revocation checks.

Check the path from the agent host under the service's actual network context:

- DNS resolves the current Microsoft endpoint names;
- outbound 443 reaches the documented Microsoft and Service Bus endpoints;
- outbound 80 reaches Microsoft's CRL and OCSP endpoints;
- TLS inspection does not replace or invalidate the certificate chain used by the agent;
- a proxy allows the Windows service identity and does not require an unsupported interactive prompt; and
- firewall rules are not tied only to an administrator's user session.

Microsoft does not provide a permanent list of individual IP addresses because the service and DNS records can change. Build controls from the current documented endpoint set and review them after network-policy changes.

If registration times out or reports an invalid certificate, Microsoft's troubleshooting guide points first to the outbound proxy path. It documents proxy configuration in [`AADConnectProvisioningAgent.exe.config`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-troubleshoot). Do not paste a generic proxy stanza into production without comparing it with the current Microsoft syntax, recording the previous file, and validating how credentials are supplied.

**Analysis:** test from the same server and through the same proxy path the service uses. A successful browser session by an administrator proves little about a Windows service running under a managed identity.

## Verify registration, certificate, and domain assignment

During installation, the agent registers itself and a certificate with the Hybrid Identity Service, associates itself with one or more AD domains, restarts, and begins periodic bootstrap checks. A locally healthy process can still be unusable if that registration or assignment is stale.

Use the portal error and configuration details to decide the next action:

- [`HybridIdentityServiceNoAgentsAssigned`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-error-codes) usually requires registering an agent and assigning it to the domain.
- [`HybridIdentityServiceInvalidResource`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-error-codes) directs the administrator to re-register the agent for the on-premises domain and restart the configuration in the portal.
- [`HybridIdentityServiceAgentSignalingError`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/reference-error-codes) means Service Bus could not signal the agent; preserve the job ID and verify network and agent responsiveness before escalating.
- `TimeOut` means the cloud request to the on-premises agent exceeded Microsoft's documented timeout; it is not proof that Active Directory itself is slow.

Re-registration changes identity state. Do not uninstall, delete a configuration, or register a replacement until you have captured the existing agent, domain, certificate, configuration, and job evidence. If another healthy agent already covers the domain, verify failover before touching the failed host.

Microsoft's configuration guidance says a stopped or uninstalled agent does not disappear immediately: it becomes Inactive after roughly one hour, is soft-deleted from the portal after roughly ten days, and is permanently unable to interact when its certificate expires. A stale portal row is therefore not proof that software remains installed.

## Check the gMSA and Active Directory path

Cloud Sync uses a group managed service account for the agent's directory work. Microsoft's prerequisite guide says the account normally appears as `domain\provAgentgMSA$` and requires a supported AD schema, reachable domain controllers, and the permissions needed for the configured scenario.

Verify:

- the agent host is still domain joined and can locate a suitable domain controller;
- the gMSA exists, its SID has not changed through recreation, and the host can retrieve its managed password;
- the expected domain is registered in the agent configuration;
- LDAP and Global Catalog connectivity match the scenario's documented requirements;
- OU delegation and object permissions have not been removed; and
- recent domain-controller, trust, DNS, Kerberos, or time changes do not explain the failure.

Keep service health separate from authorization. If the portal shows the agent Active but object writes fail with access denied, repair the gMSA's scoped permissions. If the agent is Inactive because it cannot bootstrap to Microsoft, changing OU ACLs will not restore the cloud connection.

Treat the host as control-plane infrastructure. Microsoft recommends hardening it as a Control Plane asset, restricting administrative access, using separate privileged identities, applying Windows LAPS, and denying NTLM where supported. The site's [Cloud Sync device pilot guide](/posts/microsoft-entra-cloud-sync-device-sync-pilot-guide) shows why agent health is only one half of a hybrid device flow; downstream registration still needs its own evidence.

## Separate an inactive agent from a quarantined job

Cloud Sync can quarantine a provisioning job after repeated target failures. The portal exposes the quarantine code, message, provisioning logs, agent view, and options to clear quarantine or restart the job.

Do not clear quarantine as a diagnostic reflex. First:

1. make at least one assigned agent Active;
2. identify the repeated failure that triggered quarantine;
3. correct the credential, permission, target, mapping, or service condition;
4. confirm that the affected blast radius is understood; and
5. then clear quarantine or restart the job through the supported portal action.

Microsoft also documents the Graph restart action at [`POST /servicePrincipals/{id}/synchronization/jobs/{jobId}/restart`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-troubleshoot), with controls for quarantine, escrow counters, and watermarks. Those switches change provisioning state. Use them only when the team understands which state is being cleared and has preserved the old job evidence.

The site's [Exchange attribute writeback rollout guide](/posts/microsoft-entra-cloud-sync-exchange-attribute-writeback) is a useful example of this boundary: a healthy agent can still have a writeback configuration, scope, schema, or attribute-authority failure.

## Use provisioning logs for object-level failures

Once the agent is Active and the job is not quarantined, investigate missing users, groups, contacts, devices, or writeback changes in provisioning logs.

Search by the source object's immutable AD `ObjectGuid`, not only by display name. Microsoft notes that an event with only a Source ID and status `Skipped` can indicate that the agent filtered the object because it was out of scope. Built-in critical-system objects and replication-victim objects are excluded by default, and additional schema restrictions can apply.

For each event, record:

- source and target identifiers;
- operation and status;
- the evaluated scope and mapping step;
- error code and full message;
- job ID and configuration ID; and
- UTC timestamp and the last successful predecessor event.

Restarting the agent does not place an excluded object into scope. Changing a mapping does not repair a Service Bus connection. Keep the remedy attached to the layer that produced the evidence.

For group writeback or enforcement scenarios, use the site's [AD group enforcement pilot guide](/posts/microsoft-entra-ad-group-enforcement-pilot-guide) to check the additional source-of-authority, gMSA SID, and domain-policy controls after basic agent health is restored.

## Collect a support bundle without exposing secrets

The Cloud Sync troubleshooting guide documents the local trace folder at [`C:\ProgramData\Microsoft\Azure AD Connect Provisioning Agent\Trace`](https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-troubleshoot).

It also documents `Export-AADCloudSyncToolsLogs` from the AADCloudSyncTools module. The cmdlet can include verbose tracing, change the capture duration, and write to a chosen output path.

Collect only what the incident requires. Review the bundle for tenant details, object identifiers, host names, directory paths, and other operational data before sharing it. Never add passwords, tokens, private keys, or copied agent certificates to a ticket.

A useful Microsoft escalation package includes the tenant and configuration IDs, affected domain, agent ID and host, installed version, portal status, error code, job ID, UTC failure window, service state, proxy and firewall path, gMSA name and SID, relevant provisioning events, and the exported diagnostic bundle. Note every restart, re-registration, policy change, and recovery result in order.

## Build high availability before the next outage

Microsoft recommends three active agents for Cloud Sync high availability. Its FAQ separately says the agents do not load balance and only one agent is active for processing at a time. Those statements describe failover, not horizontal throughput: deploy multiple healthy agents on separate supported hosts, but do not promise that adding agents makes one sync cycle faster.

Test failure deliberately during a maintenance window:

1. confirm all agents appear healthy and current;
2. record which host is processing the configuration;
3. stop one agent through the approved change process;
4. verify another agent assumes work and provisioning continues;
5. restore the host and confirm it returns healthy; and
6. preserve the timings as the recovery objective.

Separate hosts across patching and infrastructure failure domains where the AD and network design allows it. A second agent on the same unstable server is not high availability.

## Microsoft Entra Cloud Sync agent inactive checklist

- [ ] Record the UTC incident window, tenant, configuration, domain, job, agent, and host identifiers.
- [ ] Classify the symptom as agent health, job quarantine, or object-level provisioning.
- [ ] Confirm the agent exists and is assigned to the expected domain in the portal.
- [ ] Confirm both Microsoft agent services are present and running locally.
- [ ] Preserve service, Windows, proxy, firewall, certificate, and change evidence before restart.
- [ ] Compare the installed agent with Microsoft's current version history.
- [ ] Verify TLS 1.2, DNS, outbound 443, certificate-status access on 80, Service Bus, and proxy behavior.
- [ ] Check registration, certificate, bootstrap, and domain assignment before reinstalling.
- [ ] Verify the gMSA, SID, password retrieval, domain-controller path, and scoped permissions.
- [ ] Make an agent healthy before clearing a job quarantine.
- [ ] Search provisioning logs by AD `ObjectGuid` for a missing individual object.
- [ ] Use `Export-AADCloudSyncToolsLogs` for a bounded diagnostic capture.
- [ ] Escalate with job and correlation evidence, never secrets.
- [ ] Deploy and test multiple agents for failover; do not describe them as load balancing.

An inactive Cloud Sync agent is rarely fixed well by clicking everything that says restart. Follow the control plane: **host service, outbound channel, registration, domain assignment, directory authorization, provisioning job, then individual object**. That order restores service faster and leaves an audit trail another administrator can trust.
