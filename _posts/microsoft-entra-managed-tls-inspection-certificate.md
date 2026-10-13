---
title: "Microsoft Entra Managed TLS Inspection Certificate Guide"
excerpt: "Deploy a Microsoft Entra managed TLS inspection certificate safely: distribute trust, pilot inspection, monitor failures, rotate cleanly, and roll back."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-13T17:03:51-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

A **Microsoft Entra managed TLS inspection certificate** lets Microsoft Entra Internet Access create and operate a tenant-specific certificate authority for HTTPS inspection, so you do not have to supply a signing certificate from your own PKI. The feature does not remove the trust rollout: administrators must still download the public root certificate, deploy it to every in-scope device, prove that applications trust it, and only then enable inspection.

Microsoft announced the managed-certificate option as **public preview** in its [October 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). It is not default-on, generally available, or mandatory. The existing customer-managed certificate path remains available.

Grab a coffee before the pilot. A simpler certificate ceremony does not make TLS inspection a low-risk switch. It changes the certificate presented to users and applications, makes encrypted request content available to security controls at Microsoft's service edge, and can break software that pins certificates, requires unsupported protocol behavior, or uses a private trust store.

## Microsoft Entra managed TLS inspection certificate: what changed

The new option changes who creates and operates the certificate authority used by Global Secure Access. Microsoft's [managed-certificate configuration guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-transport-layer-security-settings-managed-certificate) says the service generates a tenant-specific root CA, protects the private key in Microsoft's secure key infrastructure, and does not expose that key to the customer.

The administrator still owns the deployment sequence:

1. create the Microsoft-managed certificate in a disabled state;
2. download its public root CA certificate;
3. distribute that root to the trusted certificate store on pilot devices;
4. enable the certificate;
5. create and link a TLS inspection policy; and
6. prove inspection, bypass, logging, application compatibility, and rollback before expanding scope.

That separation matters. **Certificate creation does not start inspection. Root deployment does not start inspection.** Traffic is inspected only when an active certificate, a TLS inspection policy, an applicable security profile, and acquired Internet Access traffic meet at runtime.

This is a different intent from the site's [Microsoft Entra Internet Access architecture and rollout guide](/posts/microsoft-entra-internet-access-overview), which covers the broader secure-web-gateway design. It is also narrower than the [Microsoft Entra MCP Firewall deployment guide](/posts/microsoft-entra-mcp-firewall-safe-deployment-guide), where TLS inspection is one dependency for seeing MCP messages. Here, the certificate lifecycle itself is the change.

> [!IMPORTANT]
> **Analysis:** managed issuance removes a customer PKI dependency; it does not transfer accountability for device trust, privacy review, inspection scope, exception governance, or outage recovery. Keep those as named workstreams with separate owners.

## Understand the trust and traffic path

Microsoft's [TLS inspection architecture](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-transport-layer-security) terminates an HTTPS session at the Global Secure Access service edge and creates a second TLS session to the destination. The service can then evaluate controls that need more than the destination IP address or Server Name Indication, including full URL and content-based controls, before re-encrypting allowed traffic.

The client no longer receives the destination site's original certificate directly. It receives a dynamically issued leaf certificate in the Global Secure Access chain. Microsoft's [TLS inspection tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection) tells administrators to verify that a test browser shows **Microsoft Global Secure Access Intermediate** as the issuer.

The runtime chain therefore has four independent gates:

1. **Traffic acquisition:** the device or remote network sends eligible Internet traffic through Global Secure Access.
2. **Policy delivery:** the applicable security profile includes the TLS inspection policy.
3. **Certificate trust:** the client application trusts the downloaded managed root CA.
4. **Destination compatibility:** the application and destination tolerate interception and the negotiated protocol is supported.

A green certificate status proves only that the certificate is active. It does not prove that a device received the root, a user received the security profile, a destination was inspected, or the application behaved correctly.

## Confirm licensing, roles, and preview boundaries

For the Internet Access traffic profile, Microsoft documents **Microsoft Entra ID P1 or P2** as a prerequisite plus **Microsoft Entra Internet Access or Microsoft Entra Suite** licensing in the [traffic-forwarding profile reference](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-traffic-forwarding). The managed-certificate preview page separately lists a trial license as a prerequisite for its current procedure. Treat that as a preview gate and confirm what the live tenant exposes before scheduling production work; do not infer entitlement from the presence of another Global Secure Access feature.

Use the least privilege that matches each duty:

