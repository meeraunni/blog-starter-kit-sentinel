---
title: "Microsoft 365 Cross-Tenant Calendar Sharing Migration"
excerpt: "Migrate Microsoft 365 cross-tenant calendar sharing safely. Inventory OrgRel, map scopes, coordinate testing, preserve rollback, and verify both tenants."
coverImage: "/assets/blog/cover.jpg"
date: "2026-09-30T17:10:55-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

To migrate **Microsoft 365 cross-tenant calendar sharing**, first inventory every Exchange Online Organization Relationship, Availability Address Space, and Sharing Policy. Translate each enabled function and scope into the corresponding Microsoft 365 capability, establish Microsoft 365 Collaboration trust with the partner tenant, then test the new path by temporarily disabling the legacy configuration in both organizations. Remove the old object only after free/busy, calendar detail, and MailTips behave as approved in both directions.

That is the short answer. The important caveat is timing: Microsoft says the new policy is still rolling out and might not have reached your tenant. Do not disable a working relationship simply because the Graph endpoint exists. Confirm rollout for your tenant, create and read back the new capability, agree on a test window with the partner, and keep a tested restoration path.

Grab a coffee before the first change window. This is not merely an Exchange cmdlet swap. The legacy controls identify partners largely through domains and Exchange endpoints; the new model binds Microsoft 365 capabilities to a Microsoft Entra tenant ID and an Entra cross-tenant trust. Microsoft's [migration guide for free/busy, calendar sharing, and MailTips](https://learn.microsoft.com/en-us/exchange/sharing/migrate-to-m365-xtap) was updated on September 30, 2026, and is the procedural source of truth for this article.

## Microsoft 365 cross-tenant calendar sharing: what changes

Microsoft 365 cross-tenant access policy adds an authorization layer for Microsoft 365 resources on top of Microsoft Entra cross-tenant access settings. Entra establishes which partner tenant is trusted for Microsoft 365 collaboration. The Microsoft 365 capability then defines which calendar, free/busy, or MailTips information that partner may retrieve from your tenant.

Microsoft's [Microsoft 365 cross-tenant access policy API overview](https://learn.microsoft.com/en-us/graph/api/resources/m365-cross-tenant-access-policy-overview?view=graph-rest-1.0) documents three properties that matter operationally:

- the policy is **inbound**: the tenant that owns the data decides what it exposes;
- a default policy supplies a baseline, while a partner policy overrides it for one tenant; and
- the Microsoft service default is disabled for all Microsoft 365 capabilities.

Bidirectional sharing therefore needs complementary configuration in both tenants. Enabling access in Contoso lets the approved Fabrikam users retrieve Contoso data; it does not automatically let Contoso users retrieve Fabrikam data.

This policy does not create guests, synchronize identities, or grant application access. If the project also needs lifecycle-managed B2B accounts, treat that as a separate design and use the site's [Microsoft Entra cross-tenant synchronization guide](/posts/microsoft-entra-cross-tenant-synchronization). If sign-in itself fails, classify that independently with the [AADSTS50020 external-user troubleshooting guide](/posts/microsoft-entra-aadsts50020-external-user-sign-in-failures).

> [!IMPORTANT]
> **Analysis:** a successful Graph write proves that a policy object exists. It does not prove that the feature has reached the tenant, that the partner configured the reverse direction, or that Outlook is using the new path. Only a coordinated functional test after the legacy path is disabled proves the migration.

## Treat rollout availability as the first gate

Microsoft currently says the calendar, free/busy, and MailTips migration capability is rolling out and may not yet be available in every tenant. The guidance tells administrators to consult Microsoft 365 Message Center and the Exchange Team announcement, migrate after rollout reaches the tenant, and finish before the applicable EWS dependency is retired.

No public Message Center identifier is assumed here. Message Center content is tenant-specific and requires authenticated access. Before scheduling production work, capture the announcement visible in each participating tenant and record:

- the rollout status and target dates shown for that tenant;
- whether the tenant and cloud are supported by the v1.0 operation;
- the partner tenant ID, not only its SMTP domains;
- the administrator in the other tenant who will make the reciprocal change; and
- the workloads and client paths included in the test.

The v1.0 [create-partner-capability reference](https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationpartner-post-m365capabilities?view=graph-rest-1.0) currently lists the global service as supported and US Government L4, US Government L5/DoD, and China operated by 21Vianet as unsupported for that operation. Do not extrapolate commercial-cloud availability to a sovereign tenant.

The broader Exchange Web Services retirement is related context, not a license to collapse every EWS scenario into this migration. Microsoft announced that it will start blocking EWS requests from non-Microsoft applications in Exchange Online on October 1, 2026. The cross-tenant migration guide separately explains that legacy Organization Relationships and Sharing Policies use EWS or older high-privilege patterns for these Microsoft 365 collaboration scenarios. Use the migration guide's scope, not the generic retirement date, to decide which tenant-to-tenant objects belong in this project. [Microsoft's EWS retirement announcement describes the non-Microsoft application boundary](https://techcommunity.microsoft.com/blog/exchange/retirement-of-exchange-web-services-in-exchange-online/3924440/).

## Inventory the three legacy control planes

Do not start with the Graph POST. Start with a read-only inventory and a diagram of who reads whose data.

### Organization Relationships

An Organization Relationship can expose free/busy and MailTips information. Export the fields Microsoft identifies before translating anything:

```powershell
Get-OrganizationRelationship |
  Format-List Name, DomainNames, Enabled,
    FreeBusyAccessEnabled, FreeBusyAccessLevel, FreeBusyAccessScope,
    MailTipsAccessEnabled, MailTipsAccessLevel, MailTipsAccessScope,
    TargetSharingEpr, TargetAutodiscoverEpr, TargetApplicationUri
```

For each enabled relationship, record the external domains, Microsoft Entra tenant ID, access levels, scoping groups, and whether the object also carries a non-calendar function. Microsoft warns that if the same relationship supports another feature such as cross-tenant mailbox migration, that function must be moved to a separate relationship before the calendar or MailTips object is retired.

### Availability Address Spaces

Inventory availability routing separately:

```powershell
Get-AvailabilityAddressSpace |
  Format-List ForestName, AccessMethod, TargetAutodiscoverEpr,
    TargetServiceEpr, TargetTenantId
```

Microsoft says only `OrgWideFBToken` is functional for free/busy sharing between two Exchange Online tenants in this migration pattern. It also says Exchange Online-to-Exchange Online Availability Address Space sharing does not depend on EWS and is not broken by the EWS retirement. Migration can still provide more granular policy, but it is not automatically an emergency merely because EWS has a deadline.

### Sharing Policies

Sharing Policies govern user calendar sharing, including wildcard, domain-specific, and anonymous publishing entries:

```powershell
Get-SharingPolicy | Format-List Name, Enabled, Domains, Default

Get-EXOMailbox -ResultSize Unlimited \
  -RecipientTypeDetails UserMailbox,SharedMailbox \
  -Properties SharingPolicy |
  Group-Object SharingPolicy |
  Select-Object Name, Count
```

The mailbox count matters. A tenant can have multiple policies assigned to different populations. A single tenant-wide replacement that ignores those assignments can expose more calendar data than the legacy design did.

Store the command output in the approved change record. Also capture group object IDs and current membership for every legacy `FreeBusyAccessScope` or `MailTipsAccessScope`. Display names are not durable evidence.

## Map legacy access to the exact Microsoft 365 capability

Use a decision record rather than translating by memory.

For Organization Relationship free/busy:

```text
AvailabilityOnly -> crossTenantCalendarAvailabilityBasic
LimitedDetails   -> crossTenantCalendarAvailabilityLimitedDetails
```

The basic capability exposes time only. The limited-details capability adds subject and location.

For MailTips:

- `Limited` maps to `crossTenantMailTipsLimited`.
- `All` maps to `crossTenantMailTipsAll`, including out-of-office status, automatic replies, and the documented recipient-specific information.

For Sharing Policy calendar access, the capability names are case-sensitive:

```text
CalendarSharingFreeBusySimple   -> CrossTenantCalendarSharingFreeBusySimple
CalendarSharingFreeBusyDetail   -> CrossTenantCalendarSharingFreeBusyDetail
CalendarSharingFreeBusyReviewer -> CrossTenantCalendarSharingFreeBusyReviewer
```

The simple capability exposes time only, detail adds subject and location, and reviewer exposes full calendar detail.

Anonymous calendar publishing uses the corresponding capability:

```text
AnonymousCalendarSharingFreeBusySimple
AnonymousCalendarSharingFreeBusyDetail
AnonymousCalendarSharingFreeBusyReviewer
```

Microsoft documents anonymous capabilities on the **default** policy only; they cannot be assigned to one partner tenant ID. That is a materially wider trust boundary, so do not convert an anonymous entry without explicit data-owner approval.

Prefer partner-specific capability entries over a default wildcard when the legacy design names a known organization. The default baseline affects every external tenant without an overriding partner policy. Preserve or narrow the old exposure; do not turn a domain-specific relationship into a global rule for convenience.

Security-group scope is the other critical translation. The capability can include a group of internal users whose calendar or MailTips data the partner may retrieve. Where different Sharing Policies were assigned to different mailboxes, Microsoft says groups are needed to create comparable cross-tenant policy scopes. Validate those groups as security boundaries: ownership, membership source, nesting behavior, and change control all become part of the disclosure control.

## Establish trust and capability with least privilege

Microsoft's migration procedure uses these delegated Graph scopes:

```powershell
Connect-MgGraph -Scopes `
  "Policy.Read.All,Policy.ReadWrite.CrossTenantAccess,Policy.ReadWrite.CrossTenantCapability" `
  -ContextScope Process
```

The Microsoft 365 Collaboration trust is configured on the partner object in the Entra cross-tenant access policy. Creating or changing that trust requires Global Administrator in Microsoft's migration workflow. Read the existing partner object before writing: a partner can already carry B2B collaboration, tenant restrictions, inbound trust, or identity-synchronization settings. Do not replace the whole object with a calendar-only sample.

Once the trust exists, create the calendar capability on the partner-specific v1.0 route:

```http
POST https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}/m365Capabilities
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.CrossTenantCalendarSharingFreeBusyDetail",
  "inboundAccess": {
    "isAllowed": true,
    "resourceScopes": {
      "included": [
        {
          "resourceId": "<approved-security-group-object-id>",
          "resourceType": "group"
        }
      ],
      "excluded": []
    }
  }
}
```

Use the capability that matches the approved legacy access; the example is not a default recommendation. The create operation requires this permission:

```text
Policy.ReadWrite.CrossTenantCapability
```

Microsoft's v1.0 permission reference supports Global Administrator for all capabilities and Exchange Administrator for MailTips, calendar sharing, and free/busy capabilities. Use time-bound elevation and disconnect the Graph session after the change.

Read back both layers after every write:

```http
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}

GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}/m365Capabilities
```

Compare tenant ID, capability name, `isAllowed`, included scope, and exclusions with the approved mapping. A `201 Created` response is not sufficient validation.

## Pilot without losing the rollback path

Legacy Organization Relationships, Availability Address Spaces, and Sharing Policies take precedence over the new policy. That makes a side-by-side readback useful, but it also means the old path can mask a broken new path.

Use a coordinated cutover:

1. **Prepare both tenants.** Name an operator and verifier in each organization. Agree on the exact objects, reciprocal direction, test users, test calendars, expected detail, start time, stop condition, and restoration owner.
2. **Create and read back the trust and capabilities.** Do this before touching the legacy path. Limit the pilot to a representative group where the intended legacy scope allows it.
3. **Capture a pre-change test.** Verify free/busy, calendar sharing, and MailTips through the clients that matter. Record which details are visible and in which direction.
4. **Disable reversible legacy objects.** Microsoft documents `Set-OrganizationRelationship -Enabled $False` and `Set-SharingPolicy -Enabled $False`. Disable only the objects in the approved mapping.
5. **Handle Availability Address Space carefully.** Microsoft says it cannot be temporarily disabled. Export it with `Export-Clixml` before removal and validate the restoration command in the change plan.
6. **Test the new path in both directions.** Test time-only versus detailed visibility, an in-scope mailbox, an out-of-scope mailbox, MailTips where used, and an anonymous link only if anonymous publishing is part of the approved design.
7. **Stop on ambiguity.** If a client returns cached information, the detail level is wrong, the partner cannot complete its side, or rollout status is uncertain, restore the legacy configuration and investigate outside the production window.
8. **Observe before cleanup.** Keep disabled, recoverable legacy objects through the agreed stability period. Delete them only when data owners and both tenant operators accept the evidence.

Rollback for an Organization Relationship or Sharing Policy is re-enabling the exact disabled object. Rollback for an Availability Address Space is recreation from the verified export. Rollback is not deleting the new partner policy during an outage; that can remove useful evidence and may disturb other Microsoft 365 capabilities on the same partner.

## Validate function, scope, and evidence separately

A useful test matrix has positive and negative cases.

- **Partner and direction:** confirm Contoso-to-Fabrikam and Fabrikam-to-Contoso separately.
- **Capability:** test free/busy, calendar sharing, and MailTips as separate functions.
- **Detail:** verify time-only, limited detail, or full detail against the approved mapping.
- **Scope:** test a mailbox inside the allowed group and one outside it.
- **Client:** validate the supported Outlook, Teams, or scheduling experience the business actually uses.
- **Anonymous boundary:** if enabled, test the published URL from a browser with no authenticated session.
- **Failure behavior:** confirm an unapproved tenant or out-of-scope mailbox does not disclose data.

Preserve the Graph readback, Exchange inventory, group membership snapshot, timestamps, test identities, observed results, and operator names. Entra audit logs should show the policy changes, but the workload test is still required: a directory audit event proves configuration, not effective calendar behavior.

For recurring operations, monitor partner-object changes and capability changes alongside scope-group membership. A quiet capability object can still expand effective disclosure if someone adds every executive mailbox to its included group. The site's [cross-tenant group synchronization guide](/posts/microsoft-entra-cross-tenant-group-synchronization) is useful when groups cross organizational boundaries, but do not use synchronized membership as an unreviewed shortcut for a calendar disclosure scope.

## Troubleshoot by layer

### The new capability exists, but nothing works

First confirm that rollout reached both tenants. Then verify Microsoft 365 Collaboration trust on the correct partner tenant ID, the capability's `isAllowed` value, the included group, and reciprocal configuration for the direction being tested. Do not rotate credentials or change Conditional Access before locating the failed layer.

### It works only while the old object is enabled

That is expected evidence that the legacy path is taking precedence. Disable the mapped legacy object during the coordinated window and retest. If the new path fails, restore the old object and preserve the policy readbacks for escalation.

### One user works and another does not

Compare their membership in the exact included security group and allow time for documented service propagation. Also compare which Sharing Policy was assigned to each mailbox before migration. Do not solve a scope mismatch by changing `resourceId` to `All` unless the data owner approved tenant-wide exposure.

### The wrong calendar detail is visible

Recheck the mapping. Availability basic and sharing simple expose time only; availability limited detail and sharing detail add subject and location; reviewer sharing exposes full details. Treat unexpected extra detail as a disclosure incident and disable the affected capability or restore the prior path while investigating.

### Graph returns authorization or availability errors

Confirm the token contains the required policy scopes, the operator has an eligible supported role, the request uses the v1.0 global-service endpoint, and the tenant's rollout is complete. A successful sign-in to Graph does not imply permission to change cross-tenant capabilities.

## Administrator checklist

- [ ] Confirm the feature has reached every participating tenant; record the tenant-specific announcement without inventing a Message Center ID.
- [ ] Export Organization Relationships, Availability Address Spaces, Sharing Policies, mailbox assignments, and scope-group membership.
- [ ] Separate any non-calendar functions that share an Organization Relationship.
- [ ] Resolve each partner domain to a verified Microsoft Entra tenant ID.
- [ ] Map each access level to the exact case-sensitive capability.
- [ ] Preserve or narrow each legacy scope with an approved security group.
- [ ] Obtain reciprocal configuration and a joint test window for bidirectional sharing.
- [ ] Read the existing partner object before changing Microsoft 365 Collaboration trust.
- [ ] Create and read back the capability with time-bound privileged access.
- [ ] Test in-scope, out-of-scope, direction, detail, client, and anonymous cases.
- [ ] Restore immediately if scope, detail, rollout, or partner coordination is uncertain.
- [ ] Delete legacy objects only after the stability period and evidence review.
- [ ] Monitor both policy changes and membership changes in capability-scope groups.

## FAQ

### Is Microsoft 365 cross-tenant access policy the same as Entra cross-tenant access settings?

No. Entra cross-tenant access establishes the identity and collaboration trust. The Microsoft 365 capability authorizes access to specific workload data such as calendar availability or MailTips. The new calendar path requires both layers.

### Does one tenant's policy enable two-way free/busy?

No. It is an inbound control in the resource tenant. Each tenant must authorize access to its own data for bidirectional sharing.

### Can an Exchange Administrator perform the whole migration?

Microsoft supports Exchange Administrator for the calendar, free/busy, and MailTips capability operations. Its migration procedure requires Global Administrator for the underlying Entra Microsoft 365 Collaboration trust. Separate those steps and use the least privilege that each step supports.

### Should we remove the old objects immediately after the first successful test?

No. Keep reversible legacy objects disabled through an approved stability period. Availability Address Space is the exception because it cannot be disabled; export and test its recreation before removal. Clean up only after both tenants accept the evidence.

### Does EWS retirement break every Availability Address Space?

No. Microsoft's migration guide says Exchange Online-to-Exchange Online free/busy through Availability Address Space does not depend on EWS. Migration may still improve granularity, but assess that object on its documented behavior rather than treating it as automatically broken.

## Microsoft sources

- [Migrate to Microsoft 365 Cross-Tenant Access Policy for sharing Free/Busy, Calendars, and MailTips](https://learn.microsoft.com/en-us/exchange/sharing/migrate-to-m365-xtap)
- [Microsoft 365 cross-tenant access policy API overview](https://learn.microsoft.com/en-us/graph/api/resources/m365-cross-tenant-access-policy-overview?view=graph-rest-1.0)
- [Create a Microsoft 365 capability for a partner](https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationpartner-post-m365capabilities?view=graph-rest-1.0)
- [List Microsoft 365 capabilities for a partner](https://learn.microsoft.com/en-us/graph/api/crosstenantaccesspolicyconfigurationpartner-list-m365capabilities?view=graph-rest-1.0)
- [Cross-tenant access settings API overview](https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicy-overview?view=graph-rest-1.0)
- [Sharing policies in Exchange Online](https://learn.microsoft.com/en-us/exchange/sharing/sharing-policies/sharing-policies)
- [Retirement of Exchange Web Services in Exchange Online](https://techcommunity.microsoft.com/blog/exchange/retirement-of-exchange-web-services-in-exchange-online/3924440/)
