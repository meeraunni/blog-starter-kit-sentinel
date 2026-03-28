---
title: "Access Tokens and Refresh Tokens in Microsoft Identity"
excerpt: "An engineering-level explanation of access tokens and refresh tokens in Microsoft Entra ID, including token ownership, lifetime, renewal, revocation, and common troubleshooting patterns."
coverImage: "/assets/blog/access-tokens/diagram.svg"
date: "2026-03-13"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/access-tokens/diagram.svg"
---

## Introduction

Microsoft identity discussions often go wrong because people use the word "token" too loosely. An administrator may say a user is authenticated, an application owner may say the app has a token, and a support engineer may say the sign-in succeeded. Those statements are related, but they are not the same thing.

In Microsoft Entra ID, the token model is the operational boundary between authentication, authorization, and session continuity. If you understand which token is being issued, who owns it, where it is sent, and how it is renewed, a large number of sign-in and API problems become much easier to reason about.

This article focuses on the two token types that create the most confusion in day-to-day administration:

- access tokens
- refresh tokens

The goal is not to give a shallow definition. The goal is to explain how these tokens behave in real Microsoft identity flows so an administrator can troubleshoot them confidently and explain them accurately to another engineer.

## The shortest useful explanation

If you only remember one model, remember this:

| Token | Primary purpose | Sent to | Owned by |
| --- | --- | --- | --- |
| Access token | Authorize a request to a protected resource | The target API or resource server | The resource identified by the `aud` claim |
| Refresh token | Acquire new access tokens without interactive sign-in | Microsoft Entra ID | The Microsoft identity platform |

That distinction matters more than the popular but vague explanation that one token is "short-lived" and the other is "long-lived." Lifetime matters, but destination and ownership matter more.

## What happens during sign-in at a high level

A standard Microsoft identity flow looks roughly like this:

1. A client redirects the user to Microsoft Entra ID.
2. Entra ID authenticates the user.
3. Entra ID evaluates policy, such as Conditional Access.
4. Entra ID returns token material to the client.
5. The client uses an access token to call a specific resource.
6. When needed, the client uses a refresh token to request a new access token.

This is the important operational point: after the sign-in itself, the application is not carrying the user's password around to each downstream service. It is carrying tokens.

## Access tokens: what they are and what they are not

An access token is a security token used for authorization. It represents the fact that Microsoft Entra ID issued permission for a client to call a specific protected resource.

The resource can be:

- Microsoft Graph
- Exchange Online APIs
- SharePoint Online APIs
- Azure Resource Manager
- a custom API protected by Microsoft Entra ID

An access token is not a generic proof that "the user signed in." It is a token for a specific audience. That audience is expressed in the `aud` claim.

This is why access-token troubleshooting should start with the resource question:

- Which API is the client trying to call?
- Was the token issued for that exact API?
- Does the resource accept the token version and claims it received?

If those answers do not line up, the request fails even if the user genuinely authenticated successfully.

## Access-token ownership and why clients should treat them as opaque

Microsoft's guidance is very clear on this point: clients use access tokens, but resources own them.

The client application should not assume it understands or controls the token format. For Microsoft identity, access tokens should generally be treated as opaque strings by the client. The resource server is the component that validates the token and decides whether to accept it.

This is one of the most common mistakes in application design and troubleshooting. People decode a JWT, see claims that look familiar, and start reasoning as though the client owns the token contract. It does not. The API does.

For a web API, the most basic access-token validation questions are:

- Does the `aud` claim match this API?
- Was the token issued by the correct issuer?
- Is the signature valid?
- Is the token expired?
- Are the required scopes or roles present?

If the token is for a different audience, the resource should reject it even if everything else looks valid.

## Common claims administrators should know

Access tokens contain claims that describe the authorization context. The exact claims vary by token version and scenario, but these are the ones administrators most commonly encounter:

- `aud`: the intended audience or resource
- `iss`: the issuer
- `tid`: the tenant ID
- `scp`: delegated permissions
- `roles`: app roles or application permissions
- `exp`: expiration time
- `iat`: issued-at time
- `oid` or `sub`: identity identifiers
- `azp` or `appid`: client application identifier

Administrators do not need to memorize every claim, but they should understand which claims answer which troubleshooting question.

## Access-token lifetimes

Access tokens are intentionally short-lived. Microsoft Learn states that the default lifetime is variable, generally between 60 and 90 minutes, with about 75 minutes as the average in standard scenarios.

That variation is deliberate. It spreads demand over time and prevents synchronized hourly spikes against Microsoft Entra ID.

This means two important things operationally:

- you should not assume every access token lasts exactly one hour
- your application or troubleshooting logic should rely on token response metadata and expiry handling, not folklore

In other words, "the token should still be valid because it has not been an hour yet" is not a reliable troubleshooting statement.

## Refresh tokens: what they actually do

A refresh token is used to obtain a new access token without forcing the user through an interactive sign-in every time an access token expires.

