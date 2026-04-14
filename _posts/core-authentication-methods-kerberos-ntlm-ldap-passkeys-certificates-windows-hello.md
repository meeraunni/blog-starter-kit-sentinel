---
title: "Core Authentication Methods"
excerpt: "A technical guide to Kerberos, NTLM, LDAP bind, passkeys, certificate-based authentication, and Windows Hello for Business, focused on what each method proves and how the backend validates it."
coverImage: "/assets/blog/core-auth-methods/cover.svg"
date: "2026-03-29T09:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/core-auth-methods/cover.svg"
---

## Overview

Identity teams often talk about authentication as if it were one flat topic. In practice, the proof model behind authentication changes everything. A Kerberos ticket, an NTLM challenge-response exchange, an LDAP bind, a passkey assertion, a client certificate, and Windows Hello for Business all answer the same high-level question, but they answer it with very different backend mechanics.

This article focuses on the methods that directly validate a credential or directly prove possession of a key. It does not cover browser federation protocols such as Security Assertion Markup Language (SAML) or OpenID Connect (OIDC), and it does not cover hybrid sign-in architecture such as Password Hash Synchronization (PHS) or Pass-Through Authentication (PTA). Those sit one layer above. This document stays at the point where a system decides whether the presented proof is real.

The primary references for this category are [Windows authentication overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-overview), [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview), [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview), [Lightweight Directory Access Protocol (LDAP)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/lightweight-directory-access-protocol-ldap), [Register a passkey (FIDO2)](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey), [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication), and [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication).

![Core authentication methods](/assets/blog/core-auth-methods/cover.svg)

## Start with the basic model

Authentication is the act of proving identity. Authorization is the decision about what that identity is allowed to do after the proof is accepted. A protocol is the message contract that tells both sides how to exchange and validate that proof. A credential is the secret or key material that backs the proof. A session, token, ticket, or cookie is usually the artifact created after authentication succeeds so that the system does not have to re-run the entire proof ceremony on every request.

When a user types a username, almost nothing security-relevant has happened yet. The username only tells the system which identity object or metadata set to look up. The real work starts afterward. The authenticating system has to locate the account, select the correct validation path, obtain the needed proof from the user or device, and compare that proof to something it trusts. That "something" may be password-derived material, a registered public key, a ticketing authority, or a certificate chain.

This is why authentication incidents almost never live at the username box. They live in the layers behind it: Key Distribution Center availability, Service Principal Name mismatch, domain controller reachability, LDAP bind behavior, attestation validation, certificate mapping, device key registration, or token bootstrap after a key-based sign-in.

## Kerberos

Kerberos is the default ticket-based authentication protocol in an Active Directory Domain Services environment. Microsoft explains in [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview) that Windows implements Kerberos version 5 and uses the Key Distribution Center, or KDC, on the domain controller as the authority that issues tickets.

The easiest way to understand Kerberos is to begin with the problem it was designed to solve. In a large enterprise, users should not have to hand a reusable password to every file share, IIS application, SQL Server, or line-of-business application they use. That model scales poorly and exposes the password too broadly. Kerberos improves this by introducing a trusted ticket issuer. The user proves identity to the KDC once, and the KDC then issues tickets that other services can trust.

Consider a normal corporate scenario. A user signs in to a domain-joined Windows workstation, opens a file share, browses to an intranet site, and launches an internal application backed by SQL Server. The user is not being asked for another password at every hop. Instead, Windows obtains a Ticket Granting Ticket, or TGT, during sign-in. Later, when the user needs a service, the client redeems that TGT for a service ticket tied to the Service Principal Name, or SPN, of the target service.

The backend sequence is what makes Kerberos elegant. The client first proves knowledge of password-derived key material or another supported secret to the KDC. The KDC returns the TGT. When the client later needs access to a specific service, it asks the KDC for a service ticket for that SPN. The KDC issues the ticket in a form the service can validate. The client presents that service ticket to the server, and the server uses it to establish the local session.

From the service's perspective, the important point is that it is not directly validating the user's password. It is trusting the KDC's cryptographic statement. That separation is the reason Kerberos supports strong single sign-on and delegation patterns that older challenge-response systems struggle to match.

