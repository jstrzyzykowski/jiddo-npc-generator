# Plan Testów dla Aplikacji Jido NPC Generator

---

## 1. Wprowadzenie i Cele Testowania

### 1.1. Wprowadzenie

Niniejszy dokument opisuje strategię, zakres, zasoby i harmonogram działań związanych z testowaniem aplikacji Jido NPC Generator. Aplikacja ta ma na celu usprawnienie procesu tworzenia plików konfiguracyrnych NPC dla serwerów Open Tibia, wykorzystując do tego celu modele AI do generowania plików XML. Plan ten stanowi podstawę do zapewnienia jakości, niezawodności i użyteczności aplikacji przed jej wdrożeniem.

### 1.2. Cele Testowania

Główne cele procesu testowego to:

- **Zapewnienie poprawności funkcjonalnej:** Weryfikacja, czy wszystkie kluczowe funkcje aplikacji, takie jak autentykacja, tworzenie, edycja i zarządzanie NPC, działają zgodnie ze specyfikacją.
- **Weryfikacja jakości generowanych danych:** Upewnienie się, że generowane pliki XML są składniowo poprawne i zgodne z oczekiwaniami systemu Jido.
- **Zapewnienie stabilności i wydajności:** Identyfikacja i eliminacja wąskich gardeł wydajnościowych oraz zapewnienie, że aplikacja działa stabilnie pod obciążeniem.
- **Gwarancja bezpieczeństwa:** Weryfikacja, czy dane użytkowników są odpowiednio chronione, a dostęp do zasobów jest właściwie autoryzowany.
- **Zapewnienie wysokiej jakości interfejsu użytkownika (UI/UX):** Sprawdzenie, czy interfejs jest intuicyjny, responsywny i spójny wizualnie na różnych urządzeniach i przeglądarkach.

---

## 2. Zakres Testów

### 2.1. Funkcjonalności objęte testami (In-Scope)

- **Moduł Uwierzytelniania:**
  - Logowanie za pomocą magicznego linku.
  - Wylogowywanie.
  - Obsługa sesji użytkownika.
  - Ochrona tras wymagających autentykacji.
- **Moduł Zarządzania NPC:**
  - Tworzenie nowego NPC poprzez formularz.
  - Proces generowania pliku XML z wykorzystaniem AI.
  - Edycja parametrów istniejącego NPC.
  - Publikowanie i cofanie publikacji NPC.
  - Usuwanie NPC.
- **Przeglądanie i Wyszukiwanie NPC:**
  - Strona główna z listą wyróżnionych NPC.
  - Strona z listą wszystkich publicznych NPC.
  - Stronicowanie i nieskończone przewijanie (infinite scroll).
  - Widok szczegółowy NPC (metadane, podgląd kodu XML/LUA).
- **Profil Użytkownika:**
  - Wyświetlanie listy NPC stworzonych przez użytkownika.
  - Edycja danych profilowych.
- **API Backendowe:**
  - Walidacja danych wejściowych dla wszystkich endpointów.
  - Poprawność odpowiedzi (kody statusu, format danych).
  - Autoryzacja dostępu do endpointów.

### 2.2. Funkcjonalności wyłączone z testów (Out-of-Scope)

- Testy end-to-end integracji z serwerem Open Tibia (skupiamy się na poprawności generowanych plików).
- Testy wydajnościowe zewnętrznej usługi `OpenRouter.ai`.
- Testy wewnętrznej infrastruktury Supabase oraz Vercel.

---

## 3. Typy Testów

W ramach projektu zostaną przeprowadzone następujące rodzaje testów:

1.  **Testy Jednostkowe (Unit Tests):**
    - **Cel:** Weryfikacja poprawności działania pojedynczych komponentów React, hooków, funkcji pomocniczych i walidatorów.
    - **Zakres:** Komponenty UI, logika biznesowa w hookach (`useNpcCreator`, `useNpcDetail`), walidatory Zod, funkcje formatujące (`npcPromptFormatter`).
    - **Narzędzia:** Vitest, React Testing Library.

2.  **Testy Integracyjne (Integration Tests):**
    - **Cel:** Sprawdzenie poprawności współpracy pomiędzy różnymi częściami aplikacji, w szczególności między frontendem a backendem (API Astro).
    - **Zakres:** Integracja formularza tworzenia NPC z endpointem API, interakcje komponentów na stronie (np. filtrowanie listy NPC), komunikacja z Supabase.
    - **Narzędzia:** Vitest, React Testing Library z mockowaniem `fetch`/Supabase Client.

3.  **Testy End-to-End (E2E):**
    - **Cel:** Symulacja rzeczywistych scenariuszy użytkowania aplikacji z perspektywy użytkownika końcowego w przeglądarce.
    - **Zakres:** Pełne ścieżki użytkownika: od rejestracji, przez stworzenie i opublikowanie NPC, po jego usunięcie.
    - **Narzędzia:** Playwright lub Cypress.

