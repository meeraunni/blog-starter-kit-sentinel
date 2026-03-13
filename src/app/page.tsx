import Container from "@/app/_components/container";
import { HeroPost } from "@/app/_components/hero-post";
import { Intro } from "@/app/_components/intro";
import { MoreStories } from "@/app/_components/more-stories";
import { getAllPosts } from "@/lib/api";

export default async function Index() {
  const allPosts = getAllPosts();

  const heroPost = allPosts[0];
  const morePosts = allPosts.slice(1);

  return (
    <main>
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

        <section
          id="assessment-form"
          className="mx-auto max-w-6xl border-t border-neutral-200 px-6 py-16"
        >
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Assessment
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                Request a tenant security assessment
              </h2>

              <p className="mt-4 text-lg leading-8 text-neutral-700">
                Get one-on-one guidance on Microsoft Entra, Conditional Access,
                Azure identity, MFA strategy, and tenant hardening.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <form className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Company
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    What do you need help with?
                  </label>
                  <textarea
                    rows={5}
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Tell me about your Entra, Conditional Access, MFA, or tenant security needs."
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Submit request
                </button>
              </form>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}
