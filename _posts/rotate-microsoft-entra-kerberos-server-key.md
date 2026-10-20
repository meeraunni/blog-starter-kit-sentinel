---
title: "Rotate the Microsoft Entra Kerberos Server Key Safely"
excerpt: "Rotate the Microsoft Entra Kerberos server key safely: verify key versions, preserve dual-key continuity, validate tickets, and recover from failed rollover."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-20T09:33:02-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **rotate the Microsoft Entra Kerberos server key**, use Microsoft's `Set-AzureADKerberosServer` cmdlet for the exact trust model in that Active Directory domain, then prove that the on-premises `KeyVersion` matches the Microsoft Entra `CloudKeyVersion`. Do not rotate `krbtgt_AzureAD` with ordinary AD key-reset tooling: the supported cmdlet updates the logical Kerberos server object in AD DS and publishes the matching key state to Microsoft Entra ID.

That is the short answer. The production answer needs a little more care. This is a shared cryptographic control plane, not a password on one server. A rushed second rotation, the wrong parameter set, or a key-version mismatch can affect Windows Hello for Business cloud trust, FIDO2 access to on-premises resources, Azure Files, and other workloads that rely on Microsoft Entra Kerberos.

Microsoft announced a **generally available reliability improvement** in its [June 2026 Microsoft Entra release notes](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new): incoming trust referral validation now tries both the primary and secondary keys during rollover. That closes an important failure path, but it does not remove the need to baseline every domain, wait for key distribution, validate real tickets, and keep the old key available until its tickets have expired.

Grab a coffee before the maintenance window. The command is one line; the safe change is a sequence.

## Rotate the Microsoft Entra Kerberos server key: the decision first

Microsoft documents two related configurations that use the same logical Kerberos server object. Identify which one exists before choosing a command:

- **FIDO2 or passwordless access to AD resources:** `Get-AzureADKerberosServer` returns the local and cloud object, while `CloudTrustDisplay` can be empty. Use `Set-AzureADKerberosServer` with `-RotateServerKey` and the documented cloud/domain credential pattern.
- **Incoming Microsoft Entra Kerberos trust:** `CloudTrustDisplay` returns Microsoft's documented KDC service trust marker. Use the documented `-SetupCloudTrust -RotateServerKey` path.
- **More than one AD domain:** each participating domain has its own Kerberos server and `KerberosDomain` object. Inventory, rotate, verify, and canary each domain separately.
- **No object returned:** key rotation is not the next action. Stop and establish whether the domain was ever configured; do not create trust as an incident workaround.

The distinction matters because `-SetupCloudTrust` maintains the Trusted Domain Object used for incoming trust referral flows. Microsoft's current [Kerberos trust configuration guide](https://learn.microsoft.com/en-us/entra/identity/authentication/configure-microsoft-entra-kerberos-trust) uses that parameter for trust setup and rotation. Its separate [passwordless access to on-premises resources guide](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-passwordless-security-key-on-premises) documents rotation of the Microsoft Entra Kerberos server without that parameter for the established FIDO2 scenario.

This guide is deliberately narrower than Sentinel Identity's [authentication-method architecture primer](/posts/core-authentication-methods-kerberos-ntlm-ldap-passkeys-certificates-windows-hello). The search intent here is an operational key-rotation runbook, not a general explanation of Kerberos.

## Understand what the rotation changes

Microsoft Entra Kerberos is represented on-premises by logical AD DS objects, not by a physical domain controller. Microsoft's [hybrid FIDO2 FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-passwordless-faqs) identifies three important pieces:

- `CN=AzureADKerberos,OU=Domain Controllers,<domain-DN>` is the logical read-only domain controller computer object;
- `CN=krbtgt_AzureAD,CN=Users,<domain-DN>` holds the Ticket Granting Ticket encryption key; and
- a service connection point under `CN=AzureAD,CN=System,<domain-DN>` lets the management tooling locate the objects.

Microsoft Entra ID holds the matching cloud-side `KerberosDomain` representation. When a supported user signs in, Microsoft Entra can issue a cloud TGT and, for hybrid access, a partial on-premises TGT. An on-premises domain controller exchanges that partial ticket for a full AD TGT with authorization data. The site's [Windows PRT troubleshooting guide](/posts/microsoft-entra-primary-refresh-token-prt-failures-windows) covers the token bootstrap layer that precedes this ticket flow.

The current trust design uses two keys:

- the **primary key** protects newly issued tickets; and
- the **secondary key** retains the previous primary so existing tickets can remain valid during rollover.

