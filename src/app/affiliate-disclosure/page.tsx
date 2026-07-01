import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/header";
import Breadcrumbs from "@/app/_components/breadcrumbs";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "Sentinel Identity's affiliate disclosure statement. Which affiliate programs the site participates in, how affiliate links are marked, and how affiliate relationships affect what gets written about (they don't).",
  alternates: { canonical: "/affiliate-disclosure" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "June 20, 2026";

export default function AffiliateDisclosurePage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Affiliate Disclosure" },
          ]}
        />

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Affiliate Disclosure
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
            How affiliate relationships work on this site.
          </h1>
          <p className="mt-4 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="mt-10 space-y-10 text-base leading-8 text-slate-600">
          <p>
            Sentinel Identity is a publication maintained by a working practitioner. To help sustain the writing
            and keep articles free to read, the site participates in a small number of affiliate programs. This page
            explains what that means, which programs the site currently participates in, and the guardrails that
            keep affiliate relationships from influencing what gets written.
          </p>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">What an affiliate link is</h2>
            <p className="mt-4">
              An affiliate link is a URL that includes a tracking identifier so that the retailer or software vendor
              can attribute a sale back to the referring site. When a reader clicks an affiliate link and later makes
              a purchase, the retailer pays Sentinel Identity a small commission (typically between three and thirty
              percent depending on the program). The commission is paid by the retailer out of their existing margin —
              the reader pays exactly the same price they would if they had reached the retailer directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">How affiliate links are marked</h2>
            <p className="mt-4">
              Any link on this site that is an affiliate link carries the HTML attribute{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">rel=&quot;sponsored&quot;</code>, which is
              the standard signal to search engines and readers that the link is a paid relationship. Where an entire
              post or section relies on affiliate revenue, a visible disclosure appears at the top of the article. The
              disclosure is not buried in the footer or hidden behind a link.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Programs the site participates in</h2>
            <p className="mt-4">
              The specific programs currently active are listed below. The list is updated when a program is joined
              or ended. If you notice a link on the site that appears to be an affiliate link to a program not listed
              here, please{" "}
              <Link href="/contact" className="text-cyan-800 hover:text-slate-950">
                let us know
              </Link>
              .
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                <strong>Amazon Associates (Canada, US, UK).</strong> Small referral commission on physical goods
                (hardware, books, FIDO2 security keys) linked from technical posts.
              </li>
              <li>
                <strong>Reserved for future certification-vendor partnerships.</strong> If the site adds an affiliate
                relationship with a practice-exam or training vendor, it will appear here.
              </li>
              <li>
                <strong>Reserved for future backup / security / MSP-tooling partnerships.</strong> Same note as above.
              </li>
            </ul>
            <p className="mt-4">
              This list will grow as the site partners with vendors whose products are genuinely useful to a Microsoft
              admin audience. It won't grow to include vendors whose products aren't recommended editorially.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              How affiliate relationships affect what gets written
            </h2>
            <p className="mt-4">
              They don't, and the rest of this section explains the specific commitments that back that claim up.
            </p>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                <strong>Affiliate status is not a prerequisite for coverage.</strong> A product being written about
                doesn't mean an affiliate relationship exists, and an affiliate relationship doesn't mean the product
                gets special treatment. Products get recommended when they'd be recommended anyway, regardless of
                whether the site earns a commission on the recommendation.
              </li>
              <li>
                <strong>Recommendations are practitioner-driven, not commission-driven.</strong> If a higher-commission
                alternative exists to a recommended product, the recommendation stays with the product that's actually
                the better technical choice for the reader.
              </li>
              <li>
                <strong>Affiliate programs are never a factor in negative coverage.</strong> If a vendor whose affiliate
                program the site participates in ships a feature that has real problems, the site will write about
                those problems the same way it would for any other vendor.
              </li>
              <li>
                <strong>Sponsorship is separate from affiliate.</strong> A future sponsored post would be labelled{" "}
                <em>Sponsored</em> visibly at the top of the article, would not be intermixed with editorial content,
                and would follow the disclosure standards documented in the{" "}
                <Link href="/editorial-policy" className="text-cyan-800 hover:text-slate-950">
                  editorial policy
                </Link>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">FTC, CASL, and related compliance</h2>
            <p className="mt-4">
              Sentinel Identity operates in Canada and reaches an international audience. This disclosure is intended
              to satisfy the disclosure expectations of the US Federal Trade Commission (16 CFR Part 255 endorsement
              and testimonial guidelines), Canada's Anti-Spam Legislation (CASL) where relevant to commercial
              electronic messages, and equivalent frameworks in other jurisdictions. If your local jurisdiction has
              stricter requirements and something on this page is unclear, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Contact and corrections</h2>
            <p className="mt-4">
              Questions about affiliate relationships, corrections to what's disclosed here, or concerns about a
              specific link on the site: email{" "}
              <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
                info@sentinelidentity.ca
              </a>{" "}
              or use the{" "}
              <Link href="/contact" className="text-cyan-800 hover:text-slate-950">
                contact form
              </Link>
              . We respond within two business days.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
