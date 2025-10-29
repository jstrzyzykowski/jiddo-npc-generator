# Plan implementacji widoków aplikacji

## Wprowadzenie

Niniejszy dokument stanowi plan prac nad przygotowaniem szczegółowych specyfikacji implementacyjnych dla poszczególnych widoków aplikacji Jiddo NPC Generator. Celem jest usystematyzowanie procesu, zapewnienie, że każdy widok realizuje konkretne historyjki użytkownika i poprawnie integruje się z istniejącymi endpointami API.

Kolejność prac została ustalona w taki sposób, aby umożliwić stopniowe i logiczne budowanie aplikacji, zaczynając od fundamentalnych elementów, takich jak layout i uwierzytelnianie, a kończąc na najbardziej złożonym widoku, czyli kreatorze NPC.

---

## 1. Globalny Układ (Layout)

Podstawowa powłoka aplikacji, w której renderowane są wszystkie inne widoki. Definiuje stałe elementy interfejsu, takie jak nawigacja i stopka.

- **Powiązane historyjki użytkownika:**
  - `US-003: Utrzymanie i wylogowanie sesji` (częściowo: UI dla stanu zalogowania/wylogowania, przycisk wylogowania)
  - **Kryteria akceptacji:**
    - Sesja pozostaje aktywna przez 7 dni bez ponownego logowania.
    - Wylogowanie czyści sesję i przekierowuje na / lub ekran logowania.
    - Brak przerwania pracy w kreatorze podczas odświeżania sesji w tle.
  - `US-004: Rozpoczęcie pracy w kreatorze NPC` (częściowo: przycisk "Create NPC" w nawigacji)
    - **Kryteria akceptacji:**
      - Wyświetla się układ: parametry + podglądy (XML aktywny, Lua z default.lua).
      - Focus/Travel/Voice są nieaktywne; Shop i Keywords aktywne.
      - Przycisk Utwórz jest nieaktywny dopóki wymagane pola nie są kompletne.
- **Powiązane endpointy API:**
  - `GET /profiles/me`: Do pobrania danych zalogowanego użytkownika (np. nazwa, awatar) na potrzeby `Topbar`.
