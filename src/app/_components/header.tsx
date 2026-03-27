import Link from "next/link";

const navItems = [
  { href: "/", label: "Blog" },
  { href: "/services", label: "Advisory" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-700 text-sm font-semibold tracking-[0.24em] text-white shadow-[0_14px_36px_rgba(14,165,233,0.32)]">
            SI
          </div>

          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-[0.12em] text-white md:text-xl">
              Sentinel Identity
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
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
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/services#assessment"
            className="inline-flex items-center rounded-full border border-cyan-300/40 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-300/10 hover:text-white"
          >
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}
