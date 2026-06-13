import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { GlobalRole } from "@/types/supabase";

export type UserListRow = {
  id: string;
  full_name: string;
  email: string | null;
  email_artificial: boolean;
  phone: string | null;
  global_role: GlobalRole;
  organization: { id: string; name: string } | null;
  created_at: string;
  last_login_at: string | null;
};

export async function listUsers(filter?: {
  role?: GlobalRole;
  q?: string;
}): Promise<UserListRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("users")
    .select(
      "id, full_name, email, email_artificial, phone, global_role, created_at, last_login_at, organization:organizations(id, name)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (filter?.role) query = query.eq("global_role", filter.role);
  if (filter?.q) {
    query = query.or(
      `full_name.ilike.%${filter.q}%,email.ilike.%${filter.q}%,phone.ilike.%${filter.q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("listUsers error:", error);
    return [];
  }
  return (data ?? []) as unknown as UserListRow[];
}
