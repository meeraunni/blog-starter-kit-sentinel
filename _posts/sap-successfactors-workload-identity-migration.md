---
title: "SAP SuccessFactors Workload Identity Migration Guide"
excerpt: "Migrate Microsoft Entra SAP SuccessFactors provisioning from basic authentication to workload identity with staged testing, rollback, logs, and deadline checks."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-06T09:31:39-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

SAP SuccessFactors workload identity changes how Microsoft Entra provisioning authenticates to the SuccessFactors OData API. Instead of storing a technical user's password, the provisioning service obtains a short-lived Microsoft Entra token, SAP Cloud Identity Services validates it, and SAP issues the token used for the API call.

The short answer: inventory all three supported connector types, prove that SAP Cloud Identity Services is ready, preserve the current API user's role-based permissions, pilot one app, pause the production job, configure the trust, run **Test connection**, validate one person with **Provision on demand**, and only then resume incremental provisioning. Do not rotate mappings or restart the job just because the authentication method changed.

Grab a coffee before the change window. This is a three-control-plane migration across Microsoft Entra, SAP Cloud Identity Services—also called SAP IAS—and SAP SuccessFactors. A green button in only one console is not end-to-end proof.

## SAP SuccessFactors workload identity: what changes

Microsoft documents workload identity-based authentication for these gallery provisioning integrations:

- SuccessFactors to on-premises Active Directory user provisioning;
- SuccessFactors to Microsoft Entra ID user provisioning; and
- SuccessFactors Writeback.

