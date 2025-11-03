# Plan Wdrożenia: Asynchroniczne Generowanie XML dla NPC

## 1. Przegląd Funkcjonalności

Celem jest wdrożenie mechanizmu generowania plików XML na podstawie parametrów NPC zdefiniowanych przez użytkownika. Ze względu na nieprzewidywalny i potencjalnie długi czas odpowiedzi od modeli językowych (LLM), cała architektura opiera się na **procesie asynchronicznym**. Zapewnia to odporność na timeouty API i lepsze doświadczenie użytkownika (UX), który jest na bieżąco informowany o postępie.

Plan zakłada dwie fazy:

1.  **Faza 1 (MVP):** Implementacja z **mockowanym** procesem generacji, aby szybko dostarczyć działający szkielet funkcjonalności i umożliwić równoległe prace nad interfejsem użytkownika.
2.  **Faza 2 (Produkcja):** Integracja z **OpenRouter** przy użyciu Supabase Edge Functions, zastępując mock docelowym rozwiązaniem bez konieczności zmiany publicznego API i logiki UI.

## 2. Architektura i Komponenty

- **Frontend (UI):** Interfejs użytkownika w Astro/React, odpowiedzialny za orkiestrację wywołań API i zarządzanie stanem (np. blokowanie przycisków, wyświetlanie spinnerów i wyników).
- **Backend (Astro API Endpoints):** Dwa główne endpointy do zarządzania procesem generacji.
- **Baza Danych (Supabase PostgreSQL):** Tabela `npcs` zostanie rozszerzona o kolumny do śledzenia stanu zadań generacji.
- **Pracownik Tła (Supabase Edge Function):** Komponent (wprowadzony w Fazie 2) odpowiedzialny za orkiestrację procesu generacji.
- **Serwis AI (OpenRouterService):** Dedykowany, reużywalny serwis (wprowadzony w Fazie 2) enkapsulujący całą logikę komunikacji z API OpenRouter.
- **Magazyn Plików (Supabase Storage):** Istniejący bucket `npc-xml-files` posłuży do przechowywania finalnych plików XML.

### 2.1. Rola Parametru `force` (Wyjście Awaryjne)

Chociaż parametr `force` nie jest kluczowy dla implementacji MVP, jego obecność w kontrakcie API jest strategiczna i pełni rolę "wyjścia awaryjnego" dla przyszłych zastosowań. Standardowe zachowanie interfejsu użytkownika powinno zakładać blokowanie możliwości generowania, gdy formularz NPC nie uległ zmianie (jest w stanie `pristine`), aby zapobiegać niepotrzebnym i kosztownym wywołaniom API.

Parametr `force=true` pozwala świadomie obejść tę blokadę w uzasadnionych przypadkach:

1.  **Aktualizacja Modeli AI lub Promptów po Stronie Serwera**: Jeśli wdrożymy nową, lepszą wersję modelu AI lub znacząco ulepszymy prompty, użytkownicy posiadający już wygenerowane NPC nie mogliby skorzystać z tych ulepszeń bez sztucznej zmiany w formularzu. Opcja wymuszonego generowania pozwala im odświeżyć XML do najnowszej, wyższej jakości wersji.

2.  **Nieoptymalne, Losowe Wyniki Generowania**: Modele językowe (LLM) posiadają pewien stopień losowości (`temperature`). Może się zdarzyć, że wygenerowany XML, choć technicznie poprawny, nie spełnia oczekiwań estetycznych lub logicznych użytkownika. Możliwość "przerzucenia kości" i spróbowania jeszcze raz bez modyfikacji parametrów wejściowych jest cenną funkcją.

W logice docelowej (Faza 2), pracownik tła (Edge Function) będzie odpowiedzialny za interpretację tego parametru i bezwarunkowe uruchomienie procesu generacji, ignorując wszelkie mechanizmy optymalizacyjne czy cache'ujące.

## 3. Zmiany w Schemacie Bazy Danych

Do tabeli `npcs` należy dodać następujące kolumny. Należy utworzyć nowy plik migracji Supabase.

