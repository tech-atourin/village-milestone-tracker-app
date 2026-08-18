import { ReviewQueue } from "./review-queue";
import { listReviewQueue } from "@/server/queries/review";
import { listProjectEvidenceDirectory } from "@/server/queries/evidence-directory";
import { EvidenceDirectory } from "./evidence-directory";
import { EvidenceTabModes } from "./evidence-tab-modes";
import { getCurrentUser } from "@/lib/auth/rbac";

export async function EvidenceTab({
  projectId,
  filterTopikId,
  filterDesaId,
  readOnly = false,
}: {
  projectId: string;
  filterTopikId?: string;
  filterDesaId?: string;
  readOnly?: boolean;
}) {
  const [queue, files, user] = await Promise.all([
    listReviewQueue(projectId, "submitted"),
    listProjectEvidenceDirectory(projectId),
    getCurrentUser(),
  ]);

  // Role read-only (mis. fasilitator): tampilkan direktori bukti saja,
  // tanpa antrean review (approve/reject).
  if (readOnly) {
    return <EvidenceDirectory files={files} />;
  }

  return (
    <EvidenceTabModes
      directoryLabel={`Direktori Bukti (${files.length})`}
      queueLabel={`Review Queue (${queue.length})`}
      directory={<EvidenceDirectory files={files} />}
      queue={
        <ReviewQueue
          projectId={projectId}
          items={queue}
          filterTopikId={filterTopikId}
          filterDesaId={filterDesaId}
          currentUserId={user?.id ?? ""}
        />
      }
    />
  );
}
