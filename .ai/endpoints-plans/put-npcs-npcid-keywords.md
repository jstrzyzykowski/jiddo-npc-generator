# API Endpoint Implementation Plan: PUT /npcs/{npcId}/keywords

## 1. Przegląd punktu końcowego

Ten punkt końcowy umożliwia atomowe zastąpienie całej kolekcji słów kluczowych i powiązanych z nimi fraz dla konkretnego NPC. Operacja usuwa wszystkie istniejące słowa kluczowe (poprzez soft-delete) i zastępuje je nowym zestawem danych dostarczonym w żądaniu. Proces ten jest realizowany w ramach jednej transakcji bazodanowej, aby zapewnić spójność danych.

## 2. Szczegóły żądania

- **Metoda HTTP**: `PUT`
- **Struktura URL**: `/api/npcs/{npcId}/keywords`
- **Parametry URL**:
  - `npcId` (string, UUID, **wymagany**): Identyfikator NPC, którego słowa kluczowe mają zostać zaktualizowane.
- **Ciało żądania (Request Body)**:
  - Typ zawartości: `application/json`
  - Struktura:
    ```json
    {
      "items": [
        {
          "response": "string",
          "sortIndex": integer,
          "phrases": ["string", ...]
        }
      ]
    }
    ```
  - **Szczegóły pól**:
    - `items` (**wymagany**): Tablica obiektów definiujących słowa kluczowe.
      - `response` (**wymagany**): Tekst odpowiedzi NPC, gdy gracz użyje jednej z fraz. Długość od 1 do 512 znaków.
      - `sortIndex` (**wymagany**): Liczba całkowita nieujemna, używana do określenia kolejności słów kluczowych.
      - `phrases` (**wymagany**): Tablica zawierająca co najmniej jedną frazę. Każda fraza musi mieć długość od 1 do 64 znaków.

## 3. Wykorzystywane typy

W pliku `src/types.ts` zostaną zdefiniowane lub wykorzystane następujące typy:

- **`BulkReplaceNpcKeywordsCommand`** (do utworzenia): Reprezentuje strukturę ciała żądania.

  ```typescript
  interface NpcKeywordCreationData {
    response: string;
    sortIndex: number;
    phrases: string[];
  }

  export interface BulkReplaceNpcKeywordsCommand {
    items: NpcKeywordCreationData[];
  }
  ```

- **`BulkReplaceNpcKeywordsResponseDto`** (do utworzenia): Reprezentuje strukturę odpowiedzi.
  ```typescript
  export interface BulkReplaceNpcKeywordsResponseDto {
    items: NpcKeywordDto[];
  }
  ```
- **`NpcKeywordDto`** (istniejący): Reprezentuje pojedyncze słowo kluczowe wraz z frazami w odpowiedzi.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (200 OK)**:
  - Zwraca nowo utworzoną listę słów kluczowych wraz z wygenerowanymi przez bazę danych identyfikatorami (`id`) dla każdego słowa kluczowego i frazy.
  - Struktura odpowiedzi: `BulkReplaceNpcKeywordsResponseDto`
- **Odpowiedzi błędu**:
  - `400 Bad Request`: Błąd walidacji danych wejściowych (np. niepoprawny format UUID, brakujące pola, puste tablice).
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `403 Forbidden`: Użytkownik nie jest właścicielem danego NPC.
  - `404 Not Found`: NPC o podanym `npcId` nie istnieje.
  - `409 Conflict`: Przekroczono limit słów kluczowych (np. 255) lub wystąpił konflikt zduplikowanych fraz.
  - `422 Unprocessable Entity`: Wystąpił błąd podczas przetwarzania w bazie danych, np. naruszenie unikalności frazy.
  - `500 Internal Server Error`: Wewnętrzny błąd serwera.

## 5. Przepływ danych

