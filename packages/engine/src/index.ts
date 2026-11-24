import os from 'node:os';
import { StdioRpcServer } from './rpc.js';
import { discoverSystemBrowsers } from './utils/discovery.js';
import { processAndExtractProfile } from './ingestion/pipeline.js';
import { mergeProfiles } from './ingestion/merger.js';
import { defaultJobSourcesManager } from './sources/handler.js';
import { defaultMatchingService } from './matching/handler.js';
import {
  tailorResume,
  generateCoverLetter,
  TruthfulnessGuard,
  defaultAnswerBank,
  exportResumeToPdf,
  exportCoverLetterToPdf,
  exportResumeToDocx,
} from './documents/index.js';
import { ApplicationEngine } from '@kaarjoo/ats';
import type { HardwareSpecs } from '@kaarjoo/shared';

const server = new StdioRpcServer();
const applicationEngine = new ApplicationEngine({ headless: true });

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

// --- Phase 4: Tailored Documents & Truthfulness Guard ---
server.register('documents.tailorResume', (params: { profile: any; job: any; options?: any }) => {
  const tailored = tailorResume(params.profile, params.job, params.options);
  const check = TruthfulnessGuard.verifyTailoredResume(params.profile, tailored);
  tailored.truthfulnessScore = check.score;
  tailored.unsupportedClaimsCount = check.unsupportedClaims.length;
  return { tailored, check };
});

server.register('documents.generateCoverLetter', (params: { profile: any; job: any; language?: any }) => {
  return generateCoverLetter(params.profile, params.job, params.language);
});

server.register('documents.getScreeningAnswer', (params: { question: string; profile: any }) => {
  return defaultAnswerBank.getAnswer(params.question, params.profile);
});

server.register('documents.verifyTruthfulness', (params: { profile: any; tailored: any }) => {
  return TruthfulnessGuard.verifyTailoredResume(params.profile, params.tailored);
});

server.register('documents.exportPdf', async (params: { resume?: any; coverLetter?: any; outputPath?: string }) => {
  if (params.resume) {
    const buffer = await exportResumeToPdf(params.resume, { outputPath: params.outputPath });
    return { success: true, size: buffer.length, outputPath: params.outputPath };
  } else if (params.coverLetter) {
    const buffer = await exportCoverLetterToPdf(params.coverLetter, { outputPath: params.outputPath });
    return { success: true, size: buffer.length, outputPath: params.outputPath };
  }
  throw new Error('Neither resume nor coverLetter provided for PDF export');
});

server.register('documents.exportDocx', async (params: { resume: any; outputPath?: string }) => {
  const buffer = await exportResumeToDocx(params.resume, { outputPath: params.outputPath });
  return { success: true, size: buffer.length, outputPath: params.outputPath };
});

// --- Phase 5: Application Engine & ATS Automation ---
server.register('application.queue', (params: {
  job: any;
  profile: any;
  tailoredResumePath?: string;
  coverLetterText?: string;
  mode?: any;
  answers?: Record<string, string>;
}) => {
  return applicationEngine.queueApplication(params);
});

server.register('application.getAll', () => {
  return applicationEngine.getAllApplications();
});

server.register('application.get', (params: { id: string }) => {
  return applicationEngine.getApplication(params.id);
});

server.register('application.execute', async (params: {
  id: string;
  profile: any;
  tailoredResumePath?: string;
  coverLetterText?: string;
  answers?: Record<string, string>;
}) => {
  return applicationEngine.executeApplication(params.id, params);
});

server.register('application.submitReviewed', async (params: { id: string }) => {
  return applicationEngine.submitReviewedApplication(params.id);
});

server.register('application.cancel', async (params: { id: string }) => {
  return applicationEngine.cancelApplication(params.id);
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
