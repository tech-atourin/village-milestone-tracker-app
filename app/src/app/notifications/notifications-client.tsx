"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Mail,
  Link2,
  MessageSquare,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import type { NotificationRow } from "@/server/queries/notifications";
import { markNotificationsRead } from "@/server/actions/notifications";
import { CountBadge } from "@/components/ui/count-badge";

const ICON_FOR: Record<
  string,
  { Icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  checklist_approved: { Icon: CheckCircle2, color: "text-atr-arti" },
  checklist_rejected: { Icon: AlertCircle, color: "text-atr-red" },
  checklist_submitted: { Icon: ClipboardCheck, color: "text-atr-yellow" },
  evidence_submitted: { Icon: Paperclip, color: "text-atr-purple-600" },
  evidence_linked: { Icon: Link2, color: "text-atr-purple-600" },
  criteria_submitted: { Icon: ClipboardCheck, color: "text-atr-yellow" },
  criteria_verified: { Icon: CheckCircle2, color: "text-atr-arti" },
  criteria_rejected: { Icon: AlertCircle, color: "text-atr-red" },
  comment_added: { Icon: MessageSquare, color: "text-atr-purple-600" },
  baseline_submitted: { Icon: ClipboardCheck, color: "text-atr-yellow" },
  project_invitation: { Icon: Mail, color: "text-atr-purple-600" },
};

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type Filter = "all" | "unread";

function scopeFor(role: string): "atourin" | "mitra" | "narasumber" | "peserta" | "desa" {
  if (role === "superadmin") return "atourin";
  if (role === "mitra_admin") return "mitra";
  if (role === "narasumber") return "narasumber";
  if (role === "desa_wisata") return "desa";
  return "peserta";
}

function linkFor(
  template_key: string,
  payload: Record<string, unknown>,
  role: string,
): string | null {
  const scope = scopeFor(role);
  const projectId = (payload.project_id as string | undefined) ?? null;
  const projectDesaId = (payload.project_desa_id as string | undefined) ?? null;
  const desaId = (payload.desa_id as string | undefined) ?? null;

  // Peserta's route uses project_desa_id, not project_id.
  const pesertaProjectHref = projectDesaId
    ? `/peserta/projects/${projectDesaId}`
    : "/peserta/home";

  switch (template_key) {
    case "checklist_submitted":
    case "evidence_submitted":
      // Reviewer goes to project review queue.
      // Narasumber: dedicated /review page; atourin/mitra: tab=evidence
      if (projectId && scope === "narasumber")
        return `/narasumber/projects/${projectId}/review`;
      if (projectId && (scope === "atourin" || scope === "mitra"))
        return `/${scope}/projects/${projectId}?tab=evidence`;
      return projectId ? `/${scope}/projects/${projectId}` : null;
    case "checklist_approved":
    case "checklist_rejected":
      // Peserta - go to their project_desa
      return pesertaProjectHref;
    case "criteria_submitted":
      // Reviewer goes to klasifikasi v1 detail for that desa
      if (desaId && (scope === "atourin" || scope === "mitra"))
        return `/${scope}/klasifikasi/v1/${desaId}`;
      return scope === "atourin" ? "/atourin/klasifikasi" : null;
    case "criteria_verified":
    case "criteria_rejected":
      // Desa wisata - go to their self-assessment
      if (scope === "desa") return "/desa/self-assessment";
      if (desaId && (scope === "atourin" || scope === "mitra"))
        return `/${scope}/klasifikasi/v1/${desaId}`;
      return null;
    case "comment_added":
      // Checklist discussion (payload has project_id) → project review queue
      if (projectId && scope === "peserta") return pesertaProjectHref;
      if (projectId && scope === "narasumber")
        return `/narasumber/projects/${projectId}/review`;
      if (projectId && (scope === "atourin" || scope === "mitra"))
        return `/${scope}/projects/${projectId}?tab=evidence`;
      // V1 assessment comment → klasifikasi review / desa self-assessment
      if (scope === "desa") return "/desa/self-assessment";
      if (desaId && (scope === "atourin" || scope === "mitra"))
        return `/${scope}/klasifikasi/v1/${desaId}`;
      return null;
    case "baseline_submitted":
      if (projectId) return `/${scope}/projects/${projectId}`;
      return null;
    case "project_invitation":
      if (projectId) return `/${scope}/projects/${projectId}`;
      return scope === "narasumber" ? "/narasumber" : `/${scope}/projects`;
    case "evidence_linked":
      return pesertaProjectHref;
    default:
      return null;
  }
}

