import Link from "next/link";
import { TableOfContentsItem } from "@/lib/post-format";
import ArticleToc from "./article-toc";

type Props = {
  items: TableOfContentsItem[];
  readingTime: number;
  topicLabel?: string;
  topicSlug?: string;
};

export default function PostSidebar({ items, readingTime, topicLabel, topicSlug }: Props) {
  return (
    <aside className="space-y-8 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
      {items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur">
          <ArticleToc items={items} />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Article details</p>
        <dl className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
          <div className="flex justify-between gap-3">
            <dt>Reading time</dt>
            <dd className="text-slate-900">{readingTime} min</dd>
          </div>
          {topicLabel && topicSlug && (
            <div className="flex items-center justify-between gap-3">
              <dt>Topic</dt>
              <dd>
                <Link
                  href={`/topics/${topicSlug}`}
                  className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-700 hover:text-slate-950"
                >
                  {topicLabel}
                </Link>
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt>Updated</dt>
            <dd className="text-slate-900">As needed</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[#fbfaf7] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Get updates</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          New deep-dives on Microsoft Entra and Microsoft 365 land in your inbox.
        </p>
        <Link
          href="/#subscribe"
          className="mt-4 inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-cyan-900"
        >
          Subscribe
        </Link>
      </div>
    </aside>
  );
}
