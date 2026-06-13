import { NextResponse, type NextRequest } from "next/server";
import { searchHubDesa } from "@/server/queries/hub";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  await requireRole("superadmin");
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchHubDesa(q);
  return NextResponse.json({ results });
}
