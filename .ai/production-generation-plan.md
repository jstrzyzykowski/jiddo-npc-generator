# Plan Wdrożenia: Produkcyjne, Asynchroniczne Generowanie XML z OpenRouter

## 1. Przegląd i Cele

Niniejszy dokument opisuje kroki niezbędne do przejścia z fazy MVP (z mockowanym generowaniem) do w pełni funkcjonalnej, produkcyjnej wersji asynchronicznego generowania plików XML. Głównym celem jest zastąpienie tymczasowej logiki symulującej opóźnienie przez rzeczywisty, odporny na błędy proces w tle, który wykorzystuje zewnętrzny serwis AI (OpenRouter) do generowania treści.

**Kluczowe cele:**

- **Integracja z OpenRouter:** Wykorzystanie dedykowanego serwisu `OpenRouterService` do komunikacji z API modeli językowych.
- **Implementacja Przetwarzania w Tle:** Użycie Supabase Edge Functions jako pracownika (workera) do obsługi zadań generowania poza głównym cyklem żądanie-odpowiedź.
- **Trwałość Artefaktów:** Zapisywanie wygenerowanych plików XML w Supabase Storage w celu zapewnienia ich trwałości i łatwego dostępu.
- **Uproszczenie API:** Refaktoryzacja endpointu `GET /.../generation-jobs/{jobId}` w celu usunięcia logiki mockującej i sprowadzenia go do roli odpytywania o rzeczywisty stan zadania.

## 2. Zmiany w Architekturze

Przejście na wersję produkcyjną wprowadza następujące, kluczowe zmiany w architekturze systemu:

1.  **Zastąpienie Mocka Serwisem AI:** Logika symulująca generowanie w `NpcService` zostanie zastąpiona przez wywołania do nowego `OpenRouterService`.
2.  **Wprowadzenie Pracownika Tła:** Główna logika orkiestracji generowania zostanie przeniesiona z `NpcService` do Supabase Edge Function, nazwanej `generation-worker`.
3.  **Wyzwalanie przez Webhook:** Edge Function będzie uruchamiana automatycznie w odpowiedzi na zmiany w tabeli `npcs` (wstawienie nowego zadania) za pomocą mechanizmu Supabase Database Webhooks.
4.  **Wykorzystanie Magazynu Plików:** Wygenerowana zawartość XML będzie zapisywana w buckecie `npc-xml-files` w Supabase Storage, a nie zwracana bezpośrednio w odpowiedzi API.

## 3. Komponenty do Stworzenia / Modyfikacji

### 3.1. Serwis `OpenRouterService` (Nowy)

- **Lokalizacja:** `src/lib/services/openRouterService.ts`
- **Odpowiedzialność:** Enkapsulacja całej logiki komunikacji z API OpenRouter.
- **Metody publiczne:**
  - `generateNpcXml(npc: NpcDetailResponseDto): Promise<string>`: Główna metoda przyjmująca pełne dane NPC i zwracająca string z wygenerowanym XML.
- **Logika wewnętrzna:**
  - Budowanie precyzyjnego promptu na podstawie danych wejściowych.
  - Obsługa uwierzytelnionego zapytania do API OpenRouter (z użyciem `OPENROUTER_API_KEY`).
  - Walidacja i parsowanie odpowiedzi w celu wyodrębnienia czystej zawartości XML.
  - Implementacja mechanizmów ponawiania prób (retry) i obsługi błędów (np. timeout, statusy HTTP 4xx/5xx).

### 3.2. Supabase Edge Function `generation-worker` (Nowa)

- **Lokalizacja:** `supabase/functions/generation-worker/index.ts`
- **Odpowiedzialność:** Orkiestracja procesu generowania w tle.
- **Trigger:** Supabase Database Webhook nasłuchujący na operacje `INSERT` i `UPDATE` w tabeli `npcs`, gdzie `generation_job_status` jest ustawiane na `queued`.
- **Przepływ logiki:**
  1.  Odbiera payload z webhooka zawierający dane zmodyfikowanego wiersza `npcs`.
  2.  Używa klienta Supabase z `service_role` do aktualizacji statusu zadania na `processing`.
  3.  Pobiera pełne, zdenormalizowane dane NPC, aby przekazać je do serwisu AI.
  4.  Wywołuje `OpenRouterService.generateNpcXml()`.
  5.  **W przypadku sukcesu:**
      - Zapisuje zwrócony XML do Supabase Storage w buckecie `npc-xml-files` pod ścieżką `{npcId}.xml`.
      - Aktualizuje wiersz w `npcs`, ustawiając `generation_job_status` na `succeeded`.
  6.  **W przypadku błędu:**
      - Zapisuje szczegóły błędu (zwrócone przez serwis) w kolumnie `generation_job_error`.
      - Aktualizuje wiersz w `npcs`, ustawiając `generation_job_status` na `failed`.

