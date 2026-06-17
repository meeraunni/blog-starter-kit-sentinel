import type { Metadata } from "next";
import Header from "@/app/_components/header";
import Link from "next/link";
import { getAllPosts } from "@/lib/api";
import { getAllTopics } from "@/lib/post-taxonomy";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Sentinel Identity — an independent technical publication for Microsoft Entra, Microsoft 365, and identity engineering. Editorial standards, scope, and how to contact the editorial team.",
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  const posts = getAllPosts();
  const topics = getAllTopics().filter((topic) => topic.label !== "Microsoft Entra").length;

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <a href="/" className="hover:text-slate-900">Home</a>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-700">About</span>
        </nav>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">About</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
          Engineering-grade reference for Microsoft Entra and Microsoft 365.
        </h1>

        <div className="mt-8 space-y-6 text-lg leading-8 text-slate-600">
          <p>
            Sentinel Identity is an independent technical publication for Microsoft identity work. We write
            long-form explanations and field-tested troubleshooting for Microsoft Entra ID, Conditional Access,
            MFA, passkeys, hybrid identity, authentication protocols, Microsoft 365 DNS, and tenant operations.
          </p>
          <p>
            Our audience is the practitioner who already knows the basics — Microsoft 365 administrators, Azure
            and Entra engineers, security architects, SOC analysts — and needs the detail layer underneath: how a
            control actually evaluates, what the failure modes look like in sign-in logs, which knob to turn first
            in a production tenant, and where the Microsoft Learn documentation either covers it precisely or
            leaves a gap.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm font-medium text-slate-700">
          <span className="rounded-full border border-stone-300 bg-white px-4 py-2">
            {posts.length} published articles
          </span>
          <span className="rounded-full border border-stone-300 bg-white px-4 py-2">
            {topics} core topic groups
          </span>
          <Link
            href="/archive"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 transition hover:border-slate-950 hover:text-slate-950"
          >
            Browse archive
          </Link>
          <Link
            href="/editorial-policy"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 transition hover:border-slate-950 hover:text-slate-950"
          >
            Editorial policy
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-stone-300 bg-slate-950 px-4 py-2 text-white transition hover:bg-cyan-900"
          >
            Contact us
          </Link>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Scope</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Microsoft Entra ID and Microsoft 365 from the operator&apos;s seat: Conditional Access, MFA, passkeys,
              hybrid identity (PHS / PTA / federation), authentication protocols (OIDC, OAuth 2.0, SAML, WS-Fed,
              Kerberos, NTLM), custom domains and DNS records, and tenant hardening.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Audience</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Microsoft 365 administrators, Azure / Entra engineers, identity and access architects, SOC analysts,
              and DevOps teams supporting workforce or B2B tenants in production.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Approach</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Articles are written as reference documents, not marketing posts. We explain the architecture, walk
              the failure mode, and cite Microsoft Learn as the primary source. We update articles when product
              behaviour changes.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Editorial standards</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Primary sources</p>
              <p className="mt-3 text-base leading-8 text-slate-600">
                Every claim about Microsoft product behaviour is anchored to Microsoft Learn, an official
                Microsoft blog, or an RFC / specification. We do not source from anonymous forums.
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Human review</p>
              <p className="mt-3 text-base leading-8 text-slate-600">
                Drafts are edited by a human with hands-on Microsoft Entra experience. AI is used as a writing
                aid, never as the sole author. See{" "}
                <Link href="/editorial-policy" className="text-cyan-800 hover:text-slate-950">
                  Editorial Policy
                </Link>
                .
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Updates</p>
              <p className="mt-3 text-base leading-8 text-slate-600">
                Microsoft Entra changes constantly. We update articles as deprecation timelines, default settings,
                and Conditional Access behaviour shift, and we note material updates inline.
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Corrections</p>
              <p className="mt-3 text-base leading-8 text-slate-600">
                Spotted an error? Use the{" "}
                <Link href="/contact" className="text-cyan-800 hover:text-slate-950">
                  contact form
                </Link>{" "}
                — we typically acknowledge within two business days and publish a correction note when warranted.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">About the editor</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-[120px_minmax(0,1fr)] lg:items-start">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 text-xl font-semibold tracking-[0.22em] text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
              MUA
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">
                <Link href="/author/m-u" className="hover:text-cyan-900">
                  MU.A
                </Link>{" "}
                <span className="ml-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-800">
                  Microsoft 365 / Entra Engineer
                </span>
              </p>
              <p className="mt-3 text-base leading-8 text-slate-600">
                MU.A is a hands-on Microsoft 365 and Microsoft Entra engineer and the editor of Sentinel Identity.
                Every article published on this site is drafted, reviewed, and updated by the editor against
                Microsoft Learn and the underlying RFCs. See the full bio on the{" "}
                <Link href="/author/m-u" className="text-cyan-800 hover:text-slate-950">
                  author page
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-[2rem] border border-slate-200 bg-[#fbfaf7] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Independence</h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Sentinel Identity is operated independently of Microsoft. We are not a Microsoft publication and have
            no special access to non-public roadmap information. Microsoft, Microsoft Entra, Microsoft 365, and
            Azure are trademarks of Microsoft Corporation and are used here for descriptive purposes.
          </p>
          <p className="mt-4 text-base leading-8 text-slate-600">
            The site may display advertising through Google AdSense. Advertising never influences editorial. See
            our{" "}
            <Link href="/editorial-policy" className="text-cyan-800 hover:text-slate-950">
              Editorial Policy
            </Link>{" "}
            for the full standards we hold ourselves to.
          </p>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Contact</h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            For corrections, story ideas, licensing requests, or other questions, email{" "}
            <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
              info@sentinelidentity.ca
            </a>{" "}
            or use the{" "}
            <Link href="/contact" className="text-cyan-800 hover:text-slate-950">
              contact form
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
