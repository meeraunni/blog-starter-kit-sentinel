---
title: "Six Books That Made Me a Better Identity Engineer"
excerpt: "Blog posts and Microsoft Learn will teach you how to configure a feature. Books are what teach you how the feature actually works, which is what you need when the configuration doesn't behave the way the docs promised. Here are the six books that had the most impact on how I think about identity — from a canonical AD reference to a distributed-systems textbook — and why each of them earned a permanent shelf position."
coverImage: "/assets/blog/books-identity-engineer/diagram.svg"
date: "2026-07-02T10:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/books-identity-engineer/diagram.svg"
---

<aside class="callout callout-note" role="note"><p class="callout-label">Affiliate disclosure</p><div class="callout-body"><p>This post contains affiliate links to Amazon. If you buy a book through one of these links, this site earns a small referral commission at no extra cost to you. The books listed here are the ones I would recommend regardless of the affiliate relationship — they were on my shelf before any commission was possible. See the <a href="/affiliate-disclosure">affiliate disclosure page</a> for the full policy.</p></div></aside>

Every time I sit down with a junior engineer moving into an identity role, we have some version of the same conversation. They ask what to study. I tell them what Microsoft Learn to work through and which certifications map to what they'll actually do at work. And then, if we're on the fifth or sixth conversation, I mention books.

Blog posts, videos, and Microsoft Learn get you productive. Books get you *fluent*. There's a specific quality to the understanding you get from spending twenty hours with someone who thought carefully about a topic and wrote a book about it, versus the piecemeal understanding you build from twenty hours of blog posts. Blog posts (this one included) teach you what to do. Books teach you why the thing works the way it does, which is what you need when Microsoft ships a change that breaks your configuration and the docs haven't caught up.

Here are the six books that had the biggest impact on how I think about Microsoft identity. Not the newest, not the most fashionable, and not always the most on-brand for the day job — but the ones that produced the largest jumps in what I could actually see when I looked at a sign-in log or a directory topology.

## Where books fit in the identity-engineer stack

Before the list, a quick model of what these books are for. If you understand what layer of your brain each one is filling in, it's easier to decide which one you need next.

- **The reference layer.** Books that document a specific technology to a depth Microsoft's own docs never reach — usually because the docs are optimised for "get started" and books are optimised for "understand this properly." The Desmond AD book below is the archetype.
- **The protocol layer.** Books about the standards underneath the products — OAuth 2, OpenID Connect, WebAuthn, Kerberos. Microsoft's implementation choices only make sense once you understand the standards they implement.
- **The systems layer.** Books about the operating systems and distributed systems that identity products run on top of. When Kerberos fails or replication stalls, you're debugging something at this layer even if you're clicking around in the Entra admin centre.
- **The philosophy layer.** Books about the security models identity engineering is nominally serving — zero trust, least privilege, defence in depth. Not tutorials, but framings that shape what you decide to prioritise.
- **The practice layer.** Books about how software gets built, changed, and operated. Identity engineers ship policy the same way software engineers ship code, and the same pathologies apply.

The six books below cover all five layers. If you only read one, my recommendation is at the end.

## 1. Active Directory (5th Edition) — Desmond, Richards, Allen, Lowe-Norris

<a href="https://www.amazon.ca/dp/1449320023?tag=REPLACE_ME" rel="sponsored nofollow noopener" target="_blank">Active Directory, 5th Edition on Amazon.ca</a>

O'Reilly's canonical Active Directory reference. Twenty years old in various editions and still the book every serious AD engineer keeps within arm's reach. The 5th edition is old enough that some of the Windows Server 2012-era chapters feel dated, but the fundamentals — schema, replication, sites and services, group policy internals, forest and domain trust design — have not changed in any way that makes the book obsolete. This is the reference layer. Nothing has replaced it.

**What it will teach you that the Microsoft docs won't.** Why domain functional levels exist and what upgrading actually does under the hood. How replication actually converges (spoiler: it's a specific algorithm involving USNs and UpToDateness vectors, and you can trace a divergence back to first principles once you understand it). How LDAP queries are decomposed and executed against the directory. Group Policy processing order and precedence at a level of detail that will let you predict what will win a conflict without testing it.

**Who should read it.** Anyone who touches on-prem AD in any capacity, including hybrid identity engineers who think they only care about Entra. The Entra Connect team designed sync around AD's replication model; you cannot understand sync anomalies without understanding what AD is doing on its side.

**Skip it if.** You will genuinely never touch on-prem AD. But be honest — most enterprise Microsoft environments still have AD, and being the person on the team who *understands* it is a career-shaping position.

## 2. Modern Authentication with Azure Active Directory for Web Applications — Vittorio Bertocci

<a href="https://www.amazon.ca/dp/0735696942?tag=REPLACE_ME" rel="sponsored nofollow noopener" target="_blank">Modern Authentication with Azure Active Directory on Amazon.ca</a>

