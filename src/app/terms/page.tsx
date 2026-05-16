import type { Metadata } from "next";
import Header from "@/app/_components/header";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms governing your use of sentinelidentity.ca, including acceptable use, intellectual property, disclaimers of warranty, and limitations of liability.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 1, 2026";

export default function TermsPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <a href="/" className="hover:text-slate-900">Home</a>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-700">Terms</span>
        </nav>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Terms</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Terms of Use</h1>
        <p className="mt-4 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10 text-base leading-8 text-slate-600">
          <p>
            These Terms of Use (&quot;Terms&quot;) govern your access to and use of{" "}
            <a href="https://sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
              sentinelidentity.ca
            </a>{" "}
            (the &quot;Site&quot;), operated by Sentinel Identity. By accessing or using the Site you agree to be
            bound by these Terms. If you do not agree, please do not use the Site.
          </p>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">1. Educational content; no professional advice</h2>
            <p className="mt-4">
              All content on the Site, including articles, code samples, configuration suggestions, and diagrams,
              is provided for general educational and informational purposes. It does not constitute professional
              advice, a consulting engagement, or a recommendation tailored to your environment. Microsoft product
              behavior, licensing, and supportability change over time; you are responsible for validating any
              guidance against current Microsoft documentation and your own tenant configuration before applying it
              in production.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">2. Intellectual property and permitted use</h2>
            <p className="mt-4">
              All original content on the Site, including text, diagrams, and code samples, is owned by Sentinel
              Identity unless otherwise indicated. Microsoft, Microsoft Entra, Microsoft 365, Azure, and related
              names and logos are trademarks of Microsoft Corporation and are used here for descriptive and
              educational purposes only.
            </p>
            <p className="mt-4">You may:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>Read, share links to, and quote short excerpts (with attribution) of the content for personal, educational, or internal-team use.</li>
              <li>Reuse small code snippets in your own scripts and tenants without separate permission.</li>
            </ul>
            <p className="mt-4">You may not:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>Reproduce or republish substantial portions of articles, in whole or in part, on another website, newsletter, or document without prior written permission.</li>
              <li>Use the content to train commercial generative AI models without prior written permission.</li>
              <li>Remove or alter copyright or attribution notices.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">3. Acceptable use</h2>
            <p className="mt-4">When using the Site you agree not to:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>Attempt to disrupt, overload, or probe the infrastructure for vulnerabilities outside the scope of a coordinated disclosure.</li>
              <li>Scrape the Site at a rate that materially burdens the origin or our vendors.</li>
              <li>Submit false, misleading, or abusive information through any form on the Site.</li>
              <li>Use the Site in violation of applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">4. Third-party links</h2>
            <p className="mt-4">
              Articles frequently reference Microsoft Learn, RFC documents, vendor blogs, and other external sites.
              We provide these links as primary-source references and convenience; we do not control and are not
              responsible for third-party content, policies, or availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">5. Disclaimer of warranties</h2>
            <p className="mt-4">
              THE SITE AND ITS CONTENT ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS,
              WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION IMPLIED WARRANTIES
              OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY. WE DO NOT
              WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">6. Limitation of liability</h2>
            <p className="mt-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL SENTINEL IDENTITY, ITS OPERATORS, OR ITS
              CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
              ANY LOSS OF PROFITS, REVENUES, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED
              TO YOUR ACCESS TO OR USE OF (OR INABILITY TO USE) THE SITE, EVEN IF WE HAVE BEEN ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM RELATED TO THE SITE SHALL NOT EXCEED
              CAD $100.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">7. Indemnification</h2>
            <p className="mt-4">
              You agree to defend, indemnify, and hold harmless Sentinel Identity from and against any claims,
              liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any
              way connected with your violation of these Terms or your misuse of the Site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">8. Changes to the Site and Terms</h2>
            <p className="mt-4">
              We may add, modify, or remove content, features, or sections of the Site at any time without notice.
              We may also update these Terms; the &quot;Last updated&quot; date at the top of this page reflects
              the most recent revision. Continued use of the Site after changes constitutes acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">9. Governing law</h2>
            <p className="mt-4">
              These Terms are governed by the laws of the Province of Ontario, Canada, and the federal laws of
              Canada applicable therein, without regard to conflict-of-laws principles. The courts of Ontario shall
              have exclusive jurisdiction over any dispute arising out of or relating to the Site or these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">10. Contact</h2>
            <p className="mt-4">
              For questions about these Terms, email{" "}
              <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
                info@sentinelidentity.ca
              </a>{" "}
              or use our{" "}
              <a href="/contact" className="text-cyan-800 hover:text-slate-950">
                contact form
              </a>.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
