-- 0020_rapor_komposisi_nilai.sql
-- Komposisi penilaian peserta:
--   Pre-Test 10% + Post-Test 10% + Tugas 50% + Keaktifan 30%
--
-- final_score ditulis oleh server action (bukan generated column) supaya
-- nilainya stabil/auditable dan hanya dihitung saat keempat komponen terisi.
-- Peserta hanya melihat final_score (di rapor + sertifikat); rincian komponen
-- hanya untuk internal mitra/superadmin.
alter table vmt.rapor_peserta
  add column if not exists tugas_score numeric,
  add column if not exists keaktifan_score numeric,
  add column if not exists final_score numeric;

comment on column vmt.rapor_peserta.tugas_score is 'Nilai Tugas 0-100 (bobot 50%)';
comment on column vmt.rapor_peserta.keaktifan_score is 'Nilai Keaktifan 0-100 (bobot 30%)';
comment on column vmt.rapor_peserta.final_score is 'Nilai Akhir berbobot; null jika salah satu komponen belum diisi';
