import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/header";
import Breadcrumbs from "@/app/_components/breadcrumbs";

export const metadata: Metadata = {
  title: "Consulting — Microsoft Entra & Microsoft 365 Advisory",
  description:
    "Consulting services for Microsoft Entra, Microsoft 365, and Windows Server identity: tenant assessments, Conditional Access design, PIM and identity governance rollout, incident support, and ongoing advisory retainers.",
  alternates: { canonical: "/consulting" },
  openGraph: {
    title: "Consulting — Microsoft Entra & Microsoft 365 Advisory",
    description:
      "Consulting for Microsoft Entra, Microsoft 365, and Windows Server identity. Tenant assessments, CA/PIM rollout, IGA implementation, incident support, advisory retainers.",
    url: "/consulting",
    type: "website",
  },
};

const services = [
  {
    title: "Tenant assessment",
    tagline: "A structured review of your Microsoft Entra tenant with a written findings report.",
    body:
      "Two-week engagement. I audit Conditional Access, PIM configuration, authentication methods, sign-in log signals, guest and B2B posture, and hybrid identity health. You get a written report with prioritised findings, risk ratings, and a remediation roadmap you can execute against.",
    fit: "You know your Entra posture drifted somewhere over the last few years and you want an outside view before something breaks.",
    rate: "From CAD $6,500",
  },
  {
    title: "Conditional Access & MFA rollout",
    tagline: "Design and implement a full Conditional Access policy set from scratch or from a legacy configuration.",
    body:
      "Four to eight week project depending on tenant size. Covers policy design, ring-based rollout planning, phishing-resistant Authentication Strengths, break-glass account hardening, and monitoring. Includes documentation and a runbook for future changes.",
    fit: "You're on per-user MFA or Security Defaults and need to move to a proper Conditional Access model without locking anyone out.",
    rate: "CAD $12,000 – $35,000",
  },
  {
    title: "Identity governance implementation",
    tagline: "PIM, Entitlement Management, Access Reviews, and Access Packages deployed as a working system.",
    body:
      "Six to twelve week project depending on the number of roles, resources, and stakeholder teams. Covers PIM configuration for privileged roles, Entitlement Management catalog and access package design, Access Review scheduling, and monitoring KQL for each.",
    fit: "You have Entra ID Governance licenses and haven't operationalised them yet, or the initial rollout stalled.",
    rate: "CAD $20,000 – $75,000",
  },
  {
    title: "Incident support",
    tagline: "Hourly help for specific incidents your team can't crack.",
    body:
      "Same-day availability for active incidents. Common shapes: unexplained Conditional Access blocks, sign-in log forensics, PRT and token issues, hybrid identity replication failures, mail flow authentication problems, unexpected policy behaviour after a Microsoft change.",
    fit: "You have a ticket that's been open for two weeks and nobody on your team has time to dig into it properly.",
    rate: "CAD $275 / hour",
  },
  {
    title: "Advisory retainer",
    tagline: "A monthly retainer for teams that want ongoing access without one-off engagements.",
    body:
      "Monthly retainer with a defined block of hours. Use them for architecture questions, design reviews, quarterly tenant health checks, or on-demand access when Microsoft ships something new that affects your environment. Unused hours don't roll over; predictable spend.",
    fit: "You have an internal team that can execute but wants a specialist to talk through architecture decisions and validate designs.",
    rate: "From CAD $2,500 / month",
  },
];

const engagementTypes = [
  {
    label: "Hourly",
    detail: "For incident support and short investigations. Billed weekly against actual hours.",
  },
  {
    label: "Fixed-scope project",
    detail: "For assessments and rollouts. Scope, deliverables, and price agreed up front. Milestone-based invoicing.",
  },
  {
    label: "Monthly advisory retainer",
    detail: "For teams that want ongoing access. Defined hours per month, prepaid, invoiced monthly.",
  },
];

