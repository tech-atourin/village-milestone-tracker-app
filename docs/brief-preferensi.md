# Brief Preferensi Pengembangan

Kumpulan preferensi yang berulang diminta saat membangun VMT. Dipakai sebagai
acuan gaya dan cara kerja, dan bisa ditempel sebagai brief di project/platform
lain.

## 1. Anti "AI-generated look" (paling sering ditekankan)
- Dilarang karakter em-dash di mana pun: teks UI, jawaban, komentar kode, dan
  pesan commit. Ganti dengan koma, titik, titik dua, tanda kurung, atau susun
  ulang kalimat. En-dash untuk rentang tanggal masih boleh.
- Jangan pakai emoji sebagai penanda atau ikon UI. Gunakan ikon proper (di
  project ini: lucide-react). Emoji membuat tampilan terkesan dibuat AI.
- Hindari pola desain generik yang khas AI: hero raksasa berlebihan, warna
  krem plus serif plus aksen terakota, gradient ungu-ke-biru asal tempel, semua
  rata tengah, sudut membulat seragam di mana-mana.
- Copy ditulis dari sisi pengguna, bukan istilah teknis sistem.

## 2. Bahasa & konten
- UI dan copy berbahasa Indonesia.
- Konten harus akurat sesuai fitur, bukan lorem ipsum atau placeholder yang
  mengklaim sesuatu yang belum ada.
- Empty state ditangani dengan pesan yang jelas, bukan dibiarkan kosong atau
  janggal.

## 3. Interaksi & UX
- Setiap tombol aksi punya indikator loading saat diklik.
- Mobile-first: banyak pengguna via HP. Perhatikan kecepatan load sebagai pain
  point.
- SEO untuk halaman publik.
- Konsistensi antar-scope: kalau satu peran punya fitur X, peran mirror
  (misalnya mitra vs superadmin) harus konsisten.

## 4. Keamanan & privasi data
- Batasi apa yang boleh dilihat tiap peran. Contoh nyata: peserta hanya lihat
  nilai akhir plus pre/post, bukan rincian bobot atau komponen penilaian
  internal.
- Ingat batas per-baris vs per-kolom: memberi akses baris (RLS) bisa
  membocorkan kolom sensitif lewat API. Kalau perlu sembunyikan kolom, ambil di
  server dengan kolom dibatasi, jangan andalkan RLS saja.
- Cegah kebocoran antar-entitas (misalnya peserta desa A tidak boleh lihat data
  desa B) di lapisan database, bukan hanya di UI.
- Validasi input di server, bukan hanya di form, supaya tidak bisa dilangkahi.

## 5. Alur kerja Git (ketat)
- Jangan pernah commit atau push sebelum diminta eksplisit. Setiap permintaan
  commit berlaku sekali, bukan izin permanen.
- Pesan commit deskriptif, jelaskan alasannya, dan catat hal yang belum tuntas
  atau belum divalidasi.
- Jangan ikutkan file sampah (lock file, dokumen tak relevan) ke commit.

## 6. Kejujuran teknis
- Bedakan dengan jelas: sudah diverifikasi (typecheck/test/build/query) vs belum
  diuji runtime atau browser. Jangan klaim "selesai" untuk yang belum
  benar-benar diuji.
- Kalau menemukan bug lain saat mengerjakan sesuatu, sebutkan, jangan diam.
- Kalau ada keterbatasan (misalnya tidak bisa mengambil file gambar, atau tidak
  mau menggambar ulang logo merek dagang), sampaikan terus terang, jangan
  dipaksakan.

## 7. Kualitas kode
- Verifikasi dengan typecheck plus test plus production build sebelum menyatakan
  beres.
- Satu sumber kebenaran untuk logika penting (misalnya rumus penilaian di satu
  file, bukan diulang di banyak tempat).
- Fitur yang disembunyikan sementara: pakai flag (misalnya SHOW_X = false),
  jangan hapus kodenya, supaya mudah diaktifkan lagi.
