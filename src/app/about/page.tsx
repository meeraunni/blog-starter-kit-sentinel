import Header from "@/app/_components/header";

export default function AboutPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">About</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
          Sentinel Identity is an independent technical blog focused on Microsoft identity operations.
        </h1>

        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600">
          <p>
            The site focuses on Microsoft Entra ID, Conditional Access, authentication protocols, DNS, tenant
            hardening, and operational troubleshooting for administrators, security teams, and cloud engineers.
          </p>
          <p>
            The goal is to publish content that helps readers understand how identity systems work in practice:
            what a control does, what happens in the backend, why a configuration fails, and how to reason about
            remediation without relying on shallow summaries.
          </p>
          <p>
            Content is written as long-form technical material and links official Microsoft documentation where
            product behavior, configuration requirements, or support boundaries need to be validated.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Topics</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Microsoft Entra, Conditional Access, MFA, passkeys, hybrid identity, authentication protocols,
              custom domains, Exchange Online DNS, and tenant security posture.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Audience</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Identity administrators, Microsoft 365 engineers, architects, and readers who need
              implementation-level explanations rather than light overview content.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Approach</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Articles are written as explanatory technical documents, with the emphasis on architecture, policy,
              operations, and troubleshooting rather than republishing generic summaries.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
