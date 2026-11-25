import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SmartRecruitersAdapter,
  RecruiteeAdapter,
  PersonioAdapter,
  TeamtailorAdapter,
  BambooHRAdapter,
  BreezyAdapter,
  JazzHRAdapter,
  PinpointAdapter,
  RipplingAdapter,
  JoinAdapter,
  WorkdayAdapter,
  RemotiveAdapter,
  RemoteOKAdapter,
  WorkingNomadsAdapter,
  HimalayasAdapter,
  ReliefWebAdapter,
  UNjobsAdapter,
  AcbarAdapter,
  JobsAfAdapter,
  defaultAdapterRegistry,
} from '../src/adapters/index.js';
import type { PoliteHttpClient } from '../src/network/client.js';
import type { AdapterContext } from '../src/types.js';

function createMockClient(contentMap: Record<string, string> | string): PoliteHttpClient {
  return {
    fetch: async (url: string) => {
      let content = typeof contentMap === 'string' ? contentMap : '';
      if (typeof contentMap === 'object') {
        const matchingKey = Object.keys(contentMap).find(k => url.includes(k));
        content = matchingKey ? contentMap[matchingKey] : Object.values(contentMap)[0] || '';
      }
      return {
        status: 200,
        text: async () => content,
        json: async <T>() => JSON.parse(content) as T,
        headers: new Headers(),
        fromCache: false,
      };
    },
    clearCache: () => {},
  } as unknown as PoliteHttpClient;
}