export function NotificationsClient({
  items,
  userRole,
}: {
  items: NotificationRow[];
  userRole: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");

  const unreadCount = items.filter((n) => !n.read_at).length;

  const shown = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.read_at) : items),
    [items, filter],
  );

  // Group by day
  const groups = useMemo(() => {
    const byDay = new Map<string, NotificationRow[]>();
    for (const n of shown) {
      const day = new Date(n.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const arr = byDay.get(day) ?? [];
      arr.push(n);
      byDay.set(day, arr);
    }
    return Array.from(byDay.entries());
  }, [shown]);

  function markAllRead() {
    startTransition(async () => {
      const r = await markNotificationsRead({ all: true });
      if ("error" in r) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  function markOneRead(id: string) {
    startTransition(async () => {
      await markNotificationsRead({ ids: [id] });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-atr-outline bg-white p-3 shadow-atr-1">
        <nav className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition ${
              filter === "all"
                ? "bg-atr-purple text-white"
                : "border border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft"
            }`}
          >
            Semua
            <CountBadge
              n={items.length}
              tone={filter === "all" ? "inverted" : "muted"}
            />
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition ${
              filter === "unread"
                ? "bg-atr-purple text-white"
                : "border border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft"
            }`}
          >
            Belum dibaca
            <CountBadge
              n={unreadCount}
              tone={filter === "unread" ? "inverted" : "muted"}
            />
          </button>
        </nav>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Tandai semua dibaca
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center text-sm text-atr-fg-muted">
          Tidak ada notifikasi di filter ini.
        </div>
      ) : (
        groups.map(([day, group]) => (
          <section key={day}>
            <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              {day}
            </h3>
            <ul className="space-y-2">
              {group.map((n) => {
                const cfg = ICON_FOR[n.template_key] ?? {
                  Icon: Paperclip,
                  color: "text-atr-fg-muted",
                };
                const Icon = cfg.Icon;
                const isUnread = !n.read_at;
                const text =
                  n.payload._rendered?.inAppText ??
                  n.payload._rendered?.subject ??
                  n.template_key;
                const subject = n.payload._rendered?.subject;
                const href = linkFor(n.template_key, n.payload, userRole);
                const cardClass = `flex items-start gap-3 rounded-2xl border p-4 shadow-atr-1 transition ${
                  href ? "cursor-pointer" : ""
                } ${
                  isUnread
                    ? "border-atr-purple/30 bg-atr-purple-50/30 hover:bg-atr-purple-50/60"
                    : "border-atr-outline bg-white hover:bg-atr-bg-soft"
                }`;
                const inner = (
                  <>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-atr-bg-soft ${cfg.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {subject && (
                        <p className="text-sm font-bold text-atr-fg">
                          {subject}
                        </p>
                      )}
                      <p
                        className={`text-sm ${
                          subject ? "mt-0.5 text-atr-fg-muted" : "text-atr-fg"
                        }`}
                      >
                        {text}
                      </p>
                      <p className="mt-1 text-[11px] text-atr-fg-muted">
                        {fmtRelative(n.created_at)}
                      </p>
                    </div>
                    {isUnread && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-atr-purple"
                        aria-label="Belum dibaca"
                      />
                    )}
                  </>
                );
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => isUnread && markOneRead(n.id)}
                        className={cardClass}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div
                        onClick={() => isUnread && markOneRead(n.id)}
                        className={`${cardClass} ${isUnread ? "cursor-pointer" : ""}`}
                      >
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
