import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";

// =====================================================
// GET /api/v1/projects/[slug]
// =====================================================
// Public, read-only summary of a project. Same data as
// /public/[slug] but JSON instead of HTML — for mitra
// integrations (BI dashboards, internal websites).
//
// Requires public_dashboard_enabled=true on the project.
// No PII (peserta names not included).
//
// Rate-limited at Vercel/CDN later; for now relies on the
// underlying RPC which is granted to anon.
// =====================================================

export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const env = clientEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { db: { schema: "vmt" }, auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("public_project_summary", {
    p_slug: params.slug,
  });

  if (error) {
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      api_version: "v1",
      data,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
