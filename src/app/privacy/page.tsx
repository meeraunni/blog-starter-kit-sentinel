import type { Metadata } from "next";
import Header from "@/app/_components/header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Sentinel Identity collects, uses, stores, and protects your personal information, including third-party processors, cookies, and your rights under PIPEDA, GDPR, and CCPA.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 1, 2026";

export default function PrivacyPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <a href="/" className="hover:text-slate-900">Home</a>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-700">Privacy</span>
        </nav>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Privacy</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Privacy Policy</h1>
        <p className="mt-4 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10 text-base leading-8 text-slate-600">
          <p>
            This Privacy Policy describes how Sentinel Identity (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses,
            stores, and shares personal information when you visit{" "}
            <a href="https://sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
              sentinelidentity.ca
            </a>{" "}
            or interact with our forms, newsletter, or articles. Sentinel Identity is an independent technical
            publication based in Ontario, Canada.
          </p>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">1. Information we collect</h2>
            <p className="mt-4">We collect only the personal information needed to operate the site and respond to readers:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                <strong>Information you provide:</strong> Your name, email address, and any message content you
                submit through our newsletter signup, contact form, or consulting request form.
              </li>
              <li>
                <strong>Information collected automatically:</strong> IP address (truncated where possible),
                user-agent string, referring URL, page paths visited, approximate location derived from IP, and
                interaction events such as clicks and scroll depth — used for traffic measurement and to detect
                abuse.
              </li>
              <li>
                <strong>Cookies and similar technologies:</strong> See Section 4 below and our{" "}
                <a href="/cookies" className="text-cyan-800 hover:text-slate-950">Cookie Notice</a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">2. How we use information</h2>
            <p className="mt-4">We use personal information to:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>Deliver the newsletter and post-update emails you subscribed to.</li>
              <li>Reply to messages submitted through the contact and consulting forms.</li>
              <li>Operate, secure, and improve the website (caching, fraud prevention, performance monitoring).</li>
              <li>Measure aggregate traffic patterns and content engagement.</li>
              <li>Comply with legal obligations and respond to lawful requests.</li>
            </ul>
            <p className="mt-4">
              <strong>We do not sell your personal information.</strong> We do not share your personal information
              with advertisers other than what is described in Section 3.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">3. Third-party processors</h2>
            <p className="mt-4">
              We rely on a small set of trusted vendors to operate the site. Each is bound by its own privacy and
              data-processing terms.
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                <strong>Vercel Inc.</strong> — website hosting, edge delivery, server logs, and Vercel Analytics
                (privacy-friendly, cookieless visitor measurement).{" "}
                <a href="https://vercel.com/legal/privacy-policy" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  Vercel Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Resend (Resend, Inc.)</strong> — transactional email delivery for newsletter confirmations
                and contact-form replies.{" "}
                <a href="https://resend.com/legal/privacy-policy" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  Resend Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Neon (Neon, Inc.)</strong> — managed Postgres used to store anonymous visitor events and
                article feedback signals.{" "}
                <a href="https://neon.tech/privacy-policy" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  Neon Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Google LLC (Google AdSense)</strong> — once enabled, Google may use cookies and identifiers
                to serve ads based on your prior visits to this and other websites. You can opt out of personalized
                advertising at{" "}
                <a href="https://adssettings.google.com" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  Google Ad Settings
                </a>{" "}
                and via the industry tools listed in our{" "}
                <a href="/cookies" className="text-cyan-800 hover:text-slate-950">Cookie Notice</a>. See{" "}
                <a href="https://policies.google.com/technologies/partner-sites" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  How Google uses information from sites or apps that use our services
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">4. Cookies and tracking</h2>
            <p className="mt-4">
              We use a minimal set of cookies. Vercel Analytics is cookieless. Google AdSense, when enabled, may
              place advertising cookies, including the DoubleClick DART cookie. You can disable or block cookies
              in your browser at any time. For a full breakdown of cookie categories and opt-out tools, see our{" "}
              <a href="/cookies" className="text-cyan-800 hover:text-slate-950">Cookie Notice</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">5. Lawful bases (EEA / UK)</h2>
            <p className="mt-4">
              Where the GDPR or UK GDPR applies, we process personal information on the following legal bases:
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li><strong>Consent</strong> — when you subscribe to the newsletter or submit a form.</li>
              <li><strong>Legitimate interest</strong> — to secure, maintain, and improve the website and to measure traffic in aggregate.</li>
              <li><strong>Legal obligation</strong> — to comply with applicable laws and lawful requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">6. Data retention</h2>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>Newsletter contact records: retained until you unsubscribe, plus a short suppression period to prevent re-adds.</li>
              <li>Contact and consulting form messages: retained for up to 24 months for follow-up, then deleted.</li>
              <li>Server access logs: retained by Vercel for the period stated in its policy (typically 30 days).</li>
              <li>Aggregate analytics: retained for up to 26 months.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">7. Your rights</h2>
            <p className="mt-4">
              Depending on your jurisdiction, you may have the following rights regarding your personal information:
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                <strong>PIPEDA (Canada):</strong> You may request access to and correction of your personal
                information. You may also withdraw consent at any time.
              </li>
              <li>
                <strong>GDPR / UK GDPR:</strong> Access, rectification, erasure, restriction of processing, data
                portability, objection, and the right to lodge a complaint with a supervisory authority.
              </li>
              <li>
                <strong>CCPA / CPRA (California):</strong> Right to know, right to delete, right to correct, right
                to limit use of sensitive personal information, and right to opt out of sale or sharing (we do not
                sell or share personal information as defined under CCPA, except as related to AdSense
                personalization where opt-out is available via the tools in our Cookie Notice).
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email{" "}
              <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
                info@sentinelidentity.ca
              </a>{" "}
              from the email address associated with your data. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">8. International transfers</h2>
            <p className="mt-4">
              Our processors are based in the United States and the European Union. Where we transfer personal
              information outside your jurisdiction, we rely on Standard Contractual Clauses or equivalent
              safeguards provided by each processor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">9. Children&apos;s data</h2>
            <p className="mt-4">
              The site is not directed to children under 16. We do not knowingly collect personal information from
              children. If you believe a child has provided personal information, contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">10. Security</h2>
            <p className="mt-4">
              We use HTTPS, encrypted databases, and access controls provided by our vendors. No transmission over
              the internet is fully secure; we cannot guarantee absolute security but we work to limit risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">11. Changes to this policy</h2>
            <p className="mt-4">
              We may update this Privacy Policy as the site evolves or as legal requirements change. Material
              changes will be reflected by updating the &quot;Last updated&quot; date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">12. Contact</h2>
            <p className="mt-4">
              Questions, requests, or complaints about this policy can be sent to{" "}
              <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
                info@sentinelidentity.ca
              </a>{" "}
              or through our{" "}
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
