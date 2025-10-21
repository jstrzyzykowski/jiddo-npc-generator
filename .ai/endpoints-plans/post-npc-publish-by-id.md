# API Endpoint Implementation Plan: `POST /npcs/{npcId}/publish`

## 1. Przegląd punktu końcowego

Celem tego punktu końcowego jest publikacja istniejącego NPC. Operacja ta zmienia status NPC z `draft` na `published`, co czyni go publicznie widocznym. Przed zmianą statusu przeprowadzane są kluczowe kontrole integralności danych. Pomyślna publikacja jest rejestrowana jako zdarzenie telemetryczne.

## 2. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/npcs/{npcId}/publish`
- **Parametry:**
  - **Parametry ścieżki (wymagane):**
    - `npcId` (UUID): Unikalny identyfikator NPC, który ma zostać opublikowany.
- **Ciało żądania:** Ciało żądania musi być obiektem JSON, który potwierdza operację.
  ```json
  {
    "confirmed": true
  }
  ```

## 3. Wykorzystywane typy

Do implementacji tego punktu końcowego wykorzystane zostaną następujące, już zdefiniowane, typy z `src/types.ts`:

- **Request Command Model:** `PublishNpcCommand`
- **Response DTO:** `PublishNpcResponseDto`

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`):**
  Zwraca obiekt zawierający zaktualizowane informacje o opublikowanym NPC.
  ```json
  {
    "id": "uuid",
    "status": "published",
    "publishedAt": "ISO-8601",
    "firstPublishedAt": "ISO-8601"
  }
  ```
- **Odpowiedzi błędów:**
  - `400 Bad Request`: Ciało żądania jest nieprawidłowe lub brakuje wymaganego pola `confirmed: true`.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `403 Forbidden`: Użytkownik nie jest właścicielem danego NPC.
  - `404 Not Found`: NPC o podanym `npcId` nie został znaleziony.
  - `409 Conflict`: NPC jest już opublikowany.
  - `422 Unprocessable Entity`: NPC nie spełnia warunków integralności wymaganych do publikacji (np. włączony moduł sklepu bez zdefiniowanych przedmiotów).
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd serwera.

## 5. Przepływ danych

1.  Żądanie `POST` trafia do punktu końcowego Astro pod adresem `src/pages/api/npcs/[npcId]/publish.ts`.
2.  Middleware Astro weryfikuje, czy użytkownik jest uwierzytelniony, sprawdzając sesję w `Astro.locals`.
3.  Handler API waliduje parametr `npcId` ze ścieżki URL oraz ciało żądania przy użyciu biblioteki `Zod`.
4.  Handler wywołuje metodę `publishNpc` z serwisu `NpcService` (`src/lib/services/npcService.ts`), przekazując `npcId` oraz ID uwierzytelnionego użytkownika.
5.  Serwis `NpcService` wykonuje główną logikę biznesową:
    a. Wysyła zapytanie do bazy danych Supabase w celu pobrania NPC, filtrując po `id` i `owner_id`, aby upewnić się, że NPC istnieje i należy do użytkownika.
    b. Jeśli NPC nie zostanie znaleziony lub właściciel się nie zgadza, zwraca odpowiedni błąd (`404` lub `403`).
    c. Sprawdza, czy status NPC to `draft`. Jeśli jest inny (np. `published`), zwraca błąd `409 Conflict`.
    d. Próbuje zaktualizować status NPC na `published`. Ta operacja aktywuje trigger `BEFORE UPDATE` w bazie danych PostgreSQL, który przeprowadza ostateczną weryfikację integralności danych (zgodnie z `db-plan.md`).
    e. Jeśli aktualizacja w bazie danych nie powiedzie się z powodu błędu walidacji triggera, serwis zwraca błąd `422 Unprocessable Entity`.
    f. Po pomyślnej aktualizacji, serwis wywołuje `TelemetryService`, aby zapisać zdarzenie `NPC_PUBLISHED`.
    g. Pobiera zaktualizowane dane NPC (w tym `publishedAt` i `firstPublishedAt`) i zwraca je jako `PublishNpcResponseDto`.
6.  Handler API otrzymuje wynik z serwisu, mapuje go na odpowiednią odpowiedź HTTP (sukces lub błąd) i odsyła do klienta.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie:** Dostęp do punktu końcowego jest chroniony przez middleware, który wymaga aktywnej sesji użytkownika.
- **Autoryzacja:** Logika w `NpcService` musi bezwzględnie weryfikować, czy `owner_id` NPC jest zgodne z ID zalogowanego użytkownika (`auth.uid()`). Polityki RLS w Supabase stanowią dodatkową warstwę zabezpieczeń na poziomie bazy danych.
- **Walidacja danych wejściowych:** Użycie `Zod` na poziomie handlera API zapobiega przetwarzaniu nieprawidłowo sformatowanych danych i chroni przed potencjalnymi atakami.

## 7. Obsługa błędów

Logika serwisu powinna zwracać ustrukturyzowane obiekty błędów, które handler API może łatwo zmapować na odpowiednie kody statusu HTTP. Każdy przewidziany scenariusz błędu (zgodnie z sekcją "Szczegóły odpowiedzi") powinien być obsłużony. Krytyczne błędy serwera powinny być logowane (np. za pomocą `TelemetryService` lub innego systemu monitoringu).

## 8. Rozważania dotyczące wydajności

Operacja jest transakcyjna i obejmuje kilka zapytań do bazy danych (SELECT, UPDATE, INSERT). Kluczowe jest, aby tabela `npcs` miała odpowiednie indeksy na kolumnach `id` i `owner_id` w celu zapewnienia szybkiego dostępu. Walidacja po stronie triggera bazodanowego może wprowadzić niewielkie opóźnienie, jednak jest kluczowa dla integralności danych. Przy oczekiwanym obciążeniu, wydajność nie powinna stanowić problemu.

## 9. Etapy wdrożenia

1.  Utworzyć nowy plik dla punktu końcowego: `src/pages/api/npcs/[npcId]/publish.ts`.
2.  W nowym pliku zaimplementować handler dla metody `POST`.
3.  Zdefiniować schematy `Zod` do walidacji parametru ścieżki `npcId` oraz ciała żądania (`PublishNpcCommand`).
4.  W pliku `src/lib/services/npcService.ts` dodać nową, asynchroniczną funkcję `publishNpc`.
5.  Zaimplementować w `publishNpc` całą logikę biznesową: pobieranie NPC, weryfikację właściciela i statusu, aktualizację rekordu oraz obsługę błędów.
6.  Zintegrować wywołanie `TelemetryService` w celu rejestrowania zdarzenia `NPC_PUBLISHED` po pomyślnej aktualizacji. Serwis jest gotowy do użycia i nie wymaga żadnych modyfikacji, ponieważ obsługuje już typ zdarzenia `NPC_PUBLISHED`.
7.  Połączyć handler API z nową funkcją serwisu, zapewniając mapowanie wyników i błędów na odpowiedzi HTTP.
