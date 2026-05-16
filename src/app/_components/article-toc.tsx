"use client";

import { useEffect, useState } from "react";
import { TableOfContentsItem } from "@/lib/post-format";

type Props = {
  items: TableOfContentsItem[];
};

export default function ArticleToc({ items }: Props) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) {
      return;
    }

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (headings.length === 0) {
      return;
    }

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        });

        if (visible.size > 0) {
          // Choose the heading with the highest visibility (or first if tied)
          let bestId: string | null = null;
          let bestRatio = -1;
          for (const heading of headings) {
            const ratio = visible.get(heading.id);
            if (ratio !== undefined && ratio > bestRatio) {
              bestRatio = ratio;
              bestId = heading.id;
            }
          }
          if (bestId) {
            setActiveId(bestId);
          }
        }
      },
      {
        rootMargin: "-96px 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => {
      observer.disconnect();
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">In this article</p>
      <ul className="mt-4 space-y-2 border-l border-stone-200">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
              <a
                href={`#${item.id}`}
                className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm leading-6 transition ${
                  isActive
                    ? "border-cyan-700 font-medium text-slate-950"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
                }`}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
