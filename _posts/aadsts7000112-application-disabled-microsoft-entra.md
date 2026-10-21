---
title: "AADSTS7000112 Application Disabled: Microsoft Entra Fix"
excerpt: "Fix AADSTS7000112 application disabled errors by locating the blocked service principal, preserving audit evidence, and restoring tenant-local access safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-21T17:08:22-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS7000112 application disabled** error means Microsoft Entra found the application instance in the resource tenant, but that instance is not allowed to receive new tokens. This is not a missing app, a bad secret, or a user-assignment problem. Microsoft identifies the immediate cause precisely: the service principal object is disabled in the resource tenant.

The safe fix is to identify the exact resource tenant and service principal, establish why it was disabled, and re-enable only that tenant-local object when the disablement was accidental or no longer required. Do not create a replacement enterprise application, rotate credentials, grant consent again, or delete the object just to clear the error. Those actions change different control planes and can destroy the evidence that explains the outage.

Microsoft's dedicated [AADSTS7000112 troubleshooting article](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts7000112-application-is-disabled) says the service principal is disabled on the resource tenant and directs administrators to work with that tenant's owners before re-enabling it. Grab a coffee before anyone toggles it back on: a disabled enterprise app may represent deliberate incident containment, application retirement, or a tenant boundary that the requester does not own.

## AADSTS7000112 application disabled: the fast path

Use this sequence before changing anything:

1. Capture the UTC timestamp, request ID, correlation ID, tenant ID, application ID, application name, resource, and sign-in type from the failure.
2. Confirm which **resource tenant** issued the error. For a multitenant app, this might not be the app registration's home tenant or the user's home tenant.
3. In that resource tenant, open **Entra ID > Enterprise apps > All applications**, find the application by its application ID, and record the service principal object ID.
4. On **Properties**, inspect both **Enabled for users to sign-in?** and **Activation status**. Do not treat the word *Deactivated* as a root cause by itself.
5. Review the service principal's audit history and the tenant's **ApplicationManagement** audit events for the disablement, actor, time, and changed property.
6. Determine whether the block was tenant-local, a global app-registration deactivation, or a Microsoft disablement.
7. If tenant-local disablement was accidental and the app is still approved, re-enable that exact service principal. If the block was deliberate or its ownership is uncertain, leave it disabled and escalate.
8. Verify with a fresh token request and the appropriate sign-in log, then confirm that the expected users or workloads—and only those principals—can obtain access.

This guide is based on current Microsoft documentation and operational analysis. It does not claim that every application topology was reproduced in a tenant for this article.

## Understand the object that Entra actually blocked

An app registration and an enterprise application are related, but they are not interchangeable. Microsoft describes the application object as the global definition and the service principal as that application's local representation in a tenant. A multitenant application has one application object in its home tenant and a separate service principal in every tenant where the application is used. ([application and service principal objects](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals))

AADSTS7000112 points to the local service principal in the resource tenant. The relevant property is `accountEnabled`:

- `accountEnabled: true` means the service principal is enabled;
- `accountEnabled: false` prevents users from signing in to the app, even when they are assigned; and
- disabling tenant-local sign-in prevents the application from receiving new tokens in that tenant.

Microsoft documents that property in the [servicePrincipal resource reference](https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal) and in its [disable user sign-in procedure](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/disable-user-sign-in-portal). The second source explicitly says the portal switch sets the service principal's `accountEnabled` property to `false` for one tenant.

That distinction prevents three common mistakes.

First, do not troubleshoot the home-tenant app registration while ignoring the resource-tenant enterprise app. A healthy home object does not make a disabled consumer-tenant service principal healthy.

Second, do not create a new service principal with the same display name. Display names are not stable identifiers, and a second object can add consent, assignment, and ownership ambiguity without repairing the disabled instance used by the failing request.

Third, do not rotate a secret for AADSTS7000112. A credential problem belongs on a different branch. The site's [AADSTS7000215 invalid-client-secret guide](/posts/aadsts7000215-invalid-client-secret-microsoft-entra) covers that path; the [AADSTS700016 application-not-found guide](/posts/aadsts700016-application-not-found-microsoft-entra) covers requests where Entra cannot find the expected application in the tenant.

## Separate tenant-local disablement from global deactivation

The current Enterprise applications experience can show **Activation status: Deactivated** for more than one condition. Microsoft warns that the label alone does not identify the cause.