1.  Klient wysyła żądanie `PUT` na adres `/api/npcs/{npcId}/keywords` z listą słów kluczowych w ciele.
2.  Middleware Astro weryfikuje, czy użytkownik jest uwierzytelniony.
3.  Handler API w `src/pages/api/npcs/[npcId]/keywords.ts` parsuje `npcId` z URL oraz ciało żądania.
4.  Schemat walidacji Zod (`npcKeywordsBulkReplaceValidator`) weryfikuje poprawność struktury i typów danych.
5.  Handler wywołuje metodę `NpcService.bulkReplaceNpcKeywords(npcId, ownerId, command)`.
6.  `NpcService` wywołuje funkcję RPC w Supabase (`bulk_replace_npc_keywords`), przekazując `npc_id`, `owner_id` oraz dane słów kluczowych w formacie JSON.
7.  Funkcja PostgreSQL wykonuje całą logikę w ramach pojedynczej transakcji:
    a. Sprawdza, czy NPC istnieje i czy `owner_id` zgadza się z `auth.uid()`.
    b. Usuwa (soft-delete) wszystkie istniejące `npc_keyword_phrases` i `npc_keywords` powiązane z `npc_id`.
    c. Wstawia nowe słowa kluczowe i frazy z danych wejściowych.
    d. Waliduje reguły biznesowe (limity, unikalność fraz).
    e. Zwraca pełną listę nowo utworzonych słów kluczowych.
8.  `NpcService` otrzymuje dane, mapuje je na `NpcKeywordDto` i zwraca do handlera API.
9.  Handler API formatuje odpowiedź jako `BulkReplaceNpcKeywordsResponseDto` i wysyła ją do klienta ze statusem `200 OK`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Dostęp do punktu końcowego jest chroniony i wymaga aktywnej sesji użytkownika, co jest weryfikowane przez middleware.
- **Autoryzacja**: Kluczowa weryfikacja uprawnień odbywa się na poziomie funkcji bazodanowej, która sprawdza, czy `auth.uid()` jest zgodne z `owner_id` modyfikowanego NPC. Zapobiega to modyfikacji zasobów przez nieuprawnionych użytkowników.
- **Walidacja danych**: Rygorystyczna walidacja za pomocą Zod po stronie serwera zapobiega przetwarzaniu niepoprawnych lub złośliwych danych. Pola nieznane w obiekcie żądania będą odrzucane.
- **Ochrona przed SQL Injection**: Użycie funkcji RPC Supabase z parametryzowanymi danymi eliminuje ryzyko ataków SQL Injection.

## 7. Rozważania dotyczące wydajności

- **Transakcyjność**: Wykonanie wszystkich operacji na bazie danych w ramach jednej transakcji i pojedynczej funkcji RPC minimalizuje liczbę zapytań sieciowych między serwerem aplikacji a bazą danych, co jest kluczowe dla wydajności.
- **Indeksy**: Istniejące indeksy na `npc_keywords(npc_id)` i `npc_keyword_phrases(npc_id, keyword_id)` zapewnią szybkie usuwanie starych danych. Indeks unikalności `UNIQUE (npc_id, lower(phrase))` zagwarantuje szybkie sprawdzanie konfliktów fraz.
- **Rozmiar payloadu**: Chociaż operacja jest zoptymalizowana, bardzo duże żądania (tysiące słów kluczowych) mogą wpłynąć na czas odpowiedzi. Limit słów kluczowych (ok. 255) powinien utrzymać rozsądny rozmiar payloadu.

## 8. Etapy wdrożenia

1.  **Migracja Bazy Danych**:
    - Utwórz nowy plik migracji w `supabase/migrations/`.
    - Zdefiniuj funkcję PostgreSQL `bulk_replace_npc_keywords(p_npc_id uuid, p_owner_id uuid, p_keywords jsonb)`, która realizuje logikę atomowego usuwania i wstawiania słów kluczowych oraz ich fraz.
2.  **Aktualizacja Typów**:
    - W pliku `src/types.ts` dodaj definicje dla `BulkReplaceNpcKeywordsCommand` i `BulkReplaceNpcKeywordsResponseDto`.
3.  **Implementacja Walidatora**:
    - W pliku `src/lib/validators/npcValidators.ts` utwórz nowy schemat Zod `npcKeywordsBulkReplaceValidator` do walidacji ciała żądania `PUT`.
4.  **Rozszerzenie Serwisu**:
    - W `src/lib/services/npcService.ts` dodaj nową metodę `bulkReplaceNpcKeywords`.
    - Metoda ta powinna wywoływać funkcję RPC `bulk_replace_npc_keywords` w Supabase i mapować wynik na `NpcKeywordDto[]`.
5.  **Utworzenie Punktu Końcowego API**:
    - Utwórz nowy plik `src/pages/api/npcs/[npcId]/keywords.ts`.
    - Zaimplementuj handler `PUT`, który obsługuje żądanie, wykorzystując walidator Zod i metodę z `NpcService`.
    - Zaimplementuj kompleksową obsługę błędów, zwracając odpowiednie kody statusu HTTP.
