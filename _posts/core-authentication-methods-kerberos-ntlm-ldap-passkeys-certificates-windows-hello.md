---
title: "Core Authentication Methods Explained: Kerberos, NTLM, LDAP Bind, Passkeys, Certificate-Based Authentication, and Windows Hello for Business"
excerpt: "A detailed technical guide to core authentication methods, including Kerberos, NTLM, LDAP bind, passkeys, certificate-based authentication, and Windows Hello for Business, with examples and backend flow analysis."
coverImage: "/assets/blog/core-auth-methods/cover.svg"
date: "2026-03-29T09:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/core-auth-methods/cover.svg"
---

## Overview

When engineers say "authentication," they often jump directly into product names or acronyms: Kerberos, NTLM, LDAP, passkeys, Windows Hello, smart cards. That jump is one of the reasons authentication design gets discussed poorly. These technologies are not interchangeable, and they are not solving the same problem in the same way.

This article focuses on the category of authentication methods that directly validate a secret, a challenge response, a private key, or a certificate chain. In other words, these are the mechanisms that answer the core identity question: **how is the user or device actually proving identity?**

The methods covered here are:

1. Kerberos
2. NTLM
3. LDAP bind authentication
4. passkeys with FIDO2 and WebAuthn
5. certificate-based authentication
6. Windows Hello for Business

The primary references for this category are [Windows authentication overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-overview), [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview), [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview), [Lightweight Directory Access Protocol (LDAP)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/lightweight-directory-access-protocol-ldap), [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey), [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication), and [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication).

![Core authentication methods](/assets/blog/core-auth-methods/cover.svg)

## What this category means

Core authentication methods are different from federation protocols and different from hybrid sign-in architectures. Federation protocols describe how one system passes identity proof to another. Hybrid sign-in architectures describe where validation happens when Active Directory and Microsoft Entra work together. Core authentication methods are more fundamental than both. They are the actual mechanisms used to establish trust in the first place.

That distinction matters because one real sign-in can use several layers at once. A user may unlock a device with Windows Hello for Business, obtain a Primary Refresh Token from Microsoft Entra, and then use OpenID Connect to sign in to a SaaS application. If you do not separate the authentication method from the token protocol from the application flow, the entire sign-in story becomes muddy.

## Kerberos

**Kerberos** is the primary ticket-based authentication protocol used in Active Directory domain environments.

### What Kerberos means

At its core, Kerberos exists to solve one enterprise problem cleanly: a user should not have to send their password to every service they access. Instead, a trusted authority issues tickets that other systems can rely on. In Active Directory, that trusted authority is the **Key Distribution Center (KDC)** hosted by the domain controller.

The important idea is that Kerberos turns authentication into a ticketing problem. The user proves identity to the KDC once, and the KDC then issues cryptographic proof that other services can trust. That is why Kerberos is central to Windows single sign-on.

### Example scenario

Consider a domain-joined laptop. The user signs in to Windows in the morning and later opens an internal IIS site, a SQL-integrated application, and a file share such as `\\fileserver\finance`. If the environment is healthy, those later services usually do not ask the user to re-enter credentials. They rely on Kerberos tickets issued earlier in the logon process.

### What happens in the backend

When the user signs in, Windows uses the user's credentials to talk to the KDC. If authentication succeeds, the KDC issues a **Ticket Granting Ticket (TGT)**. That TGT is not the final proof used by every application. It is a higher-level ticket that allows the client to ask for other tickets later.

When the user needs a service, the client presents the TGT to the KDC and requests a **service ticket** for the target service principal name. The KDC verifies that the user can request the ticket, packages the service identity information correctly, and returns a service ticket for that destination. The client then presents that service ticket to the actual application or server. The server validates the ticket and creates the local session.

This is why Kerberos troubleshooting often revolves around KDC behavior, service principal names, delegation, and ticket caches rather than around the original password prompt. Once the password has been used to obtain the TGT, most later access decisions depend on tickets, not on password entry.

### Why it matters

Kerberos is still the most important protocol for classic Windows and Active Directory authentication. If you work with domain-joined devices, on-prem IIS, SQL-integrated authentication, SMB, or constrained delegation, you are working in a Kerberos world whether you say the word out loud or not.

## NTLM

**NTLM** stands for **NT LAN Manager**. It is the older Windows challenge-response authentication protocol.

### What NTLM means

