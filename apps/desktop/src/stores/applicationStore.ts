import { create } from 'zustand';
import { ApplicationRecord, ApplicationMode } from '@kaarjoo/shared';

export interface ApplyingStepInfo {
  step: 'idle' | 'navigating' | 'detecting' | 'filling' | 'uploading' | 'review_ready' | 'submitted' | 'error';
  messageFa: string;
  messageEn: string;
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
      applyUrl: string;
      atsType?: string;
    };
    tailoredResumePath?: string;
    coverLetterText?: string;
    mode?: ApplicationMode;
  }) => ApplicationRecord;

  executeApplication: (id: string) => Promise<void>;
  submitReviewed: (id: string) => Promise<void>;
  cancelApplication: (id: string) => void;
  setActiveApplicationId: (id: string | null) => void;
  setPreviewScreenshot: (url: string | null) => void;
}

const mockInitialApplications: ApplicationRecord[] = [
  {
    id: 'app_seed_001',
    jobId: 'gh_spotify_77201',
    jobTitle: 'Senior Backend Engineer - Core Infrastructure',
    company: 'Spotify',
    applyUrl: 'https://boards.greenhouse.io/spotify/jobs/77201',
    atsType: 'greenhouse',
    mode: 'review',
    status: 'needs_review',
    profileId: 'usr_default',
    tailoredResumePath: 'C:\\Work\\kaarjoo\\eval\\resumes\\Spotify_Tailored_ATS.pdf',
    coverLetterText: 'Dear Spotify Team,\nI am thrilled to apply for the Senior Backend Engineer role. With over 6 years of experience building high-throughput distributed microservices...',
    stopReason: 'none',
    filledFields: [
      { fieldId: 'first_name', fieldName: 'job_application[first_name]', label: 'First Name', value: 'فردوس', displayValue: 'فردوس (Ferdous)', confidence: 0.98, canonicalField: 'first_name', isRequired: true },
      { fieldId: 'last_name', fieldName: 'job_application[last_name]', label: 'Last Name', value: 'کاظمی', displayValue: 'کاظمی (Kazemi)', confidence: 0.98, canonicalField: 'last_name', isRequired: true },
      { fieldId: 'email', fieldName: 'job_application[email]', label: 'Email', value: 'ferdous.kazemi@example.com', displayValue: 'ferdous.kazemi@example.com', confidence: 1.0, canonicalField: 'email', isRequired: true },
      { fieldId: 'phone', fieldName: 'job_application[phone]', label: 'Phone', value: '+49 170 1234567', displayValue: '+49 170 1234567', confidence: 0.95, canonicalField: 'phone', isRequired: true },
      { fieldId: 'resume', fieldName: 'job_application[resume]', label: 'Resume / CV', value: 'Spotify_Tailored_ATS.pdf', displayValue: 'Spotify_Tailored_ATS.pdf (ATS-Safe)', confidence: 1.0, canonicalField: 'resume', isRequired: true },
      { fieldId: 'linkedin_url', fieldName: 'job_application[urls][LinkedIn]', label: 'LinkedIn', value: 'https://linkedin.com/in/ferdouskazemi', displayValue: 'https://linkedin.com/in/ferdouskazemi', confidence: 1.0, canonicalField: 'linkedin', isRequired: false },
      { fieldId: 'github_url', fieldName: 'job_application[urls][GitHub]', label: 'GitHub', value: 'https://github.com/ferdouskazemi', displayValue: 'https://github.com/ferdouskazemi', confidence: 1.0, canonicalField: 'github', isRequired: false },
      { fieldId: 'work_auth', fieldName: 'job_application[answers][work_auth]', label: 'Legally authorized to work in EU/Sweden', value: 'yes', displayValue: 'Yes', confidence: 0.95, canonicalField: 'work_authorization', isRequired: true },
      { fieldId: 'gender', fieldName: 'job_application[gender]', label: 'Demographic: Gender', value: 'decline', displayValue: 'I decline to self-identify', confidence: 1.0, canonicalField: 'eeo_gender', isRequired: false },
    ],
    reviewChecklist: [
      { id: 'first_name', label: 'First Name', value: 'فردوس (Ferdous)', status: 'ok', category: 'contact' },
      { id: 'last_name', label: 'Last Name', value: 'کاظمی (Kazemi)', status: 'ok', category: 'contact' },
      { id: 'email', label: 'Email', value: 'ferdous.kazemi@example.com', status: 'ok', category: 'contact' },
      { id: 'phone', label: 'Phone', value: '+49 170 1234567', status: 'ok', category: 'contact' },
      { id: 'resume', label: 'Tailored Résumé PDF', value: 'Spotify_Tailored_ATS.pdf', status: 'ok', category: 'documents' },
      { id: 'cover_letter', label: 'Cover Letter', value: 'تولید شده بر اساس ۲ دستاورد واقعی (تأیید شده با گارد اصالت)', status: 'ok', category: 'documents' },
      { id: 'work_auth', label: 'Work Authorization (EU)', value: 'Yes (دارای مجوز کار قانونی)', status: 'ok', category: 'screening' },
      { id: 'gender', label: 'EEO / Demographics', value: 'I decline to self-identify (طبق استاندارد حفظ حریم خصوصی)', status: 'ok', category: 'eeo' },
    ],
    screenshotBeforeSubmit: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'app_seed_002',
    jobId: 'lever_figma_001',
    jobTitle: 'Staff Design Systems Architect',
    company: 'Figma',
    applyUrl: 'https://jobs.lever.co/figma/lever-figma-001',
    atsType: 'lever',
    mode: 'review',
    status: 'queued',
    profileId: 'usr_default',
    tailoredResumePath: 'C:\\Work\\kaarjoo\\eval\\resumes\\Figma_DesignSystem_Tailored.pdf',
    filledFields: [],
    reviewChecklist: [],
    stopReason: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useApplicationStore = create<ApplicationStoreState>((set, get) => ({
  applications: mockInitialApplications,
  activeApplicationId: 'app_seed_001',
  isExecuting: false,
  currentStep: {
    step: 'idle',
    messageFa: 'سیستم آماده بررسی درخواست‌هاست.',
    messageEn: 'System ready to review applications.',
  },
  previewScreenshot: null,

  queueJobApplication: (params) => {
    const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newApp: ApplicationRecord = {
      id,
      jobId: params.job.id,
      jobTitle: params.job.title,
      company: params.job.company,
      applyUrl: params.job.applyUrl,
      atsType: (params.job.atsType as any) || 'generic',
      mode: params.mode || 'review',
      status: 'queued',
      profileId: 'usr_default',
      tailoredResumePath: params.tailoredResumePath,
      coverLetterText: params.coverLetterText,
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

    // Step 1: Navigating
    set({
      currentStep: {
        step: 'navigating',
        messageFa: `در حال باز کردن صفحه رسمی استخدامی ${app.company} در مرورگر...`,
        messageEn: `Navigating to official career page at ${app.company}...`,
      },
    });
    await new Promise((r) => setTimeout(r, 700));

    // Step 2: Detecting fields & anti-bot check
    set({
      currentStep: {
        step: 'detecting',
        messageFa: 'شناسایی فیلدهای ورودی و بررسی عدم وجود چالش امنیتی (CAPTCHA)...',
        messageEn: 'Detecting form inputs and verifying no CAPTCHA challenges...',
      },
    });
    await new Promise((r) => setTimeout(r, 800));

    // Step 3: Filling inputs
    set({
      currentStep: {
        step: 'filling',
        messageFa: 'تکمیل هوشمند اطلاعات فردی، تماس، سوابق و پاسخ‌های گزینشی...',
        messageEn: 'Filling applicant contact, experience, and screening answers...',
      },
    });
    await new Promise((r) => setTimeout(r, 800));

    // Step 4: Attaching documents
    set({
      currentStep: {
        step: 'uploading',
        messageFa: 'پیوست فایل رزومه استاندارد ATS و کاورلتر اختصاصی تایید شده...',
        messageEn: 'Uploading ATS-tailored resume PDF and verified cover letter...',
      },
    });
    await new Promise((r) => setTimeout(r, 700));

    // Step 5: Final Review Step Reached
    const updatedFilledFields = [
      { fieldId: 'name', fieldName: 'name', label: 'Full Name', value: 'فردوس کاظمی', displayValue: 'فردوس کاظمی (Ferdous Kazemi)', confidence: 0.98, canonicalField: 'full_name', isRequired: true },
      { fieldId: 'email', fieldName: 'email', label: 'Email', value: 'ferdous.kazemi@example.com', displayValue: 'ferdous.kazemi@example.com', confidence: 1.0, canonicalField: 'email', isRequired: true },
      { fieldId: 'phone', fieldName: 'phone', label: 'Phone', value: '+49 170 1234567', displayValue: '+49 170 1234567', confidence: 0.95, canonicalField: 'phone', isRequired: true },
      { fieldId: 'org', fieldName: 'org', label: 'Current Company', value: 'Tech Innovation Hub', displayValue: 'Tech Innovation Hub', confidence: 0.92, canonicalField: 'current_company', isRequired: false },
      { fieldId: 'resume', fieldName: 'resume', label: 'Resume', value: 'Figma_DesignSystem_Tailored.pdf', displayValue: 'Figma_DesignSystem_Tailored.pdf (ATS-Safe)', confidence: 1.0, canonicalField: 'resume', isRequired: true },
      { fieldId: 'linkedin', fieldName: 'urls[LinkedIn]', label: 'LinkedIn', value: 'https://linkedin.com/in/ferdouskazemi', displayValue: 'https://linkedin.com/in/ferdouskazemi', confidence: 1.0, canonicalField: 'linkedin', isRequired: false },
    ];

    const updatedChecklist = [
      { id: 'name', label: 'Full Name', value: 'فردوس کاظمی (Ferdous Kazemi)', status: 'ok' as const, category: 'contact' as const },
      { id: 'email', label: 'Email', value: 'ferdous.kazemi@example.com', status: 'ok' as const, category: 'contact' as const },
      { id: 'phone', label: 'Phone', value: '+49 170 1234567', status: 'ok' as const, category: 'contact' as const },
      { id: 'resume', label: 'Tailored Résumé PDF', value: 'Figma_DesignSystem_Tailored.pdf', status: 'ok' as const, category: 'documents' as const },
      { id: 'company', label: 'Current Company', value: 'Tech Innovation Hub', status: 'ok' as const, category: 'contact' as const },
      { id: 'linkedin', label: 'LinkedIn Profile', value: 'https://linkedin.com/in/ferdouskazemi', status: 'ok' as const, category: 'contact' as const },
    ];

    set((state) => ({
      isExecuting: false,
      currentStep: {
        step: 'review_ready',
        messageFa: 'فرم با موفقیت تکمیل شد و در مرحله بازبینی نهایی متوقف گردید.',
        messageEn: 'Form filled successfully and paused at final review step.',
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
        messageFa: 'در حال کلیک بر روی دکمه ثبت نهایی فرم در مرورگر...',
        messageEn: 'Submitting final application in browser...',
      },
    });

    await new Promise((r) => setTimeout(r, 1200));

    set((state) => ({
      isExecuting: false,
      currentStep: {
        step: 'submitted',
        messageFa: 'درخواست با موفقیت ثبت شد و پیام تایید دریافت گردید.',
        messageEn: 'Application confirmed and submitted successfully.',
      },
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'submitted',
              submittedAt: new Date().toISOString(),
              screenshotConfirmation: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
              updatedAt: new Date().toISOString(),
            }
          : a
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
}));
