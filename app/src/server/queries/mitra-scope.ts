import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

// =====================================================
// Scope data untuk mitra_admin: hanya project milik organisasinya, dan
// user (peserta/narasumber) yang jadi anggota project tsb. Mencegah kebocoran
// data lintas organisasi di halaman Desa/Narasumber/Users sisi mitra.
// =====================================================

export async function mitraProjectIds(
  organizationId: string | null | undefined,
): Promise<string[]> {
  if (!organizationId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("projects")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

// User id anggota (peserta/narasumber/desa) dari project milik mitra,
// opsional difilter per role.
export async function mitraMemberUserIds(
  organizationId: string | null | undefined,
  roles?: string[],
): Promise<string[]> {
  const projectIds = await mitraProjectIds(organizationId);
  if (projectIds.length === 0) return [];
  const admin = createAdminClient();
  let q = admin
    .from("project_memberships")
    .select("user_id")
    .in("project_id", projectIds)
    .eq("status", "active");
  if (roles && roles.length > 0) q = q.in("role", roles);
  const { data } = await q;
  return Array.from(
    new Set(
      ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id),
    ),
  );
}

// Apakah mitra punya desa nyata (bukan unit peserta individu)? Untuk
// menyembunyikan menu Desa saat tidak relevan.
export async function mitraHasRealDesa(
  organizationId: string | null | undefined,
): Promise<boolean> {
  const projectIds = await mitraProjectIds(organizationId);
  if (projectIds.length === 0) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_desa")
    .select("desa:desa!inner(is_individual_unit)")
    .in("project_id", projectIds)
    .eq("desa.is_individual_unit", false)
    .limit(1);
  return (data ?? []).length > 0;
}
