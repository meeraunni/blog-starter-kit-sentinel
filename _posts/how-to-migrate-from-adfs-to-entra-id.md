---
title: "Migrating AD FS to Entra Cloud Authentication: A Decision and Test Plan"
excerpt: "Separate Microsoft 365 domain conversion from application migration. Plan staged rollout, verify PHS or PTA, and define rollback before retiring AD FS."
coverImage: "/assets/blog/adfs-to-entra-migration/diagram.svg"
date: "2026-07-05T14:00:00.000Z"
updated: "2026-10-03"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/adfs-to-entra-migration/diagram.svg"
---

> [!IMPORTANT]
> **Correction — October 3, 2026:** This guide previously implied automatic PHS/PTA failover, immediate staged-rollout transitions, and no impact on Windows Hello. It also used legacy MSOnline commands and made unsupported claims about support response times. Those statements and instructions have been removed. This is a planning guide, not a tested tenant-specific cutover script.

An AD FS migration contains at least two different changes: how users authenticate to Microsoft Entra, and how each application currently trusting AD FS will authenticate afterwards. A successful Microsoft 365 sign-in does not prove the second change is complete.

Microsoft's [federation-to-cloud-authentication guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/migrate-from-federation-to-cloud-authentication) describes prerequisites, federation backups, domain conversion, and rollback. Use its current procedure for execution. The worksheet below is an editorial planning aid for deciding whether your environment is ready.

## Build the dependency register

| Item | Record before a pilot | Acceptance evidence |
| --- | --- | --- |
| Federated domains | Domain, federation settings, owner | Intended authentication method verified |
| Microsoft 365 clients | Browser, desktop, mobile, device state | Fresh sign-ins and existing sessions tested |
| Other AD FS relying parties | Application, claims, protocol, owner | App-specific migration accepted by its owner |
| MFA and access controls | Where each requirement is enforced | Expected allowed and denied cases recorded |
| Windows Hello and device flows | Trust model and provisioning dependencies | Registration, provisioning, and sign-in tested |
| Operational tooling | Monitoring, certificates, recovery procedures | Replacement and retirement owners assigned |

Include rarely used applications and recovery procedures. If an owner cannot describe a dependency, record it as unresolved rather than treating an empty row as approval to retire the service.

## Choose and verify the authentication method

PHS and PTA have different operational dependencies. Enabling password hash synchronisation alongside PTA does **not** create automatic failover. Microsoft explicitly identifies that limitation in its [PTA limitations documentation](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta-current-limitations). A recovery plan needs a documented switching procedure and an authorised operator.

For the selected method, record what happens if a required component is unavailable. Identify how the team would detect the problem, who can act, and how they would confirm recovery. Do not treat the existence of synchronised hashes as proof that the recovery procedure works.

## Pilot supported scenarios

[Staged rollout](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-staged-rollout) is a temporary testing mechanism for selected users before domain-wide conversion. Microsoft documents limitations on group membership and authentication scenarios; nested and dynamic groups are not supported. Membership edits can take time to affect authentication. Preserve the federated identity provider during testing.

Select the pilot for coverage, not just convenience. A group of administrators using the same managed browser may miss the mobile app or device-provisioning path that causes the real incident.

For each test, capture:

- user category and device state, with identifiers redacted in shared material;
- application, resource, client, and network context;
- expected authentication route and expected access result;
- timestamp and matching sign-in evidence;
- observed prompts, failures, or differences from the baseline;
- owner and follow-up for unexplained results.

Include a denied-access case as well as a successful sign-in. Passing authentication while losing an intended access restriction is not a successful migration.

## Treat conversion as a controlled change

Microsoft's current procedure uses Microsoft Graph tooling, including `Update-MgDomain`, rather than the old `Set-MsolDomainAuthentication` example. Domain conversion is not a one-command guarantee of readiness. Preserve the federation configuration, review prerequisites and roles, and agree on the exact rollback procedure before the change window.

Assign a go/no-go decision owner. The evidence packet should show which pilot cases passed, which exceptions remain, and who accepted them. Use the [identity change record](/resources/identity-change-record.md) to capture those decisions.

## Retire AD FS only after dependency owners agree

Retirement should follow evidence from the dependency register, not an arbitrary number of weeks. Confirm that the relying parties, monitoring, recovery paths, and operational documentation no longer need the servers or proxies. Keep the unresolved items visible.

Do not promise users an identical sign-in experience. Communicate expected changes and provide a route for reporting differences. A migration is complete when the owners accept the new behaviour and the old dependencies have an explicit disposition.
