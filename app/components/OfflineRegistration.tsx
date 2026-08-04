"use client";

import { useEffect } from "react";

export function OfflineRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    void navigator.serviceWorker.register("/japan-trip-sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) return;
        void registration.update();
      })
      .catch(() => {
        // The online app remains usable when installation is unsupported or blocked.
      });

    return () => { cancelled = true; };
  }, []);

  return null;
}
