import readline from 'node:readline';
import {
  z,
  JsonRpcRequest,
  JsonRpcRequestSchema,
  JsonRpcResponse,
  RpcErrorCode,
  JSONRPC_VERSION,
} from '@kaarjoo/shared';

export function stripNulls(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map((v) => stripNulls(v));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== null) {
        out[k] = stripNulls(v);
      }
    }
    return out;
  }
  return value;
}

export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

export interface MethodConfig<TInput = any, TOutput = any> {
  inputSchema?: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  handler: (params: TInput) => Promise<TOutput> | TOutput;
}

export type RpcRegistration<TInput = any, TOutput = any> =
  | MethodConfig<TInput, TOutput>
  | ((params: TInput) => Promise<TOutput> | TOutput);

export class StdioRpcServer {
  private handlers = new Map<string, MethodConfig>();
  private rl: readline.Interface | null = null;

  public register<TInput = any, TOutput = any>(
    method: string,
    registration: RpcRegistration<TInput, TOutput>
  ): void {
    if (typeof registration === 'function') {
      this.handlers.set(method, { handler: registration });
    } else {
      this.handlers.set(method, registration);
    }
  }

  public start(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    this.rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let request: JsonRpcRequest;
      try {
        const parsed = JSON.parse(trimmed);
        request = JsonRpcRequestSchema.parse(parsed);
      } catch (err: any) {
        this.sendError(null, RpcErrorCode.ParseError, `Invalid JSON-RPC request: ${err.message}`);
        return;
      }

      const entry = this.handlers.get(request.method);
      if (!entry) {
        this.sendError(request.id, RpcErrorCode.MethodNotFound, `Method '${request.method}' not found`);
        return;
      }

      let params = stripNulls(request.params);
      if (entry.inputSchema) {
        const parseResult = entry.inputSchema.safeParse(params);
        if (!parseResult.success) {
          const detail = parseResult.error.issues
            .map((i: any) => `${i.path.join('.') || 'root'}: ${i.message}`)
            .join('; ');
          this.sendError(
            request.id,
            RpcErrorCode.InvalidParams,
            `Invalid parameters for method '${request.method}': ${detail}`,
            parseResult.error.format()
          );
          return;
        }
        params = parseResult.data;
      }

      try {
        const result = await entry.handler(params);
        if (entry.outputSchema) {
          const outParse = entry.outputSchema.safeParse(result);
          if (!outParse.success) {
            console.error(`[RPC Warning] Output schema validation mismatch for '${request.method}':`, outParse.error.issues);
          }
        }
        this.sendResult(request.id, result);
      } catch (err: any) {
        const code = typeof err?.code === 'number' ? err.code : RpcErrorCode.InternalError;
        this.sendError(request.id, code, err?.message || 'Internal handler error', err?.data);
      }
    });

    // Notify ready
    this.sendNotification('engine.ready', {
      timestamp: Date.now(),
      pid: process.pid,
      version: '0.1.0',
    });
  }

  public sendResult(id: any, result: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: JSONRPC_VERSION,
      id,
      result: result ?? null,
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  public sendError(id: any, code: number, message: string, data?: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: JSONRPC_VERSION,
      id,
      error: { code, message, data },
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  public sendNotification(method: string, params?: any): void {
    const notification = {
      jsonrpc: JSONRPC_VERSION,
      method,
      params,
    };
    process.stdout.write(JSON.stringify(notification) + '\n');
  }

  public stop(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}
