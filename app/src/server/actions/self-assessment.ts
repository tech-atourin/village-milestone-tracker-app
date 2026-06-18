"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";
import {
  notifyMany,
  assessmentReviewers,
  notify,
} from "@/lib/notify";

function fileTypeFromMime(mime: string): "image" | "video" | "audio" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

/**
 * Verify the current user is authorized to act on a given desa's
 * assessment row. Allowed:
 *   - The desa_wisata user that represents this desa.
 *   - superadmin (any).
 *   - mitra_admin (only when the desa is currently attached to a
 *     project belonging to this mitra's org).
 */
async function ensureDesaActor(
  desaId: string,
): Promise<
  { user: Awaited<ReturnType<typeof getCurrentUser>> & object } | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  if (user.global_role === "superadmin") return { user };
  if (user.global_role === "desa_wisata") {
    if (user.representing_desa_id === desaId) return { user };
    return { error: "Hanya bisa kelola assessment desa sendiri" };
  }
  if (user.global_role === "mitra_admin") {
    const admin = createAdminClient();
    const { data } = await admin
      .from("project_desa")
      .select("project:projects(organization_id)")
      .eq("desa_id", desaId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgs = ((data ?? []) as any[]).map((r) => r.project?.organization_id);
    if (orgs.includes(user.organization_id)) return { user };
    return { error: "Desa ini tidak terkait dengan organisasi Anda" };
  }
  return { error: "Tidak diizinkan" };
}

const verifySchema = z.object({
  progress_id: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
});

