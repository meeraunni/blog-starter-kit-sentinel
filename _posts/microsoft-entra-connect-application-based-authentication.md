---
title: "Microsoft Entra Connect Application-Based Authentication"
excerpt: "Migrate Entra Connect to application-based authentication before April 7, 2027: inventory legacy accounts, stage certificates, validate sync, and recover."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-18T09:03:45-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra Connect application-based authentication** replaces the legacy directory synchronization username and password with a single-tenant application identity and certificate credential. Microsoft now requires every Connect Sync deployment to run version **2.6.84.0 or later** and use application-based authentication by **April 7, 2027**. Microsoft says legacy authentication is being retired and synchronization services will stop after that date when either requirement is missing.

The safe answer is to inventory every active, staging, recovery, and powered-off Connect server; upgrade to the current supported release; confirm each server's connector identity; migrate one controlled server with the Microsoft-managed application and certificate unless you have a documented reason to own them; validate a complete synchronization cycle and certificate rotation; and remove the legacy Directory Synchronization Account only after the new path is proven.

Those deadline and failure statements come from Microsoft's current [Microsoft Entra Connect version history](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-version-history). The implementation model comes from the separate [application-identity authentication guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/authenticate-application-id). Read both: application-based authentication became generally available earlier, but the retirement notice creates a new mandatory operating deadline.

Grab a coffee before opening the wizard. This is not merely a credential swap. The change affects the identity Connect uses to call Microsoft Entra, the certificate lifecycle on the server, the application object in the tenant, administrator sign-in for cloud configuration changes, and the evidence you need to recover when authentication or rotation fails.

## Microsoft Entra Connect application-based authentication: the decision

Start by separating the authentication migration from adjacent projects.

| Current state | Required decision |
| --- | --- |
| Connect Sync uses `ServiceAccount` | Upgrade to the current release and migrate to `Application` before April 7, 2027 |
| Connect Sync uses `Application` and Microsoft manages the certificate | Validate version, application ID, scheduler, certificate expiry, rotation evidence, and sync health |
| Connect Sync uses BYOC or BYOA | Validate ownership, private-key access, rotation, recovery, and the exact application permissions |
| A staging server still uses `ServiceAccount` | Treat it as in scope; a recovery server that cannot authenticate is not a recovery plan |
| A retired or powered-off server can return | Upgrade, migrate, or formally decommission it so it cannot reappear with stale configuration |
| The organization plans to move to Cloud Sync | Keep that as a separate architecture change unless the tested migration can finish safely before the deadline |
| Connect Sync is below 2.6.84.0 | Upgrade first; application authentication alone does not meet the retirement requirement |

The primary search intent here is narrow: **how to migrate Microsoft Entra Connect to application-based authentication and prove it is production-ready**. It complements the site's [Connect 2.6.92.0 hotfix guide](/posts/microsoft-entra-connect-2-6-92-hotfix), which handles the current hotfix and Pass-through Authentication regression, and the broader [September 2026 Connect upgrade runbook](/posts/microsoft-entra-connect-september-2026-upgrade-guide), which addressed the earlier minimum-version cutoff.

## Understand what changes in the control plane

The legacy connector identity is a Directory Synchronization Account: a Microsoft Entra user account whose username and password Connect uses for cloud requests. Application-based authentication instead uses the OAuth 2.0 client-credentials flow. A tenant-local application and service principal hold the required application permissions, while Connect proves possession of a certificate private key.

Microsoft documents three ownership models:

- **Managed by Microsoft Entra Connect (default):** Connect creates and manages the application and certificate, including rotation and cleanup. Microsoft recommends this option.
- **Bring Your Own Certificate (BYOC):** Connect uses its default application, but your organization creates, protects, rotates, and removes the certificate.
- **Bring Your Own Application (BYOA):** your organization owns both the application registration and certificate, including permissions, credential lifecycle, and recovery.

For the default model, Connect stores the certificate in the current-user certificate store. It prefers a Trusted Platform Module for hardware-backed key operations; if a usable TPM is unavailable, it falls back to the Microsoft Software Key Storage Provider and marks the private key nonexportable. Microsoft currently documents a 90-day certificate lifetime and scheduler-driven automatic rotation.

