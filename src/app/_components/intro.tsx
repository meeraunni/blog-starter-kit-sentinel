export function Intro() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,1))]" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100">
              Trusted Microsoft Identity Analysis
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl lg:text-7xl">
              A premium editorial home for Microsoft identity strategy.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl md:leading-9">
              Sentinel Identity blends deep technical guidance with executive-ready analysis on Microsoft Entra,
              Conditional Access, MFA, and tenant hardening.
            </p>
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Editorial standards</p>
              <p className="mt-3 text-base leading-7 text-slate-200">
                Clear research, practical implementation guidance, and sharp writing designed to feel closer to a
                modern product newsroom than a default starter blog.
              </p>
            </div>

            <div className="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-3 sm:gap-6">
              <div>
                <p className="text-3xl font-semibold text-white">10+</p>
                <p className="mt-1 text-sm text-slate-400">Identity deep-dives</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">M365</p>
                <p className="mt-1 text-sm text-slate-400">Security context</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">CISO</p>
                <p className="mt-1 text-sm text-slate-400">Decision-ready framing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
