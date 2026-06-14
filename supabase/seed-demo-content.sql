-- =====================================================
-- VMT Demo Content Seed
-- =====================================================
-- Populates the demo project (ADWI 2026 Batch Demo,
-- id 55555555-5555-5555-5555-555555555555) with showcase
-- content so the rapor, AI insights, and GForm pages
-- aren't empty when stakeholders walk through the app.
--
-- Idempotent (uses ON CONFLICT where applicable). Safe to
-- run multiple times on the same database.
--
-- Prereqs (must already exist — created by earlier seeds):
--   - 5 demo desa (Wanurejo, Jatimulyo, Penglipuran,
--     Pemuteran, Pentingsari)
--   - 1 demo project (ADWI 2026 Batch Demo)
--   - 18 peserta accounts + 6 narasumber accounts
--   - 5 project_desa attachments
--   - 13 rapor_peserta rows (pre/post scores already set
--     by the comprehensive seed)
--
-- To run: open Supabase Dashboard → SQL Editor → paste
-- this file → Run.
-- =====================================================

-- =====================================================
-- 1. SURVEY KEPUASAN — fill the rapor_peserta.survey_kepuasan
--    jsonb for existing rows + add 3 new peserta rapor
-- =====================================================
-- Field shape: { overall, materi, narasumber, fasilitas,
--                akomodasi, durasi (each Likert 1-5),
--                rekomendasi (bool), feedback (text) }

UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":5,"materi":5,"narasumber":5,"fasilitas":4,"akomodasi":5,"durasi":4,"rekomendasi":true,"feedback":"Materi sangat aplikatif. Narasumber kompeten dan ramah. Kami merasa lebih siap menerapkan ilmu di desa."}'::jsonb WHERE user_id = '33333333-3333-3333-3333-333333333333';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":5,"materi":4,"narasumber":5,"fasilitas":4,"akomodasi":4,"durasi":5,"rekomendasi":true,"feedback":"Pelatihan luar biasa! Berharap ada sesi follow-up online untuk konsultasi lanjutan."}'::jsonb WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":4,"materi":4,"narasumber":5,"fasilitas":4,"akomodasi":4,"durasi":4,"rekomendasi":true,"feedback":"Materi marketing digital sangat relevan dengan kondisi desa kami sekarang."}'::jsonb WHERE user_id = 'c1111111-1111-1111-1111-111111111111';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":5,"materi":5,"narasumber":5,"fasilitas":4,"akomodasi":5,"durasi":4,"rekomendasi":true,"feedback":"Sudah saya implementasikan IG Reels untuk promosi homestay, follower naik 40% dalam 2 minggu!"}'::jsonb WHERE user_id = 'c1111112-1111-1111-1111-111111111111';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":4,"materi":4,"narasumber":4,"fasilitas":3,"akomodasi":4,"durasi":5,"rekomendasi":true,"feedback":"Mohon sesi praktik storytelling diperbanyak. Materi resiliensi sangat helpful."}'::jsonb WHERE user_id = 'c1111113-1111-1111-1111-111111111111';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":5,"materi":5,"narasumber":5,"fasilitas":5,"akomodasi":5,"durasi":5,"rekomendasi":true,"feedback":"Sangat memuaskan. Sebagai desa Mandiri kami banyak belajar dari sharing antar desa."}'::jsonb WHERE user_id = 'c2222221-2222-2222-2222-222222222222';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":5,"materi":5,"narasumber":5,"fasilitas":4,"akomodasi":5,"durasi":5,"rekomendasi":true,"feedback":"Konektivitas dengan TripAdvisor & Booking sudah bisa kami eksekusi."}'::jsonb WHERE user_id = 'c2222222-2222-2222-2222-222222222222';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":5,"materi":5,"narasumber":5,"fasilitas":4,"akomodasi":5,"durasi":4,"rekomendasi":true,"feedback":"Training pemandu sertifikasi internal sudah dimulai minggu ini."}'::jsonb WHERE user_id = 'c2222223-2222-2222-2222-222222222222';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":4,"materi":5,"narasumber":5,"fasilitas":3,"akomodasi":4,"durasi":3,"rekomendasi":true,"feedback":"Durasi pendampingan kurang. Kami butuh sesi tambahan untuk topik manajemen homestay."}'::jsonb WHERE user_id = 'c3333331-3333-3333-3333-333333333333';
UPDATE vmt.rapor_peserta SET survey_kepuasan = '{"overall":4,"materi":4,"narasumber":5,"fasilitas":4,"akomodasi":4,"durasi":3,"rekomendasi":true,"feedback":"Aspek konservasi terumbu karang menarik. Bisa jadi USP wisata kami."}'::jsonb WHERE user_id = 'c3333332-3333-3333-3333-333333333333';

