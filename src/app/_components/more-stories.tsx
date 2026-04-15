import Link from "next/link";
import { Post } from "@/interfaces/post";
import { PostPreview } from "./post-preview";
import DateFormatter from "./date-formatter";

type Props = {
  posts: Post[];
  query?: string;
};

export function MoreStories({ posts, query }: Props) {
  const [featuredPost, ...remainingPosts] = posts;
  const railPosts = remainingPosts.slice(0, 4);
  const gridPosts = remainingPosts.slice(4);

  return (
    <section id="latest" className="pb-20 pt-10 lg:pb-24 lg:pt-12">
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">
            Latest coverage
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
            Technical articles written for production work.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-7 text-slate-600 lg:justify-self-end">
          Implementation notes, troubleshooting flows, and architecture detail shaped for Microsoft identity teams.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-start">
        <div>
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
        </div>

        <aside className="rounded-[1.8rem] border border-stone-200 bg-[#fcfbf8] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
            Recent posts
          </p>
          <div className="mt-4 divide-y divide-stone-200">
            {railPosts.map((post) => (
              <div key={post.slug} className="py-4 first:pt-0 last:pb-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <DateFormatter dateString={post.date} />
                </p>
                <Link
                  href={`/posts/${post.slug}`}
                  className="mt-2 block text-lg font-semibold leading-7 tracking-[-0.02em] text-slate-950 transition hover:text-cyan-900"
                >
                  {post.title}
                </Link>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {gridPosts.map((post) => (
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
