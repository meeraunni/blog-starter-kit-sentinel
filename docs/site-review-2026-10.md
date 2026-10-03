# Site revision — October 2026

## Changes

The homepage follows the visual rhythm of the Microsoft Entra community blog: prominent feature artwork, a two-column illustrated article feed, author/date details, topic navigation, and an adjacent topic index. Microsoft branding and images were not copied. Mobile layouts stack the feature and cards and expose the navigation through a menu.

The homepage article list now appears in server-rendered HTML. URL search is isolated behind Suspense instead of hiding the entire index. Missing article URLs return 404. Canonicals use the site's verified www destination. Default generic cover images no longer interrupt article reading.

Resources now provide a working browser-only investigation-note builder and three editable downloads, replacing the unfinished paid toolkit. Editorial and author copy distinguish documentation, interpretation, AI assistance, and untested examples. No customer incidents, lab results, credentials, or author history were invented.

## Content scope

Eight articles received corrections: Permissions Management retirement, AD FS migration, domain-controller promotion, physical domain controllers, site assignment, AD sites, DNS, and DHCP. Changes include removing retired-product recommendations, automatic failover claims, plaintext password examples, unsupported statistics, and universal timing assumptions. Correction notes and primary sources appear in the articles.

The inventory covers 126 articles. `npm run check:content` checks metadata, local references, dates, and a small set of risky patterns. Its zero-error result is **not** a factual review, originality assessment, or AdSense readiness score. The remaining articles still need substantive source and first-hand-evidence review. Genuine author information and reproducible lab evidence must come from the publisher.

## Validation

- Production build and TypeScript completed; 290 generated routes.
- Content inventory passed structural checks for 126 articles.
- Built HTML contains homepage article titles without JavaScript.
- Fresh production browser session had no hydration errors.
- Missing article route returned HTTP 404.
- Browser checks covered keyword and URL search, empty results, pagination, mobile menu, and investigation-note preview, download and clear.
- Desktop, 390px and 768px layouts were visually inspected.

Changes are local, not deployed. Google controls approval; the supplied rejection screenshot says a new review is unavailable until October 7, 2026. Visual changes do not establish policy compliance.

## Illustration provenance

Generated with the built-in image-generation tool, not the CLI. These images are editorial illustrations, not photographs of a documented installation or endorsed product.

- `public/assets/editorial/passkeys.webp` — 1600 × 900.
- `public/assets/editorial/infrastructure.webp` — 1200 × 675.

Passkeys prompt: Wide editorial technology photograph of a real contemporary IT desk in daylight, graphite laptop corner, matte-black USB-C and brushed-metal security keys on a cobalt desk mat, translucent teal acrylic and an orange notebook accent. Diagonal composition, natural shadows, subtle wear, no text, logos, people, padlocks, floating objects, or sci-fi glow. Illustrative still life, not a product endorsement.

Infrastructure prompt: Landscape editorial close-up of a network patch panel and server rack with orange and turquoise ethernet cables, charcoal metal, realistic green activity lights and tactile connector details. Documentary technology style, shallow depth of field, cool daylight, no text, logos, people, padlocks, impossible hardware or fantasy interfaces. Illustration, not a documented customer installation.

Reference: https://techcommunity.microsoft.com/category/microsoft-entra/blog/microsoft-entra-blog

## Technical visuals follow-up

Article summaries now carry their actual cover asset into the card renderer. The 60 articles with SVG cover diagrams use those technical visuals instead of unrelated decorative artwork. Other cards retain their fallback artwork.

An original SVG browser-handoff diagram was added to the external IdP passkey guide, with descriptive text, a conceptual-diagram label, source attribution, and a full-size link. Microsoft Learn screenshots are embedded from their original URLs in the recommendations guide and two Conditional Access guides. Captions explain what to inspect and identify Microsoft as the source; these are not screenshots from the publisher's tenant. The external URLs require Microsoft availability.

Production build, TypeScript, and content checks passed. Both source screenshots loaded in the local article pages (1200px and 979px source widths), and the SVG was visually inspected. This follow-up does not add screenshots to every article.

## Logo and settings walkthrough follow-up

Replaced the SI badge with an original vector gateway mark in navy, teal, and amber. Updated favicon, touch/app icon assets, pinned-tab mark, and the web manifest (which still carried Next.js branding and incorrect icon paths). Logo source: `public/assets/brand/sentinel-mark.svg`.

The recommendations article now contains four numbered portal steps using Microsoft-published screenshots: Contoso list, recommendation details, impacted resources, and Mark as menu. The CA sign-in guide adds the expanded error-details screenshot before finding the event and reading the policy result. All images are source-attributed; no tenant access, generated interface, or first-hand lab capture is claimed. The screenshot URLs remain hosted by Microsoft. Build and structural checks passed; all four recommendations screenshots loaded and the menu layout was visually checked.
