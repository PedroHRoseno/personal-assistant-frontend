"use client";

import { useEffect } from "react";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => {
        console.error("Falha ao registrar Service Worker:", error);
      });
  }, []);

  return children;
}
