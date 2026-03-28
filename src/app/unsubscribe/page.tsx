import Header from "@/app/_components/header";

type Props = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const success = params.status === "success";

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-10 lg:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
          Newsletter
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
          {success ? "You’ve been unsubscribed." : "We could not complete that unsubscribe link."}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
          {success
            ? "You will no longer receive new blog notifications."
            : "The link may be invalid or already expired."}
        </p>
      </section>
    </main>
  );
}
