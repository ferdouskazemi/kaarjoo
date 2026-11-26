import { create } from 'zustand';
import { commands } from '../bindings.js';
import { useApplicationStore } from './applicationStore.js';
import type { UserProfile } from '@kaarjoo/shared';

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error';
export type DiscoveredJobItemStatus = 'pending' | 'tailoring' | 'filling' | 'done' | 'error';

export interface PipelineJobItem {
  id: string;
  title: string;
  company: string;
  location?: string;
  applyUrl: string;
  atsType: string;
  matchScore: number;
  matchedSkills: string[];
  itemStatus: DiscoveredJobItemStatus;
  errorText?: string;
}

export interface PipelineState {
  isVisible: boolean;
  isRunning: boolean;
  isCancelled: boolean;
  status: 'idle' | 'discovering' | 'discovered' | 'applying' | 'completed' | 'cancelled' | 'error';
  steps: {
    discover: PipelineStepStatus;
    tailor: PipelineStepStatus;
    prefill: PipelineStepStatus;
  };
  discoveredJobs: PipelineJobItem[];
  currentItemIndex: number;
  totalItems: number;
  currentItemLabel: string;
  errorMessage: string | null;

  startDiscoveryStage: (params: {
    profile: UserProfile;
    demoMode: boolean;
    onInvalidate: () => Promise<void>;
  }) => Promise<void>;
  startApplyStage: (params: {
    demoMode: boolean;
    lang: string;
    onInvalidate: () => Promise<void>;
    onNavigateQueue: () => void;
  }) => Promise<void>;
  cancelPipeline: () => void;
  dismissPipeline: () => void;
}

