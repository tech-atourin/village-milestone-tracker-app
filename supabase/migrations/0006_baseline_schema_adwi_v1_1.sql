-- =====================================================
-- 0006: Baseline schema ADWI-aligned (v1.1.0-adwi)
-- =====================================================
-- Realigns the default baseline form schema with the ADWI Monitor & Evaluasi
-- Desa Wisata (Kemenpar) reference sections: Atraksi, Amenitas,
-- Aksesibilitas, Sumber Daya Manusia, Masyarakat, Industri & Ekraf.
-- Keeps Informasi Dasar + Demografi + Resiliensi as preserved sections.
--
-- Existing desa_baseline_data rows (JSONB) keep their data — fields that were
-- removed simply stop displaying, new fields just appear empty until edited.
-- =====================================================

UPDATE vmt.baseline_form_schemas
SET version = '1.1.0-adwi',
    fields = '[
      {"section":"Informasi Dasar","fields":[
        {"key":"kontak_nama","label":"Nama kontak utama","type":"text","required":true},
        {"key":"kontak_jabatan","label":"Jabatan","type":"text"},
        {"key":"kontak_hp","label":"No HP / WhatsApp","type":"text","required":true},
        {"key":"kontak_email","label":"Email","type":"text"},
        {"key":"tahun_dibentuk","label":"Tahun desa wisata dibentuk","type":"number","hint":"Sesuai SK desa atau perdes"},
        {"key":"sk_penetapan","label":"Nomor SK / Perdes penetapan desa wisata","type":"text"}
      ]},
      {"section":"Demografi","fields":[
        {"key":"jumlah_kk","label":"Jumlah KK","type":"number"},
        {"key":"jumlah_penduduk_l","label":"Jumlah penduduk laki-laki","type":"number"},
        {"key":"jumlah_penduduk_p","label":"Jumlah penduduk perempuan","type":"number"},
        {"key":"jumlah_rt","label":"Jumlah RT","type":"number"},
        {"key":"jumlah_rw","label":"Jumlah RW","type":"number"}
      ]},
      {"section":"Atraksi","fields":[
        {"key":"tematik_desa","label":"Tema / Tematik Desa Wisata","type":"textarea","hint":"Cth: Wisata budaya Jawa, agrowisata kopi, dsb"},
        {"key":"kategori_desa","label":"Kategori Desa Wisata","type":"multiselect","options":["Alam","Pantai","Perairan","Pegunungan","Perdesaan","Pertanian","Perkebunan","Peternakan","Permukiman","Hutan","Keagamaan","Permuseuman","Taman Nasional"]},
        {"key":"jenis_wisata_utama","label":"Jenis wisata utama","type":"multiselect","options":["Alam","Budaya","Religi","Edukasi","Kuliner","Ekowisata","Petualangan"]},
        {"key":"kondisi_atraksi","label":"Kondisi atraksi saat ini","type":"select","options":["Tertata baik","Dalam pengembangan","Belum tertata","Tidak aktif"]},
        {"key":"kegiatan_wisatawan","label":"Kegiatan yang bisa dilakukan wisatawan","type":"textarea","hint":"Tuliskan aktivitas-aktivitas utama, pisah dengan koma atau baris baru"},
        {"key":"paket_wisata","label":"Paket wisata yang ditawarkan","type":"textarea","hint":"Nama paket + harga + durasi"},
        {"key":"jumlah_daya_tarik","label":"Jumlah titik daya tarik","type":"number"},
        {"key":"kunjungan_tahunan","label":"Total kunjungan wisatawan / tahun (estimasi)","type":"number"},
        {"key":"kunjungan_domestik","label":"Jumlah pengunjung domestik / tahun","type":"number"},
        {"key":"kunjungan_mancanegara","label":"Jumlah pengunjung mancanegara / tahun","type":"number"}
      ]},
      {"section":"Amenitas","fields":[
        {"key":"jumlah_homestay","label":"Jumlah homestay","type":"number"},
        {"key":"jumlah_kamar_homestay","label":"Total kamar homestay","type":"number"},
        {"key":"jumlah_hotel","label":"Jumlah hotel / akomodasi lainnya","type":"number"},
        {"key":"jumlah_kios_ekraf","label":"Jumlah toko / kios ekonomi kreatif","type":"number"},
        {"key":"punya_toilet_umum","label":"Toilet umum tersedia?","type":"boolean"},
        {"key":"punya_area_parkir","label":"Area parkir tersedia?","type":"boolean"},
        {"key":"punya_tic","label":"Pusat informasi wisata (TIC)?","type":"boolean"},
        {"key":"punya_sarana_penerangan","label":"Sarana penerangan area wisata?","type":"boolean"},
        {"key":"punya_sarana_ibadah","label":"Sarana ibadah?","type":"boolean"},
        {"key":"punya_ruangan_asi","label":"Ruangan menyusui / ASI?","type":"boolean"},
        {"key":"punya_kios_jualan","label":"Kios penjualan oleh-oleh?","type":"boolean"}
      ]},
      {"section":"Aksesibilitas","fields":[
        {"key":"jarak_ke_kota","label":"Jarak ke pusat kab/kota (km)","type":"number"},
        {"key":"akses_jalan","label":"Kondisi jalan akses","type":"select","options":["Aspal mulus","Aspal rusak","Cor beton","Tanah/kerikil","Lainnya"]},
        {"key":"akses_transport","label":"Transportasi umum tersedia?","type":"boolean"},
        {"key":"moda_transport","label":"Moda transportasi umum ke desa","type":"multiselect","options":["Bus","Angkot","Ojek","Kendaraan sewa","Sepeda motor","Tidak ada"]},
        {"key":"punya_signage","label":"Signage rute menuju desa wisata?","type":"boolean"},
        {"key":"sumber_air","label":"Sumber air bersih","type":"select","options":["PDAM","Sumur bor","Sumur gali","Mata air","Lainnya"]},
        {"key":"listrik_24jam","label":"Listrik 24 jam?","type":"boolean"},
        {"key":"akses_internet","label":"Akses internet","type":"select","options":["Fiber optik","4G/5G","WiFi publik","Tidak ada"]}
      ]},
      {"section":"Sumber Daya Manusia","fields":[
        {"key":"bahasa_pengelola","label":"Bahasa yang dikuasai pengelola","type":"multiselect","options":["Indonesia","Inggris","Mandarin","Jepang","Belanda","Arab","Bahasa daerah","Lainnya"]},
        {"key":"sdm_terlatih","label":"Jumlah SDM yang sudah mendapat pelatihan kepariwisataan","type":"number"},
        {"key":"pelatihan_terakhir","label":"Pelatihan SDM terakhir (jenis & tahun)","type":"text","hint":"Cth: Bahasa Inggris 2024, Hospitality 2023"},
        {"key":"kebutuhan_sdm","label":"Kebutuhan pengembangan SDM","type":"textarea","hint":"Cth: Pelatihan bahasa, hospitality, manajemen homestay"}
      ]},
      {"section":"Masyarakat","fields":[
        {"key":"punya_pokdarwis","label":"Pokdarwis aktif?","type":"boolean"},
        {"key":"pengurus_pokdarwis","label":"Jumlah pengurus Pokdarwis","type":"number"},
        {"key":"frekuensi_pertemuan","label":"Frekuensi pertemuan pengelola","type":"select","options":["Mingguan","Bulanan","Triwulanan","Insidental","Belum rutin"]},
        {"key":"pendapatan_tahunan","label":"Pendapatan kotor dari wisata / tahun (Rp)","type":"number"},
        {"key":"profit_sharing","label":"Model pembagian profit ke masyarakat","type":"textarea","hint":"Cth: 30% kas desa, 50% pengelola, 20% pengembangan"},
        {"key":"jumlah_warga_terlibat","label":"Jumlah warga yang terlibat aktif","type":"number"}
      ]},
      {"section":"Industri & Ekonomi Kreatif","fields":[
        {"key":"punya_bumdes","label":"BUMDes mengelola wisata?","type":"boolean"},
        {"key":"punya_perdes","label":"Perdes wisata?","type":"boolean"},
        {"key":"punya_website","label":"Punya website / kanal promosi online?","type":"boolean"},
        {"key":"website_url","label":"URL website / sosial media utama","type":"text","hint":"Cth: https://desawisata.id atau IG @desa..."},
        {"key":"produk_ekraf","label":"Produk ekonomi kreatif unggulan","type":"textarea","hint":"Cinderamata, kuliner khas, kerajinan, dsb"},
        {"key":"dampak_ekonomi","label":"Dampak ekonomi yang dirasakan masyarakat","type":"textarea"}
      ]},
      {"section":"Resiliensi & Keberlanjutan","fields":[
        {"key":"potensi_bencana","label":"Potensi bencana dominan","type":"multiselect","options":["Banjir","Longsor","Gempa","Tsunami","Kebakaran","Letusan gunung","Tidak ada"]},
        {"key":"punya_sop_mitigasi","label":"SOP mitigasi bencana?","type":"boolean"},
        {"key":"sistem_pengelolaan_sampah","label":"Sistem pengelolaan sampah","type":"select","options":["Bank sampah","TPS3R","Pengangkutan rutin","Belum sistematis"]}
      ]}
    ]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000200';
