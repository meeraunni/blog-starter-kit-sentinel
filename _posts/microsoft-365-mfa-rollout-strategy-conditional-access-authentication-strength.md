---
title: "Rolling Out MFA in Microsoft 365 Without Breaking Production: Conditional Access + Authentication Strengths"
excerpt: "An engineer-level rollout plan for Microsoft 365 multifactor authentication using Conditional Access, Authentication Strength policies, staged user rings, and exception handling for service accounts and B2B."
coverImage: "/assets/blog/microsoft-365-mfa-rollout-strategy-conditional-access-authentication-strength/diagram.svg"
date: "2026-05-10T09:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/microsoft-365-mfa-rollout-strategy-conditional-access-authentication-strength/diagram.svg"
---

## Why this rollout is harder than it looks

In a small tenant, switching multifactor authentication on for everyone is a Saturday evening. In a real Microsoft 365 tenant — 5,000 to 50,000 users, hybrid identity, mailboxes still on Exchange Online via legacy clients, a sprawl of service accounts, several B2B partners, a handful of long-lived OAuth grants, and a help desk that already has a backlog — switching MFA on for everyone is a months-long programme. Done badly, it produces a Monday-morning queue of locked-out CEOs and a rollback. Done well, it is invisible to most of the business.

The Microsoft Entra control surface for MFA has also been changing. Per-user MFA, Security Defaults, baseline policies, Conditional Access, Authentication Strengths, and (most recently) phishing-resistant MFA enforcement via the [Microsoft mandate for admin MFA](https://learn.microsoft.com/azure/active-directory/fundamentals/secure-with-azure-ad-multi-factor-authentication) all coexist in the same tenant. Knowing which control surface to use for which population, and how to migrate cleanly between them, is most of the work.

> [!NOTE]
> Microsoft is [deprecating per-user MFA](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/) management in favour of Conditional Access. New deployments should not start with per-user MFA. Existing tenants using per-user MFA should plan a migration to Conditional Access + Authentication Strength before the deprecation date applies.

This article is the playbook a Microsoft 365 administrator or identity architect should follow: pick the right control surface, design the rings, plan the strength, manage the exceptions, watch the telemetry, and know which signals trigger a rollback.

## The current state of MFA in Microsoft Entra (2026)

There are five things in the same tenant that all claim to enforce MFA:

1. **Per-user MFA** — the legacy MFA toggle in the Entra admin centre on each user. Being deprecated. Still active in many tenants.
2. **Security Defaults** — a free, tenant-wide policy bundle that enforces MFA for all users, blocks legacy auth, and protects privileged actions. Cannot be granular.
3. **Conditional Access (CA) grant controls** — the modern way. A CA policy can require MFA as a grant control across any scope you can express.
4. **Authentication Strength policies** — added on top of CA, an Authentication Strength specifies *which* methods satisfy MFA (for example, only phishing-resistant methods such as FIDO2, passkeys, or Windows Hello for Business).
5. **Authentication Methods policy** — controls which methods can be registered and used at all.

Microsoft's [Migrate from per-user MFA to Conditional Access](https://learn.microsoft.com/azure/active-directory/authentication/howto-mfa-userstates) page is the definitive migration reference. The short version: never set users to *Enabled* or *Enforced* in per-user MFA going forward; if they are already in that state, you cannot enforce a strength on them via CA until they are returned to *Disabled* and brought under a CA policy.

> [!IMPORTANT]
> Conditional Access cannot enforce a specific Authentication Strength on a user who is in per-user MFA *Enforced* state. The runtime treats the per-user MFA satisfaction as good enough and never invokes the CA grant. This is the single most common reason a "passkey-only" policy quietly accepts a phone-call MFA.

## The design decisions, before any policy is written

Before configuring anything, write down four answers:

**1. Which control surface for the long term?**
For tenants larger than ~50 users, the answer is *Conditional Access + Authentication Strength*. Security Defaults are fine for very small tenants and not granular enough for larger ones. Per-user MFA is end-of-life.

**2. Which Authentication Strength is the target?**
*Multifactor authentication* is the built-in fallback. *Phishing-resistant MFA* is the destination for most regulated environments. Microsoft maintains the [matrix of which method satisfies which strength](https://learn.microsoft.com/azure/active-directory/authentication/concept-authentication-strengths#built-in-authentication-strengths). For most enterprises, the right shape is: Phishing-resistant for admins now; Phishing-resistant for all users on a 12-month roadmap; Multifactor as the immediate-step intermediate.

**3. How will exceptions be expressed?**
Every rollout needs three permanent exceptions: **break-glass accounts** (excluded from every MFA policy and protected by other means), **service principals / managed identities** (which don't perform MFA), and **emergency-access B2B guests** for partner support. Decide before rollout whether the exception is a *group* (membership-managed) or a *named exclusion* (policy-managed). Groups scale; named exclusions create policy sprawl. Use groups.

**4. What is the user-communication plan?**
The dominant cause of a botched MFA rollout is users not knowing the prompt is coming, not knowing what to register, and not knowing how to recover. Communication starts 4 weeks before the first ring, with reminders at 2, 1, and 0 weeks. The help desk should be staffed at 1.5× normal capacity for the first week of each ring.

## The ring strategy

A safe Microsoft 365 MFA rollout uses ring-based deployment, just like a Windows update ring. The shape that works is four rings:

- **Ring 0: Pilot (IT + Security, ~50 users).** Validate the policy end-to-end. Catch the obvious "the policy targets all users including service accounts" bugs here.
- **Ring 1: Power users (~5% of workforce, including the help desk).** Validate the help desk workflow. The help desk has to be able to assist with prompts they themselves see.
- **Ring 2: All employees, regular users.** The bulk of the rollout.
- **Ring 3: B2B guests and partner accounts.** Last, because partner workflows are the least well understood and the most likely to break in unfun ways.

Each ring is implemented as a CA policy with a different *target* group. The same policy template can be cloned per ring with only the *Include* group changing.

> [!TIP]
> Build the rings as dynamic groups based on a user attribute (for example, `extensionAttribute1` set to `mfa-ring-1`). That way the rollout becomes "move users between attribute values" rather than "edit Conditional Access policies in production."

## A minimum-viable policy template

For each ring, the Conditional Access policy looks like:

- **Users**: Include = `Ring N` group. Exclude = `Break-glass` group, `Service accounts` group, `MFA-exempt B2B` group.
- **Target resources**: All cloud apps. (You can scope to Office 365 first if you want to leave non-Office apps untouched.)
- **Conditions**: None initially. Add *Client apps* later if you want to differentiate browser vs mobile.
- **Grant**: Require multifactor authentication, OR `Require authentication strength = Multifactor authentication` for the first wave; switch to `Require authentication strength = Phishing-resistant MFA` for the second wave.
- **Session**: Sign-in frequency = *Every time* for privileged actions; default for everything else.
- **Enable policy**: Report-only first, then On after a week of clean logs.

The [Common Conditional Access policy: Require MFA for all users](https://learn.microsoft.com/azure/active-directory/conditional-access/howto-conditional-access-policy-all-users-mfa) page is the official reference for this shape.

## Phishing-resistant strength: register, then enforce

Phishing-resistant MFA is the destination, but enforcing it before users have a registered method that satisfies it produces lockouts. The right ordering is:

1. **Open registration.** In Authentication Methods policy, enable passkeys (Microsoft Authenticator), FIDO2 security keys, and Windows Hello for Business, in addition to the methods already enabled.
2. **Drive registration via Security Info self-service.** Send users to `https://aka.ms/mysecurityinfo` with instructions to register at least one phishing-resistant method. Track adoption via the [Authentication Methods registration report](https://learn.microsoft.com/azure/active-directory/authentication/howto-authentication-methods-activity).
3. **Add a phishing-resistant Conditional Access policy in report-only.** Watch the report-only verdicts for two weeks. Anyone who would have failed has not yet registered.
4. **Communicate the cutover date.** Set a date for moving the policy from report-only to enforced. Reinforce in three reminders.
5. **Move to enforced.** On the cutover date, flip the policy. Help desk on standby.

> [!WARNING]
> Do not move a phishing-resistant policy from report-only to enforced for *all users* in one step. Move ring by ring. The blast radius matters more than the calendar.

## Privileged role enforcement is a separate policy

Admin accounts get their own Conditional Access policy with their own strength, independent of the user rings. The policy:

- Targets the [Microsoft Entra built-in roles list](https://learn.microsoft.com/azure/active-directory/roles/permissions-reference) — Global Administrator, Privileged Role Administrator, Security Administrator, Conditional Access Administrator, Exchange Administrator, SharePoint Administrator, etc.
- Requires `Phishing-resistant MFA` strength.
- Requires sign-in frequency of *Every time* for privileged actions.
- Requires a compliant device (where supported).
- Excludes the break-glass accounts only.

This policy is independent of the user-ring policies because admin accounts must be protected to the highest standard from day one, not at the end of the rollout.

## Service-account and B2B exceptions, done right

Service accounts (the user-object kind) should not be performing interactive MFA. The right pattern is:

- Move every service account to a *Service accounts* group.
- Exclude the group from MFA policies.
- Replace the service account with a [workload identity / managed identity / service principal with certificate auth or federated credential](https://learn.microsoft.com/azure/active-directory/workload-identities/workload-identities-overview) on the next refactor of whatever script or app uses it.
- Apply a separate Conditional Access policy for [workload identity sign-ins](https://learn.microsoft.com/azure/active-directory/conditional-access/workload-identity) that restricts sign-in to a known IP range and blocks risk-classified workload sign-ins.

> [!IMPORTANT]
> A service account "excluded from MFA" with no other compensating control is a credential-theft target. Excluding from MFA must always be paired with named-location restriction, IP allowlisting, or workload-identity migration.

B2B guests get their own policy that requires MFA when the guest accesses your resources, performed by the *guest's home tenant* or by your tenant via the [cross-tenant access settings](https://learn.microsoft.com/azure/active-directory/external-identities/cross-tenant-access-overview). Decide whether you trust the partner's MFA (configurable per partner under cross-tenant access settings); if not, require MFA on your side.

## Telemetry to watch during a ring

Every ring should run for at least 7 days before moving to the next. During those 7 days, the on-call identity engineer watches:

```kql
// Daily count of failures attributable to the new MFA policy
SigninLogs
| where TimeGenerated > ago(7d)
| mv-expand policy = ConditionalAccessPolicies
| where tostring(policy.displayName) == "MFA - Ring 2 - All employees"
| summarize Failures = countif(tostring(policy.result) == "failure"),
            Successes = countif(tostring(policy.result) == "success")
            by bin(TimeGenerated, 1d)
| order by TimeGenerated asc
```

```kql
// Users blocked due to the policy who have not registered a satisfying method
SigninLogs
| where TimeGenerated > ago(7d)
| mv-expand policy = ConditionalAccessPolicies
| where tostring(policy.displayName) == "MFA - Phishing resistant - Admins"
| where tostring(policy.result) == "failure"
| summarize Failures = count() by UserPrincipalName
| join kind=leftouter (
    AuditLogs
    | where TimeGenerated > ago(60d)
    | where OperationName has "Register security info"
    | extend RegisteredUpn = tostring(TargetResources[0].userPrincipalName)
    | summarize Registrations = count() by RegisteredUpn
) on $left.UserPrincipalName == $right.RegisteredUpn
| project UserPrincipalName, Failures, Registrations
| where isnull(Registrations) or Registrations == 0
```

The first query measures whether enforcement is working. The second tells you who is about to be locked out because they have never registered.

## Rollback criteria, written before the change window

A ring should be rolled back if any of the following is true at the end of the first 24 hours:

- More than 2% of in-ring users have raised a help-desk ticket attributable to the policy.
- A single high-priority application (decided in advance — usually Outlook on mobile, Teams, or the corporate VPN) is producing widespread auth failures.
- Sign-in failures correlated with the policy display name exceed the agreed threshold (typical: 5% of in-ring sign-in volume).

Rollback is the policy toggle from On back to Report-only, not the deletion of the policy. Always be able to revert in one click.

## Common questions

### Should I keep Security Defaults on while rolling out CA?

No. Security Defaults and Conditional Access are mutually exclusive — turning Security Defaults off is a prerequisite to enabling Conditional Access policies that target MFA. Microsoft's [Security defaults](https://learn.microsoft.com/azure/active-directory/fundamentals/security-defaults) page documents the toggle.

### Can a user satisfy "Phishing-resistant MFA" with the Microsoft Authenticator app push?

No. Push notifications, SMS, voice call, and OATH tokens do not satisfy the Phishing-resistant MFA built-in strength. Passkeys (in Microsoft Authenticator), FIDO2 security keys, Windows Hello for Business, and certificate-based authentication do.

### What is the minimum strength I should require for the help desk?

Phishing-resistant MFA. The help desk is the highest-leverage social-engineering target in any organisation: a phone-call MFA on a help desk account is a known attack pattern. Make the help desk the first ring on phishing-resistant.

### How do I handle a user who genuinely cannot use any phishing-resistant method (an accessibility case, for example)?

Document the exception, move the user into a named exception group, exclude the group from the phishing-resistant policy, and apply a compensating control (a tighter Conditional Access policy that restricts the user to a managed device on a corporate network, plus enhanced sign-in monitoring). Exceptions are fine; *unmonitored* exceptions are not.

### When can I disable legacy authentication?

Before you complete Ring 1. [Block legacy authentication with Conditional Access](https://learn.microsoft.com/azure/active-directory/conditional-access/block-legacy-authentication) is a foundational policy. It should be on in report-only from week 1 and enforced before MFA is enforced. Legacy clients bypass modern auth and therefore bypass MFA — leaving them enabled defeats the whole programme.

## What to take away

A Microsoft 365 MFA rollout is a deployment programme, not a configuration change. The control surface (CA + Authentication Strengths), the staged rings, the explicit exceptions for service accounts and B2B, the telemetry, the rollback criteria, and the user communication plan are all parts of the same delivery. Skip any one of them and you ship lockouts to production. Treat each piece as code-reviewable, version it, and rehearse the rollback before the rollout — the goal is for nobody outside the identity team to notice anything happened.

## References

- [Microsoft Entra Authentication Strengths — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/authentication/concept-authentication-strengths)
- [Migrate from per-user MFA to Conditional Access — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/authentication/howto-mfa-userstates)
- [Common CA policy: Require MFA for all users — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/howto-conditional-access-policy-all-users-mfa)
- [Block legacy authentication — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/block-legacy-authentication)
- [Cross-tenant access settings — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/external-identities/cross-tenant-access-overview)
- [Workload identity Conditional Access — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/workload-identity)
- [Authentication Methods activity — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/authentication/howto-authentication-methods-activity)