That scheduler dependency is operationally important. Suspending the scheduler also prevents the normal certificate-rotation check. A server can therefore keep synchronizing successfully today while quietly approaching an authentication outage. Monitor the identity and its certificate, not only import and export results.

> [!IMPORTANT]
> **Analysis:** application-based authentication removes a reusable cloud username and password from the synchronization path, but it does not make the Connect server low value. A process that can use the certificate private key and the application's permissions can still act as the synchronization identity. Protect the server, ADSync service context, certificate store, local administrators, and application object as one trust boundary.

## Meet version, role, platform, and licensing prerequisites

Use the live version page at the start of the change window. At publication time, Microsoft lists **2.6.92.0** as the latest release and recommends it because it contains security fixes. The retirement floor is 2.6.84.0, not the preferred destination. Automatic upgrade does not guarantee the latest downloadable build, and not every Connect configuration or release participates in automatic upgrade.

Microsoft's deadline notice also names **.NET Framework 4.7.2** and **TLS 1.2** as minimum requirements. The current application-authentication guide requires at least the **Hybrid Identity Administrator** role for the documented onboarding path. The operator also needs the local, Active Directory, and SQL permissions appropriate to the installation and upgrade design; confirm those against the current [Connect accounts and permissions reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-accounts-permissions) rather than granting a daily account broad standing access.

Microsoft Entra Connect is free and included with an Azure subscription. Connect Health requires Microsoft Entra ID P1, according to Microsoft's [current licensing reference](https://learn.microsoft.com/en-us/entra/fundamentals/licensing#microsoft-entra-connect). Licensing Connect does not license every feature carried through the server, such as Conditional Access, password writeback, or other premium services.

For BYOC or BYOA, Microsoft documents an RSA 2048-bit certificate using SHA-256 and Digital Signature key usage, stored in the local-machine certificate store. The private key must be nonexportable, the ADSync service account must be able to sign with it, and Microsoft recommends TPM or HSM protection. Do not select BYOC or BYOA merely because your organization already has a public-key infrastructure; select them only when the ownership, permissions, rotation, and recovery responsibilities are explicit.

## Inventory authentication on every Connect server

Run the supported ADSync command locally on each server:

```powershell
Import-Module ADSync
Get-ADSyncEntraConnectorCredential
Get-ADSyncScheduler
```

`Get-ADSyncEntraConnectorCredential` returns `ConnectorIdentityType` as either `ServiceAccount` or `Application`. Record the application ID when present. `Get-ADSyncScheduler` proves whether the server is active or in staging mode, whether synchronization is enabled, and whether a suspended scheduler could prevent automatic certificate rotation.

Also run the Connect wizard and choose **View or export current configuration**. For an application identity, Microsoft shows the client ID, certificate manager, automatic-rotation state, thumbprint, SHA-256 hash, validity dates, subject, issuer, serial number, and cryptographic provider. A server still using the legacy path shows the account name instead.

Build an inventory with:

- hostname, owner, environment, installed Connect version, Windows version, and database location;
- active or staging state, scheduler state, and last successful import, synchronization, and export;
- `ConnectorIdentityType`, legacy account name or application ID, and application owner;
- certificate manager, store, provider, thumbprint, validity, and next rotation window;
- Password Hash Synchronization, Pass-through Authentication, Seamless SSO, writeback, federation, and custom connector dependencies;
- custom rules, scope, deletion threshold, pending exports, and Connect Health status;
- powered-off, disaster-recovery, and old servers that could be restored; and
- accountable change owner, recovery decision, and Microsoft Support path.

Do not infer estate readiness from the active server alone. A staging host, restored virtual machine, or cold disaster-recovery image can become the active exporter during an incident. If it still depends on the retired authentication model, the failover plan expires with it.

## Choose who owns the application and certificate

The default managed model is the lowest-complexity choice for most deployments. Connect creates the tenant-local application, protects the private key on the server, rotates the certificate through the scheduler, and cleans up old credentials. Your responsibilities remain substantial: protect the host, monitor rotation events, keep the scheduler healthy, review the application's permissions and owners, and prevent accidental deletion.

Choose BYOC when policy requires your organization to issue and control the certificate but the default Connect application is acceptable. Record the issuing system, private-key protection, authorized service identity, renewal lead time, overlap plan, revocation method, and the operator who removes expired credentials.

