# Sentinel Identity — Voice Style Guide

A one-page reference for the voice the 11 already-rewritten posts establish. Use it when writing new posts, editing the long tail of older posts, or briefing anyone else who writes for the site.

## The principles, in priority order

### 1. Open with a scene, not a definition

The strongest tell of AI-written technical writing is a post that opens "X is Y" or "X is a feature that…". Open with something that happens. A ticket lands. A user complains. The migration window starts. The on-call gets paged. The reader knows what kind of thing they're reading by the second sentence, and the definition can come three paragraphs later inside its real context.

**Before**
> Microsoft Entra Internet Access is the internet-and-SaaS half of Microsoft's Security Service Edge (SSE) play.

**After**
> The renewal contract is up, the maintenance quote is unreasonable, and somebody noticed that authenticating fifteen thousand users against a single appliance to reach forty internal applications isn't a model anyone would design today.

### 2. Mix sentence length, especially in the first paragraph

Three short sentences in a row is the staccato pattern that gives AI writing away. Real practitioners don't write that way. Aim for a mix: long compound with a parenthetical aside, a short landing sentence, a medium sentence with an em-dash-free aside in commas. Variety matters more than any specific average length.

The cheap rule: in any four consecutive sentences, at least one should be over twenty-five words and at least one should be under ten. Both, ideally.

### 3. First-person practitioner voice

Use "I" and "you" where they fit, without overdoing it. "I run this query weekly" is fine. "In my experience" is fine. "Trust me" is not. The reader should feel like they're talking to someone who has worked the problem rather than reading a documentation page.

**Before**
> Most Conditional Access incidents are policy or signal issues that can be resolved internally.

**After**
> Most CA incidents are policy-shaped, and they're yours to fix.

### 4. Kill the formula closing stack

Three section headings that should never appear in this order: `## Common questions`, `## What to take away`, `## References`. Two reasons. They scream "AI template." And they let the writer off the hook for closing the body well, because there's always a summary heading coming.

Replace with:

- `## Things I get asked` or `## Things people ask` for the FAQ section. Questions go in italics inline; answers are short paragraphs.
- *Delete the takeaway section entirely.* If you can't end the body on a strong sentence, the body needs more work, not a summary heading.
- `## Where to read further` for the references list. Less formal, less templated.

**Before**
> ## Common questions
> 
> ### Why does X happen?
> 
> Because Y.
> 
> ### Does Z work?
> 
> Yes.

**After**
> ## Things people ask
> 
> *Why does X happen?* Because Y.
> 
> *Does Z work?* Yes.

### 5. Em-dashes are a tell. Cut most of them.

The em-dash is the most common AI tic in technical prose, used as a multi-purpose joint between half-clauses. Real writers use commas, parens, or sentence breaks for the same job. Allow yourself one or two em-dashes per post if they earn their keep. Replace the rest.

**Before**
> The fix is — almost always — to grant the permission properly — not via the legacy ACL — and to clear the Outlook cache — which keeps a stale identifier.

**After**
> The fix is almost always to grant the permission properly (not via the legacy ACL) and to clear the Outlook cache, which keeps a stale identifier.

### 6. Drop the overused phrases

A short list of phrases I've used too often and now ban myself from using. They mark AI-flavored copy from a mile away:

- *the operator's view*
- *in one paragraph*
- *the four mistakes* (or any *the N mistakes*)
- *what to take away*
- *in operator terms*
- *the cleanest way to think about it*
- *the honest answer is*
- *almost universally*
- *something worth being explicit about*

If you find yourself reaching for one, say the same thing differently. Often the sentence works better without the throat-clearing phrase at all.

### 7. Less symmetric structure

Rigid "5 failure patterns, each with three subheadings, each with an example" reads like a slide deck someone converted to prose. Real practitioners mix structures inside a single post — a numbered list here, bolded inline labels there, two paragraphs of flowing prose somewhere else. Vary by section. Avoid sub-subsections that all start with the same template (`### N. Title`, `**Sign-in error:** ...`, `**Resolution path:** ...`, repeated).

