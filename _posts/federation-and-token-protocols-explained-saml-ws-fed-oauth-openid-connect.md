---
title: "Federation and Token Protocols Explained: SAML, WS-Federation, OAuth 2.0, and OpenID Connect"
excerpt: "A detailed technical guide to federation and token protocols, including SAML, WS-Federation, OAuth 2.0, and OpenID Connect, with examples, identity-provider roles, and backend flow analysis."
coverImage: "/assets/blog/federation-token-protocols/cover.svg"
date: "2026-03-29T09:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/federation-token-protocols/cover.svg"
---

## Overview

Federation and token protocols are often explained badly because people collapse several different ideas into one sentence. They say "we use OAuth for sign-in," or "the app uses SAML," or "Entra authenticates the app," without separating the actual protocol, the role of the identity provider, and the role of the application or API.

This article focuses on the protocols that move identity proof and authorization data between systems:

1. SAML 2.0
2. WS-Federation
3. OAuth 2.0
4. OpenID Connect

The main references for this category are [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol), [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc), and [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

![Federation and token protocols](/assets/blog/federation-token-protocols/cover.svg)

## What this category means

Federation and token protocols usually do not validate the original password or passkey themselves. Instead, they define how one system hands identity or access proof to another.

That is why this category is fundamentally about **trust transfer**. A user may authenticate once at an identity provider, and then an application or API trusts a token or assertion issued by that provider. If you understand that principle, the differences between SAML, WS-Federation, OAuth, and OpenID Connect become much easier to reason about.

## The systems involved

Before looking at the protocols, it helps to identify the systems that participate in these flows.

An **identity provider (IdP)** authenticates the identity and issues a proof artifact that other systems can trust. Microsoft Entra ID, AD FS, and Okta are common examples.

A **service provider (SP)** is the term most often used in SAML. It is the application that trusts the identity provider's SAML assertion and turns it into a local session. Salesforce and ServiceNow are common examples.

A **client** or **relying party** is the term used more often in OpenID Connect and OAuth. It is the application obtaining tokens from the identity platform.

A **resource server** is the API or service that receives an access token and decides whether the caller is authorized. Microsoft Graph is the most familiar Microsoft example.

These role names matter because protocols are not systems. SAML is not an identity provider. OAuth is not an application. OpenID Connect is not Microsoft Entra. The protocol is the language of the trust exchange; the systems are the actors speaking that language.

## SAML 2.0

**SAML** stands for **Security Assertion Markup Language**.

### What SAML means

SAML is a browser federation protocol that allows the application to outsource authentication to an identity provider. The application does not validate the password itself. Instead, it trusts a signed SAML assertion stating that the identity provider authenticated the user and that the assertion is intended for that service provider.

### Example scenario

An employee browses to ServiceNow. ServiceNow is configured as a SAML service provider and Microsoft Entra is configured as the SAML identity provider. The browser is redirected to Entra, the user signs in, Entra issues a SAML assertion, and the browser posts that assertion back to ServiceNow. ServiceNow validates the assertion and creates the app session.

### What happens in the backend

The service provider starts by redirecting the user to the identity provider. The identity provider authenticates the user using whatever methods it controls. It then creates a signed SAML assertion containing identity claims, issuer information, audience, and time bounds. The browser posts that assertion back to the service provider. The service provider validates the assertion carefully, especially the signature, audience, issuer, and expiry conditions. If the assertion is valid, the application creates its own local session.

The key point is that the service provider is trusting the identity provider's signed statement. The application is not proving the user's identity independently.

### Why it matters

SAML is still heavily used for enterprise SaaS single sign-on. Many organizations use Microsoft Entra or AD FS as the SAML identity provider for internal and external business applications. Identity engineers need to understand SAML because it remains one of the most common enterprise browser federation patterns.

## WS-Federation

**WS-Federation** stands for **Web Services Federation**.

### What WS-Federation means

WS-Federation solves a similar broad problem to SAML: one system authenticates the user, and another system trusts the resulting token. It sits more naturally in older Microsoft web application ecosystems and historical AD FS integrations.

### Example scenario

An older ASP.NET application uses AD FS for sign-in. Instead of modern OpenID Connect, the app uses WS-Federation redirects and token handling because that was the integration model available when the application was built.

### What happens in the backend

The application redirects the browser to the federation provider. The federation provider authenticates the user and issues a federation token for the application. The browser sends that token back to the application, which validates it and creates its local session.

Although the pattern sounds similar to SAML, the message format and protocol behavior are different. That difference matters when troubleshooting or modernizing older application stacks. You cannot assume that every browser federation application can switch from WS-Fed to SAML or OIDC without reconfiguration or code changes.

### Why it matters

WS-Federation is less important for greenfield application design today, but it remains highly relevant in support and modernization work. A lot of Microsoft enterprise history runs through WS-Fed and AD FS.

## OAuth 2.0

**OAuth 2.0** stands for **Open Authorization 2.0**.

### What OAuth means

OAuth is mainly about authorization. It tells a protected resource what a client is allowed to do. That is the single most important thing to understand before working with any modern API architecture. OAuth is not primarily about the identity of the user from the application's point of view. It is about delegated or application access to resources.

### Example scenario

A web application needs to call Microsoft Graph after the user signs in. The app does not send the user's password to Graph and it does not ask Graph to trust the application's local session. Instead, the app acquires an OAuth access token from Microsoft Entra and presents that token to Microsoft Graph.

### What happens in the backend

In the common authorization code flow, the client redirects the user to the authorization server. The user authenticates and consents if needed. The authorization server returns an authorization code. The client redeems that code at the token endpoint and receives an access token, and often a refresh token. The client then presents the access token to the resource server. The resource server validates the token and enforces scopes or roles based on the token content.

The core idea is that the API trusts the token issued by the authorization server, not the local session of the web app that called it.

### Why it matters

OAuth is the control plane for API access in Microsoft Entra and in modern cloud identity more broadly. If a workload needs to call Microsoft Graph, Exchange Online APIs, SharePoint APIs, or a custom protected API, OAuth is usually in the design somewhere.

## OpenID Connect

**OpenID Connect (OIDC)** is an authentication layer built on top of OAuth 2.0.

### What OpenID Connect means

OpenID Connect adds identity semantics to an OAuth-style flow. It introduces the **ID token**, which gives the application a standard way to know who signed in. This is why modern web sign-in discussions almost always mention both OIDC and OAuth together. The application typically uses OIDC for user sign-in and OAuth for downstream API access.

### Example scenario

A custom web app uses Microsoft Entra for sign-in. The app redirects the user to Entra, receives an ID token to establish who the user is, and may also receive OAuth access tokens if it needs to call downstream APIs.

### What happens in the backend

The application redirects the user to Microsoft Entra with an OpenID Connect request. Microsoft Entra authenticates the user and returns an authorization code or tokens depending on the flow. The application receives an ID token, validates the signature, audience, issuer, and expiry, and then creates its local user session. If the app also needs API access, it uses OAuth access tokens in parallel.

This is why OpenID Connect is not "just another token format." It is the structured identity layer that tells the app who the signed-in user is.

### Why it matters

OIDC is the standard pattern for modern cloud and mobile app sign-in because it gives applications a clean, token-native identity model without forcing them to validate passwords directly.

## How the protocols differ

The most useful technical distinction is not just which protocol name is newer. It is what each protocol is fundamentally trying to move.

SAML and WS-Federation are primarily browser federation models in which one system issues identity proof for another to trust. OAuth is an authorization framework for protected resources and APIs. OpenID Connect is an identity layer on top of OAuth that gives applications a standard way to know who the user is.

That is why saying "we use OAuth for authentication" is incomplete at best. In many real designs, the more correct statement is that the application uses OpenID Connect for user authentication and OAuth 2.0 for API authorization.

## Key implementation points

1. Federation and token protocols are about moving trust between systems, not necessarily about validating the original credential.
2. SAML and WS-Federation are best explained in terms of identity providers and service providers.
3. OAuth 2.0 is mainly about authorization to APIs and resources.
4. OpenID Connect adds user identity semantics to OAuth-style flows.

## References

- [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol)
- [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
