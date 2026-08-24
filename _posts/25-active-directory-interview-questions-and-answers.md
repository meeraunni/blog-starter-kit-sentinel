---
title: "25 Active Directory Interview Questions and Answers"
excerpt: "Twenty-five practical Active Directory interview questions with clear, technically accurate answers covering AD DS, DNS, Kerberos, replication, Group Policy, recovery, and security."
coverImage: "/assets/blog/active-directory-interview-questions/cover.svg"
date: "2026-08-25T13:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/active-directory-interview-questions/cover.svg"
---

## Before we begin

Active Directory interviews are rarely won by memorizing five role names. A strong candidate can explain what happens behind the console: how a client finds a domain controller, why Kerberos falls back, how changes converge, and what evidence they would collect before touching production.

Use these questions to prepare, but do not memorize the answers word for word. Say the idea in your own language, then add a real example from your lab or work. That is usually the difference between sounding rehearsed and sounding experienced.

Microsoft's current references for the subjects in this guide include [AD DS replication concepts](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts), [operations master roles](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-fsmo-roles), [security groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups), [Kerberos](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview), and [Active Directory Recycle Bin](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/adac/active-directory-recycle-bin).

![25 Active Directory interview questions and answers](/assets/blog/active-directory-interview-questions/cover.svg)

## 1. What is Active Directory Domain Services?

Active Directory Domain Services, or AD DS, is Microsoft's directory service for Windows domains. It stores objects such as users, computers, groups, and policies; authenticates identities; supports authorization through security principals and access tokens; and replicates directory data between domain controllers.

An interview-quality answer should distinguish AD DS from the broader Active Directory brand. AD Certificate Services, Federation Services, and Lightweight Directory Services are separate roles. Microsoft Entra ID is a cloud identity service, not a hosted domain controller.

## 2. What are a forest, domain, tree, and organizational unit?

A **forest** is the top-level AD DS security and administrative boundary. It shares a schema, configuration partition, and global catalog. A **domain** is a directory partition with its own DNS name, domain policies, and domain-level administrators. A **tree** is one or more domains in a contiguous DNS namespace. An **organizational unit**, or OU, is a container inside a domain used to organize objects, delegate administration, and target Group Policy.

An OU is not a security boundary. A sufficiently privileged domain administrator can change its permissions or policies.

## 3. What does a domain controller do?

A domain controller hosts a copy of the AD DS database and provides services such as LDAP directory access, Kerberos authentication, domain discovery, and replication. A writable domain controller can accept most directory changes and replicate them to its partners. A read-only domain controller holds a read-only database and uses controlled password caching, making it useful in locations with weaker physical security or limited administration.

Healthy production domains normally have at least two domain controllers so that one server is not the only authentication and directory-service dependency.

## 4. Why is DNS critical to Active Directory?

AD DS uses DNS to publish and locate services. Clients query service records such as `_ldap._tcp` and `_kerberos._tcp` to find domain controllers, global catalogs, and Kerberos services. DNS also helps a client locate an appropriate domain controller for its site.

If domain members point only to public DNS resolvers, sign-in, domain join, Group Policy, and replication can fail even when ordinary internet name resolution works. Domain clients should use DNS servers that can resolve the AD namespace, with external lookups handled through forwarding or recursion according to the organization's design.

## 5. What are the five FSMO roles?

The forest-wide roles are **Schema Master** and **Domain Naming Master**. The roles present in every domain are **RID Master**, **PDC Emulator**, and **Infrastructure Master**.

- The Schema Master controls schema changes.
- The Domain Naming Master controls adding and removing domains and directory partitions.
- The RID Master allocates RID pools used to create unique security identifiers.
- The PDC Emulator has several operational duties, including preferential password-change handling, account-lockout processing, and serving as the top of the forest time hierarchy in the forest-root domain.
- The Infrastructure Master maintains certain cross-domain object references.

Most AD data is multi-master. These roles exist where conflicting concurrent changes would be unsafe or impractical.

## 6. What is the difference between transferring and seizing an FSMO role?

A **transfer** is a planned move in which the current and new role holders communicate. A **seizure** is a recovery action used when the current role holder is permanently unavailable.

Do not seize a role merely because a server is temporarily offline. After a seizure, the former holder must not be returned to service as though it still owns the role; rebuild it or follow Microsoft's supported recovery guidance. Before either operation, confirm replication health and identify the real role holders with tools such as `Get-ADForest`, `Get-ADDomain`, or `netdom query fsmo`.

## 7. How does Active Directory replication work?

AD DS primarily uses multi-master replication: a writable domain controller can originate most changes, and those changes replicate to other domain controllers that host the same naming context. Within a site, replication is optimized for fast, reliable networks. Between sites, administrators use site links, costs, and schedules to model WAN connectivity.