Choose BYOA only when your organization can govern the complete application lifecycle. Microsoft's procedure requires registering the application and service principal, granting the documented permissions, registering the certificate, giving ADSync access to the private key, switching the connector, validating it, and maintaining that configuration over time. Do not copy a permission list from an old change ticket; use the current tab and cloud-specific instructions on Microsoft's application-identity page.

> **Analysis:** BYOA can improve alignment with an enterprise application-governance model, but it also creates more ways to break synchronization. An expired certificate, removed app role, disabled service principal, ownerless registration, or Conditional Access policy aimed at the wrong application can become a directory-wide outage. Complexity is not a security control unless it is continuously operated.

## Stage the migration without combining unrelated changes

Freeze the synchronization facts before changing authentication. Export the supported Connect configuration, preserve custom synchronization rules and run history, record pending exports, and confirm a recent successful cloud result for a low-risk test object. Microsoft's [upgrade guidance](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-upgrade-previous-version) distinguishes in-place upgrades from swing migrations; use a staging server when the environment's scale or outage tolerance makes in-place repair unacceptable.

Keep these projects separate unless a reviewed plan explicitly joins them:

- upgrading the Connect binaries;
- migrating connector authentication;
- changing application or certificate ownership;
- changing domain, OU, or object scope;
- editing synchronization rules;
- switching active and staging servers; and
- moving from Connect Sync to Cloud Sync, which has its own [guided migration and validation path](/posts/migrate-microsoft-entra-connect-sync-cloud-sync).

For a supported active/staging pair, upgrade and validate the staging server first. Confirm it remains in staging mode, complete the required import and synchronization, and review pending exports. Then migrate its connector authentication and validate the application and certificate without letting it export production changes. The [Connect Sync operational guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-staging-server) documents that staging mode suppresses normal exports, Password Hash Synchronization, and password writeback.

For a single-server deployment, acknowledge that the same host is both the production engine and repair surface. Reserve an outage window, protect the configuration evidence, and define the exact point at which you will use Microsoft's documented rollback to the legacy account. Do not improvise by restoring an old Connect virtual machine that might export stale changes.

## Migrate with the default managed application

After the server is on the current approved build and preflight checks pass:

1. Open the Microsoft Entra Connect wizard on the intended server.
2. Select **Additional tasks**.
3. Select **Configure application-based authentication to Microsoft Entra ID**.
4. Complete the interactive administrator sign-in and follow the wizard prompts.
5. Reopen **View or export current configuration** and confirm the application ID and certificate details.
6. Run `Get-ADSyncEntraConnectorCredential` and confirm `ConnectorIdentityType` is `Application`.
7. Confirm the scheduler returns to the intended enabled and active-or-staging state.
8. Run or wait for a controlled synchronization cycle and validate the cloud result.

New installations use application-based authentication during setup, but Microsoft says existing servers are **not** silently converted in the background. Version 2.6.84.0 also removed silent fallback: if application-authentication setup fails, the wizard stops with an error rather than quietly retaining the legacy account. Treat that failure as useful protection. Preserve the error and correct the certificate, TPM, role, network, or application problem instead of weakening the target design.

Microsoft separates the connector's noninteractive application credential from administrator authorization for configuration changes. Current wizard flows use interactive MSAL or Windows Web Account Manager authentication for cloud writes, while the connector uses its certificate during scheduled synchronization. A working admin prompt does not prove the connector certificate works, and a successful sync does not prove the next administrator can authorize a configuration change.

## Prove production readiness in five evidence layers

### 1. Local identity and certificate

Confirm the local command returns `Application`, the wizard shows the expected application ID, and the certificate has the intended provider and validity dates. For the managed option, record whether the key is TPM-backed or software-protected. Do not export or copy the private key into the change record.

### 2. Engine and scheduler

Confirm the Microsoft Entra ID Sync service is running, the scheduler is in the intended state, the expected connectors and rules remain present, and the latest import and synchronization complete without a new error. On the active server, inspect the export and pending-change count before allowing a broad run.

### 3. Cloud result

Use a preapproved low-risk test object and prove that a controlled attribute or membership change reaches Microsoft Entra. A green local run profile without the correct tenant-side object state is not sufficient.

