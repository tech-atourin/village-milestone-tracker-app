"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const verifySchema = z.object({
  assessment_id: z.string().uuid(),
  note: z.string().max(2000).optional().nullable(),
});

export async function verifyHubAssessment(input: z.input<typeof verifySchema>) {
  const user = await requireRole("superadmin");
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("hub_assessment")
    .update({
      status: "verified",
      verifier_note: parsed.data.note ?? null,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.assessment_id);
  if (error) return { error: error.message };
  revalidatePath("/atourin/klasifikasi");
  revalidatePath("/desa/self-assessment");
  return { ok: true };
}

export async function rejectHubAssessment(
  input: z.input<typeof verifySchema>,
) {
  await requireRole("superadmin");
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("hub_assessment")
    .update({
      status: "draft",
      verifier_note: parsed.data.note ?? "Perlu revisi",
    })
    .eq("id", parsed.data.assessment_id);
  if (error) return { error: error.message };
  revalidatePath("/atourin/klasifikasi");
  return { ok: true };
}
