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
      wrapper.className = "code-block-wrapper";
      block.parentNode?.insertBefore(wrapper, block);
      wrapper.appendChild(block);

      const label = block.getAttribute("data-language-label");
      if (label) {
        const labelEl = document.createElement("span");
        labelEl.className = "code-block-label";
        labelEl.textContent = label;
        wrapper.appendChild(labelEl);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-btn";
      button.setAttribute("aria-label", "Copy code");
      button.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <span>Copy</span>
      `;

      const handler = async () => {
        const codeEl = block.querySelector("code");
        const text = codeEl ? codeEl.innerText : block.innerText;
        try {
          await navigator.clipboard.writeText(text);
          const span = button.querySelector("span");
          if (span) span.textContent = "Copied";
          setTimeout(() => {
            const s = button.querySelector("span");
            if (s) s.textContent = "Copy";
          }, 1400);
        } catch {
          const span = button.querySelector("span");
          if (span) span.textContent = "Failed";
          setTimeout(() => {
            const s = button.querySelector("span");
            if (s) s.textContent = "Copy";
          }, 1400);
        }
      };

      button.addEventListener("click", handler);
      wrapper.appendChild(button);

      cleanups.push(() => button.removeEventListener("click", handler));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
