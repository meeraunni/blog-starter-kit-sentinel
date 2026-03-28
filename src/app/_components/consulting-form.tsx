export default function ConsultingForm() {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
        Consulting
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
        Request a tenant assessment.
      </h3>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Share your Microsoft Entra environment, current pain points, or the review you need.
      </p>

      <form
        action="/api/consult"
        method="POST"
        className="mt-6 grid gap-4"
      >
        <input
          type="text"
          required
          name="name"
          placeholder="Your name"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <input
          type="text"
          name="company"
          placeholder="Company"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <input
          type="email"
          required
          name="email"
          placeholder="Email address"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <textarea
          rows={5}
          required
          name="challenge"
          placeholder="Describe your tenant, review goals, or the issue you want assessed."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Send request
        </button>
      </form>
    </div>
  );
}
