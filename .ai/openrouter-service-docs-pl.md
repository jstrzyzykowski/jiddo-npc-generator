# OpenRouterService – Przewodnik implementacji, użycia i testów

## 1. Cel i zakres

- Cel usługi: niezawodna, bezpieczna i deterministyczna integracja z OpenRouter Chat Completions API do generowania XML NPC w standardzie Jido (TFS ≤ 1.5).
- Zakres użycia: wyłącznie po stronie serwera (Astro SSR/endpointy API oraz Supabase Edge Functions); klucze i sekrety nigdy nie trafiają do klienta.
- Główni konsumenci: Supabase `generation-worker` oraz opcjonalnie serwerowe endpointy Astro.

## 2. Architektura i środowiska

- Dwa warianty tej samej logiki, dostosowane do runtime:
  - Node/Astro: `src/lib/services/openRouterService.ts` (odczyt `import.meta.env` lub `process.env`).
  - Supabase Edge (Deno): `supabase/_shared/services/openRouterService.ts` (odczyt `Deno.env`).
- Wspólne założenia: identyczne API publiczne, model błędów, retry/backoff, walidacja schematów, deterministyczne parametry i użycie `response_format`.

## 3. Instalacja i zależności

- Node/Astro (już w projekcie):
  - `zod`, `zod-to-json-schema`.
- Supabase Edge (Deno):
  - importy przez `npm:zod` oraz `npm:zod-to-json-schema`;
  - deklaracje typów w `supabase/_shared/types.d.ts` (mostek do importów `npm:` i globalnego `Deno`).
- Brak zależności po stronie klienta (usługa działa tylko na serwerze).

## 4. Konfiguracja i zmienne środowiskowe

- Wymagane:
  - `OPENROUTER_API_KEY` – klucz API do OpenRouter (tylko serwer).
- Opcjonalne (zalecane przez OpenRouter):
  - `APP_URL` – nagłówek `HTTP-Referer`.
  - `APP_TITLE` – nagłówek `X-Title`.
- Priorytety: opcje konstruktora > zmienne środowiskowe. Brak `OPENROUTER_API_KEY` skutkuje `OpenRouterError("ConfigError")`.

## 5. API publiczne

- Klasa: `OpenRouterService(options?: OpenRouterServiceOptions)`
  - Opcje: `apiKey?`, `baseUrl?` (domyślnie `https://openrouter.ai/api/v1`), `appUrl?`, `appTitle?`, `defaultModel?`, `defaultModelParams?`, `requestTimeoutMs?` (domyślnie 60000), `maxRetries?` (domyślnie 2), `retryBackoffMs?` (domyślnie 500).
  - Gettery: `defaultModel`, `defaultModelParams`.
- `chatCompleteRaw(input): Promise<unknown>`
  - Wejście: `{ messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>, model?, modelParams?, responseFormat? }`.
  - Zwraca sparsowaną odpowiedź JSON z OpenRouter.
- `generateStructuredJson({ systemPrompt, userPrompt, schema, schemaName?, model?, modelParams? }): Promise<Output>`
  - Wymusza ustrukturyzowaną odpowiedź przez `response_format` (JSON Schema z Zod); waliduje wynik.
- `generateNpcXml(npc, opts?): Promise<string>`
  - Buduje prompty pod Jido; wymusza odpowiedź `{ xml: string }`; zwraca wyłącznie zawartość `xml`.
  - Posiada ścieżkę awaryjną (fallback), gdy `response_format` nie jest obsługiwany.

## 6. Budowa żądań i modele

- Nagłówki: `Authorization: Bearer`, `Content-Type: application/json`, opcjonalnie `HTTP-Referer`, `X-Title`.
- Wiadomości: `system` + `user`. System wymusza „tylko surowy XML; bez markdown; zasady Jido/TFS ≤ 1.5”.
- Domyślny model: `openai/gpt-4o-mini` (deterministyczny, szybki). Można nadpisać w konstruktorze lub per wywołanie.
- Zalecane parametry deterministyczne dla XML: `{ temperature: 0, top_p: 1, seed: 7, max_tokens: ~2000 }`.

## 7. Walidacja i ustrukturyzowane odpowiedzi

