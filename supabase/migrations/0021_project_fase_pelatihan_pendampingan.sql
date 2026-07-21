-- 0021_project_fase_pelatihan_pendampingan.sql
-- Pisahkan fase Pelatihan dan Pendampingan pada sebuah project.
-- period_start/period_end tetap menjadi periode program keseluruhan (dipakai
-- luas di aplikasi); dua fase di bawah ini melengkapinya dengan tanggal dan
-- jumlah hari masing-masing.
alter table vmt.projects
  add column if not exists pelatihan_start date,
  add column if not exists pelatihan_end date,
  add column if not exists total_pelatihan_days int,
  add column if not exists pendampingan_start date,
  add column if not exists pendampingan_end date;

comment on column vmt.projects.pelatihan_start is 'Tanggal mulai fase pelatihan';
comment on column vmt.projects.pelatihan_end is 'Tanggal selesai fase pelatihan';
comment on column vmt.projects.total_pelatihan_days is 'Jumlah hari pelatihan (dipakai untuk pelabelan Hari 1, Hari 2, dst)';
comment on column vmt.projects.pendampingan_start is 'Tanggal mulai fase pendampingan';
comment on column vmt.projects.pendampingan_end is 'Tanggal selesai fase pendampingan';
comment on column vmt.projects.total_pendampingan_days is 'Jumlah hari kunjungan narasumber per desa';