Microsoft Learn also highlights another important behavior: refresh tokens are not tied to a single resource in the same way access tokens are. They are tied to the client-user relationship and can be used to request access tokens for resources where the client has permission.

This is why refresh tokens are powerful and sensitive. They do not authorize a resource directly, but they let a client go back to the identity platform and request more access tokens.

That is also why they must be stored carefully.

## Where refresh tokens are sent

A refresh token is sent only to Microsoft Entra ID.

It is not sent to:

- Microsoft Graph
- your custom API
- Exchange Online
- SharePoint
- Azure Resource Manager

That is the clean mental model:

- access tokens go to the resource
- refresh tokens go back to the identity provider

If someone says an API is receiving refresh tokens, either the explanation is wrong or the implementation has a serious problem.

## Refresh-token lifetimes and behavior

According to Microsoft Learn, refresh tokens generally have longer lifetimes than access tokens:

- 24 hours for single-page applications
- 24 hours for apps using email one-time passcode authentication flow
- 90 days for many other scenarios

Another operationally important detail is that refresh tokens replace themselves when used. Clients should securely remove old refresh tokens after receiving a new one.

Administrators should also understand that refresh tokens can be revoked before their natural expiry. A token still being "inside its expected lifetime" does not guarantee that it still works.

## When refresh tokens are revoked

Microsoft documents several events that can revoke refresh tokens, including:

- user password changes
- self-service password reset
- admin password reset
- explicit refresh-token revocation by user or admin
- sign-out in certain scenarios

The exact behavior depends on token class and scenario, but the high-level lesson is straightforward:

refresh-token validity depends on both time and state.

That is why unexpected reauthentication prompts are not always application bugs. Sometimes the client is behaving correctly because the refresh token is no longer valid.

## Where ID tokens fit

Administrators often mix up access tokens and ID tokens.

An ID token is for the client application to understand the authenticated user context. It is not meant to authorize API access. APIs expect access tokens, not ID tokens.

A very common support issue sounds like this:

"The user signed in successfully and I have a token, so why is the API denying the request?"

Often the answer is that the application is holding the wrong kind of token, or the right token for the wrong audience.

## A practical example: Microsoft Graph

Suppose a web application needs to call Microsoft Graph on behalf of a user.

At a high level:

1. The user signs in through Microsoft Entra ID.
2. The application receives token response data.
3. The application acquires an access token whose audience is Microsoft Graph.
4. The application sends that access token to Graph.
5. When the access token expires, the application uses the refresh token to obtain a new Graph access token.

If the app instead sends:

- an ID token to Graph
- an access token whose `aud` is some other API
- an expired token

the request should fail.

That is normal, not surprising.

## Why Conditional Access matters here

Conditional Access sits in the token issuance path. That means Conditional Access can interrupt whether an access token is issued at all, or under what conditions.

This matters because administrators sometimes describe the process as:

"The user logged in, then Conditional Access checked them."

That is not the right model. The better model is:

"Conditional Access participates in the decision about whether token issuance proceeds."

If policy requires stronger assurance and that assurance is not satisfied, no valid token is issued for the request. No token means no resource access.

## Common admin misunderstandings

### "The user signed in, so the API should work"

Not necessarily. The API needs a valid access token for that resource, with the required scopes or roles.

### "The token lasted an hour last time, so it should last an hour this time"

Not necessarily. Default access-token lifetime is variable.

### "If the refresh token exists, silent renewal should always work"

Not necessarily. Refresh tokens can expire or be revoked.

### "The client should validate the access token"

Usually not. The resource validates access tokens. The client should treat them as opaque unless it is the resource or a scenario that specifically requires validation.

### "Any token means the user is authorized"

Not true. Token type, audience, scope, role, issuer, and lifetime all matter.

## A solid operational model for administrators

If you are explaining token behavior to another administrator, use this sequence:

1. Identify the client.
2. Identify the target resource.
3. Ask which token type is in use.
4. Ask whether the audience matches the target resource.
5. Check whether the token is expired.
6. Check whether the required scopes or roles are present.
7. If renewal failed, ask whether the refresh token expired or was revoked.
8. If no token was issued, investigate policy and sign-in conditions upstream.

That sequence is far more reliable than starting with "the user says they are signed in."

## Final takeaway

Access tokens and refresh tokens are not interchangeable pieces of session state. They solve different problems.

- **Access tokens** authorize calls to a specific protected resource.
- **Refresh tokens** let the client request new access tokens from Microsoft Entra ID without forcing interactive sign-in every time.
- **ID tokens** represent authentication context for the client and are not API authorization tokens.

Once you separate token type, token destination, token ownership, and token lifetime, Microsoft identity behavior becomes much easier to explain and troubleshoot.

## Microsoft References

- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [Tokens and claims overview](https://learn.microsoft.com/en-us/entra/identity-platform/security-tokens)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [OAuth 2.0 authorization code flow in Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [OpenID Connect protocol in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
