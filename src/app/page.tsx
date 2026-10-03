import type { Metadata } from "next";
import Header from "@/app/_components/header";
import HomeHero from "@/app/_components/home-hero";
import TopicGrid from "@/app/_components/topic-grid";
import SearchablePosts from "@/app/_components/searchable-posts";
import SubscribeForm from "@/app/_components/subscribe-form";
import StartHere from "@/app/_components/start-here";
import { getAllPosts, getAllPostSummaries } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: `${CMS_NAME} — Notes on Microsoft identity` },
  description:
    "Troubleshooting guides, architecture explanations, and working notes on Microsoft Entra, Active Directory, and Microsoft 365. Free tools for identity administrators.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${CMS_NAME} — Notes on Microsoft identity`,
    description:
      "Know what broke. Understand why. Independent writing for Microsoft identity administrators.",
    url: "/",
    type: "website",
  },
};
export default function Index() {
  const posts = getAllPosts();
  return (
    <main>
      <Header />
      <HomeHero postCount={posts.length} />
      <div className="journal-width journal-library">
        <SearchablePosts posts={getAllPostSummaries()} />
        <TopicGrid posts={posts} />
      </div>
      <StartHere />
      <section id="subscribe" className="journal-width journal-newsletter">
        <div>
          <p className="eyebrow">Stay in the loop</p>
          <h2>
            A new note.
            <br />
            In your inbox.
          </h2>
          <p>
            Get an email when a new article is published. You can also follow
            the <a href="/feed.xml">RSS feed</a>.
          </p>
        </div>
        <SubscribeForm />
      </section>
    </main>
  );
}