Use these control-plane boundaries:

- **Tenant-local sign-in disablement:** `accountEnabled=false` on the resource tenant's service principal. It blocks new token issuance in that tenant and is restored in the affected tenant.
- **App-registration deactivation:** `isDisabled=true` on the application object. It is controlled in the app's home tenant and blocks the app across tenants.
- **Microsoft disablement:** `disabledByMicrosoftStatus` records a Microsoft-controlled disablement condition. A resource-tenant administrator should not try to work around it by recreating objects.
- **Deletion:** removes the object rather than temporarily blocking it. It has different recovery behavior and is not the normal fix for AADSTS7000112.

Microsoft's [app-registration deactivation guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/deactivate-app-registration) compares these states directly. It also says that enabling tenant-local sign-in does not override global app-registration deactivation or Microsoft disablement.

This is the decision that matters:

1. If `accountEnabled` is false and the backing application is otherwise active, the resource-tenant owner can investigate and restore the local instance.
2. If the application object is globally deactivated, the app-registration owner in the home tenant must investigate and reactivate it. A consumer tenant cannot repair the global state.
3. If Microsoft disabled the application, preserve the identifiers and follow the applicable Microsoft escalation path. Do not create a substitute identity to evade the block.
4. If all disablement properties appear healthy, match the exact failed request again. You may be looking at the wrong tenant, the wrong service principal, stale evidence, or a different error branch.

## Match the error to the exact tenant and service principal

Start with immutable identifiers, not the application logo or display name. Capture:

- error code `7000112` and the complete failure message;
- UTC timestamp, request ID, correlation ID, and trace ID when present;
- application (client) ID and displayed application name;
- service principal object ID if the event exposes it;
- resource tenant ID, user home tenant ID, and app-owner tenant ID when relevant;
- resource name and resource service-principal ID;
- interactive user, non-interactive user, or service-principal sign-in category;
- initiating user or workload identity, source IP, client, and authentication protocol; and
- the last known successful request for the same app, tenant, and flow.

A multitenant app makes the tenant check non-negotiable. The application ID can be identical across tenants while each service principal has a different object ID, local assignments, consent grants, owners, and enabled state. The error is repaired where the disabled instance lives—not automatically where the app was developed or where the user account is homed.

Use **Entra ID > Monitoring & health > Sign-in logs** and select the log category that matches the flow. Interactive and non-interactive user logs cover user-delegated paths. The service-principal sign-in log covers app-only authentication using credentials such as certificates or client secrets; managed identities have their own category. Microsoft notes that service-principal events with the same service principal, status, IP address, and resource can be grouped into one row, so expand grouped records to inspect their individual timestamps. ([service principal sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins))

If you have the failure but cannot find the object, switch to **Enterprise applications > All applications**, search by application ID, and confirm that the filter includes the relevant application type and status. Do not jump straight to creating an object. The existing [service-principal creation audit guide](/posts/microsoft-entra-service-principal-creation-audit) explains how to identify why an enterprise application exists before treating it as expected.

## Preserve the audit trail before re-enabling access

The toggle may take seconds; the investigation should happen first.

In the affected tenant, review **Entra ID > Monitoring & health > Audit logs**. Filter the time window around the first failure, set the category to **ApplicationManagement**, and look for **Update service principal** events targeting the exact service principal object ID. Microsoft's [audit activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities) lists service-principal updates in the Core Directory audit surface.

Record:

- the event time and result;
- the initiating user, service principal, or Microsoft service;
- target service principal object ID and application ID;
- old and new values for the relevant property when the event exposes them;
- the change ticket, incident, automation run, or application-lifecycle event associated with the action; and
- any nearby permission, credential, owner, consent, assignment, or application-object changes.

Microsoft Entra ID Free retains audit and sign-in logs for seven days; P1 and P2 retain them for 30 days in the Entra reporting surface. Longer investigation windows require prior export or routing. ([Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)) If the disablement predates available logs, say so explicitly. Absence of a retained event is not evidence that nobody disabled the object deliberately.

Treat these patterns differently:

