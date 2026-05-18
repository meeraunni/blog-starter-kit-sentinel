import Link from "next/link";
import { Fragment, ReactNode } from "react";
import { Post } from "@/interfaces/post";
import DateFormatter from "./date-formatter";
import { getPostTopics, getTopicByLabel } from "@/lib/post-taxonomy";

type Props = {
  posts: Post[];
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
    <ul className="divide-y divide-stone-200 border-y border-stone-200">
      {posts.map((post) => {
        const topics = getPostTopics(post).slice(0, 2);
        return (
          <li key={post.slug} className="py-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <DateFormatter dateString={post.date} />
              {topics.map((topic) => (
                <Fragment key={topic}>
                  <span aria-hidden="true">·</span>
                  <Link
                    href={`/topics/${getTopicByLabel(topic).slug}`}
                    className="hover:text-slate-900"
                  >
                    {topic}
                  </Link>
                </Fragment>
              ))}
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.01em] text-slate-950 md:text-2xl">
              <Link href={`/posts/${post.slug}`} className="hover:text-cyan-900">
                {highlight(post.title, query)}
              </Link>
            </h3>
            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
              {highlight(post.excerpt, query)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
