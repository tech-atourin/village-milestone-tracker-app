import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type EvidenceDirectoryRow = {
  id: string;
  file_url: string;
  file_type: string | null;
  original_filename: string | null;
  caption: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  uploader: { id: string; full_name: string } | null;
  desa: { id: string; name: string } | null;
  topik: { id: string; name: string } | null;
  checklist_item: { id: string; title: string } | null;
  tag_type: string | null;
};

/**
 * Flat directory of every evidence file in a project, regardless of review
 * status. Used by the Bukti tab "Direktori Bukti" mode so reviewers can audit /
 * download bukti without going through the per-topik review flow. Joins
 * checklist_progress → desa_topik_instance → project_topik so each row carries
 * its (desa, topik, item) breadcrumb.
 */
export async function listProjectEvidenceDirectory(
  projectId: string,
): Promise<EvidenceDirectoryRow[]> {
  const supabase = createAdminClient();

  // Step 1: project_desa ids for this project (scope filter).
  const { data: pdRows } = await supabase
    .from("project_desa")
    .select("id, desa:desa(id, name)")
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectDesaIds = ((pdRows ?? []) as any[]).map((r) => r.id as string);
  if (projectDesaIds.length === 0) return [];

  const desaByPd = new Map<string, { id: string; name: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (pdRows ?? []) as any[]) {
    if (r.desa) {
      desaByPd.set(r.id as string, {
        id: r.desa.id as string,
        name: r.desa.name as string,
      });
    }
  }

  // Step 2: every evidence_file under those project_desa, with uploader.
  // NOTE: column is `uploaded_at` (not created_at) and we filter out
  // soft-deleted rows.
  const { data: fileRows } = await supabase
    .from("evidence_files")
    .select(
      "id, project_desa_id, file_url, file_type, original_filename, caption, file_size_bytes, uploaded_at, uploaded_by, uploader:users!evidence_files_uploaded_by_fkey(id, full_name)",
    )
    .in("project_desa_id", projectDesaIds)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false })
    .limit(1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const files = (fileRows ?? []) as any[];
  if (files.length === 0) return [];

  // Step 3: tags map file → (checklist_progress / pendampingan_session / criteria_progress).
  const fileIds = files.map((f) => f.id as string);
  const { data: tagRows } = await supabase
    .from("evidence_tags")
    .select("evidence_id, tag_type, tag_target_id")
    .in("evidence_id", fileIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = (tagRows ?? []) as any[];

  // Pre-fetch checklist_progress → topik + item for tags of type checklist_progress.
  const cpIds = Array.from(
    new Set(
      tags
        .filter((t) => t.tag_type === "checklist_progress")
        .map((t) => t.tag_target_id as string),
    ),
  );
  const cpDetail = new Map<
    string,
    {
      topik: { id: string; name: string } | null;
      item: { id: string; title: string } | null;
    }
  >();
  if (cpIds.length) {
    const { data: cpRows } = await supabase
      .from("checklist_progress")
      .select(
        "id, project_checklist_item:project_checklist_item(id, title, project_topik:project_topik(id, name))",
      )
      .in("id", cpIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of (cpRows ?? []) as any[]) {
      const itm = c.project_checklist_item;
      const top = itm?.project_topik;
      cpDetail.set(c.id as string, {
        item: itm ? { id: itm.id, title: itm.title } : null,
        topik: top ? { id: top.id, name: top.name } : null,
      });
    }
  }

  // Pick the most informative tag per file (prefer checklist_progress).
  const primaryTagByFile = new Map<
    string,
    { tag_type: string; tag_target_id: string } | null
  >();
  for (const f of files) primaryTagByFile.set(f.id, null);
  for (const t of tags) {
    const cur = primaryTagByFile.get(t.evidence_id);
    if (!cur || (cur.tag_type !== "checklist_progress" && t.tag_type === "checklist_progress")) {
      primaryTagByFile.set(t.evidence_id, {
        tag_type: t.tag_type,
        tag_target_id: t.tag_target_id,
      });
    }
  }

  return files.map((f) => {
    const tag = primaryTagByFile.get(f.id as string);
    const cp =
      tag?.tag_type === "checklist_progress"
        ? cpDetail.get(tag.tag_target_id)
        : null;
    return {
      id: f.id as string,
      file_url: f.file_url as string,
      file_type: (f.file_type as string) ?? null,
      original_filename: (f.original_filename as string) ?? null,
      caption: (f.caption as string) ?? null,
      file_size_bytes: (f.file_size_bytes as number) ?? null,
      uploaded_at: (f.uploaded_at as string) ?? null,
      uploader: f.uploader
        ? {
            id: f.uploader.id as string,
            full_name: f.uploader.full_name as string,
          }
        : null,
      desa: desaByPd.get(f.project_desa_id as string) ?? null,
      topik: cp?.topik ?? null,
      checklist_item: cp?.item ?? null,
      tag_type: tag?.tag_type ?? null,
    };
  });
}
