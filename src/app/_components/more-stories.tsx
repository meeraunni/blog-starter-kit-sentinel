import { Post } from "@/interfaces/post";
import { PostPreview } from "./post-preview";

type Props = {
  posts: Post[];
};

export function MoreStories({ posts }: Props) {
  return (
    <section id="latest" className="pb-20 pt-8 lg:pb-24">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
            Latest coverage
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
            Recent articles from Sentinel Identity.
          </h2>
        </div>

        <p className="max-w-xl text-base leading-7 text-slate-600">
          Writing focused on Microsoft identity operations, security decisions, and the details that matter in
          production tenants.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
            slug={post.slug}
            excerpt={post.excerpt}
          />
        ))}
      </div>
    </section>
  );
}
