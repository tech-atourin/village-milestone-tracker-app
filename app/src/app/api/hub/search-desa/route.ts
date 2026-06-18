import { NextResponse, type NextRequest } from "next/server";
import { searchHubDesa } from "@/server/queries/hub";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  await requireRole("superadmin");
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const results = await searchHubDesa(q);
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/hub/search-desa] failed:", message);
    return NextResponse.json(
      { results: [], error: message },
      { status: 500 },
    );
  }
}
