export const metadata = { title: "Detail Desa" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { getDesaDetail } from "@/server/queries/desa-master";
import { getDesaTierJourney } from "@/server/queries/tier-journey";
import { DesaDetailSections } from "@/components/desa/desa-detail-sections";
import { HubSyncButton } from "@/components/desa/hub-sync-button";
import { sanitizeBackHref } from "@/lib/nav/back-href";

export default async function AtourinDesaDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  await requireRole("superadmin");
  const [data, journey] = await Promise.all([
    getDesaDetail(params.id),
    getDesaTierJourney(params.id),
  ]);
  if (!data) notFound();

  const backHref = sanitizeBackHref(searchParams.from, "/atourin/desa");
  const backLabel =
    backHref === "/atourin/desa" ? "Kembali ke daftar desa" : "Kembali";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <DesaDetailSections
        data={data}
        viewerRole="superadmin"
        journey={journey}
        hubSyncSlot={
          <HubSyncButton
            desaId={data.base.id}
            hasHubLink={!!data.base.hub_desa_id}
          />
        }
      />
    </div>
  );
}