NTLM is the legacy answer to the same broad question Kerberos answers: how does the system prove the client knows the secret without sending the raw password around? But NTLM solves it in a much older and less scalable way. Instead of a central ticketing authority issuing reusable service trust, NTLM uses a challenge-response exchange between the client and the server.

### Example scenario

A user accesses an old internal web application running under Windows Integrated Authentication. Because the service principal name is missing or the app is not built correctly for Kerberos, the environment silently falls back to NTLM. The user may not notice the protocol shift at all, but the security and delegation characteristics of the session are now different.

### What happens in the backend

The client requests access. The server sends a challenge. The client computes a response using password-derived material and sends that response back. The server validates the response locally or by involving a domain controller. If validation succeeds, the server creates the local session.

What makes NTLM fundamentally different from Kerberos is that the server remains much more directly involved in credential validation. There is no equivalent of the Kerberos KDC issuing service tickets ahead of time for later access reuse. That is why NTLM does not scale as elegantly for true single sign-on and why it is weaker for modern delegation scenarios.

### Why it matters

Identity engineers still need to understand NTLM because modern environments still trip into it. Legacy applications, broken Kerberos setups, name mismatches, and old network paths can all cause NTLM fallback. If you only understand Kerberos, you will miss a large part of real-world Windows authentication troubleshooting.

## LDAP bind authentication

**LDAP** stands for **Lightweight Directory Access Protocol**. LDAP itself is primarily a directory access protocol. The specific authentication pattern people usually mean is **LDAP bind**.

### What LDAP bind means

LDAP bind authentication is not a ticketing system and not a federation system. It is a direct directory-validation pattern. The application talks to the directory itself and asks the directory to validate the credentials supplied by the user.

This is a very different trust model from both Kerberos and SAML. In Kerberos, the server trusts the KDC-issued ticket. In SAML, the application trusts an identity provider assertion. In LDAP bind, the application is much more directly involved in the username and password validation path.

### Example scenario

A VPN concentrator, firewall, Linux host, or older enterprise application prompts the user for a username and password and has an LDAP integration configured to Active Directory. When the user enters the credentials, the device or app performs a bind operation directly against the directory and decides whether the login should succeed based on that result.

### What happens in the backend

The user enters credentials into the application. The application opens an LDAP connection to the directory. It then performs a bind operation using the supplied identity and credential. If the bind succeeds, the application treats the user as authenticated. After that, it often performs additional LDAP queries to retrieve group memberships, account attributes, or authorization-relevant metadata.

The critical architectural point is that the application stays in the middle of the password-validation path. That is why LDAP bind is so common in third-party infrastructure and also why it is considered a more legacy integration style than modern token federation.

### Why it matters

LDAP bind remains common in enterprise infrastructure because many products were built long before modern cloud federation became normal. If you manage VPNs, older middleware, Linux-AD integrations, or appliances, LDAP bind still matters. But for new browser and SaaS applications, it is usually not the preferred design because it keeps the application too close to the raw credential-validation path.

## Passkeys, FIDO2, and WebAuthn

**FIDO2** comes from the **Fast IDentity Online Alliance**, and **WebAuthn** stands for **Web Authentication**. Passkeys are the user-facing model built on those standards.

### What passkeys mean

Passkeys replace reusable passwords with an asymmetric cryptography model. Instead of a shared secret that both the user and the service know, the authenticator creates a public/private key pair. The private key stays protected on the authenticator or device. The service stores the public key and later validates cryptographic proof generated with the private key.

This changes the threat model completely. A phishing page can steal a password because the password is something the user knows and can type anywhere. A passkey flow is different because the authenticator signs a challenge for the relying party, and the server validates that signature against the registered public key.

### Example scenario

A user signs in to Microsoft Entra with a phone-based passkey or a hardware security key. No password is typed into the browser. The user approves the local device prompt, and the authenticator signs the challenge. Microsoft Entra validates the result and then issues the usual cloud tokens.

### What happens in the backend

During registration, the authenticator generates a public/private key pair. The service stores the public key and method metadata. During sign-in, the service issues a challenge. The authenticator signs that challenge with the private key. The identity provider validates the signature using the stored public key. After successful validation, the identity provider continues with whatever token or session issuance belongs to the application flow.

The important thing to understand is that the passkey itself is not the final application session. It is the strong authentication event that allows the identity provider to create the next layer of trust, usually in the form of tokens or sessions.

