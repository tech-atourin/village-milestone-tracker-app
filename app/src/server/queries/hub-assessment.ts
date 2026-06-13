import "server-only";

import { createClient } from "@/lib/supabase/server";

export type HubAssessmentQuestion =
  | {
      id: string;
      type: "single";
      label: string;
      options: string[];
      weight: number;
    }
  | {
      id: string;
      type: "multi";
      label: string;
      options: string[];
      weight: number;
    }
  | {
      id: string;
      type: "slider";
      label: string;
      min: number;
      max: number;
      weight: number;
    }
  | {
      id: string;
      type: "text";
      label: string;
      placeholder?: string;
      weight: number;
    };

export type HubAssessmentPillar = {
  key: string;
  title: string;
  description?: string;
  questions: HubAssessmentQuestion[];
};

export type HubAssessmentDefinition = {
  pillars: HubAssessmentPillar[];
  scoring: {
    tiers: Array<{ min: number; max: number; label: string }>;
  };
};

export type HubAssessmentTemplate = {
  id: string;
  versi: string;
  name: string;
  description: string | null;
  definisi: HubAssessmentDefinition;
  is_active: boolean;
};

export async function getActiveHubTemplate(): Promise<HubAssessmentTemplate | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hub_assessment_template")
    .select("id, versi, name, description, definisi, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as HubAssessmentTemplate | null;
}

export type HubAssessmentResponse = {
  id: string;
  desa_id: string;
  template_id: string;
  jawaban: Record<string, unknown>;
  skor_pilar: Record<string, { skor: number; max: number }> | null;
  skor_total: number | null;
  level_hasil: string | null;
  status: "draft" | "submitted" | "verified";
  submitted_at: string | null;
  verifier_note: string | null;
  verified_at: string | null;
};

export async function getHubAssessmentResponse(
  desaId: string,
  templateId: string,
): Promise<HubAssessmentResponse | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hub_assessment")
    .select(
      "id, desa_id, template_id, jawaban, skor_pilar, skor_total, level_hasil, status, submitted_at, verifier_note, verified_at",
    )
    .eq("desa_id", desaId)
    .eq("template_id", templateId)
    .maybeSingle();
  return data as unknown as HubAssessmentResponse | null;
}
