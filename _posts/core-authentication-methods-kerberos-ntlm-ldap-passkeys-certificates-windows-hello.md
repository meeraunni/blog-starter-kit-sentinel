---
title: "Core Authentication Methods Explained: Kerberos, NTLM, LDAP Bind, Passkeys, Certificate-Based Authentication, and Windows Hello for Business"
excerpt: "A technical guide to core authentication methods, including Kerberos, NTLM, LDAP bind, passkeys, certificate-based authentication, and Windows Hello for Business, with examples and backend flow analysis."
coverImage: "/assets/blog/core-auth-methods/cover.svg"
date: "2026-03-29T09:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/core-auth-methods/cover.svg"
---

## Overview

This article focuses on the category of authentication methods that directly prove identity or directly validate credentials against an authority. These are not browser federation protocols and they are not hybrid cloud sign-in architectures. They are the core mechanisms that answer the question: **how is the identity actually proven?**

The methods covered here are:

1. Kerberos
2. NTLM
3. LDAP bind authentication
4. passkeys and FIDO2 / WebAuthn
5. certificate-based authentication
6. Windows Hello for Business

The primary references for this category are [Windows authentication overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-overview), [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview), [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview), [Lightweight Directory Access Protocol (LDAP)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/lightweight-directory-access-protocol-ldap), [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey), [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication), and [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication).

![Core authentication methods](/assets/blog/core-auth-methods/cover.svg)

## What this category means

Core authentication methods are the mechanisms that directly validate a secret, private key, certificate, or challenge response and then produce proof that the identity is real.

This is different from federation and token protocols, which move identity proof between systems. It is also different from hybrid sign-in architectures, which decide whether a password gets checked in the cloud, on-premises, or by a federated identity provider.

If an engineer wants to answer the question "what really happens when the system proves the user is who they claim to be?", this is the category to study first.

## Kerberos

**Kerberos** is the primary ticket-based authentication protocol used in Active Directory domain environments.

### What it means

Kerberos is designed so that users do not need to send their password directly to every server they access. Instead, a trusted central service issues tickets that servers can validate.

### Example scenario

A user signs in to a domain-joined Windows laptop and then opens a file share or an internal IIS site. The user is not prompted again because Windows reuses Kerberos trust material obtained at logon.

### What happens in the backend

1. the user signs in and proves identity to the domain controller's **Key Distribution Center (KDC)**
2. the KDC issues a **Ticket Granting Ticket (TGT)**
3. when the user needs a service, the client presents the TGT to request a **service ticket**
4. the KDC issues the service ticket for the target service principal name
5. the client presents that service ticket to the server
6. the server validates the ticket and creates the local session

### Why it matters

Kerberos is central to Windows single sign-on, delegation, and mutual trust. When Kerberos breaks, the symptoms often appear as application login prompts, file-share failures, or fallback to NTLM.

## NTLM

**NTLM** stands for **NT LAN Manager**. It is the older Windows challenge-response authentication protocol.

### What it means

NTLM proves knowledge of a password-derived secret without using the Kerberos ticketing system. It is commonly seen in legacy environments or as a fallback when Kerberos cannot be used.

### Example scenario

A legacy internal web application or a file access path cannot complete Kerberos because of a service principal name problem, name mismatch, or application limitation. Windows falls back to NTLM and the user still gains access.

### What happens in the backend

1. the client requests access
2. the server sends a challenge
3. the client computes a response using password-derived material
4. the server validates the response directly or through a domain controller
5. the server creates the local session if validation succeeds

### Why it matters

NTLM is less efficient and less capable than Kerberos. It is especially weaker for modern single sign-on and delegation scenarios. Identity engineers usually study NTLM so they can recognize when they are dealing with fallback, legacy design, or a broken Kerberos path.

## LDAP bind authentication

**LDAP** stands for **Lightweight Directory Access Protocol**. LDAP itself is a directory access protocol. The part commonly used for authentication is the **bind** operation.

### What it means

In LDAP bind authentication, the application itself talks to the directory and asks the directory to validate the credentials. The application is directly involved in the credential-validation path.

### Example scenario

A VPN appliance, Linux host, or older enterprise application prompts the user for an Active Directory username and password. Instead of using Kerberos tickets or a browser redirect to an identity provider, the application opens an LDAP session to Active Directory and performs a bind.

### What happens in the backend

1. the user enters credentials into the application
2. the application opens an LDAP connection to the directory
3. the application performs a bind using the supplied credentials
4. if the bind succeeds, the application treats the user as authenticated
5. the application often performs additional directory queries for group membership or attributes

