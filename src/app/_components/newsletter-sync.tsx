"use client";

import { useEffect } from "react";

export default function NewsletterSync() {
  useEffect(() => {
    void fetch("/api/newsletter/sync", {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Best-effort sync; the page should not fail if delivery is unavailable.
    });
  }, []);

  return null;
}
