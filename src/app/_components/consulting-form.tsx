"use client";

import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  company: string;
  email: string;
  challenge: string;
};

const initialState: FormState = {
  name: "",
  company: "",
  email: "",
  challenge: "",
};

export default function ConsultingForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/consult", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus("error");
      setMessage(result.error || "Unable to submit your request right now.");
      return;
    }

    setStatus("success");
    setMessage("Your request was sent. Sentinel Identity will follow up by email.");
    setForm(initialState);
  }

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

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <input
          type="text"
          required
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Your name"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <input
          type="text"
          value={form.company}
          onChange={(event) => updateField("company", event.target.value)}
          placeholder="Company"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <input
          type="email"
          required
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="Email address"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <textarea
          rows={5}
          required
          value={form.challenge}
          onChange={(event) => updateField("challenge", event.target.value)}
          placeholder="Describe your tenant, review goals, or the issue you want assessed."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? "Sending..." : "Send request"}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-rose-600" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