-- 3 new rapor entries: Pemuteran 3rd peserta + 2 Pentingsari peserta
INSERT INTO vmt.rapor_peserta (user_id, project_id, pre_test_score, post_test_score, improvement_percent, attendance, survey_kepuasan, generated_at) VALUES
  ('c3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 58, 70, 20.69, 80,
    '{"overall":4,"materi":4,"narasumber":4,"fasilitas":3,"akomodasi":4,"durasi":3,"rekomendasi":true,"feedback":"Materi digital marketing membantu kami pivot ke konten reel."}'::jsonb, now() - interval '1 day'),
  ('c4444441-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 50, 68, 36.00, 100,
    '{"overall":4,"materi":4,"narasumber":4,"fasilitas":4,"akomodasi":4,"durasi":4,"rekomendasi":true,"feedback":"Baru ikut program pertama, masih banyak yang harus dipelajari. Tim Atourin sangat membantu."}'::jsonb, now()),
  ('c4444442-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 55, 72, 30.91, 100,
    '{"overall":5,"materi":4,"narasumber":5,"fasilitas":4,"akomodasi":5,"durasi":4,"rekomendasi":true,"feedback":"Pendampingan terstruktur. Action plan jelas untuk 3 bulan ke depan."}'::jsonb, now())
ON CONFLICT (user_id, project_id) DO NOTHING;

-- =====================================================
-- 2. AI INSIGHTS — 10 rows across project / project_desa / peserta
-- target_type: peserta | project | project_desa
-- insight_type: summary | recommendation | stagnation_flag | evidence_review
-- =====================================================

