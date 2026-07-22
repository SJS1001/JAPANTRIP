"use client";

import { useEffect } from "react";

export function PhotoCacheRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/attraction-photo-cache.js", {
      scope: "/",
    });
  }, []);

  return null;
}
