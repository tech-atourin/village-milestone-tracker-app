import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Post-`auth.admin.createUser` cleanup.
 *
 * The Supabase admin createUser path leaves several token columns as NULL
 * in `auth.users` (email_change, phone_change, *_token, recovery_token, etc).
 * GoTrue's `signInWithPassword` expects empty strings on those columns and
 * rejects logins with "Invalid login credentials" when they're NULL - even
 * though the password hash itself verifies fine.
 *
 * Symptom: user created via bulk-import / orgs / narasumber CRUD can never
 * log in, even with the right password. Direct password reset via SQL
 * doesn't fix it because the NULL columns are still there.
 *
 * Always call this right after a successful createUser.
 */
export async function sanitizeAuthUser(userId: string): Promise<void> {
  if (!userId) return;
  const admin = createAdminClient();
  // Direct REST UPDATE on auth.users isn't possible via supabase-js; use the
  // PostgREST-exposed RPC isn't either. Instead run a raw SQL via .rpc on a
  // SECURITY DEFINER helper. Implemented inline by relying on the fact that
  // service_role has direct table access through PostgREST when the table is
  // in the exposed schema. auth.users is NOT exposed, so we go through a
  // SECURITY DEFINER function.
  await admin.rpc("vmt_sanitize_auth_user", { p_user_id: userId });
}
