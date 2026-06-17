import Link from "next/link";
import { Post } from "@/interfaces/post";
import { getAllTopics, getPostsByTopic } from "@/lib/post-taxonomy";

type Props = {
  posts: Post[];
};

export default function TopicGrid({ posts }: Props) {
  const topics = getAllTopics()
    .map((topic) => ({ ...topic, posts: getPostsByTopic(posts, topic.slug) }))
    .filter((topic) => topic.posts.length > 0)
    .sort((a, b) => b.posts.length - a.posts.length);

  return (
    <section className="border-b border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50 md:text-3xl">
            Topics
          </h2>
          <Link href="/topics" className="text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">
            All topics →
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-500"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold tracking-[-0.01em] text-slate-950 group-hover:text-cyan-900 dark:text-slate-50 dark:group-hover:text-cyan-300">
                  {topic.label}
                </h3>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {topic.posts.length} {topic.posts.length === 1 ? "article" : "articles"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2 dark:text-slate-300">{topic.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
