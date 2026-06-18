export const metadata = { title: "Detail Narasumber" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { getNarasumberDetail } from "@/server/queries/narasumber";
import { NarasumberDetailView } from "@/app/atourin/narasumber/[id]/narasumber-detail-view";

function sanitizeBackHref(from: string | undefined, fallback: string): string {
  if (!from) return fallback;
  if (!from.startsWith("/") || from.startsWith("//")) return fallback;
  return from;
}

export default async function MitraNarasumberDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  await requireRole("mitra_admin");
  const data = await getNarasumberDetail(params.id);
  if (!data) notFound();
  const backHref = sanitizeBackHref(searchParams.from, "/mitra/narasumber");
  const backLabel = backHref === "/mitra/narasumber"
    ? "Kembali ke daftar narasumber"
    : "Kembali";
  return (
    <NarasumberDetailView data={data} backHref={backHref} backLabel={backLabel} />
  );
}
