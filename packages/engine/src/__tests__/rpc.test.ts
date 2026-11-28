import { describe, it, expect, vi } from 'vitest';
import { StdioRpcServer, stripNulls } from '../rpc.js';
import { JsonRpcResponse, UserProfileSchema, z } from '@kaarjoo/shared';

describe('StdioRpcServer', () => {
  it('registers and executes methods returning proper JSON-RPC response', async () => {
    const server = new StdioRpcServer();
    let sentOutput = '';

    // Mock stdout
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      sentOutput += chunk.toString();
      return true;
    });

    server.register('math.add', ({ a, b }: { a: number; b: number }) => a + b);

    // Call result
    server.sendResult(1, 42);

    expect(sentOutput).toContain('"jsonrpc":"2.0"');
    expect(sentOutput).toContain('"id":1');
    expect(sentOutput).toContain('"result":42');

    writeSpy.mockRestore();
  });

  it('handles error responses properly', () => {
    const server = new StdioRpcServer();
    let sentOutput = '';

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      sentOutput += chunk.toString();
      return true;
    });

    server.sendError('req-123', -32601, "Method 'unknown' not found");

    const parsed: JsonRpcResponse = JSON.parse(sentOutput);
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe('req-123');
    expect(parsed.error?.code).toBe(-32601);
    expect(parsed.error?.message).toBe("Method 'unknown' not found");

    writeSpy.mockRestore();
  });

  it('strips null optional fields from Rust payloads before Zod schema validation', () => {
    const rawFromRust = {
      profile: {
        id: 'p1',
        version: 1,
        contact: {
          fullName: 'Ferdous Kazemi',
          email: 'ferdous@example.com',
          phone: null,
          location: null,
          linkedinUrl: null,
          githubUrl: null,
          portfolioUrl: null,
          provenance: null,
        },
        summary: null,
        experiences: [],
        education: [],
        skills: [
          {
            id: 's1',
            name: 'React',
            escoId: null,
            category: null,
            yearsOfExperience: null,
            level: null,
            confidence: null,
            provenance: null,
          },
        ],
        targetTitles: ['Frontend Engineer'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    };

    const cleaned = stripNulls(rawFromRust);
    const parsed = z.object({ profile: UserProfileSchema }).safeParse(cleaned);
    expect(parsed.success).toBe(true);
  });

  it('round-trips a Rust-serialized profile with null provenance evidence through stripNulls and UserProfileSchema', () => {
    const rustProfileWithNulls = {
      id: 'prof_rust_1',
      version: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      contact: {
        fullName: 'Sara Ahmadi',
        email: 'sara@example.com',
        phone: '+1 555 010 0199',
        location: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        provenance: null,
      },
      summary: null,
      experiences: [],
      education: [],
      skills: [],
      languages: [],
      certifications: [],
      targetTitles: [],
      workAuthorization: [],
      fieldProvenance: {
        'contact.email': {
          value: 'sara@example.com',
          confidence: 0.98,
          evidence: null,
          method: 'rule',
        },
      },
      issues: [],
    };

    const stripped = stripNulls(rustProfileWithNulls);
    const parsed = UserProfileSchema.safeParse(stripped);
    expect(parsed.success, JSON.stringify(parsed)).toBe(true);
  });
});
