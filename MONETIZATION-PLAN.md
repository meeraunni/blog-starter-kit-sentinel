# Monetization plan

Written 2026-07-01 after the third AdSense rejection. The plan replaces AdSense (which is not coming back) with a mix that fits the actual audience: Microsoft admins who read one or two posts a week when they hit a real problem.

The AdSense script has been removed from the site as of this branch. This document is the roadmap for what replaces it.

## The revenue mix

Ordered by how soon each channel can produce revenue, not by ultimate size.

| Channel | Time to first dollar | Realistic monthly at maturity | Effort to start | Depends on |
| --- | --- | --- | --- | --- |
| Consulting lead-gen | 1–8 weeks | $2,000–$15,000+ | Low | Consulting page live |
| Affiliate revenue | 4–8 weeks | $50–$400 | Low | Amazon Associates approval + a few product posts |
| Newsletter sponsorships | 3–6 months | $200–$2,000 | Medium | Newsletter running with ~500+ engaged subscribers |
| Direct site sponsorships | 6–12 months | $500–$3,000 | Medium | Traffic profile a sponsor recognises |
| Paid newsletter tier | 9–18 months | $0–$500 | High | An audience that will pay, not just read |

Numbers are ballpark ranges based on published rates from similar single-author technical sites. The consulting number is by far the largest and the fastest — treat it as the primary channel.

## The action checklist

Ordered by dependency. Do them in this order, not in order of interest.

### Week 1 (this branch)

- [x] Remove AdSense script from `src/app/layout.tsx`.
- [x] Ship `/consulting` page.
- [x] Ship `/affiliate-disclosure` page.
- [x] Add Consulting to header nav.
- [x] Add Consulting to footer Site column; Affiliate disclosure to footer Legal column.
- [x] Include both new routes in `src/app/sitemap.ts`.
- [x] Update the `/services` redirect to point at `/consulting` (was `/archive`).
- [ ] After merge: submit updated sitemap to Google Search Console.
- [ ] After merge: confirm both new pages return `200` and are indexable.

### Week 2 — Consulting page copy pass

The consulting page shipped with placeholder-quality specifics (engagement lengths, service names, audience descriptions). Customise the following before you start actively driving traffic to it:

- [ ] Replace the five service descriptions with what you actually want to sell. If the "Advisory retainer" is not something you want to offer, delete it and drop to four services.
- [ ] Add rate ranges or a "Rates start at $X" line if you're comfortable being public about it. Undisclosed rates cost you qualified leads because unqualified prospects don't self-select out.
- [ ] Consider adding two or three anonymised case studies (one paragraph each). Sample structure: "Client type · Problem · What I did · Outcome." Skip if NDAs make this awkward.
- [ ] Confirm `info@sentinelidentity.ca` receives mail and the mailto CTA works from mobile.
- [ ] Add a schema.org `ProfessionalService` JSON-LD block so Google understands the page. (Nice-to-have, not blocker.)

### Weeks 3–4 — Affiliate programs

Set up the affiliate infrastructure so future posts can carry links without ad-hoc scrambling.

- [ ] Apply to Amazon Associates (Canada primary, US and UK secondary). Approval usually takes 24–72 hours and requires 3 qualifying sales within 180 days to stay active — plan the first affiliate posts before applying.
- [ ] Once approved, update `/affiliate-disclosure` with the actual Associates ID.
- [ ] Write two or three posts that naturally include affiliate links — the format that works is a topic-focused post that recommends a product, not a product-focused post that reaches for a topic. Ideas: "Choosing a FIDO2 security key for Microsoft Entra passkey rollout," "Books that made me a better identity engineer," "Home lab hardware for practising Windows Server AD."
- [ ] Add a reusable `<AffiliateLink>` component that renders `<a rel="sponsored noopener" href="...">` so disclosure is enforced at the component level.

Deferred until there's a story to justify each:
- Practice-exam vendors (MeasureUp, ExamCollection alternatives) — only if you write cert-prep content.
- Backup / MSP tooling (Veeam, Datto, Barracuda) — only if you cover those tools genuinely.
- Password manager / MFA vendors (1Password, Yubico direct) — only after Amazon Associates is producing something.

