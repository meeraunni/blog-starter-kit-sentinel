---
title: "Microsoft 365 Custom Domains and Email Authentication: SPF, DKIM, DMARC Done Right"
excerpt: "An operator's guide to onboarding a custom domain to Microsoft 365 and configuring SPF, DKIM, and DMARC — including the seven anti-patterns that break enterprise mail, a verification command toolkit, and the cutover sequence that prevents delivery incidents."
coverImage: "/assets/blog/custom-domains-dns/cover.svg"
date: "2026-05-13T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/custom-domains-dns/cover.svg"
---

## The promise and the trap

Adding a custom domain to Microsoft 365 looks like a checklist. The portal generates the records, you paste them at your DNS host, click Verify, and you're done. The trap is everything that happens after: the SPF record that quietly fails because a marketing tool was added without updating it, the DKIM rotation that locks out a partner, the DMARC `p=reject` that bounces the executive newsletter the morning after enforcement. Almost every email-authentication incident in a Microsoft 365 tenant is caused by something the original onboarding got *almost* right.

This article is the field version of the onboarding playbook: the records you actually need, the seven anti-patterns that produce 90% of the incidents, a verification command toolkit you can keep open in a terminal during a cutover, and a staged enforcement plan that gets you to `DMARC p=reject` without breaking production. References to Microsoft Learn are inline; this article assumes you've read the basics and want the parts the basics skip.

## What you're actually configuring (in one paragraph)

