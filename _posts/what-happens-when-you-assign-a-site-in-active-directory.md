---
title: "Changing an Active Directory Subnet’s Site: What to Verify"
excerpt: "A subnet-to-site change can affect domain controller discovery, site-linked Group Policy, and site-aware services. Verify each separately instead of assuming a fixed convergence time."
coverImage: "/assets/blog/assign-site-in-ad/diagram.svg"
date: "2026-07-06T10:00:00.000Z"
updated: "2026-10-01"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/assign-site-in-ad/diagram.svg"
---

> [!IMPORTANT]
> **Correction — October 1, 2026:** The previous version said a site change leaves Group Policy behaviour unchanged and implied universal replication and client-cache deadlines. Those claims were too broad. Site-linked GPOs can change the applicable policy set, and discovery and convergence depend on the environment. The revised article separates the checks below. Commands are diagnostic examples; they have not been executed against your domain.

Moving a subnet to a different Active Directory site changes the network-topology information clients and services can use. It does not move computer accounts to a different organisational unit, create a local domain controller, or prove that every client is already using the desired controller.

Begin with a small, identifiable client population. Record its current observations before editing the mapping. A before-and-after record is more useful than a statement that the console now shows the expected site name.

## Keep three questions separate

| Question | Evidence to collect | What the evidence does not prove |
| --- | --- | --- |
| Does the client identify the intended site? | Client IP, matching subnet, site reported by the client | That every service has refreshed its own state |
| Which domain controller does discovery return? | Discovery result, controller site, time of lookup | That all existing application sessions moved |
| Which policies apply? | Resultant policy before and after | That the change is harmless just because sign-in works |

This separation helps avoid a common investigation mistake: using one successful lookup to close a change that also affects policy or application behaviour.

## Check discovery without promising a particular controller

Microsoft documents how [DC Locator uses DNS, site information, and cached discovery results](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/dc-locator). A site mapping helps discovery find an appropriate controller, but reachability, available controllers, and the requested capabilities also matter. Do not promise that a particular controller will serve every request.

On a representative domain-joined Windows client, collect:

```powershell
# Replace contoso.com with the actual AD DNS domain.
nltest /dsgetsite
nltest /dsgetdc:contoso.com
```

Save the full output with its timestamp. Compare the returned site and controller with the intended topology. If the result is unexpected, verify the client's actual IP configuration, the subnet definition, and the availability of suitable controllers before changing another setting.

A forced discovery is a separate observation:

```powershell
nltest /dsgetdc:contoso.com /force
```

Label it as forced in the record. Do not describe it as proof that every running application has abandoned an existing connection. Microsoft's [nltest command reference](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc731935(v=ws.11)) describes the diagnostic flags.

## Review site-linked Group Policy

The old version of this article claimed that the same GPOs necessarily apply after a site change. That was incorrect. Microsoft describes Group Policy processing in the order local, site, domain, and organisational unit, with inheritance and precedence affecting the result. A different site can therefore introduce a different set of site-linked policies. See [Group Policy processing](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-processing).

Inspect links on both the old and new sites. Record any differences that could matter to the pilot population, then collect resultant policy before and after the change. For example, from an appropriately privileged command prompt:

```powershell
gpresult /h "$env:TEMP\site-policy-review.html"
```

Use distinct filenames for the before and after reports. Examine actual applied and denied policies; do not infer them solely from the site name. The [gpresult reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/gpresult) explains the report options and scope.

## Use observations, not a countdown

Do not promise that all clients converge after fifteen seconds, one hour, or three hours. Directory replication, topology, client discovery, and application connections are different mechanisms. Record which controller received the change and verify the relevant directory replicas and clients rather than treating a timer as acceptance evidence.

For each pilot client, record:

- the mapping and discovery result before the change;
- the time of the configuration change;
- the observed site and discovered controller after it;
- the resultant policy differences;
- the outcome of the specific applications or site-aware services in scope.

If an observation differs from the plan, stop expansion and investigate that difference. Avoid forcing forest-wide replication or restarting services simply to make the change appear complete.

## Define acceptance and rollback first

Write down what the site change is supposed to improve. “The console looks correct” is weaker than an acceptance record showing the intended mapping, reachable services, and expected policy results for the pilot.

Keep the original subnet mapping and any separately edited policy configuration. Assign a rollback owner and an observable trigger. Restoring the mapping does not prove that clients and applications have refreshed; repeat the same checks after restoration.

Use the free [identity change record](/resources/identity-change-record.md) to keep the observations, decision, and follow-up owner together.
