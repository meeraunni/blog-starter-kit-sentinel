import Link from "next/link";

const GUIDES = [
  {
    label: "Identity foundations",
    title: "Understand Active Directory from the ground up",
    href: "/posts/what-is-active-directory-beginners-guide",
  },
  {
    label: "Policy architecture",
    title: "See how Conditional Access evaluates a sign-in",
    href: "/posts/inside-the-microsoft-entra-conditional-access-evaluation-pipeline",
  },
  {
    label: "Passwordless identity",
    title: "Learn how Microsoft Entra passkeys work",
    href: "/posts/microsoft-entra-passkeys-explained-architecture-registration-policy",
  },
];

export default function StartHere() {
  return (
    <section aria-labelledby="start-here-heading" className="border-b border-stone-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">New to the library?</p>
        <h2 id="start-here-heading" className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">Start with a foundation guide.</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {GUIDES.map((guide) => (
            <Link key={guide.href} href={guide.href} className="rounded-2xl border border-white/15 bg-white/5 p-5 transition hover:border-cyan-300 hover:bg-white/10">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{guide.label}</span>
              <span className="mt-3 block text-lg font-semibold leading-7">{guide.title} →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
