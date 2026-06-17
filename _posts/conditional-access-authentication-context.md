---
title: "Conditional Access Authentication Context: Step-Up Auth Without Policy Sprawl"
excerpt: "You don't actually want to require phishing-resistant MFA for every sign-in. You want it when the user reaches for a sensitive SharePoint site, activates a PIM role, or runs an action your app considers high-value. Authentication context is the dial that lets you target the step-up at the action instead of the app — and it's underused."
coverImage: "/assets/blog/conditional-access-authentication-context/diagram.svg"
date: "2026-06-15T09:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/conditional-access-authentication-context/diagram.svg"
---

If you've ever tried to write a Conditional Access policy that says "require phishing-resistant MFA, but only when the user is about to look at the executive payroll spreadsheet," you'll have noticed it doesn't fit. Cloud apps in CA are the whole app — you can require strong auth for SharePoint Online, or for nothing in SharePoint Online, but not for the specific site collection that holds the sensitive content. That's the gap **authentication context** fills.

The model is small and reads weird until you've used it once. You define a context — a short string like `c1` with a friendly name like "High-value action" — and you write a CA policy that targets *the context* rather than an app. Then any product that's aware of authentication contexts (SharePoint Online with sensitivity labels, PIM activation, Microsoft Defender for Cloud Apps session policies, Microsoft Graph application calls that opt in) can ask, at the moment of a sensitive action, for the user to have satisfied that context. If they haven't, the runtime kicks back a claims challenge, the user satisfies the policy (typically a step-up MFA), and the action proceeds. The policy targets the *moment*, not the app. That's the whole trick.