The feature is currently **public preview**, not generally available. Microsoft's current release announcement tells customers using these integrations to migrate before November 2026 in preparation for SAP's basic-authentication changes. Treat that as an action signal, but verify the applicable date and release scope in your own SAP notices: SAP has multiple basic-authentication retirements, and a date for interactive sign-in or another integration is not automatically the date for this OData provisioning path. The [Microsoft Entra release record](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#public-preview---workload-identity-based-authentication-for-sap-successfactors-provisioning-integrations) and [SAP's linked API deprecation notice](https://help.sap.com/docs/successfactors-release-information/8e0d540f96474717bbf18df51e54e522/fcc05a902b4140e585d968c2fe4a96bc.html) are the primary change records to recheck before production.

This migration changes **connector authentication**, not the identity-lifecycle rules around it. Your scoping filters, attribute mappings, matching attributes, API user, target identities, and provisioning watermarks should remain stable unless you deliberately change them. Microsoft's [SuccessFactors integration reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/sap-successfactors-integration-reference) describes the three connectors and their data behavior; keep that separate from the new authentication path.

### The runtime trust chain

The workload-identity flow has two tokens and three services:

1. Microsoft Entra issues a signed JWT. Its issuer identifies your tenant, its subject identifies the tenant-local **SyncFabric Workload Identity ISV Integration Client** service principal, and its audience identifies your customer workload-identity app.
2. SAP IAS validates the signature, issuer, subject, and audience against its **Trust By Issuer** rule. It exchanges the Microsoft token for a short-lived SAP IAS access token.
3. Microsoft Entra provisioning presents the SAP token to the SuccessFactors OData API. SAP maps the IAS client ID to the existing technical/API user and applies that user's role-based permissions.

Microsoft publishes the exact claim model and token exchange in its [workload identity configuration guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/configure-workload-identity-sap-successfactors-provisioning). The key architecture point is that the customer workload-identity application's client ID is the audience; it is not the SyncFabric service principal's object ID, and neither value is the SAP IAS client ID.

Use this evidence map to locate the first broken boundary:

- **Microsoft Entra to SAP IAS:** issuer, JWKS URI, subject, and audience must match. A mismatch commonly produces `invalid_client_assertion` or `unauthorized_client`.
- **SAP IAS to SuccessFactors:** the IAS client ID, `sf_technical_access` dependency, and API URL must align. The token exchange can succeed while the OData call returns 403.
- **SuccessFactors authorization:** the IAS client ID must map to the correct technical/API user. The connector can authenticate while that user lacks permission for a required entity.
- **Provisioning behavior:** the existing scope, mappings, matching logic, and watermarks should remain stable. Authentication can succeed while identity outcomes drift.

This is why replacing a password is only part of the job. Trust proves who the caller is; the mapped SuccessFactors API user still determines what that caller can read or write.

## Confirm prerequisites and ownership

Do not start the production change until one named owner can make and validate changes in each service.

In Microsoft Entra, Microsoft requires an existing SuccessFactors gallery provisioning app and at least the **Application Administrator** role to create or select the workload-identity application and change the connector's authentication method. In SAP IAS, the operator needs permission to create an OpenID Connect application, add an API dependency, and configure JWT Trust By Issuer. In SuccessFactors, the operator needs access to **Manage OIDC OAuth Client Application** and permission to map the client to a technical user.

Also confirm:

- SAP IAS is already available and configured as the authentication service for the SuccessFactors instance;
- the SuccessFactors OData API host used by the current job is documented exactly;
- the current technical/API user and its role-based permission group are recorded;
- all production provisioning apps are inventoried by object ID, connector type, owner, scope, and status;
- the most recent successful incremental cycle and representative create, update, disable, and writeback events are preserved; and
- the change window includes Entra, SAP IAS, and SuccessFactors administrators at the same time.

Microsoft recommends reusing the existing API user when mapping the SAP IAS client ID. That keeps the effective SuccessFactors permissions stable across the authentication change. Creating a new, broader API user turns a credential migration into an authorization redesign and makes the before-and-after result much harder to compare.

Provisioning logs require Microsoft Entra ID P1 or P2, according to Microsoft's [provisioning-log guidance](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs). Reports Reader is the least-privileged role for tenant-wide log access, while application owners can view logs for applications they own. The preview configuration guide does not document a separate Entra add-on license for selecting workload identity; confirm preview availability in the target tenant rather than inferring entitlement from another tenant.

## Build a baseline before touching authentication

Capture evidence that lets you distinguish an authentication regression from a pre-existing data problem.

For every provisioning app, record:

- enterprise application object ID, display name, and connector type;
- current authentication method and API host;
- provisioning status, last cycle time, and last successful cycle time;
- scope setting and scoping filters;
- attribute mappings and matching precedence;
- current API user and role-based permission group;
- a small set of test people covering active, prehire, mover, terminated, and rehire behavior that the connector actually uses; and
- recent successful and failed provisioning events with their job ID and change ID.

Download the configuration or capture the settings through your approved change-record process. Do not expose the current password in screenshots or tickets. If long-term evidence matters, export provisioning logs before the window: Microsoft retains reported provisioning data for 30 days with a premium edition and documents Azure Monitor as the route for longer retention.

The goal is a control sample. After the switch, the same person, mapping, and expected target operation should produce the same identity outcome through a different authentication chain.

## Pilot the migration in the documented order

Microsoft recommends testing in development or QA first. If that is impossible, its guidance allows a separate test app in the production tenant so you can validate connectivity and a tightly scoped **Provision on demand** flow before changing the production app.

When more than one SuccessFactors connector exists, Microsoft's current order is:

1. **SuccessFactors Writeback**;
2. **SuccessFactors to Microsoft Entra ID user provisioning**; and
3. **SuccessFactors to on-premises Active Directory user provisioning**.

This sequence validates writeback first, then the cloud target, then the downstream Active Directory path. Do not flip all jobs in one change. One successful app gives you tested trust values, log patterns, and a rollback rehearsal before the next blast radius.

### 1. Pause without restarting

In the SuccessFactors enterprise application, open **Provisioning > Overview** and select **Pause provisioning**. Microsoft says pausing preserves the existing sync state and watermarks. Switching the authentication method does not itself trigger a full sync or restart the job; after you resume, incremental cycles continue from the preserved point.

That distinction matters. **Restart provisioning** clears operational state and triggers a new initial cycle. It is not a routine step in this migration. The site's [provisioning quarantine guide](/posts/microsoft-entra-provisioning-quarantine-fix-guide) explains when a restart is justified and why it changes more than a pause.

### 2. Register or select the workload identity

Under the provisioning app's **Connectivity** settings, select **Workload identity-based authentication**. Use the guided experience to register a new workload-identity app or select an existing compatible one.

There are two reuse gates:

- the workload identity's Application API host must match the SuccessFactors API host configured for the provisioning app; and
- Microsoft documents a September 15, 2026 implementation boundary: provisioning enterprise apps created after that update can select workload identities created before it, but apps created before the update cannot select identities created after it.

If an identity is unavailable, do not edit its audience to force a match. Compare the API hosts and creation-side compatibility first. When necessary, register a new workload identity for the app through the guided experience.

The first setup also creates the Microsoft first-party **SyncFabric Workload Identity ISV Integration Client** service principal in the tenant. Record its object ID. Do not grant it broad directory permissions simply because it is new; Microsoft's documented flow uses it as the token subject.

### 3. Configure trust in SAP IAS

In SAP Cloud Identity Services, create an OpenID Connect application for the integration. Under **Trust > Application APIs > Dependencies**, add the SuccessFactors application and the `sf_technical_access` API dependency. Record the dependency name.

Under **Trust > Application APIs > Client Authentication > JSON Web Tokens > Configure Trust By Issuer**, copy the values shown by Microsoft Entra:

- Token issuer to **Issuer**;
- JWKS URI to **JSON Web Key Set URI**;
- Subject to **Subject**; and
- Audience to **Audience**.

Copy values; do not reconstruct them from memory. Tenant IDs, object IDs, and client IDs can all look plausible while referring to different principals.

### 4. Map the SAP client to the existing API user

In SuccessFactors, go to **Admin Center > Security Center > Manage OIDC OAuth Client Application**. Register the documented `Entra-Provisioning` application type, then map the SAP IAS client ID to the existing technical/API user.

Validate that the user still has the role-based permissions required for every entity the provisioning job reads or writes. An OData 403 after a successful token exchange usually points here: the IAS client is mapped to the wrong user, or that user lacks permission for the requested entity.

### 5. Complete the Entra connectivity values

Back in Microsoft Entra, enter the SAP IAS client ID, token endpoint, SuccessFactors Application API URL, and application dependency name. Microsoft documents the dependency value in this form:

```text
urn:sap:identity:application:provider:name:{dependency-name}
```

Run **Test connection** before saving and activating. A successful test proves that Microsoft Entra obtained its token, SAP IAS accepted and exchanged it, and the resulting token reached the SuccessFactors OData API. It does not prove that every mapped entity and lifecycle case behaves correctly.

## Validate the identity outcomes, not just connectivity

After **Save and activate**, keep the job paused and run **Provision on demand** for a known test person. For a SuccessFactors HR connector, Microsoft says to search with the person's `personIdExternal`. Its [on-demand provisioning guide](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand?pivots=app-provisioning) explains the evaluation steps and the SuccessFactors-specific input.

Compare the result to the baseline:

- source object and target object match;
- scoping evaluation is unchanged;
- matching attributes resolve the same target;
- planned attribute values are identical;
- writeback touches only the expected SuccessFactors record;
- no unexpected create, disable, or delete is proposed; and
- the authentication step succeeds without masking a later authorization error.

Then start provisioning and observe at least one complete incremental cycle. Validate the app's Overview status and Microsoft Entra provisioning logs. In SAP IAS, open **Monitoring & reporting > Troubleshooting logs**, inspect `login` and `issueJwtToken` activity, and filter with the IAS application's client ID. In SuccessFactors, inspect the **OData API Audit Log** for the API user. Microsoft's guide says the authorization evidence changes from masked Basic authentication before migration to masked Bearer authentication afterward.

**Analysis:** the strongest acceptance test is a three-way correlation: one Entra provisioning event, one SAP IAS token event, and one SuccessFactors OData event for the same change window and API user. A green connection test is necessary, but this correlated trail proves the runtime path and the business operation.

## Troubleshoot by the first broken boundary

### Existing workload identity cannot be selected

Compare the Application API hosts first. If they match, check which side of the September 15, 2026 compatibility boundary created the enterprise app and workload identity. Register a compatible identity rather than rewriting an established audience.

### SAP IAS returns `invalid_client_assertion`

The Microsoft token reached SAP IAS, but the subject or audience does not match the Trust By Issuer rule. Compare the four values emitted by the Entra guided experience with the saved SAP IAS rule. Do not swap the SyncFabric service principal object ID, customer app client ID, and SAP IAS client ID.

### SAP IAS returns `unauthorized_client`

Microsoft documents this when the JWKS URI is unreachable or signature validation fails. Confirm that SAP IAS can reach the Microsoft Entra OIDC metadata path and that the issuer contains the correct tenant ID.

### The OData call returns 403

The authentication chain may be healthy while SuccessFactors authorization is not. Verify the IAS client-to-technical-user mapping and the API user's role-based permissions. Compare the API host and the requested entity to the baseline before widening permissions.

### Test connection works but provisioning outcomes differ

Stay out of the token layer. Compare scope, mappings, matching precedence, API user, and target records. Use the Microsoft Entra provisioning steps and modified-properties export to find the first different decision. The [HiBob-to-AD provisioning guide](/posts/hibob-to-active-directory-provisioning-microsoft-entra) provides a related pattern for separating source, transformation, and target evidence without conflating connector brands.

### The job enters quarantine

Preserve the first errors and quarantine reason. Fix the trust or authorization boundary, then choose the smallest recovery action. Do not immediately restart: a restart triggers a full initial cycle and clears watermarks, which can make the incident larger and discard useful state.

## Roll back without losing the trail

Microsoft currently documents a rollback to basic authentication from the same authentication-method selector while SAP still supports it. Because this path is preview and because external retirement timing can change, validate that fallback immediately before the production window; do not assume it will exist forever.

A controlled rollback is:

1. Pause provisioning.
2. Export the failed Entra, SAP IAS, and SuccessFactors evidence with UTC times and identifiers.
3. Select basic authentication and restore the approved connectivity values through the supported UI.
4. Run **Test connection**.
5. Run Provision on demand for the same control person.
6. Resume the job and observe a complete incremental cycle.
7. Leave the workload-identity objects and trust rule intact until the incident review decides whether to reuse or remove them.

Do not delete the app registration, SyncFabric service principal, IAS application, or OIDC mapping during rollback. Deletion can erase the evidence you need and complicate a second attempt. Also do not change attribute mappings while diagnosing authentication; that creates two independent variables.

## SAP SuccessFactors workload identity checklist

- [ ] Confirm the feature is still public preview and available in the target tenant.
- [ ] Recheck Microsoft's current release instruction and the tenant-specific SAP deprecation notice.
- [ ] Inventory writeback, Entra-target, and AD-target provisioning apps.
- [ ] Name one operator for Microsoft Entra, SAP IAS, and SuccessFactors.
- [ ] Record API hosts, object IDs, scopes, mappings, API users, and last healthy cycles.
- [ ] Preserve representative provisioning events and change IDs.
- [ ] Validate in nonproduction or with a tightly scoped test app first.
- [ ] Reuse the existing API user and its role-based permissions.
- [ ] Migrate one connector at a time in Microsoft's documented order.
- [ ] Pause the job; do not restart it as a routine migration step.
- [ ] Copy issuer, JWKS URI, subject, and audience exactly into SAP IAS.
- [ ] Add the `sf_technical_access` dependency and record its name.
- [ ] Map the SAP IAS client ID to the correct SuccessFactors API user.
- [ ] Pass Test connection and Provision on demand for `personIdExternal`.
- [ ] Observe a complete incremental cycle before moving to the next app.
- [ ] Correlate Entra provisioning, SAP IAS, and SuccessFactors OData logs.
- [ ] Rehearse and time-box rollback while basic authentication remains supported.

## Frequently asked questions

### Is SAP SuccessFactors workload identity generally available?

No. Microsoft's current release record classifies this connector authentication option as public preview. Preview behavior and availability can change, so recheck the configuration guide before each production wave.

### Does switching authentication restart provisioning?

No. Microsoft says the authentication change does not trigger a full sync or restart. Pausing preserves sync state and watermarks, and starting again continues incremental provisioning from that state.

### Can one workload identity serve several SuccessFactors provisioning apps?

Potentially. The Application API host must match, and Microsoft's September 15, 2026 compatibility rule affects which older and newer apps can select which identity. Prove compatibility in the portal rather than assuming reuse.

### Should I create a new SuccessFactors API user?

Microsoft recommends mapping the SAP IAS client ID to the same API user used by basic authentication. That preserves role-based permissions and makes the authentication methods comparable. Create a different user only as a separately reviewed authorization change.

### When should I restart the provisioning job?

Not for the normal authentication switch. Restart only when a documented recovery scenario requires a new initial cycle and you accept the watermark and workload consequences. Pause and resume are the safe migration operations.

The migration is complete when the trust chain, authorization boundary, and identity outcome all agree: **Entra issues the expected token, SAP IAS exchanges it, SuccessFactors authorizes the same API user, and the provisioning job produces the same controlled lifecycle result without a stored password**.

## Microsoft and SAP sources

- [Configure workload identity-based authentication for SAP SuccessFactors provisioning](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/configure-workload-identity-sap-successfactors-provisioning)
- [Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new)
- [Microsoft Entra ID and SAP SuccessFactors integration reference](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/sap-successfactors-integration-reference)
- [Provision a user or group on demand](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand?pivots=app-provisioning)
- [Analyze Microsoft Entra provisioning logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-analyze-provisioning-logs)
- [SAP SuccessFactors API basic-authentication deprecation notice](https://help.sap.com/docs/successfactors-release-information/8e0d540f96474717bbf18df51e54e522/fcc05a902b4140e585d968c2fe4a96bc.html)
