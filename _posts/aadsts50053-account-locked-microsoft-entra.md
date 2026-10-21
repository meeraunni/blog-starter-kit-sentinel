---
title: "AADSTS50053 Account Is Locked: Microsoft Entra Fix"
excerpt: "Fix AADSTS50053 account is locked errors by distinguishing smart lockout from malicious-IP blocks, tracing the exact sign-in, and remediating safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-21T09:12:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The user sees **AADSTS50053 account is locked** and the help desk reaches for a password reset. Sometimes that is the right recovery step. Sometimes Microsoft Entra blocked a malicious source even though the password was correct. The same error code can represent two materially different security decisions, so the failure reason—not the browser wording—must drive the response.

The short answer is to open the exact failed sign-in and determine whether Microsoft Entra reports repeated credential attempts or a block caused by malicious activity. For smart lockout, stop the bad attempts and use the supported wait, self-service password reset, or administrator reset path. For a malicious-IP or high-confidence risk block, investigate the source and identity before marking anything safe. Do not weaken lockout thresholds, dismiss risk, or trust an IP merely to clear the ticket.

Microsoft defines `AADSTS50053` (`IdsLocked`) in two ways: the account was locked after repeated sign-in attempts, or the request was blocked because it came from an IP address associated with malicious activity. Microsoft explicitly tells administrators to inspect the **Failure reason** on the individual sign-in event to tell them apart. ([Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

## AADSTS50053 account is locked: the fast path

Use this sequence before changing a password, policy, trusted location, or risk state:

1. Capture the UTC timestamp, request ID, correlation ID, user, tenant, application, IP address, client, and sign-in type from the reported failure.
2. Open **Entra ID > Monitoring & health > Sign-in logs**, select the matching event, and confirm error code `50053`.
3. Read **Failure reason** and **Additional details**. Classify the event as repeated-attempt lockout or malicious-activity protection; do not infer the branch from the error code alone.
4. Check nearby events for the same user, IP, application, client, and time window. Determine whether this is one user's retry loop, one stale client, or a source touching many accounts.
5. Launch **Sign-in diagnostic** from the event when available and review the contextual result.
6. For a normal lockout, stop the retry source and choose the supported recovery path. For a risk block, preserve evidence and investigate before unblocking.
7. Verify recovery with one controlled fresh sign-in, then confirm the original failure source stops.

This runbook is based on current Microsoft documentation and operational analysis. It does not claim that every identity topology was reproduced in a tenant for this article.

## What AADSTS50053 proves—and what it does not

The code proves that Microsoft Entra refused this request at a lockout or built-in protection boundary. It does not by itself prove that the account owner mistyped a password, that the account is compromised, or that a Conditional Access policy caused the block.

Keep the neighboring states separate:

- **`AADSTS50126`:** username or password validation failed. Use the [AADSTS50126 invalid-credential runbook](/posts/aadsts50126-invalid-username-password-microsoft-entra) to trace typos, cached credentials, sign-in identifiers, and hybrid validation.
- **`AADSTS50053`:** repeated attempts caused a lockout, or Microsoft blocked a malicious source.
- **`AADSTS50055`:** the password is expired.
- **`AADSTS50057`:** the user account is disabled.
- **`AADSTS53003`:** Conditional Access blocked token issuance.

These states can appear in the same incident, but they are not interchangeable. A spray may generate invalid-password events before a lockout. An investigator may then disable the user, producing a different error. A later Conditional Access block says nothing about whether the earlier credential was valid. Follow the event timeline rather than reducing the incident to the last code somebody saw.

Microsoft's sign-in troubleshooting workflow recommends preserving the error code, failure reason, username, user ID, sign-in identifier, correlation ID, and request context from the exact event. Reports Reader is the least-privileged role Microsoft lists for activity-log access, while a user can inspect their own sign-ins at `mysignins.microsoft.com`. ([troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

## Match the report to the exact sign-in

One prompt can produce several sign-in records. A desktop client may request tokens for more than one resource; a broker can retry silently; a mobile app can keep using a stored password after the user has moved on. Search a narrow time window and verify the user, application, resource, client, IP address, and correlation identifiers.

Record at least:

- UTC time, request ID, correlation ID, and trace ID when present;
- user principal name, user object ID, home tenant, and resource tenant;
- application display name and application ID;
- resource and resource service-principal ID;
- interactive or non-interactive sign-in category;
- browser, operating system, user agent, device ID, and authentication protocol where available;
- IP address, location, autonomous system information, and named-location result;
- failure reason, additional details, risk level, risk detail, and risk detections available to the investigator;
- first failure, last success, and any password, device, application, or network change.

Do not put passwords, tokens, session cookies, authorization codes, or authentication secrets into the ticket. The identifiers and timestamps are enough to correlate the first pass.

The sign-in activity view is organized around **who**, **how**, and **what**: the identity, the client, and the target resource. Its Basic info tab contains the error and failure reason; the Location and Device tabs add source context. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)) The site's [sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) explains the wider event structure when the ticket involves several policies or resources.

