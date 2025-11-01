## Plan Implementacji Usługi OpenRouter

### 1. Opis usługi

`OpenRouterService` to serwerowa usługa TypeScript zapewniająca bezpieczną, odporną i powtarzalną integrację z API OpenRouter dla uzupełniania czatów LLM. Jest fundamentem planu produkcyjnego generowania XML (zob. `production-generation-plan.md`) i będzie wykorzystywana przede wszystkim przez Supabase Edge Function `generation-worker` oraz ewentualnie przez serwerowe endpointy Astro (`src/pages/api/**`).

Cele projektowe:

- Abstrakcja protokołu HTTP OpenRouter (budowa payloadu, nagłówków, retry, walidacja).
- Standardowe kontrakty wejścia/wyjścia z walidacją `zod` i/lub `response_format` (JSON Schema).
- Wsparcie dla komunikatów: systemowy, użytkownika oraz wymuszanie ustrukturyzowanej odpowiedzi.
- Konfigurowalne: model, parametry modelu, timeouty, polityka retry, identyfikacja aplikacji.

### 2. Opis konstruktora

Sygnatura (intencja):

```ts
type OpenRouterServiceOptions = {
  apiKey?: string; // domyślnie z env
  baseUrl?: string; // domyślnie https://openrouter.ai/api/v1
  appUrl?: string; // do nagłówka HTTP-Referer (zalecane przez OpenRouter)
  appTitle?: string; // do nagłówka X-Title (zalecane)
  defaultModel?: string; // domyślny model, np. "openai/gpt-4o-mini"
  defaultModelParams?: Record<string, unknown>; // domyślne parametry modelu
  requestTimeoutMs?: number; // domyślnie 60_000
  maxRetries?: number; // domyślnie 2
  retryBackoffMs?: number; // domyślnie 500
};
```

Zachowanie:

- Odczytuje `apiKey` z opcji lub ze zmiennych środowiskowych:
  - w Astro/Node: `import.meta.env.OPENROUTER_API_KEY` lub `process.env.OPENROUTER_API_KEY`;
  - w Supabase Edge (Deno): `Deno.env.get('OPENROUTER_API_KEY')`.
- Wymusza obecność klucza API; w razie braku zgłasza `OpenRouterError` typu `ConfigError`.
- Ustala domyślny `baseUrl` na `https://openrouter.ai/api/v1`.

### 3. Publiczne metody i pola

1. `generateNpcXml(npc: NpcDetailResponseDto, opts?: { model?: string; modelParams?: Record<string, unknown> }): Promise<string>`

- Buduje prompty (system + user) z danych NPC.
- Wymusza ustrukturyzowaną odpowiedź JSON przez `response_format` i waliduje ją schematem.
- Zwraca wyłącznie ciąg XML.

Przykład (użycie w `generation-worker`):

```ts
const svc = new OpenRouterService();
const xml = await svc.generateNpcXml(npc);
// zapisz do Supabase Storage i zaktualizuj status na succeeded
```

2. `generateStructuredJson<T>(input: { systemPrompt: string; userPrompt: string; schema: import('zod').ZodTypeAny; model?: string; modelParams?: Record<string, unknown>; }): Promise<import('zod').infer<T>>`

- Ogólna metoda do wymuszenia odpowiedzi w formacie JSON (JSON Schema via `response_format`).
- Waliduje wynik `zod` przed zwróceniem.

3. `chatCompleteRaw(input: { messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>; model?: string; modelParams?: Record<string, unknown>; responseFormat?: unknown; }): Promise<any>`

- Niski poziom (raw) – bez walidacji. Zwraca pełną odpowiedź API.

4. Pola tylko-do-odczytu (gettery): `defaultModel`, `defaultModelParams` – umożliwiają introspekcję domyślnej konfiguracji.

### 4. Prywatne metody i pola