On rotation, the new key becomes primary and the prior primary becomes secondary. Microsoft's October 2026 [Kerberos trust documentation](https://learn.microsoft.com/en-us/entra/identity/authentication/configure-microsoft-entra-kerberos-trust#how-key-rotation-works) says this dual-key model is intended to avoid interruption. The June 2026 service change adds primary-and-secondary validation for incoming trust referral tickets. Together, those controls make a normal rollover resilient; neither control makes a mismatched cloud/on-premises publication safe.

> [!IMPORTANT]
> **Analysis:** a successful cmdlet exit is evidence that the operation ran, not evidence that every KDC, client, and workload is healthy. The acceptance condition is matching control-plane state plus successful new ticket issuance and service access from representative clients.

## Meet the access, module, and timing prerequisites

For the incoming-trust procedure, Microsoft currently documents:

- an AD domain functional level of Windows Server 2012 or later;
- an on-premises account that is a Domain Admin for the domain or Enterprise Admin for the forest;
- a Microsoft Entra Global Administrator;
- synchronized hybrid identities; and
- the Azure AD Hybrid Authentication Management PowerShell module.

Use a dedicated maintenance identity for each control plane where your operating model permits it. Activate privileges only for the window, record who approved the change, and keep emergency access separate from the operator session.

Microsoft's rotation guide does not list a separate key-rotation license. Licensing still follows the feature and workload that consumes Microsoft Entra Kerberos. Record whether the dependency is Windows Hello for Business cloud trust, FIDO2 hybrid access, Azure Files, Azure SQL, Azure Virtual Desktop, or another currently supported scenario; verify that scenario's current requirements before the change.

Plan for **several hours** of key distribution after rotation. Microsoft says the key can normally be rotated once within 24 hours because of that propagation timing. This is not a recommendation to rotate again after exactly 24 hours. The documentation separately says that fully retiring older keys requires a second rotation only after the original primary and secondary keys **and their tickets have expired**.

## Build the pre-change record

Run the inventory from the supported administration host and preserve the output in the change record. Use the AD DNS domain, not the Microsoft Entra tenant domain.

```powershell
$domain = "contoso.com"
$domainCred = Get-Credential
$cloudUserName = "hybrid-admin@contoso.onmicrosoft.com"

$before = Get-AzureADKerberosServer `
    -Domain $domain `
    -DomainCredential $domainCred `
    -UserPrincipalName $cloudUserName

$before | Format-List `
    ID, DomainDnsName, UserAccount, ComputerAccount, `
    KeyVersion, KeyUpdatedOn, KeyUpdatedFrom, `
    CloudId, CloudDomainDnsName, CloudKeyVersion, CloudKeyUpdatedOn, `
    CloudTrustDisplay
```

Verify all of these before proceeding:

1. `ID` equals `CloudId`.
2. `DomainDnsName` equals `CloudDomainDnsName`.
3. `KeyVersion` equals `CloudKeyVersion`.
4. The update timestamps are credible for the last known maintenance event.
5. `UserAccount` and `ComputerAccount` point to the expected objects in the intended domain.
6. `CloudTrustDisplay` matches the architecture you expect.

Microsoft warns that using `domain\username` credentials against another domain can fall back to NTLM and fail. Its verification guidance says to use the administrator's UPN format for the domain credential so the RPC bind is attempted with Kerberos. If the operator is a member of AD's Protected Users group, follow Microsoft's documented current-session pattern instead of repeatedly changing credential formats.

Also capture:

- AD replication health and the domain controller named by `KeyUpdatedFrom`;
- the module version and the administration host;
- every participating domain and forest;
- two canary users per sign-in method and device join state;
- one low-impact service per dependency, with its real SPN;
- the current client policy that enables cloud ticket retrieval; and
- a clear stop condition and Microsoft support owner.

Do not use a domain controller, privileged admin, or business-critical file share as the only canary.

## Run a staged Microsoft Entra Kerberos key rotation

### Stage 1: prove the old path before changing it

On each representative Windows canary, record the join and single sign-on state:

```text
dsregcmd /status
klist cloud_debug
klist
```

For hybrid access, the expected evidence includes a valid Microsoft Entra PRT and the appropriate cloud or partial-TGT state for the configured scenario. Request a service ticket for a low-impact test resource using its real SPN, then prove application access. Microsoft's current [Microsoft Entra Kerberos overview](https://learn.microsoft.com/en-us/entra/identity/authentication/kerberos) explains the cloud-TGT and partial-TGT flow; do not treat a cloud TGT alone as proof that the on-premises exchange worked.

If the baseline already fails, stop. Rotation is maintenance, not a repair lottery.

### Stage 2: rotate one domain through the supported cmdlet

For an established incoming-trust configuration, Microsoft documents this command:

```powershell
Set-AzureADKerberosServer `
    -Domain $domain `
    -DomainCredential $domainCred `
    -UserPrincipalName $cloudUserName `
    -SetupCloudTrust `
    -RotateServerKey
```

