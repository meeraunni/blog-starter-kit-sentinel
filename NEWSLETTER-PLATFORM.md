# Newsletter platform decision

Written 2026-07-01 to compare newsletter hosting options for Sentinel Identity and pick a path. The site currently collects subscribers into Resend audiences via the form on the homepage; there is no send infrastructure yet. This doc exists so you can decide once and stop re-litigating.

## What the site actually needs from a newsletter platform

Ordered from most to least important, based on where this site is right now (small list, no sponsors yet, one author).

1. **Cheap or free at zero subscribers.** The list is starting from zero. Any monthly fee before revenue exists is a tax on the wrong end of the timeline.
2. **A frictionless subscribe form** that keeps the visitor on `sentinelidentity.ca` rather than redirecting them off-site to complete signup.
3. **Deliverability that reaches corporate Microsoft 365 inboxes.** The audience is largely admins reading from work accounts. If issues land in Quarantine, growth is dead on arrival.
4. **A clean archive at your own domain** (so posts are indexable and countable as content for AdSense, SEO, or future sponsor pitches).
5. **Sponsorship support** — either a native sponsor slot in the editor, or headers/footers you can edit per-issue. Doesn't matter yet, matters at ~2,000 subscribers.
6. **A path to paid subscriptions** if you ever want to turn the newsletter into direct revenue. Not day-one. Nice to know it exists.

Things that are *not* on the list: fancy design, video embeds, AI writing tools, social scheduling. Ignore anything a platform sells you that isn't on the list above.

## Options considered

### Option A — Keep Resend, build the send loop yourself

Resend is already wired up. `resend/audiences` stores subscribers; `resend/emails` can send to them. You'd write a small "send this MDX post as an email" script that renders the post, injects an unsubscribe link, and dispatches to the audience.

- **Cost.** Resend is free up to 3,000 emails/month and 100/day, then $20/month for 50,000. At current list size, effectively free.
- **Deliverability.** Resend runs on AWS SES infrastructure with its own IP pools and DKIM/SPF/DMARC guidance. Deliverability is good if you configure DNS properly, which is already done for `send.sentinelidentity.ca`.
- **Archive.** You own the archive because the archive is just your existing blog posts. No separate archive to maintain.
- **Sponsorship.** Trivial — you edit MDX before sending. Sponsor slot is just a component.
- **Paid subscriptions.** No native support. You'd bolt Stripe on top and gate content behind auth. Non-trivial.
- **Trade-off.** You do the work: signup confirmation email, unsubscribe endpoint, list segmentation, bounce handling, campaign UI. Probably 2–3 days of build time. Ongoing maintenance is low but non-zero.

### Option B — Beehiiv (free tier)

Beehiiv is the current default for indie newsletter operators. It has a free tier up to 2,500 subscribers with unlimited sends, and includes a built-in ad network (`Beehiiv Ads`) plus a recommendations network for cross-newsletter growth.

- **Cost.** Free up to 2,500 subscribers. Paid tiers ($34/mo Launch, $84/mo Scale as of mid-2026) unlock premium subscriptions, custom domain SSL for the archive, and more advanced automations.
- **Deliverability.** Strong; Beehiiv publishes deliverability stats and has one of the better reputations in the indie-newsletter space.
- **Archive.** Hosts a full newsletter archive at `sentinelidentity.beehiiv.com` (or custom subdomain on paid tier). This is *separate* from your blog archive — you'd have two archives, which is a mild SEO negative unless you set canonical URLs carefully.
- **Sponsorship.** Beehiiv Ads means you can start earning small revenue *before* you have direct sponsor relationships. This is the real reason to consider Beehiiv over Substack.
- **Paid subscriptions.** Supported on paid tier. Reasonable path if you ever want to gate content.
- **Trade-off.** You lock your subscriber list into their platform, which affects portability. Their embed forms are okay but not great; you'll want to use their JS embed rather than the styled iframe.

### Option C — Ghost (self-hosted or Ghost Pro)

Ghost is a full CMS *and* newsletter tool. If you were starting the site from scratch, Ghost would be a strong choice — but you're not, and migrating the existing MDX-driven blog to Ghost would be a large undertaking.

- **Cost.** Ghost Pro starts at $9/month (up to 500 members) and scales up. Self-hosted is free plus hosting costs (~$5–10/month).
- **Deliverability.** Ghost routes email through Mailgun (Ghost Pro) or your own provider (self-hosted). Deliverability depends on the underlying transport.
- **Archive.** Excellent, because Ghost is a CMS.
- **Sponsorship.** Manual, no ad network.
- **Paid subscriptions.** Best-in-class. Ghost was built for this.
- **Trade-off.** Migration cost is prohibitive for what you get. Skip unless you decide to move the whole site to Ghost.

### Option D — Substack

Widely known, easy to start, but the wrong shape for this site.

- **Archive is on `substack.com`,** not your domain (custom domain requires a paid plan and is Substack-branded).
- **Substack takes 10% of paid revenue** if you ever monetise, on top of Stripe fees. This adds up.
- **You do not own your relationship with subscribers** in the same way as with Resend/Beehiiv — you're a tenant on Substack's platform.
- **The Substack brand is diluting** in the tech-writing space (associated with a lot of low-quality newsletters).

Not recommended for this site.

## Recommendation

**Do Option A first. Add Option B when the list crosses 500 subscribers.**

The reasoning:

1. **Right now the list is small enough that "no platform" is the right platform.** You already pay for Resend, the DNS is already set up, the archive already lives on `sentinelidentity.ca`. Every dollar you'd send to Beehiiv today buys you nothing you don't already have.
2. **Building the send loop on Resend is a 2–3 day investment** that captures the largest value at the smallest cost: you own the subscribers, you own the archive, you own the sender reputation, you own the sponsor slot markup.
3. **Beehiiv becomes worth considering once cross-newsletter recommendations and Beehiiv Ads matter.** That's a ~500+ subscriber problem, not a today problem. When that day comes, you can either import the Resend audience into Beehiiv (a supported flow) or run both in parallel for a month before cutting over.
4. **You should not adopt Beehiiv now to "save time."** The time you save is one afternoon of scaffolding; the ownership you give up is real.

## What "do Option A" looks like concretely

To make this a real path and not a nice idea:

- Create `src/app/api/newsletter/send/route.ts` (admin-only) that takes a post slug, renders the post's MDX to HTML with your existing components, wraps it in a plain-text email template, and dispatches to the Resend audience.
- Create `src/app/api/newsletter/unsubscribe/route.ts` that flips a subscriber's status in Resend. Every dispatched email includes an unsubscribe URL signed with a HMAC.
- Add a subscribe confirmation email (double opt-in). Not legally required in Canada but strongly recommended for deliverability.
- Add a `newsletter.md` at the root that lists what has been sent, when, and to how many. Ops discipline that will save you the day the archive matters.
- Send the first issue to yourself. Send the second to 10 friends. Then start regular sends.

**Do not build this until you're ready to send the first issue.** Building send infrastructure with nothing to send is procrastination in a technical wrapper.

## When to reconsider

Trigger a re-evaluation of this decision if any of the following happen:

- The subscriber list crosses 500 and you want cross-newsletter growth (→ evaluate Beehiiv seriously).
- A sponsor asks about ad-network placement or metrics you can't produce from Resend (→ Beehiiv or Kit).
- You want to launch paid subscriptions and can't justify building Stripe integration (→ Ghost or Beehiiv).
- Deliverability to `outlook.com`/`office.com` recipients degrades (→ check Resend SES pool assignment; may need dedicated IP).
