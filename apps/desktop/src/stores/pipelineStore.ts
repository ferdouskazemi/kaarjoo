import { create } from 'zustand';
import { commands } from '../bindings.js';
import { useApplicationStore } from './applicationStore.js';
import type { UserProfile } from '@kaarjoo/shared';

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface PipelineState {
  isVisible: boolean;
  isRunning: boolean;
  isCancelled: boolean;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  steps: {
    discover: PipelineStepStatus;
    tailor: PipelineStepStatus;
    prefill: PipelineStepStatus;
  };
  currentItemIndex: number;
  totalItems: number;
  currentItemLabel: string;
  errorMessage: string | null;

  startAutoPipeline: (params: {
    profile: UserProfile;
    demoMode: boolean;
    lang: string;
    onInvalidate: () => Promise<void>;
    onNavigateQueue: () => void;
  }) => Promise<void>;
  cancelPipeline: () => void;
  dismissPipeline: () => void;
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
  currentItemIndex: 0,
  totalItems: 0,
  currentItemLabel: '',
  errorMessage: null,

  cancelPipeline: () => {
    set({ isCancelled: true, isRunning: false, status: 'cancelled' });
  },

  dismissPipeline: () => {
    set({ isVisible: false, status: 'idle', errorMessage: null });
  },

  startAutoPipeline: async ({ profile, demoMode, lang, onInvalidate, onNavigateQueue }) => {
    set({
      isVisible: true,
      isRunning: true,
      isCancelled: false,
      status: 'running',
      steps: { discover: 'running', tailor: 'pending', prefill: 'pending' },
      currentItemIndex: 0,
      totalItems: 0,
      currentItemLabel: '',
      errorMessage: null,
    });

    try {
      // ------------------------------------------------------------------
      // STEP 1: Discover & Match Jobs
      // ------------------------------------------------------------------
      const keywords = (profile.skills || []).map((s) => s.name).slice(0, 5);
      let candidateJobs: Array<{ id: string; title: string; company: string; applyUrl: string; atsType: string }> = [];

      if (!demoMode) {
        const searchRes = await commands.jobsSearch({
          keywords: keywords.length > 0 ? keywords : null,
          locations: null,
          remoteOnly: null,
          company: null,
          atsType: null,
          limit: 25,
        });
        if (searchRes.status === 'ok' && searchRes.data.length > 0) {
          candidateJobs = searchRes.data.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            applyUrl: j.applyUrl,
            atsType: j.atsType,
          }));
        } else {
          const allRes = await commands.jobsGetAll(null, null, null, 25);
          if (allRes.status === 'ok') {
            candidateJobs = allRes.data.map((j) => ({
              id: j.id,
              title: j.title,
              company: j.company,
              applyUrl: j.applyUrl,
              atsType: j.atsType,
            }));
          }
        }
      }

      if (candidateJobs.length === 0 && demoMode) {
        candidateJobs = [
          {
            id: 'demo_job_stripe',
            title: 'Senior Frontend Engineer (React & TypeScript)',
            company: 'Stripe',
            applyUrl: 'https://boards.greenhouse.io/stripe/jobs/demo-1',
            atsType: 'greenhouse',
          },
          {
            id: 'demo_job_gitlab',
            title: 'Frontend Engineer, Plan',
            company: 'GitLab',
            applyUrl: 'https://job-boards.greenhouse.io/gitlab/jobs/demo-2',
            atsType: 'greenhouse',
          },
        ];
      }

      if (get().isCancelled) return;

      const topJobs = candidateJobs.slice(0, 3);
      if (topJobs.length === 0) {
        set({
          isRunning: false,
          status: 'completed',
          steps: { discover: 'done', tailor: 'done', prefill: 'done' },
        });
        await onInvalidate();
        return;
      }

      // ------------------------------------------------------------------
      // STEP 2: Tailor Documents 1-by-1 sequentially
      // ------------------------------------------------------------------
      set({
        steps: { discover: 'done', tailor: 'running', prefill: 'pending' },
        totalItems: topJobs.length,
        currentItemIndex: 0,
      });

      const tailoredDocsByJob: Record<string, { resumePath: string | null; coverLetter: string | null }> = {};

      for (let i = 0; i < topJobs.length; i++) {
        if (get().isCancelled) return;
        const job = topJobs[i];
        set({
          currentItemIndex: i + 1,
          currentItemLabel: `${job.title} — ${job.company}`,
        });

        if (!demoMode) {
          try {
            const tailorRes = await commands.documentsTailor(job.id, 'ats-clean', lang === 'fa' ? 'fa' : 'en');
            if (tailorRes.status === 'ok') {
              let resumePath: string | null = null;
              try {
                const pdfRes = await commands.documentsExportPdf(
                  tailorRes.data.resumeHtml,
                  `tailored_${job.id}.pdf`
                );
                if (pdfRes.status === 'ok') resumePath = pdfRes.data;
              } catch {
                // Fallback if PDF export skipped
              }
              tailoredDocsByJob[job.id] = {
                resumePath,
                coverLetter: tailorRes.data.coverLetterText || null,
              };
            }
          } catch {
            // Continue sequentially even if one tailoring call falls back
          }
        } else {
          await new Promise((r) => setTimeout(r, 450));
          tailoredDocsByJob[job.id] = {
            resumePath: 'Tailored_Resume.pdf',
            coverLetter: null,
          };
        }
      }

      if (get().isCancelled) return;

      // ------------------------------------------------------------------
      // STEP 3: Queue & Pre-Fill Forms 1-by-1 in Ethical Review Mode
      // ------------------------------------------------------------------
      set({
        steps: { discover: 'done', tailor: 'done', prefill: 'running' },
        totalItems: topJobs.length,
        currentItemIndex: 0,
      });

      const appStore = useApplicationStore.getState();

      for (let i = 0; i < topJobs.length; i++) {
        if (get().isCancelled) return;
        const job = topJobs[i];
        set({
          currentItemIndex: i + 1,
          currentItemLabel: `${job.title} — ${job.company}`,
        });

        const docs = tailoredDocsByJob[job.id] ?? { resumePath: null, coverLetter: null };

        if (!demoMode) {
          try {
            const created = await commands.applicationsCreate(
              job.id,
              'review',
              docs.resumePath,
              docs.coverLetter
            );
            if (created.status === 'ok') {
              await commands.applicationsExecuteReview(created.data.id);
            }
          } catch {
            // Continue sequentially to remaining jobs
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
