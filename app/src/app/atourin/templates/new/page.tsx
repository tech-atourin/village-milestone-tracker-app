export const metadata = { title: "Template Baru" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { TemplateEditor } from "../template-editor";

export default async function NewTemplatePage() {
  await requireRole("superadmin");
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
          Template Baru
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Buat template kurasi baru. Atur nama, modul default, topik, dan
          checklist item.
        </p>
      </header>
      <TemplateEditor
        initial={{
          name: "",
          description: "",
          default_modules: {
            baseline: true,
            capacity_building: true,
            pendampingan: true,
            klasifikasi: false,
          },
          topik: [],
        }}
      />
    </div>
  );
}
