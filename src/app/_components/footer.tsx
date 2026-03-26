import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Sentinel Identity
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            A premium Microsoft identity journal for practitioners, security architects, and decision-makers.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Insightful reporting, implementation notes, and advisory-led perspectives on Entra ID, Conditional
            Access, MFA strategy, and tenant resilience.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-slate-600 lg:justify-items-end">
          <Link href="/" className="transition hover:text-slate-950">
            Journal
          </Link>
          <Link href="/services" className="transition hover:text-slate-950">
            Advisory services
          </Link>
          <Link href="mailto:info@sentinelidentity.ca" className="transition hover:text-slate-950">
            info@sentinelidentity.ca
          </Link>
          <p className="pt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
            © 2026 Sentinel Identity. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
