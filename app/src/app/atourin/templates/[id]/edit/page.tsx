export const metadata = { title: "Edit Template" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { TemplateEditor, type TemplateEditorValue } from "../../template-editor";

async function loadTemplate(id: string): Promise<TemplateEditorValue | null> {
  const admin = createAdminClient();
  const { data: tpl } = await admin
    .from("project_templates")
    .select("id, name, description, default_modules")
    .eq("id", id)
    .maybeSingle();
  if (!tpl) return null;
  const row = tpl as {
    id: string;
    name: string;
    description: string | null;
    default_modules: Record<string, boolean> | null;
  };

  const { data: topiks } = await admin
    .from("template_topik")
    .select("id, name, description, sort_order")
    .eq("template_id", id)
    .order("sort_order");

  const topikRows = (topiks ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
  }>;
  const topikIds = topikRows.map((t) => t.id);

  let itemsByTopik = new Map<
    string,
    Array<{
      id: string;
      title: string;
      description: string | null;
      reference_url: string | null;
      required: boolean;
      sort_order: number;
    }>
  >();
  if (topikIds.length > 0) {
    const { data: items } = await admin
      .from("template_checklist_item")
      .select(
        "id, template_topik_id, title, description, reference_url, required, sort_order",
      )
      .in("template_topik_id", topikIds)
      .order("sort_order");
    for (const it of ((items ?? []) as Array<{
      id: string;
      template_topik_id: string;
      title: string;
      description: string | null;
      reference_url: string | null;
      required: boolean;
      sort_order: number;
    }>)) {
      const arr = itemsByTopik.get(it.template_topik_id) ?? [];
      arr.push(it);
      itemsByTopik.set(it.template_topik_id, arr);
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    default_modules: row.default_modules ?? {},
    topik: topikRows.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      items: (itemsByTopik.get(t.id) ?? []).map((it) => ({
        id: it.id,
        title: it.title,
        description: it.description ?? "",
        reference_url: it.reference_url ?? "",
        required: it.required,
      })),
    })),
  };
}

export default async function EditTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("superadmin");
  const data = await loadTemplate(params.id);
  if (!data) notFound();
  return (
    <div className="space-y-6">
      <Link
        href="/atourin/templates"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar template
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Edit Template
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Perubahan template tidak mengubah project yang sudah jalan (snapshot
          di-copy saat project dibuat).
        </p>
      </header>
      <TemplateEditor initial={data} />
    </div>
  );
}
