---
title: "What are Entra ID Lifecycle Workflows? Automating Joiner-Mover-Leaver Without Losing Your Mind"
excerpt: "Someone gets hired. IT gets a ticket. Someone changes teams. IT gets a ticket. Someone quits. IT gets... yeah, another ticket. Every one of these takes 15 manual steps and something always gets missed. Lifecycle Workflows in Entra ID automate the whole thing. Grab a coffee. Let's break down what they are, when to use them, and how to build your first one."
coverImage: "/assets/blog/what-are-entra-lifecycle/diagram.svg"
date: "2026-07-05T10:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/what-are-entra-lifecycle/diagram.svg"
---

Grab a coffee. This one is going to change how you think about user provisioning forever.

You've probably experienced this scenario: someone gets hired at your company. HR emails IT. Someone in IT opens a ticket. They create the user in AD. Add them to 12 different groups. Grant them Microsoft 365 licenses. Provision a mailbox. Add them to Teams. Set up their SharePoint access. Update the phone system. Add them to the file share. Update the org chart tool.

**Fifteen manual steps.** Repeated for every hire. In some companies, thirty hires a week.

Now imagine that same person changes teams six months later. Or leaves the company. Same problem, different tickets. And every single time, something gets missed. A group membership doesn't get removed. A license doesn't get revoked. Someone's still in a mailing list two years after they quit.

This is the exact problem **Entra ID Lifecycle Workflows** was built to solve. And once you understand what it does, you'll wonder how you ever ran identity without it.

## The idea in one sentence

**Lifecycle Workflows are a set of automated tasks that run at specific points in a user's employment — when they join, when they change roles, when they leave — triggered by attributes in your directory.**

Let me unpack that.

- "**Automated tasks**" — things that used to be manual work. Sending welcome emails, adding to groups, generating Temporary Access Passes, removing from groups, disabling accounts, deleting mailboxes.
- "**Specific points**" — the three lifecycle events every employee goes through: **Joiner** (starts working), **Mover** (changes teams/role), **Leaver** (stops working).
- "**Triggered by attributes**" — the workflow watches for changes to user attributes. When `employeeHireDate` becomes today, the joiner workflow fires. When `employeeLeaveDateTime` becomes today, the leaver workflow fires. No manual triggering required.

The goal: **HR updates one system (their HRIS — Workday, BambooHR, SuccessFactors, whatever). Everything downstream happens automatically.**

## Why this actually matters

If your onboarding process is manual, three things are true:

1. **It's slow.** New hires often can't log in on their first day because IT hasn't finished provisioning them.
2. **It's inconsistent.** Different IT people set up different combinations of things. Two hires on the same team end up with different access.
3. **It's insecure.** When people leave, offboarding is incomplete — accounts stay active, group memberships linger, ex-employees can sometimes still access company data.

Number 3 is the one auditors care about. Most compliance frameworks (SOC 2, ISO 27001, NIST) require you to prove that access is removed within X days of termination. If your offboarding is manual, you can't reliably prove it.

**Lifecycle Workflows fixes all three at once.** Automated onboarding is fast. Automated onboarding is consistent. Automated offboarding is complete and auditable.

## Vocabulary you need first

Before we dive into how it works, four terms.

**Lifecycle Workflow.** The thing itself. A named policy in Entra that says "when X happens, do Y things to matching users."

