---
title: "Microsoft Entra Token Protection Registration Guide"
excerpt: "Pilot Microsoft Entra token protection registration safely. Map supported apps, read binding codes, stage enforcement, and preserve recovery paths."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-12T18:17:16-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

**Microsoft Entra token protection registration** on Windows now has a cleaner recovery path: when an unregistered user reaches a supported native application protected by a Conditional Access token protection policy, the sign-in flow can ask the user to register the device inline. Microsoft lists the improved Windows registration experience as generally available in its [October 2026 Entra update](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/what%E2%80%99s-new-in-microsoft-entra-october-2026/4556460), and the current [Windows deployment guide](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#end-user-experience) documents the prompt.

That is the short answer. The operational answer is more careful: the new prompt does not turn every Windows device, app, or resource into a supported token protection path. It does not create a Conditional Access policy, switch an existing policy on, or make the control default-on. Administrators still have to inventory the device registration method, client, broker path, target resource, Windows update level, and sign-in evidence before enforcement.

Grab a coffee before enabling the session control for a broad population. A supported user on an up-to-date device may register and continue. An unsupported app, operating system, registration method, or non-brokered flow may simply be blocked.

## Microsoft Entra token protection registration: what changed

Microsoft Entra Token Protection is a Conditional Access **session control**. It reduces token replay risk by requiring supported applications to use a device-bound sign-in session token, such as a Primary Refresh Token (PRT), when accessing a protected resource. Microsoft Entra validates the binding instead of accepting an equivalent session token copied to another device. ([Token Protection overview](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-token-protection), [PRT architecture](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token))

The October 2026 change improves one failure path on Windows:

- a user opens a supported native application;
- the requested resource is protected by a Conditional Access policy requiring token protection;
- the device is otherwise eligible but is not yet registered or enrolled for the required device state; and
- the sign-in experience offers inline device registration instead of only presenting the older dead-end error.

Microsoft says users who already registered or enrolled a supported device should see no change. Users without the latest September 2026 Windows update continue to receive the older error experience rather than the inline registration prompt. That makes Windows update readiness part of the deployment gate, not a help-desk footnote. ([Windows Token Protection end-user experience](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#end-user-experience))

The status boundaries matter:

- **Generally available:** Token Protection for supported Windows native applications, and the improved Windows device-registration experience.
- **Administrator enabled:** enforcement occurs only when an administrator configures and enables the Conditional Access session control.
- **Not universal:** only documented clients, resources, device states, and registration methods are supported.
- **Not a browser rollout:** Microsoft documents browser-based Token Protection separately as a preview for selected web apps that access Azure Resource Manager. This guide covers the Windows native-application path.

> [!IMPORTANT]
> **Analysis:** inline registration removes a user-experience dead end; it does not remove the compatibility boundary. Treat it as a remediation path inside a validated deployment, not as permission to skip report-only observation.

## Understand the device-bound control plane

On Windows 10 or newer, Web Account Manager (WAM) is the default token broker. For a Microsoft Entra registered device, the Entra WAM plug-in is the primary authority for the PRT. For a Microsoft Entra joined or hybrid joined device, the Entra CloudAP plug-in obtains the PRT during Windows sign-in, and WAM uses it for supported application token requests. ([Understanding the PRT](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token))

Device registration creates cryptographic device and transport key pairs. When a functioning Trusted Platform Module is available, Windows protects the private keys and the PRT session key with the TPM. Token requests are signed with proof of possession, allowing Microsoft Entra to reject a replay that cannot prove access to the corresponding device-held key. Microsoft recommends TPM 2.0 for performance and reliability. ([How the PRT is protected](https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token#how-is-the-prt-protected))

Token Protection then adds an authorization boundary at resource access:

1. the native client asks the Windows broker for a token;
2. the broker uses the registered device's PRT and protected session key;
3. Conditional Access evaluates the user, resource, platform, client type, and session control; and
4. the protected resource accepts the session only when the request uses the supported bound protocol.

Do not collapse this into “the laptop is compliant.” Device registration, device compliance, and token binding are related but different signals. A registered device can be noncompliant. A compliant device can still use an unsupported client flow. An unregistered-device PRT can provide single sign-on but cannot satisfy Conditional Access criteria that depend on registered device state. The site's [Windows Hello registration and Conditional Access guide](/posts/windows-hello-registration-blocked-conditional-access) covers credential-registration policy; Token Protection evaluates the bound session used to reach the resource.

## Check licensing and the support boundary

The Windows deployment guide requires **Microsoft Entra ID P1**. The administrator creating the policy needs at least the **Conditional Access Administrator** role. Sign-in-log and Log Analytics access retain their own role, licensing, retention, and export requirements. Use the least-privileged read role appropriate to the support team rather than granting policy-write access for troubleshooting.

Build a four-column readiness inventory: user and device, registration method, native client, and target resource. A row is enforceable only when every column is supported.

### Supported Windows native applications

Microsoft currently lists Exchange PowerShell, Microsoft Copilot, Edge profile sign-in, Microsoft Graph PowerShell with `EnableLoginByWAM`, Loop, Teams, To Do, OneNote, OneDrive, Outlook, Power BI Desktop, the PowerQuery extension for Excel on Current Channel, Visual Studio Code, Visual Studio using the Windows authentication broker, Windows App, and Word, Excel, and PowerPoint. Keep clients supported and up to date; an application name alone does not prove that the sign-in used the protected broker path. ([Windows application matrix](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#applications))

### Supported resources

For the Windows native path, Microsoft lists Exchange Online, SharePoint Online, Microsoft Teams, Azure Virtual Desktop, and Windows 365. The documented policy procedure targets those resources individually. Microsoft warns that selecting the Office 365 application group can produce unintended failures, making this an exception to the usual recommendation to target that application group. ([Windows resource and policy scope](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#create-a-conditional-access-policy))

### Known incompatible paths

The same deployment guide says Office perpetual clients, SharePoint-accessing PowerShell modules, non-Current Channel PowerQuery for Excel, and Visual Studio Code extensions that access Exchange or SharePoint are unsupported. Surface Hub and Windows-based Microsoft Teams Rooms are also unsupported.

Several Microsoft Entra device-registration methods need explicit attention because Token Protection does not support them in this Windows path:

- Entra-joined Azure Virtual Desktop session hosts;
- Windows bulk enrollment;
- Entra-joined Windows 365 Cloud PCs;
- Entra-joined Power Automate hosted machine groups;
- Windows Autopilot self-deploying mode; and
- Azure virtual machines enabled for Entra authentication through the VM extension.

Microsoft provides documented device-filter examples for these populations and recommends excluding the affected deployment category during onboarding. Validate the attributes against your own device objects before using any filter. Do not convert the list into one permanent “all virtual devices” exclusion. ([Known limitations and filter examples](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#known-limitations))

## Build a readiness inventory before policy creation

Start with observed usage, not the product catalog. For a representative period that includes month-end, privileged administration, remote work, and background synchronization, inventory:

- user, business role, and emergency-access status;
- Windows version, update ring, device ID, join type, and TPM health;
- enrollment or registration method;
- application name, version, update channel, and authentication broker;
- target resource and sign-in type;
- interactive and non-interactive request volume;
- existing Conditional Access policies and exclusions; and
- owner for remediation or an approved unsupported-path decision.

Pay special attention to names that conceal multiple flows. “Excel” may mean a supported Current Channel PowerQuery flow or an unsupported channel. “PowerShell” may mean a supported Exchange module, Microsoft Graph PowerShell configured for WAM, or an unsupported SharePoint module. “Edge” in the Windows native matrix refers to profile sign-in, not a blanket statement that every website in Edge satisfies the native Token Protection control.

Use a dedicated pilot group. Exclude emergency-access accounts as Microsoft directs, but do not use that exclusion as evidence that routine administrators can recover. The pilot should include a normal recovery identity and a tested change operator who can move the new policy back to Report-only.

## Pilot Microsoft Entra token protection registration safely

Microsoft's deployment guidance recommends a small pilot, Report-only mode, both interactive and non-interactive sign-in capture, observation across normal application use, and enforcement only for users whose flows are known to work. Use that sequence as the minimum control.

### Ring 0: record the current state

Export or record the proposed policy name, included users, exclusions, target resources, Windows platform condition, client-app condition, device filters, session control, owner, approval, and rollback operator. Confirm the emergency-access design and test the recovery administrator before touching enforcement.

The documented client-app condition selects **Mobile apps and desktop clients** and leaves Browser unchecked. Microsoft warns that leaving Browser selected can block MSAL.js applications such as Teams on the web. The session control is **Require token protection for sign-in sessions**. Keep the policy scoped to the documented resources rather than the Office 365 application group. ([Policy procedure](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#create-a-conditional-access-policy))

### Ring 1: observe in Report-only

Enable the policy in Report-only for a small but representative population. Capture interactive and non-interactive sign-ins long enough to cover foreground launches, background refresh, PowerShell administration, Office add-ins, and Windows App use. Report-only shows what the policy would do; it does not prove that the user can complete an inline registration prompt under enforcement.

Use the site's [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) to correlate policy results, but add the Token Protection fields described below. Record unsupported cases by owner and remediation date. Do not treat a low failure count as approval if the missing users simply did not exercise a monthly workflow.

### Ring 2: validate registration and intentional failure

Choose one supported, up-to-date Windows device that is not registered for the user's work account and one already registered device. With the policy enabled only for the pilot:

- prove that the registered device continues without a new prompt;
- prove that the eligible unregistered device receives the inline registration experience;
- complete registration with fresh user credentials and verify the resulting device object;
- repeat the supported application request and confirm a bound session;
- intentionally test one approved unsupported path and confirm it is blocked or excluded exactly as designed; and
- capture timestamps, correlation IDs, policy results, and binding status for each outcome.

Do not claim success from the prompt alone. Registration succeeds only when the device state exists, the subsequent application request is bound, and the protected resource is reached.

### Ring 3: enforce narrowly, then expand

Turn the policy On for known-good pilot users. Monitor help-desk contacts and sign-in evidence through several renewal cycles and normal application patterns. Expand by managed cohort—such as client update ring or business unit—only when every unbound category has a resolution or an approved exclusion with an owner and review date.

## Read Token Protection binding evidence

In the Microsoft Entra admin center, go to **Entra ID > Monitoring & health > Sign-in logs**. Open the matching request, read the Conditional Access or Report-only pane, select the Token Protection policy, and inspect its session-control result. In **Basic Info**, Microsoft exposes **Token Protection - Sign In Session**. ([Sign-in-log procedure](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#sign-in-logs))

- **Bound** means that request used a bound protocol.
- **Unbound** means it did not. Inspect `tokenProtectionStatusDetails` for the status code.

One bound row is not enough. A sign-in can contain multiple requests, and Microsoft says all of them must be bound to satisfy the policy. Correlate by user and correlation ID, and include non-interactive logs.

Use the documented unbound codes as routing signals:

- **1002 — no Entra device state:** confirm the correct tenant, user, device registration, and device ID. For an eligible unregistered device on the current Windows update, reproduce the inline registration flow.
- **1003 — device state does not satisfy Token Protection:** check for an unsupported registration method or a registration that was not completed using fresh sign-in credentials. Microsoft specifically uses 1003 to identify unsupported device-registration types.
- **1005 — other unspecified reason:** preserve the request and correlation evidence, compare a known-good request, and escalate when the documented boundaries do not explain it.
- **1006 — unsupported operating system:** verify the real Windows build and update status instead of overriding the policy for the user.
- **1008 — client is not integrated with the platform broker:** confirm that the application and exact authentication flow use WAM; changing device compliance will not repair a non-brokered client.

For exported logs, Microsoft documents `tokenProtectionStatusDetails` and sample Log Analytics queries for both `SigninLogs` and `AADNonInteractiveUserSignInLogs`. The enforced session-control string is `SignInTokenProtection`; historical data from before late June 2023 can contain `Binding`. Copy Microsoft's current query from the deployment guide rather than preserving a stale local version. ([Log Analytics examples](https://learn.microsoft.com/en-us/entra/identity/conditional-access/deployment-guide-token-protection-windows#log-analytics))

## Troubleshoot the failure boundary, not the last prompt

### No inline registration prompt appears

Verify the latest September 2026 Windows update or newer, then confirm the client, resource, platform, and device type are inside the supported matrix. Older Windows clients retain the previous error experience. An unsupported application is expected to fail after authentication; it is not proof that the GA registration experience is broken.

### Registration completes but code 1003 remains

Check how the device was registered and whether the registration used fresh sign-in credentials. Compare the device with Microsoft's unsupported registration-method list. Confirm the request's device ID matches the newly created or updated device object; a second stale work-account registration can send support staff to the wrong record.

### The app is supported but code 1008 appears

Prove the exact authentication path. Visual Studio must use its Windows authentication broker option, Microsoft Graph PowerShell needs `EnableLoginByWAM`, and extensions or add-ins can acquire tokens differently from their host application. The application logo and process name do not prove WAM integration.

### Report-only looks clean but enforcement blocks users

Find the exact enforced request and read every Conditional Access policy result. Confirm the user actually exercised background and non-interactive flows during observation. Then compare client version, update channel, resource, registration method, and broker status with the report-only sample. The site's [token lifetime, revocation, and CAE guide](/posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation) explains why an existing session's timing can make a policy change appear inconsistent; it does not replace Token Protection binding evidence.

### External users receive an unclear error

Microsoft supports external users only when they meet Token Protection device-registration requirements in their home tenant, and it warns that users who do not meet them can see an unclear error. Capture the resource-tenant and home-tenant context before escalating. Do not ask the guest to register an unmanaged device blindly or create a resource-tenant exception without the collaboration owner's approval.

## Roll back without reopening every session

If the pilot disrupts a supported production path, move only the new Token Protection policy from On back to **Report-only**, or remove the narrow pilot cohort while preserving emergency access. Capture failed interactive and non-interactive sign-ins before rollback, then repeat the same client and resource request to prove recovery.

Do not disable unrelated MFA, device-compliance, location, or risk policies. Do not add a permanent user exclusion for an application or registration-method incompatibility. A device-category exclusion can be appropriate where Microsoft documents that category as unsupported, but it should have an owner, reason, review date, and compensating controls.

> [!IMPORTANT]
> **Analysis:** rollback restores availability; it also removes the device-bound session requirement for the rolled-back scope. Keep the incident open until the flow is updated, migrated, or explicitly risk-accepted. “The user can sign in again” is not the same as “the token replay control is deployed.”

Escalate to Microsoft when an up-to-date supported client, resource, operating system, and registration method remains unbound after a fresh registration. Provide sanitized tenant and user identifiers, UTC interval, correlation and request IDs, device ID and join type, application and version, target resource, policy ID and export, `tokenProtectionStatusDetails`, and the relevant interactive and non-interactive records. Never include tokens, session keys, passwords, or recovery credentials.

## Administrator checklist

- [ ] Confirm Microsoft Entra ID P1 licensing and least-privileged administrator roles.
- [ ] Inventory Windows builds, update rings, join types, registration methods, and TPM health.
- [ ] Map each native client to its exact authentication broker and update channel.
- [ ] Target only documented resources; do not select the Office 365 application group.
- [ ] Limit the client-app condition to mobile apps and desktop clients for this native policy.
- [ ] Identify unsupported devices, applications, add-ins, extensions, and enrollment methods.
- [ ] Test emergency access and a normal recovery administrator before enforcement.
- [ ] Start with a small pilot and Report-only mode.
- [ ] Capture interactive and non-interactive sign-ins across normal work cycles.
- [ ] Validate the inline registration flow on an up-to-date eligible Windows device.
- [ ] Confirm the subsequent request is Bound; do not stop at a successful prompt.
- [ ] Route codes 1002, 1003, 1005, 1006, and 1008 to the correct owner.
- [ ] Correlate every request in the sign-in, not a single successful row.
- [ ] Turn enforcement on only for known-good cohorts.
- [ ] Give every exclusion an owner, compensating control, and review date.
- [ ] Roll back only the Token Protection pilot scope if availability is affected.

The useful mental model is simple: **registration creates the device identity and keys; the Windows broker proves possession; Conditional Access requires the bound session; and the sign-in logs prove whether the entire request chain satisfied that requirement**. The new inline experience makes the first step easier for eligible users. It does not make the remaining three steps optional.
