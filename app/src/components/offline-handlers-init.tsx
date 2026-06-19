"use client";

import { useEffect } from "react";
import { registerOfflineHandlers } from "@/lib/offline/handlers";
import { flushQueue } from "@/lib/offline/queue";

export function OfflineHandlersInit() {
  useEffect(() => {
    registerOfflineHandlers();
    // Attempt to drain any items leftover from a prior session.
    if (typeof navigator !== "undefined" && navigator.onLine) {
      flushQueue();
    }
  }, []);
  return null;
}
