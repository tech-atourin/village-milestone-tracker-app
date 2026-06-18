export const metadata = { title: "Review V1 Permenpar" };

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Award, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveMaster,
  listCriteriaForDesa,
} from "@/server/queries/self-assessment";
import { listCommentsForCriteriaItem } from "@/server/queries/assessment-comments";
import { V1ReviewList } from "./review-list";

const TIER_BADGE: Record<string, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
  unclassified: "bg-atr-bg-soft text-atr-fg-muted",
};
const TIER_LABEL: Record<string, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
  unclassified: "Belum Diklasifikasi",
};

export default async function V1ReviewPage({
  params,
}: {
  params: { desaId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.global_role !== "superadmin") redirect("/dashboard");

  const supabase = createClient();
  const { data: desa } = await supabase
    .from("desa")
    .select("id, name, kabupaten, provinsi, current_classification")
    .eq("id", params.desaId)
    .maybeSingle();
  if (!desa) notFound();
  const d = desa as {
    id: string;
    name: string;
    kabupaten: string | null;
    provinsi: string | null;
    current_classification: string | null;
  };

  const master = await getActiveMaster();
  if (!master) {
    return (
      <div className="space-y-4">
        <Link
          href="/atourin/klasifikasi"
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="rounded-2xl border border-atr-yellow/30 bg-atr-yellow/10 p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-atr-yellow" />
          <p className="text-sm font-bold text-atr-fg">
            Master kriteria Permenpar belum di-seed
          </p>
        </div>
      </div>
    );
  }

  const [items, commentsByItem] = await Promise.all([
    listCriteriaForDesa(params.desaId, master.id),
    listCommentsForCriteriaItem(params.desaId),
  ]);

  const stats = {
    submitted: items.filter((i) => i.status === "submitted").length,
    verified: items.filter((i) => i.status === "verified").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  };
  const tier = d.current_classification ?? "unclassified";

  return (
    <div className="space-y-6">
      <Link
        href="/atourin/klasifikasi"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Verifikasi Klasifikasi
      </Link>

      <header className="rounded-2xl border border-atr-outline bg-gradient-to-br from-atr-purple-50 to-white p-6 shadow-atr-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-atr-purple-600">
              V1 Permenpar · Review per Kriteria
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-atr-fg">
              {d.name}
            </h1>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-atr-fg-muted">
              <MapPin className="h-3.5 w-3.5" />
              {[d.kabupaten, d.provinsi].filter(Boolean).join(", ") || "-"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                  TIER_BADGE[tier] ?? ""
                }`}
              >
                <Award className="h-3 w-3" />
                {TIER_LABEL[tier] ?? tier}
              </span>
              <span className="text-atr-fg-muted">
                · Master {master.version}
              </span>
              <Link
                href={`/atourin/desa/${d.id}`}
                className="text-atr-purple-600 hover:underline"
              >
                Profil desa →
              </Link>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-2">
            <Stat label="Menunggu" value={stats.submitted} accent="yellow" />
            <Stat label="Terverifikasi" value={stats.verified} accent="green" />
            <Stat label="Ditolak" value={stats.rejected} accent="red" />
          </div>
        </div>
      </header>

      <V1ReviewList
        desaId={d.id}
        items={items}
        commentsByItem={commentsByItem}
        currentUserId={user.id}
        currentUserRole={user.global_role}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "yellow" | "green" | "red";
}) {
  const colorByAccent: Record<string, string> = {
    yellow: "text-atr-fg bg-atr-yellow/15",
    green: "text-atr-arti bg-atr-arti/10",
    red: "text-atr-red bg-atr-red/10",
  };
  return (
    <div
      className={`rounded-lg px-3 py-2 text-center ${colorByAccent[accent]}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