4.  **Testy Wizualnej Regresji (Visual Regression Testing):**
    - **Cel:** Automatyczne wykrywanie niezamierzonych zmian w interfejsie użytkownika.
    - **Zakres:** Kluczowe komponenty UI (biblioteka `Shadcn/ui`), layout strony, widoki list i detali.
    - **Narzędzia:** Percy, Chromatic (w integracji ze Storybookiem).

5.  **Testy Kompatybilności (Compatibility Testing):**
    - **Cel:** Zapewnienie poprawnego działania i wyświetlania aplikacji na różnych przeglądarkach i urządzeniach.
    - **Zakres:** Cała aplikacja, ze szczególnym uwzględnieniem responsywności layoutu.
    - **Przeglądarki:** Chrome, Firefox, Safari, Edge (dwie ostatnie wersje).
    - **Urządzenia:** Desktop, Tablet, Mobile (emulacja).

---

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### 4.1. Uwierzytelnianie Użytkownika

| ID      | Scenariusz                                                | Oczekiwany Rezultat                                                                                    | Priorytet |
| :------ | :-------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :-------- |
| AUTH-01 | Logowanie poprawym adresem e-mail                         | Użytkownik otrzymuje magiczny link, po kliknięciu zostaje zalogowany i przekierowany na stronę główną. | Krytyczny |
| AUTH-02 | Próba logowania niepoprawnym formatem e-mail              | Formularz wyświetla błąd walidacji, link nie jest wysyłany.                                            | Wysoki    |
| AUTH-03 | Dostęp do chronionej trasy (np. `/creator`) bez logowania | Użytkownik zostaje przekierowany na stronę logowania.                                                  | Krytyczny |
| AUTH-04 | Wylogowanie                                               | Sesja użytkownika zostaje zakończona, użytkownik jest przekierowany na stronę główną.                  | Wysoki    |

### 4.2. Tworzenie i Generowanie NPC

| ID       | Scenariusz                                                                         | Oczekiwany Rezultat                                                                                                                       | Priorytet |
| :------- | :--------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :-------- |
| NPC-C-01 | Wypełnienie formularza tworzenia NPC poprawnymi danymi i zapisanie wersji roboczej | Nowy NPC zostaje utworzony w bazie danych ze statusem "draft". Użytkownik jest przekierowany na stronę edycji.                            | Krytyczny |
| NPC-C-02 | Próba zapisu formularza z brakującymi wymaganymi polami                            | Formularz wyświetla błędy walidacji przy odpowiednich polach. Zapis jest blokowany.                                                       | Wysoki    |
| NPC-C-03 | Uruchomienie generowania XML dla poprawnie skonfigurowanego NPC                    | Zadanie generowania jest uruchamiane. UI cyklicznie sprawdza status zadania. Po zakończeniu, wygenerowany XML jest widoczny w podglądzie. | Krytyczny |
| NPC-C-04 | Próba generowania XML dla NPC bez wymaganych danych                                | Przycisk "Generuj" jest nieaktywny lub wyświetla komunikat o konieczności uzupełnienia danych.                                            | Wysoki    |

### 4.3. Zarządzanie i Przeglądanie NPC

| ID       | Scenariusz                                        | Oczekiwany Rezultat                                                                                  | Priorytet |
| :------- | :------------------------------------------------ | :--------------------------------------------------------------------------------------------------- | :-------- |
| NPC-M-01 | Publikacja NPC ze statusem "draft"                | Status NPC zmienia się na "published". NPC staje się widoczny na publicznej liście.                  | Wysoki    |
| NPC-M-02 | Edycja danych opublikowanego NPC                  | Zmiany zostają zapisane w bazie danych i są widoczne w widoku szczegółowym.                          | Wysoki    |
| NPC-M-03 | Próba edycji NPC należącego do innego użytkownika | Dostęp do strony edycji jest zablokowany (błąd 403/404).                                             | Krytyczny |
| NPC-M-04 | Usunięcie własnego NPC                            | NPC zostaje usunięty z bazy danych i znika z list (publicznej i profilu użytkownika).                | Wysoki    |
| NPC-M-05 | Wyświetlenie listy publicznych NPC                | Lista NPC jest poprawnie ładowana i renderowana. Nieskończone przewijanie ładuje kolejne partie NPC. | Średni    |

---

## 5. Środowisko Testowe

- **Serwer Developerski (Lokalny):** Do bieżącego rozwoju i uruchamiania testów jednostkowych oraz integracyjnych.
- **Środowisko Stagingowe:** Wdrożone na Vercel, połączone z oddzielnym projektem Supabase (kopia produkcyjnej struktury, ale z danymi testowymi). Na tym środowisku będą przeprowadzane testy E2E i manualne testy akceptacyjne.
- **Środowisko Produkcyjne:** Finalna wersja aplikacji. Dostęp ograniczony, testy dymne (smoke tests) po każdym wdrożeniu.

