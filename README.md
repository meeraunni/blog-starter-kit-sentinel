# Sentinel Identity

Production source for [sentinelidentity.ca](https://sentinelidentity.ca), an independent technical publication covering Microsoft Entra ID, Microsoft 365, Active Directory, authentication, Conditional Access, passkeys, and Windows DNS.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS
- Markdown articles in `_posts/`
- Resend for verified newsletter subscriptions and contact email
- Neon Postgres for privacy-conscious first-party analytics and article feedback

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Production builds are checked with:

```bash
npm run build
```

## Publishing an article

Add a Markdown file to `_posts/` with the existing frontmatter shape. Use `date` for initial publication and optional `updated` when a material revision is published. The filename becomes the article slug.

```yaml
---
title: "Article title"
excerpt: "Concise search and social description."
date: "2026-08-16"
updated: "2026-08-20"
coverImage: "/assets/blog/example/diagram.svg"
author:
  name: "MU.A"
  picture: "/assets/blog/authors/joe.jpeg"
ogImage:
  url: "/assets/blog/example/diagram.svg"
---
```

Before publishing, verify commands and product behavior against primary documentation, check internal links, and follow the public editorial policy.

## Environment variables

See `.env.example`. Important production-only values include:

- `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, and `RESEND_SEGMENT_ID`
- `NEWSLETTER_TOKEN_SECRET`: at least 32 random characters, used for confirmation and unsubscribe links
- `DATABASE_URL`
- `ANALYTICS_HASH_SECRET`: a separate random secret used to create rotating visitor identifiers
- `CRON_SECRET`: protects scheduled analytics and newsletter endpoints
- `SITE_URL`: canonical production origin

Never commit `.env.local` or production secrets.

## Newsletter behavior

Subscriptions use double opt-in. A visitor submits the form, receives a signed 48-hour confirmation link, and is added to the Resend audience only after confirming. Unsubscribe links are signed and long-lived. Form routes also validate origin, input length, email syntax, a honeypot, and a lightweight per-instance request limit.

## Site architecture

- `src/app/`: pages, metadata, feeds, and route handlers
- `src/app/_components/`: shared UI
- `src/lib/`: article loading, taxonomy, newsletter, analytics, and formatting
- `_posts/`: Markdown article library
- `public/assets/blog/`: article diagrams and images

The homepage sends metadata-only article summaries to client-side search and progressively reveals results, keeping full Markdown bodies on article routes.

## Deployment checklist

1. Run `npm run build`.
2. Confirm all required environment variables are configured in the hosting platform.
3. Test subscription confirmation and unsubscribe links against the production origin.
4. Check `/robots.txt`, `/sitemap.xml`, `/feed.xml`, and a representative article’s social preview.
5. Review the git diff and deploy from the intended commit.

Newsletter broadcasts are never triggered by page views. After publishing, call `POST /api/newsletter/sync` with `Authorization: Bearer $CRON_SECRET` and JSON `{ "slug": "the-published-article-slug" }` exactly once.
