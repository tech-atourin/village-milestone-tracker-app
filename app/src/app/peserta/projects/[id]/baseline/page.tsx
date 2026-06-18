export const metadata = { title: "Baseline Desa" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getDefaultBaselineSchema,
  getBaselineData,
} from "@/server/queries/baseline";
import { BaselineForm } from "./baseline-form";

export default async function PesertaBaselinePage({
  params,
}: {
  params: { id: string };
}) {
  const schema = await getDefaultBaselineSchema();
  if (!schema) notFound();
  const existing = await getBaselineData(params.id);

  return (
    <div className="space-y-5">
      <Link
        href={`/peserta/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke project
      </Link>

      <header>
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Baseline desa
        </h1>
        <p className="mt-1 text-sm text-atr-fg-muted">
          {schema.name} · v{schema.version}
        </p>
        {existing?.submitted_at && (
          <p className="mt-1 text-xs text-atr-arti">
            ✓ Data baseline aktif - terakhir diupdate{" "}
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(existing.submitted_at))}
          </p>
        )}
      </header>

      <BaselineForm
        projectDesaId={params.id}
        schema={schema}
        initialData={existing?.data ?? {}}
      />
    </div>
  );
}
