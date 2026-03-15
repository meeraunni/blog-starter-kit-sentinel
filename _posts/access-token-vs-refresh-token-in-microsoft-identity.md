---
title: "Access Tokens and Refresh Tokens in Microsoft Identity"
excerpt: "A practical IAM-focused explanation of what access tokens and refresh tokens are, how they work in Microsoft Entra ID, and what actually happens after sign-in."
coverImage: "/assets/blog/access-tokens/cover.jpg"
date: "2026-03-13"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/access-tokens/cover.jpg"
---

## Introduction

When a user signs in to Microsoft 365, Azure, Teams, Outlook, or a custom application integrated with Microsoft Entra ID, the platform does not keep sending the user’s password to every downstream service. Instead, Microsoft Entra ID issues security tokens that applications use to access protected resources.

For IAM engineers and Microsoft administrators, this is where sign-in becomes more than credential validation. It becomes a token issuance, authorization, and session continuity process. If you understand how tokens work, many Microsoft sign-in behaviors become much easier to explain and troubleshoot.

This article focuses on two important token types.

- Access Token  
- Refresh Token  

The goal is to explain what each one does, where it is used, and what happens behind the scenes during a Microsoft sign-in.

## The high-level sign-in picture

A simplified Microsoft Entra sign-in process usually looks like this.

1. The user is redirected to Microsoft Entra ID  
2. Entra ID authenticates the identity  
3. Entra ID evaluates Conditional Access and other session controls  
4. The client application receives tokens  
5. The client uses the access token to call the target resource  
6. When the access token expires, the client uses the refresh token to request a new access token  

This is the core model used across Microsoft services such as Microsoft Graph, Exchange Online, SharePoint Online, and Azure Resource Manager.

## What is an Access Token

An access token is a short-lived security token issued by Microsoft Entra ID that allows a client application to access a protected resource on behalf of a user or service principal.

During a sign-in flow, Entra ID authenticates the identity, evaluates policies such as Conditional Access, and then issues an access token targeted for a specific resource.

A useful way to think about it is as a temporary authorization credential. It proves that authentication has already occurred and that the identity platform has granted the client permission to call a protected API.

In the Microsoft ecosystem, protected resources commonly include.

- Microsoft Graph  
- Exchange Online APIs  
- SharePoint APIs  
- Azure Resource Manager  
- Custom APIs protected by Microsoft Entra ID  

The important point is that the access token is the token that gets presented to the resource.

## Typical Access Token Claims

An access token contains claims that describe the identity and authorization context.

Common claims include.

- aud — the intended resource or API  
- tid — the tenant that issued the token  
- appid or azp — the client application requesting the token  
- scp — delegated permissions granted to the application  
- roles — application roles or app permissions  
- exp — token expiration time  
- iat — token issuance time  
- oid or sub — identifiers representing the user or service principal  

These claims allow the resource server to validate the caller and enforce authorization decisions.

For example, if a client requests an access token for Microsoft Graph, the audience claim should match Graph. If the audience is incorrect, the resource server should reject the request.

## How Access Tokens Are Used

Once the client application gets an access token, it sends it to the target resource in the HTTP Authorization header.

Example HTTP header:

Authorization: Bearer <access_token>

The resource server then validates the token. At a high level it checks the following.

- whether the token was issued by a trusted authority  
- whether the token is meant for that specific resource  
- whether the token has expired  
- whether the required scopes or roles are present  

Only after those checks does the resource decide whether to allow the request.

This is why access tokens sit at the boundary between authentication and authorization. A user may have successfully signed in, but the resource still needs a valid access token to grant access.

## What is a Refresh Token

A refresh token is a longer-lived token that allows a client application to obtain a new access token without requiring the user to authenticate again.

Refresh tokens are issued alongside access tokens during the authentication process.

Instead of prompting the user to sign in again every time an access token expires, the client application can silently request a new access token by presenting the refresh token to Microsoft Entra ID.

The refresh token is therefore never sent to Microsoft Graph or any other API.

It is only sent to Microsoft Entra ID.

This leads to an important distinction.

- Access tokens are presented to the resource  
- Refresh tokens are presented to the identity provider  

