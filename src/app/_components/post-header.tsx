import Avatar from "./avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";
import PostTitle from "./post-title";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  author: {
    name: string;
    picture: string;
  };
};

export default function PostHeader({
  title,
  coverImage,
  date,
  author,
}: Props) {
  return (
    <>
      <PostTitle>{title}</PostTitle>

      <div className="mb-6">
        <Avatar name={author?.name || "Sentinel Identity"} />
      </div>

      <div className="mb-6 text-sm text-neutral-600">
        <DateFormatter dateString={date} />
      </div>

      <div className="mb-10">
        <CoverImage title={title} src={coverImage} priority />
      </div>
    </>
  );
}
