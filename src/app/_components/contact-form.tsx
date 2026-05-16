export default function ContactForm() {
  return (
    <form action="/api/contact" method="POST" className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Your name</span>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-cyan-700 focus:bg-white"
            placeholder="Jane Doe"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-cyan-700 focus:bg-white"
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        <span>Subject</span>
        <input
          type="text"
          name="subject"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-cyan-700 focus:bg-white"
          placeholder="Question about a post / typo / general feedback"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        <span>Message</span>
        <textarea
          name="message"
          required
          rows={6}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-cyan-700 focus:bg-white"
          placeholder="Share your question, correction, or feedback. The more context you provide, the better the reply."
        />
      </label>

      {/* Honeypot field for spam filtering. Hidden from real users. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className="text-xs leading-6 text-slate-500">
        By submitting this form you agree to our{" "}
        <a href="/privacy" className="text-cyan-800 underline-offset-2 hover:underline">
          Privacy Policy
        </a>
        . We only use your email to reply to you.
      </p>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-cyan-900 md:w-auto md:self-start"
      >
        Send message
      </button>
    </form>
  );
}
