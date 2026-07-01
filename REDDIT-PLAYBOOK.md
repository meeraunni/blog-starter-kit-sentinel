# Reddit distribution playbook

Written 2026-07-01 as the primary distribution plan for Sentinel Identity given no LinkedIn presence. Goal: drive enough qualified traffic to the three affiliate posts to hit Amazon Associates' 3-sales-in-180-days requirement, and to build durable Google traffic through referral signals.

Budget: 1–2 hours per week. Every activity in this playbook is designed to fit that budget.

## The rules that make Reddit different from LinkedIn

Reddit's culture treats blog-post links as spam by default. This isn't unfair — it's a rational response to a decade of marketers dumping garbage links into communities. Every activity in this playbook is designed to respect that culture, not fight it.

Two rules that stop you from getting banned:

1. **Answer the question, then cite your post.** Never lead with a link. The order matters. "Here's what I'd do: [three sentences of actual help]. I wrote up the full comparison here if useful: [link]" works. "Check out my post!" does not.
2. **Comment karma before posting.** Most useful subreddits require account age (60+ days) and comment karma (100+) before your submissions clear automod. Spending week 1 building karma is not optional.

## Two-week warm-up (before you promote anything)

Don't touch your affiliate posts on Reddit for the first two weeks. Instead:

### Week 1: Read and comment

Spend 30 minutes per day, three days that week, doing this:

- Open `reddit.com/r/sysadmin`. Sort by "New."
- Find questions where you know the answer. Anything about Entra, Conditional Access, sign-in troubleshooting, Windows Server, DNS.
- Write a helpful comment. 3–5 sentences. Specific advice from your experience. No links yet.
- Do the same in `r/homelab`, `r/msp`, `r/AzureAD`, `r/entra`.

Target: 10–15 comments across the week. Watch your karma climb. Read the sidebar rules of each subreddit and note the "self-promotion allowed on X day only" ones.

### Week 2: Same pattern, higher quality

Same activity, but now be looking for comments where a link to one of your posts would be genuinely useful. **Don't post the link yet.** Just note them mentally.

By end of week 2, you should have 200–400 comment karma and a feel for which subreddits' communities respond well to detailed technical answers.

## The three articles: target subreddits and strategy

### FIDO2 security keys post

**Target subreddits:** r/sysadmin, r/AzureAD, r/entra, r/cybersecurity_help

**Best strategy: answer-comment.** People post variants of "which security key should I buy for our Entra passkey rollout" constantly in r/sysadmin. Search r/sysadmin for `"security key" entra` — filter to the past month. You'll find 2–4 questions where a link to your comparison is the most useful thing you could reply with.

**Comment template:**

> Depends on how many users you're rolling out to and whether they need NFC. Short version: YubiKey 5C NFC is the safe enterprise choice at ~$80/user. Feitian K9 is a solid mid-market alternative at ~$30. If you're doing 500+ users on a budget, look at Token2 T2F2 — they're EU-manufactured with proper attestation support and around $25.
>
> Enforce attestation and key restrictions in the FIDO2 authentication method policy so users can't register unsanctioned keys. Also plan for two keys per privileged user — a lost YubiKey with no backup is an outage.
>
> I wrote up the full comparison including AAGUIDs and deployment operations here if useful: [link]

Adjust to match the specific question. Don't paste this template verbatim across five threads — automod will flag repeat text.

### Home lab post

**Target subreddits:** r/homelab (primary), r/sysadmin, r/AZURE, r/ITCareerQuestions

**Best strategy: direct post to r/homelab on the right day.**

r/homelab is unusually welcoming of well-written build guides *if they're not thinly-disguised affiliate spam*. The affiliate disclosure at the top of your post is what makes this work — you're upfront about it, which the community rewards.

**Post title options** (r/homelab responds to specificity):
- "Minimum-viable Windows Server home lab for AD practice — hardware picks and first 10 exercises"
- "What I'd buy in 2026 for a starter Windows Server / AD lab (~$500)"

**Post body:** short version. 3–4 paragraphs describing your topology (4 VMs, Hyper-V on Windows 11 Pro, Beelink for $500), the price tier logic, and one or two of the "first 10 exercises." End with: "Full writeup with hardware links and the full exercise list here: [link]. Contains affiliate links to Amazon; disclosure at the top of the post."

Being upfront about the affiliate relationship in the Reddit post itself is what stops the community from feeling ambushed.

**Also try r/ITCareerQuestions** — the career-changer audience buys home lab hardware regularly. Answer-comment strategy on posts asking "how do I get into IT."

### Books post

**Target subreddits:** r/sysadmin (Wednesday self-promo, if you have karma), r/ITCareerQuestions, r/cybersecurity, r/AZURE

**Best strategy: answer-comment.** "What should I read to become a better [role]" posts are constant. r/ITCareerQuestions gets one per day.

**Comment template:**

