---
title: "Microsoft Entra Access Reviews: The Quarterly Cleanup That Actually Closes the Loop"
excerpt: "The Yes-No survey nobody pays attention to is the dominant access-review failure mode. The setup that works treats reviews as a loop with three real parts — what to scope, who to ask, what auto-apply rule fires when nobody responds. Done right, it removes stale access on its own without an analyst staring at a queue."
coverImage: "/assets/blog/microsoft-entra-access-reviews/diagram.svg"
date: "2026-06-17T11:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/microsoft-entra-access-reviews/diagram.svg"
---

The compliance auditor's question is always some version of "show me that the people who have access to X actually still need it." The right answer is "here's the quarterly access review on group X, here are the decisions, here's the auto-apply log." The wrong answer is "let me pull a spreadsheet and chase the managers down." Most tenants are stuck answering the wrong way, not because Entra doesn't have the feature, but because the access reviews they did set up are loops that don't close — surveys nobody answers, with no auto-apply rule, so the report comes back empty and nothing changes.

Microsoft Entra Access Reviews are the feature that makes the loop actually close, if you set them up to do that. The shape that works: scope tightly (a specific group, app, or role — not "everyone"), pick the right reviewer (the one with the knowledge to decide, not the most senior person in the chain), set the auto-apply rule for non-responders to remove access, and let the system handle it. This piece walks through what to scope, how to pick reviewers, what auto-apply rule to use, and the small set of operational queries that prove the reviews are doing real work. Microsoft's references throughout are [What is access reviews](https://learn.microsoft.com/entra/id-governance/access-reviews-overview), [Create an access review of groups](https://learn.microsoft.com/entra/id-governance/create-access-review), and [Review settings for an access review](https://learn.microsoft.com/entra/id-governance/review-recommendations-access-reviews).

## The three things to decide before clicking Create

Most access reviews go wrong at the configuration step, and the three configuration mistakes account for most of the failure. Get these right and the rest falls into place.

**Scope.** A review of "all members of the Engineering team" is a review of 400 people that the manager will rubber-stamp because they can't possibly remember every relationship. A review of "members of the SharePoint site `Finance-Confidential-2026` who haven't accessed the site in the last 90 days" is a review of 12 people where the manager can actually make a meaningful decision per row. Scope tightly. Use *inactive user* filters where they apply. Microsoft's [inactive user filter](https://learn.microsoft.com/entra/id-governance/review-recommendations-access-reviews) is exactly the right shape for this — it surfaces the people whose access genuinely hasn't been used, which is the same population whose access is most likely to be removable without controversy.

