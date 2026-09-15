---
title: "Microsoft Entra Emergency Access Accounts: Admin Guide"
excerpt: "Build Microsoft Entra emergency access accounts that survive outages: use cloud-only identities, phishing-resistant credentials, monitoring, and drills."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-15T09:15:35-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra emergency access accounts are cloud-only Global Administrator identities reserved for the moment normal administration stops working. Build at least two, authenticate them with independent phishing-resistant credentials, exclude them from Conditional Access policies that could block sign-in, alert on every use, and prove the whole path at least every 90 days.

That is the short answer. The part worth a coffee is the dependency design. A break-glass account that relies on the same federation service, phone network, approval chain, compliant-device signal, administrator, physical location, or alerting path as normal operations can fail in the same incident. It might look protected on a spreadsheet and still be useless when the tenant is locked.

Microsoft's current [emergency access account guidance](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access) now brings the operating model together in one place: two or more cloud-only accounts on the tenant's `onmicrosoft.com` domain, passkeys on FIDO2 security keys as the recommended authentication method, permanent active Global Administrator assignments, Conditional Access exclusions, secure storage, monitoring, and a validation drill at least every 90 days. This guide turns those controls into a deployment and incident runbook.

## How Microsoft Entra emergency access accounts work

An emergency account is deliberately different from a normal privileged administrator in four control planes:

1. **Identity:** it is created in Microsoft Entra ID, uses the tenant's `onmicrosoft.com` domain, and is neither synchronized from Active Directory nor redirected to a federated identity provider.
2. **Authentication:** it uses a phishing-resistant credential whose dependencies differ from the everyday administrator path. Microsoft recommends a passkey on a FIDO2 security key; certificate-based authentication is the documented alternative when the organization already operates PKI.
3. **Authorization:** its Global Administrator role is permanently active. It does not wait for Privileged Identity Management activation, approval, or an available approver.
4. **Access policy:** it is excluded from enforced Conditional Access policies that block or restrict sign-in, while every sign-in and administrative action is monitored.

The point is not to bypass security. The point is to preserve one tightly governed recovery route when the controls used for normal administration are themselves unavailable or misconfigured.

Microsoft lists federation outages, unavailable MFA devices or networks, the departure of the last usable Global Administrator, disasters, and a PIM approval deadlock as representative failure cases. The architecture also covers the ordinary self-inflicted incident: a Conditional Access change that blocks every administrator before anyone can reverse it.

> **Analysis:** availability and security pull in opposite directions here. Permanent Global Administrator privilege and broad policy exclusions create enormous consequence if a credential is stolen. Cloud-only identity, phishing-resistant hardware credentials, separated storage, secure workstations, zero routine use, immediate alerts, and drills are the compensating controls that make the exception defensible.

### Emergency access is not daily administration

Normal administrators should remain least-privileged and use just-in-time elevation. The site's [Microsoft Entra PIM operator playbook](/posts/microsoft-entra-pim-roles-operator-playbook) covers that everyday model. Emergency accounts are the narrow exception: Microsoft explicitly says their Global Administrator assignment should be permanent active rather than eligible in PIM.

Do not use these identities for portal checks, scripts, license management, mailbox work, automation, vendor support, or routine policy changes. Every use should be either a planned drill or a declared incident, and both should create the same alert and review evidence.

## Design the failure domains before creating accounts

Start with the incident paths the accounts must survive. For each dependency, write down the normal path, the emergency path, and the owner who can verify it.

### Identity source failure

If normal administrators are synchronized from Active Directory or authenticate through federation, both emergency accounts should be native cloud identities on the initial `onmicrosoft.com` domain. Microsoft warns against sourcing cloud emergency access from another system because that system becomes a new recovery dependency.

Do not use a custom domain that might be removed, become unverified, or route authentication through federation. Do not put the accounts into HR-driven provisioning, Lifecycle Workflows, inactivity cleanup, source-of-authority conversion, or any automation that can disable or delete ordinary workers.

