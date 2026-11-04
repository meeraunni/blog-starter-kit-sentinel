---
title: "Microsoft Entra Custom Block Page: Deployment Guide"
excerpt: "Customize Microsoft Entra Internet Access block pages safely: validate TLS inspection, publish clear support links, test propagation, and troubleshoot failures."
coverImage: "/assets/blog/cover.jpg"
date: "2026-11-04T09:33:19-05:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

A **Microsoft Entra custom block page** replaces the generic body message that users see when Global Secure Access blocks an internet resource. Configure one tenant-wide message under **Global Secure Access > Settings > Session management > Custom Block Page**, add only approved HTTPS links using Microsoft's limited Markdown format, preview it, save it, and then prove the result from a pilot device whose denied traffic is actually TLS inspected.

That is the short answer. The setting changes the explanation, not the enforcement decision. It does not create a web-filtering rule, grant an exception, identify why a policy matched, or guarantee that every denied connection can render an HTML page. Microsoft's current guide says custom pages appear only for TLS-inspected traffic and require web content filtering or threat-intelligence filtering to produce the block. ([custom block-page guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-customize-block-page))

Grab a coffee before publishing a help-desk link to every blocked browser session. The feature is **generally available**, but its current public configuration is one tenant-level body message with limited Markdown links. Microsoft presents Terms of Use, ticketing, and My Access as possible destinations; that does not make every workflow appropriate for every denial. The message should help a user take the next safe step without revealing internal policy logic or turning the page into a universal approval path. ([Microsoft Entra release notes](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---custom-block-pages))

> **Documentation and testing boundary:** this guide is based on Microsoft's public documentation as of November 4, 2026. It does not claim hands-on testing in a Microsoft Entra tenant. Policy names, exception ownership, privacy wording, support workflows, licensing, and blocked destinations remain tenant-specific and need an approved pilot.

## Microsoft Entra custom block page: what it changes

The control sits at the presentation end of a longer data path:

1. The Internet Access traffic-forwarding profile brings the user's request into Global Secure Access.
2. A security profile and Conditional Access assignment deliver the relevant filtering and TLS-inspection policies.
3. Web content filtering or threat intelligence evaluates the request and returns a deny decision.
4. TLS inspection gives the service enough control over the encrypted browser session to present the branded block response.
5. The custom block-page setting replaces the default body with the tenant's configured message and links.

Keep those layers separate. A polished page does not prove the right policy blocked the right destination. A denied transaction does not prove the custom page rendered. A working support link does not approve the requested site.

Microsoft's [TLS-inspection tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection) explains that the service terminates the client-side TLS connection at its security edge, evaluates supported controls, and establishes another TLS connection to the destination. Client devices must trust the certificate chain used by Global Secure Access. That same inspection path enables the friendly custom error response.

The site's [Microsoft Entra Internet Access overview](/posts/microsoft-entra-internet-access-overview) covers the wider Secure Web Gateway architecture. Its [Internet Access content-policy guide](/posts/microsoft-entra-internet-access-content-policy) covers file-transfer decisions. This article is narrower: design, deploy, verify, and troubleshoot the message shown after a supported web request is denied.

## Decide what the block page should accomplish

A useful block page answers four questions without pretending to know more than the service does:

- **What happened?** The organization blocked this request under its internet-access controls.
- **What should the user avoid?** Repeated retries, switching to an unmanaged path, or sending sensitive data through an alternate service.
- **Where can the user learn more?** An approved, broadly accessible policy or Terms of Use page.
- **How can the user request help?** A support or access-request workflow whose team can determine whether an exception is allowed.

Do not make the message diagnose a specific rule unless every supported deny path supplies that exact context. The current setting is tenant-wide, so text such as “This site was blocked because it contains malware” can be false when a different category, URL rule, or threat-intelligence decision produced the page.

> **Analysis:** write for the least-specific truth that applies to every block-page path in the tenant. Put policy-specific explanation in the linked workflow, where destination, user, device, transaction, and business justification can be collected and evaluated.

Also keep a custom page distinct from three nearby controls:

**Policy configuration.** Web content filtering and threat-intelligence filtering decide whether access is allowed. The page does not change their scope, priority, or action.

