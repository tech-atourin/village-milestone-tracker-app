import { NextResponse, type NextRequest } from "next/server";
import {
  listChecklistOptionsForEvidence,
  type ChecklistOption,
} from "@/server/queries/evidence";
import { getCurrentUser } from "@/lib/auth/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const projectDesaId = req.nextUrl.searchParams.get("projectDesaId");
  if (!projectDesaId) {
    return NextResponse.json(
      { error: "projectDesaId required" },
      { status: 400 },
    );
  }
  const options: ChecklistOption[] = await listChecklistOptionsForEvidence(
    projectDesaId,
    params.id,
  );
  return NextResponse.json({ options });
}
