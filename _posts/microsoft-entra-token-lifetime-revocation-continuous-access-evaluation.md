---
title: "Token Lifetimes, Revocation, and Continuous Access Evaluation in Microsoft Entra"
excerpt: "An engineering explanation of access, refresh, and ID token lifetimes in Microsoft Entra, how revocation actually propagates, and what Continuous Access Evaluation (CAE) changes for CAE-capable clients."
coverImage: "/assets/blog/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation/diagram.svg"
date: "2026-05-08T09:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation/diagram.svg"
---

## Why this is the topic engineers misunderstand most

In almost every Microsoft Entra incident review, the same misconception surfaces: "I disabled the user, why are they still in Teams?" The answer is some combination of access token lifetime, refresh token rolling, CAE awareness in the client, and the propagation model for critical events. Each of those is documented separately on Microsoft Learn but they only make sense together. This article puts them together at the level of detail needed to design and operate identity in production.

Continuous Access Evaluation (CAE) is the biggest change to this model in the last several years. It moves Microsoft from a fixed-token-lifetime model toward a near-real-time revocation model for CAE-capable clients and CAE-aware resources. Understanding what CAE does, and equally what it does not do, is essential.

> [!NOTE]
> CAE is on by default for tenants and for the major Microsoft first-party resources that support it (Exchange Online, SharePoint Online, Microsoft Graph, Teams). It applies only when both the client and the resource speak CAE. Third-party apps and older clients are unchanged.

## The three Microsoft Entra tokens, briefly

Three tokens are involved in any Microsoft Entra sign-in:

- **ID token (OIDC)** — a JWT asserting the identity of the user to the application. The application reads it to learn who the user is. It does not authorise calls to any other API.
- **Access token (OAuth 2.0)** — a JWT or opaque token presented to the *resource* (Microsoft Graph, Exchange Online, SharePoint, a custom API) to authorise calls. This is the token that "lets you in."
- **Refresh token (OAuth 2.0)** — a long-lived credential held by the client, presented to the Microsoft Entra `/token` endpoint to obtain a new access token without re-prompting the user.

The relationship matters. The access token authorises individual resource calls. When it expires, the client redeems the refresh token for a new one. The refresh token survives across access-token rotations and is what gives a sign-in its persistence.

Microsoft's [token lifetime documentation](https://learn.microsoft.com/azure/active-directory/develop/active-directory-configurable-token-lifetimes) is the canonical reference for the defaults, the conditions under which they vary, and the (now mostly removed) ability to configure them per application.

## Default lifetimes — and why "default" became misleading

Pre-CAE, the defaults were straightforward:

- **Access token**: 60–90 minutes, varied to spread refresh load (the *variable token lifetime* feature documented in [Configurable token lifetimes](https://learn.microsoft.com/azure/active-directory/develop/active-directory-configurable-token-lifetimes)).
- **Refresh token (single-factor)**: 90 days, sliding (renewed each time used).
- **Refresh token (MFA / federated)**: also 90 days but the renewal pattern depends on inactivity.
- **ID token**: 60–90 minutes, same as access token.

With CAE, the *access token* lifetime for CAE-aware sessions to CAE-capable resources extends to up to 28 hours by default. This is intentional. The CAE design accepts a longer token in exchange for the resource being able to re-evaluate access on critical events, instead of relying on token expiry to trigger re-auth.

> [!IMPORTANT]
> "Access tokens are now valid for 28 hours" is a frequent misreading. The *upper bound* is 28 hours for CAE-eligible sessions. The runtime still issues shorter tokens depending on policy, signal, and risk. Never code as though every access token will live 28 hours; never code as though every access token will live 60 minutes.

## How revocation actually works

The legacy model was: change a Conditional Access policy or disable a user, then wait for tokens to expire. The new model is: change happens, Microsoft Entra publishes a *critical event*, and CAE-aware resources reject the next API call from the affected session and require the client to re-authenticate.

The documented critical events that propagate over CAE are:

- User account is **deleted** or **disabled**.
- User **password** is changed or reset.
- An admin **explicitly revokes** all refresh tokens for a user (via `Revoke-MgUserSignInSession` or the equivalent portal action).
- MFA is **enabled** on a user account.
- **Detected user risk** (Identity Protection raises a high-risk signal).
- **Token revocation** events (admin-initiated).
- **Conditional Access policy changes** that affect the session (some, not all — see below).

Microsoft documents the complete list in the [Continuous Access Evaluation event types](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation#critical-event-evaluation) reference.

> [!WARNING]
> A Conditional Access *policy change* does not always propagate as a CAE critical event. Some policy changes (for example, adding a new grant control to an existing policy) require the next access token request to be re-evaluated; existing tokens in flight may survive until they expire. If you are tightening a policy in response to an incident, *also* revoke refresh tokens for the affected users to force a clean re-auth.

## CAE-capable clients versus not

CAE only works if both ends speak it. The major CAE-capable clients today include:

- Microsoft Teams desktop / Teams web (via the Teams web SDK).
- Microsoft Outlook desktop, Outlook for the Web, Outlook mobile (recent versions).
- OneDrive sync client.
- The Microsoft Authentication Library (MSAL) when the application opts in via the `clientCapabilities` claim set to `cp1`.

If a client is not CAE-capable, the legacy model still applies: tokens live to their normal expiry, and the resource cannot proactively reject a stale token. This is the source of "I revoked the user but they kept reading email for 90 minutes" — it usually means an older client that did not negotiate CAE.

For your own apps using MSAL, opting in is one line of configuration. The [Claim challenges, capabilities, and client capabilities](https://learn.microsoft.com/azure/active-directory/develop/claims-challenge) page explains the negotiation.

> [!TIP]
> When you are evaluating whether a third-party app is CAE-aware, do not rely on the vendor's marketing. Look at the `clientCapabilities` claim on the token requests the app makes against your tenant. If `cp1` is not present, CAE is not in play for that app, regardless of what the vendor says.

## How critical events propagate

When a critical event fires, Microsoft Entra writes the event to a backend channel. CAE-aware resources subscribe. The next time a CAE-aware client makes a call to a CAE-capable resource, the resource sees the event applies to the session, returns an `unauthorized` response with a `claims` challenge, and the client redeems against Microsoft Entra for a new access token. Microsoft Entra evaluates the request again with the new state — and rejects it if the user is now disabled, the password is now changed, etc.

End-to-end latency from event to enforcement is typically under a minute and within a few minutes in the worst case. There are no published SLOs, but the [Continuous Access Evaluation](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation) page describes the design intent: "near real time."

## Long-lived sessions and the trade-offs

CAE accepts long-lived access tokens because the resource can re-evaluate. This is the right trade-off for the broad case. It has consequences:

- A long-lived access token still works locally if the device is offline. CAE cannot reach an offline client. An offline laptop with a 24-hour valid access token continues to satisfy any locally-cached read against the resource until the laptop is online again.
- Tokens cached in non-CAE-aware components (older PowerShell modules, custom scripts that cache the raw token, third-party tools that proxy auth) may continue to "work" longer than expected. Cache-flush behaviour is the responsibility of the client.
- Resources that accept access tokens but do not subscribe to CAE events (some non-Microsoft APIs that just JWT-validate) will accept stale tokens until expiry. Architect those resources with shorter access-token lifetimes.

## Testing revocation end-to-end

Every identity team should run a token-revocation drill on a regular cadence. The drill:

1. Sign a non-privileged test user into Teams desktop, Outlook desktop, OneDrive, and Edge (Office.com web). All four are CAE-capable. Confirm the user is active in all four.
2. Revoke the user's sessions with Microsoft Graph PowerShell:

```powershell
Connect-MgGraph -Scopes "User.RevokeSessions.All", "User.ReadWrite.All"
Revoke-MgUserSignInSession -UserId "test-user@contoso.com"
```

3. Watch the clients. Within a minute, Teams desktop should prompt for re-auth, Outlook should display the auth prompt, and OneDrive should pause sync and re-auth. The web Office.com tab should redirect through the sign-in page on the next click.
4. Sign back in as the same user. Verify the new sign-in produces a fresh `SigninLogs` entry with a new `CorrelationId`.

If any of the four clients keeps working for more than 5 minutes, you have either (a) a non-CAE-capable client, (b) an offline client, or (c) a configuration issue that prevents CAE on that endpoint. All three are worth understanding *before* you depend on revocation in an incident.

## Pitfalls

### Apps that cache the raw access token

Any custom tool or script that calls `Get-MsalToken`, extracts the `AccessToken` value, and stuffs it into its own cache is bypassing CAE. The cached token will work for its full lifetime regardless of revocation. Audit your in-house tooling for this pattern and migrate to per-call MSAL invocations that respect the cache properly.

### Service principals and CAE

CAE applies to user sessions. Service principal / workload identity sessions do not have a CAE story today. Revocation of a service principal credential happens at the credential level (rotate or remove the secret or certificate), and existing tokens issued under the prior credential remain valid until they expire. Build short-lifetime access tokens for high-value workload identities by limiting the audience and configuring application token lifetime policies where supported.

### SDK versions

CAE behaviour depends on the MSAL version the client uses. Older versions may not handle the `claims` challenge correctly and fall back to silent token acquisition that does not satisfy the challenge. Keep SDK versions current. The [MSAL.NET release notes](https://learn.microsoft.com/azure/active-directory/develop/msal-net-migration) document the minimum versions with full CAE support.

### Sign-in frequency vs CAE

Sign-in frequency Conditional Access policies are independent of CAE. A sign-in frequency policy can force re-auth every N hours regardless of token lifetime. Use it on top of CAE for sensitive populations; do not use it instead of CAE.

## Common questions

### How long does it take for "revoke sessions" to actually log a user out?

For CAE-capable clients and CAE-capable resources, typically under a minute, occasionally up to a few minutes. For non-CAE clients, until the access token expires (default 60–90 minutes) and the refresh token redemption fails — at which point the user is prompted to re-authenticate.

### Why is my access token valid for 24 hours when I expected 60 minutes?

Your session is CAE-eligible (the client opted in with `cp1` and the resource is CAE-capable). The longer lifetime is by design; the resource will re-evaluate access on critical events instead of relying on token expiry. If you specifically need shorter lifetimes for a workload, configure a token lifetime policy on the application object.

### Does Conditional Access "Block access" actually block in-flight sessions?

Adding a Block grant control to a CA policy that targets a user removes that user's ability to acquire *new* tokens immediately, and on CAE-capable client/resource pairs causes existing tokens to be rejected on the next call. If you need certainty, pair the policy change with a session revocation via Microsoft Graph.

### What happens if a user is offline when their session is revoked?

The user can continue to use locally-cached resources until they reconnect to the network. When they reconnect, the CAE channel fires, the resource rejects the access token, and the client re-prompts. There is no out-of-band mechanism to force a logout on an offline client.

### Are ID tokens revocable?

ID tokens are intentionally short-lived and not revoked individually. The application should not rely on the ID token surviving past its expiry; it should re-fetch user information from a token endpoint as needed.

## What to take away

Microsoft Entra's token model has shifted from "tokens expire, then we re-evaluate" to "tokens are longer-lived, and resources re-evaluate on critical events." That shift is real, but it is bounded: it works only when both ends speak CAE, only on the documented critical event list, only after a propagation delay that you should measure in minutes, and only on online clients. Treat revocation as fast on CAE pairs and best-effort everywhere else. When an incident calls for certainty — a compromised admin, a high-risk leaver — revoke sessions explicitly and assume that any cached client tooling needs an additional, manual nudge.

## References

- [Continuous Access Evaluation — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation)
- [Configurable token lifetimes — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/develop/active-directory-configurable-token-lifetimes)
- [Claims challenges, capabilities, and client capabilities — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/develop/claims-challenge)
- [Revoke-MgUserSignInSession reference — Microsoft Learn](https://learn.microsoft.com/powershell/module/microsoft.graph.users.actions/revoke-mguserSignInsession)
- [ID and access tokens in Microsoft identity platform — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/develop/id-tokens)
- [Refresh tokens in Microsoft identity platform — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/develop/refresh-tokens)
- [Sign-in frequency in Conditional Access — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/howto-conditional-access-session-lifetime)
