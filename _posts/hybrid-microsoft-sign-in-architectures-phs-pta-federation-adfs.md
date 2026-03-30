---
title: "Hybrid Microsoft Sign-In Architectures Explained: Password Hash Sync, Pass-Through Authentication, and Federation with AD FS"
excerpt: "A detailed technical guide to hybrid Microsoft sign-in architectures, including password hash synchronization, pass-through authentication, and federation with AD FS or PingFederate, with examples and backend validation flow."
coverImage: "/assets/blog/hybrid-signin-architectures/cover.svg"
date: "2026-03-29T09:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/hybrid-signin-architectures/cover.svg"
---

## Overview

Hybrid Microsoft sign-in architecture is one of the most important topics in identity design and one of the most misunderstood. Engineers often ask "are we using Entra authentication or Active Directory authentication?" as if the answer must be only one or the other. In real hybrid environments, that question is too blunt.

The more accurate technical question is:

**Where does primary validation happen when the user identity comes from on-premises Active Directory but the application or service lives in Microsoft Entra or Microsoft 365?**

This article explains the three major hybrid sign-in models:

1. Password Hash Synchronization (PHS)
2. Pass-Through Authentication (PTA)
3. Federation with Active Directory Federation Services (AD FS) or PingFederate

The primary Microsoft references are [What is password hash synchronization with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-phs), [User sign-in with Microsoft Entra pass-through authentication](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta), and [What is federation with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-fed).

![Hybrid sign-in architectures](/assets/blog/hybrid-signin-architectures/cover.svg)

## What this category means

These are not protocols like Kerberos or SAML. They are architectural patterns that determine how Microsoft Entra and on-prem identity systems divide responsibility.

All three models usually share a common starting point:

1. the user object originates from on-prem Active Directory
2. directory objects are synchronized to Microsoft Entra
3. users need to sign in to cloud services such as Microsoft 365

The architectural difference is where the cloud service gets the final answer to the question: **is this password or sign-in proof valid for this identity right now?**

## Password Hash Synchronization

**Password Hash Synchronization (PHS)** is the model in which synchronized password hash material allows Microsoft Entra to validate passwords directly in the cloud.

### What PHS means

PHS is often described too casually as "syncing passwords to the cloud." The more accurate description is that Microsoft Entra Connect synchronizes a derived form of password hash material so Microsoft Entra can validate the password without asking an on-prem domain controller every time the user signs in.

That is a major architectural decision. It means the sign-in page is Microsoft Entra and the primary password validation also happens in Microsoft Entra.

### Example scenario

An organization wants users to sign in to Microsoft 365 even if the on-prem network is degraded or the data center is temporarily unreachable. It still uses Active Directory as the authoritative user directory, but it wants cloud sign-in to be resilient and simple. PHS is often the best fit for that requirement.

### What happens in the backend

Microsoft Entra Connect synchronizes a hash of the on-prem password hash to Microsoft Entra. When the user signs in to Microsoft Entra, the password is validated in the cloud against the synchronized hash material. If validation succeeds, Microsoft Entra continues with whatever additional controls apply, such as multifactor authentication, Conditional Access, and token issuance for Microsoft 365 or custom apps.

This means the cloud sign-in path does not require a live password check against a domain controller for every authentication event.

### Why it matters

PHS is usually the simplest operational model because it reduces dependencies in the runtime sign-in path. The tradeoff is architectural rather than experiential: the organization is accepting cloud-side password validation using synchronized hash material rather than insisting that every password check remain on-premises.

## Pass-Through Authentication

**Pass-Through Authentication (PTA)** is the model in which Microsoft Entra handles the sign-in front end, but on-premises agents perform the actual password validation against Active Directory.

### What PTA means

PTA is often chosen by organizations that want Microsoft Entra to remain the cloud sign-in surface but do not want password hash material synchronized for validation in the cloud. In PTA, the password check still happens on-prem, but the user experience starts with Microsoft Entra.

### Example scenario

