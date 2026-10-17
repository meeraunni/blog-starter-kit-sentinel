---
title: "Microsoft Entra Internet Access Content Policy Guide"
excerpt: "Deploy Microsoft Entra Internet Access content policies safely: block file types, validate TLS inspection, target pilot users, read logs, and roll back cleanly."
coverImage: "/assets/blog/cover.jpg"
date: "2026-10-17T09:22:57-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Blocking a website is blunt. Sometimes the right decision is to let employees use a generative AI tool, personal webmail, or a file-sharing service while stopping particular document types from leaving the organization. That is the job of a **Microsoft Entra Internet Access content policy**.

The short answer is: route the pilot user's internet traffic through Global Secure Access, enable TLS inspection, create a content rule for the intended upload or download activity, file types, and destinations, link the rule's policy to a security profile, and deliver that profile through Conditional Access. Then prove the result in the Global Secure Access traffic logs before broadening scope.

Microsoft lists network content filtering based on file types as **generally available**. The GA control identifies file types from their MIME type and allows or blocks the transfer. The separate **Scan with Purview** path inspects content for sensitivity labels and sensitive information and remains **preview**. Do not merge those lifecycle states, licenses, evidence sources, or failure behaviors in the change record. ([Microsoft Entra releases and announcements](https://learn.microsoft.com/en-us/entra/fundamentals/whats-new), [Global Secure Access and Defender for Cloud Apps coexistence](https://learn.microsoft.com/en-us/entra/global-secure-access/reference-microsoft-defender-cloud-apps-coexistence))

Grab a coffee before creating an “all documents, all destinations” rule. A content policy is one link in a traffic-acquisition and decryption chain. If the traffic never enters Internet Access, TLS inspection bypasses the destination, the security profile is not selected by Conditional Access, or the application hides the file in an unsupported transfer pattern, the rule is not the control you think it is.

## Microsoft Entra Internet Access content policy: choose the right control

Start with the question you need the service to answer.

- **Block or allow a selected file type:** use a basic Global Secure Access content policy with **Allow** or **Block**. File-type filtering is generally available, but it detects the file type rather than the document's business meaning.
- **Block a file only when it contains sensitive content:** use **Scan with Purview** plus a matching Purview DLP policy. This path is preview, requires Purview licensing and policy, and has preview inspection limits and fail-open behavior.
- **Block the whole destination, URL, or web category:** use Global Secure Access web content filtering. This prevents access instead of allowing the site and controlling a transfer.
- **Control files at rest in a sanctioned SaaS service or apply service-specific session actions:** use the relevant Microsoft Defender for Cloud Apps and Purview controls. Those operate at different API and session layers and should not be assumed to cover every internet destination.

The distinction matters during both design and incident response. A blocked PDF does not prove that sensitive text cannot be pasted into a prompt. A Purview DLP match does not prove every ZIP upload is blocked. A blocked domain does not prove a content policy ever evaluated the request.

Microsoft's current [network content filtering guide](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-network-content-filtering) explicitly separates basic MIME-type enforcement from Purview inspection. This guide stays focused on the GA basic file-type control and treats Purview as an optional preview extension.

## Understand the enforcement chain before configuring it

A working rule depends on five control-plane objects and one data path:

1. The **Internet Access traffic forwarding profile** decides whether the client's internet traffic enters Global Secure Access.
2. The **Global Secure Access client** acquires matching traffic from the managed endpoint.
3. The **TLS inspection policy** decrypts supported HTTPS traffic at Microsoft's service edge so the file transfer can be evaluated.
4. The **content policy** matches an activity, content type, and destination, then applies Allow or Block.
5. The **security profile** links the TLS and content policies into one enforceable policy set.
6. The **Conditional Access policy** selects the pilot users and applies that security profile to **All internet resources with Global Secure Access**.

The [TLS inspection architecture](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-transport-layer-security) documents two TLS connections: client to the Global Secure Access service edge, and service edge to the destination. Global Secure Access decrypts the request, evaluates controls such as file scan policies, then re-encrypts allowed traffic. Client devices must trust the certificate chain used to create the service's short-lived leaf certificates.

That design produces a useful troubleshooting rule: diagnose from left to right. Prove traffic acquisition first, TLS inspection second, policy targeting third, and content matching last. Starting by recreating the content rule usually destroys the evidence needed to find the missing layer.

The site's [Microsoft Entra Internet Access overview](/posts/microsoft-entra-internet-access-overview) covers the broader Secure Web Gateway and rollout model. The [managed TLS inspection certificate guide](/posts/microsoft-entra-managed-tls-inspection-certificate) covers the newer certificate option. This article begins after the architecture decision and focuses on safe content-policy enforcement.

## Pass the licensing, role, client, and TLS gates

Do not create a rule until the prerequisites agree.

**Licensing:** basic content filtering requires a valid Microsoft Entra Internet Access license. It does not require a Microsoft Purview license. Scan with Purview requires the applicable Purview license in addition to Internet Access. Microsoft's guide currently names Microsoft 365 E5/A5 or a Purview DLP add-on for the Purview path; recheck the live licensing page before procurement or broad deployment.

**Roles:** use Global Secure Access Administrator for Global Secure Access settings and Conditional Access Administrator for the Conditional Access policy. Microsoft documents at least Reports Reader for reviewing traffic logs from the content-policy workflow. Keep these assignments separate where your change process supports separation of duties.

**Traffic acquisition:** enable the Internet Access forwarding profile and assign only the pilot population. The current content-policy guide describes Windows and macOS clients for this workflow. In the client's Advanced Diagnostics, confirm that Internet Access rules are present in the **Forwarding Profile** view. Microsoft says those rules can take up to 15 minutes to appear after the profile is enabled.

**TLS inspection:** content policies need TLS inspection for encrypted file transfers. Confirm the inspection certificate is active, its root or signing chain is trusted by pilot devices, the TLS inspection policy is linked to the same security profile, and the test destination is not bypassed. Microsoft's [TLS inspection FAQ](https://learn.microsoft.com/en-us/entra/global-secure-access/faq-transport-layer-security) lists content policies as dependent on TLS inspection and documents certificate pinning, system bypasses, and Encrypted Client Hello boundaries.

**Destination evidence:** identify the actual upload and download endpoints, not only the brand's home page. Modern applications commonly send files to separate APIs, storage hostnames, or content-delivery domains. Microsoft's [content-policy tutorial](https://learn.microsoft.com/en-us/entra/global-secure-access/tutorial-internet-access-content-policies) recommends using browser developer tools or network analysis to find the requests that carry file content.

Capture the full preflight in the change record:

- pilot users, devices, operating systems, and client versions;
- Internet Access profile and assignments;
- TLS policy, certificate, bypass rules, and trust distribution;
- proposed security profile and Conditional Access policy;
- upload and download destinations observed for each application;
- allowed and blocked file types;
- representative browser and native-client paths;
- business owner, privacy review, communications, rollback owner, and test window; and
- a clean traffic-log baseline before enforcement.

## Design a narrow policy that answers one question

The safest first policy is boring and specific: **block selected document uploads to one high-risk destination for one pilot group**.

In **Global Secure Access > Secure > Content policies**, create the policy and add one rule. Record:

- a name and description tied to the change ticket;
- an explicit priority and enabled state;
- **Block** as the action;
- **Upload** as the activity;
- a short list of document file types; and
- the exact URLs and FQDNs that carry the target application's uploads.

Microsoft's tutorial uses Word documents and PDFs sent to ChatGPT and Gmail as examples. Treat those endpoints as examples, not a permanent application contract. Re-discover them during your own test because SaaS services can change their request paths.

Avoid three tempting shortcuts.

First, do not block HTML or JSON merely because they appear in the content-type list. Microsoft's current guidance warns that normal pages and APIs use those text types for GET, POST, and PUT operations; a broad block can break ordinary web traffic.

Second, do not use a wildcard as a substitute for application discovery. Wildcards are supported below a real domain, such as `*.contoso.com`, but not for top-level or second-level domains. A wide wildcard can also capture authentication, update, or API traffic unrelated to file transfer.

Third, do not use a web category destination without the required web content filtering policy. Microsoft documents that dependency explicitly. If the intended control is one application's upload endpoint, exact URLs and FQDNs produce clearer evidence and a smaller rollback surface.

## Link the policy and target a pilot with Conditional Access

Creating the content policy does not enforce it by itself.

Open **Global Secure Access > Secure > Security profiles**, select the pilot security profile, and link the existing content policy. Confirm that the same profile contains or is paired with the TLS inspection policy required for HTTPS evaluation.

Then create or update a Conditional Access policy:

1. Include the dedicated pilot group and exclude emergency access accounts according to the tenant's approved Conditional Access standard.
2. Set the target resource to **All internet resources with Global Secure Access**.
3. Under **Session**, select **Use Global Secure Access Security Profile** and choose the pilot profile.
4. Preserve the initial state, assignments, and policy ID in the change record.
5. Allow time for the profile to reach clients before declaring the test failed. Microsoft's TLS inspection tutorial says a security profile can take up to one hour to take effect after Conditional Access assigns it.

Conditional Access here is the delivery and targeting layer for a network security profile. It does not itself parse the PDF or identify the upload endpoint. The site's [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) is useful when the selected user, device, resource, or session context does not match the policy you expected.

## Validate both the block and the allowed paths

One blocked upload is not enough evidence. Run a small test matrix that proves scope, enforcement, and non-impact.

| Test | Expected result | Evidence to retain |
| --- | --- | --- |
| Pilot user uploads a blocked file type to the target endpoint | Blocked | User-visible result plus matching traffic transaction |
| Pilot user uploads an allowed file type to the same endpoint | Allowed, if policy permits it | Successful transfer and traffic record |
| Pilot user uploads the blocked type to an out-of-scope destination | Allowed, unless another control applies | Destination and policy evidence |
| Non-pilot user repeats the target upload | Unchanged behavior | Conditional Access targeting evidence |
| Pilot user downloads a blocked type | Matches the configured activity; an upload-only rule must not be treated as download protection | Traffic log action and direction |
| Pilot user uses each supported browser or application path | Consistent only where the same traffic is acquired and inspectable | Client diagnostics, destination, and TLS status |
| Pilot user sends an unsupported encoded or WebSocket transfer | Might bypass file-type matching | Record as a known coverage gap, not a passed test |

Use synthetic documents with no real customer, employee, financial, or regulated data. The objective is to prove the control, not to create a data-handling incident during validation.

In **Global Secure Access > Monitor > Traffic logs**, correlate the pilot user, destination, timestamp, action, and transaction. The traffic-log experience is currently **preview**, even though basic file-type enforcement is GA. Microsoft models a user visit as a session, a 5-tuple network flow as a connection, and a request/response pair as a transaction. File transfer troubleshooting usually needs the transaction layer. ([Global Secure Access traffic logs](https://learn.microsoft.com/en-us/entra/global-secure-access/how-to-view-traffic-logs))

Also inspect TLS metadata. Microsoft's TLS documentation identifies `TlsAction`, `TlsPolicyId`, `TlsPolicyName`, and `TlsStatus` as evidence that the request was intercepted or bypassed and whether inspection succeeded. A content-policy miss paired with a TLS bypass is not a content-rule defect.

## Know the coverage gaps before enforcement

The current Microsoft documentation names several boundaries that belong in the risk acceptance.

- Network content filtering works only with the **Internet Access** profile.
- File detection covers unencoded request or response bodies and multipart transfers. An application that embeds a file in JSON or breaks it across multiple encrypted requests can prevent inspection.
- WebSocket traffic bypasses file-type filtering, although Microsoft says text-content evaluation can still occur in WebSockets.
- When basic content-filter requests exceed service rate limits, Microsoft says traffic is blocked—**fail closed**.
- TLS inspection can break destinations that use certificate pinning. HTTP/2-only sites also require a bypass because TLS inspection does not currently negotiate HTTP/2.
- System or custom TLS bypasses remove the visibility required for content-policy evaluation.

The Purview preview has different boundaries: Microsoft currently documents a 3 MB maximum, no OCR, inspection only for traffic mapped to an Entra user, and **fail open** when inspection cannot complete or encounters an internal error. The `PurviewStatus` field identifies skipped inspection. Those Purview facts do not describe the GA basic MIME-type rule.

> [!IMPORTANT]
> **Analysis:** a policy can be functioning exactly as designed while leaving a real exfiltration path open. If the application uses WebSockets, encoded JSON, a pinned native client, an out-of-scope device, or an unobserved upload host, the gap belongs in the control design—not in a help-desk note that says “policy intermittent.”

## Troubleshoot from the data path outward

### The rule never fires

Confirm the user and device receive the Internet Access profile. Run client Advanced Diagnostics and verify Internet Access forwarding rules. Confirm the Conditional Access policy selected the intended security profile, the linked content policy is enabled, and the observed endpoint appears in the rule. Then confirm TLS inspection intercepted the request rather than bypassing it.

If the top-level site is visible in logs but the upload is not, inspect the application's network requests for a different file host or API URL. Do not keep adding speculative wildcards to production.

### The rule blocks much more than intended

Review content types, activity direction, destination wildcards, rule priority, security-profile links, and Conditional Access scope. Remove HTML or JSON blocks unless the business case and regression testing explicitly require them. Check whether a web category expanded the destination set and whether its companion web-filtering policy is broader than expected.

### A selected file type still uploads

Inspect the transaction shape. The application might encode the file inside JSON, split it into multiple encrypted requests, use WebSockets, or send it to a hostname outside the rule. Verify the real MIME type rather than trusting the filename extension. Check the TLS action and status for the exact upload request.

If the path is outside the documented inspection model, record it as unsupported and choose a complementary control. Do not claim the file is protected because another browser path was blocked.

### The application breaks after TLS inspection

Look for certificate trust failure, certificate pinning, an HTTP/2-only dependency, unsupported ECH behavior, or a missing backend hostname. Apply the narrowest documented TLS bypass needed to restore the application, then record that bypass as a content-control gap. Do not disable TLS inspection tenant-wide to repair one destination.

### The portal says blocked but the user still completed the action

Correlate the exact transaction ID, URL, time, activity direction, and client path. A modern upload can produce several requests; one blocked request and one successful alternate request can both be true. Capture the successful path and add only its verified endpoint to the pilot policy.

## Roll out, monitor, and roll back without guesswork

Expand only after the test matrix passes and the application owner accepts the known gaps.

- **Ring 0:** identity, network, PKI, security, privacy, and application owners validate architecture and test data.
- **Ring 1:** a small IT/security pilot proves client acquisition, TLS trust, exact destinations, block behavior, and logs.
- **Ring 2:** a representative business group tests browsers, native clients, file types, exception workflows, and help-desk messaging.
- **Ring 3:** broader enforcement proceeds in measured groups with blocked-transaction rate, false positives, TLS failures, and bypass changes reviewed after each expansion.

Export Global Secure Access traffic logs through Microsoft Entra diagnostic settings when the organization needs longer retention or alerting. Microsoft says changes to forwarding profiles, filtering policies, and other Global Secure Access configuration are also captured in Entra audit logs. Preserve both the data-plane evidence and the administrative change evidence. ([Global Secure Access logs and monitoring](https://learn.microsoft.com/en-us/entra/global-secure-access/concept-global-secure-access-logs-monitoring))

> **Analysis:** rollback should remove the narrowest failing link. If the content rule is wrong, disable or unlink that policy for the pilot profile while preserving working traffic acquisition and TLS evidence. If certificate trust is broken, remove the pilot assignment and repair trust before retesting. If the destination is incompatible with inspection, use a narrow documented bypass and acknowledge that the content rule cannot protect that path. Avoid switching off the entire Internet Access profile unless the acquisition layer itself is causing the incident.

## Microsoft Entra Internet Access content policy checklist

- [ ] Define one transfer decision: activity, file type, destination, population, and expected result.
- [ ] Confirm basic file-type filtering is the GA control you intend to use.
- [ ] Treat Scan with Purview as a separate preview dependency and license decision.
- [ ] Assign Global Secure Access and Conditional Access roles through the approved least-privilege process.
- [ ] Enable and verify the Internet Access profile for pilot users and supported clients.
- [ ] Validate the active TLS certificate, client trust, inspection policy, and bypass list.
- [ ] Discover the real upload and download URLs and FQDNs.
- [ ] Avoid broad HTML, JSON, wildcard, and web-category rules in the first pilot.
- [ ] Create the content policy, link it to the security profile, and deliver it through Conditional Access.
- [ ] Test blocked, allowed, out-of-scope, non-pilot, upload, download, and alternate-client paths.
- [ ] Correlate each result with a Global Secure Access traffic transaction and TLS metadata.
- [ ] Document encoded, multipart, WebSocket, pinning, HTTP/2, and bypass boundaries.
- [ ] Export logs and monitor configuration changes where retention requirements demand it.
- [ ] Define the narrow rollback link and owner before expanding scope.

## FAQ

### Are Microsoft Entra Internet Access content policies generally available?

Basic network content filtering that allows or blocks file transfers by file type is generally available. Scan with Purview, which inspects sensitive content and labels, remains preview according to Microsoft's current coexistence documentation.

### Does basic file-type filtering require Microsoft Purview?

No. Microsoft states that a valid Entra Internet Access license is sufficient for basic content filtering. Scan with Purview requires the relevant Purview license and a matching Inline web traffic DLP policy.

### Why is TLS inspection required?

The file transfer is normally inside HTTPS. Global Secure Access must decrypt supported traffic at the service edge to see the request or response content and evaluate the file type. A bypassed or incompatible TLS path cannot provide that visibility.

### Can a content policy stop users from pasting sensitive text into an AI prompt?

Do not assume a GA file-type rule does that. Text inspection and content-aware decisions belong to the separately documented Scan with Purview path and its preview boundaries. Prove the exact text transfer and policy outcome before claiming coverage.

### Why did one upload bypass the rule?

Check whether the application used an unlisted endpoint, JSON encoding, multiple encrypted requests, WebSockets, certificate pinning, or a TLS bypass. The filename alone is not proof that the documented MIME-type inspection path evaluated the transfer.

The useful operating model is simple: **traffic acquisition decides whether Global Secure Access sees the request, TLS inspection decides whether it can read the transfer, the content rule decides what to do, the security profile packages the controls, and Conditional Access decides who receives them**. Prove each layer, keep the GA and preview paths separate, and a content policy becomes a precise control instead of a hopeful checkbox.
