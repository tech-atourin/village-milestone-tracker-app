"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  TrendingUp,
  Image as ImageIcon,
  Save,
  Loader2,
  Upload,
  Send,
  Plus,
  X,
} from "lucide-react";
import type { SessionDetail } from "@/server/queries/pendampingan";
import {
  updateSession,
  setAttendance,
  uploadSessionEvidence,
  submitSession,
} from "@/server/actions/pendampingan";

type Candidate = {
  user_id: string;
  full_name: string;
  jabatan: string | null;
  gender: "L" | "P" | null;
};

const TABS = [
  { key: "informasi", label: "Informasi", icon: FileText },
  { key: "kegiatan", label: "Kegiatan & Peserta", icon: Users },
  { key: "laporan", label: "Laporan Narasumber", icon: FileText },
  { key: "kondisi", label: "Kondisi Desa", icon: TrendingUp },
] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SesiDetailEditor({
  data,
  candidates,
  signedUrls,
}: {
  data: SessionDetail;
  candidates: Candidate[];
  signedUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("informasi");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [materi, setMateri] = useState(data.materi ?? "");
  const [tindakLanjut, setTindakLanjut] = useState(data.tindak_lanjut ?? "");
  const [rekomendasi, setRekomendasi] = useState(data.rekomendasi ?? "");
  const [sebelum, setSebelum] = useState<string[]>(
    data.kondisi_sebelum ?? [""],
  );
  const [setelah, setSetelah] = useState<string[]>(
    data.kondisi_setelah ?? [""],
  );

  // Attendance
  const initialAtt = new Map(
    data.attendance.map((a) => [
      a.user_id,
      { status: a.status, note: a.note ?? "" },
    ]),
  );
  const [att, setAtt] = useState<Map<string, { status: string; note: string }>>(
    new Map(
      candidates.map((c) => [
        c.user_id,
        initialAtt.get(c.user_id) ?? { status: "hadir", note: "" },
      ]),
    ),
  );

  const fileRef = useRef<HTMLInputElement>(null);

  function saveLaporan() {
    setError(null);
    startTransition(async () => {
      const r = await updateSession({
        id: data.id,
        materi: materi || null,
        tindak_lanjut: tindakLanjut || null,
      });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function saveKondisi() {
    setError(null);
    startTransition(async () => {
      const r = await updateSession({
        id: data.id,
        kondisi_sebelum: sebelum.filter((s) => s.trim()),
        kondisi_setelah: setelah.filter((s) => s.trim()),
        rekomendasi: rekomendasi || null,
      });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function saveAttendance() {
    setError(null);
    startTransition(async () => {
      const r = await setAttendance({
        session_id: data.id,
        entries: Array.from(att.entries()).map(([user_id, v]) => ({
          user_id,
          status: v.status as "hadir" | "izin" | "sakit" | "tidak_hadir",
          note: v.note || null,
        })),
      });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const base64 = await fileToBase64(file);
    startTransition(async () => {
      const r = await uploadSessionEvidence({
        session_id: data.id,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        base64,
      });
      if (r.error) setError(r.error);
      else {
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    });
  }

  function doSubmit() {
    if (!confirm("Submit sesi ini untuk verifikasi? Setelah ini status berubah ke 'Submitted'.")) return;
    startTransition(async () => {
      const r = await submitSession(data.id);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <nav className="border-b border-atr-outline">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-bold transition ${
                    isActive
                      ? "border-atr-purple text-atr-purple-600"
                      : "border-transparent text-atr-fg-muted hover:text-atr-fg"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      {/* Informasi */}
      {tab === "informasi" && (
        <section className="space-y-4">
          <Card title="Detail Sesi">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <DT label="Project">{data.project_name}</DT>
              <DT label="Desa">{data.desa_name}</DT>
              <DT label="Lokasi">
                {[data.kabupaten, data.provinsi].filter(Boolean).join(", ") || "—"}
              </DT>
              <DT label="Hari ke-">
                {data.day_number} dari {data.total_days}
              </DT>
              <DT label="Tanggal">
                {new Intl.DateTimeFormat("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(data.session_date))}
              </DT>
              <DT label="Jam">
                {data.start_time ?? "—"} – {data.end_time ?? "—"}
              </DT>
              <DT label="Narasumber">{data.narasumber_name}</DT>
              <DT label="Status">{data.status}</DT>
            </dl>
          </Card>

          {data.status === "draft" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={doSubmit}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-arti px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Submit untuk verifikasi
              </button>
            </div>
          )}
        </section>
      )}

      {/* Kegiatan: attendance + evidence */}
      {tab === "kegiatan" && (
        <section className="space-y-4">
          <Card title={`Daftar Peserta (${candidates.length})`}>
            {candidates.length === 0 ? (
              <p className="text-sm italic text-atr-fg-muted">
                Belum ada peserta terdaftar untuk desa ini.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-atr-outline">
                <table className="w-full text-sm">
                  <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                    <tr>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Jabatan</th>
                      <th className="px-3 py-2">JK</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-atr-outline">
                    {candidates.map((c) => {
                      const v = att.get(c.user_id) ?? {
                        status: "hadir",
                        note: "",
                      };
                      return (
                        <tr key={c.user_id}>
                          <td className="px-3 py-2 font-bold text-atr-fg">
                            {c.full_name}
                          </td>
                          <td className="px-3 py-2 text-atr-fg-muted">
                            {c.jabatan ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-atr-fg-muted">
                            {c.gender ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={v.status}
                              onChange={(e) =>
                                setAtt((m) =>
                                  new Map(m).set(c.user_id, {
                                    ...v,
                                    status: e.target.value,
                                  }),
                                )
                              }
                              className="h-8 rounded-md border border-atr-outline bg-white px-2 text-xs outline-none focus:border-atr-purple"
                            >
                              <option value="hadir">Hadir</option>
                              <option value="izin">Izin</option>
                              <option value="sakit">Sakit</option>
                              <option value="tidak_hadir">Tidak hadir</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={v.note}
                              onChange={(e) =>
                                setAtt((m) =>
                                  new Map(m).set(c.user_id, {
                                    ...v,
                                    note: e.target.value,
                                  }),
                                )
                              }
                              placeholder="—"
                              className="h-8 w-full rounded-md border border-atr-outline bg-white px-2 text-xs outline-none focus:border-atr-purple"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {candidates.length > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Simpan kehadiran
                </button>
              </div>
            )}
          </Card>

          <Card
            title={`Foto Kegiatan Hari ${data.day_number} (${data.evidence_paths.length})`}
          >
            {data.evidence_paths.length === 0 ? (
              <p className="text-sm italic text-atr-fg-muted">
                Belum ada foto evidence untuk sesi ini.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {data.evidence_paths.map((p) => {
                  const url = signedUrls[p];
                  return (
                    <a
                      key={p}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square overflow-hidden rounded-lg border border-atr-outline bg-atr-bg-soft"
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover transition hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-atr-fg-muted" />
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
            <div className="mt-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Upload foto
              </button>
            </div>
          </Card>
        </section>
      )}

      {/* Laporan Narasumber */}
      {tab === "laporan" && (
        <Card title="Laporan Narasumber">
          <div className="space-y-4">
            <Field label="Materi yang disampaikan">
              <textarea
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                rows={5}
                placeholder="Tuliskan materi pembelajaran/pendampingan hari ini..."
                className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
            <Field label="Tindak Lanjut / Output">
              <textarea
                value={tindakLanjut}
                onChange={(e) => setTindakLanjut(e.target.value)}
                rows={4}
                placeholder="Tugas / PR / target output untuk peserta..."
                className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </Field>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveLaporan}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Simpan laporan
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Kondisi Desa */}
      {tab === "kondisi" && (
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Kondisi Sebelum Pendampingan" accent="warning">
              <BulletEditor items={sebelum} setItems={setSebelum} placeholder="Tambah poin kondisi sebelum..." />
            </Card>
            <Card title="Kondisi Setelah Pendampingan" accent="success">
              <BulletEditor items={setelah} setItems={setSetelah} placeholder="Tambah poin kondisi setelah..." />
            </Card>
          </div>
          <Card title="Rekomendasi" accent="info">
            <textarea
              value={rekomendasi}
              onChange={(e) => setRekomendasi(e.target.value)}
              rows={4}
              placeholder="Rekomendasi tindak lanjut jangka pendek/menengah/panjang..."
              className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Card>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveKondisi}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Simpan kondisi
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Card({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: "warning" | "success" | "info";
}) {
  const ring =
    accent === "warning"
      ? "border-atr-yellow/40 bg-atr-yellow/5"
      : accent === "success"
        ? "border-atr-arti/30 bg-atr-arti/5"
        : accent === "info"
          ? "border-atr-purple/30 bg-atr-purple-50/40"
          : "border-atr-outline bg-white";
  return (
    <section className={`rounded-2xl border p-6 shadow-atr-1 ${ring}`}>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DT({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-atr-fg">{children}</dd>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-atr-fg">{label}</label>
      {children}
    </div>
  );
}

function BulletEditor({
  items,
  setItems,
  placeholder,
}: {
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-atr-purple" />
          <input
            type="text"
            value={it}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              setItems(next);
            }}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-atr-outline bg-white px-2 py-1.5 text-sm outline-none focus:border-atr-purple"
          />
          <button
            type="button"
            onClick={() => setItems(items.filter((_, ix) => ix !== i))}
            className="mt-0.5 rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-red"
            aria-label="Hapus"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, ""])}
        className="inline-flex items-center gap-1 text-xs font-bold text-atr-purple-600 hover:text-atr-purple"
      >
        <Plus className="h-3 w-3" />
        Tambah poin
      </button>
    </div>
  );
}
