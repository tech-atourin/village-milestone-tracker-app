-- Jendela check-in per modul, dikontrol admin (toggle manual + auto-tutup opsional).
alter table vmt.project_topik
  add column if not exists checkin_open boolean not null default false,
  add column if not exists checkin_opened_at timestamptz,
  add column if not exists checkin_closes_at timestamptz;

comment on column vmt.project_topik.checkin_open is 'Admin toggle: true = peserta boleh check-in ke modul ini sekarang';
comment on column vmt.project_topik.checkin_closes_at is 'Opsional: waktu auto-tutup. Setelah lewat waktu ini check-in ditolak walau checkin_open masih true';
