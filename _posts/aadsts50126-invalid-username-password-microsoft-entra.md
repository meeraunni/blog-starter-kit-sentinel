---
title: "AADSTS50126 Invalid Username or Password: Entra Fix"
excerpt: "Fix AADSTS50126 invalid username or password errors by tracing the exact sign-in, cached credentials, hybrid authentication path, and attack patterns."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-20T17:10:27-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The ticket says the password is correct. The user has typed it slowly, reset it once, and proved it works somewhere else, yet the Microsoft Entra sign-in log still says **AADSTS50126 invalid username or password**. That is the point where a simple bad-password message stops being a diagnosis.

The short answer is to find the exact failed request, decide which system validated its credential, and compare the failure with a controlled fresh sign-in. A single 50126 usually is a typing mistake. Repeated attempts from one app can be a cached old password; one hybrid user can expose password-hash or sign-in-identifier drift; many users from one source can be a password spray. Resetting passwords before you classify that pattern can destroy evidence without touching the cause.

Microsoft defines AADSTS50126 as `InvalidUserNameOrPassword`: credential validation failed because the username or password was invalid, and some of these events are expected when users make mistakes. The code does **not** identify which field was wrong, prove that a human typed it, or tell you that Conditional Access rejected the request. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

## AADSTS50126 invalid username or password: the fast path

Work through this sequence before changing anything:

1. Capture the UTC timestamp, request ID, correlation ID, user, sign-in identifier, application, resource, IP address, client, and sign-in type from the reported attempt.
2. Open **Entra ID > Monitoring & health > Sign-in logs**, select the matching failure, and verify error code `50126`. Do not diagnose a nearby event merely because it has the same display name.
3. Launch **Sign-in diagnostic**. Microsoft says the invalid-credential scenario can show the app, attempt count, device, operating system, and IP address, which helps distinguish a user mistake from an app replaying a stored password.
4. Compare a fresh interactive sign-in with the reported path. Change one variable at a time: client, network, device, and sign-in identifier.
5. Establish the authentication method for the affected domain: cloud-only, password hash synchronization (PHS), pass-through authentication (PTA), or federation.
6. If the failures are automated or span users, preserve the pattern and start a security investigation. Do not keep asking users to retry.
7. Fix the smallest proven boundary, then verify a successful fresh authentication and watch for the old failure source to stop.

This is an evidence-led troubleshooting sequence assembled from Microsoft documentation. It is not a claim that I reproduced every topology in a tenant for this article.

## What error 50126 proves, and what it does not

AADSTS50126 is a **credential-validation result**. It is different from the neighboring states that support teams often collapse into “the password is bad.”

- **`AADSTS50126`:** username or password validation failed. Start with the exact sign-in, credential source, and attempt pattern.
- **`AADSTS50034`:** the user account could not be found. Check the tenant, sign-in identifier, and directory object.
- **`AADSTS50053`:** the sign-in is locked or blocked by malicious-activity protection. Check smart lockout, risk, source, and timing.
- **`AADSTS50055`:** the password is expired. Check password policy and the supported reset path.
- **`AADSTS50144`:** the on-premises AD password is expired. Check AD DS password state and the hybrid authentication path.
- **`AADSTS53003`:** Conditional Access blocked token issuance. Check the Conditional Access tab and failed policy.

