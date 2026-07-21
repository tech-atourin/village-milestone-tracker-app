export const metadata = { title: "Materi & Tautan" };

import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getPesertaResources } from "@/server/queries/resources";
import { PesertaResourceItem } from "./resource-item";

export default async function PesertaMateriPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await getPesertaResources(user.id);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Materi &amp; Tautan
        </h1>
        <p className="text-sm text-atr-fg-muted">
          File materi dan tautan penting yang dibagikan penyelenggara untuk
          program Anda.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-10 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-atr-fg-muted" />
          <p className="mt-2 text-sm font-bold text-atr-fg">Belum ada materi</p>
          <p className="text-xs text-atr-fg-muted">
            Materi &amp; tautan akan muncul di sini setelah penyelenggara
            menambahkannya.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.project_id} className="space-y-2">
              {groups.length > 1 && (
                <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
                  {g.project_name}
                </h2>
              )}
              <ul className="space-y-2">
                {g.items.map((r) => (
                  <PesertaResourceItem key={r.id} r={r} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