If you find yourself writing the same six headings under five consecutive H3s, collapse them to prose with bold inline labels:

**Before**
> ### 1. Compliant device required
> 
> **Sign-in error:** AADSTS53000.
> 
> **Resolution path:** Confirm enrolled in Intune.

**After**
> **Device compliance, when the device isn't compliant.** The AADSTS code is usually `AADSTS53000`, occasionally `AADSTS530003` for missing device state. Resolution always starts in Intune — is the device enrolled, is it reporting Compliant, and does the device record Entra sees match the one making the request?

### 8. Callouts stay, but only for callouts

The `> [!NOTE]`, `> [!IMPORTANT]`, `> [!TIP]`, `> [!WARNING]` blocks are useful and worth keeping. But one per post on average, two if there's genuinely something worth flagging. Posts with five callouts in a row read like a documentation page, not a practitioner's notes.

## A two-minute review checklist

Run this against any new post before publishing, or against any old post you're touching up:

- [ ] Does the opening paragraph describe something that happens, or does it define a term?
- [ ] Are there three or more short sentences (under twelve words) in a row anywhere?
- [ ] Count the em-dashes. If more than four in the whole post, replace most of them.
- [ ] Search for the overused phrases above. Replace each instance.
- [ ] Do you have `## What to take away` or `## Common questions` or `## References` headings? If yes, replace per principle 4.
- [ ] Are there more than two callouts? If yes, demote some to plain prose.
- [ ] Read the post out loud. If any paragraph sounds like a textbook, rewrite it.

## What to do when you're editing an existing post

Don't rewrite from scratch unless you're publishing something genuinely new. The mechanical edits below take a long post from "AI tells" to "human enough" in about fifteen minutes:

1. Open the file. Search and replace `## Common questions` → `## Things people ask`. Convert each H3 question into an italic inline lead-in (`### Why does X?` → `*Why does X?*`) and tighten the answer paragraph.
2. Delete the `## What to take away` section entirely. Look at the last paragraph of the body. If it doesn't close the post well, write a better closing paragraph or two; if it does, leave it alone.
3. Rename `## References` to `## Where to read further`.
4. Find and replace all ` — ` with thoughtful alternatives. Most should become `, `, ` (`, or a full sentence break.
5. Scan the opening paragraph for "X is Y" sentences. Rewrite the first one as a scene.
6. Read it once out loud. Fix anything that sounds like a textbook.

That sequence applied to all 22 long-tail posts in this repo would take an editor maybe four to six hours total. It would close the gap with the already-rewritten 11 posts without producing 22 ground-up rewrites.

## Reference list of fully-rewritten posts (use as examples)

The 11 posts already in the new voice, to use as direct references when editing:

- `_posts/microsoft-entra-conditional-access-troubleshooting-sign-in-logs.md` (the voice exemplar)
- `_posts/microsoft-365-shared-mailbox-troubleshooting-outlook.md`
- `_posts/microsoft-entra-and-microsoft-365-custom-domains-dns-records-spf-dkim-dmarc.md`
- `_posts/microsoft-365-mfa-rollout-strategy-conditional-access-authentication-strength.md`
- `_posts/microsoft-entra-passkey-not-showing-up-fixes-security-info-authenticator-fido2.md`
- `_posts/microsoft-entra-token-lifetime-revocation-continuous-access-evaluation.md`
- `_posts/microsoft-entra-conditional-access-browser-support-edge-chrome-safari.md`
- `_posts/microsoft-entra-id-passkey-registration-windows-mobile.md`
- `_posts/microsoft-entra-private-access-vpn-replacement.md`
- `_posts/microsoft-entra-federated-identity-credentials-workload-identity.md`
- `_posts/shared-mailbox-not-showing-up-outlook-microsoft-365.md`

The first three are good before/after pairs in git history. Pull a diff for any of them to see the voice shift on a real article.
