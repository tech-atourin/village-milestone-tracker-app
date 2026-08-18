import { listProjectResources } from "@/server/queries/resources";
import { MateriManager } from "./materi-manager";

export async function MateriTab({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const items = await listProjectResources(projectId);
  return (
    <MateriManager projectId={projectId} items={items} readOnly={readOnly} />
  );
}
