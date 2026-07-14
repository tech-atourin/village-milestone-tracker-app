"use client";

import { useCallback, useState } from "react";

/**
 * Per-key pending flag for row-level action buttons.
 *
 * Usage:
 *   const { run, isPending } = useAsyncAction<string>();
 *   <Button
 *     loading={isPending(row.id)}
 *     onClick={() => run(row.id, () => deleteRow(row.id))}
 *   >
 *     Hapus
 *   </Button>
 *
 * The clicked row shows its own spinner; siblings stay enabled. Multiple
 * concurrent actions across rows are supported. Without a key, behaves as a
 * single-slot pending flag.
 */
export function useAsyncAction<K = string>() {
  const [pending, setPending] = useState<Set<K>>(new Set());

  const run = useCallback(
    async <T,>(key: K, fn: () => Promise<T>): Promise<T | undefined> => {
      setPending((p) => {
        const next = new Set(p);
        next.add(key);
        return next;
      });
      try {
        return await fn();
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(key);
          return next;
        });
      }
    },
    [],
  );

  const isPending = useCallback((key: K) => pending.has(key), [pending]);

  return { run, isPending, anyPending: pending.size > 0 };
}