INSERT INTO vmt.ai_insights (target_type, target_id, insight_type, content, model, input_tokens, output_tokens, generated_at, valid_until) VALUES
  -- ----- Project-level (2) -----
  ('project', '55555555-5555-5555-5555-555555555555', 'summary',
    '{
      "title": "Ringkasan Project ADWI 2026 Batch Demo",
      "highlights": [
        "5 desa peserta dengan klasifikasi beragam (Rintisan hingga Mandiri)",
        "Total 18 peserta aktif, kehadiran rata-rata 96%",
        "15 sesi pendampingan tercatat (10 verified, 2 submitted, 3 draft)",
        "17 rencana aksi terdaftar, 3 sudah selesai"
      ],
      "key_findings": [
        "Penglipuran konsisten menjadi top performer (skor self-assessment 100%)",
        "Pemuteran masih perlu dukungan tambahan di aspek kelembagaan",
        "Pentingsari sebagai desa rintisan menunjukkan progress positif"
      ],
      "next_steps": [
        "Lakukan sesi follow-up online untuk desa Pemuteran & Pentingsari",
        "Dorong cross-pollination: pemuteran belajar dari Penglipuran",
        "Verifikasi assessment Wanurejo untuk promote ke tier Maju"
      ]
    }'::jsonb,
    'gemini-2.5-flash', 1280, 420, now() - interval '2 days', now() + interval '7 days'),

  ('project', '55555555-5555-5555-5555-555555555555', 'recommendation',
    '{
      "title": "Rekomendasi Strategis untuk Kemenparekraf",
      "priorities": [
        {"text": "Replikasi model Penglipuran ke 3 desa Bali lainnya", "impact": "tinggi"},
        {"text": "Tambah modul konservasi alam untuk desa-desa pesisir", "impact": "menengah"},
        {"text": "Bangun komunitas online antar-desa wisata ADWI", "impact": "tinggi"}
      ],
      "budget_allocation_hint": "Pertimbangkan alokasi 30% budget berikutnya untuk follow-up online & 20% untuk replikasi best practice"
    }'::jsonb,
    'gemini-2.5-flash', 950, 320, now() - interval '1 day', now() + interval '14 days'),

  -- ----- project_desa level (6) -----
  ('project_desa', '66666666-6666-6666-6666-666666666666', 'summary',
    '{
      "desa_name": "Desa Wisata Wanurejo",
      "current_tier": "Berkembang (auto-promote ke Maju setelah verify Hub V2)",
      "progress_summary": "5 hari pendampingan tuntas dengan kondisi sebelum/sesudah terdokumentasi rapi. SOP pelayanan tamu sudah jadi, GBP listing 28 homestay on-track.",
      "strengths": ["Pokdarwis aktif & ber-AD/ART", "Lokasi strategis dekat Borobudur", "Tim peserta sangat antusias"],
      "areas_for_improvement": ["Sertifikasi pemandu masih sedikit", "Drill mitigasi bencana belum dilakukan"]
    }'::jsonb,
    'gemini-2.5-flash', 720, 240, now() - interval '3 days', now() + interval '14 days'),

  ('project_desa', '66666666-6666-6666-6666-666666666666', 'recommendation',
    '{
      "desa_name": "Desa Wisata Wanurejo",
      "action_items": [
        {"title": "Kerjasama dengan HPI", "detail": "Daftarkan 15 calon pemandu ke pelatihan sertifikasi resmi HPI", "timeframe": "3 bulan"},
        {"title": "Simulasi BPBD", "detail": "Hubungi BPBD Magelang untuk jadwalkan drill mitigasi banjir + erupsi Merapi", "timeframe": "2 bulan"},
        {"title": "Paket bundling Borobudur", "detail": "Buat 3 paket wisata yang bundling dengan tiket Borobudur (sunrise, sunset, full-day)", "timeframe": "1 bulan"}
      ]
    }'::jsonb,
    'gemini-2.5-flash', 680, 280, now() - interval '2 days', now() + interval '7 days'),

  ('project_desa', '66660002-0000-0000-0000-000000000002', 'summary',
    '{
      "desa_name": "Desa Wisata Penglipuran",
      "current_tier": "Mandiri (terverifikasi)",
      "progress_summary": "Pendampingan 5 hari berjalan sempurna. Skor self-assessment Hub 100%, semua pilar lengkap. Desa contoh nasional dengan sistem yang sudah mature.",
      "strengths": ["Sistem pengelolaan sampah terintegrasi (Bank sampah + TPS3R)", "Pemandu semua tersertifikasi", "Listing premium di OTA"],
      "areas_for_improvement": ["Sustain quality saat scaling visitor", "Diversifikasi paket di luar peak season"]
    }'::jsonb,
    'gemini-2.5-flash', 720, 230, now() - interval '5 days', now() + interval '30 days'),

  ('project_desa', '66660003-0000-0000-0000-000000000003', 'stagnation_flag',
    '{
      "desa_name": "Desa Wisata Pemuteran",
      "days_idle": 11,
      "issue": "Hanya 2 sesi pendampingan tercatat (semua draft), checklist progress 0%, baseline minimal.",
      "risk_level": "medium",
      "recommended_action": "Hubungi narasumber digital + storytelling untuk submit sesi 1 & 2. Schedule sesi 3-5 dalam 2 minggu ke depan."
    }'::jsonb,
    'rule-based', NULL, NULL, now() - interval '1 day', now() + interval '7 days'),

  ('project_desa', '66660003-0000-0000-0000-000000000003', 'recommendation',
    '{
      "desa_name": "Desa Wisata Pemuteran",
      "action_items": [
        {"title": "Aktivasi data baseline", "detail": "Saat ini hanya kontak yang terisi. Schedule sesi pengisian baseline lengkap 1 hari sebelum sesi pendampingan berikutnya", "timeframe": "1 minggu"},
        {"title": "Kemitraan dive operator", "detail": "Pemuteran adalah Mandiri tier — mestinya bisa jadi anchor untuk dive tourism. Bangun MoU dengan minimal 5 dive operator dalam 2 bulan", "timeframe": "2 bulan"}
      ]
    }'::jsonb,
    'gemini-2.5-flash', 640, 260, now() - interval '1 day', now() + interval '7 days'),

  ('project_desa', '66660004-0000-0000-0000-000000000004', 'stagnation_flag',
    '{
      "desa_name": "Desa Wisata Pentingsari",
      "days_idle": 25,
      "issue": "Belum ada sesi pendampingan sama sekali, baseline belum diisi, self-assessment belum dimulai.",
      "risk_level": "high",
      "recommended_action": "Schedule kick-off meeting dengan Pokdarwis Pentingsari minggu ini. Assign narasumber dan tentukan tanggal sesi 1."
    }'::jsonb,
    'rule-based', NULL, NULL, now() - interval '12 hours', now() + interval '3 days'),

  -- ----- peserta level (2) -----
  ('peserta', '33333333-3333-3333-3333-333333333333', 'evidence_review',
    '{
      "peserta_name": "Eko Haryanto",
      "summary": "Peserta paling aktif di Wanurejo. Pre→post improvement 44.83%, attendance 100%. Evidence checklist sudah upload 12 item.",
      "highlight": "Inisiatif submit SOP Homestay dalam 2 hari setelah sesi — leadership skill bagus.",
      "follow_up": "Rekomendasi sebagai narasumber lokal untuk desa lain di Magelang."
    }'::jsonb,
    'gemini-2.5-flash', 480, 180, now() - interval '4 days', now() + interval '30 days'),

  ('peserta', 'c2222221-2222-2222-2222-222222222222', 'evidence_review',
    '{
      "peserta_name": "I Nyoman Sudarsana",
      "summary": "Ketua Adat Penglipuran. Kepemimpinan kuat dalam pelestarian tradisi. Improvement 27.78% (sudah tinggi dari awal).",
      "highlight": "Berhasil convey filosofi Tri Hita Karana ke aspek pengelolaan wisata secara praktis.",
      "follow_up": "Undang sebagai pembicara untuk batch berikutnya — topik Cultural Sustainability."
    }'::jsonb,
    'gemini-2.5-flash', 510, 210, now() - interval '3 days', now() + interval '30 days');

