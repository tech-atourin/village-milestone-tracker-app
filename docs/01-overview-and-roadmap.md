# Village Milestone Tracker — Product Overview & Roadmap

> Sistem multi-tenant untuk Atourin mengelola program pendampingan desa wisata, dengan fleksibilitas tinggi sehingga satu platform bisa mengakomodir berbagai jenis program (Kemenpar, BUMN, Pemda, swasta).

---

## 1. Problem Statement

Sistem pendampingan lama (mis. ADWI Kemenpar) bersifat **report-centric** — fokus utama dokumentasi kegiatan untuk laporan. Akibatnya:

- Sulit melihat **progress desa naik kelas** secara real-time.
- Tiap project baru harus rebuild sistem dari nol karena tidak fleksibel.
- Mitra/pemilik dana tidak punya visibility tanpa diberi laporan manual.
- Peserta tidak punya "rapor" individual untuk capacity building.
- Tidak ada institutional memory — peserta yang ikut multiple project tidak punya track record terkonsolidasi.

## 2. Vision

> **One platform, many programs.** Atourin bisa launch project pendampingan baru dalam hitungan jam (bukan minggu), dengan modul fleksibel yang menyesuaikan kebutuhan tiap mitra. Desa, mitra, dan peserta semua punya dashboard sendiri yang relevan dengan peran mereka.

## 3. Tiga Layer Pengukuran (Konsep Inti)

Sistem ini melacak tiga hal yang independen tapi saling terkait:

| Layer | Subjek | Sumber Data | Output |
|---|---|---|---|
| **Desa Classification** | Desa | Checklist kriteria nasional (Permenparekraf) + evidence terverifikasi | Tier: Rintisan / Berkembang / Maju / Mandiri |
| **Pendampingan Progress** | Desa (kolektif) | Checklist 7 topik materi (Kelembagaan, Produk Wisata, Amenitas, Pemasaran, Resiliensi, Ekraf, Keuangan) + evidence + feedback Atourin | % completion per topik, status keseluruhan project |
| **Capacity Building** | Peserta (individu) | Pre-test, Post-test, Survei via Google Form (auto-sync) | RAPOR per peserta + agregat per desa/project |

**Evidence reusable**: satu file upload bisa di-tag ke checklist topik **dan** checklist kriteria nasional sekaligus. Peserta tidak perlu upload bolak-balik.

## 4. Role & Permission

| Role | Scope | Kemampuan Utama |
|---|---|---|
| **Superadmin (Atourin)** | Semua project | Create project, define template, kelola user, review evidence, AI insight, branding mitra |
| **Mitra** | Subset project yang ditugaskan | Lihat progress project, download report, lihat RAPOR peserta agregat, kelola peserta di project-nya |
| **Peserta** | Desa-nya sendiri di project yang diikuti | Centang checklist, upload evidence, isi GForm, lihat progress desa, lihat RAPOR pribadi (lintas project) |
| **Pendamping/Narasumber** *(role tambahan)* | Project yang ditugaskan | Input laporan sesi, kasih feedback ke checklist peserta, kelola materi |

Superadmin & Mitra bisa **create peserta** (single atau bulk via Excel import).

## 5. Modul Inti

1. **Project Management** — template-based, define modul yang aktif per project
2. **User Management** — multi-role, bulk import, history peserta lintas project
3. **Desa Baseline** — form builder dinamis, profil lengkap desa
4. **Topik Pendampingan** — 7 default (Kelembagaan, Produk Wisata, Amenitas, Pemasaran, Resiliensi, Ekraf, Keuangan) + custom, checklist template dari literatur, dapat ditambah/dikurang
5. **Evidence Management** — upload, tag ke multiple checklist, geotag, feedback Atourin
6. **Milestone & Klasifikasi Desa** — engine scoring tier nasional *(stub sampai Permenparekraf terbit)*
7. **Capacity Building (RAPOR Peserta)** — sync Google Form, generate rapor PDF per peserta per project
8. **AI Insight Engine** — summary kondisi desa, recommendation, stagnation flag, evidence auto-review
9. **Reporting & Export** — branded PDF/Excel, public shareable dashboard, comparison antar desa/cohort
10. **Notification** — WhatsApp + email reminder

## 6. Roadmap

### Phase 0 — Foundation *(4–6 minggu)*

**Goal**: Multi-tenant skeleton dengan auth & RBAC siap.

