import Link from "next/link";

type Props = {
  currentSlug: string;
  topics: string[];
};

type AffiliateGuide = {
  slug: string;
  title: string;
  description: string;
};

const affiliateGuides: Array<AffiliateGuide & { topics: string[] }> = [
  {
    slug: "choosing-a-fido2-security-key-for-microsoft-entra-passkey-rollout",
    title: "Choose a FIDO2 security key for Microsoft Entra",
    description: "Compare enterprise-ready security keys, form factors, attestation support, and rollout trade-offs.",
    topics: ["Passkeys"],
  },
  {
    slug: "minimum-viable-windows-server-home-lab-for-active-directory",
    title: "Build a practical Windows Server home lab",
    description: "A hardware and VM plan for learning Active Directory without buying an oversized lab.",
    topics: ["Active Directory"],
  },
  {
    slug: "books-that-made-me-a-better-identity-engineer",
    title: "Six books for identity engineers",
    description: "A practitioner-curated reading list covering AD, authentication, Windows internals, and systems design.",
    topics: ["Authentication", "Microsoft Entra"],
  },
];

function getAffiliateGuide(currentSlug: string, topics: string[]) {
  return affiliateGuides.find(
    (guide) => guide.slug !== currentSlug && guide.topics.some((topic) => topics.includes(topic)),
  );
}

export default function ArticleRevenuePaths({ currentSlug, topics }: Props) {
  const affiliateGuide = getAffiliateGuide(currentSlug, topics);

  return (
    <section className="mx-auto mt-12 max-w-4xl border-t border-stone-200 pt-10" aria-labelledby="put-it-into-practice">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Put it into practice</p>
      <h2 id="put-it-into-practice" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
        Useful next steps
      </h2>

      <div className={`mt-6 grid gap-5 ${affiliateGuide ? "md:grid-cols-2" : ""}`}>
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Production help</p>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white">Need a specialist in the room?</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Get independent help with Microsoft Entra assessments, Conditional Access, identity governance, or a
            difficult production incident.
          </p>
          <Link
            href="/consulting"
            className="mt-5 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-100"
          >
            Explore consulting
          </Link>
        </div>

        {affiliateGuide && (
          <div className="rounded-2xl border border-stone-200 bg-[#fbfaf7] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-800">Recommended guide</p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-slate-950">
              <Link href={`/posts/${affiliateGuide.slug}`} className="transition hover:text-cyan-900">
                {affiliateGuide.title}
              </Link>
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{affiliateGuide.description}</p>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              This guide contains clearly disclosed affiliate links. Recommendations remain editorially independent.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
