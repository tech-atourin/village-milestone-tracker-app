-- =====================================================
-- 0011: Baseline schema comprehensive (v1.2.0-adwi-jadesta)
-- =====================================================
-- Expands the baseline form to match the ADWI Monitor & Evaluasi reference
-- (Kemenpar) AND the Jadesta profile/pengelola forms. Adds:
--   - Daya tarik wisata: split alam/budaya/buatan + asal wisatawan + kendala
--   - Paket & Pemasaran Digital: paket, video, sosmed, marketplace
--   - Kelembagaan: pihak pengelola, pemandu (total + sertifikat), L/P, disabilitas
--   - Ekonomi Kreatif: kriya, kuliner, fesyen breakdown
--   - Kemitraan: PT + swasta (repeater)
--   - Pencapaian: penghargaan + event + exposure + sertifikasi (repeater)
--   - Data Tahunan: kunjungan, tenaga kerja, UMKM, pendapatan, Pokdarwis (repeater)
--   - Resiliensi: pengelolaan sampah detail + sarana keselamatan
--   - Dokumen Pendukung: SK, sertifikat, MoU, laporan (repeater)
--
-- Field type "repeater" is new — value is an array of objects keyed by the
-- subfield keys. Existing data stays intact (JSONB merge).
-- =====================================================

