---
title: "Microsoft Entra Permissions Management: CIEM Across Azure, AWS, and GCP"
excerpt: "The gap between permissions granted and permissions used is the cloud security metric nobody can produce on demand. Identities have ten times the permissions they actually exercise, the over-grant accumulates silently, and the next breach lateral-moves on capabilities the compromised account never legitimately needed. Permissions Management is Microsoft's CIEM answer — and a measured rollout is what makes it useful instead of overwhelming."
coverImage: "/assets/blog/microsoft-entra-permissions-management-ciem/diagram.svg"
date: "2026-06-17T13:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/microsoft-entra-permissions-management-ciem/diagram.svg"
---

There's a metric most cloud security programs can't produce on demand but absolutely should: for any given identity — a user, a service principal, an EC2 instance role, a GCP service account — what percentage of the permissions it has granted to it does it actually use? In most environments the answer turns out to be in the single digits. A typical user-shaped identity in a long-lived Azure subscription has been granted permissions across hundreds of operations and uses about a dozen. The other ninety-something percent is dormant grant, accumulated through six rounds of "we needed this for that one migration" plus the inevitable Contributor-on-the-whole-subscription assignments that were always meant to be temporary.

That gap matters because the next breach laterals on the permissions the compromised account *has*, not the ones it usually *uses*. The attacker doesn't care that the identity historically only listed storage accounts; if it has Owner on a resource group, the attacker uses Owner. Cloud Infrastructure Entitlement Management (CIEM) is the category of tools that measures the gap, surfaces the over-grant, and helps you right-size identities back toward what they actually need. Microsoft Entra Permissions Management is Microsoft's CIEM product — originating in the CloudKnox acquisition — and it works across Azure, AWS, and GCP from a single pane.

