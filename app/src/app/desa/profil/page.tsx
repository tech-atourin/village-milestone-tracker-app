export const metadata = { title: "Profil Desa" };

import {
  MapPin,
  Building2,
  Globe,
  Award,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { HubSyncButton } from "@/components/desa/hub-sync-button";
import { ProfileEditForm } from "@/components/desa/profile-edit-form";

const TIER_LABEL: Record<string, string> = {
  unclassified: "Belum Diklasifikasi",
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

type DesaFull = {
  id: string;
  name: string;
  desa_kelurahan: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  lat: number | null;
  lng: number | null;
  current_classification: string | null;
  jadesta_id: string | null;
  hub_desa_id: string | null;
};

type ProfileData = {
  alamat: string | null;
  cover_image_url: string | null;
  deskripsi: string | null;
  keunikan: string | null;
  rekomendasi_kunjungan: string | null;
  fasilitas: string[] | null;
  pengelola_nama: string | null;
  pengelola_kontak_person: string | null;
  pengelola_email: string | null;
  pengelola_whatsapp: string | null;
  social_website: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_youtube: string | null;
  synced_from_hub_at: string | null;
} | null;

type Baseline = {
  data: Record<string, unknown>;
  submitted_at: string | null;
} | null;

async function loadDesaProfile(userId: string): Promise<{
  desa: DesaFull | null;
  profile: ProfileData;
  baseline: Baseline;
}> {
  const supabase = createClient();
  const { data: u } = await supabase
    .from("users")
    .select("representing_desa_id")
    .eq("id", userId)
    .maybeSingle();
  const desaId = (u as { representing_desa_id: string | null } | null)
    ?.representing_desa_id;
  if (!desaId) return { desa: null, profile: null, baseline: null };

  const { data: desa } = await supabase
    .from("desa")
    .select(
      "id, name, desa_kelurahan, kecamatan, kabupaten, provinsi, lat, lng, current_classification, jadesta_id, hub_desa_id",
    )
    .eq("id", desaId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("desa_profile_data")
    .select(
      "alamat, cover_image_url, deskripsi, keunikan, rekomendasi_kunjungan, fasilitas, pengelola_nama, pengelola_kontak_person, pengelola_email, pengelola_whatsapp, social_website, social_instagram, social_facebook, social_youtube, synced_from_hub_at",
    )
    .eq("desa_id", desaId)
    .maybeSingle();

  const { data: pdRows } = await supabase
    .from("project_desa")
    .select("id")
    .eq("desa_id", desaId);
  const pdIds = (pdRows ?? []).map((r) => (r as { id: string }).id);
  let baseline: Baseline = null;
  if (pdIds.length > 0) {
    const { data: bRow } = await supabase
      .from("desa_baseline_data")
      .select("data, submitted_at, updated_at")
      .in("project_desa_id", pdIds)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    baseline = bRow as Baseline;
  }

  return {
    desa: desa as unknown as DesaFull | null,
    profile: profile as unknown as ProfileData,
    baseline,
  };
}

export default async function DesaProfilPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { desa, profile, baseline } = await loadDesaProfile(user.id);

  if (!desa) {
    return (
      <EmptyState
        icon={MapPin}
        title="Akun belum terhubung ke desa"
        description="Hubungi admin Atourin untuk mengaitkan akun Anda ke desa wisata."
      />
    );
  }

  const tier = desa.current_classification ?? "unclassified";
  const tierLabel = TIER_LABEL[tier] ?? "Belum Diklasifikasi";
  const lokasi = [desa.desa_kelurahan, desa.kecamatan, desa.kabupaten, desa.provinsi]
    .filter(Boolean)
    .join(", ");

  const b = (baseline?.data ?? {}) as Record<string, unknown>;
  const kontak_nama = (b.kontak_nama as string) ?? null;
  const kontak_jabatan = (b.kontak_jabatan as string) ?? null;
  const kontak_hp = (b.kontak_hp as string) ?? null;
  const kontak_email = (b.kontak_email as string) ?? null;
  const jumlah_homestay = (b.jumlah_homestay as number | string) ?? null;
  const jumlah_daya_tarik = (b.jumlah_daya_tarik as number | string) ?? null;
  const kunjungan_tahunan = (b.kunjungan_tahunan as number | string) ?? null;
  const punya_pokdarwis = b.punya_pokdarwis as boolean | undefined;
  const punya_bumdes = b.punya_bumdes as boolean | undefined;
  const akses_internet = (b.akses_internet as string) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Profil Desa
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Informasi profil desa wisata Anda. Bisa di-sync otomatis dari
            data Hub Atourin agar tidak input dari nol.
          </p>
          {profile?.synced_from_hub_at && (
            <p className="inline-flex items-center gap-1 text-[11px] text-atr-purple-600">
              <Sparkles className="h-3 w-3" />
              Terakhir sync dari Hub:{" "}
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(profile.synced_from_hub_at))}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <HubSyncButton desaId={desa.id} hasHubLink={!!desa.hub_desa_id} />
          <ProfileEditForm
            desaId={desa.id}
            initial={{
              alamat: profile?.alamat ?? null,
              deskripsi: profile?.deskripsi ?? null,
              keunikan: profile?.keunikan ?? null,
              rekomendasi_kunjungan: profile?.rekomendasi_kunjungan ?? null,
              nomor_sk_kepala_daerah: null,
              fasilitas: profile?.fasilitas ?? null,
              pengelola_nama: null,
              pengelola_kontak_person: profile?.pengelola_kontak_person ?? null,
              pengelola_email: profile?.pengelola_email ?? null,
              pengelola_whatsapp: profile?.pengelola_whatsapp ?? null,
              social_website: profile?.social_website ?? null,
              social_facebook: profile?.social_facebook ?? null,
              social_twitter: null,
              social_instagram: profile?.social_instagram ?? null,
              social_youtube: profile?.social_youtube ?? null,
            }}
          />
        </div>
      </header>

      {profile?.cover_image_url && (
        <div className="overflow-hidden rounded-2xl border border-atr-outline shadow-atr-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.cover_image_url}
            alt={`Cover ${desa.name}`}
            className="aspect-[3/1] w-full object-cover"
          />
        </div>
      )}

      <article className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <div className="bg-gradient-to-br from-atr-purple-50 to-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-atr-purple text-white">
              <MapPin className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-atr-fg">{desa.name}</h2>
              <p className="text-sm text-atr-fg-muted">{lokasi || "—"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
                  <Award className="h-3 w-3" />
                  {tierLabel}
                </span>
                {desa.jadesta_id && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-atr-outline bg-white px-2.5 py-0.5 text-xs text-atr-fg-muted">
                    <Globe className="h-3 w-3" />
                    Hub ID: {desa.jadesta_id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-atr-outline p-6 text-sm">
          <Detail label="Desa / Kelurahan" value={desa.desa_kelurahan} />
          <Detail label="Kecamatan" value={desa.kecamatan} />
          <Detail label="Kabupaten / Kota" value={desa.kabupaten} />
          <Detail label="Provinsi" value={desa.provinsi} />
          <Detail
            label="Koordinat"
            value={
              desa.lat != null && desa.lng != null
                ? `${desa.lat.toFixed(5)}, ${desa.lng.toFixed(5)}`
                : null
            }
          />
        </div>
      </article>

      {(profile?.deskripsi || profile?.alamat) && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-purple">
            Deskripsi Desa
          </h3>
          {profile?.alamat && (
            <p className="mb-3 text-xs text-atr-fg-muted">
              <strong className="text-atr-fg">Alamat:</strong> {profile.alamat}
            </p>
          )}
          {profile?.deskripsi && (
            <p className="whitespace-pre-line text-sm text-atr-fg">
              {profile.deskripsi}
            </p>
          )}
        </article>
      )}

      {profile?.fasilitas && profile.fasilitas.length > 0 && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-purple">
            Fasilitas Desa Wisata
          </h3>
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
        </article>
      )}

      <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
          <Building2 className="h-4 w-4" />
          Kontak Pengelola
        </h3>
        {profile?.pengelola_email ||
        profile?.pengelola_whatsapp ||
        profile?.pengelola_kontak_person ||
        baseline ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
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
          <p className="text-sm italic text-atr-fg-muted">
            Belum ada kontak. Sync dari Hub atau isi baseline saat
            mengikuti program pendampingan.
          </p>
        )}
      </article>

      {(profile?.social_website ||
        profile?.social_instagram ||
        profile?.social_facebook ||
        profile?.social_youtube) && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
            <Globe className="h-4 w-4" />
            Social Media
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {profile?.social_website && (
              <a
                href={profile.social_website}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-bold text-atr-purple-600 hover:underline"
              >
                Website ↗
              </a>
            )}
            {profile?.social_instagram && (
              <a
                href={`https://instagram.com/${profile.social_instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-bold text-atr-purple-600 hover:underline"
              >
                @{profile.social_instagram.replace(/^@/, "")} ↗
              </a>
            )}
            {profile?.social_facebook && (
              <a
                href={profile.social_facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-bold text-atr-purple-600 hover:underline"
              >
                Facebook ↗
              </a>
            )}
            {profile?.social_youtube && (
              <a
                href={profile.social_youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-bold text-atr-purple-600 hover:underline"
              >
                YouTube ↗
              </a>
            )}
          </div>
        </article>
      )}

      {baseline && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-purple">
            Profil Singkat (Baseline)
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <Detail
              label="Homestay"
              value={jumlah_homestay != null ? String(jumlah_homestay) : null}
            />
            <Detail
              label="Daya Tarik"
              value={
                jumlah_daya_tarik != null ? String(jumlah_daya_tarik) : null
              }
            />
            <Detail
              label="Kunjungan / Tahun"
              value={
                kunjungan_tahunan != null
                  ? new Intl.NumberFormat("id-ID").format(
                      Number(kunjungan_tahunan),
                    )
                  : null
              }
            />
            <Detail
              label="Pokdarwis Aktif"
              value={
                punya_pokdarwis === true
                  ? "Ya"
                  : punya_pokdarwis === false
                    ? "Tidak"
                    : null
              }
            />
            <Detail
              label="BUMDes Kelola Wisata"
              value={
                punya_bumdes === true
                  ? "Ya"
                  : punya_bumdes === false
                    ? "Tidak"
                    : null
              }
            />
            <Detail label="Akses Internet" value={akses_internet} />
          </div>
          {baseline.submitted_at && (
            <p className="mt-4 text-[11px] text-atr-fg-muted">
              Disubmit{" "}
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date(baseline.submitted_at))}
            </p>
          )}
        </article>
      )}
    </div>
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
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-atr-fg">
        {Icon && value && <Icon className="h-3.5 w-3.5 text-atr-fg-muted" />}
        {value ?? <span className="italic text-atr-fg-muted">—</span>}
      </div>
    </div>
  );
}
