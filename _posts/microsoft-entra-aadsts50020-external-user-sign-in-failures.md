---
title: "Microsoft Entra ID: Troubleshoot AADSTS50020 External User Sign-In Failures"
excerpt: "Learn how to troubleshoot AADSTS50020 in Microsoft Entra ID, including guest invitation state, redemption flow, tenant context, and external identity configuration."
coverImage: "/assets/blog/aadsts50020/cover.svg"
date: "2026-03-28T09:30:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/aadsts50020/cover.svg"
---

## Overview

This article covers the Microsoft Entra sign-in failure:

`AADSTS50020: User account from identity provider does not exist in tenant`

The authoritative Microsoft troubleshooting guidance is [Error AADSTS50020 - User account from identity provider does not exist in tenant](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist).

This error does not mean the user necessarily failed authentication at the home identity provider. In most real environments, it means the **resource tenant** could not complete identity resolution for the incoming external user.

![AADSTS50020 external identity flow](/assets/blog/aadsts50020/cover.svg)

## How external sign-in works

In a B2B-style sign-in flow, Microsoft Entra separates two identity roles:

- the **home tenant** or external identity provider authenticates the user
- the **resource tenant** decides whether that authenticated user can be represented and accepted for the target application

Microsoft explains the invitation and redemption sequence in [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience). The important implementation detail is that successful home-tenant authentication is not enough by itself. The resource tenant still needs a valid external-user path, such as:

- a guest object created through invitation and redemption
- a supported self-service sign-up path
- an allowed cross-tenant collaboration path

AADSTS50020 appears when that resource-tenant side of the flow is missing, incomplete, or mismatched.

## Common causes

### Invitation was never redeemed

The most common cause is that the guest object either does not exist in the resource tenant or still exists in a pre-redemption state.

Microsoft documents the invitation flow and pending acceptance behavior in [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience).

If the guest object was never fully redeemed, the home identity can still authenticate successfully while the resource tenant has no usable external representation for that user.

### User is signing in to the wrong tenant

Microsoft calls this out directly in the [AADSTS50020 troubleshooting article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist). In practice, this often happens when:

- the user receives an old or incorrect application URL
- the application is hosted in a tenant different from the one the admin expected
- the user arrives through a cached tenant context

This is why tenant context should always be validated before you treat the error as an invitation defect.

### External identity model does not match the application design

Microsoft distinguishes between B2B collaboration, self-service sign-up, and other External ID patterns in [Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/).

In production, AADSTS50020 often appears because the application was designed for one onboarding model but the tenant was configured for another. For example:

- the app expects invited guests, but no invitation path was used
- the tenant expects self-service sign-up, but the application is not correctly associated with that user flow
- the team assumes cross-tenant collaboration is open, but inbound settings say otherwise

### Cross-tenant access settings block the incoming user

Microsoft documents inbound and outbound control in [Cross-tenant access settings for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration).

This means the external-user object can exist conceptually, but the inbound collaboration policy can still prevent the sign-in from completing.

### Wrong identity type was used during redemption

Microsoft explains in [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience) and [Use Microsoft Entra work and school accounts for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/default-account) that the same email address can intersect with different identity choices, such as:

- a work or school account
- a personal Microsoft account
- email one-time passcode

If the guest was intended to redeem with one identity type but used another, the resulting sign-in can fail because the tenant’s expected external identity path and the actual redemption identity do not match.

## How to validate the problem

Use the following investigation order:

1. Confirm which tenant hosts the target application.
2. Confirm that a guest object exists in the resource tenant.
3. Check whether the guest is still in a pending acceptance state.
4. Confirm which external identity model the application is supposed to use.
5. Review inbound collaboration controls in cross-tenant access settings.
6. Confirm which identity type the user actually used during redemption.

Microsoft’s troubleshooting pages that support this validation path are:

- [AADSTS50020 troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist)
- [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience)
- [Troubleshoot common issues with Microsoft Entra B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/troubleshoot)

## What usually fixes it

The right fix depends on which stage is broken:

- if the guest was never redeemed, resend the invitation and complete redemption properly
- if the user is going to the wrong tenant, correct the application entry point
- if the app uses the wrong external identity model, fix the architecture rather than repeatedly retrying sign-in
- if cross-tenant access settings block the user, correct the inbound collaboration policy
- if the wrong identity type was used, reset the redemption path and re-onboard the user with the intended identity

Microsoft documents a supported reset option in [Reset the redemption status for a guest user in Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/reset-redemption-status).

## Key implementation points

- AADSTS50020 is usually a resource-tenant identity resolution problem, not a raw password problem.
- Home-tenant authentication and resource-tenant acceptance are separate stages.
- Invitation state, tenant context, and identity type all matter.
- External-user onboarding design should be validated before debugging credentials.

## References

- [Error AADSTS50020 - User account from identity provider does not exist in tenant](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist)
- [Microsoft Entra External ID documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [Troubleshoot common issues with Microsoft Entra B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/troubleshoot)
- [B2B collaboration invitation redemption](https://learn.microsoft.com/en-us/entra/external-id/redemption-experience)
- [Use Microsoft Entra work and school accounts for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/default-account)
- [Add self-service sign-up user flows for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/self-service-sign-up-user-flow)
- [Cross-tenant access settings for B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration)
- [Reset the redemption status for a guest user in Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/reset-redemption-status)
