import Link from "next/link";
import { Upload, Users as UsersIcon } from "lucide-react";
import { listUsers } from "@/server/queries/users";
import { UsersTable } from "./users-table";

export default async function UsersListPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Users
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Semua peserta, admin mitra, narasumber, dan desa wisata.
          </p>
        </div>
        <Link
          href="/atourin/users/bulk-import"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Upload className="h-4 w-4" />
          Bulk Import
        </Link>
      </header>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <UsersIcon className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">Belum ada user</p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            Tambahkan user lewat bulk import dari Excel.
          </p>
        </div>
      ) : (
        <UsersTable users={users} />
      )}
    </div>
  );
}
