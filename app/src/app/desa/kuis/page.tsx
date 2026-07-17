export const metadata = { title: "Hasil Kuis Peserta" };

import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getRepresentingDesa } from "@/server/queries/self-assessment";
import { listDesaQuizResults } from "@/server/queries/quiz-desa";
import { EmptyState } from "@/components/ui/empty-state";

const KIND_LABEL: Record<string, string> = {
  pre_test: "Pre-test",
  post_test: "Post-test",
  standalone: "Kuis",
};

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function DesaKuisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const desa = await getRepresentingDesa(user.id);
  const results = desa ? await listDesaQuizResults(desa.desa_id) : [];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Hasil Kuis Peserta
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Rekap kuis yang dikerjakan peserta perwakilan
          {desa ? ` desa ${desa.name}` : ""}.
        </p>
      </header>

      {results.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada hasil kuis"
          description="Hasil kuis peserta desa Anda akan muncul di sini setelah mereka mengerjakan."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-atr-outline bg-white shadow-atr-1">
          <table className="w-full text-sm">
            <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              <tr>
                <th className="px-4 py-3">Peserta</th>
                <th className="px-4 py-3">Kuis</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Nilai</th>
                <th className="px-4 py-3">Lulus</th>
                <th className="px-4 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atr-outline">
              {results.map((r) => (
                <tr key={r.attempt_id}>
                  <td className="px-4 py-3 font-bold text-atr-fg">
                    {r.peserta_name}
                  </td>
                  <td className="px-4 py-3 text-atr-fg">
                    {r.quiz_title}
                    {r.project_name && (
                      <span className="block text-[11px] text-atr-fg-muted">
                        {r.project_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-atr-purple/30 bg-atr-purple-50/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-atr-purple-700">
                      {KIND_LABEL[r.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-atr-fg">
                      {r.percent ?? "-"}
                    </span>
                    <span className="text-[11px] text-atr-fg-muted">
                      {" "}
                      ({r.score}/{r.max_score})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.passed == null ? (
                      <span className="text-atr-fg-muted">-</span>
                    ) : r.passed ? (
                      <span className="font-bold text-atr-arti">Lulus</span>
                    ) : (
                      <span className="font-bold text-atr-red">Belum</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-atr-fg-muted">
                    {fmtDate(r.submitted_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