- `apiKey: string`, `baseUrl: string`, `requestTimeoutMs: number`, `maxRetries: number`, `retryBackoffMs: number`, `appUrl?: string`, `appTitle?: string`.
- `buildHeaders(): Record<string, string>` – dodaje `Authorization: Bearer`, `Content-Type: application/json`, oraz zalecane przez OpenRouter: `HTTP-Referer`, `X-Title`.
- `buildMessages(systemPrompt: string, userPrompt: string)` – zwraca tablicę wiadomości `{ role, content }`.
- `buildResponseFormatFromSchema(name: string, schemaObj: object)` – zwraca `response_format` w postaci `{ type: 'json_schema', json_schema: { name, strict: true, schema } }`.
- `safeFetchJson(url: string, init: RequestInit): Promise<any>` – `fetch` z timeoutem, retry (5xx, ECONNRESET, ETIMEDOUT, 429 z backoffem), mapowaniem błędów do `OpenRouterError`.
- `parseAndValidate(content: string, schema: ZodTypeAny)` – `JSON.parse` + walidacja `zod`; w razie błędu zgłasza `OpenRouterError('ValidationError', ...)`.
- `buildNpcPrompts(npc: NpcDetailResponseDto)` – generuje precyzyjny system/user prompt pod Jido/TFS ≤ 1.5, zero markdown.
- `normalizeModelName(model?: string)` – zwraca nazwę modelu (podstawia domyślny jeśli brak).

### 5. Obsługa błędów

Niestandardowy błąd: `OpenRouterError extends Error` z polami: `type` | `statusCode?` | `requestId?` | `isRetryable?` | `details?` | `raw?`.

Scenariusze (numerowane):

1. Brak/nieprawidłowy klucz API → `ConfigError` (401 przy wykonaniu lub wcześniej przy konstrukcji).
2. Nieobsługiwany/niepoprawny model → `BadRequest` (400) z komunikatem API.
3. Błędy walidacji schematu (JSON parse, `zod`) → `ValidationError` (422).
4. Przekroczone limity (429) → `RateLimited` (retry z backoffem, po N próbach błąd z `retryAfter?`).
5. Błędy serwera (5xx) → `UpstreamError` (retry, a potem eskalacja).
6. Timeout po stronie klienta → `Timeout` (przerwanie żądania, bez retry jeśli powtórka przekroczyłaby SLA joba).
7. Błąd sieci (ECONNRESET/ETIMEDOUT) → `NetworkError` (retry zgodnie z polityką).
8. Format odpowiedzi API niespodziewany (brak `choices[0].message.content`) → `InvalidResponse` (z `raw`).

Każdy błąd zawiera czytelny `message` dla logów/przechowania w `generation_job_error` oraz `type` do łatwego filtrowania.

### 6. Kwestie bezpieczeństwa

- Klucz API wyłącznie po stronie serwera (Astro SSR/API routes lub Supabase Edge). Nigdy w kliencie.
- Przechowywanie sekretów: `.env` (lokalnie), sekret środowiskowy w Supabase (`OPENROUTER_API_KEY`).
- Logowanie bez wrażliwych treści promptów; do audytu wystarczą skróty (hash) i metadane żądań.
- Ograniczenia kosztów: parametry `max_tokens`, kontrola retry, defensywne `temperature` w ścieżkach deterministycznych.
- Twarde limity czasu (timeout) per żądanie, aby nie blokować workera.

### 7. Włączenie elementów wymaganych przez OpenRouter (z przykładami)

1. Komunikat systemowy (przykład):

```ts
const systemPrompt = [
  "You are an expert NPC XML generator for Open Tibia (Jido, TFS <= 1.5).",
  "Return ONLY valid XML content. No markdown, no commentary.",
  "Follow the Jido schema strictly.",
].join("\n");
```

2. Komunikat użytkownika (przykład):

```ts
const userPrompt = `Generate an NPC XML based on the following data.\n` + JSON.stringify(npc, null, 2);
```

3. Ustrukturyzowane odpowiedzi – `response_format` (przykład, JSON Schema):

```ts
// Schemat odpowiedzi wymagany od modelu
const schemaObj = {
  type: "object",
  properties: {
    xml: { type: "string", description: "Full, valid NPC XML content" },
  },
  required: ["xml"],
  additionalProperties: false,
};

const response_format = {
  type: "json_schema",
  json_schema: {
    name: "NpcXmlResponse",
    strict: true,
    schema: schemaObj,
  },
} as const;
```

