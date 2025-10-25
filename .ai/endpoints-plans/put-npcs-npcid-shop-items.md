# API Endpoint Implementation Plan: Bulk Replace NPC Shop Items

## 1. Przegląd punktu końcowego

Ten punkt końcowy umożliwia zastąpienie całej listy przedmiotów sklepowych dla określonego NPC w jednej, atomowej operacji. Wszystkie istniejące przedmioty zostaną usunięte (soft delete), a następnie zostaną dodane nowe przedmioty z żądania. Operacja jest transakcyjna, co zapewnia spójność danych.

## 2. Szczegóły żądania

- **Metoda HTTP**: `PUT`
- **Struktura URL**: `/api/npcs/{npcId}/shop-items`
- **Parametry**:
  - **Wymagane**:
    - `npcId` (parametr ścieżki, UUID): Unikalny identyfikator NPC.
- **Ciało żądania**:
  - Oczekiwany format: `application/json`.
  - Struktura jest zgodna z typem `BulkReplaceNpcShopItemsCommand`.
  ```json
  {
    "items": [
      {
        "listType": "buy" | "sell",
        "name": "string",
        "itemId": "integer",
        "price": "integer",
        "subtype": "integer",
        "charges": "integer",
        "realName": "string | null",
        "containerItemId": "integer | null"
      }
    ]
  }
  ```

## 3. Wykorzystywane typy

- **Command Models**:
  - `BulkReplaceNpcShopItemsCommand`: Reprezentuje całe żądanie.
  - `CreateNpcShopItemCommand`: Reprezentuje pojedynczy przedmiot do utworzenia.
- **DTOs (Data Transfer Objects)**:
  - `BulkReplaceNpcShopItemsResponseDto`: Struktura odpowiedzi w przypadku sukcesu.
  - `NpcShopItemDto`: Reprezentuje pojedynczy przedmiot w odpowiedzi.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`)**:
  - Zwraca obiekt zawierający listę nowo utworzonych przedmiotów sklepowych, zgodny z typem `BulkReplaceNpcShopItemsResponseDto`.
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "listType": "buy" | "sell",
        "name": "string",
        "itemId": "integer",
        "price": "integer",
        "subtype": "integer",
        "charges": "integer",
        "realName": "string | null",
        "containerItemId": "integer | null",
        "createdAt": "IsoDateString",
        "updatedAt": "IsoDateString"
      }
    ]
  }
  ```