### Weeks 5–8 — Newsletter platform decision and first send

See [NEWSLETTER-PLATFORM.md](./NEWSLETTER-PLATFORM.md) for the full comparison. The short answer: build the send loop on the existing Resend integration; migrate to Beehiiv only if the list crosses 500 and cross-newsletter growth becomes a bottleneck.

- [ ] Build `src/app/api/newsletter/send/route.ts` (admin-only). Takes a post slug, renders MDX to HTML, dispatches to the Resend audience.
- [ ] Build unsubscribe endpoint with HMAC-signed token.
- [ ] Add double opt-in confirmation email.
- [ ] Write and send the first issue. Target 8–12 issues in the first 90 days to establish a cadence.
- [ ] Add a "Read the newsletter" link to the header once the archive has three or more issues.

### Months 3+ — Sponsorship

Sponsorship becomes real when you have either (a) 1,500+ engaged newsletter subscribers, or (b) 20,000+ monthly site sessions. Not before.

- [ ] Add a `sponsors@sentinelidentity.ca` alias.
- [ ] Publish a one-page media kit at `/sponsor` (or as a downloadable PDF): audience description, traffic numbers, sample placements, rates. This can be markdown-rendered by the same MDX pipeline as posts.
- [ ] Define two sponsor slots: newsletter primary sponsor (top of email) and newsletter secondary sponsor (mid-body). Site sponsorship is deferred until traffic justifies it.
- [ ] Rate anchor: mid-market technical newsletters at 2–5k subscribers typically charge $250–$500 per newsletter send. Do not undersell.

### Deferred / not now

Ideas that came up in the monetization conversation but should wait:

- **Paid newsletter tier.** Skip until the free newsletter has 2,000+ subscribers and you have evidence people would pay. Most technical newsletters never earn this out.
- **Courses / cohort-based content.** Different business model, different production effort. Real revenue but real distraction. Table for year two.
- **YouTube.** Different medium, different reader/viewer overlap than you'd expect. Only pursue if you actually enjoy it.
- **Substack cross-post.** Diluting the audience across two archives is a net negative unless you have specific reason.

## What success looks like at each horizon

Rough benchmarks. Real numbers depend on traffic, cadence, and how much of your time you're willing to invest.

- **3 months in:** one paying consulting client from the site, first $50 from affiliate, newsletter at 100–300 subscribers.
- **6 months in:** consulting is producing recurring revenue, affiliate is $100–200/month, newsletter at 500–800 subscribers, first sponsor conversation happening.
- **12 months in:** consulting is the primary line, affiliate is a small line item, newsletter has 1,500+ subscribers and a repeating sponsor.

If at 3 months there's no consulting inbound at all, the consulting page copy is the first thing to revisit — probably needs concrete rate ranges and case studies.

## What we're deliberately not doing

- **Not re-applying to AdSense for the fourth time.** The signal from three rejections is that this site's shape doesn't fit AdSense's model right now. Time spent chasing it is time not spent on channels that will actually pay.
- **Not adding display ads from a lower-tier network** (Ezoic, Mediavine, etc.). Same objection: the audience is Microsoft admins reading from work networks. Display ads on a technical reference are a poor fit and degrade the experience for the audience that is the whole point of the site.
- **Not writing content specifically to rank for affiliate-friendly keywords.** The site's editorial line is technical writing that would be worth publishing regardless of monetization. Affiliate revenue is a byproduct of that, not the driver.

## Related documents

- [NEWSLETTER-PLATFORM.md](./NEWSLETTER-PLATFORM.md) — full comparison of Resend / Beehiiv / Ghost / Substack and the reasoning behind the recommendation.
- [`/consulting`](./src/app/consulting/page.tsx) — the consulting landing page.
- [`/affiliate-disclosure`](./src/app/affiliate-disclosure/page.tsx) — the FTC/CASL-compliant disclosure statement.
- [`/editorial-policy`](./src/app/editorial-policy/page.tsx) — where sponsored / affiliate rules already live for readers.
