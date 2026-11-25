import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

export interface LocalModelSpec {
  id: string;
  tier: 'lite' | 'standard' | 'pro';
  fileName: string;
  sizeBytes: number;
  downloadUrl: string;
  sha256?: string;
}

export interface ModelStatus {
  id: string;
  tier: 'lite' | 'standard' | 'pro';
  fileName: string;
  modelsDir: string;
  localPath: string;
  installed: boolean;
  bundledInApp: false;
  sizeBytes: number;
  downloadUrl: string;
}

export const MODEL_CATALOG: LocalModelSpec[] = [
  {
    id: 'qwen2.5-3b-instruct-q4',
    tier: 'lite',
    fileName: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    sizeBytes: 2_100_000_000,
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
  },
  {
    id: 'qwen2.5-7b-instruct-q4',
    tier: 'standard',
    fileName: 'qwen2.5-7b-instruct-q4_k_m.gguf',
    sizeBytes: 4_680_000_000,
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf',
  },
  {
    id: 'qwen2.5-14b-instruct-q4',
    tier: 'pro',
    fileName: 'qwen2.5-14b-instruct-q4_k_m.gguf',
    sizeBytes: 8_980_000_000,
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q4_k_m.gguf',
  },
];

export function resolveModelsDir(): string {
  if (process.env.KAARJOO_MODELS_DIR) {
    return process.env.KAARJOO_MODELS_DIR;
  }
  if (process.env.KAARJOO_APP_DATA_DIR) {
    return path.join(process.env.KAARJOO_APP_DATA_DIR, 'models');
  }
  return path.join(os.homedir(), '.kaarjoo', 'models');
}

export function getModelsStatus(): ModelStatus[] {
  const modelsDir = resolveModelsDir();
  return MODEL_CATALOG.map((spec) => {
    const localPath = path.join(modelsDir, spec.fileName);
    const installed = fs.existsSync(localPath) && fs.statSync(localPath).size > 0;
    return {
      id: spec.id,
      tier: spec.tier,
      fileName: spec.fileName,
      modelsDir,
      localPath,
      installed,
      bundledInApp: false,
      sizeBytes: spec.sizeBytes,
      downloadUrl: spec.downloadUrl,
    };
  });
}

export function verifyModelSha256(filePath: string, expectedSha256: string): boolean {
  const hash = createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex').toLowerCase() === expectedSha256.toLowerCase();
}
