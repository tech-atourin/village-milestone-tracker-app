import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, ipFromHeaders } from "@/lib/rate-limit";

// Pre-start eligibility check. Called when the taker presses "Mulai Kerjakan":
// blocks starting if this email already reached the quiz's attempt cap (incl.
// timed-out attempts that auto-submitted). The response never reveals that the
// reason is the email - so participants don't just switch email.

const schema = z.object({ email: z.string().email().max(200) });

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(`quiz-check:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    // On rate-limit, allow (fail-open) - submit route enforces the hard cap.
    return NextResponse.json({ allowed: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ allowed: true });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ allowed: true });

  const admin = createAdminClient();
  const { data: quiz } = await admin
    .from("quizzes")
    .select("id, max_attempts")
    .eq("public_slug", params.slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!quiz) return NextResponse.json({ allowed: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = quiz as any;
  if (!q.max_attempts || q.max_attempts <= 0) {
    return NextResponse.json({ allowed: true }); // unlimited
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { count } = await admin
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", q.id)
    .eq("respondent_email", email);
  const allowed = (count ?? 0) < q.max_attempts;
  return NextResponse.json({ allowed });
}
