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
    <div className="relative h-[220px] w-full overflow-hidden rounded-xl bg-neutral-100 md:h-[320px]">
      <Image
        src={src}
        alt={`Cover Image for ${title}`}
        className="object-cover"
        fill
        priority={priority}
      />
    </div>
  );

  return (
    <div className="sm:mx-0">
      {slug ? (
        <Link href={`/posts/${slug}`} aria-label={title}>
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  );
}
