import Link from "next/link";
import { resolveAuthor } from "@/lib/authors";

type Props = {
  name?: string;
  picture?: string;
  linkToAuthor?: boolean;
};

export default function Avatar({ name, linkToAuthor = true }: Props) {
  const author = resolveAuthor(name);

  const content = (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-xs font-semibold tracking-[0.22em] text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
        {author.initials}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-950">{author.name}</div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{author.title}</div>
      </div>
    </div>
  );

  if (!linkToAuthor) return content;

  return (
    <Link
      href={`/author/${author.slug}`}
      className="-mx-2 inline-flex rounded-2xl px-2 py-1 transition hover:bg-stone-50"
    >
      {content}
    </Link>
  );
}
