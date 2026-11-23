import type { AdapterMode, JobPosting, JobStub, SearchQuery } from '@kaarjoo/shared';
import type { PoliteHttpClient } from './network/client.js';

export interface AdapterLogger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

export interface AdapterContext {
  httpClient: PoliteHttpClient;
  companySlug?: string;
  abortSignal?: AbortSignal;
  logger?: AdapterLogger;
}

export interface SourceAdapter {
  id: string;
  name: string;
  homepage: string;
  mode: AdapterMode;
  termsReviewed: {
    date: string;
    notes: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    concurrency: number;
  };
  needsBrowser: boolean;
  applyAdapter?: string;

  search(query: SearchQuery, ctx: AdapterContext): AsyncIterable<JobStub>;
  fetchDetail(stub: JobStub, ctx: AdapterContext): Promise<JobPosting>;
}
