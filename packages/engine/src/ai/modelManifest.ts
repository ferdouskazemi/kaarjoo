import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getLlama, type Llama } from 'node-llama-cpp';
import manifestJson from './modelManifest.json' with { type: 'json' };

export type ModelRole = 'instruct' | 'embedding';
export type ModelTier = 'lite' | 'standard' | 'pro';
export type GpuBackend = 'metal' | 'cuda' | 'vulkan' | 'cpu';

export interface ModelManifestEntry {
  id: string;
  name: string;
  role: ModelRole;
  tier: ModelTier;
  languages: string[];
  repo: string;
  fileName: string;
  downloadUrl: string;
  sizeBytes: number;
  sha256: string;
  license: string;
  minRamGb: number;
  contextSize: number;
  dimensions?: number;
}

export interface ModelRuntimeStatus extends ModelManifestEntry {
  modelsDir: string;
  localPath: string;
  installed: boolean;
  partialBytes: number;
  bundledInApp: false;
}

export interface AiHardwareReport {
  platform: string;
  arch: string;
  totalRamGb: number;
  cpuCores: number;
  gpuBackend: GpuBackend;
  vramTotalBytes: number;
  vramFreeBytes: number;
  recommendedTier: ModelTier;
}

export interface DownloadProgressEvent {
  modelId: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  bytesPerSec: number;
  status: 'downloading' | 'verifying' | 'completed' | 'error';
  error?: string;
}

export const MODEL_MANIFEST: ModelManifestEntry[] = manifestJson.models as ModelManifestEntry[];

export function resolveModelsDirectory(): string {
  if (process.env.KAARJOO_MODELS_DIR) {
    return process.env.KAARJOO_MODELS_DIR;
  }
  if (process.env.KAARJOO_APP_DATA_DIR) {
    return path.join(process.env.KAARJOO_APP_DATA_DIR, 'models');
  }
  return path.join(os.homedir(), '.kaarjoo', 'models');
}

export function getModelManifestWithStatus(): ModelRuntimeStatus[] {
  const modelsDir = resolveModelsDirectory();
  return MODEL_MANIFEST.map((entry) => {
    const localPath = path.join(modelsDir, entry.fileName);
    const partPath = `${localPath}.part`;
    const installed = fs.existsSync(localPath) && fs.statSync(localPath).size === entry.sizeBytes;
    const partialBytes = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0;

    return {
      ...entry,
      modelsDir,
      localPath,
      installed,
      partialBytes,
      bundledInApp: false,
    };
  });
}

export function findInstalledModel(role: ModelRole, preferredTier?: ModelTier): ModelRuntimeStatus | undefined {
  const statuses = getModelManifestWithStatus().filter((m) => m.role === role && m.installed);
  if (statuses.length === 0) return undefined;

  if (preferredTier) {
    const exact = statuses.find((m) => m.tier === preferredTier);
    if (exact) return exact;
  }

  // Prefer higher-capability installed model when no exact tier is specified
  const order: Record<ModelTier, number> = { pro: 3, standard: 2, lite: 1 };
  return statuses.sort((a, b) => order[b.tier] - order[a.tier])[0];
}

export async function detectAiHardware(existingLlama?: Llama): Promise<AiHardwareReport> {
  const totalRamGb = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const cpuCores = os.cpus().length;
  let gpuBackend: GpuBackend = 'cpu';
  let vramTotalBytes = 0;
  let vramFreeBytes = 0;

  let llama: Llama | undefined = existingLlama;
  let createdLocal = false;
  try {
    if (!llama) {
      llama = await getLlama();
      createdLocal = true;
    }
    const rawGpu = String(llama.gpu || '').toLowerCase();
    if (rawGpu === 'metal' || rawGpu === 'cuda' || rawGpu === 'vulkan') {
      gpuBackend = rawGpu;
    }
    const vram = await llama.getVramState().catch(() => null);
    if (vram) {
      vramTotalBytes = vram.total || 0;
      vramFreeBytes = vram.free || 0;
    }
  } catch {
    gpuBackend = 'cpu';
  } finally {
    if (createdLocal && llama) {
      await llama.dispose().catch(() => {});
    }
  }

  const effectiveGb = Math.max(totalRamGb, Math.round(vramTotalBytes / (1024 * 1024 * 1024)));
  let recommendedTier: ModelTier = 'lite';
  if (effectiveGb >= 32) {
    recommendedTier = 'pro';
  } else if (effectiveGb >= 16 || gpuBackend === 'metal') {
    recommendedTier = 'standard';
  }

  return {
    platform: os.platform(),
    arch: os.arch(),
    totalRamGb,
    cpuCores,
    gpuBackend,
    vramTotalBytes,
    vramFreeBytes,
    recommendedTier,
  };
}

