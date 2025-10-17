# API Endpoint Implementation Plan: POST /npcs

## 1. Przegląd punktu końcowego

Ten punkt końcowy umożliwia uwierzytelnionym użytkownikom tworzenie nowego szkicu (draft) NPC. Każde żądanie musi zawierać unikalny `clientRequestId` w celu zapewnienia idempotentności operacji, co zapobiega tworzeniu duplikatów przy ponawianiu żądań. Utworzony zasób NPC jest bezpośrednio powiązany z kontem użytkownika, który wykonuje żądanie. Operacja ta nie uruchamia procesów generowania AI, a jedynie tworzy wpis w bazie danych.

## 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/npcs`
- **Request Body**: Ciało żądania musi być w formacie `application/json` i pasować do struktury `CreateNpcCommand`.
  - **Struktura**:
    ```json
    {
      "clientRequestId": "uuid",
      "name": "string",
      "look": {
        "type": "player|monster|item",
        "typeId": integer|null,
        "itemId": integer|null,
        "head": integer|null,
        "body": integer|null,
        "legs": integer|null,
        "feet": integer|null,
        "addons": integer|null,
        "mount": integer|null
      },
      "stats": {
        "healthNow": integer,
        "healthMax": integer,
        "walkInterval": integer,
        "floorChange": boolean
      },
      "messages": {
        "greet": "string",
        "farewell": "string",
        "decline": "string",
        "noShop": "string",
        "onCloseShop": "string"
      },
      "modules": {
        "focusEnabled": boolean,
        "travelEnabled": boolean,
        "voiceEnabled": boolean,
        "shopEnabled": boolean,
        "shopMode": "trade_window|talk_mode",
        "keywordsEnabled": boolean
      },
      "contentSizeBytes": integer
    }
    ```

## 3. Wykorzystywane typy

- **Command Model**: `CreateNpcCommand` (z `src/types.ts`) - Definiuje strukturę danych wejściowych.
- **Data Transfer Object (DTO)**: `CreateNpcResponseDto` (z `src/types.ts`) - Definiuje strukturę danych wyjściowych.
- **Database Model**: `NpcInsert` (z `src/db/database.types.ts`) - Reprezentuje obiekt wstawiany do tabeli `npcs`.

## 4. Szczegóły odpowiedzi

- **Kod sukcesu**: `201 Created`
- **Response Body (w przypadku sukcesu)**:
  ```json
  {
    "id": "uuid",
    "status": "draft",
    "ownerId": "uuid",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
  ```

## 5. Przepływ danych

1.  Żądanie `POST` trafia do serwera Astro na ścieżkę `/api/npcs`.
2.  Astro middleware (`src/middleware/index.ts`) przechwytuje żądanie, weryfikuje token JWT i dołącza sesję użytkownika oraz klienta Supabase do `context.locals`. Jeśli uwierzytelnienie się nie powiedzie, middleware zwraca `401 Unauthorized`.
3.  Handler `POST` w pliku `src/pages/api/npcs/index.ts` jest wywoływany.
4.  Handler pobiera ciało żądania i waliduje je przy użyciu predefiniowanego schematu `Zod`, który implementuje logikę i ograniczenia z bazy danych.
5.  W przypadku błędu walidacji, handler zwraca odpowiedź `400 Bad Request` z informacjami o błędach.
6.  Po pomyślnej walidacji, handler wywołuje metodę `createNpc(command, ownerId)` z nowo utworzonego serwisu `NpcService`.
7.  `NpcService` najpierw sprawdza, czy `clientRequestId` już istnieje dla danego `ownerId`, aby zapewnić idempotentność. Jeśli tak, zwraca istniejący zasób.
8.  Serwis mapuje obiekt `CreateNpcCommand` na obiekt `NpcInsert` zgodny ze schematem tabeli `npcs`.
9.  Serwis wykonuje operację wstawienia nowego rekordu do bazy danych za pomocą `supabase.from('npcs').insert(...)`.
10. Po pomyślnym zapisie, serwis zwraca dane nowo utworzonego NPC do handlera.
11. Handler formatuje odpowiedź zgodnie ze strukturą `CreateNpcResponseDto` i wysyła ją do klienta z kodem statusu `201 Created`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Dostęp do endpointu jest ograniczony wyłącznie do uwierzytelnionych użytkowników. Middleware Astro jest odpowiedzialne za weryfikację tokena sesji Supabase.
- **Autoryzacja**: Każdy utworzony NPC ma pole `owner_id` ustawione na ID zalogowanego użytkownika. Polityki RLS w bazie danych PostgreSQL zapewnią, że użytkownicy mogą modyfikować tylko własne zasoby.
- **Walidacja danych**: Wszystkie dane wejściowe są rygorystycznie walidowane za pomocą `zod`, aby zapobiec atakom (np. SQL Injection, XSS) i zapewnić spójność danych.
- **Rate Limiting (Post-MVP)**: Wdrożenie mechanizmu ograniczania liczby żądań jest zaplanowane po MVP w celu ochrony przed atakami DoS. W bieżącej fazie ten element jest pomijany.
- **Ochrona przed dużym payloadem (Post-MVP)**: Dedykowana konfiguracja limitu rozmiaru żądania zostanie wdrożona po MVP. W ramach MVP polegamy na domyślnych, wbudowanych limitach serwera Astro.

