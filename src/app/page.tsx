import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/app/_components/header";
import HomeHero from "@/app/_components/home-hero";
import TopicGrid from "@/app/_components/topic-grid";
import SearchablePosts from "@/app/_components/searchable-posts";
import SubscribeForm from "@/app/_components/subscribe-form";
import StartHere from "@/app/_components/start-here";
import { getAllPosts, getAllPostSummaries } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    absolute: `${CMS_NAME} — Microsoft identity & infrastructure guidance`,
  },
  description:
    "Practical guidance on Microsoft Entra ID, Active Directory, Microsoft 365, Conditional Access, passkeys, hybrid identity, and Windows DNS.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${CMS_NAME} — Microsoft identity & infrastructure guidance`,
    description:
      "Practical Microsoft identity and infrastructure guidance for IT admins and engineers.",
    url: "/",
    type: "website",
  },
};

export default async function Index() {
  const allPosts = getAllPosts();
  const summaries = getAllPostSummaries();

  return (
    <main>
      <Header />
      <HomeHero postCount={allPosts.length} />
      <StartHere />
      <TopicGrid posts={allPosts} />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {summaries.length > 0 && (
          <Suspense fallback={<div className="py-16 text-sm text-slate-500">Loading article index…</div>}>
            <SearchablePosts posts={summaries} />
          </Suspense>
        )}
      </div>

      <section className="border-t border-stone-200 bg-[#fbfaf7]">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center lg:px-10">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
            New posts by email
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Get notified when a new article goes up. No marketing, no third-party lists.
          </p>
          <div className="mx-auto mt-6 max-w-xl text-left"><SubscribeForm /></div>
        </div>
      </section>
    </main>
  );
}
