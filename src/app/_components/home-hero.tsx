import Link from "next/link";

export default function HomeHero({ postCount }: { postCount: number }) {
  return (
    <section className="border-b border-stone-200/70 bg-[#fbfaf7] dark:border-slate-800/60 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Sentinel Identity
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-slate-950 dark:text-slate-50 md:text-5xl">
          Microsoft identity and infrastructure guidance for IT teams.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          Practical troubleshooting, architecture notes, and implementation guides for Microsoft Entra,
          Active Directory, Microsoft 365, Conditional Access, passkeys, and Windows DNS.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="#articles"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-900 dark:bg-cyan-700 dark:hover:bg-cyan-600"
          >
            Read latest ({postCount})
          </Link>
          <Link
            href="/topics"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
          >
            Browse topics
          </Link>
        </div>
      </div>
    </section>
  );
}
