import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '@kaarjoo/shared';

export interface ProfileStoreState {
  profile: UserProfile | null;
  uploadedFileName: string;
  uploadedDocumentText: string;
  documentMeta: { pageCount: number; fileType: string } | null;
  activeHighlight: string;
  activeFieldLabel: string;

  setProfile: (profile: UserProfile | null) => void;
  setUploadedDocument: (params: {
    fileName: string;
    text: string;
    meta: { pageCount: number; fileType: string };
  }) => void;
  setActiveHighlight: (text: string, label: string) => void;
  clearProfile: () => void;
  loadDemoProfile: () => void;
}

// Fixture used ONLY when Demo Mode is explicitly toggled ON by the user
export const DEMO_CANDIDATE_PROFILE: UserProfile = {
  id: 'prof_ferdous_kazemi',
  version: 1,
  createdAt: '2026-04-01',
  updatedAt: '2026-04-01',
  contact: {
    fullName: 'Ferdous Kazemi',
    email: 'ferdouskazemi1000@gmail.com',
    phone: '+93 728 200 021',
    location: 'Kabul, Afghanistan',
    linkedinUrl: 'https://linkedin.com/in/ferdous-kazemi',
    githubUrl: 'https://github.com/skazemi1000',
    provenance: {
      sourceFileId: 'Ferdous Kazemi Resume (april 2025).pdf',
      page: 1,
      textSpan: 'FERDOUS KAZEMI',
      confidence: 0.99,
      status: 'accepted',
    },
  },
  summary:
    'Senior Frontend & Full Stack Software Engineer with deep expertise in reactive architectures, component design systems, distributed backend services with Go, and modern interactive desktop applications.',
  experiences: [
    {
      id: 'exp_1',
      title: 'Mid-Level Front-End Developer',
      company: 'INOLITIX',
      location: 'Remote',
      startDate: '2022-01',
      isCurrent: true,
      achievements: [
        'Developed and maintained high-performance web applications with React, Next.js, TypeScript, and Tailwind CSS',
        'Implemented real-time modules and improved page load times by up to 60% with modern state management techniques',
      ],
      skillsUsed: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux'],
    },
    {
      id: 'exp_2',
      title: 'Full Stack & Software Engineer',
      company: 'Tech Solutions Inc',
      location: 'Kabul',
      startDate: '2019-03',
      endDate: '2021-12',
      isCurrent: false,
      achievements: [
        'Engineered scalable microservices in Go communicating via gRPC with PostgreSQL databases',
        'Built automated CI/CD pipelines and end-to-end integration test suites',
      ],
      skillsUsed: ['Go', 'PostgreSQL', 'Docker', 'REST APIs'],
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'Kabul University',
      degree: 'B.Sc. Computer Science & Software Engineering',
      fieldOfStudy: 'Software Engineering',
      startDate: '2015',
      endDate: '2019',
      grade: 'Top 5%',
    },
  ],
  skills: [
    { id: 'sk_1', name: 'TypeScript', level: 'expert', yearsOfExperience: 5 },
    { id: 'sk_2', name: 'React', level: 'expert', yearsOfExperience: 5 },
    { id: 'sk_3', name: 'Go', level: 'advanced', yearsOfExperience: 3 },
    { id: 'sk_4', name: 'Next.js', level: 'advanced', yearsOfExperience: 4 },
    { id: 'sk_5', name: 'Tailwind CSS', level: 'expert', yearsOfExperience: 4 },
    { id: 'sk_6', name: 'PostgreSQL', level: 'intermediate', yearsOfExperience: 3 },
    { id: 'sk_7', name: 'Docker', level: 'intermediate', yearsOfExperience: 2 },
  ],
  languages: [
    { id: 'lang_1', language: 'Persian / Dari', proficiency: 'native' },
    { id: 'lang_2', language: 'English', proficiency: 'C1' },
    { id: 'lang_3', language: 'Pashto', proficiency: 'C1' },
  ],
  certifications: ['Certified Kubernetes Application Developer (CKAD)'],
  targetTitles: ['Senior Frontend Engineer', 'Staff Fullstack Engineer', 'Software Architect'],
  workAuthorization: ['Worldwide Remote', 'EU Remote', 'US Remote'],
};

export const useProfileStore = create<ProfileStoreState>()(
  persist(
    (set) => ({
      // Production path: CLEAN EMPTY INITIAL STATE - ZERO MOCK DATA
      profile: null,
      uploadedFileName: '',
      uploadedDocumentText: '',
      documentMeta: null,
      activeHighlight: '',
      activeFieldLabel: '',

      setProfile: (profile) => set({ profile }),

      setUploadedDocument: ({ fileName, text, meta }) =>
        set({
          uploadedFileName: fileName,
          uploadedDocumentText: text,
          documentMeta: meta,
        }),

      setActiveHighlight: (text, label) =>
        set({
          activeHighlight: text,
          activeFieldLabel: label,
        }),

      clearProfile: () =>
        set({
          profile: null,
          uploadedFileName: '',
          uploadedDocumentText: '',
          documentMeta: null,
          activeHighlight: '',
          activeFieldLabel: '',
        }),

      loadDemoProfile: () =>
        set({
          profile: DEMO_CANDIDATE_PROFILE,
          uploadedFileName: 'Ferdous Kazemi Resume (april 2025).pdf',
          uploadedDocumentText: `FERDOUS KAZEMI\nEmail: ferdouskazemi1000@gmail.com\nPhone: +93 728 200 021\nLocation: Kabul, Afghanistan\n\nFull Stack & Frontend Engineer`,
          documentMeta: { pageCount: 2, fileType: 'pdf' },
          activeHighlight: 'ferdouskazemi1000@gmail.com',
          activeFieldLabel: 'Email',
        }),
    }),
    {
      name: 'kaarjoo_candidate_profile_v3',
    }
  )
);
