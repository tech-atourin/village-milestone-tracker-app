import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BaselineSchemaRow } from "@/lib/baseline/types";

export async function getDefaultBaselineSchema(): Promise<BaselineSchemaRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("baseline_form_schemas")
    .select("id, name, version, fields")
    .is("project_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as BaselineSchemaRow | null;
}

export async function getBaselineData(projectDesaId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("desa_baseline_data")
    .select("id, schema_version, data, submitted_at, updated_at")
    .eq("project_desa_id", projectDesaId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as {
    id: string;
    schema_version: string;
    data: Record<string, unknown>;
    submitted_at: string | null;
    updated_at: string;
  } | null;
}