export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
    stream.on('error', reject);
  });
}

/**
 * Resumable, SHA-256 verified downloader for GGUF weights from Hugging Face.
 */
export async function downloadModelWithResume(
  modelId: string,
  onProgress?: (ev: DownloadProgressEvent) => void,
  signal?: AbortSignal
): Promise<ModelRuntimeStatus> {
  const entry = MODEL_MANIFEST.find((m) => m.id === modelId);
  if (!entry) {
    throw new Error(`Unknown model id '${modelId}' in manifest`);
  }

  const modelsDir = resolveModelsDirectory();
  fs.mkdirSync(modelsDir, { recursive: true });

  const finalPath = path.join(modelsDir, entry.fileName);
  const partPath = `${finalPath}.part`;

  if (fs.existsSync(finalPath) && fs.statSync(finalPath).size === entry.sizeBytes) {
    const existingSha = await computeFileSha256(finalPath);
    if (existingSha === entry.sha256.toLowerCase()) {
      onProgress?.({
        modelId,
        downloadedBytes: entry.sizeBytes,
        totalBytes: entry.sizeBytes,
        percent: 100,
        bytesPerSec: 0,
        status: 'completed',
      });
      return {
        ...entry,
        modelsDir,
        localPath: finalPath,
        installed: true,
        partialBytes: 0,
        bundledInApp: false,
      };
    }
    fs.unlinkSync(finalPath);
  }

  let existingBytes = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0;
  if (existingBytes > entry.sizeBytes) {
    fs.unlinkSync(partPath);
    existingBytes = 0;
  }

  const headers: Record<string, string> = {};
  if (existingBytes > 0) {
    headers.Range = `bytes=${existingBytes}-`;
  }

  const response = await fetch(entry.downloadUrl, { headers, signal });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to download ${entry.fileName}: HTTP ${response.status}`);
  }

  const isResumed = response.status === 206 && existingBytes > 0;
  if (!isResumed && existingBytes > 0) {
    // Server did not honor Range; restart cleanly
    fs.unlinkSync(partPath);
    existingBytes = 0;
  }

  const body = response.body;
  if (!body) {
    throw new Error('Response body is empty');
  }

  const writeStream = fs.createWriteStream(partPath, { flags: isResumed ? 'a' : 'w' });
  let downloadedBytes = existingBytes;
  const startedAt = Date.now();
  let lastEmit = 0;

  try {
    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        await new Promise<void>((resolve, reject) => {
          writeStream.write(value, (err) => (err ? reject(err) : resolve()));
        });
        downloadedBytes += value.byteLength;

        const now = Date.now();
        if (now - lastEmit >= 250 || downloadedBytes === entry.sizeBytes) {
          lastEmit = now;
          const elapsedSec = Math.max(0.001, (now - startedAt) / 1000);
          const bytesPerSec = Math.round((downloadedBytes - existingBytes) / elapsedSec);
          const percent = Math.min(100, Math.round((downloadedBytes / entry.sizeBytes) * 1000) / 10);
          onProgress?.({
            modelId,
            downloadedBytes,
            totalBytes: entry.sizeBytes,
            percent,
            bytesPerSec,
            status: 'downloading',
          });
        }
      }
    }
  } finally {
    await new Promise<void>((resolve) => writeStream.end(resolve));
  }

  onProgress?.({
    modelId,
    downloadedBytes: entry.sizeBytes,
    totalBytes: entry.sizeBytes,
    percent: 100,
    bytesPerSec: 0,
    status: 'verifying',
  });

  const actualSha = await computeFileSha256(partPath);
  if (actualSha !== entry.sha256.toLowerCase()) {
    fs.unlinkSync(partPath);
    const errMsg = `SHA-256 mismatch for ${entry.fileName}: expected ${entry.sha256}, got ${actualSha}`;
    onProgress?.({
      modelId,
      downloadedBytes,
      totalBytes: entry.sizeBytes,
      percent: 0,
      bytesPerSec: 0,
      status: 'error',
      error: errMsg,
    });
    throw new Error(errMsg);
  }

  fs.renameSync(partPath, finalPath);
  onProgress?.({
    modelId,
    downloadedBytes: entry.sizeBytes,
    totalBytes: entry.sizeBytes,
    percent: 100,
    bytesPerSec: 0,
    status: 'completed',
  });

  return {
    ...entry,
    modelsDir,
    localPath: finalPath,
    installed: true,
    partialBytes: 0,
    bundledInApp: false,
  };
}
