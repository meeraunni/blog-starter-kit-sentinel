import Link from "next/link";
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
};

export function HeroPost({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
}: Props) {
  return (
    <section className="py-10 lg:py-12">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
            Featured post
          </p>
        </div>
        <Link href="/services#assessment" className="text-sm font-medium text-slate-500 transition hover:text-slate-950">
          Advisory services
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] lg:items-start">
        <div>
          <CoverImage title={title} src={coverImage} slug={slug} priority />
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-white lg:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <DateFormatter dateString={date} />
          </div>

          <h2 className="mt-4 text-3xl font-semibold leading-[1.04] tracking-[-0.045em] text-slate-950 lg:text-4xl">
            <Link href={`/posts/${slug}`} className="transition hover:text-cyan-800">
              {title}
            </Link>
          </h2>

          <p className="mt-5 text-base leading-8 text-slate-600">{excerpt}</p>

          <div className="mt-8 flex flex-col gap-5 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Avatar name={author?.name || "Sentinel Identity"} />

            <Link
              href={`/posts/${slug}`}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-cyan-900"
            >
              Read article
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
