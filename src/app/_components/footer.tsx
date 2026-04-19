import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-[#fbfaf7]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">
            Sentinel Identity
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Technical writing on Microsoft identity, tenant design, and production troubleshooting.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Sentinel Identity is being shaped as a focused technical publication for engineers and IT admins who
            want implementation detail, not broad marketing summaries.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-slate-600 lg:justify-items-end">
          <Link href="/" className="transition hover:text-slate-950">
            Blog
          </Link>
          <Link href="/archive" className="transition hover:text-slate-950">
            Archive
          </Link>
          <Link href="/topics" className="transition hover:text-slate-950">
            Topics
          </Link>
          <Link href="/about" className="transition hover:text-slate-950">
            About
          </Link>
          <Link href="/editorial-policy" className="transition hover:text-slate-950">
            Editorial policy
          </Link>
          <Link href="/privacy" className="transition hover:text-slate-950">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-slate-950">
            Terms of Use
          </Link>
          <Link href="/cookies" className="transition hover:text-slate-950">
            Cookies
          </Link>
          <p className="pt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
            © 2026 Sentinel Identity. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
