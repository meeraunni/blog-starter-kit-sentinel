import Link from "next/link";
import Header from "@/app/_components/header";
import { getAllPosts } from "@/lib/api";
import { getAllTopics, getPostsByTopic } from "@/lib/post-taxonomy";

export const metadata = {
  title: "Topics",
  description:
    "Browse Sentinel Identity by topic, including authentication, passkeys, Conditional Access, tenant operations, domains and DNS, and Agent ID.",
};

export default function TopicsPage() {
  const posts = getAllPosts();
  const topics = getAllTopics()
    .map((topic) => ({
      ...topic,
      count: getPostsByTopic(posts, topic.slug).length,
    }))
    .filter((topic) => topic.count > 0);

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-18">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">Topics</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 md:text-5xl">
          Browse articles by topic
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Topic pages group related articles so readers can move through the site like a technical archive instead
          of reading isolated posts one by one.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="rounded-[1.75rem] border border-stone-200 bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                {topic.count} article{topic.count === 1 ? "" : "s"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {topic.label}
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{topic.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
