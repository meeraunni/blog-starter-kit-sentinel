"use client";

import { FormEvent, useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(result.error || "Unable to subscribe right now.");
      return;
    }

    setStatus("success");
    setMessage("Thanks. You are subscribed for Sentinel Identity updates.");
    setEmail("");
    setName("");
  }

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

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-600 focus:bg-white"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
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