-- =====================================================
-- 3. PROJECT_GFORMS — 3 contoh GForm (pre-test, post-test, survey kepuasan)
-- =====================================================
-- NOTE: gform_id + sheet_id values are illustrative; for real sync
-- they must point to actual Google Form / Sheet IDs that have been
-- shared with the service account.

INSERT INTO vmt.project_gforms (id, project_id, form_type, form_label, gform_id, sheet_id, identifier_field, sync_status, last_sync_at, last_sync_error) VALUES
  ('e0000001-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'pre_test',
    'Pre-test Pengetahuan Awal',
    '1FAIpQLSeDemoPreTestADWI2026Wnrj',
    '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F',
    'Email Address',
    'active', now() - interval '20 days', NULL),
  ('e0000002-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'post_test',
    'Post-test Setelah Pendampingan',
    '1FAIpQLSeDemoPostTestADWI2026Wnrj',
    '2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3A',
    'Email Address',
    'active', now() - interval '5 days', NULL),
  ('e0000003-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'survey_kepuasan',
    'Survey Kepuasan Pelatihan',
    '1FAIpQLSeDemoSurveyADWI2026Wnrj',
    '3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3A4B',
    'Email Address',
    'active', now() - interval '2 days', NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. PESERTA_TEST_RESULTS — 10 sample synced responses
--    9 matched + 1 unmatched (edge case)
-- =====================================================

INSERT INTO vmt.peserta_test_results (project_gform_id, user_id, raw_response, score, max_score, submitted_at, matched_status) VALUES
  -- Pre-test responses
  ('e0000001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
    '{"Email Address":"peserta.wanurejo@atourin.id","Timestamp":"2026-08-10T09:15:32","Apa itu Pokdarwis?":"Kelompok Sadar Wisata","Sebutkan 5 amenitas dasar desa wisata":"Homestay, toilet, parkir, mushola, restoran","Jenis sertifikasi pemandu":"Sertifikasi HPI"}'::jsonb,
    58, 100, '2026-08-10 09:15:32+00', 'matched'),
  ('e0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"Email Address":"peserta.sari@atourin.id","Timestamp":"2026-08-10T09:18:45","Apa itu Pokdarwis?":"Kelompok wisata desa","Sebutkan 5 amenitas dasar desa wisata":"Homestay, MCK, parkir","Jenis sertifikasi pemandu":"Tidak tahu"}'::jsonb,
    62, 100, '2026-08-10 09:18:45+00', 'matched'),
  ('e0000001-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111',
    '{"Email Address":"peserta.jatimulyo1@atourin.id","Timestamp":"2026-08-18T08:42:11","Apa itu Pokdarwis?":"Pokdarwis itu kelompok sadar wisata","Sebutkan 5 amenitas dasar desa wisata":"Tempat parkir, toilet, homestay","Jenis sertifikasi pemandu":"HPI"}'::jsonb,
    55, 100, '2026-08-18 08:42:11+00', 'matched'),
  ('e0000001-0000-0000-0000-000000000001', 'c2222221-2222-2222-2222-222222222222',
    '{"Email Address":"peserta.penglipuran1@atourin.id","Timestamp":"2026-09-01T09:00:15","Apa itu Pokdarwis?":"Kelompok Sadar Wisata Desa","Sebutkan 5 amenitas dasar desa wisata":"Homestay, MCK, area parkir, mushola, restoran, TIC, jalur evakuasi","Jenis sertifikasi pemandu":"HPI, BNSP"}'::jsonb,
    72, 100, '2026-09-01 09:00:15+00', 'matched'),

  -- Post-test responses
  ('e0000002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
    '{"Email Address":"peserta.wanurejo@atourin.id","Timestamp":"2026-08-17T16:30:22","SOP yang harus dimiliki homestay":"SOP welcome, SOP F&B, SOP keamanan, SOP kebersihan, SOP keluhan","Cara optimasi GBP":"Foto berkualitas, jam operasional jelas, balas semua review, posting rutin","Strategi mitigasi banjir":"SOP evakuasi, jalur evakuasi terpasang, kerjasama BPBD, asuransi tamu"}'::jsonb,
    84, 100, '2026-08-17 16:30:22+00', 'matched'),
  ('e0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"Email Address":"peserta.sari@atourin.id","Timestamp":"2026-08-17T16:35:01","SOP yang harus dimiliki homestay":"SOP welcome tamu, kebersihan, F&B, security","Cara optimasi GBP":"Posting 3x seminggu, balas review cepat, foto kualitas tinggi","Strategi mitigasi banjir":"SOP evakuasi + drill rutin + asuransi"}'::jsonb,
    88, 100, '2026-08-17 16:35:01+00', 'matched'),
  ('e0000002-0000-0000-0000-000000000002', 'c2222221-2222-2222-2222-222222222222',
    '{"Email Address":"peserta.penglipuran1@atourin.id","Timestamp":"2026-09-06T17:00:00","SOP yang harus dimiliki homestay":"SOP welcome, F&B, kebersihan, security, mitigasi gempa, multi-bahasa","Cara optimasi GBP":"Listing GBP+TripAdvisor+Booking, balas semua review dalam 24 jam, foto pro","Strategi mitigasi banjir":"SOP gempa+evakuasi+drill bulanan+kerjasama BPBD+asuransi tamu+training pemandu"}'::jsonb,
    92, 100, '2026-09-06 17:00:00+00', 'matched'),

  -- Survey kepuasan responses (no score - qualitative)
  ('e0000003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333',
    '{"Email Address":"peserta.wanurejo@atourin.id","Timestamp":"2026-08-17T18:00:11","Kepuasan keseluruhan (1-5)":"5","Kepuasan materi":"5","Kepuasan narasumber":"5","Saran perbaikan":"Materi sangat aplikatif. Berharap ada sesi follow-up online untuk konsultasi lanjutan.","Apakah merekomendasikan?":"Ya, sangat merekomendasikan"}'::jsonb,
    NULL, NULL, '2026-08-17 18:00:11+00', 'matched'),
  ('e0000003-0000-0000-0000-000000000003', 'c1111112-1111-1111-1111-111111111111',
    '{"Email Address":"peserta.jatimulyo2@atourin.id","Timestamp":"2026-08-22T18:15:00","Kepuasan keseluruhan (1-5)":"5","Kepuasan materi":"5","Kepuasan narasumber":"5","Saran perbaikan":"Sudah implementasi IG Reels, follower naik 40% dalam 2 minggu!","Apakah merekomendasikan?":"Ya"}'::jsonb,
    NULL, NULL, '2026-08-22 18:15:00+00', 'matched'),

  -- Unmatched edge case (email not in vmt.users)
  ('e0000001-0000-0000-0000-000000000001', NULL,
    '{"Email Address":"orang.luar@gmail.com","Timestamp":"2026-08-12T11:00:00","Apa itu Pokdarwis?":"Pokdar wisata"}'::jsonb,
    45, 100, '2026-08-12 11:00:00+00', 'unmatched');

-- =====================================================
-- VERIFICATION QUERIES
-- Uncomment to validate after running:
-- =====================================================
-- SELECT
--   'rapor' AS what, count(*) AS total,
--   count(*) FILTER (WHERE survey_kepuasan IS NOT NULL) AS with_survey
-- FROM vmt.rapor_peserta
-- UNION ALL SELECT 'ai_insights', count(*), NULL FROM vmt.ai_insights
-- UNION ALL SELECT 'project_gforms', count(*), NULL FROM vmt.project_gforms
-- UNION ALL SELECT 'gform_results', count(*),
--   count(*) FILTER (WHERE matched_status='matched')
-- FROM vmt.peserta_test_results;

-- Expected output:
--   rapor          | 13 | 13
--   ai_insights    | 10 | (null)
--   project_gforms |  3 | (null)
--   gform_results  | 10 |  9
