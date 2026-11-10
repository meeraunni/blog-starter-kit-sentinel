---
title: "Microsoft Entra CYOT Setup: SMS and Voice Provider"
excerpt: "Set up Microsoft Entra CYOT safely: deploy the Azure Function, evaluate SMS or voice delivery, phase traffic, monitor failures, and plan resiliency."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-10T17:18:28-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra CYOT setup** moves SMS or voice delivery from Microsoft-managed telephony to a supported provider that your organization selects. Microsoft Entra still generates and validates the one-time code; an Azure Function in your subscription receives the delivery request and passes it to the provider. The safe rollout is to preserve the existing method-policy targets, validate the integration in **Evaluation**, route a small percentage in **Production**, and reach 100 percent only after Entra, Function App, provider, and sign-in evidence agree.

Grab a coffee before treating this as a provider toggle. Your organization now owns an authentication-path application, Azure resources, credentials and certificates, provider fraud controls, delivery coverage, cost, and recovery. Microsoft calls the feature **Choose Your Own Telephony Provider (CYOT)** and made it generally available on October 30, 2026 for Microsoft Entra ID workforce tenants in global Azure. Current supported providers are Soprano, Telesign, and Infobip; commercial terms and geographic coverage come from their live Microsoft Security Store listings. ([Microsoft Entra CYOT FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/phone-providers-faq), [CYOT overview and provider list](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-phone-providers))

> **Documentation boundary:** this guide is based on current Microsoft documentation and operational analysis. It does not claim a production CYOT deployment was performed. Provider offers, coverage, defaults, prices, Azure SKUs, portal labels, and rollout availability can change; verify the live setup experience, Security Store listing, and provider contract before purchase or production traffic.

## Microsoft Entra CYOT setup: the short answer

Use this control sequence:

1. Prove which users genuinely require SMS or voice as a verification method. Move everyone else toward a phishing-resistant method.
2. Confirm the scenario is supported: a Microsoft Entra workforce tenant in global Azure, not External ID or Azure AD B2C, and not SMS as primary sign-in.
3. Record the current SMS and voice policy targets, exclusions, registered numbers, recent use, recovery dependencies, and emergency-access design.
4. Select a supported provider only after reviewing countries, channels, sender registration, privacy, fraud controls, support, service levels, and pricing.
5. Prepare the required Entra and Azure roles, a paid Azure subscription, deployment tooling, and a test user with the intended phone method.
6. Review the Microsoft-linked setup script, approve its deployment plan, and preserve the tenant ID, endpoint URL, and application client ID from its summary.
7. Finish provider registration and verify that the Security Store subscription is active.
8. Create one profile per channel. Preserve the existing policy targets and start in **Evaluation**.
9. Prove `CyotEvaluation` in Entra audit logs and HTTP `200` for `SendOtp` in the Function App before routing provider traffic.
10. Move to **Production** at a small percentage. Prove `Cyot`, Function success, provider delivery, and successful user authentication.
11. Increase traffic in controlled stages, holding when any evidence gate fails.
12. Before 100 percent, enable provider fraud and spending controls, prove monitoring, test recovery, and decide whether the default single-region, single-provider design meets the required availability.

CYOT is **opt-in**, not a new default delivery route. Evaluation sends validation requests to your integration while Microsoft-managed telephony continues to deliver the user code. Only a Production profile routes a configured percentage through the provider. ([CYOT setup procedure](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-set-up))

## Put CYOT in the authentication flow

The control plane and delivery plane are deliberately separate:

```text
User reaches an SMS or voice verification step
                    |
                    v
Microsoft Entra generates the OTP and selects the profile
                    |
                    v
Microsoft Entra calls the customer endpoint
                    |
                    v
Azure Function sends the request to the telecom provider
                    |
                    v
Provider delivers the message or call
                    |
                    v
User submits the OTP; Microsoft Entra validates it
```

Microsoft owns Entra authentication, code generation and validation, and the handoff to your endpoint. Your organization owns the Azure Function, provider account, integration security, credential and certificate lifecycle, fraud controls, monitoring, cost, and recovery. The provider owns downstream SMS or voice delivery and the controls exposed by its service. ([CYOT overview](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-phone-providers), [telephony-fraud guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-fraud-costs))

That boundary changes incident response. A user can fail even when the Entra policy is correct: the request can stop at the customer endpoint, the provider can reject the destination, a carrier can delay delivery, or the user can enter an expired or incorrect code. “SMS failed” is not a root cause.

