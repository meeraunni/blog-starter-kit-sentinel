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
    <section className="py-12 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-center">
        <div>
          <CoverImage title={title} src={coverImage} slug={slug} priority />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_rgba(15,23,42,0.10)] lg:p-10">
          <div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-900">
            Featured analysis
          </div>

          <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950 lg:text-5xl">
            <Link href={`/posts/${slug}`} className="transition hover:text-cyan-800">
              {title}
            </Link>
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">{excerpt}</p>

          <div className="mt-8 flex flex-col gap-5 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                <DateFormatter dateString={date} />
              </div>
              <Avatar name={author?.name || "Sentinel Identity"} />
            </div>

            <Link
              href={`/posts/${slug}`}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-cyan-900"
            >
              Read feature
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
