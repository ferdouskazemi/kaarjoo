import os from 'node:os';
import { StdioRpcServer } from './rpc.js';
import { discoverSystemBrowsers } from './utils/discovery.js';
import { processAndExtractProfile } from './ingestion/pipeline.js';
import { mergeProfiles } from './ingestion/merger.js';
import { defaultJobSourcesManager } from './sources/handler.js';
import { defaultMatchingService } from './matching/handler.js';
import type { HardwareSpecs } from '@kaarjoo/shared';

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
    hasGpuAcceleration: isAppleSilicon,
    recommendedTier,
  };
});

// --- Phase 2: Sources & Job Discovery ---
server.register('jobs.getCompanyBoards', () => {
  return defaultJobSourcesManager.getCompanyBoards();
});

server.register('jobs.addCompanyBoard', (params: { board: any }) => {
  defaultJobSourcesManager.addCompanyBoard(params.board);
  return { success: true };
});

server.register('jobs.detectAts', async (params: { url: string }) => {
  return defaultJobSourcesManager.detectAts(params.url);
});

server.register('jobs.checkHealth', async () => {
  return defaultJobSourcesManager.checkHealth();
});

server.register('jobs.search', async (params: { query?: any; adapterId?: string; companySlug?: string }) => {
  return defaultJobSourcesManager.searchJobs(params || {});
});

server.register('jobs.fetchDetail', async (params: { stub: any }) => {
  return defaultJobSourcesManager.fetchDetail(params.stub);
});

server.register('jobs.importFromHtml', async (params: { html: string; url: string }) => {
  return defaultJobSourcesManager.importFromHtml(params);
});

// --- Phase 3: Matching and Ranking ---
server.register('matching.scoreJob', (params: { profile: any; job: any; preferences?: any }) => {
  return defaultMatchingService.scoreJob(params.profile, params.job, params.preferences);
});

server.register('matching.rankAllJobs', (params: { profile: any; jobs: any[]; preferences?: any }) => {
  return defaultMatchingService.rankAllJobs(params.profile, params.jobs, params.preferences);
});

server.register('matching.recordFeedback', (params: { jobId: string; profileId: string; feedback: 'relevant' | 'irrelevant' }) => {
  return defaultMatchingService.recordFeedback(params.jobId, params.profileId, params.feedback);
});

server.register('matching.getWeights', (params: { profileId?: string }) => {
  return defaultMatchingService.getWeights(params?.profileId);
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
