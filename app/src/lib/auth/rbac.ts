import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GlobalRole } from "@/types/supabase";

export type SessionUser = {
  id: string;
  email: string | null;
  full_name: string;
  global_role: GlobalRole;
  organization_id: string | null;
  representing_desa_id: string | null;
  avatar_url: string | null;
};

// =====================================================
// getCurrentUser
// =====================================================
// Returns the authenticated user enriched with vmt.users
// profile. Returns null if not signed in OR if the auth
// session exists but no corresponding vmt.users row was
// provisioned yet (rare — bulk import inserts the profile
// row atomically with the auth account).
// =====================================================
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, email, full_name, global_role, organization_id, representing_desa_id, avatar_url",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return profile as unknown as SessionUser;
}

// =====================================================
// requireUser / requireRole
// =====================================================
// Throw-via-redirect helpers for server components & actions.
// Use at the TOP of any protected page/action — they short-
// circuit unauthorized requests before the page renders.
// =====================================================
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  ...roles: GlobalRole[]
): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.global_role)) redirect("/forbidden");
  return user;
}

// =====================================================
// scopeHomePath — where to send a user after sign-in
// =====================================================
export function scopeHomePath(role: GlobalRole): string {
  switch (role) {
    case "superadmin":
      return "/atourin/dashboard";
    case "mitra_admin":
      return "/mitra/dashboard";
    case "peserta":
      return "/peserta/home";
    case "narasumber":
      return "/narasumber/dashboard";
    case "desa_wisata":
      return "/desa/dashboard";
  }
}

// =====================================================
// canAccessProject — for project-scoped resources
// =====================================================
export async function canAccessProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}