- **Pliki implementacji endpointów:**
  - `src/pages/api/profiles/me.ts`

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-L-01:`** Jako użytkownik chcę widzieć spójną nawigację na górze każdej strony, abym mógł łatwo przechodzić do strony głównej i listy NPC.
    - **Kryteria akceptacji:**
      - Główny pasek nawigacyjny (Topbar) jest widoczny na wszystkich stronach aplikacji.
      - W nawigacji znajduje się logo, które jest linkiem do strony głównej (`/`).
      - Nawigacja zawiera link do strony z listą NPC (`/npcs`).
  - **`US-L-02:`** Jako gość chcę widzieć przycisk "Sign In", abym mógł rozpocząć proces logowania z dowolnego miejsca w aplikacji.
    - **Kryteria akceptacji:**
      - Gdy użytkownik nie jest zalogowany, w nawigacji widoczny jest przycisk "Sign In".
      - Kliknięcie przycisku "Sign In" przekierowuje użytkownika na stronę `/login`.
      - Menu zalogowanego użytkownika (z awatarem) nie jest widoczne.
  - **`US-L-03:`** Jako zalogowany użytkownik chcę widzieć swój awatar w nawigacji, a po jego kliknięciu uzyskać dostęp do mojego profilu i opcji wylogowania.
    - **Kryteria akceptacji:**
      - Gdy użytkownik jest zalogowany, w nawigacji widoczny jest jego awatar.
      - Przycisk "Sign In" nie jest widoczny.
      - Kliknięcie na awatar otwiera menu rozwijane (dropdown).
      - Menu zawiera link do profilu użytkownika (`/profile/{userId}`), przycisk "Wyloguj", który kończy sesję oraz przełącznik trybu dark/light.
  - **`US-L-04:`** Jako użytkownik na urządzeniu mobilnym chcę, aby nawigacja była schowana w menu typu "hamburger", aby nie zajmowała cennego miejsca na ekranie.
    - **Kryteria akceptacji:**
      - Na ekranach o szerokości mniejszej niż 768px, główne linki nawigacyjne są zastąpione ikoną menu "hamburger".
      - Kliknięcie ikony otwiera menu (np. wysuwane z boku lub pełnoekranowe).
      - Menu mobilne zawiera te same opcje nawigacyjne, które są dostępne w wersji desktopowej.

---

## 2. Strona Logowania (Login)

Widok z formularzem umożliwiającym rozpoczęcie procesu uwierzytelniania przez "magic link".

- **Powiązane historyjki użytkownika:**
  - `US-001: Logowanie linkiem Magic Link`: "Jako użytkownik chcę otrzymać link logujący na e‑mail, aby zalogować się bez hasła."
    - **Kryteria akceptacji:**
      - Formularz przyjmuje e‑mail i wysyła Magic Link z TTL linku.
      - Po wysłaniu wyświetla się informacja o wysłaniu linku.
      - Błędny e‑mail lub błąd wysyłki prezentuje czytelny komunikat.
  - `US-020: Błąd/wygaśnięcie Magic Link`: "Jako użytkownik chcę zobaczyć jasny komunikat, gdy link jest nieważny lub wygasł."
    - **Kryteria akceptacji:**
      - Link po TTL linku zwraca błąd lub wygasł i proponuje wysłanie nowego.
      - Nie dochodzi do zalogowania ani utworzenia sesji.
      - Obsługa wielokrotnego kliknięcia linku nie powoduje błędów aplikacji.
- **Powiązane endpointy API:**
  - Brak (interakcja z biblioteką kliencką Supabase `supabase.auth.signInWithOtp`)
- **Pliki implementacji endpointów:**
  - N/A

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-A-01:`** Jako użytkownik chcę, aby pole do wpisania adresu e-mail było wyraźnie oznaczone i automatycznie aktywne po wejściu na stronę, abym mógł od razu zacząć pisać.
    - **Kryteria akceptacji:**
      - Strona `/login` wyświetla formularz z polem na e-mail i przyciskiem do wysyłki.
      - Pole na e-mail posiada czytelną etykietę.
      - Po załadowaniu strony, kursor automatycznie ustawia się w polu na e-mail.
  - **`US-A-02:`** Jako użytkownik, po wpisaniu niepoprawnego formatu e-mail, chcę zobaczyć komunikat błędu bezpośrednio pod polem, abym wiedział co poprawić.
    - **Kryteria akceptacji:**
      - Formularz waliduje format adresu e-mail po stronie klienta.
      - W przypadku wprowadzenia nieprawidłowego formatu, pod polem wyświetlany jest komunikat błędu (np. "Proszę podać poprawny adres e-mail").
      - Wysłanie formularza z błędnym adresem jest zablokowane.
  - **`US-A-03:`** Jako użytkownik, po poprawnym wysłaniu prośby o link, chcę zobaczyć na ekranie wyraźny komunikat informujący mnie, abym sprawdził swoją skrzynkę e-mail.
    - **Kryteria akceptacji:**
      - Po wysłaniu prawidłowego adresu e-mail, formularz logowania jest zastępowany komunikatem o sukcesie.
      - Komunikat jasno informuje, że link został wysłany i należy sprawdzić skrzynkę odbiorczą.
      - Komunikat zawiera sugestię sprawdzenia folderu spam.

---

## 3. Strona Zwrotna Uwierzytelniania (Auth Callback)

Widok przejściowy, który obsługuje token z "magic link", finalizuje proces logowania i tworzy sesję użytkownika.

- **Powiązane historyjki użytkownika:**
  - `US-002: Wejście przez Magic Link`: "Jako użytkownik chcę zalogować się po kliknięciu w Magic Link, aby uzyskać dostęp do kreatora i moich NPC."
    - **Kryteria akceptacji:**
      - Prawidłowy link loguje użytkownika i ustawia sesję.
      - Wygasły lub nieważny link zwraca błąd i proponuje ponowne wysłanie.
      - Po zalogowaniu następuje redirect na stronę główną (`/`).
  - `US-020: Błąd/wygaśnięcie Magic Link`: "Jako użytkownik chcę zobaczyć jasny komunikat, gdy link jest nieważny lub wygasł."
    - **Kryteria akceptacji:**
      - Link po TTL linku zwraca błąd lub wygasł i proponuje wysłanie nowego.
      - Nie dochodzi do zalogowania ani utworzenia sesji.
      - Obsługa wielokrotnego kliknięcia linku nie powoduje błędów aplikacji.
