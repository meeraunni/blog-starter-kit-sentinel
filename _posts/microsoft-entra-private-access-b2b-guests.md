---
title: "Microsoft Entra Private Access for B2B Guests: Guide"
excerpt: "Deploy Microsoft Entra Private Access for B2B guests safely: validate licensing, tenant switching, Conditional Access, logs, known limits, and rollback."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-13T09:12:54-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra Private Access for B2B guests** gives an external partner a client-based path to private applications in your resource tenant while the partner keeps using an identity and device from their home tenant. The Global Secure Access client discovers resource tenants where the person has an external account, the user switches into the intended tenant context, and only that tenant's assigned Private Access traffic is tunneled.

Microsoft lists this external-user access capability as **public preview** in its [October 2026 Microsoft Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460). It is not default-on and it is not a blanket replacement for partner VPN access. The resource tenant still has to create the external identity, publish and assign the private application, enable and scope Private Access forwarding, link billing, set the client registry value, and make every Conditional Access decision intentionally.

Grab a coffee before the pilot. This design crosses identity, endpoint, network, application, billing, and support boundaries. A guest object that can sign in is not yet evidence that the private route, authorization, or recovery path works.

## Microsoft Entra Private Access for B2B guests: what changed

The new path extends Global Secure Access external-user support to partners, contractors, and vendors using their own Microsoft Entra identity and device. Microsoft's [external-user access overview](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-external-user-access) says the feature supports external accounts whose `userType` is **Guest or Member** in the resource tenant. The home tenant does not need a Global Secure Access license, and the device does not have to be registered to the resource tenant.

The resource tenant remains the policy and application boundary. An external user can reach only resources that satisfy all of these gates:

1. an external identity exists in the resource tenant;
2. the identity is allowed by the relevant B2B collaboration and Conditional Access configuration;
3. a Private Access application or Quick Access destination describes the private resource;
4. the user is assigned to the application and to the applicable Private Access traffic-forwarding profile;
5. the Global Secure Access client is installed, running, and enabled for external-user access; and
6. the user switches the client to the resource tenant.

The announcement calls the capability public preview. Treat its contracts, client behavior, and limitations as prerelease even where an individual supporting component is generally available. Do not describe it to a partner as a production SLA extension without reviewing Microsoft's preview terms and your own support agreement.

> [!IMPORTANT]
> **Analysis:** the feature changes how an external device acquires a private route; it does not change who owns the application or authorize every guest automatically. Keep identity admission, application assignment, traffic acquisition, and Conditional Access as separate approvals.

## Understand the external-user traffic path

The runtime path has a home identity context and a resource access context:

1. The partner signs in to Windows and the Global Secure Access client with the home-tenant identity.
2. The client discovers resource tenants where that identity has an external account.
3. The user selects the resource organization from the client's user menu.
4. The client's tunnels to the home tenant disconnect. A Private Access tunnel is then created to the selected resource tenant.
5. Traffic matching a private application assigned through that tenant's Private Access profile is sent to Microsoft's service edge.
6. Global Secure Access brokers the connection through the resource tenant's private network connector to the private destination.
7. Microsoft Entra evaluates the resource tenant's authorization and Conditional Access requirements, including any inbound trust configured for the home organization.

Microsoft says the client retains the selected tenant across a reboot. Switching back reverses the tunnel context. This is a visible operating state, not a behind-the-scenes federation detail: support staff should record the organization shown in the client before interpreting any network trace.

The client routes only the selected resource tenant's private-application traffic through that tenant. Microsoft's current known-limitations list says the user's Internet Access, Microsoft 365, and Microsoft Entra tunnels to the home tenant are not kept while connected to the resource tenant. Existing active connections such as RDP can also remain connected to the previous tenant after a switch. Test both facts explicitly; otherwise an old working session can conceal a failed new route.

This intent is different from the site's [Microsoft Entra Private Access VPN replacement guide](/posts/microsoft-entra-private-access-vpn-replacement), which covers a workforce rollout inside one organization. It is also different from [domainless SAML federation for B2B guests](/posts/microsoft-entra-domainless-saml-federation), which changes guest authentication routing rather than private-network traffic acquisition.

## Meet the licensing, role, and platform gates

For the resource tenant, Microsoft documents these product requirements:

- **Microsoft Entra ID P1 or P2** as the identity prerequisite;
- **Microsoft Entra Private Access or Microsoft Entra Suite** for the Private Access service; and
- an Azure subscription linked through Microsoft Entra External ID subscription linking so external-user access can be metered correctly.

