export const metadata = { title: "Self-Assessment" };

import { getCurrentUser } from "@/lib/auth/rbac";
import {
  getActiveMaster,
  getRepresentingDesa,
  listCriteriaForDesa,
} from "@/server/queries/self-assessment";
import { SelfAssessmentList } from "./self-assessment-list";

export default async function SelfAssessmentPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [desa, master] = await Promise.all([
    getRepresentingDesa(user.id),
    getActiveMaster(),
  ]);

  if (!desa) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <p className="text-sm font-bold text-atr-fg">
          Akun belum terhubung ke desa
        </p>
      </div>
    );
  }

  if (!master) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <p className="text-sm font-bold text-atr-fg">
          Kriteria klasifikasi belum tersedia
        </p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Master kriteria Permenparekraf belum di-seed di sistem.
        </p>
      </div>
    );
  }

  const items = await listCriteriaForDesa(desa.desa_id, master.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Self-Assessment Klasifikasi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Centang kriteria yang sudah dipenuhi desa Anda. Tim Atourin akan
          memverifikasi sebelum status terhitung resmi.
        </p>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Master: {master.version} · efektif {master.effective_from ?? "—"}
        </p>
      </header>

      <SelfAssessmentList desaId={desa.desa_id} items={items} />
    </div>
  );
}
