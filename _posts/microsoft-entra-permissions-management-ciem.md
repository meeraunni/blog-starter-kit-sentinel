---
title: "Microsoft Entra Permissions Management Is Retired: Review Your Dependencies"
excerpt: "Microsoft retired Entra Permissions Management on October 1, 2025. Use this dependency review to find outdated runbooks, monitoring gaps, and integrations that still assume the product is available."
coverImage: "/assets/blog/cover.jpg"
date: "2026-06-17T13:00:00.000Z"
updated: "2026-10-01"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

> [!IMPORTANT]
> **Correction — October 1, 2026:** The previous version of this article incorrectly described Microsoft Entra Permissions Management as available for a new deployment. Microsoft ended sales on April 1, 2025 and retired the product on October 1, 2025. The onboarding and rollout recommendations have been removed. This page now covers dependency review after retirement.

Microsoft's [Permissions Management API documentation](https://learn.microsoft.com/en-us/graph/api/resources/permissions-management-api-overview?view=graph-rest-beta) carries the retirement notice. An old documentation page or an existing code sample is not evidence that a supported service is still available. Do not start a new deployment from the earlier version of this guide.

## Start with the work that depended on the product

The useful question is not just which product to buy next. It is which decisions your team expected the old service to support, and whether those decisions still have a reliable source of evidence.

Use the following table as a review worksheet. The entries are investigation prompts, not claims about your environment.

| Dependency to inspect | Evidence to collect | Decision to record |
| --- | --- | --- |
| Scheduled permission reports | Report owner, last successful run, intended audience | Who will provide the next report and from which data? |
| Automation and scripts | Repository reference, scheduler, expected output, last result | Replace, disable, or retain for historical use? |
| Cloud connector identities | Identity owner, purpose, granted roles, other consumers | Which permissions are still required by an active workload? |
| Security runbooks | Any step that opens the retired product or calls its APIs | What supported procedure replaces that step? |
| Audit evidence | Retained exports, dates, storage location, retention requirement | What is historical evidence versus current coverage? |

Assign one owner to each row. A green job status is not enough if the output is empty, stale, or no longer reaches the people who use it. Confirm the date and meaning of the last useful result.

## Review access without removing shared dependencies

An identity created for an old connector may have acquired other uses. Before removing its permissions, identify its owner and consumers, record the existing configuration, and agree on a rollback path. Treat an unexplained permission as a question to investigate, not as permission to delete it.

Work one dependency at a time. For example, replace an obsolete scheduled report, confirm that its audience can use the replacement, and only then consider retiring the associated job. Handle access cleanup as a separate approved change if its blast radius differs from the report change.

The [identity change record](/resources/identity-change-record.md) provides space for the owner, original configuration, expected result, rollback trigger, and acceptance evidence.

## Define replacement requirements before comparing tools

Write down what must be covered: the cloud accounts in scope, identity types, required observations, export needs, and the people who will act on findings. Then test candidates against those requirements using a representative, authorised environment.

A useful evaluation includes a case the team already understands. Can the proposed process explain the existing grant, show the evidence supporting a recommendation, and preserve an exception for an infrequent but necessary operation? Record both successful and unsuccessful cases. Avoid selecting a replacement solely because its dashboard resembles the retired product.

This article does not recommend a specific vendor or claim feature parity with Permissions Management. Product availability and capabilities need separate verification at the time of evaluation.

## Close the gap explicitly

A dependency is resolved when its owner can point to a working replacement, an approved retirement decision, or a documented temporary gap with a due date. Keep the evidence alongside that decision. Do not describe historical exports as continuous monitoring.

If an earlier version of this article informed a rollout plan, revisit that plan using the retirement notice above. Report other outdated guidance through the [contact page](/contact).
