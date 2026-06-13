export const metadata = { title: "Dashboard Desa" };

import Link from "next/link";
import { ClipboardCheck, MapPin, TrendingUp, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import {
  getRepresentingDesa,
  computeClassification,
} from "@/server/queries/self-assessment";

const TIER_STYLE: Record<string, string> = {
  unclassified: "bg-atr-bg-soft text-atr-fg-muted border-atr-outline",
  rintisan: "bg-atr-yellow/20 text-atr-fg border-atr-yellow/40",
  berkembang: "bg-atr-arti/15 text-atr-arti border-atr-arti/30",
  maju: "bg-atr-purple-50 text-atr-purple-600 border-atr-purple/30",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800 border-atr-purple/50",
};

const TIER_LABEL: Record<string, string> = {
  unclassified: "Belum Diklasifikasi",
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

const TIER_ORDER = ["rintisan", "berkembang", "maju", "mandiri"];

export default async function DesaDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const desa = await getRepresentingDesa(user.id);

  if (!desa) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <p className="text-sm font-bold text-atr-fg">
          Belum terhubung ke desa
        </p>
        <p className="mt-1 text-sm text-atr-fg-muted">
          Hubungi admin Atourin untuk menautkan akun Anda ke profil desa wisata.
        </p>
      </div>
    );
  }

  const classification = await computeClassification(desa.desa_id);
  const currentTier = classification?.tier ?? "unclassified";
  const nextTierIndex =
    currentTier === "unclassified"
      ? 0
      : Math.min(TIER_ORDER.indexOf(currentTier) + 1, TIER_ORDER.length - 1);
  const nextTier = TIER_ORDER[nextTierIndex];

  const perTier = classification?.per_tier ?? {};

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          {desa.name}
        </h1>
        <p className="text-sm text-atr-fg-muted">
          {[desa.kabupaten, desa.provinsi].filter(Boolean).join(" · ")}
        </p>
      </header>

      {/* Current tier card */}
      <section
        className={`rounded-2xl border-2 p-6 shadow-atr-1 ${TIER_STYLE[currentTier]}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide opacity-70">
              Klasifikasi saat ini
            </div>
            <div className="mt-1 text-3xl font-bold">
              {TIER_LABEL[currentTier]}
            </div>
            {classification?.note && (
              <p className="mt-2 text-xs opacity-80">{classification.note}</p>
            )}
          </div>
          <div className="text-right text-xs opacity-70">
            <div>versi {classification?.criteria_version ?? "—"}</div>
            <div className="mt-1 font-mono">
              Skor: {Math.round(classification?.score ?? 0)}
            </div>
          </div>
        </div>

        {/* Tier progress strip */}
        <div className="mt-5 grid grid-cols-4 gap-1.5">
          {TIER_ORDER.map((tier) => {
            const tierData = perTier[tier];
            const passed = tierData?.pass ?? false;
            const isCurrent = currentTier === tier;
            return (
              <div
                key={tier}
                className={`rounded-md p-2 text-center text-[10px] font-bold uppercase ${
                  passed
                    ? "bg-white/40 ring-2 ring-current"
                    : "bg-white/20 opacity-60"
                } ${isCurrent ? "ring-2 ring-current" : ""}`}
              >
                {TIER_LABEL[tier]}
                {tierData && (
                  <div className="mt-0.5 font-mono text-[9px] opacity-80">
                    {tierData.required_verified}/{tierData.required_total}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Next gap */}
      {currentTier !== "mandiri" && (
        <section className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-atr-purple" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
              Untuk naik ke {TIER_LABEL[nextTier]}
            </h2>
          </div>
          <p className="mt-2 text-sm text-atr-fg">
            {classification?.next_gap?.length ?? 0} kriteria belum terverifikasi.
            Selesaikan semua kriteria wajib untuk naik tier.
          </p>
          {classification?.next_gap && classification.next_gap.length > 0 && (
            <ul className="mt-4 space-y-2">
              {classification.next_gap.slice(0, 5).map((item) => (
                <li
                  key={item.criteria_item_id}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-atr-purple" />
                  <div className="min-w-0 flex-1">
                    <span className="text-atr-fg">{item.title}</span>
                    <span className="ml-1.5 text-xs text-atr-fg-muted">
                      ({item.category}
                      {item.required && (
                        <span className="ml-1 font-bold text-atr-red">
                          wajib
                        </span>
                      )}
                      )
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/desa/self-assessment"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
          >
            <ClipboardCheck className="h-4 w-4" />
            Lanjutkan self-assessment
          </Link>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/desa/self-assessment"
          className="flex items-center justify-between rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1 transition hover:bg-atr-bg-soft"
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-atr-purple" />
            <div>
              <div className="text-sm font-bold text-atr-fg">
                Self-Assessment
              </div>
              <div className="text-xs text-atr-fg-muted">
                Centang kriteria yang sudah dipenuhi
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/desa/profil"
          className="flex items-center justify-between rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1 transition hover:bg-atr-bg-soft"
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-atr-purple" />
            <div>
              <div className="text-sm font-bold text-atr-fg">Profil Desa</div>
              <div className="text-xs text-atr-fg-muted">
                Update info dasar desa Anda
              </div>
            </div>
          </div>
        </Link>
      </div>

      <p className="rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        <Sparkles className="mr-1 inline h-3 w-3" />
        Kriteria yang tampil adalah versi <strong>placeholder</strong> sambil
        menunggu Permenparekraf resmi terbit. Bisa berubah saat regulasi final
        diumumkan.
      </p>
    </div>
  );
}