- **Global Secure Access Administrator** creates the certificate and configures TLS inspection.
- **Conditional Access Administrator** manages the Conditional Access policy that delivers a custom security profile to users and groups.
- **Reports Reader**, **Security Reader**, or **Security Administrator** can inspect the Global Secure Access audit evidence described in Microsoft's [audit-log guidance](https://learn.microsoft.com/en-us/azure/global-secure-access/how-to-access-audit-logs).

The certificate feature is preview even if the underlying Internet Access subscription is production licensed. Preview means the feature contract, portal, limits, and behavior can change. Record preview acceptance, support ownership, exit criteria, and a date to recheck the documentation.

Microsoft's [current known-limitations page](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-current-known-limitations) lists tenant limits of 100 TLS inspection policies, 1,000 rules, and 8,000 destinations. Its TLS documentation also identifies compatibility boundaries including HTTP/2-only sites, certificate-pinned mobile applications, and TLS 1.3 with Encrypted Client Hello. Do not convert a successful browser test into a claim that every thick client, developer tool, mobile app, or protocol will work.

## Decide whether Microsoft-managed or customer-managed fits

Choose the managed option when the goal is to pilot or operate TLS inspection without creating a subordinate certificate through the organization's own CA. It reduces the steps around CSR generation, signing, chain upload, and service-side private-key handling.

Keep the customer-managed path when organizational policy requires the inspection hierarchy to chain to an existing enterprise CA, when certificate issuance must pass through an established PKI approval process, or when a compliance requirement cannot be satisfied by the documented managed model. Microsoft's [customer-managed TLS inspection tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection) remains the reference for generating a CSR, signing it, and uploading the certificate and chain.

Do not run both models as if they were parallel active authorities. Microsoft currently documents **one active TLS inspection certificate at a time**. Treat a change of authority as a coordinated trust migration, not a portal preference.

Before either model, have privacy, legal, security, endpoint, and application owners review what inspection makes visible. Microsoft's [TLS inspection FAQ](https://learn.microsoft.com/en-us/entra/global-secure-access/faq-transport-layer-security) recommends communicating with users and documents recommended bypass categories for traffic people may consider sensitive or private.

## Build a safe managed-certificate pilot

### Ring 0: inventory the existing control planes

Choose a small pilot group, managed devices, and noncritical Internet destinations. Keep emergency administrators and the change operator outside the pilot Conditional Access scope.

Record:

- Internet Access forwarding-profile state and assignments;
- pilot device platforms, management state, and client versions;
- Conditional Access policy names, modes, exclusions, and recovery owner;
- security-profile and TLS-policy names, links, priorities, and destinations;
- system-generated and recommended bypass rules;
- applications with certificate pinning, mutual TLS, private trust stores, or known proxy restrictions;
- certificate owner, creation time, expected validity, rotation window, and removal criteria;
- expected browser, traffic-log, audit-log, and application evidence; and
- the exact steps that stop inspection without disabling unrelated Internet Access controls.

The root CA has broad trust significance on an endpoint. Store the downloaded public certificate in an approved configuration repository, record its fingerprint through your normal certificate-management process, and distribute it only through managed tooling.

### Ring 1: create the certificate but keep it disabled

Sign in to the Microsoft Entra admin center and browse to **Global Secure Access > Secure > TLS inspection policies > TLS inspection settings**. Select **Create certificate**, choose **Microsoft-managed**, review the lifecycle information, and create it.

Microsoft says the new certificate appears with type **Managed** and status **Disabled**. The documented default root CA validity is 10 years; the API can request a shorter period. A long validity period reduces ceremony frequency but increases the importance of endpoint inventory and revocation planning. Record the actual dates shown in your tenant rather than copying the default into the change record.

Download the public root certificate. Microsoft explicitly says the download does not include the private key.

### Ring 2: distribute trust before enabling inspection

Use the organization's MDM or endpoint configuration system to place the managed root in the correct trusted root store for pilot devices. Microsoft's procedure uses an Intune trusted certificate profile as its example. Do not ask users to import a root certificate manually and do not enable inspection simply because the deployment tool reports success.

Prove the root is present locally. Then test the applications that matter, not only the default browser. Microsoft's [TLS inspection troubleshooting guide](https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-transport-layer-security) notes that tools such as Git and Python can use their own certificate stores instead of the operating-system store. Inventory those runtimes and use their supported enterprise trust mechanism where inspection is approved.

### Ring 3: enable the certificate and scope policy narrowly

After every pilot device trusts the root, enable the managed certificate and confirm that its status becomes **Active**. Create a dedicated TLS inspection policy, retain Microsoft's system-generated bypass rule, and review the recommended privacy-sensitive bypasses rather than deleting them reflexively.

