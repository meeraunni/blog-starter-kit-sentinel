---
title: "AADSTS50058 Silent Sign-In Failed: Microsoft Entra Fix"
excerpt: "Fix AADSTS50058 silent sign-in failures by tracing the interrupted request, testing browser session cookies, and restoring a supported interactive flow."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-24T17:06:58-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS50058 silent sign-in failed** event means Microsoft Entra could not complete a non-interactive sign-in with the browser session it received. The usual recovery is to let the application start a supported interactive sign-in. If the error keeps returning, prove whether Entra had no usable session, the browser withheld the session cookies, the application failed to identify the intended account, or the application never handled the expected interaction-required result.

Grab a coffee before clearing every cookie or changing Conditional Access. `AADSTS50058` is often an expected interrupt, not proof that a password, MFA method, app permission, or tenant policy is broken. Microsoft's error reference says the code appears when session information is insufficient for single sign-on, including requests that use `prompt=none`. Microsoft's sign-in troubleshooting guide adds that the user authenticated but did not complete sign-in, so the log can show an object ID or even a zero GUID instead of a familiar username. ([Microsoft Entra error-code reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes), [sign-in error troubleshooting](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors#sign-in-error-codes))

## AADSTS50058 silent sign-in failed: the fast path

Use this sequence for one affected user and application:

1. Capture the UTC timestamp, correlation ID, request ID, error text, application, resource, tenant, browser, and launch path.
2. Confirm that the failing authorization request is silent. Look for `prompt=none`, `ssoSilent`, `acquireTokenSilent`, or an iframe-based token request.
3. Open **Entra ID > Monitoring & health > Sign-in logs** as at least a Reports Reader. Filter on the application, time, correlation ID, and error code `50058`; do not rely only on the displayed username.
4. Check whether a successful interactive sign-in for the same user, app, resource, and browser follows the interrupt.
5. If interactive sign-in succeeds and the application continues, treat the single 50058 event as an expected silent-to-interactive transition.
6. If the page loops, remains blank, or immediately retries silently, inspect the application's error handling. It must stop the silent loop and invoke an approved interactive method.
7. If the problem is browser-specific, compare a normal supported-browser window with the affected privacy mode or browser policy. Do not weaken organization-wide cookie controls as a first response.
8. If many users started failing at the same time, correlate by application ID, application version, browser family, policy deployment, and first-seen time before changing tenant controls.
9. After the repair, verify one successful interactive sign-in and a later successful silent token acquisition. Preserve the failed and successful correlation IDs.
10. Escalate with the complete evidence bundle if the same supported interactive flow still cannot establish a reusable session.

This guide is based on current Microsoft documentation and operational analysis. It does not claim that AADSTS50058 was reproduced in a production tenant for this article.

## What AADSTS50058 actually proves

Microsoft documents AADSTS50058 as `UserInformationNotProvided`: the session information is not sufficient for single sign-on. It can mean no user is signed in, or that a previously signed-in user's SSO session was not found or is invalid. The error can be returned when the application asks for no user interaction with `prompt=none`. ([Microsoft Entra authentication and authorization errors](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes#aadsts-error-codes))

The protocol boundary matters. Microsoft's authorization-code documentation says `prompt=none` guarantees that the authorization request will not show an interactive prompt. When the platform cannot finish silently, it returns an interaction-required result instead of displaying account selection, credentials, MFA, or consent. The same reference describes `login_required` as the outcome when a silent request cannot identify one user because no user—or too many users—matches the selected tenant context. ([OAuth 2.0 authorization-code request parameters and errors](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#request-an-authorization-code))

That proves the silent path lacked enough usable session context. It does **not** prove that:

- the user entered a bad password;
- MFA failed;
- Conditional Access blocked token issuance;
- the app registration needs a new secret;
- the user lacks consent or application assignment;
- the browser has no Microsoft session of any kind;
- deleting every browser cookie is the correct production fix; or
- every 50058 record represents a user-visible outage.

Keep adjacent errors separate. **AADSTS50076** asks for MFA and belongs on the interactive challenge path. **AADSTS50173** rejects an older grant against a token-validity cutoff. **AADSTS700082** identifies refresh-token inactivity. **AADSTS53003** identifies a Conditional Access block. The site's [AADSTS50076 MFA-required guide](/posts/aadsts50076-mfa-required-microsoft-entra) and [AADSTS50173 revoked-grant guide](/posts/aadsts50173-grant-expired-revoked-microsoft-entra) cover those different control boundaries.

## Understand the two session layers

A browser application can appear signed in at one layer and still fail at another.

**The Microsoft Entra browser session** lives on the Microsoft identity platform's domain. Microsoft documents cookies such as `ESTSAUTH` and `ESTSAUTHPERSISTENT` as carrying session information used for SSO. Persistent session tokens use persistent browser cookies; non-persistent session tokens use session cookies that are destroyed when the browser session closes. ([Microsoft Entra browser-cookie reference](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-web-browser-cookies))

**The application or MSAL cache** belongs to the application's origin. Microsoft explains that the Entra session cookie and the MSAL.js cache are independent mechanisms that work together. An app might have cached account metadata but no usable Entra cookie in the silent iframe. Conversely, Entra might have a browser session while the application has not selected an account from its own cache. ([Single sign-on with MSAL.js](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-sso))

That architecture explains the common symptom: “I am signed into Microsoft 365 in another tab, but this app says no user is signed in.” The statement can be true from the user's point of view while the silent request still lacks a session that is visible and unambiguous in its browser context.

> **Analysis:** treat AADSTS50058 as a failed attempt to reuse session state, not as evidence that primary authentication failed. The diagnostic question is “Why was the silent request unable to reuse one account?”

## Step 1: preserve the interrupted request

Capture evidence before asking the user to retry repeatedly:

- the complete AADSTS50058 text;
- UTC timestamp, trace ID, correlation ID, and request ID;
- application name and application ID;
- resource name and resource ID;
- home tenant and resource tenant when known;
- browser name, version, profile, and normal/private mode;
- operating system and device-management context;
- the exact launch path, such as an app link, My Apps tile, portal blade, iframe, or embedded view;
- whether the user had already completed an interactive sign-in in that same browser profile;
- whether the page recovered, displayed an account picker, or entered a loop.

Do not paste session cookies, authorization codes, access tokens, refresh tokens, or full network archives into an ordinary ticket. Correlation identifiers, timing, client/resource IDs, browser context, and a sanitized authorization request normally establish the failure boundary without copying bearer material.

Inspect the authorization request for `prompt=none`, the authority or tenant segment, `client_id`, `redirect_uri`, scopes, and any account hint. Do not edit those values in production while gathering evidence. They tell you which application asked Entra to remain silent and which tenant context it expected.

## Step 2: find the exact sign-in event

Microsoft lists **Reports Reader** as the least-privileged role for viewing activity logs; users can also view their own activity at My Sign-Ins. In the admin center, open **Entra ID > Monitoring & health > Sign-in logs**, then filter by the narrow time window, application, status, and error code. Record the correlation ID, error code, failure reason, username, user ID, and sign-in identifier. ([How to troubleshoot Microsoft Entra sign-in errors](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors))

Do not discard the event because the user column looks strange. Microsoft explicitly says a 50058 interrupt can display an object ID, a GUID, or `00000000-0000-0000-0000-000000000000` because sign-in did not complete. The monitoring FAQ also notes that passwordless events and tenant restrictions can produce identifier-shaped display values for different reasons, so read the error code and event details together. ([Microsoft Entra monitoring and health FAQ](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reports-faq#im-seeing-user-ids--object-ids--guids-in-the-username-field-of-my-sign-in-log-why-is-this-happening))

Follow **who, how, and what**:

- **Who:** user ID, sign-in identifier, home tenant, and user type.
- **How:** client application, browser, authentication protocol, interactive status, IP context, and Conditional Access result.
- **What:** application, application ID, resource, resource ID, and resource tenant.

Microsoft's sign-in detail reference uses the same model and warns that authentication details can be incomplete while records are still aggregating. If a field is uncertain, preserve the request and correlation IDs and recheck the finalized event rather than inventing a cause. ([Sign-in log activity details](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details))

## Step 3: decide whether the event is expected or actionable

One AADSTS50058 followed by a successful interactive sign-in can be normal application behavior. A silent attempt is allowed to fail; the application is responsible for moving to interaction when required.

Use these evidence patterns.

### Expected first-session interrupt

The user opens the application with no reusable Entra session in that browser context. The app tries silently, receives AADSTS50058, then presents a supported interactive login and continues. There is no loop and no unexplained policy change.

**Action:** confirm the application handles the transition cleanly. Do not open an identity incident merely because the first silent attempt appears in logs.

### Browser privacy or cookie boundary

The same user and app work in a normal supported-browser window but fail in a privacy mode, a browser with third-party-cookie restrictions, or an embedded context. Microsoft says Entra cookies can be unavailable because of privacy features, browser behavior, InPrivate or Incognito mode, or unsupported authentication libraries. The documented effects include broken SSO and repeated authentication prompts. ([Browser-cookie availability](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-web-browser-cookies#when-cookies-are-not-available-to-entra-id))

MSAL.js is more specific: `ssoSilent` uses a hidden iframe to reuse the Entra session. Browsers that block third-party cookies can prevent that iframe from receiving the session cookies and produce `login_required: AADSTS50058`. Microsoft's documented resolution is an interactive `loginPopup()` or `loginRedirect()` request. ([MSAL.js silent SSO and third-party cookies](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-sso#third-party-cookies))

**Action:** reproduce with a supported browser and the organization's approved browser policy. If normal interaction succeeds, fix the application flow and browser compatibility; do not broadly allow third-party cookies across the estate just to preserve a hidden iframe.

### Account-selection ambiguity

The browser has account context, but the application has not supplied a reliable account hint. Microsoft's authorization-code reference says a `login_required` result can mean a silent request found no user or too many users in the selected tenant context. MSAL.js separately documents `AADSTS16000` when multiple identities make the account ambiguous. If the exact code is 16000, stop treating the incident as AADSTS50058. ([Authorization endpoint errors](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#error-response), [MSAL.js SSO without a user hint](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-sso#without-user-hint))

For a genuine 50058 event, an account hint is useful only when the browser can also present the corresponding Entra session. MSAL.js recommends `account`, `login_hint`, or `sid` when the application already has trustworthy user context; otherwise the app should invoke interaction. ([MSAL.js SSO with a user hint](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-sso#with-user-hint))

**Action:** developers should use the supported account object or claims produced by the previous authenticated session. Do not guess a UPN, silently choose the first cached account, or hard-code a tenant merely to suppress account selection.

### Application error-handling loop

The app receives AADSTS50058 and immediately sends the same silent request again. Users see a blank frame, flashing page, endless reload, or repeated log entries with no interactive recovery.

**Action:** stop the loop. Microsoft recommends attempting silent acquisition first and falling back to `acquireTokenPopup` or `acquireTokenRedirect` when interaction is required. A single-page app's silent path can move through cache, refresh token, and hidden iframe; browser cookie blocking or an unavailable session means the app must use interaction. ([Acquire a token in a single-page application](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token))

### Wider application or browser regression

Many users begin failing for one application, browser version, privacy configuration, or deployment ring at the same time. Interactive sign-in may work elsewhere.

**Action:** correlate the first-seen event with application releases, authentication-library changes, redirect-page changes, browser policy, and supported-browser behavior. Roll back the application change if evidence identifies it. Do not disable MFA or Conditional Access when the failed step is silent session reuse.

## Step 4: repair the application flow safely

For an MSAL-based browser application, the supported pattern is deliberately small:

1. attempt token acquisition from the library cache or silently;
2. catch the library's interaction-required error;
3. start one popup or redirect interaction appropriate to the application;
4. process the interactive result completely;
5. resume the original operation only after authentication state is ready.

Microsoft's general MSAL guidance says applications should try the cache silently before acquiring a token through another method. It also distinguishes public-client methods that can show a browser from confidential-client application flows. ([Acquire and cache tokens with MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens))

Do not implement an error-code-specific infinite retry. `AADSTS50058` is already telling the client that the current request cannot finish silently. Retrying the same iframe without changing session context creates load and a poor user experience without creating a cookie.

Also verify the silent redirect page. Microsoft recommends a blank page or another page that does not initialize MSAL for `ssoSilent`; applications that use both redirect and silent methods can set the redirect URI per request. A redirect page that boots the full application can create nested authentication work or race with the parent window. ([MSAL.js silent redirect URI guidance](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-sso#redirect-uri-reply-url))

When the app already knows the signed-in account, use the library's supported account-selection mechanism. Microsoft calls the optional `login_hint` claim the most reliable account hint for silent and interactive requests in this scenario and also documents `sid` and the MSAL account object. These are hints, not authorization decisions; the application must still validate the returned identity and tenant. ([MSAL.js user-hint options](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-sso#with-user-hint))

> **Analysis:** a durable fix makes interaction an explicit state in the application's authentication machine. It does not try to make every token request silent forever.

## Query AADSTS50058 at tenant scale

If Entra activity logs are already routed to Log Analytics, start with Microsoft's exact first-party query for failed silent application sign-ins:

```kusto
SigninLogs
| where ResultType == 50058
| project UserDisplayName, Identity, UserPrincipalName,
          ResultDescription, AppDisplayName, AppId,
          ResourceDisplayName
| summarize FailureCount=count(),
            FailedResources=dcount(ResourceDisplayName),
            ResultDescription=any(ResultDescription)
          by UserDisplayName
```

Microsoft publishes this query under **Failed App tried silent signin**. ([SigninLogs sample queries](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/signinlogs#failed-app-tried-silent-signin))

For incident triage, extend the query without losing event-level evidence:

```kusto
SigninLogs
| where CreatedDateTime >= ago(24h)
| where ResultType == 50058
| project CreatedDateTime, CorrelationId,
          UserDisplayName, UserPrincipalName, UserId,
          AppDisplayName, AppId,
          ResourceDisplayName, ResourceId,
          ClientAppUsed, UserAgent,
          IPAddress, ConditionalAccessStatus,
          ResultDescription
| summarize FirstSeen=min(CreatedDateTime),
            LastSeen=max(CreatedDateTime),
            Interrupts=count(),
            Users=dcount(UserId),
            Correlations=dcount(CorrelationId)
          by AppDisplayName, AppId, ClientAppUsed, UserAgent
| sort by Interrupts desc
```

That second query is an analysis pattern, not a Microsoft-published detection. Interpret it carefully: high counts can reflect a busy application's normal silent-first design. Compare the interrupt rate with successful interactive and silent outcomes, affected-user reports, browser distribution, and the application's release timeline before alerting.

Microsoft also warns that Log Analytics can contain several records from one sign-in flow while the Entra portal aggregates them. Group related steps by correlation ID and use the final outcome when measuring actual failures. ([Analyze Entra activity logs in Log Analytics](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-activity-logs-log-analytics#why-multiple-records-appear))

## Validate the recovery

Test the smallest representative matrix:

1. one affected user in the original browser profile;
2. the same user in a normal supported-browser window;
3. a clean approved browser profile;
4. one user with a single Microsoft account session;
5. one user with multiple accounts, if the application supports that scenario;
6. the application's normal launch path and deep-link path;
7. the expected tenant and guest/resource-tenant path where applicable.

For each test, record whether the application:

- returns a cached token without network interaction;
- completes silent SSO with an available Entra session;
- receives an interaction-required result and shows one deliberate interactive experience;
- returns to the correct application state after popup or redirect;
- records a successful sign-in for the expected user, client, resource, and tenant; and
- later obtains a token silently without entering a loop.

Do not call the fix complete because the error page disappeared. The correct outcome is a usable application session for the intended account, plus evidence that the client handles the next interaction-required boundary predictably.

The site's [access-token and refresh-token guide](/posts/access-token-vs-refresh-token-in-microsoft-identity) explains why an application cache, refresh grant, Entra browser session, and resource session are separate artifacts. For broader evidence reading, use the [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) without assuming Conditional Access caused this code.

## AADSTS50058 administrator checklist

- [ ] Capture the complete error, UTC time, request ID, trace ID, and correlation ID.
- [ ] Record the application, resource, user or object ID, tenant, browser, and launch path.
- [ ] Confirm the request was silent and identify `prompt=none`, `ssoSilent`, or `acquireTokenSilent` behavior.
- [ ] Find the exact 50058 event even if the username column contains a GUID.
- [ ] Check for a successful interactive sign-in in the same correlation window.
- [ ] Compare normal-browser behavior with the affected privacy mode or cookie policy.
- [ ] Determine whether one app, browser family, release, or user population is affected.
- [ ] Make the client fall back to one supported interactive request when required.
- [ ] Use a supported account hint only when the app already has trustworthy user context.
- [ ] Avoid silent retry loops, tenant-wide cookie weakening, and unrelated policy changes.
- [ ] Validate the intended user, client, resource, tenant, and post-login application state.
- [ ] Preserve failed and successful correlation IDs for escalation and trend review.

The short version is refreshingly practical: AADSTS50058 says the silent request did not have enough usable session context. Let the user interact when interaction is required, then fix the browser or application condition that prevented a clean transition. That restores SSO without treating an expected protocol interrupt as a password, MFA, or Conditional Access failure.
