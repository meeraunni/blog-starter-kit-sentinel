import Header from "@/app/_components/header";

export default function PrivacyPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Privacy</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Privacy Policy</h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600">
          <p>
            Sentinel Identity collects the information you choose to submit through blog subscription forms.
            This information is used to deliver blog updates, maintain the website, and understand site usage.
          </p>
          <p>
            Information submitted through forms may include your name and email address. We do not sell your
            personal information.
          </p>
          <p>
            This website may use analytics, cookies, and advertising technologies to understand usage and support
            the operation of the site.
          </p>
        </div>
      </section>
    </main>
  );
}
