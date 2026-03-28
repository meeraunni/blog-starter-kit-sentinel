import Header from "@/app/_components/header";
import Link from "next/link";

type Props = {
  searchParams: Promise<{
    form?: string;
    status?: string;
  }>;
};

export default async function ThanksPage({ searchParams }: Props) {
  const params = await searchParams;
  const isAssessment = params.form === "assessment";
  const isError = params.status === "error";

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Thanks</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
          {isError
            ? isAssessment
              ? "We could not send your request yet."
              : "We could not complete your subscription yet."
            : isAssessment
              ? "Your request has been sent."
              : "Your subscription request has been sent."}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
          {isError
            ? "Please try again shortly. If this continues, the live email or database configuration in Vercel still needs to be completed."
            : isAssessment
              ? "We received your tenant assessment inquiry."
              : "We received your request to subscribe to blog updates."}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900"
        >
          Back to blog
        </Link>
      </section>
    </main>
  );
}
