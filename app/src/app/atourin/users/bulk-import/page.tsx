import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BulkImportFlow } from "./bulk-import-flow";

export default function BulkImportPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/atourin/users"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar user
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-atr-fg">
          Bulk Import Peserta
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Upload Excel berisi data peserta. Sistem akan validate per baris,
          detect duplikat, dan kirim email undangan otomatis.
        </p>
      </header>

      <BulkImportFlow />
    </div>
  );
}