### 4. Administrative audit evidence

Microsoft Entra Connect 2.4.129.0 and later logs administrator changes to the Windows Application log under the **Entra Connect Admin Actions** source. The [admin-audit reference](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/admin-audit-logging) includes event 2622 for application-authentication configuration, 2623 for certificate rotation, and separate events for deleting the connector account, application, or certificate. Preserve the relevant UTC window and increase Application log capacity if normal activity would overwrite it.

### 5. Health and rotation readiness

Review Connect Health when licensed, local Application events, last-sync time, sync latency, and object errors. Microsoft's application-authentication guide documents warning event **1011** after a certificate consumes at least 70% of its lifetime and error event **1012** after expiry. Confirm the scheduler is not suspended and assign an owner to both events.

The [Connect Health sync guide](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-health-sync) adds service and object-level evidence, but it is not a substitute for the local connector identity, certificate state, and a verified cloud change.

## Remove the legacy account only after the new path is stable

Microsoft strongly recommends removing the legacy DSA account after application-based authentication is working. That is a cleanup step, not the migration test.

Before removal, require:

- `ConnectorIdentityType` is `Application` on the server;
- a complete production synchronization cycle succeeded;
- an approved object change reached the correct tenant target;
- the application, service principal, permissions, and certificate match the documented design;
- certificate rotation ownership and monitoring are assigned;
- active and staging roles are recorded; and
- the rollback decision has an owner and expiry.

Microsoft's procedure uses `Remove-ADSyncAADServiceAccount` for the old account. Follow the current official instructions at execution time because the command requests credentials and the account name must match the actual tenant object. Do not delete a similarly named user manually from the portal, and do not remove the new application because it looks like an unexpected non-Microsoft app.

After cleanup, verify synchronization again and preserve the audit event. Search for dependencies on the old account in monitoring, vaults, service documentation, password-rotation jobs, and emergency runbooks. The absence of a login does not prove the account was unused operationally.

## Test certificate rotation before the deadline becomes an incident

The default managed certificate currently has a 90-day lifetime. Connect checks rotation through the scheduler after 70% of the lifetime has elapsed. If the scheduler is suspended, the check does not run. Microsoft documents events 1011 and 1012 for warning and expiry, plus an Application-log error when Connect cannot remove an old application credential.

For the managed model:

1. record the current certificate ID, provider, validity, and rotation state;
2. confirm the scheduler is enabled on the intended server;
3. monitor the warning and rotation event path before production expiry;
4. verify a new credential appears on the application and becomes the connector's active certificate;
5. prove synchronization after the cutover; and
6. confirm stale credentials are removed without deleting the last usable key.

Microsoft fixed a 2.6.91.0 certificate-rotation defect that could remove the last usable application key during directory replica delays. That is another reason to use the current supported build rather than stopping at the minimum retirement floor.

For BYOC or BYOA, schedule rotation well before expiry. Install and authorize the new certificate, register its public key, switch with the documented `Invoke-ADSyncApplicationCredentialRotation` or application-registration procedure, verify `Get-ADSyncEntraConnectorCredential`, enable the scheduler, prove cloud synchronization, and only then remove the old credential. Revalidate the exact command syntax in the current Microsoft page; do not execute a copied production command with placeholder hashes.

## Troubleshoot by the boundary that failed

### The command still returns `ServiceAccount`

Confirm the server version, ensure you ran the wizard on the intended host, and preserve the setup failure. Microsoft says existing servers are not automatically converted. If the wizard could not configure application authentication, diagnose the explicit error rather than expecting a background sync to finish the change.

### The wizard rejects administrator sign-in

Separate interactive authorization from connector authentication. Verify the operator has the current required role, the server can reach the required endpoints, Windows Web Account Manager is usable for the chosen method, and Conditional Access is not targeting the wrong application or blocking the approved administrative path. Do not create a standing Conditional Access exclusion as a troubleshooting shortcut.

### Application authentication is configured but synchronization fails

Confirm the application and service principal exist and are enabled, the expected certificate is registered and valid, the ADSync service context can use the private key, the connector points to the same application ID, and the required permissions remain granted. Correlate the Connect trace, Windows Application events, and cloud result by UTC time.

