import os from 'node:os';
import { StdioRpcServer, RpcError } from './rpc.js';
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
import {
  z,
  UserProfileSchema,
  JobPostingSchema,
  JobStubSchema,
  SearchQuerySchema,
  UserPreferencesSchema,
  ApplicationModeSchema,
  RpcErrorCode,
  type HardwareSpecs,
} from '@kaarjoo/shared';

const server = new StdioRpcServer();
const applicationEngine = new ApplicationEngine({ headless: true });

// --- Ping & System Specs ---
server.register('system.ping', {
  inputSchema: z.unknown().optional(),
  handler: () => ({
    status: 'ok',
    timestamp: Date.now(),
    platform: os.platform(),
    arch: os.arch(),
  }),
});

server.register('system.discoverBrowsers', {
  inputSchema: z.unknown().optional(),
  handler: () => discoverSystemBrowsers(),
});

server.register('system.getHardwareSpecs', {
  inputSchema: z.unknown().optional(),
  handler: (): HardwareSpecs => {
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
  },
});

// --- Phase 1: Ingestion & Profile Extraction ---
server.register('profile.parseAndExtract', {
  inputSchema: z.object({
    filePath: z.string().min(1, 'filePath is required'),
  }),
  handler: async ({ filePath }) => {
    try {
      return await processAndExtractProfile(filePath);
    } catch (err: any) {
      throw new RpcError(RpcErrorCode.DocumentParseError, `Failed to parse and extract profile: ${err.message}`);
    }
  },
});

server.register('profile.merge', {
  inputSchema: z.object({
    profiles: z.array(UserProfileSchema),
    sourceNames: z.array(z.string()).optional(),
  }),
  handler: ({ profiles, sourceNames }) => {
    return mergeProfiles(profiles as any, sourceNames);
  },
});

// --- Phase 2: Sources & Job Discovery ---
server.register('jobs.getCompanyBoards', {
  inputSchema: z.unknown().optional(),
  handler: () => defaultJobSourcesManager.getCompanyBoards(),
});

server.register('jobs.addCompanyBoard', {
  inputSchema: z.object({
    board: z.record(z.unknown()),
  }),
  handler: ({ board }) => {
    defaultJobSourcesManager.addCompanyBoard(board as any);
    return { success: true };
  },
});

server.register('jobs.detectAts', {
  inputSchema: z.object({
    url: z.string().url('A valid URL is required'),
  }),
  handler: async ({ url }) => {
    return defaultJobSourcesManager.detectAts(url);
  },
});

server.register('jobs.checkHealth', {
  inputSchema: z.unknown().optional(),
  handler: async () => defaultJobSourcesManager.checkHealth(),
});

server.register('jobs.search', {
  inputSchema: z
    .object({
      query: SearchQuerySchema.optional(),
      adapterId: z.string().optional(),
      companySlug: z.string().optional(),
    })
    .optional(),
  handler: async (params) => {
    return defaultJobSourcesManager.searchJobs(params || {});
  },
});

server.register('jobs.fetchDetail', {
  inputSchema: z.object({
    stub: JobStubSchema,
  }),
  handler: async ({ stub }) => {
    return defaultJobSourcesManager.fetchDetail(stub as any);
  },
});

server.register('jobs.importFromHtml', {
  inputSchema: z.object({
    html: z.string().min(1, 'html is required'),
    url: z.string().min(1, 'url is required'),
  }),
  handler: async ({ html, url }) => {
    return defaultJobSourcesManager.importFromHtml({ html, url });
  },
});

// --- Phase 3: Matching and Ranking ---
server.register('matching.scoreJob', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    job: JobPostingSchema,
    preferences: UserPreferencesSchema.optional(),
  }),
  handler: ({ profile, job, preferences }) => {
    return defaultMatchingService.scoreJob(profile as any, job as any, preferences as any);
  },
});

server.register('matching.rankAllJobs', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    jobs: z.array(JobPostingSchema),
    preferences: UserPreferencesSchema.optional(),
  }),
  handler: ({ profile, jobs, preferences }) => {
    return defaultMatchingService.rankAllJobs(profile as any, jobs as any, preferences as any);
  },
});

server.register('matching.recordFeedback', {
  inputSchema: z.object({
    jobId: z.string().min(1),
    profileId: z.string().min(1),
    feedback: z.enum(['relevant', 'irrelevant']),
  }),
  handler: ({ jobId, profileId, feedback }) => {
    return defaultMatchingService.recordFeedback(jobId, profileId, feedback);
  },
});

