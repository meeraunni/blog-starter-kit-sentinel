---
title: "AADSTS700027 Invalid Client Assertion: Microsoft Entra Fix"
excerpt: "Fix AADSTS700027 invalid client assertion errors by checking the app, certificate thumbprint, private key, JWT claims, rotation, and sign-in evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-27T17:08:24-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS700027 invalid client assertion** error means Microsoft Entra received a certificate-backed client assertion but could not validate its signature for the application. The dependable fix is to prove that the request uses the intended client ID and tenant, the app registration contains the matching public certificate, the workload can access the corresponding private key, and the assertion header, claims, signature algorithm, and validity window match Microsoft's requirements.

Grab a coffee and preserve the complete response before rotating anything. Microsoft's central error reference describes AADSTS700027 as a client-assertion signature validation failure caused by missing or incorrect authentication parameters. Its current certificate guidance narrows the practical checks to the registered certificate, runtime certificate source, private-key access, validity dates, and thumbprint. ([Microsoft Entra authentication error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [Microsoft.Identity.Web certificate troubleshooting](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates#troubleshoot-certificate-errors))

This guide is for Entra administrators and application owners troubleshooting a daemon, service, web application, automation, or other confidential client that authenticates with an X.509 certificate. It does not require exposing a private key or replacing the app registration.

## AADSTS700027 invalid client assertion: the short answer

Work through these checks in order:

1. Capture the complete error description, UTC timestamp, request ID, correlation ID, client ID, authority tenant, resource, deployment, and last successful time. Never capture the full assertion or private key.
2. Resolve the request's `client_id` to the intended app registration in the tenant that received the token request.
3. Compare the certificate registered under **Certificates & secrets** with the certificate the failing process actually loaded: thumbprint, subject, issuer, serial number, start time, and expiration.
4. Confirm the workload has the matching private key and that its runtime identity can read it. A public `.cer` file alone cannot sign an assertion.
5. If the application constructs the assertion, verify the `alg`, `x5t#S256`, `aud`, `iss`, `sub`, `jti`, `nbf`, `iat`, and `exp` values against Microsoft's certificate-credential format.
6. Check clock synchronization, certificate validity, stale configuration, Key Vault version selection, certificate-store path, file permissions, and deployment drift.
7. If rotation is required, register the new public certificate first, deploy the matching private key to one canary, validate token acquisition, then remove the old certificate only after every instance has moved.
8. Confirm the controlled retest in service-principal sign-in logs and preserve application-management audit events.

The order matters. AADSTS700027 is an **application-authentication** failure at the token endpoint. Granting API permissions, approving consent, changing a user's MFA method, or weakening Conditional Access cannot make an invalid signature valid.

## Understand what Entra validates

