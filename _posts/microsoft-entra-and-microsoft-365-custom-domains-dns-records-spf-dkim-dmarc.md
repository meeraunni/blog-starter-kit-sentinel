---
title: "Custom Domains and DNS for Microsoft 365"
excerpt: "A detailed technical guide to buying a domain, understanding DNS, adding a custom domain to Microsoft Entra and Microsoft 365, and configuring DNS records such as MX, TXT, CNAME, SPF, DKIM, and DMARC."
coverImage: "/assets/blog/custom-domains-dns/cover.svg"
date: "2026-03-29T10:30:00.000Z"
author:
  name: "Sentinel Identity"
ogImage:
  url: "/assets/blog/custom-domains-dns/cover.svg"
---

## Overview

Adding a domain to Microsoft Entra or Microsoft 365 looks simple in the admin portal, but the real work is happening in the domain and DNS layers underneath it. If those layers are misunderstood, the portal wizard starts to feel random: Microsoft asks you to add a TXT record, then later an MX record, then CNAME records for DKIM, and sometimes SRV or Autodiscover records, and it is not obvious why any of those records matter.

This article explains the full chain from basic domain ownership to advanced DNS-based mail authentication:

1. what a domain is and how you get one
2. what DNS is and how DNS hosting works
3. the common record types and what they do
4. how Microsoft Entra verifies a custom domain
5. how Microsoft 365 uses DNS to route mail and client traffic
6. what SPF, DKIM, and DMARC actually do in the backend