The Knowledge Consistency Checker, or KCC, builds the replication topology. Important troubleshooting tools include `repadmin /replsummary`, `repadmin /showrepl`, Event Viewer, and `dcdiag`.

## 8. What are AD sites, subnets, and site links?

A site represents one or more well-connected IP subnets. A subnet object maps an IP range to a site so clients and domain controllers can understand network location. A site link represents a logical path between sites and carries a cost and replication schedule.

Bad or missing subnet mappings can send clients to distant domain controllers and create slow sign-ins or unnecessary WAN traffic. Sites are about physical network topology; domains are logical directory partitions. They solve different problems.

## 9. What is the Global Catalog?

A Global Catalog, or GC, stores a full writable replica of its own domain plus a partial, read-only replica of objects from every other domain in the forest. It supports forest-wide searches and helps resolve universal group membership during sign-in.

The partial attribute set contains attributes selected for GC replication, not every attribute from every object. In modern designs it is common to make all domain controllers Global Catalog servers, provided capacity and application requirements have been assessed.

## 10. How does Kerberos authentication work in an AD domain?

The client first obtains a Ticket Granting Ticket, or TGT, from the Key Distribution Center on a domain controller. When it needs a service, it requests a service ticket for that service's Service Principal Name, or SPN. The client presents the service ticket to the server, which validates it without receiving the user's reusable password.

Kerberos depends on working DNS, suitable time synchronization, reachable domain controllers, and correct SPN registration. That dependency chain is more useful in troubleshooting than simply saying, “Kerberos uses tickets.”

## 11. What is an SPN, and why do duplicate SPNs matter?

An SPN identifies a service instance and the security principal under which that service runs. The KDC uses it to determine which account key should protect a service ticket.

If an SPN is missing, registered on the wrong account, or duplicated, Kerberos may fail and the application may fall back to NTLM—or fail completely. Use `setspn -Q`, `setspn -X`, and `setspn -L` carefully when investigating. Do not start by adding SPNs blindly; first confirm the service name, port behavior, application pool or service identity, and existing registrations.

## 12. What is the difference between Kerberos and NTLM?

Kerberos is ticket-based, supports mutual authentication, and is designed for delegation and domain single sign-on. NTLM is an older challenge-response protocol that does not provide the same delegation or mutual-authentication capabilities.

NTLM is not proof that a password crossed the network in clear text, but its continued use increases risk and often hides an SPN, DNS, or application-configuration problem. A mature migration starts with auditing NTLM usage and fixing dependencies before enforcing restrictions.

## 13. What is LDAP, and is LDAP the same as authentication?

LDAP is a protocol for accessing and modifying directory data. Applications use it to search objects, read attributes, and perform changes when authorized. An LDAP bind can authenticate a connection, but LDAP itself is not equivalent to an entire authentication architecture.

Plain LDAP does not provide transport encryption. LDAP over TLS, commonly called LDAPS, or LDAP with StartTLS protects the channel. Administrators should also understand LDAP signing and channel binding requirements rather than assuming that port 636 alone solves every risk.

## 14. What is Group Policy processing order?

The basic order is **Local, Site, Domain, OU**, commonly remembered as LSDOU. With nested OUs, policies linked closer to the object are processed later and can normally override conflicting settings processed earlier.

Inheritance blocking, enforced links, security filtering, WMI filters, loopback processing, link order, and item-level targeting can change the effective result. Use `gpresult /h`, Resultant Set of Policy, and the Group Policy operational log to explain what actually applied.

## 15. What is the difference between authentication and authorization?

Authentication proves who an identity is. Authorization determines what that identity may access or do. In AD DS, Kerberos or NTLM may authenticate a user, while group memberships, user rights, ACLs, and application logic influence authorization.

This distinction matters during incidents. A successful sign-in followed by “Access denied” is usually an authorization or token issue, not proof that authentication failed.

## 16. What are security identifiers and relative identifiers?

A security identifier, or SID, uniquely identifies a security principal such as a user, computer, or security group. A domain SID forms the common prefix, and a relative identifier, or RID, makes each principal's SID unique within that domain.

Domain controllers receive RID pools from the RID Master and use them when creating principals. Renaming an account does not change its SID. Deleting and recreating an account with the same name creates a different SID, which is why old permissions can appear as unresolved SID values.

## 17. Explain domain local, global, and universal group scopes.

Use **global groups** to collect accounts with a common role, **domain local groups** to assign permissions to resources in a domain, and **universal groups** when membership must be used across domains and replicated through the Global Catalog.

A common design is AGDLP: Accounts go into Global groups, Global groups go into Domain Local groups, and Domain Local groups receive Permissions. In multi-domain forests, AGUDLP adds a Universal group between the global and domain-local layers. The point is maintainable role-to-resource mapping, not merely reciting letters.

