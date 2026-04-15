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
  featured?: boolean;
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
  featured = false,
}: Props) {
  return (
    <article
      className={`group rounded-[1.6rem] border border-stone-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] ${
        featured ? "lg:grid lg:grid-cols-[minmax(320px,1fr)_minmax(0,1fr)] lg:gap-8 lg:p-8" : "flex h-full flex-col gap-5"
      }`}
    >
      <div className={featured ? "mb-6 lg:mb-0" : ""}>
        <CoverImage title={title} src={coverImage} slug={slug} compact />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <span>
            <DateFormatter dateString={date} />
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.68rem] tracking-[0.18em] text-slate-600">
            Analysis
          </span>
        </div>

        <h3
          className={`font-semibold leading-tight tracking-[-0.035em] text-slate-950 ${
            featured ? "text-3xl md:text-4xl" : "text-2xl"
          }`}
        >
          <Link href={`/posts/${slug}`} className="transition group-hover:text-cyan-800">
            {highlightMatches(title, query)}
          </Link>
        </h3>

        <p className={`mt-4 flex-1 text-slate-600 ${featured ? "text-lg leading-8" : "text-base leading-8"}`}>
          {highlightMatches(excerpt, query)}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-stone-200 pt-5">
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
