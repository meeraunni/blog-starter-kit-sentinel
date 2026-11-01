---
title: "AADSTS90094 Admin Consent Required: Microsoft Entra Fix"
excerpt: "Fix AADSTS90094 admin consent required errors by proving the requested permissions, consent policy, app trust, assignment, and approval evidence."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-01T09:02:53-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

An **AADSTS90094 admin consent required** error means the signed-in user cannot grant the permissions in the application's current authorization request. The safe fix is not to relax consent policy or click **Grant admin consent** on instinct. First prove the client application, resource API, requested delegated or application permissions, tenant, existing grants, publisher, assignment setting, and business purpose. Then approve only when the request is trusted and least-privileged, or deny it and have the owner reduce or correct the request.

Grab a coffee before treating this as a help-desk permission ticket. Microsoft documents three important AADSTS90094 paths: the app requests a permission only an administrator can grant, Microsoft treats the permission request as risky, or the enterprise application requires assignment but does not yet have tenant-wide admin consent. Those paths can look similar to the user, but they do not carry the same security decision. ([Microsoft's consent-error guidance](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-sign-in-unexpected-user-consent-error))

This guide is based on current Microsoft documentation and does not claim a live tenant test. It is for Entra administrators, application owners, security reviewers, and service-desk teams resolving the error without authorizing an untrusted app, widening user consent tenant-wide, or confusing permission consent with user assignment.

## AADSTS90094 admin consent required: the short answer

Work the incident in this order:

1. Preserve the complete error, UTC timestamp, correlation ID, request ID, user, tenant, application ID, resource, and redirect URI.
2. Match the application ID to the intended enterprise application and, for an internally owned app, its app registration.
3. Capture the exact permissions in the current request. Separate delegated permissions from application permissions and identify which resource API owns each one.
4. Compare requested permissions with the grants already present on **Enterprise applications > the app > Permissions**.
5. Check whether **Assignment required?** is enabled and whether the user or an eligible group is assigned. Keep assignment and consent as separate gates.
6. Review the effective user-consent policy and whether the admin consent workflow is enabled.
7. Validate the publisher, owners, redirect URI, business purpose, and least-privilege case. A verified publisher is useful evidence, not automatic approval.
8. Approve through the governed admin-consent path only if the request passes review. Otherwise deny it and send the app owner the exact permissions or configuration that must change.
9. Start a fresh sign-in, confirm the required grant exists, prove the assigned user can obtain access, and preserve the related sign-in and audit evidence.

AADSTS90094 is an authorization-consent boundary. Resetting a password, re-registering MFA, rotating a client secret, or disabling Conditional Access does not create a missing permission grant.

## Place AADSTS90094 in the consent control plane

In an interactive OAuth or OpenID Connect flow, the client application asks Microsoft Entra for access to one or more resource APIs. The request can include delegated permissions that let the app act on behalf of the signed-in user. An app-only workload instead uses application permissions, also called app roles, and no user is present at runtime. Microsoft explains that user consent is possible only when the tenant policy, application, publisher, permission classification, and requested permission allow that user to consent. ([user and admin consent overview](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/user-admin-consent-overview), [Microsoft Graph permissions overview](https://learn.microsoft.com/en-us/graph/permissions-overview))

AADSTS90094 means the current user cannot cross that consent gate for the current request. Keep the nearby outcomes distinct:

- **AADSTS65001:** no existing grant satisfies the requested permission. The site's [AADSTS65001 consent-required guide](/posts/aadsts65001-consent-required-microsoft-entra) covers that broader missing-grant intent.
- **AADSTS90094:** the user cannot grant the requested access because an administrator is required, the request is treated as risky, or assignment-required configuration needs tenant-wide admin consent.
- **AADSTS900941:** Microsoft identifies the app as risky and admin consent is required while the admin consent workflow is off.
- **AADSTS900981:** an admin consent request for a risky app has reached the workflow; the request still requires careful review.
- **AADSTS65004:** the user declined consent, or the documented admin-consent workflow returned the user to the app before approval was complete.
- **AADSTS50105:** consent can exist, but the user is not assigned to an application that requires assignment. Use the [AADSTS50105 assignment-required guide](/posts/aadsts50105-user-not-assigned-microsoft-entra) for that separate access gate.

The distinction matters operationally. A consent grant authorizes an application to call an API. An assignment controls which users or groups can sign in to that enterprise application when assignment is required. Granting consent does not automatically assign everyone, and assigning a user does not create the application's permission grants. ([unexpected consent prompt guidance](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-sign-in-unexpected-user-consent-prompt))

## Capture the failed request before changing policy

Ask the user or application owner for the complete error page or protocol response. Preserve:

- AADSTS code and full description;
- UTC timestamp, trace ID, correlation ID, and request ID when present;
- signed-in user and home tenant;
- tenant in the authorization endpoint;
- `client_id`, application display name, and redirect URI;
- resource API and the exact `scope` values requested;
- whether `prompt=consent` or `prompt=admin_consent` was forced;
- user action immediately before the error; and
- last known successful sign-in and the application version that produced it.

Do not paste tokens, authorization codes, session cookies, or client secrets into a ticket. The identifiers and request parameters are enough to establish the control-plane path.

Microsoft's consent troubleshooting guidance recommends examining the authorization request and comparing its permissions with the application's configured and granted permissions. It also warns that adding an API permission to an app registration is not the same as granting that permission to the tenant-local service principal. ([troubleshoot Microsoft Entra consent issues](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/troubleshoot-consent-issues))

> [!NOTE]
> **Analysis:** If one release suddenly generates AADSTS90094 for many established users, compare the before-and-after authorization requests. A newly requested scope, a forced consent parameter, a changed resource, or a different client ID is usually more informative than changing tenant consent policy.

## Prove the application, resource, and effective request

Open **Entra ID > Enterprise applications > All applications** and locate the application by its Application ID, not only its display name. Display names are not unique. Confirm:

- the enterprise application's Application ID matches `client_id`;
- the object is in the tenant named in the failed request;
- publisher name and publisher verification state;
- owners and business contact;
- home tenant and whether the app is first-party, tenant-owned, or multitenant;
- redirect URI and sign-in audience for an internally owned registration;
- **Permissions** already granted on the enterprise application; and
- **Properties > Assignment required?** plus the user's effective assignment.

Then map every requested permission to the resource application that exposes it. Record whether it is delegated or application access, whether administrator consent is required, what data or operation it authorizes, and why the app needs it.

Do not approve a friendly display name. Approve an identified client principal, an identified resource, and a reviewed permission set.

### Compare requested and granted permissions

On the enterprise application's **Permissions** page, compare the current grants with the permissions shown in the consent prompt. Microsoft notes that an app can prompt again after admin consent when it requests another permission that was not part of the previous grant. Dynamic and incremental consent can therefore produce a legitimate new request, but the delta still needs review. ([user and admin consent overview](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/user-admin-consent-overview), [unexpected consent prompt guidance](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-sign-in-unexpected-user-consent-prompt))

If the app forces `prompt=consent` on every sign-in, do not keep granting access. Microsoft tells administrators to work with the publisher when an app continues to force consent after a tenant-wide grant. The application request may need correction. ([unexpected consent prompt guidance](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-sign-in-unexpected-user-consent-prompt))

## Decide which AADSTS90094 branch you have

- **The permission is admin-restricted or is an application permission.** The current user lacks authority for the grant. Review the app and use an authorized administrator only if the request is justified.
- **The consent audit failure says Risky application detected.** A Microsoft risk control blocked user consent. Treat this as an application-security review; do not bypass the decision because the user needs the app.
- **Assignment required? is Yes and tenant-wide consent is absent.** Assignment and consent gates are both in play. Review admin consent, then separately verify the user's assignment.
- **The existing grant omits one newly requested scope.** This is an incremental or changed permission request. Review the delta with the owner; approve the justified scope or have the owner remove it.
- **Existing grants match, but the request still forces consent.** The application request or publisher behavior needs correction. Remove the forced consent behavior through the owner or vendor; do not broaden tenant policy.
- **The client ID, tenant, resource, or redirect path is wrong.** Correct the application request; do not authorize the wrong object.

Microsoft records the risky-request case as an `ApplicationManagement` audit event with activity **Consent to application** and status reason **Risky application detected**. That evidence distinguishes a security decision from a generic missing grant. ([Microsoft's consent-error guidance](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-sign-in-unexpected-user-consent-error))

## Review consent policy without weakening the tenant

Check **Entra ID > Enterprise apps > Consent and permissions > User consent settings**. Microsoft's current model can disable user consent, allow user consent only for selected conditions such as verified publishers and chosen low-impact permissions, or allow consent to permissions that do not require an administrator. Microsoft recommends restricting user consent to verified publishers and selected permissions rather than treating open consent as the troubleshooting default. ([configure user consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent), [application consent management](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-consent-requests))

Do not switch the tenant to a broader user-consent setting to make one error disappear. That changes the authorization boundary for every user and future application request. Repair the specific app request or use the governed administrator path.

Microsoft's configuration page lists a Privileged Role Administrator prerequisite for programmatic user-consent policy configuration and Global Administrator for changing that setting in the Entra admin center. Use the least-privileged eligible role and your normal privileged-access process. ([configure user consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent))

## Use the admin consent workflow as a review queue

When the workflow is enabled, a user who cannot consent can submit a justification from the **Approval required** experience. Designated reviewers receive the request, and the user is notified after a reviewer acts. Reviewers can view, block, or deny requests, but being named a reviewer does not grant the directory permissions required to approve them. ([configure the admin consent workflow](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow))

Before relying on the workflow, verify:

- **Users can request admin consent to apps they are unable to consent to** is enabled;
- reviewers are current users, groups, or roles with a supported operating process;
- email notifications and request expiration match the response target;
- the reviewer also holds the role required for the requested permissions; and
- the request was created after the reviewer was assigned.

Microsoft says enabling the workflow can take up to an hour. New reviewers do not inherit requests created before they were assigned, and static plus dynamic permission requests can appear as two requests for one application. These are workflow behaviors, not proof that the app is safe. ([admin consent workflow configuration](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow), [admin consent workflow FAQ](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/admin-consent-workflow-faq))

The workflow documentation does not list a P1 or P2 subscription as a prerequisite for enabling the workflow. Licensing does affect how long Entra retains audit and sign-in evidence: Microsoft documents seven days for Entra ID Free and 30 days for P1 or P2. Route logs to an approved destination when investigations or review cycles need longer retention. ([Microsoft Entra data retention](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention))

## Evaluate the request before approving it

Tenant-wide admin consent is a security decision, not a mechanical fix. Microsoft warns that it can give an application's publisher access to significant portions of organizational data or highly privileged operations. If you do not understand who controls the app or why it needs the permissions, do not grant consent. ([application consent management](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-consent-requests))

Use a written review that answers:

1. **Identity:** Which exact application and service principal are involved? Who owns them?
2. **Publisher:** Is the publisher verified, expected, and contractually accountable? Verification does not replace permission review.
3. **Purpose:** What user or workload function requires each permission?
4. **Access model:** Is the permission delegated or application access? What data population can it reach?
5. **Least privilege:** Can the owner remove a scope, use a narrower API permission, or split an app-only operation from the interactive client?
6. **Redirect and tenant:** Does the current request return to an approved URI in the intended tenant?
7. **Assignments:** If access should be limited, is user assignment required and are only the intended users or groups assigned?
8. **Operations:** Who monitors sign-ins, permission changes, credential changes, owner changes, and anomalous activity?
9. **Revocation:** How will you remove the grant, disable access, notify owners, and validate downstream impact?

Publisher verification helps establish publisher identity, but Microsoft explicitly advises reviewing the requested permissions even for a verified publisher. ([protect against consent phishing](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/protect-against-consent-phishing))

## Grant the smallest justified access

If the request passes review, use **Enterprise applications > the verified app > Permissions > Grant admin consent**. For an internally owned app, the equivalent **App registrations > the app > API permissions** path can be used. Re-read the prompt immediately before accepting; it is the effective permission set you are authorizing. ([grant tenant-wide admin consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent))

Microsoft documents these role boundaries for tenant-wide grants:

- **Privileged Role Administrator** can grant consent for any permission for any API.
- **Cloud Application Administrator**, **AI Administrator**, or **Application Administrator** can grant permissions except Microsoft Graph application permissions.
- A suitably defined custom directory role can grant the permissions within its delegated authority.

Do not elevate a reviewer permanently just to clear the queue. Use the organization's approved just-in-time privileged-access process. If the request is not justified, deny or block it and record the specific reason: unverified ownership, excessive scope, unexpected resource, wrong tenant, invalid redirect, no business owner, or insufficient monitoring.

If only a limited population should use the approved application, keep **Assignment required?** enabled and assign the intended users or groups. Microsoft confirms that tenant-wide consent and assignment are separate: consent can be granted for the organization while sign-in remains restricted to assigned principals. ([grant tenant-wide admin consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent), [admin consent workflow FAQ](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/admin-consent-workflow-faq))

## Validate the repair and preserve evidence

After approval or application correction, have the affected user begin a fresh authentication flow. Do not reuse the failed authorization response. Confirm:

- the request uses the intended tenant, client ID, resource, scopes, and redirect URI;
- the consent prompt no longer appears for already granted permissions;
- the user is assigned when assignment is required;
- Microsoft Entra issues the expected token; and
- the application completes one representative operation within its approved access.

Then review:

- **Entra ID > Monitoring & health > Sign-in logs** for the failed AADSTS90094 event and the successful retry;
- **Enterprise applications > the app > Audit logs** for the consent and permission changes; and
- **Enterprise applications > the app > Permissions** for the final delegated grants and app-role assignments.

Microsoft's application-permission audit reference maps user consent to **Consent to application**, delegated grants to **Add delegated permission grant**, and application permissions to app-role assignment events. Reports Reader is the least-privileged documented role for viewing activity logs. ([application permission audit logs](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/app-perms-audit-logs), [access activity logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-access-activity-logs))

> [!NOTE]
> **Analysis:** Approval is complete only when the directory grant, user assignment, fresh sign-in, and application operation agree. A green consent prompt alone does not prove that the correct user, tenant, resource, or runtime request was repaired.

## Roll back or contain an unsafe grant

If the app was approved with the wrong permissions or later proves unsafe:

1. Preserve the consent request, audit events, sign-ins, publisher details, owners, and granted permissions.
2. Revoke the specific delegated grant or app-role assignment through the approved application-governance process.
3. Disable user sign-in to the enterprise application when immediate containment is required and authorized.
4. Remove unintended assignments and investigate recent owner, credential, redirect URI, and permission changes.
5. Notify affected data owners and application owners through the incident process.
6. Retest that the app no longer obtains the revoked access and that unrelated applications still work.

Do not delete the enterprise application as the first rollback step unless the incident decision explicitly calls for it. Deletion can remove SSO configuration, assignments, provisioning, ownership, and evidence beyond the erroneous grant. Microsoft documents permission revocation and disabling access as separate controls. ([application consent management](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-consent-requests))

## Troubleshoot the remaining AADSTS90094 failure

### Admin consent was granted, but the error returns

Compare the new request with the exact final grant. The app may request an additional dynamic scope, use a different client ID or tenant, target another resource, or force `prompt=consent`. Check the deployed application configuration rather than repeating the grant.

### The reviewer can see the request but cannot approve it

Reviewer designation does not elevate directory permissions. Match the requested permission to the administrator role documented for that grant. For Microsoft Graph application permissions, use the supported privileged role and the organization's just-in-time process.

### The user is assigned but still sees admin consent required

Assignment does not grant API permissions. If **Assignment required?** is enabled, the application still needs tenant-wide admin consent for its requested permissions. Review and grant only the justified set.

### A verified publisher app is still blocked as risky

Verified publisher status is one trust signal, not a guarantee that the request is appropriate. Preserve the risky-application audit reason, review every permission, publisher, redirect, owner, and business case, and report a suspicious app through the documented consent experience when warranted.

### The workflow was just enabled, but users see no request option

Microsoft says enablement can take up to an hour. Confirm the setting was saved, the user is starting a new sign-in, and the request actually requires administrator consent. Do not toggle consent policy repeatedly during propagation.

## AADSTS90094 administrator checklist

- [ ] Capture the full error, UTC time, correlation ID, request ID, user, and tenant.
- [ ] Match `client_id` to the exact enterprise application.
- [ ] Record the resource API, requested scopes, and redirect URI.
- [ ] Separate delegated permissions from application permissions.
- [ ] Compare requested permissions with existing grants.
- [ ] Check publisher, owners, home tenant, and business purpose.
- [ ] Check **Assignment required?** and effective user or group assignment.
- [ ] Review the effective user-consent policy without broadening it.
- [ ] Check whether the admin consent workflow is enabled and propagated.
- [ ] Match the reviewer and approver to the required role.
- [ ] Review the least-privilege case for every permission.
- [ ] Deny requests with unclear ownership, purpose, or excessive access.
- [ ] Grant through the governed admin path only after approval.
- [ ] Start a fresh sign-in and test one representative operation.
- [ ] Preserve sign-in, consent, delegated-grant, and app-role audit evidence.
- [ ] Configure monitoring and retention appropriate to the app's risk.
- [ ] Document the revocation and containment path.

## Frequently asked questions

### Does AADSTS90094 mean user consent is disabled for the whole tenant?

Not necessarily. The app can request an admin-restricted permission, Microsoft can treat the request as risky, or assignment-required configuration can require tenant-wide admin consent. Read the request, enterprise-app properties, consent policy, and audit reason before choosing a fix.

### Is granting admin consent the same as assigning the user?

No. Consent grants an application permission to access a resource API. Assignment determines which users or groups can sign in when the enterprise application requires assignment. An application can require both.

### Should I enable user consent for all apps to clear the error?

No. That changes the tenant-wide authorization boundary and still cannot let users approve permissions that require an administrator. Review the specific application and use the governed admin-consent path.

### Can an Application Administrator approve every request?

No. Microsoft documents that Application Administrator, Cloud Application Administrator, and AI Administrator cannot grant Microsoft Graph application permissions. Privileged Role Administrator can grant any permission for any API; custom roles are limited to their defined authority.

### Does a verified publisher make the application safe to approve?

No. Verification helps establish publisher identity. You must still validate the permission set, data reach, application owners, redirect URI, tenant, business purpose, monitoring, and revocation plan.

### Why does the app ask again after consent was granted?

The current request might include another scope, use dynamic consent, target a different resource or tenant, or force a new consent prompt. Compare the live authorization request with the grant instead of approving it again blindly.