**Terms of Use enforcement.** A hyperlink to organizational terms is informational. It is not the same as a Microsoft Entra Terms of Use Conditional Access grant control, and clicking it does not record acceptance.

**Exception approval.** A link can open ServiceNow, another ticketing system, or an identity-governance workflow. The linked system owns the approval, identity proof, expiration, and policy change. The block page does not grant access.

## Pass the license, role, policy, and TLS gates

Do not begin with the message editor. Prove that the underlying Internet Access path already works.

### Licensing and role

Microsoft's current Global Secure Access overview says users of Microsoft Entra Internet Access need Microsoft Entra ID P1 or P2 plus the applicable Internet Access entitlement, either standalone or through Microsoft Entra Suite. Confirm the actual tenant product and test-user assignment rather than inferring entitlement from a visible portal blade. ([Global Secure Access licensing](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview))

The custom-page guide requires **Global Secure Access Administrator** or an equivalent role to configure the setting. Use a time-bound least-privilege assignment under the organization's privileged-access process. A Reports Reader or Global Secure Access Log Reader can help validate evidence but is not the role documented for changing the page.

The site's [Global Secure Access licensing guide](/posts/microsoft-entra-global-secure-access-licensing) explains the difference between product entitlement, user assignment, and the traffic profiles that actually acquire traffic.

### Internet traffic acquisition

Use a dedicated pilot user and managed device. Confirm that the Internet Access forwarding profile is enabled and reaches the client before testing the block page. Microsoft's verification procedure explicitly uses a device with the Global Secure Access client and the Internet Access traffic-forwarding profile enabled. ([block-page verification](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-customize-block-page#verify-the-block-page))

If the request bypasses Global Secure Access, no filtering decision or custom page can occur. Record the client version, forwarding-profile state, user, device, destination, UTC test window, and expected policy before the change.

### A real deny policy

The prerequisite is not “a site that the team thinks should be blocked.” Microsoft requires web content filtering and/or threat-intelligence filtering. Choose one approved, low-risk test destination that the current policy already denies for the pilot. Do not add a broad production block merely to test page wording.

For URL-level filtering, Microsoft's tutorial links the filtering policy to a security profile and verifies that the security profile is assigned through Conditional Access. It distinguishes full URL matching from FQDN matching because a path inside HTTPS requires TLS inspection. ([URL-filtering and custom-page tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-url-filtering))

### TLS inspection and client trust

Custom block pages render only for TLS-inspected traffic. Confirm all of these before editing the message:

- a TLS-inspection policy is enabled and linked to the pilot security profile;
- the pilot device trusts the configured Global Secure Access inspection certificate chain;
- Conditional Access assigns the intended security profile to the pilot user;
- the test destination is not in a system or custom TLS bypass;
- the browser path is supported and does not fail first because of certificate pinning or another TLS incompatibility; and
- a non-Microsoft test destination shows the expected inspection certificate.

Microsoft's [TLS inspection FAQ](https://learn.microsoft.com/en-us/entra/global-secure-access/faq-transport-layer-security) documents certificate-pinning failures, custom bypasses, system bypasses, and the content controls that depend on inspection. The site's [managed TLS-inspection certificate guide](/posts/microsoft-entra-managed-tls-inspection-certificate) provides the certificate-lifecycle and rollout context.

## Write a message that is useful and safe

