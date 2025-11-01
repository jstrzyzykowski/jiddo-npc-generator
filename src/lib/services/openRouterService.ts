import { z, type ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

type EnvRecord = Record<string, string | undefined>;

function getAstroEnv(): EnvRecord | undefined {
  const meta = import.meta as ImportMeta & { env?: EnvRecord };
  return meta.env;
}

const DEFAULT_MODEL = "openai/gpt-4o-mini" as const;

export interface OpenRouterServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  appUrl?: string;
  appTitle?: string;
  defaultModel?: string;
  defaultModelParams?: Record<string, unknown>;
  requestTimeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
}

export type NpcDetailResponseDto = Record<string, unknown>;

export type OpenRouterErrorType =
  | "ConfigError"
  | "BadRequest"
  | "ValidationError"
  | "RateLimited"
  | "UpstreamError"
  | "Timeout"
  | "NetworkError"
  | "InvalidResponse"
  | "UnknownError";

export interface OpenRouterErrorOptions {
  readonly message?: string;
  readonly statusCode?: number;
  readonly requestId?: string;
  readonly isRetryable?: boolean;
  readonly details?: unknown;
  readonly raw?: unknown;
  readonly cause?: unknown;
}

export class OpenRouterError extends Error {
  public readonly statusCode?: number;
  public readonly requestId?: string;
  public readonly isRetryable?: boolean;
  public readonly details?: unknown;
  public readonly raw?: unknown;

