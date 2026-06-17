"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type PaletteEntry = {
  slug: string;
  title: string;
  excerpt: string;
  topics: string[];
  date: string;
};

export type PaletteTopic = {
  slug: string;
  label: string;
};

type Props = {
  posts: PaletteEntry[];
  topics: PaletteTopic[];
};

const STATIC_LINKS = [
  { href: "/", label: "Home", hint: "Latest articles" },
  { href: "/archive", label: "Archive", hint: "All posts by date" },
  { href: "/topics", label: "Topics", hint: "Browse by area" },
  { href: "/author/m-u", label: "About the editor", hint: "Author profile" },
  { href: "/contact", label: "Contact", hint: "Send a question or correction" },
  { href: "/editorial-policy", label: "Editorial policy", hint: "Sourcing, AI, corrections" },
  { href: "/feed.xml", label: "RSS feed", hint: "Subscribe via reader" },
];

function tokenise(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function score(haystackTokens: string[], queryTokens: string[]) {
  if (queryTokens.length === 0) return 0;
  let total = 0;
  for (const q of queryTokens) {
    let bestForToken = 0;
    for (const h of haystackTokens) {
      if (h === q) bestForToken = Math.max(bestForToken, 1);
      else if (h.startsWith(q)) bestForToken = Math.max(bestForToken, 0.8);
      else if (h.includes(q)) bestForToken = Math.max(bestForToken, 0.55);
    }
    if (bestForToken === 0) return 0;
    total += bestForToken;
  }
  return total;
}

export default function CommandPalette({ posts, topics }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const triggerKey = isMac ? e.metaKey : e.ctrlKey;
      if (triggerKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        posts: posts.slice(0, 6),
        topics: topics.slice(0, 4),
        pages: STATIC_LINKS,
      };
    }

    const qTokens = tokenise(q);

    const postsScored = posts
      .map((post) => ({
        post,
        s: score(tokenise(`${post.title} ${post.excerpt} ${post.topics.join(" ")} ${post.slug}`), qTokens),
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => x.post);

    const topicsScored = topics
      .map((t) => ({ t, s: score(tokenise(t.label), qTokens) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.t);

    const pagesScored = STATIC_LINKS
      .map((p) => ({ p, s: score(tokenise(`${p.label} ${p.hint}`), qTokens) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.p);

    return { posts: postsScored, topics: topicsScored, pages: pagesScored };
  }, [query, posts, topics]);

  type FlatItem =
    | { kind: "post"; href: string; title: string; sub: string }
    | { kind: "topic"; href: string; title: string; sub: string }
    | { kind: "page"; href: string; title: string; sub: string };

  const flat: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = [];
    for (const post of results.posts) {
      out.push({
        kind: "post",
        href: `/posts/${post.slug}`,
        title: post.title,
        sub: post.topics.join(" · ") || "Article",
      });
    }
    for (const topic of results.topics) {
      out.push({
        kind: "topic",
        href: `/topics/${topic.slug}`,
        title: topic.label,
        sub: "Topic",
      });
    }
    for (const page of results.pages) {
      out.push({ kind: "page", href: page.href, title: page.label, sub: page.hint });
    }
    return out;
  }, [results]);

  function activate(href: string) {
    setOpen(false);
    setQuery("");
    if (href.startsWith("http") || href === "/feed.xml") {
      window.location.href = href;
    } else {
      router.push(href);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) activate(item.href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search the blog"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="palette-panel">
        <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search articles, error codes, topics…"
            className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            aria-label="Search"
          />
          <kbd className="hidden rounded border border-stone-300 bg-stone-50 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wider text-slate-500 sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {flat.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">
              Nothing matched <span className="text-slate-900">&ldquo;{query}&rdquo;</span>. Try a topic, an error code (AADSTS50158), or a cmdlet name.
            </div>
          ) : (
            <PaletteResults flat={flat} activeIndex={activeIndex} onActivate={activate} />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-2 text-[0.7rem] text-slate-500">
          <div className="flex items-center gap-3">
            <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wider text-slate-600">↑↓</kbd>
            <span>navigate</span>
            <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wider text-slate-600">↵</kbd>
            <span>open</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wider text-slate-600">⌘K</kbd>
            <span>toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaletteResults({
  flat,
  activeIndex,
  onActivate,
}: {
  flat: Array<{ kind: "post" | "topic" | "page"; href: string; title: string; sub: string }>;
  activeIndex: number;
  onActivate: (href: string) => void;
}) {
  let lastKind: string | null = null;
  return (
    <ul role="listbox" className="py-2">
      {flat.map((item, i) => {
        const showHeader = item.kind !== lastKind;
        lastKind = item.kind;
        return (
          <li key={`${item.kind}-${item.href}`}>
            {showHeader && (
              <p className="mt-1 px-4 pt-2 pb-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {item.kind === "post" ? "Articles" : item.kind === "topic" ? "Topics" : "Site"}
              </p>
            )}
            <Link
              role="option"
              aria-selected={i === activeIndex}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                onActivate(item.href);
              }}
              className={`mx-2 flex items-start gap-3 rounded-lg px-3 py-2.5 transition ${
                i === activeIndex ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-stone-100"
              }`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[0.6rem] font-bold uppercase tracking-wider ${
                  i === activeIndex ? "bg-white/20 text-white" : "bg-stone-100 text-slate-500"
                }`}
              >
                {item.kind === "post" ? "A" : item.kind === "topic" ? "T" : "·"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className={`truncate text-sm font-medium ${i === activeIndex ? "text-white" : "text-slate-950"}`}>
                  {item.title}
                </p>
                <p className={`truncate text-[0.7rem] ${i === activeIndex ? "text-white/70" : "text-slate-500"}`}>
                  {item.sub}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
