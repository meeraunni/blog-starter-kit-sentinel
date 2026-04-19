import { Post } from "@/interfaces/post";

type TopicRule = {
  label: string;
  slug: string;
  description: string;
  matchers: RegExp[];
};

const TOPIC_RULES: TopicRule[] = [
  {
    label: "Authentication",
    slug: "authentication",
    description:
      "Protocols, tokens, sign-in flows, federation patterns, and the backend mechanics behind authentication systems.",
    matchers: [/authentication/i, /token/i, /federation/i, /kerberos/i, /ntlm/i, /oidc/i, /oauth/i, /saml/i, /ldap/i],
  },
  {
    label: "Passkeys",
    slug: "passkeys",
    description:
      "Passkey architecture, registration, attestation, compatibility, rollout planning, and troubleshooting in Microsoft Entra.",
    matchers: [/passkey/i, /fido/i, /webauthn/i, /windows hello/i],
  },
  {
    label: "Conditional Access",
    slug: "conditional-access",
    description:
      "Conditional Access policy behavior, device checks, browser support, and operational troubleshooting.",
    matchers: [/conditional access/i, /compliant device/i, /browser support/i],
  },
  {
    label: "Tenant Operations",
    slug: "tenant-operations",
    description:
      "Tenant recovery, device join, Primary Refresh Token behavior, and day-to-day Microsoft Entra operations.",
    matchers: [/backup/i, /recovery/i, /tenant/i, /join/i, /prt/i],
  },
  {
    label: "Domains and DNS",
    slug: "domains-and-dns",
    description:
      "Custom domains, DNS records, MX, SPF, DKIM, DMARC, and Microsoft 365 domain onboarding.",
    matchers: [/dns/i, /domain/i, /spf/i, /dkim/i, /dmarc/i, /mx/i],
  },
  {
    label: "Agent ID",
    slug: "agent-id",
    description:
      "Microsoft Entra Agent ID coverage, including security architecture, governance, and network controls for agents.",
    matchers: [/agent id/i, /agents/i],
  },
];

const DEFAULT_TOPIC = {
  label: "Microsoft Entra",
  slug: "microsoft-entra",
  description: "General Microsoft Entra architecture, operations, and identity platform articles.",
};

export function getAllTopics() {
  return [...TOPIC_RULES, { ...DEFAULT_TOPIC, matchers: [] }];
}

export function getPostTopics(post: Post) {
  const haystack = `${post.title} ${post.excerpt} ${post.slug}`;
  const topics = TOPIC_RULES.filter((rule) => rule.matchers.some((matcher) => matcher.test(haystack))).map(
    (rule) => rule.label,
  );

  return topics.length > 0 ? topics : [DEFAULT_TOPIC.label];
}

export function getTopicSummary(posts: Post[]) {
  const counts = new Map<string, number>();

  posts.forEach((post) => {
    getPostTopics(post).forEach((topic) => {
      counts.set(topic, (counts.get(topic) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => (b.count === a.count ? a.topic.localeCompare(b.topic) : b.count - a.count));
}

export function getTopicByLabel(label: string) {
  return getAllTopics().find((topic) => topic.label === label) || { ...DEFAULT_TOPIC };
}

export function getTopicBySlug(slug: string) {
  return getAllTopics().find((topic) => topic.slug === slug) || null;
}

export function getPostsByTopic(posts: Post[], slug: string) {
  const topic = getTopicBySlug(slug);

  if (!topic) {
    return [];
  }

  return posts.filter((post) => getPostTopics(post).includes(topic.label));
}

export function getRelatedPosts(posts: Post[], currentPost: Post, limit = 3) {
  const currentTopics = new Set(getPostTopics(currentPost));

  return posts
    .filter((post) => post.slug !== currentPost.slug)
    .map((post) => ({
      post,
      score: getPostTopics(post).reduce((score, topic) => score + (currentTopics.has(topic) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => (b.score === a.score ? (a.post.date < b.post.date ? 1 : -1) : b.score - a.score))
    .slice(0, limit)
    .map((entry) => entry.post);
}
