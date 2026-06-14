-- =====================================================
-- Seed: national_criteria_progress (V1 Permenpar) demo
-- =====================================================
-- Populates checklist progress for 5 demo desa so the
-- /atourin/klasifikasi review page (V1 per-desa) shows
-- realistic submitted/verified/rejected entries with
-- substantive evidence_note for reviewers to act on.
--
-- evidence_path is intentionally NULL — the vmt-evidence
-- bucket is empty in demo, so a fake path would produce
-- broken "Buka evidence" links. Reviewers see the
-- evidence_note (desa's description of their submission)
-- and verify based on that.
--
-- Idempotent: re-running upserts via UNIQUE (desa_id,
-- criteria_item_id). Safe to run multiple times.
--
-- To run: Supabase Dashboard → SQL Editor → paste → Run.
-- =====================================================

WITH criteria AS (
  SELECT id, title, category, tier
  FROM vmt.national_criteria_item
  WHERE master_id = '00000000-0000-0000-0000-000000000301'
)
INSERT INTO vmt.national_criteria_progress
  (desa_id, criteria_item_id, status, submitted_by, submitted_at,
   verified_by, verified_at, evidence_path, evidence_note)
SELECT
  s.desa_id,
  c.id,
  s.status::vmt.criteria_progress_status,
  '99999999-9999-9999-9999-999999999999'::uuid AS submitted_by,
  s.submitted_at,
  CASE WHEN s.status IN ('verified','rejected')
       THEN '11111111-1111-1111-1111-111111111111'::uuid
       ELSE NULL END AS verified_by,
  CASE WHEN s.status IN ('verified','rejected')
       THEN s.submitted_at + interval '2 days'
       ELSE NULL END AS verified_at,
  NULL AS evidence_path,
  s.evidence_note
FROM (VALUES
  -- ====== Wanurejo (Maju tier) ======
  ('44444444-4444-4444-4444-444444444444'::uuid, 'Akses jalan ke desa dapat dilalui roda 4', 'verified', '2026-04-15 10:00:00+07'::timestamptz, 'Foto jalan utama desa (paving + aspal), lebar 6m, lengkap dengan foto Google Maps. File: jalan_utama_wanurejo.pdf (3.2 MB).'),
  ('44444444-4444-4444-4444-444444444444', 'Toilet umum tersedia di area wisata', 'verified', '2026-04-15 10:30:00+07', '4 unit toilet umum kondisi terawat (foto sebelum-sesudah cleaning). Dilengkapi shower air bersih. Frekuensi maintenance: harian.'),
  ('44444444-4444-4444-4444-444444444444', 'Area parkir dengan kapasitas terdokumentasi', 'verified', '2026-04-16 09:00:00+07', 'Parkir motor 40 unit, mobil 12 unit, bus 2 unit. Foto layout + SK pengelolaan parkir oleh Karang Taruna.'),
  ('44444444-4444-4444-4444-444444444444', 'Signage minimal menuju daya tarik', 'verified', '2026-04-16 09:30:00+07', '8 papan signage tersebar di titik strategis (foto + denah). Material: kayu jati dengan stensil cat tahan cuaca.'),
  ('44444444-4444-4444-4444-444444444444', 'Lembaga pengelola wisata terbentuk (Pokdarwis / BUMDes)', 'verified', '2026-04-17 11:00:00+07', 'Pokdarwis Wanurejo aktif sejak 2018, struktur 15 pengurus. Foto kantor sekretariat + papan nama.'),
  ('44444444-4444-4444-4444-444444444444', 'SK pembentukan ditandatangani Kepala Desa', 'verified', '2026-04-17 11:30:00+07', 'SK No. 145/Kpts/Ds-Wanurejo/2018 tertanggal 12 Juli 2018, ditandatangani Kepala Desa H. Suparno.'),
  ('44444444-4444-4444-4444-444444444444', '3+ homestay terdaftar dengan standar fasilitas', 'submitted', '2026-06-10 14:00:00+07', '8 homestay terdaftar di sistem desa. Foto interior + fasilitas standar (AC, WiFi, kamar mandi dalam). Daftar lengkap: Homestay Wanurejo Indah, Roso Mulyo, Borobudur View, dst.'),
  ('44444444-4444-4444-4444-444444444444', 'SOP pengelolaan homestay', 'submitted', '2026-06-10 14:30:00+07', 'SOP cleanliness, check-in/check-out, harga musim ramai/sepi. Format Google Docs 12 halaman, ditandatangani pengelola.'),
  ('44444444-4444-4444-4444-444444444444', 'Minimal 1 paket wisata sudah diuji coba', 'submitted', '2026-06-11 09:00:00+07', 'Paket 1D Borobudur Sunrise + Wanurejo Heritage Walk. Sudah uji coba 3x dengan total 47 wisatawan. Feedback rata-rata 4.5/5.'),
  -- ====== Penglipuran (Mandiri) ======
  ('aaaa2222-2222-2222-2222-222222222222'::uuid, 'Akses jalan ke desa dapat dilalui roda 4', 'verified', '2026-03-10 09:00:00+07', 'Jalan utama Penglipuran beraspal, lebar 8m. Dilengkapi trotoar pedestrian + lampu jalan. Foto + video drone tersedia.'),
  ('aaaa2222-2222-2222-2222-222222222222', 'Lembaga pengelola wisata terbentuk (Pokdarwis / BUMDes)', 'verified', '2026-03-10 09:30:00+07', 'BUMDes Penglipuran "Mandala Wisata" dengan struktur 25 pengurus. Berbadan hukum sejak 2010.'),
  ('aaaa2222-2222-2222-2222-222222222222', 'SK pembentukan ditandatangani Kepala Desa', 'verified', '2026-03-10 10:00:00+07', 'SK BUMDes No. 02/Kpts/2010 + Akta Notaris No. 15 tahun 2011. Dokumen lengkap di lampiran.'),
  ('aaaa2222-2222-2222-2222-222222222222', '3+ homestay terdaftar dengan standar fasilitas', 'verified', '2026-03-11 11:00:00+07', '78 homestay aktif dengan klasifikasi Bronze/Silver/Gold. Foto + daftar lengkap + tarif resmi.'),
  ('aaaa2222-2222-2222-2222-222222222222', 'SOP pengelolaan homestay', 'verified', '2026-03-11 11:30:00+07', 'SOP standar Bali Awara 32 halaman. Mencakup hospitality, cleanliness, safety, dispute resolution.'),
  ('aaaa2222-2222-2222-2222-222222222222', 'Minimal 1 paket wisata sudah diuji coba', 'verified', '2026-03-12 09:00:00+07', '15 paket wisata terstandar (cultural tour, weaving workshop, traditional cooking, dll). Volume 12.000 wisatawan/tahun.'),
  ('aaaa2222-2222-2222-2222-222222222222', 'Storytelling unik desa terdokumentasi', 'verified', '2026-03-12 10:00:00+07', 'Story "Penglipuran sebagai Desa Terbersih Dunia 2016". Buku panduan + video promosi 5 menit dalam 3 bahasa.'),
  -- ====== Pemuteran (Berkembang) ======
  ('aaaa3333-3333-3333-3333-333333333333'::uuid, 'Akses jalan ke desa dapat dilalui roda 4', 'verified', '2026-04-20 10:00:00+07', 'Jalan desa lebar 5m, kondisi aspal baik. Akses dari Singaraja 30 menit, Denpasar 3 jam.'),
  ('aaaa3333-3333-3333-3333-333333333333', 'Toilet umum tersedia di area wisata', 'verified', '2026-04-20 10:30:00+07', '6 unit toilet umum di area pantai dan dermaga. Kondisi terawat, ada cleaner harian.'),
  ('aaaa3333-3333-3333-3333-333333333333', 'Minimal 1 daya tarik wisata utama teridentifikasi', 'verified', '2026-04-21 09:00:00+07', 'Bio Rocks Coral Restoration (terkenal internasional). Snorkeling + diving spot terdokumentasi.'),
  ('aaaa3333-3333-3333-3333-333333333333', 'Lembaga pengelola wisata terbentuk (Pokdarwis / BUMDes)', 'submitted', '2026-06-12 10:00:00+07', 'Pokdarwis Pemuteran Lestari, 20 pengurus aktif. Sedang dalam proses reformasi struktur internal.'),
  ('aaaa3333-3333-3333-3333-333333333333', 'SK pembentukan ditandatangani Kepala Desa', 'rejected', '2026-06-12 10:30:00+07', 'SK lama tahun 2014, dokumen scan kualitas rendah dan belum di-update untuk struktur baru. Perlu re-upload setelah reformasi.'),
  ('aaaa3333-3333-3333-3333-333333333333', '3+ homestay terdaftar dengan standar fasilitas', 'submitted', '2026-06-13 11:00:00+07', '5 homestay aktif di sekitar pantai. Foto + alamat lengkap. Standar bervariasi, sedang diharmonisasi.'),
  -- ====== Jatimulyo (Rintisan) ======
  ('aaaa1111-1111-1111-1111-111111111111'::uuid, 'Akses jalan ke desa dapat dilalui roda 4', 'submitted', '2026-06-08 10:00:00+07', 'Jalan utama desa beraspal sebagian (60%), sisanya makadam. Foto kondisi jalan + estimasi perbaikan 2027.'),
  ('aaaa1111-1111-1111-1111-111111111111', 'Toilet umum tersedia di area wisata', 'submitted', '2026-06-08 10:30:00+07', '2 unit toilet umum di area Goa Kiskendo + 1 unit di Air Terjun Kembang Soka. Kondisi memadai.'),
  ('aaaa1111-1111-1111-1111-111111111111', 'Minimal 1 daya tarik wisata utama teridentifikasi', 'submitted', '2026-06-08 11:00:00+07', 'Goa Kiskendo (situs sejarah Ramayana), Air Terjun Kembang Soka, dan Hutan Pinus Mangunan. Inventarisasi lengkap dengan foto.'),
  ('aaaa1111-1111-1111-1111-111111111111', 'Lembaga pengelola wisata terbentuk (Pokdarwis / BUMDes)', 'submitted', '2026-06-09 09:00:00+07', 'Pokdarwis "Jatimulyo Asri" dibentuk Maret 2026. Struktur 8 pengurus inti. Belum punya SK Kepala Desa.'),
  ('aaaa1111-1111-1111-1111-111111111111', 'SK pembentukan ditandatangani Kepala Desa', 'rejected', '2026-06-09 09:30:00+07', 'Draft SK terlampir, tapi belum ada tanda tangan Kepala Desa karena beliau sedang umroh. Akan dikirim ulang minggu depan.'),
  ('aaaa1111-1111-1111-1111-111111111111', 'Minimal 1 kanal informasi (medsos / WhatsApp)', 'verified', '2026-04-25 10:00:00+07', 'Instagram @desawisata.jatimulyo (1.2k followers, aktif sejak Jan 2026). WhatsApp Business +62 858-xxxx.'),
  ('aaaa1111-1111-1111-1111-111111111111', 'Listing di Google Maps', 'verified', '2026-04-25 10:30:00+07', 'Pin "Desa Wisata Jatimulyo" di Google Maps dengan 47 review, rating 4.6. Foto by user generated content.'),
  -- ====== Pentingsari (unclassified) ======
  ('aaaa4444-4444-4444-4444-444444444444'::uuid, 'Akses jalan ke desa dapat dilalui roda 4', 'submitted', '2026-06-05 14:00:00+07', 'Jalan utama Pentingsari beraspal, lebar 4m. Dapat dilalui rombongan mini bus (28 seat). Foto + video lalu lintas.'),
  ('aaaa4444-4444-4444-4444-444444444444', 'Minimal 1 daya tarik wisata utama teridentifikasi', 'submitted', '2026-06-05 14:30:00+07', 'Edukasi pertanian tradisional + camping experience di sekitar Gunung Merapi. Pemandangan + udara sejuk.'),
  ('aaaa4444-4444-4444-4444-444444444444', 'Lembaga pengelola wisata terbentuk (Pokdarwis / BUMDes)', 'submitted', '2026-06-06 10:00:00+07', 'Sedang dalam proses pembentukan Pokdarwis. Sudah ada kelompok inti 12 orang petani + youth. Target SK terbit Q3 2026.'),
  ('aaaa4444-4444-4444-4444-444444444444', 'Minimal 1 kanal informasi (medsos / WhatsApp)', 'submitted', '2026-06-06 10:30:00+07', 'Facebook page "Desa Wisata Pentingsari" baru launch April 2026. 340 followers. WhatsApp Group untuk koordinasi pengelola.')
) AS s(desa_id, title, status, submitted_at, evidence_note)
JOIN criteria c ON c.title = s.title
ON CONFLICT (desa_id, criteria_item_id) DO UPDATE SET
  status = EXCLUDED.status,
  submitted_by = EXCLUDED.submitted_by,
  submitted_at = EXCLUDED.submitted_at,
  verified_by = EXCLUDED.verified_by,
  verified_at = EXCLUDED.verified_at,
  evidence_note = EXCLUDED.evidence_note;