server.register('matching.getWeights', {
  inputSchema: z
    .object({
      profileId: z.string().optional(),
    })
    .optional(),
  handler: (params) => {
    return defaultMatchingService.getWeights(params?.profileId);
  },
});

// --- Phase 4: Tailored Documents & Truthfulness Guard ---
server.register('documents.tailorResume', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    job: JobPostingSchema,
    options: z.record(z.unknown()).optional(),
  }),
  handler: ({ profile, job, options }) => {
    const tailored = tailorResume(profile as any, job as any, options as any);
    const check = TruthfulnessGuard.verifyTailoredResume(profile as any, tailored);
    tailored.truthfulnessScore = check.score;
    tailored.unsupportedClaimsCount = check.unsupportedClaims.length;
    return { tailored, check };
  },
});

server.register('documents.generateCoverLetter', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    job: JobPostingSchema,
    language: z.string().optional(),
  }),
  handler: ({ profile, job, language }) => {
    return generateCoverLetter(profile as any, job as any, language as any);
  },
});

server.register('documents.getScreeningAnswer', {
  inputSchema: z.object({
    question: z.string().min(1),
    profile: UserProfileSchema,
  }),
  handler: ({ question, profile }) => {
    return defaultAnswerBank.getAnswer(question, profile as any);
  },
});

server.register('documents.verifyTruthfulness', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    tailored: z.record(z.unknown()),
  }),
  handler: ({ profile, tailored }) => {
    return TruthfulnessGuard.verifyTailoredResume(profile as any, tailored as any);
  },
});

server.register('documents.exportPdf', {
  inputSchema: z.object({
    resume: z.record(z.unknown()).optional(),
    coverLetter: z.record(z.unknown()).optional(),
    outputPath: z.string().optional(),
  }),
  handler: async ({ resume, coverLetter, outputPath }) => {
    if (resume) {
      const buffer = await exportResumeToPdf(resume as any, { outputPath });
      return { success: true, size: buffer.length, outputPath };
    } else if (coverLetter) {
      const buffer = await exportCoverLetterToPdf(coverLetter as any, { outputPath });
      return { success: true, size: buffer.length, outputPath };
    }
    throw new RpcError(RpcErrorCode.InvalidParams, 'Neither resume nor coverLetter provided for PDF export');
  },
});

server.register('documents.exportDocx', {
  inputSchema: z.object({
    resume: z.record(z.unknown()),
    outputPath: z.string().optional(),
  }),
  handler: async ({ resume, outputPath }) => {
    const buffer = await exportResumeToDocx(resume as any, { outputPath });
    return { success: true, size: buffer.length, outputPath };
  },
});

// --- Phase 5: Application Engine & ATS Automation ---
server.register('application.queue', {
  inputSchema: z.object({
    job: JobPostingSchema,
    profile: UserProfileSchema,
    tailoredResumePath: z.string().optional(),
    coverLetterText: z.string().optional(),
    mode: ApplicationModeSchema.optional(),
    answers: z.record(z.string()).optional(),
  }),
  handler: (params) => {
    return applicationEngine.queueApplication(params as any);
  },
});

server.register('application.getAll', {
  inputSchema: z.unknown().optional(),
  handler: () => applicationEngine.getAllApplications(),
});

server.register('application.get', {
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  handler: ({ id }) => applicationEngine.getApplication(id),
});

server.register('application.execute', {
  inputSchema: z.object({
    id: z.string().min(1),
    profile: UserProfileSchema,
    tailoredResumePath: z.string().optional(),
    coverLetterText: z.string().optional(),
    answers: z.record(z.string()).optional(),
  }),
  handler: async (params) => {
    try {
      return await applicationEngine.executeApplication(params.id, params as any);
    } catch (err: any) {
      throw new RpcError(RpcErrorCode.BrowserAutomationError, `Application execution failed: ${err.message}`);
    }
  },
});

server.register('application.submitReviewed', {
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  handler: async ({ id }) => {
    try {
      return await applicationEngine.submitReviewedApplication(id);
    } catch (err: any) {
      throw new RpcError(RpcErrorCode.BrowserAutomationError, `Failed to submit reviewed application: ${err.message}`);
    }
  },
});

server.register('application.cancel', {
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  handler: async ({ id }) => {
    return applicationEngine.cancelApplication(id);
  },
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