**Reviewer.** The reviewer is the person who knows whether the access is still needed. That's usually not the group owner (who often has no idea who's in the group), not the user themselves (who'll say yes to keep their access), and not the security team (who lacks the operational context). It's usually the user's manager — because the manager knows whether the user is still on the relevant team — or, for partner / consultant scenarios, the internal sponsor who originally requested the access. For very high-value resources you can configure multi-stage review: manager first, then resource owner. Don't make the same person both stages — that's not review, that's signing your own form.

**Auto-apply rule.** This is the dial that determines whether the review actually closes the loop. The options for what happens to non-responders (users whose reviewer didn't respond by the deadline) are: take no action, remove access, or approve access. Pick "remove access" almost every time. The argument for "take no action" is "we don't want to remove access if the reviewer was just busy" — but the argument back is that in a tenant of any size, busy reviewers are the rule, not the exception. If "take no action" is the default, your access review effectively never removes anyone. The whole point evaporates.

> [!IMPORTANT]
> If you're nervous about auto-removing access on first rollout, run one review cycle with the rule set to "Take no action," look at the response rate, and *only then* tighten to "Remove access" for the next cycle. The first cycle gives you the baseline data. Don't stay on "Take no action" forever — that's the failure mode.

## A working configuration via the portal

Walking the steps for a typical "quarterly review of guests in a SharePoint-Online-backed Microsoft 365 group":

1. Open Entra admin → Identity Governance → Access reviews → New access review.
2. **What to review**: Teams + Groups.
3. **Review scope**: select the specific group, then under *Scope*, choose `Guest users only`. This filter alone removes 90% of the noise in a typical M365 tenant.
4. **Reviewers**: `User's manager` is the default; for guest-only reviews, switch to `Selected reviewers` and pick the internal sponsor / a named team. Guests don't have managers in your tenant; using "user's manager" defaults to a fallback you didn't intend.
5. **Recurrence**: Quarterly. First run = next Monday. End = no end date.
6. **Duration each review is open**: 21 days. Not less (managers go on vacation), not more (reviews shouldn't drag).
7. **Upon completion settings**: Auto-apply = Yes. If reviewer doesn't respond = `Remove access`. Justification required = Yes.
8. **Decision helpers / recommendations**: Enable. The system surfaces "this user hasn't signed in for 60 days" as a hint to the reviewer; that one column closes the review three times faster.

```powershell
# Create a recurring access review via Graph PowerShell
Connect-MgGraph -Scopes "AccessReview.ReadWrite.All"

$review = @{
    displayName = "Quarterly guest review — Finance group"
    descriptionForAdmins  = "Quarterly review of guest membership in Finance M365 group"
    descriptionForReviewers = "Please verify these external collaborators still need access."
    scope = @{
        "@odata.type" = "#microsoft.graph.accessReviewQueryScope"
        query         = "/groups/<group-id>/transitiveMembers/microsoft.graph.user/?$filter=(userType eq 'Guest')"
        queryType     = "MicrosoftGraph"
    }
    reviewers = @( @{ query = "/users/<sponsor-id>"; queryType = "MicrosoftGraph" } )
    settings = @{
        mailNotificationsEnabled       = $true
        reminderNotificationsEnabled   = $true
        justificationRequiredOnApproval = $true
        defaultDecisionEnabled         = $true
        defaultDecision                 = "Deny"  # if reviewer doesn't respond → remove
        instanceDurationInDays         = 21
        autoApplyDecisionsEnabled      = $true
        recommendationsEnabled         = $true
        recurrence = @{
            pattern = @{ type = "absoluteMonthly"; interval = 3 }
            range   = @{ type = "noEnd"; startDate = (Get-Date).ToString("yyyy-MM-dd") }
        }
    }
}
New-MgIdentityGovernanceAccessReviewDefinition -BodyParameter $review
```

The `defaultDecision = "Deny"` setting is the one that matters most. That's the auto-apply rule that closes the loop.

## What to actually review, in priority order

Not every group needs a quarterly review. The shape that works prioritises by risk:

**Quarterly, auto-apply remove**: privileged role assignments (via PIM), guest membership in any group that grants resource access, members of high-value SharePoint sites and Teams (anything labelled Confidential or higher), application owner assignments for production apps.

**Annually, auto-apply remove**: standard group memberships that aren't driven by dynamic rules or HR provisioning. Anything that was added manually by a human at some point — the population most likely to have drift.

**Never** (don't review): dynamic groups (the rule is the review, by definition), groups driven by HR-attribute provisioning, the user's own primary department membership. Reviewing things that are deterministically managed by another system wastes the reviewer's time and undermines the credibility of reviews that matter.

## Operational queries

The proof that reviews are actually doing real work lives in the audit log and the access review reports.

```kql
// Decisions applied by access reviews in the last 90 days
AuditLogs
| where TimeGenerated > ago(90d)
| where Category == "IdentityGovernance"
| where OperationName has "Access review decision applied"
| extend Reviewer = tostring(InitiatedBy.user.userPrincipalName),
         Target = tostring(TargetResources[0].userPrincipalName),
         Decision = tostring(AdditionalDetails[0].value)
| project TimeGenerated, Reviewer, Target, Decision, CorrelationId
| order by TimeGenerated desc
```

```kql
// Reviews where no decision was applied (loop didn't close)
AuditLogs
| where TimeGenerated > ago(90d)
| where Category == "IdentityGovernance"
| where OperationName == "Apply access review"
| extend Review = tostring(TargetResources[0].displayName),
         AppliedCount = toint(AdditionalDetails[?key == "appliedDecisions"].value),
         NotAppliedCount = toint(AdditionalDetails[?key == "notAppliedDecisions"].value)
| where NotAppliedCount > 0
| project TimeGenerated, Review, AppliedCount, NotAppliedCount
| order by TimeGenerated desc
```

The second query catches reviews where the auto-apply rule was set to "Take no action" and the loop never closes. If you find reviews on that list more than once or twice a year, the configuration needs to change — pick a real default decision and let it run.

## Things people ask

*Can the same user be in two access reviews at once?* Yes. Each review evaluates independently and the decisions don't conflict — if review A says "approve" and review B says "deny," the user keeps access via A and loses access via B simultaneously. Most often this just means you've over-scoped one of the reviews. Tighten.

*What if the user is in a dynamic group and a review removes them?* The dynamic group rule re-evaluates and may re-add them within minutes. Access reviews don't make sense on dynamic groups for this exact reason. Reviewing membership that's deterministically computed by a rule is pointless.

*Does the manager need a license to be a reviewer?* The reviewer needs a Microsoft Entra ID Governance license. So does the user being reviewed if you're reviewing access via Entitlement Management. Standard membership reviews against Entra ID P1 features (group membership, app assignment) work under the base P2 license without an additional Governance SKU, though check current licensing as Microsoft has been consolidating.

*What if I want to review a role assignment but the user is also in many groups that grant similar access?* Review the role assignment specifically. Removing the role doesn't remove their group memberships. If you want the full picture, you need either an Entitlement Management package that bundles all the related grants and review the package, or a separate review per resource.

*Do guests get notified when their access is removed?* By default yes — they receive an email from your tenant explaining the removal. You can configure the notification text per review.

## Where to read further

- [What is access reviews — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/access-reviews-overview)
- [Create an access review of groups — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/create-access-review)
- [Settings and recommendations — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/review-recommendations-access-reviews)
- [Review inactive users — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/create-access-review)
- [Access reviews via Microsoft Graph — Microsoft Learn](https://learn.microsoft.com/graph/api/resources/accessreviewsv2-overview)
- [Microsoft Entra ID Governance licensing — Microsoft Learn](https://learn.microsoft.com/entra/id-governance/licensing-fundamentals)
