"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  UserPlus,
  CheckCircle2,
  Copy,
  Check,
  Users,
  KeyRound,
} from "lucide-react";
import {
  createAccountFromRegistration,
  createAccountsFromRegistrations,
} from "@/server/actions/quiz-registration";
import type { QuizRegistrationRow } from "@/server/queries/quiz-registrations";

const GENDER_LABEL: Record<string, string> = { L: "Laki-laki", P: "Perempuan" };

export function PendaftaranPanel({
  rows,
}: {
  rows: QuizRegistrationRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Loading terpisah per-aksi: tombol massal dan tombol per-baris tidak saling
  // memengaruhi indikator loading/disabled-nya.
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Menyimpan password sementara per pendaftaran (hanya ditampilkan sekali).
  const [creds, setCreds] = useState<
    Record<string, { email: string; password: string }>
  >({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkNote, setBulkNote] = useState<string | null>(null);

  const pendingRows = rows.filter((r) => r.status === "pending");
  const allPendingSelected =
    pendingRows.length > 0 && pendingRows.every((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      allPendingSelected ? new Set() : new Set(pendingRows.map((r) => r.id)),
    );
  }

  function buatAkunMassal() {
    const ids = pendingRows.filter((r) => selected.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    setError(null);
    setBulkNote(null);
    setBulkBusy(true);
    startTransition(async () => {
      try {
        const r = await createAccountsFromRegistrations(ids);
        setCreds((c) => {
          const next = { ...c };
          for (const cr of r.credentials)
            next[cr.registration_id] = {
              email: cr.email,
              password: cr.password,
            };
          return next;
        });
        const parts = [`${r.created} akun baru dibuat`];
        if (r.reused) parts.push(`${r.reused} pakai akun lama`);
        if (r.failed) parts.push(`${r.failed} gagal`);
        setBulkNote(parts.join(", ") + ".");
        setSelected(new Set());
        router.refresh();
      } finally {
        setBulkBusy(false);
      }
    });
  }

  function buatAkun(row: QuizRegistrationRow) {
    setError(null);
    setBusyId(row.id);
    startTransition(async () => {
      try {
        const r = await createAccountFromRegistration(row.id);
        if ("error" in r) {
          setError(r.error);
          return;
        }
        if (r.password) {
          setCreds((c) => ({
            ...c,
            [row.id]: { email: row.email, password: r.password! },
          }));
        }
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function copyCred(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-atr-fg">Pendaftaran Peserta</h3>
        <p className="text-sm text-atr-fg-muted">
          Data diri yang diisi peserta sebelum mengerjakan pre-test. Klik
          &quot;Buat Akun&quot; untuk mengaktifkan akun peserta dan mendaftarkannya
          ke project ini.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3.5 py-2.5 text-xs text-atr-red">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-atr-fg-muted" />
          <p className="mt-2 text-sm font-bold text-atr-fg">
            Belum ada pendaftaran
          </p>
          <p className="text-xs text-atr-fg-muted">
            Aktifkan opsi &quot;Minta pendaftaran data diri&quot; pada kuis
            pre-test, lalu bagikan link publiknya.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-atr-fg-muted">
              {rows.length} pendaftaran &middot; {pendingCount} belum dibuatkan
              akun
              {selected.size > 0 && (
                <span className="ml-1 font-bold text-atr-fg">
                  &middot; {selected.size} dipilih
                </span>
              )}
            </div>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={buatAkunMassal}
                disabled={bulkBusy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
              >
                {bulkBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Buat Akun ({selected.size})
              </button>
            )}
          </div>
          {bulkNote && (
            <div className="rounded-lg border border-atr-arti/30 bg-atr-arti/10 px-3.5 py-2 text-xs font-bold text-atr-arti">
              {bulkNote}
            </div>
          )}
          <div className="overflow-x-auto rounded-2xl border border-atr-outline bg-white shadow-atr-1">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-atr-outline bg-atr-bg-soft/50 text-[11px] uppercase tracking-wide text-atr-fg-muted">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua yang belum dibuatkan akun"
                      checked={allPendingSelected}
                      onChange={toggleAll}
                      disabled={pendingRows.length === 0}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-bold">Nama</th>
                  <th className="px-3 py-2.5 font-bold">Kontak</th>
                  <th className="px-3 py-2.5 font-bold">Desa / Instansi</th>
                  <th className="px-3 py-2.5 font-bold">Kuis</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cred = creds[r.id];
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-atr-outline/60 last:border-0 align-top"
                    >
                      <td className="px-3 py-3">
                        {r.status === "pending" && (
                          <input
                            type="checkbox"
                            aria-label={`Pilih ${r.full_name}`}
                            checked={selected.has(r.id)}
                            onChange={() => toggleOne(r.id)}
                            className="h-4 w-4"
                          />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-atr-fg">{r.full_name}</div>
                        <div className="text-[11px] text-atr-fg-muted">
                          {[
                            r.jabatan,
                            r.gender ? GENDER_LABEL[r.gender] ?? r.gender : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-atr-fg">{r.email}</div>
                        <div className="text-[11px] text-atr-fg-muted">
                          {r.phone ?? "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-atr-fg">
                        {r.desa_name ?? r.desa_other ?? "-"}
                        {r.kota && (
                          <div className="text-[11px] text-atr-fg-muted">
                            {r.kota}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-atr-fg-muted">
                        {r.quiz_title ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        {r.status === "converted" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-atr-arti/30 bg-atr-arti/15 px-2 py-0.5 text-[10px] font-bold text-atr-arti">
                            <CheckCircle2 className="h-3 w-3" /> Akun dibuat
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-atr-outline bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
                            Menunggu
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.status === "converted" ? (
                          cred ? (
                            <div className="min-w-[200px] rounded-lg border border-atr-arti/30 bg-atr-arti/5 p-2 text-[11px]">
                              <div className="flex items-center gap-1 font-bold text-atr-fg">
                                <KeyRound className="h-3 w-3" /> Kredensial baru
                              </div>
                              <div className="mt-1 text-atr-fg-muted">
                                {cred.email}
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-atr-fg">
                                  {cred.password}
                                </code>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyCred(
                                      r.id,
                                      `${cred.email} / ${cred.password}`,
                                    )
                                  }
                                  className="inline-flex h-6 items-center gap-1 rounded border border-atr-outline bg-white px-1.5 text-[10px] font-bold text-atr-fg hover:bg-atr-bg-soft"
                                >
                                  {copied === r.id ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                  {copied === r.id ? "Tersalin" : "Salin"}
                                </button>
                              </div>
                              <p className="mt-1 text-[10px] text-atr-fg-muted">
                                Simpan sekarang, tidak ditampilkan lagi.
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-atr-fg-muted">
                              Sudah aktif
                            </span>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => buatAkun(r)}
                            disabled={busyId === r.id}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                          >
                            {busyId === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserPlus className="h-3 w-3" />
                            )}
                            Buat Akun
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
