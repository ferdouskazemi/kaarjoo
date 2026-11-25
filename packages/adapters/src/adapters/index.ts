import type { SourceHealthStatus } from '@kaarjoo/shared';
import type { PoliteHttpClient } from '../network/client.js';
import type { SourceAdapter } from '../types.js';
import { GreenhouseAdapter } from './greenhouse.js';
import { LeverAdapter } from './lever.js';
import { AshbyAdapter } from './ashby.js';
import { WorkableAdapter } from './workable.js';
import { WeWorkRemotelyAdapter } from './weworkremotely.js';
import { AssistJobAdapter } from './assist.js';
import { SmartRecruitersAdapter } from './smartrecruiters.js';
import { RecruiteeAdapter } from './recruitee.js';
import { PersonioAdapter } from './personio.js';
import { TeamtailorAdapter } from './teamtailor.js';
import { BambooHRAdapter } from './bamboohr.js';
import { BreezyAdapter } from './breezy.js';
import { JazzHRAdapter } from './jazzhr.js';
import { PinpointAdapter } from './pinpoint.js';
import { RipplingAdapter } from './rippling.js';
import { JoinAdapter } from './join.js';
import { WorkdayAdapter } from './workday.js';
import { RemotiveAdapter } from './remotive.js';
import { RemoteOKAdapter } from './remoteok.js';
import { WorkingNomadsAdapter } from './workingnomads.js';
import { HimalayasAdapter } from './himalayas.js';
import { ReliefWebAdapter } from './reliefweb.js';
import { UNjobsAdapter } from './unjobs.js';
import { AcbarAdapter } from './acbar.js';
import { JobsAfAdapter } from './jobsaf.js';

export * from './greenhouse.js';
export * from './lever.js';
export * from './ashby.js';
export * from './workable.js';
export * from './weworkremotely.js';
export * from './assist.js';
export * from './smartrecruiters.js';
export * from './recruitee.js';
export * from './personio.js';
export * from './teamtailor.js';
export * from './bamboohr.js';
export * from './breezy.js';
export * from './jazzhr.js';
export * from './pinpoint.js';
export * from './rippling.js';
export * from './join.js';
export * from './workday.js';
export * from './remotive.js';
export * from './remoteok.js';
export * from './workingnomads.js';
export * from './himalayas.js';
export * from './reliefweb.js';
export * from './unjobs.js';
export * from './acbar.js';
export * from './jobsaf.js';

export class AdapterRegistry {
  private adapters = new Map<string, SourceAdapter>();

  constructor() {
    this.register(new GreenhouseAdapter());
    this.register(new LeverAdapter());
    this.register(new AshbyAdapter());
    this.register(new WorkableAdapter());
    this.register(new WeWorkRemotelyAdapter());
    this.register(new AssistJobAdapter());
    this.register(new SmartRecruitersAdapter());
    this.register(new RecruiteeAdapter());
    this.register(new PersonioAdapter());
    this.register(new TeamtailorAdapter());
    this.register(new BambooHRAdapter());
    this.register(new BreezyAdapter());
    this.register(new JazzHRAdapter());
    this.register(new PinpointAdapter());
    this.register(new RipplingAdapter());
    this.register(new JoinAdapter());
    this.register(new WorkdayAdapter());
    this.register(new RemotiveAdapter());
    this.register(new RemoteOKAdapter());
    this.register(new WorkingNomadsAdapter());
    this.register(new HimalayasAdapter());
    this.register(new ReliefWebAdapter());
    this.register(new UNjobsAdapter());
    this.register(new AcbarAdapter());
    this.register(new JobsAfAdapter());
  }

  public register(adapter: SourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public get(id: string): SourceAdapter | undefined {
    return this.adapters.get(id);
  }

  public list(): SourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Run health checks on public endpoints to flag broken selectors/APIs.
   */
  public async checkHealth(httpClient: PoliteHttpClient): Promise<SourceHealthStatus[]> {
    const statuses: SourceHealthStatus[] = [];

    for (const adapter of this.adapters.values()) {
      if (adapter.id === 'assist') {
        statuses.push({
          adapterId: adapter.id,
          name: adapter.name,
          status: 'healthy',
          lastCheckedAt: new Date().toISOString(),
          latencyMs: 0,
          message: 'Assist mode ready for manual job page imports.',
        });
        continue;
      }

      const start = Date.now();
      try {
        const res = await httpClient.fetch(adapter.homepage, {
          rateLimitPerMinute: 60,
          checkRobots: false,
          maxRetries: 1,
        });

        const latency = Date.now() - start;
        statuses.push({
          adapterId: adapter.id,
          name: adapter.name,
          status: res.status < 400 ? 'healthy' : 'degraded',
          lastCheckedAt: new Date().toISOString(),
          latencyMs: latency,
          message: res.status < 400 ? 'Online' : `HTTP status ${res.status}`,
        });
      } catch (err) {
        statuses.push({
          adapterId: adapter.id,
          name: adapter.name,
          status: 'failing',
          lastCheckedAt: new Date().toISOString(),
          latencyMs: Date.now() - start,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return statuses;
  }
}

export const defaultAdapterRegistry = new AdapterRegistry();
