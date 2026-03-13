---
title: "Access Tokens and Refresh Tokens in Microsoft Identity"
excerpt: "A practical explanation of what access tokens and refresh tokens are, and how token issuance works behind the scenes during Microsoft sign-ins."
coverImage: "/assets/blog/access-tokens/cover.jpg"
date: "2026-03-13T15:30:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/access-tokens/cover.jpg"
---

## Introduction

When a user signs in to Microsoft 365, Azure, or an application integrated with Microsoft Entra ID, the platform does not keep sending the user’s password across services after the initial login. Instead, it issues tokens that applications use to verify identity and access.

Two of the most important tokens in that process are **access tokens** and **refresh tokens**.

For Microsoft admins, understanding these two token types is important because they sit at the center of authentication, session continuity, and access to protected resources.

## What is an access token

An **access token** is a short-lived token issued by Microsoft Entra ID that allows a client application to access a specific resource on behalf of the user.

A useful way to think about it is as a temporary access badge. It proves that the user has already authenticated and that the identity platform has authorized the client to call a target resource.

An access token typically includes claims such as:

- who the user is
- which application requested the token
- which tenant issued it
- which permissions or roles are granted
- when the token expires

In the Microsoft world, a client such as Outlook, Teams, or a custom enterprise application can present that token to a resource such as Exchange Online, Microsoft Graph, or another protected API.

The important point is that the **access token is what gets presented to the resource**.

## What is a refresh token

A **refresh token** is a longer-lived token that the client uses to request a new access token when the current one expires.

The refresh token is not presented to Exchange, Graph, SharePoint, or another resource directly. Instead, it is presented back to Microsoft Entra ID.

That means the refresh token’s job is not resource access. Its job is **token renewal**.

This is what allows users to continue working without being forced to sign in again every hour.

## How the token flow works during sign-in

A simplified Microsoft sign-in flow looks like this:

1. The user starts sign-in.
2. Microsoft Entra ID authenticates the user.
3. Conditional Access and other controls are evaluated.
4. Entra ID issues an access token for the target resource.
5. Entra ID also issues a refresh token for session continuity.
6. The application uses the access token to call the resource.
7. When the access token expires, the client uses the refresh token to ask Entra ID for a new one.

So in practical terms:

- **access token** = used against the resource
- **refresh token** = used against the identity provider

That distinction matters when troubleshooting.

## Why access tokens expire quickly

Access tokens are intentionally short-lived. In many cases, the default lifetime is about one hour, though actual behavior depends on Microsoft’s current platform controls and session rules.

This short lifetime reduces risk. If an access token is intercepted, its usefulness is limited.

Because access tokens expire frequently, the refresh token becomes the mechanism that keeps the user session alive without forcing constant reauthentication.

## What happens in the backend

In the backend, the resource does not usually ask the user for credentials. It validates the access token it receives.

That validation can include checking:

- whether the token was issued by the expected authority
- whether the audience matches the resource
- whether the token is still valid
- whether required claims are present
- whether the token signature is trusted

If the access token is valid, the resource accepts it and processes the request.

If the token has expired, the application normally goes back to Microsoft Entra ID with the refresh token to request a fresh access token.

If the refresh token is no longer valid, the user may need to sign in again.

## Where Conditional Access fits

Conditional Access sits in the sign-in and token issuance path.

That means if a policy requires MFA, a compliant device, or another control, Microsoft Entra ID can pause or deny token issuance until those requirements are satisfied.

This matters because access depends on token issuance, not just on the user saying “I already logged in.”

In other words, no token means no access.

## Why this matters for Microsoft admins

For admins, understanding token behavior helps with:

- troubleshooting repeated sign-in prompts
- understanding why access works in one app but not another
- explaining session behavior to users
- diagnosing Conditional Access outcomes
- understanding why users can stay signed in without re-entering passwords

It also helps separate identity-plane issues from application issues. If a valid token was never issued, the problem is likely in the authentication or policy path. If a valid token was issued but the app still denies access, the issue may be authorization inside the application.

## Final takeaway

Access tokens and refresh tokens are foundational to how Microsoft identity works.

The access token is what a client presents to a resource.  
The refresh token is what a client presents to Microsoft Entra ID to obtain a new access token.

Once that model is clear, a lot of Microsoft sign-in behavior becomes easier to understand, explain, and troubleshoot.

## Microsoft references

- [Microsoft identity platform access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Microsoft identity platform refresh tokens](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Entra Conditional Access overview](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview)
