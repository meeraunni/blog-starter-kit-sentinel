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
      const language = block.getAttribute("data-language") || "text";
      wrapper.setAttribute("data-language", language);
      block.parentNode?.insertBefore(wrapper, block);

      // Window chrome bar (traffic-light dots, language tab, copy button)
      const chrome = document.createElement("div");
      chrome.className = "code-block-chrome";

      const lights = document.createElement("span");
      lights.className = "traffic-lights";
      lights.setAttribute("aria-hidden", "true");
      lights.innerHTML = `<span class="light red"></span><span class="light yellow"></span><span class="light green"></span>`;
      chrome.appendChild(lights);

      const labelText = block.getAttribute("data-language-label") || "";
      const tab = document.createElement("span");
      tab.className = "code-block-tab";
      tab.textContent = labelText || "Code";
      chrome.appendChild(tab);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-btn";
      button.setAttribute("aria-label", "Copy code");
      button.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <span>Copy</span>
      `;
      chrome.appendChild(button);

      wrapper.appendChild(chrome);
      wrapper.appendChild(block);

      const handler = async () => {
        const codeEl = block.querySelector("code");
        const text = codeEl ? codeEl.innerText : block.innerText;
        try {
          await navigator.clipboard.writeText(text);
          const span = button.querySelector("span");
          if (span) span.textContent = "Copied";
          button.classList.add("copied");
          setTimeout(() => {
            const s = button.querySelector("span");
            if (s) s.textContent = "Copy";
            button.classList.remove("copied");
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
      cleanups.push(() => button.removeEventListener("click", handler));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
