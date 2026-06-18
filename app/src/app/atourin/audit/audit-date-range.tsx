"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export function AuditDateRange({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState<{ from: string | null; to: string | null }>(
    { from: from ?? null, to: to ?? null },
  );

  function apply(next: { from: string | null; to: string | null }) {
    setValue(next);
    const sp = new URLSearchParams(params);
    if (next.from) sp.set("from", next.from);
    else sp.delete("from");
    if (next.to) sp.set("to", next.to);
    else sp.delete("to");
    const qs = sp.toString();
    router.push(qs ? `/atourin/audit?${qs}` : "/atourin/audit");
  }

  return (
    <DateRangePicker value={value} onChange={apply} placeholder="Filter tanggal" />
  );
}
