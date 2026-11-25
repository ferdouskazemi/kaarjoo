import {
  getLlama,
  LlamaChatSession,
  type GbnfJsonSchema,
  type Llama,
  type LlamaContext,
  type LlamaEmbeddingContext,
  type LlamaModel,
} from 'node-llama-cpp';
import {
  detectAiHardware,
  findInstalledModel,
  type AiHardwareReport,
  type ModelRuntimeStatus,
  type ModelTier,
} from './modelManifest.js';

export interface StructuredGenerationOptions<T> {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: GbnfJsonSchema<any>;
  preferredTier?: ModelTier;
  maxTokens?: number;
  temperature?: number;
  parseResult?: (raw: unknown) => T;
}

export interface StructuredGenerationOutput<T> {
  data: T;
  modelId: string;
  tier: ModelTier;
  tokensGenerated: number;
  durationMs: number;
  tokensPerSec: number;
}

export class LocalLlamaRuntime {
  private llama: Llama | null = null;
  private instructModel: LlamaModel | null = null;
  private instructContext: LlamaContext | null = null;
  private activeInstructMeta: ModelRuntimeStatus | null = null;

  private embeddingModel: LlamaModel | null = null;
  private embeddingContext: LlamaEmbeddingContext | null = null;
  private activeEmbeddingMeta: ModelRuntimeStatus | null = null;

  private idleTimer: NodeJS.Timeout | null = null;
  private idleTimeoutMs = 5 * 60 * 1000; // 5 minutes idle auto-unload
  private lastMetrics: { modelId: string; tokensPerSec: number; durationMs: number; updatedAt: string } | null = null;

