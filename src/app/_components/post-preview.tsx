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

export function PostPreview({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
}: Props) {
  return (
    <article className="group flex h-full flex-col gap-6 rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_22px_50px_rgba(15,23,42,0.08)] ring-1 ring-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)] md:p-6">
      <CoverImage title={title} src={coverImage} slug={slug} />

      <div className="flex flex-1 flex-col">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <DateFormatter dateString={date} />
        </div>

        <h3 className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-slate-950">
          <Link href={`/posts/${slug}`} className="transition group-hover:text-cyan-800">
            {title}
          </Link>
        </h3>

        <p className="mt-4 flex-1 text-base leading-8 text-slate-600">{excerpt}</p>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
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
