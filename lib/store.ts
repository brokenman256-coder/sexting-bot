import { promises as fs } from "fs";
import path from "path";

/**
 * Durable key-value storage for serverless.
 *
 * - On Netlify: Netlify Blobs (@netlify/blobs) — survives cold starts and is
 *   shared across lambda instances. SITE_ID / NETLIFY_BLOBS_CONTEXT are
 *   injected automatically by the runtime.
 * - Locally (npm run dev): files under ./data/store so dev behaves the same.
 */

const IS_NETLIFY = Boolean(
  process.env.NETLIFY ||
    process.env.SITE_ID ||
    process.env.NETLIFY_BLOBS_CONTEXT
);

const LOCAL_DIR = path.join(process.cwd(), "data", "store");

type BlobsStore = {
  get(key: string, opts?: { type?: string }): Promise<unknown>;
  set(key: string, value: string | Buffer): Promise<void>;
};

let cached: BlobsStore | null | undefined;

async function blobs(): Promise<BlobsStore | null> {
  if (cached !== undefined) return cached;
  cached = null;
  if (IS_NETLIFY) {
    try {
      const mod = await import("@netlify/blobs");
      cached = mod.getStore({
        name: "nightline-data",
        consistency: "strong",
      }) as unknown as BlobsStore;
    } catch {
      cached = null;
    }
  }
  return cached;
}

function localPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(LOCAL_DIR, safe);
}

/** Load a JSON value; null when missing. */
export async function loadJSON<T>(key: string): Promise<T | null> {
  const s = await blobs();
  if (s) {
    try {
      const v = (await s.get(key, { type: "json" })) as T | null;
      if (v != null) return v;
    } catch {
      /* fall through to local */
    }
  }
  try {
    const raw = await fs.readFile(localPath(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Persist a JSON value (Blobs when deployed, file when local). */
export async function saveJSON(key: string, value: unknown): Promise<void> {
  const payload = JSON.stringify(value);
  const s = await blobs();
  if (s) {
    try {
      await s.set(key, payload);
      return;
    } catch {
      /* fall through to local */
    }
  }
  try {
    await fs.mkdir(path.dirname(localPath(key)), { recursive: true });
    await fs.writeFile(localPath(key), payload, "utf8");
  } catch {
    // Read-only FS (e.g. serverless): memory still works for warm instances
  }
}

/** Store binary bytes (e.g. generated portrait JPEGs). */
export async function putBinary(key: string, buf: Buffer): Promise<void> {
  const s = await blobs();
  if (s) {
    await s.set(key, buf);
    return;
  }
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buf);
}

/** Read binary bytes; null when missing. */
export async function getBinary(key: string): Promise<Buffer | null> {
  const s = await blobs();
  if (s) {
    try {
      const v = (await s.get(key, { type: "arrayBuffer" })) as ArrayBuffer | null;
      if (v) return Buffer.from(v);
    } catch {
      /* fall through to local */
    }
  }
  try {
    return await fs.readFile(localPath(key));
  } catch {
    return null;
  }
}