import type { Metadata } from "next";
import Header from "@/app/_components/header";
import SignInErrorFinder from "@/app/_components/sign-in-error-finder";

export const metadata: Metadata = {
  title: "Microsoft Entra error finder and administrator resources",
  description:
    "Look up common AADSTS sign-in errors, find the next troubleshooting check, and open step-by-step Microsoft Entra guides.",
  alternates: { canonical: "/resources" },
};
const downloads = [
  {
    file: "sign-in-triage.md",
    title: "Sign-in triage worksheet",
    description:
      "A blank investigation record: scope, timestamps, policy results, competing explanations, and the evidence needed to close the ticket.",
  },
  {
    file: "identity-change-record.md",
    title: "Identity change record",
    description:
      "Write down the expected effect, approval, pilot scope, rollback trigger, and verification before changing a control.",
  },
  {
    file: "conditional-access-rollout.md",
    title: "Conditional Access rollout worksheet",
    description:
      "Plan a pilot, record report-only observations, and decide whether the evidence supports moving to enforcement.",
  },
];
export default function ResourcesPage() {
  return (
    <main>
      <Header />
      <div className="journal-width resource-page">
        <p className="eyebrow">Administrator resources</p>
        <h1>
          Tools and templates for identity administrators
        </h1>
        <p className="resource-intro">
          Find the meaning of a sign-in error, identify where to investigate, and follow a detailed guide for your issue.
        </p>
        <SignInErrorFinder />
        <section className="resource-downloads">
          <p className="eyebrow">Optional planning templates</p>
          <h2>Download editable templates</h2>
          <p>
            Plain Markdown files that open in any text editor. Free to adapt for
            your own operational records; no email address required.
          </p>
          <div className="reading-path-grid">
            {downloads.map((item) => (
              <article key={item.file}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <a
                  href={`/resources/${item.file}`}
                  download
                  className="journal-text-link"
                >
                  Download .md ↓
                </a>
              </article>
            ))}
          </div>
        </section>
        <section className="resource-notes">
          <h2>How to use these resources</h2>
          <p>
            The downloadable files are planning templates. Blank
            fields are intentional: an observation you have not collected should
            stay unknown. Keep secrets out of shared notes and store completed
            records in your organisation’s approved system.
          </p>
          <p>
            For context, read{" "}
            <a href="/posts/aadsts53003-access-blocked-by-conditional-access">
              the AADSTS53003 troubleshooting guide
            </a>{" "}
            or{" "}
            <a href="/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline">
              the Conditional Access evaluation guide
            </a>
            . Report a problem through <a href="/contact">the contact page</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
