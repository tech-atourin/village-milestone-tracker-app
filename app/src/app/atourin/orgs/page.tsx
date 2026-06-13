export const metadata = { title: "Organisasi" };

import { Building2, Plus } from "lucide-react";
import { listOrgsDetailed } from "@/server/queries/orgs";
import { OrgCard } from "./org-card";

export default async function OrgsPage() {
  const orgs = await listOrgsDetailed();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Organisasi
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Atourin + mitra (Kemenparekraf, BUMN, Pemda, dll). Upload logo +
            atur brand color untuk branded report.
          </p>
        </div>
      </header>

      {orgs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <Building2 className="mx-auto mb-3 h-6 w-6 text-atr-fg-muted" />
          <p className="text-sm font-bold text-atr-fg">Belum ada organisasi</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}
