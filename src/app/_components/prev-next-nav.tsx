import Link from "next/link";
import { Post } from "@/interfaces/post";

type Props = {
  previous?: Post | null;
  next?: Post | null;
};

export default function PrevNextNav({ previous, next }: Props) {
  if (!previous && !next) {
    return null;
  }

  return (
    <nav
      aria-label="More articles"
      className="mt-16 grid gap-4 border-t border-stone-200 pt-10 md:grid-cols-2"
    >
      {previous ? (
        <Link
          href={`/posts/${previous.slug}`}
          className="group flex flex-col rounded-[1.5rem] border border-stone-200 bg-white p-6 transition hover:border-slate-950 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
        >
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            ← Previous
          </span>
          <span className="mt-3 text-base font-semibold leading-7 tracking-[-0.02em] text-slate-950 group-hover:text-cyan-900">
            {previous.title}
          </span>
        </Link>
      ) : (
        <div className="hidden md:block" />
      )}
      {next ? (
        <Link
          href={`/posts/${next.slug}`}
          className="group flex flex-col rounded-[1.5rem] border border-stone-200 bg-white p-6 text-right transition hover:border-slate-950 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
        >
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Next →
          </span>
          <span className="mt-3 text-base font-semibold leading-7 tracking-[-0.02em] text-slate-950 group-hover:text-cyan-900">
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
