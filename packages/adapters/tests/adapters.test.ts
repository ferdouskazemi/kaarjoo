import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AshbyAdapter } from '../src/adapters/ashby.js';
import { GreenhouseAdapter } from '../src/adapters/greenhouse.js';
import { LeverAdapter } from '../src/adapters/lever.js';
import { WeWorkRemotelyAdapter } from '../src/adapters/weworkremotely.js';
import { WorkableAdapter } from '../src/adapters/workable.js';
import type { PoliteHttpClient } from '../src/network/client.js';
import type { AdapterContext } from '../src/types.js';

describe('Job Source Adapters (US & EU)', () => {
  // Helper to create mock PoliteHttpClient returning fixture text
  function createMockClient(fixtureContent: string): PoliteHttpClient {
    return {
      fetch: async () => ({
        status: 200,
        text: async () => fixtureContent,
        json: async <T>() => JSON.parse(fixtureContent) as T,
        headers: new Headers(),
        fromCache: false,
      }),
      clearCache: () => {},
    } as unknown as PoliteHttpClient;
  }

  describe('Greenhouse Adapter', () => {
    it('searches and yields Greenhouse jobs with remote detection', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/greenhouse.json'), 'utf-8');
      const adapter = new GreenhouseAdapter();
      const ctx: AdapterContext = {
        httpClient: createMockClient(json),
        companySlug: 'stripe',
      };

      const stubs = [];
      for await (const stub of adapter.search({ limit: 10 }, ctx)) {
        stubs.push(stub);
      }

      expect(stubs).toHaveLength(2);
      expect(stubs[0].title).toBe('Staff Software Engineer - Global Payments');
      expect(stubs[0].remoteType).toBe('remote');
      expect(stubs[1].remoteType).toBe('on-site');

      // Test detail fetching
      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('Stripe builds economic infrastructure');
      expect(detail.simHash).toBeDefined();
    });
  });

  describe('Lever Adapter', () => {
    it('searches and yields Lever jobs with compensation', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/lever.json'), 'utf-8');
      const adapter = new LeverAdapter();
      const ctx: AdapterContext = {
        httpClient: createMockClient(json),
        companySlug: 'figma',
      };

      const stubs = [];
      for await (const stub of adapter.search({ limit: 10 }, ctx)) {
        stubs.push(stub);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Principal Product Designer - Editor');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.salary?.min).toBe(210000);
      expect(detail.salary?.max).toBe(275000);
      expect(detail.descriptionMarkdown).toContain('Figma is looking for a Principal Product Designer');
    });
  });

  describe('Ashby Adapter', () => {
    it('searches and yields Ashby jobs', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/ashby.json'), 'utf-8');
      const adapter = new AshbyAdapter();
      const ctx: AdapterContext = {
        httpClient: createMockClient(json),
        companySlug: 'openai',
      };

      const stubs = [];
      for await (const stub of adapter.search({ limit: 10 }, ctx)) {
        stubs.push(stub);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Research Engineer - Alignment');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('Advance the frontier of safe AI alignment');
    });
  });

  describe('Workable Adapter', () => {
    it('searches and yields Workable jobs', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/workable.json'), 'utf-8');
      const adapter = new WorkableAdapter();
      const ctx: AdapterContext = {
        httpClient: createMockClient(json),
        companySlug: 'klarna',
      };

      const stubs = [];
      for await (const stub of adapter.search({ limit: 10 }, ctx)) {
        stubs.push(stub);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Senior Cloud Infrastructure Architect');
      expect(stubs[0].remoteType).toBe('remote');
    });
  });

  describe('WeWorkRemotely RSS Adapter', () => {
    it('parses RSS feed items into job stubs', async () => {
      const rss = readFileSync(resolve(__dirname, 'fixtures/weworkremotely.rss'), 'utf-8');
      const adapter = new WeWorkRemotelyAdapter();
      const ctx: AdapterContext = {
        httpClient: createMockClient(rss),
      };

      const stubs = [];
      for await (const stub of adapter.search({ limit: 10 }, ctx)) {
        stubs.push(stub);
      }

      expect(stubs.length).toBeGreaterThan(0);
      expect(stubs[0].company).toBe('GitLab');
      expect(stubs[0].title).toBe('Staff Backend Engineer, Secure');
      expect(stubs[0].remoteType).toBe('remote');
    });
  });
});
