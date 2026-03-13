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
    <div className="relative h-[280px] w-full overflow-hidden border border-neutral-200 bg-white md:h-[420px]">
      <Image
        src={src}
        alt={`Cover image for ${title}`}
        fill
        priority={priority}
        className="object-cover"
      />
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
