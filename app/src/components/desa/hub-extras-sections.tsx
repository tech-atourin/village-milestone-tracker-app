import {
  Image as ImageIcon,
  Package,
  Award as AwardIcon,
  Calendar,
} from "lucide-react";

export type HubProduk = {
  id: string;
  jenis: string | null;
  nama: string | null;
  sub_jenis: string | null;
  harga: number | null;
  deskripsi: string | null;
  image_url: string | null;
  is_available: boolean | null;
};

export type HubFoto = {
  id: string;
  url: string;
  is_cover: boolean | null;
  urutan: number | null;
};

export type HubAward = {
  id: string;
  tahun: number | null;
  edisi: string | null;
  kategori: string | null;
  peringkat: string | null;
};

export type HubEvent = {
  id: string;
  judul: string | null;
  deskripsi: string | null;
  mulai: string | null;
  selesai: string | null;
  image_url: string | null;
};

function fmtRp(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function HubExtrasSections({
  produk,
  foto,
  awards,
  events,
}: {
  produk: HubProduk[] | null;
  foto: HubFoto[] | null;
  awards: HubAward[] | null;
  events: HubEvent[] | null;
}) {
  const hasAny =
    (produk && produk.length > 0) ||
    (foto && foto.length > 0) ||
    (awards && awards.length > 0) ||
    (events && events.length > 0);
  if (!hasAny) return null;

  return (
    <>
      {foto && foto.length > 0 && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
            <ImageIcon className="h-4 w-4" />
            Foto Galeri ({foto.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {foto.slice(0, 12).map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg border border-atr-outline bg-atr-bg-soft"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt=""
                  className="h-full w-full object-cover transition hover:scale-105"
                />
                {f.is_cover && (
                  <span className="absolute left-1 top-1 rounded-full bg-atr-purple px-1.5 py-0.5 text-[9px] font-bold text-white">
                    COVER
                  </span>
                )}
              </a>
            ))}
          </div>
        </article>
      )}

      {produk && produk.length > 0 && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
            <Package className="h-4 w-4" />
            Produk & Paket Wisata ({produk.length})
          </h3>
          <ul className="space-y-2">
            {produk.slice(0, 10).map((p) => (
              <li
                key={p.id}
                className="flex items-start gap-3 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-sm"
              >
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.nama ?? ""}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-atr-fg">{p.nama ?? "-"}</span>
                    {p.jenis && (
                      <span className="inline-flex rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold text-atr-purple-600">
                        {p.jenis}
                      </span>
                    )}
                    {p.is_available === false && (
                      <span className="inline-flex rounded-full bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
                        Tidak tersedia
                      </span>
                    )}
                  </div>
                  {p.deskripsi && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-atr-fg-muted">
                      {p.deskripsi}
                    </p>
                  )}
                  {p.harga != null && (
                    <p className="mt-1 text-xs font-bold text-atr-fg">
                      {fmtRp(p.harga)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}

      {awards && awards.length > 0 && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
            <AwardIcon className="h-4 w-4" />
            Penghargaan & Prestasi ({awards.length})
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {awards.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-lg border border-atr-yellow/40 bg-atr-yellow/5 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-atr-yellow/40">
                  🏆
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="text-sm font-bold text-atr-fg">
                    {a.kategori ?? "Award"}
                  </div>
                  <div className="text-atr-fg-muted">
                    {a.peringkat && <strong className="text-atr-fg">{a.peringkat}</strong>}
                    {a.peringkat && a.edisi && " · "}
                    {a.edisi}
                  </div>
                  {a.tahun && <div className="text-[10px] text-atr-fg-muted">Tahun {a.tahun}</div>}
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}

      {events && events.length > 0 && (
        <article className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
            <Calendar className="h-4 w-4" />
            Event & Kegiatan ({events.length})
          </h3>
          <ul className="space-y-2">
            {events.slice(0, 10).map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-sm"
              >
                {e.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.image_url}
                    alt={e.judul ?? ""}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-atr-fg">{e.judul ?? "-"}</div>
                  <div className="text-[11px] text-atr-fg-muted">
                    {fmtDate(e.mulai)}
                    {e.selesai && e.selesai !== e.mulai && (
                      <> – {fmtDate(e.selesai)}</>
                    )}
                  </div>
                  {e.deskripsi && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-atr-fg-muted">
                      {e.deskripsi}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}
    </>
  );
}
