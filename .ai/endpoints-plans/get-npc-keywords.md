# API Endpoint Implementation Plan: `GET /npcs/{npcId}/keywords`

## 1. Przegląd punktu końcowego

Ten punkt końcowy umożliwia pobieranie listy słów kluczowych wraz z powiązanymi frazami dla określonego NPC. Jest to operacja tylko do odczytu, która uwzględnia uprawnienia użytkownika – dane są dostępne publicznie dla opublikowanych NPC lub dla właściciela NPC w każdym statusie.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/npcs/{npcId}/keywords`
- **Parametry**:
  - **Parametry ścieżki (wymagane)**:
    - `npcId` (string, UUID): Unikalny identyfikator NPC.
  - **Parametry zapytania (opcjonalne)**:
    - `limit` (integer): Maksymalna liczba słów kluczowych do zwrócenia. Domyślnie: 20, Maksymalnie: 100.
- **Request Body**: Brak.

## 3. Wykorzystywane typy

Do implementacji tego punktu końcowego wykorzystane zostaną następujące, zmodyfikowane lub nowe typy DTO z `src/types.ts`:

- **`GetNpcKeywordsQueryDto`**:
  ```typescript
  export interface GetNpcKeywordsQueryDto {
    limit?: number;
  }
  ```
- **`GetNpcKeywordsResponseDto`**:
  ```typescript
  export interface GetNpcKeywordsResponseDto {
    items: NpcKeywordDto[];
  }
  ```
- **`NpcKeywordDto`** (istniejący)
- **`NpcKeywordPhraseDto`** (istniejący)

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "uuid-string-for-keyword-1",
        "response": "Hello, how can I help you?",
        "sortIndex": 0,
        "phrases": [
          { "id": "uuid-string-for-phrase-1", "phrase": "hi" },
          { "id": "uuid-string-for-phrase-2", "phrase": "hello" }
        ],
        "createdAt": "2025-10-25T10:00:00.000Z",
        "updatedAt": "2025-10-25T10:00:00.000Z"
      }
    ]
  }
  ```
