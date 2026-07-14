import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Briefcase,
  HeartHandshake,
  CheckCircle2,
  BarChart3,
  Users,
  ShieldCheck,
  Wifi,
  Smartphone,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { getCurrentUser, scopeHomePath } from "@/lib/auth/rbac";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vmt.atourin.com";
const OG_IMAGE = `${SITE_URL}/logo/vmt/vmt-app-icon-512.png`;
const DESCRIPTION =
  "Village Milestone Tracker by Atourin. Platform multi-tenant untuk Pemerintah, BUMN/Swasta, dan NGO dalam mengelola program pelatihan, pendampingan, dan klasifikasi desa wisata secara terukur.";

export const metadata = {
  title: "Village Milestone Tracker - Platform Manajemen Program Pendampingan",
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Village Milestone Tracker",
    title:
      "Village Milestone Tracker - Platform Manajemen Program Pendampingan",
    description: DESCRIPTION,
    locale: "id_ID",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Village Milestone Tracker by Atourin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Village Milestone Tracker - Platform Manajemen Program Pendampingan",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  keywords: [
    "desa wisata",
    "ADWI",
    "klasifikasi desa wisata",
    "Permenpar",
    "pendampingan desa",
    "Atourin",
    "milestone tracker",
    "pelaku pariwisata",
  ],
};

const WA_HREF =
  "https://wa.me/6281220401113?text=Halo%20tim%20Atourin%2C%20saya%20tertarik%20dengan%20Village%20Milestone%20Tracker.";

const AUDIENCES = [
  {
    icon: Building2,
    label: "Pemerintah",
    description:
      "Kementerian, Pemda, dan lembaga publik yang mengelola program pengembangan desa wisata berbasis klasifikasi nasional.",
  },
  {
    icon: Briefcase,
    label: "BUMN & Swasta",
    description:
      "CSR / TJSL dan unit bisnis yang menjalankan program pemberdayaan komunitas dengan akuntabilitas penuh.",
  },
  {
    icon: HeartHandshake,
    label: "NGO & Mitra Pembangunan",
    description:
      "Organisasi non-profit dan development partner yang butuh dokumentasi rapi serta laporan berbasis bukti.",
  },
];

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Project & checklist terstruktur",
    description:
      "Template materi, topik, dan checklist siap pakai. Peserta mengisi, narasumber mengulas, admin memverifikasi, semua ter-audit.",
  },
  {
    icon: BarChart3,
    title: "3 layer pengukuran",
    description:
      "Klasifikasi desa (rintisan → mandiri), progress pendampingan per checklist, dan capacity building peserta dalam satu sistem.",
  },
  {
    icon: Users,
    title: "Multi-role bawaan",
    description:
      "Superadmin, mitra organisasi, peserta program, narasumber, dan desa wisata. Masing-masing punya dashboard sendiri sesuai perannya.",
  },
  {
    icon: Sparkles,
    title: "AI insight & rekomendasi",
    description:
      "Ringkasan otomatis program, SWOT per desa, dan rekomendasi rencana aksi untuk mempercepat pengambilan keputusan.",
  },
  {
    icon: Wifi,
    title: "Siap untuk lapangan",
    description:
      "App installable, support offline mode, dan indikator sinkronisasi. Dirancang untuk dipakai di lokasi dengan sinyal terbatas.",
  },
  {
    icon: ShieldCheck,
    title: "Privat & terkontrol",
    description:
      "Akses by-invitation, audit log lengkap, role-based access control. Data tetap milik organisasi penyelenggara.",
  },
];

