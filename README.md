# Village Milestone Tracker

Multi-tenant platform untuk Atourin mengelola program pendampingan desa wisata. Mendukung banyak project paralel dari berbagai mitra (Kemenpar, BUMN, Pemda, swasta) dengan tracking 3 layer: klasifikasi desa nasional, progress pendampingan, dan capacity building peserta.

---

## 📚 Documentation

Foundation docs di `docs/` — baca berurutan:

1. **[Product Overview & Roadmap](docs/01-overview-and-roadmap.md)** — vision, 3 layer measurement, role definition, phased roadmap
2. **[Data Model & ERD](docs/02-data-model.md)** — schema lengkap multi-tenant + Mermaid diagram
3. **[Module Specifications](docs/03-module-specifications.md)** — spec teknis 10 modul inti
4. **[Wireframes per Role](docs/04-wireframes-per-role.md)** — flow Atourin, Mitra, Peserta
5. **[Tech Stack & Setup](docs/05-tech-stack-and-setup.md)** — Next.js + Supabase + Claude stack + setup steps

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account (atau Supabase CLI untuk local dev)
- Anthropic API key
- (Optional) Resend untuk email, Fonnte untuk WhatsApp

### Setup

```bash
# 1. Init Supabase project
cd supabase
supabase init
supabase link --project-ref <YOUR_REF>
supabase db push          # Apply schema dari migrations/
psql $DATABASE_URL -f seed.sql   # Seed 7 topik default

# 2. Bootstrap Next.js app
cd ../app
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
npm install   # install deps dari package.json

# 3. Copy env
cp .env.local.example .env.local
# Edit .env.local dengan kredensial Supabase + Anthropic

# 4. Run
npm run dev
```

Detail step-by-step ada di [`docs/05-tech-stack-and-setup.md`](docs/05-tech-stack-and-setup.md).

---

## 🏗️ Architecture at a Glance

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 14 App (Vercel)                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Atourin  │  │  Mitra   │  │ Peserta  │  │  Public  │ │
│  │ scope    │  │  scope   │  │  (mobile)│  │ dashboard│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Supabase                                                  │
│  • Postgres (RLS multi-tenant)                            │
│  • Auth (magic link + OTP)                                │
│  • Storage (evidence, PDFs)                               │
│  • Edge Functions (GForm sync, AI, notifications, cron)   │
└──────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐    ┌─────────┐
   │ Claude  │      │ Resend  │    │ Fonnte  │
   │   API   │      │ (email) │    │  (WA)   │
   └─────────┘      └─────────┘    └─────────┘
```

---

## 🎯 Three Roles

| Role | Scope | Login Channel |
|---|---|---|
| **Atourin** (Superadmin) | Semua project, semua org | Email + password |
| **Mitra** | Project yang ditugaskan ke org-nya | Email + password / SSO |
| **Peserta** | Desa-nya di project yang diikuti | Magic link / WhatsApp OTP |

---

## 🗺️ Status Roadmap

- [ ] **Phase 0** — Foundation (auth, RBAC, project CRUD, user bulk import)
- [ ] **Phase 1** — MVP (baseline, topik, evidence, basic dashboard)
- [ ] **Phase 2** — AI + GForm sync + WhatsApp + Mobile PWA
- [ ] **Phase 3** — Klasifikasi nasional + branded reports + public dashboard
- [ ] **Phase 4** — Network effect (forum, marketplace narasumber, Jadesta integration)

---

## 📁 Project Structure

```
milestone-tracker-app/
├── docs/                # Design docs (read these first)
├── app/                 # Next.js application
└── supabase/            # DB schema, seed data, edge functions
```

---

## 🤝 Contributing

Internal Atourin project. Lihat docs/ sebagai source of truth untuk semua keputusan desain. Update docs setiap ada perubahan arsitektural.
