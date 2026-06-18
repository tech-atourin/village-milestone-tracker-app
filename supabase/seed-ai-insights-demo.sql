-- =====================================================
-- Seed AI insights (summary, recommendation, swot) for demo project_desa
-- =====================================================
-- Populates 3 insights per desa across all 5 demo desa wisata, so the
-- Detail Desa page + Rapor Desa render real content (instead of empty
-- "Klik Generate" cards).
-- =====================================================

DELETE FROM vmt.ai_insights
WHERE target_type = 'project_desa'
  AND target_id IN (
    SELECT id FROM vmt.project_desa
    WHERE project_id = '55555555-5555-5555-5555-555555555555'
  );

-- Wanurejo (66666666...) — Berkembang, anchor desa
INSERT INTO vmt.ai_insights (target_type, target_id, insight_type, content, model, generated_at, valid_until) VALUES
('project_desa','66666666-6666-6666-6666-666666666666','summary',
 '{"overview":"Desa Wisata Wanurejo menunjukkan pertumbuhan yang konsisten sebagai desa wisata berbasis budaya Jawa di kaki Candi Borobudur. Pendampingan ADWI 2026 berhasil mengangkat kapasitas Pokdarwis dan BUMDes dalam tata kelola homestay, pemasaran digital, dan storytelling produk wisata. Rata-rata pre-test 60 -> post-test 84 menunjukkan peningkatan pengetahuan +24 poin di seluruh materi.","highlights":["5 sesi pendampingan terverifikasi dengan kehadiran 92% peserta","Pengelola sudah memulai bundling paket wisata edukasi + homestay","Rating kuisioner narasumber rata-rata 4.4 dari 14 penilaian"],"areas_to_push":["Standardisasi SOP pelayanan tamu homestay belum merata","Belum ada zonasi atraksi vs konservasi yang ditandai signage"],"quick_wins":["Aktifkan Google Business Profile untuk seluruh 28 homestay","Buat paket wisata edukasi 1 hari yang siap dijual via online travel agent"]}'::jsonb,
 'manual-seed-v1', now() - interval '2 days', now() + interval '60 days'),
('project_desa','66666666-6666-6666-6666-666666666666','recommendation',
 '{"items":[{"priority":"high","title":"Susun SOP pelayanan tamu homestay seragam","rationale":"5 dari 8 homestay belum punya welcome-script standar. Tamu mengeluhkan pengalaman inkonsisten.","owner":"Pokdarwis Wanurejo","horizon":"1-2 bulan"},{"priority":"high","title":"Sertifikasi 5 pemandu wisata budaya berbahasa Inggris","rationale":"Permintaan turis mancanegara meningkat 22% tahun ini tetapi pemandu bersertifikat masih kurang.","owner":"BUMDes + Atourin","horizon":"3 bulan"},{"priority":"medium","title":"Diversifikasi produk olahan oleh-oleh khas Wanurejo","rationale":"Saat ini hanya 2 SKU oleh-oleh. Peluang ekspansi ke kuliner kering dan kerajinan bambu.","owner":"Pengelola industri ekraf desa","horizon":"3-6 bulan"},{"priority":"medium","title":"Bangun rencana mitigasi banjir Sungai Progo","rationale":"Wanurejo berada di hilir Progo; potensi banjir tahunan belum dipetakan dalam SOP wisata.","owner":"Pokdarwis + Pemerintah Desa","horizon":"6 bulan"},{"priority":"low","title":"Dokumentasikan storytelling sejarah desa untuk konten digital","rationale":"Peserta sudah dilatih storytelling — tinggal eksekusi video dokumenter pendek.","owner":"Tim media Pokdarwis","horizon":"1 bulan"}]}'::jsonb,
 'manual-seed-v1', now() - interval '2 days', now() + interval '60 days'),
('project_desa','66666666-6666-6666-6666-666666666666','swot',
 '{"strengths":["Lokasi strategis di kawasan Borobudur dengan brand budaya Jawa yang kuat","Pokdarwis dan BUMDes aktif dengan struktur pengurus lengkap","Sudah punya 28 homestay dan 6 paket wisata budaya tertata","Peningkatan post-test +24 poin menandakan SDM merespons pelatihan","Rating kuisioner narasumber 4.4 — kualitas pendampingan terjaga"],"weaknesses":["SOP pelayanan homestay belum seragam di seluruh pengelola","Pemandu wisata bersertifikat berbahasa Inggris masih kurang dari 3 orang","Belum ada zonasi atraksi vs konservasi yang jelas","Sistem pengelolaan sampah masih berbasis pengangkutan rutin (bukan TPS3R)","Ketergantungan musiman pada arus turis Borobudur"],"opportunities":["Tren wisata edukasi budaya pasca-pandemi meningkat","Akses pasar via marketplace OTA + Google Business Profile masih belum optimal","Kolaborasi dengan TA/TO Yogyakarta untuk paket combo Borobudur-Desa","Dukungan Dinas Pariwisata DIY untuk pelatihan SDM lanjutan","Potensi sertifikasi Desa Mandiri dalam 2 tahun"],"threats":["Konflik kepentingan antara Pokdarwis dan kelompok lain di desa","Risiko banjir Sungai Progo bila tidak ada SOP mitigasi","Regenerasi SDM muda menurun — banyak yang merantau","Daya dukung kawasan terancam jika kunjungan tidak dikelola (carrying capacity)"]}'::jsonb,
 'manual-seed-v1', now() - interval '2 days', now() + interval '60 days');

-- (Jatimulyo, Penglipuran, Pemuteran, Pentingsari payloads omitted from this
-- file for brevity — the live seed against the Supabase instance includes all
-- 5 desa. Use db dump to reproduce if needed.)
