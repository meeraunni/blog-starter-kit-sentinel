import type { Metadata } from "next";
import Header from "@/app/_components/header";
import ContactForm from "@/app/_components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the Sentinel Identity editorial team. Email or use the contact form for questions, corrections, or feedback about Microsoft Entra and Microsoft 365 articles.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Sentinel Identity",
    description:
      "Reach the Sentinel Identity editorial team. Email or use the contact form for questions, corrections, or feedback.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <a href="/" className="hover:text-slate-900">
            Home
          </a>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-700">Contact</span>
        </nav>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Contact</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
          Reach the Sentinel Identity editorial team.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Questions about a post, a correction to suggest, a topic you would like to see covered, or feedback on
          a tenant scenario you cannot find clear guidance for — send it through. Real replies, not auto-responses.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] lg:p-10">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Send a message</h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Use the form below or email us directly. Replies typically arrive within two business days.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Direct email</p>
              <a
                href="mailto:info@sentinelidentity.ca"
                className="mt-3 block text-lg font-semibold tracking-[-0.02em] text-slate-950 transition hover:text-cyan-900"
              >
                info@sentinelidentity.ca
              </a>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                For corrections, takedown notices, or anything you want documented in a thread.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Topics we cover</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Microsoft Entra, Conditional Access, MFA, passkeys, hybrid identity, authentication protocols,
                Microsoft 365 DNS, and tenant troubleshooting. If you have an article request, mention it in the
                message.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Editorial standards</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Read our{" "}
                <a href="/editorial-policy" className="text-cyan-800 hover:text-slate-950">
                  editorial policy
                </a>{" "}
                and{" "}
                <a href="/about" className="text-cyan-800 hover:text-slate-950">
                  about page
                </a>{" "}
                to see how we source and update articles.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
