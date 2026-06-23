# PWA Offline Sync — Reference & Recovery

> Konteks: peserta di desa dengan sinyal patchy harus tetap bisa centang
> checklist + upload bukti, lalu otomatis tersinkron saat sinyal kembali.

## Arsitektur singkat

```
[ User submit ]
      │
      ▼
queueMutation(kind, payload)  ──► IndexedDB (vmt-offline / mutations)
      │
      ▼  UI optimistic: "Tersimpan, menunggu sinkronisasi"
      │
      ▼  navigator 'online' event → flushQueue()
      │
      ▼
handler(kind) per-kind callable di src/lib/offline/handlers.ts
      │
      ▼
Server action → Supabase
```

File terkait:
- `src/lib/offline/queue.ts` — IndexedDB CRUD + flush loop
- `src/lib/offline/handlers.ts` — registrasi handler per kind
- `src/components/sw-register.tsx` — service worker registration
- `public/sw.js` — service worker (cache-first untuk shell, network-first untuk API)
- `public/manifest.json` — PWA manifest (name, icons, start_url, theme_color)

## Kind yang sudah terdaftar

| kind                 | payload                                                  | handler            |
|----------------------|----------------------------------------------------------|--------------------|
| `submit_checklist`   | `{ project_desa_id, checklist_item_id, status, note }`   | submitChecklist    |
| `upload_evidence`    | `{ project_desa_id, checklist_item_id, base64, name }`   | uploadEvidence     |
| `update_checklist`   | `{ id, status, note }`                                   | updateChecklist    |

Tambah kind baru: panggil `registerHandler('kind_name', async (m) => {...})`
di handler module + import di `src/app/layout.tsx` agar registrasi terjadi
pre-flush.

## Retry & give-up

- Setiap entry punya `attempts` counter; gagal naik 1, sukses → di-delete
- **Cap 5 attempts**, lalu entry di-drop dengan warning di console
- Dalam mode partial-failure (sebagian sukses), `flushQueue()` return
  `{ok, failed}` untuk UI toast

## Auto-flush triggers

1. `window.online` event (otomatis ketika konektivitas balik)
2. Mount `<SwRegister>` di root layout — call `flushQueue()` saat mount
   (gunakan untuk re-coverage bila user reload halaman)
3. Manual: setiap halaman peserta yang submit dapat panggil `flushQueue()`
   setelah `queueMutation()` (no-op kalau offline)

## Verifikasi manual (dev)

1. Buka DevTools → Application → Service Workers, pastikan `sw.js` aktif
2. Application → IndexedDB → `vmt-offline` → `mutations` — store kosong
3. Toggle offline (DevTools → Network → Offline)
4. Submit checklist dari `/peserta/projects/[id]` → store harusnya berisi 1 entry
5. Toggle online → entry hilang dalam ~1 detik
6. Toast/banner: "Sinkronisasi sukses"

## Recovery — entry stuck

Kalau handler bug menyebabkan entry retry terus:

```js
// di console
const r = indexedDB.open('vmt-offline');
r.onsuccess = () => {
  const db = r.result;
  const tx = db.transaction('mutations', 'readwrite');
  tx.objectStore('mutations').clear();
  console.log('Cleared queue');
};
```

Atau dari React DevTools: `import('@/lib/offline/queue').then(m => m.listQueue()).then(console.log)`.

## Recovery — service worker stuck pakai versi lama

User report "fitur baru belum muncul padahal saya sudah refresh":

1. DevTools → Application → Service Workers → centang "Update on reload"
2. Klik "Unregister" lalu reload
3. Atau via UI: tombol "Cek update" di /profile (TODO: tambahkan kalau perlu)

Saat ini `sw.js` versioned by build hash; new build → SW byte-changes → browser
trigger update lifecycle otomatis. Tapi user di mobile kadang harus close-reopen
PWA untuk pickup.

## Catatan deployment

- Pastikan `sw.js` di-serve dengan `Cache-Control: no-cache` agar update cepat
- Manifest `start_url` harus match `/` (sudah)
- Icon harus tersedia di 192 + 512 + maskable variants (sudah di `public/logo/vmt/`)
- iOS Safari butuh `apple-touch-icon` (cek `app/layout.tsx`)

## Smoke-test checklist (verifikasi prod)

- [ ] Install PWA di Chrome desktop → buka offline → submit checklist → online → entry sync
- [ ] Install PWA di Android Chrome → idem
- [ ] iOS Safari "Add to Home Screen" → idem (note: iOS limit storage ~50MB)
- [ ] Bukti foto 5MB via offline queue → kompresi otomatis ke ~500KB sebelum upload
- [ ] Multi-entry: 3 checklist queued berurutan → flush berurutan tidak ada race
- [ ] Logout saat queue belum kosong → entry tetap di IDB (per-device, bukan per-user)

Bila ada bug yang membuat queue corrupt, gunakan blok Recovery di atas; jangan
manipulasi langsung lewat Supabase (tidak akan kena queue lokal).