This also explains why Kerberos troubleshooting often surprises teams. A user can successfully sign in to Windows and still fail later when accessing a service because the TGT path is healthy but the service ticket path is not. Duplicate SPNs, DNS problems, clock skew, broken delegation, or stale service account configuration can all break the service access path even when the original workstation logon succeeded.

## NTLM

NTLM, which expands to NT LAN Manager, is the older Windows challenge-response authentication protocol. Microsoft still documents it in [NTLM overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview) because it remains present in production, especially as a fallback path for older workloads.

NTLM solves a similar broad problem to Kerberos in that it avoids sending the raw password over the wire in clear text. But the design is different. Instead of building a ticketing system around a centralized authority, NTLM keeps the server much closer to the validation transaction. The server sends a challenge. The client computes a response based on password-derived material. The server then validates that response, directly or with help from a domain controller.

A common enterprise example is an internal web application configured for Integrated Windows Authentication where Kerberos should be working but does not because the SPN is missing or bound to the wrong identity. The client falls back to NTLM, the application still appears to work, and the underlying identity problem remains hidden until someone needs delegation or multi-hop access.

The backend consequence of NTLM is that the server remains deeply involved in the proof exchange. It is not simply trusting a KDC-issued ticket. That makes NTLM less flexible than Kerberos for delegation and large-scale trust brokering. It also means NTLM often shows up where infrastructure or applications are not fully prepared for proper Kerberos operation.

Engineers need to understand NTLM not because it is the future, but because it is still part of the present. Legacy web apps, appliances, old SMB scenarios, and misconfigured integrated-auth workloads continue to surface NTLM during investigations. If you do not understand what it is doing, you can misread a fallback success as architectural health.

## LDAP bind authentication

Lightweight Directory Access Protocol, or LDAP, is primarily a protocol for querying and modifying directory information. When administrators say "LDAP authentication," they usually mean LDAP bind. That distinction matters because LDAP itself is not a full ticketing or federation architecture. The bind operation is simply the step where the client proves identity to the directory.

LDAP bind is best understood as direct credential validation against the directory. An application prompts the user for credentials, opens an LDAP connection, and attempts to bind using those credentials. If the bind succeeds, the application treats the user as authenticated. It may then perform additional directory queries to look up group membership, organizational attributes, or account state for authorization decisions.

This pattern is common in VPN appliances, firewalls, Linux workloads, Java applications, and older enterprise products that were designed before modern federation became the default answer. A user types a corporate username and password into the application itself, and the application asks Active Directory whether that credential is valid.

The backend implication is important. The application remains in the middle of the credential path. It is not redirecting the user to an identity provider and then consuming a token. It is collecting the password and presenting it to the directory. That means the application becomes part of the attack surface, part of the logging path, and part of the troubleshooting surface. Secure bind choice, certificate trust for LDAPS, account lockout behavior, and group query patterns all matter.

This is why LDAP bind is still common but usually not the architecture identity teams want for new SaaS-style applications. It remains useful in mixed infrastructure and device integration, but it keeps too much credential responsibility inside the application tier.

## Passkeys with FIDO2 and WebAuthn

FIDO2 stands for Fast IDentity Online, and WebAuthn stands for Web Authentication. Passkeys are the user-facing deployment model built on those standards. The key architectural shift is that passkeys replace reusable shared secrets with asymmetric cryptography.

In a password design, the user and the verifying system are tied together by a secret that can be replayed or phished if an attacker captures it. In a passkey design, the authenticator generates a public/private key pair. The private key remains on the authenticator or with the platform provider. The relying party stores only the public key and later validates a signed challenge against that public key.

That is why passkeys are such a strong response to phishing. The authenticator is not handing the relying party a secret the user knows. It is proving possession of a private key that is scoped to the relying party. A fake page cannot simply steal and replay that proof in the way it can with a password.

A practical example is a user signing in to Microsoft Entra with a hardware security key, a synced passkey from a platform ecosystem, or a passkey stored in Microsoft Authenticator. During registration, the authenticator generates the key pair and Microsoft Entra stores the public-key metadata. At sign-in, Microsoft Entra issues a challenge. The authenticator signs it. Entra validates the result and then issues the normal session and token artifacts for the relying application landscape.

