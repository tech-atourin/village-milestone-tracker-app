"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { notify } from "@/lib/notify";

// =====================================================
// Peserta rate a narasumber for a project they were both in.
// One rating per (narasumber, rater, project) — re-rating updates.
// =====================================================

const rateSchema = z.object({
  narasumber_id: z.string().uuid(),
  project_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

export async function rateNarasumber(
  input: z.input<typeof rateSchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  if (user.global_role !== "peserta")
    return { error: "Hanya peserta yang bisa menilai narasumber" };
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const body = parsed.data;
  const admin = createAdminClient();

  // Verify rater is a member of the project AND the narasumber is too
  const [{ data: raterM }, { data: narsM }] = await Promise.all([
    admin
      .from("project_memberships")
      .select("id")
      .eq("project_id", body.project_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("project_memberships")
      .select("id")
      .eq("project_id", body.project_id)
      .eq("user_id", body.narasumber_id)
      .eq("role", "narasumber")
      .maybeSingle(),
  ]);
  // Narasumber may be linked via pendampingan_sessions instead of membership
  let narasumberInProject = !!narsM;
  if (!narasumberInProject) {
    const { data: sess } = await admin
      .from("pendampingan_sessions")
      .select("id")
      .eq("project_id", body.project_id)
      .eq("narasumber_id", body.narasumber_id)
      .limit(1)
      .maybeSingle();
    narasumberInProject = !!sess;
  }
  if (!raterM)
    return { error: "Anda bukan peserta project ini" };
  if (!narasumberInProject)
    return { error: "Narasumber ini tidak terlibat di project tersebut" };

  const { error } = await admin.from("narasumber_ratings").upsert(
    {
      narasumber_id: body.narasumber_id,
      rater_id: user.id,
      project_id: body.project_id,
      rating: body.rating,
      comment: body.comment ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "narasumber_id,rater_id,project_id" },
  );
  if (error) return { error: error.message };

  // Notify the narasumber (best-effort, in-app)
  try {
    await notify({
      user_id: body.narasumber_id,
      template_key: "comment_added",
      channel: "in_app",
      payload: {
        context_title: "Penilaian Narasumber",
        author_name: user.full_name,
        body_excerpt: `Memberi rating ${body.rating}/5${body.comment ? `: ${body.comment}` : ""}`,
      },
    });
  } catch {
    // ignore
  }

  revalidatePath("/peserta/projects");
  revalidatePath("/atourin/narasumber");
  return { ok: true };
}

export type NarasumberToRate = {
  narasumber_id: string;
  full_name: string;
  kompetensi: string | null;
  sessions_count: number;
  my_rating: number | null;
  my_comment: string | null;
};

/**
 * For a given peserta + project, list the narasumber who mentored that
 * project (via sessions or membership) plus the peserta's existing rating.
 */
export async function listNarasumberToRate(
  projectId: string,
): Promise<NarasumberToRate[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const admin = createAdminClient();

  // Narasumber via sessions
  const { data: sessions } = await admin
    .from("pendampingan_sessions")
    .select(
      "narasumber_id, narasumber:users!pendampingan_sessions_narasumber_id_fkey(full_name, kompetensi)",
    )
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sRows = (sessions ?? []) as any[];
  const byId = new Map<
    string,
    { full_name: string; kompetensi: string | null; count: number }
  >();
  for (const s of sRows) {
    if (!s.narasumber_id) continue;
    const cur = byId.get(s.narasumber_id) ?? {
      full_name: s.narasumber?.full_name ?? "—",
      kompetensi: s.narasumber?.kompetensi ?? null,
      count: 0,
    };
    cur.count += 1;
    byId.set(s.narasumber_id, cur);
  }
  if (byId.size === 0) return [];

  // Existing ratings by this peserta
  const ids = Array.from(byId.keys());
  const { data: myRatings } = await admin
    .from("narasumber_ratings")
    .select("narasumber_id, rating, comment")
    .eq("rater_id", user.id)
    .eq("project_id", projectId)
    .in("narasumber_id", ids);
  const ratingById = new Map<string, { rating: number; comment: string | null }>();
  for (const r of (myRatings ?? []) as Array<{
    narasumber_id: string;
    rating: number;
    comment: string | null;
  }>) {
    ratingById.set(r.narasumber_id, { rating: r.rating, comment: r.comment });
  }

  return Array.from(byId.entries()).map(([id, info]) => ({
    narasumber_id: id,
    full_name: info.full_name,
    kompetensi: info.kompetensi,
    sessions_count: info.count,
    my_rating: ratingById.get(id)?.rating ?? null,
    my_comment: ratingById.get(id)?.comment ?? null,
  }));
}