Link the policy to a dedicated security profile. Assign that profile to the pilot through a narrowly scoped Conditional Access policy instead of attaching the first test to the tenant-wide baseline profile. Microsoft's tutorial says a security profile can take up to an hour to take effect after Conditional Access assignment, so distinguish propagation from failure and record the actual delivery time.

Use a non-Microsoft HTTPS destination for the positive test. Microsoft's tutorial notes that most Microsoft application traffic bypasses the Internet Access tunnel, so a Microsoft 365 page is not reliable proof of TLS inspection.

### Ring 4: prove both inspection and bypass

For an inspected destination, verify all of the following:

- the expected Internet traffic rule appears in the Global Secure Access client diagnostics;
- the browser or application shows **Microsoft Global Secure Access Intermediate** as the issuer;
- the page or API completes successfully;
- the expected TLS inspection and downstream security policy apply; and
- the traffic record contains the intended identity, device, destination, action, and time.

Then test a destination covered by a system, recommended, or approved custom bypass. The application should retain its normal destination certificate chain and must not be reported as content-inspected. A bypass that restores connectivity also removes the content visibility that depends on decryption; document the residual risk and the compensating control.

Include negative cases: a device without the root, an identity outside the pilot, a pinned application, a developer tool with a private trust store, and a destination using an unsupported behavior. The expected failure is part of the evidence, not an inconvenience to skip.

## Monitor certificate and policy evidence

Use three evidence layers during the pilot:

1. **Endpoint evidence:** trusted-root presence, effective forwarding rules, presented issuer, application result, and precise UTC test time.
2. **Traffic evidence:** the Global Secure Access traffic record for the identity, device, destination, and policy outcome.
3. **Control-plane evidence:** Entra audit records for certificate, policy, profile, and assignment changes.

Microsoft's [Global Secure Access monitoring overview](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-global-secure-access-logs-monitoring) says traffic logs are retained in the service for 30 days, while Entra audit-log retention varies by license. Export the required evidence through diagnostic settings when the organization's investigation or compliance period is longer.

Treat certificate operations as privileged security events. Microsoft's [network-access security operations guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-security-operations) maps **Create Certificate**, **Update Certificate**, and **Delete Certificate** to TLS inspection certificate changes and recommends monitoring them as high-impact operations. Alert on unexpected actors and preserve the associated policy and endpoint timeline.

> [!IMPORTANT]
> **Analysis:** a TLS inspection certificate is a Tier 0 dependency for the controls that rely on decrypted content. Monitor its creation, activation, rotation, and deletion with the same discipline used for a high-impact Conditional Access or trust-policy change.

## Troubleshoot the first failed boundary

### Every inspected site shows a certificate warning

Stop expansion. Confirm the managed root is on the affected device in the correct machine or user store, that the certificate fingerprint matches the approved deployment artifact, and that the application reads that store. Compare one working pilot device with one failing device before editing policy.

If inspection was enabled before root distribution completed, remove the pilot's inspection assignment or unlink the TLS policy from its security profile while trust catches up. Do not tell users to click through certificate warnings.

### Browsers work, but Git, Python, or another tool fails

Read the application's trust model. Microsoft's troubleshooting page documents `unable to get the local issuer certificate` for tools that maintain a separate CA bundle. Apply the product's supported enterprise CA configuration only if inspecting that traffic is approved. Otherwise, add the narrowest justified bypass and record that the dependent content control no longer sees the flow.

### Only a few mobile or SaaS applications fail

Check certificate pinning, mutual TLS, protocol negotiation, and destination-category rules. Microsoft's TLS concept page warns that many mobile applications pin certificates and recommends pilot testing plus targeted bypasses for incompatible destinations. Its current limitations also say HTTP/2-only sites do not load through inspection, and the FAQ says Encrypted Client Hello is not supported.

Do not disable TLS inspection tenant-wide to fix one application. Capture the destination, process, platform, certificate error, protocol, and policy result, then decide whether the app can use managed trust, requires a narrow bypass, or must stay outside the inspected channel.

### The managed issuer never appears

Confirm the Internet Access forwarding profile is enabled and assigned, the client acquired the destination, the certificate is active, the TLS policy is linked to the intended security profile, the Conditional Access policy targets the test identity, and no higher-priority rule bypasses the destination.

Wait for the documented propagation window, then create a fresh connection to a non-Microsoft HTTPS destination. A cached browser session or a Microsoft 365 destination can produce a false negative.

### Inspection fails after rotation

