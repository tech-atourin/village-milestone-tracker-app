"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const schema = z.object({
  project_id: z.string().uuid(),
  enabled: z.boolean(),
});

function randomSlug(): string {
  // 10-char base36 — enough entropy for non-guessable per-project token
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 8)
  ).slice(0, 12);
}

export async function togglePublicDashboard(
  input: z.input<typeof schema>,
): Promise<{ ok: true; slug: string } | { error: string }> {
  try {
    await requireRole("superadmin", "mitra_admin");
  } catch {
    return { error: "Tidak diizinkan: butuh akses superadmin atau mitra admin." };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createAdminClient();

  const { data: existing, error: readErr } = await supabase
    .from("projects")
    .select("public_dashboard_slug")
    .eq("id", parsed.data.project_id)
    .maybeSingle();
  if (readErr) return { error: `Read gagal: ${readErr.message}` };

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
