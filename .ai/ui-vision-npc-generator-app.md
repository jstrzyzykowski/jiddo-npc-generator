# Wizja Interfejsu Użytkownika – Jiddo NPC Generator

Dokument opisuje wizję interfejsu użytkownika (UI) dla aplikacji Jiddo NPC Generator, uwzględniając responsywność, przepływy użytkownika oraz stany aplikacji w wersji MVP.

---

## 1. Globalny Układ Aplikacji (Layout)

Układ aplikacji jest responsywny, z punktem przełamania (breakpoint) na **768px**.

### 1.1. Główny Pasek Nawigacyjny (Topbar)

- **Komponent**: Nawigacja z Shadcn/ui, pełna szerokość.
- **Po lewej (start)**: Logo aplikacji (obraz dostarczony przez dewelopera).
- **Na środku (center) (Poza MVP)**: Pasek wyszukiwania z `select` dropdown ("NPCs"), polem tekstowym i przyciskiem z ikoną lupy.
- **Po prawej (end) - Gość (niezalogowany)**:
  - Przycisk "Create NPC" (kolor `primary`, ikona przed tekstem).
  - Przycisk "Sign In" (przekierowanie do `/login`).
  - Icon button (hamburger menu), otwierający dropdown z opcjami: "Sign In" oraz przełącznik trybu dark/light (pełnej szerokości dropdown menu, tylko ikona słońca/księżyca).
- **Po prawej (end) - Użytkownik zalogowany**:
  - Przycisk "Create NPC" (aktywny).
  - Awatar użytkownika, otwierający dropdown z opcjami: nazwa użytkownika, link do profilu, "Wyloguj" i przełącznik trybu dark/light. W MVP brak "Account Settings".

**Wersja mobilna (< 768px):**

- **Po lewej (start)**: Minimalistyczne logo aplikacji.
- **Po prawej (end) - Gość**:
  - Przycisk "Create NPC".
  - Icon button z lupą (otwiera pełnoekranowy pasek wyszukiwania, przykrywający nawigację (wysokość taka sama jak topbar); zamknięcie searchbar poprzez kliknięcie poza nim).
  - Icon button (hamburger menu), otwierający pełnoekranowe menu (od spodu nawigacji do dołu ekranu) z zawartością: "Create NPC", separator, "Sign In", separator, przełącznik trybu dark/light na samym dole.
- **Po prawej (end) - Użytkownik zalogowany**: Hamburger menu pozostaje, ale zamiast "Sign In" zawiera opcje użytkownika.

### 1.2. Pasek Nawigacji Stron (Pod Topbarem)

- **Pozycja**: `sticky`, część `main`, wysokość ok. **44px**.
- **Zachowanie**: Chowa się "pod" topbar podczas scrollowania w dół, pojawia się przy scrollowaniu w górę.
- **Zawartość po lewej (start)**: Linki do stron (ikona + nazwa): "Home", "NPCs".
- **Zawartość po prawej (end) (tylko na `/npcs`)**:
  - Przycisk "Sortuj" (dropdown: "Newest", "Oldest").
  - Przycisk "Filtruj" (dropdown z okresami czasu, np. "This week" - **w MVP nieaktywny**).

**Wersja mobilna (< 768px):**

- Układ dwuwierszowy: w górnym wierszu linki do stron, w dolnym przyciski sortowania i filtrowania.

### 1.3. Główna Zawartość (Main)

- Główny obszar, w którym renderowane są treści poszczególnych stron.

### 1.4. Stopka (Footer)

- **Pozycja**: `sticky`, wysokość ok. **45px**, z **1px szarym borderem na górze**.
- **Zachowanie**: Chowa się "w dół" podczas scrollowania w dół, wysuwa "z dołu" przy scrollowaniu w górę.
- **Zawartość w MVP**:
  - **Po lewej (start)**: Znak copyright, nazwa aplikacji i aktualny rok.
- **Zawartość (Poza MVP)**:
  - **Po lewej, obok copyright**: Linki do "Terms of Service", "Privacy", "Status", ikony mediów społecznościowych.
  - **Po prawej (end)**: Przycisk "Support" (kolor `warning`, ikona koła ratunkowego + tekst).
- **Przycisk "Scroll to Top"**:
  - Pojawia się w lewym dolnym rogu, gdy stopka jest ukryta (podczas scrollowania w dół).
  - Jest to icon button ze strzałką w górę.

---

## 2. Kluczowe Widoki i Ekrany

### 2.1. Strona Główna (Home - `/`)

- **Stan dla gościa**:
  - Siatka z **6 najnowszymi opublikowanymi NPC**.
  - Pierwszy wiersz: duży panel informacyjny (zajmuje 2 z 4 slotów) z ikoną, tytułem "Featured NPC's", opisem i przyciskiem "Explore all NPCs", oraz 2 karty NPC.
  - Przykładowy opis: "All sorts of NPCs created by our community, from simple traders to detailed quest givers or powerful bosses".
  - Drugi wiersz: 4 karty NPC.
- **Stan dla zalogowanego**:
  - Siatka z **8 najnowszymi opublikowanymi NPC** (układ 2x4).
  - Brak panelu informacyjnego.
  - Tytuł sekcji "Featured NPC's" nad siatką, z ikoną "info" (tooltip z opisem sekcji) oraz przyciskiem "Explore all NPCs" po prawej.

### 2.2. Strona Listy NPC (`/npcs`)

- **Układ**: Siatka kart NPC (4 na wiersz), wymiary karty ok. **318px szerokości**, `grid-gap: 1rem`.
- **Paginacja**: "Infinite scroll".
- **Filtrowanie (tagi)**:
  - Pasek z tagami nad siatką, o szerokości siatki, nie jest `sticky`.
  - Tagi w MVP: "All", "Shop", "Keywords". Pozostałe ("XML", "Focus", "Travel", "Voice") mogą być widoczne jako nieaktywne.
  - Kliknięcie tagu filtruje listę (przez parametr URL).
