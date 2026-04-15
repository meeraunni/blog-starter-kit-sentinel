"use client";

import { useMemo, useState } from "react";
import { Post } from "@/interfaces/post";
import { MoreStories } from "./more-stories";

type Props = {
  posts: Post[];
};

export default function SearchablePosts({ posts }: Props) {
  const [query, setQuery] = useState("");

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return posts;
    }

    return posts.filter((post) => {
      const haystack = [
        post.title,
        post.excerpt,
        post.slug,
        post.author?.name,
        post.content,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [posts, query]);

  return (
    <>
      <section className="border-b border-stone-200 bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_65%,#ffffff_100%)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-8 py-14 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-start lg:py-18">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">
                Sentinel Identity
              </p>
              <div className="mt-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 md:text-6xl">
                  Microsoft Entra Blog
                </h1>
              </div>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Field notes, implementation detail, and architecture analysis for engineers and IT admins
                working with Microsoft identity.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-slate-600">
                <span className="rounded-full border border-stone-300 bg-white px-4 py-2">Conditional Access</span>
                <span className="rounded-full border border-stone-300 bg-white px-4 py-2">Passkeys</span>
                <span className="rounded-full border border-stone-300 bg-white px-4 py-2">Authentication</span>
                <span className="rounded-full border border-stone-300 bg-white px-4 py-2">DNS and Domains</span>
              </div>
            </div>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="rounded-[1.75rem] border border-stone-300 bg-[#111827] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
            >
              <div className="mb-3 px-2 pt-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-300">
                Search the archive
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this blog"
                aria-label="Search this blog"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400"
              />
              <p className="px-2 pb-1 pt-3 text-sm leading-6 text-stone-300">
                Search titles, excerpts, and article body text for Entra topics, error codes, and design patterns.
              </p>
            </form>
          </div>
        </div>
      </section>

      {filteredPosts.length > 0 ? (
        <MoreStories posts={filteredPosts} query={query} />
      ) : (
        <section id="latest" className="pb-20 pt-10 lg:pb-24 lg:pt-12">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              Recent Blogs
            </h2>
          </div>
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              No matching posts found
            </h3>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Try searching for a Microsoft Entra topic like passkeys, Conditional Access, PRT, guest access, or
              device join.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
