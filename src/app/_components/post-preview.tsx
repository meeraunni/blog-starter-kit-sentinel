import Link from "next/link";
import { Fragment, ReactNode } from "react";
import Avatar from "./avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: {
    name: string;
    picture: string;
  };
  slug: string;
  query?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text: string, query?: string): ReactNode {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return text;
  }

  const pattern = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (part.toLowerCase() === normalizedQuery.toLowerCase()) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded-md bg-amber-200/80 px-1 py-0.5 text-slate-950"
        >
          {part}
        </mark>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

export function PostPreview({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  query,
}: Props) {
  return (
    <article className="group flex h-full flex-col gap-5">
      <CoverImage title={title} src={coverImage} slug={slug} compact />

      <div className="flex flex-1 flex-col">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <DateFormatter dateString={date} />
        </div>

        <h3 className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-slate-950">
          <Link href={`/posts/${slug}`} className="transition group-hover:text-cyan-800">
            {highlightMatches(title, query)}
          </Link>
        </h3>

        <p className="mt-4 flex-1 text-base leading-8 text-slate-600">
          {highlightMatches(excerpt, query)}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Avatar name={author?.name || "Sentinel Identity"} />
          <Link
            href={`/posts/${slug}`}
            className="text-sm font-medium text-cyan-900 transition hover:text-slate-950"
          >
            Read more →
          </Link>
        </div>
      </div>
    </article>
  );
}
