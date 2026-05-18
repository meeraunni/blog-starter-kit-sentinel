import Link from "next/link";

export default function HomeHero({ postCount }: { postCount: number }) {
  return (
    <section className="border-b border-stone-200/70 bg-[#fbfaf7]">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Sentinel Identity
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-slate-950 md:text-5xl">
          Microsoft Entra and Microsoft 365 articles for IT teams.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Troubleshooting, architecture notes, and how-to guides for admins working with
          Conditional Access, MFA, passkeys, hybrid identity, shared mailboxes, and DNS.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="#articles"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-900"
          >
            Read latest ({postCount})
          </Link>
          <Link
            href="/topics"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-950"
          >
            Browse topics
          </Link>
        </div>
      </div>
    </section>
  );
}
