"use client";

import { useEffect } from "react";

export default function CopyCodeButtons() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const blocks = Array.from(document.querySelectorAll<HTMLElement>("pre[data-code-block]"));
    if (blocks.length === 0) return;

    const cleanups: Array<() => void> = [];

    blocks.forEach((block) => {
      if (block.dataset.copyReady === "true") return;
      block.dataset.copyReady = "true";

      const wrapper = document.createElement("div");
      wrapper.className = "relative";
      block.parentNode?.insertBefore(wrapper, block);
      wrapper.appendChild(block);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
      button.className =
        "absolute right-3 top-3 z-10 inline-flex items-center rounded-full border border-white/15 bg-slate-900/90 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:bg-slate-700";

      const handler = async () => {
        const codeEl = block.querySelector("code");
        const text = codeEl ? codeEl.innerText : block.innerText;
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "Copied";
          setTimeout(() => {
            button.textContent = "Copy";
          }, 1500);
        } catch {
          button.textContent = "Failed";
          setTimeout(() => {
            button.textContent = "Copy";
          }, 1500);
        }
      };

      button.addEventListener("click", handler);
      wrapper.appendChild(button);

      cleanups.push(() => {
        button.removeEventListener("click", handler);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
