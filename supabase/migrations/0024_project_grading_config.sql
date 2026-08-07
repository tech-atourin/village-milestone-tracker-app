-- Konfigurasi penilaian per project: bobot komponen Nilai Akhir + batas lulus.
-- Default kosong {} -> aplikasi memakai skema BAKTI (Pre 10, Post 10, Tugas 50,
-- Keaktifan 30, lulus 70). Bobot disimpan sebagai fraksi 0..1.
-- Contoh: {"weights":{"pre_test":0.1,"post_test":0.1,"tugas":0.5,"keaktifan":0.3},"passing_score":70}

alter table vmt.projects
  add column if not exists grading_config jsonb not null default '{}'::jsonb;
