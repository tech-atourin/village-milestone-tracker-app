export const metadata = { title: "Diskusi" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listProjectForum } from "@/server/queries/forum";
import { ForumPanel } from "@/components/forum-panel";

// Peserta routes are keyed by project_desa_id; need to look up the project_id.
async function getProjectId(projectDesaId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_desa")
    .select("project_id")
    .eq("id", projectDesaId)
    .maybeSingle();
  return (data as { project_id: string } | null)?.project_id ?? null;
}

export default async function PesertaForumPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = await getProjectId(params.id);
  if (!projectId) return null;
  const posts = await listProjectForum(projectId);
  return (
    <div className="space-y-5">
      <Link
        href={`/peserta/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Diskusi project
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Tanya tim mentor atau peserta desa lain.
        </p>
      </header>
      <ForumPanel projectId={projectId} posts={posts} />
    </div>
  );
}
