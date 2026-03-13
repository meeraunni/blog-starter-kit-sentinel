 export function Intro() {
  return (
    <section className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              SentinelIdentity.ca
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-black md:text-5xl">
              Microsoft Identity and Security Insights
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
              Expert notes on Microsoft Entra, Conditional Access, tenant hardening,
              access design, and security operations for modern organizations.
            </p>
          </div>

          <div className="rounded-sm border border-neutral-200 bg-neutral-50 p-6">
            <h2 className="text-xl font-semibold text-black">
              Need a tenant security assessment?
            </h2>

            <p className="mt-3 text-base leading-7 text-neutral-700">
              Get practical one-on-one guidance on Microsoft Entra, identity security,
              Conditional Access design, and tenant hardening.
            </p>

            <div className="mt-5">
              <a
                href="#assessment-form"
                className="inline-flex items-center rounded-sm bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Request an assessment
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