  constructor(
    public readonly type: OpenRouterErrorType,
    options: OpenRouterErrorOptions = {}
  ) {
    super(options.message ?? type);
    this.name = "OpenRouterError";
    this.statusCode = options.statusCode;
    this.requestId = options.requestId;
    this.isRetryable = options.isRetryable;
    this.details = options.details;
    this.raw = options.raw;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      requestId: this.requestId,
      isRetryable: this.isRetryable,
      details: this.details,
    } satisfies Record<string, unknown>;
  }
}

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly appUrl?: string;
  private readonly appTitle?: string;
  private readonly configuredDefaultModel?: string;
  private readonly configuredDefaultModelParams?: Readonly<Record<string, unknown>>;

  constructor(opts: OpenRouterServiceOptions = {}) {
    const astroEnv = getAstroEnv();
    const apiKey =
      opts.apiKey ??
      astroEnv?.OPENROUTER_API_KEY ??
      (typeof process !== "undefined" ? process.env?.OPENROUTER_API_KEY : undefined);

    if (!apiKey) {
      throw new OpenRouterError("ConfigError", { message: "Missing OPENROUTER_API_KEY" });
    }

    this.apiKey = apiKey;
    this.baseUrl = opts.baseUrl ?? "https://openrouter.ai/api/v1";
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 60_000;
    this.maxRetries = opts.maxRetries ?? 2;
    this.retryBackoffMs = opts.retryBackoffMs ?? 500;
    this.appUrl = opts.appUrl ?? astroEnv?.APP_URL;
    this.appTitle = opts.appTitle ?? astroEnv?.APP_TITLE;
    this.configuredDefaultModel = opts.defaultModel;
    this.configuredDefaultModelParams = opts.defaultModelParams;
  }

  get defaultModel() {
    return this.configuredDefaultModel;
  }

  get defaultModelParams() {
    return this.configuredDefaultModelParams;
  }

  async generateNpcXml(
    npc: NpcDetailResponseDto,
    opts?: { model?: string; modelParams?: Record<string, unknown> }
  ): Promise<string> {
    if (!npc || typeof npc !== "object") {
      throw new OpenRouterError("BadRequest", {
        message: "npc must be a non-null object",
        isRetryable: false,
      });
    }

    const { systemPrompt, userPrompt } = this.buildNpcPrompts(npc);

    const responseSchema = this.getNpcResponseSchema();
    const manualSchema = {
      type: "object",
      properties: { xml: { type: "string" } },
      required: ["xml"],
      additionalProperties: false,
    } as const;

    const responseFormat = {
      type: "json_schema",
      json_schema: {
        name: "NpcXmlResponse",
        strict: true,
        schema: manualSchema,
      },
    } as const;

    try {
      const raw = await this.chatCompleteRaw({
        messages: this.buildMessages(systemPrompt, userPrompt),
        model: opts?.model,
        modelParams: {
          seed: 7,
          temperature: 0,
          top_p: 1,
          max_tokens: 2_000,
          ...(opts?.modelParams ?? {}),
        },
        responseFormat,
      });

      const content = this.getFirstChoiceContent(raw);
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new OpenRouterError("InvalidResponse", {
          message: "OpenRouter completion did not include text content",
          raw,
        });
      }

      const validated = this.parseAndValidate<{ xml: string }>(content, responseSchema);
      return validated.xml;
    } catch (error) {
      if (this.isResponseFormatUnsupported(error)) {
        return this.generateNpcXmlFallback(npc, opts);
      }

      throw error;
    }
  }

  async generateStructuredJson<TSchema extends ZodTypeAny>(input: {
    systemPrompt: string;
    userPrompt: string;
    schema: TSchema;
    schemaName?: string;
    model?: string;
    modelParams?: Record<string, unknown>;
  }): Promise<TSchema["_output"]> {
    const { systemPrompt, userPrompt, schema, schemaName, model, modelParams } = input;

    if (typeof systemPrompt !== "string" || systemPrompt.trim().length === 0) {
      throw new OpenRouterError("BadRequest", {
        message: "systemPrompt must be a non-empty string",
        isRetryable: false,
      });
    }

    if (typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
      throw new OpenRouterError("BadRequest", {
        message: "userPrompt must be a non-empty string",
        isRetryable: false,
      });
    }

    if (!schema || typeof (schema as ZodTypeAny).safeParse !== "function") {
      throw new OpenRouterError("BadRequest", {
        message: "schema must be a Zod schema",
        isRetryable: false,
      });
    }

    const messages = this.buildMessages(systemPrompt, userPrompt);
    const responseFormat = this.buildResponseFormatFromSchema(schemaName ?? "StructuredResponse", schema);
    const rawCompletion = await this.chatCompleteRaw({
      messages,
      model,
      modelParams,
      responseFormat,
    });

    const content = this.getFirstChoiceContent(rawCompletion);
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new OpenRouterError("InvalidResponse", {
        message: "OpenRouter completion did not include text content",
        raw: rawCompletion,
      });
    }

    return this.parseAndValidate<TSchema["_output"]>(content, schema);
  }

  async chatCompleteRaw(input: {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    model?: string;
    modelParams?: Record<string, unknown>;
    responseFormat?: unknown;
  }): Promise<unknown> {
    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      throw new OpenRouterError("BadRequest", {
        message: "messages must be a non-empty array",
        isRetryable: false,
      });
    }

    for (const message of input.messages) {
      if (!message || typeof message.content !== "string" || message.content.length === 0) {
        throw new OpenRouterError("BadRequest", {
          message: "Each message must include non-empty string content",
          isRetryable: false,
        });
      }
    }

    const model = this.normalizeModelName(input.model);
    const headers = this.buildHeaders();
    const body = this.buildChatCompletionBody({
      model,
      messages: input.messages,
      responseFormat: input.responseFormat,
      modelParams: input.modelParams,
    });

    return this.safeFetchJson(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.appUrl) headers["HTTP-Referer"] = this.appUrl;
    if (this.appTitle) headers["X-Title"] = this.appTitle;
    return headers;
  }

  private buildMessages(systemPrompt: string, userPrompt: string) {
    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];
  }

  private buildResponseFormatFromSchema(name: string, schema: ZodTypeAny) {
    const jsonSchema = zodToJsonSchema(schema, {
      name,
      target: "jsonSchema7",
      $refStrategy: "none",
    });
    const cleanedSchema = this.normalizeJsonSchema(jsonSchema, name);

    return {
      type: "json_schema",
      json_schema: {
        name,
        strict: true,
        schema: cleanedSchema,
      },
    } as const;
  }

  private buildNpcPrompts(npc: NpcDetailResponseDto) {
    const systemPrompt = [
      "You are an expert NPC XML generator for Open Tibia (Jido, TFS <= 1.5).",
      "Return ONLY valid XML content. No markdown, no commentary.",
      "Follow the Jido NPC XML schema strictly and keep output deterministic.",
    ].join("\n");

    const safeNpc = npc ?? {};
    const userPrompt = ["Generate an NPC XML based on the following data.", JSON.stringify(safeNpc, null, 2)].join(
      "\n"
    );

    return { systemPrompt, userPrompt };
  }

  private normalizeModelName(model?: string) {
    if (typeof model === "string" && model.trim().length > 0) {
      return model.trim();
    }

    if (typeof this.configuredDefaultModel === "string" && this.configuredDefaultModel.trim().length > 0) {
      return this.configuredDefaultModel.trim();
    }

    return DEFAULT_MODEL;
  }

  private buildChatCompletionBody(input: {
    model: string;
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    responseFormat?: unknown;
    modelParams?: Record<string, unknown>;
  }) {
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };

    if (input.responseFormat !== undefined) {
      body.response_format = input.responseFormat;
    }

    const mergedParams = this.mergeModelParams(input.modelParams);
    for (const [key, value] of Object.entries(mergedParams)) {
      if (value !== undefined) {
        body[key] = value;
      }
    }

    return body;
  }

  private mergeModelParams(overrides?: Record<string, unknown>) {
    return {
      ...(this.configuredDefaultModelParams ?? {}),
      ...(overrides ?? {}),
    } as Record<string, unknown>;
  }

  private getFirstChoiceContent(completion: unknown) {
    const completionRecord = this.asRecord(completion);
    if (!completionRecord) {
      return undefined;
    }

    const choices = completionRecord.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      return undefined;
    }

    const firstChoice = choices[0];
    const choiceRecord = this.asRecord(firstChoice);
    if (!choiceRecord) {
      return undefined;
    }

    const messageRecord = this.asRecord(choiceRecord.message);
    if (!messageRecord) {
      return undefined;
    }

    const content = messageRecord.content;
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          const itemRecord = this.asRecord(item);
          if (!itemRecord) {
            return "";
          }

          const text = itemRecord.text;
          if (typeof text === "string") {
            return text;
          }

          return "";
        })
        .filter((segment) => segment.length > 0)
        .join("");
    }

    return undefined;
  }

  private async safeFetchJson<T = unknown>(url: string, init: RequestInit): Promise<T> {
    let attempt = 0;
    let lastError: OpenRouterError | undefined;

    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const externalSignal = init.signal as AbortSignal | undefined;
      let externalAbortListener: (() => void) | undefined;
      let didTimeout = false;
      const timeoutId = this.requestTimeoutMs
        ? setTimeout(() => {
            didTimeout = true;
            controller.abort();
          }, this.requestTimeoutMs)
        : undefined;

      try {
        if (externalSignal) {
          if (externalSignal.aborted) {
            controller.abort();
          } else {
            externalAbortListener = () => controller.abort();
            externalSignal.addEventListener("abort", externalAbortListener, { once: true });
          }
        }

        const fetchInit: RequestInit = { ...init, signal: controller.signal };
        const response = await fetch(url, fetchInit);
        const requestId = this.getRequestId(response.headers);
        const bodyText = await response.text();
        const parsedBody = this.tryParseJson(bodyText);

        if (!response.ok) {
          const error = this.mapHttpError(response, bodyText, parsedBody, requestId);
          lastError = error;

          if (this.shouldRetry(error, attempt, response.headers.get("retry-after"))) {
            await this.delay(this.nextRetryDelayMs(attempt, response.headers.get("retry-after")));
            attempt += 1;
            continue;
          }

          throw error;
        }

        if (bodyText.length === 0) {
          return undefined as T;
        }

        if (parsedBody === undefined) {
          throw new OpenRouterError("InvalidResponse", {
            message: "OpenRouter returned a non-JSON response",
            statusCode: response.status,
            requestId,
            raw: bodyText,
          });
        }

        return parsedBody as T;
      } catch (error) {
        const normalizedError = this.normalizeFetchError(error, didTimeout);
        lastError = normalizedError;

        if (this.shouldRetry(normalizedError, attempt)) {
          await this.delay(this.nextRetryDelayMs(attempt));
          attempt += 1;
          continue;
        }

        throw normalizedError;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (externalSignal && externalAbortListener) {
          externalSignal.removeEventListener("abort", externalAbortListener);
        }
      }
    }

    throw lastError ?? new OpenRouterError("UnknownError", { message: "OpenRouter request failed" });
  }

  private normalizeFetchError(error: unknown, didTimeout: boolean) {
    if (error instanceof OpenRouterError) {
      return error;
    }

    if (didTimeout) {
      return new OpenRouterError("Timeout", {
        message: "OpenRouter request timed out",
        isRetryable: false,
        cause: error,
      });
    }

    if (this.isAbortError(error)) {
      return new OpenRouterError("Timeout", {
        message: "OpenRouter request was aborted",
        isRetryable: false,
        cause: error,
      });
    }

    const message = error instanceof Error ? error.message : "Network request failed";

    return new OpenRouterError("NetworkError", {
      message,
      isRetryable: true,
      cause: error,
    });
  }

  private shouldRetry(error: OpenRouterError, attempt: number, retryAfter?: string | null) {
    if (!error.isRetryable) {
      return false;
    }

    if (attempt >= this.maxRetries) {
      return false;
    }

    if (error.type === "RateLimited" && retryAfter === "0") {
      return attempt < this.maxRetries;
    }

    return true;
  }

  private nextRetryDelayMs(attempt: number, retryAfterHeader?: string | null) {
    const baseDelay = this.retryBackoffMs * Math.max(1, 2 ** attempt);
    const retryAfterMs = this.parseRetryAfter(retryAfterHeader);
    if (retryAfterMs === undefined) {
      return baseDelay;
    }

    return Math.max(baseDelay, retryAfterMs);
  }

  private parseRetryAfter(retryAfterHeader?: string | null) {
    if (!retryAfterHeader) {
      return undefined;
    }

    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds)) {
      return Math.floor(seconds * 1000);
    }

    const dateMs = Date.parse(retryAfterHeader);
    if (!Number.isNaN(dateMs)) {
      const now = Date.now();
      const diff = dateMs - now;
      return diff > 0 ? diff : 0;
    }

    return undefined;
  }

  private async delay(ms: number) {
    if (ms <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private mapHttpError(response: Response, bodyText: string, parsedBody: unknown, requestId?: string) {
    const status = response.status;
    const payload = this.asRecord(parsedBody);
    const errorMessageFromPayload = this.extractErrorMessage(payload);
    const message = errorMessageFromPayload ?? response.statusText ?? "OpenRouter request failed";
    const errorDetails = payload ?? bodyText;

    if (status === 401 || status === 403) {
      return new OpenRouterError("ConfigError", {
        message,
        statusCode: status,
        requestId,
        isRetryable: false,
        details: errorDetails,
        raw: parsedBody ?? bodyText,
      });
    }

    if (status === 400) {
      return new OpenRouterError("BadRequest", {
        message,
        statusCode: status,
        requestId,
        isRetryable: false,
        details: errorDetails,
        raw: parsedBody ?? bodyText,
      });
    }

    if (status === 404) {
      return new OpenRouterError("BadRequest", {
        message: message || "Endpoint not found",
        statusCode: status,
        requestId,
        isRetryable: false,
        details: errorDetails,
        raw: parsedBody ?? bodyText,
      });
    }

    if (status === 409) {
      return new OpenRouterError("RateLimited", {
        message,
        statusCode: status,
        requestId,
        isRetryable: true,
        details: errorDetails,
        raw: parsedBody ?? bodyText,
      });
    }

    if (status === 429) {
      const retryAfter = response.headers.get("retry-after") ?? undefined;
      return new OpenRouterError("RateLimited", {
        message,
        statusCode: status,
        requestId,
        isRetryable: true,
        details: {
          retryAfter,
          error: errorDetails,
        },
        raw: parsedBody ?? bodyText,
      });
    }

    if (status >= 500 && status <= 599) {
      return new OpenRouterError("UpstreamError", {
        message,
        statusCode: status,
        requestId,
        isRetryable: true,
        details: errorDetails,
        raw: parsedBody ?? bodyText,
      });
    }

    return new OpenRouterError("UnknownError", {
      message,
      statusCode: status,
      requestId,
      isRetryable: false,
      details: errorDetails,
      raw: parsedBody ?? bodyText,
    });
  }

  private tryParseJson(bodyText: string) {
    if (!bodyText) {
      return undefined;
    }

    try {
      return JSON.parse(bodyText);
    } catch {
      return undefined;
    }
  }

  private extractErrorMessage(payload: Record<string, unknown> | undefined) {
    if (!payload) {
      return undefined;
    }

    const error = payload.error;
    if (this.isRecord(error)) {
      const message = error.message;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }

    const message = payload.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }

    return undefined;
  }

  private getRequestId(headers: Headers) {
    return headers.get("x-request-id") ?? headers.get("X-Request-Id") ?? undefined;
  }

  private isAbortError(error: unknown) {
    if (!error) {
      return false;
    }

    if (error instanceof DOMException) {
      return error.name === "AbortError";
    }

    if (error instanceof Error) {
      return error.name === "AbortError";
    }

    return false;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (this.isRecord(value)) {
      return value;
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private normalizeJsonSchema(schema: unknown, rootName: string): Record<string, unknown> {
    const record = this.asRecord(schema);
    if (!record) {
      return {};
    }

    const definition = this.extractJsonSchemaDefinition(record, rootName);
    const target = this.asRecord(definition) ?? record;
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(target)) {
      if (key === "definitions" || key === "$defs" || key === "$schema" || key === "$ref") {
        continue;
      }

      cleaned[key] = value;
    }

    if (this.isRecord(cleaned.properties) && cleaned.additionalProperties === undefined) {
      cleaned.additionalProperties = false;
    }

    return cleaned;
  }

  private extractJsonSchemaDefinition(schema: Record<string, unknown>, rootName: string) {
    if (!rootName) {
      return undefined;
    }

    const definitions = this.asRecord(schema.definitions);
    if (definitions) {
      const candidate = definitions[rootName];
      if (this.isRecord(candidate)) {
        return candidate;
      }
    }

    const defs = this.asRecord(schema.$defs);
    if (defs) {
      const candidate = defs[rootName];
      if (this.isRecord(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  private parseAndValidate<T>(content: string, schema: ZodTypeAny): T {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new OpenRouterError("ValidationError", {
        message: "Model response is not valid JSON",
        details: { content },
        isRetryable: false,
        cause: error,
      });
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new OpenRouterError("ValidationError", {
        message: "Model response does not match schema",
        details: result.error.format(),
        isRetryable: false,
        raw: parsed,
      });
    }

    return result.data as T;
  }

  private getNpcResponseSchema() {
    return z.object({
      xml: z.string().min(1, "XML content must not be empty").describe("Full, valid NPC XML content"),
    });
  }

  private isResponseFormatUnsupported(error: unknown) {
    if (!(error instanceof OpenRouterError)) return false;
    if (error.type !== "BadRequest") return false;

    const msg = (error.message || "").toLowerCase();
    if (msg.includes("response_format") || msg.includes("json_schema")) return true;

    const details = this.asRecord(error.details);
    const providerError = details && this.asRecord(details.error);
    const metadata = providerError && this.asRecord(providerError.metadata);
    const raw = metadata && metadata.raw;
    if (typeof raw === "string") {
      const lower = raw.toLowerCase();
      if (lower.includes("response_format") || lower.includes("json_schema") || lower.includes("invalid schema")) {
        return true;
      }
    }

    return false;
  }

  private async generateNpcXmlFallback(
    npc: NpcDetailResponseDto,
    opts?: { model?: string; modelParams?: Record<string, unknown> }
  ) {
    const { systemPrompt, userPrompt } = this.buildNpcPrompts(npc);
    const schema = this.getNpcResponseSchema();
    const jsonInstruction = `Return ONLY JSON matching this schema: ${JSON.stringify({
      type: "object",
      properties: {
        xml: { type: "string" },
      },
      required: ["xml"],
      additionalProperties: false,
    })}`;

    const structuredSystemPrompt = [`${systemPrompt}`, jsonInstruction].join("\n\n");

    const rawCompletion = await this.chatCompleteRaw({
      messages: this.buildMessages(structuredSystemPrompt, userPrompt),
      model: opts?.model,
      modelParams: {
        seed: 7,
        temperature: 0,
        top_p: 1,
        max_tokens: 2_000,
        ...(opts?.modelParams ?? {}),
      },
    });

    const content = this.getFirstChoiceContent(rawCompletion);
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new OpenRouterError("InvalidResponse", {
        message: "OpenRouter completion did not include any content",
        raw: rawCompletion,
      });
    }

    const extractedJson = this.extractJson(content);
    if (!extractedJson) {
      throw new OpenRouterError("ValidationError", {
        message: "Model response did not include valid JSON",
        raw: content,
      });
    }

    const result = this.parseAndValidate<{ xml: string }>(extractedJson, schema);
    return result.xml;
  }

  private extractJson(content: string) {
    const firstBrace = content.indexOf("{");
    if (firstBrace === -1) {
      return undefined;
    }

    let braceBalance = 0;
    for (let index = firstBrace; index < content.length; index += 1) {
      const char = content[index];
      if (char === "{") {
        braceBalance += 1;
      } else if (char === "}") {
        braceBalance -= 1;
        if (braceBalance === 0) {
          const candidate = content.slice(firstBrace, index + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            break;
          }
        }
      }
    }

    const lastBrace = content.lastIndexOf("}");
    if (lastBrace <= firstBrace) {
      return undefined;
    }

    const candidate = content.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      return undefined;
    }
  }
}