An organization wants users to browse directly to Microsoft 365 and see the standard Microsoft Entra sign-in page, but it wants the authoritative password check to remain in Active Directory. It deploys PTA agents on-premises to provide that capability.

### What happens in the backend

The user enters credentials at the Microsoft Entra sign-in page. Microsoft Entra encrypts the sign-in request and places it into a secure queue. One of the on-prem PTA agents retrieves the request over outbound-only connectivity. That agent validates the password directly against Active Directory and returns the result to Microsoft Entra. Microsoft Entra then completes the rest of the cloud-side sign-in controls, such as MFA, Conditional Access, and token issuance.

This is why PTA is not merely "cloud sign-in with an on-prem dependency." It is a deliberate split model: Microsoft Entra owns the cloud sign-in orchestration, while the actual password validation is delegated back on-prem.

### Why it matters

PTA gives organizations a middle ground between PHS and full federation. But the runtime dependency chain is more complex than PHS because healthy PTA agents and on-prem directory reachability are required for successful sign-in.

## Federation with AD FS or PingFederate

**Federation** in this context means that Microsoft Entra redirects the user to another identity provider, such as **Active Directory Federation Services (AD FS)** or PingFederate, for primary authentication.

### What federation means

This is the strongest separation between Microsoft Entra and the actual primary authentication authority. Microsoft Entra recognizes that the domain is federated and sends the user to the external federation service. That external system performs the real authentication and returns an assertion or token that Microsoft Entra trusts.

### Example scenario

An enterprise has deep AD FS investments, custom smart-card or certificate logic, or partner-trust designs already built around AD FS. When users browse to Microsoft 365, Microsoft Entra sees that the domain is federated and redirects the user to AD FS for primary sign-in.

### What happens in the backend

Microsoft Entra determines from domain configuration that the user belongs to a federated domain. The browser is redirected to AD FS or another federation service. That external identity provider authenticates the user using its own policies and methods. It then returns a token or assertion to Microsoft Entra. Microsoft Entra accepts that result and issues the cloud tokens needed for Microsoft 365 or other cloud resources.

This means Microsoft Entra is no longer the primary credential-validation authority for that domain. It becomes the cloud resource and token issuer that trusts an external authentication authority.

### Why it matters

Federation gives organizations the greatest control over the primary authentication experience, but it also gives them the most operational dependency on external identity infrastructure. If AD FS is unhealthy, cloud sign-in can fail even if Microsoft Entra itself is healthy.

## How the three models differ

The cleanest technical summary is:

1. with **PHS**, Microsoft Entra validates the password in the cloud
2. with **PTA**, Microsoft Entra orchestrates sign-in but an on-prem PTA agent validates the password
3. with **Federation**, an external identity provider such as AD FS performs primary authentication

That difference changes several things at once:

1. resilience of the sign-in path
2. dependency on on-prem infrastructure
3. troubleshooting ownership
4. operational complexity

This is why hybrid sign-in architecture is not an academic topic. It directly affects real-world outage behavior and support ownership.

## Troubleshooting mindset

Each architecture produces a different support path.

If PHS fails, the investigation usually begins with synchronization health, cloud object state, and Microsoft Entra sign-in diagnostics. If PTA fails, the investigation also includes PTA agent health, connectivity, and domain controller validation path. If federation fails, the investigation often begins outside Microsoft Entra because the primary authentication authority is AD FS or another federated identity provider.

That is one of the strongest reasons engineers must categorize these properly. If you treat them all as generic "Entra login problems," you start in the wrong place more often than not.

## Key implementation points

1. PHS, PTA, and federation are architectural models, not authentication protocols.
2. The central design question is where primary validation happens.
3. PHS gives the cloud the most independence at sign-in time.
4. PTA keeps password validation on-prem while preserving a Microsoft Entra front-end experience.
5. Federation places the primary authentication authority outside Microsoft Entra.

## References

- [What is password hash synchronization with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-phs)
- [User sign-in with Microsoft Entra pass-through authentication](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta)
- [What is federation with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-fed)
