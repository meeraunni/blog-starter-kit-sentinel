"use client";

import { useState } from "react";

type Props = {
  slug: string;
};

type Status = "idle" | "submitting" | "done" | "error";

export default function ArticleFeedback({ slug }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [helpful, setHelpful] = useState<boolean | null>(null);

  async function submit(isHelpful: boolean) {
    if (status === "submitting" || status === "done") return;
    setStatus("submitting");
    setHelpful(isHelpful);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, helpful: isHelpful }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      aria-label="Article feedback"
      className="mt-16 rounded-[1.6rem] border border-stone-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Feedback</p>
      {status === "done" ? (
        <p className="mt-3 text-base leading-7 text-slate-700">
          {helpful
            ? "Thanks — glad it helped. We use this signal to decide what to expand next."
            : "Thanks for letting us know. We will use this to prioritise updates."}{" "}
          For details or corrections, email{" "}
          <a href="mailto:info@sentinelidentity.ca" className="text-cyan-800 hover:text-slate-950">
            info@sentinelidentity.ca
          </a>
          .
        </p>
      ) : (
        <>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">
            Was this article helpful?
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Anonymous — no account or comment required.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={status === "submitting"}
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:opacity-60"
            >
              Yes, this helped
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={status === "submitting"}
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:opacity-60"
            >
              No, needs more
            </button>
            <a
              href="/contact"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-950"
            >
              Send detailed feedback
            </a>
          </div>
          {status === "error" && (
            <p className="mt-3 text-sm text-rose-700">
              Could not send feedback. Please try again or email us directly.
            </p>
          )}
        </>
      )}
    </section>
  );
}
