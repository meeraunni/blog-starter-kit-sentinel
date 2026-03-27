import Header from "@/app/_components/header";
import ConsultingForm from "@/app/_components/consulting-form";

const services = [
  {
    title: "Conditional Access review",
    description:
      "Review existing Conditional Access policies, identify coverage gaps, reduce user friction, and improve policy architecture.",
  },
  {
    title: "Entra tenant assessment",
    description:
      "Assess Microsoft Entra identity posture, authentication design, admin exposure, and tenant hardening opportunities.",
  },
  {
    title: "Identity troubleshooting",
    description:
      "Support for sign-in issues, MFA problems, access failures, app registration confusion, and admin troubleshooting.",
  },
];

export default function ServicesPage() {
  return (
    <main>
      <Header />

      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100">
            Sentinel Identity Advisory
          </p>

          <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
            Strategic Microsoft identity consulting with editorial clarity.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Advisory support for security teams that need stronger tenant posture, better Conditional Access design,
            and sharper decision-making around authentication and identity operations.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Services</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              Engagements designed for real-world identity programs.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Tailored reviews and implementation guidance for Microsoft Entra administrators, security leads, and
            organizations maturing their access controls.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
            >
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{service.title}</h3>
              <p className="mt-4 text-base leading-8 text-slate-600">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="assessment" className="border-t border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,1fr)] lg:px-10 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Assessment</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              Request a tenant security assessment.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Share your Microsoft Entra, Conditional Access, MFA, or tenant hardening needs. We will review the
              request and recommend the right advisory path.
            </p>
          </div>

          <ConsultingForm />
        </div>
      </section>
    </main>
  );
}
