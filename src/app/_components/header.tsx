"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Articles" },
  { href: "/topics", label: "Topics" },
  { href: "/archive", label: "Archive" },
  { href: "/consulting", label: "Consulting" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function openSearch() {
  // Dispatch a synthetic Cmd+K to trigger the global command palette
  const ev = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: navigator.platform.toUpperCase().includes("MAC"),
    ctrlKey: !navigator.platform.toUpperCase().includes("MAC"),
    bubbles: true,
  });
  window.dispatchEvent(ev);
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().includes("MAC"));
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#fbfaf7]/92 backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5 lg:px-10">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-[#111827] text-[0.7rem] font-bold tracking-[0.24em] text-stone-100 shadow-[0_8px_20px_rgba(15,23,42,0.18)] dark:border-slate-700">
            SI
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.95rem] font-semibold tracking-[0.04em] text-slate-950 dark:text-slate-50">
              Sentinel Identity
            </span>
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Entra &amp; M365 Reference
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "text-slate-950 dark:text-slate-50"
                    : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-cyan-700 dark:bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search articles"
            className="hidden items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3 py-1.5 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-100 md:inline-flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search</span>
            <kbd className="ml-1 rounded border border-stone-300 bg-stone-50 px-1.5 py-0 text-[0.6rem] font-semibold tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-slate-900 transition hover:border-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-stone-200 bg-[#fbfaf7] dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSearch();
              }}
              className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search articles
            </button>
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-2xl px-4 py-3 text-base font-medium transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-white hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
