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
//   checkin             → checkInTopik (idempotent upsert)
//   rate_narasumber     → rateNarasumber (idempotent upsert)
// =====================================================

import { registerHandler, type QueuedMutation } from "@/lib/offline/queue";
import { submitChecklistItem } from "@/server/actions/checklist";
import { uploadEvidence } from "@/server/actions/evidence";
import { checkInTopik } from "@/server/actions/topik-checkin";
import { rateNarasumber } from "@/server/actions/narasumber-rating";
import { saveBaseline } from "@/server/actions/baseline";
import { createActionPlan, updateActionPlan } from "@/server/actions/action-plans";
import { savePengelolaData } from "@/server/actions/desa-profile";
import {
  uploadCriteriaEvidenceFile,
  submitCriteriaItemForReview,
} from "@/server/actions/self-assessment";

function throwIfError(r: unknown): void {
  const err = (r as { error?: string } | null)?.error;
  if (err) throw new Error(err);
}

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

  registerHandler("checkin", async (m: QueuedMutation) => {
    const p = m.payload as unknown as {
      project_id: string;
      project_topik_id: string;
    };
    const r = await checkInTopik({
      project_id: p.project_id,
      project_topik_id: p.project_topik_id,
    });
    if ("error" in r) throw new Error(r.error);
  });

  registerHandler("rate_narasumber", async (m: QueuedMutation) => {
    const p = m.payload as unknown as {
      narasumber_id: string;
      project_id: string;
      rating: number;
      comment: string;
    };
    const r = await rateNarasumber({
      narasumber_id: p.narasumber_id,
      project_id: p.project_id,
      rating: p.rating,
      comment: p.comment,
    });
    if ("error" in r) throw new Error(r.error);
  });

  // Pendampingan / desa forms
  registerHandler("save_baseline", async (m: QueuedMutation) => {
    throwIfError(
      await saveBaseline(m.payload as unknown as Parameters<typeof saveBaseline>[0]),
    );
  });

  registerHandler("action_plan_create", async (m: QueuedMutation) => {
    throwIfError(
      await createActionPlan(
        m.payload as unknown as Parameters<typeof createActionPlan>[0],
      ),
    );
  });

  registerHandler("action_plan_update", async (m: QueuedMutation) => {
    throwIfError(
      await updateActionPlan(
        m.payload as unknown as Parameters<typeof updateActionPlan>[0],
      ),
    );
  });

  registerHandler("save_pengelola", async (m: QueuedMutation) => {
    throwIfError(
      await savePengelolaData(
        m.payload as unknown as Parameters<typeof savePengelolaData>[0],
      ),
    );
  });

  // Self-assessment: evidence upload flushes BEFORE submit (queue is drained
  // in createdAt order), so the submit's server-side "evidence exists" check
  // passes once the queued uploads have landed.
  registerHandler("criteria_evidence", async (m: QueuedMutation) => {
    throwIfError(
      await uploadCriteriaEvidenceFile(
        m.payload as unknown as Parameters<typeof uploadCriteriaEvidenceFile>[0],
      ),
    );
  });

  registerHandler("criteria_submit", async (m: QueuedMutation) => {
    throwIfError(
      await submitCriteriaItemForReview(
        m.payload as unknown as Parameters<typeof submitCriteriaItemForReview>[0],
      ),
    );
  });
}
