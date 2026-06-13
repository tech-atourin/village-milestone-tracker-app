-- =====================================================
-- Seed: Default Atourin organization + Standard Template
-- with 7 topik default and starter checklist items
-- =====================================================
-- Run after migrations applied.
-- All inserts target the `vmt` schema.
-- =====================================================

set search_path = vmt, public;

-- Atourin organization (singleton)
insert into organizations (id, name, type, brand_color_primary, brand_color_secondary)
values (
  '00000000-0000-0000-0000-000000000001',
  'Atourin',
  'atourin',
  '#0EA5E9',
  '#F59E0B'
)
on conflict do nothing;

-- Standard Pendampingan Template
insert into project_templates (id, name, description, default_modules)
values (
  '00000000-0000-0000-0000-000000000010',
  'Pendampingan Desa Wisata Standard',
  'Template default Atourin dengan 7 topik utama: Kelembagaan, Produk Wisata, Amenitas, Pemasaran, Resiliensi, Ekraf, Keuangan.',
  '{
    "desa_baseline": true,
    "topik_pendampingan": true,
    "capacity_building": true,
    "klasifikasi_nasional": false,
    "public_dashboard": false
  }'::jsonb
)
on conflict do nothing;

-- =====================================================
-- TOPIK 1: Kelembagaan
-- =====================================================
insert into template_topik (id, template_id, name, description, sort_order)
values ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010',
  'Kelembagaan',
  'Struktur, regulasi, dan tata kelola organisasi pengelola desa wisata.', 1)
on conflict do nothing;

insert into template_checklist_item (template_topik_id, title, description, required, sort_order) values
('00000000-0000-0000-0000-000000000101', 'Memiliki SK Pokdarwis aktif',
 'SK pembentukan Kelompok Sadar Wisata yang ditandatangani Kepala Desa, masih dalam masa aktif.', true, 1),
('00000000-0000-0000-0000-000000000101', 'Struktur organisasi pengelola tertulis',
 'Bagan struktur organisasi BUMDes/Pokdarwis/pengelola desa wisata, lengkap dengan nama dan peran.', true, 2),
('00000000-0000-0000-0000-000000000101', 'Daftar anggota Pokdarwis',
 'Database anggota Pokdarwis, minimal terdiri dari ketua, sekretaris, bendahara, dan koordinator bidang.', true, 3),
('00000000-0000-0000-0000-000000000101', 'Peraturan Desa terkait pariwisata',
 'Perdes/Pernag tentang pengelolaan desa wisata atau retribusi wisata.', false, 4),
('00000000-0000-0000-0000-000000000101', 'SOP pelayanan wisata',
 'Standar Operasional Prosedur untuk pelayanan tamu, distribusi, dan pencatatan.', true, 5),
('00000000-0000-0000-0000-000000000101', 'Kode etik wisata (do and don''t)',
 'Aturan tertulis perilaku wisatawan yang diharapkan di desa.', false, 6),
('00000000-0000-0000-0000-000000000101', 'Kemitraan dengan akademisi (PT)',
 'MoU atau bentuk kerjasama dengan perguruan tinggi (KKN, riset, magang).', false, 7),
('00000000-0000-0000-0000-000000000101', 'Kemitraan dengan swasta/industri',
 'Kerjasama dengan pihak swasta untuk pengembangan desa wisata.', false, 8);

-- =====================================================
-- TOPIK 2: Produk Wisata
-- =====================================================
insert into template_topik (id, template_id, name, description, sort_order)
values ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010',
  'Produk Wisata',
  'Daya tarik, paket wisata, dan pengalaman yang ditawarkan kepada wisatawan.', 2)
on conflict do nothing;

insert into template_checklist_item (template_topik_id, title, description, required, sort_order) values
('00000000-0000-0000-0000-000000000102', 'Daftar daya tarik wisata (alam, budaya, kreatif)',
 'Inventarisasi semua titik daya tarik dengan foto dan deskripsi.', true, 1),
('00000000-0000-0000-0000-000000000102', 'Minimal 1 paket wisata yang sudah disusun',
 'Paket wisata terdokumentasi: itinerary, durasi, harga.', true, 2),
('00000000-0000-0000-0000-000000000102', 'Paket wisata telah diuji coba',
 'Bukti uji coba paket dengan tamu sungguhan atau dummy.', true, 3),
('00000000-0000-0000-0000-000000000102', 'Harga paket terhitung dengan baik',
 'Breakdown harga termasuk margin, biaya operasional, dan profit.', true, 4),
