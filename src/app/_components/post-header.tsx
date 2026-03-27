import Avatar from "./avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";
import { PostTitle } from "./post-title";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  author: {
    name: string;
    picture: string;
  };
};

export function PostHeader({
  title,
  coverImage,
  date,
  author,
}: Props) {
  return (
    <header className="mx-auto max-w-5xl pb-12 pt-8 lg:pb-16 lg:pt-12">
      <div className="rounded-[2.25rem] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_rgba(15,23,42,0.08)] lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900">
          Microsoft Entra Blog
        </p>
        <div className="mt-5">
          <PostTitle>{title}</PostTitle>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
          <Avatar name={author?.name || "Sentinel Identity"} />

          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <DateFormatter dateString={date} />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <CoverImage title={title} src={coverImage} priority />
      </div>
    </header>
  );
}
