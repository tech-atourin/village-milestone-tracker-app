import "server-only";

import { createClient } from "@/lib/supabase/server";

export type EvidenceLibraryItem = {
  id: string;
  file_url: string;
  file_type: "image" | "video" | "document" | "audio";
  original_filename: string | null;
  caption: string | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  uploaded_by_name: string;
  tag_count: number;
  signed_url: string | null;
};

export async function listEvidenceLibrary(
  projectDesaId: string,
): Promise<EvidenceLibraryItem[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("evidence_files")
    .select(
      "id, file_url, file_type, original_filename, caption, file_size_bytes, uploaded_at, uploaded_by, uploader:users(full_name)",
    )
    .eq("project_desa_id", projectDesaId)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false })
    .limit(200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evidence = (rows ?? []) as any[];
  if (evidence.length === 0) return [];

  const ids = evidence.map((e) => e.id);
  const { data: tags } = await supabase
    .from("evidence_tags")
    .select("evidence_id")
    .in("evidence_id", ids);
  const tagCount = new Map<string, number>();
  for (const t of (tags ?? []) as Array<{ evidence_id: string }>) {
    tagCount.set(t.evidence_id, (tagCount.get(t.evidence_id) ?? 0) + 1);
  }

  // Sign URLs (1h)
  const signed = new Map<string, string>();
  for (const e of evidence) {
    const { data: s } = await supabase.storage
      .from("vmt-evidence")
      .createSignedUrl(e.file_url, 3600);
    if (s?.signedUrl) signed.set(e.file_url, s.signedUrl);
  }

  return evidence.map((e) => ({
    id: e.id,
    file_url: e.file_url,
    file_type: e.file_type,
    original_filename: e.original_filename,
    caption: e.caption,
    file_size_bytes: e.file_size_bytes,
    uploaded_at: e.uploaded_at,
    uploaded_by_name: e.uploader?.full_name ?? "—",
    tag_count: tagCount.get(e.id) ?? 0,
    signed_url: signed.get(e.file_url) ?? null,
  }));
}

export type ChecklistOption = {
  checklist_progress_id: string | null;
  project_checklist_item_id: string;
  project_topik_id: string;
  title: string;
  topik_name: string;
  desa_topik_instance_id: string;
  tagged: boolean;
};

export async function listChecklistOptionsForEvidence(
  projectDesaId: string,
  evidenceId: string,
): Promise<ChecklistOption[]> {
  const supabase = createClient();

  // Get project_id
  const { data: pd } = await supabase
    .from("project_desa")
    .select("project_id")
    .eq("id", projectDesaId)
    .maybeSingle();
  const projectId = (pd as { project_id: string } | null)?.project_id;
  if (!projectId) return [];

  // All checklist items in this project
  const { data: items } = await supabase
    .from("project_checklist_item")
    .select(
      `id, title,
       project_topik:project_topik!inner(id, name, project_id)`,
    )
    .eq("project_topik.project_id", projectId)
    .order("sort_order");

  // Desa topik instances
  const { data: instances } = await supabase
    .from("desa_topik_instance")
    .select("id, project_topik_id")
    .eq("project_desa_id", projectDesaId);
  const instanceMap = new Map<string, string>(
    ((instances ?? []) as Array<{ id: string; project_topik_id: string }>).map(
      (i) => [i.project_topik_id, i.id],
    ),
  );

  // Existing checklist_progress rows
  const { data: progress } = await supabase
    .from("checklist_progress")
    .select("id, project_checklist_item_id, desa_topik_instance_id")
    .in(
      "desa_topik_instance_id",
      Array.from(instanceMap.values()),
    );
  const progressMap = new Map<string, string>();
  for (const p of (progress ?? []) as Array<{
    id: string;
    project_checklist_item_id: string;
  }>) {
    progressMap.set(p.project_checklist_item_id, p.id);
  }

  // Existing tags for this evidence
  const { data: tagged } = await supabase
    .from("evidence_tags")
    .select("tag_target_id")
    .eq("evidence_id", evidenceId)
    .eq("tag_type", "checklist_progress");
  const taggedSet = new Set<string>(
    ((tagged ?? []) as Array<{ tag_target_id: string }>).map(
      (t) => t.tag_target_id,
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((items ?? []) as any[]).map((it) => {
    const topikId = it.project_topik?.id;
    const instanceId = instanceMap.get(topikId) ?? "";
    const cpId = progressMap.get(it.id) ?? null;
    return {
      checklist_progress_id: cpId,
      project_checklist_item_id: it.id,
      project_topik_id: topikId,
      title: it.title,
      topik_name: it.project_topik?.name ?? "",
      desa_topik_instance_id: instanceId,
      tagged: cpId ? taggedSet.has(cpId) : false,
    };
  });
}