4. Nazwa modelu (przykłady):

- Deterministyczny i szybki: `openai/gpt-4o-mini`.
- Wyższa jakość (koszt/czas ↑): `openai/gpt-4.1` lub `openai/gpt-4.1-mini`.
- Uwaga: Wymuszanie `response_format` (JSON Schema) ma najlepsze wsparcie w rodzinie OpenAI; dla innych rodzin warto mieć fallback (patrz niżej).

5. Parametry modelu (przykłady):

```ts
// Zestaw „deterministyczny”
const modelParamsDeterministic = {
  temperature: 0,
  max_tokens: 2000,
  top_p: 1,
  stop: null,
  seed: 7,
};

// Zestaw „kreatywny”
const modelParamsCreative = {
  temperature: 0.7,
  max_tokens: 2500,
  top_p: 0.95,
};
```

Zalecenie: do generowania XML używaj profilu deterministycznego, by zminimalizować dryf i błędy walidacji.

### 8. Przewodnik implementacji (krok po kroku)

1. Konfiguracja środowiska

- Dodaj do `.env` (lokalnie) oraz do sekretów w Supabase: `OPENROUTER_API_KEY`.
- Opcjonalnie ustaw: `APP_URL` (do nagłówka `HTTP-Referer`), `APP_TITLE` (do `X-Title`).

2. Zależności

- `zod` oraz (opcjonalnie) `zod-to-json-schema` jeśli chcesz generować schematy z `zod`:
  - w projekcie Astro: `npm i zod zod-to-json-schema`.
  - w Supabase Edge (Deno): importuj jako `import { z } from 'npm:zod'` i `import { zodToJsonSchema } from 'npm:zod-to-json-schema'`.

3. Struktura plików (zgodnie z projektem)

- Główna implementacja (Node/Astro): `src/lib/services/openRouterService.ts`.
- Worker (Deno): `supabase/functions/generation-worker/index.ts`.
- Jeśli chcesz współdzielić kod między Node a Deno, dodaj wariant Deno: `supabase/functions/_shared/services/openRouterService.ts` (te same interfejsy/metody, importy `npm:`).

4. Implementacja klasy – szkic

```ts
export class OpenRouterService {
  constructor(private readonly opts: OpenRouterServiceOptions = {}) {
    /* ...wczytaj apiKey, domyślne wartości... */
  }

  async generateNpcXml(
    npc: NpcDetailResponseDto,
    opts?: { model?: string; modelParams?: Record<string, unknown> }
  ): Promise<string> {
    const { systemPrompt, userPrompt } = this.buildNpcPrompts(npc);

    // JSON Schema do response_format
    const schemaObj = {
      type: "object",
      properties: { xml: { type: "string" } },
      required: ["xml"],
      additionalProperties: false,
    } as const;

    const body = {
      model: opts?.model ?? this.opts.defaultModel ?? "openai/gpt-4o-mini",
      messages: this.buildMessages(systemPrompt, userPrompt),
      response_format: this.buildResponseFormatFromSchema("NpcXmlResponse", schemaObj),
      ...(this.opts.defaultModelParams ?? {}),
      ...(opts?.modelParams ?? {}),
    };

    const json = await this.safeFetchJson(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new OpenRouterError("InvalidResponse", 502, { raw: json });
    const parsed = this.parseAndValidate(content /* zod schema odpowiadająca schemaObj */);
    return parsed.xml;
  }

  // ... generateStructuredJson, chatCompleteRaw, metody prywatne ...
}
```

5. Fallback, gdy model nie obsługuje `response_format`

- Dodaj przełącznik: jeśli otrzymasz 400 z informacją o nieobsługiwanym `response_format`, wyślij ponownie żądanie bez `response_format` i z następującymi zabezpieczeniami:
  - doprecyzowanie w system/user prompt („return ONLY a strict JSON matching the schema: ...”).
  - po otrzymaniu `content` wykonaj: heurystyka wydobycia JSON (np. trim do pierwszej `{` oraz dopasuj klamry), `JSON.parse`, walidacja `zod`.
  - jeśli walidacja zawiedzie → `ValidationError`.

