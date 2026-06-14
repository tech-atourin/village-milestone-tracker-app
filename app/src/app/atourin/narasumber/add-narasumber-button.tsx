"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NarasumberFormDialog } from "./narasumber-form";

export function AddNarasumberButton({
  kategoriOptions,
  kompetensiOptions,
}: {
  kategoriOptions: string[];
  kompetensiOptions: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
      >
        <Plus className="h-4 w-4" />
        Tambah Narasumber
      </button>
      <NarasumberFormDialog
        open={open}
        onClose={() => setOpen(false)}
        value={null}
        kategoriOptions={kategoriOptions}
        kompetensiOptions={kompetensiOptions}
      />
    </>
  );
}
