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
import { CountBadge } from "@/components/ui/count-badge";

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
  const num = (k: string): number | null => (b[k] as number) ?? null;
  const str = (k: string): string | null => (b[k] as string) ?? null;
  const bool = (k: string): boolean | undefined => b[k] as boolean | undefined;
  const arr = (k: string): string[] | null => (b[k] as string[] | null) ?? null;
  const rep = (k: string): Array<Record<string, unknown>> =>
    Array.isArray(b[k]) ? (b[k] as Array<Record<string, unknown>>) : [];
  // Latest-year row (by max `tahun`) from a Data Tahunan repeater
  const latestYear = (
    k: string,
  ): { row: Record<string, unknown> | null; tahun: number | null } => {
    const rows = rep(k);
    if (!rows.length) return { row: null, tahun: null };
    let best: Record<string, unknown> | null = null;
    let bestY = -Infinity;
    for (const r of rows) {
      const t = Number(r.tahun ?? 0);
      if (Number.isFinite(t) && t >= bestY) {
        bestY = t;
        best = r;
      }
    }
    return { row: best, tahun: Number.isFinite(bestY) ? bestY : null };
  };
  const nNum = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && v !== null && v !== undefined && v !== ""
      ? n
      : null;
  };

  const kontak_hp = str("kontak_hp");
  const kontak_email = str("kontak_email");
  const kontak_nama = str("kontak_nama");
  const kontak_jabatan = str("kontak_jabatan");
  const jumlah_kk = num("jumlah_kk");
  const jumlah_l = num("jumlah_penduduk_l");
  const jumlah_p = num("jumlah_penduduk_p");
  const jumlah_rt = num("jumlah_rt");
  const jumlah_rw = num("jumlah_rw");
  const jenis_wisata = arr("jenis_wisata_utama");
  const kategori_desa = arr("kategori_desa");
  // Kunjungan: derive from kunjungan_per_tahun (latest year), fallback to legacy field
  const kunjLatest = latestYear("kunjungan_per_tahun");
  const kunj_wni = nNum(kunjLatest.row?.wni);
  const kunj_wna = nNum(kunjLatest.row?.wna);
  const kunjungan =
    kunjLatest.row && (kunj_wni !== null || kunj_wna !== null)
      ? (kunj_wni ?? 0) + (kunj_wna ?? 0)
      : num("kunjungan_tahunan");
  const kunjungan_domestik = kunj_wni ?? num("kunjungan_domestik");
  const kunjungan_mancanegara = kunj_wna ?? num("kunjungan_mancanegara");
  // Pendapatan: latest year of pendapatan_per_tahun, fallback to legacy
  const pendLatest = latestYear("pendapatan_per_tahun");
  const pendapatan_tahunan =
    nNum(pendLatest.row?.jumlah_rp) ?? num("pendapatan_tahunan");
  // Pengurus Pokdarwis: latest year repeater (pria+wanita), fallback legacy
  const pengLatest = latestYear("pengurus_pokdarwis_per_tahun");
  const peng_pria = nNum(pengLatest.row?.pria);
  const peng_wanita = nNum(pengLatest.row?.wanita);
  const pengurus_pokdarwis =
    pengLatest.row && (peng_pria !== null || peng_wanita !== null)
      ? (peng_pria ?? 0) + (peng_wanita ?? 0)
      : num("pengurus_pokdarwis");
  // Warga terlibat: latest year of tenaga_kerja_per_tahun, fallback legacy
  const tkLatest = latestYear("tenaga_kerja_per_tahun");
  const tk_pria = nNum(tkLatest.row?.pria);
  const tk_wanita = nNum(tkLatest.row?.wanita);
  const warga_l = tk_pria ?? num("jumlah_terlibat_l");
  const warga_p = tk_wanita ?? num("jumlah_terlibat_p");
  const warga_total =
    tkLatest.row && (tk_pria !== null || tk_wanita !== null)
      ? (tk_pria ?? 0) + (tk_wanita ?? 0)
      : num("jumlah_warga_terlibat");
  const homestay = num("jumlah_homestay");
  const daya_tarik = num("jumlah_daya_tarik");
  const pokdarwis = bool("punya_pokdarwis");
  const bumdes = bool("punya_bumdes");
  const perdes = bool("punya_perdes");
  const sumber_air = str("sumber_air");
  const internet = str("akses_internet");
  const akses_jalan = str("akses_jalan");
  const potensi_bencana = arr("potensi_bencana");
  const sop_mitigasi = bool("punya_sop_mitigasi");

  // Repeater data
  const penghargaan = rep("penghargaan");
  const partisipasi_event = rep("partisipasi_event");
  const exposure_publikasi = rep("exposure_publikasi");
  const sertifikasi = rep("sertifikasi");
  const kemitraan_pt = rep("kemitraan_pt");
  const kemitraan_swasta = rep("kemitraan_swasta");
  const dokumen = rep("dokumen");
  const kunjungan_per_tahun = rep("kunjungan_per_tahun");
  const tenaga_kerja_per_tahun = rep("tenaga_kerja_per_tahun");
  const umkm_per_tahun = rep("umkm_per_tahun");
  const pendapatan_per_tahun = rep("pendapatan_per_tahun");
  const pengurus_pokdarwis_per_tahun = rep("pengurus_pokdarwis_per_tahun");

  // Merge Hub awards into the unified Pencapaian section so they don't
  // duplicate in HubExtras. Hub awards become read-only "from Hub" entries.
  const hubAwards = (profile?.awards ?? []) as Array<Record<string, unknown>>;
  const penghargaanMerged = [
    ...hubAwards.map((a) => ({
      nama:
        (a.kompetisi as string) ??
        (a.kategori as string) ??
        "Penghargaan",
      lembaga: null,
      tahun: a.tahun ?? null,
      peringkat: (a.peringkat as string) ?? (a.edisi as string) ?? null,
      _source: "hub",
    })),
    ...penghargaan.map((p) => ({ ...p, _source: "baseline" })),
  ];

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
        {baseline && (jumlah_kk || jumlah_l || jumlah_p || jumlah_rt || jumlah_rw) ? (
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
            <Detail label="Jumlah RT" value={jumlah_rt?.toString() ?? null} />
            <Detail label="Jumlah RW" value={jumlah_rw?.toString() ?? null} />
          </div>
        ) : (
          <EmptySection message="Data demografi belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Daya Tarik Wisata */}
      <Section title="Daya Tarik Wisata" icon={Sparkles}>
        {baseline && (jenis_wisata || kunjungan || daya_tarik || str("tematik_desa")) ? (
          <div className="space-y-4">
            {str("tematik_desa") && (
              <Para label="Tematik Desa" value={str("tematik_desa")} />
            )}
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Detail label="Daya Tarik" value={daya_tarik?.toString() ?? null} />
              <Detail
                label="Kunjungan/Tahun"
                value={kunjungan ? kunjungan.toLocaleString("id-ID") : null}
              />
              <Detail label="Domestik/Th" value={kunjungan_domestik?.toLocaleString("id-ID") ?? null} />
              <Detail label="Mancanegara/Th" value={kunjungan_mancanegara?.toLocaleString("id-ID") ?? null} />
              <Detail label="Asal Domestik" value={str("asal_domestik")} />
              <Detail label="Asal Mancanegara" value={str("asal_mancanegara")} />
              <Detail label="Kondisi Atraksi" value={str("kondisi_atraksi")} />
            </div>
            {(jenis_wisata?.length || kategori_desa?.length) ? (
              <div className="space-y-2">
                {jenis_wisata && jenis_wisata.length > 0 && (
                  <ChipList label="Jenis Wisata" items={jenis_wisata} />
                )}
                {kategori_desa && kategori_desa.length > 0 && (
                  <ChipList label="Kategori Desa" items={kategori_desa} />
                )}
              </div>
            ) : null}
            <ParaOrTable
              label="Wisata Alam"
              value={b.wisata_alam}
              cols={[
                { key: "nama", label: "Nama" },
                { key: "deskripsi", label: "Deskripsi" },
              ]}
            />
            <ParaOrTable
              label="Wisata Budaya"
              value={b.wisata_budaya}
              cols={[
                { key: "nama", label: "Atraksi / Tradisi" },
                { key: "deskripsi", label: "Deskripsi" },
              ]}
            />
            <ParaOrTable
              label="Wisata Buatan / Kreatif"
              value={b.wisata_buatan}
              cols={[
                { key: "nama", label: "Nama" },
                { key: "deskripsi", label: "Deskripsi" },
              ]}
            />
            <ParaOrTable
              label="Kegiatan Wisatawan"
              value={b.kegiatan_wisatawan}
              cols={[
                { key: "nama", label: "Kegiatan" },
                { key: "durasi", label: "Durasi" },
              ]}
            />
            <Para label="Potensi Belum Dikembangkan" value={str("potensi_daya_tarik")} />
            <Para label="Kendala Pengembangan" value={str("kendala_atraksi")} />
            <Para label="Program yang Diperlukan" value={str("program_atraksi")} />
            {profile?.keunikan && (
              <Para label="Keunikan & Keunggulan" value={profile.keunikan} />
            )}
          </div>
        ) : (
          <EmptySection message="Daya tarik wisata belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Amenitas & Fasilitas */}
      <Section title="Amenitas & Fasilitas" icon={ImageIcon}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Detail label="Homestay" value={homestay?.toString() ?? null} />
            <Detail label="Total Kamar" value={num("jumlah_kamar_homestay")?.toString() ?? null} />
            <Detail label="Tamu/Bulan" value={num("rata_tamu_homestay_bulan")?.toString() ?? null} />
            <Detail label="Hotel/Akomodasi" value={num("jumlah_hotel")?.toString() ?? null} />
            <Detail label="Kios Ekraf" value={num("jumlah_kios_ekraf")?.toString() ?? null} />
            <Detail label="Toilet Umum" value={num("jumlah_toilet_umum")?.toString() ?? null} />
            <Detail label="Kapasitas Parkir" value={str("kapasitas_parkir")} />
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <BoolChip label="Area parkir" value={bool("punya_area_parkir")} />
            <BoolChip label="TIC" value={bool("punya_tic")} />
            <BoolChip label="Penerangan" value={bool("punya_sarana_penerangan")} />
            <BoolChip label="Sarana ibadah" value={bool("punya_sarana_ibadah")} />
            <BoolChip label="Ruang ASI" value={bool("punya_ruangan_asi")} />
            <BoolChip label="Kios oleh-oleh" value={bool("punya_kios_jualan")} />
          </div>
          {profile?.fasilitas && profile.fasilitas.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                Fasilitas (dari Hub)
              </div>
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
            </div>
          )}
          <Para label="Sarana lainnya" value={str("sarana_lainnya")} />
          <Para label="Program pengembangan amenitas" value={str("program_amenitas")} />
        </div>
      </Section>

      {/* Paket Wisata & Pemasaran Digital */}
      <Section title="Paket Wisata & Pemasaran Digital" icon={Globe}>
        {baseline && (bool("paket_tersedia") !== undefined || str("daftar_paket") || arr("media_sosial")?.length) ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <BoolChip label="Paket wisata tersedia" value={bool("paket_tersedia")} />
              <BoolChip label="Punya website" value={bool("punya_website")} />
              <BoolChip label="Video profil" value={bool("video_profil")} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Detail label="Jumlah Paket" value={num("jumlah_paket")?.toString() ?? null} />
              <Detail label="Website" value={str("website_url")} />
              <Detail label="Link Video" value={str("link_video")} />
            </div>
            {arr("jenis_paket")?.length ? (
              <ChipList label="Jenis Paket" items={arr("jenis_paket") ?? []} />
            ) : null}
            <ParaOrTable
              label="Daftar Paket Wisata"
              value={b.daftar_paket}
              cols={[
                { key: "nama", label: "Paket" },
                { key: "harga", label: "Harga (Rp)", align: "right",
                  render: (v) => v == null || v === "" ? "-" : Number(v).toLocaleString("id-ID") },
                { key: "durasi", label: "Durasi" },
                { key: "deskripsi", label: "Inklusi" },
              ]}
            />
            {arr("media_sosial")?.length ? (
              <ChipList label="Media Sosial" items={arr("media_sosial") ?? []} />
            ) : null}
            <ParaOrTable
              label="Akun Media Sosial"
              value={b.akun_sosmed}
              cols={[
                { key: "platform", label: "Platform" },
                { key: "handle", label: "Handle" },
                { key: "url", label: "URL" },
              ]}
            />
            {arr("marketplace")?.length ? (
              <ChipList label="Marketplace / OTA" items={arr("marketplace") ?? []} />
            ) : null}
            <Para label="Kendala pemasaran digital" value={str("kendala_pemasaran")} />
            <Para label="Program pengembangan pemasaran" value={str("program_pemasaran")} />
          </div>
        ) : (
          <EmptySection message="Paket wisata & pemasaran digital belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Kelembagaan */}
      <Section title="Kelembagaan & Tata Kelola" icon={Building2}>
        {baseline &&
        (pokdarwis !== undefined ||
          bumdes !== undefined ||
          perdes !== undefined ||
          str("pihak_pengelola")) ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Detail label="Pihak Pengelola" value={str("pihak_pengelola")} />
              <Detail label="Frekuensi Rapat" value={str("frekuensi_pertemuan")} />
              <Detail label="Pengurus Pokdarwis" value={pengurus_pokdarwis?.toString() ?? null} />
              <Detail label="Pemandu Wisata" value={num("jumlah_pemandu")?.toString() ?? null} />
              <Detail label="Pemandu Tersertifikasi" value={num("jumlah_pemandu_sertifikat")?.toString() ?? null} />
              <Detail label="Total Warga Terlibat" value={warga_total?.toString() ?? null} />
              <Detail label="Warga L Terlibat" value={warga_l?.toString() ?? null} />
              <Detail label="Warga P Terlibat" value={warga_p?.toString() ?? null} />
              <Detail label="Pendapatan Wisata/Th" value={pendapatan_tahunan ? "Rp " + pendapatan_tahunan.toLocaleString("id-ID") : null} />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <BoolChip label="Pokdarwis aktif" value={pokdarwis} />
              <BoolChip label="BUMDes mengelola" value={bumdes} />
              <BoolChip label="Perdes wisata" value={perdes} />
              <BoolChip label="Keterlibatan disabilitas" value={bool("terlibat_disabilitas")} />
            </div>
            <Para label="Pembagian Profit ke Masyarakat" value={str("profit_sharing")} />
            <Para label="Program Pengembangan SDM" value={str("program_pengembangan_sdm")} />
          </div>
        ) : (
          <EmptySection message="Data kelembagaan belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Ekonomi Kreatif */}
      <Section title="Ekonomi Kreatif" icon={Sparkles}>
        {baseline && (str("produk_ekraf") || num("jumlah_kriya") || num("jumlah_kuliner") || num("jumlah_fesyen")) ? (
          <div className="space-y-4">
            <ParaOrTable
              label="Produk Ekraf Unggulan"
              value={b.produk_ekraf}
              cols={[
                { key: "nama", label: "Produk" },
                { key: "kategori", label: "Kategori" },
                { key: "harga", label: "Harga" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Detail label="Pelaku Kriya" value={num("jumlah_kriya")?.toString() ?? null} />
              <Detail label="Pelaku Kuliner" value={num("jumlah_kuliner")?.toString() ?? null} />
              <Detail label="Pelaku Fesyen" value={num("jumlah_fesyen")?.toString() ?? null} />
            </div>
            <ParaOrTable
              label="Usaha Kriya"
              value={b.jenis_kriya}
              cols={[
                { key: "nama", label: "Nama Usaha" },
                { key: "produk", label: "Produk" },
              ]}
            />
            <ParaOrTable
              label="Usaha Kuliner"
              value={b.jenis_kuliner}
              cols={[
                { key: "nama", label: "Nama Usaha" },
                { key: "menu", label: "Menu Khas" },
              ]}
            />
            <ParaOrTable
              label="Usaha Fesyen"
              value={b.jenis_fesyen}
              cols={[
                { key: "nama", label: "Nama Usaha" },
                { key: "produk", label: "Produk Fesyen" },
              ]}
            />
            <Para label="Kendala Ekraf" value={str("kendala_ekraf")} />
            <Para label="Program yang Diperlukan" value={str("program_ekraf")} />
            <Para label="Dampak Ekonomi" value={str("dampak_ekonomi")} />
          </div>
        ) : (
          <EmptySection message="Data ekonomi kreatif belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* SDM */}
      <Section title="Sumber Daya Manusia" icon={Users}>
        {baseline && (num("sdm_terlatih") != null || arr("bahasa_pengelola")?.length || str("pelatihan_terakhir")) ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="SDM Terlatih" value={num("sdm_terlatih")?.toString() ?? null} />
              <Detail label="Pelatihan Terakhir" value={str("pelatihan_terakhir")} />
            </div>
            {arr("bahasa_pengelola")?.length ? (
              <ChipList label="Bahasa Dikuasai" items={arr("bahasa_pengelola") ?? []} />
            ) : null}
          </div>
        ) : (
          <EmptySection message="Data SDM belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Aksesibilitas & Infrastruktur */}
      <Section title="Aksesibilitas & Infrastruktur" icon={Cloud}>
        {baseline && (sumber_air || internet || akses_jalan || num("jarak_ke_kota") != null) ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Detail label="Jarak ke Kab/Kota" value={num("jarak_ke_kota") != null ? `${num("jarak_ke_kota")} km` : null} />
              <Detail label="Jarak ke Kecamatan" value={num("jarak_kecamatan") != null ? `${num("jarak_kecamatan")} km` : null} />
              <Detail label="Akses Jalan" value={akses_jalan} />
              <Detail label="Sumber Air" value={sumber_air} />
              <Detail label="Internet" value={internet} />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <BoolChip label="Transportasi umum" value={bool("akses_transport")} />
              <BoolChip label="Signage rute" value={bool("punya_signage")} />
              <BoolChip label="Listrik 24 jam" value={bool("listrik_24jam")} />
            </div>
            {arr("moda_transport")?.length ? (
              <ChipList label="Moda Transportasi" items={arr("moda_transport") ?? []} />
            ) : null}
          </div>
        ) : (
          <EmptySection message="Data infrastruktur belum diisi (perlu baseline)" />
        )}
      </Section>

      {/* Resiliensi */}
      <Section title="Resiliensi & Keberlanjutan" icon={ClipboardCheck}>
        {baseline &&
        (potensi_bencana ||
          sop_mitigasi !== undefined ||
          bool("punya_bank_sampah") !== undefined) ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Kebiasaan Pilah Sampah" value={str("kebiasaan_pilah_sampah")} />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <BoolChip label="SOP mitigasi bencana" value={sop_mitigasi} />
              <BoolChip label="Papan titik kumpul + evakuasi" value={bool("papan_titik_kumpul")} />
              <BoolChip label="Bank Sampah" value={bool("punya_bank_sampah")} />
              <BoolChip label="TPS3R" value={bool("punya_tps3r")} />
              <BoolChip label="Perdes sampah" value={bool("perdes_sampah")} />
              <BoolChip label="Program edukasi sampah" value={bool("program_edukasi_sampah")} />
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
            <ParaOrTable
              label="Sarana Keselamatan Wisatawan"
              value={b.sarana_keselamatan}
              cols={[
                { key: "nama", label: "Sarana" },
                { key: "jumlah", label: "Jumlah / Lokasi" },
                { key: "kondisi", label: "Kondisi" },
              ]}
            />
            <Para label="Kendala Pelestarian Lingkungan" value={str("kendala_lingkungan")} />
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
                  Jaringan Kerjasama
                  <CountBadge n={pengelola.jaringan_kerjasama.length} />
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

      {/* Hub extras (produk/foto/events) — awards moved into Pencapaian below
          to avoid duplication. */}
      <HubExtrasSections
        produk={profile?.produk_list ?? null}
        foto={profile?.foto_galeri ?? null}
        awards={null}
        events={profile?.events ?? null}
      />

      {/* Kemitraan */}
      <Section title="Kemitraan" icon={Handshake}>
        {kemitraan_pt.length > 0 || kemitraan_swasta.length > 0 ? (
          <div className="space-y-4">
            {kemitraan_pt.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Perguruan Tinggi
                </div>
                <RepeaterTable
                  rows={kemitraan_pt}
                  cols={[
                    { key: "institusi", label: "Institusi" },
                    { key: "program", label: "Program" },
                    { key: "tahun", label: "Tahun", align: "right" },
                  ]}
                />
              </div>
            )}
            {kemitraan_swasta.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Swasta / CSR / Industri
                </div>
                <RepeaterTable
                  rows={kemitraan_swasta}
                  cols={[
                    { key: "institusi", label: "Institusi" },
                    { key: "program", label: "Program" },
                    { key: "tahun", label: "Tahun", align: "right" },
                  ]}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptySection message="Belum ada kemitraan tercatat (perlu baseline)" />
        )}
      </Section>

      {/* Pencapaian — Hub awards + baseline entries merged */}
      <Section title="Pencapaian" icon={Award}>
        {penghargaanMerged.length > 0 ||
        partisipasi_event.length > 0 ||
        exposure_publikasi.length > 0 ||
        sertifikasi.length > 0 ? (
          <div className="space-y-4">
            {penghargaanMerged.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Penghargaan
                  <CountBadge n={penghargaanMerged.length} />
                </div>
                <RepeaterTable
                  rows={penghargaanMerged}
                  cols={[
                    { key: "nama", label: "Penghargaan" },
                    { key: "lembaga", label: "Lembaga" },
                    { key: "tahun", label: "Tahun", align: "right" },
                    { key: "peringkat", label: "Peringkat" },
                    { key: "_source", label: "Sumber", render: (v) => v === "hub" ? "Hub" : "Manual" },
                  ]}
                />
              </div>
            )}
            {partisipasi_event.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Partisipasi Event / Kompetisi
                  <CountBadge n={partisipasi_event.length} />
                </div>
                <RepeaterTable
                  rows={partisipasi_event}
                  cols={[
                    { key: "nama_event", label: "Event" },
                    { key: "tahun", label: "Tahun", align: "right" },
                    { key: "hasil", label: "Hasil" },
                  ]}
                />
              </div>
            )}
            {exposure_publikasi.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Exposure / Publikasi
                  <CountBadge n={exposure_publikasi.length} />
                </div>
                <RepeaterTable
                  rows={exposure_publikasi}
                  cols={[
                    { key: "jenis", label: "Jenis" },
                    { key: "media", label: "Media" },
                    { key: "tahun", label: "Tahun", align: "right" },
                    { key: "link", label: "Link", render: (v) => v ? <a href={String(v)} target="_blank" rel="noreferrer" className="text-atr-purple-600 hover:underline">Buka</a> : "-" },
                  ]}
                />
              </div>
            )}
            {sertifikasi.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Sertifikasi
                  <CountBadge n={sertifikasi.length} />
                </div>
                <RepeaterTable
                  rows={sertifikasi}
                  cols={[
                    { key: "nama", label: "Sertifikat" },
                    { key: "lembaga", label: "Lembaga" },
                    { key: "tahun", label: "Tahun", align: "right" },
                    { key: "link", label: "Bukti", render: (v) => v ? <a href={String(v)} target="_blank" rel="noreferrer" className="text-atr-purple-600 hover:underline">Buka</a> : "-" },
                  ]}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptySection message="Belum ada pencapaian tercatat (Hub auto-sync ADWI + tambahan via baseline)" />
        )}
      </Section>

      {/* Data Tahunan */}
      <Section title="Data Tahunan" icon={Calendar}>
        {kunjungan_per_tahun.length > 0 ||
        tenaga_kerja_per_tahun.length > 0 ||
        umkm_per_tahun.length > 0 ||
        pendapatan_per_tahun.length > 0 ||
        pengurus_pokdarwis_per_tahun.length > 0 ? (
          <div className="space-y-4">
            {kunjungan_per_tahun.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Kunjungan Wisatawan
                </div>
                <RepeaterTable
                  rows={kunjungan_per_tahun}
                  cols={[
                    { key: "tahun", label: "Tahun" },
                    { key: "wni", label: "WNI", align: "right" },
                    { key: "wna", label: "WNA", align: "right" },
                  ]}
                />
              </div>
            )}
            {tenaga_kerja_per_tahun.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Tenaga Kerja
                </div>
                <RepeaterTable
                  rows={tenaga_kerja_per_tahun}
                  cols={[
                    { key: "tahun", label: "Tahun" },
                    { key: "pria", label: "Pria", align: "right" },
                    { key: "wanita", label: "Wanita", align: "right" },
                  ]}
                />
              </div>
            )}
            {umkm_per_tahun.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  UMKM
                </div>
                <RepeaterTable
                  rows={umkm_per_tahun}
                  cols={[
                    { key: "tahun", label: "Tahun" },
                    { key: "jumlah", label: "Jumlah", align: "right" },
                  ]}
                />
              </div>
            )}
            {pendapatan_per_tahun.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Pendapatan
                </div>
                <RepeaterTable
                  rows={pendapatan_per_tahun}
                  cols={[
                    { key: "tahun", label: "Tahun" },
                    { key: "jumlah_rp", label: "Rp", align: "right", render: (v) => v ? "Rp " + Number(v).toLocaleString("id-ID") : "-" },
                  ]}
                />
              </div>
            )}
            {pengurus_pokdarwis_per_tahun.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                  Pengurus Pokdarwis
                </div>
                <RepeaterTable
                  rows={pengurus_pokdarwis_per_tahun}
                  cols={[
                    { key: "tahun", label: "Tahun" },
                    { key: "pria", label: "Pria", align: "right" },
                    { key: "wanita", label: "Wanita", align: "right" },
                  ]}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptySection message="Belum ada data tahunan (perlu baseline)" />
        )}
      </Section>

      {/* Dokumen Pendukung */}
      <Section title="Dokumen Pendukung" icon={FileText}>
        {dokumen.length > 0 ? (
          <RepeaterTable
            rows={dokumen}
            cols={[
              { key: "jenis", label: "Jenis" },
              { key: "nama", label: "Nama Dokumen" },
              { key: "tahun", label: "Tahun", align: "right" },
              { key: "link_url", label: "Link", render: (v) => v ? <a href={String(v)} target="_blank" rel="noreferrer" className="text-atr-purple-600 hover:underline">Buka</a> : "-" },
            ]}
          />
        ) : (
          <EmptySection message="Belum ada dokumen pendukung (perlu baseline)" />
        )}
      </Section>

      {/* Self-Improvement Journey - skip when desa is already at the top tier
          (Mandiri), since there's no next tier to aim for. */}
      {journey && journey.next_tier && (
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

function Para({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-atr-fg">{value}</p>
    </div>
  );
}

// Renders array data as a small repeater table, or string/legacy data as
// a paragraph. Used for fields recently converted from textarea→repeater.
function ParaOrTable({
  label,
  value,
  cols,
}: {
  label: string;
  value: unknown;
  cols: RepeaterCol[];
}) {
  if (Array.isArray(value) && value.length > 0) {
    return (
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
          {label}
          <CountBadge n={value.length} />
        </div>
        <RepeaterTable rows={value as Array<Record<string, unknown>>} cols={cols} />
      </div>
    );
  }
  if (typeof value === "string" && value.trim() !== "") {
    return <Para label={label} value={value} />;
  }
  return null;
}

function BoolChip({ label, value }: { label: string; value: boolean | undefined }) {
  if (value === undefined) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        value
          ? "bg-atr-arti/10 text-atr-arti"
          : "bg-atr-bg-soft text-atr-fg-muted"
      }`}
    >
      {value ? "✓" : "✗"} {label}
    </span>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span
            key={i}
            className="inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

type RepeaterCol = {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (v: unknown) => React.ReactNode;
};

function RepeaterTable({
  rows,
  cols,
}: {
  rows: Array<Record<string, unknown>>;
  cols: RepeaterCol[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-atr-outline">
      <table className="w-full text-xs">
        <thead className="bg-atr-bg-soft text-left text-[10px] uppercase tracking-wide text-atr-fg-muted">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-1.5 ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-atr-outline">
          {rows.map((r, idx) => (
            <tr key={idx}>
              {cols.map((c) => {
                const v = r[c.key];
                return (
                  <td
                    key={c.key}
                    className={`px-3 py-1.5 text-atr-fg ${c.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {c.render
                      ? c.render(v)
                      : v == null || v === ""
                        ? <span className="italic text-atr-fg-muted">-</span>
                        : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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
