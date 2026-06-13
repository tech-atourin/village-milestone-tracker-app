import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AssessmentComment = {
  id: string;
  target_type: "criteria_progress" | "hub_question";
  target_id: string;
  desa_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};

export async function listCommentsForCriteriaProgress(
  desaId: string,
): Promise<Map<string, AssessmentComment[]>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("assessment_comments")
    .select(
      "id, target_type, target_id, desa_id, author_id, author_role, body, is_internal, created_at, author:users!assessment_comments_author_id_fkey(full_name)",
    )
    .eq("desa_id", desaId)
    .eq("target_type", "criteria_progress")
    .order("created_at", { ascending: true });

  const map = new Map<string, AssessmentComment[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((data ?? []) as any[])) {
    const row: AssessmentComment = {
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      desa_id: r.desa_id,
      author_id: r.author_id,
      author_name: r.author?.full_name ?? "—",
      author_role: r.author_role,
      body: r.body,
      is_internal: r.is_internal,
      created_at: r.created_at,
    };
    const arr = map.get(row.target_id) ?? [];
    arr.push(row);
    map.set(row.target_id, arr);
  }
  return map;
}

export async function listCommentsForHubAssessment(
  desaId: string,
  assessmentId: string,
): Promise<Map<string, AssessmentComment[]>> {
  const supabase = createClient();
  const prefix = `${assessmentId}:`;
  const { data } = await supabase
    .from("assessment_comments")
    .select(
      "id, target_type, target_id, desa_id, author_id, author_role, body, is_internal, created_at, author:users!assessment_comments_author_id_fkey(full_name)",
    )
    .eq("desa_id", desaId)
    .eq("target_type", "hub_question")
    .like("target_id", `${prefix}%`)
    .order("created_at", { ascending: true });

  const map = new Map<string, AssessmentComment[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((data ?? []) as any[])) {
    const questionId = (r.target_id as string).slice(prefix.length);
    const row: AssessmentComment = {
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      desa_id: r.desa_id,
      author_id: r.author_id,
      author_name: r.author?.full_name ?? "—",
      author_role: r.author_role,
      body: r.body,
      is_internal: r.is_internal,
      created_at: r.created_at,
    };
    const arr = map.get(questionId) ?? [];
    arr.push(row);
    map.set(questionId, arr);
  }
  return map;
}
