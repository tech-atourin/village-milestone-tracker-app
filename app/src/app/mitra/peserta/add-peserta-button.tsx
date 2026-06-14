"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { UserFormDialog } from "@/components/users/user-form-dialog";

export function AddPesertaButton({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
      >
        <Plus className="h-4 w-4" />
        Tambah Peserta
      </button>
      <UserFormDialog
        open={open}
        onClose={() => setOpen(false)}
        orgOptions={[]}
        forceOrgId={orgId}
        allowedRoles={["peserta"]}
        initialRole="peserta"
      />
    </>
  );
}
