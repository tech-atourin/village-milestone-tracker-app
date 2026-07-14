import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/evidence/[id] - issues a short-lived Supabase signed URL for the
 * evidence file and 302-redirects to it. Used by every "open / download
 * bukti" link in the UI (Bukti directory, topik reviewer, etc).
 *
 * Access control: SELECT via cookie-scoped RLS client so cross-tenant
 * evidence returns null. Superadmin bypasses via admin client. Signed URL
 * signing itself needs the service role (RLS doesn't apply to storage
 * signed URLs anyway), but only runs after access is verified.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scoped =
    user.global_role === "superadmin" ? createAdminClient() : createClient();
  const { data: file } = await scoped
    .from("evidence_files")
    .select("file_url")
    .eq("id", params.id)
    .maybeSingle();
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const path = (file as { file_url: string }).file_url;

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from("vmt-evidence")
    .createSignedUrl(path, 60 * 60);
  if (signErr || !signed) {
    return NextResponse.json(
      { error: signErr?.message ?? "Gagal generate signed URL" },
      { status: 500 },
    );
  }
  return NextResponse.redirect(signed.signedUrl);
}