## Branch one: smart lockout after repeated attempts

Microsoft Entra smart lockout is always on. Microsoft documents a default initial threshold of 10 failed attempts in Azure public and Microsoft Azure operated by 21Vianet tenants, and three in Azure US Government tenants. The initial default lockout duration is one minute; subsequent failed attempts can make later lockouts longer. Microsoft deliberately does not publish the exact escalation rate. ([Microsoft Entra smart lockout](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-password-smart-lockout))

Do not use those numbers as a stopwatch. Microsoft says the effective number of attempts can vary slightly in the geo-distributed service, even though lockout state is synchronized across datacenters. Smart lockout also keeps separate counters for familiar and unfamiliar locations.

Another important boundary: Microsoft tracks the last three bad password hashes so repeated submission of the same wrong password does not simply increment the counter every time. That hash-tracking behavior is unavailable with pass-through authentication because the password is validated on-premises. The absence of a one-to-one relationship between visible failures and the configured threshold is therefore expected.

### Find what is still submitting the password

Before unlocking the account, inspect the attempt shape:

- **One user and one device at human speed:** likely a genuine retry, but still verify the source.
- **One user and one client at a fixed interval:** suspect a stale password in a mail profile, mobile app, scheduled task, service, script, VPN client, drive mapping, or older device.
- **One user from several unfamiliar sources:** treat as possible credential stuffing or targeted guessing.
- **Many users from one IP, network, user agent, or application:** treat as possible password spray.
- **Lockout returns immediately after recovery:** the bad source is still active. Repeating the reset is not remediation.

Run Sign-in diagnostic from the exact event. Microsoft says the diagnostic analyzes the event and can surface relevant context and recommendations; it also recognizes patterns such as many failed attempts in the preceding 48 hours. ([Microsoft Entra Sign-in diagnostic](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics))

Analysis: recovery and root-cause removal are separate tasks. A password reset can restore access while an old phone or task keeps retrying. The incident closes only when the user can authenticate and the original source stops generating failures.

### Choose the supported unlock path

For a normal smart-lockout event, Microsoft documents three practical paths:

1. **Wait for the lockout duration to expire**, provided the bad source has stopped and the account is not under attack.
2. **Use self-service password reset.** If the user selects **I forgot my password**, Microsoft says the lockout duration is reset to zero. If the user selects **I know my password**, the lockout timer continues; the user must change the password or wait.
3. **Have an authorized administrator reset the password.** Microsoft states that an administrator can unlock a cloud account affected by smart lockout without waiting for the duration to expire.