export async function verifyCriteriaItem(
  input: z.input<typeof verifySchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  if (user.global_role !== "superadmin")
    return { error: "Hanya superadmin yang bisa verifikasi kriteria" };
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase.rpc("verify_criteria_item", {
    p_criteria_progress_id: parsed.data.progress_id,
    p_decision: parsed.data.decision,
  });
  if (error) return { error: error.message };

  // Notify the desa representative + audit
  try {
    const admin = createAdminClient();
    const { data: prog } = await admin
      .from("national_criteria_progress")
      .select(
        "desa_id, criteria_item:national_criteria_item(title), desa:desa(name)",
      )
      .eq("id", parsed.data.progress_id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = prog as any;
    if (p?.desa_id) {
      const { data: repUsers } = await admin
        .from("users")
        .select("id")
        .eq("representing_desa_id", p.desa_id)
        .eq("global_role", "desa_wisata")
        .is("deleted_at", null);
      const ids = ((repUsers ?? []) as Array<{ id: string }>).map((u) => u.id);
      await notifyMany({
        user_ids: ids,
        template_key:
          parsed.data.decision === "verified"
            ? "criteria_verified"
            : "criteria_rejected",
        payload: {
          criteria_title: p.criteria_item?.title,
          desa_name: p.desa?.name,
        },
      });
    }
    await audit({
      actor_id: user.id,
      action:
        parsed.data.decision === "verified"
          ? "checklist.approved"
          : "checklist.rejected",
      entity_type: "national_criteria_progress",
      entity_id: parsed.data.progress_id,
    });
  } catch (e) {
    console.warn("verifyCriteriaItem post-hooks failed:", e);
  }
  revalidatePath("/desa/self-assessment");
  revalidatePath("/atourin/klasifikasi");
  return { ok: true };
}

// Sign evidence storage path for display (server-side).
export async function signCriteriaEvidence(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("vmt-evidence")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

// =====================================================
// Multi-file + cross-link evidence for V1 assessment
// =====================================================
// These actions use the evidence_files + evidence_tags model so the
// same file can be (a) uploaded by a peserta in a project and
// (b) reused by the desa as supporting docs for a criteria item.

/**
 * Ensure a national_criteria_progress row exists for this desa+item.
 * Returns the progress_id. Idempotent. Doesn't change status.
 */
async function ensureCriteriaProgressRow(
  desaId: string,
  criteriaItemId: string,
  userId: string,
): Promise<{ progress_id: string } | { error: string }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("national_criteria_progress")
    .select("id")
    .eq("desa_id", desaId)
    .eq("criteria_item_id", criteriaItemId)
    .maybeSingle();
  if (existing) return { progress_id: (existing as { id: string }).id };
  const { data, error } = await admin
    .from("national_criteria_progress")
    .insert({
      desa_id: desaId,
      criteria_item_id: criteriaItemId,
      status: "not_started",
      submitted_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Gagal init progress" };
  return { progress_id: (data as { id: string }).id };
}

const uploadEvidenceSchema = z.object({
  desa_id: z.string().uuid(),
  criteria_item_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(100),
  base64: z.string().min(1),
  caption: z.string().max(500).optional().nullable(),
});

/**
 * Upload one assessment evidence file. Inserts into evidence_files
 * (anchored to desa_id, NOT to a project) and tags it to the criteria
 * progress row. Auto-creates the progress row if needed.
 */
export async function uploadCriteriaEvidenceFile(
  input: z.input<typeof uploadEvidenceSchema>,
): Promise<{ ok: true; evidence_id: string } | { error: string }> {
  const parsed = uploadEvidenceSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const body = parsed.data;
  const access = await ensureDesaActor(body.desa_id);
  if ("error" in access) return { error: access.error };
  const user = access.user;
  const admin = createAdminClient();

  const ensured = await ensureCriteriaProgressRow(
    body.desa_id,
    body.criteria_item_id,
    user.id,
  );
  if ("error" in ensured) return { error: ensured.error };

  const bytes = Buffer.from(body.base64, "base64");
  if (bytes.byteLength > 50 * 1024 * 1024)
    return { error: "File terlalu besar (maks 50 MB)" };
  const safe = body.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `criteria/${body.desa_id}/${body.criteria_item_id}/${Date.now()}-${safe}`;

  const { error: upErr } = await admin.storage
    .from("vmt-evidence")
    .upload(path, bytes, { contentType: body.mime_type, upsert: false });
  if (upErr) return { error: `Upload gagal: ${upErr.message}` };

  // Insert evidence_files row (assessment-anchored, no project_desa_id).
  const { data: evRow, error: evErr } = await admin
    .from("evidence_files")
    .insert({
      project_desa_id: null,
      desa_id: body.desa_id,
      uploaded_by: user.id,
      file_url: path,
      file_type: fileTypeFromMime(body.mime_type),
      file_size_bytes: bytes.byteLength,
      original_filename: body.filename,
      caption: body.caption ?? null,
    })
    .select("id")
    .single();
  if (evErr || !evRow) {
    await admin.storage.from("vmt-evidence").remove([path]);
    return { error: evErr?.message ?? "Insert evidence gagal" };
  }
  const evidenceId = (evRow as { id: string }).id;

  // Tag to criteria progress
  const { error: tagErr } = await admin.from("evidence_tags").insert({
    evidence_id: evidenceId,
    tag_type: "national_criteria_progress",
    tag_target_id: ensured.progress_id,
    tagged_by: user.id,
  });
  if (tagErr) return { error: tagErr.message };

  await audit({
    actor_id: user.id,
    action: "evidence.uploaded",
    entity_type: "criteria_evidence",
    entity_id: evidenceId,
    after: { criteria_item_id: body.criteria_item_id, filename: body.filename },
  });
  revalidatePath("/desa/self-assessment");
  revalidatePath("/desa/dashboard");
  return { ok: true, evidence_id: evidenceId };
}

const submitCriteriaSchema = z.object({
  desa_id: z.string().uuid(),
  criteria_item_id: z.string().uuid(),
  evidence_note: z.string().max(2000).optional().nullable(),
});

/**
 * Mark a criteria item as submitted (after evidence has been uploaded
 * via uploadCriteriaEvidenceFile + linkPesertaEvidenceToCriteria).
 * Updates the evidence_note + status. Atourin sees it in V1 review queue.
 */
export async function submitCriteriaItemForReview(
  input: z.input<typeof submitCriteriaSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = submitCriteriaSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const body = parsed.data;
  const access = await ensureDesaActor(body.desa_id);
  if ("error" in access) return { error: access.error };
  const user = access.user;
  const admin = createAdminClient();

  const ensured = await ensureCriteriaProgressRow(
    body.desa_id,
    body.criteria_item_id,
    user.id,
  );
  if ("error" in ensured) return { error: ensured.error };

  // Make sure at least 1 evidence (legacy path OR new tagged) exists
  const { count: evidenceCount } = await admin
    .from("evidence_tags")
    .select("id", { count: "exact", head: true })
    .eq("tag_type", "national_criteria_progress")
    .eq("tag_target_id", ensured.progress_id);
  const { data: legacy } = await admin
    .from("national_criteria_progress")
    .select("evidence_path")
    .eq("id", ensured.progress_id)
    .maybeSingle();
  const hasLegacy = !!(legacy as { evidence_path: string | null } | null)
    ?.evidence_path;
  if ((evidenceCount ?? 0) === 0 && !hasLegacy)
    return {
      error: "Minimal 1 bukti perlu diupload atau di-link dari evidence peserta.",
    };

  const { error } = await admin
    .from("national_criteria_progress")
    .update({
      status: "submitted",
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      evidence_note: body.evidence_note ?? null,
    })
    .eq("id", ensured.progress_id);
  if (error) return { error: error.message };

  // Notify all assessment reviewers (superadmin) + audit
  try {
    const { data: meta } = await admin
      .from("national_criteria_progress")
      .select(
        "criteria_item:national_criteria_item(title, tier), desa:desa(name)",
      )
      .eq("id", ensured.progress_id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = meta as any;
    const reviewers = await assessmentReviewers();
    await notifyMany({
      user_ids: reviewers,
      template_key: "criteria_submitted",
      payload: {
        criteria_title: m?.criteria_item?.title,
        tier: m?.criteria_item?.tier,
        desa_name: m?.desa?.name,
      },
    });
    await audit({
      actor_id: user.id,
      action: "baseline.submitted",
      entity_type: "national_criteria_progress",
      entity_id: ensured.progress_id,
    });
  } catch (e) {
    console.warn("submitCriteria post-hooks failed:", e);
  }

  revalidatePath("/desa/self-assessment");
  revalidatePath("/desa/dashboard");
  revalidatePath("/atourin/klasifikasi");
  return { ok: true };
}

const linkSchema = z.object({
  desa_id: z.string().uuid(),
  criteria_item_id: z.string().uuid(),
  evidence_ids: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * Link existing peserta evidence_files to a criteria item.
 * The picker UI calls this with selected evidence IDs.
 */
export async function linkPesertaEvidenceToCriteria(
  input: z.input<typeof linkSchema>,
): Promise<{ ok: true; linked: number } | { error: string }> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const body = parsed.data;
  const access = await ensureDesaActor(body.desa_id);
  if ("error" in access) return { error: access.error };
  const user = access.user;
  const admin = createAdminClient();

  // Verify each evidence_id belongs to a project the desa is attached to
  const { data: evRows } = await admin
    .from("evidence_files")
    .select(
      "id, project_desa_id, desa_id, project_desa:project_desa(desa_id)",
    )
    .in("id", body.evidence_ids);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = ((evRows ?? []) as any[]).filter((e) => {
    const projectDesaMatches = e.project_desa?.desa_id === body.desa_id;
    const directlyLinked = e.desa_id === body.desa_id;
    return projectDesaMatches || directlyLinked;
  });
  if (ok.length === 0) return { error: "Tidak ada evidence yang valid" };

  const ensured = await ensureCriteriaProgressRow(
    body.desa_id,
    body.criteria_item_id,
    user.id,
  );
  if ("error" in ensured) return { error: ensured.error };

  // Bulk upsert tags (ignore duplicates)
  const rows = ok.map((e) => ({
    evidence_id: e.id,
    tag_type: "national_criteria_progress",
    tag_target_id: ensured.progress_id,
    tagged_by: user.id,
  }));
  let linked = 0;
  for (const row of rows) {
    const { error } = await admin.from("evidence_tags").insert(row);
    if (!error) linked++;
  }

  // Notify each peserta whose evidence was reused, so they know
  // their contribution helps the desa's klasifikasi. Best-effort.
  try {
    const { data: meta } = await admin
      .from("national_criteria_progress")
      .select(
        "criteria_item:national_criteria_item(title), desa:desa(name)",
      )
      .eq("id", ensured.progress_id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = meta as any;
    // ok rows have e.id (evidence) and e.uploaded_by from join-less query -
    // we need to refetch uploader ids.
    const { data: evWithUploader } = await admin
      .from("evidence_files")
      .select("id, uploaded_by, original_filename")
      .in("id", ok.map((e: { id: string }) => e.id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const ev of ((evWithUploader ?? []) as any[])) {
      if (!ev.uploaded_by || ev.uploaded_by === user.id) continue;
      await notify({
        user_id: ev.uploaded_by,
        template_key: "evidence_linked",
        channel: "in_app",
        payload: {
          evidence_filename: ev.original_filename ?? "(file)",
          desa_name: m?.desa?.name,
          criteria_title: m?.criteria_item?.title,
        },
      });
    }
    await audit({
      actor_id: user.id,
      action: "evidence.uploaded",
      entity_type: "criteria_evidence_linked",
      entity_id: ensured.progress_id,
      after: { linked_count: linked, evidence_ids: rows.map((r) => r.evidence_id) },
    });
  } catch (e) {
    console.warn("linkPeserta post-hooks failed:", e);
  }

  revalidatePath("/desa/self-assessment");
  return { ok: true, linked };
}

const unlinkSchema = z.object({
  desa_id: z.string().uuid(),
  evidence_id: z.string().uuid(),
  criteria_progress_id: z.string().uuid(),
});

export async function unlinkEvidenceFromCriteria(
  input: z.input<typeof unlinkSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = unlinkSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const access = await ensureDesaActor(parsed.data.desa_id);
  if ("error" in access) return { error: access.error };
  const user = access.user;
  const admin = createAdminClient();
  // Verify desa ownership of the progress row
  const { data: prog } = await admin
    .from("national_criteria_progress")
    .select("desa_id")
    .eq("id", parsed.data.criteria_progress_id)
    .maybeSingle();
  if (!prog || (prog as { desa_id: string }).desa_id !== parsed.data.desa_id)
    return { error: "Tidak diizinkan" };
  const { error } = await admin
    .from("evidence_tags")
    .delete()
    .eq("evidence_id", parsed.data.evidence_id)
    .eq("tag_type", "national_criteria_progress")
    .eq("tag_target_id", parsed.data.criteria_progress_id);
  if (error) return { error: error.message };
  await audit({
    actor_id: user.id,
    action: "evidence.uploaded",
    entity_type: "criteria_evidence_unlinked",
    entity_id: parsed.data.criteria_progress_id,
    after: { evidence_id: parsed.data.evidence_id },
  });
  revalidatePath("/desa/self-assessment");
  return { ok: true };
}

export type PesertaEvidenceForDesa = {
  id: string;
  filename: string;
  caption: string | null;
  file_type: string;
  uploaded_at: string;
  uploaded_by_name: string | null;
  project_id: string;
  project_name: string;
  topik_name: string | null;
  checklist_title: string | null;
};

/**
 * Returns all peserta-uploaded evidence files from projects where this
 * desa is attached. Used by the cross-link picker modal.
 */
export async function listPesertaEvidenceForDesa(
  desaId: string,
): Promise<PesertaEvidenceForDesa[]> {
  const admin = createAdminClient();
  // 1. Find project_desa rows for this desa
  const { data: pds } = await admin
    .from("project_desa")
    .select("id, project_id, project:projects(id, name)")
    .eq("desa_id", desaId);
  const pdRows = (pds ?? []) as Array<{
    id: string;
    project_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project: any;
  }>;
  if (pdRows.length === 0) return [];
  const pdIds = pdRows.map((p) => p.id);
  const projectByPdId = new Map(pdRows.map((p) => [p.id, p.project]));

  // 2. Find evidence_files in those project_desa rows
  const { data: evs } = await admin
    .from("evidence_files")
    .select(
      "id, project_desa_id, original_filename, caption, file_type, uploaded_at, uploader:users!evidence_files_uploaded_by_fkey(full_name)",
    )
    .in("project_desa_id", pdIds)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false })
    .limit(500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evRows = (evs ?? []) as any[];

  // 3. For each, look up the most informative tag (checklist_progress → item title + topik name)
  const evIds = evRows.map((e) => e.id);
  const tagInfoByEv = new Map<
    string,
    { topik: string | null; checklist: string | null }
  >();
  if (evIds.length > 0) {
    const { data: tags } = await admin
      .from("evidence_tags")
      .select(
        "evidence_id, tag_target_id, tag_type, checklist_progress:checklist_progress!evidence_tags_tag_target_id_fkey(project_checklist_item:project_checklist_item(title, project_topik:project_topik(name)))",
      )
      .in("evidence_id", evIds)
      .eq("tag_type", "checklist_progress");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of ((tags ?? []) as any[])) {
      if (tagInfoByEv.has(t.evidence_id)) continue;
      tagInfoByEv.set(t.evidence_id, {
        checklist: t.checklist_progress?.project_checklist_item?.title ?? null,
        topik:
          t.checklist_progress?.project_checklist_item?.project_topik?.name ??
          null,
      });
    }
  }

  return evRows.map((e) => {
    const proj = projectByPdId.get(e.project_desa_id);
    const tag = tagInfoByEv.get(e.id);
    return {
      id: e.id,
      filename: e.original_filename ?? "(no name)",
      caption: e.caption ?? null,
      file_type: e.file_type ?? "document",
      uploaded_at: e.uploaded_at,
      uploaded_by_name: e.uploader?.full_name ?? null,
      project_id: proj?.id ?? "",
      project_name: proj?.name ?? "-",
      topik_name: tag?.topik ?? null,
      checklist_title: tag?.checklist ?? null,
    };
  });
}

export type CriteriaProgressEvidence = {
  evidence_id: string;
  filename: string;
  caption: string | null;
  file_type: string;
  file_url: string;
  uploaded_at: string;
  source: "direct" | "linked"; // direct = uploaded by desa for assessment; linked = cross-linked from peserta
  source_project_name: string | null; // when source=linked
};

/**
 * Returns all evidence currently tagged to a criteria progress row,
 * including the source (direct upload vs cross-linked from peserta).
 */
export async function listCriteriaEvidence(
  criteriaProgressId: string,
): Promise<CriteriaProgressEvidence[]> {
  const admin = createAdminClient();
  const { data: tags } = await admin
    .from("evidence_tags")
    .select(
      "evidence_id, evidence:evidence_files!evidence_tags_evidence_id_fkey(id, file_url, original_filename, caption, file_type, uploaded_at, desa_id, project_desa_id, project_desa:project_desa(project:projects(name)))",
    )
    .eq("tag_type", "national_criteria_progress")
    .eq("tag_target_id", criteriaProgressId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((tags ?? []) as any[])
    .map((t) => {
      const e = t.evidence;
      if (!e) return null;
      const isLinked = !!e.project_desa_id;
      return {
        evidence_id: e.id,
        filename: e.original_filename ?? "(no name)",
        caption: e.caption ?? null,
        file_type: e.file_type ?? "document",
        file_url: e.file_url,
        uploaded_at: e.uploaded_at,
        source: isLinked ? "linked" : "direct",
        source_project_name: e.project_desa?.project?.name ?? null,
      } satisfies CriteriaProgressEvidence;
    })
    .filter(
      (x): x is CriteriaProgressEvidence => x !== null,
    );
}
