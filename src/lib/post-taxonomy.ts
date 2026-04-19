import { Post } from "@/interfaces/post";

const TOPIC_RULES: Array<{ label: string; matchers: RegExp[] }> = [
  { label: "Authentication", matchers: [/authentication/i, /token/i, /federation/i, /kerberos/i, /ntlm/i, /oidc/i, /oauth/i, /saml/i, /ldap/i] },
  { label: "Passkeys", matchers: [/passkey/i, /fido/i, /webauthn/i, /windows hello/i] },
  { label: "Conditional Access", matchers: [/conditional access/i, /compliant device/i, /browser support/i] },
  { label: "Tenant Operations", matchers: [/backup/i, /recovery/i, /tenant/i, /assessment/i, /join/i, /prt/i] },
  { label: "Domains and DNS", matchers: [/dns/i, /domain/i, /spf/i, /dkim/i, /dmarc/i, /mx/i] },
  { label: "Agent ID", matchers: [/agent id/i, /agents/i] },
];

export function getPostTopics(post: Post) {
  const haystack = `${post.title} ${post.excerpt} ${post.slug}`;
  const topics = TOPIC_RULES.filter((rule) => rule.matchers.some((matcher) => matcher.test(haystack))).map(
    (rule) => rule.label,
  );

  return topics.length > 0 ? topics : ["Microsoft Entra"];
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