### Why it matters

Passkeys are one of the strongest practical answers to password phishing because there is no reusable password to intercept and replay. For engineers, the important concepts are authenticator type, registration policy, attestation, client support matrix, and how the identity provider maps the passkey method to its normal application token issuance path.

## Certificate-based authentication

**Certificate-based authentication (CBA)** uses X.509 certificates instead of passwords as the primary proof of identity.

### What certificate-based authentication means

In certificate-based authentication, the system is not asking whether the user knows a password. It is asking whether the client can present a certificate that chains to a trusted authority and maps correctly to the expected identity. Trust comes from the certificate chain, the validity of the certificate, and the directory mapping logic.

### Example scenario

A government agency or healthcare organization issues user certificates on smart cards or managed endpoints. When a user signs in to Microsoft Entra, the client presents the certificate and Microsoft Entra validates the chain, mapping, and policy before continuing.

### What happens in the backend

The client presents the certificate. The identity provider validates the certificate chain, checks the validity period, applies mapping logic, and evaluates policy conditions. If those checks pass, the user is considered authenticated and the identity provider continues with its normal token issuance path.

This is a very different design from password-based authentication because the server is trusting a public key infrastructure and mapping logic instead of a password validation event.

### Why it matters

Certificate-based authentication matters in environments with existing PKI maturity, strong hardware credential requirements, or regulatory requirements that favor certificate-backed identity. It is also strategically important because Microsoft Entra CBA allows some organizations to move certificate auth directly into the cloud identity provider rather than depending on federated certificate auth through AD FS.

## Windows Hello for Business

**Windows Hello for Business (WHfB)** is a passwordless enterprise authentication design built around device-bound keys and a local unlock gesture such as a PIN or biometrics.

### What Windows Hello for Business means

Windows Hello for Business is often explained incorrectly as "logging in with a PIN." That description is not technically accurate. The PIN or biometric is only the local gesture that unlocks the private key on the device. The actual backend authentication event uses that device-bound key, not the PIN itself.

### Example scenario

A user unlocks a Microsoft Entra joined Windows laptop with facial recognition. From the user's point of view, it feels like a local convenience feature. In reality, Windows uses the unlocked device-bound key to prove identity to Microsoft Entra and obtain cloud sign-in state, including a Primary Refresh Token.

### What happens in the backend

The user performs a local gesture. Windows uses that gesture to unlock the protected private key. The Windows authentication components request a nonce from Microsoft Entra. The device signs the nonce with the private key. Microsoft Entra validates the signature using the registered public key and, if validation succeeds, issues a **Primary Refresh Token (PRT)** and related session material.

The key point is that the PIN is not traveling to the server as the credential. The key pair is the real server-trusted authentication artifact.

### Why it matters

Windows Hello for Business is important because it brings key-based authentication into the Windows sign-in experience without forcing users to understand the cryptography behind it. For engineers, the important concepts are trust model, join state, key registration, and how the resulting authentication event turns into a PRT and downstream single sign-on.

## How these methods relate to each other

These methods all prove identity, but they do so using very different trust assumptions:

1. Kerberos uses central ticket issuance through the KDC
2. NTLM uses challenge-response without Kerberos ticketing
3. LDAP bind validates credentials directly against a directory
4. passkeys and Windows Hello use private keys and challenge signing
5. certificate-based auth uses certificate chain trust and mapping

That is why a mature identity engineer should avoid talking about "authentication" as if it were one flat topic. Each of these methods produces different operational behavior, different troubleshooting paths, and different attack surfaces.

## Key implementation points

1. Kerberos remains the primary domain ticketing protocol for classic Active Directory environments.
2. NTLM is still operationally important because fallback and legacy paths continue to exist.
3. LDAP bind is common in third-party and legacy integrations because the app validates credentials directly against the directory.
4. Passkeys, certificate-based authentication, and Windows Hello for Business all reduce dependence on reusable passwords, but they are not the same design.

## References

- [Windows authentication overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-overview)
- [Windows authentication architecture](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-architecture)
- [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)
- [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview)
- [Lightweight Directory Access Protocol (LDAP)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/lightweight-directory-access-protocol-ldap)
- [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey)
- [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication)
- [What is Microsoft Entra certificate-based authentication?](https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-certificate-based-authentication)
- [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication)
