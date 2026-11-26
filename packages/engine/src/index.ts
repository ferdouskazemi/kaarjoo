import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { StdioRpcServer, RpcError } from './rpc.js';
import { discoverSystemBrowsers } from './utils/discovery.js';
import {
  getModelManifestWithStatus,
  downloadModelWithResume,
} from './ai/modelManifest.js';
import { defaultLlamaRuntime } from './ai/llamaRuntime.js';
import {
  generateCoverLetterWithLlm,
  generateScreeningAnswerWithLlm,
} from './ai/prompts.js';
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
  exportToPdf,
  exportResumeToDocx,
  renderResumeHtml,
} from './documents/index.js';
import { ApplicationEngine } from '@kaarjoo/ats';
import { loadBundledDirectory, checkDirectoryUpdate, defaultPoliteClient } from '@kaarjoo/adapters';
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

server.register('models.getStatus', {
  inputSchema: z.unknown().optional(),
  handler: () => getModelManifestWithStatus(),
});

server.register('models.detectHardware', {
  inputSchema: z.unknown().optional(),
  handler: () => defaultLlamaRuntime.getHardwareReport(),
});

server.register('models.getDiagnostics', {
  inputSchema: z.unknown().optional(),
  handler: () => defaultLlamaRuntime.getRuntimeDiagnostics(),
});

server.register('models.unloadAll', {
  inputSchema: z.unknown().optional(),
  handler: async () => {
    await defaultLlamaRuntime.unloadAll();
    return { unloaded: true };
  },
});

