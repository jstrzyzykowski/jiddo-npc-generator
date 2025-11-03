# OpenRouterService – Implementation, Usage, and Testing Guide

## 1. Purpose & Scope

- Describe the goal of the service: reliable, secure, and deterministic integration with OpenRouter Chat Completions API for generating Jido NPC XML.
- Clarify usage boundaries: server-only (Astro SSR/API routes and Supabase Edge Functions), no client-side exposure of secrets.
- State primary consumers: Supabase `generation-worker` and potential Astro API routes.

## 2. Architecture & Environments

- Two variants with identical behavior, adapted to runtime:
  - Node/Astro: `src/lib/services/openRouterService.ts` (reads `import.meta.env` or `process.env`).
  - Supabase Edge (Deno): `supabase/_shared/services/openRouterService.ts` (reads `Deno.env`).
- Shared concepts: same public API, error model, retry/backoff, schema validation, deterministic parameters, and `response_format` use.

## 3. Installation & Dependencies

- Node/Astro package.json includes:
  - `zod` and `zod-to-json-schema` (already present in repo).
- Supabase Edge (Deno): imports via `npm:zod` and `npm:zod-to-json-schema`. Types declared in `supabase/_shared/types.d.ts`.
- No client-side installation required (service is server-only).

## 4. Configuration & Environment Variables

- Required:
  - `OPENROUTER_API_KEY`: API key for OpenRouter (server-only).
- Optional (recommended for OpenRouter telemetry):
  - `APP_URL`: sets `HTTP-Referer` header.
  - `APP_TITLE`: sets `X-Title` header.
- Precedence: constructor options > env vars. Missing `OPENROUTER_API_KEY` throws `OpenRouterError("ConfigError")`.

## 5. Public API

- Class: `OpenRouterService(options?: OpenRouterServiceOptions)`
  - Options: `apiKey?`, `baseUrl?` (default `https://openrouter.ai/api/v1`), `appUrl?`, `appTitle?`, `defaultModel?`, `defaultModelParams?`, `requestTimeoutMs?` (default 60000), `maxRetries?` (default 2), `retryBackoffMs?` (default 500).
  - Getters: `defaultModel`, `defaultModelParams`.
- `chatCompleteRaw(input): Promise<unknown>`
  - Input: `{ messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>, model?, modelParams?, responseFormat? }`.
  - Returns parsed JSON response from OpenRouter.
- `generateStructuredJson({ systemPrompt, userPrompt, schema, schemaName?, model?, modelParams? }): Promise<Output>`
  - Uses `response_format` with JSON Schema derived from Zod to force structured JSON; validates output.
- `generateNpcXml(npc, opts?): Promise<string>`
  - Builds Jido-focused prompts; enforces strict JSON response containing `{ xml: string }`; returns `xml` content only.
  - Fallback path when `response_format` is unsupported.

## 6. Request Construction & Models

- Headers include `Authorization: Bearer`, `Content-Type`, optional `HTTP-Referer`, `X-Title`.
- Messages: system + user. System enforces “raw XML only; no markdown; Jido/TFS <= 1.5 rules”.
- Default model: `openai/gpt-4o-mini` (deterministic, fast). Override via constructor or per-call.
- Deterministic params recommended for XML: `{ temperature: 0, top_p: 1, seed: 7, max_tokens: ~2000 }`.

## 7. Validation & Structured Responses

- Zod schemas converted to JSON Schema via `zod-to-json-schema` (`$refs` disabled).
- Clean-up of JSON Schema before sending: removes `$schema`, `$defs`, `definitions`.
- `parseAndValidate` parses model output (string -> JSON) and validates against Zod; throws `ValidationError` when mismatch.

## 8. Error Handling Model

- Custom `OpenRouterError` with `type`, `statusCode?`, `requestId?`, `isRetryable?`, `details?`, `raw?`.
- Types: `ConfigError`, `BadRequest`, `ValidationError`, `RateLimited`, `UpstreamError`, `Timeout`, `NetworkError`, `InvalidResponse`, `UnknownError`.
- HTTP mapping:
  - 400 → `BadRequest`, 401/403 → `ConfigError`, 429 → `RateLimited`, 5xx → `UpstreamError`, others → `UnknownError`.
- Invalid shape/empty content → `InvalidResponse`; JSON parse/validation errors → `ValidationError`.

## 9. Resilience: Timeout, Retry, Backoff

- `safeFetchJson` wraps `fetch` with:
  - AbortController timeout (default 60s).
  - Retries for retryable errors (`RateLimited`, `UpstreamError`, `NetworkError`) up to `maxRetries`.
  - Exponential backoff with floor `retryBackoffMs`; respects `Retry-After` header when present.

## 10. Fallback Strategy (No response_format support)

- When OpenRouter returns 400 indicating unsupported `response_format`/`json_schema`:
  - Re-issue request without `response_format`.
  - Strengthen prompts to “Return ONLY strict JSON matching schema …”.
  - Extract JSON from text heuristically; then validate with Zod.

## 11. Security Considerations

- API key is server-only; never expose to client.
- Logs should avoid sensitive prompt/response content; prefer metadata (e.g., requestId, timings).
- Rate limits & timeouts to cap cost/exposure.

## 12. Integration: Supabase generation-worker

