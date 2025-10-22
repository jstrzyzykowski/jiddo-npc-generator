# API Endpoint Implementation Plan: GET /npcs/featured

## 1. Przegląd punktu końcowego

Ten punkt końcowy jest odpowiedzialny za pobieranie listy ostatnio opublikowanych NPC. Został zaprojektowany w celu zasilenia sekcji "Featured NPCs" na stronie głównej aplikacji. Endpoint jest publicznie dostępny i nie wymaga uwierzytelniania.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/npcs/featured`
- **Parametry**:
  - **Wymagane**: Brak
  - **Opcjonalne**:
    - `limit` (Query Param): `number` - Określa maksymalną liczbę NPC do zwrócenia. Wartość musi być liczbą całkowitą z przedziału `1-10`. Domyślnie `10`.
- **Request Body**: Brak

## 3. Wykorzystywane typy

- **DTO zapytania**: `GetFeaturedNpcsQueryDto`
- **DTO odpowiedzi**: `GetFeaturedNpcsResponseDto`
- **DTO elementu listy**: `NpcListItemDto`

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "uuid-string",
        "name": "Example NPC",
        "owner": {
          "id": "uuid-string-owner",
          "displayName": "Owner Name"
        },
        "status": "published",
        "modules": {
          "shopEnabled": true,
          "keywordsEnabled": false
        },
        "publishedAt": "iso-date-string",
        "updatedAt": "iso-date-string",
        "contentSizeBytes": 12345
      }
    ]
  }
  ```
- **Odpowiedzi błędów**:
  - `400 Bad Request`: Nieprawidłowy parametr `limit`.
  - `500 Internal Server Error`: Wewnętrzny błąd serwera.

## 5. Przepływ danych

1.  Żądanie HTTP `GET` dociera do handlera w `src/pages/api/npcs/featured.ts`.
2.  Opcjonalny parametr `limit` z `Astro.url.searchParams` jest parsowany i walidowany przy użyciu dedykowanego schematu `zod`. W przypadku błędu walidacji zwracana jest odpowiedź `400`.
3.  Handler wywołuje metodę `getFeaturedNpcs(validatedLimit)` z serwisu `npcService`.
4.  `npcService` konstruuje i wykonuje zapytanie do bazy danych Supabase, korzystając z klienta Supabase.
5.  Zapytanie SQL pobiera dane z tabeli `npcs` z następującymi warunkami:
    - `JOIN` z tabelą `profiles` w celu pobrania `display_name` właściciela.
    - `WHERE status = 'published' AND deleted_at IS NULL`.
    - `ORDER BY published_at DESC`.
    - `LIMIT` na podstawie zweryfikowanego parametru.
6.  Serwis mapuje wyniki zapytania na tablicę obiektów `NpcListItemDto`.
7.  Tablica DTO jest zwracana do handlera.
8.  Handler opakowuje tablicę w obiekt `GetFeaturedNpcsResponseDto` i zwraca ją jako odpowiedź JSON z kodem statusu `200 OK`.

## 6. Względy bezpieczeństwa

- **Walidacja wejścia**: Parametr `limit` jest ściśle walidowany, aby zapobiec nadużyciom i błędom (np. próbom pobrania dużej liczby rekordów).
- **Kontrola dostępu**: Endpoint jest publiczny, ale zapytanie do bazy danych bezwzględnie filtruje tylko opublikowane i nieusunięte zasoby, co jest dodatkowo zabezpieczone przez polityki RLS w PostgreSQL.

## 7. Obsługa błędów

- **Błąd walidacji (400)**: Jeśli walidacja `limit` nie powiedzie się, handler zwróci odpowiedź z kodem 400 i komunikatem o błędzie wygenerowanym przez `zod`.
- **Błąd bazy danych (500)**: Wszelkie błędy zgłaszane przez klienta Supabase podczas wykonywania zapytania zostaną przechwycone w bloku `try...catch`. W przypadku błędu, handler zwróci odpowiedź z kodem 500. Błąd powinien zostać zarejestrowany po stronie serwera.

## 8. Rozważania dotyczące wydajności

- **Indeksowanie bazy danych**: Wydajność zapytania jest zapewniona przez istniejący, złożony indeks na kolumnach `(status, published_at DESC)` z warunkiem `WHERE deleted_at IS NULL`. Gwarantuje to szybkie wyszukiwanie opublikowanych NPC bez konieczności pełnego skanowania tabeli.
- **Rozmiar odpowiedzi**: Odpowiedź jest ograniczona do maksymalnie 10 elementów, co zapewnia mały i szybki do przesłania ładunek.

## 9. Etapy wdrożenia

1.  **Walidator**: W pliku `src/lib/validators/npcValidators.ts` dodać nowy schemat `zod` do walidacji DTO `GetFeaturedNpcsQueryDto`.
2.  **Serwis**: W pliku `src/lib/services/npcService.ts` zaimplementować nową publiczną metodę `getFeaturedNpcs`, która przyjmuje `limit` jako argument i zawiera logikę zapytania do bazy danych.
3.  **Endpoint**: Utworzyć nowy plik `src/pages/api/npcs/featured.ts`.
4.  **Handler**: W nowo utworzonym pliku zaimplementować handler `GET`, który:
    - Wykorzystuje schemat `zod` do walidacji parametrów zapytania.
    - Wywołuje metodę `npcService.getFeaturedNpcs` z odpowiednimi argumentami.
    - Obsługuje błędy w bloku `try...catch`.
    - Zwraca pomyślną odpowiedź `GetFeaturedNpcsResponseDto` lub odpowiedni kod błędu.
5.  **Middleware (opcjonalnie)**: Jeśli nie zostało to jeszcze zrobione, dodać globalny mechanizm rate-limitingu w `src/middleware/index.ts`.
