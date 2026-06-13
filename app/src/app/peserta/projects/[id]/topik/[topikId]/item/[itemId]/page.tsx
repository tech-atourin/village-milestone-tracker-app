export const metadata = { title: "Detail Checklist" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listEvidenceForChecklist, signEvidenceUrls } from "@/server/actions/evidence";
import { ItemDetailForm } from "./item-detail-form";

async function loadItem(
  projectDesaId: string,
  projectTopikId: string,
  itemId: string,
) {
  const supabase = createClient();
  const [{ data: item }, { data: instance }] = await Promise.all([
    supabase
      .from("project_checklist_item")
      .select("id, title, description, required, reference_url")
      .eq("id", itemId)
      .maybeSingle(),
    supabase
      .from("desa_topik_instance")
      .select("id")
      .eq("project_desa_id", projectDesaId)
      .eq("project_topik_id", projectTopikId)
      .maybeSingle(),
  ]);

  if (!item) return null;

  type ProgressRow = {
    id: string;
    status: "not_started" | "submitted" | "approved" | "rejected";
    review_note: string | null;
  };

  // Look up checklist_progress (may not exist yet)
  let progress: ProgressRow | null = null;
  if (instance) {
    const { data: cp } = await supabase
      .from("checklist_progress")
      .select("id, status, review_note")
      .eq("desa_topik_instance_id", (instance as { id: string }).id)
      .eq("project_checklist_item_id", itemId)
      .maybeSingle();
    if (cp) progress = cp as unknown as ProgressRow;
  }

  return {
    item: item as {
      id: string;
      title: string;
      description: string | null;
      required: boolean;
      reference_url: string | null;
    },
    progress,
  };
}

export default async function PesertaItemDetailPage({
  params,
}: {
  params: { id: string; topikId: string; itemId: string };
}) {
  const data = await loadItem(params.id, params.topikId, params.itemId);
  if (!data) notFound();

  const evidence = data.progress
    ? await listEvidenceForChecklist(data.progress.id)
    : [];

  const paths = evidence.map((e) => e.evidence.file_url);
  const urlMap = paths.length ? await signEvidenceUrls(paths) : new Map();

  return (
    <div className="space-y-5">
      <Link
        href={`/peserta/projects/${params.id}/topik/${params.topikId}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke checklist
      </Link>

      <header>
        <h1 className="text-lg font-bold tracking-tight text-atr-fg">
          {data.item.title}
          {data.item.required && (
            <span className="ml-1 text-xs font-bold text-atr-red">*</span>
          )}
        </h1>
        {data.item.description && (
          <p className="mt-1 text-sm text-atr-fg-muted">
            {data.item.description}
          </p>
        )}
        {data.item.reference_url && (
          <a
            href={data.item.reference_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-bold text-atr-purple-600 hover:underline"
          >
            Baca referensi →
          </a>
        )}
      </header>

      {data.progress?.status === "rejected" && data.progress.review_note && (
        <div className="rounded-2xl border border-atr-red/30 bg-atr-red/10 p-4 text-sm text-atr-red">
          <div className="text-xs font-bold uppercase tracking-wide">
            Feedback Atourin
          </div>
          <p className="mt-1">{data.progress.review_note}</p>
        </div>
      )}

      <ItemDetailForm
        projectDesaId={params.id}
        projectTopikId={params.topikId}
        checklistItemId={params.itemId}
        existingProgress={data.progress}
        existingEvidence={evidence.map((e) => ({
          id: e.evidence.id,
          filename: e.evidence.original_filename ?? "file",
          file_type: e.evidence.file_type,
          caption: e.evidence.caption,
          uploaded_at: e.evidence.uploaded_at,
          signed_url: urlMap.get(e.evidence.file_url) ?? null,
        }))}
      />
    </div>
  );
}
