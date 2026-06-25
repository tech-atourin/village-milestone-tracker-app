"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, GraduationCap, CheckCircle2 } from "lucide-react";
import {
  rateNarasumber,
  type NarasumberToRate,
} from "@/server/actions/narasumber-rating";

export function NarasumberRatingSection({
  projectId,
  narasumber,
}: {
  projectId: string;
  narasumber: NarasumberToRate[];
}) {
  if (narasumber.length === 0) return null;
  return (
    <section id="penilaian-narasumber" className="space-y-3 scroll-mt-20">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Penilaian Narasumber
        </h2>
        <p className="text-xs text-atr-fg-muted">
          Beri rating untuk narasumber yang mendampingi Anda. Penilaian
          dirata-rata dan membantu Atourin menjaga kualitas mentor.
        </p>
      </div>
      <ul className="space-y-2">
        {narasumber.map((n) => (
          <NarasumberRatingCard key={n.narasumber_id} projectId={projectId} n={n} />
        ))}
      </ul>
    </section>
  );
}

function NarasumberRatingCard({
  projectId,
  n,
}: {
  projectId: string;
  n: NarasumberToRate;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState<number>(n.my_rating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState(n.my_comment ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function submit() {
    if (rating < 1) {
      setError("Pilih rating bintang dulu.");
      return;
    }
    if (comment.trim().length < 5) {
      setError("Komentar wajib diisi (minimal 5 karakter).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await rateNarasumber({
        narasumber_id: n.narasumber_id,
        project_id: projectId,
        rating,
        comment: comment.trim(),
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  const shown = hover || rating;

  return (
    <li className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-atr-yellow/25 text-atr-fg">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-atr-fg">{n.full_name}</h3>
            {n.my_rating != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-atr-arti/15 px-2 py-0.5 text-[10px] font-bold text-atr-arti">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Sudah dinilai
              </span>
            )}
          </div>
          {n.kompetensi && (
            <p className="truncate text-xs text-atr-fg-muted">{n.kompetensi}</p>
          )}
          <p className="text-[11px] text-atr-fg-muted">
            {n.sessions_count} sesi pendampingan
          </p>

          {/* Star picker */}
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => {
                  setRating(star);
                  if (!expanded) setExpanded(true);
                }}
                className="p-0.5"
                aria-label={`${star} bintang`}
              >
                <Star
                  className={`h-5 w-5 transition ${
                    star <= shown
                      ? "fill-atr-yellow text-atr-yellow"
                      : "text-atr-outline"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-1 text-xs font-bold text-atr-fg">
                {rating}/5
              </span>
            )}
          </div>

          {(expanded || n.my_rating != null) && (
            <div className="mt-2 space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Komentar wajib: ceritakan pengalaman pendampingan - apa yang membantu dan apa yang bisa ditingkatkan."
                className="w-full rounded-lg border border-atr-outline bg-white p-2 text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
              {error && (
                <div className="text-[11px] font-bold text-atr-red">{error}</div>
              )}
              <div className="flex items-center justify-end gap-2">
                {saved && (
                  <span className="text-[11px] font-bold text-atr-arti">
                    Tersimpan ✓
                  </span>
                )}
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Star className="h-3.5 w-3.5" />
                  )}
                  {n.my_rating != null ? "Update penilaian" : "Kirim penilaian"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
