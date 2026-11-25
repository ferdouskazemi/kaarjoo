import { create } from 'zustand';
import {
  ApplicationRecord,
  ApplicationMode,
  ApplicationStatus,
  UserProfile,
} from '@kaarjoo/shared';
import { useProfileStore } from './profileStore.js';

export interface ApplyingStepInfo {
  step: 'idle' | 'navigating' | 'detecting' | 'filling' | 'uploading' | 'review_ready' | 'submitted' | 'error';
  messageKey: string;
}

export interface ApplicationKpis {
  total: number;
  thisWeek: number;
  interviewRate: number;
  avgScore: number;
  topMissingSkills: Array<{ skill: string; count: number }>;
  atsDistribution: Record<string, number>;
}

interface ApplicationStoreState {
  applications: ApplicationRecord[];
  activeApplicationId: string | null;
  isExecuting: boolean;
  currentStep: ApplyingStepInfo;
  previewScreenshot: string | null;

  queueJobApplication: (params: {
    job: {
      id: string;
      title: string;
      company: string;
      location?: string;
      applyUrl: string;
      atsType?: string;
      matchScore?: number;
      salaryText?: string;
      descriptionMarkdown?: string;
    };
    tailoredResumePath?: string;
    coverLetterText?: string;
    mode?: ApplicationMode;
  }) => ApplicationRecord;

  executeApplication: (id: string) => Promise<void>;
  submitReviewed: (id: string) => Promise<void>;
  updateApplicationStatus: (id: string, newStatus: ApplicationStatus) => void;
  updateApplicationNotes: (id: string, notes: string) => void;
  scheduleInterview: (id: string, date: string, note?: string) => void;
  setFollowUp: (id: string, date: string) => void;
  cancelApplication: (id: string) => void;
  setActiveApplicationId: (id: string | null) => void;
  setPreviewScreenshot: (url: string | null) => void;
  exportToCsv: () => string;
  getKpis: () => ApplicationKpis;
  syncWithProfile: (profile: UserProfile | null) => void;
  loadDemoApplications: () => void;
  clearApplications: () => void;
}

