import { ReviewQueue } from "./review-queue";
import { listReviewQueue } from "@/server/queries/review";
import { listProjectEvidenceDirectory } from "@/server/queries/evidence-directory";
import { EvidenceDirectory } from "./evidence-directory";
import { EvidenceTabModes } from "./evidence-tab-modes";

export async function EvidenceTab({
  projectId,
  filterTopikId,
  filterDesaId,
}: {
  projectId: string;
  filterTopikId?: string;
  filterDesaId?: string;
}) {
  const [queue, files] = await Promise.all([
    listReviewQueue(projectId, "submitted"),
    listProjectEvidenceDirectory(projectId),
  ]);

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
        />
      }
    />
  );
}