('00000000-0000-0000-0000-000000000102', 'Katalog produk wisata',
 'Brosur/katalog cetak atau digital yang siap dibagikan.', false, 5),
('00000000-0000-0000-0000-000000000102', 'Cerita/storytelling unik desa',
 'Narasi yang membedakan desa dari kompetitor.', false, 6);

-- =====================================================
-- TOPIK 3: Amenitas
-- =====================================================
insert into template_topik (id, template_id, name, description, sort_order)
values ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010',
  'Amenitas',
  'Sarana dan prasarana pendukung kenyamanan wisatawan.', 3)
on conflict do nothing;

insert into template_checklist_item (template_topik_id, title, description, required, sort_order) values
('00000000-0000-0000-0000-000000000103', 'Database homestay terdokumentasi',
 'Daftar homestay aktif dengan jumlah kamar, kapasitas, dan kontak.', true, 1),
('00000000-0000-0000-0000-000000000103', 'SOP pengelolaan homestay',
 'Standar pelayanan homestay (check-in/out, kebersihan, fasilitas).', true, 2),
('00000000-0000-0000-0000-000000000103', 'Tata tertib tamu di homestay',
 'Aturan untuk tamu yang menginap, ditempel di kamar.', false, 3),
('00000000-0000-0000-0000-000000000103', 'Checklist standar fasilitas homestay',
 'Kriteria minimum fasilitas (tempat tidur, kasur, lampu, ventilasi).', true, 4),
('00000000-0000-0000-0000-000000000103', 'Toilet umum tersedia & terawat',
 'Minimal 1 toilet umum untuk wisatawan, terjaga kebersihan.', true, 5),
('00000000-0000-0000-0000-000000000103', 'Area parkir dengan kapasitas jelas',
 'Lokasi parkir tergambar dengan kapasitas bus/mobil.', false, 6),
('00000000-0000-0000-0000-000000000103', 'Tempat ibadah accessible',
 'Mushola/gereja terdekat untuk wisatawan.', false, 7),
('00000000-0000-0000-0000-000000000103', 'Pusat informasi pariwisata (TIC)',
 'Titik informasi yang mudah diakses tamu.', false, 8);

-- =====================================================
-- TOPIK 4: Pemasaran
-- =====================================================
insert into template_topik (id, template_id, name, description, sort_order)
values ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000010',
  'Pemasaran',
  'Promosi, distribusi, dan kanal pemasaran digital maupun konvensional.', 4)
on conflict do nothing;

insert into template_checklist_item (template_topik_id, title, description, required, sort_order) values
('00000000-0000-0000-0000-000000000104', 'Akun media sosial aktif (min. 1 platform)',
 'Instagram/Facebook/TikTok dengan posting rutin minimal 2x seminggu.', true, 1),
('00000000-0000-0000-0000-000000000104', 'Profil di Google Maps',
 'Lokasi desa wisata terdaftar dan terverifikasi di Google Maps.', true, 2),
('00000000-0000-0000-0000-000000000104', 'Profil di Trip Advisor',
 'Listing aktif di Trip Advisor dengan minimal 1 review.', false, 3),
('00000000-0000-0000-0000-000000000104', 'WhatsApp Business sebagai kanal booking',
 'Akun WA Business dengan auto-reply dan katalog.', true, 4),
('00000000-0000-0000-0000-000000000104', 'Website atau landing page',
 'Halaman web sendiri atau di-host pihak ketiga (Jadesta, dll).', false, 5),
('00000000-0000-0000-0000-000000000104', 'Konten promosi berkualitas',
 'Foto/video kualitas baik untuk promo. Minimal 10 aset siap pakai.', true, 6),
('00000000-0000-0000-0000-000000000104', 'Listing di OTA/TA/TO',
 'Terdaftar minimal 1 Online Travel Agent atau Travel Agent.', false, 7);

-- =====================================================
-- TOPIK 5: Resiliensi / Keberlanjutan
-- =====================================================
insert into template_topik (id, template_id, name, description, sort_order)
values ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000010',
  'Resiliensi/Keberlanjutan',
  'Kesiapan mitigasi bencana, pengelolaan sampah, dan pelestarian lingkungan.', 5)
on conflict do nothing;

insert into template_checklist_item (template_topik_id, title, description, required, sort_order) values
('00000000-0000-0000-0000-000000000105', 'Identifikasi potensi bencana di kawasan',
 'Dokumen daftar risiko bencana (longsor, banjir, tsunami, dll).', true, 1),
