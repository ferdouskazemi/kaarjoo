import os from 'node:os';
import { StdioRpcServer } from './rpc.js';
import { discoverSystemBrowsers } from './utils/discovery.js';
import { processAndExtractProfile } from './ingestion/pipeline.js';
import { mergeProfiles } from './ingestion/merger.js';
import { HardwareSpecs } from '@kaarjoo/shared';

const server = new StdioRpcServer();

// Ping
server.register('system.ping', () => ({
  status: 'ok',
  timestamp: Date.now(),
  platform: os.platform(),
  arch: os.arch(),
}));

// Browser Discovery (Adapted from open-antigravity-patcher heuristics)
server.register('system.discoverBrowsers', () => {
  return discoverSystemBrowsers();
});

// Profile Extraction
server.register('profile.parseAndExtract', async (params: { filePath: string }) => {
  return processAndExtractProfile(params.filePath);
});

// Profile Merging
server.register('profile.merge', (params: { profiles: any[]; sourceNames?: string[] }) => {
  return mergeProfiles(params.profiles, params.sourceNames);
});

// Hardware specs and AI tier recommendation
server.register('system.getHardwareSpecs', (): HardwareSpecs => {
  const totalMemoryBytes = os.totalmem();
  const totalMemoryGb = Math.round(totalMemoryBytes / (1024 * 1024 * 1024));
  const cpus = os.cpus();
  const cpuCores = cpus.length;
  const cpuModel = cpus[0]?.model || 'Unknown CPU';
  const isAppleSilicon = os.platform() === 'darwin' && os.arch() === 'arm64';

  let recommendedTier: 'lite' | 'standard' | 'pro' = 'lite';
  if (totalMemoryGb >= 32) {
    recommendedTier = 'pro';
  } else if (totalMemoryGb >= 16 || isAppleSilicon) {
    recommendedTier = 'standard';
  }

  return {
    totalMemoryBytes,
    totalMemoryGb,
    cpuCores,
    cpuModel,
    isAppleSilicon,
    hasGpuAcceleration: isAppleSilicon, // On Apple Silicon Metal is always available
    recommendedTier,
  };
});

// Start listening on stdio
server.start();

// Handle graceful termination
process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  server.stop();
  process.exit(0);
});

export { server };