The main Microsoft references used here are [Add and verify custom domain names - Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/enterprise-users/domains-manage), [Add your custom domain name to your tenant](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/add-custom-domain?context=azure%2Factive-directory%2Fusers-groups-roles%2Fcontext%2Fugr-context), [Connect your domain by adding DNS records](https://learn.microsoft.com/en-us/microsoft-365/admin/get-help-with-domains/create-dns-records-at-any-dns-hosting-provider?view=o365-worldwide), [External DNS records for Microsoft 365](https://learn.microsoft.com/en-us/microsoft-365/enterprise/external-domain-name-system-records?view=o365-worldwide), [DNS Concepts](https://learn.microsoft.com/en-us/windows/win32/dns/dns-concepts), [Set up SPF to identify valid email sources for your custom cloud domains](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-spf-configure), [Set up DKIM to sign mail from your cloud domain](https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/email-authentication-dkim-configure?view=o365-worldwide), and [Set up DMARC to validate the From address domain for cloud senders](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dmarc-configure).

![Custom domains and DNS in Microsoft 365](/assets/blog/custom-domains-dns/cover.svg)

## Start with the basics: what is a domain?

A domain name is the human-readable namespace you own on the internet, such as `contoso.com` or `sentinelidentity.ca`. It is not the same thing as a website, a DNS record, or a Microsoft tenant. It is the namespace under which those things can later exist.

When you buy a domain, you are not buying a physical server and you are not buying Microsoft 365 mail by default. You are registering the right to control that name through a domain registrar. Microsoft calls this out in [Add your custom domain name to your tenant](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/add-custom-domain?context=azure%2Factive-directory%2Fusers-groups-roles%2Fcontext%2Fugr-context): before you add a custom domain to Microsoft Entra, you first obtain it from a domain registrar.

In practice, the process looks like this:

1. you choose a domain name
2. you register it through a registrar such as GoDaddy, Namecheap, Cloudflare Registrar, Tucows, or another provider
3. that registrar records your ownership and usually gives you access to DNS management

Once you own the domain, you can use it for:

1. user principal names such as `alice@contoso.com`
2. email addresses such as `info@contoso.com`
3. websites such as `www.contoso.com`
4. application names such as `vpn.contoso.com` or `autodiscover.contoso.com`

The key point is that the domain is the namespace. DNS is the mechanism that tells the internet what services exist inside that namespace.

## What DNS is

**DNS** stands for **Domain Name System**. As Microsoft explains in [DNS Concepts](https://learn.microsoft.com/en-us/windows/win32/dns/dns-concepts), DNS is the distributed naming system that maps human-readable names to technical data such as IP addresses, mail destinations, and service locations.

From a very basic perspective, DNS is the directory that answers questions like:

1. what IP address belongs to `www.contoso.com`?
2. which mail servers receive email for `contoso.com`?
3. what TXT records prove I own `contoso.com`?
4. where are the public DKIM keys for `selector1._domainkey.contoso.com`?

Without DNS, users and systems would need to know raw technical addresses for everything. DNS is what makes a domain name usable.

## Registrar, DNS host, zone, and nameservers

These terms are often mixed together, but they are not the same thing.

The **registrar** is the company through which you registered the domain. It manages the registration and renewal of the name.

The **DNS host** is the provider actually serving the DNS zone for the domain. Often the registrar and DNS host are the same company, but they do not have to be. You can buy a domain at one provider and host DNS elsewhere.

The **DNS zone** is the collection of records for that domain.

The **nameservers** are the DNS servers the internet is told to query for that zone.

A common real-world pattern looks like this:

1. the domain is purchased at Namecheap
2. the nameservers are changed to Cloudflare
3. the DNS records are then managed in Cloudflare

In that case, Namecheap is still the registrar, but Cloudflare is the active DNS host.

## What a DNS record actually is

A DNS record is a typed entry in the DNS zone. Each record type answers a different question.

The most common record types you will see in Microsoft Entra and Microsoft 365 work are:

1. **A** record: maps a name to an IPv4 address
2. **AAAA** record: maps a name to an IPv6 address
3. **CNAME** record: makes one name an alias of another name
4. **MX** record: says where mail for the domain should be delivered
5. **TXT** record: stores free-form text data used for verification and policy
6. **SRV** record: advertises service locations for some protocols
7. **NS** record: identifies the nameservers for the zone

For Microsoft 365 onboarding, the most important record types are usually TXT, MX, CNAME, and sometimes SRV.

## TTL and propagation

**TTL** stands for **Time To Live**. It tells DNS resolvers how long they can cache a record before they should ask again.

This is why DNS changes are not always visible immediately. When you change a record, some resolvers may still be using a cached answer until the TTL expires. That is usually what people mean when they say "DNS propagation," even though the zone change itself is often immediate at the authoritative provider.

Operationally, this matters during domain onboarding because:

1. you add a verification TXT record
2. Microsoft checks for it
3. some DNS resolvers may not see it yet due to caching

The same applies when changing MX records during a mail migration. TTL determines how long older resolvers may continue to send mail using the previous answer.

## The common record types explained

### A and AAAA records

These records map hostnames to IP addresses. If `www.contoso.com` points to a web server, the web browser ultimately reaches it because DNS returned an address from an A or AAAA record.

Example:

1. user browses to `portal.contoso.com`
2. resolver asks DNS for the A or AAAA record
3. DNS returns the IP address
4. browser connects to that IP

These are important for websites, VPN portals, on-prem services published externally, and any service directly reached by IP.

### CNAME records

A **canonical name (CNAME)** record makes one DNS name an alias of another. Instead of pointing directly to an IP, it points to another hostname.

This is heavily used in Microsoft 365 because many Microsoft-owned endpoints are better represented as aliases to Microsoft-managed hostnames.

Example:

1. `autodiscover.contoso.com` is created as a CNAME
2. it points to the Microsoft-managed autodiscover hostname
3. the mail client asks for `autodiscover.contoso.com`
4. DNS returns the alias target
5. the client continues resolution against the target name

DKIM in Microsoft 365 also relies on CNAME records, which is why understanding aliases is essential.

### MX records

**MX** stands for **Mail Exchanger**. This record tells other mail systems where to deliver email for a domain.

Example:

1. someone sends mail to `user@contoso.com`
2. the sending mail server queries DNS for MX records of `contoso.com`
3. DNS returns the target mail server name and priority
4. the sending server connects to that mail destination

If your MX record still points to the old provider, mail will continue going there even if Microsoft 365 accounts and mailboxes already exist.

### TXT records

TXT records are widely used because they can carry arbitrary text values. In Microsoft and email scenarios, TXT records are used for:

1. domain ownership verification
2. SPF policies
3. DMARC policies
4. various vendor-specific validation workflows

TXT records often look unimportant because they are just strings, but many critical security and verification workflows depend on them.

### SRV records

**SRV** stands for **service locator**. SRV records advertise where a specific service can be found.

They are less central than MX, TXT, and CNAME in typical Microsoft 365 mail onboarding, but they appear in some client discovery and legacy service scenarios.

## Adding a custom domain to Microsoft Entra

Microsoft Entra tenants begin with a Microsoft-owned domain such as `contoso.onmicrosoft.com`. As Microsoft explains in [Add your custom domain name to your tenant](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/add-custom-domain?context=azure%2Factive-directory%2Fusers-groups-roles%2Fcontext%2Fugr-context) and [Managing custom domain names in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/enterprise-users/domains-manage), you add your own domain so users and resources can use familiar names such as `user@contoso.com`.

### What Microsoft Entra is trying to prove

Before Microsoft Entra accepts your custom domain, it must verify that you control the namespace. Otherwise, anyone could claim someone else's domain in their tenant.

That is why Microsoft asks for a **TXT** or sometimes **MX** verification record. The platform is not using DNS for branding here. It is using DNS as proof of domain ownership.

### What happens in the backend

The admin adds the custom domain in Microsoft Entra. Microsoft Entra generates a DNS verification value. The admin adds that TXT record at the DNS host for the domain. Microsoft then queries public DNS to confirm the record exists with the expected value. If the record is present, Microsoft Entra marks the domain as verified and allows it to be used for user names and other supported resources.

Microsoft documents in [Managing custom domain names in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/enterprise-users/domains-manage) that once a root domain is verified, subdomains can often be handled differently depending on context, and that domains can later be made primary if needed.

### Example

If you add `contoso.com` to Entra, Microsoft might ask you to create a TXT record similar to:

```txt
Host: @
Value: MS=ms12345678
```

Microsoft then checks public DNS. If it sees the exact TXT value, it concludes that you control DNS for `contoso.com` and therefore control the domain.

## Adding a custom domain to Microsoft 365

Adding the domain to Microsoft 365 builds on the same idea, but now the goal is broader. Microsoft 365 needs not only to verify ownership, but also to know which Microsoft services should receive mail, client discovery, and other traffic for that domain.

Microsoft documents this in [Connect your domain by adding DNS records](https://learn.microsoft.com/en-us/microsoft-365/admin/get-help-with-domains/create-dns-records-at-any-dns-hosting-provider?view=o365-worldwide) and [External DNS records for Microsoft 365](https://learn.microsoft.com/en-us/microsoft-365/enterprise/external-domain-name-system-records?view=o365-worldwide).

### What changes after verification

Once the domain is verified, Microsoft 365 can use it for:

1. user email addresses
2. Exchange Online mail routing
3. autodiscover and client experience records
4. Teams, Skype, and other service integrations depending on workload
5. DKIM signing and related email authentication configuration

Verification proves ownership. The later DNS records make the services actually work.

## The Microsoft 365 DNS records most people add

### MX for Exchange Online

The MX record is what moves inbound mail to Exchange Online.

When you change the MX record to Microsoft 365, you are telling the rest of the internet: "send mail for this domain to Microsoft's Exchange Online service."

This is why Microsoft recommends creating users and mailboxes before switching the MX record. If the MX points to Microsoft 365 before the mailboxes exist, mail routing can break.

### Autodiscover CNAME

Autodiscover helps Outlook and other clients find Exchange settings automatically. Microsoft 365 often uses a CNAME such as:

```txt
autodiscover.contoso.com -> autodiscover.outlook.com
```

The client asks for `autodiscover.contoso.com`, DNS returns the alias target, and the client continues the Exchange discovery process from there.

### TXT verification record

The initial TXT record is often temporary from an operational perspective, but technically it remains an important ownership proof. It is usually created first because Microsoft must verify the domain before the rest of the Microsoft 365 service records are meaningful.

## SPF: Sender Policy Framework

**SPF** stands for **Sender Policy Framework**. Microsoft documents it in [Set up SPF to identify valid email sources for your custom cloud domains](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-spf-configure).

### What SPF means

SPF is an email authentication control that tells receiving systems which servers are allowed to send mail for your domain. It is published as a TXT record in DNS.

It does not encrypt mail and it does not prove the message body is unchanged. Its main job is to validate whether the sending infrastructure is an authorized source for the domain used in the SMTP envelope sender, also called the `5321.MailFrom` address.

### Example

If Microsoft 365 is the only mail sender for `contoso.com`, Microsoft documents the common SPF record as:

```txt
v=spf1 include:spf.protection.outlook.com -all
```

That tells receiving systems to allow the sources defined by `spf.protection.outlook.com` and reject everything else.

### What happens in the backend

When a receiving mail server gets a message claiming to be from your domain, it looks at the envelope sender domain and queries DNS for the SPF TXT record. It then compares the IP address or sending path of the server that actually delivered the message with the sources allowed by the SPF policy. If the sending source is authorized, SPF passes. If it is not authorized, SPF fails.

### Important operational rule

Microsoft stresses in both the SPF article and the domain-record articles that you should have **one SPF TXT record**, not multiple separate SPF records for the same domain. If multiple systems send mail on behalf of your domain, their sources need to be combined into one SPF policy.

## DKIM: DomainKeys Identified Mail

**DKIM** stands for **DomainKeys Identified Mail**. Microsoft documents it in [Set up DKIM to sign mail from your cloud domain](https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/email-authentication-dkim-configure?view=o365-worldwide).

### What DKIM means

DKIM is about cryptographic message signing. Instead of only checking whether the sending server is allowed, DKIM lets the sending system sign parts of the message using a private key. The receiving system can then validate that signature using the public key published in DNS.

This helps answer a different question from SPF: not only "was the sender allowed?" but also "was the message signed by the expected domain, and do the signed parts still validate?"

### Example

In Microsoft 365, DKIM for a custom domain typically uses two CNAME selectors such as:

```txt
selector1._domainkey.contoso.com -> selector1-contoso-com._domainkey.<tenant>.onmicrosoft.com
selector2._domainkey.contoso.com -> selector2-contoso-com._domainkey.<tenant>.onmicrosoft.com
```

Microsoft 365 holds the private key and signs outbound mail. The public key is exposed indirectly through DNS so receiving servers can validate the signature.

### What happens in the backend

When Microsoft 365 sends a message for your domain, it signs selected headers and the body using the domain's DKIM private key. The resulting signature is inserted into the `DKIM-Signature` header. The receiving system reads the `d=` signing domain and the `s=` selector value, queries DNS for the corresponding public key, and validates the signature. If the signature validates, the receiver knows that the signed content still matches what the signer produced.

### Why Microsoft 365 uses CNAMEs here

Microsoft uses CNAME records for DKIM because Microsoft wants to manage the actual signing keys and key rotation infrastructure, while you still prove domain consent by publishing DNS records under your namespace.

## DMARC: Domain-based Message Authentication, Reporting, and Conformance

**DMARC** stands for **Domain-based Message Authentication, Reporting, and Conformance**. Microsoft documents it in [Set up DMARC to validate the From address domain for cloud senders](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dmarc-configure).

### What DMARC means

DMARC sits above SPF and DKIM. It tells receiving systems how to evaluate failures and, crucially, whether the visible **From** domain aligns with the domain validated by SPF or DKIM.

This matters because a message can pass SPF for one domain and still display a different visible From address. DMARC is the policy layer that says whether that mismatch is acceptable.

### Example

A typical DMARC TXT record looks like:

```txt
v=DMARC1; p=reject; rua=mailto:dmarc-reports@contoso.com
```

This says the domain is using DMARC version 1, failed messages should be rejected, and aggregate reports should be sent to the specified mailbox.

### What happens in the backend

When a receiving server evaluates a message, it checks SPF and DKIM results. DMARC then asks whether at least one of those passed **and** whether the validated domain aligns with the domain in the visible `From` header. If alignment exists and one mechanism passes, DMARC passes. If not, DMARC fails, and the receiver can apply the policy you published such as `none`, `quarantine`, or `reject`.

This is why DMARC is not a replacement for SPF or DKIM. It depends on them and adds policy and alignment on top.

## How SPF, DKIM, and DMARC relate

The cleanest way to think about them is:

1. **SPF** validates whether the sending infrastructure is authorized
2. **DKIM** validates whether the message was signed by the expected domain and remained intact for the signed parts
3. **DMARC** validates domain alignment and tells receivers what policy to apply if SPF and DKIM do not satisfy the requirements

Microsoft's documentation explicitly recommends configuring all three together because SPF alone cannot stop all spoofing scenarios.

## A realistic onboarding sequence

If you are moving a real domain into Microsoft 365, a practical sequence looks like this:

1. register the domain at a registrar
2. decide where DNS will be hosted
3. create the Microsoft Entra or Microsoft 365 tenant
4. add the custom domain in the admin portal
5. publish the verification TXT record
6. wait for Microsoft verification to succeed
7. create users and mailboxes
8. add Exchange-related DNS records such as MX and Autodiscover
9. publish SPF
10. publish DKIM CNAME records and enable DKIM in Microsoft 365
11. publish DMARC and move the policy from monitoring to enforcement as confidence increases

This sequence matters because the technical dependencies are real. Verification comes before use. Mailboxes should exist before the MX cutover. DKIM and DMARC work best after the basic mail path is already stable.

## Common mistakes

Several operational mistakes show up repeatedly:

1. adding multiple SPF TXT records instead of maintaining one combined SPF policy
2. changing the MX record before users or mailboxes are ready
3. assuming domain verification in Entra automatically means Exchange Online mail routing is configured
4. enabling DMARC enforcement before understanding all legitimate mail sources
5. forgetting that DNS changes may take time to be visible due to caching and TTL behavior

These are not theoretical problems. They are common reasons migrations and tenant onboarding feel fragile.

## Key implementation points

1. A domain is the namespace you own; DNS is the distributed system that tells the internet how to use that namespace.
2. Microsoft Entra domain verification is fundamentally an ownership-proof exercise performed through DNS.
3. Microsoft 365 service records such as MX, Autodiscover, SPF, DKIM, and DMARC each solve different problems and should not be treated as interchangeable.
4. SPF authorizes sending sources, DKIM signs outbound mail, and DMARC adds alignment and receiver policy.

## References

- [Add and verify custom domain names - Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/enterprise-users/domains-manage)
- [Add your custom domain name to your tenant](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/add-custom-domain?context=azure%2Factive-directory%2Fusers-groups-roles%2Fcontext%2Fugr-context)
- [Connect your domain by adding DNS records](https://learn.microsoft.com/en-us/microsoft-365/admin/get-help-with-domains/create-dns-records-at-any-dns-hosting-provider?view=o365-worldwide)
- [External DNS records for Microsoft 365](https://learn.microsoft.com/en-us/microsoft-365/enterprise/external-domain-name-system-records?view=o365-worldwide)
- [DNS Concepts](https://learn.microsoft.com/en-us/windows/win32/dns/dns-concepts)
- [Set up SPF to identify valid email sources for your custom cloud domains](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-spf-configure)
- [Set up DKIM to sign mail from your cloud domain](https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/email-authentication-dkim-configure?view=o365-worldwide)
- [Set up DMARC to validate the From address domain for cloud senders](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dmarc-configure)