## 18. What is a trust relationship?

A trust allows authentication relationships between domains or forests. Trusts have direction and can be one-way or two-way. They may also be transitive or non-transitive depending on type.

Trust does not automatically grant access. It provides a path for one side to accept authentication claims; administrators must still grant authorization to resources. In security-sensitive designs, evaluate SID filtering, selective authentication, name resolution, firewall paths, and the administrative implications of the trusted environment.

## 19. What is a gMSA, and when would you use one?

A group Managed Service Account, or gMSA, is a domain account whose password is generated and rotated automatically by AD DS. Authorized hosts retrieve the managed password, so administrators do not need to store a static service password in scripts or manually rotate it.

Use a gMSA for supported Windows services, scheduled tasks, IIS application pools, and multi-host services. Deployment requires a working KDS root key and correct permission for the computers or groups allowed to retrieve the managed password.

## 20. What are fine-grained password policies?

Fine-grained password policies let administrators apply different password and account-lockout settings to users or global security groups within one domain. They are represented by password settings objects rather than linked to OUs like Group Policy.

Precedence determines the resultant policy when more than one object applies. Use `Get-ADUserResultantPasswordPolicy` to verify the effective policy. Protecting privileged identities also requires controls beyond password length: privileged workstations, tiering, strong authentication, credential protection, and monitoring all matter.

## 21. What happens when an AD object is deleted?

With Active Directory Recycle Bin enabled, a deleted object retains enough attributes to support a substantially complete restoration during the deleted-object lifetime. Without it, recovery may require tombstone reanimation with limited attributes or an authoritative restore from backup, depending on the situation.

The Recycle Bin is not a replacement for tested system-state backups and forest-recovery planning. It helps with accidental object deletion; it does not cover every corruption, compromise, or disaster scenario.

## 22. What is an authoritative restore?

An authoritative restore starts with restoring AD DS data from a system-state backup, then marks selected objects or a subtree with higher version numbers so those restored values replicate outward as authoritative. A non-authoritative restore instead receives newer changes from replication partners after restoration.

This is a planned recovery procedure, not a casual repair command. For routine deleted-object recovery, the AD Recycle Bin is often simpler. For forest-wide failure or compromise, follow a tested forest-recovery plan and current Microsoft guidance.

## 23. A user can sign in but cannot access a file share. How do you troubleshoot?

First separate authentication from authorization. Confirm the exact error, resource path, affected users, and whether the problem follows the user or device. Test name resolution and connectivity, then inspect the user's effective group memberships, share permissions, NTFS permissions, and current access token.

Next determine whether Kerberos or NTLM was used, check tickets with `klist`, validate the CIFS SPN, and inspect client, server, and domain-controller events. If membership was just changed, remember that the user's existing token may not include it until a new sign-in or ticket/session refresh. Change one variable at a time.

## 24. A domain controller is not replicating. What do you check first?

Start with scope and evidence: which naming contexts, partners, sites, and directions are affected? Run `repadmin /replsummary`, `repadmin /showrepl`, and `dcdiag`, then review Directory Service, DNS Server, System, and DFS Replication events where relevant.

Check DNS registration and resolution, time, network ports, secure-channel health, site-link configuration, and whether either DC has been offline beyond supported recovery limits. Do not force replication repeatedly before understanding the error; that can add noise without repairing the dependency.

## 25. How would you secure Active Directory?

There is no single hardening switch. Start with an inventory and recovery plan, then reduce standing privilege, separate administrative tiers, protect privileged credentials, use dedicated administrative workstations, deploy strong authentication where supported, and use gMSAs instead of static service passwords.

Also patch domain controllers, secure DNS, audit privileged groups and delegation, phase out legacy protocols, enforce LDAP protections after compatibility testing, monitor replication and authentication, and test backups. Microsoft's current direction also emphasizes protecting highly privileged identities and treating compromise of a forest-level administrator as compromise of the forest.

The best interview answer prioritizes. Explain what you would do in the first week, the first month, and the next quarter—and how you would measure whether risk actually went down.

## A five-minute interview checklist

Before an Active Directory interview, make sure you can explain these without notes:

- How DNS helps a client find a domain controller.
- How a TGT differs from a service ticket.
- Why an SPN problem can produce NTLM fallback.
- What each FSMO role protects and when seizure is justified.
- How sites and subnets influence client placement and replication.
- How to separate authentication, authorization, DNS, and replication failures.
- Why recovery testing is part of security, not merely operations.

And keep one honest sentence ready: “I have not operated that feature in production, but here is how I understand it and how I would validate it safely.” Good interviewers trust disciplined uncertainty more than confident invention.