Microsoft's [guest-user licensing reference](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-licensing-guest-users) uses a monthly-active-user model for accounts whose `userType` is `Guest`. A guest becomes active for this meter when they initiate at least one sign-in during the month to Private Access tunnels through the Global Secure Access client. Microsoft explicitly says the first-50,000-MAU allowance for Entra ID P1/P2 external identities does not extend to Global Secure Access guest usage. Confirm current pricing with your Microsoft account team before expanding the pilot.

Separate configuration and evidence duties:

- **Global Secure Access Administrator** manages service onboarding and traffic-forwarding profiles.
- **Application Administrator** is required alongside the Global Secure Access role for applicable Private Access application and profile assignments.
- **Security Administrator** manages cross-tenant access settings; Microsoft also documents custom-role options.
- **Conditional Access Administrator** manages resource-tenant Conditional Access policies.
- **Reports Reader** can inspect relevant sign-in and Global Secure Access traffic evidence; Microsoft documents a dedicated Global Secure Access Log Reader for traffic-log access as well.

Use just-in-time role activation where available. A partner-access pilot is not a reason to give one operator permanent control of identity trust, application assignment, network forwarding, and policy enforcement.

Microsoft currently documents the external-user switching procedure with the Windows client. Install a supported client on the partner device and keep it current. The [traffic-profile assignment guidance](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-manage-users-groups-assignment) lists version **1.7.376.0** as the minimum for current user and group assignment behavior. Validate the live client release notes before deployment instead of freezing that minimum into endpoint policy.

## Design B2B trust before the private route

The external account can be a conventional B2B collaboration guest or an external account represented as Member, including one created through cross-tenant synchronization. Do not use `userType` alone as the authorization model. Record the home tenant ID, sponsor or business owner, intended applications, access expiry, and deprovisioning trigger for each pilot identity.

The resource tenant's [cross-tenant access settings](https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration) determine which users, groups, and applications from the partner organization may use B2B collaboration. Organization-specific settings take precedence over defaults. Scope the pilot to the known partner tenant and application rather than weakening the default for every external organization.