6. Integracja z `generation-worker`

- Na początku pracy: ustaw status `processing` w DB.
- Pobierz wpis NPC + dane zdenormalizowane.
- Wywołaj `OpenRouterService.generateNpcXml(npc)`.
- Zapisz wynik do Supabase Storage: bucket `npc-xml-files`, ścieżka `{npcId}.xml`.
- Zaktualizuj status na `succeeded`; w razie błędu: serializuj `OpenRouterError` do `generation_job_error`, ustaw `failed`.

7. Testy i obserwowalność

- Test jednostkowy dla: walidacji schematu, retry/backoff, mapowania błędów.
- Logowanie requestId (z nagłówków odpowiedzi), czasu trwania, liczby retry.
- Dashboard (opcjonalnie) z metrykami jobów: czasy, sukces/porazka, koszty.

### 9. Konkretne przykłady (numerowane)

1. System message (ustawienie w usłudze):

```ts
const systemPrompt = "You are a precise generator of valid Jido NPC XML for TFS <= 1.5. Output must be raw XML only.";
```

2. User message (z danymi NPC):

```ts
const userPrompt = `Generate NPC XML for the following entity (Polish labels ok):\n${JSON.stringify(npc, null, 2)}`;
```

3. response_format (JSON Schema – poprawny wzór):

```ts
const response_format = {
  type: "json_schema",
  json_schema: {
    name: "NpcXmlResponse",
    strict: true,
    schema: {
      type: "object",
      properties: {
        xml: { type: "string", description: "Full NPC XML" },
      },
      required: ["xml"],
      additionalProperties: false,
    },
  },
} as const;
```

4. Nazwa modelu (ustawienie):

```ts
const model = "openai/gpt-4o-mini";
```

5. Parametry modelu (ustawienie):

```ts
const modelParams = { temperature: 0, max_tokens: 2000, top_p: 1, seed: 7 };
```

### 10. Mapowanie do planu produkcyjnego

- Ten serwis realizuje punkt „Integracja z OpenRouter” oraz stanowi zależność dla `generation-worker`.
- `NpcService.getGenerationJobStatus` w wersji produkcyjnej nie generuje już XML; jedynie odczytuje status i – przy `succeeded` – pobiera plik z Storage.
- Retry, walidacja JSON i twarde timeouty minimalizują ryzyko zawieszenia joba i ułatwiają czytelne raportowanie błędów do `generation_job_error`.

### 11. Minimalne wycinki implementacyjne (dla dewelopera)

Nagłówki HTTP do OpenRouter:

```ts
function buildHeaders(apiKey: string, appUrl?: string, appTitle?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (appUrl) headers["HTTP-Referer"] = appUrl;
  if (appTitle) headers["X-Title"] = appTitle;
  return headers;
}
```

Wywołanie API:

```ts
const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: buildHeaders(apiKey, appUrl, appTitle),
  body: JSON.stringify({ model, messages, response_format, ...modelParams }),
});
if (!res.ok) throw await mapHttpError(res);
const body = await res.json();
const content = body?.choices?.[0]?.message?.content;
```

Walidacja odpowiedzi:

```ts
const parsed = JSON.parse(content);
const result = schema.safeParse(parsed);
if (!result.success) throw new OpenRouterError("ValidationError", 422, { details: result.error.format() });
```

---

Ten przewodnik jest kompletnym planem wdrożenia usługi `OpenRouterService` zgodnej z przyjętym stosu technologicznym (Astro 5, TS 5, React 19, Tailwind 4, Shadcn/ui, Supabase) i z planem produkcyjnym asynchronicznego generowania XML. Zawiera opis klasy, metody publiczne/prywatne, obsługę błędów, kwestie bezpieczeństwa, instrukcje krok po kroku oraz konkretne przykłady konfiguracji komunikatów, `response_format`, nazwy modelu i parametrów modelu.
