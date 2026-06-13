import Link from "next/link";
import {
  Folder,
  Plus,
  Users,
  ClipboardCheck,
  Award,
  Clock,
  TrendingDown,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { getAttentionItems, type AttentionItem } from "@/server/queries/dashboard";

async function getStats() {
  const supabase = createClient();
  const [{ count: projects }, { count: users }, { count: templates }, { count: desa }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("project_templates")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("desa")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
    ]);
  return {
    projects: projects ?? 0,
    users: users ?? 0,
    templates: templates ?? 0,
    desa: desa ?? 0,
  };
}

const KIND_STYLE: Record<AttentionItem["kind"], { icon: typeof ClipboardCheck; color: string; bg: string }> = {
  review: { icon: ClipboardCheck, color: "text-atr-yellow", bg: "bg-atr-yellow/15" },
  criteria: { icon: Award, color: "text-atr-purple-600", bg: "bg-atr-purple-50" },
  stagnant: { icon: Clock, color: "text-atr-red", bg: "bg-atr-red/15" },
  low_progress: { icon: TrendingDown, color: "text-atr-red", bg: "bg-atr-red/15" },
  no_baseline: { icon: ClipboardCheck, color: "text-atr-yellow", bg: "bg-atr-yellow/15" },
};

export default async function AtourinDashboardPage() {
  const user = await getCurrentUser();
  const [stats, attention] = await Promise.all([
    getStats(),
    getAttentionItems(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Selamat datang, {user?.full_name ?? "Atourin"}.
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Ringkasan project pendampingan + item yang butuh perhatian Anda.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={stats.projects} icon={Folder} href="/atourin/projects" />
        <StatCard label="Users" value={stats.users} icon={Users} href="/atourin/users" />
        <StatCard label="Desa" value={stats.desa} icon={Folder} />
        <StatCard label="Templates" value={stats.templates} icon={Folder} href="/atourin/templates" />
      </div>

      {/* Needs Attention */}
      <section className="rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <header className="flex items-center justify-between border-b border-atr-outline px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-atr-purple" />
            <h2 className="text-sm font-bold text-atr-fg">
              Butuh perhatian Anda
            </h2>
          </div>
          <span className="text-xs text-atr-fg-muted">
            {attention.length} item
          </span>
        </header>
        {attention.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-atr-arti" />
            <p className="text-sm font-bold text-atr-fg">
              Tidak ada yang menunggu — semuanya tertangani 🎉
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-atr-outline">
            {attention.map((it) => {
              const cfg = KIND_STYLE[it.kind];
              const Icon = cfg.icon;
              return (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-atr-bg-soft"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-atr-fg">
                        {it.title}
                      </div>
                      <div className="text-xs text-atr-fg-muted">
                        {it.subtitle}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-atr-fg-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Quick actions */}
      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h2 className="mb-4 text-sm font-bold text-atr-fg">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/atourin/projects/new"
            className="group flex items-start gap-3 rounded-xl border border-atr-outline p-4 transition hover:border-atr-purple/40 hover:bg-atr-purple-50/40"
          >
            <div className="rounded-lg bg-atr-purple-50 p-2 text-atr-purple">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-atr-fg">
                Project baru
              </div>
              <div className="text-xs text-atr-fg-muted">
                Pakai template atau blank.
              </div>
            </div>
          </Link>
          <Link
            href="/atourin/users/bulk-import"
            className="group flex items-start gap-3 rounded-xl border border-atr-outline p-4 transition hover:border-atr-purple/40 hover:bg-atr-purple-50/40"
          >
            <div className="rounded-lg bg-atr-purple-50 p-2 text-atr-purple">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-atr-fg">
                Import peserta
              </div>
              <div className="text-xs text-atr-fg-muted">
                Excel template → validate → invite.
              </div>
            </div>
          </Link>
          <Link
            href="/atourin/klasifikasi"
            className="group flex items-start gap-3 rounded-xl border border-atr-outline p-4 transition hover:border-atr-purple/40 hover:bg-atr-purple-50/40"
          >
            <div className="rounded-lg bg-atr-purple-50 p-2 text-atr-purple">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-atr-fg">
                Verifikasi klasifikasi
              </div>
              <div className="text-xs text-atr-fg-muted">
                Antrian dari desa wisata.
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 text-atr-fg-muted" />
      </div>
      <div className="mt-2 text-3xl font-bold text-atr-fg">{value}</div>
    </>
  );
  const cls =
    "rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1 transition hover:border-atr-purple/30";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
