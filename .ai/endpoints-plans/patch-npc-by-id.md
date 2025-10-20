# API Endpoint Implementation Plan: PATCH /api/npcs/{npcId}

## 1. Przegląd punktu końcowego

Ten punkt końcowy umożliwia częściową aktualizację istniejącego NPC. Uwierzytelniony użytkownik może modyfikować tylko te NPC, których jest właścicielem. Wszystkie pola w ciele żądania są opcjonalne, co pozwala na elastyczne aktualizowanie tylko wybranych atrybutów. Po pomyślnej aktualizacji, API zwraca podsumowanie zaktualizowanego zasobu.

## 2. Szczegóły żądania

- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/npcs/{npcId}`
- **Parametry ścieżki**:
  - **Wymagane**:
    - `npcId` (`string` - UUID): Unikalny identyfikator NPC.
- **Ciało żądania**:
  - **Typ**: `application/json`
  - **Struktura**: Obiekt JSON zgodny z typem `UpdateNpcCommand`.
    ```typescript
    // src/types.ts
    export type UpdateNpcCommand = DeepPartial<{
      name: string;
      look: NpcLookDto;
      stats: NpcStatsDto;
      messages: NpcMessagesDto;
      modules: NpcModulesDto;
      contentSizeBytes: number;
    }> & {
      clientRequestId?: string;
    };
    ```

## 3. Wykorzystywane typy

- **Command Model (Request)**: `UpdateNpcCommand` - Definiuje strukturę danych wejściowych.
- **DTO (Response)**: `UpdateNpcResponseDto` (alias dla `NpcListItemDto`) - Definiuje strukturę danych wyjściowych.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`)**:
  - **Typ**: `application/json`
  - **Struktura**: Obiekt JSON zgodny z typem `NpcListItemDto`.
    ```typescript
    // src/types.ts
    export interface NpcListItemDto {
      id: string;
      name: string;
      owner: NpcOwnerSummaryDto;
      status: "draft" | "published";
      modules: {
        shopEnabled: boolean;
        keywordsEnabled: boolean;
      };
      publishedAt: string | null;
      updatedAt: string;
      contentSizeBytes: number;
    }
    ```
- **Odpowiedź błędu**:
  - **Typ**: `application/json`
  - **Struktura**: Obiekt JSON z polem `error`.
    ```json
    {
      "error": {
        "message": "A human-readable error message.",
        "code": "ERROR_CODE_IDENTIFIER"
      }
    }
    ```

## 5. Przepływ danych

1. Handler API w Astro (`src/pages/api/npcs/[npcId].ts`) odbiera żądanie `PATCH`.
2. Middleware Astro weryfikuje token JWT i dołącza dane użytkownika do `context.locals.user`. Jeśli użytkownik nie jest zalogowany, zwraca `401 Unauthorized`.
3. Handler waliduje parametr `npcId` ze ścieżki URL (musi być w formacie UUID).
4. Handler waliduje ciało żądania przy użyciu dedykowanego schematu Zod dla `UpdateNpcCommand`. W przypadku błędu zwraca `400 Bad Request`.
5. Handler wywołuje metodę `npcService.updateNpc(npcId, validatedData, user.id)`.
6. Metoda `updateNpc` w serwisie:
   a. Transformuje zagnieżdżony obiekt `UpdateNpcCommand` na płaski model `NpcUpdate` dla bazy danych.
   b. Wykonuje zapytanie `UPDATE` do tabeli `npcs` w Supabase, używając klauzuli `WHERE id = :npcId AND owner_id = :userId`.
   c. Jeśli zapytanie nie zaktualizowało żadnego wiersza (`count === 0`), oznacza to, że NPC nie istnieje lub użytkownik nie jest jego właścicielem. W takim przypadku zwraca błąd, który handler zmapuje na `404 Not Found`.
   d. Jeśli aktualizacja się powiodła, pobiera zaktualizowane dane i mapuje je na DTO `NpcListItemDto`.
7. Handler API odbiera DTO z serwisu i zwraca odpowiedź `200 OK` z DTO w ciele.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Dostęp do punktu końcowego jest chroniony przez middleware Astro, które weryfikuje ważność sesji użytkownika (token JWT).
- **Autoryzacja**: Ograniczenie modyfikacji zasobu tylko do jego właściciela jest realizowane na dwóch poziomach:
  1. **Aplikacja**: Zapytanie `UPDATE` w `npcService` zawiera warunek sprawdzający `owner_id`.
  2. **Baza danych**: Polityki RLS na tabeli `npcs` w Supabase stanowią ostateczne zabezpieczenie na poziomie bazy danych.
- **Walidacja danych wejściowych**: Użycie schematów Zod do walidacji wszystkich danych wejściowych (parametry ścieżki, ciało żądania) chroni przed błędami integralności danych i potencjalnymi atakami (np. SQL Injection, chociaż Supabase SDK minimalizuje to ryzyko).

## 7. Obsługa błędów

- **`400 Bad Request`**: Zwracany, gdy parametr `npcId` ma niepoprawny format lub ciało żądania nie przechodzi walidacji Zod.
- **`401 Unauthorized`**: Zwracany, gdy użytkownik nie jest uwierzytelniony (brak ważnego tokenu sesji).
- **`403 Forbidden`**: Zwracany, gdy polityki RLS w bazie danych zablokowały operację (chociaż logika aplikacji powinna przechwycić to jako 404).
- **`404 Not Found`**: Zwracany, gdy NPC o podanym `npcId` nie istnieje lub nie należy do uwierzytelnionego użytkownika.
- **`422 Unprocessable Entity`**: Zwracany, gdy dane wejściowe są składniowo poprawne, ale naruszają reguły biznesowe (np. `health_now > health_max`).
- **`500 Internal Server Error`**: Zwracany w przypadku błędu połączenia z bazą danych, nieoczekiwanego wyjątku w logice serwisu lub innego błędu serwera.

## 8. Rozważania dotyczące wydajności

- Zapytanie `UPDATE` jest wykonywane na kluczu głównym (`id`) i indeksowanej kolumnie (`owner_id`), co zapewnia wysoką wydajność operacji.
- Zwracany obiekt `NpcListItemDto` jest uproszczonym podsumowaniem, co minimalizuje transfer danych i unika przesyłania dużych pól (np. XML), optymalizując czas odpowiedzi.
- Nie przewiduje się znaczących wąskich gardeł wydajnościowych dla tego punktu końcowego.

## 9. Etapy wdrożenia

1. **Walidacja**: W pliku `src/lib/validators/npcValidators.ts` zdefiniować schemat Zod dla `UpdateNpcCommand`, uwzględniając opcjonalność wszystkich pól i ich ograniczenia.
2. **Serwis**: W `src/lib/services/npcService.ts` zaimplementować nową metodę `updateNpc`, która przyjmuje `npcId`, dane do aktualizacji oraz `ownerId`. Metoda będzie zawierać logikę transformacji danych, zapytanie do Supabase oraz mapowanie wyniku na `NpcListItemDto`.
3. **Handler**: W istniejącym pliku `src/pages/api/npcs/[npcId].ts` zaimplementować handler dla metody `PATCH`. Handler będzie odpowiedzialny za:
   - Sprawdzenie sesji użytkownika.
   - Walidację `npcId` oraz ciała żądania.
   - Wywołanie metody `npcService.updateNpc`.
   - Obsługę błędów i zwracanie odpowiednich kodów statusu HTTP.
