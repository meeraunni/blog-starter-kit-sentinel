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
    <div className="mb-12">
      <div className="mb-5">
        <CoverImage title={title} src={coverImage} slug={slug} />
      </div>

      <h3 className="mb-3 text-2xl font-bold leading-snug">
        <Link href={`/posts/${slug}`} className="hover:underline">
          {title}
        </Link>
      </h3>

      <div className="mb-3 text-sm text-neutral-600">
        <DateFormatter dateString={date} />
      </div>

      <p className="mb-4 text-base leading-7 text-neutral-700">{excerpt}</p>

      <Avatar name={author?.name || "Sentinel Identity"} />
    </div>
  );
}
