# API Endpoint Implementation Plan: DELETE /npcs/{npcId}

## 1. Przegląd punktu końcowego

Ten punkt końcowy jest odpowiedzialny za operację "soft delete" na zasobie NPC. Zamiast trwałego usuwania danych z bazy, ustawia on znacznik czasu `deleted_at` dla określonego NPC. Działanie to jest kaskadowo propagowane do wszystkich powiązanych modułów (np. `npc_shop_items`, `npc_keywords`) za pomocą triggera bazodanowego. Operacja jest idempotentna i może być wykonana tylko przez właściciela zasobu.

## 2. Szczegóły żądania

- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/npcs/{npcId}`
- **Parametry**:
  - **Wymagane**:
    - `npcId` (w ścieżce): Identyfikator NPC w formacie UUID, który ma zostać usunięty.
  - **Opcjonalne**:
    - `reason` (w zapytaniu): String (max 255 znaków) opisujący powód usunięcia. Wykorzystywany do celów audytowych.
- **Request Body**: Brak.

## 3. Wykorzystywane typy

- **DTOs**:
  - `DeleteNpcResponseDto`: Definiuje strukturę danych zwracanych po pomyślnym usunięciu NPC.
    ```typescript
    export interface DeleteNpcResponseDto {
      id: NpcRow["id"];
      deletedAt: NonNullable<NpcRow["deleted_at"]>;
    }
    ```
  - `DeleteNpcQueryDto`: Definiuje opcjonalne parametry zapytania.
    ```typescript
    export interface DeleteNpcQueryDto {
      reason?: string;
    }
    ```
- **Walidator Zod**:
  - `deleteNpcValidator`: Schemat Zod do walidacji parametrów ścieżki (`npcId`) i zapytania (`reason`).
    ```typescript
    export const deleteNpcValidator = z.object({
      npcId: z.string().uuid(),
      reason: z.string().max(255).optional(),
    });
    ```

## 4. Szczegóły odpowiedzi

- **Sukces (200 OK)**:
  - **Content-Type**: `application/json`
  - **Body**: Obiekt `DeleteNpcResponseDto`.
    ```json
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "deletedAt": "2025-10-20T10:00:00.000Z"
    }
    ```
- **Błędy**:
  - Odpowiedzi błędów będą zgodne ze standardowym formatem, zawierającym obiekt JSON z kluczem `error` i opisem problemu.

## 5. Przepływ danych

1.  Klient wysyła żądanie `DELETE` na adres `/api/npcs/{npcId}` z opcjonalnym parametrem `reason`.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje token JWT użytkownika. Jeśli jest nieprawidłowy lub go brakuje, zwraca `401 Unauthorized`.
3.  Handler endpointu (`src/pages/api/npcs/[npcId].ts`) parsuje `npcId` ze ścieżki i `reason` z query string.
4.  Dane wejściowe są walidowane przy użyciu schemy `deleteNpcValidator`. W przypadku błędu walidacji, zwracany jest `400 Bad Request`.
5.  Handler wywołuje metodę `NpcService.softDeleteNpc`, przekazując klienta Supabase (`context.locals.supabase`), `npcId` oraz `reason`.
6.  `NpcService.softDeleteNpc` wykonuje operację `update` na tabeli `npcs`, ustawiając `deleted_at = now()` dla wiersza o podanym `id`. Dzięki polityce RLS, operacja powiedzie się tylko dla właściciela NPC.
7.  Serwis sprawdza liczbę zmodyfikowanych wierszy. Jeśli wynosi 0, oznacza to, że NPC nie istnieje lub użytkownik nie ma uprawnień. W obu przypadkach serwis rzuca błąd `NotFoundError`.
8.  Jeśli operacja `update` się powiedzie, trigger bazodanowy `on_npc_soft_delete` automatycznie ustawia `deleted_at` w powiązanych tabelach (`npc_shop_items`, `npc_keywords`, `npc_keyword_phrases`).
9.  Jeśli parametr `reason` został podany, `NpcService` wywołuje nowo utworzony `TelemetryService.createEvent` w celu zarejestrowania zdarzenia `NPC_DELETED` w tabeli `telemetry_events`. W metadanych zdarzenia zapisywany jest powód usunięcia.
10. `NpcService` zwraca `id` usuniętego NPC oraz znacznik czasu `deleted_at`.
11. Handler endpointu otrzymuje pomyślną odpowiedź z serwisu i wysyła do klienta odpowiedź `200 OK` z ciałem w formacie `DeleteNpcResponseDto`.
12. W przypadku błędu rzuconego przez serwis, handler mapuje go na odpowiedni kod statusu HTTP (np. `404 Not Found`) i zwraca go do klienta.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Każde żądanie musi zawierać prawidłowy token JWT, który jest weryfikowany przez middleware Astro. Dostęp dla niezalogowanych użytkowników jest blokowany.
- **Autoryzacja**: Oparta jest na mechanizmie Row-Level Security w PostgreSQL. Polityka bezpieczeństwa na tabeli `npcs` zezwala na operację `UPDATE` (która jest podstawą soft delete) tylko wtedy, gdy `auth.uid()` zalogowanego użytkownika jest zgodne z `owner_id` w modyfikowanym wierszu. Zapobiega to usunięciu zasobu przez nieuprawnionego użytkownika (IDOR).
- **Walidacja danych wejściowych**: Parametr `npcId` jest walidowany jako UUID, a `reason` jako string o ograniczonej długości, co chroni przed atakami typu SQL Injection i przepełnieniem bufora.

## 7. Obsługa błędów

- `400 Bad Request`: Zwracany, gdy `npcId` nie jest prawidłowym UUID lub `reason` przekracza dozwoloną długość.
- `401 Unauthorized`: Zwracany, gdy użytkownik nie jest uwierzytelniony (brak lub nieprawidłowy token JWT).
- `404 Not Found`: Zwracany, gdy NPC o podanym `npcId` nie istnieje lub użytkownik nie jest jego właścicielem (ze względów bezpieczeństwa RLS nie rozróżnia tych dwóch przypadków).
- `500 Internal Server Error`: Zwracany w przypadku nieoczekiwanych problemów po stronie serwera, takich jak błąd połączenia z bazą danych lub awaria triggera.

## 8. Rozważania dotyczące wydajności

- Operacja `UPDATE` na tabeli `npcs` jest wykonywana na kluczu głównym (`id`), który jest indeksowany, co zapewnia wysoką wydajność.
- Kaskadowe uaktualnienie `deleted_at` jest realizowane przez wydajny trigger bazodanowy, co minimalizuje opóźnienia.
- Ewentualny zapis do tabeli telemetrycznej jest prostą operacją `INSERT` i nie powinien stanowić wąskiego gardła.
- Ogólny wpływ na wydajność systemu jest oceniany jako niski.

## 9. Etapy wdrożenia

1.  **Aktualizacja typów**: W pliku `src/types.ts` rozszerz typ `TelemetryEventType`, dodając do niego wartość `'NPC_DELETED'`.
    ```typescript
    export type TelemetryEventType = "NPC_CREATED" | "NPC_PUBLISHED" | "AI_ERROR" | "NPC_DELETED";
    ```
2.  **Walidator**: W pliku `src/lib/validators/npcValidators.ts` dodać eksportowany schemat `deleteNpcValidator` Zod, który weryfikuje `npcId` jako UUID i `reason` jako opcjonalny string.
3.  **Serwis telemetryczny**: Utwórz nowy plik `src/lib/services/telemetryService.ts`.
    - Zdefiniuj w nim obiekt `telemetryService` z asynchroniczną metodą `createEvent({ supabase, event })`.
    - Parametr `event` powinien być typu `CreateTelemetryEventCommand`.
    - Metoda powinna wykonywać operację `insert` na tabeli `telemetry_events` w bazie danych Supabase.
    - Należy dodać podstawową obsługę błędów (np. logowanie do konsoli w przypadku niepowodzenia zapisu).
4.  **Serwis NPC**: W `src/lib/services/npcService.ts` utwórz nową metodę `softDeleteNpc({ supabase, npcId, reason, userId })`.
    - Implementacja powinna wykonać `update()` na tabeli `npcs`, ustawiając `deleted_at`.
    - Należy sprawdzić `error` i `data` z zapytania. Jeśli `data` jest puste lub `null`, rzucić `NotFoundError`.
    - Jeśli `reason` jest dostępny, zaimportuj `telemetryService` i wywołaj `telemetryService.createEvent` z parametrami: `eventType: 'NPC_DELETED'`, `npcId`, `userId`, `metadata: { reason }`.
    - Zwrócić obiekt `{ id, deletedAt }` po pomyślnej operacji.
5.  **Endpoint API**: W katalogu `src/pages/api/npcs/` zmodyfikuj plik `[npcId].ts`, dodając handler dla metody `DELETE`.
    - Pobrać `npcId` z `Astro.params` i `reason` z `URL.searchParams`.
    - Pobrać `userId` z sesji użytkownika (`Astro.locals.session.user.id`).
    - Zweryfikować dane wejściowe za pomocą `deleteNpcValidator`.
    - Wywołać `NpcService.softDeleteNpc` z odpowiednimi parametrami, w tym `userId`.
    - Zaimplementować blok `try...catch` do obsługi błędów z warstwy serwisowej i mapowania ich na odpowiedzi HTTP.
    - Zwrócić `200 OK` z danymi `DeleteNpcResponseDto` w przypadku powodzenia.