```sql
--- Plik: supabase/migrations/YYYYMMDDHHMMSS_add_generation_job_feature.sql
-- Krok 1: Stworzenie nowego typu ENUM dla statusu zadania
CREATE TYPE public.generation_job_status AS ENUM (
    'queued',
    'processing',
    'succeeded',
    'failed'
);

-- Krok 2: Zmiana struktury tabeli npcs - dodanie nowych kolumn
ALTER TABLE public.npcs
ADD COLUMN generation_job_id UUID NULL,
ADD COLUMN generation_job_status public.generation_job_status NULL,
ADD COLUMN generation_job_started_at TIMESTAMPTZ NULL,
ADD COLUMN generation_job_error JSONB NULL;

-- Krok 3: Dodanie komentarzy dla nowych kolumn (dobra praktyka)
COMMENT ON COLUMN public.npcs.generation_job_id IS 'ID ostatniego zadania generacji XML.';
COMMENT ON COLUMN public.npcs.generation_job_status IS 'Status zadania: queued, processing, succeeded, failed.';
COMMENT ON COLUMN public.npcs.generation_job_started_at IS 'Timestamp rozpoczęcia zadania.';
COMMENT ON COLUMN public.npcs.generation_job_error IS 'Szczegóły błędu w przypadku niepowodzenia generacji.';

-- Krok 4: Dodanie indeksów dla optymalizacji zapytań
CREATE INDEX IF NOT EXISTS idx_npcs_generation_job_id
ON public.npcs (generation_job_id);

CREATE INDEX IF NOT EXISTS idx_npcs_generation_job_status_started_at
ON public.npcs (generation_job_status, generation_job_started_at);

-- Krok 5: Stworzenie funkcji triggera do ochrony kolumn
CREATE OR REPLACE FUNCTION public.protect_generation_job_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  -- Zezwól na wszystkie zmiany, jeśli operacja jest wykonywana przez rolę serwisową (backend)
  IF (auth.role() = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- Dla zwykłych uwierzytelnionych użytkowników, sprawdź czy próbują zmienić chronione kolumny
  IF
    NEW.generation_job_id IS DISTINCT FROM OLD.generation_job_id OR
    NEW.generation_job_status IS DISTINCT FROM OLD.generation_job_status OR
    NEW.generation_job_started_at IS DISTINCT FROM OLD.generation_job_started_at OR
    NEW.generation_job_error IS DISTINCT FROM OLD.generation_job_error
  THEN
    -- Jeśli tak, zablokuj operację i rzuć błąd
    RAISE EXCEPTION 'Modification of generation job fields is not allowed.';
  END IF;

  -- Jeśli żadne chronione pole nie zostało zmienione, zezwól na aktualizację
  RETURN NEW;
END;
$$;

-- Krok 6: Stworzenie triggera używającego powyższej funkcji
CREATE TRIGGER before_npcs_update_protect_job_fields
  BEFORE UPDATE ON public.npcs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_generation_job_fields();
```

## 3.1. Zabezpieczenie Kolumn (Trigger)

**Krytyczne:** Standardowe polityki RLS (Row-Level Security) chronią dostęp do **wierszy**, ale nie do poszczególnych **kolumn**. Aby zapobiec nieautoryzowanej modyfikacji pól `generation_job_*` przez użytkowników, konieczne jest wdrożenie dodatkowego zabezpieczenia na poziomie bazy danych.

- **Ryzyko:** Zalogowany użytkownik, mimo że polityka RLS pozwala mu na aktualizację własnego NPC, mógłby za pomocą standardowego API (`PATCH /api/npcs/{npcId}`) samodzielnie ustawić `generation_job_status` na `'succeeded'`, omijając cały proces generacji.
- **Rozwiązanie:** Zastosowanie **triggera bazodanowego `BEFORE UPDATE`**. Jest to standardowy i bezpieczny mechanizm w PostgreSQL do ochrony kolumn. Trigger uruchomi się przed każdą operacją `UPDATE` i sprawdzi, czy użytkownik próbuje zmodyfikować chronione pola. Zmiany w tych kolumnach będą dozwolone wyłącznie dla logiki backendowej działającej z uprawnieniami `service_role`. Sama polityka RLS `npcs_update_authenticated` pozostaje bez zmian.

## 4. Szczegółowy Przepływ Danych (Flow)

### Faza 1: Implementacja z Mockiem

#### **Krok 1: Inicjacja (UI -> Backend)**

