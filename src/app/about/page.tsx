import type { Metadata } from "next";
import Header from "@/app/_components/header";

export const metadata: Metadata = {
  title: "About Sentinel Identity",
  description:
    "An independent technical publication about Microsoft identity, written under the byline MU.A. Read about its scope, sources, and editorial approach.",
  alternates: { canonical: "/about" },
};
export default function AboutPage() {
  return (
    <main>
      <Header />
      <article className="policy-page journal-width">
        <p className="eyebrow">Behind the notebook</p>
        <h1>
          About Sentinel Identity
        </h1>
        <p>
          Sentinel Identity is an independent publication about Microsoft Entra,
          Active Directory, and Microsoft 365. It is intended for administrators
          who need to understand a failure, plan a change, or explain why a
          control behaves the way it does.
        </p>
        <p>
          The library combines architecture explanations, troubleshooting
          sequences, and references to product documentation. The{" "}
          <a href="/resources">workbench</a> adds free investigation and
          change-planning worksheets you can use alongside the articles.
        </p>
        <section>
          <h2>The editorial byline</h2>
          <p>
            Articles are published under <a href="/author/m-u">MU.A</a>.
            Questions, corrections, and suggestions go to{" "}
            <a href="mailto:info@sentinelidentity.ca">
              info@sentinelidentity.ca
            </a>
            . The publication is independent of Microsoft and does not claim
            access to private product roadmaps.
          </p>
        </section>
        <section>
          <h2>What to expect</h2>
          <p>
            A useful article should give you a clearer next step: which evidence
            to collect, which explanation to test, and how to recognise a
            result. Product documentation remains the reference for supported
            behaviour. Recommendations and examples need to be evaluated against
            your environment.
          </p>
          <p>
            AI tools assist with writing and site development. We do not claim
            that every example in the archive has been run in a lab. See the{" "}
            <a href="/editorial-policy">editorial policy</a> for how we
            distinguish examples, documented behaviour, and first-hand testing.
          </p>
        </section>
        <section>
          <h2>Help improve the reference</h2>
          <p>
            If a command fails, a link is outdated, or an explanation leaves a
            gap, <a href="/contact">send a correction</a> with the article URL
            and redacted evidence. Material corrections should be visible on the
            article so readers can see what changed.
          </p>
          <p>
            Start with the <a href="/topics">topic index</a>, browse the{" "}
            <a href="/archive">complete archive</a>, or subscribe through the{" "}
            <a href="/#subscribe">newsletter</a> or{" "}
            <a href="/feed.xml">RSS feed</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
