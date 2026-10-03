export default function SubscribeForm() {
  return (
    <div className="newsletter-form">
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
        action="/api/subscribe"
        method="POST"
        className="mt-6 grid gap-4"
      >
        <input
          type="text"
          name="name"
          aria-label="Name (optional)"
          autoComplete="name"
          placeholder="Name"
          className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <div className="hidden" aria-hidden="true">
          <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
          <input type="checkbox" name="consent" value="yes" required className="mt-1" />
          <span>I agree to receive new-article emails and understand I can unsubscribe at any time.</span>
        </label>
        <input
          type="email"
          required
          name="email"
          aria-label="Email address"
          autoComplete="email"
          placeholder="Email address"
          className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-none bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Subscribe
        </button>
      </form>
      <p className="mt-4 text-xs text-slate-500">We will email you a confirmation link before adding you.</p>
    </div>
  );
}
