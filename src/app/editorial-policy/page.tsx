import type { Metadata } from "next";
import Header from "@/app/_components/header";

export const metadata: Metadata = {
  title: "Editorial policy — sources, AI assistance, and corrections",
  description:
    "How to distinguish documented product behaviour, examples, interpretation, and testing evidence in Sentinel Identity articles.",
  alternates: { canonical: "/editorial-policy" },
};
export default function EditorialPolicyPage() {
  return (
    <main>
      <Header />
      <article className="policy-page journal-width">
        <p className="eyebrow">About the publication</p>
        <h1>
          Show the evidence.
          <br />
          Make corrections visible.
        </h1>
        <p className="policy-date">Policy revised October 1, 2026</p>
        <p>
          Sentinel Identity publishes explanations and troubleshooting material
          for Microsoft identity administrators. The value of an article should
          come from helping a reader understand a problem, evaluate evidence, or
          complete a task. An article’s length, publishing date, or confident
          tone does not establish its accuracy.
        </p>
        <section>
          <h2>Sources and interpretation</h2>
          <p>
            Use linked Microsoft documentation, specifications, and product
            announcements to check product claims. Editorial recommendations
            should be distinguishable from documented requirements. Links
            provide a way to inspect a claim; they do not mean Microsoft has
            reviewed or endorsed this site.
          </p>
          <p>
            Some older articles need further source and technical review. We do
            not represent the entire archive as independently verified. Where
            behaviour depends on licensing, release stage, platform, or tenant
            configuration, confirm those conditions before using the guidance.
          </p>
        </section>
        <section>
          <h2>AI assistance</h2>
          <p>
            AI tools are used in drafting, editing, coding, and maintaining this
            site. An article’s byline identifies editorial responsibility; it
            does not mean every sentence or illustration was created without AI
            assistance. AI output and generated examples can contain errors.
          </p>
          <p>
            Our previous policy made blanket claims that every technical
            statement had been human-verified, every command had been run, and
            every diagram was human-produced. We have removed those claims
            because a site-wide statement is not a substitute for evidence
            attached to the work.
          </p>
        </section>
        <section>
          <h2>Examples and testing</h2>
          <p>
            Treat code, tenant names, sample output, and scenarios as
            illustrative unless the article explicitly documents a test. A
            first-hand test report should identify its date, environment,
            relevant versions, method, observed result, and limitations. Source
            review and execution in a real environment are different checks.
          </p>
          <p>
            Do not assume a command is safe for your tenant just because it
            appears in an article. Review its scope, required permissions,
            expected result, and rollback before using it. Never paste
            credentials or sensitive tenant data into public feedback.
          </p>
        </section>
        <section>
          <h2>Corrections and dates</h2>
          <p>
            Publication dates identify when a page was first published. A
            material correction should retain that date, add an updated date,
            and explain what changed near the beginning of the article. A recent
            date does not imply every statement was retested.
          </p>
          <p>
            The October 2026 review corrected the{" "}
            <a href="/posts/microsoft-entra-permissions-management-ciem">
              Permissions Management article
            </a>
            , which had recommended a retired product, and the{" "}
            <a href="/posts/what-happens-when-you-assign-a-site-in-active-directory">
              Active Directory site-assignment article
            </a>
            . Their correction notes describe the changes.
          </p>
          <p>
            Send an error report through <a href="/contact">the contact page</a>
            . Include the article URL, the disputed statement, and supporting
            documentation or redacted evidence. Reports help prioritise further
            review.
          </p>
        </section>
        <section>
          <h2>Commercial interests</h2>
          <p>
            Consulting offers and affiliate links are commercial material.
            Affiliate articles should disclose that relationship clearly.
            Payment must not be presented as evidence that a technical
            recommendation is sound. Read the{" "}
            <a href="/affiliate-disclosure">affiliate disclosure</a> for
            details.
          </p>
          <p>
            The free <a href="/resources">administrator workbench</a> is
            available without purchase or newsletter registration. Advertising
            approval is decided by the advertising provider; this policy does
            not imply approval.
          </p>
        </section>
        <section>
          <h2>Who is responsible</h2>
          <p>
            Articles use the byline <a href="/author/m-u">MU.A</a>. Sentinel
            Identity is independent of Microsoft. Editorial questions and
            corrections can be sent to{" "}
            <a href="mailto:info@sentinelidentity.ca">
              info@sentinelidentity.ca
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