Microsoft's current reference assigns those outcomes different codes. Read the failure reason and additional details on the individual event rather than inferring an account state from the user's prompt. ([error-code reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [troubleshoot sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

The site's [AADSTS50034 user-not-found guide](/posts/aadsts50034-user-account-not-found-microsoft-entra) covers the lookup boundary. If the failed event is actually a Conditional Access denial, move to the [AADSTS53003 Conditional Access guide](/posts/aadsts53003-access-blocked-by-conditional-access) instead of continuing to reset credentials.

## Start with the request that actually failed

Ask for the complete error page or client error and record:

- UTC timestamp, request ID, correlation ID, and trace ID when present;
- username as entered, user object ID, home tenant, and resource tenant;
- application name and Application (client) ID;
- resource name and resource service-principal ID;
- interactive or non-interactive sign-in category;
- authentication protocol and client application;
- IP address, device, browser or operating system, and user agent where available;
- last successful time, first failed time, and any password, UPN, domain, sync, application, or federation change.

Microsoft recommends gathering the correlation ID, error code, failure reason, username, user ID, and sign-in identifier from the event. Reports Reader is the least-privileged role documented for accessing these activity logs; a user can inspect their own events at `mysignins.microsoft.com`. ([Microsoft's sign-in error workflow](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

Do not copy a password, access token, refresh token, session cookie, authorization code, or full credential payload into the incident record. Identifiers and timestamps are enough for the first pass.

Then search a narrow window around the failure. One visible prompt can produce several records for different applications or resources, and the event the user remembers may not be the one that returned 50126. Confirm the **who, how, and what** fields Microsoft uses to organize sign-in activity: identity, client, and target resource. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

The broader [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is useful here even when Conditional Access is not the cause, because it explains how to correlate the runtime record without starting from a policy guess.

## Let the failure shape tell you where to look

The same code means different operational work depending on its distribution.

**One mistyped attempt, followed by success.** Close it as user error after confirming the successful event belongs to the same user and intended app. No account reset is required.

**One user, one app, repeated at a regular interval.** Suspect a stored password in a mobile mail profile, scheduled task, service, drive mapping, VPN client, script, or another non-interactive client. Microsoft's Sign-in diagnostic specifically calls out applications that cache an old password and keep resubmitting it. Find and update or retire that credential source; changing the password again only gives the app another stale value. ([Sign-in diagnostic](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics))

**One user, every client, immediately after a password or identity change.** Determine where that user's password is validated. A cloud account, PHS user, PTA user, and federated user do not share one credential control plane.

**Many users, one application or release.** Inspect the client configuration and deployment. A bad username transformation, old domain suffix, unintended resource-owner-password flow, or imported credential cache can produce a tenant-wide wave without any user changing a password.

**Many users from one IP, autonomous system, user agent, or regular sequence.** Treat this as a possible password spray, not a help-desk queue. Microsoft classifies an isolated run of 50126 as medium concern but raises the priority when many accounts, a VIP, or a pattern is involved. ([Microsoft Entra security operations for user accounts](https://learn.microsoft.com/en-us/entra/architecture/security-operations-user-accounts))

## Prove the sign-in identifier before resetting a password

Compare the identifier in the failed event with the user's current object and the identifier the application actually submits. Display name, mail address, `userPrincipalName`, proxy address, on-premises UPN, and alternate login ID can look equivalent to a person while routing differently through the authentication stack.

Run a fresh test from a private browser session to a Microsoft-controlled entry point such as My Apps. Type the intended sign-in identifier rather than selecting a remembered account tile. If that succeeds but the original application fails, the account and credential can authenticate; the investigation belongs in the original client's identifier or stored state.

Do not conclude that “it works on the domain controller” proves cloud authentication should work. A local Windows logon validates against AD DS. A PHS sign-in is validated by Microsoft Entra against its synchronized password verifier. PTA sends the validation through an Authentication Agent to AD DS, while federation hands authentication to the configured identity provider. Microsoft documents these as distinct user sign-in methods. ([Microsoft Entra Connect user sign-in options](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/plan-connect-user-signin))

## If password hash synchronization validates the password

With PHS, Entra validates the cloud request against a derived password hash synchronized from AD DS. Microsoft says the synchronization channel normally requests pending password hashes every two minutes, although availability can vary with configuration and health. A newly changed on-premises password can therefore fail in the cloud until its new verifier arrives. ([how password hash synchronization works](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-password-hash-synchronization))

Separate a one-user problem from a channel-wide problem:

- If many synced users fail after changing passwords, check whether PHS is enabled, whether the active Connect server is in staging mode, connector reachability and permissions, and password-sync heartbeat or error events.
- If only one user fails, trace that object through the connector and inspect the password-sync diagnostics for its distinguished name.
- If **User must change password at next logon** is set, Microsoft notes that temporary passwords are not synchronized. The user must complete the supported on-premises password change.
- Do not trigger repeated full password synchronizations as a guess. Preserve the original events, run the documented diagnostic, and use a forced full sync only when the diagnosed condition calls for it.

Microsoft's current troubleshooting procedure exposes `Invoke-ADSyncDiagnostics -PasswordSync` for channel-wide checks and an object-specific form with the AD connector name and distinguished name. It also documents heartbeat event `654` and problem events `0`, `611`, `652`, and `655`. Use the current page for exact prerequisites and syntax rather than pasting an old script from a ticket. ([PHS troubleshooting](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/tshoot-connect-password-hash-synchronization))

## If pass-through authentication validates the password

With PTA, an Authentication Agent validates the submitted username and password against AD DS. First confirm the feature is enabled and the agents are **Active**. An unavailable or timed-out agent normally produces the `800xx` family of PTA errors, not a generic instruction to keep resetting the password.

Microsoft documents a particularly useful 50126-adjacent case: users can receive an invalid username/password result when their on-premises UPN differs from the cloud UPN. Its supported Pass-through Authentication logon troubleshooter, run on an agent server with the same sign-in credentials, helps determine whether the agent path works and whether identifier routing is the problem. Microsoft also warns that a non-domain-joined Connect server can cause the invalid username/password issue. Use the current documentation for the cmdlet name and module path. ([PTA troubleshooting](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/tshoot-connect-pass-through-authentication))

Read the agent evidence before touching the topology:

- **Application and Services Logs > Microsoft > AzureAdConnect > AuthenticationAgent > Admin** for agent errors;
- the temporary **Session** log for a bounded investigation, disabled again afterward;
- `%ProgramData%\Microsoft\Azure AD Connect Authentication Agent\Trace\` for detailed request failures;
- Security logs, when auditing is enabled, to correlate the agent-side validation.

Do not uninstall PTA or disable the tenant feature during first response. Microsoft explicitly warns to retain a cloud-only Hybrid Identity Administrator fallback, and PHS failover does not occur automatically. ([PTA troubleshooting](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/tshoot-connect-pass-through-authentication), [hybrid authentication decision guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/choose-ad-authn))

## If the domain is federated

For a federated domain, Entra hands the primary authentication to AD FS or another trusted identity provider. Compare the Entra record with the federation service's event and proxy logs using timestamp, user, client, and request context. Test internally and externally because Web Application Proxy, extranet lockout, claims rules, and endpoint reachability can create different paths.

Do not convert the domain to managed authentication to diagnose one user. Establish whether the identity provider rejected the credential, whether it received the identifier you expected, and whether the failure affects one relying party or every federated sign-in. Microsoft maintains a separate federated-user workflow for tracing AD FS and Microsoft 365 authentication issues. ([Troubleshoot AD FS issues](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/troubleshoot-ad-fs-issues))

The site's [Primary Refresh Token failure guide](/posts/microsoft-entra-primary-refresh-token-prt-failures-windows) covers the later Windows broker and PRT path. Use it when password validation succeeds but the device still cannot obtain or renew its Entra session.

## Treat repeated 50126 events as security evidence

A bad password can be harmless and still be valuable telemetry. Preserve:

- attempts per user, IP address, application, client, and user agent;
- number of distinct users targeted from the same source;
- cadence and ordering of usernames;
- familiar versus unfamiliar device and network context;
- later successes, MFA prompts, risk detections, or session activity;
- whether the source continues after password reset or account containment.

Microsoft recommends baselining 50126 and alerting on patterns. Its AD FS risky-IP workbook counts 50126 bad-password events separately from expired-password failures and exposes unique users attempted, which helps separate a single-user mistake from a spray. ([security operations for user accounts](https://learn.microsoft.com/en-us/entra/architecture/security-operations-user-accounts), [AD FS risky IP workbook](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-health-adfs-risky-ip-workbook))

Smart lockout is related but not interchangeable. In Azure public tenants, Microsoft's documented default is an initial lockout after 10 failed attempts, with a one-minute default duration; repeated lockouts can lengthen. The service tracks the last three bad password hashes so repeated submission of the same wrong password does not simply increment the counter every time. Malicious-activity protection can return `AADSTS50053` regardless of whether the presented password is valid. ([Microsoft Entra smart lockout](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-password-smart-lockout))

Analysis: a spray can remain important even when no account reaches lockout. Distribution across many users and a low request rate are reasons to correlate identity, network, endpoint, and application evidence, not reasons to close the alert.

## Remediate the proven boundary

Use the smallest action that matches the evidence:

- **Human typo:** let the user retry once with the verified sign-in identifier.
- **Cached credential:** update or remove it in the identified client, task, service, or device, then confirm the old source stops.
- **PHS delay or fault:** repair the affected sync object or password-sync channel using the documented diagnostics.
- **PTA identifier or agent issue:** correct the supported login ID or agent dependency while preserving redundant agents and the cloud fallback.
- **Federation rejection:** repair the identity-provider boundary or claims path; do not mask it with an unplanned domain conversion.
- **Password spray or compromise:** follow the incident process, contain affected identities, revoke sessions where warranted, reset credentials through the approved recovery path, and investigate any later success.

Resetting a password is appropriate when it is forgotten, exposed, or part of incident containment. It is not a universal fix for 50126. If an automated client holds the old value, the reset can increase the failures. If the username is wrong, it changes nothing. If PHS is unhealthy, the new verifier can fail to arrive for the same reason as the old one.

## Verify the fix without creating another incident

Run one controlled fresh authentication using the intended identifier, app, tenant, network, and device path. Confirm the sign-in log shows success for that request, then watch the original failure source for at least its normal retry interval.

For a cached credential, success in a browser is only half the test; the periodic 50126 source must stop. For PHS, confirm both the user result and sync-channel health. For PTA, correlate the successful Entra event with the expected agent evidence. For a suspected attack, recovery is not complete until you have reviewed later successful sign-ins, MFA activity, risk, sessions, and resource access.

Keep the incident's timestamps and identifiers through the observation window. If the problem persists, Microsoft support will need the exact error code, correlation or request ID, and timestamp, not a screenshot saying only that the password was rejected.

## Admin checklist

- [ ] Match the report to the exact 50126 sign-in event.
- [ ] Record request, correlation, identity, app, resource, client, IP, and time evidence.
- [ ] Launch Sign-in diagnostic and compare a controlled fresh interactive attempt.
- [ ] Classify the pattern by user, app, source, and cadence.
- [ ] Prove the sign-in identifier and intended tenant.
- [ ] Identify cloud, PHS, PTA, or federated credential validation.
- [ ] Preserve password-spray evidence before resetting anything.
- [ ] Repair only the proven credential, sync, agent, federation, or client boundary.
- [ ] Verify a successful fresh authentication.
- [ ] Confirm the original 50126 source stops and monitor for later successes.

## Things people ask

*Does AADSTS50126 mean the account is locked?* No. Microsoft uses `AADSTS50053` for an account locked or blocked by malicious-activity protection. Review the exact event and Sign-in diagnostic.

*Can Conditional Access cause AADSTS50126?* Conditional Access can shape the overall sign-in, but Microsoft documents 50126 as failed username or password validation. A Conditional Access denial normally appears with its own result, such as AADSTS53003. Follow the event that actually failed.

*Why does the password work in Windows but fail in Microsoft 365?* Local Windows logon and cloud sign-in might validate through different systems. Establish whether the cloud domain uses PHS, PTA, or federation, then inspect that path.

*Should I reset the password immediately?* Not for every isolated event. First decide whether the cause is a typo, cached credential, identifier mismatch, hybrid-authentication fault, or attack. Reset promptly when exposure, compromise, or recovery policy requires it.

*When should I escalate to Microsoft?* Escalate when the exact event, identifier, authentication method, and client pattern are known but the documented tenant and hybrid checks do not explain the result. Include UTC time, request ID, correlation ID, user and tenant identifiers, app and resource IDs, authentication topology, and sanitized supporting logs.

The message is deliberately vague to the person signing in. Your investigation does not have to be. One event tells you the result; the surrounding pattern tells you whether to help a user, repair an authentication path, or open an incident.
