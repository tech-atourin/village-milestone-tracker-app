import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-atr-bg-soft">
      <div className="max-w-xl space-y-6 text-center">
        <div className="mx-auto w-fit">
          <Image
            src="/logo/vmt/vmt-wordmark.svg"
            alt="Village Milestone Tracker"
            width={320}
            height={80}
            priority
          />
        </div>
        <p className="text-atr-fg leading-relaxed">
          Platform pendampingan desa wisata multi-tenant. Kelola program
          Kemenpar, BUMN, Pemda, dan swasta dalam satu sistem dengan tiga layer
          pengukuran: klasifikasi desa, progress pendampingan, dan capacity
          building peserta.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-atr-purple px-6 text-sm font-semibold text-white shadow-atr-1 transition hover:bg-atr-purple-600"
          >
            Masuk
          </Link>
        </div>
        <p className="pt-4 text-xs text-atr-fg-muted">
          Phase 0 — Foundation · Internal Atourin
        </p>
      </div>
    </main>
  );
}
