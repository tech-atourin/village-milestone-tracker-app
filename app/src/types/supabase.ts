// =====================================================
// Supabase typed schema - PERMISSIVE STUB for Phase 0.
// =====================================================
// Real generation: `npm run supabase:types`
//   (requires `supabase link` with DB password first).
//
// We deliberately type Database as a permissive shape so
// supabase-js doesn't fight Insert/Update payloads while
// the real generated types are missing. When the real
// types land, replace this file - call sites will keep
// working but gain proper column-level inference.
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GlobalRole =
  | "superadmin"
  | "mitra_admin"
  | "peserta"
  | "narasumber"
  | "desa_wisata";

export type ProjectRole =
  | "superadmin"
  | "mitra_admin"
  | "peserta"
  | "pendamping"
  | "narasumber"
  | "desa_wisata";

export type ProjectStatus = "draft" | "active" | "completed" | "archived";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