- **Known security containment:** leave the app disabled until the incident owner authorizes restoration.
- **Documented retirement or vendor offboarding:** leave it disabled and correct the calling workload or user communication.
- **Change-window mistake:** verify the approved target and dependencies, then restore only the mistakenly disabled object.
- **Unknown privileged actor or unexplained automation:** preserve evidence and escalate as a directory-control incident before restoring.
- **Microsoft first-party service principal:** Microsoft's AADSTS7000112 guidance says resource-tenant administrators are not expected or recommended to disable these objects because Microsoft services provision and manage them. Escalate ownership rather than applying a blanket first-party re-enable script.

## Prove prerequisites and authority

Reading evidence and changing state require different authority. Microsoft lists **Reports Reader** as the least-privileged role for activity-log access. To change tenant-local sign-in, the documented roles are Cloud Application Administrator, Application Administrator, or ownership of the service principal in the supported scenario. Microsoft Graph delegated updates require `Application.ReadWrite.All` plus a supported Entra role; Microsoft documents Cloud Application Administrator and Application Administrator for multitenant applications. ([access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs), [update servicePrincipal](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-update))

Before enabling the object, confirm all of the following:

- the responder is operating in the resource tenant shown by the failure;
- the application ID and service principal object ID match the failed request;
- the business and technical owners still approve the application;
- the disabling event was accidental, superseded, or formally cleared;
- credentials, redirect URIs, permissions, consent grants, assignments, and owners have not drifted into an unsafe state;
- any security investigation has cleared the application and its callers; and
- a rollback owner knows how to disable the same service principal again if validation fails.

Licensing is not the switch that repairs this error. Audit and sign-in logs are available in Microsoft Entra ID Free as well as P1 and P2, although retention differs. The governing constraint is authority over the correct tenant-local object and evidence that restoration is safe.

## Restore only the intended tenant-local service principal

For the portal path, sign in to the affected resource tenant as an authorized administrator, then:

1. Browse to **Entra ID > Enterprise apps > All applications**.
2. Find the application by application ID and confirm its service principal object ID.
3. Open **Properties**.
4. Review **Activation status** and its underlying cause.
5. If only tenant-local sign-in is disabled and restoration is approved, set **Enabled for users to sign-in?** to **Yes** and save.
6. Re-open Properties or query the object to verify the effective state rather than trusting the save notification alone.

Microsoft's restore procedure says the programmatic equivalent is setting `accountEnabled` to `true`. A controlled Microsoft Graph PowerShell path is:

```powershell
Connect-MgGraph -Scopes "Application.ReadWrite.All"

$appId = "00000000-0000-0000-0000-000000000000"
$servicePrincipal = Get-MgServicePrincipal -Filter "appId eq '$appId'"

$servicePrincipal | Select-Object Id, AppId, DisplayName, AccountEnabled
Update-MgServicePrincipal -ServicePrincipalId $servicePrincipal.Id -AccountEnabled:$true

Get-MgServicePrincipal -ServicePrincipalId $servicePrincipal.Id |
    Select-Object Id, AppId, DisplayName, AccountEnabled
```

Replace the placeholder with the application ID from the exact failure. Stop if the query returns no object, the object ID does not match your evidence, or the tenant context is wrong. Do not turn the snippet into a loop over every disabled service principal.

Re-enabling does not grant missing user assignments, recreate deleted consent, replace an expired credential, repair a bad redirect URI, or override global deactivation. If the next failure changes to AADSTS50105, AADSTS65001, AADSTS7000215, or another code, treat that as a newly exposed control boundary rather than evidence that the re-enable failed.

## Verify user and workload paths separately

Run a fresh token request through the original application, tenant, and authentication flow. Then check the matching log category.

For a user-delegated flow, verify:

- the intended user can reach the application;
- required assignment and consent are still enforced;
- Conditional Access and authentication controls evaluate as designed; and
- an unassigned or out-of-scope test user remains blocked.

For an app-only flow, verify:

- the expected service principal produces a new service-principal sign-in event;
- the application ID, resource, source, and credential type match the approved workload;
- the token request succeeds without adding a new credential or permission; and
- monitoring sees no unexpected callers using the restored object.

Do not rely only on an application's green health check. Confirm new token issuance in Entra evidence and confirm the business transaction at the destination resource. Conversely, remember that previously issued access tokens can remain usable until their normal invalidation boundary. Microsoft documents this explicitly for global app deactivation; restoration testing should therefore use a fresh authentication attempt rather than a cached token.