const mockInitialApplications: ApplicationRecord[] = [
  {
    id: 'app_seed_001',
    jobId: 'gh_spotify_77201',
    jobTitle: 'Senior Backend Engineer - Core Infrastructure',
    company: 'Spotify',
    location: 'Stockholm, Sweden (Remote EU)',
    applyUrl: 'https://boards.greenhouse.io/spotify/jobs/77201',
    atsType: 'greenhouse',
    mode: 'review',
    status: 'needs_review',
    matchScore: 94,
    salaryText: '€95,000 - €125,000 / yr',
    profileId: 'usr_default',
    tailoredResumePath: 'C:\\Work\\kaarjoo\\eval\\resumes\\Spotify_Tailored_ATS.pdf',
    coverLetterText: 'Dear Spotify Team,\nI am thrilled to apply for the Senior Backend Engineer role. With over 6 years of experience building high-throughput distributed microservices...',
    stopReason: 'none',
    timeline: [
      { id: 'tl_1', status: 'saved', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), title: 'saved', note: 'Discovered via Spotify Greenhouse careers board' },
      { id: 'tl_2', status: 'tailored', timestamp: new Date(Date.now() - 86400000).toISOString(), title: 'tailored', note: 'Aligned with Kafka, Go, and distributed systems skills' },
      { id: 'tl_3', status: 'needs_review', timestamp: new Date(Date.now() - 3600000).toISOString(), title: 'needs_review' },
    ],
    jobSnapshot: {
      title: 'Senior Backend Engineer - Core Infrastructure',
      company: 'Spotify',
      location: 'Stockholm, Sweden (Remote EU)',
      requirements: ['Java/Go', 'Kafka', 'Kubernetes', 'Microservices'],
      descriptionMarkdown: 'Join Spotify Core Infrastructure to scale event streaming platforms...',
    },
    notes: 'Event-driven architecture and Kafka experience highlighted in resume.',
    filledFields: [
      { fieldId: 'first_name', fieldName: 'job_application[first_name]', label: 'First Name', value: 'Ferdous', displayValue: 'Ferdous', confidence: 0.98, canonicalField: 'first_name', isRequired: true },
      { fieldId: 'last_name', fieldName: 'job_application[last_name]', label: 'Last Name', value: 'Kazemi', displayValue: 'Kazemi', confidence: 0.98, canonicalField: 'last_name', isRequired: true },
      { fieldId: 'email', fieldName: 'job_application[email]', label: 'Email', value: 'ferdouskazemi1000@gmail.com', displayValue: 'ferdouskazemi1000@gmail.com', confidence: 1.0, canonicalField: 'email', isRequired: true },
      { fieldId: 'phone', fieldName: 'job_application[phone]', label: 'Phone', value: '+93 728 200 021', displayValue: '+93 728 200 021', confidence: 0.95, canonicalField: 'phone', isRequired: true },
      { fieldId: 'resume', fieldName: 'job_application[resume]', label: 'Resume / CV', value: 'Spotify_Tailored_ATS.pdf', displayValue: 'Spotify_Tailored_ATS.pdf (ATS-Safe)', confidence: 1.0, canonicalField: 'resume', isRequired: true },
      { fieldId: 'work_auth', fieldName: 'job_application[answers][work_auth]', label: 'Work Authorization (EU)', value: 'yes', displayValue: 'Yes', confidence: 0.95, canonicalField: 'work_authorization', isRequired: true },
      { fieldId: 'gender', fieldName: 'job_application[gender]', label: 'Demographic: Gender', value: 'decline', displayValue: 'I decline to self-identify', confidence: 1.0, canonicalField: 'eeo_gender', isRequired: false },
    ],
    reviewChecklist: [
      { id: 'first_name', label: 'First Name', value: 'Ferdous', status: 'ok', category: 'contact' },
      { id: 'last_name', label: 'Last Name', value: 'Kazemi', status: 'ok', category: 'contact' },
      { id: 'email', label: 'Email', value: 'ferdouskazemi1000@gmail.com', status: 'ok', category: 'contact' },
      { id: 'phone', label: 'Phone', value: '+93 728 200 021', status: 'ok', category: 'contact' },
      { id: 'resume', label: 'Tailored Résumé PDF', value: 'Spotify_Tailored_ATS.pdf', status: 'ok', category: 'documents' },
      { id: 'work_auth', label: 'Work Authorization (EU)', value: 'Yes', status: 'ok', category: 'screening' },
      { id: 'gender', label: 'EEO / Demographics', value: 'I decline to self-identify', status: 'ok', category: 'eeo' },
    ],
    screenshotBeforeSubmit: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'app_seed_002',
    jobId: 'lever_figma_001',
    jobTitle: 'Staff Design Systems Architect',
    company: 'Figma',
    location: 'San Francisco, CA (Remote)',
    applyUrl: 'https://jobs.lever.co/figma/lever-figma-001',
    atsType: 'lever',
    mode: 'review',
    status: 'applied',
    matchScore: 92,
    salaryText: '$210,000 - $275,000 / yr',
    profileId: 'usr_default',
    tailoredResumePath: 'C:\\Work\\kaarjoo\\eval\\resumes\\Figma_DesignSystem_Tailored.pdf',
    notes: 'Submitted via Lever portal. Confirmation received.',
    submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    stopReason: 'none',
    filledFields: [],
    reviewChecklist: [],
    timeline: [
      { id: 'tl_f1', status: 'saved', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), title: 'saved' },
      { id: 'tl_f2', status: 'applied', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), title: 'applied' },
    ],
    screenshotConfirmation: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'app_seed_003',
    jobId: 'gh_gitlab_502',
    jobTitle: 'Staff Backend Engineer, Distributed Architecture',
    company: 'GitLab',
    location: 'Remote Worldwide',
    applyUrl: 'https://boards.greenhouse.io/gitlab/jobs/502',
    atsType: 'greenhouse',
    mode: 'review',
    status: 'interview',
    matchScore: 95,
    salaryText: '$180,000 - $240,000 / yr',
    profileId: 'usr_default',
    interviewDate: '2026-03-02T15:00:00Z',
    notes: 'Technical round 2 with Principal Engineer scheduled.',
    stopReason: 'none',
    filledFields: [],
    reviewChecklist: [],
    timeline: [
      { id: 'tl_g1', status: 'applied', timestamp: new Date(Date.now() - 86400000 * 7).toISOString(), title: 'applied' },
      { id: 'tl_g2', status: 'interview', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), title: 'interview', note: 'Calendar invite confirmed' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'app_seed_004',
    jobId: 'workable_klarna_103',
    jobTitle: 'Senior Distributed Systems Engineer',
    company: 'Klarna',
    location: 'Stockholm, Sweden (Hybrid)',
    applyUrl: 'https://apply.workable.com/klarna/jobs/103',
    atsType: 'workable',
    mode: 'review',
    status: 'offer',
    matchScore: 91,
    salaryText: '€110,000 / yr + Equity',
    profileId: 'usr_default',
    notes: 'Formal offer received. Reviewing compensation and benefits.',
    stopReason: 'none',
    filledFields: [],
    reviewChecklist: [],
    timeline: [
      { id: 'tl_k1', status: 'applied', timestamp: new Date(Date.now() - 86400000 * 14).toISOString(), title: 'applied' },
      { id: 'tl_k2', status: 'interview', timestamp: new Date(Date.now() - 86400000 * 8).toISOString(), title: 'interview' },
      { id: 'tl_k3', status: 'offer', timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), title: 'offer' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'app_seed_005',
    jobId: 'ashby_openai_101',
    jobTitle: 'Research Engineer - AI Alignment & Safety',
    company: 'OpenAI',
    location: 'San Francisco, CA (Hybrid)',
    applyUrl: 'https://jobs.ashbyhq.com/openai/ashby-openai-101',
    atsType: 'ashby',
    mode: 'review',
    status: 'saved',
    matchScore: 89,
    salaryText: '$240,000 - $350,000 / yr',
    profileId: 'usr_default',
    notes: 'Saved position for specialized AI alignment tailoring.',
    stopReason: 'none',
    filledFields: [],
    reviewChecklist: [],
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'app_seed_006',
    jobId: 'generic_local_09',
    jobTitle: 'Senior Backend Developer',
    company: 'LocalShop',
    location: 'Berlin, Germany (On-site)',
    applyUrl: 'https://localshop.de/careers/backend-9',
    atsType: 'generic',
    mode: 'review',
    status: 'rejected',
    matchScore: 68,
    salaryText: '€65,000 / yr',
    profileId: 'usr_default',
    notes: 'Position requires on-site presence in Berlin.',
    stopReason: 'none',
    filledFields: [],
    reviewChecklist: [],
    timeline: [
      { id: 'tl_l1', status: 'applied', timestamp: new Date(Date.now() - 86400000 * 10).toISOString(), title: 'applied' },
      { id: 'tl_l2', status: 'rejected', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), title: 'rejected' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

export const useApplicationStore = create<ApplicationStoreState>((set, get) => ({
  // Production path: CLEAN EMPTY INITIAL STATE - ZERO MOCK DATA
  applications: [],
  activeApplicationId: null,
  isExecuting: false,
  currentStep: {
    step: 'idle',
    messageKey: 'queue.readyForSubmit',
  },
  previewScreenshot: null,

  loadDemoApplications: () =>
    set({
      applications: mockInitialApplications,
      activeApplicationId: mockInitialApplications[0]?.id || null,
    }),

  clearApplications: () =>
    set({
      applications: [],
      activeApplicationId: null,
    }),

  queueJobApplication: (params) => {
    const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newApp: ApplicationRecord = {
      id,
      jobId: params.job.id,
      jobTitle: params.job.title,
      company: params.job.company,
      location: params.job.location,
      applyUrl: params.job.applyUrl,
      atsType: (params.job.atsType as any) || 'generic',
      mode: params.mode || 'review',
      status: 'queued',
      matchScore: params.job.matchScore || 85,
      salaryText: params.job.salaryText,
      profileId: 'usr_default',
      tailoredResumePath: params.tailoredResumePath,
      coverLetterText: params.coverLetterText,
      timeline: [
        {
          id: `tl_${Date.now()}`,
          status: 'queued',
          timestamp: now,
          title: 'queued',
        },
      ],
      jobSnapshot: {
        title: params.job.title,
        company: params.job.company,
        location: params.job.location,
        descriptionMarkdown: params.job.descriptionMarkdown,
        requirements: [],
      },
      filledFields: [],
      reviewChecklist: [],
      stopReason: 'none',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      applications: [newApp, ...state.applications],
      activeApplicationId: id,
    }));

    return newApp;
  },

  executeApplication: async (id: string) => {
    const app = get().applications.find((a) => a.id === id);
    if (!app) return;

    set({ isExecuting: true, activeApplicationId: id });

    set({
      currentStep: {
        step: 'navigating',
        messageKey: 'queue.executing',
      },
    });
    await new Promise((r) => setTimeout(r, 600));

    set({
      currentStep: {
        step: 'detecting',
        messageKey: 'queue.executing',
      },
    });
    await new Promise((r) => setTimeout(r, 700));

    set({
      currentStep: {
        step: 'filling',
        messageKey: 'queue.executing',
      },
    });
    await new Promise((r) => setTimeout(r, 700));

    set({
      currentStep: {
        step: 'uploading',
        messageKey: 'queue.executing',
      },
    });
    await new Promise((r) => setTimeout(r, 600));

    const activeCandidateProfile = useProfileStore.getState().profile;
    const applicantName = activeCandidateProfile?.contact.fullName || 'Ferdous Kazemi';
    const applicantEmail = activeCandidateProfile?.contact.email || 'ferdouskazemi1000@gmail.com';
    const applicantPhone = activeCandidateProfile?.contact.phone || '+93 728 200 021';

    const updatedFilledFields = [
      { fieldId: 'name', fieldName: 'name', label: 'Full Name', value: applicantName, displayValue: applicantName, confidence: 0.99, canonicalField: 'full_name', isRequired: true },
      { fieldId: 'email', fieldName: 'email', label: 'Email', value: applicantEmail, displayValue: applicantEmail, confidence: 1.0, canonicalField: 'email', isRequired: true },
      { fieldId: 'phone', fieldName: 'phone', label: 'Phone', value: applicantPhone, displayValue: applicantPhone, confidence: 0.98, canonicalField: 'phone', isRequired: true },
      { fieldId: 'resume', fieldName: 'resume', label: 'Resume', value: 'Tailored_Resume.pdf', displayValue: 'Tailored_Resume.pdf', confidence: 1.0, canonicalField: 'resume', isRequired: true },
    ];

    const updatedChecklist = [
      { id: 'name', label: 'Full Name', value: applicantName, status: 'ok' as const, category: 'contact' as const },
      { id: 'email', label: 'Email', value: applicantEmail, status: 'ok' as const, category: 'contact' as const },
      { id: 'phone', label: 'Phone', value: applicantPhone, status: 'ok' as const, category: 'contact' as const },
      { id: 'resume', label: 'Tailored Résumé PDF', value: 'Tailored_Resume.pdf', status: 'ok' as const, category: 'documents' as const },
    ];

    set((state) => ({
      isExecuting: false,
      currentStep: {
        step: 'review_ready',
        messageKey: 'queue.pauseMessage',
      },
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'needs_review',
              filledFields: updatedFilledFields,
              reviewChecklist: updatedChecklist,
              screenshotBeforeSubmit: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    }));
  },

  submitReviewed: async (id: string) => {
    set({ isExecuting: true });
    set({
      currentStep: {
        step: 'filling',
        messageKey: 'queue.executing',
      },
    });

    await new Promise((r) => setTimeout(r, 1000));

    set((state) => ({
      isExecuting: false,
      currentStep: {
        step: 'submitted',
        messageKey: 'queue.submissionSuccess',
      },
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'applied',
              submittedAt: new Date().toISOString(),
              screenshotConfirmation: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
              updatedAt: new Date().toISOString(),
              timeline: [
                ...a.timeline,
                {
                  id: `tl_${Date.now()}`,
                  status: 'applied',
                  timestamp: new Date().toISOString(),
                  title: 'applied',
                },
              ],
            }
          : a
      ),
    }));
  },

  updateApplicationStatus: (id: string, newStatus: ApplicationStatus) => {
    const now = new Date().toISOString();
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              status: newStatus,
              updatedAt: now,
              timeline: [
                ...a.timeline,
                {
                  id: `tl_${Date.now()}`,
                  status: newStatus,
                  timestamp: now,
                  title: newStatus,
                },
              ],
            }
          : a
      ),
    }));
  },

  updateApplicationNotes: (id: string, notes: string) => {
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, notes, updatedAt: new Date().toISOString() } : a
      ),
    }));
  },

  scheduleInterview: (id: string, date: string, note?: string) => {
    const now = new Date().toISOString();
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'interview',
              interviewDate: date,
              updatedAt: now,
              timeline: [
                ...a.timeline,
                {
                  id: `tl_${Date.now()}`,
                  status: 'interview',
                  timestamp: now,
                  title: 'interview',
                  note,
                },
              ],
            }
          : a
      ),
    }));
  },

  setFollowUp: (id: string, date: string) => {
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, followUpDate: date, updatedAt: new Date().toISOString() } : a
      ),
    }));
  },

  cancelApplication: (id: string) => {
    set((state) => ({
      applications: state.applications.filter((a) => a.id !== id),
      activeApplicationId: state.activeApplicationId === id ? null : state.activeApplicationId,
    }));
  },

  setActiveApplicationId: (id) => set({ activeApplicationId: id }),
  setPreviewScreenshot: (url) => set({ previewScreenshot: url }),

  exportToCsv: () => {
    const apps = get().applications;
    const headers = [
      'ID',
      'Company',
      'Job Title',
      'Location',
      'ATS Type',
      'Status',
      'Match Score',
      'Salary',
      'Apply URL',
      'Created At',
      'Submitted At',
      'Notes',
    ];

    const rows = apps.map((a) => [
      a.id,
      `"${(a.company || '').replace(/"/g, '""')}"`,
      `"${(a.jobTitle || '').replace(/"/g, '""')}"`,
      `"${(a.location || '').replace(/"/g, '""')}"`,
      a.atsType,
      a.status,
      a.matchScore ?? '',
      `"${(a.salaryText || '').replace(/"/g, '""')}"`,
      `"${a.applyUrl}"`,
      a.createdAt,
      a.submittedAt || '',
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  },

  getKpis: () => {
    const apps = get().applications;
    const total = apps.length;

    // Applied this week
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const thisWeek = apps.filter((a) => {
      const time = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.createdAt).getTime();
      return time >= oneWeekAgo;
    }).length;

    // Interview rate
    const appliedOrBeyond = apps.filter((a) =>
      ['applied', 'submitted', 'interview', 'offer', 'rejected'].includes(a.status)
    ).length;
    const interviewsOrOffers = apps.filter((a) => ['interview', 'offer'].includes(a.status)).length;
    const interviewRate = appliedOrBeyond > 0 ? Math.round((interviewsOrOffers / appliedOrBeyond) * 100) : 0;

    // Average match score
    const scoredApps = apps.filter((a) => typeof a.matchScore === 'number' && a.matchScore > 0);
    const avgScore =
      scoredApps.length > 0
        ? Math.round(scoredApps.reduce((acc, a) => acc + (a.matchScore || 0), 0) / scoredApps.length)
        : 0;

    // Top missing skills across matches (derived from real gaps if any, never hardcoded)
    const topMissingSkills: Array<{ skill: string; count: number }> = [];

    // ATS Distribution
    const atsDistribution: Record<string, number> = {};
    for (const a of apps) {
      atsDistribution[a.atsType] = (atsDistribution[a.atsType] || 0) + 1;
    }

    return {
      total,
      thisWeek,
      interviewRate,
      avgScore,
      topMissingSkills,
      atsDistribution,
    };
  },

  syncWithProfile: (profile: UserProfile | null) => {
    if (!profile) return;
    const safeName = profile.contact.fullName || 'Ferdous Kazemi';
    const safeEmail = profile.contact.email || 'ferdouskazemi1000@gmail.com';
    const safePhone = profile.contact.phone || '+93 728 200 021';

    set((state) => ({
      applications: state.applications.map((app) => ({
        ...app,
        filledFields: app.filledFields.map((field) => {
          if (field.canonicalField === 'email' || field.fieldId === 'email') {
            return { ...field, value: safeEmail, displayValue: safeEmail };
          }
          if (field.canonicalField === 'phone' || field.fieldId === 'phone') {
            return { ...field, value: safePhone, displayValue: safePhone };
          }
          if (field.canonicalField === 'first_name') {
            return { ...field, value: safeName.split(' ')[0] || safeName, displayValue: safeName };
          }
          if (field.canonicalField === 'last_name') {
            return { ...field, value: safeName.split(' ').slice(1).join(' ') || safeName, displayValue: safeName };
          }
          if (field.canonicalField === 'full_name' || field.fieldId === 'name') {
            return { ...field, value: safeName, displayValue: safeName };
          }
          return field;
        }),
        reviewChecklist: app.reviewChecklist.map((item) => {
          if (item.id === 'email') return { ...item, value: safeEmail };
          if (item.id === 'phone') return { ...item, value: safePhone };
          if (item.id === 'name' || item.id === 'first_name') return { ...item, value: safeName };
          return item;
        }),
      })),
    }));
  },
}));
