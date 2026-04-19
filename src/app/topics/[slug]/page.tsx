import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/_components/header";
import DateFormatter from "@/app/_components/date-formatter";
import { getAllPosts } from "@/lib/api";
import { getPostTopics, getPostsByTopic, getTopicByLabel, getTopicBySlug, getAllTopics } from "@/lib/post-taxonomy";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TopicPage(props: Params) {
  const params = await props.params;
  const topic = getTopicBySlug(params.slug);

  if (!topic) {
    return notFound();
  }

  const posts = getPostsByTopic(getAllPosts(), params.slug);

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-18">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">Topic</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 md:text-5xl">
          {topic.label}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{topic.description}</p>

        <div className="mt-10 divide-y divide-stone-200 rounded-[1.8rem] border border-stone-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          {posts.map((post) => (
            <article key={post.slug} className="grid gap-4 px-6 py-6 md:grid-cols-[150px_minmax(0,1fr)] md:px-8">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                <DateFormatter dateString={post.date} />
              </div>
              <div>
                <Link
                  href={`/posts/${post.slug}`}
                  className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 transition hover:text-cyan-900"
                >
                  {post.title}
                </Link>
                <p className="mt-3 text-base leading-8 text-slate-600">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {getPostTopics(post).map((postTopic) => (
                    <Link
                      key={`${post.slug}-${postTopic}`}
                      href={`/topics/${getTopicByLabel(postTopic).slug}`}
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600 transition hover:text-slate-950"
                    >
                      {postTopic}
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const topic = getTopicBySlug(params.slug);

  if (!topic) {
    return notFound();
  }

  return {
    title: topic.label,
    description: topic.description,
    alternates: {
      canonical: `/topics/${topic.slug}`,
    },
  };
}

export async function generateStaticParams() {
  return getAllTopics().map((topic) => ({
    slug: topic.slug,
  }));
}
