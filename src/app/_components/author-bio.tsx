import Link from "next/link";
import { Author } from "@/lib/authors";

type Props = {
  author: Author;
};

export default function AuthorBio({ author }: Props) {
  return (
    <section
      aria-label="About the author"
      className="mt-16 rounded-[1.6rem] border border-stone-200 bg-[#fbfaf7] p-7 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">About the author</p>
      <div className="mt-4 flex items-start gap-5">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-sm font-semibold tracking-[0.22em] text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
          {author.initials}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">
            <Link href={`/author/${author.slug}`} className="hover:text-cyan-900">
              {author.name}
            </Link>
            <span className="ml-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {author.title}
            </span>
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">{author.shortBio}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href={`/author/${author.slug}`}
              className="rounded-full border border-stone-300 bg-white px-3 py-1 font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              More from {author.name}
            </Link>
            <Link
              href="/editorial-policy"
              className="rounded-full border border-stone-300 bg-white px-3 py-1 font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Editorial standards
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-stone-300 bg-white px-3 py-1 font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Suggest a correction
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
