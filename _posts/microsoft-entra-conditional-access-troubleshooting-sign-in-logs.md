---
title: "Troubleshooting Microsoft Entra Conditional Access with Sign-in Logs: A Field Guide"
excerpt: "How to read the Microsoft Entra sign-in log, decode the Conditional Access tab, and use KQL against SigninLogs in Log Analytics to find why a policy blocked a user."
coverImage: "/assets/blog/microsoft-entra-conditional-access-troubleshooting-sign-in-logs/diagram.svg"
date: "2026-05-12T09:00:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/microsoft-entra-conditional-access-troubleshooting-sign-in-logs/diagram.svg"
---

## Why Conditional Access troubleshooting starts in the sign-in log

When a user reports "I cannot get into Outlook," the answer almost never lives in the portal's Conditional Access policy editor. It lives in the sign-in log, because the sign-in log is the only place that records the **actual** evaluation the runtime performed for **that** request, against **that** user, on **that** client, from **that** network, at **that** moment in time.

The Microsoft Entra admin centre describes Conditional Access policies as a runtime decision engine that combines signals, applies controls, and either allows the request, requires additional controls (such as multifactor authentication or compliant device), or blocks it. The result is then written to the `SigninLogs` table along with the policy evaluation detail. Microsoft's documentation for [Conditional Access sign-in log details](https://learn.microsoft.com/azure/active-directory/conditional-access/troubleshoot-conditional-access) explains the per-policy verdict columns; this article is the working playbook a real engineer uses when a real incident is in flight.

> [!NOTE]
> The sign-in log surfaces exactly one verdict per Conditional Access policy that was in scope for a request. If a policy is missing from the evaluation list, **it did not target this request**. That is itself diagnostic information.

This article covers, in order: the anatomy of a sign-in record, the Conditional Access tab and its possible values, the common failure patterns, the KQL queries you should keep in a notebook, the use of the policy What If tool to reproduce a failure, and the criteria for escalating to Microsoft.

## The anatomy of a sign-in log entry

Every interactive sign-in produces a record in `Audit logs → Sign-ins → User sign-ins (interactive)`. Non-interactive sign-ins (service principals, managed identities, refresh-token redemption) land in their own tabs. For Conditional Access troubleshooting you almost always start on the **User sign-ins (interactive)** and **Non-interactive** tabs, because that is where browser, native client, and rich-client refresh flows are recorded.

A single record contains, at minimum, the following fields that matter for troubleshooting:

