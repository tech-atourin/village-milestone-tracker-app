import { requireRole } from "@/lib/auth/rbac";
import { getMyPersonnel, getLogbookForPersonnel } from "@/server/queries/personnel";
import { LogbookClient, type PersonnelAssignment } from "./logbook-client";

export const metadata = { title: "Log Book | VMT by Atourin" };

export default async function PersonilLogbookPage() {
  await requireRole("personil");
  const assignments = await getMyPersonnel();

  const withEntries: PersonnelAssignment[] = await Promise.all(
    assignments.map(async (a) => ({
      id: a.id,
      project_name: a.project_name,
      position: a.position,
      work_start: a.work_start,
      work_end: a.work_end,
      entries: await getLogbookForPersonnel(a.id),
    })),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-atr-ink">Log Book Personil</h1>
        <p className="mt-1 text-sm text-atr-muted">
          Catat agenda kegiatan harian Anda selama masa kerja. Setiap agenda
          bisa dilengkapi foto dokumentasi.
        </p>
      </div>
      <LogbookClient assignments={withEntries} />
    </div>
  );
}
