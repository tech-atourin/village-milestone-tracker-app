import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listProjectForum } from "@/server/queries/forum";
import { ForumPanel } from "@/components/forum-panel";

export default async function AtourinForumPage({
  params,
}: {
  params: { id: string };
}) {
  const posts = await listProjectForum(params.id);
  return (
    <div className="space-y-5">
      <Link
        href={`/atourin/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke project
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Diskusi project
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Semua anggota project bisa membaca dan menulis.
        </p>
      </header>
      <ForumPanel projectId={params.id} posts={posts} />
    </div>
  );
}
