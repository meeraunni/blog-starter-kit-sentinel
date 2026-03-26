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
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)] lg:items-center">
        <div>
          <CoverImage title={title} src={coverImage} slug={slug} priority />
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-[0_32px_80px_rgba(15,23,42,0.10)] ring-1 ring-white lg:p-10">
          <div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-900">
            Featured analysis
          </div>

          <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950 lg:text-5xl">
            <Link href={`/posts/${slug}`} className="transition hover:text-cyan-800">
              {title}
            </Link>
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">{excerpt}</p>

          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6">
            <div className="grid gap-4 rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              <p className="font-semibold uppercase tracking-[0.24em] text-slate-500">Why this matters</p>
              <p>
                Strong homepage journalism starts with one clear feature. This lead story now anchors the page the
                way a premium tech newsroom would.
              </p>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
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
      </div>
    </section>
  );
}
