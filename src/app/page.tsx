import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import SearchablePosts from "@/app/_components/searchable-posts";
import { getAllPosts } from "@/lib/api";
import { getTopicSummary } from "@/lib/post-taxonomy";
import Link from "next/link";

export default async function Index() {
  const allPosts = getAllPosts();
  const topics = getTopicSummary(allPosts).slice(0, 6);

  return (
    <main className="relative overflow-hidden">
      <Header />

      <Container>
        {allPosts.length > 0 && <SearchablePosts posts={allPosts} />}

        <section className="border-t border-stone-200 pb-24 pt-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">
                Archive and topics
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                Browse the site like a technical publication, not a landing page.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                The archive is organized for administrators and engineers who need to find articles by theme and
                come back to them later as reference material.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {topics.map((topic) => (
                  <span
                    key={topic.topic}
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    {topic.topic} · {topic.count}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-stone-200 bg-[#fcfbf8] p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                Publication links
              </p>
              <div className="mt-5 grid gap-3 text-sm leading-7 text-slate-600">
                <Link href="/archive" className="transition hover:text-slate-950">
                  Browse the full archive
                </Link>
                <Link href="/about" className="transition hover:text-slate-950">
                  About the publication
                </Link>
                <Link href="/editorial-policy" className="transition hover:text-slate-950">
                  Editorial policy
                </Link>
                <Link href="/services" className="transition hover:text-slate-950">
                  Advisory services
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}
