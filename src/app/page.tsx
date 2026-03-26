import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { HeroPost } from "@/app/_components/hero-post";
import { Intro } from "@/app/_components/intro";
import { MoreStories } from "@/app/_components/more-stories";
import { getAllPosts } from "@/lib/api";

export default async function Index() {
  const allPosts = getAllPosts();

  const heroPost = allPosts[0];
  const morePosts = allPosts.slice(1);

  return (
    <main className="relative overflow-hidden">
      <Header />
      <Intro />

      <Container>
        <section className="relative py-10">
          <div className="grid gap-6 rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
                Why it feels better
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                Built to read like a premium security publication, not a default blog shell.
              </h2>
            </div>

            <div className="grid gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-slate-50 p-5">
                Stronger hierarchy, tighter spacing, and a more editorial first impression.
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-5">
                Clear contact path for advisory conversations at info@sentinelidentity.ca.
              </div>
            </div>
          </div>
        </section>

        {heroPost && (
          <HeroPost
            title={heroPost.title}
            coverImage={heroPost.coverImage}
            date={heroPost.date}
            author={heroPost.author}
            slug={heroPost.slug}
            excerpt={heroPost.excerpt}
          />
        )}

        {morePosts.length > 0 && <MoreStories posts={morePosts} />}

        <section className="pb-24">
          <div className="overflow-hidden rounded-[2.25rem] border border-slate-200 bg-slate-950 px-6 py-10 text-white shadow-[0_40px_100px_rgba(2,6,23,0.28)] lg:px-10 lg:py-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
                  Contact
                </p>
                <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                  Need identity advisory support or want to discuss a topic?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                  Sentinel Identity combines blog-quality clarity with practitioner-level technical depth. Reach
                  out for consulting conversations, article feedback, or collaboration.
                </p>
              </div>

              <a
                href="mailto:info@sentinelidentity.ca"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
              >
                info@sentinelidentity.ca
              </a>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}
