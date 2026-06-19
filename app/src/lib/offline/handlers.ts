"use client";

// =====================================================
// Offline queue handlers
// =====================================================
// Maps queue.kind → server action call so flushQueue() can
// drain stored mutations once connection returns.
//
// Kinds:
//   submit_checklist    → submitChecklistItem only
//   submit_with_evidence → ensure submitChecklistItem, then
//                          uploadEvidence per file (with returned cpId)
// =====================================================

import { registerHandler, type QueuedMutation } from "@/lib/offline/queue";
import { submitChecklistItem } from "@/server/actions/checklist";
import { uploadEvidence } from "@/server/actions/evidence";

type SubmitPayload = {
  project_desa_id: string;
  project_topik_id: string;
  project_checklist_item_id: string;
};

type EvidenceFilePayload = {
  filename: string;
  mime_type: string;
  base64: string;
};

type SubmitWithEvidencePayload = SubmitPayload & {
  existing_checklist_progress_id: string | null;
  caption: string | null;
  files: EvidenceFilePayload[];
};

let registered = false;

export function registerOfflineHandlers(): void {
  if (registered) return;
  registered = true;

  registerHandler("submit_checklist", async (m: QueuedMutation) => {
    const p = m.payload as unknown as SubmitPayload;
    const r = await submitChecklistItem({
      project_desa_id: p.project_desa_id,
      project_topik_id: p.project_topik_id,
      project_checklist_item_id: p.project_checklist_item_id,
    });
    if (r.error) throw new Error(r.error);
  });

  registerHandler("submit_with_evidence", async (m: QueuedMutation) => {
    const p = m.payload as unknown as SubmitWithEvidencePayload;
    let cpId = p.existing_checklist_progress_id;
    if (!cpId) {
      const r = await submitChecklistItem({
        project_desa_id: p.project_desa_id,
        project_topik_id: p.project_topik_id,
        project_checklist_item_id: p.project_checklist_item_id,
      });
      if (r.error) throw new Error(r.error);
      cpId = r.checklist_progress_id ?? null;
    }
    if (!cpId) throw new Error("Tidak dapat resolve checklist progress id");

    for (const file of p.files) {
      const u = await uploadEvidence({
        project_desa_id: p.project_desa_id,
        checklist_progress_id: cpId,
        filename: file.filename,
        mime_type: file.mime_type,
        base64: file.base64,
        caption: p.caption,
      });
      if (u.error) throw new Error(`Upload "${file.filename}": ${u.error}`);
    }
  });
}
