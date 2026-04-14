---
title: "Federation and Token Protocols"
excerpt: "A technical guide to SAML, WS-Federation, OAuth 2.0, and OpenID Connect, focused on trust transfer, actor roles, and what the backend is validating."
coverImage: "/assets/blog/federation-token-protocols/cover.svg"
date: "2026-03-29T09:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/federation-token-protocols/cover.svg"
---

## Overview

Federation and token protocols are where many identity conversations become imprecise. Teams say "the app uses OAuth for login" or "we integrated SAML" and the statement sounds reasonable until something breaks. Then it becomes obvious that people were mixing product choices, actor roles, and protocol names into one blurry concept.

This article separates those ideas. It focuses on the protocols that move trust between systems after some earlier authentication event has already happened. In other words, this is the layer that carries identity proof or authorization proof from one participant to another.

The core references for this category are [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol), [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc), and [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

![Federation and token protocols](/assets/blog/federation-token-protocols/cover.svg)

## Start with the actor model

Before comparing protocols, it helps to name the participants. The identity provider, or IdP, is the system that authenticates the user and issues some form of trust artifact. Microsoft Entra ID, AD FS, and Okta are all examples. In a SAML flow, the application that consumes that trust artifact is usually called the service provider, or SP. In OAuth and OIDC discussions, the application is more often called the client or relying party. When the destination is an API, the receiving system is the resource server.

These distinctions matter because protocols are not products. SAML is not Microsoft Entra. OAuth is not Microsoft Graph. OIDC is not the browser. The protocol defines the structure of the messages. The systems implement those messages to transfer trust.

## What this category is really about

Most federation and token protocols do not validate the original password, passkey, or certificate themselves. That earlier proof usually happens at the identity provider. The consuming application or API then trusts the resulting assertion or token.

That is why the cleanest description of this category is trust transfer. One system authenticates. Another system relies on the result. The backend questions therefore are not "did the user type the right password into the app?" but rather "who issued this artifact, who is meant to consume it, what does the consumer validate, and what is the artifact authorized to do?"

## SAML 2.0

Security Assertion Markup Language, or SAML, is a browser federation protocol that lets an application offload user authentication to an identity provider. The application no longer needs to collect or validate the user credential directly. Instead, it trusts a signed SAML assertion that states the identity provider authenticated the user and that the assertion is intended for that application.

The familiar enterprise example is ServiceNow configured as a SAML service provider and Microsoft Entra configured as the identity provider. The user browses to ServiceNow. ServiceNow redirects the browser to Entra. The user signs in to Entra, and Entra sends a SAML response back through the browser. ServiceNow validates the response and creates its local application session.

In the backend, the flow is precise. The service provider redirects the browser to the identity provider. The identity provider authenticates the user using its own configured methods and policies. It then creates a signed SAML assertion containing fields such as issuer, audience, subject, and time conditions, plus whatever claims the application expects. The browser posts that assertion back to the service provider. The service provider validates the signature, issuer, audience, and validity window before establishing the local session.

The most important engineering point is that the service provider is not trusting the user's password. It is trusting the identity provider's signed statement about the authentication event. That is why SAML troubleshooting lives in claim mappings, NameID format, certificate rollover, reply URLs, entity IDs, audience mismatch, and time skew rather than in password validation logic.

## WS-Federation

Web Services Federation, or WS-Federation, solves a similar problem to SAML but comes from an older Microsoft federation ecosystem. It is strongly associated with older claims-aware applications and with AD FS-era enterprise design.

The high-level model is the same. One system authenticates the user, and another system consumes the resulting trust artifact. But the message formats, token semantics, and typical implementation stack differ from SAML. That difference matters when you are supporting or modernizing older Microsoft workloads.

A practical example is an older ASP.NET application integrated with AD FS using WS-Federation. The browser is redirected to AD FS, the user authenticates there, and AD FS returns a token that the application validates before creating its local session. To the end user, the experience resembles other federation models. To the engineer supporting it, the libraries, metadata, token handling, and modernization path are different.

WS-Federation remains relevant because many organizations still have applications that were built around it. Engineers working through migration programs need to understand what it is doing so they can move it safely toward OIDC or other modern patterns without confusing protocol roles and application dependencies.

## OAuth 2.0

OAuth 2.0 is often mentioned in sign-in conversations, but its main purpose is authorization. It is the framework that allows a client to obtain an access token for a protected resource. That protected resource is commonly an API such as Microsoft Graph.

The important correction is that OAuth is not, by itself, the standard answer to "who is this user?" It is the standard answer to "what access has this client been granted to this resource?" The identity story is usually added by OpenID Connect.

Consider a web application that needs to call Microsoft Graph after the user signs in. The app's local cookie is only meaningful to the app itself. Graph does not trust that cookie. Instead, the app obtains an OAuth access token from Microsoft Entra and sends that access token to Graph. Graph validates the issuer, audience, signature, expiration, and scopes or app roles before deciding whether to serve the request.

Microsoft documents the most important interactive flow in [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow). The user is redirected to the authorization server. After sign-in and consent where required, the authorization server returns an authorization code. The client redeems that code at the token endpoint and receives an access token, and often a refresh token. The access token is then sent to the resource server.

From the backend perspective, the API never trusts the application's front-end session directly. It trusts the access token issued by the authorization server. This is why API failures frequently come down to audience mismatches, missing scopes, wrong app registration setup, or token lifetime issues rather than to the user's ability to sign in interactively.

## OpenID Connect

OpenID Connect, or OIDC, is the identity layer built on top of OAuth 2.0. This is the protocol that gives the application a standard way to know who the user is. It does that primarily through the ID token and through a well-defined authentication flow between the client and the identity provider.

The cleanest example is a modern web application integrated with Microsoft Entra for sign-in. The application redirects the user to Entra. Entra authenticates the user and returns an authorization code. The application redeems the code and receives an ID token that identifies the user. If the application also needs to call Microsoft Graph, it obtains a separate OAuth access token for that purpose.

In the backend, the application validates the ID token by checking the signature, issuer, audience, expiration, and usually nonce correlation. Only then does it create its own local session. This is why it is not accurate to say "OIDC is just a token format." It is the standard identity layer that tells the application who authenticated and under what trust conditions.

Microsoft's [OpenID Connect documentation](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc) is useful here because it shows that OIDC does not replace OAuth. It extends it. OAuth handles authorization to resources. OIDC handles user authentication and identity semantics.

## Where readers usually get confused

The most common conceptual mistake is to confuse the actor with the protocol. A service provider trusts a SAML assertion, but SAML itself is not the service provider. A client receives an ID token in OIDC, but OIDC itself is not the identity provider. The second mistake is to say "OAuth is our login protocol" when the real implementation is OIDC for sign-in plus OAuth for downstream API access.

Another common source of confusion is treating every token-like object as interchangeable. A SAML assertion, an OIDC ID token, and an OAuth access token all carry trust, but they are meant for different consumers and validated for different purposes. Engineers should always ask who issued the artifact, who is supposed to consume it, and what the consumer is required to validate.

## Key implementation points

1. SAML and WS-Federation are federation protocols that allow an application to trust an authentication event performed by an identity provider.
2. OAuth 2.0 is primarily about authorization to protected resources, especially APIs.
3. OpenID Connect adds user-authentication and identity semantics on top of OAuth-style flows.
4. Protocol names, actor roles, and products must be kept separate or troubleshooting quickly becomes misleading.

## References

- [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol)
- [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
