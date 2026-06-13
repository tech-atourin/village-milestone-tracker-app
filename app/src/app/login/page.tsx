import { Suspense } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Users,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LoginForm } from "./login-form";

const FEATURES = [
  {
    icon: CheckCircle2,
    title: "3 layer pengukuran",
    description:
      "Klasifikasi desa, progress pendampingan, dan rapor peserta dalam satu sistem.",
  },
  {
    icon: Users,
    title: "Multi-tenant siap pakai",
    description:
      "Kelola banyak project paralel Kemenpar, BUMN, Pemda, dan swasta tanpa rebuild.",
  },
  {
    icon: ShieldCheck,
    title: "Aman & terisolasi",
    description:
      "Row-level security per project, audit log lengkap untuk compliance pemerintah.",
  },
];

export default function LoginPage() {
  const year = 2026;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <section className="relative hidden overflow-hidden bg-atr-purple-gradient p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        {/* Subtle radial highlights */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.22), transparent 55%), radial-gradient(circle at 85% 92%, rgba(255, 196, 66, 0.18), transparent 50%)",
          }}
        />

        {/* Wordmark */}
        <div className="relative">
          <Image
            src="/logo/vmt/vmt-wordmark-onpurple.svg"
            alt="Village Milestone Tracker"
            width={280}
            height={70}
            priority
          />
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-atr-yellow" />
            Pendampingan Desa Wisata × Atourin
          </div>

          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl xl:text-[2.625rem]">
            Kelola program pendampingan
            <br />
            desa wisata dengan tertib.
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-white/85">
            Satu platform untuk semua mitra — Kemenpar, BUMN, Pemda, dan swasta.
            Kurasi template, kelola peserta, dan tracking progress real-time
            tanpa rebuild sistem tiap project baru.
          </p>

          <ul className="space-y-4 pt-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                    <Icon className="h-4 w-4 text-atr-yellow" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{feature.title}</div>
                    <div className="text-xs text-white/75">
                      {feature.description}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative space-y-3 text-xs text-white/65">
          <div className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 ring-1 ring-white/20">
            <span className="text-[10px] font-bold uppercase tracking-wide text-atr-yellow">
              Private
            </span>
            <span>Sistem internal Atourin & mitra terdaftar</span>
          </div>
          <div>© {year} Atourin · vmt.atourin.com · v0.1</div>
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {/* Mobile-only mini brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt="Village Milestone Tracker"
              width={44}
              height={44}
              className="rounded-lg shadow-atr-1"
            />
            <div>
              <div className="text-sm font-bold leading-tight tracking-tight text-atr-fg">
                Village Milestone Tracker
              </div>
              <div className="text-xs text-atr-fg-muted">by Atourin</div>
            </div>
          </div>

          <div className="rounded-2xl border border-atr-outline bg-white p-7 shadow-atr-1 sm:p-8">
            <div className="mb-6 space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-atr-fg">
                Selamat datang kembali 👋
              </h2>
              <p className="text-sm text-atr-fg-muted">
                Masuk untuk lanjut mengelola program pendampingan Anda.
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>

            <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-atr-outline bg-atr-bg-soft px-3.5 py-3 text-xs text-atr-fg-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-atr-purple" />
              <p>
                Akun dibuat oleh tim Atourin atau admin mitra. Belum punya
                akses? Hubungi admin organisasi Anda atau tim Atourin.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-atr-fg-muted">
            © {year} Atourin · Village Milestone Tracker
          </p>
        </div>
      </section>
    </main>
  );
}
