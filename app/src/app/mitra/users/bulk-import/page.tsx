export const metadata = { title: "Import User" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { BulkImportFlow } from "@/app/atourin/users/bulk-import/bulk-import-flow";

export default async function MitraBulkImportPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  await requireRole("mitra_admin");
  const mode: "peserta" | "narasumber" =
    searchParams.mode === "narasumber" ? "narasumber" : "peserta";
  const label = mode === "narasumber" ? "Narasumber" : "Peserta";
  const backHref =
    mode === "narasumber" ? "/mitra/narasumber" : "/mitra/users";
  const backLabel =
    mode === "narasumber"
      ? "Kembali ke daftar narasumber"
      : "Kembali ke daftar user";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-atr-fg">
          Bulk Import {label}
        </h1>
        <p className="text-sm text-atr-fg-muted">
          {mode === "narasumber"
            ? "Upload Excel berisi data narasumber. Template berbeda dengan peserta - sudah include kolom kategori, kompetensi, jabatan, instansi."
            : "Upload Excel berisi data peserta. Sistem akan validate per baris, detect duplikat, dan kirim email undangan otomatis."}
        </p>
      </header>

      <BulkImportFlow mode={mode} />
    </div>
  );
}
