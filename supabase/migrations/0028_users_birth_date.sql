-- Tanggal lahir peserta (dari data registrasi). Sebelumnya tidak disimpan.
alter table vmt.users
  add column if not exists birth_date date;
