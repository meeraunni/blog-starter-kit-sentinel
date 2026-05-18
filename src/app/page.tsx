import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/header";
import HomeHero from "@/app/_components/home-hero";
import TopicGrid from "@/app/_components/topic-grid";
import SearchablePosts from "@/app/_components/searchable-posts";
import { getAllPosts } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    absolute: `${CMS_NAME} — Microsoft Entra & Microsoft 365 articles`,
  },
  description:
    "Articles on Microsoft Entra ID, Microsoft 365, Conditional Access, passkeys, hybrid identity, and DNS — written for IT admins and engineers.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${CMS_NAME} — Microsoft Entra & Microsoft 365 articles`,
    description:
      "Articles on Microsoft Entra and Microsoft 365 for IT admins and engineers.",
    url: "/",
    type: "website",
  },
};

export default async function Index() {
  const allPosts = getAllPosts();

  return (
    <main>
      <Header />
      <HomeHero postCount={allPosts.length} />
      <TopicGrid posts={allPosts} />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {allPosts.length > 0 && <SearchablePosts posts={allPosts} />}
      </div>

      <section className="border-t border-stone-200 bg-[#fbfaf7]">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center lg:px-10">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
            New posts by email
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Get notified when a new article goes up. No marketing, no third-party lists.
          </p>
          <form action="/api/subscribe" method="POST" className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              required
              name="email"
              placeholder="you@example.com"
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-base text-slate-900 outline-none transition focus:border-cyan-700 sm:w-80"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900"
            >
              Subscribe
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-500">
            One email per new article. Unsubscribe anytime. See our{" "}
            <Link href="/privacy" className="underline hover:text-slate-900">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