This piece is the operator's view: what Permissions Management actually does, the conceptual model worth internalising before you turn it on, a staged rollout that doesn't drown you in findings, and what to integrate it with. The Microsoft references throughout are [What's Microsoft Entra Permissions Management](https://learn.microsoft.com/entra/permissions-management/overview), the [onboarding guides for Azure, AWS, and GCP](https://learn.microsoft.com/entra/permissions-management/onboard-azure), and the [Permission Creep Index documentation](https://learn.microsoft.com/entra/permissions-management/ui-dashboard).

## The model — granted, used, and the gap

The single most useful concept Permissions Management surfaces is the **Permission Creep Index (PCI)** — a 0 to 100 score per identity in each connected cloud that captures the gap between permissions granted and permissions exercised. A PCI of 0 means the identity is exercising every permission it has been granted. A PCI of 100 means the identity has high-blast-radius permissions it never uses. Low PCI = right-sized. High PCI = over-granted.

The scoring takes into account both how many permissions are over-granted and how sensitive the over-granted permissions are. An identity over-granted on `Microsoft.Storage/storageAccounts/listKeys/action` scores worse than one over-granted on a hundred read-only listing permissions. The math is deliberately weighted toward blast-radius rather than count.

What Permissions Management is *not* asking is "could you in principle take these permissions away" — the analysis isn't aware of your organisation's context, why an identity was granted what it has, or which dormant permissions are actually load-bearing for some rare-but-critical operation. The score is a signal. The decision about what to actually right-size still requires a human reviewer who understands the workload.

> [!IMPORTANT]
> A high PCI score is a hint, not a verdict. Identities with rare-but-critical actions — disaster recovery operators, emergency-access break-glass roles, periodic compliance attestation jobs — will legitimately have high PCI scores because the actions they exercise happen quarterly or annually rather than weekly. Investigate before right-sizing. Don't mass-revoke based on the dashboard alone.

## Onboarding — start read-only

The product supports a read-only ingestion mode and a controller mode that can actively make permission changes. Don't start with controller mode. The pattern that works:

1. **Onboard Azure first**. This is the cloud Microsoft knows best, the analysis is most mature, and the staging risk is lowest because your identity team controls the IAM directly. Read-only. Single subscription to start; ideally a non-production subscription with realistic activity.
2. **Let it run for 90 days minimum** before drawing any conclusions. Permissions Management needs activity history to compute meaningful PCI scores. A 30-day window on a low-activity subscription will produce skewed scores that wouldn't survive a real review.
3. **Add AWS or GCP next**, after the Azure baseline has produced something the team can interpret. Multi-cloud connectors require role/service-account setup in the target cloud; the documentation is good but the setup has more moving parts than the Azure integration.
4. **Move from read-only to controller mode for specific identities** once you've used the dashboard for a quarter and trust the recommendations. Controller mode is opt-in per identity and lets the product apply the right-sizing recommendations directly. Most teams don't need this — the workflow of "Permissions Management flags an over-grant, the identity owner is notified, they make the change in their cloud's native IAM" is enough governance without giving a third-party tool write access to your IAM.

## What to do with the findings

The product produces three categories of finding that matter operationally:

**Identities to right-size.** High PCI score, regular activity, well-understood workload. These are the easiest wins — replace the broad role with a custom role scoped to the actually-used permissions. The dashboard surfaces a recommended set of permissions based on observed usage; you can use that as the starting point for the custom role.

**Identities to investigate.** High PCI score, sporadic activity, unclear workload. These need a conversation with the workload owner before any action. The PCI score has flagged them; that's the value of the product. The decision about what to do still needs human context.

**Identities to retire.** High PCI score and *no recent activity at all*. These are orphans — identities that nobody is using, granted permissions, and never cleaned up. Retire them. The corresponding workload is either gone or hasn't been touched in long enough that you should re-create from scratch.

Don't pretend the dashboard is doing the work for you. The product gives you the data; the team has to do the right-sizing. Without that follow-through, the PCI numbers improve marginally over time and then stop, and you've installed a CIEM product to no benefit.

## Where this fits with everything else

Permissions Management is the *measurement and right-sizing* layer. It complements but does not replace:

- **Native cloud IAM**. Azure RBAC, AWS IAM policies, GCP IAM bindings stay where they are. Permissions Management reads from them and recommends changes; you apply the changes through the native cloud's IAM, not through Permissions Management's UI (unless you've opted into controller mode for that identity).
- **Microsoft Defender for Cloud**. Defender's identity-and-access posture findings cover some overlapping ground — surface-area warnings, anomalous activity detection. Permissions Management is more focused on the granted-versus-used gap specifically.
- **Microsoft Entra ID Governance**. Access Reviews, Entitlement Management, PIM. Those are about *the lifecycle* of grants — who requested, who approved, when it expires. Permissions Management is about *the shape* of grants — how much capability the grant carries versus how much capability is actually exercised. The two operate on different axes.
- **CSPM / CNAPP tooling** from third-party vendors (Wiz, Orca, Lacework). These often include CIEM modules of their own. If you've already standardised on one of those, Permissions Management is duplicative; if you haven't, it's a credible first-party option in the Microsoft ecosystem.

## Things people ask

*What's the licensing model?* Permissions Management is licensed per cloud-workload-identity rather than per directory user — the bill scales with the number of identities being analysed in your connected clouds. Verify current pricing in your tenant's licensing dashboard before assuming.

*Does Permissions Management work for on-premises Active Directory?* No. It's a multi-cloud product for cloud-native IAM (Azure RBAC, AWS IAM, GCP IAM). On-premises AD is a different problem with different tooling.

*Can I write KQL against Permissions Management data?* Permissions Management data flows into Microsoft Sentinel via a connector. Once connected, the findings and PCI score history are queryable. Useful for correlating CIEM signals with sign-in anomalies in `SigninLogs` and risk events in `AADRiskDetections`.

*How does this interact with Conditional Access?* Conditional Access governs *when* an identity can authenticate and which controls apply at sign-in. Permissions Management governs *what an authenticated identity can do*. They're orthogonal layers. A user who passes Conditional Access still operates within the permissions their roles grant, and Permissions Management surfaces whether those permissions are over-granted.

*If I revoke a permission and it breaks something, how do I find out fast?* The cloud's native audit log surfaces `Forbidden` failures. Sentinel queries against the relevant cloud's resource activity tables will catch denied operations quickly. Run a small canary period — apply the right-sizing change to one identity, watch for denied operations for two weeks before applying the same change to the broader population.

## Where to read further

- [What's Microsoft Entra Permissions Management — Microsoft Learn](https://learn.microsoft.com/entra/permissions-management/overview)
- [Onboard Azure subscriptions — Microsoft Learn](https://learn.microsoft.com/entra/permissions-management/onboard-azure)
- [Onboard AWS accounts — Microsoft Learn](https://learn.microsoft.com/entra/permissions-management/onboard-aws)
- [Onboard GCP projects — Microsoft Learn](https://learn.microsoft.com/entra/permissions-management/onboard-gcp)
- [Permission Creep Index dashboard — Microsoft Learn](https://learn.microsoft.com/entra/permissions-management/ui-dashboard)
- [Integrate with Microsoft Sentinel — Microsoft Learn](https://learn.microsoft.com/entra/permissions-management/how-to-use-incident-alert-sentinel)
