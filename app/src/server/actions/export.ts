"use server";

import * as XLSX from "xlsx";
import { requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";

export async function exportProjectExcel(projectId: string) {
  await requireRole("superadmin");
  const admin = createAdminClient();

  // Project + organization
  const { data: project } = await admin
    .from("projects")
    .select(
      `id, name, description, period_start, period_end, status,
       organization:organizations(name)`,
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { error: "Project tidak ditemukan" };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = project as any;

  // Desa list
  const { data: desaRows } = await admin
    .from("project_desa")
    .select(
      "id, classification_at_start, classification_target, desa:desa(name, kabupaten, provinsi, current_classification)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desaSheet = (desaRows ?? []).map((r: any) => ({
    "Nama Desa": r.desa?.name,
    Kabupaten: r.desa?.kabupaten,
    Provinsi: r.desa?.provinsi,
    "Klasifikasi Sekarang": r.desa?.current_classification,
    "Klasifikasi Awal": r.classification_at_start,
    "Target Klasifikasi": r.classification_target,
  }));

  // Topik + progress matrix
  const { data: topikRows } = await admin
    .from("project_topik")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  const { data: instances } = await admin
    .from("desa_topik_instance")
    .select(
      "project_topik_id, project_desa_id, completion_percent, status",
    )
    .in(
      "project_desa_id",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (desaRows ?? []).map((r: any) => r.id),
    );

  const desaNameById = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (desaRows ?? []) as any[]) {
    desaNameById.set(r.id, r.desa?.name ?? r.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topikSheet = ((topikRows ?? []) as any[]).map((t) => {
    const row: Record<string, string | number> = { Topik: t.name };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const inst of (instances ?? []) as any[]) {
      if (inst.project_topik_id !== t.id) continue;
      const desaName = desaNameById.get(inst.project_desa_id) ?? "—";
      row[desaName] = Math.round(Number(inst.completion_percent));
    }
    return row;
  });

  // Members
  const { data: members } = await admin
    .from("project_memberships")
    .select(
      "role, status, invited_at, user:users!project_memberships_user_id_fkey(full_name, email, phone), desa:desa(name)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberSheet = (members ?? []).map((m: any) => ({
    Nama: m.user?.full_name,
    Email: m.user?.email,
    HP: m.user?.phone,
    Role: m.role,
    Desa: m.desa?.name ?? "",
    Status: m.status,
    Diundang: m.invited_at,
  }));

  // Build workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        Project: p.name,
        Mitra: p.organization?.name,
        Status: p.status,
        Mulai: p.period_start,
        Selesai: p.period_end,
        Deskripsi: p.description,
      },
    ]),
    "Project",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(desaSheet),
    "Desa",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(topikSheet),
    "Topik × Desa",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(memberSheet),
    "Anggota",
  );

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return {
    base64: buf.toString("base64"),
    filename: `${p.name.replace(/[^a-zA-Z0-9]+/g, "_")}.xlsx`,
  };
}
