import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/header";
import Breadcrumbs from "@/app/_components/breadcrumbs";
import { getMonetizationLinks } from "@/lib/monetization";

export const metadata: Metadata = {
  title: "Microsoft Entra Administrator Resources",
  description:
    "Practical Microsoft Entra administrator resources from Sentinel Identity, including the planned Entra Administrator Toolkit and fixed-price troubleshooting help.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Microsoft Entra Administrator Resources",
    description:
      "Practical Microsoft Entra administrator templates, checklists, and troubleshooting help from Sentinel Identity.",
    url: "/resources",
    type: "website",
  },
};

const toolkitContents = [
  "Conditional Access rollout-ring workbook",
  "Break-glass account verification checklist",
  "Authentication-methods and passkey readiness worksheet",
  "Identity change record and rollback template",
  "Sign-in failure triage worksheet",
  "Monthly Entra administrator review checklist",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Microsoft Entra Administrator Resources",
  description:
    "Practical Microsoft Entra administrator templates, checklists, and troubleshooting help from Sentinel Identity.",
  url: "https://sentinelidentity.ca/resources",
};

export default function ResourcesPage() {
  const links = getMonetizationLinks();

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
            { label: "Resources" },
          ]}
        />

        <div className="mt-8 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-800">
            Administrator resources
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            Practical tools for running Microsoft Entra—not another pile of product slides.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Sentinel Identity resources turn the operational parts of the articles into reusable checklists,
            worksheets, and direct troubleshooting help. Every paid resource is clearly separated from the free
            editorial library.
          </p>
        </div>

        <section className="mt-14 grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.07)] lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">
                First edition
              </p>
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-900">
                Launch price: CAD $49
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              Entra Administrator Toolkit
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              A planned set of original, editable working documents for administrators who need to assess a tenant,
              stage a control, document the change, and prove the result. It is designed as an operator&apos;s pack,
              not Microsoft courseware or a replacement for Microsoft Learn.
            </p>

            <h3 className="mt-8 text-lg font-semibold text-slate-950">Planned contents</h3>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-slate-700 sm:grid-cols-2">
              {toolkitContents.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {links.toolkitCheckout ? (
                <a
                  href={links.toolkitCheckout}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900"
                >
                  Buy the toolkit for CAD $49
                </a>
              ) : (
                <Link
                  href="/contact?subject=Entra%20Administrator%20Toolkit%20launch"
                  className="inline-flex items-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900"
                >
                  Join the launch list
                </Link>
              )}
              <span className="text-xs leading-6 text-slate-500">
                No purchase is available until the finished files and verified checkout are connected.
              </span>
            </div>
          </article>

          <aside className="space-y-7">
            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Need help now?
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
                60-minute Entra troubleshooting session
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Bring one defined Microsoft Entra, Conditional Access, authentication, or hybrid identity problem.
                The session includes focused investigation and a written next-step summary.
              </p>
              <p className="mt-5 text-lg font-semibold text-white">CAD $275</p>
              <Link
                href="/consulting#troubleshooting-session"
                className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                View session details
              </Link>
            </div>

            {links.support && (
              <div className="rounded-3xl border border-slate-200 bg-[#fbfaf7] p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800">
                  Support the publication
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Found an article useful?
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  One-time support helps keep the technical library free and independent. It never affects editorial
                  coverage or recommendations.
                </p>
                <a
                  href={links.support}
                  target="_blank"
                  rel="noopener"
                  className="mt-6 inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
                >
                  Support Sentinel Identity
                </a>
              </div>
            )}
          </aside>
        </section>

        <section className="mt-14 rounded-3xl border border-stone-200 bg-[#fbfaf7] p-8 lg:p-10">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Commercial transparency</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Paid resources and consulting support the publication, but do not buy editorial coverage. Product pages
            state exactly what is included, and checkout links appear only after the corresponding offer is ready to
            deliver. Read the full{" "}
            <Link href="/editorial-policy" className="text-cyan-800 hover:text-slate-950">
              editorial policy
            </Link>
            .
          </p>
        </section>
      </section>
    </main>
  );
}
