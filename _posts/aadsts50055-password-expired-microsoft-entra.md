---
title: "AADSTS50055 Password Expired: Microsoft Entra Fix Guide"
excerpt: "Fix AADSTS50055 password expired errors by identifying the password authority, choosing the right change or reset path, and validating fresh authentication."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-02T09:31:17-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS50055 password expired** event means the password authority that handled the request rejected the password because its lifetime had ended. The safe fix is to preserve the failed sign-in, identify whether the account is cloud-only, password-hash synchronized, pass-through authenticated, federated, or external, then send the user through the supported password change or reset path for that authority. Do not reset the wrong directory, exempt the user from Conditional Access, or make every password non-expiring just to clear one error.

Grab a coffee before changing policy. Microsoft names AADSTS50055 `InvalidPasswordExpiredPassword` and says the user's password is expired, ending the login or session and offering a password reset or administrator-assisted reset. That is narrower than “the credentials are wrong,” but it does not tell you whether Microsoft Entra ID or on-premises Active Directory evaluated expiration. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

This guide is based on current Microsoft documentation and operational analysis. It does not claim that AADSTS50055 was reproduced in a production tenant for this article.

## AADSTS50055 password expired: the short answer

Work the incident in this order:

1. Capture the complete error, UTC time, trace or request ID, correlation ID, user, application, resource, and tenant.
2. Find the event under **Entra ID > Monitoring & health > Sign-in logs** and confirm error code `50055`, the sign-in type, the home tenant, and the authentication method actually attempted.
3. Prove the account's source of authority: cloud-only, password-hash synchronized, pass-through authenticated, AD FS federated, or external/guest.
4. Determine where password authentication occurred. Cloud-only and most password-hash-synchronized cloud sign-ins are evaluated by Entra; pass-through authentication and AD FS send password validation to on-premises AD DS.
5. Choose **change** when the user knows the current password and **reset** when they do not. Those journeys have different licensing, verification, role, and writeback requirements.
6. For a synchronized user, confirm whether the intended recovery happens on-premises or through licensed, healthy password writeback. Do not assume an Entra admin reset reaches AD DS.
7. Test a fresh interactive sign-in with the new password, then confirm the new sign-in event. An already-open application session is not proof that the password is still expired or fixed.
8. If the error returns, compare the new event's tenant and authentication plane with the one you changed. Repeated 50055 events often mean the wrong authority was updated or an unattended client still uses the old password.

AADSTS50055 proves an expiration decision during password authentication. It does not prove that MFA failed, Conditional Access blocked the user, the account is locked, or the password value was typed incorrectly.

## What AADSTS50055 proves—and what it does not