server.register('models.download', {
  inputSchema: z.object({
    modelId: z.string().min(1),
  }),
  handler: async ({ modelId }) => {
    return downloadModelWithResume(modelId, (ev) => {
      server.sendNotification('models.downloadProgress', ev);
    });
  },
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
      const res = await processAndExtractProfile(filePath);
      return {
        ...res,
        sourceFileId: `src_${Date.now()}`,
        sourceFileName: res.document.fileName,
        pagesCount: res.document.pageCount,
        rawText: res.document.rawText,
      };
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

function toJobPostingDto(raw: any) {
  const canonicalUrl = raw.canonicalUrl || raw.url || `https://kaarjoo.local/jobs/${raw.id}`;
  return {
    id: raw.id,
    sourceId: raw.sourceId || 'directory',
    sourceName: raw.sourceName || raw.company || 'Company Board',
    canonicalUrl,
    applyUrl: raw.applyUrl || canonicalUrl,
    title: raw.title,
    company: raw.company,
    location: raw.location ?? null,
    remoteType: raw.remoteType || 'unknown',
    employmentType: raw.employmentType ?? null,
    salary: raw.salary ?? null,
    descriptionMarkdown: raw.descriptionMarkdown || raw.snippet || raw.title || '',
    requirements: Array.isArray(raw.requirements) ? raw.requirements : [],
    postedAt: raw.postedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    atsType: raw.atsType || raw.sourceId || 'generic',
    contentHash:
      raw.contentHash ||
      createHash('sha256').update(`${raw.company || ''}|${raw.title || ''}|${canonicalUrl}`).digest('hex'),
    simHash: raw.simHash ?? null,
    matchScore: raw.matchScore ?? null,
  };
}

server.register('jobs.search', {
  inputSchema: z
    .object({
      query: SearchQuerySchema.optional(),
      adapterId: z.string().optional(),
      companySlug: z.string().optional(),
      keywords: z.array(z.string()).nullable().optional(),
      locations: z.array(z.string()).nullable().optional(),
      remoteOnly: z.boolean().nullable().optional(),
      company: z.string().nullable().optional(),
      atsType: z.string().nullable().optional(),
      limit: z.number().int().positive().nullable().optional(),
    })
    .optional(),
  handler: async (params) => {
    const normalized = params?.query
      ? params
      : {
          adapterId: params?.adapterId || params?.atsType || undefined,
          companySlug: params?.companySlug || params?.company || undefined,
          query: {
            keywords: params?.keywords || [],
            locations: params?.locations || [],
            remoteOnly: params?.remoteOnly ?? false,
            company: params?.company ?? undefined,
            limit: params?.limit ?? 50,
          },
        };
    const jobs = await defaultJobSourcesManager.searchJobs(normalized as any);
    return jobs.map(toJobPostingDto);
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

// --- Company Directory Ingestion & Updates ---
server.register('directory.loadBundled', {
  inputSchema: z.record(z.unknown()).optional(),
  handler: () => {
    return loadBundledDirectory();
  },
});

server.register('directory.checkUpdate', {
  inputSchema: z.object({
    currentVersion: z.string(),
  }),
  handler: async ({ currentVersion }) => {
    return checkDirectoryUpdate(currentVersion, defaultPoliteClient);
  },
});

function toMatchResultDto(m: any) {
  return {
    jobId: m.jobId,
    profileId: m.profileId,
    score: m.overallScore ?? m.score ?? 0,
    overallScore: m.overallScore ?? m.score ?? 0,
    breakdown: {
      hardFilter: m.breakdown?.hardFilter ?? m.breakdown?.hardFilterScore ?? 0,
      semantic: m.breakdown?.semantic ?? m.breakdown?.semanticScore ?? 0,
      skillCoverage: m.breakdown?.skillCoverage ?? m.breakdown?.skillCoverageScore ?? 0,
      rerank: m.breakdown?.rerank ?? m.breakdown?.llmRerankScore ?? 0,
    },
    topReasons: Array.isArray(m.topReasons) ? m.topReasons : [],
    matchedSkills: Array.isArray(m.matchedSkills) ? m.matchedSkills : [],
    missingSkills: Array.isArray(m.missingSkills) ? m.missingSkills : [],
    whyNotHigher: m.whyNotHigher ?? null,
    userFeedback: m.userFeedback ?? null,
    scoringMode: m.scoringMode,
    embeddingMode: m.embeddingMode,
  };
}

// --- Phase 3: Matching and Ranking ---
server.register('matching.scoreJob', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    job: JobPostingSchema,
    preferences: UserPreferencesSchema.optional(),
  }),
  handler: async ({ profile, job, preferences }) => {
    const res = await defaultMatchingService.scoreJobAsync(profile as any, job as any, preferences as any);
    return toMatchResultDto(res);
  },
});

server.register('matching.rankAllJobs', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    jobs: z.array(JobPostingSchema),
    preferences: UserPreferencesSchema.optional(),
  }),
  handler: async ({ profile, jobs, preferences }) => {
    const ranked = await defaultMatchingService.rankAllJobsAsync(profile as any, jobs as any, preferences as any);
    return ranked.map((item) => toMatchResultDto(item.match));
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
server.register('documents.tailor', {
  inputSchema: z.object({
    profile: UserProfileSchema,
    job: JobPostingSchema,
    templateId: z.string().optional(),
    language: z.string().optional(),
  }),
  handler: async ({ profile, job, templateId = 'ats-clean', language = 'en' }) => {
    const tailored = tailorResume(profile as any, job as any, {
      templateId: templateId as any,
      language: language as any,
    });
    const check = TruthfulnessGuard.verifyTailoredResume(profile as any, tailored);
    let coverLetter = generateCoverLetter(profile as any, job as any, language as any);

    if (defaultLlamaRuntime.isInstructModelAvailable()) {
      try {
        const llmLetter = await generateCoverLetterWithLlm(
          profile as any,
          job as any,
          (language as 'en' | 'fa') || 'en'
        );
        if (llmLetter && llmLetter.paragraphs.length > 0) {
          const fullText = [llmLetter.greeting, ...llmLetter.paragraphs, llmLetter.closing].join('\n\n');
          const letterCheck = TruthfulnessGuard.verifyTextClaims(profile as any, fullText);
          if (letterCheck.score >= 85) {
            coverLetter = {
              ...coverLetter,
              opening: llmLetter.greeting,
              bodyParagraphs: llmLetter.paragraphs,
              closing: llmLetter.closing,
              fullText,
            };
          }
        }
      } catch {
        // Fallback cleanly to deterministic cover letter template
      }
    }

    const resumeHtml = renderResumeHtml(tailored);

    return {
      jobId: job.id,
      templateId,
      language,
      resumeHtml,
      coverLetterText: coverLetter.fullText,
      truthfulnessScore: check.score,
      truthfulnessPassed: check.score >= 85,
      warnings: check.unsupportedClaims.map((c) => `Unsupported claim: ${c.claim}`),
    };
  },
});

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
  handler: async ({ question, profile }) => {
    if (defaultLlamaRuntime.isInstructModelAvailable()) {
      try {
        const llmAns = await generateScreeningAnswerWithLlm(question, profile as any);
        if (llmAns) {
          return {
            answer: llmAns.answer,
            confidence: llmAns.confidence,
            evidenceSpan: llmAns.evidenceSpan,
            source: 'local-ai',
          };
        }
      } catch {
        // Fallback to rule-based AnswerBank
      }
    }
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
    html: z.string().optional(),
    filename: z.string().optional(),
    outputPath: z.string().optional(),
  }),
  handler: async ({ resume, coverLetter, html, filename, outputPath }) => {
    const exportsDir = path.join(process.env.KAARJOO_APP_DATA_DIR || os.tmpdir(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    const safeName = (filename || `export_${Date.now()}.pdf`).replace(/[<>:"/\\|?*]/g, '_');
    const resolvedPath = outputPath || path.join(exportsDir, safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);

    if (html) {
      const buffer = await exportToPdf(html, { outputPath: resolvedPath });
      return { success: true, size: buffer.length, outputPath: resolvedPath, filePath: resolvedPath };
    } else if (resume) {
      const buffer = await exportResumeToPdf(resume as any, { outputPath: resolvedPath });
      return { success: true, size: buffer.length, outputPath: resolvedPath, filePath: resolvedPath };
    } else if (coverLetter) {
      const buffer = await exportCoverLetterToPdf(coverLetter as any, { outputPath: resolvedPath });
      return { success: true, size: buffer.length, outputPath: resolvedPath, filePath: resolvedPath };
    }
    throw new RpcError(RpcErrorCode.InvalidParams, 'Neither html, resume, nor coverLetter provided for PDF export');
  },
});

server.register('documents.exportDocx', {
  inputSchema: z.object({
    resume: z.record(z.unknown()).optional(),
    contentJson: z.string().optional(),
    filename: z.string().optional(),
    outputPath: z.string().optional(),
  }),
  handler: async ({ resume, contentJson, filename, outputPath }) => {
    const exportsDir = path.join(process.env.KAARJOO_APP_DATA_DIR || os.tmpdir(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    const safeName = (filename || `export_${Date.now()}.docx`).replace(/[<>:"/\\|?*]/g, '_');
    const resolvedPath = outputPath || path.join(exportsDir, safeName.endsWith('.docx') ? safeName : `${safeName}.docx`);
    const targetResume = resume || (contentJson ? JSON.parse(contentJson) : null);
    if (!targetResume) {
      throw new RpcError(RpcErrorCode.InvalidParams, 'Neither resume nor contentJson provided for DOCX export');
    }
    const buffer = await exportResumeToDocx(targetResume as any, { outputPath: resolvedPath });
    return { success: true, size: buffer.length, outputPath: resolvedPath, filePath: resolvedPath };
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
    job: JobPostingSchema.optional(),
    mode: ApplicationModeSchema.optional(),
    resumePath: z.string().optional(),
    tailoredResumePath: z.string().optional(),
    coverLetterText: z.string().optional(),
    answers: z.record(z.string()).optional(),
  }),
  handler: async (params) => {
    try {
      let targetId = params.id;
      const resumePath = params.tailoredResumePath || params.resumePath;
      if (!applicationEngine.getApplication(targetId) && params.job) {
        const queued = applicationEngine.queueApplication({
          id: targetId,
          job: params.job as any,
          profile: params.profile as any,
          tailoredResumePath: resumePath,
          coverLetterText: params.coverLetterText,
          mode: params.mode || 'review',
          answers: params.answers,
        });
        targetId = queued.id;
      }
      return await applicationEngine.executeApplication(targetId, {
        ...params,
        tailoredResumePath: resumePath,
      } as any);
    } catch (err: any) {
      throw new RpcError(RpcErrorCode.BrowserAutomationError, `Application execution failed: ${err.message}`);
    }
  },
});

server.register('application.submitReviewed', {
  inputSchema: z.object({
    id: z.string().min(1),
    submitAttemptId: z.string().optional(),
    profile: UserProfileSchema.optional(),
    job: JobPostingSchema.optional(),
    tailoredResumePath: z.string().optional(),
    coverLetterText: z.string().optional(),
  }),
  handler: async ({ id, submitAttemptId, profile, job, tailoredResumePath, coverLetterText }) => {
    try {
      return await applicationEngine.submitReviewedApplication(id, {
        submitAttemptId,
        profile: profile as any,
        job: job as any,
        tailoredResumePath,
        coverLetterText,
      });
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
