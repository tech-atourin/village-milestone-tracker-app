"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Loader2, FileText, Award } from "lucide-react";
import { saveRapor } from "@/server/actions/rapor";
import type { RaporRow } from "@/server/queries/rapor";

type EditState = Record<
  string,
  {
    pre: string;
    post: string;
    attendance: string;
  }
>;

export function RaporEntryTable({
  projectId,
  rows,
  scope = "atourin",
}: {
  projectId: string;
  rows: RaporRow[];
  scope?: "atourin" | "mitra" | "narasumber";
}) {
  const router = useRouter();
  const [editState, setEditState] = useState<EditState>(() => {
    const init: EditState = {};
    for (const r of rows) {
      init[r.user_id] = {
        pre: r.pre_test_score?.toString() ?? "",
        post: r.post_test_score?.toString() ?? "",
        attendance: r.attendance?.toString() ?? "",
      };
    }
    return init;
  });
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function update(userId: string, field: "pre" | "post" | "attendance", value: string) {
    setEditState((s) => ({
      ...s,
      [userId]: { ...s[userId], [field]: value },
    }));
  }

  function save(userId: string) {
    setPendingRowId(userId);
    const e = editState[userId];
    const pre = e.pre === "" ? null : Number(e.pre);
    const post = e.post === "" ? null : Number(e.post);
    const att = e.attendance === "" ? null : Number(e.attendance);

    startTransition(async () => {
      const r = await saveRapor({
        project_id: projectId,
        user_id: userId,
        pre_test_score: pre,
        post_test_score: post,
        attendance: att,
      });
      if (r.error) {
        alert(r.error);
      }
      setPendingRowId(null);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-atr-bg-soft">
            <tr className="text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Desa</th>
              <th className="px-4 py-3 w-24">Pre</th>
              <th className="px-4 py-3 w-24">Post</th>
              <th className="px-4 py-3 w-24">Hadir %</th>
              <th className="px-4 py-3 w-20">Δ</th>
              <th className="px-4 py-3 w-32"></th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-atr-outline text-sm">
            {rows.map((r) => {
              const e = editState[r.user_id];
              const dirty =
                e.pre !== (r.pre_test_score?.toString() ?? "") ||
                e.post !== (r.post_test_score?.toString() ?? "") ||
                e.attendance !== (r.attendance?.toString() ?? "");
              const isSaving = pendingRowId === r.user_id;
              return (
                <tr key={r.user_id} className="hover:bg-atr-bg-soft">
                  <td className="px-4 py-3">
                    <div className="font-bold text-atr-fg">{r.full_name}</div>
                    {r.email && (
                      <div className="text-xs text-atr-fg-muted">{r.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-atr-fg-muted">
                    {r.desa_name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreInput
                      value={e.pre}
                      onChange={(v) => update(r.user_id, "pre", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreInput
                      value={e.post}
                      onChange={(v) => update(r.user_id, "post", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreInput
                      value={e.attendance}
                      onChange={(v) => update(r.user_id, "attendance", v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {r.improvement_percent != null ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.improvement_percent > 0
                            ? "bg-atr-arti/15 text-atr-arti"
                            : r.improvement_percent < 0
                              ? "bg-atr-red/15 text-atr-red"
                              : "bg-atr-bg-soft text-atr-fg-muted"
                        }`}
                      >
                        {r.improvement_percent > 0 ? "+" : ""}
                        {r.improvement_percent}%
                      </span>
                    ) : (
                      <span className="text-xs text-atr-fg-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => save(r.user_id)}
                      disabled={isSaving || !dirty}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-40"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Simpan
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {r.has_rapor ? (
                      <div className="flex gap-1">
                        <Link
                          href={`/${scope}/projects/${projectId}/rapor/${r.user_id}`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                          title="RAPOR"
                        >
                          <FileText className="h-3 w-3" />
                        </Link>
                        <Link
                          href={`/${scope}/projects/${projectId}/rapor/${r.user_id}/sertifikat`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-yellow/40 bg-atr-yellow/10 px-2 text-xs font-bold text-atr-fg transition hover:bg-atr-yellow/20"
                          title="Sertifikat"
                        >
                          <Award className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-atr-fg-muted">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      step={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      className="h-8 w-20 rounded-md border border-atr-outline px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
    />
  );
}
