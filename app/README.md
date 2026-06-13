# Milestone Tracker — App

Next.js 14 application untuk Village Milestone Tracker.

## Quick Start

```bash
# 1. Install deps (yang ada di package.json sudah disesuaikan untuk project ini)
npm install

# 2. Copy env
cp .env.local.example .env.local
# Edit dengan kredensial Supabase + Anthropic

# 3. Generate types dari Supabase schema (setelah migration di-apply)
npm run supabase:types

# 4. Run dev server
npm run dev
```

## First-time Setup Checklist

- [ ] Project Supabase sudah di-create
- [ ] Migration `0001_initial_schema.sql` sudah di-apply via `supabase db push`
- [ ] Seed data `seed.sql` sudah di-run
- [ ] Auth providers (Email magic link) enabled di Supabase Dashboard
- [ ] Storage buckets created: `evidence`, `pdf-exports`, `avatars`
- [ ] Storage RLS configured (lihat docs/05)
- [ ] `.env.local` terisi dengan kredensial valid
- [ ] Test create user superadmin pertama via SQL:

```sql
-- Setelah daftar via Auth, promote ke superadmin:
update users set global_role = 'superadmin', organization_id = '00000000-0000-0000-0000-000000000001'
where email = 'rivo@atourin.com';
```

## Folder Structure

Detail ada di `../docs/05-tech-stack-and-setup.md`.

## Development Workflow

1. Update schema → tulis migration baru di `../supabase/migrations/`
2. Apply: `supabase db push`
3. Regen types: `npm run supabase:types`
4. Update spec di `../docs/03-module-specifications.md` kalau ada perubahan modul
