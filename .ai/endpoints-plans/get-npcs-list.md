# API Endpoint Implementation Plan: GET /npcs

## 1. Przegląd punktu końcowego

Ten punkt końcowy jest odpowiedzialny za pobieranie listy NPC. Zapewnia elastyczne możliwości filtrowania, sortowania i paginacji. Domyślnie zwraca publicznie dostępne, opublikowane NPC, ale umożliwia zalogowanym użytkownikom przeglądanie własnych lub wszystkich NPC. Jest to kluczowy endpoint do przeglądania i odkrywania zasobów w aplikacji.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/npcs`
- **Parametry Zapytania (Query Params)**:
  - `visibility`: `string` - Określa widoczność NPC. Dopuszczalne wartości: `public` (domyślnie), `mine`, `all`. Wartości `mine` i `all` wymagają autentykacji.
  - `status`: `string` - Filtruje NPC po statusie. Dopuszczalne wartości: `draft`, `published`.
  - `search`: `string` - Tekst do wyszukania w nazwach NPC (case-insensitive).
  - `shopEnabled`: `boolean` - Filtruje NPC na podstawie tego, czy mają włączony moduł sklepu.
  - `keywordsEnabled`: `boolean` - Filtruje NPC na podstawie tego, czy mają włączony moduł słów kluczowych.
  - `limit`: `number` - Maksymalna liczba wyników na stronę. Domyślnie `20`, maksymalnie `100`.
  - `cursor`: `string` - Nieprzezroczysty wskaźnik do ostatniego elementu na poprzedniej stronie, używany do paginacji.
  - `sort`: `string` - Pole, według którego sortowane są wyniki. Dopuszczalne wartości: `published_at` (domyślnie), `updated_at`, `created_at`.
  - `order`: `string` - Kierunek sortowania. Dopuszczalne wartości: `asc`, `desc` (domyślnie).

## 3. Wykorzystywane typy

- **Request Query DTO**: `GetNpcListQueryDto`
- **Response DTO**: `GetNpcListResponseDto`
- **Response Item DTO**: `NpcListItemDto`

## 4. Szczegóły odpowiedzi

- **Struktura odpowiedzi sukcesu (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "owner": {
          "id": "uuid",
          "displayName": "string"
        },
        "status": "draft" | "published",
        "modules": {
          "shopEnabled": boolean,
          "keywordsEnabled": boolean
        },
        "publishedAt": "ISO-8601 | null",
        "updatedAt": "ISO-8601",
        "contentSizeBytes": integer
      }
    ],
    "pageInfo": {
      "nextCursor": "string | null",
      "total": integer | null
    }
  }
  ```
- **Kody statusu**:
  - `200 OK`: Pomyślnie zwrócono listę NPC.
  - `400 Bad Request`: Błędne lub brakujące parametry zapytania.
  - `401 Unauthorized`: Próba dostępu do `visibility=mine` lub `all` bez autentykacji.
  - `500 Internal Server Error`: Błąd serwera.

## 5. Przepływ danych

1.  Żądanie `GET` przychodzi do endpointu Astro `/api/npcs/index.ts`.
2.  Parametry zapytania są walidowane przy użyciu schemy Zod zdefiniowanej w `src/lib/validators/npcValidators.ts`. W przypadku błędu zwracany jest status `400`.
3.  Sprawdzana jest sesja użytkownika z `Astro.locals.supabase` i `Astro.locals.user`. Jeśli `visibility` jest `mine` lub `all`, a użytkownik nie jest zalogowany, zwracany jest status `401`.
4.  Wywoływana jest metoda `getNpcList(validatedQuery, user)` z serwisu `src/lib/services/npcService.ts`.
5.  `npcService` buduje zapytanie do Supabase, używając klienta zainicjowanego w kontekście użytkownika, co zapewnia egzekwowanie polityk RLS.
    - Zapytanie łączy (`join`) tabelę `npcs` z `profiles`, aby uzyskać `displayName` właściciela.
    - Stosowane są filtry (`where`, `ilike`) na podstawie parametrów: `status`, `search`, `shopEnabled`, `keywordsEnabled`.
    - Logika `visibility` jest implementowana:
      - `public`: zapytanie filtruje `status = 'published'`. RLS i tak to wymusza.
      - `mine`: zapytanie filtruje `owner_id = user.id`. RLS i tak to wymusza.
      - `all`: nie jest dodawany dodatkowy filtr na `owner_id` (wymaga uprawnień admina, które RLS zweryfikuje).
    - Zapytanie implementuje paginację opartą na kursorze. Kursor jest dekodowany (np. `base64`), aby odzyskać wartość pola sortowania i ID ostatniego elementu.
    - Stosowane jest sortowanie (`orderBy`) i limit (`limit`).