UPDATE vmt.baseline_form_schemas
SET version = '1.2.0-adwi-jadesta',
    fields = '[
      {"section":"Informasi Dasar","fields":[
        {"key":"nama_populer","label":"Nama populer / branding desa","type":"text","hint":"Nama yang dikenal masyarakat, beda dari nama administratif"},
        {"key":"alamat_lengkap","label":"Alamat lengkap","type":"textarea","hint":"Jalan, dusun, RT/RW kalau ada"},
        {"key":"jarak_kecamatan","label":"Jarak ke ibukota kecamatan (km)","type":"number"},
        {"key":"keunikan","label":"Keunikan & keunggulan desa wisata","type":"textarea","hint":"Hal yang membedakan dari desa lain"},
        {"key":"rekomendasi_kunjungan","label":"Rekomendasi waktu / momen kunjungan terbaik","type":"textarea","hint":"Cth: musim panen, festival tahunan"},
        {"key":"kontak_nama","label":"Nama koordinator / narahubung","type":"text","required":true},
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
      {"section":"Daya Tarik Wisata","fields":[
        {"key":"tematik_desa","label":"Tema / Tematik Desa Wisata","type":"textarea","hint":"Cth: Wisata budaya Jawa, agrowisata kopi"},
        {"key":"kategori_desa","label":"Kategori Desa Wisata","type":"multiselect","options":["Alam","Pantai","Perairan","Pegunungan","Perdesaan","Pertanian","Perkebunan","Peternakan","Permukiman","Hutan","Keagamaan","Permuseuman","Taman Nasional"]},
        {"key":"jenis_wisata_utama","label":"Jenis wisata utama","type":"multiselect","options":["Alam","Budaya","Religi","Edukasi","Kuliner","Ekowisata","Petualangan"]},
        {"key":"wisata_alam","label":"Daya tarik wisata alam","type":"textarea","hint":"Sebutkan titik-titik wisata alam yang ada"},
        {"key":"wisata_budaya","label":"Daya tarik wisata budaya","type":"textarea","hint":"Atraksi budaya / kesenian / tradisi"},
        {"key":"wisata_buatan","label":"Daya tarik wisata buatan / kreatif","type":"textarea","hint":"Spot foto buatan, museum mini, gallery, dsb"},
        {"key":"kondisi_atraksi","label":"Kondisi atraksi saat ini","type":"select","options":["Tertata baik","Dalam pengembangan","Belum tertata","Tidak aktif"]},
        {"key":"kegiatan_wisatawan","label":"Kegiatan yang bisa dilakukan wisatawan","type":"textarea","hint":"Pisah dengan koma atau baris baru"},
        {"key":"jumlah_daya_tarik","label":"Jumlah titik daya tarik","type":"number"},
        {"key":"kunjungan_tahunan","label":"Total kunjungan wisatawan / tahun (estimasi)","type":"number"},
        {"key":"kunjungan_domestik","label":"Jumlah pengunjung domestik / tahun","type":"number"},
        {"key":"kunjungan_mancanegara","label":"Jumlah pengunjung mancanegara / tahun","type":"number"},
        {"key":"asal_domestik","label":"Asal wisatawan domestik (kota terbanyak)","type":"text","hint":"Cth: Jakarta, Surabaya, Bandung"},
        {"key":"asal_mancanegara","label":"Asal wisatawan mancanegara (negara terbanyak)","type":"text","hint":"Cth: Belanda, Jerman, Australia"},
        {"key":"potensi_daya_tarik","label":"Potensi daya tarik yang belum dikembangkan","type":"textarea"},
        {"key":"kendala_atraksi","label":"Kendala pengembangan daya tarik","type":"textarea"},
        {"key":"program_atraksi","label":"Program yang diperlukan untuk pengembangan daya tarik","type":"textarea"}
      ]},
      {"section":"Amenitas","fields":[
        {"key":"jumlah_homestay","label":"Jumlah homestay","type":"number"},
        {"key":"jumlah_kamar_homestay","label":"Total kamar homestay","type":"number"},
        {"key":"rata_tamu_homestay_bulan","label":"Rata-rata tamu menginap di homestay per bulan","type":"number"},
        {"key":"jumlah_hotel","label":"Jumlah hotel / akomodasi lain","type":"number"},
        {"key":"jumlah_kios_ekraf","label":"Jumlah toko / kios ekonomi kreatif","type":"number"},
        {"key":"jumlah_toilet_umum","label":"Jumlah toilet umum","type":"number"},
        {"key":"kapasitas_parkir","label":"Kapasitas lokasi parkir","type":"text","hint":"Cth: 5 mobil, 10 motor, 1 bus"},
        {"key":"punya_area_parkir","label":"Area parkir tersedia?","type":"boolean"},
        {"key":"punya_tic","label":"Pusat informasi wisata (TIC)?","type":"boolean"},
        {"key":"punya_sarana_penerangan","label":"Sarana penerangan area wisata?","type":"boolean"},
        {"key":"punya_sarana_ibadah","label":"Sarana ibadah?","type":"boolean"},
        {"key":"punya_ruangan_asi","label":"Ruangan menyusui / ASI?","type":"boolean"},
        {"key":"punya_kios_jualan","label":"Kios penjualan oleh-oleh?","type":"boolean"},
        {"key":"sarana_lainnya","label":"Sarana / fasilitas lain yang tersedia","type":"textarea"},
        {"key":"program_amenitas","label":"Program pengembangan amenitas yang diperlukan","type":"textarea"}
      ]},
      {"section":"Paket Wisata & Pemasaran Digital","fields":[
        {"key":"paket_tersedia","label":"Paket wisata tersedia?","type":"boolean"},
        {"key":"jenis_paket","label":"Jenis paket wisata","type":"multiselect","options":["Half day","Full day","Multi-day / Menginap","Kustom / On request"]},
        {"key":"daftar_paket","label":"Daftar paket wisata","type":"textarea","hint":"Nama paket + harga + durasi"},
        {"key":"jumlah_paket","label":"Jumlah paket wisata tersedia","type":"number"},
        {"key":"punya_website","label":"Punya website?","type":"boolean"},
        {"key":"website_url","label":"URL website / landing page","type":"text"},
        {"key":"video_profil","label":"Punya video profil desa wisata?","type":"boolean"},
        {"key":"link_video","label":"Link video profil","type":"text","hint":"YouTube, Vimeo, atau lainnya"},
        {"key":"media_sosial","label":"Media sosial yang digunakan untuk promosi","type":"multiselect","options":["Facebook","Instagram","Twitter/X","TikTok","YouTube","WhatsApp Business","Telegram","Lainnya"]},
        {"key":"akun_sosmed","label":"Akun sosial media (handle per platform)","type":"textarea","hint":"Cth: IG @desawisata, FB DesaWisata, TikTok @..."},
        {"key":"marketplace","label":"Marketplace / OTA yang dipakai","type":"multiselect","options":["Traveloka","Tiket.com","Booking.com","Airbnb","Atourin","Tokopedia","Shopee","Lainnya","Belum ada"]},
        {"key":"kendala_pemasaran","label":"Kendala dalam pemasaran digital","type":"textarea"},
        {"key":"program_pemasaran","label":"Program pengembangan pemasaran digital yang diperlukan","type":"textarea"}
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
        {"key":"pelatihan_terakhir","label":"Pelatihan SDM terakhir (jenis & tahun)","type":"text","hint":"Cth: Bahasa Inggris 2024, Hospitality 2023"}
      ]},
      {"section":"Kelembagaan","fields":[
        {"key":"pihak_pengelola","label":"Pihak pengelola desa wisata","type":"select","options":["BUMDes","Pokdarwis","Karang Taruna","Koperasi","Yayasan","Pemerintah Desa","Swasta","Gabungan","Lainnya"]},
        {"key":"punya_bumdes","label":"BUMDes mengelola wisata?","type":"boolean"},
        {"key":"punya_perdes","label":"Perdes wisata?","type":"boolean"},
        {"key":"punya_pokdarwis","label":"Pokdarwis aktif?","type":"boolean"},
        {"key":"pengurus_pokdarwis","label":"Jumlah pengurus Pokdarwis","type":"number"},
        {"key":"frekuensi_pertemuan","label":"Frekuensi pertemuan pengelola","type":"select","options":["Mingguan","Bulanan","Triwulanan","Insidental","Belum rutin"]},
        {"key":"jumlah_pemandu","label":"Jumlah pemandu wisata","type":"number"},
        {"key":"jumlah_pemandu_sertifikat","label":"Jumlah pemandu wisata yang tersertifikasi","type":"number"},
        {"key":"jumlah_warga_terlibat","label":"Jumlah warga yang terlibat aktif (total)","type":"number"},
        {"key":"jumlah_terlibat_l","label":"Jumlah warga terlibat - laki-laki","type":"number"},
        {"key":"jumlah_terlibat_p","label":"Jumlah warga terlibat - perempuan","type":"number"},
        {"key":"terlibat_disabilitas","label":"Ada keterlibatan penyandang disabilitas?","type":"boolean"},
        {"key":"pendapatan_tahunan","label":"Pendapatan kotor dari wisata / tahun (Rp)","type":"number"},
        {"key":"profit_sharing","label":"Model pembagian profit ke masyarakat","type":"textarea","hint":"Cth: 30% kas desa, 50% pengelola, 20% pengembangan"},
        {"key":"program_pengembangan_sdm","label":"Program pengembangan SDM yang diperlukan","type":"textarea","hint":"Cth: Pelatihan bahasa, hospitality, manajemen homestay"}
      ]},
      {"section":"Ekonomi Kreatif","fields":[
        {"key":"produk_ekraf","label":"Produk ekonomi kreatif unggulan","type":"textarea","hint":"Cinderamata, kuliner khas, kerajinan, dsb"},
        {"key":"jumlah_kriya","label":"Jumlah pelaku usaha kriya / kerajinan tangan","type":"number"},
        {"key":"jenis_kriya","label":"Jenis usaha kriya yang dikembangkan","type":"textarea"},
        {"key":"jumlah_kuliner","label":"Jumlah pelaku usaha kuliner","type":"number"},
        {"key":"jenis_kuliner","label":"Jenis usaha kuliner khas yang dikembangkan","type":"textarea"},
        {"key":"jumlah_fesyen","label":"Jumlah pelaku usaha fesyen","type":"number"},
        {"key":"jenis_fesyen","label":"Jenis usaha fesyen yang dikembangkan","type":"textarea"},
        {"key":"kendala_ekraf","label":"Kendala dalam pengembangan ekonomi kreatif","type":"textarea"},
        {"key":"program_ekraf","label":"Program pengembangan ekonomi kreatif yang diperlukan","type":"textarea"},
        {"key":"dampak_ekonomi","label":"Dampak ekonomi yang dirasakan masyarakat","type":"textarea"}
      ]},
      {"section":"Kemitraan","fields":[
        {"key":"kemitraan_pt","label":"Kerjasama dengan Perguruan Tinggi","type":"repeater","itemLabel":"kerjasama","subfields":[
          {"key":"institusi","label":"Nama perguruan tinggi","type":"text"},
          {"key":"program","label":"Bentuk program / kegiatan","type":"textarea"},
          {"key":"tahun","label":"Tahun pelaksanaan","type":"number"}
        ]},
        {"key":"kemitraan_swasta","label":"Kerjasama dengan Swasta / CSR / Industri","type":"repeater","itemLabel":"kerjasama","subfields":[
          {"key":"institusi","label":"Nama perusahaan / lembaga","type":"text"},
          {"key":"program","label":"Bentuk program / kegiatan","type":"textarea"},
          {"key":"tahun","label":"Tahun pelaksanaan","type":"number"}
        ]}
      ]},
      {"section":"Pencapaian","fields":[
        {"key":"penghargaan","label":"Penghargaan tambahan (di luar ADWI yang sudah ter-sync dari Hub)","type":"repeater","itemLabel":"penghargaan","subfields":[
          {"key":"nama","label":"Nama penghargaan","type":"text"},
          {"key":"lembaga","label":"Lembaga pemberi","type":"text"},
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"peringkat","label":"Peringkat / kategori","type":"text"}
        ]},
        {"key":"partisipasi_event","label":"Partisipasi dalam event / kompetisi","type":"repeater","itemLabel":"event","subfields":[
          {"key":"nama_event","label":"Nama event / kompetisi","type":"text"},
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"hasil","label":"Hasil / posisi","type":"text"}
        ]},
        {"key":"exposure_publikasi","label":"Exposure / publikasi media","type":"repeater","itemLabel":"publikasi","subfields":[
          {"key":"jenis","label":"Jenis media","type":"select","options":["Media Online","Media Cetak","TV","Radio","Sosial Media","Blog","Lainnya"]},
          {"key":"media","label":"Nama media","type":"text"},
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"link","label":"Link / referensi","type":"text"}
        ]},
        {"key":"sertifikasi","label":"Sertifikasi yang dimiliki desa wisata","type":"repeater","itemLabel":"sertifikat","subfields":[
          {"key":"nama","label":"Nama sertifikat","type":"text"},
          {"key":"lembaga","label":"Lembaga sertifikasi","type":"text"},
          {"key":"tahun","label":"Tahun diperoleh","type":"number"},
          {"key":"link","label":"Link bukti (opsional)","type":"text"}
        ]}
      ]},
      {"section":"Data Tahunan","fields":[
        {"key":"kunjungan_per_tahun","label":"Jumlah kunjungan wisatawan per tahun","type":"repeater","itemLabel":"tahun","subfields":[
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"wni","label":"WNI","type":"number"},
          {"key":"wna","label":"WNA","type":"number"}
        ]},
        {"key":"tenaga_kerja_per_tahun","label":"Jumlah tenaga kerja per tahun","type":"repeater","itemLabel":"tahun","subfields":[
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"pria","label":"Pria","type":"number"},
          {"key":"wanita","label":"Wanita","type":"number"}
        ]},
        {"key":"umkm_per_tahun","label":"Jumlah UMKM per tahun","type":"repeater","itemLabel":"tahun","subfields":[
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"jumlah","label":"Jumlah UMKM","type":"number"}
        ]},
        {"key":"pendapatan_per_tahun","label":"Jumlah pendapatan per tahun (Rp)","type":"repeater","itemLabel":"tahun","subfields":[
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"jumlah_rp","label":"Pendapatan (Rp)","type":"number"}
        ]},
        {"key":"pengurus_pokdarwis_per_tahun","label":"Jumlah pengurus Pokdarwis per tahun","type":"repeater","itemLabel":"tahun","subfields":[
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"pria","label":"Pria","type":"number"},
          {"key":"wanita","label":"Wanita","type":"number"}
        ]}
      ]},
      {"section":"Resiliensi & Keberlanjutan","fields":[
        {"key":"potensi_bencana","label":"Potensi bencana dominan","type":"multiselect","options":["Banjir","Longsor","Gempa","Tsunami","Kebakaran","Letusan gunung","Tidak ada"]},
        {"key":"punya_sop_mitigasi","label":"SOP mitigasi bencana?","type":"boolean"},
        {"key":"sarana_keselamatan","label":"Sarana penunjang keselamatan wisatawan","type":"textarea","hint":"Cth: P3K, life vest, alat pemadam"},
        {"key":"papan_titik_kumpul","label":"Papan titik kumpul + jalur evakuasi tersedia?","type":"boolean"},
        {"key":"punya_bank_sampah","label":"Bank Sampah tersedia?","type":"boolean"},
        {"key":"punya_tps3r","label":"TPS3R (Reduce/Reuse/Recycle) tersedia?","type":"boolean"},
        {"key":"perdes_sampah","label":"Perdes pengelolaan sampah?","type":"boolean"},
        {"key":"program_edukasi_sampah","label":"Program edukasi pengelolaan sampah?","type":"boolean"},
        {"key":"kebiasaan_pilah_sampah","label":"Kebiasaan masyarakat memilah sampah","type":"select","options":["Sebagian besar memilah","Sebagian kecil memilah","Belum memilah"]},
        {"key":"kendala_lingkungan","label":"Kendala / permasalahan pelestarian lingkungan","type":"textarea"}
      ]},
      {"section":"Dokumen Pendukung","fields":[
        {"key":"dokumen","label":"Dokumen pendukung (link / URL)","type":"repeater","itemLabel":"dokumen","subfields":[
          {"key":"jenis","label":"Jenis dokumen","type":"select","options":["SK Pengelola","Sertifikat Pelatihan","MoU Kemitraan","Laporan Keuangan","SK Penetapan Desa Wisata","Perdes","Lainnya"]},
          {"key":"nama","label":"Nama / judul dokumen","type":"text"},
          {"key":"tahun","label":"Tahun","type":"number"},
          {"key":"link_url","label":"Link dokumen (Drive / Dropbox / dst)","type":"text"}
        ]}
      ]}
    ]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000200';
