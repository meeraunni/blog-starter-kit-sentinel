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
      <section className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(217,119,6,0.16),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.12),transparent_22%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f2937_100%)] text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-16">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-300">
                Sentinel Identity
              </p>
              <div className="mt-4 inline-flex px-0 py-2">
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  Microsoft Entra Blog
                </h1>
              </div>
            </div>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="rounded-xl border border-white/10 bg-white/10 p-2 shadow-[0_14px_30px_rgba(2,6,23,0.18)] backdrop-blur-sm"
            >
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this blog"
                aria-label="Search this blog"
                className="w-full rounded-lg border border-white/10 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400"
              />
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
