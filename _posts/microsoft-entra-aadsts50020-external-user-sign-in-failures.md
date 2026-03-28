---
title: "Microsoft Entra ID: Troubleshoot AADSTS50020 External User Sign-In Failures"
excerpt: "Technical troubleshooting for AADSTS50020 in Microsoft Entra ID, including guest invitation state, redemption flow, external identities configuration, and tenant/resource mismatch."
coverImage: "/assets/blog/aadsts50020/cover.svg"
date: "2026-03-28T09:30:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/aadsts50020/cover.svg"
---

## Failure definition

This article covers the Microsoft Entra sign-in failure:

`AADSTS50020: User account from identity provider does not exist in tenant`

The authoritative Microsoft troubleshooting article is [Error AADSTS50020 - User account from identity provider does not exist in tenant](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist).

This error is not a generic authentication failure. It means the user authenticated to an identity provider, but the **resource tenant** could not map that identity to an allowed sign-in path for the application being accessed.

## What is actually failing in the backend

Microsoft’s [AADSTS50020 troubleshooting article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist) states that this error appears when a guest user from an identity provider can’t sign in to a **resource tenant**. The core backend problem is tenant/resource mismatch:

1. The user authenticates with a home identity.
2. The token request targets an application in another tenant.
3. The resource tenant checks whether that identity is represented and permitted there.
4. If the user object, invitation state, redemption state, or external identity path is missing or wrong, token issuance is blocked.

This is why AADSTS50020 should be analyzed as an **external identity object and invitation flow** problem, not only as a username/password problem.

![AADSTS50020 external identity flow](/assets/blog/aadsts50020/cover.svg)

## How the guest sign-in pipeline works

Microsoft explains the B2B redemption sequence in [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience). That article documents the order Entra uses to discover the user’s home identity and complete invitation redemption.

As mentioned [here](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience), the invitation flow checks:

- whether the user already exists in a managed Microsoft Entra tenant
- whether a federated identity provider applies
- whether a personal Microsoft account applies
- whether email one-time passcode is enabled

That matters because AADSTS50020 is often the visible symptom when the resource tenant expected one external-user onboarding path and the user arrived through another.

## Root cause 1: the user was never invited or never completed redemption

The [AADSTS50020 article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist) and the [B2B invitation redemption documentation](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience) both point toward invitation state as a first-class cause.

### Validation steps

1. In the resource tenant, confirm that a guest user object exists.
2. Check whether the user is still in a **PendingAcceptance** state as described in [invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience).
3. If needed, resend the invitation and force the user through the correct redemption link.

### Root-cause explanation

If the guest object does not exist or redemption never completed, the user may authenticate successfully to the home identity provider but still have no valid external identity representation in the resource tenant.

## Root cause 2: the user is signing in to the wrong tenant or the app is multi-tenant in a way the admin misunderstood

The [AADSTS50020 troubleshooting article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist) explicitly covers cases where users attempt to sign in to the wrong tenant or where the resource tenant does not contain the expected user identity.

### Validation steps

1. Confirm which tenant hosts the target application.
2. Confirm whether the application is intended to accept:
   - internal users only
   - invited B2B guests
   - users through self-service sign-up
3. Confirm the user is being directed to the correct tenant and not to a stale login URL or cached tenant context.

### Root-cause explanation

This failure occurs after successful identity-provider authentication but before successful resource-tenant authorization. In protocol terms, the home identity provider has authenticated the principal, but the resource tenant cannot issue access because its own tenant context, guest object model, or app audience does not line up with that identity.

## Root cause 3: the tenant expects B2B collaboration, but the onboarding model is actually CIAM or self-service sign-up

Microsoft separates workforce-tenant B2B collaboration from external-tenant or customer identity flows in the [Microsoft Entra External ID documentation](https://learn.microsoft.com/en-us/entra/external-id/) and in [Add self-service sign-up user flows for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-user-flow).

### Validation steps

1. Confirm whether the tenant is using:
   - B2B collaboration invitations
   - B2B self-service sign-up user flows
   - a customer identity / external-tenant design
2. If the scenario is B2B self-service sign-up, confirm the application is actually associated with the user flow as required [here](https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-user-flow).
3. If the scenario is standard guest collaboration, confirm the user was invited through the B2B invitation process.

### Root-cause explanation

This is an architecture mismatch. The sign-in pattern the app expects does not match the external identity pattern the tenant was configured to use. In practice, the bug is often introduced much earlier than the failed login itself, for example when an application is designed around B2B invitations but the tenant is configured for a self-service or customer-style onboarding path.

## Root cause 4: cross-tenant access or external collaboration settings block the inbound identity

Microsoft documents inbound and outbound control for external users in [Cross-tenant access settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration).

### Validation steps

1. Review **External Identities > Cross-tenant access settings**.
2. Confirm inbound B2B collaboration is not blocked for the organization or users in question.
3. If organization-specific settings exist, compare them to the default settings to confirm which policy actually applied.

### Root-cause explanation

The guest identity may exist in theory, but policy at the resource tenant boundary can still prevent the sign-in from completing.

## Root cause 5: the wrong identity type is being used during redemption

Microsoft documents in [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience) that the same email address can intersect with multiple identity options, such as a Microsoft Entra account and a personal MSA. Microsoft also documents default sign-in behavior for Microsoft Entra accounts in [Use Microsoft Entra work and school accounts for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/default-account).

### Validation steps

1. Ask which identity the user actually selected during redemption.
2. Confirm whether the invitation was intended for:
   - a work/school account
   - a personal Microsoft account
   - email one-time passcode
3. If the wrong identity was used, regenerate the onboarding path and have the user redeem with the intended identity type.

### Root-cause explanation

The guest object and the token request can fail to line up if the user redeems with a different identity than the tenant expected.

## Recommended troubleshooting order

1. Read the Microsoft [AADSTS50020 article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist) and confirm the sign-in matches that scenario.
2. Verify the target resource tenant and app URL are correct.
3. Confirm the guest object exists and is not stuck before redemption completion, using the flow documented in [B2B invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience).
4. Confirm the tenant is using the correct external identity model, as described in [Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/).
5. Review inbound organization settings in [cross-tenant access settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration).
6. Confirm the user redeemed or attempted sign-in with the intended identity type.

## Final takeaway

AADSTS50020 is usually not a raw authentication failure. It is a **resource tenant identity resolution failure**.

In Microsoft Entra terms, the backend question is:

**Did the resource tenant have a valid external-user path for this exact identity, tenant context, and application?**

If the answer is no, Entra blocks token issuance even if the user successfully authenticated elsewhere.

## Microsoft References

- [Error AADSTS50020 - User account from identity provider does not exist in tenant](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist)
- [Microsoft Entra External ID documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [Troubleshoot common issues with Microsoft Entra B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/troubleshoot)
- [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience)
- [Use Microsoft Entra work and school accounts for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/default-account)
- [Add self-service sign-up user flows for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-user-flow)
- [Cross-tenant access settings for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration)

## Supplemental References

- [Reset the redemption status for a guest user in Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/reset-redemption-status)
