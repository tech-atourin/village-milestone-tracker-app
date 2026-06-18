import { ReviewQueue } from "./review-queue";
import { listReviewQueue } from "@/server/queries/review";

export async function EvidenceTab({
  projectId,
  filterTopikId,
  filterDesaId,
}: {
  projectId: string;
  filterTopikId?: string;
  filterDesaId?: string;
}) {
  const queue = await listReviewQueue(projectId, "submitted");
  return (
    <ReviewQueue
      projectId={projectId}
      items={queue}
      filterTopikId={filterTopikId}
      filterDesaId={filterDesaId}
    />
  );
}
