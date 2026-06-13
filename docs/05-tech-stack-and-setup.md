# Tech Stack & Project Setup

> Rekomendasi stack + skeleton project siap-clone. Pilihan dibuat untuk **velocity tinggi**, **multi-tenant aman**, dan **scaling sampai 10k peserta** tanpa rewrite.

---

## 1. Tech Stack Recommendation

### Core Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR untuk SEO public dashboard, server actions untuk mutation, React Server Components untuk performance |
| **UI Library** | Tailwind CSS + shadcn/ui | Velocity tinggi, customizable, banyak komponen ready (DataTable, Form, Dialog) |
| **Backend** | Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) | Multi-tenant via RLS, auth built-in, storage untuk evidence, edge function untuk cron & sync |
| **AI** | Google Gemini API (gemini-2.5-flash + gemini-2.5-flash-lite) | **Free tier** untuk MVP. Flash untuk summary quality, Flash-Lite untuk volume (evidence review, batch). Bisa swap ke Claude/OpenAI nanti via abstraction layer. |
| **Forms** | react-hook-form + zod | Type-safe validation, performant |
| **Tables** | TanStack Table | Powerful, sorting/filtering/pagination |
| **Charts** | Recharts | Cocok dengan React, ringan |
| **PDF Generation** | React-PDF (@react-pdf/renderer) atau Puppeteer | React-PDF untuk RAPOR (template stable), Puppeteer untuk laporan kompleks |
| **Excel** | SheetJS (xlsx) | Import/export Excel di server + client |
| **Notification** | Resend (email) + Fonnte (WhatsApp Indonesia) | Resend cheap & developer-friendly; Fonnte localized |

### Why Supabase (vs custom backend)?

- **Multi-tenant RLS** — built-in row level security, ngehindarin bug data leak antar org
- **Auth lengkap** — magic link, OTP, OAuth, semua siap. Kritis untuk peserta yang gak biasa password
- **Storage** — file evidence langsung simpan, signed URL, CDN
- **Edge Functions** — cron sync GForm + AI inference tanpa server terpisah
- **Realtime** — Phase 4 untuk peer learning forum
- **Postgres murni** — bisa migrate ke self-host nanti tanpa lock-in

### Deployment

- **Frontend**: Vercel (Next.js native) atau Cloudflare Pages
- **Backend**: Supabase Cloud (kalau scale > $25/mo bisa pindah ke self-host)
- **CDN**: included di Vercel + Supabase

### Cost Estimate (Phase 1–2, ~10 projects, ~500 peserta)

| Item | Monthly |
|---|---|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| Gemini API (MVP scale, free tier) | $0 |
| Fonnte WhatsApp (5k message/mo) | ~$15 |
| Resend (10k email/mo) | $20 |
| Domain | $1 |
| **Total** | **~$80/mo** |

Scaling ke 10k peserta: estimasi $200–400/mo (Gemini Pay-as-You-Go masuk).

