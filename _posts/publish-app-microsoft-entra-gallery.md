---
title: "How to Publish an App to the Microsoft Entra Gallery"
excerpt: "Publish a new app to the Microsoft Entra Gallery with self-service SAML, OIDC, and SCIM validation, submission controls, and review-ready evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-20T17:10:25-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To **publish an app to the Microsoft Entra Gallery**, create a new Gallery submission, validate every identity capability you plan to advertise, attach the resulting evidence, complete the publisher and customer-support information, and submit the package for Microsoft review. Passing self-service validation does not publish the app by itself, and submitting the package does not make the app immediately available to customers.

Microsoft announced the new self-service onboarding experience as a **public preview on September 17, 2026**. It is for new App Gallery applications. It gives independent software vendors a guided workflow in the Microsoft Entra admin center to create a submission, associate SAML, OpenID Connect (OIDC), and provisioning validation results, upload documentation and logos, track review status, and respond to feedback. Existing Gallery listings still use Microsoft's separate update or removal processes. ([Public-preview announcement](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/public-preview-of-self-service-onboarding-for-new-microsoft-entra-app-gallery-ap/4557199), [self-service publishing guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/publish-app-gallery))

Grab a coffee before opening the wizard. The portal work is the short part. The durable work is proving that the identity integration is safe for another tenant to instantiate, operate, rotate, troubleshoot, and eventually decommission.

## How to publish an app to the Microsoft Entra Gallery

Use this order:

1. choose the exact capabilities you will publish: SAML SSO, multitenant OIDC SSO, or SSO plus SCIM user provisioning;
2. establish a nonproduction tenant, test identities, support owners, public documentation, and your Partner One ID;
3. create and save the Gallery submission to obtain its Submission ID;
4. validate each selected capability against the integration that will actually ship;
5. save the validation evidence and fix every blocking result;
6. complete the application, publisher, privacy, terms, support, documentation, and logo fields;
7. perform an internal security and operations review;
8. submit the package for Microsoft review; and
9. track the submission through review, preview, and publication without creating a duplicate submission.

That sequence matters. Microsoft's OIDC and SAML validators require a valid Gallery Submission ID before their results can be submitted. The publishing workflow, in turn, requires passed validation for every capability included in the listing. Self-service validation and self-service publishing are two connected but separate control planes. ([publishing guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/publish-app-gallery), [OIDC validation guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-oidc-multitenant-app-gallery), [SAML validation guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-saml-single-sign-on-app-gallery))

### What the Gallery creates—and what it does not

An application registration is the application's definition in its home tenant. A service principal is the local security identity for that application in a particular customer tenant. A multitenant application can therefore have one application object in the publisher's home tenant and a service principal in every tenant where it is used. That local service principal carries tenant-specific assignments, permissions, policies, and other configuration. ([application and service-principal model](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals))

The Gallery adds a discoverable, preintegrated onboarding template around supported identity capabilities. It does not transfer ownership of the publisher's application, approve every permission request forever, operate the publisher's SCIM endpoint, or remove the customer administrator's responsibility to review consent and configuration.

> **Analysis:** treat the Gallery package as a versioned product interface, not a marketing card. A redirect URI, tenant endpoint, claim-matching rule, SCIM authentication flow, or public setup document can be just as operationally important as the application binary.

## Decide the integration scope before you create the submission

