"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const schema = z.object({
  project_id: z.string().uuid(),
  enabled: z.boolean(),
});

function randomSlug(): string {
  // 16-byte CSPRNG → base64url (~22 chars) - unpredictable per-project token
  return randomBytes(16).toString("base64url");
}

export async function togglePublicDashboard(
  input: z.input<typeof schema>,
): Promise<{ ok: true; slug: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  if (user.global_role !== "superadmin" && user.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createAdminClient();

  const { data: existing, error: readErr } = await supabase
    .from("projects")
    .select("public_dashboard_slug, organization_id")
    .eq("id", parsed.data.project_id)
    .maybeSingle();
  if (readErr) return { error: `Read gagal: ${readErr.message}` };
  if (!existing) return { error: "Project tidak ditemukan" };

  // Mitra_admin can only toggle projects owned by their own organization.
  if (user.global_role === "mitra_admin") {
    const orgId = (existing as { organization_id: string | null })
      .organization_id;
    if (!orgId || orgId !== user.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }

  let slug =
    (existing as { public_dashboard_slug: string | null } | null)
      ?.public_dashboard_slug ?? null;

  // Generate a slug only when none exists yet. Retry once on the rare
  // unique-constraint collision.
  if (!slug) {
    slug = randomSlug();
    const dup = await supabase
      .from("projects")
      .select("id")
      .eq("public_dashboard_slug", slug)
      .maybeSingle();
    if (dup.data) slug = randomSlug();
  }

  const { error: updErr } = await supabase
    .from("projects")
    .update({
      public_dashboard_enabled: parsed.data.enabled,
      public_dashboard_slug: slug,
    })
    .eq("id", parsed.data.project_id);
  if (updErr) return { error: `Update gagal: ${updErr.message}` };

  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  return { ok: true, slug };
}