Analysis: the strongest negative test is one that proves the neighboring controls still work. A successful approved user or workload demonstrates availability. A blocked unassigned user, unapproved tenant, or wrong credential demonstrates that restoration did not accidentally widen access.

## Troubleshoot when AADSTS7000112 persists

Work through these branches in order:

1. **The service principal still shows `accountEnabled=false`.** Verify that the save targeted the correct object and tenant, that the administrator had supported authority, and that automation did not immediately reverse the change.
2. **`accountEnabled=true`, but Activation status is still Deactivated.** Check the backing application object's global deactivation state and `disabledByMicrosoftStatus`. Tenant-local enablement cannot override either condition.
3. **One tenant works and another fails.** Compare the separate service-principal objects. This is normal multitenant isolation, not propagation between identical copies.
4. **The application disappeared.** Stop treating this as a disablement incident. Determine whether the service principal or app registration was deleted and follow the supported restore or recreation path with its original identifiers and consent review.
5. **A different AADSTS code appears.** The disabled-object boundary is cleared and Entra has reached the next validation step. Investigate the new code on its own evidence.
6. **No matching sign-in event appears.** Recheck the tenant, time in UTC, sign-in category, application ID, resource, and correlation ID. Launch Microsoft's [Sign-in diagnostic](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-use-sign-in-diagnostics) from the exact event when available.
7. **The object disables itself again.** Find the new **Update service principal** audit event. Investigate configuration-as-code, security automation, app-governance workflows, privileged scripts, and lifecycle processes instead of repeatedly toggling the property.

If escalation is required, provide the UTC event time, request and correlation IDs, resource tenant ID, app-owner tenant ID when known, application ID, service principal object ID, sign-in category, current `accountEnabled`, Activation status, available global or Microsoft disablement state, the relevant audit event, and sanitized reproduction steps. Never attach client secrets, certificates with private keys, tokens, or session cookies.

## AADSTS7000112 administrator checklist

- [ ] Confirm error code 7000112 on the exact failed request.
- [ ] Record UTC time, request ID, correlation ID, application ID, and tenant IDs.
- [ ] Locate the resource-tenant service principal by application ID.
- [ ] Record its object ID, `accountEnabled`, Activation status, ownership, and application type.
- [ ] Distinguish tenant-local disablement from global or Microsoft disablement.
- [ ] Review ApplicationManagement audit events before changing state.
- [ ] Confirm the business owner, security owner, and original reason for disablement.
- [ ] Re-enable only the intended service principal when restoration is approved.
- [ ] Verify the effective property after the write.
- [ ] Test a fresh approved user or workload token request.
- [ ] Run a negative test that proves assignments, consent, and policy still constrain access.
- [ ] Monitor for reversal, unexpected callers, and a newly exposed error code.

## Things people ask

*Does AADSTS7000112 mean the app registration was deleted?* No. Microsoft documents 7000112 as a disabled service principal in the resource tenant. A missing application is a different condition, commonly surfaced through another error such as AADSTS700016.

*Can I fix AADSTS7000112 by rotating the client secret?* No. Credential validation is downstream of the disabled service-principal boundary. Replacing a secret does not set `accountEnabled` to true and can create unnecessary outage and investigation work.

*Why does Activation status say Deactivated when Enabled for users to sign-in is Yes?* The summary status can also reflect global app-registration deactivation or Microsoft disablement. Inspect the underlying condition; the label alone is not diagnostic.

*Can a resource-tenant administrator re-enable a multitenant app?* The administrator can restore that tenant's service principal when the issue is tenant-local and the administrator has supported authority. The resource tenant cannot override a globally deactivated backing application or a Microsoft disablement.

*Will re-enabling the service principal restore existing assignments and consent?* Enabling the object changes its sign-in state; it does not recreate deleted assignments, consent grants, credentials, or configuration. Verify each dependency instead of assuming the original state still exists.

*Should I re-enable a Microsoft first-party service principal?* Do not do so reflexively. Microsoft says resource-tenant administrators are not expected or recommended to disable first-party service principals. Establish who changed it, why, and whether Microsoft controls the current disablement before restoring anything.

AADSTS7000112 is a narrow error with a wide ownership lesson: the blocked object is the service principal instance in the resource tenant, but the reason may live in tenant-local administration, the app's home tenant, Microsoft control, or an incident process. Identify that boundary first, preserve the audit trail, and restore only the object you can prove should be active.
