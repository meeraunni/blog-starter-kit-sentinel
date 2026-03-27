import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { HeroPost } from "@/app/_components/hero-post";
import { MoreStories } from "@/app/_components/more-stories";
import { getAllPosts } from "@/lib/api";

export default async function Index() {
  const allPosts = getAllPosts();

  const heroPost = allPosts[0];
  const morePosts = allPosts.slice(1);

  return (
    <main className="relative overflow-hidden">
      <Header />

      <Container>
        <section className="border-b border-slate-200/80 py-10 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
                Journal
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 md:text-5xl">
                Microsoft identity articles, notes, and field observations.
              </h1>
            </div>

            <p className="max-w-xl text-base leading-8 text-slate-600">
              Sentinel Identity publishes focused writing on Entra ID, Conditional Access, authentication flows,
              and tenant hardening.
            </p>
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
      </Container>
    </main>
  );
}
