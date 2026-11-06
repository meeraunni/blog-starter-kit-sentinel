---
title: "AADDS123 RC4 Alert: Entra Domain Services Admin Fix"
excerpt: "Resolve the AADDS123 RC4 alert safely: trace Kerberos dependencies, migrate to AES, scope exceptions, and verify Microsoft Entra Domain Services."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-06T17:23:13-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

The **AADDS123 RC4 alert** means Microsoft Entra Domain Services has observed RC4 being used to issue Kerberos service tickets. Treat it as dependency evidence, not as permission to switch the whole managed domain back to a weak cipher. Identify the requesting account and target service in events 4768 and 4769, move the workload to AES, use a narrowly scoped and time-limited exception only when migration cannot happen immediately, and verify that both authentication and managed-domain health recover.

Microsoft's current [AADDS123 health-alert guidance](https://learn.microsoft.com/en-us/entra/identity/domain-services/troubleshoot-alerts#aadds123-kerberos-rc4-usage-detected-for-service-ticket-issuance) connects the alert to the Kerberos hardening for CVE-2026-20833. The companion [Domain Services RC4 dependency-test notice](https://learn.microsoft.com/en-us/entra/identity/domain-services/rc4-deprecation-advance-dependency-test) says Microsoft moved managed domain controllers to AES-only enforcement and began permanently disabling RC4 across regions in the week of July 13, 2026. This is an enforced security transition, not a preview feature or an optional roadmap item.

Grab a coffee before editing an encryption bitmask. A Kerberos ticket has a requester, a service account, a client capability set, keys on both accounts, and a KDC decision. Changing the domain-wide default can make an old application work while silently broadening the attack surface for every other service. The safe fix is to find the first account or device that cannot use AES and repair that boundary.

> [!NOTE]
> This guide is based on current Microsoft documentation and does not claim a hands-on tenant test. Where it recommends change sequencing or evidence retention beyond Microsoft's literal steps, that guidance is labeled as analysis.

## AADDS123 RC4 alert: what the control plane saw