- **Powiązane endpointy API:**
  - Brak (interakcja z biblioteką kliencką Supabase w celu weryfikacji sesji)
- **Pliki implementacji endpointów:**
  - N/A

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-A-04:`** Jako użytkownik, po kliknięciu w magic link, chcę widzieć wskaźnik ładowania, abym wiedział, że system przetwarza moje logowanie.
    - **Kryteria akceptacji:**
      - Po wejściu na stronę `/auth/callback` natychmiast wyświetlany jest wskaźnik ładowania (np. spinner).
      - W trakcie weryfikacji sesji żadna inna treść nie jest widoczna.
  - **`US-A-05:`** Jako użytkownik, w przypadku problemu z linkiem (np. wygasł), chcę zobaczyć czytelny komunikat o błędzie oraz link, który pozwoli mi wrócić do strony logowania i spróbować ponownie.
    - **Kryteria akceptacji:**
      - Jeśli token uwierzytelniający jest nieprawidłowy lub wygasł, wskaźnik ładowania jest zastępowany komunikatem błędu.
      - Komunikat jasno wyjaśnia problem (np. "Link logowania wygasł lub jest nieprawidłowy.").
      - Na stronie widoczny jest przycisk lub link umożliwiający powrót do strony logowania (`/login`).
  - **`US-A-06:`** Jako użytkownik, po pomyślnym zalogowaniu, chcę być automatycznie przeniesiony na stronę główną aplikacji, abym mógł kontynuować pracę.
    - **Kryteria akceptacji:**
      - Po pomyślnej weryfikacji sesji, użytkownik jest automatycznie przekierowywany ze strony `/auth/callback` na stronę główną (`/`).

---

## 4. Strona Główna (Home)

Strona powitalna aplikacji, prezentująca wyróżnione, ostatnio opublikowane NPC.

- **Powiązane historyjki użytkownika:**
  - `US-009: HOME – lista Featured 10`
- **Powiązane endpointy API:**
  - `GET /npcs/featured`: Pobranie listy wyróżnionych NPC.
- **Pliki implementacji endpointów:**
  - `src/pages/api/npcs/featured.ts`

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-H-01:`** Jako gość, chcę zobaczyć na stronie głównej panel informacyjny i kilka wyróżnionych NPC, aby szybko zrozumieć czym jest aplikacja.
    - **Kryteria akceptacji:**
      - Dla niezalogowanego użytkownika strona główna wyświetla duży panel informacyjny (nagłówek z tytułem "Featured NPC's", opisem i przyciskiem "Explore all NPCs").
      - Układ siatki jest dostosowany tak, że panel zajmuje przestrzeń dwóch standardowych kart NPC.
      - Łącznie na stronie wyświetlanych jest 6 kart NPC.
  - **`US-H-02:`** Jako zalogowany użytkownik, chcę widzieć na stronie głównej pełną siatkę najnowszych NPC, aby być na bieżąco z nowościami w społeczności.
    - **Kryteria akceptacji:**
      - Dla zalogowanego użytkownika panel informacyjny nie jest wyświetlany.
      - Strona główna wyświetla siatkę 8 kart NPC.
      - Nad siatką widoczny jest tytuł sekcji "Featured NPC's" z ikoną "info" (tooltip z opisem sekcji "Featured NPC's") a po prawej stronie przycisk "Explore all NPCs".
  - **`US-H-03:`** Jako użytkownik, chcę móc kliknąć na dowolną kartę NPC, aby przejść do widoku jego szczegółów.
    - **Kryteria akceptacji:**
      - Każda karta NPC w siatce jest elementem klikalnym.
      - Kliknięcie w kartę przenosi użytkownika na stronę szczegółów danego NPC (`/npcs/{npcId}`).
  - **`US-H-04:`** Jako gość lub zalogowany użytkownik, chcę widzieć przycisk "Explore all NPCs", który przeniesie mnie do pełnej, paginowanej listy.
    - **Kryteria akceptacji:**
      - Na stronie głównej widoczny jest przycisk lub link z tekstem "Explore all NPCs".
      - Przycisk jest widoczny w panelu informacyjnym (jak dla gościa)
      - Przycisk jest widoczny w nagłówku siatki NPC (jak dla zalogowanego użytkownika)
      - Kliknięcie go przenosi użytkownika na stronę `/npcs`.