### Why it matters

LDAP bind is common in third-party infrastructure and older app stacks. It is important because it ties the application more directly to the directory and usually keeps the app in the password-validation path. That is why it is generally considered less modern than federation-based approaches.

## Passkeys, FIDO2, and WebAuthn

**FIDO2** comes from the **Fast IDentity Online Alliance**, and **WebAuthn** stands for **Web Authentication**. Passkeys are Microsoft's phishing-resistant implementation path built on these standards.

### What it means

Passkeys replace reusable passwords with asymmetric cryptography. The authenticator generates a public/private key pair. The private key stays on the device or authenticator, and the service stores only the public key.

### Example scenario

A user signs in to Microsoft Entra or a supported app using a phone-based passkey or a security key. The user does not type a password. Instead, the authenticator approves a challenge and signs it with the private key.

### What happens in the backend

1. during registration, the authenticator creates a public/private key pair
2. the service stores the public key and related registration metadata
3. during sign-in, the service issues a challenge
4. the authenticator signs the challenge with the private key
5. the service validates the signed challenge against the stored public key
6. if validation succeeds, the identity provider issues the normal tokens for applications

### Why it matters

Passkeys are one of the strongest practical defenses against phishing because there is no reusable password to steal and replay. For identity teams, the key concepts are authenticator trust, attestation, registration policy, and client support.

## Certificate-based authentication

**Certificate-based authentication (CBA)** uses X.509 certificates instead of passwords as the primary proof of identity.

### What it means

Instead of asking the user to prove knowledge of a password, the system asks the client to present a certificate that chains back to a trusted certificate authority and can be mapped to the user's identity.

### Example scenario

A regulated enterprise issues user certificates on smart cards or corporate-managed devices. The user signs in to Microsoft Entra by presenting that certificate instead of entering a password.

### What happens in the backend

1. the client presents the user certificate
2. the identity provider validates the certificate chain, validity, and mapping rules
3. the identity provider confirms that the certificate maps to the expected user
4. policy checks are applied
5. if validation succeeds, sign-in continues and tokens are issued

### Why it matters

CBA is important in environments that already have a public key infrastructure and want strong, non-password authentication. It also changes where certificate validation happens. In Microsoft Entra CBA, that validation can happen directly in the cloud identity provider rather than only through AD FS.

## Windows Hello for Business

**Windows Hello for Business (WHfB)** is a passwordless enterprise authentication model built around device-bound keys and a local unlock gesture such as a PIN or biometric.

### What it means

The PIN or biometric is not the server-side credential. It only unlocks the local private key that Windows uses to prove identity to the identity provider.

### Example scenario

A user unlocks a Microsoft Entra joined Windows laptop with facial recognition or a PIN. Windows then uses the device-bound key to prove identity to Microsoft Entra and obtains a session plus a Primary Refresh Token.

### What happens in the backend

1. the user provides a local gesture such as PIN or biometrics
2. Windows unlocks access to the device-bound private key
3. the Cloud Authentication provider requests a nonce from Microsoft Entra
4. the device signs the nonce with the private key
5. Microsoft Entra validates the signature using the registered public key
6. if validation succeeds, Microsoft Entra returns a **Primary Refresh Token (PRT)**

### Why it matters

Windows Hello for Business is often misunderstood as "logging in with a PIN." In reality, it is a key-based authentication model with a local unlock gesture. That distinction matters for troubleshooting, trust design, and security comparisons with passwords.

## How these methods relate to each other

These methods solve similar identity problems in very different ways:

1. Kerberos and NTLM are traditional Windows network authentication methods
2. LDAP bind validates credentials directly against a directory
3. passkeys and Windows Hello use private keys rather than reusable passwords
4. certificate-based authentication relies on certificate trust and mapping

That is why "what authentication are we using?" is often too broad a question. The real answer depends on whether you are talking about domain access, legacy app integration, cloud sign-in, or phishing-resistant credential design.

## Key implementation points

1. Kerberos is the primary domain ticketing protocol and usually the preferred answer for traditional AD-integrated Windows environments.
2. NTLM is mostly the legacy or fallback method when Kerberos is unavailable.
3. LDAP bind is common in legacy and third-party integrations because the application validates credentials directly against the directory.
4. Passkeys, CBA, and Windows Hello for Business all reduce or remove dependence on reusable passwords, but they do so using different trust models.

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
