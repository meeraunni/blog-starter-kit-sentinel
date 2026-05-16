import type { Metadata } from "next";
import Header from "@/app/_components/header";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description:
    "How Sentinel Identity researches, writes, sources, and updates articles on Microsoft Entra, Microsoft 365, and identity engineering — including AI use, corrections process, and advertising standards.",
  alternates: { canonical: "/editorial-policy" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 1, 2026";

export default function EditorialPolicyPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-10 lg:py-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <a href="/" className="hover:text-slate-900">Home</a>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-700">Editorial Policy</span>
        </nav>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Editorial Policy</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
          How articles are researched, written, and maintained.
        </h1>
        <p className="mt-4 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10 text-base leading-8 text-slate-600">
          <p>
            Sentinel Identity is an independent technical publication. This page documents how we choose, write,
            source, and update articles so readers can evaluate what they are reading. We expect to be held to it.
          </p>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">1. Scope and audience</h2>
            <p className="mt-4">
              Articles target practising Microsoft identity administrators, Microsoft 365 engineers, SOC analysts,
              and cloud security architects. The depth assumes familiarity with Microsoft Entra concepts and aims
              for the level of detail that helps with real production decisions — not introductory overviews.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">2. Topic selection</h2>
            <p className="mt-4">Topics are chosen on three criteria:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>Operational relevance — does this come up in real tenants, real escalations, or real architecture reviews?</li>
              <li>Gap in available public material — is the existing public coverage thin, outdated, or marketing-flavoured?</li>
              <li>Long-shelf-life value — will the article still be useful in 12 to 24 months, or is it a fast-moving preview that we should defer?</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">3. Sourcing standards</h2>
            <p className="mt-4">
              Articles rely on primary sources wherever possible. Claims about Microsoft product behavior,
              licensing, deprecation timelines, or support boundaries are linked inline to one or more of the
              following:
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>Microsoft Learn documentation.</li>
              <li>Microsoft Entra and Microsoft 365 official blogs and product release notes.</li>
              <li>Microsoft Tech Community posts authored by Microsoft staff.</li>
              <li>RFCs and other IETF / W3C / FIDO Alliance specifications for protocol material.</li>
              <li>Vendor partner documentation when the article concerns a specific integration.</li>
            </ul>
            <p className="mt-4">
              We do not source from anonymous forums for factual claims. Where community sources or our own
              testing are the only data point, the article says so explicitly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">4. Original content</h2>
            <p className="mt-4">
              Articles are written for this site. We do not republish or paraphrase third-party blog posts. Short
              quotations from Microsoft Learn or RFCs are used with attribution where they materially help the
              explanation. We never copy substantial sections of another author&apos;s work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">5. AI assistance disclosure</h2>
            <p className="mt-4">
              We use large language models as drafting and editing aids — for outline review, prose tightening,
              and catching grammar issues. Every published article is reviewed and edited by a human editor with
              relevant Microsoft identity experience before publication. Technical claims are verified against
              primary sources by a human; we do not publish unverified model output, hallucinated references, or
              fabricated code samples. Diagrams and screenshots are produced by humans.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">6. Fact-checking and verification</h2>
            <p className="mt-4">Before publication we verify:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>All inline links resolve and reference the documentation cited.</li>
              <li>Cmdlet names, parameter syntax, and KQL queries compile and run.</li>
              <li>Conditional Access, MFA, and Authentication Method references match current Entra portal behaviour.</li>
              <li>Quoted error codes (AADSTS, MS-CV, KRB) are accurate to current Microsoft documentation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">7. Update and corrections process</h2>
            <p className="mt-4">
              Microsoft Entra moves quickly. Articles include a publication date and, when materially revised, an
              updated date. Significant updates are summarised at the top of the article.
            </p>
            <p className="mt-4">
              If you spot an error, an out-of-date claim, or a broken link, please report it via the{" "}
              <a href="/contact" className="text-cyan-800 hover:text-slate-950">contact form</a>{" "}
              or email{" "}
              <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
                info@sentinelidentity.ca
              </a>
              . We aim to acknowledge corrections within two business days and to publish a correction note when
              one is warranted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">8. Conflicts of interest</h2>
            <p className="mt-4">
              Sentinel Identity is independent. We are not paid by Microsoft, third-party identity vendors, or any
              MSP to write specific articles, recommend specific products, or shape editorial outcomes. If a future
              article is sponsored or includes paid placement, it will be clearly labelled as such before any
              article body content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">9. Advertising standards</h2>
            <p className="mt-4">
              The site may display advertising through Google AdSense. Ads are independent of editorial — no
              advertiser previews, reviews, or influences article content. Ads are placed within standard layout
              zones (header, between body sections, sidebar) and are subject to the AdSense publisher policies.
              See our{" "}
              <a href="/privacy" className="text-cyan-800 hover:text-slate-950">Privacy Policy</a>{" "}
              and{" "}
              <a href="/cookies" className="text-cyan-800 hover:text-slate-950">Cookie Notice</a>{" "}
              for how advertising data is handled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">10. Reader feedback</h2>
            <p className="mt-4">
              Each article includes a feedback control to flag whether it was useful or not. We use that signal —
              alongside direct messages — to decide what to expand, rewrite, or retire. Feedback is anonymous.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">11. Comments and moderation</h2>
            <p className="mt-4">
              The site does not currently host on-article comments. Discussion is handled by email so that
              corrections and edits stay traceable. If comments are added later, this policy will be updated to
              describe moderation rules.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">12. Contact</h2>
            <p className="mt-4">
              Editorial questions, corrections, story ideas, or licensing requests:{" "}
              <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
                info@sentinelidentity.ca
              </a>
              .
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
