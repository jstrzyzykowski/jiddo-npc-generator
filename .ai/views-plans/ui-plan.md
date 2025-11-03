# Architektura UI dla Jiddo NPC Generator

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla Jiddo NPC Generator została zaprojektowana w oparciu o nowoczesny stos technologiczny (Astro, React, Tailwind CSS, Shadcn/ui), aby zapewnić responsywne, wydajne i intuicyjne doświadczenie. Aplikacja posiada globalny, spójny układ składający się z głównego paska nawigacyjnego (Topbar), kontekstowego paska nawigacji pod nim, głównej treści oraz stopki. Układ jest w pełni responsywny, z kluczowym punktem przełamania na 768px, który dostosowuje nawigację i widoki list do urządzeń mobilnych.

Kluczowym założeniem architektury jest dynamiczne dostosowywanie interfejsu do stanu uwierzytelnienia użytkownika, oferując inne widoki i akcje dla gości oraz zalogowanych właścicieli treści. Architektura UI ściśle odzwierciedla asynchroniczną naturę API, szczególnie w procesie generowania NPC, prowadząc użytkownika krok po kroku przez zapisywanie wersji roboczej i zlecanie zadań generowania, z wyraźnym feedbackiem wizualnym na każdym etapie.

## 2. Lista widoków

### Widok: Globalny Układ (Layout)

- **Ścieżka:** Aplikowany do wszystkich stron
- **Główny cel:** Zapewnienie spójnej struktury nawigacyjnej i wizualnej w całej aplikacji. Zarządzanie globalnym stanem, takim jak sesja użytkownika.
- **Kluczowe informacje:** Status zalogowania użytkownika.
- **Kluczowe komponenty:** `Topbar`, `SecondaryNavbar`, `Footer`, `ScrollToTopButton`.
- **UX, dostępność, bezpieczeństwo:** Stan uwierzytelnienia decyduje o widoczności linków "Sign In" vs. menu użytkownika (Avatar jako przycisk, dropdown menu z opcjami: nazwa użytkownika, link do profilu, przycisk "Wyloguj" oraz przełącznik trybu dark/light).

### Widok: Strona Główna (Home)

- **Ścieżka:** `/`
- **Główny cel:** Prezentacja aplikacji, zachęcenie do eksploracji i przedstawienie najnowszych, wyróżnionych NPC.
- **Kluczowe informacje:** Siatka opublikowanych NPC.
- **Kluczowe komponenty:** `FeaturedInfoPanel` (dla gości), `NpcGrid`, `NpcCard`, `SkeletonCard` (stan ładowania).
- **UX, dostępność, bezpieczeństwo:** Dynamiczny układ siatki: dla gości 1 wiersz z panelem informacyjnym i 2 kartami, drugi wiersz z 4 kartami. Dla zalogowanych użytkowników standardowa siatka 2x4 z 8 kartami (brak panelu informacyjnego). Dla zalogowanych użytkowników, nazwa sekcji "Featured NPC's" jest wyświetlana nad siatką, z przyciskiem "Explore all NPCs" po prawej stronie. Obok nazwy sekcji znajduje się ikona "info", która otwiera tooltip z opisem sekcji "Featured NPC's" (opis taki sam jak w elemencie informacji przed uwierzytelnieniem).

### Widok: Strona Logowania (Login)

- **Ścieżka:** `/login`
- **Główny cel:** Umożliwienie użytkownikom uwierzytelnienia za pomocą "magic link".
- **Kluczowe informacje:** Formularz do wprowadzenia adresu e-mail; komunikat po wysłaniu linku.
- **Kluczowe komponenty:** `MagicLinkForm`, `PostSubmissionMessage`.
- **UX, dostępność, bezpieczeństwo:** Jasne komunikaty o błędach walidacji e-mail lub problemach z wysyłką. Fokus automatycznie ustawiany na polu e-mail. W przypadku błędu, komunikat jest wyświetlany jako toast notification oraz w formularzu pojawia się komunikat o błędzie.

### Widok: Strona Zwrotna Uwierzytelniania (Auth Callback)

- **Ścieżka:** `/auth/callback`
- **Główny cel:** Sfinalizowanie sesji użytkownika po kliknięciu w "magic link". Jest to widok przejściowy.
- **Kluczowe informacje:** Wskaźnik ładowania.
- **Kluczowe komponenty:** `Spinner`.
- **UX, dostępność, bezpieczeństwo:** Użytkownik jest informowany, że proces logowania jest w toku. Po zakończeniu następuje automatyczne przekierowanie, a w razie błędu wyświetlany jest komunikat z opcją powrotu do strony logowania.

