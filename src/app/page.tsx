import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { MoreStories } from "@/app/_components/more-stories";
import { getAllPosts } from "@/lib/api";

export default async function Index() {
  const allPosts = getAllPosts();

  return (
    <main className="relative overflow-hidden">
      <Header />

      <section className="border-b border-sky-700 bg-sky-600 text-white">
        <Container>
          <div className="grid gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-16">
            <div>
              <p className="text-sm font-medium text-sky-100">Sentinel Identity</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                Microsoft Entra Blog
              </h1>
            </div>

            <form className="rounded-xl bg-white p-2 shadow-[0_14px_30px_rgba(2,6,23,0.16)]">
              <input
                type="search"
                placeholder="Search this blog"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400"
              />
            </form>
          </div>
        </Container>
      </section>

      <Container>
        {allPosts.length > 0 && <MoreStories posts={allPosts} />}
      </Container>
    </main>
  );
}
