---
title: "Microsoft Authentication Protocols and Sign-In Models: Kerberos, NTLM, LDAP, SAML, WS-Federation, OAuth, OpenID Connect, AD FS, and Microsoft Entra ID"
excerpt: "A technical guide to the major authentication protocols and sign-in models used in Microsoft environments, including Kerberos, NTLM, LDAP bind, SAML, WS-Federation, OAuth 2.0, OpenID Connect, passkeys, certificate-based authentication, AD FS, and Microsoft Entra sign-in models."
coverImage: "/assets/blog/auth-protocols/cover.svg"
date: "2026-03-28T23:20:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/auth-protocols/cover.svg"
---

## Overview

When administrators talk about "authentication," they often mix together three different things:

1. **authentication protocols**, such as Kerberos or NTLM
2. **federation and token protocols**, such as SAML, WS-Federation, OAuth 2.0, and OpenID Connect
3. **Microsoft sign-in architectures**, such as password hash sync, pass-through authentication, or federation with AD FS

That mix-up is why identity conversations become confusing so quickly. `AD FS SAML` and `Microsoft Entra SAML` are not two different protocols. They are both SAML-based sign-in patterns, but they use different identity providers, different trust boundaries, and different control planes. Likewise, `OAuth` is not the same thing as `OpenID Connect`, even though they are often used together. And `password hash sync` is not a protocol at all. It is a sign-in architecture.

This article focuses on the major authentication and sign-in models you will actually see in Windows, Active Directory, LDAP-integrated applications, AD FS, Microsoft Entra, and SaaS integrations. It is not a list of every authentication mechanism in computing. It is a practical technical map for Microsoft identity engineers.

Before going protocol by protocol, it helps to start with the plain-language identity concepts first. If those concepts are fuzzy, Kerberos, SAML, OAuth, and federation all start sounding like disconnected acronyms instead of different answers to different identity problems.

Primary Microsoft sources for this topic include:

- [Windows authentication overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-overview)
- [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)
- [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview)
- [Lightweight Directory Access Protocol (LDAP)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/lightweight-directory-access-protocol-ldap)
- [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol)
- [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [What is federation with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-fed)
- [User sign-in with Microsoft Entra pass-through authentication](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta)
- [What is password hash synchronization with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-phs)
- [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [What is Microsoft Entra authentication?](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods)
- [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication)

![Microsoft authentication protocols map](/assets/blog/auth-protocols/cover.svg)

## The basic concepts first

### What is authentication?

Authentication answers one question: **who are you?**

When a user types a username and password, presents a certificate, touches a security key, or completes a passkey prompt, the system is trying to establish confidence about the identity of the person or workload making the request.

Authentication does not automatically answer what that identity is allowed to do. It only establishes identity with some level of assurance. Microsoft says the same thing differently across its documentation: sign-in methods prove identity, then access controls and authorization logic decide what that identity can access.

### What is authorization?

Authorization answers a different question: **what are you allowed to do now that I know who you are?**

This distinction matters because many failures that users call "authentication problems" are actually authorization problems. A user can authenticate successfully and still be blocked by:

1. group-based app assignment
2. Microsoft Entra Conditional Access
3. missing API permissions
4. application-level role checks
5. file, mailbox, or SharePoint ACLs

This is also why OAuth 2.0 is so often misunderstood. OAuth mainly tells a resource what the caller is allowed to do. That is authorization, not pure identity proof.

### What is a protocol?

A protocol is simply an agreed technical set of message formats and rules that lets two or more systems complete an identity transaction in a predictable way.

Kerberos is a protocol because the client, domain controller, and server all know how to exchange tickets. SAML is a protocol because the service provider and identity provider both understand how a SAML request and SAML assertion are structured. OpenID Connect is a protocol layer because the application and identity provider both know what an ID token is and how the redirect-based sign-in flow works.

Without a protocol, every application would invent its own sign-in language. Protocols exist so identity systems can trust each other's messages.

### What happens in the backend when a user types a username?

The exact answer depends on the sign-in model, but the pattern is always some version of this:

1. the client captures an identifier such as a username, UPN, or email address
2. the application or identity provider determines where that identity lives
3. the system chooses the correct authentication path for that identity
4. the user is challenged with a password, certificate, passkey, smart card, PIN, or another sign-in method
5. the identity system validates the proof
6. the system issues a session, ticket, assertion, or token that downstream services can trust
7. authorization controls then decide what the now-authenticated identity can actually access

The most important lesson here is that typing a username is usually only the routing trigger. The identity platform first has to decide **which authority should validate this identity** and **which protocol should be used for the rest of the exchange**.

In Active Directory, that may mean a domain controller and Kerberos. In a SaaS app integrated with Microsoft Entra, that may mean a redirect to Entra and an OpenID Connect or SAML exchange. In a legacy appliance, it may mean an LDAP bind straight to the directory.

### What can be returned after successful authentication?

Different protocols produce different proof artifacts:

1. Kerberos returns tickets
2. NTLM completes a challenge-response validation
3. SAML returns a signed assertion
4. WS-Federation returns a federation token
5. OAuth returns access tokens and often refresh tokens
6. OpenID Connect returns an ID token and usually OAuth tokens
7. Passkeys and certificate-based methods usually feed a higher-level token issuance system such as Microsoft Entra, which then issues tokens for applications

That is why identity engineers should think beyond the original credential prompt. The actual thing your application trusts is often not the password itself, but the token, ticket, assertion, or session created after successful authentication.

## Authentication protocols versus token protocols versus sign-in architectures

The cleanest way to understand the Microsoft identity landscape is to separate the categories before diving into the details.

**Authentication protocols** prove identity to a system or resource. Kerberos and NTLM are the classic Windows examples.

**Federation and token protocols** move identity assertions or authorization artifacts between an identity provider, client, and application. SAML, WS-Federation, OAuth 2.0, and OpenID Connect live here.

**Sign-in architectures** describe where password validation or authentication happens in a Microsoft hybrid environment. Password hash sync, pass-through authentication, and AD FS federation are in this category.

If you do not separate these layers, it becomes difficult to explain why a sign-in uses Kerberos inside the domain, OpenID Connect to a SaaS app, and password hash sync as the cloud authentication architecture behind the scenes.

Another way to say this is:

1. **authentication protocols** answer how identity is proven
2. **token and federation protocols** answer how that proof is moved between systems
3. **sign-in architectures** answer where validation really happens in a hybrid environment

Many real sign-ins use all three layers at once.

## Quick reference

| Type | Main purpose | Common Microsoft use |
| --- | --- | --- |
| Kerberos | Domain authentication and ticket-based SSO | Active Directory domain logon, Windows-integrated access |
| NTLM | Legacy challenge-response authentication | Fallback or legacy Windows authentication |
| LDAP bind | Directory-backed credential validation | Third-party apps, appliances, Linux apps, older enterprise apps against AD |
| SAML 2.0 | Browser federation with signed assertions | Enterprise app SSO in AD FS and Entra |
| WS-Federation | Browser federation for Microsoft-era web apps | Older Microsoft 365 and AD FS scenarios |
| OAuth 2.0 | Delegated or app-to-app authorization | APIs, Graph, mobile and web app token acquisition |
| OpenID Connect | Authentication layer over OAuth 2.0 | Modern web and native sign-in to Entra |
| Passkeys / FIDO2 | Phishing-resistant public key sign-in | Passwordless primary auth in Entra |
| Certificate-based auth | X.509-based sign-in | Smart card / PKI-backed Entra sign-in |
| Windows Hello for Business | Passwordless enterprise sign-in | Windows logon to Entra and AD resources |
| Password hash sync | Cloud sign-in model | Hybrid identity with cloud password validation |
| Pass-through authentication | Hybrid sign-in model | Cloud sign-in with on-prem password validation |
| Federation with AD FS / Ping | Hybrid sign-in model | On-prem authentication authority for cloud access |

## Kerberos

Kerberos is the primary authentication protocol for modern Windows domain environments. As Microsoft explains in [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview), it is a ticket-based protocol in which the domain controller hosts the **Key Distribution Center (KDC)** and issues tickets that prove the identity of the user or service.

From first principles, Kerberos exists to solve a basic enterprise problem: users should not have to send their password to every server they access. Instead, a trusted central authority issues cryptographic tickets that servers can rely on.

The backend flow matters more than the acronym:

1. the user signs in and proves knowledge of credentials to the KDC
2. the KDC issues a **Ticket Granting Ticket (TGT)**
3. when the user needs a service, the client presents the TGT to the KDC
4. the KDC issues a **service ticket** for that target service
5. the client presents the service ticket to the application or server

The security benefit is that the user's password is not sent to every server. The server trusts the KDC-issued ticket instead of independently asking the user for the password. That is why Kerberos is the core protocol behind Windows domain single sign-on.

Kerberos is also the reason identity engineers need to think in terms of **tickets**, **SPNs**, **delegation**, and **KDC trust** rather than only usernames and passwords. If the KDC cannot issue a valid ticket, the service cannot trust the identity even if the user account itself is valid.

## NTLM

NTLM is the older Windows challenge-response protocol and is documented by Microsoft in [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview). It is still widely encountered because legacy applications, legacy protocols, and broken Kerberos scenarios often fall back to it.

At a very basic level, NTLM solves the same problem Kerberos solves, but with an older model. The server wants proof that the client knows the password-derived secret, but it does not use the Kerberos ticket system to do it.

Unlike Kerberos, NTLM does not rely on the KDC issuing tickets for service access. Instead, it uses a challenge-response model:

1. the client asks for access
2. the server issues a challenge
3. the client proves knowledge of the password-derived secret by computing a response
4. the server or a domain controller validates that response

That is a much less scalable and less elegant model than Kerberos because the resource server often has to participate directly in validation or contact a domain controller during the exchange. It also lacks many of the SSO and delegation strengths of Kerberos.

In practical terms, NTLM still matters because any environment that says "Windows integrated authentication" may still be using NTLM for some flows, especially where Kerberos fails because of SPN issues, name resolution issues, or legacy application design.

## LDAP and LDAP bind authentication

LDAP belongs in this conversation, but it needs to be categorized correctly. LDAP is primarily a **directory access protocol**, not a federation protocol and not a ticketing protocol like Kerberos. Microsoft describes LDAP in [Lightweight Directory Access Protocol (LDAP)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/lightweight-directory-access-protocol-ldap) as the protocol used by clients to access directory services.

From a beginner's point of view, LDAP is the language applications use to talk to a directory. It can be used to search for users, read group memberships, and in bind scenarios, validate credentials.

When administrators say "LDAP authentication," they usually mean **LDAP bind authentication**. In that model, the application is not asking the domain controller for a Kerberos ticket and it is not redirecting the user to a cloud identity provider. Instead, the application talks directly to the directory service and attempts to bind using the supplied credentials.

The simplified backend flow looks like this:

1. the user enters a username and password into the application
2. the application opens an LDAP connection to Active Directory or another LDAP directory
3. the application performs a bind operation using the supplied credentials
4. if the bind succeeds, the application treats the user as authenticated
5. the application may then query group memberships or directory attributes over LDAP

This is why LDAP authentication is common in:

1. third-party enterprise applications
2. VPN appliances and firewalls
3. Linux systems integrated with AD
4. older web apps and middleware products

The key architectural difference is that LDAP bind makes the application a direct participant in password validation. That is very different from Kerberos, where the KDC issues tickets, and very different from SAML or OpenID Connect, where the identity provider authenticates the user and the application consumes an assertion or token.

From a security and modernization standpoint, LDAP authentication is important because many legacy applications still use it, but it is usually not the preferred pattern for modern SaaS and cloud application design. Modern web applications should generally prefer federation or token-based patterns over direct directory binds wherever possible.

## SAML 2.0

SAML is one of the most common federation protocols in enterprise SaaS and is documented by Microsoft in [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol). SAML is not a Windows domain protocol. It is a **browser federation protocol** that moves signed XML assertions between an identity provider and a service provider.

At a basic level, SAML exists so the application does not have to authenticate the user itself. Instead, it trusts a separate identity provider to do that job and send back a signed statement about the user.

The backend flow for SAML looks like this:

1. the user tries to access the service provider
2. the service provider redirects the browser to the identity provider
3. the identity provider authenticates the user
4. the identity provider generates a signed **SAML assertion**
5. the browser posts that assertion back to the service provider
6. the service provider validates the signature, audience, issuer, and timing claims, then creates its local session

This is where the distinction between **AD FS SAML** and **Entra SAML** becomes important. The protocol is the same. What changes is the identity provider and policy plane:

1. with **AD FS SAML**, AD FS issues the assertion and usually authenticates the user against on-prem Active Directory or an upstream provider
2. with **Microsoft Entra SAML**, Microsoft Entra ID issues the assertion and applies cloud identity controls such as Conditional Access, MFA, and Entra sign-in methods

So when people say "AD FS SAML" and "Entra SAML," they are usually talking about two different **IdP deployments** of the same federation protocol.

## WS-Federation

WS-Federation is another browser federation protocol and appears frequently in older Microsoft application stacks and older Microsoft 365 identity history. It is distinct from SAML even though both are used for federation.

Conceptually, WS-Fed solves the same broad problem as SAML: one system authenticates the user, and another system trusts the resulting token. The difference is in the message model and the application ecosystem around it.

In backend terms, WS-Fed also relies on redirection and a token issuance model:

1. the user hits the application
2. the application redirects the user to the federation provider
3. the identity provider authenticates the user
4. the identity provider issues a token for the relying party
5. the browser returns that token to the application

Where SAML uses XML assertions in the SAML-defined format, WS-Fed uses a different Microsoft/web-services federation model. In Microsoft environments, WS-Fed is important because older Microsoft services and many AD FS integrations were designed around it.

Architecturally, WS-Fed is usually encountered when modernizing older federation setups. It is less likely to be chosen for greenfield SaaS than OIDC or SAML, but identity engineers still need to recognize it because older enterprise apps may depend on it.

## OAuth 2.0

OAuth 2.0 is not primarily an authentication protocol. It is an **authorization framework**. Microsoft's [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) makes this explicit by focusing on how clients obtain tokens for APIs and resources.

This is one of the biggest identity concepts to get right. OAuth does not mainly answer "who is the user?" It mainly answers "what can this app or client call?" If the protected resource is an API, OAuth is usually the control plane for access to that API.

The backend flow depends on the grant type, but the most common modern flow is authorization code:

1. the client redirects the user to the authorization server
2. the user authenticates and consents if needed
3. the authorization server returns an authorization code
4. the client redeems the code at the token endpoint
5. the authorization server returns access tokens, and often refresh tokens

This is why OAuth matters so much in Microsoft Entra. It is the foundation for Microsoft Graph access, delegated application access, daemon applications using client credentials, and many mobile and native app interactions.

The key conceptual point is that OAuth is about **access to resources**. It tells a resource server what the client is allowed to do. If you use OAuth alone, you may still not have a full user authentication identity story. That is where OpenID Connect comes in.

## OpenID Connect

OpenID Connect, documented by Microsoft in [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc), is an authentication layer built on top of OAuth 2.0.

From a basic perspective, OIDC exists because web and mobile apps need more than an access token for APIs. They also need a standardized way to know who signed in. That is what the ID token adds.

The important architectural point is that OIDC adds **identity** to an OAuth-based flow. It introduces the **ID token**, which tells the client who the user is, while OAuth access tokens continue to tell the resource what the client can access.

The simplified backend flow is:

1. the application redirects the user to Microsoft Entra using an OIDC request
2. the user authenticates
3. Microsoft Entra returns an authorization code or tokens depending on flow
4. the application receives an **ID token** for user authentication
5. the application may also receive access tokens for downstream APIs

This is why OIDC is the standard answer for modern web app sign-in with Microsoft Entra. If you are building a modern application that needs to sign users in and optionally call APIs, OIDC plus OAuth is usually the right mental model.

## Passkeys, FIDO2, and WebAuthn

Passkeys are Microsoft's modern phishing-resistant authentication method and are covered in [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey) and the Entra authentication methods documentation. In protocol terms, passkeys rely on FIDO2 and WebAuthn concepts: the authenticator generates a public/private key pair, the private key stays protected on the device or authenticator, and the identity provider validates challenge responses using the registered public key.

From first principles, passkeys replace the reusable shared secret model of passwords with an asymmetric key model. The server stores a public key, and only the authenticator holds the private key needed to answer the challenge.

The backend model is fundamentally different from passwords:

1. during registration, the authenticator creates a key pair
2. Microsoft Entra stores the public key and method metadata
3. during sign-in, Microsoft Entra issues a challenge
4. the authenticator signs the challenge with the private key
5. Microsoft Entra validates the signed challenge against the stored public key

This is why passkeys are phishing resistant. There is no reusable password secret moving between user and server. The server validates proof of possession of the private key instead.

## Certificate-based authentication

Microsoft Entra certificate-based authentication, documented in [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication) and [What is Microsoft Entra certificate-based authentication?](https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-certificate-based-authentication), uses X.509 certificates as the primary credential.

At the most basic level, certificate authentication means the system trusts a certificate and its chain of issuance rather than trusting a password typed by the user.

The backend flow is certificate-oriented rather than password-oriented:

1. the client presents a user certificate during the sign-in flow
2. Microsoft Entra validates the certificate chain, validity, mappings, and policy requirements
3. Entra maps the certificate to the user account
4. if validation succeeds, sign-in continues without password entry

This matters because Entra CBA removes the need for AD FS when organizations want certificate authentication directly against Microsoft Entra. Historically, many organizations used federated certificate auth through AD FS. Entra CBA changes that architecture by moving certificate validation into the cloud identity provider itself.

## Windows Hello for Business

Windows Hello for Business is not just a local biometric unlock feature. Microsoft documents in [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication) that it is a passwordless, two-factor enterprise authentication system built around device-bound keys plus a local gesture such as PIN or biometrics.

This is why Windows Hello for Business should not be described as "logging in with a PIN." The PIN is only the local unlock gesture. The actual backend proof is performed using the device-bound key that Windows Hello protects.

The backend behavior depends on join state and trust model, but the Microsoft Entra joined flow illustrates the design well:

1. the user provides the Windows Hello gesture at the lock screen
2. Winlogon and LSASS pass the request to the Cloud Authentication provider
3. the provider requests a nonce from Microsoft Entra ID
4. the device signs the nonce with the user's private key
5. Microsoft Entra validates the signed nonce with the registered public key
6. Entra returns a PRT and session material

This is a very different model from password logon. The user's device-bound private key is central to the authentication proof. The PIN or biometric is the local unlock factor, not the secret that the server validates directly.

## Password hash synchronization

Password hash sync, described in [What is password hash synchronization with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-phs), is not a protocol. It is a **hybrid sign-in architecture**.

It belongs in this article because many people ask "what authentication are we using?" when what they really mean is "where is the password being validated?" PHS answers that architectural question.

In this model:

1. Microsoft Entra Connect synchronizes a hash of the on-prem AD password hash to Microsoft Entra
2. when the user signs in to Microsoft Entra, password validation happens in the cloud
3. on-prem Active Directory remains the identity source for the user object, but cloud sign-in does not need a live round-trip to a domain controller

This architecture is often misunderstood because administrators think "AD authentication in the cloud" means the cloud is checking the domain controller in real time. With PHS, it is not. Microsoft Entra is validating against synchronized hash material.

## Pass-through authentication

Pass-through authentication, documented in [User sign-in with Microsoft Entra pass-through authentication](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta), is another hybrid sign-in architecture.

Like PHS, PTA is not a protocol spoken by the application. It is a design choice about where Microsoft Entra gets the password-validation answer from.

The difference from PHS is where password validation happens:

1. the user enters credentials into the Microsoft Entra sign-in flow
2. Microsoft Entra encrypts the sign-in request and places it in a secure queue
3. the on-prem PTA agent retrieves the request over outbound-only connectivity
4. the agent validates the password directly against on-prem Active Directory
5. the result is returned to Microsoft Entra, which completes the sign-in

So in PTA, the cloud sign-in page is still Microsoft Entra, but the **password check happens on-prem**. That is the real distinction between PHS and PTA.

## Federation with AD FS or PingFederate

Federation, documented in [What is federation with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-fed), is the third major Microsoft hybrid sign-in model.

This is the most externally obvious hybrid model because the user is often redirected away from Microsoft Entra to a federated identity provider such as AD FS. The important backend point is that Microsoft Entra is no longer the primary credential-validation authority for that domain.

In this design:

1. Microsoft Entra identifies that the domain is federated
2. the user is redirected to the on-prem or external federation service, such as AD FS
3. the federation service authenticates the user
4. the federation service issues a token or assertion back to Microsoft Entra
5. Microsoft Entra accepts that external authentication result and issues its own tokens as needed

This is why AD FS is often described as the **authentication authority** in a federated environment. The credential validation and primary authentication happen outside Microsoft Entra. That is a very different trust model from both PHS and PTA.

## A practical way to think about AD FS SAML versus Entra SAML

Since you specifically mentioned both, the cleanest explanation is this:

**AD FS SAML**

1. the application trusts AD FS as the identity provider
2. AD FS authenticates the user, often against Active Directory
3. AD FS issues the SAML assertion
4. the application creates its session from the AD FS assertion

**Microsoft Entra SAML**

1. the application trusts Microsoft Entra as the identity provider
2. Microsoft Entra authenticates the user using Entra-controlled methods and policies
3. Microsoft Entra issues the SAML assertion
4. the application creates its session from the Entra assertion

Same protocol. Different IdP. Different policy engine. Different operational model.

## Which ones matter most today

For most modern Microsoft environments, the protocols and models that matter most are:

1. **Kerberos** for Windows domain and on-prem integrated authentication
2. **LDAP bind** for legacy and directory-integrated application authentication
3. **OpenID Connect and OAuth 2.0** for modern cloud applications and APIs
4. **SAML** for enterprise SaaS federation
5. **Passkeys, CBA, and Windows Hello for Business** for modern phishing-resistant primary authentication
6. **PHS, PTA, or Federation** for deciding how hybrid users authenticate into Microsoft Entra

NTLM and WS-Federation are still important, but they are usually modernize-or-support topics rather than preferred greenfield choices.

## Key implementation points

1. `AD FS SAML` and `Entra SAML` are usually the same SAML protocol implemented by different identity providers.
2. OAuth 2.0 is primarily about authorization, while OpenID Connect adds user authentication on top of OAuth.
3. PHS, PTA, and Federation are sign-in architectures, not authentication protocols.
4. Kerberos remains the main Windows domain authentication protocol, while NTLM is mostly the legacy or fallback path.
5. LDAP bind authentication is common in legacy and directory-integrated apps, but it is a direct directory validation pattern rather than a modern federation model.
6. Passkeys, CBA, and Windows Hello for Business all move authentication away from reusable passwords, but they do so using different credential models.

## References

- [Windows authentication overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-overview)
- [Windows authentication architecture](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-architecture)
- [Credentials processes in Windows authentication](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)
- [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)
- [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview)
- [Lightweight Directory Access Protocol (LDAP)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/lightweight-directory-access-protocol-ldap)
- [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol)
- [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [What is federation with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-fed)
- [What is password hash synchronization with Microsoft Entra ID?](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-phs)
- [User sign-in with Microsoft Entra pass-through authentication](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-pta)
- [What is Microsoft Entra authentication?](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods)
- [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication)
- [What is Microsoft Entra certificate-based authentication?](https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-certificate-based-authentication)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Windows Hello for Business](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/)
- [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication)