This piece walks through how authentication context actually works, the patterns I see used most often (admin step-up, sensitive SharePoint, PIM activation, Defender session policies), the consumer integrations that matter, and the pitfalls that catch first-time rollouts. The Microsoft references are [Authentication context for Conditional Access](https://learn.microsoft.com/entra/identity/conditional-access/concept-conditional-access-cloud-apps#authentication-context), [Use sensitivity labels with SharePoint](https://learn.microsoft.com/purview/sensitivity-labels-teams-groups-sites), and the [PIM role settings](https://learn.microsoft.com/entra/id-governance/privileged-identity-management/pim-how-to-change-default-settings) page where context attachment lives.

## What a context actually is

A context is a tiny configuration object that lives at Entra admin centre → Protection → Conditional Access → Authentication contexts. It has three useful properties: an ID (`c1` through `c25`, the platform caps at 25), a display name, and a description. That's it. The context object itself does nothing. It's a label you can later target.

You then write a Conditional Access policy that includes the context in the Target resources tab — there's a tab for cloud apps and a tab for authentication contexts. The policy's grant control set (require MFA, require phishing-resistant strength, require compliant device, sign-in frequency, whatever you want) is what gets enforced when something claims the context. Outside the moments when something claims the context, the policy doesn't apply.

The pattern is easier to see than to describe. Suppose you want phishing-resistant MFA on the action of activating a Global Administrator role through PIM, but you don't want to force phishing-resistant MFA on every admin's regular Outlook sign-in. The shape:

1. Define authentication context `c1` named "Privileged role activation."
2. Write CA policy "CA-Auth-Context-Privileged-Activation" targeting context `c1`, grant control = `Require authentication strength: Phishing-resistant MFA`.
3. In PIM role settings for Global Administrator, set "Activation auth context" to `c1`.

Now when the admin tries to activate GA, PIM tells Entra "this action needs context c1." Entra checks whether the current session satisfies the c1 policy. If not, the user gets a step-up prompt for phishing-resistant MFA. If yes, the activation proceeds. The admin's normal Outlook traffic isn't affected at all.

> [!IMPORTANT]
> Contexts only fire when something *consumes* them. Creating a context and a policy that targets it but never attaching the context to a consumer means the policy is dormant. The activation, the SharePoint site, the Graph call — something has to actually claim the context. The dormant policy can look indistinguishable from a working one in the policy list, which is a fun way to discover the gap during an incident.

## The four consumers worth knowing

**Privileged Identity Management.** Already covered above. Each PIM role has an optional "On activation, require Conditional Access authentication context" dial. This is the strongest practical control PIM exposes because it inherits all your CA policy intelligence into the activation. The activation isn't just "MFA passed and the user clicked Activate" — it's "the request satisfied a CA policy you explicitly designed for privileged moments." I'd attach a phishing-resistant + compliant-device context to every GA-class role.

**SharePoint Online with sensitivity labels.** This is where authentication context shines for non-admin scenarios. A sensitivity label (configured in Microsoft Purview) can have "Auth context required" set as one of its protection settings. Apply the label to a SharePoint site, a Teams team, or a Microsoft 365 group, and any access to the site requires the user to have satisfied the context. The use case: finance has a "Highly confidential" label. The label requires context `c2` defined as "Compliant device + phishing-resistant MFA." Users can land in finance's general SharePoint at the normal trust bar, but the moment they navigate into a site labelled Highly confidential, they get the step-up.

**Microsoft Defender for Cloud Apps session policies.** A Defender for Cloud Apps session policy can require a context as part of its action triggers. The pattern: an outbound file download from a labelled SharePoint document triggers a session policy that requires `c3` ("Step-up for downloads"). The user can browse the document in the browser without re-auth, but downloading triggers a fresh challenge.

**Custom apps via Microsoft Graph.** Apps that use the Microsoft identity platform can request a specific context as part of their token request via the [claims challenge](https://learn.microsoft.com/entra/identity-platform/claims-challenge) mechanism. An app sees the user about to perform a high-value action — initiating a wire transfer, viewing salary data, anything — and challenges for context `c4`. The user gets step-up at the action moment. Most enterprise apps don't yet do this, but custom internal apps absolutely should.

## A practical starter set of contexts

A reasonable initial design uses three to five contexts. Going past ten in a single tenant is a sign you're using contexts for things that should be regular CA policy.

```
c1  Privileged role activation
    → Phishing-resistant MFA + compliant device
    → Attached to: PIM (Global Admin, Privileged Role Admin, CA Admin)

c2  Highly confidential data access
    → Phishing-resistant MFA + compliant device + sign-in frequency 4h
    → Attached to: SharePoint sensitivity label "Highly confidential"

c3  Download from labelled SharePoint
    → Phishing-resistant MFA + compliant device
    → Attached to: Defender for Cloud Apps session policy

c4  Sensitive admin action in <your custom app>
    → Phishing-resistant MFA
    → Attached to: Custom app via claims challenge
```

This covers a substantial fraction of the "step up for sensitive moments" scenarios without sprawl. Add more contexts only when there's a real consumer asking for one.

## Configuring the SharePoint scenario end to end

The SharePoint + sensitivity label flow has more moving parts than the others. Walking it explicitly:

```powershell
# 1. Create the authentication context in Entra (Graph PowerShell)
Connect-MgGraph -Scopes "Policy.ReadWrite.ConditionalAccess"

$context = @{
    id          = "c2"
    displayName = "Highly confidential data access"
    description = "Require phishing-resistant MFA from compliant device"
    isAvailable = $true
}
Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/authenticationContextClassReferences" `
    -Body ($context | ConvertTo-Json)
```

```powershell
# 2. Write the CA policy targeting the context (this is also doable in the portal)
$policy = @{
    displayName = "CA-Step-Up: Highly Confidential"
    state       = "enabled"
    conditions  = @{
        users        = @{ includeUsers = @("All") }
        applications = @{ includeAuthenticationContextClassReferences = @("c2") }
        clientAppTypes = @("all")
    }
    grantControls = @{
        operator        = "AND"
        authenticationStrength = @{ id = "00000000-0000-0000-0000-000000000004" }  # Phishing-resistant MFA built-in
        builtInControls = @("compliantDevice")
    }
}
Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" `
    -Body ($policy | ConvertTo-Json -Depth 6)
```

Then in Microsoft Purview, edit the sensitivity label "Highly confidential" and on the Auto-labelling / Protection settings tab, enable "Use Conditional Access" and select `c2` from the dropdown. Apply the label to the SharePoint sites that hold the sensitive content.

End to end test: as a normal user, sign in to Outlook (trust bar passes at normal MFA). Navigate to the SharePoint site labelled Highly confidential. You should see a step-up prompt for phishing-resistant MFA. After satisfying it, the site loads. Without satisfying it, the access is blocked.

> [!TIP]
> Test this with a pilot user before flipping the label on production-critical sites. A misconfigured CA policy attached to a context can lock people out of high-value sites entirely, and "I can't get into the executive SharePoint" is the wrong kind of Monday morning ticket.

## What's reported in sign-in logs

When a user satisfies a context, the sign-in log records the authentication context references on the request. You can query:

```kql
SigninLogs
| where TimeGenerated > ago(7d)
| where isnotempty(AuthenticationContextClassReferences)
| extend Contexts = tostring(AuthenticationContextClassReferences)
| project TimeGenerated, UserPrincipalName, AppDisplayName, Contexts,
          ConditionalAccessStatus, CorrelationId
| order by TimeGenerated desc
```

If you see a sign-in flagged with a context but the consumer didn't actually need it, you've probably misconfigured a consumer to require a context too broadly. If you don't see contexts firing at all, the consumer isn't claiming them — which usually means the SharePoint label or the PIM role setting didn't get attached.

## Pitfalls

**Contexts past `c25`.** The platform caps at 25. If you're approaching that number you've moved past "step-up for sensitive moments" into "general policy" and you should consolidate.

**Multiple policies targeting the same context.** Like cloud-app-targeting policies, multiple authentication-context policies can target the same context, and the runtime combines them. Make sure you understand what the combined verdict will be. Test with What If.

**Stale context attachments.** A SharePoint sensitivity label that references a context you later renamed or deleted will silently stop enforcing. Audit your label-to-context bindings quarterly.

**Consumer doesn't actually challenge.** Custom apps using the Microsoft identity platform have to actively issue claims challenges to consume a context. Many don't. If you've added context support to your app and step-up isn't firing in production, the app likely isn't sending the challenge. The fix is on the app side, not the CA side.

**Mixing contexts and regular CA targeting in the same policy.** The same CA policy can target both cloud apps and authentication contexts. This is allowed and usually a bad idea. The policy fires on either condition, which produces hard-to-reason behaviour. Use separate policies for each.

## Things people ask

*Can a context have multiple CA policies attached?* Yes. They combine in the standard CA way — most restrictive wins on grant controls. Useful for stacking conditions but think it through before you write the second policy.

*Can a non-admin user trigger a context?* Yes. Contexts aren't admin-only. SharePoint sensitivity labels and Defender session policies both trigger them for end users.

*What happens if the user can't satisfy the step-up?* The action is blocked. The consumer (SharePoint, PIM, the app) reports an access denial. The user has no path through unless they can satisfy the policy — which is by design, but worth communicating to users so the error makes sense to them.

*Is there an audit log entry when a context is claimed?* Yes — the sign-in log shows the authentication context references on the request, and the consumer's own audit (SharePoint site access, PIM activation, Defender session policy hit) records the action that triggered the context.

*Can I target a specific user with a context?* Not at the context level. The CA policy attached to the context can target specific users (with includeUsers / excludeUsers). So you write the policy once, target the right group, attach the context to the consumer.

*What's the difference between authentication context and Authentication Strengths?* They solve different problems. Authentication Strengths define *which methods* satisfy MFA (passkey vs phone vs SMS). Authentication contexts define *when* to require something. You typically combine them: an authentication context that requires the phishing-resistant authentication strength.

## Where to read further

- [Authentication context in Conditional Access — Microsoft Learn](https://learn.microsoft.com/entra/identity/conditional-access/concept-conditional-access-cloud-apps#authentication-context)
- [Configure auth context via Graph — Microsoft Learn](https://learn.microsoft.com/graph/api/conditionalaccessroot-list-authenticationcontextclassreferences)
- [Use sensitivity labels with SharePoint sites — Microsoft Learn](https://learn.microsoft.com/purview/sensitivity-labels-teams-groups-sites)
- [PIM role settings (activation auth context) — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/privileged-identity-management/pim-how-to-change-default-settings)
- [Defender for Cloud Apps session policies — Microsoft Learn](https://learn.microsoft.com/defender-cloud-apps/session-policy-aad)
- [Claims challenge for custom apps — Microsoft Learn](https://learn.microsoft.com/entra/identity-platform/claims-challenge)
- [Authentication strengths — Microsoft Learn](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-strengths)
