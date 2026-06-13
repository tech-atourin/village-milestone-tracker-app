import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ForumPostRow = {
  id: string;
  body: string;
  visibility: string;
  created_at: string;
  author: { id: string; full_name: string };
};

export async function listProjectForum(
  projectId: string,
): Promise<ForumPostRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, body, visibility, created_at, author:users(id, full_name)")
    .eq("target_type", "other")
    .eq("target_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("listProjectForum", error);
    return [];
  }
  return (data ?? []) as unknown as ForumPostRow[];
}
