import { Check, Users } from "lucide-react";
import { getProjectCheckinMatrix } from "@/server/queries/checkin";

export async function KehadiranTab({ projectId }: { projectId: string }) {
  const { topik, rows, total_topik } = await getProjectCheckinMatrix(projectId);

  const fullyChecked = rows.filter(
    (r) => total_topik > 0 && r.checked_count === total_topik,
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-atr-fg">Kehadiran (Check-in)</h3>
        <p className="text-sm text-atr-fg-muted">
          Pantau peserta yang sudah check-in di tiap topik pelatihan. Peserta
          check-in mandiri dari akunnya.
        </p>
      </div>

      {topik.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-10 text-center text-sm text-atr-fg-muted">
          Belum ada topik pelatihan pada project ini.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-atr-fg-muted" />
          <p className="mt-2 text-sm font-bold text-atr-fg">Belum ada peserta</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Peserta" value={String(rows.length)} />
            <Stat label="Topik" value={String(total_topik)} />
            <Stat
              label="Hadir lengkap"
              value={`${fullyChecked}/${rows.length}`}
              highlight
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-atr-outline bg-white shadow-atr-1">
            <table className="w-full text-sm">
              <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                <tr>
                  <th className="sticky left-0 z-10 bg-atr-bg-soft px-4 py-3">
                    Peserta
                  </th>
                  {topik.map((t, i) => (
                    <th
                      key={t.id}
                      className="px-2 py-3 text-center"
                      title={t.name}
                    >
                      T{i + 1}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atr-outline">
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                      <div className="font-bold text-atr-fg">{r.name}</div>
                      {r.email && (
                        <div className="text-[11px] text-atr-fg-muted">
                          {r.email}
                        </div>
                      )}
                    </td>
                    {topik.map((t) => (
                      <td key={t.id} className="px-2 py-3 text-center">
                        {r.checked[t.id] ? (
                          <Check className="mx-auto h-4 w-4 text-atr-arti" />
                        ) : (
                          <span className="text-atr-fg-muted">·</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`text-xs font-bold ${
                          r.checked_count === total_topik
                            ? "text-atr-arti"
                            : "text-atr-fg"
                        }`}
                      >
                        {r.checked_count}/{total_topik}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-atr-fg-muted">
            Kolom T1..T{total_topik} sesuai urutan topik. Arahkan kursor ke
            judul kolom untuk melihat nama topik.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`text-xl font-bold ${highlight ? "text-atr-purple-700" : "text-atr-fg"}`}
      >
        {value}
      </div>
    </div>
  );
}
