import Link from "next/link";

export default function HomeHero({ postCount }: { postCount: number }) {
  return (
    <section className="relative overflow-hidden border-b border-stone-200/70 bg-[linear-gradient(180deg,_#f6f3ec_0%,_#fbfaf7_55%,_#ffffff_100%)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_-10%,_rgba(8,145,178,0.12),_transparent_45%),radial-gradient(circle_at_-10%_120%,_rgba(15,23,42,0.08),_transparent_45%)]" />
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-white/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-cyan-900 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-cyan-700" />
              Microsoft Entra &amp; Microsoft 365 reference
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 md:text-6xl">
              Engineering-grade writing for the people who run Microsoft identity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl md:leading-9">
              Long-form troubleshooting and architecture for Microsoft Entra ID, Conditional Access, MFA,
              passkeys, hybrid identity, and Microsoft 365 DNS — sourced from Microsoft Learn, written for
              practitioners who ship.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#articles"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900"
              >
                Browse {postCount} articles
              </Link>
              <Link
                href="/topics"
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
              >
                Browse by topic
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center text-sm font-medium text-slate-600 transition hover:text-slate-950"
              >
                Editorial standards →
              </Link>
            </div>

            <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-4 border-t border-slate-200 pt-6 text-sm text-slate-600 md:grid-cols-3">
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Audience
                </dt>
                <dd className="mt-1 text-slate-900">Admins, engineers, architects</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Sourcing
                </dt>
                <dd className="mt-1 text-slate-900">Primary: Microsoft Learn, RFCs</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Cadence
                </dt>
                <dd className="mt-1 text-slate-900">Long-form, updated as Entra changes</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">In this reference</p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-700" />
                  <span>
                    <strong className="text-slate-950">Conditional Access</strong> — evaluation pipeline, common
                    block patterns, sign-in log forensics.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-700" />
                  <span>
                    <strong className="text-slate-950">Passkeys &amp; FIDO2</strong> — registration policies,
                    attestation, troubleshooting.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-700" />
                  <span>
                    <strong className="text-slate-950">Hybrid identity</strong> — PHS, PTA, federation, PRT
                    failure modes.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-700" />
                  <span>
                    <strong className="text-slate-950">Authentication protocols</strong> — OAuth, OIDC, SAML,
                    Kerberos, WS-Fed.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-700" />
                  <span>
                    <strong className="text-slate-950">Microsoft 365 DNS</strong> — custom domains, MX, SPF,
                    DKIM, DMARC.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
