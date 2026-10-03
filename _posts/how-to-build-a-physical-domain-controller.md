---
title: "Preparing a Physical Windows Server for Active Directory"
excerpt: "A preparation and handover checklist for a physical domain controller: hardware support, recovery, network identity, deployment decisions, and acceptance evidence."
coverImage: "/assets/blog/build-physical-dc/diagram.svg"
date: "2026-07-06T14:00:00.000Z"
updated: "2026-10-03"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/build-physical-dc/diagram.svg"
---

> [!IMPORTANT]
> **Correction — October 3, 2026:** Removed hard-coded recovery passwords, blanket hardware sizing recommendations, and the claim that a single domain controller replicates with itself. Promotion instructions now have one maintained home in the linked deployment guide.

A physical domain controller needs both a directory deployment plan and a hardware recovery plan. Treat those as separate workstreams. Successful installation of Windows is not proof that the hardware, recovery access, or ongoing operations are ready for an identity workload.

This article is a preparation worksheet. It does not establish that a particular server model or specification is suitable for your workload. Start with Microsoft's [Windows Server hardware requirements](https://learn.microsoft.com/en-us/windows-server/get-started/hardware-requirements) and the hardware vendor's support matrix for your selected Windows Server version.

## Decide why the controller is physical

Record the requirement: independence from a virtualisation platform, a location constraint, an existing operational standard, or another explicit reason. Then identify the dependencies that remain. A physical server may still rely on shared power, switching, storage components, or remote management.

Draw the recovery path on a blank page. If normal sign-in is unavailable, who can reach the machine, through which access path, and with which approved credentials? Verify that the people named in the plan can actually use it.

## Build a preparation record

| Area | Evidence to capture | Unresolved question to assign |
| --- | --- | --- |
| Hardware support | Model, firmware, drivers, OS support statement | Who owns compatibility issues? |
| Capacity | Workload assumptions and measured headroom | What would trigger expansion? |
| Storage | Layout, health, redundancy, recovery procedure | How is failed hardware replaced? |
| Power | Supply and UPS dependencies | What happens during a site outage? |
| Management | Approved console access and credential custodian | Can recovery proceed without normal AD sign-in? |
| Operating system | Version, edition, patches, security baseline | Who owns future servicing? |

Redundant disks do not replace a backup. A spare server does not replace a rehearsed recovery procedure. Record those protections separately so the handover does not imply more coverage than exists.

## Set the network identity before promotion

Agree on the hostname, stable address, subnet, gateway, DNS resolvers, and AD site with the directory and network owners. Check for conflicts and document the actual interface being configured. Example addresses from an article are not allocations for your network.

For an additional controller, confirm that the configured DNS path can resolve the existing AD domain. Record the result from the server itself, not only from an administrator's laptop. Verify required connectivity using the deployment documentation for your environment.

Do not configure every controller to use an arbitrary external time source. Review its intended role in the domain time hierarchy and the organisation's time-service design. Microsoft's [Windows Time Service overview](https://learn.microsoft.com/en-us/windows-server/networking/windows-time-service/windows-time-service-top) provides the starting point.

## Keep promotion in a separate reviewed step

Use the [domain controller promotion guide](/posts/how-to-promote-a-server-to-domain-controller) to distinguish a new forest from an additional controller. Preserve the proposed deployment configuration for review and protect the DSRM recovery password. The definitive product procedure is Microsoft's [AD DS installation guide](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-active-directory-domain-services--level-100-).

Before starting, record the change window, expected interruption, acceptance checks, and operator. If you cannot state the intended scenario and DNS namespace clearly, resolve those decisions before invoking a deployment command.

## Accept the whole service

After promotion, collect directory, DNS, replication, time, and representative client observations. A lone controller has no replication partner; record that limitation instead of claiming redundancy.

Then check the physical responsibilities: monitoring, backup destination, restoration procedure, patching owner, hardware support, and console access. Give each unresolved item a named owner and a due date. The operational handover should make the remaining dependencies visible rather than ending at “the server rebooted.”
