# API Endpoint Implementation Plan: `GET /npcs/{npcId}/shop-items`

## 1. Przegląd punktu końcowego

Ten punkt końcowy jest odpowiedzialny za pobieranie listy aktywnych przedmiotów sklepowych dla określonego NPC. Dostęp do listy jest możliwy dla opublikowanych NPC lub dla właściciela danego NPC.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/npcs/{npcId}/shop-items`
- **Parametry**:
  - **Path (Wymagane)**:
    - `npcId` (string, format UUID): Unikalny identyfikator NPC.
  - **Query (Opcjonalne)**:
    - `listType` (string, enum: `buy` | `sell`): Filtruje listę przedmiotów po typie (kupno/sprzedaż).
- **Request Body**: Brak.

## 3. Wykorzystywane typy

- `GetNpcShopItemsQueryDto`: Definiuje strukturę i typy parametrów zapytania.
- `NpcShopItemDto`: Reprezentuje pojedynczy przedmiot sklepowy w odpowiedzi.
- `GetNpcShopItemsResponseDto`: Struktura obiektu odpowiedzi, zawierająca tablicę `items`.

Wszystkie typy są zdefiniowane w `src/types.ts`.

## 4. Szczegóły odpowiedzi

- **Sukces (200 OK)**: Zwraca obiekt JSON zawierający listę przedmiotów sklepowych.
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "listType": "buy",
        "name": "Magic Longsword",
        "itemId": 2392,
        "price": 4000,
        "subtype": 0,
        "charges": 0,
        "realName": null,
        "containerItemId": null,
        "createdAt": "2025-10-25T10:00:00.000Z",
        "updatedAt": "2025-10-25T10:00:00.000Z"
      }
    ]
  }
  ```
- **Błędy**: Zobacz sekcję "Obsługa błędów".

## 5. Przepływ danych

1.  Żądanie `GET` trafia do handlera Astro w `src/pages/api/npcs/[npcId]/shop-items.ts`.
2.  Middleware Supabase weryfikuje sesję użytkownika i udostępnia ją w `context.locals`.
3.  Handler API parsuje i waliduje parametr `npcId` ze ścieżki oraz opcjonalny parametr `listType` z zapytania przy użyciu dedykowanej schemy Zod.
4.  Handler wywołuje nową metodę w serwisie `NpcService` (np. `getNpcShopItems`), przekazując `npcId` i opcje filtrowania.
5.  `NpcService` buduje zapytanie do tabeli `npc_shop_items` w Supabase.
6.  Zapytanie zawsze filtruje po `npc_id` oraz po `deleted_at IS NULL`, aby zwracać tylko aktywne przedmioty.
7.  Jeśli podano `listType`, zapytanie jest dodatkowo filtrowane po tej kolumnie.
8.  Polityki Row Level Security (RLS) w PostgreSQL zapewniają, że zapytanie zwróci dane tylko wtedy, gdy użytkownik ma uprawnienia do odczytu danego NPC (jest on opublikowany lub użytkownik jest jego właścicielem).
9.  Serwis mapuje wyniki z bazy danych na tablicę obiektów `NpcShopItemDto`.
10. Handler API opakowuje wynik w obiekt `GetNpcShopItemsResponseDto` i zwraca odpowiedź JSON z kodem statusu `200 OK`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Wszystkie żądania muszą być przetwarzane przez middleware Supabase. Dostęp do danych o użytkowniku odbywa się przez `context.locals`.
- **RLS**: Endpoint polega na politykach RLS zdefiniowanych w bazie danych jako podstawowej warstwie zabezpieczeń, która uniemożliwia wyciek danych między użytkownikami i zapewnia dostęp tylko do opublikowanych NPC (dla gości) lub własnych (dla zalogowanych użytkowników).
- **Walidacja wejścia**: Użycie Zod do walidacji wszystkich parametrów wejściowych chroni przed podstawowymi atakami (np. injection) i zapewnia integralność danych.

## 7. Obsługa błędów

- **400 Bad Request**: Zwracany, gdy `npcId` nie jest prawidłowym UUID lub `listType` zawiera niedozwoloną wartość. Odpowiedź powinna zawierać szczegóły błędu walidacji.
- **401 Unauthorized**: Zwracany przez middleware, jeśli użytkownik nie jest zalogowany, a próbuje uzyskać dostęp do zasobu wymagającego autentykacji.
- **404 Not Found**: Zwracany, gdy NPC o podanym `npcId` nie istnieje lub RLS uniemożliwiły dostęp do niego.
- **500 Internal Server Error**: Zwracany w przypadku nieoczekiwanego błędu serwera, np. błędu połączenia z bazą danych. Zaleca się logowanie takich zdarzeń do systemu telemetrycznego.

## 8. Rozważania dotyczące wydajności

- **Indeksowanie bazy danych**: Zapytanie powinno wykorzystywać istniejący indeks `idx_npc_shop_items_active` w tabeli `npc_shop_items`. Jest to indeks częściowy, zoptymalizowany pod kątem szybkiego filtrowania aktywnych przedmiotów (`deleted_at IS NULL`).
- **Paginacja**: Obecna specyfikacja nie wymaga paginacji. Jeśli NPC mogą mieć bardzo dużą liczbę przedmiotów, w przyszłości należy rozwazyć dodanie paginacji kursowej w celu uniknięcia przesyłania dużych ilości danych i przeciążenia serwera.
- **Liczba zapytań**: Logika powinna być zrealizowana w ramach jednego zapytania do bazy danych, aby zminimalizować opóźnienia.

## 9. Etapy wdrożenia

1.  **Utworzenie pliku API**: Stworzyć nowy plik `src/pages/api/npcs/[npcId]/shop-items.ts`.
2.  **Schema walidacji**: W pliku API zdefiniować schemę Zod dla parametrów zapytania (`GetNpcShopItemsQueryDto`), usuwając z niej pole `includeDeleted`.
3.  **Implementacja handlera `GET`**:
    - Dodać funkcję `GET` obsługującą żądanie.
    - Sparsować i zwalidować `npcId` oraz parametry zapytania.
    - Pobrać sesję użytkownika z `context.locals.supabase`.
4.  **Aktualizacja `NpcService`**:
    - W pliku `src/lib/services/npcService.ts` dodać nową metodę publiczną `getNpcShopItems`.
    - Metoda powinna przyjmować `npcId` i opcjonalne filtry.
    - Zaimplementować w niej logikę pobierania wyłącznie aktywnych przedmiotów (`deleted_at IS NULL`) z Supabase.
5.  **Integracja handlera z serwisem**:
    - W handlerze API wywołać nową metodę z `NpcService`.
    - Przekazać zwalidowane parametry.
6.  **Formatowanie odpowiedzi**:
    - Zmapować dane zwrócone przez serwis na strukturę `GetNpcShopItemsResponseDto`.
    - Zwrócić odpowiedź JSON z kodem statusu `200`.
7.  **Obsługa błędów**: Zaimplementować obsługę wszystkich zdefiniowanych scenariuszy błędów, zwracając odpowiednie kody statusu i komunikaty.
