---
title: "AADSTS70043 Sign-In Frequency: Microsoft Entra Fix"
excerpt: "Fix AADSTS70043 by tracing the Conditional Access sign-in frequency policy, separating expected reauthentication from client loops, and validating recovery."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-10T09:10:20-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS70043 sign-in frequency** error means Microsoft Entra rejected a refresh-token request because a Conditional Access session policy says the user must authenticate again. The immediate recovery is a supported interactive sign-in for the same user, tenant, client, and resource. The durable fix is to prove which sign-in-frequency policy applied, confirm that its scope and interval are intentional, and make sure the application can move from silent token acquisition to interaction without looping.

Grab a coffee before clearing every cache or relaxing Conditional Access. Microsoft names the error `BadTokenDueToSignInFrequency` and says the refresh token is expired or invalid because of Conditional Access sign-in-frequency checks. The response can include when the token was issued and the maximum lifetime allowed for that request. ([Microsoft Entra error-code reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

> **Documentation boundary:** this guide is based on current Microsoft documentation and operational analysis. It does not claim that the error was reproduced in a production tenant. Portal labels and event fields can vary with client, resource, log category, and rollout state; use the failed event from your tenant as the authority for the incident.

## AADSTS70043 sign-in frequency: the short answer

Work the incident in this order:

1. Preserve the full sanitized error, UTC timestamp, request ID, correlation ID, user, tenant, application, resource, client type, device, and application version.
2. Confirm the code is `70043`, not an inactive, fixed-lifetime, or explicitly revoked refresh grant.
3. Find the failed event under **Entra ID > Monitoring & health > Sign-in logs**. Check both interactive and non-interactive user sign-ins around the same time.
4. Open **Authentication Details** and **Conditional Access**. Record every applied policy and the session-lifetime controls reported for the event.
5. Identify the most restrictive applicable sign-in-frequency setting. Check the policy's users, target resources, conditions, client apps, device filters, exclusions, and current state.
6. Decide whether the prompt is expected. A single reauthentication at the intended boundary is normal; raw errors, repeated prompts, or a loop point to client recovery, cookie, broker, device, or overlapping-policy trouble.
7. Start one approved interactive sign-in through the application's supported authentication library or normal sign-in experience.
8. Verify a successful interactive event, a following successful token request, and the intended business action.
9. If the prompt interval or scope is wrong, change the policy through a controlled pilot. Do not weaken tenant-wide policy to make one broken client quiet.
10. If the error persists after fresh authentication, compare account, tenant, client ID, resource, redirect path, cache partition, browser or broker session, and application node.

`AADSTS70043` is a **policy-driven reauthentication boundary**. It is not evidence that the user's password is wrong, the account is disabled, the client secret expired, or the refresh token simply sat unused for too long.

## Put the failure in the token and policy flow

A modern client normally acquires an access token, uses it until the resource or client needs another token, and then tries silent acquisition with cached session state or a refresh token. Conditional Access is evaluated again when the client asks Microsoft Entra for new token material. If the elapsed authentication age exceeds an applicable sign-in-frequency control, Entra refuses silent continuation and requires fresh authentication.

Microsoft describes sign-in frequency as the period during which a user can access a resource before being asked to sign in again. Administrators can set hours or days, or require reauthentication every time. The control works with OAuth 2.0 and OpenID Connect applications and with non-Microsoft SAML applications that regularly return to Entra instead of relying only on their own long-lived cookie. ([Conditional Access adaptive session lifetime](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-session-lifetime), [Conditional Access session controls](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-session))

That gives `70043` a specific position in the flow:

```text
Existing user session
        |
        v
Client requests a new token silently
        |
        v
Conditional Access evaluates session controls
        |
        +-- authentication age is acceptable --> token flow continues
        |
        +-- sign-in frequency is exceeded -----> AADSTS70043 / interaction required
```

The refresh token is not repaired by editing its lifetime. Microsoft retired configurable refresh- and session-token lifetime properties; Conditional Access sign-in frequency is the supported way to govern how often users must sign in. ([Configurable token lifetimes](https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes#token-lifetime-policies-for-refresh-tokens-and-session-tokens-retired))

## Separate AADSTS70043 from neighboring refresh failures

Use the exact code and event, not the words “expired” or “invalid grant,” to choose the repair.

**`AADSTS70043` — Conditional Access sign-in frequency.** Inspect applied Conditional Access policies and session-lifetime controls.

**`AADSTS700082` — refresh-token inactivity.** Inspect last use, the client cache, and the interactive recovery path.

**`AADSTS700084` — fixed SPA refresh-token lifetime.** Inspect the `spa` redirect registration and top-level interactive authorization.

**`AADSTS50173` — revoked grant or token-validity cutoff.** Inspect password, session-revocation, and administrator actions.

**`AADSTS50076` — the current request requires MFA.** Inspect the authentication requirement and the client's challenge-capable path.

The site's [AADSTS700082 inactive refresh-token guide](/posts/aadsts700082-refresh-token-expired-microsoft-entra) covers a different lifetime boundary. `AADSTS50173` covers a different revoked-grant validity decision. Changing sign-in frequency does not restore either one.

Microsoft's refresh-token reference says clients must handle expiration or revocation by redirecting the user to an interactive sign-in and obtaining new token material. It also documents scenario-specific refresh-token behavior, including the fixed 24-hour boundary for tokens issued to `spa` redirect URIs. ([Refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens))

## Find the sign-in-frequency policy that actually applied

Start from the failed request, not from the policy list. In **Entra ID > Monitoring & health > Sign-in logs**, use the correlation ID when available, then narrow by user, application, resource, status, and UTC time. Microsoft documents **Reports Reader** as the least-privileged role for activity logs; seeing both log data and Conditional Access policy details requires suitable policy-read access, with **Security Reader** being the least-privileged built-in role that covers both. ([View applied Conditional Access policies](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies), [Customize activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-customize-filter-logs))

Record these fields before changing anything:

- sign-in event category: interactive or non-interactive user sign-in;
- error code, failure reason, additional details, UTC timestamp, request ID, and correlation ID;
- user object ID, home tenant, resource tenant, application ID, and resource ID;
- client app, browser or broker context, operating system, device ID, compliance, and join state;
- authentication requirement and each authentication step in **Authentication Details**;
- **Session Lifetime Policies Applied**, when the event exposes it;
- every policy and result on the **Conditional Access** tab;
- IP, location, and risk only where they are relevant to policy scope;
- application release, node, token-cache source, and last successful time from application telemetry.

Microsoft recommends using the event's Conditional Access tab to see which policies applied and why. Audit logs can then show when a relevant Conditional Access policy was created, updated, or deleted. ([Conditional Access and activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies))

Do not assume that the policy with “session” in its name won. Multiple policies can apply. The effective experience follows the most restrictive applicable lifetime, and a policy aimed at a broad suite can combine with a narrower policy aimed at the same resource. Microsoft's reauthentication guidance explicitly warns that overlapping settings can increase prompts and recommends inspecting **Session Lifetime Policies Applied** in Authentication Details. ([Microsoft Entra MFA prompts and session lifetime](https://learn.microsoft.com/en-us/entra/identity/authentication/concepts-azure-multi-factor-authentication-prompts-session-lifetime))

## Decide whether the reauthentication is expected or broken

### One prompt appears at the intended interval

This is the healthy path. The client attempted silent acquisition after the permitted authentication age, Entra required interaction, the user satisfied the current controls, and the application continued.

Validate that the interval, resource, user population, and client type match the approved design. Do not classify the initial `70043` as an outage merely because it appears in a non-interactive event; the important test is whether the client moved to a successful interactive flow.

### The application exposes the raw error and stops

The policy can be correct while the client is incomplete. A supported authentication library should recognize that silent acquisition cannot continue and start or request an interactive path appropriate to the application type. A daemon with no user interface cannot magically satisfy a user reauthentication requirement.

Review whether the application:

- uses a current Microsoft authentication library or supported platform broker;
- attempts silent acquisition first and handles interaction-required results explicitly;
- preserves account, authority, tenant, scopes, state, nonce, and PKCE across recovery;
- returns the user to the intended route after interaction;
- bounds retries instead of sending the same unusable grant repeatedly; and
- keeps tokens, cookies, authorization codes, and cache contents out of logs.

If the workload is genuinely unattended, stop and review the identity model. Replacing delegated user access with application permissions, managed identity, or workload identity federation can widen authorization and requires separate approval, consent, ownership, and monitoring. It is not an automatic `70043` fix.

### The user is trapped in a reauthentication loop

A loop means interaction completes but the next policy evaluation still cannot accept the session. Compare one full failing cycle from browser or client telemetry with the matching Entra events. Common boundaries to prove include:

- the application restarts silent acquisition with an old account or cache entry;
- a reverse proxy or browser blocks or partitions the session cookie;
- different application nodes use inconsistent encryption keys or token caches;
- the redirect returns to a different host, tenant, or client registration;
- two policies target related resources with incompatible session expectations;
- the required authentication method is not available in the current client surface;
- the device or broker cannot provide the expected Primary Refresh Token context; or
- “Every time” is used where the application repeatedly requests tokens without a stable interactive session.

Microsoft warns that **Every time** without MFA can create sign-in loops. It recommends limiting that setting to specific business needs, notes a five-minute prompt tolerance for the normal Every time control, and recommends time-based sign-in frequency for Microsoft 365 applications. ([Configure adaptive session lifetime policies](https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-session-lifetime), [Adaptive session lifetime design](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-session-lifetime#require-reauthentication-every-time))

### Windows behavior does not match a simple timer

On Microsoft Entra joined and hybrid joined Windows devices, the Primary Refresh Token participates in SSO. Microsoft says Windows CloudAP attempts PRT renewal during sign-in on a four-hour cadence, while WAM can also renew the PRT during application token requests. Conditional Access policies are evaluated when applications request tokens, not when the PRT is merely renewed. ([Understanding the Primary Refresh Token](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token))

That distinction explains why “the user unlocked Windows” is not enough evidence by itself. Capture `dsregcmd /status` only when device or PRT health is relevant, and correlate it with the actual application token request. The site's [Windows PRT troubleshooting guide](/posts/microsoft-entra-primary-refresh-token-prt-failures-windows) covers broken device SSO; a healthy PRT does not override an intentional sign-in-frequency decision.

### A browser appears to enforce the policy late

Microsoft documents that browser and confidential-client background activity can defer the visible sign-in-frequency prompt until the next interactive sign-in or user interaction. Access-token lifetime variation also means the user-facing prompt does not necessarily appear at the exact minute configured in policy. ([Conditional Access adaptive session lifetime](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-session-lifetime), [Access-token lifetime and sign-in frequency](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#token-lifetime))

Treat the configured interval as a reauthentication policy boundary evaluated during token and session activity—not as a desktop stopwatch that guarantees a prompt at a precise wall-clock second.

## Review licensing, roles, and safety before changing policy

Conditional Access requires Microsoft Entra ID P1; risk-based conditions require the P2 capabilities of Microsoft Entra ID Protection. Microsoft 365 Business Premium also includes Conditional Access. The role that reads a log need not be the role that edits policy: use Reports Reader or Security Reader for investigation, then a properly governed Conditional Access Administrator for an approved change. ([Conditional Access licensing](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview#license-requirements))

Before editing:

1. Export or record the current policy JSON, state, assignments, conditions, grant controls, session controls, exclusions, and modification time.
2. Identify emergency-access exclusions and prove those accounts remain usable through the organization's established test procedure.
3. Use the **What If** tool for the affected identity, resource, client app, platform, location, and device context. Microsoft notes that What If estimates policy application but does not model service dependencies such as Teams relying on Exchange Online. ([Conditional Access What If tool](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool))
4. Put a proposed replacement or narrowed policy in **Report-only** and inspect real sign-ins before enforcement.
5. Pilot managed and unmanaged devices, browsers, desktop and mobile clients, guest or federated identities where in scope, and every important resource dependency.
6. Change one control plane at a time. Do not simultaneously rewrite authentication strength, persistent browser session, device conditions, and sign-in frequency.

For privileged role elevation, Microsoft recommends considering PIM activation with Conditional Access authentication context instead of applying Every time broadly to the Azure and Entra admin portals. The site's [PIM activation troubleshooting guide](/posts/microsoft-entra-pim-activation-failed) helps keep the activation, MFA, approval, and Conditional Access evidence separate.

## Repair the incident without weakening the tenant

### When the policy is correct

1. Tell the user that a fresh sign-in is required through the expected application.
2. Confirm the application, tenant, account, and requested resource before the user approves any MFA prompt.
3. Start one supported interactive authorization path.
4. Verify the resulting interactive event satisfies the intended grant and session controls.
5. Verify the next non-interactive token request succeeds.
6. Confirm the real application action succeeds.
7. Fix the client if it cannot perform this handoff automatically and safely.

Do not ask the user to approve repeated unexpected prompts. A surprise MFA request can be an attack. Stop the recovery if the application name, tenant, location, consent text, or timing is wrong.

### When the policy scope or interval is wrong

Use the smallest reviewed correction:

- remove an unintended user, group, resource, client, or device condition from scope;
- align key Microsoft 365 resource scopes when inconsistent policies create fragmented prompts;
- replace Every time with a justified periodic interval where Microsoft recommends a time-based experience;
- split high-impact applications from ordinary productivity resources;
- move a proposed change through report-only and pilot rings; and
- preserve audit evidence linking the incident, policy change, approver, validation, and rollback plan.

Do not disable all Conditional Access, add a broad permanent exclusion, lengthen every session, or turn off MFA to repair one application. The [Conditional Access evaluation-pipeline guide](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) is useful when several policies appear to compete.

### Rollback and mitigation

If a new sign-in-frequency policy produces widespread loops or blocks administrators:

1. stop expansion and preserve affected event samples;
2. use an established emergency-access path;
3. return the specific new policy to report-only or restore its previously approved state;
4. validate access for one emergency account, one pilot administrator, one standard user, and the affected client types;
5. investigate the client or policy interaction before another enforcement attempt; and
6. document who changed what, when, why, and which evidence proved recovery.

A rollback restores the last reviewed policy state. It should not erase logs, caches, or tickets needed to explain why the rollout failed.

## Validate recovery and monitor recurrence

Recovery has four gates:

1. **Policy gate:** the intended Conditional Access policy and session control are the ones applied.
2. **Authentication gate:** the fresh interactive event succeeds with the intended method and account.
3. **Token gate:** the next silent or non-interactive acquisition succeeds for the intended client and resource.
4. **Application gate:** the user completes the real business action without another immediate prompt or widened access.

Monitor `70043` by application, resource, user population, client type, device state, policy, release, and time window. One event followed by successful interaction is expected lifecycle behavior. A cluster with no successful interactive follow-up is actionable. A cluster isolated to one application version or node points toward client recovery or cache design; a tenant-wide change aligned with a policy audit event points toward policy scope.

> **Analysis:** alerting should distinguish “reauthentication required and completed” from “reauthentication required and never recovered.” Counting every `70043` as an incident trains responders to ignore the signal; counting none hides broken clients.

## AADSTS70043 administrator checklist

- [ ] Preserve the full sanitized error and UTC identifiers.
- [ ] Confirm `70043`, not `700082`, `700084`, `50173`, or `50076`.
- [ ] Confirm user, tenant, client application, resource, client type, and device.
- [ ] Find the exact interactive or non-interactive sign-in event.
- [ ] Record Authentication Details, Session Lifetime Policies Applied, and the Conditional Access tab.
- [ ] Identify every applicable sign-in-frequency policy and the most restrictive result.
- [ ] Check recent Conditional Access audit changes.
- [ ] Decide whether one reauthentication is expected or the client is looping.
- [ ] Use one supported interactive recovery path.
- [ ] Verify a fresh interactive event, next token request, and business action.
- [ ] Fix client interaction-required handling when policy is correct.
- [ ] Use What If, report-only, pilot rings, and emergency-access validation before policy changes.
- [ ] Keep tokens, cookies, authorization codes, and secrets out of diagnostics.
- [ ] Escalate with request ID, correlation ID, UTC time, policy IDs, client and resource IDs, app version, and reproduction sequence.

## FAQ

### Is AADSTS70043 a Microsoft Entra outage?

Not by itself. Microsoft documents it as a Conditional Access sign-in-frequency result. Check service health when symptoms are broad, but first prove the applied policy and whether the client completed interactive recovery.

### Should I clear the token cache?

Not as the first move. A broad cache clear can sign out unaffected users and destroy evidence. Use the library's supported account-specific recovery after proving which cache entry and client failed. If stale state repeatedly returns after successful interaction, investigate cache partitioning, encryption keys, replication, and node consistency.

### Can an administrator renew the refresh token?

No supported admin action makes the rejected grant valid again. The application must obtain fresh token material through an approved interactive flow after the user satisfies current policy.

### Why did the prompt arrive later than the configured interval?

Sign-in frequency is evaluated during token and application session activity. Access-token lifetime variation, browser interaction, background processing, and the resource's return to Entra affect when the user sees a prompt. Use the event timestamps and session-policy evidence instead of expecting an exact stopwatch boundary.

### Is persistent browser session the same as sign-in frequency?

No. Persistence determines whether a browser session can survive closing and reopening the browser. Sign-in frequency determines when fresh authentication is required. Both can apply, and the resulting experience must be tested together.

### Does Windows unlock satisfy sign-in frequency?

It can contribute fresh PRT context on a joined or hybrid joined device, but it is not a universal override. The outcome depends on PRT renewal, the application token request, the configured interval, client and device state, and the policies applied to the target resource. Verify the sign-in event.

### Should privileged admins use Every time for all admin portals?

Microsoft recommends considering time-based sign-in frequency or requiring reauthentication at PIM activation through authentication context for Azure and Entra administration. Scope and test the control around the sensitive action rather than assuming a broad prompt is always safer.

## Final takeaway

AADSTS70043 is Microsoft Entra saying, “silent continuation has reached the authentication-age limit this policy allows.” Preserve the failed event, find the exact session policy, and let the client perform one safe interactive recovery. If that works, the control is doing its job. If the application exposes the error, loops, or prompts at the wrong boundary, repair the client or narrow the policy through report-only evidence and pilot rings—without weakening the rest of the tenant.

## Microsoft sources

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Conditional Access adaptive session lifetime policies](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-session-lifetime)
- [Configure adaptive session lifetime policies](https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-session-lifetime)
- [Conditional Access session controls](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-session)
- [View applied Conditional Access policies in activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies)
- [Microsoft Entra MFA prompts and session lifetime](https://learn.microsoft.com/en-us/entra/identity/authentication/concepts-azure-multi-factor-authentication-prompts-session-lifetime)
- [Refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Understanding the Primary Refresh Token](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token)
- [Conditional Access What If tool](https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool)