**Free tier Gemini caveat**: Flash 10 RPM / 250 RPD, Flash-Lite 15 RPM / 1000 RPD. Cukup untuk ~50 desa skala MVP. Mulai berbayar saat scaling — pricing Gemini Flash $0.075/1M input token, Flash-Lite lebih murah lagi. Cek halaman pricing terbaru di [ai.google.dev/pricing](https://ai.google.dev/pricing).

---

## 2. Folder Structure

```
milestone-tracker-app/
├── docs/                           # All design docs (yang saya bikin)
├── app/                            # Next.js application
│   ├── src/
│   │   ├── app/                   # App Router
│   │   │   ├── (auth)/            # public auth pages
│   │   │   │   ├── login/
│   │   │   │   └── magic-link/
│   │   │   ├── (atourin)/         # superadmin scope
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   │   ├── new/
│   │   │   │   │   └── [projectId]/
│   │   │   │   │       ├── desa/[desaId]/
│   │   │   │   │       ├── topik/
│   │   │   │   │       ├── peserta/
│   │   │   │   │       └── evidence/
│   │   │   │   ├── templates/
│   │   │   │   └── users/
│   │   │   ├── (mitra)/           # mitra scope
│   │   │   │   ├── dashboard/
│   │   │   │   └── projects/[projectId]/
│   │   │   ├── (peserta)/         # peserta scope (mobile-first)
│   │   │   │   ├── home/
│   │   │   │   ├── topik/
│   │   │   │   ├── checklist/[itemId]/
│   │   │   │   ├── evidence/
│   │   │   │   └── profile/
│   │   │   ├── (public)/          # public shareable dashboard
│   │   │   │   └── [slug]/
│   │   │   └── api/               # API routes (webhooks, gform sync)
│   │   ├── components/
│   │   │   ├── ui/                # shadcn components
│   │   │   ├── forms/             # form builder + reusable forms
│   │   │   ├── tables/            # data tables
│   │   │   ├── charts/
│   │   │   └── domain/            # business components (ChecklistCard, EvidenceTagger, etc)
│   │   ├── lib/
│   │   │   ├── supabase/          # client & server clients
│   │   │   ├── ai/                # Claude API wrapper + prompts
│   │   │   ├── pdf/               # RAPOR generator
│   │   │   ├── excel/             # bulk import logic
│   │   │   ├── notification/      # email + whatsapp
│   │   │   └── auth/              # RBAC helpers
│   │   ├── server/
│   │   │   ├── actions/           # Next.js Server Actions
│   │   │   ├── queries/           # data fetching helpers
│   │   │   └── policies/          # RBAC policy functions
│   │   └── types/                 # shared TS types
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── .env.local.example
├── supabase/
│   ├── migrations/                # schema migrations
│   │   └── 0001_initial_schema.sql
│   ├── functions/                 # Edge Functions
│   │   ├── sync-gform/
│   │   ├── generate-summary/
│   │   ├── send-notification/
│   │   └── stagnation-check/
│   └── seed.sql                   # 7 topik default + checklist starter
└── README.md
```

---

## 3. Environment Variables (`.env.local.example`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Notification
RESEND_API_KEY=re_...
FONNTE_API_KEY=...
FONNTE_DEVICE_TOKEN=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Atourin Milestone Tracker"
```

---

## 4. Setup Steps

### 4.1 Bootstrap

```bash
cd milestone-tracker-app/app
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
npx shadcn-ui@latest init
```

### 4.2 Install Core Deps

```bash
npm install \
  @supabase/supabase-js @supabase/ssr \
  @anthropic-ai/sdk \
  react-hook-form @hookform/resolvers zod \
  @tanstack/react-table \
  recharts \
  xlsx \
  resend \
  date-fns \
  lucide-react

# shadcn components yang sering dipakai
npx shadcn-ui@latest add button input form dialog dropdown-menu toast \
  table card badge tabs avatar select textarea checkbox \
  alert progress sheet command popover
```

### 4.3 Setup Supabase

```bash
# Install CLI
npm install -g supabase

# Login & link project
supabase login
supabase init
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# Seed default templates
psql $DATABASE_URL -f supabase/seed.sql
```

### 4.4 Initial Supabase Project Setup

Di Supabase Dashboard:
1. Enable Auth providers: Email magic link + OTP SMS (opsional)
2. Create storage bucket: `evidence` (private), `pdf-exports` (private), `avatars` (public)
3. Setup storage RLS untuk evidence (hanya scope project)
4. Configure email templates dengan branding

### 4.5 Develop

```bash
npm run dev
# Open http://localhost:3000
```

---

## 5. Auth & RBAC Implementation

### 5.1 Auth Flow

```typescript
// Magic link login (primary untuk peserta)
// /app/(auth)/login/actions.ts
'use server';
export async function sendMagicLink(email: string) {
  const supabase = createServerClient();
  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` }
  });
}
```

### 5.2 Middleware Route Protection

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public routes
  if (path.startsWith('/public') || path.startsWith('/(auth)')) return response;

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Scope guard: redirect based on global_role
  const { data: profile } = await supabase.from('users').select('global_role').eq('id', user.id).single();

  if (path.startsWith('/(atourin)') && profile?.global_role !== 'superadmin') {
    return NextResponse.redirect(new URL('/forbidden', request.url));
  }

  return response;
}
```

### 5.3 RBAC Helper

```typescript
// lib/auth/rbac.ts
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('project_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('status', 'active')
    .maybeSingle();
  return !!data;
}

export async function getProjectRole(userId: string, projectId: string) {
  // returns 'superadmin' | 'mitra_admin' | 'peserta' | 'pendamping' | null
  // superadmin global always returns 'superadmin'
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

- Vitest untuk business logic (scoring engine, matching peserta)
- Test policy functions secara isolated

### 6.2 Integration Tests

- Playwright untuk end-to-end (3 role: login → action utama)
- Supabase local stack untuk testing dengan DB real

### 6.3 Manual QA Scenarios (Phase 1)

1. Atourin create project from template
2. Bulk import 50 peserta dari Excel
3. Peserta login via magic link, isi baseline, centang checklist + upload evidence
4. Atourin review + approve
5. Mitra lihat dashboard read-only
6. Generate report PDF

---

## 7. Performance Considerations

- **Server Components default** — fetch di server, kirim HTML ringan
- **Image optimization** — Next/Image untuk evidence thumbnail
- **Pagination wajib** — semua list >50 item
- **DB indexes** — sudah didefinisikan di data model doc
- **Edge Function timeout** — sync GForm chunked per 100 row
- **CDN evidence** — public read signed URL dengan expiry

---

## 8. Security Checklist

- [ ] RLS enabled di SEMUA tabel
- [ ] Service role key tidak pernah exposed ke client
- [ ] File upload validate MIME type + size di server
- [ ] Rate limit pada API routes (Upstash atau Vercel rate-limit)
- [ ] Audit log enabled untuk destructive actions
- [ ] CORS strict — hanya domain Atourin
- [ ] CSP header di Next config
- [ ] Backup Supabase scheduled daily

---

## 9. Monitoring & Observability

- **Error tracking**: Sentry (free tier cukup awal)
- **Analytics**: PostHog (self-hostable) atau Plausible
- **DB metrics**: Supabase built-in dashboard
- **AI cost tracking**: log token usage per insight ke `ai_insights.metadata`
