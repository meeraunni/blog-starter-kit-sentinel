import Link from "next/link";

const navItems = [
  { href: "/", label: "Blog" },
  { href: "/archive", label: "Archive" },
  { href: "/about", label: "About" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#fbfaf7]/88 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-300 bg-[#111827] text-sm font-semibold tracking-[0.24em] text-stone-100 shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
            SI
          </div>

          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-[0.08em] text-slate-950 md:text-xl">
              Sentinel Identity
            </span>
            <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Microsoft Entra Blog
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/archive"
            className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
          >
            Archive
          </Link>
        </div>
      </div>
    </header>
  );
}
