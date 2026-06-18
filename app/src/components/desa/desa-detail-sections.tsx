import Link from "next/link";
import {
  MapPin,
  Award,
  Globe,
  Building2,
  Mail,
  Phone,
  Calendar,
  Users,
  Sparkles,
  FileText,
  Cloud,
  ClipboardCheck,
  Image as ImageIcon,
  Handshake,
  Eye,
} from "lucide-react";
import type { DesaDetail } from "@/server/queries/desa-master";
import type { TierJourney } from "@/server/queries/tier-journey";
import { HubExtrasSections } from "@/components/desa/hub-extras-sections";
import { TierJourneyCard } from "@/components/desa/tier-journey-card";

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

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function DesaDetailSections({
  data,
  hubSyncSlot,
  viewerRole,
  journey,
}: {
  data: DesaDetail;
  hubSyncSlot?: React.ReactNode;
  viewerRole?: "superadmin" | "mitra" | "desa" | string;
  journey?: TierJourney | null;
}) {
  const { base, profile, pengelola, baseline, baseline_submitted_at, hub_assessment, v1_assessment, projects } = data;
  const tier = base.current_classification ?? "unclassified";

  const b = (baseline ?? {}) as Record<string, unknown>;
  const kontak_hp = (b.kontak_hp as string) ?? null;
  const kontak_email = (b.kontak_email as string) ?? null;
  const kontak_nama = (b.kontak_nama as string) ?? null;
  const kontak_jabatan = (b.kontak_jabatan as string) ?? null;
  const jumlah_kk = (b.jumlah_kk as number) ?? null;
  const jumlah_l = (b.jumlah_penduduk_l as number) ?? null;
  const jumlah_p = (b.jumlah_penduduk_p as number) ?? null;
  const jenis_wisata = b.jenis_wisata_utama as string[] | null;
  const kunjungan = (b.kunjungan_tahunan as number) ?? null;
  const homestay = (b.jumlah_homestay as number) ?? null;
  const daya_tarik = (b.jumlah_daya_tarik as number) ?? null;
  const pokdarwis = b.punya_pokdarwis as boolean | undefined;
  const bumdes = b.punya_bumdes as boolean | undefined;
  const perdes = b.punya_perdes as boolean | undefined;
  const sumber_air = (b.sumber_air as string) ?? null;
  const internet = (b.akses_internet as string) ?? null;
  const akses_jalan = (b.akses_jalan as string) ?? null;
  const potensi_bencana = b.potensi_bencana as string[] | null;
  const sop_mitigasi = b.punya_sop_mitigasi as boolean | undefined;
  const sampah = (b.sistem_pengelolaan_sampah as string) ?? null;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <article className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        {profile?.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.cover_image_url}
            alt={`Cover ${base.name}`}
            className="aspect-[4/1] w-full object-cover"
          />
        )}
        <div className="bg-gradient-to-br from-atr-purple-50 to-white p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-atr-purple text-white">
                <MapPin className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-atr-fg">{base.name}</h2>
                <p className="text-sm text-atr-fg-muted">
                  {[base.kabupaten, base.provinsi].filter(Boolean).join(", ") || "-"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_BADGE[tier]}`}
                  >
                    <Award className="h-3 w-3" />
                    {TIER_LABEL[tier]}
                  </span>
                  {base.hub_desa_id && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
                      <Sparkles className="h-3 w-3" />
                      Linked ke Hub
                    </span>
                  )}
                  {base.jadesta_id && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-atr-outline bg-white px-2.5 py-0.5 text-xs text-atr-fg-muted">
                      <Globe className="h-3 w-3" />
                      Hub ID: {base.jadesta_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {hubSyncSlot}
          </div>
        </div>
      </article>

      {/* Informasi Dasar */}
      <Section title="Informasi Dasar" icon={MapPin}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Desa / Kelurahan" value={base.desa_kelurahan} />
          <Detail label="Kecamatan" value={base.kecamatan} />
          <Detail label="Kabupaten" value={base.kabupaten} />
          <Detail label="Provinsi" value={base.provinsi} />
          <Detail label="Alamat" value={profile?.alamat ?? null} />
          {profile?.synced_from_hub_at && (
            <Detail
              label="Disinkron dari Hub"
              value={fmtDate(profile.synced_from_hub_at)}
            />
          )}
        </div>
        {profile?.deskripsi && (
          <p className="mt-4 whitespace-pre-line text-sm text-atr-fg">
            {profile.deskripsi}
          </p>
        )}
      </Section>

      {/* Demografi */}
      <Section title="Demografi" icon={Users}>
        {baseline && (jumlah_kk || jumlah_l || jumlah_p) ? (
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Detail label="Jumlah KK" value={jumlah_kk?.toString() ?? null} />
            <Detail
              label="Penduduk L"
              value={jumlah_l ? jumlah_l.toLocaleString("id-ID") : null}
            />
            <Detail
              label="Penduduk P"
              value={jumlah_p ? jumlah_p.toLocaleString("id-ID") : null}
            />
            <Detail
              label="Total"
              value={
                jumlah_l && jumlah_p
                  ? (jumlah_l + jumlah_p).toLocaleString("id-ID")
                  : null
              }
            />
          </div>
        ) : (
          <EmptySection message="Data demografi belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Wisata */}
      <Section title="Profil Wisata" icon={Sparkles}>
        {baseline && (jenis_wisata || kunjungan || daya_tarik) ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Detail
                label="Daya Tarik"
                value={daya_tarik?.toString() ?? null}
              />
              <Detail
                label="Kunjungan/Tahun"
                value={kunjungan ? kunjungan.toLocaleString("id-ID") : null}
              />
              <Detail label="Homestay" value={homestay?.toString() ?? null} />
            </div>
            {jenis_wisata && jenis_wisata.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Jenis Wisata
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {jenis_wisata.map((j) => (
                    <span
                      key={j}
                      className="inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600"
                    >
                      {j}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile?.keunikan && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Keunikan
                </div>
                <p className="mt-1 text-sm text-atr-fg">{profile.keunikan}</p>
              </div>
            )}
          </div>
        ) : (
          <EmptySection message="Profil wisata belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Fasilitas */}
      <Section title="Amenitas & Fasilitas" icon={ImageIcon}>
        {profile?.fasilitas && profile.fasilitas.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.fasilitas.map((f) => (
              <span
                key={f}
                className="inline-flex rounded-full border border-atr-outline bg-atr-bg-soft px-3 py-1 text-xs font-bold text-atr-fg"
              >
                {f}
              </span>
            ))}
          </div>
        ) : (
          <EmptySection message="Belum ada data fasilitas (perlu sync dari Hub atau input manual)" />
        )}
      </Section>

      {/* Kelembagaan */}
      <Section title="Kelembagaan & Tata Kelola" icon={Building2}>
        {baseline &&
        (pokdarwis !== undefined ||
          bumdes !== undefined ||
          perdes !== undefined) ? (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Detail
              label="Pokdarwis"
              value={
                pokdarwis === true ? "Aktif" : pokdarwis === false ? "Belum" : null
              }
            />
            <Detail
              label="BUMDes"
              value={
                bumdes === true ? "Aktif" : bumdes === false ? "Belum" : null
              }
            />
            <Detail
              label="Perdes Wisata"
              value={
                perdes === true ? "Sudah ada" : perdes === false ? "Belum" : null
              }
            />
          </div>
        ) : (
          <EmptySection message="Data kelembagaan belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Aksesibilitas & Infrastruktur */}
      <Section title="Aksesibilitas & Infrastruktur" icon={Cloud}>
        {baseline && (sumber_air || internet || akses_jalan) ? (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Detail label="Akses Jalan" value={akses_jalan} />
            <Detail label="Sumber Air" value={sumber_air} />
            <Detail label="Internet" value={internet} />
          </div>
        ) : (
          <EmptySection message="Data infrastruktur belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Resiliensi */}
      <Section title="Resiliensi & Pengelolaan" icon={ClipboardCheck}>
        {baseline &&
        (potensi_bencana ||
          sop_mitigasi !== undefined ||
          sampah) ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail
                label="SOP Mitigasi Bencana"
                value={
                  sop_mitigasi === true
                    ? "Ada"
                    : sop_mitigasi === false
                      ? "Belum"
                      : null
                }
              />
              <Detail label="Pengelolaan Sampah" value={sampah} />
            </div>
            {potensi_bencana && potensi_bencana.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Potensi Bencana
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {potensi_bencana.map((p) => (
                    <span
                      key={p}
                      className="inline-flex rounded-full bg-atr-yellow/15 px-2.5 py-0.5 text-xs font-bold text-atr-fg"
                    >
                      ⚠ {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptySection message="Data resiliensi belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Pengelola */}
      <Section title="Kontak Pengelola" icon={Building2}>
        {profile?.pengelola_kontak_person ||
        profile?.pengelola_email ||
        profile?.pengelola_whatsapp ||
        kontak_nama ||
        kontak_email ||
        kontak_hp ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Detail
              label="Nama"
              value={profile?.pengelola_kontak_person ?? kontak_nama}
            />
            <Detail label="Jabatan" value={kontak_jabatan} />
            <Detail
              label="Telp / WA"
              value={profile?.pengelola_whatsapp ?? kontak_hp}
              icon={Phone}
            />
            <Detail
              label="Email"
              value={profile?.pengelola_email ?? kontak_email}
              icon={Mail}
            />
          </div>
        ) : (
          <EmptySection message="Belum ada kontak pengelola (perlu sync dari Hub atau baseline)" />
        )}
      </Section>

      {/* Profil Pengelola (Jadesta-style data - filled by desa wisata at /desa/pengelola) */}
      <Section title="Profil Lembaga Pengelola" icon={Handshake}>
        {pengelola ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Detail label="Bentuk Lembaga" value={pengelola.bentuk_kelembagaan} />
              <Detail label="No. SK" value={pengelola.nomor_sk} />
              <Detail label="Tanggal SK" value={fmtDate(pengelola.tanggal_sk)} />
              <Detail
                label="Total Pengurus"
                value={pengelola.total_pengurus?.toString() ?? null}
              />
              <Detail
                label="Pengurus P"
                value={pengelola.total_pengurus_p?.toString() ?? null}
              />
            </div>
            {pengelola.landasan_pembentukan && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Landasan Pembentukan
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-atr-fg">
                  {pengelola.landasan_pembentukan}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <RatingDisplay label="Kemandirian" value={pengelola.rating_kemandirian} />
              <RatingDisplay label="Keberlanjutan" value={pengelola.rating_keberlanjutan} />
              <RatingDisplay label="Inovasi" value={pengelola.rating_inovasi} />
            </div>
            {pengelola.jaringan_kerjasama && pengelola.jaringan_kerjasama.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Jaringan Kerjasama ({pengelola.jaringan_kerjasama.length})
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {pengelola.jaringan_kerjasama.map((j) => (
                    <span
                      key={j}
                      className="inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600"
                    >
                      {j}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {pengelola.catatan && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Catatan
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-atr-fg">
                  {pengelola.catatan}
                </p>
              </div>
            )}
          </div>
        ) : (
          <EmptySection message="Desa belum mengisi profil pengelola (form di /desa/pengelola)" />
        )}
      </Section>

      {/* Hub extras (produk/foto/awards/events) */}
      <HubExtrasSections
        produk={profile?.produk_list ?? null}
        foto={profile?.foto_galeri ?? null}
        awards={profile?.awards ?? null}
        events={profile?.events ?? null}
      />

      {/* Self-Improvement Journey - only when we have a tier journey to show */}
      {journey && (
        <TierJourneyCard
          journey={journey}
          viewerScope={
            viewerRole === "desa"
              ? "desa"
              : viewerRole === "mitra"
                ? "mitra"
                : "atourin"
          }
        />
      )}

      {/* Assessment V1 Permenpar */}
      <Section
        title="Assessment Klasifikasi Desa V1 (ADWI)"
        icon={ClipboardCheck}
      >
        {v1_assessment ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg bg-atr-yellow/15 px-2.5 py-1.5 font-bold text-atr-fg">
                {v1_assessment.submitted} menunggu review
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-atr-arti/10 px-2.5 py-1.5 font-bold text-atr-arti">
                {v1_assessment.verified} terverifikasi
              </span>
              {v1_assessment.rejected > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-atr-red/10 px-2.5 py-1.5 font-bold text-atr-red">
                  {v1_assessment.rejected} ditolak
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-lg bg-atr-bg-soft px-2.5 py-1.5 text-atr-fg-muted">
                {v1_assessment.total_progress} kriteria dikerjakan
              </span>
            </div>
            {(viewerRole === "superadmin" || viewerRole === "mitra") && (
              <Link
                href={`/atourin/klasifikasi/v1/${base.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                title="Review per kriteria Permenpar"
              >
                <Eye className="h-3.5 w-3.5" />
                Review Kriteria
              </Link>
            )}
          </div>
        ) : (
          <EmptySection message="Desa belum mengerjakan assessment V1 Permenpar" />
        )}
      </Section>

      {/* Assessment Desa V2 */}
      <Section
        title="Assessment Klasifikasi Desa V2 (Atourin)"
        icon={FileText}
      >
        {hub_assessment ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-3xl font-bold text-atr-fg">
                {hub_assessment.skor_total ?? "-"}%
              </div>
              <div className="text-xs text-atr-fg-muted">
                Status: {hub_assessment.status}
                {hub_assessment.submitted_at && (
                  <> · disubmit {fmtDate(hub_assessment.submitted_at)}</>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hub_assessment.level_hasil && (
                <span className="inline-flex items-center gap-1 rounded-full bg-atr-purple-50 px-3 py-1 text-sm font-bold text-atr-purple-600">
                  <Award className="h-3 w-3" />
                  {hub_assessment.level_hasil}
                </span>
              )}
              {(viewerRole === "superadmin" || viewerRole === "mitra") && (
                <Link
                  href={`/atourin/klasifikasi/v2/${hub_assessment.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                  title="Lihat detail jawaban + thread feedback per pertanyaan"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Lihat Detail
                </Link>
              )}
            </div>
          </div>
        ) : (
          <EmptySection message="Desa belum mengisi assessment V2" />
        )}
      </Section>

      {/* Riwayat Project */}
      <Section title="Riwayat Program Pendampingan" icon={Calendar}>
        {projects.length === 0 ? (
          <EmptySection message="Desa belum pernah mengikuti program pendampingan" />
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li
                key={p.project_id}
                className="flex items-center justify-between rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-sm"
              >
                <div>
                  <div className="font-bold text-atr-fg">{p.project_name}</div>
                  <div className="text-[11px] text-atr-fg-muted">
                    {fmtDate(p.period_start)} – {fmtDate(p.period_end)} · {p.peserta_count} peserta
                  </div>
                </div>
                <span className="inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-atr-purple-600">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Baseline meta - baseline is editable, not a one-shot submit */}
      {baseline_submitted_at && (
        <p className="text-center text-[11px] text-atr-fg-muted">
          Baseline terakhir diupdate {fmtDate(baseline_submitted_at)}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </article>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-atr-fg">
        {Icon && value && <Icon className="h-3 w-3 text-atr-fg-muted" />}
        {value ?? <span className="italic text-atr-fg-muted">-</span>}
      </div>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center">
      <p className="text-xs italic text-atr-fg-muted">{message}</p>
    </div>
  );
}

function RatingDisplay({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-atr-purple-600">
        {value != null ? value : "-"}
        <span className="text-xs font-normal text-atr-fg-muted">/5</span>
      </div>
    </div>
  );
}
