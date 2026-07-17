import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { bridgeAttemptToTestResult } from "@/lib/quiz/bridge";

/**
 * Link previously-unmatched quiz attempts to a user by email. Called after a
 * peserta account is created (single create + bulk import) so anonymous
 * submissions retroactively connect to the account.
 *
 * Also fills matched_membership_id when the user is an active member of the
 * attempt's project. Best-effort: never throws (caller mutations shouldn't
 * fail because of reconcile).
 *
 * Returns the number of attempts linked.
 */
export async function reconcileAttemptsForUser(
  userId: string,
  email: string | null | undefined,
): Promise<number> {
  if (!email) return 0;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;
  const admin = createAdminClient();

  try {
    // Attempts with this email not yet matched to this user.
    const { data: attempts } = await admin
      .from("quiz_attempts")
      .select("id, quiz_id, quiz:quizzes(project_id)")
      .eq("respondent_email", normalized)
      .neq("matched_status", "matched");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (attempts ?? []) as any[];
    if (rows.length === 0) return 0;

    // Membership lookup per project (for matched_membership_id).
    const projectIds = Array.from(
      new Set(rows.map((r) => r.quiz?.project_id).filter(Boolean)),
    );
    const membershipByProject = new Map<string, string>();
    if (projectIds.length > 0) {
      const { data: memberships } = await admin
        .from("project_memberships")
        .select("id, project_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .in("project_id", projectIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const m of (memberships ?? []) as any[]) {
        membershipByProject.set(m.project_id, m.id);
      }
    }

    let linked = 0;
    for (const r of rows) {
      const membershipId = r.quiz?.project_id
        ? membershipByProject.get(r.quiz.project_id) ?? null
        : null;
      const { error } = await admin
        .from("quiz_attempts")
        .update({
          matched_user_id: userId,
          matched_status: "matched",
          matched_membership_id: membershipId,
        })
        .eq("id", r.id);
      if (!error) {
        linked++;
        await bridgeAttemptToTestResult(r.id);
      }
    }
    return linked;
  } catch {
    return 0;
  }
}
