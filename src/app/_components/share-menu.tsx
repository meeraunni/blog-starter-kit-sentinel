"use client";

import { useState } from "react";

type Props = {
  title: string;
  url: string;
};

export default function ShareMenu({ title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const absoluteUrl = url.startsWith("http") ? url : url;
  const encodedUrl = encodeURIComponent(absoluteUrl);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "X",
      href: `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — fail quiet
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
      <span className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">Share</span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full border border-stone-300 bg-white px-3 py-1 transition hover:border-slate-950 hover:text-slate-950"
        >
          {link.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center rounded-full border border-stone-300 bg-white px-3 py-1 transition hover:border-slate-950 hover:text-slate-950"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
