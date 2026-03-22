import Image from "next/image";
import Link from "next/link";

type Props = {
  title: string;
  src: string;
  slug?: string;
  priority?: boolean;
};

export default function CoverImage({
  title,
  src,
  slug,
  priority = false,
}: Props) {
  const image = (
    <div className="group relative h-[280px] w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.12)] md:h-[420px]">
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