For the established FIDO2/passwordless server-object scenario without the Trusted Domain Object, use the parameter set in Microsoft's passwordless deployment guide instead of copying `-SetupCloudTrust` into a different architecture.

Do not use an ordinary `krbtgt` reset script, AD Users and Computers, ADSI Edit, or direct Graph modification. Microsoft explicitly requires `Set-AzureADKerberosServer` because the operation must update both AD DS and Microsoft Entra ID.

### Stage 3: verify control-plane convergence immediately

Run the same read command again and compare the result:

```powershell
$after = Get-AzureADKerberosServer `
    -Domain $domain `
    -DomainCredential $domainCred `
    -UserPrincipalName $cloudUserName

$after | Format-List `
    ID, DomainDnsName, KeyVersion, KeyUpdatedOn, KeyUpdatedFrom, `
    CloudId, CloudDomainDnsName, CloudKeyVersion, CloudKeyUpdatedOn, `
    CloudTrustDisplay
```

The numeric key version does not need to increment by one. Microsoft says it is derived from replication metadata and can jump substantially. What matters is that the new `KeyVersion` and `CloudKeyVersion` match, the object identifiers and domains still match, and the update timestamps reflect the new change.

If the versions differ, stop. Do not force another rotation to make the numbers move again.

### Stage 4: validate new tickets, not cached success

Allow the documented propagation period. Then use a fresh interactive sign-in on the canary rather than relying on an application session that existed before the change. Re-run `dsregcmd /status`, `klist cloud_debug`, and the real service-ticket and application tests recorded in the baseline.

Test at least:

- a Microsoft Entra joined and, where used, a hybrid-joined Windows device;
- each deployed passwordless sign-in method;
- an on-premises Kerberos service reached through a partial-TGT exchange;
- a cloud-integrated Kerberos workload such as the tenant's Azure Files path, where applicable; and
- a negative case that should still be denied.

The [Microsoft Entra-to-AD provisioning guide](/posts/provision-microsoft-entra-users-to-active-directory) is useful context when cloud-managed users retain or receive AD objects for passwordless Kerberos access. Key rotation does not change source of authority, provision an AD account, or add missing authorization data.

### Stage 5: hold, observe, and expand domain by domain

Keep the change open through the several-hour distribution window. Watch authentication tickets, service failures, help-desk signals, and the applications that depend on each domain. In a multidomain or multiforest deployment, repeat the baseline, rotation, convergence check, and canary test for one domain at a time.

Do not run a rapid forest-wide loop merely because every domain uses the same cmdlet. Microsoft Entra represents each AD domain as a separate `KerberosDomain` object; a clean result in one domain does not prove another domain's object or replication state.

## Troubleshoot in control-plane order

### Local and cloud key versions do not match

This is a publication or convergence problem. Preserve the before/after output, stop further rotations, check AD replication and reachability from the administration host, and allow the documented distribution window. Escalate with the domain, object IDs, both key versions, both update timestamps, `KeyUpdatedFrom`, module version, UTC command time, and sanitized command transcript.

Do not edit `krbtgt_AzureAD` directly. Do not delete and recreate the objects to make the display look clean.

### The cmdlet fails against another domain

Use the AD administrator's UPN in the domain credential prompt. Microsoft's guidance explains that `domain\username` can cause an NTLM bind and failure when the operation needs Kerberos. Confirm the operator's group membership and whether Protected Users restrictions change the supported credential pattern.

### A child domain returns `LsaCreateTrustedDomainEx 0x549`

For multidomain forests, Microsoft says to run the `-SetupCloudTrust` operation on the forest root domain, then run the child-domain command without `-SetupCloudTrust`. Do not improvise a second Trusted Domain Object in the child to bypass the error.

### `CloudTrustDisplay` is empty

An empty value can be valid for a domain that has the Microsoft Entra Kerberos service account for FIDO2 but does not have the incoming-trust Trusted Domain Object. Compare the result with the approved architecture. If incoming cloud trust is expected, treat the empty value as a configuration discrepancy and stop before rotation.

### The object matches, but the client has no partial TGT

Separate issuance from exchange. Confirm the device join state, Microsoft Entra PRT, cloud-ticket retrieval policy, supported sign-in method, user's matching AD identity, client-to-DC line of sight, and a domain controller capable of the key-list operation. Then test the real SPN. A correct server object cannot compensate for a missing user mapping or unreachable DC.

### Old sessions work, but new sign-ins fail