function matchesCvProfile(
  job: { title: string; descriptionMarkdown?: string; requirements?: string[]; matchScore?: number | null },
  profile: UserProfile
): { matched: boolean; matchedSkills: string[]; score: number } {
  const skills = (profile.skills || []).map((s) => s.name.trim()).filter(Boolean);
  const titles = (profile.targetTitles || []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const haystack = `${job.title} ${job.descriptionMarkdown || ''} ${(job.requirements || []).join(' ')}`.toLowerCase();

  const matchedSkills = skills.filter((s) => haystack.includes(s.toLowerCase()));
  const titleMatch = titles.some((t) =>
    t
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .some((w) => job.title.toLowerCase().includes(w))
  );

  const rawScore = typeof job.matchScore === 'number' ? Math.round(job.matchScore) : 0;
  const computedScore = rawScore > 0 ? rawScore : Math.min(96, matchedSkills.length * 18 + (titleMatch ? 28 : 0));
  const matched = matchedSkills.length > 0 || rawScore >= 45 || titleMatch;
  return { matched, matchedSkills: matchedSkills.slice(0, 5), score: computedScore };
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  isVisible: false,
  isRunning: false,
  isCancelled: false,
  status: 'idle',
  steps: {
    discover: 'pending',
    tailor: 'pending',
    prefill: 'pending',
  },
  discoveredJobs: [],
  currentItemIndex: 0,
  totalItems: 0,
  currentItemLabel: '',
  errorMessage: null,

  cancelPipeline: () => {
    set({ isCancelled: true, isRunning: false, status: 'cancelled' });
  },

  dismissPipeline: () => {
    set({ isVisible: false, status: 'idle', discoveredJobs: [], errorMessage: null });
  },

  startDiscoveryStage: async ({ profile, demoMode, onInvalidate }) => {
    set({
      isVisible: true,
      isRunning: true,
      isCancelled: false,
      status: 'discovering',
      steps: { discover: 'running', tailor: 'pending', prefill: 'pending' },
      discoveredJobs: [],
      currentItemIndex: 0,
      totalItems: 0,
      currentItemLabel: '',
      errorMessage: null,
    });

    try {
      const keywords = (profile.skills || []).map((s) => s.name).slice(0, 6);
      const rawJobs: Array<{
        id: string;
        title: string;
        company: string;
        location?: string;
        applyUrl: string;
        atsType: string;
        descriptionMarkdown?: string;
        requirements?: string[];
        matchScore?: number | null;
      }> = [];

      if (!demoMode) {
        const searchRes = await commands.jobsSearch({
          keywords: keywords.length > 0 ? keywords : null,
          locations: null,
          remoteOnly: null,
          company: null,
          atsType: null,
          limit: 30,
        });
        if (searchRes.status === 'ok' && searchRes.data.length > 0) {
          for (const j of searchRes.data) {
            rawJobs.push({
              id: j.id,
              title: j.title,
              company: j.company,
              location: j.location ?? undefined,
              applyUrl: j.applyUrl,
              atsType: j.atsType,
              descriptionMarkdown: j.descriptionMarkdown,
              requirements: j.requirements,
              matchScore: j.matchScore,
            });
          }
        } else {
          const allRes = await commands.jobsGetAll(null, null, null, 30);
          if (allRes.status === 'ok') {
            for (const j of allRes.data) {
              rawJobs.push({
                id: j.id,
                title: j.title,
                company: j.company,
                location: j.location ?? undefined,
                applyUrl: j.applyUrl,
                atsType: j.atsType,
                descriptionMarkdown: j.descriptionMarkdown,
                requirements: j.requirements,
                matchScore: j.matchScore,
              });
            }
          }
        }
      } else {
        await new Promise((r) => setTimeout(r, 900));
        rawJobs.push(
          {
            id: 'demo_job_stripe',
            title: 'Senior Frontend Engineer (React & TypeScript)',
            company: 'Stripe',
            location: 'Remote (Global)',
            applyUrl: 'https://boards.greenhouse.io/stripe/jobs/demo-1',
            atsType: 'greenhouse',
            descriptionMarkdown: 'React, TypeScript, Next.js, Tailwind CSS frontend architecture.',
            requirements: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
            matchScore: 92,
          },
          {
            id: 'demo_job_gitlab',
            title: 'Frontend Engineer, Plan',
            company: 'GitLab',
            location: 'Remote (EMEA)',
            applyUrl: 'https://job-boards.greenhouse.io/gitlab/jobs/demo-2',
            atsType: 'greenhouse',
            descriptionMarkdown: 'JavaScript, TypeScript, Git, CI/CD modern web applications.',
            requirements: ['JavaScript', 'TypeScript', 'Git', 'CI/CD'],
            matchScore: 86,
          }
        );
      }

      if (get().isCancelled) return;

      // Filter strictly to CV-matched jobs
      const matchedItems: PipelineJobItem[] = [];
      for (const job of rawJobs) {
        const res = matchesCvProfile(job, profile);
        if (res.matched) {
          matchedItems.push({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            applyUrl: job.applyUrl,
            atsType: job.atsType,
            matchScore: res.score,
            matchedSkills: res.matchedSkills,
            itemStatus: 'pending',
          });
        }
      }

      matchedItems.sort((a, b) => b.matchScore - a.matchScore);
      const topMatched = matchedItems.slice(0, 5);

      // Reveal each discovered job one-by-one for immersive visual feedback
      for (let i = 0; i < topMatched.length; i++) {
        if (get().isCancelled) return;
        set((state) => ({
          discoveredJobs: [...state.discoveredJobs, topMatched[i]],
        }));
        await new Promise((r) => setTimeout(r, 220));
      }

      await onInvalidate();
      set({
        isRunning: false,
        status: 'discovered',
        steps: { discover: 'done', tailor: 'pending', prefill: 'pending' },
      });
    } catch (err) {
      set({
        isRunning: false,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  },

  startApplyStage: async ({ demoMode, lang, onInvalidate, onNavigateQueue }) => {
    const jobs = get().discoveredJobs;
    if (jobs.length === 0) return;

    set({
      isRunning: true,
      isCancelled: false,
      status: 'applying',
      steps: { discover: 'done', tailor: 'running', prefill: 'running' },
      totalItems: jobs.length,
      currentItemIndex: 0,
      errorMessage: null,
    });

    const appStore = useApplicationStore.getState();

    try {
      for (let i = 0; i < jobs.length; i++) {
        if (get().isCancelled) return;
        const job = jobs[i];

        set((state) => ({
          currentItemIndex: i + 1,
          currentItemLabel: `${job.title} — ${job.company}`,
          discoveredJobs: state.discoveredJobs.map((j) =>
            j.id === job.id ? { ...j, itemStatus: 'tailoring' } : j
          ),
        }));

        let resumePath: string | null = null;
        let coverLetter: string | null = null;

        if (!demoMode) {
          try {
            const tailorRes = await commands.documentsTailor(job.id, 'ats-clean', lang === 'fa' ? 'fa' : 'en');
            if (tailorRes.status === 'ok') {
              coverLetter = tailorRes.data.coverLetterText || null;
              try {
                const pdfRes = await commands.documentsExportPdf(
                  tailorRes.data.resumeHtml,
                  `tailored_${job.id}.pdf`
                );
                if (pdfRes.status === 'ok') resumePath = pdfRes.data;
              } catch {
                // Skip PDF export if unavailable
              }
            }
          } catch {
            // Continue sequentially
          }
        } else {
          await new Promise((r) => setTimeout(r, 450));
          resumePath = 'Tailored_Resume.pdf';
        }

        if (get().isCancelled) return;

        set((state) => ({
          discoveredJobs: state.discoveredJobs.map((j) =>
            j.id === job.id ? { ...j, itemStatus: 'filling' } : j
          ),
        }));

        let itemOk = true;
        let itemErr: string | undefined;

        if (!demoMode) {
          try {
            const created = await commands.applicationsCreate(
              job.id,
              'review',
              resumePath,
              coverLetter
            );
            if (created.status === 'ok') {
              const execRes = await commands.applicationsExecuteReview(created.data.id);
              if (execRes.status === 'error') {
                itemOk = false;
                itemErr = execRes.error;
              }
            } else {
              itemOk = false;
              itemErr = created.error;
            }
          } catch (err) {
            itemOk = false;
            itemErr = err instanceof Error ? err.message : String(err);
          }
        } else {
          const createdApp = appStore.queueJobApplication({
            job: {
              id: job.id,
              title: job.title,
              company: job.company,
              applyUrl: job.applyUrl,
              atsType: job.atsType as any,
            },
          });
          await appStore.executeApplication(createdApp.id);
        }

        set((state) => ({
          discoveredJobs: state.discoveredJobs.map((j) =>
            j.id === job.id
              ? { ...j, itemStatus: itemOk ? 'done' : 'error', errorText: itemErr }
              : j
          ),
        }));
      }

      if (get().isCancelled) return;

      await onInvalidate();
      set({
        isRunning: false,
        status: 'completed',
        steps: { discover: 'done', tailor: 'done', prefill: 'done' },
      });
      onNavigateQueue();
    } catch (err) {
      set({
        isRunning: false,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  },
}));
