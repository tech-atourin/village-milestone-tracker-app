import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProjectMemberRow = {
  id: string;
  role: string;
  status: string;
  invited_at: string;
  attendance_mode: "offline" | "online";
  user: {
    id: string;
    full_name: string;
    email: string | null;
    kota: string | null;
    address: string | null;
    gender: string | null;
    jabatan: string | null;
  };
  desa: { id: string; name: string } | null;
  batch: { id: string; name: string } | null;
};

export async function listProjectMembers(
  projectId: string,
): Promise<ProjectMemberRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_memberships")
    .select(
      "id, role, status, invited_at, attendance_mode, user:users!project_memberships_user_id_fkey(id, full_name, email, kota, address, gender, jabatan), desa:desa(id, name), batch:project_batches(id, name)",
    )
    .eq("project_id", projectId)
    .order("invited_at", { ascending: false });
  if (error) {
    console.error("listProjectMembers", error);
    return [];
  }
  return (data ?? []) as unknown as ProjectMemberRow[];
}