### Authentication-path failure

If everyday administrators use Microsoft Authenticator, SMS, a telecom provider, or a device-bound platform credential, give emergency access a different dependency. Microsoft's recommended choice is a passkey stored on a FIDO2 security key. The private key remains on the physical authenticator, and Microsoft's [security-key registration guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey-with-security-key) identifies these device-bound passkeys as appropriate for elevated users.

Use separate authenticators and separate secure storage locations for the two accounts. A single safe, building, custodian, key model, or network path should not be able to take out both recovery routes.

Certificate-based authentication can satisfy the documented design when the organization already has a mature PKI. Count the certificate authority, revocation service, smart-card middleware, reader, certificate validity, and operators as dependencies. Do not introduce an untested PKI solely to make an emergency account look sophisticated.

### Authorization-path failure

A PIM-eligible Global Administrator still depends on the PIM service, activation policy, authentication context, and possibly an approver. Microsoft's emergency guidance describes the lockout that occurs when all Global Administrator and Privileged Role Administrator assignments are eligible, approval is required, and no approver is active.

Keep the emergency Global Administrator assignment permanent active. That is not permission for routine use; it is removal of a control-plane dependency. Monitor and govern the account more tightly because the role is always present.

### Device and location failure

Microsoft requires authorized operators to use a designated secure workstation or similar privileged client. Its [privileged access device guidance](https://learn.microsoft.com/en-us/security/zero-trust/adopt/implement-privileged-access-devices) explains why: the security of a control-plane session cannot exceed the security of the device running it.

The device path still needs resilience. If every secure workstation depends on the same Intune compliance decision that a broken Conditional Access policy requires, the account may be secure and unusable. Maintain a documented, hardened emergency workstation path and test it from the locations and networks the incident team could actually reach.

## Create the two cloud-only emergency accounts

Use a working privileged session and an approved change record. Microsoft's current [user creation guidance](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-create-delete-users) names User Administrator as the least-privileged role for creating a user and Privileged Role Administrator for assigning an Entra role.

For each account:

1. In the Microsoft Entra admin center, browse to **Entra ID > Users** and select **New user > Create new user**.
2. Create a **Member** identity with a unique user principal name in the tenant's original `onmicrosoft.com` domain.
3. Record its object ID, user principal name, creation time, owners of the emergency process, and change record in the recovery inventory.
4. Assign the **Global Administrator** role as a permanent active assignment.
5. Confirm the account is not synchronized, federated, guest-based, or in scope of an automated lifecycle process.
6. Add it to a dedicated assigned security group used only for emergency-access policy exclusions.

Microsoft recommends two or more accounts for redundancy. Two is the minimum useful design, not a reason to create a large standing pool of permanent Global Administrators. Every additional account adds another credential, role assignment, exclusion, alert target, storage process, and review obligation.

### Do not bind the shared process to one employee

Microsoft's primary model is an account not associated with one individual, with credentials stored where multiple authorized administrators can retrieve them. The guidance also acknowledges individually assigned emergency accounts as an alternative for accountability and remote access.

Whichever model you select, document it. A shared identity needs strong check-out evidence and post-use attribution. An individually assigned model needs enough independent accounts to survive absence, termination, and regional disruption. Do not attach a personal phone number, employee-managed device, personal email address, or an individual's SSPR information to the shared recovery path.

## Register an independent phishing-resistant credential

First enable a passkey profile for only the emergency-access group. Microsoft's current [passkey policy guide](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2) says passkeys are available in every Entra ID edition and documents the current path under **Entra ID > Security > Authentication methods > Policies > Passkey (FIDO2)**. The profile controls device-bound versus synced passkeys, attestation, and authenticator restrictions.

For an emergency account, prefer a device-bound FIDO2 security key over a synced passkey. A credential synchronized through a consumer or platform account adds another identity service, recovery process, device ecosystem, and potential outage to the path.

Build the profile deliberately:

- target the dedicated emergency-access group;
- allow device-bound passkeys;
- decide whether attestation and an AAGUID allowlist match the keys you procured;
- verify self-service setup is enabled long enough for the controlled registration process; and
- avoid changing the allowed authenticator list later without checking the stored emergency keys.

Microsoft warns that removing an AAGUID from key restrictions can stop an already registered passkey from working. Treat a passkey-profile change like a Conditional Access change: evaluate emergency access before enforcement, and run a drill afterward.

Register each account's key through the documented Security info flow while another independent privileged session remains available. Capture the authenticator make and model, AAGUID where available, serial or asset identifier, custodian, storage location, registration date, and replacement procedure. Never record the key's PIN beside the physical key.

> **Analysis:** one key per account creates cleaner attribution and smaller loss impact than registering the same physical key to both identities. If you issue redundant keys for one account, inventory every copy and keep them in separate failure domains.

## Exclude emergency access without creating a silent back door

Microsoft says to exclude emergency accounts from any enforced Conditional Access policy that blocks or restricts sign-in. That includes policies requiring MFA, authentication strength, a compliant device, an approved client, a named location, sign-in risk remediation, or any other control whose dependency might be part of the incident. Report-only policies do not block access and do not require an exclusion.

Use a dedicated assigned group, then review every policy's user and group scope. Microsoft's [Conditional Access deployment guidance](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access) separately recommends emergency-account exclusions to prevent policy lockout. The site's [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) is useful when an exclusion does not behave as expected.

The exclusion group should contain only the emergency accounts. Do not reuse it for service accounts, vendors, legacy clients, or executives. Assign owners, alert on membership and policy changes, and require review for every modification.

### Test the effective policy, not the intended policy

Reading the portal is not enough. Sign in during a declared drill, open the sign-in event, and confirm which policies were applied, not applied, or excluded. Microsoft's [sign-in activity details reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details) explains those Conditional Access results.

If a policy appears as **Not applied**, confirm whether the emergency-group exclusion caused it or the sign-in did not match the policy in the first place. If it appears as **Failure**, the account is not ready. Use the site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) to trace the exact policy and grant control before changing anything.