- **Odpowiedzi błędów**:
  - `400 Bad Request`: Błędy walidacji danych wejściowych.
  - `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
  - `403 Forbidden`: Użytkownik nie ma uprawnień do modyfikacji danego NPC.
  - `404 Not Found`: NPC o podanym identyfikatorze nie został znaleziony.
  - `409 Conflict`: Przekroczono limit przedmiotów (np. 255).
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd serwera.

## 5. Przepływ danych

1.  Żądanie `PUT` trafia do endpointu Astro `src/pages/api/npcs/[npcId]/shop-items.ts`.
2.  Middleware (`src/middleware/index.ts`) weryfikuje token JWT użytkownika i dołącza sesję do `Astro.locals`.
3.  Handler API odczytuje `npcId` z parametrów ścieżki oraz ciało żądania.
4.  Dane wejściowe są walidowane przy użyciu dedykowanego schematu `zod` z `src/lib/validators/npcValidators.ts`.
5.  Handler wywołuje funkcję `npcService.bulkReplaceNpcShopItems`, przekazując `npcId`, listę przedmiotów oraz klienta Supabase z `Astro.locals`.
6.  Serwis `npcService` najpierw weryfikuje, czy NPC o danym `npcId` istnieje i czy zalogowany użytkownik jest jego właścicielem.
7.  Następnie serwis wywołuje dedykowaną funkcję RPC w PostgreSQL (`bulk_replace_npc_shop_items`), która w ramach jednej transakcji:
    a. Wykonuje soft-delete na wszystkich istniejących przedmiotach dla danego `npcId`.
    b. Wstawia nowe przedmioty z żądania.
    c. Zwraca nowo wstawione rekordy.
8.  Serwis mapuje zwrócone dane na `NpcShopItemDto[]`.
9.  Handler API zwraca odpowiedź z kodem `200 OK` i DTO w ciele odpowiedzi.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Wszystkie żądania muszą zawierać prawidłowy token JWT, który jest weryfikowany przez middleware.
- **Autoryzacja**: Przed wykonaniem operacji zapisu, serwis musi sprawdzić, czy `npcs.owner_id` jest zgodne z ID uwierzytelnionego użytkownika. Dostęp na poziomie bazy danych jest dodatkowo chroniony przez polityki RLS (Row-Level Security).
- **Walidacja danych**: Rygorystyczna walidacja `zod` zapobiega atakom typu NoSQL/SQL Injection oraz zapewnia integralność danych przed ich przetworzeniem.
- **Ochrona przed DoS**: Walidacja limitu liczby przedmiotów w tablicy `items` chroni system przed żądaniami, które mogłyby nadmiernie obciążyć bazę danych.

## 7. Obsługa błędów

- **Błędy walidacji (400)**: Zwracany jest szczegółowy komunikat o błędzie z `zod`.
- **Brak zasobu (404)** lub **Brak uprawnień (403)**: Zwracany jest generyczny błąd `404 Not Found`, aby nie ujawniać informacji o istnieniu zasobów, do których użytkownik nie ma dostępu.
- **Konflikt (409)**: Zwracany jest błąd z informacją o przekroczeniu limitu przedmiotów. To zdarzenie może być logowane telemetrycznie.
- **Błędy serwera (500)**: Wszelkie błędy z transakcji bazodanowej lub inne nieprzewidziane wyjątki są przechwytywane, logowane, a użytkownikowi zwracany jest generyczny komunikat błędu.

## 8. Rozważania dotyczące wydajności

- **Transakcje bazodanowe**: Użycie pojedynczej funkcji RPC w PostgreSQL do wykonania operacji `DELETE` i `INSERT` jest znacznie wydajniejsze niż wykonywanie wielu zapytań z serwera aplikacji. Minimalizuje to opóźnienia sieciowe i zapewnia atomowość.
- **Indeksy**: Kluczowe jest istnienie indeksu na kolumnie `npc_shop_items(npc_id)`, aby operacja usuwania była szybka. Plan bazy danych (`db-plan.md`) przewiduje odpowiednie indeksy.
- **Rozmiar payloadu**: Limit liczby przedmiotów zapobiega przesyłaniu nadmiernie dużych żądań i odpowiedzi.

## 9. Etapy wdrożenia

1.  **Baza danych**:
    - Utworzyć nowy plik migracji w `supabase/migrations/`.
    - Zdefiniować w nim funkcję PostgreSQL `bulk_replace_npc_shop_items(p_npc_id uuid, p_items jsonb)`, która realizuje logikę transakcyjnej wymiany przedmiotów. Funkcja powinna zwracać `SETOF npc_shop_items`.
2.  **Walidacja**:
    - W pliku `src/lib/validators/npcValidators.ts` zdefiniować i wyeksportować schemat `zod` dla `BulkReplaceNpcShopItemsCommand`.
3.  **Serwis**:
    - W pliku `src/lib/services/npcService.ts` zaimplementować nową metodę `bulkReplaceNpcShopItems`.
    - Metoda powinna przyjmować `npcId`, dane, i klienta Supabase.
    - Wewnątrz metody należy zweryfikować uprawnienia, a następnie wywołać funkcję RPC `bulk_replace_npc_shop_items`.
4.  **Endpoint API**:
    - Utworzyć plik `src/pages/api/npcs/[npcId]/shop-items.ts`.
    - Zaimplementować w nim handler dla metody `PUT`.
    - Połączyć logikę: odczyt danych, walidację `zod`, wywołanie metody z `npcService` oraz obsługę odpowiedzi i błędów.
5.  **Typy**:
    - Upewnić się, że wszystkie potrzebne typy (`BulkReplaceNpcShopItemsCommand`, `BulkReplaceNpcShopItemsResponseDto`) są zdefiniowane w `src/types.ts`.