  public setIdleTimeoutMs(ms: number): void {
    this.idleTimeoutMs = Math.max(1000, ms);
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.idleTimeoutMs > 0 && (this.instructModel || this.embeddingModel)) {
      this.idleTimer = setTimeout(() => {
        void this.unloadAll();
      }, this.idleTimeoutMs);
      this.idleTimer.unref?.();
    }
  }

  private async ensureLlama(): Promise<Llama> {
    if (!this.llama) {
      this.llama = await getLlama();
    }
    return this.llama;
  }

  public isInstructModelAvailable(preferredTier?: ModelTier): boolean {
    return Boolean(findInstalledModel('instruct', preferredTier));
  }

  public isEmbeddingModelAvailable(): boolean {
    return Boolean(findInstalledModel('embedding'));
  }

  public async getHardwareReport(): Promise<AiHardwareReport> {
    return detectAiHardware(this.llama ?? undefined);
  }

  public getRuntimeDiagnostics() {
    return {
      instructLoaded: Boolean(this.instructModel),
      activeInstructModelId: this.activeInstructMeta?.id ?? null,
      embeddingLoaded: Boolean(this.embeddingModel),
      activeEmbeddingModelId: this.activeEmbeddingMeta?.id ?? null,
      idleTimeoutMs: this.idleTimeoutMs,
      lastMetrics: this.lastMetrics,
    };
  }

  private async ensureInstructSession(preferredTier?: ModelTier): Promise<{
    llama: Llama;
    context: LlamaContext;
    meta: ModelRuntimeStatus;
  }> {
    const meta = findInstalledModel('instruct', preferredTier);
    if (!meta) {
      throw new Error('NO_INSTRUCT_MODEL_INSTALLED');
    }

    const llama = await this.ensureLlama();

    if (this.instructModel && this.instructContext && this.activeInstructMeta?.id === meta.id) {
      this.resetIdleTimer();
      return { llama, context: this.instructContext, meta };
    }

    await this.unloadInstruct();

    this.instructModel = await llama.loadModel({
      modelPath: meta.localPath,
    });
    this.instructContext = await this.instructModel.createContext({
      contextSize: Math.min(meta.contextSize, 8192),
    });
    this.activeInstructMeta = meta;
    this.resetIdleTimer();

    return { llama, context: this.instructContext, meta };
  }

  private async ensureEmbeddingContext(): Promise<{
    embeddingContext: LlamaEmbeddingContext;
    meta: ModelRuntimeStatus;
  }> {
    const meta = findInstalledModel('embedding');
    if (!meta) {
      throw new Error('NO_EMBEDDING_MODEL_INSTALLED');
    }

    const llama = await this.ensureLlama();
    if (this.embeddingModel && this.embeddingContext && this.activeEmbeddingMeta?.id === meta.id) {
      this.resetIdleTimer();
      return { embeddingContext: this.embeddingContext, meta };
    }

    await this.unloadEmbedding();

    this.embeddingModel = await llama.loadModel({
      modelPath: meta.localPath,
    });
    this.embeddingContext = await this.embeddingModel.createEmbeddingContext();
    this.activeEmbeddingMeta = meta;
    this.resetIdleTimer();

    return { embeddingContext: this.embeddingContext, meta };
  }

  public async generateStructured<T>(options: StructuredGenerationOptions<T>): Promise<StructuredGenerationOutput<T>> {
    const { llama, context, meta } = await this.ensureInstructSession(options.preferredTier);
    const grammar = await llama.createGrammarForJsonSchema(options.jsonSchema as any);
    const sequence = context.getSequence();
    const session = new LlamaChatSession({
      contextSequence: sequence,
      systemPrompt: options.systemPrompt,
    });

    const start = performance.now();
    let rawResponse = '';
    try {
      rawResponse = await session.prompt(options.userPrompt, {
        grammar,
        maxTokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.1,
      });
    } finally {
      session.dispose({ disposeSequence: true });
      this.resetIdleTimer();
    }

    const durationMs = Math.max(1, performance.now() - start);
    const parsedJson = grammar.parse(rawResponse);
    const data = options.parseResult ? options.parseResult(parsedJson) : (parsedJson as T);

    // Approximate token count cleanly using ~4 chars/token if exact tokenizer count isn't requested
    const tokensGenerated = Math.max(1, Math.round(rawResponse.length / 3.8));
    const tokensPerSec = Math.round((tokensGenerated / (durationMs / 1000)) * 10) / 10;

    this.lastMetrics = {
      modelId: meta.id,
      tokensPerSec,
      durationMs: Math.round(durationMs),
      updatedAt: new Date().toISOString(),
    };

    return {
      data,
      modelId: meta.id,
      tier: meta.tier,
      tokensGenerated,
      durationMs: Math.round(durationMs),
      tokensPerSec,
    };
  }

  public async embedText(text: string): Promise<{ vector: Float32Array; modelId: string }> {
    const { embeddingContext, meta } = await this.ensureEmbeddingContext();
    try {
      const embedding = await embeddingContext.getEmbeddingFor(text);
      const vector = Float32Array.from(embedding.vector);
      return { vector, modelId: meta.id };
    } finally {
      this.resetIdleTimer();
    }
  }

  public async unloadInstruct(): Promise<void> {
    if (this.instructContext) {
      await this.instructContext.dispose().catch(() => {});
      this.instructContext = null;
    }
    if (this.instructModel) {
      await this.instructModel.dispose().catch(() => {});
      this.instructModel = null;
    }
    this.activeInstructMeta = null;
  }

  public async unloadEmbedding(): Promise<void> {
    if (this.embeddingContext) {
      await this.embeddingContext.dispose().catch(() => {});
      this.embeddingContext = null;
    }
    if (this.embeddingModel) {
      await this.embeddingModel.dispose().catch(() => {});
      this.embeddingModel = null;
    }
    this.activeEmbeddingMeta = null;
  }

  public async unloadAll(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    await this.unloadInstruct();
    await this.unloadEmbedding();
    if (this.llama) {
      await this.llama.dispose().catch(() => {});
      this.llama = null;
    }
  }
}

export const defaultLlamaRuntime = new LocalLlamaRuntime();
