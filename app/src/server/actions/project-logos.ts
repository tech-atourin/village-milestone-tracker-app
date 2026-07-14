"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const uploadSchema = z.object({
  project_id: z.string().uuid(),
  label: z.string().min(1).max(60),
  filename: z.string().min(1).max(200),
  mime_type: z.string(),
  base64: z.string().min(1),
});

export async function uploadProjectLogo(input: z.input<typeof uploadSchema>) {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };

  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const admin = createAdminClient();

  // Mitra ownership guard
  if (actor.global_role === "mitra_admin") {
    const { data: proj } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", parsed.data.project_id)
      .maybeSingle();
    const orgId = (proj as { organization_id: string | null } | null)
      ?.organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }

  const bytes = Buffer.from(parsed.data.base64, "base64");
  if (bytes.byteLength > 2 * 1024 * 1024)
    return { error: "Logo maks 2 MB" };

  const safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `project-logos/${parsed.data.project_id}/${Date.now()}-${safe}`;

  const { error: upErr } = await admin.storage
    .from("vmt-evidence")
    .upload(path, bytes, {
      contentType: parsed.data.mime_type,
      upsert: false,
    });
  if (upErr) return { error: upErr.message };

  // Append to extra_logos JSONB array
  const { data: row } = await admin
    .from("projects")
    .select("extra_logos")
    .eq("id", parsed.data.project_id)
    .maybeSingle();
  const current =
    ((row as { extra_logos: Array<{ path: string; label: string }> } | null)
      ?.extra_logos ?? []);
  const next = [...current, { path, label: parsed.data.label.trim() }];

  const { error: updErr } = await admin
    .from("projects")
    .update({ extra_logos: next })
    .eq("id", parsed.data.project_id);
  if (updErr) {
    await admin.storage.from("vmt-evidence").remove([path]);
    return { error: updErr.message };
  }

  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  return { ok: true, path };
}

const removeSchema = z.object({
  project_id: z.string().uuid(),
  path: z.string().min(1),
});

export async function removeProjectLogo(input: z.input<typeof removeSchema>) {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const admin = createAdminClient();

  if (actor.global_role === "mitra_admin") {
    const { data: proj } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", parsed.data.project_id)
      .maybeSingle();
    const orgId = (proj as { organization_id: string | null } | null)
      ?.organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }

  const { data: row } = await admin
    .from("projects")
    .select("extra_logos")
    .eq("id", parsed.data.project_id)
    .maybeSingle();
  const current =
    ((row as { extra_logos: Array<{ path: string; label: string }> } | null)
      ?.extra_logos ?? []);
  // Only allow deleting a path that is actually registered on this project.
  // Prevents crafting a request that deletes arbitrary storage objects from
  // the vmt-evidence bucket (e.g. someone else's project's evidence).
  if (!current.some((l) => l.path === parsed.data.path))
    return { error: "Logo tidak terdaftar pada project ini" };
  const next = current.filter((l) => l.path !== parsed.data.path);

  const { error: updErr } = await admin
    .from("projects")
    .update({ extra_logos: next })
    .eq("id", parsed.data.project_id);
  if (updErr) return { error: updErr.message };

  await admin.storage.from("vmt-evidence").remove([parsed.data.path]);

  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  return { ok: true };
}

export async function listProjectLogoUrls(
  project_id: string,
): Promise<Array<{ path: string; label: string; signed_url: string }>> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("projects")
    .select("extra_logos")
    .eq("id", project_id)
    .maybeSingle();
  const logos =
    ((row as { extra_logos: Array<{ path: string; label: string }> } | null)
      ?.extra_logos ?? []);
  if (logos.length === 0) return [];

  // Sign all in parallel, 30 days
  const signed = await Promise.all(
    logos.map(async (l) => {
      const { data } = await admin.storage
        .from("vmt-evidence")
        .createSignedUrl(l.path, 60 * 60 * 24 * 30);
      return {
        path: l.path,
        label: l.label,
        signed_url: data?.signedUrl ?? "",
      };
    }),
  );
  return signed.filter((s) => s.signed_url);
}