Microsoft Entra Domain Services supplies managed domain controllers for workloads that still need domain join, Group Policy, LDAP, Kerberos, or NTLM. Microsoft operates and patches those controllers; customers administer the managed domain and its member workloads without receiving normal domain-controller access. The [Domain Services architecture overview](https://learn.microsoft.com/en-us/entra/identity/domain-services/overview) also explains that Microsoft Entra ID remains the source for synchronized users, groups, and credentials.

AADDS123 is raised when the managed service detects RC4 use for Kerberos **service ticket issuance** that conflicts with the CVE-2026-20833 enforcement model. Microsoft's alert procedure directs administrators to events 4768 and 4769:

- **4768** records a Kerberos authentication ticket request.
- **4769** records a Kerberos service ticket request.
- A ticket encryption type of **`0x17`** identifies RC4-HMAC in Microsoft's current Domain Services query.
- The account, service name, time, and request volume help distinguish an isolated legacy dependency from a broad protocol fallback.

The alert is not proof that every Kerberos exchange uses RC4. It is also not enough to identify the broken component by display name alone. Microsoft's [Kerberos RC4 detection guide](https://learn.microsoft.com/en-us/windows-server/security/kerberos/detect-remediate-rc4-kerberos) explains that the requester, target service, advertised encryption types, processed `msDS-SupportedEncryptionTypes`, and available keys all affect the KDC decision.

The security reason matters. Microsoft's [CVE-2026-20833 servicing guidance](https://support.microsoft.com/en-us/servicing/os/windows/2025/11/how-to-manage-kerberos-kdc-usage-of-rc4-for-service-account-ticket-issuance-changes-related-to-cve-2) says the vulnerability can let an attacker obtain tickets using weak or legacy encryption and attack a service-account password offline. AES migration is therefore the remediation. Re-enabling RC4 broadly is only a containment measure, and a risky one.

The site's [authentication-method trust model](/posts/core-authentication-methods-kerberos-ntlm-ldap-passkeys-certificates-windows-hello) explains how Kerberos, NTLM, LDAP, certificates, and passkeys establish different kinds of proof. AADDS123 is specifically a Kerberos encryption-selection problem; it does not diagnose an LDAP bind, an NTLM fallback, a bad password, or an application authorization failure.

## Separate alert state, enforcement state, and workload failure

Three observations can exist independently.

**The health alert is active.** Domain Services found an RC4 dependency and surfaced AADDS123. Microsoft's current alert page says managed-domain health can take up to two hours to clear after the dependency is remediated.

**The managed domain is enforcing AES-first behavior.** Microsoft's RC4 deprecation documentation records an initial audit phase in January 2026, an enforcement phase with manual rollback in April, and final enforcement in July. The dependency-test page says permanent regional disablement started the week of July 13, 2026.

**A workload is failing.** An application, scheduled task, appliance, or service cannot obtain or consume the required Kerberos ticket. The application may show a generic authentication error while the useful evidence lives in Domain Services audit events and the workload log.

Do not infer one state from another. A still-visible alert after a successful repair can be normal health-evaluation latency. A cleared alert does not prove the application completed its own authorization path. A workload outage does not prove RC4 is the cause until its timestamp and service identity correlate with Kerberos evidence.

> [!IMPORTANT]
> **Analysis:** treat the ticket event as control-plane evidence and the application transaction as data-plane proof. Closure requires both: no unapproved RC4 issuance and a fresh successful application operation using the intended account.

## Pass the access, cost, and evidence prerequisites

This runbook assumes an existing Microsoft Entra Domain Services managed domain. Domain Services is a paid Azure service billed hourly by SKU; Microsoft says it works with Microsoft Entra ID Free or Premium editions rather than requiring P1 or P2 by itself. Diagnostic destinations such as Log Analytics, Storage, and Event Hubs have their own Azure cost and retention considerations. Confirm the managed-domain SKU, subscription owner, diagnostic workspace owner, and retention decision before changing telemetry. ([Domain Services licensing FAQ](https://learn.microsoft.com/en-us/entra/identity/domain-services/faqs#billing-and-availability))

Use the smallest published access boundary for each task:

- Microsoft's hardening guide requires **Application Administrator**, **Groups Administrator**, and **Domain Services Contributor** to modify the managed domain's security settings.
- Members of **AAD DC Administrators** can use the documented self-service RC4 configuration files inside the managed domain.
- Microsoft's diagnostic-settings procedure currently specifies **Global Administrator** for enabling security audit destinations in the Microsoft Entra admin center.
- Operators also need access to the chosen Azure destination and an approved path to the domain controller's encrypted SMB share when self-service configuration is required.

Activate privileged access only for the change window where your organization supports it. Record who owns the application, service account, client device, managed domain, source Active Directory object, and rollback decision. If any of those owners are missing, pause before changing a shared encryption default.

Enable evidence before reproducing the failure. Microsoft warns that [Domain Services security audits](https://learn.microsoft.com/en-us/entra/identity/domain-services/security-audit-events) are not retroactive: events start flowing only after the diagnostic setting is saved. Send the required **Account Logon** category to an existing Log Analytics workspace for interactive analysis, or use an approved Storage/Event Hubs destination when that is the organization's operating model.

The existing [Domain Services SAM account name sync guide](/posts/microsoft-entra-domain-services-samaccountname-sync) covers the separate identity-name and synchronization plane. AADDS123 can involve a synchronized service account, but renaming an identity or changing `sAMAccountName` does not create AES keys and is not a Kerberos cipher repair.

## Build the before-state evidence packet

Capture the managed domain and failing transaction before making a change:

- tenant ID, subscription ID, managed-domain resource ID, DNS name, region, SKU, and current Health state;
- AADDS123 first-seen and last-seen times;
- application, protocol, hostname, SPN, port, and business owner;
- requesting user or computer account and target service account;
- source device IP and operating system or appliance version;
- whether the service account is cloud-only, created inside the managed domain, or synchronized from on-premises AD;
- current `msDS-SupportedEncryptionTypes`, available key evidence, and password-change history where the authoritative directory exposes them;
- matching 4768/4769 events and application-side failures; and
- current `rc4-configuration.json` and `rc4-status.json` when the self-service share is already in use.

Do not publish account secrets, ticket material, or full event payloads into a general change ticket. Preserve the fields needed for correlation and store sensitive logs in the approved security workspace.

## Find the RC4 dependency with Microsoft's query

Microsoft publishes a Log Analytics query that finds RC4 ticket events from the previous seven days. Use the current source version rather than maintaining an unreviewed local fork:

```kusto
let EncryptionTypeFromHex = (hex_value: int) {
    case(
        hex_value == 0x11, "AES128-SHA96",
        hex_value == 0x12, "AES256-SHA96",
        hex_value == 0x17, "RC4",
        "Unknown"
    )
};
AADDomainServicesAccountLogon
| where TimeGenerated >= ago(7d)
| where OperationName has "4768" or OperationName has "4769"
| parse ResultDescription with * "Ticket Encryption Type:\t" EncryptionType "\n" *
| where EncryptionType has "0x17"
| parse ResultDescription with * "Account Name:\t\t" AccountName "\n" *
| parse ResultDescription with * "Service Name:\t\t" ServiceName "\n" *
| extend EncryptionTypeName = EncryptionTypeFromHex(toint(EncryptionType))
| project TimeGenerated, OperationName, AccountName, ServiceName, EncryptionType, EncryptionTypeName
| summarize Count = count() by AccountName, ServiceName, EncryptionType, EncryptionTypeName
| order by Count desc
```

This is a shortened presentation of Microsoft's [Sample query 7](https://learn.microsoft.com/en-us/entra/identity/domain-services/security-audit-events#sample-query-7); the filtering and parsed fields are unchanged for the RC4 path. Use the full current Microsoft query if you need its complete encryption-type mapping.

Read the results as an investigation queue, not an exception list. For each row:

1. Correlate a fresh 4769 event with the application failure.
2. Identify the requester and the target service separately.
3. Inspect advertised encryption types and the keys available to the target account.
4. Confirm the SPN resolves to the intended service account.
5. Determine whether the client cannot advertise AES, the service lacks AES keys, or an explicit bitmask forces RC4.
6. Reproduce once with aligned timestamps after evidence collection is active.

A high event count can mean one busy legacy service, not many dependencies. A single event can still represent a critical monthly process. Prioritize by business impact and credential exposure, not only by volume.

## Choose the smallest supported remediation

### Migrate the client and service to AES

This is the preferred path. Update or reconfigure the device, library, keytab, application, or operating system so the client advertises AES and the service can accept it. Microsoft's Windows guidance says accounts created long ago can lack AES keys; changing the account password generates those keys. Coordinate any service-account password change with the application owner, secret store, service configuration, and outage window.

For a non-Windows appliance or application, verify the vendor's supported Kerberos encryption types and keytab procedure. Regenerate and deploy a keytab with AES keys when the vendor procedure requires it, then remove the RC4-only material. Do not assume a Windows-side attribute change upgrades a keytab stored on another system.

### Correct the authoritative service-account attribute

When a service account is synchronized from on-premises through Microsoft Entra Connect, Microsoft's AADDS123 procedure says to configure `msDS-SupportedEncryptionTypes` in the **on-premises** source and let the updated attribute synchronize to the managed domain. The [Microsoft Entra Connect upgrade guide](/posts/microsoft-entra-connect-september-2026-upgrade-guide) is useful here because a stale or unsupported synchronization plane turns an otherwise correct source fix into a second troubleshooting problem.

Do not edit a synchronized account in the managed domain as though it were authoritative. Confirm the source value, synchronization health, destination value, and fresh ticket behavior in that order.

### Use a scoped temporary RC4 exception

If a critical service cannot migrate immediately, the current AADDS123 page documents `serviceAccountsRequiringRc4` in the customer-editable `rc4-configuration.json`. Members of AAD DC Administrators can reach the encrypted share at:

```text
\\<domain-controller-name>\CustomerExecutionScripts$
```

The same share contains the generated `rc4-status.json`; Microsoft says not to edit, rename, or delete the configuration, status, or README files. After saving a valid configuration, allow roughly ten minutes for the evaluation cycle and verify the status file.

A scoped exception needs all of these controls:

- one named service account, never a convenience list of every suspected account;
- an application owner and security approver;
- a documented reason AES cannot be used today;
- a compensating control for the credential and service;
- a fixed removal date and migration ticket;
- post-change 4768/4769 monitoring; and
- proof that no domain-wide RC4 default was broadened.

Microsoft's current configuration reference lists audit and enforcement modes plus accepted domain encryption values. Do not calculate a new number from memory or copy a registry value from ordinary AD DS into Domain Services. Use only the accepted values in the current AADDS123 documentation and verify `rc4-status.json` reports `InSync` or `Applied` without validation errors.

### Do not use domain-wide rollback as the normal fix

The earlier dependency-test recovery procedure documented audit mode with `rc4DefaultDisablementPhase` set to `1` and `defaultDomainSupportedEncTypes` set to `60` as a rapid recovery during the regional test. That was an outage-containment path, not a desired November 2026 steady state. The same page says permanent disablement began in July.

> [!WARNING]
> Do not re-enable RC4 across the managed domain merely to clear one application outage. Do not use value `0` to suppress logging, widen `defaultDomainSupportedEncTypes` without an approved emergency decision, or leave a transition setting without an expiry. If the scoped exception cannot restore the service, preserve evidence and open Microsoft support rather than weakening the entire domain.

## Stage the change and prove AES behavior

Use one representative transaction and one unaffected control workload.

1. Confirm the query returns the expected RC4 event for the failing path.
2. Apply the client, key, password, attribute, or scoped-exception change through its authoritative control plane.
3. Wait for the documented synchronization or self-service evaluation cycle instead of repeatedly editing settings.
4. Start a new application session; do not reuse a cached Kerberos ticket as proof.
5. Confirm the application completes authentication and its intended business action.
6. Review the new 4768/4769 evidence. The remediated path should use AES, or match the explicitly approved temporary exception.
7. Test the unaffected workload to detect a domain-wide regression.
8. Monitor Domain Services Health. Microsoft says AADDS123 clears automatically within two hours after dependencies are remediated.

> [!NOTE]
> **Analysis:** purge or expiry of a cached ticket can be useful during a controlled validation, but do not turn cache clearing into the repair. The lasting proof is a newly issued ticket with the intended encryption type and a successful application transaction after the authoritative configuration has converged.

## Troubleshoot by the first broken boundary

**No events appear in Log Analytics.** Confirm the diagnostic setting existed before the test, included the Account Logon category, targets the workspace being queried, and has begun receiving Domain Services tables. Audits are not retroactive, so a historical failure cannot be reconstructed from a destination that was enabled afterward.

**The event shows `0x17`, but the service supports AES.** Inspect the client-advertised types, service-account keys, explicit `msDS-SupportedEncryptionTypes`, SPN ownership, and any keytab. “Supports AES” in a product datasheet does not prove this deployed account and key material are using it.

**The source account was fixed, but Domain Services still issues RC4.** Verify Microsoft Entra Connect health, the last successful synchronization, the attribute in the authoritative on-premises object, and the corresponding managed-domain value. Preserve object identifiers and timestamps before forcing any unrelated full synchronization.

**The status file reports an error.** Compare `rc4-configuration.json` with the current accepted schema and values. Microsoft says invalid values are rejected and surfaced in `rc4-status.json`. Do not delete the files or improvise a second configuration path.

**The application works, but AADDS123 remains.** Look for a second requester or service in the seven-day query, then allow for the documented health refresh of up to two hours. Keep the incident open if fresh unapproved RC4 events continue.

**AADDS123 cleared, but the application still fails.** The RC4 dependency is no longer the leading explanation. Check DNS/SPN resolution, account state, authorization, network reachability, and the application log. Do not restore RC4 without new Kerberos evidence.

## Rollback, containment, and escalation

Rollback the smallest changed layer. Restore the previous supported application or keytab configuration when an AES migration breaks the service, revert an incorrect source attribute through the authoritative directory, or remove an invalid scoped exception. Keep diagnostics enabled long enough to capture the rollback result.

If a critical workload is down and the approved scoped exception does not restore it, open an Azure support request. Microsoft's dependency-test page explicitly directs customers to support when the self-service recovery path fails. Include:

- tenant, subscription, managed-domain resource ID, region, and SKU;
- AADDS123 timestamps and current Health screenshot;
- requester, service account, SPN, client address, and application owner;
- sanitized 4768/4769 records with ticket and session encryption fields;
- current and previous self-service configuration plus `rc4-status.json`;
- authoritative `msDS-SupportedEncryptionTypes` and synchronization evidence when hybrid;
- exact change, result, rollback, and correlated application errors; and
- the business impact and safe maintenance window.

Do not send passwords, keytab contents, tickets, private keys, or unsanitized secrets in the initial case description.

## AADDS123 administrator checklist

- [ ] Confirm the alert is AADDS123 and record its first and last detection times.
- [ ] Enable Account Logon auditing before reproducing the failure.
- [ ] Run Microsoft's Sample query 7 and identify the requester and target service.
- [ ] Correlate the Kerberos event with a fresh application failure.
- [ ] Check advertised encryption types, service-account keys, SPN ownership, and source authority.
- [ ] Prefer an AES-capable client, service configuration, password/key refresh, or keytab.
- [ ] Change synchronized service-account attributes only in on-premises AD.
- [ ] Use a named, approved, expiring service-account exception only when necessary.
- [ ] Verify `rc4-status.json` after a self-service configuration change.
- [ ] Prove a fresh successful application transaction and intended ticket encryption.
- [ ] Test one unaffected workload for regression.
- [ ] Confirm no fresh unapproved RC4 events remain.
- [ ] Allow up to two hours for managed-domain health to clear the alert.
- [ ] Escalate with sanitized control-plane and workload evidence if recovery fails.

## Frequently asked questions

*Is AADDS123 only a warning?* It is a health alert that identifies RC4 use capable of blocking the CVE-2026-20833 enforcement model. Even if the application still works, the weak-encryption dependency requires remediation.

*Should I disable RC4 immediately?* Microsoft's hardening page says to disable it when no workload, device, or service depends on it. If dependency state is unknown, enable audits and identify RC4 use before making the domain-wide change.

*Does changing `msDS-SupportedEncryptionTypes` create AES keys?* No. The attribute advertises or constrains supported types; the account must also have suitable keys. Microsoft's detection guide notes that changing an old account's password generates AES keys, but any password change must be coordinated with every consuming service.

*Can I edit a synchronized service account inside the managed domain?* Microsoft's AADDS123 procedure says to update the on-premises Active Directory source for accounts synchronized through Microsoft Entra Connect, then let the value synchronize.

*Why did the application fail after July 2026?* Microsoft began permanent RC4 disablement across Domain Services regions in the week of July 13, 2026. A client that advertises only RC4, a service without AES keys, or an RC4-only keytab can fail when the managed KDC enforces AES behavior.

*How long should the alert take to disappear?* Microsoft's current AADDS123 guidance says Domain Services health updates automatically and removes the alert within two hours after the RC4 dependencies are remediated.

## Microsoft primary sources

- [AADDS123: Kerberos RC4 usage detected for service ticket issuance](https://learn.microsoft.com/en-us/entra/identity/domain-services/troubleshoot-alerts#aadds123-kerberos-rc4-usage-detected-for-service-ticket-issuance)
- [RC4 deprecation advance dependency test in Microsoft Entra Domain Services](https://learn.microsoft.com/en-us/entra/identity/domain-services/rc4-deprecation-advance-dependency-test)
- [Harden a Microsoft Entra Domain Services managed domain](https://learn.microsoft.com/en-us/entra/identity/domain-services/secure-your-domain)
- [Enable security and DNS audits for Microsoft Entra Domain Services](https://learn.microsoft.com/en-us/entra/identity/domain-services/security-audit-events)
- [CVE-2026-20833 Kerberos KDC RC4 servicing guidance](https://support.microsoft.com/en-us/servicing/os/windows/2025/11/how-to-manage-kerberos-kdc-usage-of-rc4-for-service-account-ticket-issuance-changes-related-to-cve-2)
- [Detect and remediate RC4 usage in Kerberos](https://learn.microsoft.com/en-us/windows-server/security/kerberos/detect-remediate-rc4-kerberos)
- [Microsoft Entra Domain Services overview](https://learn.microsoft.com/en-us/entra/identity/domain-services/overview)
- [Microsoft Entra Domain Services licensing FAQ](https://learn.microsoft.com/en-us/entra/identity/domain-services/faqs#billing-and-availability)