> For identity/Entra specifically, these are the six that made the biggest difference for me:
>
> - Active Directory (Desmond et al., O'Reilly) — canonical reference, still worth reading
> - Modern Authentication with Azure AD (Bertocci) — OAuth/OIDC in Microsoft context
> - OAuth 2 in Action (Richer, Sanso) — deeper protocol understanding
> - Windows Internals Part 1 — the security chapter especially
> - Zero Trust Networks — for the framing
> - Designing Data-Intensive Applications — not identity-specific but changes how you think about directories
>
> Rough order and why I picked each: [link to blog post]

## Sample script for the first "citation post"

Say you find a good question in r/sysadmin, week 3, day 1. Here's how to actually write the reply:

1. **Read the question three times.** Understand exactly what they're asking.
2. **Write the answer first, no link.** 3–5 sentences of specific, useful advice.
3. **Add the link only if it genuinely extends the answer.** "I wrote up the full [topic] here in more detail if useful: [link]." Not "check out my blog!"
4. **Preview the comment before submitting.** Read it as if you were a stranger. Does it sound helpful, or does it sound like a plug?
5. **Submit. Move on.** Don't reply to yourself with more links. Don't edit later to add promotion.

## Weekly rhythm (1–2 hours total)

Suggested split of your 1–2 hours per week:

- **30 min: browse and comment.** Answer 3–5 questions across your target subreddits. No links unless one fits naturally.
- **20 min: search for your topics.** Search r/sysadmin, r/homelab, r/entra for keywords matching your posts. Note any threads where a citation is warranted.
- **10 min: write one link-carrying comment or a direct r/homelab post per week.** Not more.
- **Remaining time (weeks 3+): Microsoft Tech Community.** Same pattern, different site. Answer questions in the Entra ID / Microsoft 365 boards.

## What Amazon actually needs

The 180-day deadline requires 3 qualifying sales. To get 3 sales, rough math:

- Amazon converts affiliate clicks to purchases at ~1–4% on average. Higher-intent traffic (people who searched for a specific product) converts higher.
- To be safe, target 200–300 Amazon clicks in the 180 days. That's ~10–15 clicks per week.
- To get 10–15 Amazon clicks per week, you need roughly 100–200 blog readers per week (Amazon click-through from a technical post runs ~5–10%).
- To get 100–200 readers per week, you need one solid Reddit citation per week that gets ~5–10 upvotes, plus organic Google traffic starting to trickle in.

This is very achievable at 1–2 hours per week. It's not achievable at zero.

## Milestones to watch

At week 4: You have Reddit karma > 500, three citation posts placed, Google Search Console showing impressions on your posts.

At week 8: First Amazon click confirmed in Associates dashboard. Reddit posts starting to rank for niche terms.

At week 12: Multiple posts driving traffic from both Reddit and Google. Amazon dashboard showing 30+ clicks.

At week 20 (halfway to deadline): You either have 1–2 qualifying sales or you don't. If not, revisit strategy — maybe add Bluesky, guest posts, or targeted answers on Stack Overflow / ServerFault.

At week 26 (deadline): 3 sales complete, account persists, and you're now shipping to a compounding audience.

## What NOT to do

- **Don't post the same link across five subreddits in one day.** Automod will flag you as a spammer.
- **Don't reply to your own posts to add more context and links.** Looks like manipulation. Trust the initial post.
- **Don't argue with commenters who accuse you of self-promotion.** Concede politely if a comment challenges you: "Fair — I did write it, added the affiliate disclosure at the top for exactly that reason. Happy to answer questions here in the thread."
- **Don't cross-post to r/entrepreneur or r/blogging.** Wrong audience. Stick to technical subs.
- **Don't buy karma or use bought accounts.** Reddit's detection is good and you will lose everything.

## Backup channels if Reddit doesn't produce enough

If by week 12 you're not seeing enough click-through:

- **Bluesky.** Set up an account, start following Microsoft-focused technical users, share posts there occasionally.
- **Guest posts.** Reach out to other Microsoft-focused blogs (there are several in the Microsoft MVP community) and offer to write a guest post that mentions your original post.
- **Newsletter build.** Accelerate the Resend newsletter plan (see [NEWSLETTER-PLATFORM.md](./NEWSLETTER-PLATFORM.md)) — every subscriber is a channel you own.
- **Stack Overflow / ServerFault answers.** Same citation pattern as Reddit but often overlooked. The FIDO2 attestation and Entra passkey questions are constant on ServerFault.

## Related documents

- [MONETIZATION-PLAN.md](./MONETIZATION-PLAN.md) — overall revenue strategy
- [NEWSLETTER-PLATFORM.md](./NEWSLETTER-PLATFORM.md) — the owned-channel option
- [/consulting](./src/app/consulting/page.tsx) — the primary revenue channel Reddit citations should also point toward when the question fits
- [/affiliate-disclosure](./src/app/affiliate-disclosure/page.tsx) — reference this in Reddit posts to establish good faith
