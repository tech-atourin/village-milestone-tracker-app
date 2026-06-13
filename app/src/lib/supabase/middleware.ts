import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";
import { clientEnv } from "@/lib/env";

type CookieMutation = { name: string; value: string; options: CookieOptions };

// =====================================================
// Edge-safe Supabase factory for middleware.
// Refreshes the auth session and returns the user record
// alongside the response with rotated cookies.
// =====================================================
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = clientEnv();

  const supabase = createServerClient<Database, "vmt">(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "vmt" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieMutation[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, response, user };
}
