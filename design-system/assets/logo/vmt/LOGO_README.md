# Village Milestone Tracker — Logo System

## Konsep

Logo VMT memvisualkan **4 jenjang klasifikasi desa wisata** (Rintisan → Berkembang → Maju → Mandiri) sebagai 4 batang naik. Garis kuning yang menyambungkan puncak masing-masing batang adalah **jalur milestone**, dan **pin** di puncak adalah penanda pencapaian — sekaligus mempertahankan DNA Atourin (location pin).

```
                    📍 Pin (achievement marker)
                   ╱
              ●───╱
         ●───╱
    ●───╱
●───╱
█   █   █   █     ← 4 ascending bars
R   B   M   M     (Rintisan, Berkembang, Maju, Mandiri)
```

## Color Tokens (dari `atr-tokens.css`)

| Token | Hex | Pakai untuk |
|---|---|---|
| `--atr-purple` | `#7068D5` | Primary brand color, bars di mark |
| Gradient | `#7E76DD → #574BAE` | App icon background (sama dengan Hub Atourin) |
| `--atr-yellow` | `#FFC442` | Milestone path, achievement pin, accent |
| `--atr-text` | `#58595B` | Wordmark "Milestone" |
| `--atr-text-muted` | `#8A8B8D` | Overline "VILLAGE" |

## Font

**Product Sans** (terdaftar di `atr-tokens.css`). Wordmark SVG sudah pakai `font-family: "Product Sans"` dengan fallback system-ui jika font tidak terload.

## File Inventory

| File | Use case |
|---|---|
| `vmt-app-icon.svg` | App icon umum (PWA, favicon, launcher) — 512×512 dengan rounded square purple gradient |
| `vmt-app-icon-maskable.svg` | Android adaptive icon (maskable spec, full-bleed safe zone) |
| `vmt-mark.svg` | Standalone mark untuk header/inline pada **light background** |
| `vmt-mark-mono.svg` | Single-color version, pakai `currentColor` — cocok untuk print, embossing, monochrome |
| `vmt-wordmark.svg` | Lockup mark + "Village / Milestone Tracker" pada **light background** |
| `vmt-wordmark-onpurple.svg` | Lockup pada **purple/dark background** (mark putih, "Tracker" kuning) |

## Usage Rules

### ✅ Do

- Pakai `vmt-app-icon.svg` untuk PWA, favicon, OS launcher
- Pakai `vmt-wordmark.svg` di header aplikasi pada background terang
- Pakai `vmt-wordmark-onpurple.svg` di hero section atau login page dengan purple background
- Jaga clear space minimum: **width 1 bar** di semua sisi mark
- Minimum size mark: 24px (digital), 8mm (print)
- Minimum size wordmark: 120px lebar

### ❌ Don't

- Jangan ubah warna mark di luar token resmi
- Jangan stretch atau distort proporsi
- Jangan tambah drop shadow di luar yang sudah ada di file
- Jangan letakkan mark di atas foto/pattern busy tanpa background card
- Jangan ganti font wordmark di luar Product Sans

## Implementasi di Aplikasi

### Next.js (favicon + PWA)

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: "Village Milestone Tracker",
  icons: {
    icon: "/icons/vmt-app-icon.svg",
    apple: "/icons/vmt-app-icon.svg",
  },
  manifest: "/manifest.json",
};
```

```json
// public/manifest.json
{
  "name": "Village Milestone Tracker",
  "short_name": "VMT",
  "icons": [
    {
      "src": "/icons/vmt-app-icon-maskable.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "maskable any"
    }
  ],
  "theme_color": "#7068D5",
  "background_color": "#FFFFFF"
}
```

### Header Component

```tsx
// Light header
<Image src="/logo/vmt-wordmark.svg" alt="Village Milestone Tracker" width={240} height={60} />

// Purple header (login page, etc)
<Image src="/logo/vmt-wordmark-onpurple.svg" alt="Village Milestone Tracker" width={240} height={60} />
```

### Inline mark in tight space (mobile header, breadcrumb)

```tsx
<Image src="/logo/vmt-mark.svg" alt="VMT" width={32} height={32} />
```

## Relationship to Atourin Brand

Logo VMT adalah **sub-brand** dari Atourin. Tidak menggantikan logo Atourin utama. Pada interface yang punya context "by Atourin" (mis. footer mitra report), sandingkan dengan `atourin-wordmark.png` di footer dengan separator "powered by".

```
[VMT Wordmark]                          powered by [Atourin Wordmark]
```

## Generating PNG/ICO

SVG bisa di-convert ke PNG dengan tool seperti `rsvg-convert`, ImageMagick, atau online (CloudConvert):

```bash
# Generate favicon set
rsvg-convert -w 32 vmt-app-icon.svg > vmt-favicon-32.png
rsvg-convert -w 192 vmt-app-icon.svg > vmt-icon-192.png
rsvg-convert -w 512 vmt-app-icon.svg > vmt-icon-512.png
```
