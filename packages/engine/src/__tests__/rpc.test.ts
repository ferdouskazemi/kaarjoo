import { describe, it, expect, vi } from 'vitest';
import { StdioRpcServer } from '../rpc.js';
import { JsonRpcResponse } from '@kaarjoo/shared';

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
});
