# API Endpoint Implementation Plan: GET /npcs/{npcId}/generation-jobs/{jobId}

## 1. Przegląd punktu końcowego

Celem tego punktu końcowego jest umożliwienie klientowi (UI) cyklicznego odpytywania (polling) o status zadania generowania pliku XML dla konkretnego NPC. W ramach implementacji MVP, endpoint będzie symulował asynchroniczne przetwarzanie. Po upływie zdefiniowanego, krótkiego opóźnienia (~3 sekundy), zadanie zostanie oznaczone jako zakończone sukcesem, a w odpowiedzi zostanie zwrócona zawartość statycznego pliku XML.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/npcs/{npcId}/generation-jobs/{jobId}`
- **Parametry Ścieżki**:
  - `npcId` (string, UUID, **wymagane**): Identyfikator NPC.
  - `jobId` (string, UUID, **wymagane**): Identyfikator zadania generowania.
- **Ciało Żądania**: Brak.

## 3. Wykorzystywane typy

Do implementacji zostaną wykorzystane następujące, już zdefiniowane, typy z `src/types.ts`:

- `GenerationJobStatusResponseDto`: Główny obiekt transferu danych (DTO) dla odpowiedzi.
- `GenerationJobErrorDto`: Struktura obiektu błędu (w MVP pole `error` będzie zawsze `null`).
- `GenerationJobStatus`: Typ wyliczeniowy (`"queued" | "processing" | "succeeded" | "failed"`) dla statusu zadania.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`)**:
  ```json
  {
    "jobId": "c4b4a6f8-8f6b-4f4b-8b1b-1b1b1b1b1b1b",
    "npcId": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
    "status": "succeeded",
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "contentSizeBytes": 1234,
    "error": null,
    "updatedAt": "2025-10-24T12:00:00.000Z"
  }
  ```
- **Odpowiedzi błędów**:
  - `400 Bad Request`: Nieprawidłowy format `npcId` lub `jobId`.
  - `401 Unauthorized`: Brak aktywnej sesji użytkownika.
  - `404 Not Found`: Zasób (NPC lub zadanie) nie został znaleziony lub użytkownik nie ma do niego uprawnień.
  - `500 Internal Server Error`: Wewnętrzny błąd serwera.

## 5. Przepływ danych

1.  Żądanie `GET` trafia do endpointu Astro.
2.  Middleware Astro weryfikuje istnienie aktywnej sesji użytkownika.
3.  Handler `GET` w pliku endpointu waliduje parametry `npcId` i `jobId` przy użyciu Zod, sprawdzając, czy są to prawidłowe UUID.
4.  Wywoływana jest metoda `NpcService.getGenerationJobStatus(npcId, jobId, userId)`.
5.  **Logika w `NpcService`**:
    a. Pobiera z bazy danych rekord NPC, używając `npcId`, i sprawdza, czy `owner_id` zgadza się z `userId` oraz czy `generation_job_id` zgadza się z `jobId`. Jeśli którykolwiek warunek nie jest spełniony, zwracany jest błąd `NotFound`.
    b. Sprawdza aktualny status zadania (`generation_job_status`) w pobranym rekordzie.
    c. Jeśli status to `succeeded` lub `failed`, natychmiast buduje i zwraca `GenerationJobStatusResponseDto` na podstawie danych z bazy.
    d. Jeśli status to `queued` lub `processing`, oblicza czas, jaki upłynął od `generation_job_started_at`.
    e. **Jeśli upłynęło mniej niż 3 sekundy**, zwraca `GenerationJobStatusResponseDto` ze statusem `processing` i `xml: null`.
    f. **Jeśli upłynęło 3 lub więcej sekund**:
    i. Używa **klienta Supabase z uprawnieniami `service_role`**, aby zaktualizować status zadania na `succeeded` w tabeli `npcs`. Jest to konieczne, aby ominąć trigger bazodanowy blokujący modyfikację pól `generation_job_*`.
    ii. Odczytuje zawartość pliku `src/assets/mocks/sample-npc.xml` przy użyciu `fs/promises`.
    iii. Oblicza rozmiar odczytanego pliku w bajtach.
    iv. Buduje i zwraca `GenerationJobStatusResponseDto` ze statusem `succeeded`, zawartością XML i rozmiarem.