- Setup Next.js + Supabase + folder structure
- Schema: users, projects, project_memberships, RBAC policies (RLS)
- Auth flow: email + magic link (untuk peserta di desa yang sulit password)
- Basic dashboard per role (kosong, struktur saja)
- User Management + Bulk Import Excel

**Deliverable check**: Atourin bisa create project, invite Mitra, bulk-import 50 peserta dari Excel, dan semua bisa login dengan scope masing-masing.

---

### Phase 1 — MVP Inti *(8–10 minggu)*

**Goal**: 1 project pendampingan bisa berjalan end-to-end.

- **Project template engine** — Atourin bikin template "ADWI-style", "BUMDes Wisata", dll, dengan preset modul aktif + topik default
- **Desa Baseline** — form builder + 53-an field dari referensi ADWI sebagai template default
- **Topik Pendampingan** — 7 topik default + checklist template + custom per project
- **Evidence Management** — upload file/foto/video, tagging multi-checklist, status approval (pending/approved/rejected) + feedback
- **Capacity Building basic** — manual entry RAPOR (sebelum GForm sync di Phase 2)
- **Dashboard progress per desa** — % topik, list checklist outstanding, evidence pending review

**Deliverable check**: Atourin onboarding 1 project real dengan 5–10 desa, peserta upload evidence, Atourin review & feedback, semua progress visible di dashboard.

---

### Phase 2 — Differentiation *(6–8 minggu)*

**Goal**: Scaling ke banyak project paralel dengan effort rendah + diferensiasi vs sistem manual.

- **Google Forms sync** — auto-pull respon test/survei, match peserta by email/NIK
- **AI Summary & Recommendation** — Claude API untuk auto-generate kesimpulan kondisi desa + rekomendasi tindak lanjut
- **WhatsApp notification** — reminder deadline, feedback masuk, weekly digest
- **Mobile PWA + offline mode** — peserta upload evidence di lapangan tanpa sinyal, sync saat online
- **RAPOR generator** — template PDF branded per mitra, auto-fill dari skor test

**Deliverable check**: 3 project paralel jalan, peserta di desa pakai HP, AI summary muncul di dashboard Mitra, RAPOR auto-generate dengan logo mitra.

---

### Phase 3 — Sponsor & Insight *(4–6 minggu)*

**Goal**: Tools yang bikin Mitra/sponsor renewal & rekomendasi.

- **Milestone & Klasifikasi Desa engine** — implement penuh saat Permenparekraf terbit
- **Public shareable dashboard** — link publik per project untuk sponsor, no-login
- **Comparison & cohort analysis** — bandingkan desa dalam project, atau cohort 2024 vs 2025
- **Branded export** — PDF/Excel laporan akhir per project dengan logo mitra
- **Audit trail lengkap** — siapa ubah apa kapan (compliance untuk project pemerintah)

**Deliverable check**: Mitra ekspor laporan akhir tahun yang ready-to-present, sponsor lihat dashboard publik tanpa diminta laporan manual.

---

### Phase 4 — Network Effect *(ongoing)*

**Goal**: Sistem jadi ekosistem, bukan tool.

- **Peer learning forum** — peserta antar desa diskusi
- **Narasumber marketplace** — desa request mentor sesuai topik
- **Integrasi Jadesta** — auto-pull baseline desa
- **AI Pendamping Assistant** — suggest intervensi berdasarkan project sebelumnya yang mirip (institutional memory)
- **API publik** — mitra integrate ke sistem internal mereka

## 7. Asumsi Penting

- **Klasifikasi nasional** (Rintisan/Berkembang/Maju/Mandiri) belum punya regulasi resmi. Stub disiapkan, implement saat Permenparekraf terbit.
- **Peserta lintas project** — User entity unik, ProjectParticipation sebagai join. History melekat di profil peserta.
- **Bulk import** — Superadmin & Mitra dapat akses ke template Excel + import flow.
- **Multi-tenant data isolation** dipakai sejak Phase 0 (Row Level Security di Supabase).

## 8. Non-Goal (untuk versi awal)

- ❌ Built-in video conferencing untuk sesi pendampingan (pakai Zoom/Meet)
- ❌ E-learning module penuh (LMS) — cukup attach materi PDF/video link
- ❌ Marketplace transaksi desa wisata (di luar scope tracker)
- ❌ Native mobile app — PWA cukup untuk Phase 1–3
