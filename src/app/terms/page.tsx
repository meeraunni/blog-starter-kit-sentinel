import Header from "@/app/_components/header";

export default function TermsPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Terms</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Terms of Use</h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600">
          <p>
            The content on Sentinel Identity is provided for general information and educational purposes. It does
            not create a client, advisory, or service relationship.
          </p>
          <p>
            You may read, reference, and share links to the content, but you may not reproduce or republish
            substantial portions without permission.
          </p>
          <p>
            Sentinel Identity may update or remove content and site functionality at any time without notice.
          </p>
        </div>
      </section>
    </main>
  );
}