6.  Handler endpointu mapuje wynik z serwisu na odpowiednią odpowiedź HTTP (`Response`) z kodem statusu i ciałem.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Każde żądanie musi być uwierzytelnione. Middleware Astro odrzuci żądania bez ważnej sesji, zwracając `401 Unauthorized`.
- **Autoryzacja**: Warstwa serwisowa musi rygorystycznie egzekwować własność zasobu. Zapytanie o `npcId` nienależące do zalogowanego użytkownika musi skutkować błędem `404 Not Found`, aby zapobiec wyciekowi informacji o istnieniu zasobów. Polityki RLS w bazie danych stanowią dodatkową warstwę ochrony.

## 7. Obsługa błędów

| Scenariusz Błędu                                         | Kod Statusu HTTP            | Odpowiedzialność         |
| -------------------------------------------------------- | --------------------------- | ------------------------ |
| `npcId` lub `jobId` nie jest prawidłowym UUID            | `400 Bad Request`           | Endpoint (walidacja Zod) |
| Brak lub nieważna sesja użytkownika                      | `401 Unauthorized`          | Middleware Astro         |
| NPC nie istnieje lub nie należy do użytkownika           | `404 Not Found`             | `NpcService`             |
| `jobId` z URL nie pasuje do `generation_job_id` w bazie  | `404 Not Found`             | `NpcService`             |
| Błąd odczytu pliku `sample-npc.xml` lub błąd bazy danych | `500 Internal Server Error` | Endpoint (try/catch)     |

## 8. Rozważania dotyczące wydajności

- Zapytanie do bazy danych będzie operować na kluczu głównym (`id`), co gwarantuje wysoką wydajność.
- Odczyt małego, statycznego pliku z lokalnego systemu plików jest operacją bardzo szybką i nie stanowi wąskiego gardła.
- Celowe opóźnienie jest częścią logiki MVP i nie wpływa na rzeczywistą wydajność systemu.

## 9. Etapy wdrożenia

1.  **Utworzenie pliku endpointu**: Stworzyć nowy plik `src/pages/api/npcs/[npcId]/generation-jobs/[jobId].ts`.
2.  **Walidacja wejścia**: W nowym pliku zdefiniować schemat Zod do walidacji parametrów `npcId` i `jobId` z `Astro.params`.
3.  **Implementacja handlera `GET`**: Zaimplementować `export const GET: APIRoute = async ({ params, locals }) => { ... }`. Handler powinien zarządzać logiką sesji, parsowaniem Zod, wywołaniem serwisu i mapowaniem wyniku na obiekt `Response`.
4.  **Rozszerzenie `NpcService`**: W pliku `src/lib/services/npcService.ts` dodać nową metodę `getGenerationJobStatus`.
5.  **Implementacja logiki serwisu**: Wewnątrz `getGenerationJobStatus` zaimplementować pełny przepływ danych opisany w punkcie 5, włączając w to pobieranie danych, logikę czasową, aktualizację bazy danych z klientem `service_role` oraz odczyt pliku mocka.
6.  **Dodanie funkcji pomocniczej**: W `src/lib/utils.ts` stworzyć prostą funkcję pomocniczą do obliczania różnicy czasowej, aby utrzymać czystość kodu w serwisie.
7.  **Testowanie manualne**: Po implementacji, przeprowadzić testy manualne dla wszystkich ścieżek sukcesu i błędów przy użyciu klienta REST (np. Insomnia, Postman), aby zweryfikować poprawność działania, kodów statusu i zwracanych danych.
