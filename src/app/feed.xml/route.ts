import { getAllPosts } from "@/lib/api";
import { getBaseUrl, getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 3600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = getAllPosts();
  const site = getSiteUrl();
  const builtAt = new Date().toUTCString();
  const latest = posts[0]?.date ? new Date(posts[0].date).toUTCString() : builtAt;

  const items = posts
    .slice(0, 50)
    .map((post) => {
      const url = getBaseUrl(`/posts/${post.slug}`);
      const pubDate = post.date ? new Date(post.date).toUTCString() : builtAt;
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sentinel Identity — Microsoft Entra &amp; M365 Reference</title>
    <link>${site}</link>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Long-form technical writing on Microsoft Entra, Conditional Access, MFA, passkeys, hybrid identity, and Microsoft 365.</description>
    <language>en-ca</language>
    <lastBuildDate>${latest}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
}
