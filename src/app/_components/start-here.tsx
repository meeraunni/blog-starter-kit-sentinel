import Link from "next/link";
const guides = [
  {
    label: "01 / The foundations",
    title: "What is Active Directory?",
    description:
      "Domains, directory objects, and the pieces that make Windows identity work.",
    href: "/posts/what-is-active-directory-beginners-guide",
  },
  {
    label: "02 / The decision",
    title: "Inside Conditional Access",
    description:
      "Follow the evaluation of a sign-in, from policy scope to the final access decision.",
    href: "/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline",
  },
  {
    label: "03 / The next step",
    title: "Make sense of passkeys",
    description:
      "Registration, authentication, and the policy choices behind a passwordless rollout.",
    href: "/posts/microsoft-entra-passkeys-explained-architecture-registration-policy",
  },
];
export default function StartHere() {
  return (
    <section className="reading-path">
      <div className="journal-width">
        <div className="reading-path-heading">
          <p className="eyebrow">Build your understanding</p>
          <h2>A few good places to start.</h2>
        </div>
        <div className="reading-path-grid">
          {guides.map((guide) => (
            <Link key={guide.href} href={guide.href}>
              <span className="eyebrow">{guide.label}</span>
              <h3>
                {guide.title} <span aria-hidden="true">↗</span>
              </h3>
              <p>{guide.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
