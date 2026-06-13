export const metadata = { title: "Self-Assessment" };

import Link from "next/link";
import { ClipboardCheck, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import {
  getActiveMaster,
  getRepresentingDesa,
  listCriteriaForDesa,
} from "@/server/queries/self-assessment";
import {
  getActiveHubTemplate,
  getHubAssessmentResponse,
} from "@/server/queries/hub-assessment";
import {
  listCommentsForCriteriaItem,
  listCommentsForHubAssessment,
} from "@/server/queries/assessment-comments";
import { SelfAssessmentList } from "./self-assessment-list";
import { HubAssessmentForm } from "@/components/hub-assessment/hub-form";
import { EmptyState } from "@/components/ui/empty-state";

const TABS = ["v1", "v2"] as const;
type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { label: string; sublabel: string }> = {
  v1: {
    label: "Versi 1: Checklist Permenparekraf",
    sublabel: "Checklist 98 item per tier (Rintisan → Mandiri). Wajib upload bukti per kriteria.",
  },
  v2: {
    label: "Versi 2: Hub-style",
    sublabel: "6 pilar penilaian dengan single/multi-choice, slider, dan text. Auto-scoring → tier.",
  },
};

export default async function SelfAssessmentPage({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const desa = await getRepresentingDesa(user.id);
  if (!desa) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Akun belum terhubung ke desa"
        description="Hubungi admin Atourin untuk mengaitkan akun Anda ke desa wisata."
      />
    );
  }

  const tab: Tab = TABS.includes(searchParams.v as Tab)
    ? (searchParams.v as Tab)
    : "v1";

  return (
    <SelfAssessmentBody
      desa={desa}
      tab={tab}
      currentUserId={user.id}
      currentUserRole={user.global_role}
    />
  );
}

async function SelfAssessmentBody({
  desa,
  tab,
  currentUserId,
  currentUserRole,
}: {
  desa: { desa_id: string; name: string };
  tab: Tab;
  currentUserId: string;
  currentUserRole: string;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Self-Assessment Klasifikasi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Tentukan tier desa wisata Anda dengan mengisi self-assessment.
          Tersedia 2 versi untuk komparasi — keduanya akan diverifikasi tim Atourin.
        </p>
      </header>

      {/* Tab switcher */}
      <nav className="grid gap-2 sm:grid-cols-2">
        {TABS.map((t) => {
          const meta = TAB_META[t];
          const isActive = tab === t;
          return (
            <Link
              key={t}
              href={`/desa/self-assessment?v=${t}`}
              className={`rounded-2xl border-2 p-4 transition ${
                isActive
                  ? "border-atr-purple bg-atr-purple-50"
                  : "border-atr-outline bg-white hover:bg-atr-bg-soft"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-purple-600">
                {isActive && <Sparkles className="h-3 w-3" />}
                {meta.label}
              </div>
              <p className="mt-1.5 text-xs text-atr-fg-muted">{meta.sublabel}</p>
            </Link>
          );
        })}
      </nav>

      {tab === "v1" ? (
        <V1Tab
          desaId={desa.desa_id}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      ) : (
        <V2Tab
          desaId={desa.desa_id}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}

async function V1Tab({
  desaId,
  currentUserId,
  currentUserRole,
}: {
  desaId: string;
  currentUserId: string;
  currentUserRole: string;
}) {
  const master = await getActiveMaster();
  if (!master) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Kriteria Permenparekraf belum tersedia"
        description="Master kriteria Permenparekraf belum di-seed di sistem."
      />
    );
  }
  const [items, commentsByItem] = await Promise.all([
    listCriteriaForDesa(desaId, master.id),
    listCommentsForCriteriaItem(desaId),
  ]);
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        Master: <strong className="text-atr-fg">{master.version}</strong> ·
        efektif {master.effective_from ?? "—"}
      </div>
      <SelfAssessmentList
        desaId={desaId}
        items={items}
        commentsByItem={commentsByItem}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </section>
  );
}

async function V2Tab({
  desaId,
  currentUserId,
  currentUserRole,
}: {
  desaId: string;
  currentUserId: string;
  currentUserRole: string;
}) {
  const template = await getActiveHubTemplate();
  if (!template) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Template Hub belum tersedia"
        description="Hubungi admin Atourin untuk mengaktifkan template Hub V2."
      />
    );
  }
  const existing = await getHubAssessmentResponse(desaId, template.id);
  const commentsByQuestion = existing
    ? await listCommentsForHubAssessment(desaId, existing.id)
    : new Map();
  // Detect rejection: status reverted to draft AND verifier_note exists
  const wasRejected =
    existing?.status === "draft" && (existing?.verifier_note?.trim()?.length ?? 0) > 0;
  return (
    <section className="space-y-4">
      {wasRejected && (
        <div className="rounded-2xl border-2 border-atr-red/40 bg-atr-red/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-atr-red text-white">
              ⚠
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-atr-red">
                Submission Anda perlu revisi
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm text-atr-fg">
                {existing!.verifier_note}
              </p>
              <p className="mt-2 text-[11px] text-atr-fg-muted">
                Setelah revisi, klik Submit lagi untuk dikirim ke tim Atourin.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        Template: <strong className="text-atr-fg">{template.name}</strong> · versi {template.versi}
        {existing?.status === "submitted" && (
          <span className="ml-2 inline-flex rounded-full bg-atr-yellow/20 px-2 py-0.5 text-[10px] font-bold text-atr-fg">
            Menunggu Verifikasi
          </span>
        )}
        {existing?.status === "verified" && (
          <span className="ml-2 inline-flex rounded-full bg-atr-arti/15 px-2 py-0.5 text-[10px] font-bold text-atr-arti">
            Terverifikasi
          </span>
        )}
      </div>
      <HubAssessmentForm
        desaId={desaId}
        template={template}
        existing={existing}
        commentsByQuestion={commentsByQuestion}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </section>
  );
}
