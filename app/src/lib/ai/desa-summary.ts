import "server-only";

import { aiProvider, SchemaType, type AiSchema } from "./provider";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

export type DesaSummary = {
  overview: string;
  highlights: string[];
  areas_to_push: string[];
  quick_wins: string[];
};

const SUMMARY_SCHEMA: AiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overview: { type: SchemaType.STRING },
    highlights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    areas_to_push: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    quick_wins: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["overview", "highlights", "areas_to_push", "quick_wins"],
};

const SYSTEM_PROMPT = `Anda adalah mentor program pendampingan desa wisata Atourin.
Tugas: ringkas kondisi desa berdasarkan data baseline + progress topik + evidence yang sudah diapprove,
lalu rekomendasikan 3 highlight positif, 3 area yang perlu didorong, dan 3 quick wins.
Tulis dalam Bahasa Indonesia yang ramah, konkret, dan actionable.
Jangan halusinasi data - kalau informasi tidak ada, sebutkan "belum ada data".`;

// Shared context assembly for all desa-level AI insights.
// Pulls: project header, baseline data, topik progress, checklist counts,
// narasumber session reports (per day), and rencana aksi summary.
// Used by summary, recommendation, and swot generators.
export async function assembleContext(projectDesaId: string): Promise<string> {
  const supabase = createClient();

  const { data: pd } = await supabase
    .from("project_desa")
    .select(
      `
      id,
      project:projects(id, name),
      desa:desa(name, kabupaten, provinsi, current_classification)
    `,
    )
    .eq("id", projectDesaId)
    .maybeSingle();

  const { data: baseline } = await supabase
    .from("desa_baseline_data")
    .select("data, submitted_at")
    .eq("project_desa_id", projectDesaId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: instances } = await supabase
    .from("desa_topik_instance")
    .select(
      "completion_percent, status, project_topik:project_topik(name)",
    )
    .eq("project_desa_id", projectDesaId);

  const { data: progress } = await supabase
    .from("checklist_progress")
    .select(
      "status, review_note, project_checklist_item:project_checklist_item(title), desa_topik_instance:desa_topik_instance!inner(project_desa_id)",
    )
    .eq("desa_topik_instance.project_desa_id", projectDesaId);

  const lines: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdAny = pd as any;
  if (pdAny) {
    lines.push(`Desa: ${pdAny.desa?.name ?? "-"}`);
    lines.push(
      `Lokasi: ${[pdAny.desa?.kabupaten, pdAny.desa?.provinsi].filter(Boolean).join(", ") || "-"}`,
    );
    lines.push(`Project: ${pdAny.project?.name ?? "-"}`);
    lines.push(
      `Klasifikasi nasional saat ini: ${pdAny.desa?.current_classification ?? "belum diklasifikasi"}`,
    );
  }

  if (baseline) {
    lines.push("\nBaseline desa:");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (baseline as any).data as Record<string, unknown>;
    for (const [k, v] of Object.entries(data ?? {})) {
      if (v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
      lines.push(`  - ${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
    }
  } else {
    lines.push("\nBaseline desa: belum diisi");
  }

  lines.push("\nProgress per topik:");
  for (const inst of (instances ?? []) as unknown as Array<{
    completion_percent: number;
    status: string;
    project_topik: { name: string };
  }>) {
    lines.push(
      `  - ${inst.project_topik?.name ?? "-"}: ${Math.round(Number(inst.completion_percent))}% (${inst.status})`,
    );
  }

  const approved = (progress ?? []).filter(
    (p: { status: string }) => p.status === "approved",
  );
  const rejected = (progress ?? []).filter(
    (p: { status: string }) => p.status === "rejected",
  );
  lines.push(`\nChecklist disetujui: ${approved.length}`);
  lines.push(`Checklist butuh revisi: ${rejected.length}`);

  if (rejected.length > 0) {
    lines.push("\nItem yang butuh revisi (3 contoh):");
    for (const r of rejected.slice(0, 3) as unknown as Array<{
      project_checklist_item: { title: string };
      review_note: string | null;
    }>) {
      lines.push(`  - ${r.project_checklist_item?.title}: ${r.review_note ?? ""}`);
    }
  }

  // Narasumber daily session reports - the richest qualitative input.
  const projectId = (pdAny?.project as { id?: string })?.id;
  const { data: sessions } = await supabase
    .from("pendampingan_sessions")
    .select(
      "day_number, session_date, materi, maksud_tujuan, aktivitas, output_sesi, tindak_lanjut, kondisi_sebelum, kondisi_setelah, rekomendasi, status, narasumber:users!pendampingan_sessions_narasumber_id_fkey(full_name, kompetensi)",
    )
    .eq("project_desa_id", projectDesaId)
    .order("day_number");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessRows = (sessions ?? []) as any[];
  if (sessRows.length > 0) {
    lines.push(`\nLaporan narasumber (${sessRows.length} sesi):`);
    for (const s of sessRows) {
      lines.push(
        `  Hari ${s.day_number ?? "?"} (${s.session_date ?? "-"}) · ${s.materi ?? "-"} · narasumber: ${s.narasumber?.full_name ?? "-"}`,
      );
      if (s.maksud_tujuan) lines.push(`    Tujuan: ${s.maksud_tujuan}`);
      if (Array.isArray(s.aktivitas) && s.aktivitas.length > 0)
        lines.push(`    Aktivitas: ${s.aktivitas.join("; ")}`);
      if (Array.isArray(s.output_sesi) && s.output_sesi.length > 0)
        lines.push(`    Output: ${s.output_sesi.join("; ")}`);
      if (Array.isArray(s.tindak_lanjut) && s.tindak_lanjut.length > 0)
        lines.push(`    Tindak lanjut: ${s.tindak_lanjut.join("; ")}`);
      if (Array.isArray(s.kondisi_sebelum) && s.kondisi_sebelum.length > 0) {
        lines.push(`    Kondisi sebelum: ${s.kondisi_sebelum.join("; ")}`);
      }
      if (Array.isArray(s.kondisi_setelah) && s.kondisi_setelah.length > 0) {
        lines.push(`    Kondisi setelah: ${s.kondisi_setelah.join("; ")}`);
      }
      if (Array.isArray(s.rekomendasi) && s.rekomendasi.length > 0)
        lines.push(`    Rekomendasi: ${s.rekomendasi.join("; ")}`);
    }
  } else {
    lines.push("\nLaporan narasumber: belum ada sesi tercatat");
  }

  // Rencana aksi (peserta + narasumber)
  const { data: aps } = await supabase
    .from("desa_action_plans")
    .select("title, status, timeframe, output_target, pihak_terlibat")
    .eq("project_desa_id", projectDesaId)
    .order("created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apRows = (aps ?? []) as any[];
  if (apRows.length > 0) {
    const by = { rencana: 0, on_track: 0, selesai: 0, ditunda: 0 } as Record<string, number>;
    for (const r of apRows) if (r.status in by) by[r.status as string]++;
    lines.push(
      `\nRencana aksi (${apRows.length}) - ${by.selesai} selesai, ${by.on_track} on track, ${by.rencana} rencana, ${by.ditunda} ditunda:`,
    );
    for (const r of apRows.slice(0, 10)) {
      lines.push(
        `  - [${r.status}] ${r.timeframe ?? "-"} · ${r.title}` +
          (r.output_target ? ` → ${r.output_target}` : "") +
          (r.pihak_terlibat ? ` (${r.pihak_terlibat})` : ""),
      );
    }
  } else {
    lines.push("\nRencana aksi: belum ada");
  }

  // Pre/post test growth per materi if available
  if (projectId) {
    const { data: testRows } = await supabase
      .from("peserta_test_results")
      .select(
        "score, project_topik:project_topik(name), gform:project_gforms!inner(form_type, project_id)",
      )
      .eq("gform.project_id", projectId)
      .not("project_topik_id", "is", null);
    type Agg = { pre: number[]; post: number[] };
    const byMateri = new Map<string, Agg>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of ((testRows ?? []) as any[])) {
      const name = r.project_topik?.name ?? "-";
      const cur = byMateri.get(name) ?? { pre: [], post: [] };
      if (r.gform?.form_type === "pre_test") cur.pre.push(Number(r.score));
      else if (r.gform?.form_type === "post_test") cur.post.push(Number(r.score));
      byMateri.set(name, cur);
    }
    if (byMateri.size > 0) {
      lines.push("\nPertumbuhan pre→post test per materi (project-wide):");
      for (const [name, agg] of Array.from(byMateri.entries())) {
        const avg = (arr: number[]) =>
          arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
        const pre = avg(agg.pre);
        const post = avg(agg.post);
        const delta = pre != null && post != null ? post - pre : null;
        lines.push(
          `  - ${name}: pre ${pre ?? "-"} → post ${post ?? "-"} (Δ ${delta != null ? (delta > 0 ? "+" : "") + delta : "-"})`,
        );
      }
    }
  }

  return lines.join("\n");
}

export async function generateDesaSummary(projectDesaId: string): Promise<{
  data?: DesaSummary;
  error?: string;
  cached?: boolean;
}> {
  const provider = aiProvider();
  if (!provider.isReady()) {
    return {
      error:
        "GEMINI_API_KEY belum di-set. Tambahkan ke .env.local untuk mengaktifkan AI summary.",
    };
  }

  const supabase = createClient();
  const user = await getCurrentUser();

  // 7-day cache
  const { data: cached } = await supabase
    .from("ai_insights")
    .select("content, generated_at, valid_until")
    .eq("target_type", "project_desa")
    .eq("target_id", projectDesaId)
    .eq("insight_type", "summary")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    const validUntil = (cached as { valid_until: string | null }).valid_until;
    if (validUntil && new Date(validUntil) > new Date()) {
      return {
        data: (cached as { content: DesaSummary }).content,
        cached: true,
      };
    }
  }

  const context = await assembleContext(projectDesaId);

  try {
    const result = await provider.generateStructured<DesaSummary>({
      prompt: context,
      systemPrompt: SYSTEM_PROMPT,
      schema: SUMMARY_SCHEMA,
      model: "summary",
      maxOutputTokens: 1200,
    });

    // Cache for 7 days
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    await supabase.from("ai_insights").insert({
      target_type: "project_desa",
      target_id: projectDesaId,
      insight_type: "summary",
      content: result.data,
      model: provider.modelSummary,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      valid_until: validUntil.toISOString(),
      triggered_by: user?.id ?? null,
    });

    return { data: result.data, cached: false };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
