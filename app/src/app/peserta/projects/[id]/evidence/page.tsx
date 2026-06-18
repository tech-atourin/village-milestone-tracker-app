export const metadata = { title: "Bukti Pendukung" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listEvidenceLibrary } from "@/server/queries/evidence";
import { EvidenceLibraryView } from "./evidence-library-view";

export default async function PesertaEvidenceLibraryPage({
  params,
}: {
  params: { id: string };
}) {
  const evidence = await listEvidenceLibrary(params.id);

  return (
    <div className="space-y-5">
      <Link
        href={`/peserta/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Kumpulan Bukti Pendukung
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Semua file yang sudah di-upload untuk desa Anda. Klik file untuk
          kaitkan ke checklist topik.
        </p>
      </header>
      <EvidenceLibraryView projectDesaId={params.id} items={evidence} />
    </div>
  );
}
