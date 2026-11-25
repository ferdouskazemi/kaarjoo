-- Migration for Local AI Embedding Vector Cache
CREATE TABLE IF NOT EXISTS embedding_vectors (
    cache_key TEXT PRIMARY KEY NOT NULL,
    model_id TEXT NOT NULL,
    dims INTEGER NOT NULL,
    vector_blob BLOB NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embedding_vectors_model ON embedding_vectors(model_id);