1.  Użytkownik wprowadza zmiany w formularzu NPC i klika przycisk **"Zapisz i Generuj XML"**.
2.  **UI:** Blokuje formularz, wyświetla spinner ("Zapisywanie...").
3.  **UI:** Wysyła `PATCH /api/npcs/{npcId}` w celu zapisania zmian.
4.  **UI (po sukcesie zapisu):** Zmienia komunikat na "Rozpoczynam generowanie..." i wysyła `POST /api/npcs/{npcId}/generate`.
5.  **Backend (`POST /.../generate`):**
    - Generuje nowy `jobId` (np. `uuid()`).
    - Aktualizuje wiersz w tabeli `npcs`, ustawiając:
      - `generation_job_id` = nowy `jobId`
      - `generation_job_status` = `'queued'`
      - `generation_job_started_at` = `now()`
    - Zwraca natychmiastową odpowiedź `202 Accepted` z `jobId`.

#### **Krok 2: Odpytywanie o Status (UI -> Backend)**

1.  **UI (po otrzymaniu `jobId`):** Zmienia komunikat na "Generowanie w toku..." i rozpoczyna cykliczne odpytywanie (polling) co 2 sekundy.
2.  **UI:** Wysyła `GET /api/npcs/{npcId}/generation-jobs/{jobId}`.
3.  **Backend (`GET /.../{jobId}`):**
    - Odczytuje wiersz NPC z bazy.
    - Weryfikuje, czy `jobId` z URL zgadza się z `generation_job_id` w bazie.
    - Sprawdza `generation_job_started_at`.
    - **Jeśli od startu minęło < 3 sekundy:** Zwraca status `processing`.
    - **Jeśli od startu minęło >= 3 sekundy:**
      - **Aktualizuje** wiersz w `npcs`, ustawiając `generation_job_status` = `'succeeded'`.
      - **Odczytuje** zawartość statycznego pliku `src/assets/mocks/sample-npc.xml`.
      - Zwraca odpowiedź `200 OK` ze statusem `succeeded` i zawartością pliku w polu `xml`.

#### **Krok 3: Zakończenie (Backend -> UI)**

1.  **UI (po otrzymaniu statusu `succeeded`):**
    - Przerywa pętlę odpytywania.
    - Odblokowuje formularz, ukrywa spinner.
    - Wyświetla komunikat o sukcesie oraz otrzymaną zawartość XML.

---

### Faza 2: Integracja z OpenRouter

_Główna zmiana polega na zastąpieniu logiki mocka w endpoincie `GET` przez Supabase Edge Function, która działa w tle._

#### **Krok 1: Inicjacja (Bez Zmian)**

- Proces inicjacji (`POST /.../generate`) pozostaje **identyczny**. Zmiana w bazie danych (ustawienie statusu na `queued`) posłuży jako **wyzwalacz (webhook)** dla naszej Edge Function.

#### **Krok 2: Przetwarzanie w Tle (Supabase Edge Function)**

1.  **Edge Function** jest automatycznie uruchamiana przez webhook nasłuchujący na zmiany w tabeli `npcs`.
2.  Jej głównym zadaniem jest **orkiestracja procesu**, a nie bezpośrednia komunikacja z AI.
3.  **Aktualizuje** `generation_job_status` na `processing`.
4.  Pobiera pełne dane NPC z bazy danych.
5.  **Wywołuje dedykowany `OpenRouterService`**, który przejmuje całą logikę związaną z AI:
    - Buduje precyzyjny prompt na podstawie przekazanych danych NPC.
    - Obsługuje uwierzytelnione zapytanie do API OpenRouter.
    - Przetwarza odpowiedź, aby wyodrębnić czystą zawartość XML.
6.  **Edge Function odbiera wynik** z serwisu:
    - **Sukces:** Zapisuje zwrócony string XML do bucketa `npc-xml-files` w Supabase Storage. Następnie aktualizuje wiersz w `npcs`, ustawiając `generation_job_status` na `succeeded`.
    - **Błąd:** Zapisuje szczegóły błędu (zwrócone przez serwis) w `generation_job_error` i ustawia status na `failed`.

#### **Krok 3: Odpytywanie o Status (Logika Zmieniona)**

- **Backend (`GET /.../{jobId}`):**
  - **Nie symuluje już opóźnienia.** Po prostu odczytuje aktualny stan z bazy danych (`generation_job_status`), który jest modyfikowany w tle przez Edge Function.
  - Gdy odczyta status `succeeded`, pobiera odpowiedni plik z Supabase Storage i zwraca jego zawartość w polu `xml`.
  - Gdy odczyta status `failed`, zwraca szczegóły błędu.
- **UI:** Działa **bez żadnych zmian**, ponieważ kontrakt API (`GET /.../{jobId}`) pozostaje taki sam.
