import "server-only";

import { createClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  channel: string;
  template_key: string;
  payload: Record<string, unknown> & {
    _rendered?: { subject: string; html: string; inAppText: string };
  };
  status: string;
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
};

export async function listUserNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, channel, template_key, payload, status, created_at, sent_at, read_at",
    )
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as NotificationRow[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .is("read_at", null);
  return count ?? 0;
}
