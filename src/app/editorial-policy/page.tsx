import Header from "@/app/_components/header";

export default function EditorialPolicyPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Editorial policy</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
          How articles are researched, written, and maintained.
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6 text-base leading-8 text-slate-600">
            <p>
              Sentinel Identity focuses on original technical writing about Microsoft identity, authentication,
              Conditional Access, DNS, and tenant operations. Articles are intended to explain how a system or
              control works, not just list steps copied from a wizard.
            </p>
            <p>
              Where product behavior, configuration paths, or support boundaries need verification, official
              Microsoft documentation is linked inline. This helps readers validate the underlying platform
              behavior and follow Microsoft guidance directly.
            </p>
            <p>
              Topics are selected based on operational relevance for Microsoft administrators, engineers, and
              security teams, with emphasis on troubleshooting, architecture, and implementation details.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Standards</h2>
            <div className="mt-5 grid gap-4 text-sm leading-7 text-slate-600">
              <p>Original long-form technical content with explanatory context and implementation detail.</p>
              <p>Official vendor documentation linked where claims need authoritative source backing.</p>
              <p>Articles updated over time as the site expands, especially where readers need clearer depth.</p>
              <p>No republication of third-party articles or scraped summaries.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
