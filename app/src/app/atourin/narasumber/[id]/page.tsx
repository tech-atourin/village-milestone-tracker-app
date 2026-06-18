export const metadata = { title: "Detail Narasumber" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { getNarasumberDetail } from "@/server/queries/narasumber";
import { NarasumberDetailView } from "./narasumber-detail-view";

function sanitizeBackHref(from: string | undefined, fallback: string): string {
  if (!from) return fallback;
  // Only accept same-origin internal paths to prevent open-redirect.
  if (!from.startsWith("/") || from.startsWith("//")) return fallback;
  return from;
}

export default async function NarasumberDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  await requireRole("superadmin");
  const data = await getNarasumberDetail(params.id);
  if (!data) notFound();
  const backHref = sanitizeBackHref(searchParams.from, "/atourin/narasumber");
  const backLabel = backHref === "/atourin/narasumber"
    ? "Kembali ke daftar narasumber"
    : "Kembali";
  return (
    <NarasumberDetailView data={data} backHref={backHref} backLabel={backLabel} />
  );
}
