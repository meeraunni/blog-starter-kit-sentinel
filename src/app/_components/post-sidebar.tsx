import Link from "next/link";
import { TableOfContentsItem } from "@/lib/post-format";

type Props = {
  items: TableOfContentsItem[];
  readingTime: number;
};

export default function PostSidebar({ items, readingTime }: Props) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-28">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Article details
        </p>
        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
          <p>{readingTime} min read</p>
          <p>Long-form technical reference with linked source material.</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            On this page
          </p>
          <nav className="mt-4">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`#${item.id}`}
                    className={`block text-sm leading-6 text-slate-600 transition hover:text-slate-950 ${
                      item.level === 3 ? "pl-4" : ""
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Editorial approach
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Articles on Sentinel Identity are written as implementation-focused technical guides with official
          Microsoft documentation linked where platform behavior needs verification.
        </p>
      </div>
    </aside>
  );
}
