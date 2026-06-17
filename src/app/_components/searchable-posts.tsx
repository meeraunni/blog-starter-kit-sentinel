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
    if (!normalizedQuery) return posts;

    return posts.filter((post) => {
      const haystack = [post.title, post.excerpt, post.slug, post.author?.name, post.content]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [posts, query]);

  return (
    <section id="articles" className="py-12 lg:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50 md:text-3xl">
            Latest articles
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {posts.length} published · search by title, error code, or topic
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles"
          aria-label="Search articles"
          className="w-full rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:placeholder:text-slate-500 sm:w-80"
        />
      </div>

      {filteredPosts.length > 0 ? (
        <MoreStories posts={filteredPosts} query={query} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base text-slate-600 dark:text-slate-300">
            No matches for &ldquo;{query}&rdquo;. Try a different keyword or browse{" "}
            <a href="/topics" className="text-cyan-800 hover:text-slate-950 dark:text-cyan-400 dark:hover:text-cyan-200">
              all topics
            </a>
            .
          </p>
        </div>
      )}
    </section>
  );
}
