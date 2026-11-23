import { z } from 'zod';

export const BrowserInfoSchema = z.object({
  name: z.enum(['chrome', 'msedge', 'chromium', 'brave']),
  executablePath: z.string(),
  version: z.string().optional(),
  isDefault: z.boolean().default(false),
});
export type BrowserInfo = z.infer<typeof BrowserInfoSchema>;

export const HardwareTierSchema = z.enum(['lite', 'standard', 'pro']);
export type HardwareTier = z.infer<typeof HardwareTierSchema>;

export const HardwareSpecsSchema = z.object({
  totalMemoryBytes: z.number(),
  totalMemoryGb: z.number(),
  cpuCores: z.number(),
  cpuModel: z.string(),
  isAppleSilicon: z.boolean().default(false),
  hasGpuAcceleration: z.boolean().default(false),
  gpuName: z.string().optional(),
  vramBytes: z.number().optional(),
  recommendedTier: HardwareTierSchema,
});
export type HardwareSpecs = z.infer<typeof HardwareSpecsSchema>;

export const ModelManifestEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: HardwareTierSchema,
  quantization: z.string().default('Q4_K_M'),
  downloadUrl: z.string().url(),
  filename: z.string(),
  sizeBytes: z.number(),
  sha256: z.string(),
  isMultilingual: z.boolean().default(true),
  supportsPersian: z.boolean().default(true),
});
export type ModelManifestEntry = z.infer<typeof ModelManifestEntrySchema>;
