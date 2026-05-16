import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/_components/header";
import DateFormatter from "@/app/_components/date-formatter";
import Breadcrumbs from "@/app/_components/breadcrumbs";
import { getAllPosts } from "@/lib/api";
import {
  getPostTopics,
  getPostsByTopic,
  getTopicByLabel,
  getTopicBySlug,
  getAllTopics,
} from "@/lib/post-taxonomy";

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

  const allPosts = getAllPosts();
  const posts = getPostsByTopic(allPosts, params.slug);
  const featured = posts[0];
  const rest = posts.slice(1);

  const siblingTopics = getAllTopics().filter((t) => t.slug !== topic.slug);

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-10 lg:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Topics", href: "/topics" },
            { label: topic.label },
          ]}
        />

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-800">Topic reference</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            {topic.label}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{topic.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 font-semibold uppercase tracking-[0.18em] text-slate-700">
              {posts.length} article{posts.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {featured && (
          <section className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Most recent</p>
            <Link
              href={`/posts/${featured.slug}`}
              className="mt-4 block rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] transition hover:border-slate-900 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]"
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <DateFormatter dateString={featured.date} />
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{featured.excerpt}</p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-cyan-800">
                Read the article →
              </span>
            </Link>
          </section>
        )}

        {rest.length > 0 && (
          <section className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">All articles in this topic</p>
            <div className="mt-4 divide-y divide-stone-200 rounded-[1.8rem] border border-stone-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              {rest.map((post) => (
                <article
                  key={post.slug}
                  className="grid gap-4 px-6 py-6 md:grid-cols-[150px_minmax(0,1fr)] md:px-8"
                >
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
        )}

        <section className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Browse other topics</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {siblingTopics.map((sibling) => (
              <Link
                key={sibling.slug}
                href={`/topics/${sibling.slug}`}
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                {sibling.label}
              </Link>
            ))}
          </div>
        </section>
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
    title: `${topic.label} — Microsoft Entra topic`,
    description: topic.description,
    alternates: { canonical: `/topics/${topic.slug}` },
    openGraph: {
      title: `${topic.label} — Microsoft Entra topic`,
      description: topic.description,
      url: `/topics/${topic.slug}`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return getAllTopics().map((topic) => ({ slug: topic.slug }));
}