Written by the identity architect who spent a decade making OAuth 2 and OpenID Connect actually usable in the Microsoft stack, before he moved to Auth0/Okta. The book predates the "Entra" rebrand and refers throughout to "Azure Active Directory," which is fine because the concepts are unchanged and Bertocci is one of the clearest writers on this topic in the industry.

**What it will teach you.** How the OAuth 2 authorization code flow actually works step by step, why the client credentials flow exists, what the different token types are for, why refresh tokens exist, and how consent works between users and apps. All of this is buried in RFC documents; Bertocci extracts the essential bits and explains them like someone who's had to answer the same confused questions from developers a thousand times.

**Who should read it.** Every identity engineer who ever has to have a conversation with an application team about how to integrate with Entra. That's every identity engineer eventually. Also required reading for anyone who wants to understand app registrations, service principals, and the consent model at a depth that lets you troubleshoot the fifth-most-common issue rather than just the first.

**Skip it if.** You purely work in on-prem AD with no cloud exposure. That role is disappearing.

## 3. OAuth 2 in Action — Justin Richer and Antonio Sanso

<a href="https://www.amazon.ca/dp/161729327X?tag=REPLACE_ME" rel="sponsored nofollow noopener" target="_blank">OAuth 2 in Action on Amazon.ca</a>

Manning's canonical OAuth 2 book, written by an OAuth working group author and a security researcher who's spent years finding real-world OAuth vulnerabilities. Denser than the Bertocci book and vendor-neutral — it covers OAuth 2 as a standard rather than any one vendor's implementation.

**What it will teach you.** The design *rationale* behind each part of the OAuth 2 spec. Why the state parameter exists. Why the implicit flow was deprecated. What PKCE is protecting against and what happens if you skip it. Common OAuth misimplementation patterns and the class of attack each enables. Real code (in JavaScript) showing what an OAuth client and server actually do.

**Who should read it.** Read this after the Bertocci book, not before. Bertocci gives you a mental model rooted in one vendor's implementation. This book generalises that model and shows you what the standard actually says, which is useful when Microsoft's implementation drifts from other vendors' or when you have to debug an integration with a non-Microsoft OAuth server.

**Skip it if.** You only ever integrate with Microsoft-first apps and can accept some gaps in your protocol-level understanding.

## 4. Windows Internals, Part 1 (7th Edition) — Yosifovich, Ionescu, Russinovich, Solomon

<a href="https://www.amazon.ca/dp/0735684189?tag=REPLACE_ME" rel="sponsored nofollow noopener" target="_blank">Windows Internals, Part 1 on Amazon.ca</a>

The systems layer. If you've never sat down with the internals book, the amount of Windows behaviour you thought was magic and turns out to be documentable will surprise you. Part 1 covers processes, threads, security, and the object manager. Security is the chapter to read first — it's a hundred-plus pages on tokens, SIDs, integrity levels, LSA, Kerberos, NTLM, and the authentication subsystem.

**What it will teach you.** What a Windows access token actually is at the byte level. Why Kerberos ticket-granting-ticket versus service-ticket is a real architectural distinction and not just terminology. How the LSA passes credentials to authentication packages. Why NTLM is fundamentally worse than Kerberos and why organisations still can't turn it off. What the difference between primary and impersonation tokens means for the software you're troubleshooting.

**Who should read it.** Anyone who's had to debug a "why is this user getting Access Denied even though they're in the right group" problem more than three times. The answers to those problems live at this layer. Also anyone preparing for AZ-801 or SC-100 who wants to actually understand rather than memorise.

**Skip it if.** You don't touch Windows infrastructure at all. Read it anyway if you're planning to stay in Microsoft identity long-term — this is the book that will still be paying dividends five years from now.

## 5. Zero Trust Networks — Evan Gilman and Doug Barth

<a href="https://www.amazon.ca/dp/149196265X?tag=REPLACE_ME" rel="sponsored nofollow noopener" target="_blank">Zero Trust Networks on Amazon.ca</a>

The philosophy layer. Everyone in security uses the phrase "zero trust." Most of them are wrong about what it means. This book is what most of them should read before saying it again. Written by two engineers at Google Cloud and PagerDuty who actually built zero-trust systems, before Zero Trust became a vendor marketing category.

**What it will teach you.** That zero trust is not "no VPN, use identity instead" and it is not any specific product. It's a set of design principles: assume the network is hostile, authenticate every request, base access decisions on device state and user context rather than location, log everything, and rotate credentials aggressively. It will teach you to look at Conditional Access, Entra Private Access, and defender-for-cloud-apps with a clearer lens on what they're doing at a systems level.