The important boundary is **password authentication**. Microsoft documents password expiration as a maximum password age: when the age is reached, the user must change the password the next time that authority evaluates it. The applicable policy depends on the user type and where authentication occurs. ([Microsoft Entra password-policy overview](https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-password-policy-overview-frequently-asked-questions#policies-evaluated-during-authentication-password-expiration))

That means one user can have two relevant password-policy planes in a hybrid environment:

- an on-premises AD DS policy evaluated at Windows sign-in, pass-through authentication, or AD FS; and
- a Microsoft Entra domain and user policy evaluated when Entra validates a synchronized password hash in the cloud.

Microsoft says the expiration values are stored separately; the on-premises expiration date is not simply synchronized into Entra. By default, password-hash-synchronized users are marked so their cloud password does not expire. Tenants can change that behavior with the cloud password policy for password-synchronized users, after which the Entra policy can be enforced for cloud authentication. ([password hash synchronization policy considerations](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-password-hash-synchronization#password-policy-considerations))

Do not infer more than the event proves:

- AADSTS50055 does not identify the effective domain policy by itself.
- It does not say whether the user knows the current password.
- It does not prove self-service password reset (SSPR) is enabled or licensed.
- It does not prove that a synchronized change can be written back to AD DS.
- It does not mean all existing sessions ended immediately.

Microsoft's token-revocation table explicitly says password expiration alone leaves password-based and non-password-based cookies and refresh tokens alive. A user can therefore keep using an existing session while a fresh password authentication receives 50055. Treat that as documented session behavior, not proof that the expiration policy failed. ([refresh-token revocation behavior](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens#token-revocation))

## Preserve the failed sign-in before changing the password

Ask for the exact error page or application record, not a paraphrase. Preserve:

- complete AADSTS50055 text;
- UTC timestamp, request or trace ID, and correlation ID;
- sign-in identifier, user object ID, and home tenant ID;
- application, application ID, resource, and resource tenant;
- client application, operating system, browser, and device details;
- interactive or non-interactive sign-in type;
- authentication details and the method attempted;
- last known successful password sign-in; and
- whether the failure affects one user, one application, or every password-based client.

Microsoft documents Reports Reader as the least-privileged role for tenant sign-in logs. Open the failed event and preserve its error code, failure reason, user and sign-in identifiers, application, resource, correlation ID, and request ID. The Authentication Details tab shows the sequence of methods and whether a requirement was satisfied by an earlier claim rather than a new password entry. ([troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors), [sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) helps correlate the event if another error follows the password change. Do not use a later MFA or Conditional Access result to rewrite the cause of the original 50055 event.

## Identify which password authority expired

Use the account and request path to select one of these branches.

### Cloud-only user

For a user created directly in Microsoft Entra ID, the Entra password-expiration policy applies. Microsoft says cloud-only users are prompted to change an expired password during Entra sign-in. The tenant can configure the domain expiration period, and an individual user's `DisablePasswordExpiration` value can make that user's password non-expiring. ([Microsoft Entra password expiration policies](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sspr-policy#password-expiration-policies))

Confirm the user's home tenant. A resource tenant cannot reset the password of a guest whose identity is owned by another organization, a Microsoft account, Google, or another external authority. Microsoft directs password recovery to the home directory in that case. ([reset a user's password](https://learn.microsoft.com/en-us/entra/fundamentals/users-reset-password-azure-portal))

### Password-hash-synchronized user

For password hash synchronization (PHS), Entra can validate the synchronized password hash in the cloud. Microsoft says the cloud password is non-expiring by default for synchronized users because Entra Connect sets `DisablePasswordExpiration`. If the tenant enables the cloud password policy for password-synchronized users, Entra can apply its native expiration policy to those cloud authentications. ([PHS expiration behavior](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-password-hash-synchronization#password-expiration-policy))

The on-premises and cloud timers are still separate. An AD DS password can be expired for domain authentication while the same synchronized value continues to work in Entra, or an Entra cloud-expiration policy can interrupt a cloud sign-in. Record which path generated 50055 before changing either directory.

If the organization expects an expired synchronized user to change the password in the cloud, password writeback must be enabled and healthy. Microsoft's Cloud Sync documentation lists end-user and administrator forced changes caused by expiration as supported writeback operations. ([Cloud Sync password writeback](https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-enable-cloud-sync-sspr-writeback#supported-operations))

### Pass-through authentication or AD FS

With pass-through authentication (PTA) or AD FS, Microsoft says password validation for Microsoft 365 and Azure sign-ins occurs against on-premises AD DS, so the on-premises expiration policy applies. Investigate the user's effective domain or fine-grained password policy, the authentication agent or federation path, and the supported on-premises change journey. ([password expiration for PTA and AD FS](https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-password-policy-overview-frequently-asked-questions#synced-users-who-authenticated-on-premises-pass-through-authentication-or-ad-fs))

Do not attempt to fix that authority mismatch by setting a cloud-only password flag. The recovery must update the authoritative AD DS credential and then prove the new value on the actual authentication path.

### Guest or external user

Microsoft says the guest's home organization manages password expiration. The resource tenant that invited the guest does not. Preserve both tenant IDs and direct the user or their home-tenant administrator to the correct recovery process. ([password expiration for guest users](https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-password-policy-overview-frequently-asked-questions#guest-users))

If the event occurred in your resource tenant but the password authority is external, do not delete and reinvite the guest. A new invitation does not change the home credential and can damage assignments, access reviews, sponsorship, and audit continuity.

## Choose change, reset, or administrator recovery

The next question is simple: **does the user know the current password?**

### The user knows the password

Use a supported password **change** journey for the proven authority. Microsoft lists cloud-only voluntary password change in Entra ID Free. For synchronized users who need the change written back on-premises, the user must have Microsoft 365 Business Premium or Entra ID P1/P2 entitlement for writeback. ([SSPR licensing requirements](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sspr-licensing))

For a cloud-expired password, the interactive Entra sign-in can offer a change. For an AD DS-expired password, use the organization's supported domain password-change flow or a cloud change backed by correctly configured writeback. If the user reaches the change page but the new password is rejected, move to the site's broader [Microsoft Entra password-change failure guide](/posts/microsoft-entra-password-change-failed) to trace policy, session, writeback, agent, and protected-account evidence.

### The user does not know the password

This is a **reset**, not a voluntary change. Confirm that SSPR is enabled for the user, the user has the required license, and the required verification methods can be completed. Microsoft lists cloud-only password reset for Microsoft 365 Business Standard or higher and Entra ID P1/P2; hybrid reset with on-premises writeback requires Microsoft 365 Business Premium or Entra ID P1/P2. ([SSPR licensing matrix](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sspr-licensing#compare-editions-and-features))

If the user cannot complete self-service recovery, use the approved service-desk or administrator path. Verify identity through the organization's recovery process before resetting anything. Do not accept the ability to quote an error code as identity proof.

### An administrator must reset the password

Microsoft documents Password Administrator as the minimum role for the basic reset workflow, subject to limits on which target roles that administrator can reset. More privileged targets require an appropriately privileged role, and administrative-unit scope can add restrictions. ([administrator password reset](https://learn.microsoft.com/en-us/entra/fundamentals/users-reset-password-azure-portal), [who can reset passwords](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/privileged-roles-permissions#who-can-reset-passwords))

For a user sourced from Windows Server Active Directory, Microsoft says an Entra reset requires password writeback and a managed domain; federated-domain password changes are not supported by that portal reset path. Use the authoritative on-premises recovery procedure when those conditions are not met.

After an administrator reset, hand off the temporary credential through an approved channel and require the supported next-sign-in change. Never place the password in the incident record, chat transcript, sign-in-log export, or automation output.

## Inspect policy without making a second incident

Use read-only evidence before changing tenant policy. For cloud and PHS scenarios, review:

- `OnPremisesSyncEnabled` and the user's source of authority;
- `PasswordPolicies`, including `DisablePasswordExpiration`;
- `LastPasswordChangeDateTime` as supporting chronology, not a guaranteed expiration timestamp;
- the verified domain's `PasswordValidityPeriodInDays` and `PasswordNotificationWindowInDays`;
- the cloud password policy for password-synchronized users; and
- the forced-password-change-on-logon setting when AD DS marks synchronized users to change at next logon.

Microsoft names those synchronization feature flags:

```text
CloudPasswordPolicyForPasswordSyncedUsersEnabled
UserForcePasswordChangeOnLogonEnabled
```

Microsoft publishes Graph PowerShell examples for inspecting the individual user policy and managing the synchronized-user cloud policy. Treat any update as a separately reviewed tenant change; a single AADSTS50055 incident is not approval to change expiration for an entire domain. ([inspect password expiration policy](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sspr-policy#check-the-expiration-policy-for-a-password), [PHS cloud-password policy](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-password-hash-synchronization#cloudpasswordpolicyforpasswordsyncedusersenabled))

Microsoft's current security recommendation discourages periodic password expiration for cloud-only accounts and recommends stronger controls such as MFA, banned-password protection, and changing passwords when compromise is suspected. That is a policy-design input, not an incident shortcut. Review the organization's regulatory, application, hybrid, and resource-account constraints before changing the policy. ([Microsoft 365 password policy recommendations](https://learn.microsoft.com/en-us/microsoft-365/admin/misc/password-policy-recommendations))

> [!NOTE]
> **Analysis:** the safest incident response restores the user through the currently approved policy. A separate change record can then decide whether periodic expiration remains appropriate. Combining those decisions under outage pressure makes it harder to distinguish recovery from policy redesign.

## Troubleshoot the first broken recovery boundary

### The password was changed, but AADSTS50055 returns

Compare the new event with the original:

- same home tenant and user object ID;
- same application and authentication path;
- same interactive or non-interactive category;
- same password authority;
- fresh timestamp and correlation ID; and
- no unattended client replaying the old credential.

If an on-premises password was changed but Entra PHS still receives the old hash, inspect synchronization health and the user's source anchor. If a cloud password was changed but PTA or AD FS performs the next authentication, verify the AD DS credential instead. Do not wait for ordinary synchronization when the intended operation was password writeback; Microsoft documents writeback as a real-time path. ([Microsoft Entra SSPR FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/passwords-faq#password-writeback))

### The user is told the password is wrong instead

Preserve the new code. AADSTS50126 is invalid username or password, while AADSTS50055 is an explicit expiration result. The site's [AADSTS50126 invalid-credential runbook](/posts/aadsts50126-invalid-username-password-microsoft-entra) covers UPN, tenant, stale-client, PTA, federation, and password-hash evidence. Do not keep troubleshooting 50055 after the control plane reports a different boundary.

### The user changed the password but an old session still works

Check whether the client is using an existing cookie or token. Microsoft says expiration by itself does not revoke refresh tokens, and different password-change or administrator-reset actions have different revocation effects. If the account is at risk, follow the approved session-revocation and incident-response procedure in addition to changing the password. A password change is not a universal sign-out control. ([refresh-token revocation table](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens#token-revocation))

### Only a room, kiosk, scanner, or service workload fails

Look for an unattended password-based sign-in after the credential expired. Record the owner, application, secret-storage path, last successful event, and every dependent client before rotating. Do not simply set the account to never expire without a supported credential and lifecycle design.

For Teams Rooms specifically, Microsoft documents AADSTS50055 as an expired resource-account password and recommends the supported resource-account configuration. The site's [Teams Rooms passwordless resource-account guide](/posts/microsoft-teams-rooms-passwordless-resource-accounts) explains the safer operating model for that workload. ([Teams Rooms resource-account sign-in issues](https://learn.microsoft.com/en-us/microsoftteams/devices/pmpsignal-resource-account-sign-in#check-whether-the-resource-accounts-password-has-expired))

### One user fails while peers with the same domain succeed

Compare the target user's source of authority, `PasswordPolicies`, last password-change time, effective AD DS fine-grained policy, SSPR scope, license, writeback path, and administrator-role status. A one-user difference rarely justifies changing a domain-wide expiration period.

### Many users begin failing together

Check for a shared policy anniversary, recently enabled PHS cloud-expiration enforcement, a domain expiration change, a writeback outage, a PTA or federation incident, or an unattended credential cohort created on the same date. Preserve audit evidence for any tenant or domain policy change before rollback.

## Validate recovery and monitor recurrence

Use a new browser session or other approved fresh interactive path. Confirm:

1. the intended home tenant receives the request;
2. the new password is accepted by the authoritative identity system;
3. any required MFA and Conditional Access controls still apply;
4. the sign-in log shows a new successful event for the expected user, application, resource, and client;
5. no new AADSTS50055 event follows for the same interactive journey; and
6. synchronized users can authenticate where both cloud and AD DS validation are operationally required.

Do not use an already-open Outlook, Teams, or browser session as the only test. Existing tokens can survive password expiration, and the application might not perform password authentication during the test.

Monitor for repeated `50055` results by user, application, client, and time. A cluster tied to a single non-interactive application usually points to stored credentials; a cluster tied to a domain or synchronized population points to policy or hybrid recovery readiness. Label that conclusion as analysis until the sign-in and policy evidence agrees.

Escalate to Microsoft when the documented policy state and observed Entra behavior disagree. Include the tenant ID, user object ID, source of authority, authentication method, UTC timestamp, request and correlation IDs, application and resource IDs, sign-in type, sanitized failure details, applicable domain and user password-policy values, sync or federation model, writeback state, and result of a fresh sign-in. Do not include the old password, new password, MFA response, or recovery secret.

## AADSTS50055 administrator checklist

- [ ] Capture the full error, UTC time, request or trace ID, and correlation ID.
- [ ] Confirm error code `50055` in the sign-in log.
- [ ] Record the user object, home tenant, application, resource, client, and sign-in type.
- [ ] Prove cloud-only, PHS, PTA, AD FS, or external source of authority.
- [ ] Identify where password authentication occurred.
- [ ] Separate a known-password change from a forgotten-password reset.
- [ ] Confirm SSPR and writeback licensing for the exact journey.
- [ ] Confirm password writeback before changing a synchronized password in Entra.
- [ ] Inspect user, domain, and synchronization policy read-only before changing anything.
- [ ] Use a role permitted to reset the target account when admin recovery is required.
- [ ] Keep temporary and permanent passwords out of tickets and logs.
- [ ] Validate with a fresh password authentication, not an existing session.
- [ ] Confirm a new successful sign-in event and expected security controls.
- [ ] Investigate unattended clients that continue replaying an old password.
- [ ] Treat domain-wide expiration redesign as a separate reviewed change.
- [ ] Escalate with correlated, sanitized evidence if policy and behavior disagree.

## Frequently asked questions

### Does AADSTS50055 mean the user typed the wrong password?

No. Microsoft defines 50055 as an expired password. A wrong username or password is normally AADSTS50126. Preserve the exact event because a later retry can fail with a different code.

### Can Conditional Access cause AADSTS50055?

AADSTS50055 is a password-expiration result, not a Conditional Access block. Conditional Access can still apply later in the successful sign-in sequence, so validate it after the password boundary is repaired.

### Why can the user still open Microsoft 365 after the password expired?

An existing cookie or refresh token can remain valid. Microsoft's revocation table says expiration alone does not revoke those sessions. Require a fresh password authentication to test recovery, and use the approved revocation process separately when risk requires it.

### Does an expired on-premises password always expire in Microsoft Entra too?

No. Microsoft stores the expiration state separately. PHS users are non-expiring in Entra by default unless the tenant enables cloud password-policy enforcement for synchronized users. PTA and AD FS evaluate the on-premises policy during cloud sign-in.

### Can an administrator in the resource tenant reset a guest password?

No. The guest's home identity provider controls its password. Direct the user to the home tenant or external provider without deleting and recreating the guest object.

### Should I set the user to password never expires?

Not as an incident shortcut. Restore access through the approved policy first. Then review periodic-expiration design separately against Microsoft's current recommendations, regulation, hybrid behavior, workload support, and the account's credential lifecycle.

### Will an Entra admin reset update on-premises Active Directory?

Only when the synchronized account and managed domain are supported and password writeback is enabled and healthy. Otherwise use the authoritative on-premises reset path.

The useful sequence is **exact event, home tenant, source of authority, authentication plane, change or reset, writeback, fresh sign-in, monitoring**. Follow it and AADSTS50055 becomes a bounded password-lifecycle incident instead of a reason to weaken authentication policy across the tenant.
