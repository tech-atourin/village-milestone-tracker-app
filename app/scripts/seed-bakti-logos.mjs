#!/usr/bin/env node
// One-shot: upload Kemenpar + VMT logos sebagai dummy extra_logos untuk
// BAKTI Komdigi project. Idempotent: hapus existing logos dulu.
// Pakai Storage REST API (skip supabase-js karena Node 20 + realtime ws issue).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing supabase env");
  process.exit(1);
}

const PROJECT_ID = "69e036cf-605c-48a1-bc8c-cf37c8df22f1";
const BUCKET = "vmt-evidence";
const LOGOS = [
  {
    file: "public/logo/mitra/kemenparekraf.png",
    label: "Kementerian Pariwisata",
    mime: "image/png",
  },
  {
    file: "public/logo/vmt/vmt-app-icon-192.png",
    label: "VMT by Atourin",
    mime: "image/png",
  },
];

const rest = (path, init = {}) =>
  fetch(`${URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      "Accept-Profile": "vmt",
      "Content-Profile": "vmt",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

// 1) Fetch existing extra_logos
const r1 = await rest(
  `/projects?id=eq.${PROJECT_ID}&select=extra_logos`,
);
if (!r1.ok) {
  console.error("Read failed:", r1.status, await r1.text());
  process.exit(1);
}
const [{ extra_logos: existing = [] } = {}] = await r1.json();

// 2) Delete existing storage objects
if (existing.length > 0) {
  console.log(`Removing ${existing.length} existing logos...`);
  const r = await fetch(`${URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: existing.map((l) => l.path) }),
  });
  if (!r.ok) console.warn("Storage delete warn:", r.status, await r.text());
}

// 3) Upload new logos
const uploaded = [];
for (const l of LOGOS) {
  const bytes = readFileSync(resolve(l.file));
  const basename = l.file.split("/").pop();
  const path = `project-logos/${PROJECT_ID}/${Date.now()}-${basename}`;
  const r = await fetch(
    `${URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": l.mime,
        "x-upsert": "true",
      },
      body: bytes,
    },
  );
  if (!r.ok) {
    console.error(`Upload failed ${l.file}:`, r.status, await r.text());
    process.exit(1);
  }
  uploaded.push({ path, label: l.label });
  console.log(`✓ Uploaded ${l.label} → ${path}`);
}

// 4) Update projects.extra_logos
const r2 = await rest(`/projects?id=eq.${PROJECT_ID}`, {
  method: "PATCH",
  body: JSON.stringify({ extra_logos: uploaded }),
});
if (!r2.ok) {
  console.error("Update failed:", r2.status, await r2.text());
  process.exit(1);
}
console.log(`\n✓ Set ${uploaded.length} extra logos on BAKTI project`);
