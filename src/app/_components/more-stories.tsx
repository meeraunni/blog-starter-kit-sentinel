import Link from "next/link";
import { Fragment, ReactNode } from "react";
import { PostSummary } from "@/interfaces/post";
import DateFormatter from "./date-formatter";
import { getTopicByLabel } from "@/lib/post-taxonomy";
import ArticleArtwork from "./article-artwork";

type Props = {
  posts: PostSummary[];
  query?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query?: string): ReactNode {
  const normalised = query?.trim();
  if (!normalised) return text;
  const pattern = new RegExp(`(${escapeRegExp(normalised)})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    part.toLowerCase() === normalised.toLowerCase() ? (
      <mark key={i} className="rounded bg-amber-200/80 px-1 text-slate-950">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function MoreStories({ posts, query }: Props) {
  return (
    <ul className="story-cards">
      {posts.map((post) => (
        <li key={post.slug} className="story-card">
          <Link
            href={`/posts/${post.slug}`}
            className="story-art-link"
            aria-label={`Read ${post.title}`}
          >
            <ArticleArtwork slug={post.slug} topics={post.topics} coverImage={post.coverImage} />
          </Link>
          <div className="story-card-body">
            <div className="story-card-meta">
              <Link href={`/topics/${getTopicByLabel(post.topics[0]).slug}`}>
                {post.topics[0]}
              </Link>
              <span>{post.readingTime} min read</span>
            </div>
            <h3>
              <Link href={`/posts/${post.slug}`}>
                {highlight(post.title, query)}
              </Link>
            </h3>
            <p>{highlight(post.excerpt, query)}</p>
            <div className="story-card-footer">
              <Link href="/author/m-u">
                <span className="byline-avatar">MU</span>
                {post.author?.name || "MU.A"}
              </Link>
              <DateFormatter dateString={post.date} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
