-- =====================================================
-- 0008: narasumber daily report fields (ADWI Pendampingan reference)
-- =====================================================
-- pendampingan_sessions already has materi, tindak_lanjut, kondisi_sebelum,
-- kondisi_setelah, rekomendasi. The ADWI reference (Kemenpar form) adds
-- these explicit fields per day:
--   maksud_tujuan — apa tujuan sesi pendampingan hari ini
--   aktivitas — apa aktivitas yang dilakukan
--   output_sesi — apa output konkret dari sesi
-- 'tindak_lanjut' tetap dipakai untuk "rekomendasi lanjutan" per sesi.

ALTER TABLE vmt.pendampingan_sessions
  ADD COLUMN IF NOT EXISTS maksud_tujuan text,
  ADD COLUMN IF NOT EXISTS aktivitas text,
  ADD COLUMN IF NOT EXISTS output_sesi text;