- Konwersja Zod → JSON Schema przez `zod-to-json-schema` (bez `$ref`).
- Czyszczenie schematu przed wysyłką: usunięcie `$schema`, `$defs`, `definitions`.
- `parseAndValidate`: parsuje tekst na JSON i waliduje Zod; w razie rozbieżności rzuca `ValidationError`.

## 8. Model obsługi błędów

- `OpenRouterError` z polami: `type`, `statusCode?`, `requestId?`, `isRetryable?`, `details?`, `raw?`.
- Typy: `ConfigError`, `BadRequest`, `ValidationError`, `RateLimited`, `UpstreamError`, `Timeout`, `NetworkError`, `InvalidResponse`, `UnknownError`.
- Mapowanie HTTP:
  - 400 → `BadRequest`, 401/403 → `ConfigError`, 429 → `RateLimited`, 5xx → `UpstreamError`, pozostałe → `UnknownError`.
- Błędny kształt/Brak treści → `InvalidResponse`; błędy JSON/walidacji → `ValidationError`.

## 9. Odporność: timeout, retry, backoff

- `safeFetchJson` opakowuje `fetch`:
  - Timeout przez `AbortController` (domyślnie 60 s).
  - Retry błędów tymczasowych (`RateLimited`, `UpstreamError`, `NetworkError`) do `maxRetries`.
  - Wykładniczy backoff z progiem `retryBackoffMs`; respektuje nagłówek `Retry-After`.

## 10. Fallback (brak wsparcia `response_format`)

- Gdy OpenRouter zwróci 400 wskazujące na brak wsparcia `response_format`/`json_schema`:
  - Wyślij ponownie żądanie bez `response_format`.
  - Wzmocnij prompty: „Zwróć WYŁĄCZNIE ścisły JSON zgodny ze schematem …”.
  - Wyodrębnij JSON z tekstu heurystycznie; następnie zwaliduj Zod.

## 11. Bezpieczeństwo

- Klucz API wyłącznie po stronie serwera – nigdy w kliencie.
- Logi bez wrażliwych treści; preferowane metadane (requestId, czasy).
- Limity (rate, timeout) ograniczają koszty i ekspozycję.

## 12. Integracja: Supabase generation-worker

- Dla joba `queued`:
  - Ustaw `processing`.
  - Pobierz dane NPC.
  - `OpenRouterService.generateNpcXml(npc)`.
  - Zapisz do Storage `npc-xml-files/{id}.xml`.
  - Ustaw `succeeded`; w razie błędu ustaw `failed` z serializowanym `OpenRouterError`.

## 13. Obserwowalność i logowanie

- Zapisuj `x-request-id` z odpowiedzi OpenRouter (gdy dostępny).
- Loguj czas trwania, liczbę retry, typ błędu.
- Rekomendowane zwięzłe logi strukturalne w `generation-worker`.

## 14. Wydajność i kontrola kosztów

- Używaj deterministycznych parametrów dla XML; rozsądnie ustawiaj `max_tokens`.
- Trzymaj małe limity retry (domyślnie 2) i twarde timeouty (60 s).

## 15. Rozwiązywanie problemów

- Brak klucza → `ConfigError` przy konstrukcji/wywołaniu.
- Błędy 400 dot. modelu → sprawdź nazwę/parametry modelu i rozmiary payloadu.
- 429 → respektuj `Retry-After`; ewentualnie zmniejsz częstotliwość.
- `InvalidResponse` → sprawdź surową odpowiedź; rozważ fallback.

## 16. Testy manualne (checklista)

- Zweryfikuj zmienne środowiskowe; konstrukcja serwisu nie rzuca błędów.
- Wstaw NPC z `generation_job_status = 'queued'`; potwierdź `processing → succeeded` oraz zapis pliku.
- Wymuś ścieżki błędów: 400 (brak wsparcia `response_format`) – sprawdź fallback; 429; 5xx; timeout.
- Sprawdź, czy XML w Storage jest niepusty i wiarygodny.

## 17. Katalog testów (plan)

### 17.1 Testy jednostkowe (UT)

