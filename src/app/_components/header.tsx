import Link from "next/link";

const navItems = [
  { href: "/", label: "Journal" },
  { href: "/services", label: "Advisory" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-sm font-semibold tracking-[0.24em] text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]">
            SI
          </div>

          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-[0.18em] text-white md:text-xl">
              Sentinel Identity
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Security Engineering Journal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="mailto:hello@sentinelidentity.blog"
            className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-300/15 hover:text-white"
          >
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}
