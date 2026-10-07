---
title: "Microsoft Entra CBA SID Alignment Deployment Guide"
excerpt: "Pilot Microsoft Entra CBA SID alignment safely. Inventory certificate and user SIDs, stage enforcement, read sign-in evidence, and roll back precisely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-07T09:40:06-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra CBA SID alignment** adds one more identity check to certificate-based authentication: the security identifier inside the user's X.509 certificate must match the SID on that user's Microsoft Entra object. If it does not match, certificate authentication fails—even when the certificate chains to a trusted CA and the existing username binding resolves the user.

That is the short answer. The operational answer is to inventory first, reissue certificates that lack the right SID, and enable the control only after both success and intentional-failure tests pass. The setting is policy-wide for the users already targeted by CBA; Microsoft does not document a separate pilot-group property for SID alignment.

Grab a coffee before changing it. Microsoft added `requireCertificateSidAlignment` to Microsoft Graph **beta** in September 2026. The current [beta CBA configuration resource](https://learn.microsoft.com/en-us/graph/api/resources/x509certificateauthenticationmethodconfiguration?view=graph-rest-beta) says the default is `false`, the value cannot be `null`, and a mismatch blocks CBA. Microsoft also warns that Graph beta APIs are subject to change and are not supported for production applications. This is an administrator-enabled preview control—not general availability, default-on enforcement, a retirement deadline, or an automatic tenant rollout.

## Microsoft Entra CBA SID alignment: what it changes

Microsoft Entra CBA already evaluates several independent boundaries during sign-in:

1. **Method targeting:** the user must be in scope for certificate-based authentication.
2. **Certificate trust:** the chain must terminate at a CA configured in the tenant, and certificate validity and revocation checks must succeed.
3. **Username binding:** a configured certificate field must map to one unique Entra user property.
4. **Certificate authentication binding:** the issuer, subject, or policy OID determines whether the certificate satisfies single-factor or multifactor authentication.
5. **CA scoping, when configured:** the user must be in the group allowed to authenticate through the issuing CA.
6. **SID alignment, when enabled:** the SID carried by the certificate must match the relevant SID stored on the resolved user.
7. **Conditional Access:** the completed authentication must satisfy the controls for the requested resource.

Microsoft's [CBA technical deep dive](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-certificate-based-authentication-technical-deep-dive) documents the certificate-authentication endpoint, TLS client-certificate request, trust and revocation checks, username binding, authentication binding, Conditional Access interaction, and sign-in evidence. SID alignment does not replace any of those checks. It closes a different gap: a certificate that can identify a user through an allowed username field must also carry that user's SID.

> [!IMPORTANT]
> **Analysis:** treat SID alignment as a possession-to-object binding control. Username binding answers “which directory object does this certificate name?” SID alignment adds “does this certificate carry the security identifier of that same object?” The control does not prove that the CA, username binding, CRL, authentication strength, or application policy is otherwise correct.

This is distinct from [Microsoft Entra CBA CA scoping](/posts/microsoft-entra-cba-ca-scoping-safe-rollout). CA scoping pairs an issuing CA with an allowed group. SID alignment compares one certificate SID with one user SID. You can need either control, both controls, or neither, depending on the certificate population and risk model.

## Know which SID Microsoft Entra compares

The beta resource defines two identity paths:

- For a **hybrid user**, Entra compares the certificate SID with the user's on-premises SID attribute.
- For a **cloud-only user**, Entra compares the certificate SID with the user's cloud SID.

Microsoft Graph exposes those user properties as `onPremisesSecurityIdentifier` and `securityIdentifier`. Microsoft's [Entra Kerberos FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/kerberos-faq) documents both retrieval patterns:

```http
GET https://graph.microsoft.com/v1.0/users/{user-id}?$select=securityIdentifier
```

```http
GET https://graph.microsoft.com/v1.0/users/{user-id}?$select=onPremisesSecurityIdentifier
```

For a deployment inventory, request the user ID, UPN, and both SID properties in your approved Graph tooling, then classify the account by source of authority. Do not use the UPN or display name as a substitute for the SID. Do not assume that a cloud-only account has an on-premises SID or that a synchronized account should be checked against its cloud SID.

The certificate can carry the SID in either of the two locations named by Microsoft's beta resource:

- the Security Identifier extension; or
- a SID value in the subject alternative name (SAN) URI.

For Microsoft enterprise CAs, [KB5014754](https://support.microsoft.com/en-us/servicing/os/windows-server/2022/05/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers) documents the noncritical SID extension with object identifier `1.3.6.1.4.1.311.25.2`. For Intune SCEP user certificates, Microsoft's [SCEP profile guidance](https://learn.microsoft.com/en-us/intune/device-configuration/certificates/scep-profiles) documents the URI value `{{OnPremisesSecurityIdentifier}}` and the resulting `tag:microsoft.com,2022-09-14:sid:<value>` format.

Those sources solve different issuance paths. Do not copy the SCEP variable into a PKCS profile or assume a third-party CA emits Microsoft's SID extension. Confirm the exact certificate template, connector, CA product, enrollment path, and resulting leaf certificate for every population.

## Prerequisites and licensing boundaries

Microsoft's [CBA FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/certificate-based-authentication-faq) says CBA itself is included in every Microsoft Entra ID edition. Adjacent controls can have separate licensing: Conditional Access and some PKI-management conveniences are not made free merely because the authentication method is free.

Before a SID-alignment pilot, prove all of the following:

- CBA already succeeds for representative users without SID alignment.
- Trusted root and intermediate CAs are complete in the Entra trust store.
- CRL distribution points are reachable from Microsoft's service and revocation behavior is understood.
- Username bindings resolve each pilot certificate to one intended user.
- Authentication binding rules produce the intended single-factor or multifactor claim.
- The CBA target groups, exclusions, CA scopes, and Conditional Access authentication strengths are documented.
- Each certificate population has an owner, issuance source, renewal process, and revocation owner.
- Each hybrid pilot user has the expected `onPremisesSecurityIdentifier` in Entra.
- Each cloud-only pilot user has a `securityIdentifier`, and the issuing workflow can place that exact value into a supported certificate field.
- Emergency administrators have a tested phishing-resistant method that does not depend on the changed CBA path.

The least-privileged Graph permissions documented for these operations are:

```text
Policy.Read.AuthenticationMethod
Policy.ReadWrite.AuthenticationMethod
```

The first permits the beta read operation; the second permits the update. Global Reader or Authentication Policy Administrator can perform the delegated read. Microsoft's [update reference](https://learn.microsoft.com/en-us/graph/api/x509certificateauthenticationmethodconfiguration-update?view=graph-rest-beta) names Authentication Policy Administrator as the least-privileged built-in role for delegated writes.

Avoid giving a PKI operator permanent Global Administrator merely because PKI and authentication teams must coordinate. Separate certificate issuance, Entra policy approval, sign-in monitoring, and emergency rollback duties.

## Build the SID-alignment inventory before enforcement

Start with the certificate population, not the toggle. A useful inventory row includes:

- user object ID, UPN, source of authority, and account enabled state;
- `onPremisesSecurityIdentifier` for hybrid users or `securityIdentifier` for cloud-only users;
- certificate thumbprint, serial number, issuer, subject, validity dates, and enhanced key usage;
- SID location in the certificate and the decoded SID value;
- certificate delivery path, profile or template ID, connector version, and CA owner;
- current CBA target group, username binding result, authentication binding result, and CA scope;
- applications and platforms where the certificate is used; and
- last successful CBA sign-in plus an approved alternate authentication method.

Do not export private keys. SID values and certificate metadata still deserve controlled handling because they map credentials to identities.

### SCEP-issued certificates

Microsoft's SCEP guidance says the `OnPremisesSecurityIdentifier` variable works for user certificates on Windows, macOS, and iOS and only with the URI SAN attribute. The same page says users must be synchronized from Active Directory to Entra for that documented pattern. Confirm the resulting certificate contains the resolved SID—not the literal template variable—and compare it with the user's current `onPremisesSecurityIdentifier`.

### PKCS-issued certificates

Microsoft's [Intune PKCS profile guidance](https://learn.microsoft.com/en-us/intune/device-configuration/certificates/pkcs-profiles) documents SID-extension support in the Intune Certificate Connector for users synchronized from AD. It also makes an important lifecycle point: connector and registry changes apply to newly issued and renewed certificates. Existing certificates do not magically gain the extension.

Plan reissuance and overlap before enabling Entra enforcement. A connector showing healthy does not prove every active certificate has been renewed with the SID.

### Microsoft enterprise CA and other issuers

KB5014754 documents when an updated Microsoft enterprise CA adds the SID extension to certificates issued from online templates. It also warns that non-Microsoft CA deployments need vendor-specific support or another documented strong mapping. Inventory the actual leaf certificate rather than inferring its contents from CA product or template name.

For cloud-only identities, the sources above do not document an Intune `securityIdentifier` template variable equivalent to the hybrid `OnPremisesSecurityIdentifier` path. **Analysis:** treat cloud-only issuance as a separate readiness gate. If your CA or enrollment system cannot place the user's current cloud SID into one of the two formats Microsoft Entra accepts, do not include that population in a SID-alignment rollout.

## Pilot Microsoft Entra CBA SID alignment safely

### Ring 0: capture the complete current policy

Read the beta configuration before changing anything:

```http
GET https://graph.microsoft.com/beta/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/x509Certificate
```

Preserve the complete response in the approved change record. Record `requireCertificateSidAlignment`, CBA state, targets and exclusions, username bindings, authentication bindings, CA scopes, issuer hints, and CRL validation settings. The [beta GET reference](https://learn.microsoft.com/en-us/graph/api/x509certificateauthenticationmethodconfiguration-get?view=graph-rest-beta) returns the CBA configuration and warns that SDKs use v1.0 by default unless you explicitly use the beta endpoint or beta SDK.

Also capture representative successful sign-ins and the certificate metadata for every issuance path. This baseline separates a new SID mismatch from an existing chain, CRL, username-binding, platform, or Conditional Access problem.

### Ring 1: make the certificates ready while enforcement stays off

Update SCEP, PKCS, Microsoft CA, or vendor issuance so new and renewed pilot certificates carry the correct SID. Reissue a small set, inspect every result, and compare its decoded SID with the relevant Entra user property.

Test those certificates while `requireCertificateSidAlignment` remains `false`. Prove that trust, revocation, username binding, authentication strength, application access, and alternate sign-in still work. This does not prove alignment enforcement, but it removes unrelated defects before the policy change.

### Ring 2: prepare a deliberate positive and negative test

Use at least these cases:

1. **Hybrid match:** a synchronized user presents a certificate whose SID matches `onPremisesSecurityIdentifier`.
2. **Cloud-only match, if supported by the issuer:** a cloud-only user presents a certificate whose SID matches `securityIdentifier`.
3. **Known mismatch:** a controlled test certificate resolves through the existing username binding but contains a different SID.
4. **Missing SID:** a currently valid legacy certificate has neither accepted SID location.
5. **Recovery:** each test user can use an approved alternate method, and an emergency administrator can revert the policy without CBA.

Do not create or modify a production user's certificate to manufacture the negative case. Use a dedicated test identity and certificate path approved by the PKI owner.

### Ring 3: enable the preview control

The beta update API accepts only the properties you intend to change and preserves omitted properties. It also requires the type annotation:

```http
PATCH https://graph.microsoft.com/beta/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/x509Certificate
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.x509CertificateAuthenticationMethodConfiguration",
  "requireCertificateSidAlignment": true
}
```

A successful request returns `204 No Content`. That response proves the write was accepted; it does not prove that cached policy has reached every sign-in path. Re-read the configuration and preserve the returned state.

Microsoft's CBA FAQ says authentication-method policy changes can take **up to one hour** to take effect. Wait through that documented propagation window before diagnosing inconsistent results or repeating the write.

> [!WARNING]
> The property sits on the CBA method configuration, not on a pilot group object. **Analysis:** everyone already in the CBA method's effective scope can be affected when the cached setting takes effect. A safe pilot therefore depends on narrowing and validating the existing CBA target population before enabling SID alignment, not on assuming the new Boolean has its own group targeting.

### Ring 4: prove all outcomes in sign-in evidence

Run the positive, mismatch, missing-SID, and recovery cases from fresh browser sessions. Microsoft's CBA guidance warns that browsers cache the selected certificate; after a failed attempt, close the session before retesting so a cached certificate does not create a false diagnosis.

For each attempt, preserve:

- UTC timestamp, test user object ID, application, device, browser, and correlation ID;
- certificate thumbprint, issuer, serial number, SID location, and decoded SID;
- expected Entra SID property and value;
- sign-in status, error code, failure reason, Authentication Details, and Additional Details;
- Conditional Access result and authentication-strength result; and
- the policy readback and time since the change.

The technical deep dive explains that the certificate request can appear as an **Interrupted** entry during the normal flow and that Additional Details contains certificate information. Do not label every Interrupted event a failure. Correlate the complete sign-in sequence and final resource decision.

Expand only after matching certificates succeed, mismatched and missing-SID certificates fail, alternate methods work, and the evidence distinguishes SID enforcement from other CBA failures.

## Troubleshoot by the first broken boundary

### The property is absent from the response

Confirm the request used the Microsoft Graph **beta** endpoint. The v1.0 resource does not currently document `requireCertificateSidAlignment`. Also confirm the client did not silently force the default v1.0 SDK route. Stop if the tenant or cloud does not return the documented beta property; do not infer its state from a successful CBA sign-in.

### A matching certificate fails

Compare the decoded certificate SID with the correct Entra attribute for that account type. For hybrid users, use `onPremisesSecurityIdentifier`; for cloud-only users, use `securityIdentifier`. Then check source-of-authority changes, object recreation, certificate age, enrollment profile, and whether the certificate contains a SID in one of the two formats Microsoft documents.

If the SID values match, move outward through trust chain, CRL, username binding, authentication binding, CA scoping, client platform, and Conditional Access. [AADSTS50017 guidance](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50017-certificate-based-authentication-failed) shows that certificate validation errors can also come from missing CA certificates and SKI/AKI chain problems. One generic certificate failure is not proof that SID alignment caused it.

### A legacy certificate still succeeds

Check policy readback, the time since the update, and whether the tested sign-in used CBA at all. Confirm the effective user is in CBA scope and the certificate is the one recorded in the test. Wait through the documented cache window, close the browser session, and retry. Do not broaden Conditional Access or remove other CBA controls to make the test easier.

### SCEP or PKCS reissuance did not add the SID

For SCEP, confirm a user certificate profile uses the URI SAN with `{{OnPremisesSecurityIdentifier}}` and that the user is synchronized. For PKCS, confirm the documented connector version and configuration, then verify that the certificate was newly issued or renewed after the change. In both cases, inspect the resulting certificate. A successful profile assignment is not proof of certificate contents.

### Conditional Access reports an authentication-strength failure

SID alignment decides whether the certificate can authenticate the resolved user. Authentication binding decides whether that certificate counts as single-factor or multifactor. Conditional Access authentication strength decides what the resource accepts. Review those layers separately. The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) can help trace the final resource decision without flattening the controls into one error.

## Roll back without undoing certificate readiness

If SID alignment causes an unplanned lockout, use an administrator whose sign-in does not depend on the affected CBA path and set only the new property back to `false`:

```http
PATCH https://graph.microsoft.com/beta/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/x509Certificate
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.x509CertificateAuthenticationMethodConfiguration",
  "requireCertificateSidAlignment": false
}
```

Re-read the policy, record the rollback time, allow for policy-cache propagation, and verify recovery with a fresh session. Do not delete the CBA configuration object: Microsoft's resource documentation says deleting the tenant-customized object restores the default CBA configuration, which is much broader than reversing one Boolean.

Keep correctly issued SID-bearing certificates in place unless the PKI owner identifies a separate problem. Rolling back Entra enforcement does not require removing a valid SID from certificates. Preserve failed sign-ins, policy reads, certificate samples, affected populations, and help-desk timing for the next pilot.

If the documented beta property and observed behavior disagree after propagation, stop expansion and open a Microsoft support case. Include tenant and cloud, UTC window, policy readbacks, sanitized certificate metadata, user object type, expected and certificate SID locations, correlation IDs, sign-in details, and the issuance path. Never include private keys or access tokens.

## Microsoft Entra CBA SID alignment checklist

- [ ] Confirm `requireCertificateSidAlignment` remains documented in Graph beta
- [ ] Record that the control is preview, opt-in, and defaults to `false`
- [ ] Export the complete current CBA configuration
- [ ] Inventory every user certificate issuance path in CBA scope
- [ ] Compare hybrid certificate SIDs with `onPremisesSecurityIdentifier`
- [ ] Compare cloud-only certificate SIDs with `securityIdentifier`
- [ ] Prove the certificate contains the SID extension or supported SAN URI value
- [ ] Reissue legacy certificates before enforcement
- [ ] Keep emergency and pilot recovery methods independent of CBA
- [ ] Test matching, mismatched, missing-SID, and recovery cases
- [ ] Use the beta endpoint explicitly and preserve the policy readback
- [ ] Allow up to one hour for authentication-policy cache propagation
- [ ] Correlate the entire sign-in sequence, not one Interrupted event
- [ ] Roll back only `requireCertificateSidAlignment` when that control is the cause
- [ ] Recheck Microsoft documentation before each wider rollout ring

Microsoft Entra CBA SID alignment can make a valid certificate harder to redirect to the wrong identity object, but the Boolean is the last step, not the first. Build the user-to-SID-to-certificate inventory, repair issuance, prove a controlled mismatch is denied, and keep rollback narrower than the authentication method. That is how a promising preview control becomes a defensible pilot instead of a tenant-wide certificate mystery.

## Microsoft sources

- [September 2026 Microsoft Graph updates](https://learn.microsoft.com/en-us/graph/whats-new-overview#september-2026-new-in-preview-only)
- [CBA configuration resource in Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/resources/x509certificateauthenticationmethodconfiguration?view=graph-rest-beta)
- [Get the CBA configuration with Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/x509certificateauthenticationmethodconfiguration-get?view=graph-rest-beta)
- [Update the CBA configuration with Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/x509certificateauthenticationmethodconfiguration-update?view=graph-rest-beta)
- [Set up Microsoft Entra certificate-based authentication](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-certificate-based-authentication)
- [Microsoft Entra CBA technical concepts](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-certificate-based-authentication-technical-deep-dive)
- [Microsoft Entra CBA FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/certificate-based-authentication-faq)
- [Intune SCEP certificate profile guidance](https://learn.microsoft.com/en-us/intune/device-configuration/certificates/scep-profiles)
- [Intune PKCS certificate profile guidance](https://learn.microsoft.com/en-us/intune/device-configuration/certificates/pkcs-profiles)
- [KB5014754 certificate-based authentication changes](https://support.microsoft.com/en-us/servicing/os/windows-server/2022/05/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers)
- [AADSTS50017 certificate validation troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50017-certificate-based-authentication-failed)
- [Microsoft Entra Kerberos FAQ for user SID properties](https://learn.microsoft.com/en-us/entra/identity/authentication/kerberos-faq)
