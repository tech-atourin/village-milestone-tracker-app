// =====================================================
// Bulk import — shared schema + helpers
// =====================================================
import { z } from "zod";

// Indonesian phone normalization: 62xxxx or 08xxx → 628xxxx (E.164-ish, no '+').
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits; // fallback — keep as-is
}

export function looksLikeIndoPhone(raw: string): boolean {
  const n = normalizePhone(raw);
  return !!n && n.length >= 10 && n.length <= 15 && n.startsWith("62");
}

// Excel date may come as serial number or string. Accept DD/MM/YYYY or
// YYYY-MM-DD; return YYYY-MM-DD or null.
export function normalizeDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial → JS date. Excel epoch starts at 1899-12-30 (Lotus bug).
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + raw * 86400000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// =====================================================
// Row schema
// =====================================================
// At least one of email/phone is required for a peserta.
// Email format strict; phone passed through normalizePhone first.
// =====================================================
export const bulkRowSchema = z
  .object({
    full_name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z
      .string()
      .email("Format email tidak valid")
      .optional()
      .or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    nik: z.string().optional().or(z.literal("")),
    gender: z.enum(["L", "P"]).optional().or(z.literal("")),
    birthdate: z.string().optional().nullable(),
    desa_name: z.string().optional().or(z.literal("")),
    role: z
      .enum(["peserta", "mitra_admin", "narasumber"])
      .default("peserta"),
    // Narasumber-only extras (ignored for other roles)
    kategori_narasumber: z.string().optional().or(z.literal("")),
    kompetensi: z.string().optional().or(z.literal("")),
    jabatan: z.string().optional().or(z.literal("")),
    instansi: z.string().optional().or(z.literal("")),
    kota: z.string().optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (!v.email && !v.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wajib salah satu: email atau HP",
        path: ["email"],
      });
    }
    if (v.phone && !looksLikeIndoPhone(v.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Format HP tidak valid (gunakan 62xxx atau 08xxx)",
        path: ["phone"],
      });
    }
  });

export type BulkRow = z.infer<typeof bulkRowSchema>;

export type BulkRowResult = {
  rowNumber: number; // 1-indexed (Excel row, header = 1)
  raw: Record<string, unknown>;
  ok: boolean;
  data?: BulkRow & {
    normalized_phone: string | null;
    normalized_birthdate: string | null;
  };
  errors?: Array<{ field: string; message: string }>;
};

const COLUMN_ALIASES: Record<string, string> = {
  // canonical → variants accepted from the Excel
  full_name: "full_name",
  nama: "full_name",
  email: "email",
  phone: "phone",
  hp: "phone",
  no_hp: "phone",
  whatsapp: "phone",
  nik: "nik",
  gender: "gender",
  jenis_kelamin: "gender",
  birthdate: "birthdate",
  tanggal_lahir: "birthdate",
  desa_name: "desa_name",
  desa: "desa_name",
  role: "role",
  // Narasumber extras
  kategori_narasumber: "kategori_narasumber",
  kategori: "kategori_narasumber",
  kompetensi: "kompetensi",
  bidang: "kompetensi",
  jabatan: "jabatan",
  instansi: "instansi",
  afiliasi: "instansi",
  kota: "kota",
  domisili: "kota",
};

export function normalizeColumns(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.toString().trim().toLowerCase().replace(/\s+/g, "_");
    const canonical = COLUMN_ALIASES[key];
    if (canonical) out[canonical] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

export function parseBulkRows(
  rows: Array<Record<string, unknown>>,
): BulkRowResult[] {
  return rows.map((raw, idx) => {
    const rowNumber = idx + 2; // header row is 1
    const normalized = normalizeColumns(raw);
    const parsed = bulkRowSchema.safeParse(normalized);

    if (!parsed.success) {
      const errs = parsed.error.errors.map((e) => ({
        field: e.path[0]?.toString() ?? "_",
        message: e.message,
      }));
      return { rowNumber, raw, ok: false, errors: errs };
    }

    return {
      rowNumber,
      raw,
      ok: true,
      data: {
        ...parsed.data,
        normalized_phone: normalizePhone(parsed.data.phone),
        normalized_birthdate: normalizeDate(parsed.data.birthdate),
      },
    };
  });
}
