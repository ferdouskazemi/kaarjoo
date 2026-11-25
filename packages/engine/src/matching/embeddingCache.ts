import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

/**
 * SQLite-backed embedding vector cache.
 * Stores float32 vectors as compact BLOBs keyed by SHA-256(modelId + normalized text).
 */
export class SqliteEmbeddingCache {
  private db: DatabaseSync | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    if (dbPath) {
      this.dbPath = dbPath;
    } else if (process.env.KAARJOO_APP_DATA_DIR) {
      this.dbPath = path.join(process.env.KAARJOO_APP_DATA_DIR, 'kaarjoo.db');
    } else {
      this.dbPath = ':memory:';
    }
  }

  private ensureDb(): DatabaseSync {
    if (this.db) return this.db;
    if (this.dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(this.dbPath);
    if (this.dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embedding_vectors (
        cache_key TEXT PRIMARY KEY NOT NULL,
        model_id TEXT NOT NULL,
        dims INTEGER NOT NULL,
        vector_blob BLOB NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_embedding_vectors_model ON embedding_vectors(model_id);
    `);
    return this.db;
  }

  public static buildKey(modelId: string, text: string): string {
    return createHash('sha256').update(`${modelId}\0${text.trim()}`).digest('hex');
  }

  public get(modelId: string, text: string): Float32Array | null {
    try {
      const db = this.ensureDb();
      const key = SqliteEmbeddingCache.buildKey(modelId, text);
      const row = db
        .prepare('SELECT vector_blob, dims FROM embedding_vectors WHERE cache_key = ?')
        .get(key) as { vector_blob: Uint8Array; dims: number } | undefined;

      if (!row || !row.vector_blob) return null;
      const bytes = row.vector_blob;
      const aligned = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      return new Float32Array(aligned);
    } catch {
      return null;
    }
  }

  public set(modelId: string, text: string, vector: Float32Array): void {
    try {
      const db = this.ensureDb();
      const key = SqliteEmbeddingCache.buildKey(modelId, text);
      const blob = new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
      db.prepare(
        `INSERT INTO embedding_vectors (cache_key, model_id, dims, vector_blob, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(cache_key) DO UPDATE SET
           vector_blob = excluded.vector_blob,
           dims = excluded.dims,
           created_at = excluded.created_at`
      ).run(key, modelId, vector.length, blob);
    } catch {
      // Non-fatal cache write error
    }
  }

  public count(modelId?: string): number {
    const db = this.ensureDb();
    if (modelId) {
      const row = db.prepare('SELECT count(*) as c FROM embedding_vectors WHERE model_id = ?').get(modelId) as {
        c: number;
      };
      return row.c;
    }
    const row = db.prepare('SELECT count(*) as c FROM embedding_vectors').get() as { c: number };
    return row.c;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const defaultEmbeddingCache = new SqliteEmbeddingCache();
