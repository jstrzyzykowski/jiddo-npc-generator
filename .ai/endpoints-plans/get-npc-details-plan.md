# API Endpoint Implementation Plan: GET /npcs/{npcId}

## 1. Przegląd punktu końcowego

Celem tego punktu końcowego jest dostarczenie szczegółowych informacji o pojedynczym NPC na podstawie jego identyfikatora (`npcId`). Odpowiedź obejmuje pełną konfigurację NPC (wygląd, statystyki, komunikaty, aktywne moduły), dane właściciela, a także wygenerowaną treść w postaci pliku XML i skryptu LUA. Punkt końcowy rygorystycznie przestrzega zasad autoryzacji: opublikowane NPC są dostępne publicznie, natomiast wersje robocze mogą być przeglądane wyłącznie przez ich właścicieli.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/npcs/{npcId}`
- **Parametry**:
  - **Wymagane**:
    - `npcId` (w ścieżce): Identyfikator NPC w formacie UUID.
  - **Opcjonalne**:
    - `includeDraft` (w zapytaniu): Parametr logiczny (`boolean`). Jego użycie nie zmienia logiki dostępu, która jest w pełni kontrolowana przez polityki RLS. Zalogowany użytkownik zawsze będzie mógł zobaczyć swoje wersje robocze, a publicznie dostępne będą tylko opublikowane NPC.
- **Request Body**: Brak.

## 3. Wykorzystywane typy

Implementacja będzie bazować na istniejących definicjach typów z `src/types.ts`:

- **Odpowiedź**: `NpcDetailResponseDto`
- **Parametry zapytania**: `GetNpcDetailQueryDto`
- **Typy zagnieżdżone**: `NpcLookDto`, `NpcStatsDto`, `NpcMessagesDto`, `NpcModulesDto`, `NpcOwnerSummaryDto`

## 4. Szczegóły odpowiedzi

- **Pomyślna odpowiedź (`200 OK`)**:
  - Zwraca obiekt JSON zgodny z typem `NpcDetailResponseDto`.
- **Błędy**:
  - `400 Bad Request`: Parametr `npcId` nie jest prawidłowym identyfikatorem UUID.
  - `401 Unauthorized`: Brak lub nieprawidłowy token JWT w nagłówku `Authorization`.
  - `404 Not Found`: NPC o podanym ID nie istnieje, został usunięty lub użytkownik nie ma uprawnień do jego wyświetlenia. (Celowo zwracamy 404 zamiast 403, aby nie ujawniać informacji o istnieniu zasobu nieautoryzowanym użytkownikom - jest to standardowa praktyka bezpieczeństwa).
  - `500 Internal Server Error`: Wewnętrzny błąd serwera (np. problem z połączeniem z bazą danych).

## 5. Przepływ danych

1.  Żądanie `GET` trafia do handlera w pliku `src/pages/api/npcs/[npcId].ts`.
2.  Middleware Astro weryfikuje token JWT (jeśli jest obecny).
3.  Handler waliduje parametr `npcId` przy użyciu `zod`. W przypadku błędu zwraca `400`.
4.  Handler wywołuje nową funkcję `getNpcDetails(npcId, userId)` z serwisu `npcService.ts`.
5.  Serwis `npcService` wykonuje zapytanie do Supabase, aby pobrać dane NPC z tabeli `npcs` wraz z danymi właściciela z tabeli `profiles` (JOIN). Zapytanie jest wykonywane w kontekście użytkownika, więc polityki RLS są automatycznie stosowane.
6.  Jeśli zapytanie nie zwróci żadnych wyników (NPC nie istnieje lub RLS zablokował dostęp), serwis zgłasza błąd, który jest mapowany na odpowiedź `404 Not Found`.
7.  W przypadku znalezienia rekordu, serwis pobiera zawartość pliku `{npcId}.xml` z dedykowanego bucketa w Supabase Storage (np. `npc-xml-files`).
8.  Serwis odczytuje zawartość statycznego pliku `default.lua` (np. z `src/assets/lua/default.lua`).
9.  Dane z bazy danych oraz zawartość plików są składane w obiekt `NpcDetailResponseDto`.
10. Handler API otrzymuje DTO z serwisu i zwraca je klientowi z kodem `200 OK`. Błędy zgłoszone przez serwis są przechwytywane i mapowane na odpowiednie kody statusu HTTP.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Każde żądanie jest przetwarzane przez middleware, które weryfikuje poprawność tokenu JWT.
- **Autoryzacja**: Dostęp do danych jest kontrolowany na poziomie bazy danych przez polityki Row Level Security (RLS). To podstawowy i najważniejszy mechanizm zabezpieczający, gwarantujący, że użytkownicy mają dostęp tylko do zasobów, do których są uprawnieni (swoje wersje robocze lub opublikowane NPC).
- **Walidacja danych**: Wszystkie dane wejściowe z żądania są walidowane za pomocą `zod`, aby zapobiec błędom i potencjalnym atakom.

## 7. Wymagania wstępne (Infrastruktura) - ZREALIZOWANE

Przed przystąpieniem do implementacji kodu, następujące elementy infrastruktury zostały skonfigurowane w panelu Supabase:

- **[✓] Utworzono Supabase Storage Bucket:**
  - **Nazwa:** `npc-xml-files`
  - **Dostęp:** Prywatny (Public bucket = `false`)

- **[✓] Skonfigurowano Polityki Bezpieczeństwa Bucketa:**
  - **Nazwa polityki:** `Allow full server-side access` (lub podobna)
  - **Dozwolone operacje:** `SELECT`, `INSERT`, `UPDATE`, `DELETE`
  - **Docelowa rola:** `service_role` (tylko)
  - **Definicja:** Polityka zezwala na pełny dostęp do bucketa wyłącznie dla żądań uwierzytelnionych kluczem `service_role` (czyli dla backendu aplikacji).

## 8. Etapy wdrożenia

1.  **Utworzenie pliku endpointu**: Stworzyć plik `src/pages/api/npcs/[npcId].ts`.
2.  **Implementacja handlera `GET`**: W pliku endpointu zaimplementować handler dla metody `GET`, który będzie zarządzał cyklem życia żądania.
3.  **Walidacja wejścia**: Dodać walidację parametru `npcId` oraz opcjonalnego `includeDraft` przy użyciu `zod`.
4.  **Rozbudowa serwisu `npcService`**:
    - Dodać nową, asynchroniczną metodę `getNpcDetails`.
    - Zaimplementować w niej zapytanie do Supabase o dane NPC i właściciela.
    - Dodać logikę pobierania pliku XML z Supabase Storage.
    - Dodać logikę odczytu statycznego pliku `default.lua`.
    - Zaimplementować mapowanie zebranych danych na `NpcDetailResponseDto`.
5.  **Obsługa błędów**: Zaimplementować spójną obsługę błędów w serwisie (np. przez rzucanie dedykowanych wyjątków) i w handlerze API (przechwytywanie wyjątków i zwracanie odpowiednich kodów HTTP).
6.  **Utworzenie pliku `default.lua`**: Jeśli nie istnieje, utworzyć plik `default.lua` w `src/assets/lua/` z domyślną zawartością skryptu.
7.  **Testy**: Napisać testy jednostkowe dla serwisu `npcService` oraz testy integracyjne dla endpointu API, które pokryją scenariusze pomyślne, błędy oraz różne przypadki autoryzacji.
