import type { Metadata } from "next";
import Header from "@/app/_components/header";

export const metadata: Metadata = {
  title: "Cookie Notice",
  description:
    "How sentinelidentity.ca uses cookies and similar technologies, the categories of cookies set on this site, and how to opt out of advertising cookies including Google AdSense.",
  alternates: { canonical: "/cookies" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 1, 2026";

export default function CookiesPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <a href="/" className="hover:text-slate-900">Home</a>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-700">Cookies</span>
        </nav>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Cookies</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Cookie Notice</h1>
        <p className="mt-4 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10 text-base leading-8 text-slate-600">
          <p>
            This Cookie Notice explains what cookies and similar technologies are, which ones we use on{" "}
            <a href="https://sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
              sentinelidentity.ca
            </a>
            , and how you can manage or opt out of them. It supplements our{" "}
            <a href="/privacy" className="text-cyan-800 hover:text-slate-950">Privacy Policy</a>.
          </p>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">1. What cookies are</h2>
            <p className="mt-4">
              Cookies are small text files that a website places on your device when you visit it. Similar
              technologies include local storage, session storage, pixels, and SDK identifiers. They allow a site
              to remember information between page loads or visits — for example, to keep you signed in, to
              remember your preferences, or to measure how the site is used.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">2. Categories of cookies on this site</h2>

            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Strictly necessary</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Required for the Site to function correctly — for example, to remember your theme preference
                  (light/dark) and to protect form submissions from cross-site forgery. These cannot be disabled
                  through this site.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Analytics</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  We use{" "}
                  <a href="https://vercel.com/docs/analytics" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                    Vercel Analytics
                  </a>{" "}
                  which is cookieless — it measures page views and basic interaction patterns without persistent
                  identifiers. We also maintain a small server-side visitor counter that stores anonymous,
                  truncated IP-derived event data in our Neon Postgres database for traffic measurement.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Advertising</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  When Google AdSense is enabled, Google and its advertising partners may set cookies (including
                  the DoubleClick DART cookie) to serve ads based on prior visits to this and other websites. You
                  can review Google&apos;s use of advertising cookies in the{" "}
                  <a
                    href="https://policies.google.com/technologies/ads"
                    rel="noopener"
                    className="text-cyan-800 hover:text-slate-950"
                  >
                    Google Advertising Technologies
                  </a>{" "}
                  notice and in the{" "}
                  <a
                    href="https://policies.google.com/technologies/partner-sites"
                    rel="noopener"
                    className="text-cyan-800 hover:text-slate-950"
                  >
                    How Google uses information from sites
                  </a>{" "}
                  notice.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">3. Opting out of advertising cookies</h2>
            <p className="mt-4">You can opt out of personalized advertising in several ways:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                <strong>Google Ad Settings:</strong>{" "}
                <a href="https://adssettings.google.com" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  adssettings.google.com
                </a>{" "}
                to turn off personalized advertising for your Google account.
              </li>
              <li>
                <strong>YourAdChoices (DAA, United States):</strong>{" "}
                <a href="https://www.youradchoices.com/" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  youradchoices.com
                </a>
                .
              </li>
              <li>
                <strong>YourAdChoices Canada:</strong>{" "}
                <a href="https://youradchoices.ca/" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  youradchoices.ca
                </a>
                .
              </li>
              <li>
                <strong>NAI consumer opt-out (US):</strong>{" "}
                <a href="https://optout.networkadvertising.org/" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  optout.networkadvertising.org
                </a>
                .
              </li>
              <li>
                <strong>EDAA Your Online Choices (Europe):</strong>{" "}
                <a href="https://www.youronlinechoices.eu/" rel="noopener" className="text-cyan-800 hover:text-slate-950">
                  youronlinechoices.eu
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">4. Managing cookies in your browser</h2>
            <p className="mt-4">
              All major browsers let you view, delete, and block cookies. Refer to your browser&apos;s help
              documentation for Chrome, Edge, Safari, Firefox, or Brave. Note that blocking strictly necessary
              cookies may break parts of the Site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">5. Do Not Track</h2>
            <p className="mt-4">
              Browsers can send a &quot;Do Not Track&quot; (DNT) signal. There is no industry consensus on how to
              honor DNT. We do not currently respond to DNT signals but we use minimal first-party tracking by
              default.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">6. Changes to this notice</h2>
            <p className="mt-4">
              We may update this Cookie Notice as the site, vendors, or law change. The &quot;Last updated&quot;
              date at the top of this page indicates the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">7. Contact</h2>
            <p className="mt-4">
              Questions about cookies on this site can be sent to{" "}
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
