"use client";

// =====================================================
// runOrQueue - uniform offline wrapper for mutations
// =====================================================
// If online: run the server action directly and return its result.
// If offline: persist the mutation to the IndexedDB queue and return
//   an optimistic { ok: true, queued: true }. The registered handler
//   (see handlers.ts) replays it once connection returns.
//
// Only use this for mutations that are safe to replay later:
//   - idempotent upserts (check-in, rating), or
//   - create/update whose server-side effect is stable regardless of
//     when it lands (action plan, baseline).
// Do NOT use for time-sensitive flows (e.g. timed quiz submission).
// =====================================================

import { queueMutation } from "@/lib/offline/queue";

export type Queued = { ok: true; queued: true };

export function isQueued(r: unknown): r is Queued {
  return (
    typeof r === "object" &&
    r !== null &&
    "queued" in r &&
    (r as { queued?: boolean }).queued === true
  );
}

export async function runOrQueue<T>(
  kind: string,
  payload: Record<string, unknown>,
  direct: () => Promise<T>,
): Promise<T | Queued> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueMutation(kind, payload);
    return { ok: true, queued: true };
  }
  return direct();
}