Do not respond by disabling every Conditional Access policy. Fix the smallest incorrect scope or dependency while a second working administrator session remains open.

## Monitor every sign-in and administrative action

An emergency account should be quiet. A single event is therefore high-signal: it is a drill, a real incident, or unauthorized use.

Microsoft's emergency guidance says to monitor sign-in and audit logs and trigger notifications to other administrators. Its [diagnostic settings guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-configure-diagnostic-settings) supports sending Entra activity logs to Log Analytics, an event hub, or a storage account. Configure the destination before the first drill; Microsoft notes that new diagnostic streams can take time to start producing data.

Use object IDs rather than names in detection logic. Names and user principal names can change; the object ID is the durable identity key for the account you created.

This KQL follows Microsoft's documented `SigninLogs` pattern and keeps the diagnostic fields an incident responder needs:

```kql
SigninLogs
| where UserId == "<emergency-account-object-id-1>"
    or UserId == "<emergency-account-object-id-2>"
| project TimeGenerated, UserPrincipalName, UserId, IPAddress,
    AppDisplayName, ResultType, ResultDescription, CorrelationId
| order by TimeGenerated desc
```

Create an Azure Monitor alert on any result, including a failed sign-in. A failed attempt can be a stolen identifier, broken credential, policy regression, or drill defect. Route the alert to a destination that does not depend only on the tenant being recovered.

Also query administrative actions initiated by either object ID:

```kql
AuditLogs
| extend ActorId = tostring(InitiatedBy.user.id)
| where ActorId == "<emergency-account-object-id-1>"
    or ActorId == "<emergency-account-object-id-2>"
| project TimeGenerated, ActorId, OperationName, Result,
    TargetResources, CorrelationId
| order by TimeGenerated desc
```

