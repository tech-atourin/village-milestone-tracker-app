export const metadata = { title: "Sesi Baru" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { listNarasumberProjects } from "@/server/queries/pendampingan";
import { SesiBaruForm } from "./form";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SesiBaruPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const projects = await listNarasumberProjects(user.id);

  return (
    <div className="space-y-6">
      <Link
        href="/narasumber/sesi"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar sesi
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Catat Sesi Baru
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Pilih project & desa, lalu set tanggal dan materi. Detail laporan
          + kehadiran bisa dilengkapi setelah sesi terbuat.
        </p>
      </header>

      {projects.length === 0 ? (
        <EmptyState
          title="Anda belum di-assign ke project apapun"
          description="Admin Atourin akan menambahkan Anda ke project sebagai narasumber. Cek lagi nanti."
        />
      ) : (
        <SesiBaruForm projects={projects} />
      )}
    </div>
  );
}