The administrator path requires an appropriate password-reset role and respects source-of-authority boundaries. For a synced user, cloud reset depends on password writeback; for a federated domain, Microsoft directs administrators to change the password in on-premises Active Directory; and a resource tenant cannot reset the home credential of an external user. ([reset a user's password](https://learn.microsoft.com/en-us/entra/fundamentals/users-reset-password-azure-portal), [enable self-service password reset](https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-enable-sspr))

Do not lower the tenant's lockout threshold or duration during an incident. Smart lockout customization requires Microsoft Entra ID P1 or higher, and Microsoft recommends aligning hybrid values so Entra blocks attacks before AD DS locks the account. For pass-through authentication, the documented design is an Entra threshold lower than the AD DS threshold and an Entra duration longer than the AD DS duration. Review that architecture through change control after the incident, not while a user is waiting.

## Branch two: malicious-IP or high-confidence risk block

Microsoft also returns `AADSTS50053` when built-in protections block a request associated with malicious activity, regardless of whether the password was valid. The error reference says to inspect the sign-in's Failure reason; Microsoft ID Protection guidance describes the high-confidence form as **Sign-in was blocked by built-in protections due to high confidence of risk**. ([error-code reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [remediate risks and unblock users](https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-remediate-unblock))

That distinction changes the response. A password reset alone does not prove that the source is safe. First establish:

- whether the user recognizes the time, device, network, application, and location;
- whether the IP belongs to an approved corporate egress, VPN, security service, or vendor;
- whether the same IP or client attempted other accounts;
- whether there are successful sign-ins, MFA activity, risk detections, session activity, or resource access near the event;
- whether the request used a legacy or modern authentication protocol;
- whether the user, credential, device, or session shows other evidence of compromise.

Full Identity Protection investigation data requires Microsoft Entra ID P2 or Microsoft Entra Suite; Microsoft documents limited risky-user data at Free and P1 tiers. Absence of a full risk report at a lower license level is not proof that the source was benign. Use the sign-in evidence, available security telemetry, application logs, endpoint data, and network ownership records you do have. ([risky user report](https://learn.microsoft.com/en-us/entra/id-protection/concept-risky-user-report))

### Do not trust an IP to make the error disappear

Microsoft lists a trusted named location as one possible unblocking path when an organization has verified that the address is its legitimate egress. That is not permission to add an unfamiliar source because a user says they are travelling. Confirm the current published address range with the network owner, validate its purpose and change history, look for other tenant activity from the source, and require the normal approval for a Conditional Access trust change.

Likewise, do not dismiss a risk event merely to restore access. Microsoft distinguishes these actions:

- **Confirm safe** or **dismiss risk** records an investigated benign outcome; it does not rotate a credential.
- **Confirm compromised** raises the user risk and should be followed by containment, credential recovery, token revocation, device action, and investigation as appropriate.
- **Reset password** can remediate user risk in supported scenarios, but it is not a substitute for reviewing the sign-in and surrounding activity.
- **Block user** is appropriate when the attacker may be able to reset the password or perform MFA for the identity.

Microsoft's risk-remediation guide documents the required roles and the resulting risk-state changes for each action. Follow the tenant's incident process and record the evidence supporting the choice. The site's [ID Protection risk-policy guide](/posts/microsoft-entra-id-protection-risk-policies) covers the policy layer; do not create a broad exclusion from that policy as a help-desk shortcut.

## Hybrid identity: protect AD DS from cloud attacks

For password hash synchronization and pass-through authentication, Microsoft recommends configuring Entra smart lockout so a cloud attack is stopped before it can trigger the on-premises AD DS account lockout policy. Verify the effective settings on both sides:

- **Microsoft Entra:** **Entra ID > Authentication methods > Password protection**, with at least Authentication Policy Administrator to review or change smart-lockout values.
- **AD DS:** the applicable Group Policy under **Computer Configuration > Policies > Windows Settings > Security Settings > Account Policies > Account Lockout Policy**.

With PHS, Microsoft Entra validates the cloud password verifier and can apply its password-hash tracking. With PTA, the Authentication Agent passes validation to AD DS, so Microsoft notes that hash tracking is not available. With federation, AD FS can use Extranet Lockout and Extranet Smart Lockout; Microsoft recommends moving to managed authentication rather than treating separate lockout systems as identical.

Analysis: if the cloud 50053 disappears but the user's Windows or on-premises account remains locked, you are looking at two control planes. Confirm which one blocked the current request, stop the source, and use each system's supported recovery procedure. Do not repeatedly unlock AD DS while a cloud-facing client keeps sending bad credentials.

## Investigate the pattern, not just the user

Create a short incident timeline and group events by user, IP address, application, client type, user agent, device, and cadence. Look for:

- a sequence of 50126 failures followed by 50053;
- low-and-slow attempts across many users;
- the same application retrying immediately after password changes;
- failures from an unfamiliar source followed by success from the same source;
- successful MFA, new method registration, password reset, token use, or resource access near the lockout;
- repeated failures that continue after the user is recovered.

Do not assume an unsuccessful spray is harmless. A broad pattern is evidence of targeting even if smart lockout prevented access. Conversely, one 50053 from a known egress is not automatically a false positive; prove that the application, user, protocol, and network are expected.

If compromise is confirmed or cannot be ruled out, contain the identity according to severity, recover the credential through the supported source of authority, review authentication methods, revoke sessions, inspect devices and later successful sign-ins, and search for resource activity. The [token revocation and CAE guide](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) explains why disabling a user or revoking sessions does not erase every token on every resource instantly.

## Recover without erasing the evidence

Use the smallest response that matches the proven branch:

- **Genuine user retry:** stop the bad attempts, wait or use the approved SSPR/admin reset path, then retest once.
- **Cached credential:** update or remove the stored secret in the identified client and confirm its retry stream stops.
- **Password spray:** preserve the source pattern, investigate targeted users and any successes, then contain according to the incident plan.
- **Verified corporate egress blocked as risky:** validate ownership and activity before making any named-location or risk decision.
- **Compromised identity:** confirm compromise where appropriate, reset at the authoritative source, revoke sessions, review methods and devices, and investigate resource access.
- **External user:** coordinate with the home tenant; the resource tenant cannot reset an external credential it does not own.
- **Hybrid lockout:** determine whether Entra, AD DS, AD FS, or more than one control plane is locked before taking action.

Preserve the original UTC timestamps, request and correlation IDs, affected user and tenant IDs, application and resource IDs, IP address, failure reason, and available risk evidence. If escalation is required, these details are much more useful than a screenshot containing only the end-user message.

## Verify the fix

Run one controlled fresh sign-in through the intended application, tenant, network, and device. Then verify:

1. the new event succeeds and belongs to the intended user and resource;
2. the old device, application, task, or source no longer generates failures;
3. no suspicious success occurred during the failure window;
4. risk and user state match the investigated outcome;
5. any password or session action propagated through the relevant cloud, hybrid, and application boundaries;
6. monitoring remains in place through at least the original retry interval.

A successful browser sign-in is not enough when the lockout came from a scheduled task. A password reset is not enough when Microsoft blocked a malicious IP. Verification has to close the same path that produced the 50053.

## Admin checklist

- [ ] Match the report to the exact sign-in event and confirm error code 50053.
- [ ] Capture time, request, correlation, user, tenant, app, resource, client, device, and IP evidence.
- [ ] Read Failure reason and Additional details before choosing a recovery branch.
- [ ] Compare nearby failures and successes by user, source, application, and cadence.
- [ ] Launch Sign-in diagnostic when available.
- [ ] Stop any cached client, task, service, or device that is still retrying.
- [ ] Use the supported wait, SSPR, or administrator reset path for smart lockout.
- [ ] Investigate malicious-IP or high-confidence risk blocks before marking them safe.
- [ ] Check both Entra and AD DS or federation lockout state in hybrid environments.
- [ ] Contain compromise, review methods and sessions, and search for later success.
- [ ] Verify a controlled sign-in and confirm the original failure source stops.

## Things people ask

*Does AADSTS50053 always mean the password was entered incorrectly?* No. Microsoft also returns 50053 when built-in protections block a sign-in associated with malicious activity, regardless of password validity. Read the event's Failure reason.

*How long does Microsoft Entra smart lockout last?* The documented initial default is one minute, and later lockouts can become longer. Microsoft does not publish the exact escalation rate. Tenant customization and the event pattern matter, so do not promise a fixed unlock time from the first default.

*Does resetting the password unlock the account?* Microsoft says an authorized administrator can unlock a cloud account affected by smart lockout by resetting the password. For SSPR, choosing **I forgot my password** resets the lockout duration to zero; **I know my password** does not. Hybrid, federated, and external identities have source-of-authority limits.

*Should I add the user's IP as a trusted location?* Only after verifying that the IP is approved organizational egress and the surrounding activity is legitimate. A trusted location is a security-policy decision, not a generic workaround for 50053.

*Can Conditional Access cause AADSTS50053?* A risk policy can participate in a broader block, but Microsoft documents 50053 specifically for lockout and malicious-activity protection. Inspect the sign-in's Failure reason, risk data, and Conditional Access result rather than guessing from the prompt.

*When should I escalate to Microsoft?* Escalate when the exact event and failure branch are known but the documented lockout, risk, source-of-authority, and recovery checks do not explain the state. Include UTC time, request and correlation IDs, tenant and user IDs, application and resource IDs, source IP, authentication topology, failure reason, and sanitized supporting evidence.

AADSTS50053 is not a request to click **Reset** faster. It is a fork in the investigation: either stop a lockout-producing credential loop, or treat a built-in security block as evidence until you can prove the source is safe.