**Who should read it.** Every senior identity engineer. Zero Trust is now written into government mandates, corporate strategy decks, and RFPs; being the one on the team who can talk about it precisely rather than as a buzzword is a persistent advantage.

**Skip it if.** You already spent three months reading NIST SP 800-207 and the papers it references. Otherwise, don't skip it.

## 6. Designing Data-Intensive Applications — Martin Kleppmann

<a href="https://www.amazon.ca/dp/1449373321?tag=REPLACE_ME" rel="sponsored nofollow noopener" target="_blank">Designing Data-Intensive Applications on Amazon.ca</a>

Not an identity book at all. A distributed-systems textbook that happens to be the single best book on how large systems handle data, consistency, replication, partitioning, and failure — which is exactly what identity systems are underneath the surface. Entra ID is a globally-distributed directory. AD replication is distributed consensus with specific compromises. Federation is distributed authorization. All of it becomes clearer once you understand the general theory.

**What it will teach you.** Eventual consistency, quorums, replication topologies, CAP theorem in its actual (not popular-oversimplified) form, log-structured storage, and consensus protocols. All at a level that makes you a better engineer without requiring you to write distributed systems code yourself.

**Who should read it.** Read this last of the six. It's the most demanding — a 600-page textbook — and it pays off hardest once you already have enough concrete identity systems under your belt to have opinions about them. When you finish it you will read Microsoft's papers on Cosmos DB, AD replication, and Entra ID service architecture very differently.

**Skip it if.** You're early in your career and don't have time. Come back to it in year three or four.

## Books deliberately not on this list

**Any Microsoft Press "Exam Ref" book.** They're fine for exam prep. They don't teach you the field. Use them for what they are and don't confuse them for the deeper books above.

**Anything from a vendor whose product it's about.** Books written by the vendor that makes the product are marketing material with a spine. They will not tell you what the product does poorly.

**"Hacking exposed" style books.** Useful for red team roles. Not what an identity engineer needs to prioritise. If you want the defender's view of what attackers do, read *The Hacker Playbook 3* or spend time in the MITRE ATT&CK matrix instead.

**Books more than about ten years old on topics that have changed a lot.** *Applied Cryptography* (Schneier) is still cited, but it's now old enough that beginners get more value from newer, tighter books. Same for pre-Bertocci OAuth books.

## A recommended reading order

If you had to read them in a specific sequence and were doing so around a working identity engineer's schedule (one book every couple of months), I'd order them:

1. **Bertocci** — three weeks, low commitment. Fastest gain in daily usefulness.
2. **Desmond et al. (AD)** — two months, dip in and out as reference. Read the schema and replication chapters cover-to-cover.
3. **Zero Trust Networks** — one month. Shifts your framing before you commit to the deeper technical books.
4. **OAuth 2 in Action** — one month. Now that Bertocci gave you a working mental model, this deepens and generalises it.
5. **Windows Internals, Part 1** — three months, again mostly the security chapter. Return to it during specific troubleshooting.
6. **Designing Data-Intensive Applications** — three to six months. The heaviest and the most rewarding of the six.

## FAQ

**Are older editions of these books good enough?**
Mostly yes. The Desmond AD book's 5th edition is fine even a decade later. The Bertocci book is out of print but even the older editions are worth reading. Windows Internals — get the current edition, the OS has changed too much. DDIA is stable, the first edition is fine. Zero Trust Networks — get the current edition, the field moved.

**What about ebooks vs paper?**
Personal preference. I lean paper for the reference books (Desmond, Windows Internals) because they're better as random-access references, and ebook for the read-through books (DDIA, Zero Trust).

**What about books on specific certifications?**
Skip them unless you specifically need cert prep. Cert books teach you what's on the exam. The books above teach you why the field works the way it does. Different goals.

**Any book on Entra ID Governance specifically?**
Not one I'd recommend yet. The features are moving too fast; the books that exist are outdated by the time they ship. Read Microsoft's whitepapers and the deeper posts from the Microsoft Identity Blog for governance. Come back to that recommendation in a couple of years.

**What about MEMS/Intune, DLP, Purview?**
Different domain than identity. If you cross into device management or data governance, ask separately. The books above are about identity as an engineering discipline.

## If you can only read one

The Bertocci book. Highest daily-usefulness density per hour of reading. If you finish it and want more, work through the ordered list above.

## References and further reading

- [Microsoft Identity Blog](https://techcommunity.microsoft.com/category/identity) — the primary source for what's changing in Entra
- [Internet Engineering Task Force (IETF) OAuth Working Group](https://datatracker.ietf.org/wg/oauth/documents/) — original standards documents
- [FIDO Alliance publications](https://fidoalliance.org/specifications/) — WebAuthn and CTAP standards
- [NIST SP 800-207: Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final) — the reference framework behind most Zero Trust conversations

*Book editions and prices change; the Amazon links above point to the editions I'd recommend as of publication.*
