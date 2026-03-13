export function Intro() {
  return (
    <section className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-4xl">
          <p className="mb-4 text-lg font-semibold uppercase tracking-[0.18em] text-blue-700 md:text-xl">
            Sentinel Identity
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-black md:text-5xl">
            Microsoft Identity Blog
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            Knowledge base for Microsoft and Azure administrators.
          </p>
        </div>
      </div>
    </section>
  );
}
