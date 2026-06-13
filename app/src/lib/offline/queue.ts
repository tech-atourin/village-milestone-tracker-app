"use client";

// =====================================================
// Offline mutation queue (IndexedDB-backed)
// =====================================================
// Pattern:
//   1. User submits a mutation while offline
//   2. queueMutation() persists it to IndexedDB and returns
//      optimistic result (caller updates UI)
//   3. On 'online' event, flush() pumps the queue, calling
//      the registered handlers for each kind
//   4. On success, removes the entry
//
// For PWA installs where peserta uploads evidence from a
// village with patchy signal — they centang + upload,
// app says "Tersimpan, menunggu sinkronisasi", then when
// connection returns, the queue drains automatically.
// =====================================================

const DB_NAME = "vmt-offline";
const STORE = "mutations";
const VERSION = 1;

export type QueuedMutation = {
  id: string;
  kind: string; // e.g. "submit_checklist", "upload_evidence"
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    Promise.resolve(fn(store)).then(resolve, reject);
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueMutation(
  kind: string,
  payload: Record<string, unknown>,
): Promise<QueuedMutation> {
  const entry: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await withStore("readwrite", (s) => {
    s.put(entry);
  });
  return entry;
}

export async function listQueue(): Promise<QueuedMutation[]> {
  return withStore("readonly", (s) => {
    return new Promise<QueuedMutation[]>((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve(req.result as QueuedMutation[]);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  await withStore("readwrite", (s) => {
    s.delete(id);
  });
}

type Handler = (m: QueuedMutation) => Promise<void>;
const handlers = new Map<string, Handler>();

export function registerHandler(kind: string, h: Handler): void {
  handlers.set(kind, h);
}

let flushing = false;

export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (flushing) return { ok: 0, failed: 0 };
  if (!navigator.onLine) return { ok: 0, failed: 0 };
  flushing = true;
  let ok = 0;
  let failed = 0;
  try {
    const items = await listQueue();
    items.sort((a, b) => a.createdAt - b.createdAt);
    for (const m of items) {
      const h = handlers.get(m.kind);
      if (!h) continue;
      try {
        await h(m);
        await removeFromQueue(m.id);
        ok++;
      } catch (e) {
        m.attempts++;
        m.lastError = (e as Error).message;
        await withStore("readwrite", (s) => s.put(m));
        failed++;
        // Give up after 5 attempts
        if (m.attempts >= 5) {
          console.warn(`Giving up on mutation ${m.id} (${m.kind}) after 5 attempts`);
          await removeFromQueue(m.id);
        }
      }
    }
  } finally {
    flushing = false;
  }
  return { ok, failed };
}

// Auto-flush whenever connection returns
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue();
  });
}
