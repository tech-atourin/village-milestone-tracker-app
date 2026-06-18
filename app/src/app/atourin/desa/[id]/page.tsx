export const metadata = { title: "Detail Desa" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { getDesaDetail } from "@/server/queries/desa-master";
import { getDesaTierJourney } from "@/server/queries/tier-journey";
import { DesaDetailSections } from "@/components/desa/desa-detail-sections";
import { HubSyncButton } from "@/components/desa/hub-sync-button";

export default async function AtourinDesaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("superadmin");
  const [data, journey] = await Promise.all([
    getDesaDetail(params.id),
    getDesaTierJourney(params.id),
  ]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/atourin/desa"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar desa
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
