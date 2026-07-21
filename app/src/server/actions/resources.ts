"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

type Ok<T = object> = { ok: true } & T;
type Err = { error: string };

// Whitelisted upload MIME types. Deliberately excludes html/svg (inline-render
// XSS surface when the signed URL is opened directly).
const FILE_TYPE_MAP: Record<string, "image" | "video" | "audio" | "document"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/heic": "image",
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/vnd.ms-powerpoint": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "document",
  "text/csv": "document",
  "text/plain": "document",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
};

const MAX_BYTES = 25 * 1024 * 1024;

// =====================================================
// Access guard: superadmin, or mitra_admin scoped to the project's org.
// =====================================================
async function assertProjectAccess(
  projectId: string,
): Promise<{ actor: { id: string } } | Err> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };
  const admin = createAdminClient();
  const { data: proj } = await admin
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) return { error: "Project tidak ditemukan" };
  if (actor.global_role === "mitra_admin") {
    const orgId = (proj as { organization_id: string | null }).organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }
  return { actor: { id: actor.id } };
}

async function assertResourceAccess(
  resourceId: string,
): Promise<{ actor: { id: string }; projectId: string } | Err> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("project_resources")
    .select("project_id, file_url, kind")
    .eq("id", resourceId)
    .maybeSingle();
  if (!row) return { error: "Item tidak ditemukan" };
  const projectId = (row as { project_id: string }).project_id;
  const access = await assertProjectAccess(projectId);
  if ("error" in access) return access;
  return { actor: access.actor, projectId };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/atourin/projects/${projectId}`);
  revalidatePath(`/mitra/projects/${projectId}`);
  revalidatePath("/peserta/materi");
}

// =====================================================
// Create: link
// =====================================================
const linkSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  url: z.string().url("URL tidak valid").max(2000),
});

export async function createLinkResource(
  input: z.input<typeof linkSchema>,
): Promise<Ok | Err> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const b = parsed.data;
  const access = await assertProjectAccess(b.project_id);
  if ("error" in access) return access;
  const admin = createAdminClient();
  const { error } = await admin.from("project_resources").insert({
    project_id: b.project_id,
    kind: "link",
    title: b.title,
    description: b.description ?? null,
    category: b.category ?? null,
    url: b.url,
    created_by: access.actor.id,
  });
  if (error) return { error: error.message };
  revalidateProject(b.project_id);
  return { ok: true };
}

// =====================================================
// Create: file (base64 upload → vmt-evidence)
// =====================================================
const fileSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(120),
  base64: z.string().min(1),
});

export async function createFileResource(
  input: z.input<typeof fileSchema>,
): Promise<Ok | Err> {
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const b = parsed.data;
  const access = await assertProjectAccess(b.project_id);
  if ("error" in access) return access;

  const fileType = FILE_TYPE_MAP[b.mime_type];
  if (!fileType) return { error: "Tipe file tidak didukung" };

  const bytes = Buffer.from(b.base64, "base64");
  if (bytes.byteLength > MAX_BYTES)
    return {
      error:
        "File terlalu besar (maks 25 MB). Untuk video/rekaman besar, gunakan Tautan.",
    };

  const admin = createAdminClient();
  const safe = b.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `resources/${b.project_id}/${Date.now()}-${safe}`;
  const { error: upErr } = await admin.storage
    .from("vmt-evidence")
    .upload(path, bytes, { contentType: b.mime_type, upsert: false });
  if (upErr) return { error: `Upload gagal: ${upErr.message}` };

  const { error } = await admin.from("project_resources").insert({
    project_id: b.project_id,
    kind: "file",
    title: b.title,
    description: b.description ?? null,
    category: b.category ?? null,
    file_url: path,
    file_type: fileType,
    mime_type: b.mime_type,
    file_size_bytes: bytes.byteLength,
    original_filename: b.filename,
    created_by: access.actor.id,
  });
  if (error) {
    await admin.storage.from("vmt-evidence").remove([path]);
    return { error: error.message };
  }
  revalidateProject(b.project_id);
  return { ok: true };
}

// =====================================================
// Update meta (title/description/category), publish toggle, delete
// =====================================================
const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  url: z.string().url().max(2000).optional().nullable(),
});

export async function updateResource(
  input: z.input<typeof updateSchema>,
): Promise<Ok | Err> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const b = parsed.data;
  const access = await assertResourceAccess(b.id);
  if ("error" in access) return access;
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    title: b.title,
    description: b.description ?? null,
    category: b.category ?? null,
    updated_at: new Date().toISOString(),
  };
  // Only allow url edits on link rows.
  if (b.url) patch.url = b.url;
  const { error } = await admin
    .from("project_resources")
    .update(patch)
    .eq("id", b.id);
  if (error) return { error: error.message };
  revalidateProject(access.projectId);
  return { ok: true };
}

export async function togglePublishResource(
  id: string,
  publish: boolean,
): Promise<Ok | Err> {
  const access = await assertResourceAccess(id);
  if ("error" in access) return access;
  const admin = createAdminClient();
  const { error } = await admin
    .from("project_resources")
    .update({ is_published: publish, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateProject(access.projectId);
  return { ok: true };
}

export async function deleteResource(id: string): Promise<Ok | Err> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("project_resources")
    .select("project_id, file_url")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Item tidak ditemukan" };
  const projectId = (row as { project_id: string }).project_id;
  const access = await assertProjectAccess(projectId);
  if ("error" in access) return access;
  const fileUrl = (row as { file_url: string | null }).file_url;
  if (fileUrl) {
    await admin.storage.from("vmt-evidence").remove([fileUrl]);
  }
  const { error } = await admin.from("project_resources").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProject(projectId);
  return { ok: true };
}

// =====================================================
// Signed download URL for a file resource (members only).
// =====================================================
export async function signResourceDownload(
  resourceId: string,
): Promise<{ url: string } | Err> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("project_resources")
    .select("project_id, file_url, is_published")
    .eq("id", resourceId)
    .maybeSingle();
  if (!row) return { error: "Item tidak ditemukan" };
  const r = row as {
    project_id: string;
    file_url: string | null;
    is_published: boolean;
  };
  if (!r.file_url) return { error: "Bukan file" };

  // Access: superadmin, or an active member of the project. Non-staff can only
  // reach published items.
  if (user.global_role !== "superadmin") {
    const { data: member } = await admin
      .from("project_memberships")
      .select("id")
      .eq("project_id", r.project_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);
    const isMitraOfOrg = user.global_role === "mitra_admin";
    if ((!member || member.length === 0) && !isMitraOfOrg)
      return { error: "Tidak diizinkan" };
    if (!r.is_published && !isMitraOfOrg)
      return { error: "Item belum tersedia" };
  }

  const { data, error } = await admin.storage
    .from("vmt-evidence")
    .createSignedUrl(r.file_url, 60 * 10);
  if (error || !data) return { error: error?.message ?? "Gagal membuat URL" };
  return { url: data.signedUrl };
}