describe('Expanded ATS & Regional Job Adapters', () => {
  it('registers all 25 adapters in defaultAdapterRegistry and runs health checks', async () => {
    const list = defaultAdapterRegistry.list();
    expect(list.length).toBeGreaterThanOrEqual(25);
    expect(defaultAdapterRegistry.get('smartrecruiters')).toBeDefined();
    expect(defaultAdapterRegistry.get('recruitee')).toBeDefined();
    expect(defaultAdapterRegistry.get('personio')).toBeDefined();
    expect(defaultAdapterRegistry.get('teamtailor')).toBeDefined();
    expect(defaultAdapterRegistry.get('bamboohr')).toBeDefined();
    expect(defaultAdapterRegistry.get('breezy')).toBeDefined();
    expect(defaultAdapterRegistry.get('jazzhr')).toBeDefined();
    expect(defaultAdapterRegistry.get('pinpoint')).toBeDefined();
    expect(defaultAdapterRegistry.get('rippling')).toBeDefined();
    expect(defaultAdapterRegistry.get('join')).toBeDefined();
    expect(defaultAdapterRegistry.get('workday')).toBeDefined();
    expect(defaultAdapterRegistry.get('remotive')).toBeDefined();
    expect(defaultAdapterRegistry.get('remoteok')).toBeDefined();
    expect(defaultAdapterRegistry.get('workingnomads')).toBeDefined();
    expect(defaultAdapterRegistry.get('himalayas')).toBeDefined();
    expect(defaultAdapterRegistry.get('reliefweb')).toBeDefined();
    expect(defaultAdapterRegistry.get('unjobs')).toBeDefined();
    expect(defaultAdapterRegistry.get('acbar')).toBeDefined();
    expect(defaultAdapterRegistry.get('jobsaf')).toBeDefined();

    const mockClient = createMockClient('<html><body>OK</body></html>');
    const health = await defaultAdapterRegistry.checkHealth(mockClient);
    expect(health.length).toBeGreaterThanOrEqual(25);
    expect(health.every(h => h.status === 'healthy')).toBe(true);
  });

  describe('SmartRecruiters Adapter', () => {
    it('parses postings and fetches detail with compensation and requirements', async () => {
      const listJson = readFileSync(resolve(__dirname, 'fixtures/smartrecruiters.json'), 'utf-8');
      const detailJson = readFileSync(resolve(__dirname, 'fixtures/smartrecruiters_detail.json'), 'utf-8');
      const client = createMockClient({
        'postings?': listJson,
        'postings/': detailJson,
      });

      const adapter = new SmartRecruitersAdapter();
      const ctx: AdapterContext = { httpClient: client, companySlug: 'acme' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 10 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(2);
      expect(stubs[0].title).toBe('Senior Distributed Systems Engineer');
      expect(stubs[0].remoteType).toBe('remote');
      expect(stubs[1].remoteType).toBe('on-site');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.salary?.min).toBe(130000);
      expect(detail.descriptionMarkdown).toContain('mission-critical enterprise');
      expect(detail.requirements.length).toBeGreaterThan(0);
      expect(detail.simHash).toBeDefined();
    });
  });

  describe('Recruitee Adapter', () => {
    it('parses published offers and extracts markdown description', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/recruitee.json'), 'utf-8');
      const adapter = new RecruiteeAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json), companySlug: 'techcorp' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Senior Frontend Architect');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('React and TypeScript');
      expect(detail.employmentType).toBe('full-time');
    });
  });

  describe('Personio Adapter', () => {
    it('parses XML feed with CDATA job descriptions and schedules', async () => {
      const xml = readFileSync(resolve(__dirname, 'fixtures/personio.xml'), 'utf-8');
      const adapter = new PersonioAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(xml), companySlug: 'fintech-de' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Lead Backend Engineer (m/f/d)');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('Architect robust microservices');
      expect(detail.employmentType).toBe('full-time');
    });
  });

  describe('Teamtailor Adapter', () => {
    it('parses jobs array with remote status', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/teamtailor.json'), 'utf-8');
      const adapter = new TeamtailorAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json), companySlug: 'nordic-tech' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Staff Cloud Security Engineer');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('zero-trust architecture');
    });
  });

  describe('BambooHR Adapter', () => {
    it('parses result opening list and location parts', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/bamboohr.json'), 'utf-8');
      const adapter = new BambooHRAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json), companySlug: 'saasinc' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Data Platform Engineer');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('dbt, Snowflake, and Apache Airflow');
    });
  });

  describe('Breezy HR Adapter', () => {
    it('parses friendly ids and employment types', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/breezy.json'), 'utf-8');
      const adapter = new BreezyAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json), companySlug: 'startup' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Full Stack Engineer (TypeScript / Next.js)');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('Next.js, Node, and PostgreSQL');
    });
  });

  describe('JazzHR Adapter', () => {
    it('parses RSS feed items and links', async () => {
      const rss = readFileSync(resolve(__dirname, 'fixtures/jazzhr.rss'), 'utf-8');
      const adapter = new JazzHRAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(rss), companySlug: 'cloudcorp' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Site Reliability Engineer');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('high availability');
    });
  });

  describe('Pinpoint Adapter', () => {
    it('parses postings and nested location data', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/pinpoint.json'), 'utf-8');
      const adapter = new PinpointAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json), companySlug: 'scaleup' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Principal Machine Learning Engineer');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('NLP and generative AI');
    });
  });

  describe('Rippling Adapter', () => {
    it('parses workplaceType and department info', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/rippling.json'), 'utf-8');
      const adapter = new RipplingAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json), companySlug: 'fintech' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Senior Product Manager - Developer Tools');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('Drive roadmap and feature definition');
    });
  });

  describe('Join.com Adapter', () => {
    it('parses company jobs and salary structures', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/join.json'), 'utf-8');
      const adapter = new JoinAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json), companySlug: 'berlin-dev' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('DevOps Engineer (Kubernetes / Terraform)');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.salary?.min).toBe(85000);
      expect(detail.salary?.max).toBe(105000);
    });
  });

  describe('Workday Adapter (Beta)', () => {
    it('queries CXS service and fetches detail', async () => {
      const listJson = readFileSync(resolve(__dirname, 'fixtures/workday.json'), 'utf-8');
      const detailJson = readFileSync(resolve(__dirname, 'fixtures/workday_detail.json'), 'utf-8');
      const client = createMockClient({
        '/jobs': listJson,
        '/job/': detailJson,
      });

      const adapter = new WorkdayAdapter();
      const ctx: AdapterContext = { httpClient: client, companySlug: 'nvidia' };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) {
        stubs.push(s);
      }

      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Principal Systems Architect');
      expect(stubs[0].remoteType).toBe('remote');

      const detail = await adapter.fetchDetail(stubs[0], ctx);
      expect(detail.descriptionMarkdown).toContain('Lead technical architecture');
      expect(detail.employmentType).toBe('full-time');
    });
  });

  describe('Remote Feeds (Remotive, RemoteOK, Working Nomads, Himalayas)', () => {
    it('parses Remotive jobs feed', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/remotive.json'), 'utf-8');
      const adapter = new RemotiveAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].company).toBe('Distributed Labs');
      expect(stubs[0].remoteType).toBe('remote');
    });

    it('parses RemoteOK jobs feed', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/remoteok.json'), 'utf-8');
      const adapter = new RemoteOKAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Lead Go Developer');
      expect(stubs[0].remoteType).toBe('remote');
    });

    it('parses Working Nomads ElasticSearch hits', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/workingnomads.json'), 'utf-8');
      const adapter = new WorkingNomadsAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].company).toBe('SecurePath');
    });

    it('parses Himalayas remote jobs API', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/himalayas.json'), 'utf-8');
      const adapter = new HimalayasAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toBe('Senior React Native Mobile Engineer');
      expect(stubs[0].remoteType).toBe('remote');
    });
  });

  describe('Regional & NGO Boards (ReliefWeb, UNjobs, ACBAR, Jobs.af)', () => {
    it('parses ReliefWeb humanitarian vacancies', async () => {
      const json = readFileSync(resolve(__dirname, 'fixtures/reliefweb.json'), 'utf-8');
      const adapter = new ReliefWebAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(json) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].company).toBe('UNICEF');
      expect(stubs[0].location).toContain('Afghanistan');
    });

    it('parses UNjobs RSS feed', async () => {
      const rss = readFileSync(resolve(__dirname, 'fixtures/unjobs.rss'), 'utf-8');
      const adapter = new UNjobsAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(rss) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].title).toContain('Project Coordinator');
      expect(stubs[0].company).toBe('UNDP');
    });

    it('parses ACBAR.org HTML table', async () => {
      const html = readFileSync(resolve(__dirname, 'fixtures/acbar.html'), 'utf-8');
      const adapter = new AcbarAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(html) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].company).toBe('Action Against Hunger');
      expect(stubs[0].location).toBe('Herat, Afghanistan');
    });

    it('parses Jobs.af RSS vacancies', async () => {
      const rss = readFileSync(resolve(__dirname, 'fixtures/jobsaf.rss'), 'utf-8');
      const adapter = new JobsAfAdapter();
      const ctx: AdapterContext = { httpClient: createMockClient(rss) };

      const stubs = [];
      for await (const s of adapter.search({ limit: 5 }, ctx)) stubs.push(s);
      expect(stubs).toHaveLength(1);
      expect(stubs[0].company).toBe('Roshan Telecom');
    });
  });
});
