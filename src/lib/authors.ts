import { getBaseUrl } from "@/lib/site";

export type Author = {
  slug: string;
  /** Byline shown on posts and cards (e.g. "MU.A") */
  name: string;
  /** Initials used for the avatar badge */
  initials: string;
  /** One-line role / title shown under the byline */
  title: string;
  /** Short bio (1–3 sentences) shown in the post-end Author block */
  shortBio: string;
  /** Longer bio shown on the dedicated /author/[slug] page */
  longBio: string;
  /** Topic specialties displayed on the author page */
  specialties: string[];
  /** Optional public profile URL (LinkedIn, GitHub, X) for E-E-A-T sameAs schema */
  url?: string;
};

const AUTHORS: Author[] = [
  {
    slug: "m-u",
    name: "MU.A",
    initials: "MUA",
    title: "Microsoft 365 / Entra Engineer",
    shortBio:
      "MU.A is a hands-on Microsoft 365 and Microsoft Entra engineer. Sentinel Identity is where MU.A writes the long-form troubleshooting and architecture notes that ship articles people can actually use in production tenants.",
    longBio:
      "MU.A works hands-on with Microsoft 365, Microsoft Entra ID, Conditional Access, hybrid identity, and tenant operations. Articles on Sentinel Identity are written from the operator's seat — what the control actually does, how it fails in production, and how to remediate without guessing. Every published article is sourced against Microsoft Learn and reviewed before publication.",
    specialties: [
      "Microsoft Entra ID",
      "Conditional Access & MFA",
      "Passkeys and FIDO2",
      "Hybrid identity (PHS / PTA / Federation)",
      "Microsoft 365 DNS (SPF / DKIM / DMARC)",
      "Sign-in log forensics with KQL",
    ],
  },
];

const DEFAULT_AUTHOR_SLUG = "m-u";

export function getAllAuthors(): Author[] {
  return AUTHORS;
}

export function getAuthorBySlug(slug: string): Author | null {
  return AUTHORS.find((author) => author.slug === slug) ?? null;
}

/**
 * Resolve an author given a post's frontmatter `author.name` value.
 * Falls back to the default author so legacy posts still render correctly.
 */
export function resolveAuthor(name?: string | null): Author {
  if (name) {
    const normalised = name.trim().toLowerCase();
    const byName = AUTHORS.find((a) => a.name.toLowerCase() === normalised);
    if (byName) return byName;
    const bySlug = AUTHORS.find((a) => a.slug === normalised);
    if (bySlug) return bySlug;
  }
  // Default — also covers the legacy "Sentinel Identity" brand byline
  return getAuthorBySlug(DEFAULT_AUTHOR_SLUG) ?? AUTHORS[0];
}

/** JSON-LD Person schema for the Article.author field */
export function personSchema(author: Author) {
  return {
    "@type": "Person",
    name: author.name,
    description: author.shortBio,
    url: getBaseUrl(`/author/${author.slug}`),
    jobTitle: author.title,
    knowsAbout: author.specialties,
    ...(author.url ? { sameAs: [author.url] } : {}),
  } as const;
}