Conditional Access evaluates the resource-tenant policy. Inbound trust can allow the resource tenant to accept MFA, compliant-device, or Microsoft Entra hybrid-joined claims from the partner's home tenant. Trust does not turn off the resource policy; it changes which home-tenant claims can satisfy it. Microsoft's [B2B authentication and Conditional Access guidance](https://learn.microsoft.com/en-us/entra/external-id/authentication-conditional-access) warns that an external user normally cannot enroll an unmanaged device into the resource organization merely to satisfy a managed-device requirement. If you require device compliance, decide whether you trust the specific partner's device claims and verify the resulting sign-in record.

Do not confuse device compliance with the **compliant network** control. Microsoft currently lists a hard limitation: external-user access fails when compliant-network policies are enforced for the private application, and external users must be excluded from those policies. Treat that exclusion as a documented compatibility boundary with an owner and review date—not as permission to remove MFA, device, risk, or application controls.

Microsoft also documents a specific failure when the resource tenant requires MFA through cross-tenant configuration while the home tenant uses passwordless sign-in in Microsoft Authenticator. Include the partner's actual authentication method in the pilot matrix; a generic claim that “MFA works” is not enough.

## Build a safe Microsoft Entra B2B Private Access pilot

### Ring 0: record the current control planes

Choose one noncritical private application, one partner organization, and two or three external test identities. Avoid domain controllers, management planes, broad network ranges, and applications that can change money, production infrastructure, or regulated records.

Capture:

- home and resource tenant IDs;
- external object IDs, `userType`, sponsor, and expiry;
- inbound and outbound cross-tenant access settings;
- trusted MFA and device claims;
- private network connector group and health;
- application segments, ports, protocols, DNS dependencies, and app assignments;
- traffic-forwarding profile, priority, device-platform scope, and assignments;
- Conditional Access policy names, modes, exclusions, and recovery operator;
- client version, Windows join state, and the `GuestAccessEnabled` value; and
- expected sign-in, audit, traffic, connector, and application evidence.

Keep an emergency administrator and the change operator outside the external-user policy scope. Prove that the operator can remove only the pilot assignment or return only the new policy to Report-only without changing unrelated controls.

### Ring 1: prove Private Access for an internal test identity

Before involving a partner, establish that the resource tenant's Private Access application works for a controlled internal identity. Microsoft's [per-app access configuration](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-configure-per-app-access) requires an active private network connector group, an enterprise application with application segments, explicit user or group assignment, and Private Access traffic forwarding.

Validate DNS resolution, connector health, destination reachability, port and protocol coverage, and application authorization. A broken connector or incomplete application segment will fail for the guest too; testing it internally removes the cross-tenant layer from the first diagnosis.

### Ring 2: create and govern the external identity

Create or synchronize the external account through your approved B2B process. Verify the home tenant ID and redemption state, then assign only the pilot application. Set an access end date through your established governance process where possible, and identify who removes the guest when the commercial or support relationship ends.

Apply an organization-specific inbound cross-tenant configuration for the partner. Keep only the required users, groups, and applications in scope. If you trust home-tenant MFA or device claims, record the partner control owner and the evidence that justifies that trust.

Use the site's [external-user sign-in failure guide](/posts/microsoft-entra-aadsts50020-external-user-sign-in-failures) when the user authenticates in the wrong tenant or the guest object and presented identity do not match. Fix that identity boundary before changing a network route.

### Ring 3: scope the application and forwarding profile

Assign the external identity directly, or through a tested supported group, to the Private Access enterprise application. Then include the identity in the resource tenant's applicable Private Access traffic-forwarding profile. Microsoft's profile model uses both user/device assignment and device-platform assignment; both conditions must match. When multiple enabled profiles of the same traffic type apply, only the applicable profile with the highest priority is used.

For a first pilot, prefer a dedicated narrow custom Private Access profile if your tenant accepts the preview status of custom profiles. Otherwise, scope the default Private Access profile carefully. The [custom profile documentation](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-create-traffic-forwarding-profile) says custom profiles themselves are preview, support priority values from 101 through 199, and are limited to 10 during preview.

Do not assume the application assignment and forwarding-profile assignment are interchangeable. The application assignment authorizes the identity to the enterprise app; the forwarding profile tells the client which traffic to acquire. Both must be correct.

### Ring 4: enable and verify tenant switching

On the pilot Windows device, set this Microsoft-documented registry value:

- **Path:**

  ```text
  Computer\HKEY_LOCAL_MACHINE\Software\Microsoft\Global Secure Access Client
  ```
- **Value:** `GuestAccessEnabled`
- **Type:** `REG_DWORD`
- **Enabled data:** `0x1`

Deploy it with your normal MDM or Group Policy process. Do not ask the external user to edit the registry manually on an unmanaged device.

Launch the client, open the user menu, and select the resource tenant. Confirm that the status pane's **Organization** is the resource organization. In **Advanced diagnostics > Forwarding profile**, verify that the expected Private Access rules and application segments are present before testing the application.

Record the switch time, selected organization, client version, application destination, and result. Test a new connection rather than relying on an RDP or application session established before the tenant switch.

### Ring 5: prove policy and evidence end to end

Run at least these cases:

- assigned external identity, correct resource tenant, healthy client, allowed application;
- same identity while switched back to the home tenant;
- external identity not assigned to the application;
- external identity not assigned to the forwarding profile;
- allowed identity failing the intended MFA or device condition;
- destination or port outside the application segment; and
- a fresh session after reboot, because the resource-tenant selection persists.

For each case, correlate the client state, resource-tenant sign-in log, Conditional Access result, Global Secure Access traffic record, connector health, and application log. Microsoft's [traffic-log guidance](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs) exposes connection and transaction details such as action, source, destination, device category, connection ID, and transaction ID. For external sessions, Microsoft documents **Cross-tenant access type: B2B collaboration** and the **Home tenant ID** in the resource tenant's traffic logs.

Use the site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) for the identity-policy side. One allowed sign-in does not prove the network connection reached the destination, and one allowed traffic record does not prove the application authorized the session.

## Troubleshoot by the first failed boundary

### The resource tenant does not appear in the client

Confirm that the external account exists in the resource tenant and represents the same home identity signed in to the client. Verify `GuestAccessEnabled` is `0x1`. If the user was added to the resource tenant after the client connected, Microsoft says to disable and re-enable the client so the new tenant appears.

Do not create a second guest object as the first fix. Duplicate external objects make assignment and sign-in evidence harder to reconcile.

### The tenant switch works, but no Private Access rules appear

Check the profile's user/device and platform assignments, its enabled state, and its priority. Confirm that the Windows user—not merely a different identity shown in the client—matches the profile scope. If the profile was assigned after the client connected, Microsoft again requires disabling and re-enabling the client before private traffic takes effect.

Then open **Advanced diagnostics > Forwarding profile** and compare the effective rules with the intended application segments. An empty policy is a scoping or acquisition problem, not an application-password problem.

### Rules appear, but the private application is unreachable

Separate acquisition from delivery. Confirm the destination FQDN or IP, port, protocol, DNS result, enterprise-app assignment, connector group, connector health, and the connector's reachability to the target. Compare a successful internal test through the same app and connector.

