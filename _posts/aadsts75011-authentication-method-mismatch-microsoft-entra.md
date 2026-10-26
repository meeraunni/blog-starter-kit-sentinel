---
title: "AADSTS75011 Authentication Method Mismatch: Entra Fix"
excerpt: "Fix AADSTS75011 authentication method mismatch by tracing SAML RequestedAuthnContext, reused sessions, federation evidence, and the least disruptive repair."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-26T17:26:03-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS75011 authentication method mismatch** means a SAML application asked Microsoft Entra ID for a specific authentication context, but the method represented by the user's current sign-in session did not exactly match that request. The reliable fix is to inspect the application's `RequestedAuthnContext`, compare it with the authentication path Entra actually reused, and then make one application-owned decision: remove the optional constraint, or require a fresh authentication that can honor it.

Grab a coffee and keep the failed sign-in open. This is not a bad-password error, an expired SAML signing certificate, or a reply URL mismatch. Microsoft's dedicated troubleshooting reference says AADSTS75011 occurs when a SAML service provider sends `RequestedAuthnContext` and the already-authenticated user's context differs from the requested `AuthnContextClassRef`. Microsoft documents two supported application-side resolutions: omit the optional element when the app does not truly need it, or send `ForceAuthn="true"` when the app must obtain a fresh matching authentication. ([AADSTS75011 troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-AADSTS75011-auth-method-mismatch), [Microsoft Entra SAML protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol#requestedauthncontext))

This guide is for Entra administrators, federation engineers, and application owners. It is intentionally narrower than the site's [SAML, WS-Federation, OAuth, and OpenID Connect guide](/posts/federation-and-token-protocols-explained-saml-ws-fed-oauth-openid-connect): the search intent here is to repair one SAML request-versus-session mismatch without weakening Conditional Access or changing unrelated enterprise-application settings.

## AADSTS75011 authentication method mismatch: the short answer

Work through these checks in order:

1. Preserve the exact AADSTS75011 message, UTC timestamp, request ID, correlation ID, application, user, and sign-in path.
2. Confirm that the failing application uses SAML SSO and that the failure occurred on the Microsoft Entra sign-in page.
3. Capture and decode the application's SAML `AuthnRequest` in an approved diagnostic environment.
4. Find `RequestedAuthnContext`, its `AuthnContextClassRef`, and the `Comparison` value.
5. Check whether the request also contains `ForceAuthn="true"`.
6. Compare the requested class with the authentication method and federation path recorded for the failed sign-in.
7. If the app does not require a precise SAML authentication class, have the application owner remove `RequestedAuthnContext`.
8. If the requirement is real and supported, have the application send `ForceAuthn="true"`, then prove that the fresh path can actually produce the requested class.
9. Retest both a fresh browser session and the normal reused-session journey. Confirm that Conditional Access and MFA still produce the intended result.

The key boundary is ownership. `RequestedAuthnContext` and `ForceAuthn` are created by the **SAML service provider's request**. They are not values an Entra administrator should try to repair by changing the Reply URL, rotating a certificate, or excluding a user from policy.

## What AADSTS75011 proves—and what it does not

The error proves four useful facts:

- Microsoft Entra received a SAML authentication request.
- That request included a specific desired authentication context.
- Entra had an authentication context for the user, often from an existing session or upstream federation.
- The two contexts did not satisfy the exact match required by the request.

It does **not** by itself prove that:

- the user's password or MFA method failed;
- Conditional Access blocked the sign-in;
- the enterprise application's SAML certificate expired;
- the Identifier or Reply URL is wrong;
- the user's app assignment is missing; or
- forcing every user through another MFA prompt will fix the design.

Microsoft's error reference names AADSTS75011 `NoMatchedAuthnContext` in output claims. The dedicated troubleshooting page gives two representative paths: an upstream federated sign-in can carry Integrated Windows Authentication, and an authentication can represent X.509 plus multifactor authentication. The practical lesson is that “the user completed MFA” and “the SAML request's exact class was satisfied” are separate statements. ([authentication error-code reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [AADSTS75011 cause](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-AADSTS75011-auth-method-mismatch#cause))

## Understand the three authentication contexts in play

Teams often use “authentication context” for three different things. Separate them before editing anything.

### The service provider's SAML request

The application sends an `AuthnRequest` to Entra. It can include an optional `RequestedAuthnContext` containing one or more `AuthnContextClassRef` values. Microsoft's current SAML protocol reference says that when this element is present, `Comparison` must be `exact`. It lists the class URIs Entra supports, including password, Kerberos, smart card, X.509, TLS client, and Integrated Windows Authentication. ([supported SAML request fields and classes](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol#requestedauthncontext))

A simplified request can look like this:

```xml
<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  ForceAuthn="true">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    https://app.example.com/saml
  </saml:Issuer>
  <samlp:RequestedAuthnContext Comparison="exact">
    <saml:AuthnContextClassRef xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
      urn:oasis:names:tc:SAML:2.0:ac:classes:X509
    </saml:AuthnContextClassRef>
  </samlp:RequestedAuthnContext>
</samlp:AuthnRequest>
```

This is an illustrative fragment, not a drop-in configuration. The service provider must generate a valid request with its real issuer, destination, ACS behavior, signature requirements, and supported authentication design.

### The user's current Entra or federated session

The user might already have authenticated through password hash synchronization, pass-through authentication, passwordless sign-in, certificate-based authentication, or an upstream federation service. Entra can reuse a valid session instead of asking the user to authenticate again. Microsoft's AADSTS75011 reference explicitly describes the mismatch that results when the reused or federated context differs from the application's request. ([AADSTS75011 cause](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-AADSTS75011-auth-method-mismatch#cause))

`ForceAuthn="true"` changes that session-reuse decision. Microsoft's SAML protocol reference defines it as an optional boolean that forces the user to reauthenticate even when a valid Entra session exists. That can allow Entra to honor the requested class, but only if the tenant, upstream identity provider, user, device, and application journey can genuinely produce that class. ([SAML `ForceAuthn`](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol#authnrequest))

### Conditional Access authentication context

Conditional Access also has a feature named **authentication context**, used to apply policy to sensitive actions or data inside an application. That is not the same protocol field as SAML `RequestedAuthnContext`. The `SigninLogs` schema includes a collection of Conditional Access authentication-context class references; do not use that similarly named field as proof of the SAML class the service provider requested. ([SigninLogs schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs))

Analysis: Conditional Access can still influence which authentication is required during the overall sign-in, but AADSTS75011 should be repaired at the SAML request-and-session boundary. Disabling a policy to make the error disappear would weaken a separate control without proving that the application request is correct.

## Preserve the failure before changing the application

Build a small, sanitized evidence bundle:

- complete AADSTS75011 text;
- UTC timestamp, request ID, correlation ID, and trace ID when present;
- application display name, Application ID, enterprise-application object ID, and tenant ID;
- user object ID and whether the identity is managed, federated, guest, or external;
- SP-initiated versus IdP-initiated journey;
- browser and device path;
- the decoded `AuthnRequest`, with sensitive values handled under your incident-data policy;
- `RequestedAuthnContext`, every requested class, `Comparison`, and `ForceAuthn` value;
- Conditional Access result and authentication details from the matching sign-in;
- last known successful time and recent vendor, federation, or authentication-policy changes.

Do not paste session cookies, passwords, private keys, complete SAML assertions, or reusable tokens into a ticket. SAML messages can contain personal identifiers and security-sensitive claims. Share the smallest redacted fragment that proves the request shape.

Microsoft's SAML debugging guide says the error message, correlation ID, timestamp, and SAML request are the core inputs for a company sign-in-page failure. It also documents the Entra test flow under **Entra ID > Enterprise apps > All applications > [application] > Single sign-on > SAML > Test single sign-on** and identifies Cloud Application Administrator as the minimum role for that test procedure. ([debug SAML SSO](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/debug-saml-sso-issues))

## Capture the exact SAML request

Use the application's normal SP-initiated entry point first. A My Apps tile or Entra's Test button might exercise a different path and omit the request that production users actually send.

Microsoft recommends its My Apps Secure Sign-in Extension for gathering SAML request and response information. Its documented Test single sign-on experience can download the SAML request and provide error-specific guidance. Where the extension is unavailable, Microsoft's guide describes using an approved HTTP tracing tool to retrieve the message. ([SAML debugging procedure](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/debug-saml-sso-issues#resolve-a-sign-in-error-on-your-company-sign-in-page))

Inspect these fields together:

- **Issuer:** proves which service-provider identity sent the request.
- **AssertionConsumerServiceURL:** distinguishes this failure from a callback mismatch.
- **RequestedAuthnContext:** contains the method constraint that matters for AADSTS75011.
- **AuthnContextClassRef:** names the exact requested authentication class.
- **Comparison:** Microsoft requires `exact` when `RequestedAuthnContext` is present.
- **ForceAuthn:** tells Entra whether it may reuse the existing session.
- **ID and timestamp:** help correlate the request to the failure and vendor logs.

Capture more than one journey when the issue is intermittent: a normal browser with an existing session, a fresh private session, the My Apps launch, and the application's direct sign-in URL. If only one journey fails, compare the requests rather than assuming the users are different.

## Read the Entra sign-in evidence in order

Open **Entra ID > Monitoring & health > Sign-in logs** and find the event using the request or correlation ID and timestamp. Microsoft's log guidance recommends following **who**, **how**, and **what**: identity, client application, and target resource. The Authentication Details tab records the sequence of methods and policies involved, although Microsoft warns that authentication details can be incomplete until log aggregation finishes. ([sign-in activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

Record:

- Result code and failure reason;
- application and resource IDs, not display names alone;
- home and resource tenant IDs for an external or guest path;
- client app, browser, and device state;
- authentication requirement and Authentication Details sequence;
- federation-related authentication processing details when present;
- Conditional Access status and policies;
- request ID and correlation ID.

Do not overread the evidence. A successful MFA step proves that an MFA requirement was satisfied. It does not prove that the service provider's requested SAML class was the one represented in the final authentication context. Likewise, a successful Conditional Access status does not prove that the SAML protocol request can be fulfilled.

If sign-in logs are routed to Log Analytics, this query can locate and group the failures:

```kusto
SigninLogs
| where ResultType == "75011"
| project CreatedDateTime, UserPrincipalName, AppDisplayName, AppId,
    ResourceDisplayName, AuthenticationProtocol, AuthenticationMethodsUsed,
    AuthenticationProcessingDetails, ConditionalAccessStatus,
    CorrelationId, ResultDescription
| order by CreatedDateTime desc
```

Microsoft documents `ResultType` as the 5- or 6-digit sign-in error code and lists the other projected fields in the `SigninLogs` schema. If one user journey produces several Log Analytics records, Microsoft's analysis guidance says to group by correlation ID and use the final status for that sequence rather than counting each row as an independent incident. ([SigninLogs reference](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs), [analyze sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-log-analytics))

## Choose the repair that matches the requirement

There are two documented repair branches. Treat them as an application design decision, not a user workaround.

### Remove `RequestedAuthnContext` when the app does not need it

Microsoft documents `RequestedAuthnContext` as optional and recommends asking the application to remove it when possible. This is usually the cleaner branch when the application only needs a successful Entra authentication and its own authorization claims, not a precise SAML authentication class. ([Microsoft's first resolution](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-AADSTS75011-auth-method-mismatch#resolution))

Before removal, obtain application-owner and security-owner approval. Confirm that the constraint is not part of a contractual, regulatory, or application-session assurance design. Then test the app under the tenant's normal authentication and Conditional Access controls.

Removing the SAML element does not disable Entra authentication, Conditional Access, MFA, or app assignment. It removes the service provider's extra request for an exact SAML class. Those other controls must remain explicitly configured and validated.

### Add `ForceAuthn="true"` when the exact class is required

Microsoft's second resolution is to request fresh authentication so the desired context can be honored. The SAML request must carry `ForceAuthn="true"`. ([Microsoft's fresh-authentication resolution](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-AADSTS75011-auth-method-mismatch#resolution))

Use this branch only after answering all of these:

- Is the requested class in Microsoft's supported list?
- Can the tenant or upstream federated identity provider produce it for every in-scope user?
- Does the service provider handle the fresh-authentication journey correctly?
- What happens to passwordless users, federated users, guests, and emergency accounts?
- Will repeated fresh authentication create an unusable prompt loop?
- Does the app truly consume or enforce the resulting assurance, or is the class a vendor default?

`ForceAuthn` is not a general “make MFA stronger” switch. It tells Entra not to rely on the current session for this SAML request. If the requested class is incompatible with the organization's supported authentication paths, fresh authentication can reproduce the failure instead of fixing it.

## Troubleshoot the common AADSTS75011 patterns

### Only federated users fail

Compare the requested class with the upstream federation method. Microsoft's example shows Integrated Windows Authentication arriving as this class:

```text
urn:federation:authentication:windows
```

If the service provider asks for a different exact class, session reuse can fail the match. Preserve the upstream issuer, authentication method, and request evidence; do not convert the domain or change federation during the incident.

### A fresh private window works, but an existing session fails

This pattern is consistent with session reuse being part of the mismatch. It is diagnostic evidence, not the production fix. Clearing cookies for every user only discards the current session; it does not correct the application's request and can recur after another authentication path creates a different context.

### The app works from My Apps but fails from its own URL

Compare IdP-initiated and SP-initiated behavior. The application's own URL can generate an `AuthnRequest` with `RequestedAuthnContext`; the My Apps path may not reproduce the same request. Test the path users actually take and preserve both request shapes.

### MFA succeeds, then AADSTS75011 appears

Treat the MFA result and SAML class match as separate layers. Review Authentication Details, the requested class, and the actual session or federation context. Do not remove the MFA policy to make the symptom disappear.

### One vendor update caused the failures

Compare the last known good and current `AuthnRequest`. Look specifically for a newly added `RequestedAuthnContext`, a changed class URI, `Comparison`, or the removal of `ForceAuthn`. Ask the vendor for the supported configuration knob and release note; do not patch a captured request in transit.

## Avoid the fixes that target the wrong control plane

- **Do not rotate the SAML signing certificate.** AADSTS75011 occurs while Entra is evaluating the authentication request, not because the service provider rejected an issued assertion.
- **Do not add Reply URLs.** A callback mismatch is AADSTS50011; use the [reply URL mismatch guide](/posts/aadsts50011-reply-url-mismatch-microsoft-entra) for that path.
- **Do not disable Conditional Access or MFA.** Their success or failure is separate evidence and should remain intact.
- **Do not reset the user's password.** The mismatch can occur after successful authentication.
- **Do not permanently instruct users to clear cookies.** A fresh session can help isolate reuse, but it does not repair the application request.
- **Do not change the enterprise application's Entity ID by guesswork.** The request already reached a SAML application boundary; preserve issuer evidence before touching identity configuration.
- **Do not capture production SAML traffic in an unapproved public decoder.** Assertions and requests can expose sensitive identifiers and security context.

The site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) is useful when policy evidence needs deeper interpretation, but keep the AADSTS75011 repair anchored to `RequestedAuthnContext`, the current session, and `ForceAuthn`.

## Pilot and validate the repair

Use a nonproduction app instance or a small assignment group when the vendor supports it. Preserve a rollback copy of the service-provider configuration and record the exact change.

Test this matrix:

1. a user with no existing Entra browser session;
2. a user with a valid existing session created through the normal corporate path;
3. a federated user when federation is in scope;
4. a managed-domain user when both populations use the app;
5. a user subject to the intended Conditional Access and MFA controls;
6. an approved passwordless or certificate-based user where applicable;
7. both SP-initiated and IdP-initiated launches if the app supports both; and
8. one negative case that should remain blocked by assignment or policy.

For each result, match the SAML request, sign-in event, correlation ID, authentication details, Conditional Access result, and application session outcome. A successful Entra sign-in is not enough if the application rejects the response; Microsoft's debugging guide treats an error on the application page as a separate response-consumption stage. ([SAML response troubleshooting](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/debug-saml-sso-issues#resolve-a-sign-in-error-on-the-application-page))

Monitor for new 75011 events across the application after rollout. Keep the rollback narrow: restore the prior service-provider request configuration if the pilot introduces a prompt loop or excludes a supported population. Do not roll back tenant-wide authentication policy to compensate for one app's SAML request.

## Escalate with evidence the vendor can act on

If the application does not expose a supported control for `RequestedAuthnContext` or `ForceAuthn`, give its vendor:

- sanitized AADSTS75011 text;
- UTC timestamp, request ID, correlation ID, and tenant ID;
- application identifier and SSO journey;
- redacted `AuthnRequest` fragment showing issuer, requested class, comparison, and `ForceAuthn`;
- whether the user had an existing session;
- managed versus federated identity path;
- Entra Authentication Details and Conditional Access result;
- the working and failing journey comparison;
- last known successful version and recent application changes; and
- the requested product decision: remove the optional context or generate a supported fresh-authentication request.

Never send passwords, private keys, cookies, complete assertions, or reusable tokens. If Microsoft support is needed, the correlation and request identifiers plus the precise UTC time are more useful than a screenshot without context.

## AADSTS75011 administrator checklist

- [ ] Confirm the error is AADSTS75011 on a SAML SSO path.
- [ ] Preserve the exact error, UTC time, request ID, and correlation ID.
- [ ] Identify the exact enterprise application and tenant.
- [ ] Capture the production SP-initiated `AuthnRequest` safely.
- [ ] Record `RequestedAuthnContext`, class URI, `Comparison`, and `ForceAuthn`.
- [ ] Compare the request with the user's actual managed or federated authentication path.
- [ ] Review Authentication Details and Conditional Access without conflating them with the SAML class.
- [ ] Decide whether the application truly requires an exact authentication class.
- [ ] Remove the optional constraint or add supported fresh authentication through the application owner.
- [ ] Pilot existing-session, fresh-session, federation, passwordless, and policy paths that are in scope.
- [ ] Verify both Entra token issuance and application session creation.
- [ ] Monitor for recurring 75011 events and retain a narrow rollback.

## Frequently asked questions

### Is AADSTS75011 a Conditional Access failure?

Not by definition. It is a mismatch between the SAML `RequestedAuthnContext` and the authentication context represented by the user's sign-in. Review Conditional Access as part of the evidence, but repair the SAML request/session boundary.

### Does successful MFA satisfy every requested SAML class?

No. MFA success and an exact SAML authentication-class match are different checks. Microsoft's own example includes a multifactor authentication path that can still be involved in a mismatch.

### Can users fix AADSTS75011 by clearing browser cookies?

A fresh session can reveal that session reuse is involved, but clearing cookies is not a durable application fix. The supported design decision is to remove an unnecessary `RequestedAuthnContext` or send `ForceAuthn="true"` when the exact supported class is required.

### Where is `RequestedAuthnContext` configured in Entra?

It is sent by the SAML service provider in its `AuthnRequest`. The application or vendor normally owns that request behavior. Entra's enterprise-application configuration establishes the SAML trust, but changing an unrelated portal field does not rewrite the vendor's request.

### What should I read next?

Use the [federation and token protocol guide](/posts/federation-and-token-protocols-explained-saml-ws-fed-oauth-openid-connect) for the broader SAML trust model, the [AADSTS50011 guide](/posts/aadsts50011-reply-url-mismatch-microsoft-entra) when the failure is actually an ACS mismatch, and the [Conditional Access evaluation guide](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) when policy—not the SAML class—is the failed boundary.

## Microsoft sources

- [Error AADSTS75011: authentication method mismatch](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-AADSTS75011-auth-method-mismatch)
- [Microsoft Entra SAML single sign-on protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol)
- [Debug SAML-based single sign-on to applications](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/debug-saml-sso-issues)
- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details)
- [Customize and filter Microsoft Entra activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-customize-filter-logs)
- [Azure Monitor `SigninLogs` reference](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs)
- [Analyze Microsoft Entra activity logs in Log Analytics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-log-analytics)