## Decide whether CYOT belongs in the design

Microsoft recommends phishing-resistant methods such as passkeys and positions CYOT for populations with a documented business, regulatory, or technical need for telephony. CYOT supports SMS and voice as **verification methods**; it does not preserve SMS as a primary sign-in method. It currently supports Entra workforce tenants, not External ID or Azure AD B2C. ([CYOT FAQ](https://learn.microsoft.com/en-us/entra/identity/authentication/phone-providers-faq))

Define the exception population before procurement:

- the exact user personas and countries that require SMS or voice;
- the regulation, accessibility requirement, device constraint, or operational journey that makes another method unsuitable;
- whether SMS, voice, or both are necessary;
- MFA, self-service password reset, guest, and recovery journeys that depend on the channel;
- the approved portable alternative and service-desk bootstrap when telephony is unavailable; and
- an owner and review date for every exception.

The site's [passkey policy guide](/posts/microsoft-entra-id-passkey-policy-profiles-attestation) helps separate provider, attestation, and profile decisions for users who can leave telephony. The [passkey auto-enablement guide](/posts/microsoft-entra-passkey-auto-enablement-admin-guide) covers the earlier policy and registration-campaign transition; neither one deploys CYOT.

### Keep the retirement clock separate from feature status

CYOT reached GA on **October 30, 2026**. It remains an administrator-configured feature. Microsoft currently documents two Microsoft-managed telephony retirement dates: **February 1, 2027** for users in the first retirement population, including internal guests, and **July 1, 2027** for Global Administrators and external users. There is no enforcement opt-out at the applicable date. Recheck the live population definitions before cutover because these are high-risk service dates. ([Microsoft-provided SMS and voice retirement](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sms-voice-retirement))

Do not delay the provider rollout merely because one protected population has a later date. The production goal is enough soak time to find regional, carrier, policy, cost, and recovery problems before Microsoft-managed delivery disappears for that population.

## Meet the prerequisites without combining privileged roles

Microsoft's setup procedure currently lists these prerequisites:

- a Microsoft Entra workforce tenant;
- an Azure subscription with a valid payment method;
- Azure Cloud Shell in PowerShell mode, or PowerShell 7.0 or later with Azure CLI 2.61 or later; and
- a test user with a phone number registered for the channel being tested.

The documented access is task-specific:

**Application creation.** The deployment needs permission to register an application in the customer tenant.

**Azure deployment.** Use Subscription Owner, or Contributor plus Role Based Access Control Administrator at the required scope.

**Directory grants.** A Privileged Role Administrator grants the directory access needed for Entra to route requests to the integration.

**Authentication method profiles.** An Authentication Policy Administrator reviews and configures the SMS or voice profile.

Microsoft also says to review app-management policies that constrain credentials, multitenant applications, or custom Application ID URIs before running the deployment. ([CYOT setup prerequisites and permissions](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-set-up#prerequisites))

Do not leave one daily-use account permanently holding every role because the wizard needs them at different stages. Use approved just-in-time elevation, separate the Azure and Entra duties where practical, record each grant, and remove temporary elevation after validation.

### Budget for two services, not one

CYOT introduces provider charges for SMS or voice plus Azure charges for the resources hosting the integration. Provider pricing, regional coverage, and terms vary. The guided deployment also creates infrastructure whose cost changes with hosting plan, telemetry, region count, and traffic. ([CYOT costs and billing](https://learn.microsoft.com/en-us/entra/identity/authentication/phone-providers-faq#costs-and-billing))

Treat cost limits as a security control. Set a forecast, usage alerts, spending controls, and an escalation owner before Production. A surprise bill can be a design error, an adoption spike, or fraud; the response paths are different.

## Build the before-state evidence packet

Before buying or deploying anything, preserve:

- current SMS and voice Include and Exclude targets;
- authentication-methods migration state and any legacy MFA or SSPR dependency;
- registered phone methods and recent method use;
- channel, country, carrier, normal volume, peak volume, and delivery-time expectations;
- current failure rate and representative sign-in evidence;
- Conditional Access and authentication-strength requirements for the affected applications;
- emergency-access accounts and a recovery method independent of CYOT;
- Azure subscription, region, resource naming, tags, budgets, monitoring destination, and resource owners;
- selected provider, offer, countries, channel support, sender-registration requirements, service commitment, privacy terms, support route, and exit terms; and
- success, hold, rollback, and escalation criteria for each rollout ring.

Do not change the production target groups while building the provider path. Microsoft's setup warning says the CYOT profile shares targets with the existing SMS or voice policy. A targeting experiment can therefore alter the people who use that method today. Use a test tenant when you need to experiment with different Include or Exclude selections. ([CYOT profile targeting](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-set-up#step-4-update-the-authentication-method-policy))

## Deploy Microsoft Entra CYOT in controlled rings

### Ring 0: review the provider and deployment plan

Compare only the current supported offers. Validate every required destination, not merely the provider's global marketing footprint. Confirm sender or caller registration, expected provisioning lead time, message templates, accessibility, data handling, fraud controls, usage alerts, support hours, and provider transaction evidence.

In **Entra ID > Authentication methods > Policies**, the current Microsoft procedure uses **Add telecom profile** to open the setup experience. The workflow links to the Security Store offer, provider registration, and the deployment integration. Do not invent the application ID: Microsoft says the provider registration must use the client ID produced by the setup deployment, not a tenant ID, subscription ID, or unrelated application ID. ([purchase and activation steps](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-set-up#step-1-purchase-and-activate-your-telecom-provider))

### Ring 1: deploy and record the customer endpoint

The setup pane links to Microsoft's current GitHub script. Review the script and instructions through your organization's code and change controls. The script presents a deployment plan before creation, then creates the Entra application and Azure resources and applies the provider configuration after approval.

Preserve the final deployment summary immediately:

- customer tenant ID;
- hosting subscription and region;
- Function App and endpoint URL;
- application client ID;
- runtime and hosting plan;
- deployed resource names and IDs;
- script source URL and reviewed revision;
- operator, approver, UTC time, and change record; and
- credential and certificate renewal owner.

Microsoft warns that Cloud Shell output is temporary. Losing the summary is recoverable through the Azure portal, but discovering that during an incident wastes time and weakens evidence. ([deploy the CYOT integration](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-set-up#step-2-deploy-the-integration))

### Ring 2: finish provider registration and verify subscription state

Return to the provider registration, supply the application client ID created by the deployment, and finish provider-specific onboarding. In Security Store, confirm the solution status is **Subscribed**. Then return to the Entra setup experience and use its verification step.

Stop if the client ID, endpoint, tenant, provider account, or subscription state does not match the deployment record. Reusing an unrelated application to “get past” the form destroys the trust boundary the setup created.

### Ring 3: evaluate without moving delivery

Create a separate profile for each intended channel. Preserve the current SMS or voice targets, select the deployed Function App, compare its URL and application ID with the deployment summary, and choose **Evaluation** with an explicit sampling percentage.

Microsoft documents that authentication-method policy changes can take up to an hour to apply. After convergence, force a new phone challenge for the test user. Evaluation is successful only when:

- the user completes the normal Microsoft-managed code flow;
- the Function App's `SendOtp` invocation records HTTP `200`; and
- the Entra audit event records `DeliveryMethod` as `CyotEvaluation`.

Evaluation proves that Entra can call the integration and the integration can process a validation request. It does **not** prove the provider delivered a message, because Microsoft continues to deliver the user's code in this mode. ([evaluation-mode validation](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-set-up#start-in-evaluation-mode))

### Ring 4: send a small percentage through the provider

After Evaluation passes, switch the profile to **Production** and choose a small initial **Traffic routed through provider percentage**. Keep the endpoint, client ID, Function App, and policy targets unchanged so the traffic percentage is the only variable.

At a partial percentage, make enough controlled attempts to encounter provider-routed events. For each routed test, prove:

1. `DeliveryMethod` is `Cyot` in the Entra audit log;
2. the Function App request completed successfully;
3. the provider portal records the delivery transaction;
4. the expected device receives the SMS or voice call; and
5. Authentication Details shows that the user completed the verification step.

Test every required country, channel, language, carrier class, and after-hours support route. A single successful domestic SMS is not acceptance evidence for a multinational voice deployment.

### Ring 5: expand by evidence, then reach 100 percent

Increase only the Production percentage while holding targets and integration settings stable. At every stage, compare request volume, success, latency, provider acceptance, delivery, user completion, cost, and support incidents with the baseline.

Hold when a gate fails. Diagnose the first broken boundary, correct it, and repeat the same ring. Microsoft recommends completing the move to 100 percent without delay after stages validate, but that is not permission to skip acceptance evidence. ([staged Production rollout](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-set-up#increase-traffic-gradually))

## Troubleshoot the first broken boundary

Microsoft's current troubleshooting path uses four evidence surfaces: Entra audit logs, Function App logs, the provider portal, and Entra sign-in logs. ([CYOT troubleshooting guide](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-troubleshoot))

**No CYOT audit event.** Confirm the UTC range, Azure MFA service and Authentication category filters, profile state, shared policy targets, sampling or Production percentage, policy-convergence time, and whether the sign-in actually required a new phone challenge.

**Only `CyotEvaluation`.** The profile is still validating the endpoint; it is not routing user delivery through the provider. Do not interpret an Evaluation HTTP `200` as provider acceptance.

**`CyotDeliveryFailed` with `EndpointClientError`.** The customer endpoint rejected the call. Check Function authentication, application configuration, endpoint selection, and recent changes.

**`CyotDeliveryFailed` with `EndpointServerError`.** The endpoint failed or timed out. Correlate Function App request telemetry with provider health and response evidence.

**`CyotDeliveryFailed` with `NonceMismatch`.** The endpoint response does not match the Entra request. Compare custom code with Microsoft's current sample and investigate the exact operation; do not disable request validation.

**`CyotDeliverySucceeded`, but nothing arrives.** Entra knows the endpoint accepted the request, not that the carrier delivered it. Pivot to the provider transaction, destination, sender registration, fraud block, carrier result, and user device.

**The code arrives, but authentication fails.** Use Authentication Details to distinguish incorrect, expired, or reused code behavior from successful delivery. Preserve the sign-in request and correlation IDs.

In Application Insights, Microsoft's guide queries `AppRequests` for requests whose URL contains `/api/SendOtp`, then uses the operation ID to correlate provider responses in `AppTraces`. Keep phone numbers, OTP values, credentials, tokens, and provider secrets out of tickets and screenshots.

The site's [Conditional Access sign-in-log guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) helps when the phone step succeeds but the overall sign-in is still blocked by another policy decision.

## Design fraud controls before Production

Microsoft assigns the customer responsibility for provider fraud, destination, channel, spending, and unusual-activity controls. Before provider traffic begins:

- allow only required countries or regions;
- enable only the channels in the approved design;
- turn on provider fraud detection;
- set usage or spending limits and budget alerts;
- route unusual-volume alerts to an owned response path;
- baseline volume by country, channel, hour, and user population;
- protect the provider administrator account and the Azure integration;
- document credential and certificate renewal; and
- test the fraud-containment runbook without deleting evidence.

For suspected fraud, restrict the affected destination or channel through provider controls, preserve the Entra, Function, and provider records, and restore only after protections are corrected. Microsoft handles code generation and validation, but that does not make the customer-owned provider account or Azure endpoint immune to abuse. ([protect CYOT against telephony fraud](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-fraud-costs))

## Decide whether the default availability is enough

The guided deployment creates one Function App in one Azure region connected to one provider. Microsoft describes that design as suitable for Evaluation and many production workloads, but a regional outage or provider incident can still interrupt authentication. Multi-region and secondary-provider patterns are sample guidance that the customer must validate and maintain. ([CYOT resiliency guidance](https://learn.microsoft.com/en-us/entra/identity/authentication/choose-your-own-telephony-reliability))

Use the smallest architecture that meets a written recovery target:

- **Single region, one provider:** accepts regional and provider failure as a telephony outage.
- **Multiple regions with Azure Front Door:** reduces regional dependency but adds routing, certificate, capacity, cost, and failover behavior to operate.
- **Secondary provider:** reduces one provider dependency but requires safe fallback logic and a second contract and integration.
- **Both:** covers more failure modes but expands change, monitoring, and testing scope.

Microsoft warns not to resend through a secondary provider after a timeout or unknown primary result, because the first provider might already have accepted the message. Fail over only when the primary confirms nonacceptance. Test region and provider loss, full surviving capacity, recovery, and duplicate-message prevention in nonproduction, then repeat relevant tests after code, routing, credential, or provider changes.

No architecture makes SMS or voice phishing-resistant. Keep an approved non-telephony method and a service-desk recovery path so a provider incident does not become a tenant-wide access incident. The site's [emergency-access account guide](/posts/microsoft-entra-emergency-access-accounts-admin-guide) covers the independent recovery boundary for tenant administration.

## Roll back without confusing Evaluation and delivery

If a Production ring causes failures:

1. stop percentage expansion and capture UTC samples;
2. preserve Entra audit and sign-in events, Function telemetry, provider transactions, configuration revisions, and cost data;
3. return the specific profile to its last validated Production percentage or Evaluation state through the approved change record;
4. confirm the resulting delivery path from fresh events rather than assuming the UI save took effect;
5. keep policy targets stable while diagnosing the integration; and
6. retest the failed ring after the first broken boundary is corrected.

Before the applicable Microsoft-managed retirement date, reducing CYOT traffic can return delivery to Microsoft's path for users who remain eligible. After retirement, do not assume Microsoft-managed delivery is a fallback. The durable recovery design is a healthy CYOT path plus a working non-telephony authentication and support path.

## Microsoft Entra CYOT administrator checklist

- [ ] Define the smallest user population with a documented telephony requirement.
- [ ] Confirm workforce-tenant, global-Azure, verification-method, and channel support.
- [ ] Recheck current GA, provider, and retirement information in Microsoft sources.
- [ ] Record existing SMS and voice targets, exclusions, registrations, use, and recovery dependencies.
- [ ] Validate provider countries, channels, registration, privacy, fraud, support, service levels, pricing, and exit terms.
- [ ] Prepare the Azure subscription, tooling, test user, and task-specific privileged roles.
- [ ] Review the Microsoft-linked setup script and approve its deployment plan.
- [ ] Preserve tenant, subscription, region, endpoint, Function App, application ID, and script revision.
- [ ] Assign credential, certificate, provider, Azure, and Entra ownership.
- [ ] Verify the provider account and Security Store subscription.
- [ ] Create separate SMS and voice profiles where required.
- [ ] Preserve current policy targets and start in Evaluation.
- [ ] Wait for policy convergence and prove `CyotEvaluation` plus Function HTTP `200`.
- [ ] Move to Production at a small percentage and prove `Cyot`, provider delivery, and successful authentication.
- [ ] Validate every required country, carrier, channel, persona, and recovery journey.
- [ ] Enable destination, channel, fraud, spending, and unusual-volume controls.
- [ ] Decide whether single-region and single-provider availability meets the written objective.
- [ ] Test failover, recovery, and duplicate-message prevention where resiliency is added.
- [ ] Increase traffic in stages and hold on any failed evidence gate.
- [ ] Reach 100 percent with enough soak time before the applicable retirement date.
- [ ] Keep emergency access and user recovery independent of telephony.
- [ ] Escalate with tenant ID, channel, UTC time, correlation ID, delivery method, failure reason, provider transaction ID, and recent changes.

## FAQ

### Does CYOT replace Microsoft Entra MFA?

No. Microsoft Entra still decides when verification is required and generates and validates the OTP. CYOT replaces the telecom delivery segment with an Azure-hosted customer integration and a supported provider.

### Can CYOT keep SMS as a primary sign-in method?

No. Microsoft's current FAQ limits CYOT to SMS and voice verification. Users relying on SMS as primary sign-in need a supported replacement.

### Is CYOT supported in External ID or Azure AD B2C?

Not currently. Microsoft documents CYOT for Entra ID workforce tenants in global Azure.

### Does Evaluation prove that the provider can deliver?

No. Evaluation validates requests through the integration while Microsoft continues to deliver the user's code. Provider delivery begins only when the profile is in Production and traffic is routed through the provider.

### Can one provider serve SMS and another serve voice?

Yes. Microsoft's current FAQ says an organization can use one provider for SMS and another for voice. Each channel has its own profile and must be evaluated and monitored separately.

### What evidence distinguishes an endpoint failure from a provider failure?

Use the Entra audit event first. A CYOT delivery failure with an endpoint error sends the investigation to the Azure integration. A successful handoff with no user delivery sends it to the provider transaction and carrier path. A delivered code followed by failed authentication sends it back to Entra sign-in evidence.

### Should every tenant add multiple regions and providers?

No. Start from required availability and recovery time. Microsoft's multi-region and secondary-provider patterns are customer-operated samples, not automatic platform behavior. Add them only when the organization can own their cost, credentials, routing, monitoring, failover semantics, and recurring tests.

The operating rule is simple: **preserve policy scope, prove the customer endpoint in Evaluation, prove delivery at a small Production percentage, expand only on evidence, and keep recovery independent of the system you are changing**.
