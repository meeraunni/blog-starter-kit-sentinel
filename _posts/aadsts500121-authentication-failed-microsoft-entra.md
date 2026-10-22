---
title: "AADSTS500121 Authentication Failed: Microsoft Entra Fix"
excerpt: "Fix AADSTS500121 authentication failures by reading MFA denial evidence, separating timeouts from suspicious prompts, and restoring access safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-22T09:02:40-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The ticket says **AADSTS500121 authentication failed**, but that line leaves out the decision that matters. Did the user miss a legitimate multifactor authentication prompt, enter a bad code, lose access to a registered method, or reject a prompt they never initiated? Those paths end in the same broad error family and demand very different responses.

Microsoft describes error 500121 as a user not completing the MFA prompt. Its troubleshooting guidance pairs the code with the failure reason **Authentication failed during the strong authentication request** and tells administrators to read the sign-in event's additional detail, not stop at the headline. ([Microsoft Entra sign-in-error troubleshooting](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

The practical fix is to correlate the exact attempt, read **Authentication Details**, and branch on the recorded denial reason. A timeout or unreachable phone is a delivery problem. An invalid code is a method problem. A user-declined prompt can be a simple mistake. A prompt reported as suspicious is an incident signal and should trigger containment, not an MFA reset followed by “try again.”

## AADSTS500121 authentication failed: the fast path

Grab the sign-in record before asking the user to clear anything, then work through this sequence:

1. Capture the UTC timestamp, request ID, correlation ID, user, application, resource, tenant, IP address, client, device details, and complete error text.
2. Open **Entra ID > Monitoring & health > Sign-in logs**, filter to the user and time window, and select the matching failed event.
3. Read **Basic info**, **Authentication Details**, **Conditional Access**, and the event's failure reason plus additional details.
4. Classify the result as no response, user decline, suspicious-activity report, wrong or reused code, notification or phone delivery failure, registration failure, method misconfiguration, or service error.
5. If the user says the prompt was not theirs, stop retries. Verify the user through an approved channel, investigate the source, and contain the account according to your incident process.
6. If the prompt was legitimate, repair the narrow failure: retry one interactive attempt, use another policy-allowed method, correct delivery, or rebuild a broken registration only after preserving a recovery path.
7. Retest once and verify a new successful sign-in event. Do not use the user's recollection or an app loading screen as the only proof.

This is a source-derived troubleshooting sequence, not a report of hands-on testing in a production tenant.

## Separate AADSTS500121 from nearby MFA results

AADSTS500121 is not Microsoft's generic way of saying “MFA is enabled.” It means the sign-in reached a strong-authentication request and that request did not complete successfully. That boundary separates it from several codes administrators often merge into one support script.

**AADSTS50076** means the current session needs a fresh MFA interaction. A silent client can receive 50076 and then complete a normal interactive prompt. Use the [AADSTS50076 MFA required guide](/posts/aadsts50076-mfa-required-microsoft-entra) when the problem is creating or handling that interaction.

**AADSTS500121** means the strong-authentication step failed or was not completed. The sign-in event's method result should tell you whether the user declined, timed out, entered an invalid code, could not receive the prompt, or hit another method-specific failure.

**AADSTS53003** means Conditional Access blocked token issuance. The Conditional Access tab is the centre of that investigation; use the [AADSTS53003 Conditional Access guide](/posts/aadsts53003-access-blocked-by-conditional-access) for that boundary.

This distinction matters because weakening the policy does not fix a broken Authenticator registration, while deleting methods does not fix a client that never showed the prompt. Start where the evidence says the flow stopped.

## Understand the strong-authentication control plane

The application asks Microsoft Entra for a token. Entra evaluates the request, existing authentication claims, tenant policy, resource requirements, and relevant risk or session conditions. If a fresh factor is required, the authentication service invokes an allowed method. Only after that method produces acceptable proof can token issuance continue.

The sign-in log preserves several layers of this transaction:

- **Status** records the error code, failure reason, and additional details.
- **Authentication Details** records the sequence of methods, success or failure, and the reason an MFA attempt succeeded or was denied.
- **Conditional Access** identifies policies evaluated for the request and the grant controls they required.
- **Application and resource** identify who requested the token and what the token was for. These are not always the same object.
- **IP, location, client, and device details** describe the request context, but IP geolocation is an estimate rather than proof of a person's physical location.

Microsoft warns that Authentication Details can initially be incomplete while log aggregation finishes. It also says not to infer the whole MFA story from one field because an earlier MFA claim can satisfy a later request without a new prompt. Recheck a fresh event when the rows look internally inconsistent. ([MFA sign-in reporting](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-reporting), [sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

## Preserve the exact AADSTS500121 event

Ask for the error's **More details** content, not a screenshot cropped to the red banner. Record the UTC timestamp, request ID, correlation ID, error code, and failure text. Then confirm the user's object ID, sign-in identifier, home and resource tenants, application, resource, client type, IP address, device state, and last successful attempt.

Microsoft lists **Reports Reader** as the least-privileged role for accessing tenant activity logs. A user can review their own sign-ins at My Sign-ins, but an administrator investigating policy and other users' events needs the appropriate directory role and licensing for the data being viewed. ([Microsoft Entra sign-in-error troubleshooting](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

Match more than the correlation ID. Microsoft Graph documents the correlation ID as a value sent by the client; it is useful, but the user, timestamp, application, resource, and request context should agree too. The [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains how to follow those fields without reading the policy editor as if it were runtime evidence.

Do not put one-time codes, access or refresh tokens, QR codes, Temporary Access Pass values, complete claims challenges, or Authenticator registration secrets in the ticket. Preserve identifiers and outcomes, not credentials.

## Read Authentication Details before changing a method

Open the failed event and select **Authentication Details**. Microsoft documents denial details that include:

- authentication in progress;
- duplicate authentication attempt;
- incorrect code entered too many times;
- invalid authentication or invalid mobile-app verification code;
- misconfiguration;
- phone call sent to voicemail;
- invalid phone-number format;
- service error;
- unable to reach the user's phone;
- unable to send the mobile-app notification;
- user declined the authentication;
- user did not respond, has no registered verification method, never entered the code, or is blocked.

Those values turn one error code into an actionable branch. ([MFA sign-in reporting](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-reporting))

Also read the policy source and method sequence. Authentication Details can identify Conditional Access, per-user MFA, or Security Defaults as the source of the requirement. The Conditional Access tab shows which policy triggered the prompt. If the event says the user has no verification methods, troubleshoot registration. If it names a failed method, troubleshoot that method. If the user completed another method successfully in a later correlated event, do not keep repairing the earlier failure.

### No response or authentication in progress

Confirm that the user initiated the sign-in, still has the prompt open, and is looking at the correct device and account. A stale prompt approved after the browser flow expires will not complete the original transaction. Have the user cancel stale prompts, start one controlled interactive sign-in, and complete only the prompt whose application and number match the active session.

Do not create a loop of repeated pushes. Microsoft Authenticator uses number matching for push MFA, and administrators can expose the requesting application and IP-derived location as additional context. Those signals help the user distinguish the current request from prompt noise. ([Authenticator number matching](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-number-match), [additional context in Authenticator notifications](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-additional-context))

### User declined the authentication

Ask whether the user initiated the matching sign-in. A deliberate decline of their own prompt can be corrected with one retry. An unexpected prompt is different: record the application, time, source network, device context, and adjacent sign-ins, then move to the incident branch below.

“User declined” does not by itself prove compromise. It proves the method was denied. The user's out-of-band confirmation and the surrounding sign-in evidence determine whether this was a mistake or a security event.

### Invalid, reused, or repeatedly incorrect code

First confirm which method the user selected. Microsoft notes that both hardware and software OATH codes are logged as **OATH verification code**, so the label alone may not identify the physical token or app. Check that the user is entering the code for the correct work account and current challenge, not a code displayed for another tenant or account.

Do not delete every method because one code failed. Offer another registered method that is permitted by policy and meets the required authentication strength. If the alternative succeeds, repair or replace only the faulty method after the user is safely signed in.

### Notification, phone, or service delivery failure

For an unreachable phone or unsent notification, confirm the method still belongs to the user, the device has connectivity and notifications enabled, and the method remains allowed by the Authentication methods policy. Try another already registered and permitted factor. A service-error pattern affecting multiple users, methods, or regions belongs in service-health and escalation triage rather than repeated per-user resets.

Compare several affected events before blaming a carrier or Microsoft. The user, method, time, client, and network pattern should support the hypothesis.

### Registration prompted or no usable method

If the user never completed initial registration, direct them through the supported security-info registration flow. Check which methods the Authentication methods policy enables for that user and whether the requirement can be satisfied during bootstrap. The Sign-in diagnostic specifically identifies MFA “proofup” interruptions when first-time registration did not finish. ([Microsoft Entra Sign-in diagnostic](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics), [manage authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage))

When no normal method remains, use your approved recovery design. A Temporary Access Pass can bootstrap supported passwordless methods when it is already part of that design; it is not a casual substitute for investigating an unsolicited prompt.

## Treat an unexpected MFA prompt as an incident signal

Microsoft's security-operations guidance says a 500121 event on a privileged account can indicate that an attacker has the password but cannot pass MFA. That is an indication to investigate, not proof that every 500121 event is hostile. ([security operations for privileged accounts](https://learn.microsoft.com/en-us/entra/architecture/security-operations-privileged-accounts))

If the user denies initiating the request:

1. Verify the user through an approved channel that does not depend on the suspicious session.
2. Preserve the failed event and search for adjacent successes, password failures, unfamiliar applications, new devices, changed methods, consent, and session activity.
3. Review Identity Protection risk detections when licensed and in scope.
4. Follow the tenant's containment process. Depending on the evidence, that can include blocking sign-in, revoking sessions, securing the password, disabling a compromised device, and confirming the user as compromised.
5. Validate that no attacker-controlled authentication method, application consent, device, or active session remains before restoring access.

Microsoft's current **Report suspicious activity** feature integrates with Identity Protection. A reported suspicious prompt creates sign-in, audit, and risk evidence; the user is set to High User Risk except in the documented passwordless-authentication case. P2 tenants can use risk-based Conditional Access for automated remediation, while P1 tenants can investigate and remediate manually. ([configure MFA settings and suspicious-activity reporting](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-mfasettings))

> [!IMPORTANT]
> Older runbooks that direct administrators to the legacy **Block/unblock users** or **Fraud alert** pages are stale. Microsoft says Report suspicious activity replaced those legacy features and that they were removed on March 1, 2025.

Do not dismiss user risk just to restore access. Microsoft notes that dismissing risk does not change the password or otherwise bring the identity into a safe state. If evidence supports compromise, use the documented containment and remediation actions, then verify the new state. ([remediate risk and unblock users](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-remediate-unblock))

## Repair a broken MFA registration carefully

An Authentication Administrator can manage methods for supported users; a Privileged Authentication Administrator is required for users whose roles put them outside the former role's scope. Read the role boundary before touching an administrator's methods.

Prefer the smallest repair:

- remove one lost or broken Authenticator registration only after another safe method exists;
- correct a phone method only after verifying the user and number through approved procedures;
- use another existing factor to let the user repair their own Security info;
- require re-registration only when the method set as a whole is no longer trustworthy or usable.

Microsoft documents that **Require re-register MFA** deactivates hardware OATH tokens and removes phone numbers, Microsoft Authenticator apps, and software OATH tokens from the user. That is a disruptive reset, not a harmless refresh. It can also eliminate the recovery method the user needs for the next sign-in. ([manage user authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-userdevicesettings))

If the incident involved a suspicious prompt, rebuild methods only after the password, sessions, devices, and risk state have been handled. Otherwise you may give a still-active attacker another opportunity to race the recovery.

## Verify the repair with a new sign-in event

Run one controlled interactive sign-in to the intended resource. In the new event, verify:

- the same intended user, tenant, application, and resource;
- the expected policy source and MFA requirement;
- the intended method and a successful method result;
- successful token issuance and resource access;
- no unexpected policy exclusion or weaker factor;
- no adjacent success from an unfamiliar source;
- the user's risk and session state match the chosen remediation.

A successful retry proves the current transaction worked. It does not erase the security meaning of an earlier unsolicited prompt. Close a delivery ticket when the evidence shows a delivery fault; close an incident only when containment and remediation evidence is complete.

## Monitor AADSTS500121 as a pattern

One mistyped code is support work. A burst of 500121 events across privileged users, one application, one network, or one device family deserves a broader view.

Microsoft Graph v1.0 exposes tenant sign-ins through `GET /auditLogs/signIns`; `AuditLog.Read.All` is the least-privileged delegated or application permission documented for the API. Reports Reader is among the supported least-privileged roles for delegated access, while Conditional Access details require an additional supported role and policy-read permission. Microsoft recommends filtering by a bounded time range to avoid request timeouts. ([list sign-ins with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0))

Build detections around the evidence you intend to act on:

- 500121 on a privileged or emergency-access identity;
- repeated declines or nonresponses from one user after a successful primary authentication;
- user-reported suspicious activity or the corresponding High User Risk signal;
- many users failing one MFA method, application, carrier, network, or region;
- a 500121 failure followed by a success from a different IP address, device, or application;
- method changes, password changes, new consents, or session activity near the failure.

Baseline first. Alert thresholds should distinguish an isolated abandoned prompt from a campaign, outage, or broken deployment. Microsoft publishes a dedicated health-monitoring scenario for sign-ins requiring Entra MFA and recommends comparing affected users, failures, network patterns, service health, and recent policy changes. ([MFA sign-in health monitoring](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/scenario-health-sign-ins-mfa))

## Things people ask

*Does AADSTS500121 mean the password was correct?* It shows that the transaction reached a strong-authentication request, but do not infer the complete primary-authentication story from the code alone. Read the event's Authentication Details, failure fields, authentication sequence, and adjacent records.

*Should I simply require the user to re-register MFA?* Only when the method set is broken or untrusted and you have a safe bootstrap path. The action removes multiple method types and can make recovery harder.

*Is a declined prompt always an attack?* No. The user might have pressed the wrong button or rejected a stale prompt. If they did not initiate the matching sign-in, treat it as an incident signal and investigate.

*Can I disable Conditional Access to test?* A policy exclusion changes the security boundary and does not diagnose a bad code, missed notification, or suspicious prompt. Read the runtime evidence and repair the method or delivery path first.

*Why does Authentication Details look incomplete?* Microsoft says the tab can be incomplete or inaccurate until aggregation finishes. Recheck the event, compare adjacent records, and avoid irreversible changes based on one early row.

The useful part of AADSTS500121 is not the phrase “authentication failed.” It is the point in the control plane where the failure happened. Follow the event from requirement to method to denial reason, and you can restore a legitimate user without converting a possible password-compromise signal into a routine reset.

## Microsoft sources

- [Troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors)
- [Review Microsoft Entra MFA events in sign-in logs](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-reporting)
- [Learn about sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Use Microsoft Entra Sign-in diagnostics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics)
- [Configure MFA settings and Report suspicious activity](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-mfasettings)
- [Security operations for privileged accounts](https://learn.microsoft.com/en-us/entra/architecture/security-operations-privileged-accounts)
- [Remediate risks and unblock users](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-remediate-unblock)
- [Manage authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods-manage)
- [Manage user authentication methods](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-userdevicesettings)
- [How Authenticator number matching works](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-number-match)
- [Use additional context in Authenticator notifications](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-additional-context)
- [List sign-ins with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0)
- [Monitor sign-ins requiring Microsoft Entra MFA](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/scenario-health-sign-ins-mfa)
