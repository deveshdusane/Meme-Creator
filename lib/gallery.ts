// Local gallery — persists created media in the browser via IndexedDB.
// No backend, no account, no signup. Blobs live on the user's device.

const DB_NAME = "meme-creator";
const STORE = "creations";
const VERSION = 1;

export interface Creation {
  id: string;
  type: string; // meme | sticker | gif | clip
  ext: string; // png | gif | webm
  blob: Blob;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
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

function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveCreation(
  type: string,
  ext: string,
  blob: Blob,
): Promise<string> {
  const db = await openDB();
  const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const item: Creation = { id, type, ext, blob, createdAt: Date.now() };
  await run(db, "readwrite", (s) => s.put(item));
  return id;
}

export async function allCreations(): Promise<Creation[]> {
  const db = await openDB();
  const items = await run<Creation[]>(db, "readonly", (s) => s.getAll());
  return (items || []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function removeCreation(id: string): Promise<void> {
  const db = await openDB();
  await run(db, "readwrite", (s) => s.delete(id));
}