### 3.3. Serwis `NpcService` (Modyfikacja)

- **Lokalizacja:** `src/lib/services/npcService.ts`
- **Zmiany w metodzie `getGenerationJobStatus`:**
  - **Usunięcie logiki opóźnienia:** Całkowite usunięcie `MOCK_GENERATION_DELAY_MS` i logiki opartej na `hasElapsed`.
  - **Pobieranie XML ze Storage:** Gdy status zadania w bazie danych to `succeeded`, metoda musi pobrać zawartość pliku `{npcId}.xml` z Supabase Storage zamiast czytać go z lokalnego mocka.
  - **Zwracanie danych z bazy:** Metoda staje się prostym "czytnikiem" stanu. Odpytuje bazę danych o wiersz NPC i na podstawie `generation_job_status` buduje odpowiedź `GenerationJobStatusResponseDto`.

### 3.4. Konfiguracja Supabase

- **Database Webhook:** Stworzenie nowego webhooka, który będzie wyzwalał funkcję `generation-worker` przy każdej zmianie w tabeli `npcs`.
- **Zmienne Środowiskowe:** Dodanie `OPENROUTER_API_KEY` do zmiennych środowiskowych w Supabase.

## 4. Szczegółowy Przepływ Danych (Wersja Produkcyjna)

1.  **Inicjacja (Bez Zmian):**
    - UI wysyła `POST /api/npcs/{npcId}/generate`.
    - Endpoint `generate.ts` wywołuje `NpcService.startGenerationJob`, który generuje `jobId` i ustawia status w bazie na `queued`. Ten zapis w bazie danych jest **kluczowym zdarzeniem**.

2.  **Przetwarzanie w Tle (Nowa Logika):**
    - **Webhook Trigger:** Zapis w tabeli `npcs` (status `queued`) aktywuje Supabase Database Webhook.
    - **Edge Function Start:** Webhook wywołuje funkcję `generation-worker`, przekazując jej dane zmodyfikowanego NPC.
    - **Status `processing`:** Funkcja natychmiast aktualizuje status zadania na `processing` w bazie danych, aby UI mogło odzwierciedlić ten stan.
    - **Wywołanie AI:** Funkcja wywołuje `OpenRouterService` z danymi NPC.
    - **Obsługa Wyniku:** Po otrzymaniu odpowiedzi z serwisu, funkcja zapisuje plik XML do Storage i/lub aktualizuje status w bazie na `succeeded` lub `failed`.

3.  **Odpytywanie o Status (Logika Zmieniona):**
    - UI cyklicznie (polling) wysyła `GET /api/npcs/{npcId}/generation-jobs/{jobId}`.
    - Endpoint `[jobId].ts` wywołuje `NpcService.getGenerationJobStatus`.
    - `NpcService` **jedynie odczytuje** aktualny stan (`queued`, `processing`, `succeeded`, `failed`) z bazy danych, który jest modyfikowany w tle przez Edge Function.
    - Jeśli status to `succeeded`, serwis pobiera plik XML z Supabase Storage i dołącza go do odpowiedzi.
    - UI reaguje na zmianę statusu, przerywa polling i wyświetla wyniki lub błąd.

## 5. Etapy Wdrożenia

1.  **Implementacja `OpenRouterService`:**
    - Stworzenie pliku `src/lib/services/openRouterService.ts`.
    - Zaimplementowanie logiki budowania promptu i wysyłania zapytań do OpenRouter.
    - Dodanie solidnej obsługi błędów i walidacji odpowiedzi.

2.  **Implementacja Edge Function `generation-worker`:**
    - Inicjalizacja nowej funkcji w `supabase/functions/`.
    - Implementacja pełnego przepływu logiki (zmiana statusu, wywołanie serwisu, obsługa wyniku).
    - Dodanie obsługi zmiennych środowiskowych i klienta Supabase z `service_role`.

3.  **Konfiguracja Infrastruktury Supabase:**
    - Stworzenie i skonfigurowanie Database Webhook w panelu Supabase, aby wyzwalał wdrożoną funkcję.
    - Ustawienie sekretu `OPENROUTER_API_KEY`.

4.  **Refaktoryzacja `NpcService`:**
    - Modyfikacja metody `getGenerationJobStatus` w celu usunięcia logiki mocka i dodania pobierania pliku z Supabase Storage.

5.  **Testowanie End-to-End:**
    - Przeprowadzenie pełnego testu manualnego z użyciem Postmana i UI (gdy będzie gotowe), aby zweryfikować poprawność całego przepływu od inicjacji do otrzymania wygenerowanego pliku.
