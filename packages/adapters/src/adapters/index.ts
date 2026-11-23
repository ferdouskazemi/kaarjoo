import type { SourceHealthStatus } from '@kaarjoo/shared';
import type { PoliteHttpClient } from '../network/client.js';
import type { SourceAdapter } from '../types.js';
import { GreenhouseAdapter } from './greenhouse.js';
import { LeverAdapter } from './lever.js';
import { AshbyAdapter } from './ashby.js';
import { WorkableAdapter } from './workable.js';
import { WeWorkRemotelyAdapter } from './weworkremotely.js';
import { AssistJobAdapter } from './assist.js';

export * from './greenhouse.js';
export * from './lever.js';
export * from './ashby.js';
export * from './workable.js';
export * from './weworkremotely.js';
export * from './assist.js';

export class AdapterRegistry {
  private adapters = new Map<string, SourceAdapter>();

  constructor() {
    this.register(new GreenhouseAdapter());
    this.register(new LeverAdapter());
    this.register(new AshbyAdapter());
    this.register(new WorkableAdapter());
    this.register(new WeWorkRemotelyAdapter());
    this.register(new AssistJobAdapter());
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