- UT-OR-001: Nagłówki zawierają Authorization oraz opcjonalnie Referer/Title.
- UT-OR-002: Priorytet konfiguracji (opcje > env) dla `OPENROUTER_API_KEY`.
- UT-OR-003: `normalizeModelName` – wybiera: jawny → domyślny → wbudowany.
- UT-OR-004: `buildResponseFormatFromSchema` konwertuje Zod do JSON Schema i usuwa `$schema/$defs/definitions`.
- UT-OR-005: `parseAndValidate` rzuca `ValidationError` dla niepoprawnego JSON.
- UT-OR-006: `parseAndValidate` rzuca `ValidationError` dla niezgodności ze schematem; zwraca dane przy sukcesie.
- UT-OR-007: `getFirstChoiceContent` obsługuje treść typu string.
- UT-OR-008: `getFirstChoiceContent` obsługuje tablicę fragmentów z polami `{ text }`.
- UT-OR-009: `safeFetchJson` zwraca poprawny JSON dla 2xx.
- UT-OR-010: `safeFetchJson` mapuje 400/401/403/404/429/5xx na właściwe typy błędów.
- UT-OR-011: `safeFetchJson` ponawia (retry) dla `NetworkError`, `UpstreamError`, `RateLimited` (szanuje `Retry-After`).
- UT-OR-012: `safeFetchJson` przerywa po timeout i rzuca `Timeout`.
- UT-OR-013: `buildChatCompletionBody` łączy parametry modelu z domyślnymi.
- UT-OR-014: `generateStructuredJson` waliduje wejścia i używa `response_format`.
- UT-OR-015: `isResponseFormatUnsupported` wykrywa istotne błędy 400.
- UT-OR-016: Heurystyka ekstrakcji JSON znajduje pierwsze zbalansowane `{ ... }`.
- UT-OR-017: `generateNpcXml` zwraca `xml` i wymusza parametry deterministyczne.

### 17.2 Testy integracyjne (IT)

- IT-OR-101: `chatCompleteRaw` wysyła POST na `baseUrl/chat/completions` z oczekiwanym payloadem (mock fetch).
- IT-OR-102: `generateStructuredJson` – test „round-trip” z zamockowaną odpowiedzią OpenRouter zgodną ze schematem.
- IT-OR-103: Fallback: zamockowane 400, potem sukces z JSON osadzonym w tekście.
- IT-OR-104: `generation-worker` – aktualizacja statusu `processing` → `succeeded` i upload do Storage (mock Supabase).
- IT-OR-105: `generation-worker` – obsługa błędu: zapisuje strukturę `OpenRouterError` w DB.
- IT-OR-106: 429 (rate limit) → retry i sukces.
- IT-OR-107: Timeout → `Timeout` i job `failed`.

### 17.3 Testy end-to-end (E2E)

- E2E-OR-201: Pełen przepływ z prawdziwym lub stagingowym kluczem; XML trafia do Storage.
- E2E-OR-202: Model bez wsparcia `response_format` uruchamia fallback; XML nadal produkowany.
- E2E-OR-203: Symulowany rate-limit (429) z retry; status końcowy `succeeded` albo `failed` po limitach.
- E2E-OR-204: Brak `OPENROUTER_API_KEY` → `ConfigError` i job `failed`.
- E2E-OR-205: Duży payload NPC mieści się w limitach tokenów i deterministycznie przechodzi.

## 18. Wersjonowanie i zarządzanie zmianą

- Dokumentuj zmiany domyślnego modelu/parametrów; utrzymuj spójność wariantów Node/Deno.
- Notuj zmiany w interfejsie API (nazwy metod, pola opcji).

## 19. Aneks: przykłady

### 19.1 Utworzenie serwisu i generowanie XML NPC (Node/Astro)

```ts
import { OpenRouterService } from "@/lib/services/openRouterService";

const service = new OpenRouterService({
  defaultModel: "openai/gpt-4o-mini",
});

const xml = await service.generateNpcXml(npcData);
// Zapisz xml do Storage lub zwróć w endpointzie API
```

### 19.2 Ustrukturyzowany JSON dla dowolnych zadań

```ts
import { z } from "zod";
import { OpenRouterService } from "@/lib/services/openRouterService";

const schema = z.object({
  title: z.string(),
  stats: z.object({ hp: z.number(), mp: z.number() }),
});

const service = new OpenRouterService();
const result = await service.generateStructuredJson({
  systemPrompt: "Zwróć WYŁĄCZNIE JSON zgodny ze schematem.",
  userPrompt: "Wygeneruj niewielki obiekt postaci.",
  schema,
});
```