Każde środowisko będzie miało własne klucze API do usług Supabase i OpenRouter.ai.

---

## 6. Narzędzia do Testowania

| Kategoria          | Narzędzie                                 | Zastosowanie                                                                          |
| :----------------- | :---------------------------------------- | :------------------------------------------------------------------------------------ |
| Framework testowy  | **Vitest**                                | Uruchamianie testów jednostkowych i integracyjnych.                                   |
| Biblioteka testowa | **React Testing Library**                 | Testowanie komponentów React bez polegania na detalach implementacyjnych.             |
| Testy E2E          | **Playwright**                            | Automatyzacja scenariuszy testowych w przeglądarce.                                   |
| Testy wizualne     | **Storybook + Percy/Chromatic**           | Tworzenie izolowanych komponentów i śledzenie zmian wizualnych.                       |
| Analiza kodu       | **ESLint, Prettier, TypeScript Compiler** | Statyczna analiza kodu, zapewnienie spójności i wykrywanie błędów na wczesnym etapie. |
| CI/CD              | **GitHub Actions**                        | Automatyczne uruchamianie testów po każdym pushu do repozytorium.                     |

---

## 7. Harmonogram Testów

Proces testowy będzie prowadzony równolegle z procesem deweloperskim zgodnie z poniższym harmonogramem:

- **Sprint 1-2:** Konfiguracja środowiska testowego, narzędzi i CI/CD. Pisanie testów jednostkowych dla kluczowych komponentów i logiki biznesowej.
- **Sprint 3-4:** Rozwój testów integracyjnych dla modułów autentykacji i tworzenia NPC. Pierwsze testy E2E dla ścieżki logowania.
- **Sprint 5-6:** Pełne pokrycie testami E2E kluczowych ścieżek użytkownika. Przeprowadzenie pierwszej tury testów kompatybilności.
- **Faza Stabilizacji (1 tydzień przed wdrożeniem):** Intensywne testy regresji, testy eksploracyjne i finalne testy akceptacyjne na środowisku stagingowym.

---

## 8. Kryteria Akceptacji Testów

### 8.1. Kryteria Wejścia (Rozpoczęcia Testów)

- Dostępna jest stabilna wersja aplikacji na środowisku stagingowym.
- Wszystkie testy jednostkowe i integracyjne w pipeline CI/CD przechodzą pomyślnie.
- Dokumentacja techniczna dla testowanych funkcjonalności jest dostępna.

### 8.2. Kryteria Wyjścia (Zakończenia Testów)

- Pokrycie kodu testami jednostkowymi wynosi co najmniej 80%.
- Wszystkie zaplanowane scenariusze testowe E2E kończą się sukcesem.
- Nie istnieją żadne nierozwiązane błędy o priorytecie "Krytyczny" lub "Wysoki".
- Aplikacja została pomyślnie zweryfikowana na wszystkich docelowych przeglądarkach.

---

## 9. Role i Odpowiedzialności

- **Deweloperzy:** Odpowiedzialni za pisanie testów jednostkowych i integracyjnych, naprawianie błędów zgłoszonych przez QA.
- **Inżynier QA:** Odpowiedzialny za tworzenie i utrzymanie planu testów, rozwój testów E2E, przeprowadzanie testów manualnych i eksploracyjnych, raportowanie błędów.
- **Product Owner:** Odpowiedzialny za zdefiniowanie kryteriów akceptacyjnych dla funkcjonalności i udział w końcowych testach akceptacyjnych (UAT).

---

## 10. Procedury Raportowania Błędów

1.  **Zgłaszanie Błędów:** Wszystkie znalezione błędy będą raportowane w systemie do śledzenia zadań (np. GitHub Issues).
2.  **Format Zgłoszenia:** Każde zgłoszenie powinno zawierać:
    - Tytuł: Krótki, zwięzły opis problemu.
    - Opis: Szczegółowe kroki do reprodukcji błędu.
    - Oczekiwany rezultat vs. Rzeczywisty rezultat.
    - Środowisko: Nazwa środowiska (np. Staging), wersja przeglądarki, system operacyjny.
    - Priorytet: (Krytyczny, Wysoki, Średni, Niski).
    - Załączniki: Zrzuty ekranu, nagrania wideo, logi z konsoli.
3.  **Cykl Życia Błędu:**
    - `New`: Nowo zgłoszony błąd.
    - `In Progress`: Błąd przypisany do dewelopera i w trakcie naprawy.
    - `Ready for QA`: Błąd naprawiony i wdrożony na środowisko stagingowe, gotowy do weryfikacji.
    - `Closed`: Błąd pomyślnie zweryfikowany przez QA.
    - `Reopened`: Weryfikacja nie powiodła się, błąd wraca do dewelopera.