('00000000-0000-0000-0000-000000000105', 'Papan titik kumpul & jalur evakuasi',
 'Penanda fisik di area wisata.', true, 2),
('00000000-0000-0000-0000-000000000105', 'SOP mitigasi bencana',
 'Prosedur evakuasi dan respons darurat.', true, 3),
('00000000-0000-0000-0000-000000000105', 'Sarana keselamatan wisatawan',
 'Pelampung, P3K, rambu peringatan, sesuai jenis wisata.', true, 4),
('00000000-0000-0000-0000-000000000105', 'Program pengelolaan sampah',
 'Sistem pemilahan, bank sampah, atau TPS3R.', true, 5),
('00000000-0000-0000-0000-000000000105', 'Sosialisasi sampah ke masyarakat',
 'Edukasi rutin warga tentang pemilahan sampah.', false, 6),
('00000000-0000-0000-0000-000000000105', 'Program pelestarian lingkungan',
 'Penanaman, bersih pantai, konservasi, dll.', false, 7),
('00000000-0000-0000-0000-000000000105', 'Implementasi Sapta Pesona',
 '7 unsur Sapta Pesona dipraktikkan di desa.', true, 8);

-- =====================================================
-- TOPIK 6: Produk Ekonomi Kreatif
-- =====================================================
insert into template_topik (id, template_id, name, description, sort_order)
values ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000010',
  'Produk Ekonomi Kreatif',
  'Pengembangan kriya, kuliner, fesyen, dan UMKM pendukung desa wisata.', 6)
on conflict do nothing;

insert into template_checklist_item (template_topik_id, title, description, required, sort_order) values
('00000000-0000-0000-0000-000000000106', 'Inventarisasi pelaku usaha kriya',
 'Daftar pengrajin lokal dengan jenis produk.', true, 1),
('00000000-0000-0000-0000-000000000106', 'Inventarisasi pelaku usaha kuliner',
 'Daftar warung/usaha kuliner khas desa.', true, 2),
('00000000-0000-0000-0000-000000000106', 'Inventarisasi pelaku usaha fesyen',
 'Daftar produsen tenun/batik/fashion lokal.', false, 3),
('00000000-0000-0000-0000-000000000106', 'Identifikasi produk khas signature',
 'Minimal 3 produk yang jadi identitas desa.', true, 4),
('00000000-0000-0000-0000-000000000106', 'Standar kemasan/packaging',
 'Kemasan dengan branding desa, food-safe untuk kuliner.', false, 5),
('00000000-0000-0000-0000-000000000106', 'Pelatihan UMKM pernah dilakukan',
 'Bukti UMKM desa pernah mendapat pelatihan mutu/pemasaran.', false, 6);

-- =====================================================
-- TOPIK 7: Keuangan
-- =====================================================
insert into template_topik (id, template_id, name, description, sort_order)
values ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000010',
  'Keuangan',
  'Pengelolaan keuangan desa wisata, pembukuan, dan distribusi manfaat.', 7)
on conflict do nothing;

insert into template_checklist_item (template_topik_id, title, description, required, sort_order) values
('00000000-0000-0000-0000-000000000107', 'Pembukuan keuangan tertulis',
 'Catatan pemasukan/pengeluaran rutin (manual atau digital).', true, 1),
('00000000-0000-0000-0000-000000000107', 'Rekening bank atas nama lembaga',
 'Rekening Pokdarwis/BUMDes, bukan rekening pribadi.', true, 2),
('00000000-0000-0000-0000-000000000107', 'SOP pembagian hasil/sharing',
 'Aturan distribusi pendapatan ke anggota dan kas desa.', true, 3),
('00000000-0000-0000-0000-000000000107', 'Laporan keuangan periodik',
 'Laporan bulanan atau kuartalan disampaikan ke anggota.', false, 4),
('00000000-0000-0000-0000-000000000107', 'Sistem pembayaran digital (QRIS, transfer)',
 'Menerima pembayaran non-tunai dari wisatawan.', false, 5),
('00000000-0000-0000-0000-000000000107', 'Pencatatan harga & tarif yang transparan',
 'Pricelist terpampang/dipublikasi.', true, 6),
('00000000-0000-0000-0000-000000000107', 'NPWP lembaga (jika omzet relevan)',
 'NPWP atas nama Pokdarwis/BUMDes untuk pengelolaan pajak.', false, 7);