The self-service publishing experience offers **Single Sign-On** and **Single Sign-On + User Provisioning** as capability choices. Only select a capability that is implemented, tested, documented, and ready for customers. If SSO and provisioning are both selected, Microsoft requires validation evidence for both. ([publishing guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/publish-app-gallery#select-the-capabilities-to-publish))

Use this decision model before anyone starts collecting screenshots:

- **SAML 2.0 SSO:** use it when the application is a SAML service provider. Preserve a non-gallery enterprise app, test user, expected Entity ID and reply URL, certificate and claim validation, and every supported sign-in path.
- **Multitenant OIDC SSO:** use it when the SaaS app uses Microsoft identity platform v2 endpoints. Preserve the public sign-in URL, multitenant configuration, v2 authorization flow, redirect URIs, scopes, claims, and user-matching declaration.
- **SCIM provisioning:** use it when Microsoft Entra should create, update, disable, and optionally manage group membership in the application. Preserve the SCIM 2.0 user endpoint, authentication, schema discovery, matching, lifecycle behavior, throughput result, validation run, and public operator documentation.

Do not advertise provisioning because the application has a partially working `/Users` endpoint. Do not advertise OIDC because one developer tenant can sign in. Gallery onboarding evaluates a product integration that customer tenants must be able to reproduce.

### Shared prerequisites

Microsoft's current prerequisites require a production-ready application, engineering and support contacts, public customer documentation, test tenant and test accounts, participation in the Microsoft AI Cloud Partner Program, and the Partner One ID of the organization that will appear as publisher. Documentation should state supported protocols, versions, SKUs, licensing, required roles, configuration and testing steps, troubleshooting information, and support options. ([Gallery validation and publishing prerequisites](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/v2-howto-app-gallery-listing))

Assign owners before validation:

- **identity engineering owner:** SAML or OIDC configuration, claims, consent, signing keys, and tenant model;
- **provisioning owner:** SCIM contract, matching attributes, lifecycle semantics, throttling, authentication, and credential rotation;
- **security owner:** threat model, permissions, immutable identifier strategy, secrets or certificates, logging, and incident response;
- **documentation owner:** public configuration, license, role, troubleshooting, and support material;
- **release owner:** Submission ID, Test IDs, portal state, evidence retention, and Microsoft feedback; and
- **support owner:** customer escalation, status communications, and post-publication defects.

One person can fill several roles. The point is that every boundary has an accountable owner before a review comment starts bouncing between teams.

## Create the Gallery submission and preserve its identity

In the Microsoft Entra admin center, browse to **Identity > Applications > Enterprise applications**, open **Browse Microsoft Entra App Gallery**, and select **Publish your application to gallery**. You can also start under **New application**. Enter the application name and Microsoft Partner Network ID—the portal and documentation may still use that label for the Partner One ID—and save the submission. ([self-service publishing guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/publish-app-gallery#access-the-publishing-experience))

Saving creates a **Submission ID**. Record it in the release ticket, evidence folder, and escalation template. Creating the submission leaves it in Draft; it does not create a public Gallery listing.

Keep these identifiers separate:

- **Application (client) ID:** identifies the OIDC application object.
- **Enterprise application object ID:** identifies a service principal in one tenant.
- **Submission ID:** identifies this Gallery publishing package.
- **Test ID:** proves a particular self-service validation result.
- **SCIM validation run ID:** identifies the provisioning validation execution when that flow uses Azure Logic Apps.

Mixing those IDs is a reliable way to send support a technically correct GUID for the wrong control plane.

## Validate OIDC as a multitenant security boundary

Microsoft's self-service OIDC validator requires a deployed application with a public URL, working OIDC sign-in, configured redirect URIs and permissions, and a multitenant application registration. The preview validator supports Microsoft identity platform **v2.0** endpoints; v1 endpoints cannot use this self-service onboarding path. Validation runs through the Microsoft Entra App Validator extension in Microsoft Edge and produces a time-bound Test ID after all required checks pass. The current documentation says that Test ID expires after **two weeks**. ([OIDC validation guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-oidc-multitenant-app-gallery))

Before launching the validator, review the actual authorization request and token-handling design:

- use the `/common` or `/organizations` tenant endpoint appropriate to the documented multitenant design;
- use the v2 authorization endpoint and authorization code flow;
- request `openid` and `profile`, plus only the additional delegated scopes the product genuinely needs;
- register the exact production redirect URIs and remove abandoned test callbacks;
- validate issuer, audience, nonce, state, signature, lifetime, and tenant expectations in the application;
- define what happens when a tenant is not onboarded or consent has not been granted;
- document admin-consent requirements in plain language; and
- prove logout, session expiry, key rollover, and customer offboarding separately from a happy-path sign-in.

Microsoft's token guidance says confidential clients should validate ID tokens and specifically calls out signature, issuer, timestamps, audience, and nonce checks; its multitenant guidance also requires tenant-aware validation. Use a maintained identity library rather than hand-writing token validation. ([ID token validation](https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens#validate-tokens), [claims validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation))

The validator also asks which claim the product uses to match an Entra identity to its local account. Microsoft warns that a mutable, self-assertable value such as email address is unsafe as the only match key. If the product uses a mutable value, the validation declaration must pair it with an immutable identifier; a named custom claim can also be declared according to the documented rules. ([OIDC validation guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-oidc-multitenant-app-gallery#declare-how-your-app-identifies-users))

> **Analysis:** the stable local key should normally include both tenant context and an immutable subject identifier. An object identifier by itself is meaningful within a tenant, while an email address can change or be reassigned. Make the product's real matching behavior agree with the declaration in the validator.

The Gallery SSO requirements add several product-level controls: use least-privileged Microsoft Graph permissions, prefer delegated permissions unless application permissions are required, use a certificate rather than a client secret for client-credentials authentication, complete publisher verification, and use a confidential client. Public client applications are not accepted for OIDC Gallery onboarding. ([SSO requirements](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-gallery-sso-requirements))

## Validate SAML without touching production

For SAML, Microsoft explicitly tells publishers to use a **nonproduction tenant and nonproduction application** because the validation includes an expired-certificate scenario that intentionally interrupts sign-in. The operator needs permission to manage the enterprise application, a test user, Microsoft Edge, a reachable application sign-in endpoint, and the application's Entity ID, Assertion Consumer Service reply URL, and optional sign-on URL. ([SAML validation guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-saml-single-sign-on-app-gallery))

Create a non-gallery enterprise application, configure SAML, assign only the test population, and verify both directions the product claims to support:

- **SP-initiated:** the user begins in the SaaS application and is redirected to Microsoft Entra ID;
- **IdP-initiated:** the user begins from My Apps or the Entra test surface;
- **certificate rollover:** the service provider accepts the intended rollover process and fails safely on an expired or invalid signing certificate;
- **claims and NameID:** required claims map to the correct local identity without falling back to an ambiguous value;
- **audience and destination:** assertions for another application or endpoint are rejected; and
- **assignment boundary:** an unassigned test identity behaves according to the documented tenant configuration.

Microsoft's SSO requirements require SAML 2.0 in SP-initiated mode, IdP-initiated mode, or both, and require validation of the SAML token certificate key, certificate validity, issuer, audience, and required claims. Single Logout and consumption of Microsoft Entra federation metadata are recommended, not mandatory. Label that distinction accurately in your design review. ([SSO requirements](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-gallery-sso-requirements#saml-sso-requirements))

Do not use the Gallery review as the first certificate-expiry exercise. The customer documentation should say who monitors expiry, how metadata is refreshed, how emergency rollover works, and how to retain an administrative recovery path without quietly bypassing SSO for everyone.

## Validate SCIM as a lifecycle system, not a checkbox

Microsoft's current Gallery requirements say the SCIM integration must support a SCIM 2.0 user endpoint; group provisioning is recommended. The endpoint must support schema discovery, return a successful empty result when a query finds no user, support user deletion or disable behavior, and sustain at least **25 requests per second per tenant**. The integration must be tested first as a non-gallery application. ([SCIM Gallery requirements](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-gallery-user-provisioning-requirements))

Authentication is also constrained. Microsoft says Gallery SCIM connectors must use OAuth 2.0 client credentials or workload identity federation. Basic authentication, long-lived bearer tokens, and the authorization-code grant are not accepted for new provisioning onboarding. With client credentials, Microsoft currently requires secrets that expire after one to three years, support safe rotation, and produce access tokens lasting between 60 minutes and six hours. Workload identity federation is the recommended option. ([SCIM Gallery requirements](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-gallery-user-provisioning-requirements#scim-authentication-requirements))

The self-service provisioning validator uses a Microsoft-provided Azure Logic Apps template and runs 25 tests covering user provisioning, group provisioning, and SCIM compliance. The current prerequisites include an Azure subscription in the test tenant, at least Logic App Contributor for the validator deployment, Application Administrator in Entra, and an endpoint credential that remains valid for the validation window. A passing run produces evidence that Microsoft reviews with the Gallery submission. ([provisioning validation guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-user-provisioning-app-gallery))

Before calling a run complete, preserve evidence for these lifecycle cases:

- create a user with every required attribute;
- find that user by the configured matching attribute;
- update individual and multiple attributes;
- disable or delete the user and define reactivation behavior;
- add and remove group memberships if groups are supported;
- return standards-compliant errors without leaking tokens or personal data;
- reject expired credentials and accept the documented rotation path;
- handle retries idempotently; and
- reconcile after a partial failure without creating a duplicate account.

The site's [Microsoft Entra provisioning quarantine recovery guide](/posts/microsoft-entra-provisioning-quarantine-fix-guide) explains what customer administrators will see when endpoint or credential failures become persistent. Design the connector and support runbook so the customer can diagnose the first failed boundary instead of repeatedly restarting a job.

## Build a review-ready submission package

The portal prefills some information from the Partner profile and validation results. Review every prefilled value. If a source-owned value is wrong and the portal does not allow an edit, correct it at the source instead of documenting a mismatch as a known issue.

Use one evidence manifest:

- **Product build:** version, release commit, deployment time, environment, and owner.
- **Gallery submission:** Submission ID, application name, publisher, and selected capabilities.
- **OIDC or SAML:** Test ID, test time, tenant, app and service-principal IDs, protocol configuration, and proof that blocking results were cleared.
- **SCIM:** validation run ID, endpoint version, authentication mode, schema version, result export, and proof that blocking results were cleared.
- **Permissions:** delegated and application permissions, business justification, consent owner, and removal path.
- **Documentation:** public URLs, revision or publish time, supported SKUs, roles, setup, rotation, testing, troubleshooting, and support.
- **Operations:** monitoring, key or secret rotation, incident owner, customer notification, rollback, and offboarding.

Keep credentials, tokens, private keys, and personal test data out of the evidence package. Microsoft's support guidance asks for the application name, Submission ID, included capabilities, failed step, expected and actual results, errors, and screenshots without secrets or personal information. ([publishing support guidance](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/publish-app-gallery#get-help))

The public documentation is part of the product. Test it with an administrator who did not build the integration. They should be able to identify required licenses and roles, create the enterprise application, configure SSO or provisioning, assign a small pilot, validate the result, find the relevant logs, rotate credentials, and contact support without private tribal knowledge.

For post-deployment governance, point customers to a concrete access lifecycle. The site's [Microsoft Entra catalog access reviews guide](/posts/microsoft-entra-catalog-access-reviews-deployment-guide) covers reviewing application assignments, while the [Microsoft Entra account discovery guide](/posts/microsoft-entra-account-discovery-orphan-accounts) covers finding application accounts that are local, unassigned, or orphaned.

## Submit, monitor, and respond without duplicating the listing

Before selecting **Submit**, confirm the application and publisher information, selected capabilities, validation results, public documentation, logos, support routes, privacy URL, and terms URL all describe the same release. Accept the applicable terms and submit the package.

Microsoft documents the workflow as:

1. **Draft** — the publisher prepares the submission;
2. **Under Review** — Microsoft reviews the configuration and required information;
3. **Approved** — the submission has passed validation;
4. **In Preview** — the integration is available as a preview Gallery offering; and
5. **Published** — the integration is publicly available in the Gallery.

Submission is therefore a handoff into Microsoft review, not an instant release. Track status under **Your published applications** and answer requests against the same Submission ID. If a requested correction materially changes the integration, repeat the applicable validation before resubmitting. ([publishing workflow](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/publish-app-gallery#publishing-workflow))

Do not create a second new-app submission to update or replace an existing listing unless Microsoft directs you to do so. The preview self-service workflow is scoped to new application submissions; existing listings use the documented update or removal path.

## Troubleshoot the failure by control plane

### The submission cannot see the validation result

Confirm the validation belongs to the intended Submission ID, tenant, integration type, and current product configuration. For OIDC, confirm the Test ID has not passed its documented two-week lifetime. If the integration changed materially after validation, rerun the test rather than trying to attach stale evidence.

### OIDC validation fails during sign-in

Check for a single-tenant endpoint, v1 endpoint, missing `openid` or `profile` scope, mismatched redirect URI, invalid state or nonce handling, or a sign-in route that hides the Microsoft entry point. Compare the captured authorization request with the application registration and the deployed build.

### The identifier declaration is blocked

Inspect the application's real account lookup. If it matches solely on email or another mutable value, fix the product design and migration logic. Do not select an immutable identifier in the validator when the code does not use it.

### SAML validation breaks the test application

That can be expected during the expired-certificate scenario, which is why Microsoft requires nonproduction validation. Restore the test certificate path, preserve the failed result, correct the product's certificate validation or rollover handling, and rerun. Do not direct the validator at a production tenant to get a cleaner result.

### SCIM validation fails midway

Confirm the endpoint credential remains valid, inspect the Logic App run and SCIM responses, then classify the first failure as authentication, discovery, matching, schema, lifecycle behavior, throttling, or response-format handling. A later cascade of failed tests may share one earlier cause.

### Microsoft requests changes after submission

Update the affected configuration, documentation, logo, or publisher data in the source of truth. Repeat capability validation when the integration changed. Keep the same Submission ID and record the response in the release ticket.

## Rollback and post-publication operations

Before submission, rollback is straightforward: keep the package in Draft and correct the source configuration. After submission, use the same workflow to address feedback. After publication, use Microsoft's existing-application update or removal process; do not create a duplicate listing.

An application rollback plan should also cover the customer control plane:

- stop a faulty new release without deleting customer service principals;
- preserve sign-in and provisioning evidence;
- revoke or rotate compromised publisher credentials;
- roll back redirect URI, claims, or SCIM changes through a versioned release;
- communicate customer action with exact affected versions and time windows;
- keep a tested emergency administrative route; and
- remove customer access, consent, and provisioned data according to the documented offboarding contract.

Gallery publication is not the end of integration ownership. Monitor sign-in failures, consent changes, provisioning health, certificate and credential expiry, documentation drift, and support patterns. When a connector starts failing, customer administrators will work from Entra logs and your public runbook. The [provisioning-log field guide](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs) documents the evidence they can retrieve in the portal, through diagnostic settings, downloads, or Microsoft Graph.

## Microsoft Entra App Gallery publishing checklist

- [ ] Define SAML, OIDC, and SCIM scope before creating the submission.
- [ ] Confirm the application is production-ready and customer-accessible.
- [ ] Record engineering, security, documentation, release, and support owners.
- [ ] Confirm the correct Partner One ID and publisher organization.
- [ ] Prepare a nonproduction tenant, application, and test identities.
- [ ] Create the Gallery draft and preserve its Submission ID.
- [ ] Validate every selected capability against the release being submitted.
- [ ] Use OIDC v2 endpoints and a real multitenant design where required.
- [ ] Match users with an immutable tenant-aware identity key.
- [ ] Run SAML certificate tests only against the nonproduction application.
- [ ] Prove SCIM create, match, update, disable, reactivation, and retry behavior.
- [ ] Document licenses, roles, permissions, setup, rotation, troubleshooting, and support.
- [ ] Remove secrets and personal data from the evidence package.
- [ ] Review every prefilled publisher and application field.
- [ ] Submit once, track the same Submission ID, and rerun validation after material changes.
- [ ] Use the update or removal process for an existing listing; do not create a duplicate.
- [ ] Define post-publication monitoring, credential rotation, incident response, and offboarding.

The new self-service flow makes Microsoft Entra App Gallery onboarding easier to operate, but it does not lower the integration standard. The clean path is submission first, capability-specific validation second, internal security and operations review third, and Microsoft review last. If the application, validation evidence, and public documentation all describe the same tested release, the Gallery submission becomes repeatable instead of a sequence of portal corrections.

### Sources

- [Public preview of self-service onboarding for new Microsoft Entra App Gallery applications — Microsoft Entra Blog](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/public-preview-of-self-service-onboarding-for-new-microsoft-entra-app-gallery-ap/4557199)
- [Publish your app to Microsoft Entra App Gallery — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/publish-app-gallery)
- [Prerequisites to validate and publish your app — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/v2-howto-app-gallery-listing)
- [SSO requirements for Microsoft Entra App Gallery — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-gallery-sso-requirements)
- [Validate an OIDC multitenant app for App Gallery onboarding — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-oidc-multitenant-app-gallery)
- [Validate a SAML SSO app for App Gallery onboarding — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-saml-single-sign-on-app-gallery)
- [User provisioning requirements for Microsoft Entra App Gallery — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-gallery-user-provisioning-requirements)
- [Validate user provisioning for Microsoft Entra App Gallery — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/validate-user-provisioning-app-gallery)
- [Application and service principal objects in Microsoft Entra ID — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [ID tokens in the Microsoft identity platform — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens)
- [Secure applications and APIs by validating claims — Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)