- **Kody statusu**:
  - `200 OK`: Żądanie zakończone sukcesem.
  - `400 Bad Request`: Nieprawidłowe parametry wejściowe (`npcId` lub `limit`).
  - `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: NPC o podanym `npcId` nie istnieje lub użytkownik nie ma do niego uprawnień.
  - `500 Internal Server Error`: Wewnętrzny błąd serwera.

## 5. Przepływ danych

1.  Żądanie `GET` trafia do handlera w pliku `src/pages/api/npcs/[npcId]/keywords.ts`.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje sesję użytkownika i dołącza klienta Supabase do `context.locals`.
3.  Handler API parsuje `npcId` ze ścieżki oraz `limit` z parametrów zapytania.
4.  Dane wejściowe są walidowane przy użyciu schemy `zod` w celu zapewnienia poprawności typu `npcId` (UUID) oraz `limit` (liczba całkowita w dozwolonym zakresie).
5.  Handler wywołuje funkcję `getNpcKeywords` z serwisu `npcService`, przekazując klienta Supabase, `npcId` oraz `limit`.
6.  `npcService.getNpcKeywords` konstruuje i wykonuje zapytanie do Supabase, które pobiera dane z tabeli `npc_keywords` i zagnieżdżone dane z `npc_keyword_phrases`.
7.  Polityki Row-Level Security (RLS) w bazie danych automatycznie filtrują wyniki, zapewniając, że użytkownik ma dostęp tylko do słów kluczowych opublikowanych NPC lub tych, których jest właścicielem.
8.  Serwis mapuje wyniki zapytania na tablicę obiektów `NpcKeywordDto`.
9.  Serwis zwraca przetworzone dane do handlera API.
10. Handler formatuje ostateczną odpowiedź w strukturze `{ items: [...] }` i odsyła ją do klienta z kodem statusu `200 OK`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Dostęp jest publiczny dla opublikowanych NPC, ale sesja użytkownika jest sprawdzana przez middleware w celu identyfikacji właściciela zasobów w wersji roboczej.
- **Autoryzacja**: Kontrola dostępu jest w pełni delegowana do polityk RLS PostgreSQL. Logika aplikacji nie implementuje dodatkowych sprawdzeń uprawnień, polegając na tym, że zapytanie do bazy danych zwróci pusty wynik w przypadku braku dostępu, co jest obsługiwane jako `404 Not Found`.
- **Walidacja danych**: Rygorystyczna walidacja `npcId` i `limit` za pomocą `zod` jest kluczowa, aby zapobiec błędom zapytań i potencjalnym atakom (np. DoS przez żądanie dużej ilości danych).

## 7. Obsługa błędów

- **Błąd walidacji (400)**: Jeśli `npcId` nie jest prawidłowym UUID lub `limit` jest poza zakresem, handler zwróci odpowiedź `400 Bad Request` z komunikatem o błędzie.
- **Brak zasobu (404)**: Jeśli zapytanie do bazy danych nie zwróci żadnych wyników dla danego `npcId` (ponieważ NPC nie istnieje lub użytkownik nie ma uprawnień), handler zwróci `404 Not Found`.
- **Błąd serwera (500)**: Wszelkie nieprzewidziane wyjątki, np. błędy połączenia z bazą danych, zostaną przechwycone, zalogowane i poskutkują odpowiedzią `500 Internal Server Error`.

## 8. Rozważania dotyczące wydajności

- **Zapytanie do bazy danych**: Należy użyć jednego, zoptymalizowanego zapytania do pobrania zarówno słów kluczowych, jak i fraz. Funkcjonalność zagnieżdżonych zapytań w Supabase (`.select('*, npc_keyword_phrases(*)')`) jest preferowanym podejściem, aby uniknąć problemu N+1.
- **Indeksy**: Zapytanie powinno wykorzystywać istniejące indeksy na kolumnach `npc_id` i `sort_index` w tabeli `npc_keywords` w celu zapewnienia szybkości działania.
- **Paginacja**: Stosowanie parametru `limit` jest obowiązkowe do kontrolowania rozmiaru odpowiedzi i obciążenia bazy danych. Należy narzucić maksymalną wartość `limit`.

## 9. Etapy wdrożenia

1.  **Modyfikacja typów**: W pliku `src/types.ts` zaktualizuj `GetNpcKeywordsQueryDto` i stwórz `GetNpcKeywordsResponseDto` zgodnie z sekcją 3.
2.  **Implementacja serwisu**: W pliku `src/lib/services/npcService.ts` dodaj nową funkcję asynchroniczną `getNpcKeywords({ supabase, npcId, limit })`.
3.  **Logika zapytania**: Wewnątrz `getNpcKeywords`, zaimplementuj zapytanie Supabase do pobierania słów kluczowych i zagnieżdżonych fraz, posortowanych według `sort_index` i ograniczonych przez `limit`.
4.  **Mapowanie danych**: Dodaj logikę mapującą surowe wyniki z bazy danych na tablicę `NpcKeywordDto[]`.
5.  **Tworzenie endpointu**: Utwórz nowy plik `src/pages/api/npcs/[npcId]/keywords.ts`.
6.  **Implementacja handlera**: W nowym pliku zdefiniuj handler `GET`, który będzie zarządzał cyklem życia żądania.
7.  **Walidacja wejścia**: Zaimplementuj walidację `npcId` i `limit` przy użyciu `zod`.
8.  **Integracja z serwisem**: Połącz handler z nową funkcją w `npcService`, przekazując jej wymagane parametry.
9.  **Obsługa odpowiedzi i błędów**: Zaimplementuj logikę zwracania odpowiedzi `200 OK` w przypadku sukcesu oraz odpowiednich kodów błędów (`400`, `404`, `500`) w przypadku problemów.
10. **Testowanie**: Dodaj testy jednostkowe dla nowej funkcji serwisowej oraz testy integracyjne dla całego punktu końcowego, obejmujące zarówno scenariusze pomyślne, jak i przypadki błędów.
