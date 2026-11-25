import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commands } from '../bindings';
import type {
  UserProfileDto,
  JobPostingDto,
  JobsSearchQueryDto,
  ApplicationRecordDto,
  ProfileExtractionResultDto,
  TailoredDocumentResultDto,
  CompanyBoardDto,
} from '../bindings';

// --- Profile Hooks ---
export function useProfile() {
  return useQuery<UserProfileDto | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await commands.profileGet();
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfileDto) => {
      const res = await commands.profileSave(profile);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useExtractProfile() {
  const qc = useQueryClient();
  return useMutation<ProfileExtractionResultDto, Error, string>({
    mutationFn: async (filePath: string) => {
      const res = await commands.profileParseAndExtract(filePath);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useClearProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await commands.profileClear();
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// --- Jobs Hooks ---
export function useJobs(query?: JobsSearchQueryDto) {
  return useQuery<JobPostingDto[]>({
    queryKey: ['jobs', query],
    queryFn: async () => {
      const res = await commands.jobsSearch(query ?? {
        keywords: null,
        locations: null,
        remoteOnly: null,
        company: null,
        atsType: null,
        limit: 50,
      });
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
  });
}

export function useJob(id: string | null) {
  return useQuery<JobPostingDto | null>({
    queryKey: ['job', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await commands.jobsGet(id);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useScoreJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await commands.matchingScoreJob(jobId);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useRankAllJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await commands.matchingRankAll();
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

// --- Document Tailoring Hooks ---
export function useTailorDocument() {
  return useMutation<TailoredDocumentResultDto, Error, { jobId: string; templateId: string; lang: string }>({
    mutationFn: async ({ jobId, templateId, lang }) => {
      const res = await commands.documentsTailor(jobId, templateId, lang);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
  });
}

// --- Applications Hooks ---
export function useApplications() {
  return useQuery<ApplicationRecordDto[]>({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await commands.applicationsGetAll();
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
  });
}

export function useApplication(id: string | null) {
  return useQuery<ApplicationRecordDto | null>({
    queryKey: ['application', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await commands.applicationsGet(id);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      mode,
      resumePath,
      coverLetter,
    }: {
      jobId: string;
      mode: string;
      resumePath: string | null;
      coverLetter: string | null;
    }) => {
      const res = await commands.applicationsCreate(jobId, mode, resumePath, coverLetter);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await commands.applicationsUpdateStatus(id, status);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useExecuteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await commands.applicationsExecuteReview(id);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await commands.applicationsSubmitReviewed(id);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

// --- Settings Hooks ---
export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await commands.settingsGetAll();
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
  });
}

export function useSetSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await commands.settingsSet(key, value);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useWipeAllData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await commands.settingsWipeAllData();
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

// --- FTS Search & Company Directory Hooks ---

export function useJobsSearchFts(query: string, limit = 50) {
  return useQuery<JobPostingDto[]>({
    queryKey: ['jobs', 'fts', query, limit],
    queryFn: async () => {
      const res = await commands.jobsSearchFts(query, limit);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    enabled: Boolean(query.trim()),
  });
}

export function useDirectory(filter?: {
  atsType?: string | null;
  country?: string | null;
  remotePolicy?: string | null;
  search?: string | null;
  isFollowed?: boolean | null;
  limit?: number;
}) {
  return useQuery<CompanyBoardDto[]>({
    queryKey: ['directory', filter],
    queryFn: async () => {
      const res = await commands.directoryList(
        filter?.atsType ?? null,
        filter?.country ?? null,
        filter?.remotePolicy ?? null,
        filter?.search ?? null,
        filter?.isFollowed ?? null,
        filter?.limit ?? 100
      );
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
  });
}

export function useToggleFollowCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, isFollowed }: { boardId: string; isFollowed: boolean }) => {
      const res = await commands.directoryToggleFollow(boardId, isFollowed);
      if (res.status === 'error') throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directory'] });
    },
  });
}