### Widok: Lista NPC (NPCs)

- **Ścieżka:** `/npcs`
- **Główny cel:** Umożliwienie przeglądania, sortowania i filtrowania wszystkich opublikowanych NPC.
- **Kluczowe informacje:** Paginowana (infinite scroll) siatka opublikowanych NPC.
- **Kluczowe komponenty:** `NpcGrid`, `NpcCard`, `SkeletonCard`, `SortDropdown`, `FilterTags`, `InfiniteScrollTrigger`, `EmptyState` (dla braku wyników).
- **UX, dostępność, bezpieczeństwo:** Stan ładowania jest obsługiwany przez skeletony, a doładowywanie przez spinner. Filtry i sortowanie aktualizują parametry URL, umożliwiając udostępnianie linków do przefiltrowanych widoków.

### Widok: Szczegóły NPC (NPC Detail)

- **Ścieżka:** `/npcs/{npcId}`
- **Główny cel:** Wyświetlenie wszystkich szczegółowych informacji o konkretnym NPC i umożliwienie właścicielowi wykonania akcji.
- **Kluczowe informacje:** Metadane NPC, podglądy kodu XML i `default.lua`.
- **Kluczowe komponenty:** `MetadataPanel`, `CodePreview` (z zakładkami i przyciskiem kopiowania), `OwnerActionsDropdown` (dla właściciela).
- **UX, dostępność, bezpieczeństwo:** Dostęp do akcji (Edytuj, Publikuj, Usuń) jest ograniczony tylko do właściciela NPC. Podgląd kodu jest tylko do odczytu, co zapobiega pomyłkom.

### Widok: Kreator NPC (NPC Creator)

- **Ścieżka:** `/creator` (nowy NPC), `/creator/{npcId}` (edycja)
- **Główny cel:** Główne narzędzie do tworzenia i modyfikowania NPC.
- **Kluczowe informacje:** Formularz parametrów NPC, podgląd generowanego XML i statycznego `default.lua`.
- **Kluczowe komponenty:** `CreatorForm` (w `aside`), `CodePreview`, `ActionToolbar` (sticky bottom bar w panelu aside), `ShopItemsEditor`, `KeywordsEditor`, `ConfirmationDialog` (dla usuwania), `Loader` (w panelu XML).
- **UX, dostępność, bezpieczeństwo:** Asynchroniczny proces generowania ma jasny feedback (blokada formularza, loader). Ostrzeżenie `beforeunload` zapobiega utracie niezapisanych danych. Stan przycisków w `ActionToolbar` precyzyjnie prowadzi użytkownika przez proces.

### Widok: Profil Użytkownika (User Profile)

- **Ścieżka:** `/profile/{userId}`
- **Główny cel:** Umożliwienie użytkownikowi przeglądania swojego profilu oraz zarządzania stworzonymi przez siebie NPC.
- **Kluczowe informacje:** Dane użytkownika, sub-menu z zakładką `NPCs`, tagi oraz dodatkowo zakładki `Published` i `Drafts` zawierające listy jego NPC (wersje robocze i opublikowane).
- **Kluczowe komponenty:** `ProfileAside` (dane użytkownika), `Tabs` (Wersje robocze/Opublikowane), `NpcGrid`, `NpcCard`, `EmptyState` (powitalny dla nowych użytkowników).
- **UX, dostępność, bezpieczeństwo:** Widok dostępny tylko dla zalogowanych użytkowników. Nowi użytkownicy są witani komunikatem z CTA do stworzenia pierwszego NPC. Aby widzieć zakładki, musimy najpierw wybrać "NPCs" z paska pod nawigacją. Po wybraniu "NPCs", widok przełącza się na widok listy NPC z zakładkami `Published` i `Drafts`.
- **Karta `Published`**: Wyświetla listę NPC opublikowanych przez użytkownika.
- **Karta `Drafts`**: Wyświetla listę NPC w wersji roboczej należących do użytkownika.
  Podobnie jak na **liście wszystkich NPC** (`/npcs`), widok `Drafts` i `Published` obsługuje paginację (infinite scroll) i filtrowanie po tagach. Dostępne są także filtry od najnowszych do najstarszych NPC oraz filtry po tagach.

## 3. Mapa podróży użytkownika

Główny przypadek użycia: **Tworzenie i publikacja nowego NPC**.

