"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export default function AuthSessionRefresh() {
  useEffect(() => {
    let running = false;

    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch("/api/auth/center/refresh", {
          method: "POST",
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.assign("/unauthorized?reason=session_expired");
        }
      } catch {
        // A transient network failure should not log the user out; the next poll retries.
      } finally {
        running = false;
      }
    };

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return null;
}
