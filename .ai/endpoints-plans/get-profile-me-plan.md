# API Endpoint Implementation Plan: GET /profiles/me

## 1. Przegląd punktu końcowego

Punkt końcowy udostępnia zalogowanemu użytkownikowi jego profil oraz zagregowane liczby NPC-ów (draft/published), aby zasilić widok panelu i nawigację w aplikacji.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/profiles/me`
- Parametry:
  - Wymagane: brak
  - Opcjonalne: brak
- Request Body: brak (Supabase JWT w nagłówku `Authorization: Bearer <token>`)

## 3. Wykorzystywane typy

- `GetProfileMeResponseDto`, `ProfileNpcCountsDto` z `src/types.ts`
- `SupabaseClient` z `src/db/supabase.client.ts`
- Typ lokalny `ProfileRow` (pochodny z `Tables<"profiles">`)
- Pomocniczy wynik agregacji (np. interfejs `NpcStatusCounts` → `{ draft: number; published: number; }`)

## 4. Szczegóły odpowiedzi

- Sukces `200 OK` z ładunkiem zgodnym z `GetProfileMeResponseDto`
- Kody błędów:
  - `401 Unauthorized` – brak/niepoprawny token
  - `403 Forbidden` – dostęp zabroniony zgodnie z politykami projektu (np. status użytkownika w Supabase)
  - `404 Not Found` – profil nie istnieje (np. brak wpisu w `profiles`)
  - `500 Internal Server Error` – nieoczekiwany błąd (awaria bazy, niezgodność schematu)

## 5. Przepływ danych

1. Astro API route (`src/pages/api/profiles/me.ts`) otrzymuje żądanie.
2. Odczytuje `locals.supabase` oraz `locals.session`; brak sesji → 401.
3. Serwis profilu (`src/lib/services/profileService.ts`) otrzymuje `SupabaseClient` i `userId`.
4. Serwis:
   - Pobiera rekord z `profiles` (`select` ograniczony RLS).
   - Uruchamia zapytanie agregujące na `npcs` (np. `from("npcs").select("status", { count: "exact", head: 2 }).eq("owner_id", userId).is("deleted_at", null).in("status", ["draft","published"])`) lub pojedynczy `rpc`/`from` z `filter`.
   - Mapuje wartości do `ProfileNpcCountsDto`, uzupełnia brakujące statusy zerami.
5. Route transformuje wynik do DTO, zwraca JSON 200.

## 6. Względy bezpieczeństwa

- Autoryzacja wyłącznie z Supabase JWT; wykorzystać `locals.session`.
- RLS chroni tabele `profiles` i `npcs`; zapytania wykonywane w kontekście użytkownika.
- Dokładna kontrola błędów Supabase (brak ujawniania szczegółów SQL).
- Brak danych wrażliwych w odpowiedzi poza oczekiwanymi polami.
- Zabezpieczenie przed enumeracją: brak parametrów identyfikujących innych użytkowników.

## 7. Obsługa błędów

- 401: brak sesji, `locals.session === null` lub błąd w `auth.getUser()`.
- 403: Supabase zwraca błąd odmowy dostępu zgodnie z politykami projektu; komunikat bez szczegółów implementacyjnych.
- 404: brak profilu w tabeli `profiles`.
- 500: wyjątek serwisu (np. błąd agregacji) → log do `console.error` (lub istniejącego loggera) + odpowiedź 500 ze stałym komunikatem.
- Zwracanie JSON błędu w formacie spójnym z resztą API (`{ error: { code, message } }`).

## 8. Rozważania dotyczące wydajności

- Operacja obejmuje odczyt profilu oraz agregację statusów NPC; ogranicz zapytania Supabase do tych dwóch kroków.
- Upewnić się, że indeksy z `db-plan.md` (na `npcs.owner_id`, `status`, `deleted_at`) wspierają zapytanie.
- Użyć `cache: no-store` w odpowiedzi, bo dane są dynamiczne.

## 9. Etapy wdrożenia

1. **Nowy serwis** `src/lib/services/profileService.ts`: funkcja `getProfileWithNpcCounts(supabase: SupabaseClient, userId: string)`.
2. **Implementacja serwisu**:
   - Select jednego profilu (columns: `id`, `display_name`, `created_at`, `updated_at`).
   - Agregacja countów: odczyt `from("npcs").select("status", { count: "exact", head: 1, columns: "status" }).eq("owner_id", userId).is("deleted_at", null)` i obróbka na kliencie.
   - Mapowanie do DTO.
3. **Route** `src/pages/api/profiles/me.ts`:
   - Eksport `prerender = false`; handler `GET`.
   - Odczyt `locals.supabase`, `locals.session`; walidacje 401/403.
   - Wywołanie serwisu, mapowanie do `GetProfileMeResponseDto`.
   - `return new Response(JSON.stringify(dto), { status: 200, headers: {...} })`.
4. **Obsługa błędów w route**: try/catch, mapowanie na statusy, logowanie.
5. **Manualna weryfikacja**: uruchom lokalnie `GET /profiles/me` z ważnym tokenem oraz scenariusz bez profilu.