## Why Refresh Tokens Exist

Access tokens are intentionally short-lived for security reasons.

If applications required the user to sign in every time an access token expired, the user experience would be extremely poor.

Refresh tokens solve this problem by allowing applications to maintain a session while still rotating short-lived access tokens.

This design balances usability and security.

- short-lived access tokens reduce exposure  
- refresh tokens allow the session to continue  
- Conditional Access policies can still interrupt the session when risk changes  

## Refresh Token Flow

The token lifecycle typically follows these steps.

1. The user signs in  
2. Microsoft Entra ID issues an access token and a refresh token  
3. The client application calls the API using the access token  
4. The access token eventually expires  
5. The client sends the refresh token to Entra ID  
6. Entra ID validates the refresh token and issues a new access token  
7. The application continues calling the resource without prompting the user again  

This mechanism allows long-running sessions without repeatedly asking the user to log in.

## What Actually Happens in the Backend

After a user signs in, the resource server does not ask for the user’s password again. Instead, it trusts the access token issued by Microsoft Entra ID.

The backend interaction generally follows this model.

- the client authenticates against Microsoft Entra ID  
- Entra ID issues an access token for a specific resource  
- the client sends the access token to the resource  
- the resource validates the token and its claims  
- when the token expires the client exchanges the refresh token for a new access token  

In this architecture.

Microsoft Entra ID is responsible for authentication and token issuance.

The resource server is responsible for validating access tokens and enforcing authorization.

Understanding this separation is critical for troubleshooting identity issues.

## Where Conditional Access Fits

Conditional Access sits in the token issuance path.

That means Microsoft Entra ID can require controls such as.

- multi-factor authentication  
- device compliance  
- trusted network locations  
- authentication strength policies  
- risk-based sign-in evaluation  

before issuing tokens.

Successful authentication does not automatically mean successful resource access. The resource still depends on a valid access token being issued and presented.

No token means no access.

## Access Token vs Refresh Token

A simplified comparison.

Access Token  
Purpose: authorize access to a resource  
Sent to: API or resource server  
Typical behavior: short-lived  

Refresh Token  
Purpose: obtain new access tokens  
Sent to: Microsoft Entra ID  
Typical behavior: longer-lived  

The easiest way to remember this is.

Access tokens are for resources.  
Refresh tokens are for token renewal with Entra ID.

## Where Administrators Often Get Confused

The user is signed in but the application fails.

This often happens because successful sign-in does not mean the application has a valid access token for the required resource. The token may be expired, issued for the wrong audience, or missing the required scopes.

Users are prompted again unexpectedly.

This can happen when the refresh token is no longer valid, Conditional Access policies force reauthentication, sign-in frequency requirements are triggered, or the application cannot access the token cache.

Using ID tokens incorrectly.

An ID token is meant for the client application's sign-in context. It should not be used to authorize calls to an API. APIs expect access tokens.

## Why This Matters for IAM Engineers

Understanding the token model helps administrators.

- troubleshoot repeated sign-in prompts  
- understand Conditional Access outcomes  
- debug API authorization failures  
- explain why access works in one application but fails in another  
- separate identity platform issues from application configuration issues  

Tokens are not just theoretical protocol components. They are the operational backbone of Microsoft identity.

## Final Takeaway

After a Microsoft sign-in, the password is not what applications keep using. The real work is done by tokens.

Access token  
Used for authorizing requests to APIs and protected resources.

Refresh token  
Used by the client to obtain new access tokens from Microsoft Entra ID.

ID token  
Used by the client application to represent the user’s authentication context.

Once this separation becomes clear, many Microsoft Entra behaviors become much easier to reason about.

## Microsoft References

Access tokens in the Microsoft identity platform  
https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens

Refresh tokens in the Microsoft identity platform  
https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens

Security tokens and claims in the Microsoft identity platform  
https://learn.microsoft.com/en-us/entra/identity-platform/security-tokens

Access token claims reference  
https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference

OAuth 2.0 authorization code flow in Microsoft identity platform  
https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

OpenID Connect protocol in Microsoft identity platform  
https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
