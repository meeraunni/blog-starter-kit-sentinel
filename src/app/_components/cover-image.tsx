import Image from "next/image";
import Link from "next/link";

type Props = {
  title: string;
  src: string;
  slug?: string;
  priority?: boolean;
  compact?: boolean;
};

export default function CoverImage({
  title,
  src,
  slug,
  priority = false,
  compact = false,
}: Props) {
  const image = (
    <div
      className={`group relative w-full overflow-hidden border border-slate-200/80 bg-slate-100 ${
        compact
          ? "h-[220px] rounded-[1.5rem] shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          : "h-[280px] rounded-[2rem] shadow-[0_24px_60px_rgba(15,23,42,0.12)] md:h-[420px]"
      }`}
    >
      <Image
        src={src}
        alt={`Cover image for ${title}`}
        fill
        priority={priority}
        className="object-cover transition duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />
    </div>
  );

  return slug ? (
    <Link href={`/posts/${slug}`} aria-label={title} className="block">
      {image}
    </Link>
  ) : (
    image
  );
}