6.  Serwis mapuje wyniki z bazy danych do DTO `NpcListItemDto`.
7.  Obliczany jest `nextCursor` na podstawie ostatniego elementu na liście i kodowany (np. do `base64`).
8.  Handler w `index.ts` konstruuje obiekt `GetNpcListResponseDto` i zwraca go jako JSON z kodem statusu `200`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Endpoint musi być zintegrowany z systemem autentykacji Supabase. Sesja użytkownika (JWT) będzie zarządzana przez middleware Astro i dostępna w `Astro.locals`.
- **Autoryzacja**: Dostęp do danych dla `visibility` równego `mine` lub `all` musi być chroniony i dostępny tylko dla zalogowanych użytkowników. Polityki RLS w PostgreSQL zapewnią, że użytkownicy będą mieli dostęp tylko do danych, do których są uprawnieni.
- **Walidacja danych wejściowych**: Wszystkie parametry zapytania muszą być rygorystycznie walidowane za pomocą Zod, aby zapobiec nieoczekiwanemu zachowaniu i potencjalnym atakom (np. przez ograniczenie `limit`).
- **Ochrona przed SQL Injection**: Użycie klienta Supabase zapewnia parametryzację zapytań, co jest standardową ochroną przed atakami SQL Injection.

## 7. Rozważania dotyczące wydajności

- **Indeksowanie bazy danych**: Wszystkie wymagane kolumny używane do filtrowania i sortowania (`owner_id`, `status`, `name`, `published_at`, `updated_at`, `created_at`) posiadają odpowiednie indeksy. Zostały one zdefiniowane w planie bazy danych (`db-plan.md`) i wdrożone za pomocą migracji, co zapewnia optymalną wydajność zapytań.
- **Paginacja**: Użycie paginacji opartej na kursorze jest bardziej wydajne dla dużych zbiorów danych niż paginacja oparta na offsecie (`page`/`offset`).
- **Wielkość odpowiedzi**: Limit `100` rekordów na stronę zapobiega generowaniu zbyt dużych odpowiedzi, które mogłyby spowolnić sieć i klienta.
- **Zapytania do bazy danych**: Zapytanie powinno być zoptymalizowane, aby pobierać tylko niezbędne kolumny (`select`) i unikać wielokrotnych zapytań w pętli (problem N+1). Join na `profiles` jest w tym przypadku niezbędny i akceptowalny.

## 8. Etapy wdrożenia

1.  **Walidacja**: Utworzyć lub zaktualizować schemę Zod w `src/lib/validators/npcValidators.ts` dla `GetNpcListQueryDto`, uwzględniając wszystkie reguły (typy, zakresy, wartości domyślne).
2.  **Serwis**: Zaimplementować funkcję `getNpcList(query, user)` w `src/lib/services/npcService.ts`.
    - Dodać logikę budowania dynamicznego zapytania PostgREST na podstawie zweryfikowanych parametrów.
    - Zaimplementować obsługę różnych trybów `visibility`.
    - Zaimplementować logikę paginacji opartej na kursorze (kodowanie/dekodowanie kursora).
    - Zapewnić mapowanie wyników na `NpcListItemDto`.
3.  **Endpoint API**: Utworzyć handler `GET` w `src/pages/api/npcs/index.ts`.
    - Dodać logikę walidacji parametrów zapytania przy użyciu stworzonej schemy Zod.
    - Zintegrować z middleware autentykacji, aby uzyskać dostęp do `Astro.locals.user`.
    - Dodać logikę sprawdzania uprawnień dla `visibility=mine|all`.
    - Wywołać serwis `npcService.getNpcList`.
    - Zaimplementować obsługę błędów i zwracanie odpowiednich kodów statusu.
    - Zwrócić odpowiedź w formacie `GetNpcListResponseDto`.