---

## 5. Lista NPC (NPCs)

Publiczna lista wszystkich opublikowanych NPC z możliwością paginacji (infinite scroll), sortowania i filtrowania.

- **Powiązane historyjki użytkownika:**
  - `US-010: /npcs – przeglądanie z infinite scroll`
- **Powiązane endpointy API:**
  - `GET /npcs`: Pobranie publicznej, paginowanej listy NPC.
- **Pliki implementacji endpointów:**
  - `src/pages/api/npcs/index.ts`

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-N-01:`** Jako użytkownik, chcę móc sortować listę NPC po dacie dodania (od najnowszych i od najstarszych), aby znaleźć te, które mnie interesują.
    - **Kryteria akceptacji:**
      - Na stronie `/npcs` dostępne jest menu rozwijane "Sortuj".
      - Menu zawiera opcje "Newest" (Najnowsze) i "Oldest" (Najstarsze).
      - Wybór opcji powoduje ponowne pobranie i wyświetlenie listy NPC w wybranej kolejności.
  - **`US-N-02:`** Jako użytkownik, chcę móc filtrować listę, klikając na tagi "Shop" lub "Keywords", aby zobaczyć tylko NPC posiadające te moduły.
    - **Kryteria akceptacji:**
      - Nad siatką NPC widoczne są tagi filtrów: "All", "Shop", "Keywords" oraz inne, które są widoczne ale nieaktywne (disabled) np. "XML", "Focus", "Travel", "Voice".
      - Kliknięcie taga (np. "Shop") powoduje odświeżenie listy i pokazanie tylko NPC z włączonym danym modułem.
      - Wyłączenie tagu (tylko 1 tag może być jednocześnie aktywny) pokazuje wszystkie NPC bez filtru.
  - **`US-N-03:`** Jako użytkownik, po przewinięciu listy na sam dół, chcę, aby automatycznie doładowały się kolejne NPC, abym mógł kontynuować przeglądanie bez przechodzenia na kolejne strony.
    - **Kryteria akceptacji:**
      - Gdy użytkownik scrolluje w pobliże końca listy, wysyłane jest żądanie do API o kolejną partię danych (z użyciem kursora).
      - Na dole listy, podczas ładowania, wyświetlany jest wskaźnik (spinner).
      - Nowo pobrane NPC są dodawane na końcu istniejącej listy.
  - **`US-N-04:`** Jako właściciel NPC, przeglądając listę, chcę widzieć na kartach moich NPC menu z akcjami (Edytuj, Usuń), aby mieć do nich szybki dostęp.
    - **Kryteria akceptacji:**
      - Zalogowany użytkownik widzi menu kontekstowe (ikona 3 kropki) na kartach NPC, których jest właścicielem.
      - Menu zawiera opcje "Edytuj" i "Usuń".
      - Karty NPC należące do innych użytkowników nie posiadają tego menu.

---

## 6. Szczegóły NPC (NPC Detail)

Publiczny widok szczegółowych informacji o pojedynczym NPC, zawierający jego metadane oraz podgląd kodu XML i Lua.

- **Powiązane historyjki użytkownika:**
  - `US-011: Strona szczegółów NPC (publiczna)`
  - `US-007: Publikacja NPC` (częściowo: zawiera przycisk "Publikuj" dla właściciela)
  - `US-008: Soft delete NPC` (częściowo: zawiera przycisk "Usuń" dla właściciela)
  - `US-018: Kopiowanie XML i default.lua do schowka`
- **Powiązane endpointy API:**
  - `GET /npcs/{npcId}`: Pobranie pełnych danych konkretnego NPC.
  - `POST /npcs/{npcId}/publish`: Publikacja NPC (akcja wywoływana z tego widoku).
  - `DELETE /npcs/{npcId}`: Usunięcie NPC (akcja wywoływana z tego widoku).
- **Pliki implementacji endpointów:**
  - `src/pages/api/npcs/[npcId].ts`
  - `src/pages/api/npcs/[npcId]/publish.ts`

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-D-01:`** Jako użytkownik, chcę widzieć w czytelny sposób wszystkie kluczowe metadane NPC, takie jak jego nazwa, autor i status (roboczy/opublikowany).
    - **Kryteria akceptacji:**
      - Na stronie w widocznym miejscu wyświetlana jest nazwa NPC.
      - Widoczna jest nazwa autora NPC.
      - Status NPC ("Draft" lub "Published") jest jasno oznaczony.
  - **`US-D-02:`** Jako użytkownik, chcę mieć możliwość przełączania się między podglądem kodu XML i Lua za pomocą zakładek.
    - **Kryteria akceptacji:**
      - Podgląd kodu jest zaimplementowany jako komponent z zakładkami.
      - Dostępne są dwie zakładki: "XML" i "Lua".
      - Kliknięcie w zakładkę zmienia wyświetlaną treść kodu.
  - **`US-D-03:`** Jako właściciel, chcę mieć dostęp do przycisku "Edytuj", który przeniesie mnie prosto do kreatora z załadowanymi danymi tego NPC.
    - **Kryteria akceptacji:**
      - Jeśli zalogowany użytkownik jest właścicielem NPC, widoczne jest menu akcji.
      - Menu zawiera opcję "Edytuj".
      - Kliknięcie "Edytuj" przekierowuje na stronę `/creator/{npcId}`.
  - **`US-D-04:`** Jako właściciel wersji roboczej, chcę móc użyć akcji "Publikuj", a w przypadku błędów walidacji otrzymać jasny komunikat, co muszę poprawić.
    - **Kryteria akceptacji:**
      - Dla NPC ze statusem "Draft", menu akcji właściciela zawiera opcję "Publikuj".
      - Kliknięcie "Publikuj" wysyła żądanie do API.
      - W przypadku błędu walidacji po stronie serwera, użytkownik otrzymuje czytelny komunikat o przyczynie (np. za pomocą toast notification).
  - **`US-D-05:`** Jako właściciel, chcę, aby próba usunięcia NPC wymagała ode mnie potwierdzenia w oknie dialogowym, abym uniknął przypadkowego skasowania pracy.
    - **Kryteria akceptacji:**
      - Kliknięcie opcji "Usuń" w menu akcji otwiera modalne okno dialogowe.
      - Dialog zawiera ostrzeżenie i wymaga od użytkownika ostatecznego potwierdzenia chęci usunięcia.
      - Dialog zawiera opcjonalne pole na wpisanie powodu usunięcia (textarea).
      - Pole powodu usunięcia jest opcjonalne i posiada walidację na długość znaków.
      - Dialog zawiera przycisk "Anuluj" i "Usuń".
      - Dopiero po potwierdzeniu w dialogu wysyłane jest żądanie usunięcia do API.