Cached application or Kerberos sessions can conceal a rollover problem. Preserve evidence from a failing fresh sign-in, compare its domain and KDC path with a working client, and confirm that both primary and secondary validation are available in the service path. The June 2026 improvement reduces failures caused by referral tickets protected with the secondary key; it does not prove that every failure during the same window has that cause.

## Mitigation is not rollback

There is no Microsoft-documented “make the old secondary primary again” rollback command in the current rotation procedure. The dual-key design is the continuity mechanism. If validation fails:

1. stop additional domains and any planned second rotation;
2. preserve the previous and current state outputs;
3. confirm whether the failure is control-plane mismatch, AD replication, ticket issuance, referral exchange, or application authorization;
4. allow supported key distribution where state is converging; and
5. escalate before using `-Force`, deleting trust, or removing the Kerberos server.

`-Force` is not a rollback. Microsoft documents it for applying or rotating again within 24 hours, repair or reconciliation, automation, and partial-configuration recovery. It suppresses the normal confirmation path and can advance state again. Use it only when the diagnosed recovery procedure explicitly requires it.

Removing the Trusted Domain Object is also not a normal rollback for key rotation. It removes the incoming trust while leaving the service account for FIDO2 scenarios. Removing all Kerberos settings deletes both sides of the configuration. Those are architecture changes with their own blast radius, not convenient undo buttons.

## Administrator checklist

- [ ] Define the search intent and change scope as key rotation, not trust creation or passwordless deployment.
- [ ] Inventory every participating domain and its dependent workloads.
- [ ] Confirm `ID`/`CloudId`, domain names, key versions, timestamps, and `CloudTrustDisplay` before change.
- [ ] Verify AD replication and record `KeyUpdatedFrom`.
- [ ] Use the current Azure AD Hybrid Authentication Management module from an approved host.
- [ ] Activate only the documented AD and Microsoft Entra privileges for the window.
- [ ] Baseline PRT, cloud or partial TGT, service ticket, and application access on representative canaries.
- [ ] Choose the command path that matches the existing trust model.
- [ ] Rotate one domain with `Set-AzureADKerberosServer` only.
- [ ] Prove `KeyVersion` equals `CloudKeyVersion` after the operation.
- [ ] Allow several hours for key distribution and test fresh sign-ins.
- [ ] Hold the next domain if any new ticket or application test fails.
- [ ] Do not use `-Force` as a reflexive retry or call object deletion a rollback.
- [ ] Schedule any second rotation only after the original two keys and their tickets have expired.
- [ ] Preserve the change record and support evidence without credentials or ticket material.

## FAQ

### How often should the Microsoft Entra Kerberos server key be rotated?

Microsoft does not mandate a fixed interval. Its current guidance is to align the rotation with the schedule used for other AD DS `krbtgt` keys, use a planned maintenance window, and rotate immediately after suspected credential compromise.

### Do I rotate `krbtgt_AzureAD` twice in the same maintenance window?

No. Microsoft says key distribution takes several hours and normally limits rotation to once within 24 hours. Fully retiring older keys requires a later second rotation only after the original primary and secondary keys and their tickets have expired.

### Should `KeyVersion` increase by exactly one?

No. Microsoft says the version is based on replication metadata and can jump by much more than one. Equality between the current on-premises `KeyVersion` and cloud `CloudKeyVersion` is the important check.

### Does the 2026 dual-key improvement make rotation outage-proof?

No. It improves referral-ticket validation by trying both primary and secondary keys during rollover. It does not correct wrong-domain commands, failed cloud publication, AD replication faults, missing client policy, broken user mapping, or application authorization failures.

### What belongs in a Microsoft support case?

Include the affected domain and forest, UTC timeline, object and cloud IDs, before/after key versions and update timestamps, `KeyUpdatedFrom`, `CloudTrustDisplay`, module version, sanitized cmdlet transcript, AD replication evidence, client join/PRT/TGT state, real SPN tested, sign-in method, and the smallest reproducible new-ticket failure. Never attach passwords, reusable credentials, or ticket secrets.

## Microsoft sources

- [Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new)
- [Configure Microsoft Entra Kerberos trust](https://learn.microsoft.com/en-us/entra/identity/authentication/configure-microsoft-entra-kerberos-trust)
- [Introduction to Microsoft Entra Kerberos](https://learn.microsoft.com/en-us/entra/identity/authentication/kerberos)
- [Enable passwordless security-key access to on-premises resources](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-passwordless-security-key-on-premises)
- [Hybrid FIDO2 deployment FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-passwordless-faqs)
- [Configure cloud trust between AD DS and Microsoft Entra ID for Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-identity-auth-hybrid-cloud-trust)