Keep the sign-in alert and the audit trail separate. The first tells you that the account was presented. The second tells you what the authenticated operator changed. Preserve both for the incident review.

Monitor configuration around the accounts as well:

- account enabled or disabled state;
- deletion and restoration events;
- Global Administrator assignment changes;
- emergency-group membership changes;
- authentication-method registration or deletion;
- passkey-profile and AAGUID changes;
- Conditional Access policy changes affecting the exclusion; and
- diagnostic-setting and alert-rule changes.

## Run a controlled drill at least every 90 days

Microsoft says to validate emergency access at least every 90 days, and again after changes to IT staff or Entra subscriptions. The drill must prove more than successful authentication.

Before the drill:

1. Open a change or exercise record and notify the security-monitoring team.
2. Name the operator, observer, start time, account, key, workstation, network path, and harmless administrative action.
3. Confirm that the other emergency account and a normal privileged session remain available.
4. Verify the alert responders know the activity is authorized but still treat the event as real.

During the drill:

1. Retrieve the credential through the documented physical-control process.
2. Sign in from the designated secure workstation.
3. Open an administrative surface required by the recovery plan.
4. Perform one reversible, preapproved read or low-impact validation action that proves the role is usable.
5. Confirm the sign-in alert reaches the independent responder.
6. Confirm the sign-in log shows the expected authentication and Conditional Access outcome.
7. Confirm the audit trail records the administrative action where applicable.
8. Sign out and return the credential to storage.

After the drill, reconcile the account, key, storage log, alert, sign-in event, administrative audit event, and change record. Record any dependency that was slower, inaccessible, expired, or known only to one person. A passed drill has evidence at every boundary; “the portal opened” is not enough.

## Use an explicit break-glass incident runbook

The runbook should be readable when Entra, email, chat, the corporate network, or the primary identity provider is unavailable. Keep an approved offline copy with the credentials and a controlled current copy in the incident-management system.

### Declare and authorize use

Define the conditions that permit emergency access: no usable normal administrator, PIM activation deadlock, identity-provider outage, tenant-wide Conditional Access lockout, or another approved control-plane emergency. Record the incident commander and operator. Use the second person as observer when circumstances allow.

### Establish a safe session

Use the designated secure workstation and an independent network path. Confirm the expected tenant and account before authentication. Do not use a personal device merely because the ordinary managed-device path is failing.

### Contain the smallest failed control

Change only what is required to restore normal administration. Examples include correcting the Conditional Access policy that blocked administrators, restoring an active approver, or recovering the identity-provider path. Preserve the original configuration and correlation IDs before editing.

The site's [Microsoft Entra backup and recovery operating model](/posts/microsoft-entra-id-backup-recovery-strategy) explains why configuration evidence and an ordered recovery plan matter as much as the emergency credential.

### Return to normal administration

As soon as a regular privileged path works, stop using the emergency identity. Reapply the intended policy state, verify normal admin access, end the emergency session, and preserve sign-in and audit evidence.

### Review every use

Microsoft says each alert should be classified as a planned drill, a genuine emergency, or misuse. Review what the operator did and whether it matched the authorization. If the credential, PIN, key custody, or workstation integrity might have been exposed, replace the affected element through a controlled procedure and re-run the drill.

## Troubleshoot an emergency account before you need it

### The account redirects to federation

Confirm its user principal name uses the tenant's initial `onmicrosoft.com` domain and that the object is cloud-only. If the account is synchronized or its sign-in depends on a custom federated domain, build a compliant cloud-only replacement while another administrator still has access. Do not try to repair the identity during a real lockout if a second valid emergency account exists.

### The FIDO2 key is not offered

Check whether the account is targeted by the correct passkey profile, device-bound passkeys are allowed, self-service setup was enabled for registration, and the key's AAGUID remains permitted. Confirm the browser, operating system, and key are supported. Preserve the sign-in correlation ID and authentication details before changing the profile.