**Trigger.** The event that starts a workflow. Two options: an **attribute-based trigger** (a user's `employeeHireDate` is today) or an **on-demand trigger** (an admin manually runs the workflow on a specific user).

**Tasks.** The actions the workflow performs. Entra ships with about 20 built-in tasks: send email, add to group, remove from all groups, generate TAP, request user access review, disable user account, delete user, and so on. You can also chain in custom Logic Apps or Power Automate flows for things Entra doesn't cover natively.

**Scope.** The set of users the workflow applies to. Not every workflow applies to everyone. You might have a joiner workflow for engineering hires and a different one for sales hires. Scope is defined by a rule against user attributes ("department eq 'Engineering'").

**Workflow execution.** A single "run" of a workflow against a single user. Each execution has a history you can audit — showed each task, whether it succeeded, when it ran.

## The three lifecycles

Every employee goes through the same three life events. Lifecycle Workflows maps to those directly.

### Joiner

The employee is starting soon (or just started). What needs to happen:

- **Before their start date:** create their account, generate a Temporary Access Pass, email the pass to the hiring manager, add them to default groups.
- **On their start date:** send them a welcome email, enable their account, request a manager-approved access review for optional groups.
- **A week after starting:** send a "how are you finding onboarding?" survey.

Trigger: `employeeHireDate` reaches today (or today + N days for pre-start prep).

### Mover

The employee changed teams or roles. What needs to happen:

- Remove them from their old team's groups.
- Add them to their new team's groups.
- Notify their new manager.
- Log the change for auditing.

Trigger: attribute change on `department`, `jobTitle`, or `manager`. Movers is the trickiest of the three because "what to add and remove" depends on both the old and new roles.

### Leaver

The employee is leaving. What needs to happen:

- **Before their last day:** notify their manager, generate a checklist for handover.
- **On their last day:** disable their account, remove them from all groups, revoke all licenses, transfer OneDrive to their manager, set an auto-reply on their mailbox.
- **30 days after leaving:** delete the account entirely.

Trigger: `employeeLeaveDateTime` reaches today (or a specified number of days after).

## How it fits into your existing setup

Lifecycle Workflows work best when combined with two other Entra features you may already have.

**HR-driven inbound provisioning.** Workday, SAP SuccessFactors, and BambooHR (among others) have native connectors that sync employee data *into* Entra. HR creates the employee in Workday → Entra automatically creates the user with `employeeHireDate`, `department`, `manager`, and other attributes populated. Then Lifecycle Workflows triggers on those attributes. This is the fully-automated end state: HR is the single source of truth, everything else follows.

**Entitlement Management (access packages).** Instead of hard-coding group memberships into your joiner workflow, define an "Engineering onboarding" access package that grants the right combination of groups, apps, and SharePoint sites. Your joiner workflow then requests that access package. This decouples the workflow (when to grant access) from the access definition (what access to grant).

If you have neither of those yet, you can still use Lifecycle Workflows — you'll just do more manual attribute setting and more group-based provisioning. It works. It's just less magical.

## What licenses you need

Lifecycle Workflows is part of **Microsoft Entra ID Governance** (formerly Azure AD Premium P2 add-on, now its own SKU as of 2023).

Specifically:
- **Entra ID Governance** license required per user *for users covered by workflows*. This is a per-workflow-user license, not tenant-wide.
- Included as part of **Microsoft 365 E5 Compliance** or standalone.

You don't need to license every user in your tenant — only those you want workflows to run against. In practice most orgs license all their employees (since everyone goes through joiner/leaver) but not their guest accounts.

## What breaks in real deployments

**"My joiner workflow didn't run for a new hire."** Check the attribute: does the user's `employeeHireDate` actually match today's date? If HR set it to a Sunday and the workflow triggers only on weekdays, it won't fire. Also check scope — is the user in the workflow's scope filter?

**"The workflow ran but the 'add to group' task failed."** Look at the workflow execution history. Common cause: the workflow's service principal doesn't have permission to modify the target group. Most tasks require the service principal to be a group owner.

**"The leaver workflow disabled the wrong user."** Almost always a scope filter bug. Test scope changes in a dev tenant first, or use "on-demand" mode initially so you review each execution before it actually runs.

**"Tasks are firing in the wrong order."** Tasks in Entra Lifecycle Workflows run in the order you define them in the workflow, but async tasks (like "generate TAP") can complete out of order. If sequence matters, break it into two workflows connected by an attribute change.

**"HR-driven attributes are showing stale values."** Inbound provisioning from your HRIS runs on a schedule (typically every 40 minutes). Verify the last sync time in Enterprise Applications → your HR connector → Provisioning.

**"The workflow runs indefinitely and never completes."** Rare, but happens when a Logic App task in the workflow times out. Check the Logic App runs history and set explicit timeouts on any custom tasks.

## The FAQ

**Do I have to use HR-driven provisioning to use Lifecycle Workflows?**
No. If you don't have a Workday-style HR system, you can still populate `employeeHireDate` and `employeeLeaveDateTime` manually via PowerShell or bulk import when a hire is confirmed. The workflow works the same way.

**Can I preview what a workflow will do before it runs?**
Yes. Every workflow has a "History → Preview" tab that lists exactly which users the workflow *would* run against right now. Excellent way to sanity-check scope before enabling.

**What's the difference between Lifecycle Workflows and Entitlement Management?**
Lifecycle Workflows is about *timing* — when to add, when to remove, when to notify. Entitlement Management is about *what* — the actual bundles of groups/apps/sites that get granted. You'll typically use them together: workflow says "on hire date, request this access package," and the access package defines what that means.

**Can I disable a workflow temporarily?**
Yes. Each workflow has an Enabled/Disabled toggle. Disabling doesn't affect executions already in progress — those complete on their existing plan.

**How do I audit what the workflows have done?**
Two places: Entra ID → Lifecycle Workflows → Workflow history (per-execution view), or the Entra audit logs (for compliance-grade reporting). Both are queryable in KQL if you've enabled diagnostic settings sending to a Log Analytics workspace.

**What if the HR data is wrong (someone's hire date is set to 1970)?**
The workflow will run based on whatever the data says. Garbage in, garbage out. This is why validation between HR and Entra matters. Most orgs add a Logic App validation step between HR sync and workflow execution that flags impossible values before they trigger anything destructive.

**Do workflows send notifications to end users automatically?**
Only if you include a "send email" task. Workflows are silent by default — they perform actions, they don't announce them. Deliberately, because you might not want the departing employee to know their leaver workflow is running.

## Try it in your lab

You can build a working Lifecycle Workflow in a Microsoft 365 developer tenant (free, at [developer.microsoft.com/microsoft-365/dev-program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)).

Suggested first workflow:

1. Create a test user with `employeeHireDate` set to tomorrow.
2. In Entra ID → Lifecycle Workflows, create a new joiner workflow scoped to that user.
3. Add three tasks: **Generate Temporary Access Pass**, **Add user to selected groups** (pick a test group), **Send welcome email**.
4. Wait until midnight UTC.
5. Check the workflow history the next morning. You should see the workflow ran, the TAP was generated, the user is in the group, and the email was sent.

If any step fails, you'll see exactly why in the execution history. Building this once cements the concept.

## Where to go next

If Lifecycle Workflows is compelling for your organization, the natural progression is:

- **[Access Reviews](/posts/microsoft-entra-access-reviews)** — for periodic verification that people still need the access they have. Pairs beautifully with automated onboarding: onboarding grants access, access reviews confirm it's still needed.
- **[Entitlement Management](/posts/microsoft-entra-entitlement-management-access-packages)** — the "what to grant" layer that Lifecycle Workflows calls into.
- **Inbound provisioning connectors** — connect Workday, SAP SuccessFactors, or BambooHR so HR data flows in automatically.
- **[Privileged Identity Management](/posts/microsoft-entra-pim-roles-operator-playbook)** — for the small subset of roles that need just-in-time elevation rather than standing access.

**Studying for a cert?** Lifecycle Workflows appears in both **SC-300** (Identity and Access Administrator) and **MS-102** (Microsoft 365 Administrator). If you build the sample workflow above, you're already ahead of most exam-takers who only read about it.

Now go grab another coffee. And imagine your Monday-morning inbox with zero "new hire access setup" tickets in it.
