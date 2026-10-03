"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PostSummary } from "@/interfaces/post";
import { MoreStories } from "./more-stories";

type Props = {
  posts: PostSummary[];
};

const PAGE_SIZE = 12;

// Only URL synchronisation waits for the browser; the article list renders on the server.
function QueryFromUrl({ onChange }: { onChange: (query: string) => void }) {
  const params = useSearchParams();
  const value = params.get("q") || "";
  useEffect(() => onChange(value), [value, onChange]);
  return null;
}

export default function SearchablePosts({ posts }: Props) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return posts;

    return posts.filter((post) => {
      const haystack = [
        post.title,
        post.excerpt,
        post.slug,
        post.author?.name,
        ...post.topics,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [posts, query]);

  return (
    <section id="articles" className="journal-articles">
      <Suspense fallback={null}>
        <QueryFromUrl onChange={setQuery} />
      </Suspense>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Explore the blog</p>
          <h2 className="journal-section-title">Recent articles</h2>
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
          className="w-full border-b border-stone-400 bg-transparent px-1 py-3 text-sm text-slate-900 sm:w-56"
        />
      </div>

      <p className="sr-only" role="status">
        {filteredPosts.length} matching articles
      </p>
      {filteredPosts.length > 0 ? (
        <>
          <MoreStories
            posts={filteredPosts.slice(0, visibleCount)}
            query={query}
          />
          {visibleCount < filteredPosts.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
              >
                Show more articles ({filteredPosts.length - visibleCount}{" "}
                remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base text-slate-600 dark:text-slate-300">
            No matches for &ldquo;{query}&rdquo;. Try a different keyword or
            browse{" "}
            <a
              href="/topics"
              className="text-cyan-800 hover:text-slate-950 dark:text-cyan-400 dark:hover:text-cyan-200"
            >
              all topics
            </a>
            .
          </p>
        </div>
      )}
      <a href="/archive" className="journal-text-link mt-8 inline-block">
        Browse the complete archive →
      </a>
    </section>
  );
}
