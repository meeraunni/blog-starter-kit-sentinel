export default function SubscribeForm() {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-900/80">
        Subscribe
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
        Get new blog posts by email.
      </h3>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Join the Sentinel Identity mailing list for practical updates on Microsoft Entra, Conditional Access,
        and tenant security.
      </p>

      <form
        action="https://formsubmit.co/meeraunni4@gmail.com"
        method="POST"
        className="mt-6 grid gap-4"
      >
        <input type="hidden" name="_subject" value="New Sentinel Identity subscriber" />
        <input type="hidden" name="_template" value="table" />
        <input type="hidden" name="_cc" value="info@sentinelidentity.ca" />
        <input type="hidden" name="_next" value="https://sentinelidentity.ca/thanks?form=subscribe" />
        <input type="hidden" name="_captcha" value="false" />
        <input
          type="text"
          name="name"
          placeholder="Name"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <input
          type="email"
          required
          name="email"
          placeholder="Email address"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}