With certificate authentication, the workload does not send the private key to Microsoft Entra. It uses the private key locally to sign a short-lived JWT client assertion. The app registration holds the public certificate material that Entra uses to identify the key and verify that signature. Microsoft documents this as the OpenID Connect `private_key_jwt` client-authentication pattern. ([application authentication certificate credentials](https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials), [application and workload authorization architecture](https://learn.microsoft.com/en-us/entra/architecture/authorize-applications-resources-workloads))

The normal path is:

```text
private key in workload
        -> signs JWT client assertion
        -> token request carries client_id and client_assertion
        -> Entra resolves the app registration
        -> Entra finds the registered public certificate
        -> Entra validates header, claims, dates, and signature
        -> access token can be issued
```

That separates AADSTS700027 from nearby errors:

- **AADSTS700016** means the client application could not be found in the target directory. Use the [AADSTS700016 application-not-found guide](/posts/aadsts700016-application-not-found-microsoft-entra).
- **AADSTS7000215** is a client-secret validation failure, not a certificate-signature failure. Use the [AADSTS7000215 invalid-client-secret guide](/posts/aadsts7000215-invalid-client-secret-microsoft-entra).
- **AADSTS700025** means a public client incorrectly presented a `client_assertion` or `client_secret`.
- **AADSTS65001** is a permission-consent failure after Entra reaches a different authorization boundary.
- A local error such as **certificate not found**, **keyset does not exist**, or **Key Vault access denied** can stop the process before it sends an assertion. Diagnose the local certificate source first when no AADSTS response exists.

Read the entire error description. The same top-level AADSTS700027 code can be accompanied by useful reason text about a missing key, expired key, or invalid signature. A wrapper that returns only `invalid_client` throws away the best evidence.

## Step 1: preserve evidence safely

Record these fields before changing either side of the trust:

- complete sanitized error code and description;
- UTC timestamp, request ID, and correlation ID;
- Application (client) ID and token authority;
- requested resource or scope;
- deployment environment, region, slot, host, release, and instance;
- certificate source, such as Key Vault, Windows certificate store, file, or hardware-backed store;
- certificate thumbprint, subject, issuer, serial number, `NotBefore`, and `NotAfter` values;
- last successful time and first failed time;
- recent certificate, app-registration, vault, deployment, or clock changes;
- whether every instance fails or only one ring, region, or host.

Do not paste a private key, `.pfx` or `.p12` file, certificate password, access token, or complete client assertion into a ticket, log, decoder website, chat, or terminal transcript. The JWT header and payload may be decoded locally when necessary, but the full assertion includes a reusable signature during its short lifetime. If private key material was exposed, handle it as a credential compromise and rotate it through the controlled procedure below.

Impact pattern is useful evidence. If one region succeeds and another fails, Entra can validate at least one certificate path. Compare effective certificate versions, store locations, process identities, and deployment configuration. If every instance failed at the same time, investigate expiration, removal of the registered key, a shared vault change, or a common clock or deployment event.

## Step 2: prove the application and tenant

Do not rotate a certificate for an application identified only by display name. Compare the failed request's `client_id` with the **Application (client) ID** on the app registration, then verify the tenant segment in the token endpoint:

```text
https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
```

For a read-only Microsoft Graph PowerShell inventory:

```powershell
$clientId = "00000000-0000-0000-0000-000000000000"

Connect-MgGraph -Scopes "Application.Read.All"

$application = Get-MgApplication -Filter "appId eq '$clientId'"
$application | Select-Object Id, AppId, DisplayName, SignInAudience
$application.KeyCredentials |
    Select-Object DisplayName, KeyId, Type, Usage, StartDateTime, EndDateTime
```

`AppId` is the client ID used by the token request. `Id` is the tenant-local application-object ID used for administration. `KeyId` identifies a registered key credential; it is not a certificate thumbprint and it is not a private key. Microsoft Graph models each key credential with its own key ID, start and end times, type, usage, and optional custom key identifier. ([Microsoft Graph keyCredential resource](https://learn.microsoft.com/en-us/graph/api/resources/keycredential?view=graph-rest-1.0), [get an application with Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0))

If the client ID belongs to another app or the authority points at the wrong tenant or cloud, stop. A valid signature made with app A's private key cannot authenticate app B, and a certificate registered in one app's home tenant does not repair a request routed to the wrong application context.

## Step 3: compare the registered and runtime certificates

In **Microsoft Entra admin center > Entra ID > App registrations > the verified application > Certificates & secrets > Certificates**, record the visible thumbprint, start date, expiration date, and description. Microsoft documents that uploading a certificate displays its thumbprint and validity dates and that the `keyCredentials` collection can contain multiple certificates. ([register a certificate credential](https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials#register-your-certificate-with-microsoft-identity-platform))

Now inventory the certificate the failing process actually loads. On Windows PowerShell, for example:

```powershell
$thumbprint = "REPLACE_WITH_EXPECTED_THUMBPRINT"

Get-ChildItem Cert:\LocalMachine\My |
    Where-Object Thumbprint -eq $thumbprint |
    Select-Object Subject, Issuer, SerialNumber, Thumbprint,
                  NotBefore, NotAfter, HasPrivateKey
```

Use `Cert:\CurrentUser\My` instead when the application's configuration intentionally targets the current-user store. Microsoft specifically calls out store-path mismatches such as `CurrentUser/My` versus `LocalMachine/My`, hidden characters in thumbprints, wrong Key Vault names, missing files, and stale paths as common certificate-loading failures. ([Microsoft.Identity.Web certificate sources](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates#certificate-sources), [certificate error troubleshooting](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates#common-errors))

Compare at least:

- certificate thumbprint shown by the portal or certificate store;
- SHA-256 certificate thumbprint used for the assertion's `x5t#S256` header;
- subject, issuer, and serial number;
- validity dates in UTC;
- certificate source and version;
- presence of a private key at runtime;
- client ID and environment bound to that certificate.

Do not compare only the friendly name. Two certificates can share a subject or display name while containing different public keys. Likewise, copying a new public certificate to the app registration does not move the matching private key into a workload, and deploying a new private key does not register its public half with Entra.

## Step 4: prove private-key access before blaming Entra

The application needs the private key to create a valid signature. A `.cer` or public `.pem` is enough for Entra's app registration but not enough for the workload. Microsoft explicitly says to upload only the public certificate to the registration and to keep the private key secured and accessible only to the application. ([Microsoft.Identity.Web certificate registration](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates#register-the-certificate-with-microsoft-entra-id))

Check the runtime boundary:

- **Windows service or IIS:** verify the process identity can read the private key and that the certificate lives in the configured user or machine store.
- **Azure Key Vault:** verify the configured vault URL and certificate name, the selected version, network reachability, and the workload identity's access. Microsoft.Identity.Web needs certificate and secret read access because Key Vault stores the private key as a linked secret.
- **Container or Linux host:** verify the expected file is mounted at the runtime path, contains the private key when required, and has permissions limited to the application identity.
- **CI/CD or environment variable:** verify the deployed value is the intended version and was not truncated or given literal quoting or newline characters. Base64 encoding does not make a private key nonsecret.
- **Hardware-backed key:** verify the process can reach the provider and perform the signing operation after restart, failover, or credential renewal.

There is an important diagnostic distinction. If the application cannot find or read the private key, the authentication library may fail locally with a cryptographic, file, or Key Vault exception and never call the token endpoint. If Entra returns AADSTS700027, an assertion reached Entra but did not validate. Preserve both layers of evidence rather than assuming every certificate incident has the same network path.

## Step 5: validate the JWT assertion format

Prefer MSAL or Microsoft.Identity.Web to construct the assertion. If the application builds it directly, compare it with Microsoft's documented format.

The protected header should contain:

- `alg` set to `PS256`;
- `typ` set to `JWT`;
- `x5t#S256` set to the base64url-encoded SHA-256 thumbprint of the certificate's DER encoding.

The payload should contain:

- `aud` equal to the token endpoint receiving the assertion;
- `iss` equal to the application's client ID;
- `sub` equal to the same client ID;
- a unique `jti`;
- `nbf` and `iat` values representing the current issuance window;
- a short `exp` window. Microsoft's format guidance recommends no more than roughly five to ten minutes after `nbf`.

The signature must use the private key corresponding to the registered public certificate and PSS padding. The token request must send the fixed `client_assertion_type` value `urn:ietf:params:oauth:client-assertion-type:jwt-bearer` and the signed JWT as `client_assertion`. ([certificate assertion header and claims](https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials#assertion-format), [using a client assertion](https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials#using-a-client-assertion))

Common construction failures include:

- using the traditional hexadecimal thumbprint as the literal `x5t#S256` value instead of the documented base64url-encoded SHA-256 value;
- signing with one certificate while advertising another certificate identifier in the header;
- setting `iss` or `sub` to the application object's directory ID instead of the Application (client) ID;
- using an audience for a different tenant, cloud, token version, or endpoint;
- reusing a `jti` or caching an assertion past its intended lifetime;
- generating `nbf`, `iat`, or `exp` from a host with incorrect time;
- using a signing algorithm or padding mode that does not match Microsoft's format;
- sending a federated workload assertion as though it were a locally certificate-signed assertion, or the reverse.

Decode only the header and payload in an approved local tool. Do not submit production assertions to public JWT websites. Check identifiers and times, then discard the captured material according to your incident-data policy.

## Step 6: check validity, time, and rotation state

Three clocks matter: the certificate's `NotBefore` and `NotAfter` dates, the assertion's `nbf` and `exp`, and the system clock on the signing host. A newly issued certificate can fail if it is not valid yet. An otherwise correct assertion can fail if the signer is materially ahead or behind. An expired certificate can produce AADSTS700027 reason text stating that the key was expired. ([certificate-expiration troubleshooting](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates#certificate-expired))

Then examine rotation state on both sides:

- Is the new public certificate registered on the correct app?
- Is the workload configured for the matching private-key version?
- Did a vault renewal create a new version while a long-running process cached the old certificate?
- Was the old registration removed before every instance changed?
- Is one deployment ring pinned to an earlier vault version or thumbprint?
- Did renewal preserve the subject name but change the public key, making a friendly-name comparison misleading?

Microsoft.Identity.Web can be configured with multiple certificates and uses the first valid one it finds. Microsoft's rotation procedure is deliberately overlap-based: create the new certificate before expiry, register it alongside the old certificate, deploy it, confirm use, and remove the old certificate last. Its Key Vault guidance also warns that long-running processes may cache a certificate and need a periodic refresh or a new confidential-client instance before they pick up the new version. ([certificate rotation](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates#certificate-rotation), [Key Vault automatic rotation](https://learn.microsoft.com/en-us/entra/msidweb/authentication/certificates#automatic-rotation-with-azure-key-vault))

## Step 7: rotate safely when replacement is necessary

Use this sequence when the certificate is expired, compromised, missing, or demonstrably mismatched:

1. Identify every workload instance, deployment, owner, app ID, certificate source, and dependent resource.
2. Generate or obtain a replacement certificate through the approved process. Keep the private key in its protected source.
3. Add the new **public** certificate to the verified app registration while the old certificate remains registered.
4. Deploy the matching private key and configuration to a nonproduction instance or one canary.
5. Acquire a token through the application's normal library, tenant, and resource path.
6. Confirm the new successful service-principal sign-in and its credential evidence.
7. Roll the new certificate through the remaining instances and watch for requests still using the old path.
8. Remove the old key credential only after all consumers have moved and the rollback window is closed.
9. Confirm the removal in audit logs and run one final application-level test.

The Microsoft Entra **Renew expiring application credentials** recommendation follows the same add, deploy, validate, remove order and advises using sign-in logs to validate the new key or certificate thumbprint before removing the old credential. The recommendation is currently documented as preview and appears when an app-registration credential is within 30 days of expiry. ([renew expiring application credentials](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/recommendation-renew-expiring-application-credential))

Do not replace the entire `keyCredentials` collection casually with an update command. The collection is multi-valued, and an unreviewed replacement can delete certificates still used by other instances. Microsoft Graph's `addKey` and `removeKey` operations support controlled key rollover; `addKey` also requires proof of possession of an existing valid key, so applications with no valid existing certificate cannot use that action for self-service recovery. ([Microsoft Graph addKey](https://learn.microsoft.com/en-us/graph/api/application-addkey?view=graph-rest-1.0))

## Step 8: read the sign-in and audit evidence

For app-only token requests, use **Entra ID > Monitoring & health > Sign-in logs > Service principal sign-ins**. Microsoft defines these as nonuser sign-ins where an application or service principal presents a credential such as a certificate or secret. Events with the same service principal, status, IP address, and resource can be grouped, so expand the row and match the exact timestamp. ([service-principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins))

Preserve:

- application and service-principal IDs;
- resource and resource-tenant IDs;
- status, error code, and complete failure reason;
- client credential type and key evidence when present;
- IP address, timestamp, request ID, and correlation ID;
- the successful event produced by the canary retest.

Then review **Audit logs** with the `ApplicationManagement` category around the first failure and every repair. Microsoft's application security-operations guide classifies credentials added to existing applications as high-risk changes and identifies the relevant application and service-principal update activities. Unexpected credential additions deserve investigation even when they restore service. ([security operations for applications](https://learn.microsoft.com/en-us/entra/architecture/security-operations-applications#application-credentials))

If no service-principal event appears, verify the tenant, time range, grouped rows, retention window, role, and whether the client failed locally before contacting Entra. Absence from one portal view is not proof that no request occurred.

## Do not fix the wrong control plane

These actions do not repair AADSTS700027:

- **Do not grant admin consent.** Consent controls API authorization after client authentication.
- **Do not change API permissions.** A bad signature fails before the requested application permissions can matter.
- **Do not disable Conditional Access.** A certificate-signature mismatch is not an AADSTS53003 policy decision.
- **Do not reset a user's password or MFA methods.** An app-only certificate flow has no user credential in the request.
- **Do not upload the `.pfx` to Entra.** The app registration needs the public certificate; uploading private-key material creates unnecessary exposure.
- **Do not create a replacement app registration.** A new registration changes the client ID, service-principal relationships, permissions, owners, policies, and operational history.
- **Do not delete every certificate before testing the replacement.** That removes rollback and guarantees an outage for any instance still using the old key.
- **Do not decode the assertion on a public website.** The diagnostic convenience is not worth exposing production authentication material.

If token acquisition succeeds after the repair but the API returns `401` or `403`, the client-authentication boundary is working. Move to access-token audience, application permissions, admin consent, resource authorization, assignment, and workload Conditional Access instead of reopening the certificate repair.

## Improve the credential design after recovery

A certificate is safer than a copied password credential, but it still has private-key storage, rotation, expiry, and ownership requirements. Microsoft's application-registration guidance recommends managed identity for suitable Azure-hosted workloads, a trusted external platform identity through workload identity federation when supported, and certificate credentials when those passwordless patterns are not viable. ([application registration security best practices](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices-for-app-registration#credentials-including-certificates-and-secrets))

Use this preference order:

1. **Managed identity** for an eligible Azure-hosted workload. Azure manages the credential lifecycle.
2. **Workload identity federation** for supported external environments such as GitHub Actions and Kubernetes. The workload exchanges a trusted platform assertion without storing a long-lived Entra secret or certificate. Use the [federated identity credentials guide](/posts/microsoft-entra-federated-identity-credentials-workload-identity) for the migration model.
3. **Certificate credential** when the workload can securely protect, inventory, and rotate its private key.
4. **Client secret** only when safer options are not currently possible, with governed lifetime, secure storage, ownership, overlap rotation, and monitoring.

Monitor application-credential additions, long lifetimes, failed app-only sign-ins, owners, and expiry. Do not leave emergency certificates attached indefinitely. An unused credential is still an authentication path.

## AADSTS700027 administrator checklist

- [ ] Capture the complete error, UTC time, request ID, correlation ID, client ID, tenant, resource, and deployment.
- [ ] Resolve the client ID to the exact app registration.
- [ ] Confirm the token endpoint uses the intended tenant and cloud.
- [ ] Inventory registered key credentials without exposing private material.
- [ ] Compare the registered and runtime certificate thumbprints, serial numbers, validity dates, and sources.
- [ ] Confirm the runtime certificate has the matching private key.
- [ ] Confirm the process identity can access the key or Key Vault version.
- [ ] Validate `alg`, `x5t#S256`, `aud`, `iss`, `sub`, `jti`, `nbf`, `iat`, and `exp` when the assertion is custom-built.
- [ ] Verify host time synchronization and certificate validity.
- [ ] Register a replacement public certificate before deploying its matching private key.
- [ ] Test one canary before broad rollout.
- [ ] Confirm success in service-principal sign-in logs.
- [ ] Preserve application-management audit events.
- [ ] Remove the old credential only after all consumers migrate.
- [ ] Plan managed identity or workload identity federation where supported.

## Frequently asked questions

### Does AADSTS700027 mean the certificate is expired?

It can, and Microsoft's certificate troubleshooting shows an expired key as one AADSTS700027 form. But the code is broader: the registered key can be missing, the assertion can advertise the wrong certificate, the private key can mismatch, or the assertion format and signature can be invalid. Use the complete reason text and compare both sides.

### Why does the certificate work on one server but not another?

The servers usually differ in certificate-store location, private-key permissions, vault version, file mount, cached certificate, configuration override, system time, or client and tenant pairing. Compare effective runtime state, not only the deployment manifest.

### Is the certificate thumbprint the same as the key ID?

No. A key credential has a GUID `keyId`, while certificate identifiers include thumbprints derived from certificate bytes. The assertion format specifically uses a base64url-encoded SHA-256 thumbprint in `x5t#S256`. Keep those identifiers distinct during diagnosis.

### Should I remove the old certificate as soon as the new one is uploaded?

No. Upload the new public certificate, deploy the matching private key to a canary, prove the new sign-in and application function, migrate every instance, then remove the old credential after the rollback window.

The useful mental model is **client ID, tenant, registered public key, runtime private key, assertion header, claims, time, then evidence**. Follow that chain and AADSTS700027 becomes a bounded cryptographic configuration incident rather than a reason to recreate the application or relax unrelated security controls.
