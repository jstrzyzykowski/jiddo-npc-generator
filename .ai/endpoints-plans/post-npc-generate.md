# Plan Implementacji Punktu Końcowego API: POST /api/npcs/{npcId}/generate

## 1. Przegląd Punktu Końcowego

Celem tego punktu końcowego jest zainicjowanie asynchronicznego zadania generowania XML dla określonego NPC (Non-Player Character). Weryfikuje on żądanie, sprawdza własność i konflikty, a następnie aktualizuje rekord NPC w bazie danych, aby zakolejkować nowe zadanie generowania.

Punkt końcowy natychmiast zwraca odpowiedź `202 Accepted` z unikalnym `jobId`. Ten `jobId` pozwala klientowi na odpytywanie (polling) oddzielnego punktu końcowego statusu w celu śledzenia postępu generowania bez blokowania interfejsu użytkownika.

Ten plan implementacji obejmuje **Fazę 1 (MVP)**, w której sam proces generowania jest mockowany (symulowany). Logika w ramach tego konkretnego punktu końcowego pozostanie w dużej mierze niezmieniona w fazie produkcyjnej.

## 2. Szczegóły Żądania

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/npcs/{npcId}/generate`
- **Parametry**:
  - **Ścieżka**:
    - `npcId` (string, UUID): **Wymagany**. Unikalny identyfikator NPC.
  - **Zapytanie**:
    - `force` (boolean): **Opcjonalny**. Flaga wskazująca, że wszelkie istniejące wyniki z pamięci podręcznej powinny zostać zignorowane.
- **Ciało Żądania**: Ciało żądania musi być zgodne z interfejsem `TriggerNpcGenerationCommand`.
  ```json
  {
    "regenerate": true,
    "currentXml": "<xml>...</xml>"
  }
  ```

> **Nota o parametrze `force`**:
> W kontekście samego endpointu POST, który jedynie kolejkuje zadania, parametr `force` nie ma bezpośredniego wpływu na jego logikę. Jego celem jest przekazanie instrukcji dla docelowego procesu wykonującego generowanie (w Fazie 2 - Supabase Edge Function). Służy jako "wyjście awaryjne" pozwalające na świadome ominięcie mechanizmów cache'owania lub optymalizacji i wymuszenie ponownego wygenerowania XML od zera. Przykładowe scenariusze użycia to chęć skorzystania z nowszej, ulepszonej wersji modelu AI dla istniejącego NPC lub próba uzyskania lepszego wyniku w przypadku, gdy poprzednie generowanie było nieoptymalne.

## 3. Wykorzystywane Typy

- **Polecenie Żądania**: `TriggerNpcGenerationCommand` - Reprezentuje strukturę przychodzącego ciała żądania.
- **DTO Zapytania Żądania**: `TriggerNpcGenerationQueryDto` - Reprezentuje opcjonalne parametry zapytania.
- **DTO Odpowiedzi**: `TriggerNpcGenerationResponseDto` - Definiuje strukturę pomyślnej odpowiedzi `202 Accepted`.

## 4. Szczegóły Odpowiedzi

- **Odpowiedź Sukcesu**:
  - **Kod**: `202 Accepted`
  - **Ciało**: Ciało odpowiedzi będzie zgodne z interfejsem `TriggerNpcGenerationResponseDto`.
    ```json
    {
      "jobId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "status": "queued",
      "npcId": "f0e9d8c7-b6a5-4321-fedc-ba9876543210",
      "submittedAt": "2025-10-23T10:00:00.000Z"
    }
    ```

## 5. Przepływ Danych

Proces jest wykonywany w następującej kolejności:

1.  **Żądanie Klienta**: Frontend wysyła żądanie `POST` na adres `/api/npcs/{npcId}/generate`.
2.  **Middleware**: Middleware Astro przechwytuje żądanie w celu weryfikacji uwierzytelnienia użytkownika.
3.  **Handler Trasy API (`generate.ts`)**:
    a. Odbiera żądanie.
    b. Waliduje ciało żądania i parametry zapytania przy użyciu predefiniowanego schematu Zod.
    c. Wyodrębnia `npcId` ze ścieżki oraz uwierzytelniony `userId` z kontekstu żądania.
    d. Wywołuje warstwę logiki biznesowej poprzez wywołanie `npcService.startGenerationJob(...)`.
4.  **Warstwa Serwisowa (`npcService.ts`)**:
    a. Pobiera rekord NPC z bazy danych przy użyciu podanego `npcId`.
    b. **Walidacja**:
    - Rzuca błąd `NotFound`, jeśli NPC nie istnieje.
    - Rzuca błąd `Forbidden`, jeśli `npc.owner_id` nie pasuje do `userId`.
    - Rzuca błąd `Conflict`, jeśli `npc.generation_job_status` jest aktualnie `'queued'` lub `'processing'`.
      c. **Tworzenie Zadania**:
    - Generuje nowy, unikalny UUID dla `jobId`.
    - **Używa klienta Supabase z rolą serwisową (service role)** do przeprowadzenia aktualizacji w bazie danych, omijając RLS dla chronionych kolumn.
    - Ustawia następujące pola w tabeli `npcs`: - `generation_job_id` = nowy `jobId` - `generation_job_status` = `'queued'` - `generation_job_started_at` = `now()`
      d. Zwraca szczegóły nowego zadania (`jobId`, `npcId`, timestamp) do handlera API.
5.  **Handler Trasy API (`generate.ts`)**:
    a. Przechwytuje wszelkie błędy rzucone przez serwis i mapuje je na odpowiednie odpowiedzi błędów HTTP.
    b. W przypadku sukcesu, formatuje dane zwrócone z serwisu do `TriggerNpcGenerationResponseDto`.
6.  **Odpowiedź dla Klienta**: Handler wysyła odpowiedź `202 Accepted` z powrotem do klienta z DTO jako ładunkiem JSON.

## 6. Względy Bezpieczeństwa

- **Uwierzytelnianie**: Wszystkie żądania do tego punktu końcowego muszą być uwierzytelnione. Middleware Astro odrzuci wszelkie żądania bez ważnej sesji, zwracając błąd `401 Unauthorized`.
- **Autoryzacja**: Warstwa serwisowa musi przeprowadzić ścisłe sprawdzenie własności, aby upewnić się, że uwierzytelniony użytkownik jest właścicielem NPC. Zapobiega to inicjowaniu zadań generowania przez nieautoryzowanych użytkowników w imieniu innych.
- **Walidacja Danych Wejściowych**: Wszystkie przychodzące dane (parametry ścieżki, parametry zapytania i ciało żądania) będą rygorystycznie walidowane przy użyciu schematów Zod, aby zapobiec atakom typu injection i zapewnić integralność danych.
- **Bezpieczeństwo na Poziomie Kolumn**: Kolumny `generation_job_*` w tabeli `npcs` są chronione przez wyzwalacz (trigger) bazodanowy, który uniemożliwia bezpośrednią modyfikację przez użytkowników. Logika tego punktu końcowego **musi** używać klienta Supabase zainicjalizowanego z kluczem `service_role` do wykonania aktualizacji bazy danych, ponieważ ta rola ma uprawnienia do modyfikacji tych pól.

## 7. Obsługa Błędów

Punkt końcowy będzie obsługiwał następujące scenariusze błędów z określonymi kodami statusu HTTP i ciałami odpowiedzi:

- **`400 Bad Request`**
  - **Scenariusz**: Ciało żądania nie przechodzi walidacji Zod.
  - **Przykład Ciała Odpowiedzi**: `{ "error": "Invalid request body", "details": [...] }`
- **`400 Bad Request`**
  - **Scenariusz**: `npcId` w URL nie jest prawidłowym UUID.
  - **Przykład Ciała Odpowiedzi**: `{ "error": "Invalid NPC ID format" }`
- **`401 Unauthorized`**
  - **Scenariusz**: Użytkownik nie jest uwierzytelniony.
  - **Przykład Ciała Odpowiedzi**: `{ "error": "Authentication required" }`
- **`403 Forbidden`**
  - **Scenariusz**: Użytkownik nie jest właścicielem określonego NPC.
  - **Przykład Ciała Odpowiedzi**: `{ "error": "You do not have permission to access this resource" }`
- **`404 Not Found`**
  - **Scenariusz**: NPC o podanym `npcId` nie istnieje.
  - **Przykład Ciała Odpowiedzi**: `{ "error": "NPC not found" }`
- **`409 Conflict`**
  - **Scenariusz**: Zadanie generowania dla tego NPC jest już w stanie `'queued'` lub `'processing'`.
  - **Przykład Ciała Odpowiedzi**: `{ "error": "A generation job is already in progress for this NPC" }`
- **`500 Internal Server Error`**
  - **Scenariusz**: Wystąpił nieoczekiwany błąd bazy danych lub serwera.
  - **Przykład Ciała Odpowiedzi**: `{ "error": "An internal server error occurred" }`

## 8. Rozważania dotyczące Wydajności

- Ten punkt końcowy został zaprojektowany tak, aby był wysoce responsywny, ponieważ przenosi czasochłonną pracę do procesu asynchronicznego.
- Główne operacje to jedno zapytanie `SELECT` i jedno `UPDATE` na tabeli `npcs`. Wydajność tych zapytań zależy od istnienia odpowiednich indeksów bazodanowych na kolumnach `id` i `generation_job_status`, które są już zdefiniowane w planie migracji bazy danych.
- Użycie klienta z rolą serwisową do operacji aktualizacji wiąże się z minimalnym narzutem na wydajność.

## 9. Kroki Implementacji

1.  **Utwórz Plik Trasy API**: Utwórz nowy plik w `src/pages/api/npcs/[npcId]/generate.ts`.
2.  **Zdefiniuj Schemat Zod**: W `src/lib/validators/npcValidators.ts`, dodaj nowy schemat Zod do walidacji ciała żądania `TriggerNpcGenerationCommand`.
3.  **Zaimplementuj Handler POST**: W `generate.ts`, utwórz i wyeksportuj funkcję obsługującą żądanie `POST`, zgodnie z konwencjami punktów końcowych API Astro.
4.  **Dodaj Logikę Walidacji**: W handlerze, użyj schematu Zod do parsowania i walidacji `Astro.request.json()`. Obsłuż błędy walidacji, zwracając odpowiedź `400 Bad Request`.
5.  **Utwórz Metodę Serwisową**: W `src/lib/services/npcService.ts`, utwórz nową publiczną metodę asynchroniczną `startGenerationJob(npcId: string, ownerId: string): Promise<...>`.
6.  **Zaimplementuj Logikę Serwisową**:
    - Wewnątrz `startGenerationJob`, zaimplementuj pełny przepływ danych opisany w sekcji 5.
    - Upewnij się, że klient Supabase z rolą `service_role` jest tworzony i używany do operacji `UPDATE` na tabeli `npcs`.
    - Rzucaj niestandardowe, identyfikowalne błędy dla określonych przypadków niepowodzeń (np. `NotFound`, `Forbidden`, `Conflict`).
7.  **Zintegruj Serwis i Handler**:
    - Z handlera API, wywołaj nową metodę `startGenerationJob` z `npcId` i ID uwierzytelnionego użytkownika.
    - Owiń wywołanie serwisu w blok `try...catch`, aby obsłużyć potencjalne błędy i zmapować je na odpowiednie kody statusu HTTP, zgodnie z sekcją obsługi błędów.
8.  **Skonstruuj Odpowiedź Sukcesu**: Po pomyślnym wywołaniu serwisu, utwórz instancję `TriggerNpcGenerationResponseDto` i zwróć ją ze statusem `202 Accepted`.
