import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/header";
import HomeHero from "@/app/_components/home-hero";
import TopicGrid from "@/app/_components/topic-grid";
import SearchablePosts from "@/app/_components/searchable-posts";
import SubscribeForm from "@/app/_components/subscribe-form";
import DateFormatter from "@/app/_components/date-formatter";
import { getAllPosts } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";
import { getPostTopics, getTopicByLabel } from "@/lib/post-taxonomy";

export const metadata: Metadata = {
  title: {
    absolute: `${CMS_NAME} — Microsoft Entra & Microsoft 365 Engineering Reference`,
  },
  description:
    "Sentinel Identity is a long-form technical reference for Microsoft Entra ID, Conditional Access, MFA, passkeys, hybrid identity, and Microsoft 365 — written for engineers, administrators, and security architects.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${CMS_NAME} — Microsoft Entra & Microsoft 365 Engineering Reference`,
    description:
      "Long-form troubleshooting and architecture for Microsoft Entra and Microsoft 365.",
    url: "/",
    type: "website",
  },
};

export default async function Index() {
  const allPosts = getAllPosts();
  const featured = allPosts[0];
  const recent = allPosts.slice(1, 7);

  return (
    <main className="relative overflow-hidden">
      <Header />

      <HomeHero postCount={allPosts.length} />

      {featured && (
        <section id="articles" className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">Latest analysis</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                  Just published.
                </h2>
              </div>
              <Link
                href="/archive"
                className="inline-flex items-center text-sm font-semibold text-slate-900 transition hover:text-cyan-900"
              >
                Full archive →
              </Link>
            </div>

            <article className="mt-10 grid gap-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:p-10">
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <span>
                    <DateFormatter dateString={featured.date} />
                  </span>
                  {getPostTopics(featured)
                    .slice(0, 2)
                    .map((topic) => (
                      <Link
                        key={topic}
                        href={`/topics/${getTopicByLabel(topic).slug}`}
                        className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[0.65rem] font-medium tracking-[0.18em] text-slate-700 hover:text-slate-950"
                      >
                        {topic}
                      </Link>
                    ))}
                </div>
                <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 md:text-4xl">
                  <Link href={`/posts/${featured.slug}`} className="transition hover:text-cyan-900">
                    {featured.title}
                  </Link>
                </h3>
                <p className="mt-5 text-lg leading-8 text-slate-600">{featured.excerpt}</p>
                <Link
                  href={`/posts/${featured.slug}`}
                  className="mt-7 inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-900"
                >
                  Read the article
                </Link>
              </div>

              {recent.length > 0 && (
                <aside className="rounded-[1.5rem] border border-stone-200 bg-[#fbfaf7] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Also recent</p>
                  <ul className="mt-4 divide-y divide-stone-200">
                    {recent.slice(0, 4).map((post) => (
                      <li key={post.slug} className="py-4 first:pt-0 last:pb-0">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          <DateFormatter dateString={post.date} />
                        </p>
                        <Link
                          href={`/posts/${post.slug}`}
                          className="mt-2 block text-base font-semibold leading-6 tracking-[-0.02em] text-slate-950 hover:text-cyan-900"
                        >
                          {post.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </article>
          </div>
        </section>
      )}

      <TopicGrid posts={allPosts} />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          {allPosts.length > 0 && <SearchablePosts posts={allPosts} />}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-[#fbfaf7]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">About this publication</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                Independent. Source-anchored. Written for the operator.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Every article is anchored to Microsoft Learn or other primary sources, reviewed by a human with
                hands-on Microsoft Entra experience, and updated as product behaviour changes. We do not
                republish, we are not paid by Microsoft, and we disclose AI usage and advertising standards
                openly.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/about"
                  className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-950"
                >
                  About Sentinel Identity
                </Link>
                <Link
                  href="/editorial-policy"
                  className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-950"
                >
                  Editorial policy
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-900"
                >
                  Contact the editor
                </Link>
              </div>
            </div>

            <div id="subscribe">
              <SubscribeForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