const ROLE_HIGHLIGHTS = [
  {
    label: "Penyelenggara",
    items: [
      "Buat project pendampingan dengan template materi",
      "Verifikasi bukti, monitor progress, lihat ringkasan AI",
      "Ekspor laporan akhir + sertifikat per peserta/desa",
    ],
  },
  {
    label: "Peserta program",
    items: [
      "Ceklis materi & upload bukti dari HP",
      "Riwayat lengkap, rapor & nilai pre/post test",
      "Bisa diisi sambil di lapangan, sinkron otomatis",
    ],
  },
  {
    label: "Narasumber",
    items: [
      "Catat sesi pendampingan + daily report",
      "Atensi terhadap peserta, rencana aksi tindak lanjut",
      "Kuisioner dari peserta jadi indikator performa",
    ],
  },
  {
    label: "Desa wisata",
    items: [
      "Assessment klasifikasi desa wisata nasional",
      "Profil desa kolaboratif dengan peserta program",
      "Rapor desa & sertifikat hasil pendampingan",
    ],
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(scopeHomePath(user.global_role));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: "Atourin",
        url: SITE_URL,
        logo: `${SITE_URL}/logo/atourin/atourin-logo-purple.png`,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}#app`,
        name: "Village Milestone Tracker",
        alternateName: "VMT by Atourin",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}#organization` },
        description: DESCRIPTION,
        offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
      },
    ],
  };
  return (
    <main className="min-h-screen bg-white text-atr-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="sticky top-0 z-30 border-b border-atr-outline/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt="Village Milestone Tracker"
              width={36}
              height={36}
              className="rounded-lg shadow-atr-1"
              priority
            />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">
                Village Milestone Tracker
              </div>
              <div className="text-[10px] uppercase tracking-wider text-atr-fg-muted">
                by Atourin
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="#untuk-siapa"
              className="hidden h-9 items-center rounded-md px-3 text-sm font-medium text-atr-fg-muted hover:text-atr-fg sm:inline-flex"
            >
              Untuk Siapa
            </Link>
            <Link
              href="#fitur"
              className="hidden h-9 items-center rounded-md px-3 text-sm font-medium text-atr-fg-muted hover:text-atr-fg sm:inline-flex"
            >
              Fitur
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white shadow-atr-1 transition hover:bg-atr-purple-600"
            >
              Masuk
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-atr-purple-gradient text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.22), transparent 55%), radial-gradient(circle at 85% 92%, rgba(255, 196, 66, 0.18), transparent 50%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-atr-yellow" />
              Platform manajemen program pendampingan
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-[3.25rem]">
              Kelola program
              <br />
              pelatihan & pendampingan
              <br />
              <span className="text-atr-yellow">dengan tertib.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/85">
              Village Milestone Tracker dirancang untuk{" "}
              <strong className="font-bold text-white">Pemerintah</strong>,{" "}
              <strong className="font-bold text-white">BUMN/Swasta</strong>, dan{" "}
              <strong className="font-bold text-white">NGO</strong> yang
              menjalankan program pendampingan komunitas. Mulai dari kelas
              pelatihan, klasifikasi desa wisata, hingga rapor capacity building
              peserta, semua terkelola dalam satu sistem multi-tenant yang
              akuntabel.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-5 text-sm font-bold text-atr-purple-700 shadow-atr-2 transition hover:bg-atr-yellow hover:text-atr-fg"
              >
                Masuk ke akun
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center rounded-lg border border-white/30 bg-white/5 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Hubungi tim Atourin
              </a>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-3 text-xs text-white/75">
              <div className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-atr-yellow" />
                Multi-tenant by-invitation
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-atr-yellow" />
                Support offline mode, siap di lapangan
              </div>
              <div className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-atr-yellow" />
                Audit log lengkap
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-white/5 blur-2xl" />
            <div className="relative rounded-2xl border border-white/20 bg-white/10 p-5 shadow-atr-3 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-white/75">
                  Project Pendampingan
                </div>
                <div className="rounded-pill bg-atr-arti/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-atr-arti/50">
                  Aktif
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Klasifikasi desa", value: "32 desa", pct: 78 },
                  { name: "Materi pendampingan", value: "12 topik", pct: 64 },
                  { name: "Rapor peserta", value: "184 peserta", pct: 91 },
                  { name: "Rencana aksi", value: "57 item", pct: 45 },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="rounded-xl bg-white/8 p-3 ring-1 ring-white/10"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{row.name}</span>
                      <span className="text-white/70">{row.value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-atr-yellow"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 p-3 text-[11px] text-white/85">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-atr-yellow" />
                <span>
                  &quot;Program berjalan stabil. 3 desa telah menyelesaikan checklist 100%.&quot;
                  <span className="ml-1 text-white/55">AI Insight</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="untuk-siapa" className="border-b border-atr-outline/60 bg-atr-bg-soft/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-10 max-w-2xl">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-atr-purple-600">
              Dirancang untuk
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Penyelenggara program pendampingan berbasis komunitas
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-atr-fg-muted">
              Apapun bentuk programnya, baik pelatihan, pendampingan,
              klasifikasi, maupun hibah, selama menyentuh komunitas desa,
              Village Milestone Tracker memberi kerangka dokumentasi dan
              pengukuran yang sama.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.label}
                  className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1 transition hover:shadow-atr-2"
                >
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-atr-purple-50 text-atr-purple-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mb-1.5 text-base font-bold tracking-tight">
                    {a.label}
                  </div>
                  <p className="text-sm leading-relaxed text-atr-fg-muted">
                    {a.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="fitur" className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-10 max-w-2xl">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-atr-purple-600">
              Apa yang Anda dapat
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Semua yang dibutuhkan untuk menjalankan program dengan rapi
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-atr-yellow/15 text-atr-fg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mb-1 text-sm font-bold tracking-tight">
                    {f.title}
                  </div>
                  <p className="text-sm leading-relaxed text-atr-fg-muted">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-atr-outline/60 bg-atr-bg-soft/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-10 max-w-2xl">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-atr-purple-600">
              Satu sistem, banyak peran
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tiap pihak punya ruang & tanggung jawabnya
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-atr-fg-muted">
              Village Milestone Tracker memetakan alur kerja per peran sehingga
              setiap pihak fokus pada tugasnya tanpa kehilangan benang merah.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_HIGHLIGHTS.map((r) => (
              <div
                key={r.label}
                className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
              >
                <div className="mb-3 inline-flex items-center rounded-pill border border-atr-purple/30 bg-atr-purple-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-atr-purple-600">
                  {r.label}
                </div>
                <ul className="space-y-2">
                  {r.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-start gap-2 text-sm leading-relaxed text-atr-fg"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-atr-arti" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative overflow-hidden rounded-3xl bg-atr-purple-gradient p-10 text-white shadow-atr-3 sm:p-14">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 85% 20%, rgba(255, 196, 66, 0.2), transparent 55%)",
              }}
            />
            <div className="relative grid gap-6 sm:grid-cols-[1.4fr_1fr] sm:items-center">
              <div>
                <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  Siap menjalankan program lebih akuntabel?
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
                  Akun Village Milestone Tracker dibuat oleh tim Atourin atau
                  admin organisasi mitra. Hubungi kami untuk demo atau
                  pendaftaran organisasi Anda.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-white px-5 text-sm font-bold text-atr-purple-700 shadow-atr-1 transition hover:bg-atr-yellow hover:text-atr-fg"
                >
                  Masuk ke akun
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 bg-white/5 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Jadwalkan demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-atr-outline/60 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-atr-fg-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt="VMT"
              width={20}
              height={20}
              className="rounded"
            />
            <span>© 2026 Atourin · Village Milestone Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-atr-fg">
              Masuk
            </Link>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-atr-fg"
            >
              Hubungi via WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