1.  **Logowanie:** Użytkownik przechodzi ze strony głównej (`/`) do strony logowania (`/login`), podaje e-mail, klika link w mailu, ląduje na przejściowej stronie (`/auth/callback`), po czym zostaje zalogowany i przekierowany na stronę główną.
2.  **Inicjacja tworzenia:** Użytkownik klika "Create NPC" w nawigacji, co przenosi go do Kreatora (`/creator`).
3.  **Wprowadzanie danych:** Użytkownik wypełnia formularz z parametrami NPC. Przycisk "Zapisz wersję roboczą" staje się aktywny.
4.  **Zapis wersji roboczej:** Po kliknięciu "Zapisz wersję roboczą" (`POST /npcs`), aplikacja zmienia URL na `/creator/{npcId}` i zamienia przycisk na "Generuj XML".
5.  **Generowanie XML:** Użytkownik klika "Generuj XML" (`POST /npcs/{npcId}/generate`). Formularz zostaje zablokowany, a w panelu podglądu XML pojawia się loader. Aplikacja cyklicznie odpytuje API o status zadania.
6.  **Wyświetlenie wyniku:** Po pomyślnym wygenerowaniu, XML pojawia się w podglądzie, a formularz zostaje odblokowany.
7.  **Publikacja:** Użytkownik, będąc zadowolonym z wyniku, przechodzi na stronę szczegółów NPC (`/npcs/{npcId}`) i z menu akcji wybiera "Publikuj". Użytkownik może także przejść na swój profil a następnie z paska wybrać "NPCs" i wybrać NPC z listy a następnie z menu akcji wybrać "Publikuj".
8.  **Zakończenie:** Po pomyślnej walidacji po stronie serwera (`POST /npcs/{npcId}/publish`), NPC staje się publicznie widoczny i pojawia się na liście `/npcs` oraz w zakładce "Opublikowane" na profilu użytkownika.

## 4. Układ i struktura nawigacji

- **Nawigacja główna (Topbar):** Zawsze widoczna na górze strony. Zawiera logo (link do `/`) - wersja dłuższa jako nazwa aplikacji oraz wersja krótsza jako logo, przycisk "Create NPC" oraz menu użytkownika (lub "Sign In"). W wersji mobilnej kluczowe akcje są schowane w menu hamburgerowym.
- **Nawigacja drugorzędna (Pod Topbarem):** Jest `sticky` i pojawia się/znika podczas scrollowania. Zawiera linki do kluczowych widoków: "Home" i "NPCs". Na stronie listy (`/npcs`) po prawej stronie pojawiają się dodatkowe kontrolki sortowania i filtrowania. Na stronie profilu (`/profile/{userId}`) po prawej stronie nie ma dodatkowych kontrolek sortowania i filtrowania.
- **Nawigacja wewnątrz widoku:**
  - **Karty NPC:** Każda karta jest linkiem do strony szczegółów (`/npcs/{npcId}`).
  - **Profil użytkownika:** Używa zakładek do przełączania między listą wersji roboczych a opublikowanych. Aby widzieć zakładki, musimy najpierw wybrać "NPCs" z paska pod nawigacją.
  - **Kreator NPC:** Użytkownik nawiguje między sekcjami formularza scrollując panel boczny.

## 5. Kluczowe komponenty

- **`NpcCard`:** Standardowy komponent do wyświetlania pojedynczego NPC w siatce. Zawiera obraz, nazwę, autora, ikony modułów oraz (dla właściciela) `OwnerActionsDropdown`.
- **`OwnerActionsDropdown`:** Ujednolicone menu (ikona 3 kropki) dostępne na `NpcCard` i stronie szczegółów, zawierające akcje: "Edytuj", "Publikuj", "Usuń".
- **`CodePreview`:** Komponent z zakładkami do wyświetlania kodu XML i Lua. Posiada przycisk "Kopiuj do schowka" i obsługuje stan ładowania (dla XML).
- **`ActionToolbar`:** `Sticky` pasek na dole strony kreatora. Jego przyciski dynamicznie zmieniają swój stan (aktywny/nieaktywny) i etykiety ("Zapisz wersję roboczą", "Generuj XML", "Zapisz zmiany") w zależności od stanu formularza i etapu tworzenia NPC.
- **`EmptyState`:** Komponent wyświetlany w miejscu siatki NPC. Ma dwie wersje: powitalną z przyciskiem CTA dla nowych użytkowników oraz informacyjną dla braku wyników po zastosowaniu filtrów.
- **`ConfirmationDialog`:** Modalne okno dialogowe używane do potwierdzenia krytycznych akcji, takich jak usuwanie NPC. Zawiera opcjonalne pole na wpisanie powodu.
- **`SkeletonCard`:** Placeholder używany w siatkach NPC podczas początkowego ładowania danych, zapewniający lepsze wrażenie postrzeganej wydajności.