Microsoft currently limits the custom body to **1,024 Unicode UTF-8 characters** and supports links through limited Markdown. It also tells administrators to make published contact information comply with organizational privacy policies. ([message limits](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-customize-block-page#notes-and-limitations))

Use a small message contract before anyone writes copy:

- **Owner:** the team accountable for wording, links, translations, and scheduled review.
- **Audience:** employees, contractors, guests, shared devices, or any combination that can receive the Internet Access profile.
- **Purpose:** explain an organizational block and direct the user to one approved next step.
- **Support destination:** a stable HTTPS landing page or form accessible from the affected network path.
- **Data handling:** what the linked workflow may collect and which identifiers users must not paste into an open text box.
- **Review date:** when policy, legal, privacy, security, and help-desk owners will revalidate the text.

A defensible pattern is:

> Your organization blocked this web request. Do not retry through an unmanaged service. Review the [acceptable-use guidance](https://example.com). If access is required for work, [contact support](https://example.com) and include the time and destination—never your password or authentication code.

Replace the example domains with approved organizational destinations. Test the final Markdown, rendered links, and character count; do not publish the sample as-is.

Avoid these common message failures:

- **Overclaiming:** “Malware detected” when the page can also represent a category or URL block.
- **Dead-end language:** “Contact your administrator” with no route, owner, or business-hours expectation.
- **Sensitive disclosure:** internal rule names, incident details, administrator addresses, tenant identifiers, or security architecture.
- **Unsafe collection:** asking users to paste passwords, MFA codes, tokens, cookies, full browsing history, or confidential page content into a ticket.
- **Circular access:** linking to a support host that the same filtering policy blocks or that requires a browser path unavailable to the affected user.
- **False approval:** implying that submitting a ticket automatically permits the site.
- **Unbounded freshness:** naming a team, phone number, deadline, or policy version without an owner who will maintain it.

> **Analysis:** a stable landing page is usually safer than embedding fast-changing contact details in the tenant setting. It lets support owners update instructions without repeatedly changing the Global Secure Access configuration, while the block page retains a short durable link.

## Configure the Microsoft Entra custom block page

Microsoft's current portal procedure is short:

1. Sign in to the Microsoft Entra admin center with the approved role.
2. Browse to **Global Secure Access > Settings > Session management > Custom Block Page**.
3. Set **Custom body message** to **On**.
4. Enter the approved body. Add links only with the documented limited Markdown shape: `[link text](https://example.com)`.
5. Select **Preview** and inspect the rendered message and every link.
6. Select **Save**.

The setting is tenant-wide. Capture the exact before-state, approved after-state, character count, link targets, change ticket, operator, and save time. Preview proves rendering inside the editor; it does not prove traffic acquisition, policy evaluation, TLS inspection, propagation, or the end-user browser experience.

Microsoft documents beta Graph read and update operations for the custom block-page settings. The write requires `NetworkAccess.ReadWrite.All`; delegated writes also require a supported Entra role such as Global Secure Access Administrator or Security Administrator. Microsoft explicitly warns that beta APIs can change and are not supported for production applications. Prefer the documented portal for the production change unless the organization has consciously accepted and governed that beta dependency. ([read customBlockPage](https://learn.microsoft.com/en-us/graph/api/networkaccess-customblockpage-get?view=graph-rest-beta), [update customBlockPage](https://learn.microsoft.com/en-us/graph/api/networkaccess-customblockpage-update?view=graph-rest-beta))

Do not copy a beta `PATCH` example into production merely because the feature itself is GA. Feature lifecycle and API lifecycle are separate facts.

## Validate the rendered result end to end

Microsoft says changes can take a few minutes to reach active sessions. Use a bounded validation window, retain timestamps, and do not label an old page “just caching” without evidence. ([propagation note](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-customize-block-page#notes-and-limitations))

Run this test matrix from the approved pilot device:

**Blocked HTTPS destination.** The pilot user opens the approved denied destination. Expect the custom page. Retain the screenshot, user, device, time, destination, and rendered text.

**Published links.** The pilot user follows each link. Expect the approved destination to open safely. Record the final hostname, TLS state, authentication boundary, and workflow owner.

**Allowed destination.** The pilot user opens an allowed site. Expect normal access. Retain the allowed traffic transaction and browser result.

**Out-of-scope identity.** A non-pilot user repeats the test. Expect behavior that matches that user's actual Conditional Access and security-profile assignment; do not assume it must match the pilot.

**Bypassed or incompatible destination.** The pilot user opens a destination whose traffic is not TLS inspected. Do not expect the custom page. Retain the TLS action or bypass evidence and document the coverage gap.

**Second supported block path.** The pilot triggers another approved deny path. Expect the same tenant-wide message to remain truthful. Retain the deny evidence, rendered page, and support-workflow outcome.

In **Global Secure Access > Monitor > Traffic logs**, filter to the pilot user, test time, and destination. Microsoft documents `Denied` as the blocked transaction action and provides connection and transaction identifiers for correlation. Traffic logs are currently preview, so describe their lifecycle separately from the GA custom page. ([Global Secure Access traffic logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs))

For the browser result, preserve only what the organization needs: visible text, link labels, destination hostname, timestamp, and whether the page rendered. Redact user identifiers, query strings, ticket tokens, or confidential URLs before attaching evidence to a broad change record.

Also review the administrative trail. Microsoft's Global Secure Access audit-log guide says configuration changes are available through the Global Secure Access and Microsoft Entra audit views, while deployment logs provide status for supported configuration pushes. Do not invent a custom-page operation name if the tenant does not emit one; retain the portal result and end-to-end test alongside the audit evidence that actually exists. ([Global Secure Access audit logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-access-audit-logs), [deployment logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-deployment-logs))

## Troubleshoot the first broken boundary

### The portal saves, but users still see a generic error

First prove the request entered the Internet Access profile and the expected filtering policy returned a deny. Then verify TLS inspection for that exact destination. Check the presented certificate, security-profile assignment, TLS policy, system and custom bypasses, certificate trust, and browser path.

If the connection fails before the service can render an inspected response, editing the message cannot fix it. Treat a certificate warning, reset, native-client error, and formatted block page as different outcomes.

### The old message remains after the change

Record the save time and allow the documented few-minute propagation period. Retest from the same controlled client against the same denied destination, then compare another pilot client. Confirm the portal still shows the intended saved text.

If the result remains old, inspect deployment status and repeat the save only through the documented configuration path. Do not broaden policy scope, clear user data, or disable TLS inspection as a propagation workaround.

### Saving the configuration fails

Microsoft documents a known transient failure and says to reconfigure the custom page and try again. Preserve the failure time and any request or correlation identifier, verify that the operator still has the required role, re-enter the approved text carefully, and retry a bounded number of times. If it persists, stop and escalate with the tenant, time, portal path, screenshot, character count, and identifiers. Do not weaken the message or grant a broader role merely to make Save succeed.

### A Markdown link is visible but not clickable

Confirm the exact limited syntax is `[label](https://example.com)` and that the entire message remains within the documented limit. Remove unsupported HTML and formatting. Preview again, save, wait for propagation, and test the rendered end-user page—not only the editor.

### The support link is also blocked

Prove which policy and destination produced the second denial. Choose an approved support destination that is reachable through the intended managed path, or create a narrowly reviewed allow decision in the filtering policy if the risk owner authorizes it. Do not add a wide wildcard or bypass TLS inspection merely to make the help link work.

### The message is wrong for one policy

The current setting is tenant-wide. Rewrite it so it remains accurate across the tenant's supported web and threat blocks, and move policy-specific context into the support workflow. Do not promise per-policy text that the documented control does not provide.

### The page renders, but the ticket lacks useful evidence

Fix the linked workflow, not the block page's enforcement layer. Ask for the business purpose, destination hostname, approximate time, device context, and whether access worked previously. Use service-side traffic evidence to resolve the transaction. Never ask the user to submit a password, MFA code, token, cookie, or sensitive page content.

## Roll out and roll back without changing enforcement

Use three small rings:

1. **Design review:** identity, network, security, privacy, legal or compliance, help desk, and workflow owners approve the wording and links.
2. **Technical pilot:** a small IT/security group validates an existing deny, TLS inspection, rendering, link reachability, traffic evidence, and the actual support response.
3. **Production acceptance:** representative users confirm that the wording is understandable and the linked team can process the expected requests before the message becomes the tenant standard.

Monitor support-ticket volume, dead-link results, incorrect exception routing, deny transactions without a rendered page, and changes to TLS bypasses. Revalidate after a major filtering, certificate, client, Conditional Access, or support-workflow change.

Rollback should affect presentation only. Preserve the approved before-state, then disable the custom body or restore the prior approved text through the same settings page. Verify the default or restored message from the pilot client while leaving the working filtering, traffic acquisition, and TLS controls intact.

> **Analysis:** if enforcement is correct and only the message is harmful or misleading, changing the filter policy is the wrong rollback. Revert the tenant-wide copy, preserve the denied transaction, and repair the workflow separately.

## Microsoft Entra custom block page checklist

- [ ] Define the primary purpose of the message and its tenant-wide audience.
- [ ] Confirm Microsoft Entra ID P1/P2 and the applicable Internet Access entitlement for pilot users.
- [ ] Use an approved least-privilege Global Secure Access Administrator assignment.
- [ ] Prove the pilot device receives the Internet Access traffic-forwarding profile.
- [ ] Select an existing, approved web-filter or threat-intelligence denial for testing.
- [ ] Prove TLS inspection, certificate trust, security-profile assignment, and no applicable bypass.
- [ ] Keep the message true across every supported block path.
- [ ] Use only limited Markdown and approved HTTPS links.
- [ ] Keep the body within 1,024 Unicode UTF-8 characters.
- [ ] Exclude sensitive internal detail and unsafe data-collection requests.
- [ ] Preview the message and test every link before Save.
- [ ] Record the before-state, after-state, owner, approval, timestamp, and change ticket.
- [ ] Allow a bounded few-minute propagation window and verify from a pilot client.
- [ ] Correlate the browser result with a denied traffic transaction.
- [ ] Test an allowed site, a second block path, and the support workflow.
- [ ] Define a presentation-only rollback and a scheduled content review.

## Frequently asked questions

### Are Microsoft Entra custom block pages generally available?

Yes. Microsoft's current release record lists customized Global Secure Access block pages for Internet Access as generally available. The related Microsoft Graph resource is still documented under `/beta`; do not confuse the GA feature with a production-supported v1.0 automation surface.

### Can each filtering policy have a different custom page?

Microsoft currently documents one tenant-wide custom body message under Global Secure Access session-management settings. Write text that remains accurate across the block paths in scope and use the linked workflow for policy-specific handling.

### Why is TLS inspection required?

The custom page is an HTML response inside an encrypted browser flow. Microsoft says custom pages appear only for TLS-inspected traffic. Without a supported inspection path, the user may receive a different browser or connection error even when a policy denies the request.

### Can I add a ServiceNow or My Access link?

Microsoft's release guidance names IT ticketing, Terms of Use, and My Access as examples and supports hyperlinks through limited Markdown. Confirm that the chosen destination is approved, reachable, privacy-reviewed, and actually owns the requested decision.

### How long does a message change take to appear?

Microsoft says it can take a few minutes to propagate to active sessions. Record the save time, use a bounded test window, and verify the saved state and exact traffic path if the old message persists.

### Does the custom page prove the filtering policy is correct?

No. It proves only that a supported denied, TLS-inspected request rendered the configured response. Validate policy scope, destination, action, security profile, Conditional Access assignment, and traffic logs independently.

### What is the safest rollback?

Restore the last approved message or disable the custom body so the default experience returns, then verify from the pilot. Do not remove a correct filtering policy or TLS control to repair copy, a dead link, or a support-routing mistake.

The operating model is simple: **filtering decides, TLS inspection makes the supported response possible, the tenant setting explains, and the linked workflow handles the next step**. Keep those responsibilities separate and the block page becomes a useful control surface instead of a friendly-looking source of confusion.

## Microsoft sources

- [Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new#general-availability---custom-block-pages)
- [Customize the Global Secure Access block page](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-customize-block-page)
- [Configure URL filtering and custom block pages](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-url-filtering)
- [Enable TLS inspection](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-tls-inspection)
- [TLS inspection FAQ](https://learn.microsoft.com/en-us/entra/global-secure-access/faq-transport-layer-security)
- [Global Secure Access licensing overview](https://learn.microsoft.com/en-us/entra/global-secure-access/overview-what-is-global-secure-access#licensing-overview)
- [Global Secure Access traffic logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs)
- [Global Secure Access audit logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-access-audit-logs)
- [Global Secure Access deployment logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-deployment-logs)
- [Microsoft Graph beta customBlockPage resource](https://learn.microsoft.com/en-us/graph/api/resources/networkaccess-customblockpage?view=graph-rest-beta)
- [Get customBlockPage settings with Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/networkaccess-customblockpage-get?view=graph-rest-beta)
- [Update customBlockPage with Microsoft Graph beta](https://learn.microsoft.com/en-us/graph/api/networkaccess-customblockpage-update?view=graph-rest-beta)
