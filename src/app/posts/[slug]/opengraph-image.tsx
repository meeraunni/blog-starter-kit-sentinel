import { ImageResponse } from "next/og";
import { getPostBySlug, getAllPosts } from "@/lib/api";
import { getPostTopics } from "@/lib/post-taxonomy";

export const alt = "Sentinel Identity article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return new Response("Not found", { status: 404 });
  }

  const topics = getPostTopics(post).slice(0, 3).join(" · ");
  const title = post.title.length > 110 ? `${post.title.slice(0, 107)}…` : post.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(circle at 18% -10%, rgba(8,145,178,0.32), transparent 45%), radial-gradient(circle at 110% 110%, rgba(15,23,42,0.32), transparent 45%), linear-gradient(180deg, #0b1220 0%, #0f172a 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#020617",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              letterSpacing: 6,
              fontSize: 18,
            }}
          >
            SI
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>Sentinel Identity</span>
            <span style={{ fontSize: 14, color: "#67e8f9", letterSpacing: 4, textTransform: "uppercase" }}>
              {topics || "Microsoft Entra"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1060 }}>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              margin: 0,
            }}
          >
            {title}
          </h1>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 20, color: "#94a3b8" }}>sentinelidentity.ca</span>
          <span
            style={{
              fontSize: 16,
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(8,145,178,0.18)",
              color: "#67e8f9",
              border: "1px solid rgba(103,232,249,0.4)",
            }}
          >
            Long-form analysis
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