Microsoft's managed-certificate guide gives a safe rotation order: create the replacement, download and distribute its root, enable the new certificate, validate inspection, and only then delete the old disabled certificate. Do not remove the old root from endpoints until the new chain has passed application testing and the transition is complete.

Because only one certificate can be active, validate that the replacement root reached every in-scope device before activation. Keep both public roots deployed during the transition, then remove the retired root through managed configuration after the rollback window closes.

## Roll back without losing the evidence

Rollback should remove the narrowest new dependency first:

1. remove the pilot assignment or unlink the TLS inspection policy from the pilot security profile;
2. confirm fresh connections are no longer inspected while unrelated Internet Access forwarding still works;
3. preserve endpoint, traffic, audit, policy, and certificate evidence;
4. disable the managed certificate only if no other approved TLS inspection policy depends on it; and
5. remove the trusted root from endpoints only after the certificate is inactive, the investigation is complete, and the change has passed its rollback window.

Do not delete the certificate, policy, profile, or root trust during an active incident merely to make the portal look clean. Those identifiers and timestamps are how the team determines whether the failure came from traffic acquisition, profile delivery, certificate trust, destination compatibility, or content-policy enforcement.

## Administrator checklist

- [ ] Confirm preview acceptance, support owner, success criteria, and rollback authority.
- [ ] Verify Entra ID P1/P2 and Internet Access or Entra Suite licensing in the target tenant.
- [ ] Separate Global Secure Access, Conditional Access, endpoint, privacy, and application duties.
- [ ] Inventory pinned apps, mutual TLS, private CA stores, sensitive categories, and unsupported protocols.
- [ ] Create the Microsoft-managed certificate and confirm it remains disabled.
- [ ] Download, fingerprint, store, and distribute the public root through managed tooling.
- [ ] Prove trust on every pilot device before enabling the certificate.
- [ ] Use a dedicated TLS policy and security profile with narrow pilot assignment.
- [ ] Test inspected, bypassed, excluded, untrusted, pinned, and private-store cases.
- [ ] Verify the presented issuer on a non-Microsoft HTTPS destination.
- [ ] Correlate endpoint, traffic, audit, and application evidence.
- [ ] Alert on unexpected certificate create, update, and delete operations.
- [ ] Rehearse policy unlinking and certificate rollback before expanding scope.
- [ ] Rotate by distributing the replacement root before activating the new certificate.
- [ ] Remove the retired root only after validation and the rollback window.

## FAQ

### Does a Microsoft-managed certificate eliminate endpoint deployment?

No. Microsoft creates and operates the tenant-specific CA, but administrators must download its public root and place it in the trusted root store of every in-scope device before enabling inspection.

### Does creating or downloading the certificate start TLS inspection?

No. The certificate is created disabled. Inspection also requires an active certificate, a TLS inspection policy, a linked and applicable security profile, and traffic acquired by Microsoft Entra Internet Access.

### Can Microsoft Entra keep two TLS inspection certificates active during rotation?

No. Microsoft's current documentation allows one active certificate. Deploy both public roots during the transition, activate the replacement only after trust distribution, validate it, and retain the retired root until the rollback window closes.

### Will TLS inspection cover Microsoft 365 traffic?

Do not use Microsoft 365 traffic as the test. Microsoft says most Microsoft application traffic bypasses the Internet Access tunnel. Validate with a non-Microsoft HTTPS destination that the pilot policy is intended to inspect.

### What belongs in a Microsoft support escalation?

Include the tenant ID, managed certificate name and status, root fingerprint, creation and activation times, client platform and version, forwarding-profile and security-profile IDs, TLS policy and rule priority, Conditional Access result, destination and protocol, presented issuer, traffic and audit record identifiers, UTC failure time, and the smallest reproducible case. Remove secrets and unrelated user data.

## Microsoft sources

- [What's new in Microsoft Entra: October 2026](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460)
- [Configure TLS inspection with a Microsoft-managed certificate](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-transport-layer-security-settings-managed-certificate)
- [What is Transport Layer Security inspection?](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-transport-layer-security)
- [Tutorial: Enable TLS inspection](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection)
- [Transport Layer Security inspection FAQ](https://learn.microsoft.com/en-us/entra/global-secure-access/faq-transport-layer-security)
- [Troubleshoot TLS inspection errors](https://learn.microsoft.com/en-us/entra/global-secure-access/troubleshoot-transport-layer-security)
- [Known limitations for Global Secure Access](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-current-known-limitations)
- [Global Secure Access logs and monitoring](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-global-secure-access-logs-monitoring)
- [Security operations for network access](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-security-operations)
