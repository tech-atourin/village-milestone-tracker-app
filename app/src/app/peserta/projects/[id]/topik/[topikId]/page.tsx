export const metadata = { title: "Detail Topik" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listChecklistItems } from "@/server/queries/peserta";
import { notFound } from "next/navigation";
import { ChecklistItemList } from "./checklist-item-list";

export default async function PesertaTopikPage({
  params,
}: {
  params: { id: string; topikId: string };
}) {
  const data = await listChecklistItems(params.id, params.topikId);
  if (!data.topik) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/peserta/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar topik
      </Link>

      <header>
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          {data.topik.name}
        </h1>
        {data.topik.description && (
          <p className="mt-1 text-sm text-atr-fg-muted">
            {data.topik.description}
          </p>
        )}
      </header>

      <ChecklistItemList
        projectDesaId={params.id}
        projectTopikId={params.topikId}
        items={data.items}
      />
    </div>
  );
}