On BYOC or BYOA, test certificate signing from the same service context rather than from an administrator session. An administrator being able to open the certificate does not prove ADSync can use its private key.

### Rotation warnings continue

Check `Get-ADSyncScheduler` first. A suspended scheduler prevents the managed rotation check. Then compare the local certificate with the application's registered credentials and review events 1011, 1012, 2623, and any credential-cleanup error. Do not delete certificates until you have identified which key the connector currently uses.

### Sync works but an app-scoped Conditional Access policy begins blocking operations

Microsoft's 2.6.91.0 release note says Microsoft Graph permissions were added to Connect and tells customers with app-scoped Conditional Access policies to review policies targeting **Microsoft.Azure.SyncFabric** or **Microsoft 365 Reporting Service**. Validate the policy target and sign-in evidence. Do not exclude all service principals or disable the policy tenant-wide.

## Rollback, containment, and escalation

Microsoft documents a rollback from application authentication to a recreated legacy service account with `Add-ADSyncAADServiceAccount`. The procedure disables the scheduler, adds the account through an interactive administrator prompt, verifies that `ConnectorIdentityType` returns to `ServiceAccount`, and reenables the scheduler. Microsoft warns that the recreated account can take up to 15 minutes to become effective.

Use that rollback only as a short-lived incident mitigation before April 7, 2027. It returns the server to the authentication method being retired; it is not a durable recovery state. Record an expiry, assign an owner, and schedule the corrected application-authentication migration immediately.

For a staged design, the cleaner recovery boundary is often to keep the old active server exporting while the upgraded, application-authenticated server remains in staging. Do not activate two exporters. If the new server's pending exports or authentication evidence is wrong, preserve the data, leave it in staging, and correct the issue before promotion.

Escalate to Microsoft when the server meets the current version and platform requirements, the supported wizard or command path fails, the application and certificate appear consistent, and authentication still does not produce a successful sync. Provide the tenant ID, server and Connect versions, active or staging state, application ID, sanitized certificate SHA-256 identifier and validity, TPM/provider state, scheduler output, UTC failure window, admin-audit event IDs, setup or trace error, last successful export, and whether another server remains healthy. Never attach passwords, tokens, private keys, full certificate bundles, or an unrestricted configuration export.

## Microsoft Entra Connect application authentication checklist

- [ ] Confirm the April 7, 2027 deadline in the live version history.
- [ ] Inventory active, staging, recovery, powered-off, and legacy Connect servers.
- [ ] Upgrade every in-scope server to the current supported release, not merely 2.6.84.0.
- [ ] Verify TLS 1.2, .NET Framework 4.7.2, Windows, SQL, proxy, and local prerequisites.
- [ ] Use the current least-privilege administrator and installation permissions.
- [ ] Run `Get-ADSyncEntraConnectorCredential` and record `ServiceAccount` or `Application` per server.
- [ ] Export configuration and preserve rules, scope, scheduler state, run history, and pending exports.
- [ ] Prefer the Microsoft-managed application and certificate unless BYOC or BYOA has a documented operating need.
- [ ] Protect the Connect host, ADSync service context, certificate store, application, and service principal as one trust boundary.
- [ ] Migrate the staging server first when a supported active/staging pair exists.
- [ ] Keep binary upgrade, authentication migration, rule changes, scope changes, and Cloud Sync migration as separate variables.
- [ ] Confirm the application ID, certificate provider, validity, and automatic-rotation state after migration.
- [ ] Prove one complete sync cycle and one correct tenant-side object change.
- [ ] Preserve Entra Connect Admin Actions and authentication events.
- [ ] Monitor events 1011 and 1012 and ensure the scheduler is not suspended.
- [ ] Test certificate rotation and old-key cleanup before expiry.
- [ ] Remove the legacy DSA account only after stable production evidence.
- [ ] Treat rollback to `ServiceAccount` as time-bounded incident mitigation, not deadline compliance.
- [ ] Verify every recovery server can authenticate before calling the estate ready.

Microsoft Entra Connect application-based authentication is a security improvement with a firm service deadline. The winning plan is not “run the wizard before April.” It is **current binaries, an application identity on every server, a protected and rotating certificate, explicit administrator authorization, one active exporter, verified cloud changes, and a recovery server that can take over without reviving the retired credential model**.
