import "server-only";

import { aiProvider, SchemaType, type AiSchema } from "./provider";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

export type RecommendationItem = {
  priority: 1 | 2 | 3 | 4 | 5;
  action: string;
  why: string;
  expected_impact: string;
  owner_hint: string;
};

export type DesaRecommendation = {
  items: RecommendationItem[];
};

const SCHEMA: AiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          priority: { type: SchemaType.INTEGER },
          action: { type: SchemaType.STRING },
          why: { type: SchemaType.STRING },
          expected_impact: { type: SchemaType.STRING },
          owner_hint: { type: SchemaType.STRING },
        },
        required: ["priority", "action", "why", "expected_impact", "owner_hint"],
      },
    },
  },
  required: ["items"],
};

const SYSTEM = `Anda mentor program pendampingan desa wisata Atourin.
Tugas: hasilkan 5 action item prioritas untuk desa berikut berdasarkan
baseline + progress + item yang direject Atourin.

Aturan:
- Maksimal 5 item, prioritas 1 (paling urgent) → 5 (low).
- Action: kalimat aksi konkret 1 baris (mulai kata kerja).
- Why: alasan singkat berdasarkan data desa, 1 kalimat.
- Expected impact: dampak konkret 1 frasa pendek.
- Owner hint: siapa yang harusnya kerjakan (Pokdarwis Ketua, Bendahara,
  pemandu lokal, narasumber Atourin, dll).
- Fokus pada item yang akan paling cepat memajukan tier klasifikasi.
- Hindari saran abstrak. Tidak ada placeholder atau hallucination.
- Tulis Bahasa Indonesia.`;

async function assembleContext(projectDesaId: string): Promise<string> {
  const supabase = createClient();

  const { data: pd } = await supabase
    .from("project_desa")
    .select(
      `id,
       project:projects(name),
       desa:desa(name, kabupaten, provinsi, current_classification)`,
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

  const { data: rejected } = await supabase
    .from("checklist_progress")
    .select(
      "review_note, project_checklist_item:project_checklist_item(title, required), desa_topik_instance:desa_topik_instance!inner(project_desa_id, project_topik:project_topik(name))",
    )
    .eq("desa_topik_instance.project_desa_id", projectDesaId)
    .eq("status", "rejected");

  const { data: notStarted } = await supabase
    .from("project_checklist_item")
    .select(
      `id, title, required,
       project_topik:project_topik!inner(project_id, name)`,
    )
    .limit(80);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdAny = pd as any;
  const lines: string[] = [];
  if (pdAny) {
    lines.push(`Desa: ${pdAny.desa?.name ?? "-"}`);
    lines.push(
      `Lokasi: ${[pdAny.desa?.kabupaten, pdAny.desa?.provinsi].filter(Boolean).join(", ") || "-"}`,
    );
    lines.push(`Klasifikasi: ${pdAny.desa?.current_classification ?? "unclassified"}`);
    lines.push(`Project: ${pdAny.project?.name ?? "-"}`);
  }

  if (baseline) {
    lines.push("\nRingkasan baseline:");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (baseline as any).data as Record<string, unknown>;
    let i = 0;
    for (const [k, v] of Object.entries(data ?? {})) {
      if (i++ > 12) break;
      if (v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
      lines.push(`  - ${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
    }
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

  const rejectedArr = (rejected ?? []) as unknown as Array<{
    review_note: string | null;
    project_checklist_item: { title: string; required: boolean };
    desa_topik_instance: { project_topik: { name: string } };
  }>;
  if (rejectedArr.length > 0) {
    lines.push("\nItem yang perlu revisi (max 5):");
    for (const r of rejectedArr.slice(0, 5)) {
      lines.push(
        `  - [${r.desa_topik_instance.project_topik?.name}] ${r.project_checklist_item?.title} → ${r.review_note ?? "(tanpa catatan)"}`,
      );
    }
  }

  return lines.join("\n");
}

export async function generateDesaRecommendation(
  projectDesaId: string,
): Promise<{
  data?: DesaRecommendation;
  cached?: boolean;
  error?: string;
}> {
  const provider = aiProvider();
  if (!provider.isReady()) {
    return {
      error: "GEMINI_API_KEY belum di-set di .env.local.",
    };
  }

  const supabase = createClient();
  const user = await getCurrentUser();

  // Cache: 24 hour (shorter than summary since context changes often)
  const { data: cached } = await supabase
    .from("ai_insights")
    .select("content, generated_at, valid_until")
    .eq("target_type", "project_desa")
    .eq("target_id", projectDesaId)
    .eq("insight_type", "recommendation")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    const validUntil = (cached as { valid_until: string | null }).valid_until;
    if (validUntil && new Date(validUntil) > new Date()) {
      return {
        data: (cached as { content: DesaRecommendation }).content,
        cached: true,
      };
    }
  }

  const context = await assembleContext(projectDesaId);

  try {
    const r = await provider.generateStructured<DesaRecommendation>({
      prompt: context,
      systemPrompt: SYSTEM,
      schema: SCHEMA,
      model: "summary",
      maxOutputTokens: 1200,
    });

    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    await supabase.from("ai_insights").insert({
      target_type: "project_desa",
      target_id: projectDesaId,
      insight_type: "recommendation",
      content: r.data,
      model: provider.modelSummary,
      input_tokens: r.inputTokens,
      output_tokens: r.outputTokens,
      valid_until: validUntil.toISOString(),
      triggered_by: user?.id ?? null,
    });

    return { data: r.data, cached: false };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