If an old RDP session works, disconnect it and create a fresh one after the tenant switch. Microsoft's known limitation says active connections can remain attached to the previous tenant context.

### MFA or device policy loops or blocks the guest

Read the resource-tenant Conditional Access result and the cross-tenant access type. Confirm whether the resource tenant trusts MFA or device claims from that exact home organization and whether the presented claims meet the configured authentication strength. A home-tenant MFA claim is not automatically trusted.

If a compliant-network policy targets the private application, apply Microsoft's documented external-user exclusion for that specific incompatible control. Do not disable every Conditional Access policy or broadly exclude all guests.

### The traffic works, but logs do not show the expected external context

Verify you are reading the **resource tenant's** traffic logs and filtering the test time and destination. Add the cross-tenant access type and home tenant ID fields. Then correlate the transaction or connection identifier with the client and application timestamps.

If the event still looks internal, recheck the external object's home tenant and the identity actually signed in to Windows. Preserve the evidence before restarting the client or connector.

## Roll back without deleting the identity trail

Rollback should remove the narrowest new dependency first:

1. remove the pilot identity from the dedicated traffic-forwarding profile, or disable that pilot profile;
2. if needed, remove the pilot app assignment;
3. return only the new Conditional Access policy to Report-only or remove its pilot scope;
4. switch the client back to the home tenant and verify the expected home tunnels; and
5. retain sign-in, traffic, connector, application, and change records for the incident review.

Do not delete the guest object, private application, connector, or cross-tenant organization configuration during an active investigation. Those objects carry the identifiers needed to reconstruct what happened. Do not disconnect a working partner VPN until the external-user pilot has passed normal work, restart, renewal, failure, and support scenarios.

> [!IMPORTANT]
> **Analysis:** a durable rollback is an assignment change, not a permanent exception. Keep the external identity and evidence long enough to determine whether identity trust, profile delivery, traffic acquisition, connector transport, or application authorization failed.

## Administrator checklist

- [ ] Confirm public-preview acceptance, owner, success criteria, and rollback authority.
- [ ] Link the resource tenant to the required Azure subscription and validate licensing.
- [ ] Record the partner tenant, external objects, sponsors, expiry, and deprovisioning owner.
- [ ] Prove the private application and connector with an internal test identity first.
- [ ] Scope organization-specific B2B inbound access and trust deliberately.
- [ ] Decide how MFA and device claims will be satisfied; document any trusted claims.
- [ ] Exclude external users only from the documented incompatible compliant-network control.
- [ ] Assign the external identity to both the enterprise application and Private Access profile.
- [ ] Set `GuestAccessEnabled` through managed endpoint configuration.
- [ ] Verify the selected organization and effective Private Access rules in the client.
- [ ] Test allow, deny, wrong-tenant, unassigned-profile, policy-failure, and reboot cases.
- [ ] Correlate sign-in, Conditional Access, traffic, connector, and application evidence.
- [ ] Keep the existing partner-access path until staged validation and support readiness pass.

## FAQ

### Does the partner's home tenant need Microsoft Entra Private Access?

No. Microsoft says the home tenant needs at least a Microsoft Entra Free tenant but does not need a Global Secure Access license. The resource tenant hosts Private Access, links the subscription, publishes the application, and carries the external-user usage model.

### Must the partner device join or register with the resource tenant?

No. Microsoft explicitly says resource-tenant device registration is not required for external-user access. If the resource tenant requires a compliant or hybrid-joined device, use carefully governed inbound trust for supported home-tenant device claims rather than trying to enroll the partner device into both organizations.

### Can the user keep home-tenant Internet Access and Microsoft 365 tunnels while using the resource tenant?

Not in the current documented preview. Selecting the resource tenant disconnects the home tenant's Private Access, Internet Access, and Microsoft 365 tunnels and establishes the resource tenant's Private Access tunnel.

### Is switching tenants enough to authorize the private application?

No. The external identity still needs application access, a matching and assigned traffic-forwarding profile, a healthy connector path, and successful resource-tenant policy evaluation. Tenant switching selects the control plane; it does not grant the resource.

### What should go into a Microsoft support escalation?

Include the resource and home tenant IDs, external object ID and `userType`, client version, Windows join state, selected organization, registry value, profile and app IDs, assignment evidence, destination and port, connector group and health, UTC timestamps, sign-in correlation ID, traffic connection and transaction IDs, Conditional Access results, and the smallest reproducible failure. Remove secrets and unrelated user data from the evidence package.
