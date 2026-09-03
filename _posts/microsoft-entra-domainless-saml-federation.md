---
title: "Microsoft Entra Domainless SAML Federation: Admin Guide"
excerpt: "Deploy Microsoft Entra domainless SAML federation safely for B2B guests: validate issuer routing, redemption order, claims, certificates, logs, and rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-03T17:31:00-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra domainless SAML federation lets a workforce tenant accept B2B guests from one external SAML identity provider even when their email domains do not match a domain configured on that provider. Microsoft Entra routes the guest to the partner IdP by its issuer association rather than by email-domain matching. It is generally available, optional, and administrator-configured; Microsoft has not announced a default-on change or mandatory adoption deadline.

The practical use case is a partner, supplier, or customer population whose identities are managed by one SAML IdP but use many email domains—including public domains. The safe deployment is not “tick Domainless and send invitations.” First prove the issuer, audience, claims, signing-certificate lifecycle, tenant-specific application link, redemption order, Conditional Access result, and recovery path with a tiny group of new guests.

Microsoft lists **Domainless SAML IdP federation for workforce tenants** as generally available in its [current Microsoft Entra release notes](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new). The feature began appearing as public preview in the [June 2026 Microsoft Entra release post](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/whats-new-in-microsoft-entra-june-2026/4517885), so older material can still carry the preview label. Current Microsoft Learn guidance and downstream release notes for [Azure Virtual Desktop](https://learn.microsoft.com/en-us/azure/virtual-desktop/whats-new) identify the capability as GA. This guide uses the current GA state.

Grab a coffee. Domainless changes one routing check; it does not remove the guest object, application authorization, Conditional Access, or the operational responsibility for the external IdP.

## How Microsoft Entra domainless SAML federation works

The trust path has two control planes and one runtime handoff:

1. The resource organization creates a SAML identity-provider configuration in its Microsoft Entra workforce tenant.
2. The partner configures Microsoft Entra as a relying party and issues a signed SAML response with the required issuer, audience, persistent NameID, and email claim.
3. The resource tenant marks the SAML IdP as **Domainless**. Microsoft says this disables the email-domain match and uses the issuer URI association for routing.
4. The invitation or application entry point supplies the resource-tenant context. For the documented domainless invitation flow, the redirect URL includes a `domain_hint` whose value matches the configured issuer URI.
5. The partner IdP authenticates the user and posts its assertion to Microsoft Entra.
6. Microsoft Entra validates the federation response, associates the redeemed external identity with a B2B guest object in the resource tenant, evaluates the resource tenant's policies, and issues the token used by the target application.

The site's [federation and token protocol guide](/posts/federation-and-token-protocols-explained-saml-ws-fed-oauth-openid-connect) explains the SAML trust transfer in more depth. The important operator point here is that domainless federation changes **how Entra chooses the external IdP**. It does not make the partner assertion authoritative for application access. The resource tenant still owns the guest object, assignments, groups, Conditional Access policies, access reviews, and final authorization decision.

Microsoft's [SAML/WS-Fed federation overview](https://learn.microsoft.com/en-us/entra/external-id/direct-federation-overview) also draws two hard boundaries:

- Direct SAML/WS-Fed federation between two Microsoft Entra tenants is not supported or recommended; use native Entra-to-Entra B2B collaboration for that case.
- Federation does not replace the B2B guest object in the workforce tenant.

Domainless is specifically documented for a **SAML** IdP. Do not infer that the domainless option makes WS-Fed issuer-routed in the same way merely because both protocols share the broader federation configuration page.

## Decide whether domainless routing is the right model

Use domainless federation when all of these statements are true:

- One external organization operates an IdP that emits SAML 2.0 assertions for its users.
- The users' email domains cannot be represented cleanly as a fixed domain list.
- The partner does not have a Microsoft Entra tenant that should use the native B2B path.
- You can trust one issuer to authenticate every email namespace admitted through this route.
- The resource tenant will continue governing each person as a B2B guest.

Keep domain-bound federation when the partner population has stable, provable domains and domain matching is a useful safety boundary. Use email one-time passcode when a partner has no suitable organizational IdP or has the partially synchronized Microsoft Entra condition that Microsoft calls out as incompatible with this federation model.

The blast radius is easy to underestimate. Microsoft currently permits only **one wildcard IdP per tenant**. Domainless therefore is not a generic multi-partner router. It concentrates issuer-based routing in one identity provider, so the IdP owner, key custody, account lifecycle, email-claim integrity, incident contacts, and termination process must be acceptable for every guest population routed through it.

## Meet the role, billing, and partner prerequisites

Microsoft's [configuration procedure](https://learn.microsoft.com/en-us/entra/external-id/direct-federation) requires a workforce tenant and at least the **External Identity Provider Administrator** role to add or edit the IdP. Use time-bound activation where available and separate the person changing federation from the application owner approving the pilot.

For guest billing, Microsoft Entra External ID uses a monthly-active-user model. The [current External ID pricing guidance](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing) says a workforce tenant must be linked to an Azure subscription for billing and that premium governance or Global Secure Access features can add their own meters. The federation setup page does not list Entra ID P1 or P2 as a prerequisite for creating the SAML IdP; do not confuse that with licenses required by Conditional Access, Identity Governance, or other controls you apply to the guests.

Before touching the resource tenant, obtain these partner-side facts:

- the immutable issuer URI;
- the HTTPS passive sign-in endpoint;
- the metadata URL and its availability expectations;
- the current signing certificate, expiry, rollover process, and emergency contact;
- the persistent NameID source and uniqueness guarantee;
- the email-claim source, verification process, and change controls;
- a nonproduction test identity for every important email-domain pattern;
- the IdP's supported logout, session, MFA, and incident-containment behavior.

For a new workforce federation, Microsoft's current instructions recommend the tenant-specific Microsoft sign-in audience rather than the legacy global audience. The procedure also defines the workforce assertion consumer service and requires a persistent NameID plus the standard email-address claim. Copy those exact values from the live Microsoft page during the change; do not reuse a relying-party configuration from another tenant.

## Build a controlled domainless SAML federation pilot

### Ring 0: preserve the current state

Export the existing identity-provider list, associated domains, certificate expirations, external collaboration settings, redemption order, guest pilot assignments, and relevant Conditional Access policies. Record the partner issuer, metadata URL, certificate thumbprint, tenant ID, target application ID, and business owner in the change ticket.

Do not reuse a production guest as the first test. Microsoft says existing external users retain the authentication method chosen at their original redemption even after federation is added. A fresh guest gives you a clean routing test; an existing guest tests a different scenario.

### Ring 1: validate the partner assertion

Configure the partner relying party against the resource tenant's exact audience and assertion consumer service. Prove that the issuer URI is stable and a valid URI, the SAML signing certificate chains to the key the partner controls, NameID is persistent, and the email claim is present for every pilot identity.

Domainless removes email **domain matching**; it does not make the email claim optional. The current setup procedure still requires the email-address claim. Treat that claim as security-sensitive identity data: if the partner can emit an email it does not authoritatively control, the wildcard route can bind the wrong human to a guest identity.

### Ring 2: create the IdP and select Domainless

In the Microsoft Entra admin center, browse to **Entra ID > External Identities > All identity providers > Custom > Add new > SAML/WS-Fed**. Choose SAML, select **Domainless**, and supply the issuer URI, passive sign-in endpoint, certificate, and metadata URL described in Microsoft's configuration guide.

Provide the metadata URL when the partner can operate it reliably. Microsoft says Entra can automatically renew the signing certificate from metadata; without metadata—or when the certificate is rotated early—you must update the certificate manually. The [Microsoft Graph federation resource reference](https://learn.microsoft.com/en-us/graph/api/resources/samlorwsfedexternaldomainfederation?view=graph-rest-1.0) describes the autorollover process as starting 30 days before the current certificate expires and checking metadata daily when a new certificate is not yet present.

Wait through the documented 5–10 minute policy-propagation interval before starting redemption tests. Record the save and test times in UTC so a propagation delay does not become an unnecessary configuration change.

There is a current known issue on the configuration page: entering an invalid domain name can delete the IdP configuration even if the edit is not saved. Validate any domain value before opening the edit path, keep the exported configuration close, and do not make exploratory edits during a production window.

### Ring 3: set the invitation route deliberately

Use a tenant-specific application or My Apps link so the browser reaches the correct resource tenant. For the documented domainless invitation flow, set the invitation redirect URL with a `domain_hint` equal to the configured issuer URI. A friendly label or email domain is not interchangeable with the issuer value.

For verified-domain B2B collaboration in a workforce tenant, review **Entra ID > External Identities > Cross-tenant access settings > Default settings > Inbound access settings > B2B collaboration > Redemption order**. Microsoft's [redemption-order procedure](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration) uses at least the **Security Administrator** role and lets you place the SAML/WS-Fed IdP above the Microsoft Entra identity provider.

Change redemption order only when the verified-domain scenario requires it. It is a tenant-wide routing control, not an application-local preference. Capture the previous order and test fallback identity providers as well as the new primary path.

### Ring 4: redeem fresh guests and prove policy

Invite two or three new guests representing the real domain diversity. For each identity, record the invitation target, tenant-specific redirect, browser start point, selected IdP, issuer, redemption result, guest object ID, target application, Conditional Access result, and final authorization outcome.

Test more than “the app opened”:

- valid user, expected issuer, expected email, expected app assignment: allowed;
- valid user without the target assignment: authenticated but denied by authorization;
- assertion missing the email claim: rejected;
- wrong audience or issuer: rejected;
- expired or untrusted signing certificate: rejected;
- link without resource-tenant context: documented result, not assumed behavior;
- a pre-existing redeemed guest: unchanged until deliberately reset;
- blocked Conditional Access condition: visible in the resource tenant's sign-in evidence.

Apply Conditional Access to B2B collaboration guests as a separate policy decision. Microsoft's [External ID Conditional Access guidance](https://learn.microsoft.com/en-us/entra/external-id/authentication-conditional-access) says the resource organization manages these policies. Its cross-tenant MFA and device-claim trust settings are described for external **Microsoft Entra organizations**; do not assume a non-Entra SAML IdP's assertion will satisfy those Entra-to-Entra trust settings. Validate the exact MFA experience and recovery path with the pilot.

## Monitor the trust, not just the login screen

Use **Entra ID > Monitoring & health > Sign-in logs** with at least Reports Reader. Microsoft's [sign-in activity field reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details) identifies `b2bCollaboration` as the cross-tenant access type for a B2B guest and records the home and resource tenant identifiers, application, resource, authentication details, status, error information, and applied Conditional Access policies.

For each pilot failure, preserve the UTC timestamp, correlation and request IDs, guest object ID, invited email, identity provider, issuer URI, application and resource IDs, home and resource tenant IDs, cross-tenant access type, authentication details, Conditional Access result, and SAML error. Redact the assertion before sending it to support; it can contain identifiers and personal data.

Monitor the control plane too. Microsoft Entra [audit logs capture administrative changes in the tenant](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/overview-monitoring-health), while the external IdP must retain its own authentication and signing-key audit trail. Alert before certificate expiry, test metadata retrieval, and rehearse an emergency certificate update with both organizations present.

The site's [Conditional Access sign-in log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is useful once the assertion has reached the resource tenant. If the failure is instead an external-object or tenant-resolution problem, use the [AADSTS50020 external user troubleshooting guide](/posts/microsoft-entra-aadsts50020-external-user-sign-in-failures).

## Troubleshoot domainless SAML federation by boundary

### The user never reaches the partner IdP

Confirm the browser is in the resource tenant, the invitation redirect includes the documented issuer-valued `domain_hint`, the domainless IdP exists, and any relevant redemption order prefers external federation. A generic application URL can introduce discovery choices that a tenant-specific test link avoids.

### AADSTS5000819 appears

Microsoft documents `AADSTS5000819` for a missing email claim or an email domain that does not match the configured external realm in the traditional domain-bound model. If it appears in a supposed domainless pilot, verify that the saved IdP is actually domainless, the request routed to that configuration, and the assertion contains the required email claim. Do not “fix” it by adding random domains until you know which federation object handled the request.

### The assertion is rejected after partner authentication

Compare the captured response with the current Microsoft SAML requirements: issuer URI, tenanted audience, assertion consumer service, persistent NameID, email-address claim, signature, certificate, and validity interval. Successful authentication at the partner proves only the first half of the trust path.

### New guests work, but existing guests do not switch

That is expected. Microsoft says federation does not change an existing external user's original authentication method. If a specific user should rebind, use the documented [reset redemption status](https://learn.microsoft.com/en-us/entra/external-id/reset-redemption-status) workflow. It preserves the guest object ID, group memberships, and application assignments while making the user redeem again. Pilot this on one low-impact account before treating it as a bulk migration pattern.

### Authentication succeeds, but the application denies access

Separate federation from authorization. Check the guest object, application assignment, group or access-package membership, entitlement expiration, resource-local permissions, and Conditional Access result. A valid SAML assertion does not grant an app role.

### Sign-in fails around certificate rollover

Check the certificate used to validate the assertion, the IdP metadata URL, retrieval health, publication time of the new key, current certificate expiry, and whether the partner rotated before Entra could discover the new certificate. If metadata was omitted or an early rotation occurred, follow the configuration page's manual certificate update path.

## Roll back without deleting guest access blindly

Microsoft documents how to edit or remove the federation configuration, but deleting it immediately can strand guests who already redeemed against that IdP. Microsoft's removal guidance says those guests can no longer sign in through the deleted federation until their redemption state is reset to another usable identity path.

**Analysis:** use the smallest reversible action that matches the failure. Stop new invitations, restore the previous redemption order if routing is wrong, correct the IdP metadata or certificate if trust validation is wrong, and remove only pilot application assignments if authorization exposure is the concern. Delete the federation only after you have identified every guest bound to it and planned their replacement authentication path.

After rollback, test both a fresh invitation and an already redeemed guest. Preserve the federation, sign-in, and partner IdP evidence before changing the state that produced the failure.

## Domainless SAML federation administrator checklist

- [ ] Confirm current Microsoft sources still list domainless SAML federation for workforce tenants as GA.
- [ ] Verify the partner is not another Microsoft Entra tenant that should use native B2B.
- [ ] Document why fixed domain matching does not fit the partner population.
- [ ] Accept the one-wildcard-IdP-per-tenant blast radius and assign an owner.
- [ ] Link the workforce tenant to an Azure subscription for External ID billing.
- [ ] Use time-bound External Identity Provider Administrator access.
- [ ] Record issuer, HTTPS sign-in endpoint, metadata URL, certificate, audience, ACS, NameID, and email-claim sources.
- [ ] Validate the partner's control of every identity and email namespace it can assert.
- [ ] Export the current federation configuration and redemption order.
- [ ] Create the SAML IdP, select Domainless, and wait for documented propagation.
- [ ] Use a tenant-specific app link and the documented issuer-valued `domain_hint`.
- [ ] Change redemption order only for the verified-domain scenario that needs it.
- [ ] Test new, existing, invalid-claim, invalid-certificate, unauthorized, and CA-blocked cases.
- [ ] Correlate resource-tenant sign-in logs with partner IdP logs.
- [ ] Monitor metadata retrieval and certificate expiry.
- [ ] Pilot reset-redemption before migrating any existing guest.
- [ ] Keep a tested non-federated recovery path for affected guests.

Microsoft Entra domainless SAML federation solves a real B2B problem: one organizational IdP can authenticate users whose email domains are not a useful routing boundary. That flexibility is also the risk. Treat the issuer, signing key, and email claim as a concentrated trust anchor; pilot with new guests; keep resource-tenant policy and authorization intact; and prove the rollback before the wildcard route carries production access.
