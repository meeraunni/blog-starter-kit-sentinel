import { Post } from "@/interfaces/post";
import { PostPreview } from "./post-preview";

type Props = {
  posts: Post[];
  query?: string;
};

export function MoreStories({ posts, query }: Props) {
  const [featuredPost, ...remainingPosts] = posts;

  return (
    <section id="latest" className="pb-20 pt-10 lg:pb-24 lg:pt-12">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
          Latest technical articles
        </h2>
      </div>

      {featuredPost && (
        <div className="mb-10">
          <PostPreview
            title={featuredPost.title}
            coverImage={featuredPost.coverImage}
            date={featuredPost.date}
            author={featuredPost.author}
            slug={featuredPost.slug}
            excerpt={featuredPost.excerpt}
            query={query}
            featured
          />
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {remainingPosts.map((post) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
            slug={post.slug}
            excerpt={post.excerpt}
            query={query}
          />
        ))}
      </div>
    </section>
  );
}
