"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { clientEnv } from "@/lib/env";

// =====================================================
// Browser client — for client components only.
// Scoped to the `vmt` schema via db.schema option.
// =====================================================
export function createClient() {
  const env = clientEnv();
  return createBrowserClient<Database, "vmt">(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "vmt" },
    },
  );
}