---

## 7. Profil Użytkownika (User Profile)

Prywatny widok dla zalogowanego użytkownika, prezentujący jego dane oraz listy stworzonych przez niego NPC.

- **Powiązane historyjki użytkownika:**
  - **`Nowa US-025: Przeglądanie profilu użytkownika`**: "Jako zalogowany użytkownik, chcę mieć stronę profilu, gdzie mogę zobaczyć swoje dane oraz listy moich NPC w wersjach roboczych i opublikowanych, aby móc zarządzać swoimi pracami."
- **Powiązane endpointy API:**
  - `GET /profiles/me`: Pobranie danych profilowych użytkownika.
  - `GET /npcs?visibility=mine&status=draft`: Pobranie listy NPC roboczych należących do użytkownika.
  - `GET /npcs?visibility=mine&status=published`: Pobranie listy NPC opublikowanych przez użytkownika.
- **Pliki implementacji endpointów:**
  - `src/pages/api/profiles/me.ts`
  - `src/pages/api/npcs/index.ts`

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-P-01:`** Jako zalogowany użytkownik, chcę widzieć w panelu bocznym swoje podstawowe dane: awatar, nazwę i datę dołączenia.
    - **Kryteria akceptacji:**
      - Strona profilu wyświetla panel z awatarem, nazwą wyświetlaną oraz datą rejestracji użytkownika.
      - Dane są zgodne z danymi zalogowanego użytkownika.
  - **`US-P-02:`** Jako użytkownik, chcę mieć możliwość przełączania się za pomocą zakładek między listą moich NPC w wersji roboczej a tymi już opublikowanymi.
    - **Kryteria akceptacji:**
      - Najpierw muszę wybrać kategorię "NPCs" z paska pod nawigacją (obok nazwy kategorii jest liczba elementów w kategorii - w tym wypadku liczba wszystkich utworzonych przez użytkownika NPC's).
      - Na stronie profilu w obszarze zawartości dla widoku NPCs, znajduje się komponent z zakładkami "Wersje robocze" ("Drafts") i "Opublikowane" ("Published").
      - Kliknięcie zakładki filtruje listę i wyświetla tylko NPC o odpowiednim statusie.
      - Obok nazwy każdej zakładki wyświetlana jest liczba posiadanych NPC w danym statusie.
  - **`US-P-03:`** Jako nowy użytkownik, który nie stworzył jeszcze żadnego NPC, chcę zobaczyć na swoim profilu powitalny komunikat z przyciskiem zachęcającym do stworzenia pierwszego NPC.
    - **Kryteria akceptacji:**
      - Jeśli użytkownik nie ma żadnych NPC (ani roboczych, ani opublikowanych), zamiast listy wyświetlany jest specjalny komponent "Empty State".
      - Komponent zawiera powitalną wiadomość oraz wyraźny przycisk "Stwórz swojego pierwszego NPC", który prowadzi do kreatora.
  - **`US-P-04:`** Jako użytkownik, chcę, aby lista moich NPC na profilu obsługiwała "infinite scroll", tak samo jak publiczna lista.
    - **Kryteria akceptacji:**
      - Listy NPC w obu zakładkach ("Wersje robocze" i "Opublikowane") ładują kolejne elementy po przewinięciu na dół.
      - Mechanizm działa analogicznie do publicznej listy na stronie `/npcs`.

---

## 8. Kreator NPC (NPC Creator)

Najbardziej złożony widok aplikacji, służący do tworzenia i edycji NPC, zarządzania modułami (Shop, Keywords) oraz zlecania generowania XML.

- **Powiązane historyjki użytkownika:**
  - `US-004: Rozpoczęcie pracy w kreatorze NPC`
  - `US-005: Utworzenie NPC i generacja XML`
  - `US-006: Edycja istniejącego NPC (AI poprawka XML)`
  - `US-012: Moduły w kreatorze (Shop i Keywords aktywne)`
  - `US-013: Shop – dodawanie pozycji buy/sell`
  - `US-014: Shop – tryb interfejsu i komunikaty`
  - `US-015: Walidacja pól i limit rozmiaru treści`
  - `US-016: Keywords – dodawanie/edycja/usuwanie wpisów`
  - `US-017: Keywords – walidacja i limity`
  - `US-021: Błąd generacji AI`
  - `US-022: Idempotentne tworzenie NPC`
  - `US-023: Limit pozycji w Shop`
- **Powiązane endpointy API:**
  - `POST /npcs`: Utworzenie wstępnego rekordu NPC (wersji roboczej).
  - `PATCH /npcs/{npcId}`: Zapisanie zmian w parametrach istniejącego NPC.
  - `PUT /npcs/{npcId}/shop-items`: hurtowe zastąpienie przedmiotów w sklepie.
  - `PUT /npcs/{npcId}/keywords`: hurtowe zastąpienie słów kluczowych.
  - `POST /npcs/{npcId}/generate`: Zlecenie asynchronicznego zadania generowania XML.
  - `GET /npcs/{npcId}/generation-jobs/{jobId}`: Sprawdzenie statusu zadania generowania.
  - `GET /npcs/{npcId}`: Pobranie danych istniejącego NPC w celu edycji.
- **Pliki implementacji endpointów:**
  - `src/pages/api/npcs/index.ts`
  - `src/pages/api/npcs/[npcId].ts`
  - `src/pages/api/npcs/[npcId]/shop-items.ts`
  - `src/pages/api/npcs/[npcId]/keywords.ts`
  - `src/pages/api/npcs/[npcId]/generate.ts`
  - `src/pages/api/npcs/[npcId]/generation-jobs/[jobId].ts`

- **Nowe, szczegółowe historyjki użytkownika:**
  - **`US-C-01:`** Jako użytkownik tworzący nowego NPC, chcę, aby przycisk akcji na dole ekranu najpierw pozwalał mi tylko "Zapisać wersję roboczą".
    - **Kryteria akceptacji:**
      - Przy wchodzeniu na stronę `/creator` (dla nowego NPC), w dolnym pasku akcji widoczny jest przycisk "Zapisz wersję roboczą".
      - Przycisk jest początkowo nieaktywny i staje się aktywny po wypełnieniu wymaganych pól formularza.
  - **`US-C-02:`** Jako użytkownik, po zapisaniu wersji roboczej, chcę, aby przycisk akcji zmienił się na "Generuj XML", jasno wskazując kolejny krok.
    - **Kryteria akceptacji:**
      - Po pomyślnym zapisaniu wersji roboczej (odpowiedź z API), przycisk "Zapisz wersję roboczą" jest zastępowany przez przycisk "Generuj XML".
      - Następuje przekierowanie na URL `/creator/{npcId}`.
  - **`US-C-03:`** Jako użytkownik edytujący istniejącego NPC, po dokonaniu zmiany w formularzu, chcę widzieć aktywny przycisk "Zapisz zmiany" i nieaktywny "Generuj ponownie XML", aby system wymusił na mnie zapis przed ponowną generacją.
    - **Kryteria akceptacji:**
      - Przy edycji (`/creator/{npcId}`), po wykryciu zmiany w formularzu, przycisk "Generuj ponownie XML" staje się nieaktywny.
      - Pojawia się nowy, aktywny przycisk "Zapisz zmiany".
      - Po pomyślnym zapisaniu zmian, przycisk "Zapisz zmiany" znika, a "Generuj ponownie XML" znów staje się aktywny.
  - **`US-C-04:`** Jako użytkownik, w trakcie generowania XML, chcę widzieć zablokowany formularz oraz wskaźnik ładowania w panelu podglądu, abym wiedział, że operacja jest w toku.
    - **Kryteria akceptacji:**
      - Po kliknięciu "Generuj XML", wszystkie pola formularza w panelu bocznym stają się nieedytowalne (disabled).
      - W panelu podglądu XML, zamiast treści, wyświetlany jest wskaźnik ładowania.
      - Po zakończeniu operacji (sukces lub błąd), formularz jest odblokowywany.
  - **`US-C-05:`** Jako użytkownik, chcę móc dynamicznie dodawać i usuwać przedmioty w listach "buy" i "sell" w module Sklepu.
    - **Kryteria akceptacji:**
      - W sekcji modułu "Shop" znajdują się przyciski "Dodaj przedmiot" dla obu list.
      - Każdy dodany przedmiot na liście ma przycisk "Usuń", który go usuwa.
      - Interfejs pozwala na edycję pól każdego dodanego przedmiotu.
      - W ramach jednej pozycji buy/sell wyróżnia się następujące pola:
        - `name` - nazwa przedmiotu
        - `item_id` - ID przedmiotu
        - `price` - cena przedmiotu
        - `subtype` - opcjonalne pole na subtype przedmiotu
        - `charges` - opcjonalne pole na ilość przedmiotu
        - `real_name` - opcjonalne pole na nazwę pojemnika (np. "Backpack", "Pouch", "Sack")
        - `container_item_id` - opcjonalne pole na ID pojemnika
  - **`US-C-06:`** Jako użytkownik, chcę móc dodać do jednego słowa kluczowego wiele różnych fraz, które będą na nie reagować.
    - **Kryteria akceptacji:**
      - W interfejsie modułu "Keywords" można dodać nowy wpis (odpowiedź + frazy).
      - Dla każdego wpisu istnieje możliwość dodania wielu pól na frazy.
      - Każdą frazę można usunąć.
  - **`US-C-07:`** Jako użytkownik, próbując opuścić kreator z niezapisanymi zmianami, chcę zobaczyć ostrzeżenie przeglądarki, aby uniknąć przypadkowej utraty danych.
    - **Kryteria akceptacji:**
      - Aplikacja śledzi stan "zabrudzenia" formularza (czy wprowadzono zmiany od ostatniego zapisu).
      - Jeśli formularz jest "brudny", próba zamknięcia karty/przeglądarki lub nawigacji w inne miejsce aplikacji wywołuje natywne okno dialogowe przeglądarki z ostrzeżeniem.
      - Po zapisaniu zmian, ostrzeżenie nie jest już pokazywane.