- **User** — the UPN (and the underlying object ID — confirm this matches when there are duplicate display names).
- **Application** — the resource the user was trying to reach. Note that the value here is the *resource* (for example "Office 365 Exchange Online") rather than the application the user clicked. The two often differ.
- **Status** — Success, Failure, or Interrupted.
- **Sign-in error code** — `AADSTS50158`, `AADSTS50076`, `AADSTS53003`, etc. The [AADSTS error code reference](https://learn.microsoft.com/azure/active-directory/develop/reference-error-codes) decodes each.
- **Correlation ID** — the value you give Microsoft Support when escalating. Note it down on every incident.
- **Client app** — Modern auth client, Browser, IMAP, Legacy auth, Exchange ActiveSync, and so on. Modern is what you want; legacy auth showing up here is itself diagnostic.
- **Device information** — Join state (Entra registered, Entra joined, Entra hybrid joined), compliance state, browser, OS.
- **Conditional Access** — per-policy verdict (covered in detail below).
- **Authentication details** — the methods the runtime asked for, the methods that were satisfied, and their timestamps.

> [!TIP]
> Open a failed sign-in in a new tab and immediately copy the **Correlation ID**, **Sign-in error code**, and **Conditional Access tab**. Those three artefacts are enough to reproduce 90% of incidents.

## The Conditional Access tab and what its verdicts mean

Click into a sign-in record and open the **Conditional Access** tab. You will see a row for each policy that was *in scope* for the request, along with a verdict. The possible verdicts are documented in [Sign-in activity reports](https://learn.microsoft.com/azure/active-directory/reports-monitoring/concept-sign-ins) and are the centre of any Conditional Access investigation:

- **Success** — every required control was satisfied.
- **Failure** — a required control could not be satisfied (for example, the device is not compliant, or MFA was not completed).
- **Not applied** — the policy targets matched but the *conditions* did not, so the policy did not enforce. Common when a user-risk policy did not fire because Entra ID Protection did not classify the sign-in as risky.
- **Report-only: Failure / Success / Not applied** — same evaluation but the policy is in report-only mode and did not enforce. Treat these the same way as their enforced counterparts when you are planning a rollout.
- **User action required** — the policy required additional interaction (for example, register an authentication method) that the client did not complete.

> [!IMPORTANT]
> A user can fail one policy and succeed at another in the same request. Conditional Access policies are evaluated independently and the overall request verdict is the most restrictive outcome. Read every row, not just the first.

If you expect a policy to be in scope but it does not appear in the Conditional Access tab, the policy targeting did not match. The most common reasons are:

- The user is excluded from the policy via a group membership you forgot about. Service-account exclusion groups, break-glass groups, and project-specific exception groups all live here.
- The cloud app filter does not match the resource the client requested. The user clicked "Outlook" but the request was made to the Exchange Online resource, which is what the policy filters on.
- The client app filter excludes the request. A policy that targets "Browser" will not fire on a native Outlook client even though it is "the same user, in the same app."
- The location condition matched a trusted named location and the policy excludes trusted locations.

## Five failure patterns to recognise immediately

After enough incidents, the failures stop looking unique. The following five patterns cover most of what you will see.

### 1. Compliant device required, device not compliant

Sign-in error: `AADSTS53000` — *Your device is required to be managed to access this resource* — or `AADSTS530003` for the related missing-device-state cases. The Conditional Access verdict for the policy that requires compliance will be **Failure**.

Resolution path: confirm the device is enrolled in Intune (or the configured MDM), confirm the device is reporting *Compliant* in `Endpoint Manager → Devices`, and verify the Entra device record on the user matches the device making the request. The frequent miss is a personal device the user thinks is "their work laptop," or a device that is Entra-joined but not enrolled in Intune. Microsoft's [Require device to be marked as compliant](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-conditional-access-grant#require-device-to-be-marked-as-compliant) page walks the supported client matrix.

### 2. Hybrid Entra joined required, device not hybrid joined

This shows up after a tenant has migrated from federated to managed authentication and forgotten that a hybrid-join policy still references the old state. The verdict shows the policy as **Failure** with the same `AADSTS530002`-class error, and the device shows as *Microsoft Entra registered* rather than *Hybrid joined*. Force a re-registration via `dsregcmd /leave` then re-join, or remove the hybrid requirement from the policy if the tenant no longer enforces hybrid join.

### 3. MFA required, MFA not satisfied

Sign-in error: `AADSTS50158` (*External security challenge not satisfied*) or `AADSTS500121` (*Authentication failed during strong authentication request*). The Conditional Access verdict will reference the policy that required the control.

Look at the **Authentication Details** tab next. It lists every authentication method the runtime asked for, with timestamps. If the user clicked through the prompt but did not satisfy a phishing-resistant strength (for example, your Authentication Strength policy required passkey / FIDO2 / WHfB and the user attempted SMS), the request fails — but the user often does not understand why. The fix is either to register the required method or to relax the strength for the user's role.

### 4. Location blocked

Sign-in error: `AADSTS53003` (*Access has been blocked by Conditional Access policies*) plus a Conditional Access verdict marking the location-blocking policy as **Failure**. The **Location** column on the sign-in shows the source IP and the GeoIP city. The most common reason is the request truly is from a blocked country — a VPN, a corporate edge in a different region, or actual travel. Cross-check the `Client IP` against your egress NAT IPs and against the user's known travel before assuming compromise.

### 5. Risk-based block

Sign-in error: `AADSTS50053` (user blocked due to risk) or `AADSTS50079` (proof up required due to risk). The Conditional Access verdict shows a user-risk or sign-in-risk policy in **Failure**. The **Risk state** column shows the risk level Entra ID Protection computed. The remediation path is documented in [Remediate risks and unblock users](https://learn.microsoft.com/azure/active-directory/identity-protection/howto-identity-protection-remediate-unblock).

## Reading the Authentication Details tab

The Authentication Details tab is the second-most-useful tab on a sign-in record, and it is the tab people forget exists. It lists every authentication method the runtime asked for, whether it was satisfied, the method used, the result, and the timestamp.

Use it to answer two questions that the Conditional Access tab alone cannot answer:

1. **Which method did the user actually present?** If your Authentication Strength policy required phishing-resistant MFA and the user satisfied it with a passkey, you will see *FIDO2 security key* or *Passkey (Microsoft Authenticator)* in this list. If the user fell back to SMS, the strength check will fail and you will see the attempted method here.
2. **What method had the most recent re-auth?** This matters when troubleshooting sign-in frequency policies. If the policy requires a re-auth every 4 hours and the user's most recent strong-method timestamp is 5 hours old, the runtime prompts again — that is correct behaviour, not a bug.

## KQL against `SigninLogs` in Log Analytics

The Entra portal sign-in log shows the last 30 days. For trend analysis, longitudinal investigations, and bulk reporting, route sign-ins to a Log Analytics workspace via Diagnostic Settings and query with KQL. The schema is documented at [SigninLogs reference](https://learn.microsoft.com/azure/azure-monitor/reference/tables/signinlogs).

A starter notebook every identity admin should keep:

```kql
// 1. All Conditional Access failures for a user in the last 7 days
SigninLogs
| where TimeGenerated > ago(7d)
| where UserPrincipalName == "user@contoso.com"
| where ConditionalAccessStatus == "failure"
| project TimeGenerated, AppDisplayName, ClientAppUsed, IPAddress,
          ConditionalAccessPolicies, Status, CorrelationId
| order by TimeGenerated desc
```

```kql
// 2. Top failing Conditional Access policies, tenant-wide
SigninLogs
| where TimeGenerated > ago(7d)
| mv-expand policy = ConditionalAccessPolicies
| where tostring(policy.result) == "failure"
| summarize Failures = count() by PolicyName = tostring(policy.displayName)
| order by Failures desc
```

```kql
// 3. Legacy authentication sign-ins (anything not Modern)
SigninLogs
| where TimeGenerated > ago(7d)
| where ClientAppUsed !in ("Browser", "Mobile Apps and Desktop clients")
| summarize Sign-ins = count() by UserPrincipalName, ClientAppUsed
| order by Sign-ins desc
```

```kql
// 4. Sign-ins where a compliant-device control failed
SigninLogs
| where TimeGenerated > ago(7d)
| mv-expand policy = ConditionalAccessPolicies
| where tostring(policy.result) == "failure"
| where tostring(policy.enforcedGrantControls) has "CompliantDevice"
| project TimeGenerated, UserPrincipalName, DeviceDetail, IPAddress, CorrelationId
```

> [!TIP]
> Pin the failing-policy-by-count query to a workbook. It will quietly surface policies that have started failing more than they should, often because of a target-group change you do not remember making.

## Reproducing a failure with the What If tool

The Conditional Access policy editor includes a **What If** tool (Microsoft Entra admin centre → Protection → Conditional Access → What If). It lets you specify a user, cloud app, client, device, location, and risk level, and shows which policies would apply, which would enforce, and what the combined verdict would be.

When a user reports a failure, run What If with the same user, the same app, the same client, and the same network conditions, then compare:

- The list of policies What If shows as in scope must match the Conditional Access tab on the sign-in log. If they differ, your live request hit conditions your reproduction did not — usually a missing risk classification, a missing device-compliance signal, or a stale group membership.
- The Authentication Strength column tells you which strengths would be required. If your reproduction shows *Phishing-resistant MFA* required and the user does not have a registered method that satisfies it, you have your root cause.

What If does not call the live request path, so it will not surface bugs in the platform — but it is the fastest way to confirm that policy targeting, not user error, is the cause.

## When to escalate to Microsoft Support

Most Conditional Access incidents are policy or signal issues you can resolve internally. Escalate to Microsoft when:

- The Conditional Access tab is **empty** but the sign-in failed with `AADSTS90019` or a generic "interrupt" status, and your repro confirms a policy should have applied. This is a sign the evaluation pipeline did not execute as expected.
- A policy verdict toggles between **Success** and **Failure** for identical requests in the same minute. Intermittent verdicts indicate a backend signal-propagation issue rather than a configuration issue on your side.
- Risk classifications appear delayed by hours rather than minutes for users where you have validated Identity Protection licensing and connectivity.

Open the case with the **Correlation ID**, **Request ID**, **User object ID**, **Tenant ID**, the **time window**, and the **specific policy display name** that produced the unexpected verdict. Support cannot read your tenant's data without those identifiers.

> [!WARNING]
> Do not screenshot the entire Conditional Access tab and ship it to Microsoft as your only evidence. Support engineers need the raw correlation and request identifiers to pull the backend traces. The screenshot is supplementary.

## Common questions

### Why does a sign-in show Success but the user still gets blocked from the app?

The Conditional Access verdict is at the token-issuance layer. If the user is blocked at the app layer (for example, by an Exchange Online mailbox restriction, a SharePoint site-collection permission, or a Defender for Cloud Apps session policy), the sign-in will show Success and the block lives downstream. Check the application's own audit log next.

### A policy is in report-only but the user is being blocked. How is that possible?

Report-only mode never enforces. If the user is blocked, a different enforced policy is responsible. Re-read the Conditional Access tab and look for the *enforced* row with a Failure verdict. Don't trust portal display ordering — read every row.

### Authentication Details shows that MFA was satisfied 2 hours ago. Why did the runtime prompt again?

Either an Authentication Strength policy applies that requires a stronger method than the satisfied one (the previously satisfied SMS does not satisfy a phishing-resistant strength), or a sign-in frequency policy requires re-auth more often than 2 hours, or the request is in a different session context (different client, different resource). All three are documented in the Microsoft Learn pages for [Authentication strengths](https://learn.microsoft.com/azure/active-directory/authentication/concept-authentication-strengths) and [Sign-in frequency](https://learn.microsoft.com/azure/active-directory/conditional-access/howto-conditional-access-session-lifetime).

### Why is the Client IP in the sign-in log different from the user's home IP?

If the user is behind a VPN, a corporate proxy, or a forward-egress edge, the source IP that Entra sees is the egress IP of that infrastructure, not the user's actual residential IP. Cross-check with `xff_header_ip` if your edge passes X-Forwarded-For, but Entra primarily evaluates on the connection IP.

### My Conditional Access tab shows the same policy twice. Why?

A single named policy can produce two evaluation rows when it has separate grant and session controls evaluated at different points in the pipeline, or when a token issuance has multiple sub-requests (for example, primary and secondary token requests on the same correlation ID). Treat each verdict on its own merits.

## What to take away

Conditional Access troubleshooting is a sign-in log discipline, not a policy editor discipline. The portal editor tells you what you *configured*; the sign-in log tells you what the runtime *did*. Build the habit of opening the Conditional Access tab first, the Authentication Details tab second, and reaching for the policy editor only after both have told their story. With those three artefacts and the AADSTS error code reference open in a tab, almost every Conditional Access incident becomes a 10-minute investigation rather than a 2-hour one.

## References

- [Conditional Access overview — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/overview)
- [Troubleshoot sign-in problems with Conditional Access — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/troubleshoot-conditional-access)
- [Sign-in logs in the Microsoft Entra admin centre — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/reports-monitoring/concept-sign-ins)
- [`SigninLogs` reference — Microsoft Learn](https://learn.microsoft.com/azure/azure-monitor/reference/tables/signinlogs)
- [AADSTS error code reference — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/develop/reference-error-codes)
- [Conditional Access What If tool — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/conditional-access/what-if-tool)
- [Authentication strengths — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/authentication/concept-authentication-strengths)