- On `queued` job:
  - Set status `processing`.
  - Fetch NPC data.
  - `OpenRouterService.generateNpcXml(npc)`.
  - Save to Storage `npc-xml-files/{id}.xml`.
  - Set status `succeeded`; on failure set `failed` with serialized `OpenRouterError`.

## 13. Observability & Logging

- Capture OpenRouter `x-request-id` when available.
- Log durations, number of retries, error type.
- Recommend minimal structured logs for `generation-worker`.

## 14. Performance & Cost Controls

- Use deterministic params for XML; limit `max_tokens` appropriately.
- Keep retries small (default 2) and timeouts strict (60s default).

## 15. Troubleshooting

- Missing key → `ConfigError` at construct/use time.
- 400 model errors → check model name/params; review payload sizes.
- 429 → ensure `Retry-After` honored; optionally reduce request volume.
- `InvalidResponse` → inspect upstream response; enable fallback.

## 16. Manual Testing (Checklist)

- Verify env vars present; service can construct without throwing.
- Trigger job with `generation_job_status = queued`; confirm `processing → succeeded` and file saved.
- Force error paths: 400 (unsupported response_format) to exercise fallback; 429 (rate-limit); 5xx (retry); timeout.
- Validate saved XML is non-empty and plausible.

## 17. Test Catalog (Planned)

### 17.1 Unit Tests (UT)

- UT-OR-001: Headers include Authorization and optional Referer/Title.
- UT-OR-002: Env precedence (options > env) for `OPENROUTER_API_KEY`.
- UT-OR-003: `normalizeModelName` selects explicit, then default, else built-in.
- UT-OR-004: `buildResponseFormatFromSchema` converts Zod to JSON Schema and strips `$schema/$defs/definitions`.
- UT-OR-005: `parseAndValidate` fails on invalid JSON with `ValidationError`.
- UT-OR-006: `parseAndValidate` fails on schema mismatch; returns parsed on success.
- UT-OR-007: `getFirstChoiceContent` handles string content.
- UT-OR-008: `getFirstChoiceContent` handles array content with `{ text }` fragments.
- UT-OR-009: `safeFetchJson` returns parsed JSON for 2xx.
- UT-OR-010: `safeFetchJson` maps 400/401/403/404/429/5xx to the correct error types.
- UT-OR-011: `safeFetchJson` retries `NetworkError`, `UpstreamError`, `RateLimited` (respects `Retry-After`).
- UT-OR-012: `safeFetchJson` aborts on timeout and throws `Timeout`.
- UT-OR-013: `buildChatCompletionBody` merges model params with defaults.
- UT-OR-014: `generateStructuredJson` validates inputs and uses `response_format`.
- UT-OR-015: Fallback detector (`isResponseFormatUnsupported`) recognizes relevant 400 errors.
- UT-OR-016: JSON extraction heuristic finds first balanced `{ ... }`.
- UT-OR-017: `generateNpcXml` returns `xml` and enforces deterministic params.

### 17.2 Integration Tests (IT)

- IT-OR-101: `chatCompleteRaw` posts to `baseUrl/chat/completions` with expected payload (mock fetch).
- IT-OR-102: `generateStructuredJson` round-trip with mocked OpenRouter content matching schema.
- IT-OR-103: Fallback path: mocked 400 then success with JSON content embedded in text.
- IT-OR-104: `generation-worker` updates job `processing` → `succeeded` and uploads Storage file (mock Supabase client).
- IT-OR-105: `generation-worker` error handling: captures `OpenRouterError` shape in DB on failure.
- IT-OR-106: Rate-limit scenario (429 then success) results in a retry and success.
- IT-OR-107: Timeout scenario results in `Timeout` and job `failed`.

### 17.3 End-to-End Tests (E2E)

- E2E-OR-201: Full job flow with real or staging OpenRouter key; XML saved to Storage.
- E2E-OR-202: Response_format unsupported model triggers fallback; XML still produced.
- E2E-OR-203: Simulated rate-limit (429) with retries; final status `succeeded` or `failed` after max.
- E2E-OR-204: Missing `OPENROUTER_API_KEY` leads to `ConfigError` and job `failed`.
- E2E-OR-205: Large NPC payload remains within token limits and succeeds deterministically.

## 18. Versioning & Change Management

- Document changes to default model/params; keep both Node/Deno variants in sync.
- Note any API surface changes (method names, option fields).

## 19. Appendix: Examples

### 19.1 Creating a service and generating NPC XML (Node/Astro)

```ts
import { OpenRouterService } from "@/lib/services/openRouterService";

const service = new OpenRouterService({
  defaultModel: "openai/gpt-4o-mini",
});

const xml = await service.generateNpcXml(npcData);
// Save xml to storage or return via API route
```

### 19.2 Using structured JSON for arbitrary tasks

```ts
import { z } from "zod";
import { OpenRouterService } from "@/lib/services/openRouterService";

const schema = z.object({
  title: z.string(),
  stats: z.object({ hp: z.number(), mp: z.number() }),
});

const service = new OpenRouterService();
const result = await service.generateStructuredJson({
  systemPrompt: "Return only JSON matching schema.",
  userPrompt: "Generate a tiny character payload.",
  schema,
});
```
