export function Intro() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),radial-gradient(circle_at_80%_0%,_rgba(14,165,233,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(30,41,59,0.9),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-50">
              SentinelIdentity.ca
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl lg:text-7xl">
              Microsoft identity reporting with the polish of a modern tech publication.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl md:leading-9">
              Sentinel Identity publishes sharp analysis on Entra ID, Conditional Access, MFA strategy, access
              design, and tenant resilience for practitioners who want both clarity and depth.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="#latest"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
              >
                Read latest articles
              </a>
              <a
                href="mailto:info@sentinelidentity.ca"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                info@sentinelidentity.ca
              </a>
            </div>
          </div>

          <div className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Editorial focus</p>
              <p className="mt-3 text-base leading-7 text-slate-200">
                Designed for security leaders, cloud architects, and Microsoft identity teams who need strong
                technical judgment without bloated presentation.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-3xl font-semibold text-white">Deep</p>
                <p className="mt-1 text-sm text-slate-400">Technical breakdowns without the clutter</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">Clear</p>
                <p className="mt-1 text-sm text-slate-400">Executive-ready framing for strategic decisions</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">Fast</p>
                <p className="mt-1 text-sm text-slate-400">Clean navigation into current guidance</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">Trusted</p>
                <p className="mt-1 text-sm text-slate-400">A sharper front door for your Sentinel brand</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