## 7. Obsługa błędów

- **`400 Bad Request`**: Zwracany, gdy walidacja danych wejściowych za pomocą `zod` nie powiedzie się lub gdy `clientRequestId` jest zduplikowany. Odpowiedź powinna zawierać szczegółowe informacje o błędach walidacji.
- **`401 Unauthorized`**: Zwracany przez middleware, gdy żądanie nie zawiera prawidłowego tokena sesji.
- **`413 Payload Too Large` (Post-MVP)**: Zwracany, gdy rozmiar ciała żądania przekracza limit serwera.
- **`429 Too Many Requests` (Post-MVP)**: Zwracany, gdy klient przekroczy dozwoloną liczbę żądań w danym oknie czasowym.
- **`500 Internal Server Error`**: Zwracany w przypadku nieoczekiwanego błędu po stronie serwera, np. błędu połączenia z bazą danych lub nieprzechwyconego wyjątku w logice aplikacji.

## 8. Rozważania dotyczące wydajności

- **Idempotentność**: Aby szybko sprawdzać unikalność `clientRequestId`, w tabeli `npcs` powinien istnieć indeks na kolumnie `(owner_id, client_request_id)`.
- **Operacje bazodanowe**: Operacja ogranicza się do pojedynczego zapytania `INSERT`, co jest wysoce wydajne. Należy unikać dodatkowych, niepotrzebnych zapytań do bazy w ramach jednej operacji.

## 9. Etapy wdrożenia

1.  **Struktura plików**: Utwórz plik `src/pages/api/npcs/index.ts` dla handlera API oraz `src/lib/services/npcService.ts` dla logiki biznesowej.
2.  **Walidacja Zod**: W osobnym pliku (np. `src/lib/validators/npcValidators.ts`) zdefiniuj schemat `zod` dla `CreateNpcCommand`, uwzględniając wszystkie reguły i ograniczenia z `db-plan.md`.
3.  **Implementacja serwisu (`NpcService`)**:
    - Stwórz klasę `NpcService` z metodą `createNpc(command: CreateNpcCommand, ownerId: string, supabase: SupabaseClient)`.
    - Zaimplementuj logikę sprawdzania idempotentności na podstawie `clientRequestId`.
    - Zaimplementuj mapowanie z `CreateNpcCommand` na `NpcInsert`.
    - Wykonaj operację `insert` na tabeli `npcs` i obsłuż ewentualne błędy.
4.  **Implementacja handlera API**:
    - W `src/pages/api/npcs/index.ts` utwórz handler `POST`.
    - Pobierz sesję i klienta Supabase z `context.locals`.
    - Zwaliduj ciało żądania przy użyciu przygotowanego schematu `zod`.
    - Wywołaj `NpcService.createNpc`, przekazując zwalidowane dane i `ownerId`.
    - Sformatuj pomyślną odpowiedź jako `CreateNpcResponseDto` i zwróć ją z kodem `201`.
    - Zaimplementuj globalną obsługę błędów, aby poprawnie zwracać statusy `400` i `500`.
5.  **Testowanie (MVP Scope)**: W ramach MVP skupiamy się na testach manualnych oraz podstawowych testach automatycznych weryfikujących główną ścieżkę sukcesu ("happy path") i kluczowe scenariusze błędów (`400`, `401`). Pełne pokrycie testami jednostkowymi i integracyjnymi zostanie zrealizowane po fazie MVP.
