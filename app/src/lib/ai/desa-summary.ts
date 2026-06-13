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
Jangan halusinasi data — kalau informasi tidak ada, sebutkan "belum ada data".`;

async function assembleContext(projectDesaId: string): Promise<string> {
  const supabase = createClient();

  const { data: pd } = await supabase
    .from("project_desa")
    .select(
      `
      id,
      project:projects(name),
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
    lines.push(`Desa: ${pdAny.desa?.name ?? "—"}`);
    lines.push(
      `Lokasi: ${[pdAny.desa?.kabupaten, pdAny.desa?.provinsi].filter(Boolean).join(", ") || "—"}`,
    );
    lines.push(`Project: ${pdAny.project?.name ?? "—"}`);
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
      `  - ${inst.project_topik?.name ?? "—"}: ${Math.round(Number(inst.completion_percent))}% (${inst.status})`,
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
