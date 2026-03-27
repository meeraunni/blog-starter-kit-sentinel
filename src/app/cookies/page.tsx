import Header from "@/app/_components/header";

export default function CookiesPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Cookies</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Cookie Notice</h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600">
          <p>
            Sentinel Identity may use cookies and similar technologies to support site functionality, understand
            visitor behavior, and enable advertising and analytics tools.
          </p>
          <p>
            Some cookies are necessary for the website to operate. Others may help measure performance or deliver
            relevant advertising.
          </p>
          <p>
            By continuing to use the site, you acknowledge that cookies and similar technologies may be used for
            these purposes.
          </p>
        </div>
      </section>
    </main>
  );
}
