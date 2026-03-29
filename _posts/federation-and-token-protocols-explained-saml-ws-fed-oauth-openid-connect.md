---
title: "Federation and Token Protocols Explained: SAML, WS-Federation, OAuth 2.0, and OpenID Connect"
excerpt: "A technical guide to federation and token protocols, including SAML, WS-Federation, OAuth 2.0, and OpenID Connect, with examples, identity-provider roles, and backend flow analysis."
coverImage: "/assets/blog/federation-token-protocols/cover.svg"
date: "2026-03-29T09:10:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/federation-token-protocols/cover.svg"
---

## Overview

This article focuses on federation and token protocols. These are not the same thing as core credential-validation methods like Kerberos or passkeys. Instead, these protocols define how identity proof and authorization data move between systems such as identity providers, applications, and APIs.

The protocols covered here are:

1. SAML 2.0
2. WS-Federation
3. OAuth 2.0
4. OpenID Connect

The main references for this category are [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol), [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc), and [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

![Federation and token protocols](/assets/blog/federation-token-protocols/cover.svg)

## What this category means

Federation and token protocols do not usually validate the original password, passkey, or certificate themselves. Instead, they describe how systems exchange identity or access artifacts after authentication has occurred or as part of a coordinated sign-in flow.

This is the category where terms such as **identity provider**, **service provider**, **client**, **relying party**, and **resource server** become important.

## Identity provider, service provider, client, and resource server

Before looking at the protocols, it helps to separate the systems involved.

### Identity provider

An **identity provider (IdP)** authenticates the user and issues identity proof that another system can trust.

Examples:

1. Microsoft Entra ID
2. AD FS
3. Okta

### Service provider

A **service provider (SP)** is the application that trusts a SAML assertion from an identity provider and creates a local session.

Examples:

1. Salesforce trusting Microsoft Entra as the SAML IdP
2. ServiceNow trusting AD FS as the SAML IdP

### Client or relying party

A **client** or **relying party** is the application using OpenID Connect or OAuth to obtain tokens.

Examples:

1. an ASP.NET web app using OIDC with Microsoft Entra
2. a mobile app using OAuth and OIDC

### Resource server

A **resource server** is the API or service that consumes access tokens.

Examples:

1. Microsoft Graph
2. a custom API protected by Microsoft Entra

## SAML 2.0

**SAML** stands for **Security Assertion Markup Language**.

### What it means

SAML is a browser federation protocol that allows an application to delegate user authentication to an identity provider. The application trusts a signed SAML assertion rather than validating the user's credential itself.

### Example scenario

A user tries to access ServiceNow. ServiceNow redirects the browser to Microsoft Entra ID. Microsoft Entra authenticates the user, issues a SAML assertion, and the browser posts that assertion back to ServiceNow. ServiceNow validates it and creates the session.

### What happens in the backend

1. the user browses to the service provider
2. the service provider redirects the browser to the identity provider
3. the identity provider authenticates the user
4. the identity provider creates a signed SAML assertion
5. the browser posts that assertion to the service provider
6. the service provider validates the assertion's signature, issuer, audience, and time conditions
7. the service provider creates the local application session

### Why it matters

SAML is still heavily used for enterprise SaaS SSO. The application is trusting the IdP's assertion, not directly proving the user's password itself.

## WS-Federation

**WS-Federation** stands for **Web Services Federation**.

### What it means

WS-Federation is another browser federation model, historically common in older Microsoft and AD FS-centric application ecosystems.

### Example scenario

An older ASP.NET application uses AD FS for sign-in through WS-Federation. The app redirects the user to AD FS, AD FS authenticates the user, and then returns a federation token to the app.

### What happens in the backend

1. the application redirects the browser to the federation provider
2. the federation provider authenticates the user
3. the federation provider issues a token for the relying party
4. the browser returns the token to the application
5. the application validates the token and creates its local session

### Why it matters

WS-Federation is important mostly because many older Microsoft workloads and older enterprise web applications still rely on it. Identity engineers usually encounter it during support or modernization projects.

## OAuth 2.0

**OAuth 2.0** stands for **Open Authorization 2.0**.

### What it means

OAuth is mainly about authorization, not identity. It allows a client to obtain an access token that a resource server can trust when deciding what the caller is allowed to do.

### Example scenario

A web application signs the user in and then needs to call Microsoft Graph. The app gets an OAuth access token from Microsoft Entra and presents it to Graph to read the user's profile.

### What happens in the backend

Using the authorization code flow:

1. the client redirects the user to the authorization server
2. the user authenticates and consents if required
3. the authorization server returns an authorization code
4. the client redeems that code at the token endpoint
5. the authorization server issues an access token and often a refresh token
6. the client presents the access token to the resource server
7. the resource server validates the token and enforces scopes or roles

### Why it matters

OAuth is the foundation for API security in Microsoft Entra. If an app needs to call Microsoft Graph or another protected API, OAuth is usually part of the design.

## OpenID Connect

**OpenID Connect (OIDC)** is an authentication layer built on top of OAuth 2.0.

### What it means

OIDC gives an application a standard way to know who the user is by issuing an **ID token**. It uses OAuth-style flows but adds explicit identity semantics.

### Example scenario

A custom web app uses Microsoft Entra for user sign-in. The app gets an ID token to establish who the user is, and it may also get OAuth access tokens for downstream APIs.

### What happens in the backend

1. the application redirects the user to Microsoft Entra with an OIDC request
2. the user authenticates
3. Microsoft Entra returns an authorization code or tokens depending on the flow
4. the app receives an ID token
5. the app validates the ID token's signature, audience, issuer, and expiry
6. the app creates its local user session
7. if needed, the app also uses OAuth access tokens for APIs

### Why it matters

OIDC is the standard pattern for modern web and native application sign-in because it solves the user-authentication problem in a token-native way.

## How these protocols differ

The most useful comparison is this:

1. SAML and WS-Federation are browser federation protocols that return assertions or federation tokens
2. OAuth 2.0 returns access tokens for APIs and focuses on authorization
3. OpenID Connect adds identity on top of OAuth by returning an ID token

This is why you should not say "OAuth is authentication" without qualification. In most designs, OIDC is the identity layer and OAuth is the access layer.

## Key implementation points

1. Federation and token protocols move identity or access proof between systems; they are not always the thing that validates the original credential.
2. SAML and WS-Federation are most naturally explained using identity provider and service provider language.
3. OAuth 2.0 is mainly about API authorization.
4. OpenID Connect is the modern token-based answer to web and app user authentication.

## References

- [Single sign-on SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol)
- [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
