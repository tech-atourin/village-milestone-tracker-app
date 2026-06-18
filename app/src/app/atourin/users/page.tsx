export const metadata = { title: "Users" };

import Link from "next/link";
import { Upload, Users as UsersIcon } from "lucide-react";
import { listUsers } from "@/server/queries/users";
import { listOrgsDetailed } from "@/server/queries/orgs";
import { UsersTable } from "./users-table";
import { AddUserButton } from "./add-user-button";

export default async function UsersListPage() {
  const [users, orgs] = await Promise.all([listUsers(), listOrgsDetailed()]);
  const orgOptions = orgs.map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Users
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Semua superadmin, mitra admin, peserta, narasumber, dan desa wisata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddUserButton orgOptions={orgOptions} />
          <Link
            href="/atourin/users/bulk-import"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </Link>
        </div>
      </header>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <UsersIcon className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">Belum ada user</p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            Klik &quot;Tambah User&quot; untuk individual atau &quot;Bulk
            Import&quot; untuk batch dari Excel.
          </p>
        </div>
      ) : (
        <UsersTable users={users} orgOptions={orgOptions} />
      )}
    </div>
  );
}