### Conditional Access blocks the sign-in

Open the sign-in event and identify the exact failing policy. Confirm the account is still in the dedicated exclusion group and that the policy excludes that group. Check direct and nested targeting, policy changes, and propagation. Keep a second active session open while correcting scope.

### The role is unavailable

Verify that Global Administrator is assigned to the intended user object and is permanent active rather than eligible. Check whether the user or assignment was recreated, because a replacement object has a different object ID even when the user principal name looks the same. Update monitoring only after the approved replacement is complete.

### No alert arrives

Confirm `SigninLogs` is routed through an active diagnostic setting, the query uses the current object IDs, the Log Analytics workspace is the intended scope, the alert is enabled, and its action group reaches a destination outside the failed path. Microsoft's diagnostic-settings guidance says a new stream can take up to three days to populate, so build monitoring well before relying on the account.

## Microsoft Entra emergency access accounts checklist

- [ ] Maintain at least two cloud-only accounts on the tenant's `onmicrosoft.com` domain.
- [ ] Assign Global Administrator as permanent active, not PIM-eligible.
- [ ] Keep the accounts out of synchronization, federation, HR provisioning, and lifecycle cleanup.
- [ ] Use independent phishing-resistant credentials; prefer device-bound FIDO2 security keys.
- [ ] Inventory every key, custodian, storage location, registration date, and replacement path.
- [ ] Keep the two accounts and credentials in separate physical and operational failure domains.
- [ ] Use a dedicated assigned security group for Conditional Access exclusions.
- [ ] Exclude that group from every enforced policy that could block or restrict sign-in.
- [ ] Monitor account, role, group, credential, passkey-policy, Conditional Access, and diagnostic-setting changes.
- [ ] Alert on every successful and failed sign-in by object ID.
- [ ] Preserve administrative audit activity for every use.
- [ ] Require a designated secure workstation and independent network path.
- [ ] Keep an offline incident runbook with clear authorization and recovery steps.
- [ ] Drill both accounts at least every 90 days and after relevant staff or subscription changes.
- [ ] Classify every alert as a drill, incident, or misuse and complete a post-use review.

## FAQ

### How many Microsoft Entra emergency access accounts should a tenant have?

At least two. Microsoft's guidance says two or more so that one lost credential, inaccessible location, or damaged account does not eliminate the recovery path.

### Should a break-glass account be PIM eligible?

No. Microsoft says the emergency account's Global Administrator assignment should be permanent active. An eligible assignment can depend on PIM, MFA, authentication context, and approval at the moment those controls are unavailable.

### Should emergency accounts be excluded from every Conditional Access policy?

Exclude them from enforced policies that block or restrict sign-in. Report-only policies do not block access and do not need an exclusion. Verify the effective outcome in sign-in logs rather than assuming the group scope is correct.

### Should emergency access use a password or FIDO2 key?

Microsoft's current guidance recommends a passkey on a FIDO2 security key and also supports certificate-based authentication when the organization already operates PKI. The credential should be phishing-resistant and use different dependencies from normal administrator authentication.

### How often should emergency access accounts be tested?

At least every 90 days, and after relevant changes such as staff departures or Entra subscription changes. Test authentication, administrative access, monitoring, alert delivery, evidence capture, and credential retrieval—not just the login screen.

### What should happen after an emergency account is used?

Return to normal administration as soon as possible, preserve sign-in and audit logs, confirm every action matched the incident authorization, restore intended policy state, and complete a post-use review. Replace credentials or devices if their custody or integrity might have been exposed.

Microsoft Entra emergency access accounts are ready when they survive the failure modes they were built for and leave complete evidence when used. Two cloud-only identities, two independent phishing-resistant credentials, permanent active recovery authority, narrowly governed exclusions, immediate alerts, secure workstations, and rehearsed operators turn “break glass” from a hopeful label into a working control.
