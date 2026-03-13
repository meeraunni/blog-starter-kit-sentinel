export default function ServicesPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Sentinel Identity
          </p>

          <h1 className="text-4xl font-semibold tracking-tight text-black md:text-6xl">
            Services
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            One-on-one Microsoft identity and security consulting for admins, teams, and growing organizations.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black">
              Conditional Access review
            </h2>
            <p className="mt-3 text-base leading-7 text-neutral-700">
              Review existing Conditional Access policies, identify coverage gaps,
              reduce user friction, and improve policy architecture.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black">
              Entra tenant assessment
            </h2>
            <p className="mt-3 text-base leading-7 text-neutral-700">
              Assess Microsoft Entra identity posture, authentication design,
              admin exposure, and tenant hardening opportunities.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black">
              Identity troubleshooting
            </h2>
            <p className="mt-3 text-base leading-7 text-neutral-700">
              Support for sign-in issues, MFA problems, access failures,
              app registration confusion, and admin troubleshooting.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Assessment
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                Request a tenant security assessment
              </h2>

              <p className="mt-4 text-lg leading-8 text-neutral-700">
                Share what you need help with and I will review your request for Microsoft Entra,
                Conditional Access, Azure identity, MFA strategy, and tenant hardening support.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <form className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Company
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    What do you need help with?
                  </label>
                  <textarea
                    rows={5}
                    className="w-full rounded-md border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Tell me about your Entra, Conditional Access, MFA, or tenant security needs."
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Submit request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
