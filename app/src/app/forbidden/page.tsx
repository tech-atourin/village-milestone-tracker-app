import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-atr-bg-soft p-8">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          403 — Tidak diizinkan
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Akun kamu tidak punya akses ke halaman ini.
        </p>
        <Link
          href="/"
          className="inline-block text-sm font-bold text-atr-purple hover:underline"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
