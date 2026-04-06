import Container from "@/app/_components/container";
import ConsultingForm from "@/app/_components/consulting-form";
import Header from "@/app/_components/header";
import SearchablePosts from "@/app/_components/searchable-posts";
import SubscribeForm from "@/app/_components/subscribe-form";
import { getAllPosts } from "@/lib/api";

export default async function Index() {
  const allPosts = getAllPosts();

  return (
    <main className="relative overflow-hidden">
      <Header />

      <Container>
        {allPosts.length > 0 && <SearchablePosts posts={allPosts} />}

        <section className="pb-16 pt-6 lg:pt-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,1.05fr)] lg:items-start">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
                Subscribe
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                Get new Microsoft Entra posts by email.
              </h2>
            </div>

            <SubscribeForm />
          </div>
        </section>

        <section id="consulting" className="pb-24 pt-2 lg:pt-6">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
              Advisory
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              Need help reviewing a Microsoft Entra tenant?
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              If a post resonates with the issues you are dealing with, use the form below to request an assessment
              or advisory support.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(340px,1.15fr)] lg:items-start">
            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-50 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                What to include
              </p>
              <div className="mt-5 grid gap-4 text-sm leading-7 text-slate-600">
                <p>Your Entra environment size, main pain points, and what kind of review you need.</p>
                <p>Conditional Access gaps, authentication issues, tenant hardening concerns, or admin exposure.</p>
                <p>A clear intake path helps turn readers into consulting leads once they trust your writing.</p>
              </div>
            </div>

            <ConsultingForm />
          </div>
        </section>

        <section className="border-t border-slate-200/80 pb-24 pt-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
                About this site
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                Technical writing for Microsoft identity engineers, not generic marketing summaries.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Sentinel Identity publishes detailed Microsoft Entra, authentication, Conditional Access, DNS,
                and tenant security articles intended for administrators, architects, and cloud engineers who
                need implementation-level understanding.
              </p>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Articles are written as technical reference material, with official Microsoft documentation linked
                inline where platform behavior, policy flow, and configuration details need to be validated.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Editorial standards
              </p>
              <div className="mt-5 grid gap-4 text-sm leading-7 text-slate-600">
                <p>Long-form technical articles focused on Microsoft identity operations and architecture.</p>
                <p>Official Microsoft sources linked throughout posts where product behavior needs validation.</p>
                <p>Public privacy, terms, and cookie pages for transparency and reader trust.</p>
              </div>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}