const audience = [
  "Microsoft 365 and Azure admins in mid-market and enterprise organisations",
  "MSPs and IT consultancies serving Microsoft-heavy clients",
  "Security teams inheriting a tenant they didn't originally build",
  "Internal identity teams running their first Conditional Access or IGA rollout",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Sentinel Identity Consulting",
  description:
    "Consulting for Microsoft Entra, Microsoft 365, and Windows Server identity: tenant assessments, Conditional Access design, PIM and identity governance rollout, incident support, and advisory retainers.",
  url: "https://sentinelidentity.ca/consulting",
  areaServed: "Worldwide (remote)",
  serviceType: "Microsoft Entra and Microsoft 365 consulting",
  provider: {
    "@type": "Organization",
    name: "Sentinel Identity",
    url: "https://sentinelidentity.ca",
    email: "info@sentinelidentity.ca",
  },
  priceRange: "CAD $275/hour to CAD $75,000/project",
};

export default function ConsultingPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Consulting" },
          ]}
        />

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-800">
            Consulting
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            Microsoft Entra and Microsoft 365 consulting for teams that need a specialist in the room.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            The articles on this site are the reference material. The consulting is the direct engagement — tenant
            assessments, Conditional Access rollouts, identity governance implementation, and incident support for
            organisations running Microsoft identity in production.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <a
              href="mailto:info@sentinelidentity.ca?subject=Consulting%20enquiry"
              className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 font-semibold text-white transition hover:bg-cyan-900"
            >
              Email to discuss an engagement
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-5 py-2.5 font-medium text-slate-900 transition hover:border-slate-950"
            >
              Or use the contact form
            </Link>
          </div>
        </div>

        {/* Services */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Services</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
            Five ways to work together, in rough order of engagement size.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">
                    {service.title}
                  </h3>
                  <span className="whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900">
                    {service.rate}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-cyan-800">{service.tagline}</p>
                <p className="mt-4 text-base leading-7 text-slate-600">{service.body}</p>
                <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">
                  <span className="font-semibold text-slate-700">Fit:</span> {service.fit}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Engagement types */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">How I work</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
            Three engagement models. The right one depends on the shape of the work rather than the size of your
            organisation.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {engagementTypes.map((type) => (
              <div
                key={type.label}
                className="rounded-2xl border border-slate-200 bg-[#fbfaf7] p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-800">
                  {type.label}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{type.detail}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-500">
            Rates shown above are indicative ranges in Canadian dollars, exclusive of GST/HST. Final quotes are
            confirmed in writing after an initial scoping call. All engagements are covered by a mutual NDA before
            any tenant details are shared. Non-profit, education, and public-sector discounts available on request.
          </p>
        </section>

        {/* Audience */}
        <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 lg:p-10">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Who I typically work with</h2>
          <ul className="mt-6 grid gap-3 text-base leading-7 text-slate-600 md:grid-cols-2">
            {audience.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-700" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Independence / editorial note */}
        <section className="mt-16 rounded-3xl border border-slate-200 bg-[#fbfaf7] p-8 lg:p-10">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Independence and editorial</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Consulting work is separate from what gets published on this site. The articles are not vendor-sponsored,
            and consulting engagements never determine what gets written about. Client tenant details are covered by
            NDA and never appear in published content. The relevant details are in the{" "}
            <Link href="/editorial-policy" className="text-cyan-800 hover:text-slate-950">
              editorial policy
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" className="text-cyan-800 hover:text-slate-950">
              privacy policy
            </Link>
            .
          </p>
        </section>

        {/* CTA */}
        <section className="mt-16 text-center">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Start a conversation</h2>
          <p className="mt-3 max-w-2xl mx-auto text-base leading-7 text-slate-600">
            Send a short note describing what you're trying to solve and roughly the timeline you're working with.
            First reply usually within one business day.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <a
              href="mailto:info@sentinelidentity.ca?subject=Consulting%20enquiry"
              className="inline-flex items-center rounded-full bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-cyan-900"
            >
              info@sentinelidentity.ca
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-6 py-3 font-medium text-slate-900 transition hover:border-slate-950"
            >
              Contact form
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
