import readline from 'node:readline';
import {
  JsonRpcRequest,
  JsonRpcRequestSchema,
  JsonRpcResponse,
  RpcErrorCode,
  JSONRPC_VERSION,
} from '@kaarjoo/shared';

export type RpcHandler = (params: any) => Promise<any> | any;

export class StdioRpcServer {
  private handlers = new Map<string, RpcHandler>();
  private rl: readline.Interface | null = null;

  public register(method: string, handler: RpcHandler): void {
    this.handlers.set(method, handler);
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

      const handler = this.handlers.get(request.method);
      if (!handler) {
        this.sendError(request.id, RpcErrorCode.MethodNotFound, `Method '${request.method}' not found`);
        return;
      }

      try {
        const result = await handler(request.params);
        this.sendResult(request.id, result);
      } catch (err: any) {
        this.sendError(request.id, RpcErrorCode.InternalError, err.message || 'Internal handler error');
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