For engineers, the real complexity is not the signature math. It is the control plane around the signature. Which authenticator types are allowed? Is attestation required? Which AAGUIDs are allowed? How will users bootstrap registration? Which browsers and operating systems support the intended rollout? Those questions determine whether passkeys work cleanly in production.

## Certificate-based authentication

Certificate-based authentication, or CBA, uses X.509 certificates rather than passwords as the primary proof. Microsoft documents the Entra implementation in [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication).

The easiest way to understand CBA is to ask what the backend trusts. It is not trusting that the user knows a password. It is trusting that the client can present a certificate that chains to a trusted certification authority, satisfies any validity and revocation checks, and maps correctly to the expected user identity.

This pattern is common in highly regulated environments such as government, defense, and healthcare, where smart cards or certificate-backed devices are part of the standard sign-in model. A user presents the certificate, the authentication service checks the chain and mapping, and a successful validation leads to session creation or token issuance.

The backend validation path is built on public key infrastructure, or PKI. The authenticating system validates the certificate chain, checks the validity period, applies trust-anchor rules, evaluates revocation or policy checks as configured, and maps the certificate to the target account. If any of those stages fail, the user is not authenticated even if the certificate still exists on the device.

This gives certificate-based authentication a very different operational character from password-based methods. When CBA breaks, the root cause is often certificate issuance, revocation, chain trust, mapping logic, or lifecycle management rather than a human memory problem. Strong security comes with PKI operational responsibility.

## Windows Hello for Business

Windows Hello for Business, or WHfB, is one of the most misunderstood authentication technologies in the Microsoft ecosystem because users experience it through a deceptively simple interface. They see a PIN or biometric prompt and assume that PIN or biometric is the credential. Microsoft explains in [How Windows Hello for Business authentication works](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/hello-how-it-works-authentication) that this is not the correct model.

The PIN or biometric is a local unlock gesture. The real credential is the device-bound key pair registered for the identity. The local gesture only unlocks the private key so that Windows can use it to answer the authentication challenge. That is why a Hello PIN is not just "a shorter password." The backend does not trust the PIN itself. It trusts the successful use of the protected private key.

A normal enterprise example is a Microsoft Entra joined device. The user unlocks the laptop with face recognition or a PIN. Windows uses that successful local gesture to unlock the private key. It then requests a nonce from Microsoft Entra, signs it with the device-bound key, and obtains a Primary Refresh Token, or PRT. That PRT becomes the anchor for downstream cloud single sign-on.

The backend path therefore spans device registration, key registration, and token issuance. When Windows Hello for Business fails, the root cause can be in device state, join state, key trust, Trusted Platform Module health, or cloud token issuance. If an engineer treats it as "PIN login trouble," the investigation will usually start in the wrong place.

## Putting the methods side by side

These methods all authenticate, but they do not establish trust the same way. Kerberos relies on centralized ticket issuance. NTLM relies on challenge-response with password-derived material. LDAP bind relies on direct directory validation. Passkeys and Windows Hello for Business rely on registered public keys and private-key operations. Certificate-based authentication relies on PKI trust and identity mapping.

That difference changes everything downstream: what the backend trusts, what infrastructure must be healthy, what can be delegated, what can be phished, and what breaks first during an outage. Mature identity engineering depends on recognizing those differences early instead of flattening them under one generic label.

## Key implementation points

1. Kerberos, NTLM, LDAP bind, passkeys, certificate-based authentication, and Windows Hello for Business all authenticate identities, but they do so with different proof models and different trust boundaries.
2. Kerberos and NTLM are both common in Active Directory environments, but their delegation behavior and troubleshooting patterns are very different.
3. LDAP bind remains relevant in mixed infrastructure, but it keeps the application closer to raw credential validation than modern federation designs do.
4. Key-based and certificate-based methods reduce dependence on reusable passwords, but they shift the operational burden into device trust, attestation, PKI, and credential lifecycle management.

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
