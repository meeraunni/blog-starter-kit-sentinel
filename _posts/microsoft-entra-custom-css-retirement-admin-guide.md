---
title: "Microsoft Entra Custom CSS Retirement: Admin Guide"
excerpt: "Microsoft Entra custom CSS is being retired. Audit affected tenants and locales, remove deprecated layout properties, test sign-ins, and roll back safely."
coverImage: "/assets/blog/cover.jpg"
date: "2026-08-29T09:03:42-04:00"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/cover.jpg"
---

Microsoft Entra custom CSS retirement has started, but it is not one single cutover. Newer tenants cannot use custom CSS, older tenants that had not adopted it lost the ability to start using it after July 21, 2026, selected layout and positioning properties will stop working later, and Microsoft says the custom CSS feature will eventually be retired completely.

The administrator answer is simple: **inventory every default and localized branding configuration now, remove the deprecated properties, move layout decisions into Microsoft's supported branding controls, and test the actual authentication pages before the global block arrives.**

Grab a coffee. This is a sign-in presentation change, not a Conditional Access rollout, but it still deserves identity-change discipline. A CSS rule that no longer applies can move, expose, or hide page elements in ways that confuse users at the exact moment they are deciding whether a sign-in page is trustworthy.

Microsoft's public documentation does **not** currently give a date for the global property block or the final retirement of custom CSS. It promises advance notice and migration guidance. Do not turn an unauthenticated Message Center archive, a roadmap mirror, or a guessed deadline into a production fact. [Microsoft's current CSS reference defines the public timeline and affected scope](https://learn.microsoft.com/en-us/entra/fundamentals/reference-company-branding-css-template).

## Microsoft Entra custom CSS retirement: the confirmed timeline

- **Tenant created after January 5, 2026:** custom CSS is unavailable. Use the supported visual templates and branding fields.
- **Older tenant not already using custom CSS after July 21, 2026:** the tenant cannot begin configuring custom CSS. Do not design a new dependency on it.
- **Older tenant already using custom CSS:** existing use is on the retirement path. Inventory every locale and remove deprecated properties.
- **Layout and positioning property block:** it will happen later, but no public date is stated. Finish migration before enforcement, not after a broken sign-in report.
- **Full custom CSS retirement:** it is planned eventually, with no public date stated. Move the long-term design to first-party branding controls.
- **Microsoft Entra External ID tenant:** it is not affected by this specific retirement. Keep it outside this change unless Microsoft publishes separate guidance.

Microsoft describes this as the first step toward fully retiring custom CSS. The dedicated guide says the affected properties have no supported migration or replacement, while the broader company-branding page documents the supported visual templates, images, colors, header, footer, and sign-in text that remain available. [The company-branding guide confirms the tenant dates, licensing, role, and supported controls](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-customize-branding).

The official Entra announcement frames the restriction as a security change for more predictable branded sign-ins. [Microsoft's Entra Blog marks the custom CSS change as action required](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/microsoft-entra-id-enhances-security-of-branded-sign-ins/4537471).

## What is being retired, and what is not

Company branding is the full configuration object. It can include logos, background imagery and colour, a favicon, header and footer choices, sign-in text, username hints, and custom CSS. Custom CSS is one layer inside that model; losing it does not mean every branded sign-in becomes neutral.

The first property retirement targets rules that can control placement, layering, sizing, visibility, or clipping. The current Microsoft list includes these families:

- positioning and offsets: `position`, `top`, `right`, `bottom`, `left`, `inset`, `z-index`, `offset`, `offset-path`, and `offset-distance`;
- spacing and ordering: `margin` and its block, inline, and side variants, plus `order`;
- transforms: `transform`, vendor-prefixed transforms, `translate`, `scale`, `rotate`, `perspective`, and `zoom`;
- visibility and overflow: `display`, `visibility`, `opacity`, `overflow` and its axis variants, and `content-visibility`;
- clipping and compositing: `clip`, `clip-path`, `mask`, `mask-image`, vendor-prefixed masks, `filter`, `mix-blend-mode`, and `isolation`;
- interaction and grid placement: `pointer-events`, `grid-area`, and the grid row and column variants.

Use Microsoft's live list as the source of truth rather than copying this summary into a permanent control. Microsoft expanded the documented set in August 2026, and it can change again before enforcement.

The same reference still documents selectors such as `.ext-header`, `.ext-header-logo`, `.ext-sign-in-box`, `.ext-title`, `.ext-input.ext-text-box`, `.ext-button.ext-primary`, `.ext-error`, and `.ext-footer`. That does not make every CSS property safe forever. It means administrators should use only the current template and reference while they remove the retired layout techniques.

**Analysis:** treat any surviving CSS as transition code. A compliant stylesheet can reduce immediate disruption, but the announced destination is complete custom CSS retirement. The durable design belongs in Microsoft's first-party branding fields and visual templates.

## The control plane administrators need to inventory

There are two branding scopes to keep straight:

1. **Default branding** is the tenant-wide fallback.
2. **Localized branding** can override the default for a browser language.

That second scope is the easy one to miss. Fixing the default stylesheet while leaving an affected `fr-FR`, `de-DE`, or other localization in place produces a change that looks successful to the administrator and broken to a subset of users.

Microsoft Graph models custom CSS as a stream property on the organizational branding resource and exposes localizations beneath the branding object. The v1.0 resource documentation also confirms that CSS files are limited to `.css` format and 25 KB. [The organizational branding resource documents the object, localizations, and `customCSS` stream](https://learn.microsoft.com/en-us/graph/api/resources/organizationalbranding?view=graph-rest-1.0).

The tenant configuration is separate from authentication policy evaluation. **Analysis:** a malformed or retired CSS rule can change what the page looks like, but it does not change whether Microsoft Entra issues a token, applies MFA, or evaluates Conditional Access. When the page looks wrong *and* the sign-in fails, diagnose those as two evidence streams. Use the [Conditional Access sign-in-log field guide](/posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs) to establish whether access policy actually blocked the request, and the [Conditional Access evaluation pipeline](/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline) when you need the control-plane sequence.

## Inventory default and localized branding before editing

Start with evidence, not the Upload button.

### 1. Download the current default CSS

Sign in to the Microsoft Entra admin center with the required role, browse to **Entra ID > Custom Branding**, select **Edit**, open the **Layout** tab, and under **Custom CSS** select **Download**. Store the unmodified file with the tenant ID, UTC collection time, and change-ticket number.

Then review it against the full deprecated-property list. Search declarations, not only obvious selectors. A stylesheet can place a retired property inside a media query, a state selector, or a compact one-line rule that is easy to miss in visual review.

### 2. Enumerate every localization

The retirement guide directs administrators to use Microsoft Graph Explorer for the complete localization inventory. First send `GET` to the `/organization` endpoint and copy the tenant `id`. Then send `GET` to `/organization/{tenant-id}/branding/localizations`.

Microsoft's v1.0 API describes this operation as returning all localization branding objects, including the default branding. It supports delegated and application permissions; for delegated reads, Global Reader or Organizational Branding Administrator is among the least-privileged supported roles when the required Graph permission is also present. [The list-localizations reference documents the endpoint, scope, and permissions](https://learn.microsoft.com/en-us/graph/api/organizationalbranding-list-localizations?view=graph-rest-1.0).

Follow the retirement guide's supported workflow: export the response and pass it to Microsoft's linked tenant branding inspector. The inspector reports the locales and deprecated properties it finds. Preserve the exported JSON and inspector result with the change evidence.

### 3. Build a remediation register

For each default or localized branding object, record:

- locale ID, including the default object;
- whether custom CSS is configured;
- stylesheet version or file hash;
- every deprecated property found;
- the selector and authentication view where it is used;
- the supported branding field or template that will replace the visual purpose;
- test owner, approver, rollout ring, and rollback file;
- last validated browser, viewport, language, and authentication flow.

Do not call the inventory complete because the default English page looks correct. The unit of work is **tenant + locale + authentication view + viewport**.

## Prerequisites, licensing, and least privilege

Microsoft's current company-branding page requires one of these licenses:

- Microsoft Entra ID P1 or P2;
- Microsoft 365 Business Standard; or
- SharePoint Plan 1.

The minimum portal role for changing company branding is **Organizational Branding Administrator**. The Microsoft Graph v1.0 update operation likewise identifies that role as the least-privileged supported role and requires the **OrganizationalBranding.ReadWrite.All** permission for delegated or application writes. [The Graph update reference documents the write permission and role boundary](https://learn.microsoft.com/en-us/graph/api/organizationalbranding-update?view=graph-rest-1.0).

Separate the jobs where possible. A reader can collect inventory and evidence; the branding administrator performs the approved write. Do not grant Global Administrator merely because the stylesheet belongs to a sign-in page.

Before the change window, also confirm:

- the branding owner and identity operations owner agree on the supported target design;
- all localized CSS files and images are available, not only the default assets;
- the test tenant can represent the production template, locales, and sign-in paths;
- help desk knows the difference between a visual regression and an authentication failure;
- a last-known-good **compliant** stylesheet is ready for each changed locale.

The broader [Microsoft Entra backup and recovery strategy](/posts/microsoft-entra-id-backup-recovery-strategy) is useful context, but do not assume a tenant backup product will reconstruct this change for you. Keep an explicit export and change record for branding.

## A safe migration plan for Microsoft Entra custom CSS

### Ring 0: translate CSS intent into supported controls

For every deprecated declaration, write down the visual purpose before deleting it. Was it centring the sign-in box, hiding a footer element, moving the logo, reordering buttons, or compensating for a background image?

Map that purpose to the supported configuration where one exists:

- use the full-screen or partial-screen visual template for page layout;
- use the header and footer controls instead of CSS placement;
- upload the documented banner, square, header, background, and favicon assets;
- use the sign-in form fields for title, description, username hint, and help text;
- accept Microsoft's default placement where no supported replacement exists.

Microsoft explicitly says the deprecated properties have no supported replacement. A different CSS trick that recreates the same positioning behaviour is not a migration; it is another dependency on a feature scheduled for retirement.

### Ring 1: make the stylesheet compliant in a test tenant

Remove the deprecated declarations from a copy, not the only production file. Upload the candidate to a representative test tenant and keep production untouched.

Test at least:

- the default browser language and every configured localization;
- full-screen and partial-screen layout where the design uses them;
- desktop, narrow mobile, zoomed, and high-contrast views;
- username entry, password, MFA, sign-in options, error, and self-service password reset paths that the tenant uses;
- light and dark presentation where separate assets are configured;
- a slow or blocked-image condition so the background colour and text remain usable.

Do not use a personal Microsoft account as the acceptance test. Microsoft says tenant company branding does not carry over to personal Microsoft accounts.

### Ring 2: pilot one low-risk production change

Choose one localization with a small, known audience, or the default only if localization targeting is unavailable and the change board accepts the tenant-wide blast radius. Upload the approved stylesheet through **Entra ID > Custom Branding > Edit > Layout**, review the complete branding configuration, and save.

Immediately validate both presentation and authentication:

1. confirm the expected logo, text, controls, and focus order;
2. complete an allowed sign-in;
3. produce a controlled failed sign-in and confirm the error remains readable;
4. inspect the sign-in log to prove Conditional Access and authentication behaved as designed;
5. inspect Entra audit logs for the branding change.

Microsoft's audit reference lists `CompanyBranding` and `CompanyBrandingLocale` categories, with create, update, delete, and hard-delete activities for branding themes and localizations. [The audit activity reference documents the traceable branding operations](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities).

### Ring 3: expand locale by locale

Move only after the pilot evidence is clean. Repeat the download, change, upload, sign-in test, and audit-log capture for each localization. Do not bulk-edit every locale in one window unless the tenant has proved its automated comparison and rollback process.

Finish by rerunning the complete Graph localization inventory and Microsoft's inspector. The exit condition is zero deprecated properties across the default and every localized branding object—not a visually acceptable screenshot from one browser.

## Rollback and incident containment

If the branded sign-in regresses after a change:

1. stop changes to the remaining localizations;
2. record the affected locale, browser language, viewport, authentication step, and UTC time;
3. capture the `CompanyBranding` or `CompanyBrandingLocale` audit event;
4. upload the last-known-good **compliant** stylesheet for that locale;
5. retest an allowed and a failed sign-in;
6. use sign-in logs to separate authentication failure from CSS presentation failure;
7. correct the supported branding configuration before resuming the rollout.

Do not roll back to a file containing the retired properties. It may look correct today and fail again when Microsoft blocks those declarations. If no compliant CSS version exists, prefer Microsoft's supported template and branding controls while the team redesigns the experience.

Microsoft does not publish a custom-CSS rollback service-level objective or a public propagation interval. Keep the change window staffed, test repeatedly from controlled sessions, and do not promise instant recovery based on an undocumented cache assumption.

## Troubleshooting the retirement work

**The Custom CSS control is missing.** Check tenant age and previous use. Tenants created after January 5, 2026 do not have the feature, and older tenants that had not adopted custom CSS could no longer start after July 21, 2026.

**The default page is fixed but some users still see a broken layout.** Check their browser language and the corresponding branding localization. A localized object can override the default.

**The inspector reports properties that are not obvious in the portal download.** Confirm that you exported all localizations and review media queries, compact declarations, and locale-specific files. Preserve the inspector output as the authoritative work list for that run.

**The branding looks wrong but the user signs in.** Treat it as a presentation regression. Record the view and locale, then roll back the CSS change without changing Conditional Access.

**The branding looks wrong and access is denied.** Correlate the sign-in attempt by time, user, application, and correlation ID. CSS cannot explain an Entra policy result; the sign-in log can.

**A deprecated property still works.** That is not proof of support. Microsoft's public sequence says the global block occurs later. Remove the property while you control the window.

**A stakeholder asks for the enforcement date.** State the public evidence precisely: Microsoft documents July 21, 2026 as the restriction on starting custom CSS in eligible older tenants, but gives no public date for the global property block or full retirement. Escalate the tenant-specific timing through authenticated Message Center access or Microsoft Support.

## Administrator checklist

- [ ] Record the primary change as custom CSS retirement, not company-branding retirement.
- [ ] Do not publish an unverified Message Center ID or enforcement deadline.
- [ ] Confirm tenant creation date and whether custom CSS was already configured.
- [ ] Exclude Microsoft Entra External ID from this specific change scope.
- [ ] Validate the required license and use Organizational Branding Administrator for writes.
- [ ] Download and preserve the default stylesheet before editing.
- [ ] Enumerate default and localized branding through Microsoft Graph v1.0.
- [ ] Run Microsoft's tenant branding inspector against the complete export.
- [ ] Remove every property on the current deprecated list.
- [ ] Map layout intent to supported templates, images, header, footer, and form fields.
- [ ] Test every locale, authentication view, narrow viewport, zoom level, and accessibility mode in scope.
- [ ] Pilot one controlled production change and capture branding audit events.
- [ ] Keep a last-known-good compliant stylesheet for each changed locale.
- [ ] Re-run the inventory and inspector before closing the change.
- [ ] Track Microsoft Learn, the Entra Blog, authenticated Message Center, and Microsoft Support for the final enforcement timeline.

The important part of Microsoft Entra custom CSS retirement is not finding a clever replacement for `position` or `display`. It is removing tenant sign-in reliability from a presentation layer Microsoft has already said will disappear. Inventory every locale, move the design into supported controls, and make the final enforcement date boring when it arrives.

## References

- [CSS reference guide for customizing company branding](https://learn.microsoft.com/en-us/entra/fundamentals/reference-company-branding-css-template)
- [Configure your company branding](https://learn.microsoft.com/en-us/entra/fundamentals/how-to-customize-branding)
- [Microsoft Entra ID enhances security of branded sign-ins](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/microsoft-entra-id-enhances-security-of-branded-sign-ins/4537471)
- [Organizational branding resource type](https://learn.microsoft.com/en-us/graph/api/resources/organizationalbranding?view=graph-rest-1.0)
- [List organizational branding localizations](https://learn.microsoft.com/en-us/graph/api/organizationalbranding-list-localizations?view=graph-rest-1.0)
- [Update organizational branding](https://learn.microsoft.com/en-us/graph/api/organizationalbranding-update?view=graph-rest-1.0)
- [Microsoft Entra audit log activity reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities)
