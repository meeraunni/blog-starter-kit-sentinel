import Container from "@/app/_components/container";
import ConsultingForm from "@/app/_components/consulting-form";
import Header from "@/app/_components/header";
import { HeroPost } from "@/app/_components/hero-post";
import { Intro } from "@/app/_components/intro";
import { MoreStories } from "@/app/_components/more-stories";
import SubscribeForm from "@/app/_components/subscribe-form";
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

        <section id="consulting" className="pb-24 pt-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 px-6 py-10 text-white shadow-[0_40px_100px_rgba(2,6,23,0.22)] lg:px-8 lg:py-10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
                  Advisory
                </p>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                  Need help assessing a Microsoft Entra tenant?
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">
                  Use the intake form to request a review of Conditional Access, authentication posture, admin
                  exposure, or broader tenant hardening concerns.
                </p>
                <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                  Share the current issue, the scope of your tenant, and the type of review you need.
                </div>
              </div>
            </div>

            <ConsultingForm />
          </div>
        </section>

        <section className="pb-24">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] lg:items-start">
            <div className="pt-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
                Newsletter
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                Let readers subscribe for new posts.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                Readers can join the list here and you can manage follow-up publishing workflows separately.
              </p>
            </div>

            <SubscribeForm />
          </div>
        </section>
      </Container>
    </main>
  );
}
