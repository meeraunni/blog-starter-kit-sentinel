import Link from "next/link";
import { Post } from "@/interfaces/post";
import { getAllTopics, getPostsByTopic } from "@/lib/post-taxonomy";

type Props = {
  posts: Post[];
};

export default function TopicGrid({ posts }: Props) {
  const topics = getAllTopics()
    .map((topic) => {
      const topicPosts = getPostsByTopic(posts, topic.slug);
      return { ...topic, posts: topicPosts };
    })
    .filter((topic) => topic.posts.length > 0)
    .sort((a, b) => b.posts.length - a.posts.length);

  return (
    <section className="border-y border-stone-200 bg-[#fbfaf7]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">Reference areas</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              Browse Microsoft Entra by topic.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Each topic groups long-form articles that go deeper than the standard documentation: failure modes,
              decision trees, sign-in log forensics, and operational playbooks.
            </p>
          </div>
          <Link
            href="/topics"
            className="inline-flex items-center text-sm font-semibold text-slate-900 transition hover:text-cyan-900"
          >
            All topics →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="group flex h-full flex-col justify-between rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition hover:border-slate-950 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950 group-hover:text-cyan-900">
                    {topic.label}
                  </h3>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {topic.posts.length}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{topic.description}</p>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {topic.posts.slice(0, 3).map((post) => (
                  <li key={post.slug} className="flex items-start gap-2">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                    <span className="leading-6 text-slate-700">{post.title}</span>
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-slate-900 group-hover:text-cyan-900">
                Open topic →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
