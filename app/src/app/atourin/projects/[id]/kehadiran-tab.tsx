import { getProjectCheckinMatrix } from "@/server/queries/checkin";
import { CheckinWindowControls } from "./checkin-window-controls";
import { KehadiranMatrix } from "./kehadiran-matrix";

export async function KehadiranTab({ projectId }: { projectId: string }) {
  const { topik, rows, total_topik } = await getProjectCheckinMatrix(projectId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-atr-fg">Kehadiran (Check-in)</h3>
        <p className="text-sm text-atr-fg-muted">
          Pantau peserta yang sudah check-in di tiap topik pelatihan. Peserta
          check-in mandiri dari akunnya, hanya saat check-in dibuka panitia.
        </p>
      </div>

      {topik.length > 0 && (
        <CheckinWindowControls projectId={projectId} topik={topik} />
      )}

      {topik.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-10 text-center text-sm text-atr-fg-muted">
          Belum ada topik pelatihan pada project ini.
        </div>
      ) : (
        <KehadiranMatrix topik={topik} rows={rows} total_topik={total_topik} />
      )}
    </div>
  );
}