- **Karta NPC**: Każda karta jest klikalna i prowadzi do strony szczegółów NPC. Zawiera: placeholder obrazu, nazwę NPC, autora, ikony aktywnych modułów. Dla właściciela, w rogu karty znajduje się menu (ikona 3 kropki) z akcjami: "Edytuj", "Publikuj", "Usuń".

### 2.3. Strona Szczegółów NPC (`/npcs/{npcId}`)

- **Układ**: Dwukolumnowy.
- **Lewa kolumna**: Metadane NPC (nazwa, autor, status, daty, aktywne moduły).
- **Prawa kolumna**: Dwa panele w zakładkach z podglądem kodu **XML** i **Lua** (`default.lua`), każdy z przyciskiem "Kopiuj".
- **Akcje właściciela**: Na górze strony znajduje się menu akcji (ikona 3 kropki) z opcjami: "Edytuj", "Publikuj", "Usuń".

### 2.4. Strona Kreatora NPC (`/creator` lub `/creator/{npcId}`)

- **Dostęp**: Tylko dla zalogowanych użytkowników.
- **Układ**:
  - Panel boczny (`aside`) po lewej stronie z formularzem parametrów NPC.
  - Pozostały obszar podzielony na dwa panele: podgląd XML (lewy) i podgląd Lua (prawy).
- **Pasek akcji**: Na dole strony, `sticky`, zawiera przyciski akcji.
- **Przepływ tworzenia (nowy NPC)**:
  1. Użytkownik wypełnia formularz. Aktywny jest przycisk "Zapisz wersję roboczą".
  2. Po kliknięciu i pomyślnym zapisie (`POST /npcs`), URL strony zmienia się na `/creator/{npcId}`, a przycisk "Zapisz..." jest zastępowany przez aktywny przycisk "Generuj XML".
- **Przepływ edycji (istniejący NPC)**:
  1. Dostępne są przyciski "Generuj ponownie XML" i "Wyjdź".
  2. Po dokonaniu jakiejkolwiek zmiany w formularzu, przycisk "Generuj ponownie XML" staje się nieaktywny, a obok pojawia się "Zapisz zmiany".
  3. Po zapisaniu zmian (`PATCH /npcs/{npcId}`), przycisk "Zapisz zmiany" znika, a "Generuj ponownie XML" znów staje się aktywny.
- **Generowanie XML**: Po kliknięciu "Generuj XML" panel `aside` jest blokowany, a w podglądzie XML pojawia się loader na czas odpytywania API o status zadania.
- **Wyjście**: Przycisk "Wyjdź" uruchamia natywne ostrzeżenie przeglądarki, jeśli w formularzu są niezapisane zmiany.

**Wersja mobilna (< 768px):**

- Panel `aside` jest domyślnie ukryty.
- Pływający przycisk akcji (FAB) w rogu ekranu przełącza widoczność panelu `aside`.
- Panel `aside` posiada w nagłówku przycisk "X" do jego zamknięcia.
- Podglądy XML i Lua są ułożone jeden pod drugim.

### 2.5. Strona Logowania (`/login`)

- Wycentrowany formularz z logiem, nagłówkiem "Sign in with magic link", polem na adres e-mail i przyciskiem "Send magic link".
- Po wysłaniu linku, formularz jest zastępowany przez komunikat "Check your email..." z ikoną.
- **Strona zwrotna (`/auth/callback`)**: Po kliknięciu linku w mailu, użytkownik trafia na tę stronę, która wyświetla loader na czas finalizowania sesji, a następnie przekierowuje na stronę główną.

### 2.6. Strona Profilu Użytkownika (`/profile/{userId}`)

- **Układ**: Dwukolumnowy.
- **Lewa kolumna (`aside`)**: Szerokość **318px + 1px border**, zawiera avatar, nazwę, datę rejestracji.
- **Prawa kolumna (główna zawartość)**:
  - Pasek z zasobami użytkownika (w MVP "NPCs" z ikoną, nazwą i licznikiem w `badge`).
  - Lista NPC (zakładki "Wersje robocze" i "Opublikowane"), z paginacją (infinite scroll) i filtrowaniem po tagach (w MVP "All", "Shop", "Keywords").
- **Wersja mobilna (< 768px)**: Układ wierszowy: pasek zasobów, potem panel z danymi usera, na końcu lista NPC.

---

## 3. Kluczowe Stany Aplikacji

### 3.1. Stany Ładowania

- **Listy NPC**: Przy pierwszym ładowaniu wyświetlane są "skeleton loaders". Przy doładowywaniu (infinite scroll) na dole listy pojawia się spinner.
- **Generowanie XML**: Panel `aside` kreatora jest blokowany, a w panelu podglądu XML wyświetlany jest loader.

### 3.2. Stany Puste

- **Brak NPC (globalnie)**: Na stronach Home i `/npcs` siatka jest wypełniona komponentami placeholderów.
- **Profil nowego użytkownika**: Zamiast listy NPC, wyświetlany jest komponent powitalny z przyciskiem "Stwórz swojego pierwszego NPC".
- **Brak wyników po filtrowaniu**: Wyświetlany jest komunikat "Nie znaleziono NPC pasujących do wybranych filtrów".

### 3.3. Akcje Wymagające Potwierdzenia

- **Usuwanie NPC (Soft Delete)**: Akcja uruchamia modalne okno dialogowe z prośbą o potwierdzenie, ostrzeżeniem i opcjonalnym polem na wpisanie powodu usunięcia. Przycisk potwierdzający jest w kolorze ostrzegawczym.