Email authentication for a Microsoft 365 tenant has three layers stacked on each other. **SPF** publishes which servers are allowed to send mail using your domain in the SMTP envelope. **DKIM** signs outbound mail so receivers can verify it came from you and wasn't tampered with. **DMARC** ties SPF and DKIM to the visible `From:` address and tells receivers what to do when alignment fails. None of the three alone is sufficient. Receivers that matter (Gmail, Outlook.com, Yahoo, every large enterprise) increasingly *require* a DMARC pass for inbox placement, and they reach that conclusion by checking SPF and DKIM alignment with the `From:` domain. The records you publish at your DNS host are what makes that whole chain work. Microsoft's authoritative pages — [SPF](https://learn.microsoft.com/defender-office-365/email-authentication-spf-configure), [DKIM](https://learn.microsoft.com/microsoft-365/security/office-365-security/email-authentication-dkim-configure), [DMARC](https://learn.microsoft.com/defender-office-365/email-authentication-dmarc-configure) — describe each in isolation. Getting them right together is the operator's job.

## The records you'll actually publish for a Microsoft 365 domain

For a standard Microsoft 365 tenant where Exchange Online is the only outbound mail path and you're not using a third-party mail gateway, this is the minimal set:

| Type | Name | Value | Purpose |
|---|---|---|---|
| TXT | `@` (apex) | `MS=ms12345678` (Microsoft generates the value) | One-time tenant ownership proof |
| MX | `@` | `0 contoso-com.mail.protection.outlook.com` | Route inbound mail to EXO |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` | SPF policy |
| CNAME | `selector1._domainkey` | `selector1-contoso-com._domainkey.contoso.onmicrosoft.com` | DKIM selector 1 |
| CNAME | `selector2._domainkey` | `selector2-contoso-com._domainkey.contoso.onmicrosoft.com` | DKIM selector 2 (rotation) |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@contoso.com; ruf=mailto:dmarc-forensic@contoso.com; fo=1` | DMARC policy + reporting |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | Outlook Autodiscover |
| CNAME | `enterpriseregistration` | `enterpriseregistration.windows.net` | Entra device registration |
| CNAME | `enterpriseenrollment` | `enterpriseenrollment.manage.microsoft.com` | Intune enrollment |
| SRV | `_sip._tls` and `_sipfederationtls._tcp` | Legacy Skype/Teams | Only if Skype federation still in scope |

The CNAMEs for `autodiscover`, `enterpriseregistration`, and `enterpriseenrollment` are easy to forget because the M365 admin centre wizard only surfaces some of them depending on which services you've enabled. The full list lives in [External DNS records for Microsoft 365](https://learn.microsoft.com/microsoft-365/enterprise/external-domain-name-system-records).

> [!IMPORTANT]
> Exchange Online's MX target is tenant-specific (`<tenant>-mail.protection.outlook.com` becomes `contoso-com.mail.protection.outlook.com`). Don't copy a target from another tenant's documentation — generate yours from the Microsoft 365 admin centre under Settings → Domains.

## The seven anti-patterns that cause real incidents

After enough rollouts, the same seven mistakes account for most production issues. The remediation for each is the rest of the article.

### Anti-pattern 1: Multiple SPF records on the same domain

SPF is defined in [RFC 7208](https://datatracker.ietf.org/doc/html/rfc7208) and the spec is unambiguous: a domain MUST have at most one SPF record. Two records is an immediate `PermError`. Receivers that hit `PermError` typically treat the message as if SPF failed entirely.

Why this keeps happening: marketing adds Mailchimp, sales adds HubSpot, IT adds Sendgrid, security adds Proofpoint. Each vendor's docs say "add this TXT record." None of the docs say "if you already have an SPF record, edit it instead of adding a new one."

**Detection:**
```bash
dig +short TXT contoso.com | grep -i 'v=spf1'
```
If you see more than one line starting with `v=spf1`, you have the bug.

**Fix:** Consolidate into one SPF record. For a tenant that uses EXO + Mailchimp + Sendgrid:
```
v=spf1 include:spf.protection.outlook.com include:_spf.mailchimp.com include:sendgrid.net -all
```

### Anti-pattern 2: SPF record over the 10 DNS-lookup limit

The same RFC caps SPF processing at 10 DNS lookups during evaluation. Each `include:`, `a`, `mx`, `ptr`, and `exists:` counts. Tenants that have grown to "everyone we ever integrated with" routinely cross the limit and produce `PermError` on every receive — meaning no one passes SPF, regardless of sender.

**Detection:** Use any SPF flattening / lookup-count checker, or count manually. A practical rule of thumb: more than 4-5 `include:` mechanisms is a yellow flag.

**Fix:** Audit which senders are still actually used (most have a couple of zombie integrations). Remove the unused ones. For surviving senders, prefer providers that publish stable IP ranges you can flatten into `ip4:` / `ip6:` mechanisms directly, which don't count against the limit.

> [!WARNING]
> SPF flatteners that auto-generate records by resolving `include:` chains at flatten-time can break silently when an upstream provider changes IPs. If you use one, set up alerting on its drift detection.

### Anti-pattern 3: `~all` (softfail) instead of `-all` (fail)

`~all` says "treat unauthorized senders as suspicious but don't reject." It was the right call in 2010 when DMARC didn't exist. Today, with DMARC providing the override mechanism, `~all` mostly gives spoofers a fighting chance. Modern guidance is to publish `-all` and let DMARC arbitrate alignment.

**Fix:** Once your legitimate senders are confirmed in SPF, tighten to `-all`. Run with `~all` only during the initial inventory phase.

### Anti-pattern 4: DKIM signing not enabled in EXO even though CNAMEs are published

Publishing the two DKIM CNAMEs is a prerequisite for DKIM, but it does **not** enable signing. You have to additionally turn DKIM on for the domain inside Exchange Online. Many onboardings publish the records, see the green check on the domain page, and assume done.

**Detection:**
```powershell
Connect-ExchangeOnline
Get-DkimSigningConfig -Identity contoso.com | Format-List Identity, Enabled, Selector1CNAME, Selector2CNAME, Status
```
If `Enabled` is `False`, you have published CNAMEs but no signed outbound mail.

**Fix:**
```powershell
Set-DkimSigningConfig -Identity contoso.com -Enabled $true
```

### Anti-pattern 5: Custom DKIM not configured for a custom domain, only `onmicrosoft.com`

By default, EXO signs outbound mail with the tenant's `onmicrosoft.com` DKIM identity, not the custom domain. That sounds fine until you check DMARC alignment: the signing domain is `contoso.onmicrosoft.com` but the visible `From:` is `alice@contoso.com`. Alignment fails. DMARC fails. Mail lands in spam.

**Fix:** Publish the two custom-domain CNAMEs and enable DKIM for the custom domain — that's the difference between "DKIM technically signs" and "DKIM signs in a way DMARC accepts."

### Anti-pattern 6: DMARC enforcement before reporting

The recommended progression is `p=none` → `p=quarantine` → `p=reject`. Skipping straight to `p=reject` and waiting to see what breaks is a popular but extremely bad idea: by the time you find out the payroll system was sending from an unauthorized IP, two weeks of payslips have been rejected.

The progression should be driven by **DMARC aggregate reports** (the `rua=` mailbox), parsed for two weeks at each stage, with explicit sign-off before each tightening.

**Aggregate report parsing:** Either build a parser, use a free reporting service such as [Postmark DMARC monitoring](https://dmarc.postmarkapp.com/) or [dmarcian](https://dmarcian.com/), or run an internal tool. The reports are XML; the schema is documented in [RFC 7489](https://datatracker.ietf.org/doc/html/rfc7489).

### Anti-pattern 7: Forwarders that break SPF, ignored

When mail.example.org forwards to your-user@contoso.com, the forwarder's IP is what the next-hop receiver sees as the sending source. That IP is not in *their* SPF record. SPF fails. DKIM survives (because it signs the message body, which forwarders typically don't rewrite), so DMARC can still pass on DKIM alignment — *if* DKIM is configured correctly. This is one of the strongest arguments for getting DKIM right before tightening DMARC.

## A verification toolkit

Keep this in a snippet manager. These commands are what you run during cutover and during incident response.

```bash
# 1. Resolve the tenant ownership TXT
dig +short TXT contoso.com | grep -i '^"MS='

# 2. Resolve the MX
dig +short MX contoso.com

# 3. Resolve and inspect SPF
dig +short TXT contoso.com | grep -i 'v=spf1'

# 4. Verify the two DKIM CNAMEs return the EXO target
dig +short CNAME selector1._domainkey.contoso.com
dig +short CNAME selector2._domainkey.contoso.com

# 5. Resolve DMARC
dig +short TXT _dmarc.contoso.com

# 6. Test SPF end-to-end against a sending IP
nslookup -type=TXT contoso.com 8.8.8.8

# 7. Inspect a received message header to see SPF/DKIM/DMARC results
# (Search "Authentication-Results:" in the header — it's the receiver's verdict)
```

```powershell
# 8. From within EXO PowerShell, confirm DKIM signing state per domain
Get-DkimSigningConfig | Format-Table Identity, Enabled, Status, KeySize, RotateOnDate

# 9. List all accepted domains and their authentication status
Get-AcceptedDomain | Format-Table Name, DomainName, DomainType, AuthenticationType
```

> [!TIP]
> Run commands 1-5 from a network outside your corporate egress (e.g., your phone's mobile data, a cloud VM in another region) to confirm public DNS sees what you think it sees. Internal DNS resolvers sometimes serve different answers via split-horizon.

## A safe cutover sequence

The mistake that produces the worst outages is changing the MX record before mailboxes are ready. The order below is the one that doesn't break things.

1. **Add the domain in Microsoft 365** and publish only the ownership TXT.
2. **Wait for verification to succeed** — Microsoft typically picks up the record within minutes, but allow up to an hour.
3. **Create the user accounts and mailboxes** with the new domain UPN suffix. *Do not* set the new domain as the user's primary SMTP address yet.
4. **Publish SPF in monitoring form first** — `v=spf1 include:spf.protection.outlook.com -all`. Even though you haven't cut over MX, having SPF live before MX prevents a brief gap where EXO accepts inbound but doesn't yet have authorized outbound.
5. **Publish the two DKIM CNAMEs and enable signing** in EXO PowerShell. Confirm with `Get-DkimSigningConfig`.
6. **Publish DMARC at `p=none`** with both `rua=` and `ruf=` reporting addresses. Set up parsing.
7. **Test outbound from a pilot mailbox** to an external receiver that exposes Authentication-Results (Gmail does this in the message headers). Confirm `spf=pass`, `dkim=pass`, `dmarc=pass`.
8. **Now change the MX record** to point at EXO. Lower TTL to 300 (5 minutes) 24 hours before the change so cutover is fast; raise it back to 3600 after.
9. **Set the new domain as the primary SMTP address** on the users.
10. **Watch DMARC reports for 14 days** before tightening to `p=quarantine`. Watch another 14 days before `p=reject`.

> [!NOTE]
> Step 7 is the verification step the wizard skips. If you can't confirm `spf=pass; dkim=pass; dmarc=pass` *before* MX cutover, do not cut over.

## DMARC enforcement: when to tighten

The right tightening criteria, in order:

- **`p=none` → `p=quarantine`:** Aggregate reports show ≥98% of legitimate volume passing alignment for at least 14 consecutive days. All known third-party senders inventoried and either added to SPF or have ARC-signed forwarding.
- **`p=quarantine` → `p=reject`:** Quarantine has been live for ≥14 days. No business-critical mail flows have been quarantined. Forensic reports (`ruf=`) reviewed for any remaining edge cases.
- **`pct=`:** Use the `pct=` tag to roll out enforcement incrementally. `pct=10` enforces on 10% of failing mail; double it weekly. This is rarely needed if the prior steps are followed but is the right escape hatch if you skip them.

```
v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@contoso.com; ruf=mailto:dmarc-forensic@contoso.com; fo=1; aspf=r; adkim=r
```

The `aspf=r` and `adkim=r` tags request *relaxed* alignment (subdomain alignment is acceptable). That is the safer default for organisations with multiple mail-sending subdomains. Use `s` (strict) only when you've explicitly designed for it.

## Common questions

### My SPF record passes the syntax check but mail still lands in spam. What's missing?

Almost certainly DKIM alignment. Run a test message to Gmail and inspect the `Authentication-Results:` header. If you see `dkim=fail` or `dkim=neutral`, you have DKIM CNAMEs but signing isn't enabled for the custom domain — or it's enabled for `contoso.onmicrosoft.com` only. Re-run `Get-DkimSigningConfig` and confirm the custom domain is signed.

### Can I publish multiple DMARC records?

No — same rule as SPF, one record per domain. If you need different policies for subdomains, use the `sp=` tag on the parent or publish a separate `_dmarc.<subdomain>` record.

### Why does my SPF check pass locally but fail at the recipient?

Three common causes: (a) the recipient is checking the envelope `MailFrom` domain, not the `From:` header domain, and they don't match; (b) split-horizon DNS at your egress is resolving differently than the public; (c) the recipient is hitting a different SPF record because of CNAME chaining at your DNS provider. Command 6 in the toolkit above (`nslookup` against `8.8.8.8`) sidesteps split-horizon and is usually the first diagnostic.

### How long does DKIM key rotation take in EXO?

The two-selector model is specifically there to allow rotation without downtime. EXO will rotate to selector 2 on a schedule (default ~90 days), and inbound receivers will validate against whichever selector signed the message. You don't need to coordinate; just don't *delete* the older selector's CNAME until you've waited at least one rotation cycle.

### Do I need DMARC if I already have SPF and DKIM?

Yes, increasingly. Gmail and Yahoo's [2024 bulk-sender requirements](https://support.google.com/mail/answer/81126) require DMARC for any domain sending more than 5,000 messages/day. Microsoft is publishing similar guidance. SPF and DKIM are necessary but no longer sufficient — DMARC is the alignment layer that receivers actually check.

### What happens if I publish `p=reject` and there's a problem?

Mail that fails alignment is bounced at the receiver. You'll see it in your DMARC aggregate reports within 24 hours. Quick mitigation: revert to `p=quarantine` or `p=none`, fix the underlying alignment issue, then re-tighten. This is why staged rollout matters — the diagnostic window is fast but not instant.

## What to take away

The five-minute version of email authentication is that you publish SPF, publish DKIM, publish DMARC, and hope. The operational version is that you (1) inventory every legitimate sender before tightening SPF, (2) verify DKIM is signed for the custom domain in EXO PowerShell (not just that CNAMEs exist in DNS), (3) start DMARC at `p=none` and progress only after aggregate reports prove alignment, and (4) keep the verification toolkit warm during cutover. The anti-patterns are the failure modes; the toolkit is how you catch them. Get the staged progression right and you'll go from "we have a domain" to "we have phishing-resistant outbound mail" without a single bounced executive newsletter.

## References

- [SPF for Microsoft 365 — Microsoft Learn](https://learn.microsoft.com/defender-office-365/email-authentication-spf-configure)
- [DKIM for Microsoft 365 — Microsoft Learn](https://learn.microsoft.com/microsoft-365/security/office-365-security/email-authentication-dkim-configure)
- [DMARC for Microsoft 365 — Microsoft Learn](https://learn.microsoft.com/defender-office-365/email-authentication-dmarc-configure)
- [External DNS records for Microsoft 365 — Microsoft Learn](https://learn.microsoft.com/microsoft-365/enterprise/external-domain-name-system-records)
- [Add a custom domain to Microsoft Entra — Microsoft Learn](https://learn.microsoft.com/azure/active-directory/enterprise-users/domains-manage)
- [RFC 7208 — Sender Policy Framework (SPF)](https://datatracker.ietf.org/doc/html/rfc7208)
- [RFC 6376 — DomainKeys Identified Mail (DKIM)](https://datatracker.ietf.org/doc/html/rfc6376)
- [RFC 7489 — DMARC](https://datatracker.ietf.org/doc/html/rfc7489)
- [Gmail bulk-sender requirements (2024)](https://support.google.com/mail/answer/81126)
