import "server-only";

import { aiProvider, SchemaType, type AiSchema } from "./provider";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { assembleContext } from "./desa-summary";

export type DesaSwot = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

const SCHEMA: AiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    opportunities: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["strengths", "weaknesses", "opportunities", "threats"],
};

const SYSTEM = `Anda adalah mentor program pendampingan desa wisata Atourin.
Tugas: SUSUN SWOT analysis spesifik untuk desa wisata ini, berdasarkan data
yang diberikan (baseline, progress checklist, laporan harian narasumber,
rencana aksi, dan pre/post test).

Petunjuk:
- 4-6 bullet per kuadran (Strengths, Weaknesses, Opportunities, Threats)
- Setiap bullet konkret, merujuk angka/fakta dari data — jangan generic
- Bahasa Indonesia yang ringkas dan actionable
- Kalau data kurang untuk sebuah kuadran, tetap berikan minimal 2 bullet
  yang valid dari informasi yang tersedia
- Strengths/Weaknesses: kondisi INTERNAL desa (SDM, kelembagaan, produk)
- Opportunities/Threats: kondisi EKSTERNAL (pasar, regulasi, lingkungan)
- Jangan halusinasi — kalau tidak yakin, jangan tulis`;

export async function generateDesaSwot(projectDesaId: string): Promise<{
  data?: DesaSwot;
  error?: string;
  cached?: boolean;
}> {
  const provider = aiProvider();
  if (!provider.isReady()) {
    return {
      error:
        "GEMINI_API_KEY belum di-set. Tambahkan ke .env.local untuk mengaktifkan SWOT AI.",
    };
  }

  const supabase = createClient();
  const user = await getCurrentUser();

  // 7-day cache
  const { data: cached } = await supabase
    .from("ai_insights")
    .select("content, valid_until")
    .eq("target_type", "project_desa")
    .eq("target_id", projectDesaId)
    .eq("insight_type", "swot")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    const validUntil = (cached as { valid_until: string | null }).valid_until;
    if (validUntil && new Date(validUntil) > new Date()) {
      return {
        data: (cached as { content: DesaSwot }).content,
        cached: true,
      };
    }
  }

  const context = await assembleContext(projectDesaId);

  try {
    const result = await provider.generateStructured<DesaSwot>({
      prompt: context,
      systemPrompt: SYSTEM,
      schema: SCHEMA,
      model: "summary",
      maxOutputTokens: 1800,
    });

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    await supabase.from("ai_insights").insert({
      target_type: "project_desa",
      target_id: projectDesaId,
      insight_type: "swot",
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
