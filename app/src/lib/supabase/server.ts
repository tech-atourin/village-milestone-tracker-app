import "server-only";

import { cookies } from "next/headers";
import {
  createServerClient as createSsrServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { serverEnv } from "@/lib/env";

type CookieMutation = { name: string; value: string; options: CookieOptions };

// =====================================================
// Server client - for Server Components, Route Handlers,
// and Server Actions. Reads/writes auth cookies via Next.
// Scoped to `vmt` schema.
// =====================================================
export function createClient() {
  const env = serverEnv();
  const cookieStore = cookies();

  return createSsrServerClient<Database, "vmt">(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "vmt" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieMutation[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component (read-only). Safe to ignore
            // when middleware is also refreshing the session.
          }
        },
      },
    },
  );
}

// =====================================================
// Service-role client - bypasses RLS. Use ONLY in trusted
// server contexts (admin actions: bulk import, user create,
// cron). Never expose to the browser.
// =====================================================
export function createAdminClient() {
  const env = serverEnv();
  return createSupabaseClient<Database, "vmt">(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { schema: "vmt" },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
