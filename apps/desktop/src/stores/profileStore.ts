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
}

export const INITIAL_CANDIDATE_PROFILE: UserProfile = {
  id: 'prof_ferdous_kazemi',
  version: 1,
  createdAt: '2026-04-01',
  updatedAt: '2026-04-01',
  contact: {
    fullName: 'فردوس کاظمی',
    email: 'ferdouskazemi1000@gmail.com',
    phone: '+93 728 200 021',
    location: 'کابل، افغانستان',
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
    'مهندس ارشد و فرانت‌اند با تسلط عمیق بر معماری‌های واکنشی، طراحی کامپوننت‌های بهینه‌سازی‌شده، توسعه سیستم‌های توزیع‌شده با Go و پلتفرم‌های تعاملی مدرن.',
  experiences: [
    {
      id: 'exp_1',
      title: 'Mid-Level Front-End Developer',
      company: 'INOLITIX',
      location: 'Remote',
      startDate: '2022-01',
      isCurrent: true,
      achievements: [
        'توسعه و نگهداری وب‌اپلیکیشن‌های پیشرفته با React, Next.js, TypeScript و Tailwind CSS',
        'پیاده‌سازی ماژول‌های بلادرنگ و بهینه‌سازی بارگذاری تا ۶۰٪ با متدهای مدرن State Management',
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
        'طراحی میکروسرویس‌های مقیاس‌پذیر با Go و ارتباط gRPC با پایگاه‌داده PostgreSQL',
        'پیاده‌سازی پایپ‌لاین‌های CI/CD و اتوماسیون تست‌های نرم‌افزار',
      ],
      skillsUsed: ['Go', 'PostgreSQL', 'Docker', 'REST APIs'],
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'دانشگاه کابل',
      degree: 'کارشناسی مهندسی کامپیوتر',
      fieldOfStudy: 'مهندسی نرم‌افزار',
      startDate: '2015',
      endDate: '2019',
      grade: 'ممتاز',
    },
  ],
  skills: [
    { id: 'sk_1', name: 'TypeScript', escoId: 'http://data.europa.eu/esco/skill/typescript', category: 'Technology' },
    { id: 'sk_2', name: 'React', escoId: 'http://data.europa.eu/esco/skill/react', category: 'Technology' },
    { id: 'sk_3', name: 'Go', escoId: 'http://data.europa.eu/esco/skill/go', category: 'Technology' },
    { id: 'sk_4', name: 'Next.js', escoId: 'http://data.europa.eu/esco/skill/nextjs', category: 'Technology' },
    { id: 'sk_5', name: 'Tailwind CSS', escoId: 'http://data.europa.eu/esco/skill/tailwind', category: 'Technology' },
    { id: 'sk_6', name: 'PostgreSQL', escoId: 'http://data.europa.eu/esco/skill/postgresql', category: 'Technology' },
    { id: 'sk_7', name: 'Docker', escoId: 'http://data.europa.eu/esco/skill/docker', category: 'Technology' },
    { id: 'sk_8', name: 'System Design', escoId: 'http://data.europa.eu/esco/skill/system-design', category: 'Technology' },
  ],
  languages: [
    { id: 'lang_1', language: 'فارسی', proficiency: 'native' },
    { id: 'lang_2', language: 'انگلیسی', proficiency: 'C1' },
  ],
  certifications: [],
  targetTitles: ['Senior Front-End Developer', 'Full Stack Engineer', 'Distributed Systems Engineer'],
  workAuthorization: ['Worldwide Remote', 'Germany', 'US', 'EU'],
};

export const useProfileStore = create<ProfileStoreState>()(
  persist(
    (set) => ({
      profile: INITIAL_CANDIDATE_PROFILE,
      uploadedFileName: 'Ferdous Kazemi Resume (april 2025).pdf',
      uploadedDocumentText: `FERDOUS KAZEMI
Mid-Level Front-End Developer
Kabul, Afghanistan | ferdouskazemi1000@gmail.com | +93 728 200 021 | linkedin.com/in/ferdous-kazemi

Professional Summary:
Passionate Front-End and Full-Stack Software Engineer with proven expertise building scalable responsive interfaces and distributed microservices.

Experience:
Mid-Level Front-End Developer | INOLITIX (2022 - Present)
• Architected dynamic client applications with React, Next.js, and TypeScript.
• Optimized state lifecycles and accelerated render times by 60%.

Skills:
TypeScript, React, Go, Next.js, Tailwind CSS, PostgreSQL, Docker, Git, CI/CD`,
      documentMeta: { pageCount: 2, fileType: 'pdf' },
      activeHighlight: 'ferdouskazemi1000@gmail.com',
      activeFieldLabel: 'ایمیل',

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
    }),
    {
      name: 'kaarjoo_candidate_profile_v2',
    }
  )
);
