# Plan implementacji widoku: Strona Zwrotna Uwierzytelniania (Auth Callback)

## 1. Przegląd

Widok `/auth/callback` jest stroną przejściową, której jedynym celem jest obsługa przekierowania powrotnego z procesu uwierzytelniania Supabase (Magic Link). Strona ta jest niewidoczna dla użytkownika przez dłuższy czas – jej zadaniem jest sfinalizowanie sesji w tle. Wyświetla wskaźnik ładowania, obsługuje wynik uwierzytelniania, a następnie przekierowuje użytkownika na stronę główną w przypadku sukcesu lub wyświetla komunikat błędu z opcją powrotu do logowania w przypadku porażki.

## 2. Kontekst implementacji w layoucie

**Kluczowe wymaganie:** Cała zawartość widoku `/auth/callback` musi być renderowana wewnątrz głównego layoutu aplikacji (`src/layouts/Layout.astro`). Oznacza to, że wskaźnik ładowania oraz ewentualne komunikaty o błędach muszą pojawić się w głównym obszarze treści strony, z zachowaniem widoczności globalnego nagłówka i stopki aplikacji. Implementacja musi być spójna z innymi stronami, takimi jak strona główna.

## 3. Routing widoku

- **Ścieżka:** `/auth/callback`
- **Dostępność:** Publiczna.

## 4. Struktura komponentów

Widok będzie renderowany przez stronę Astro, która załaduje pojedynczy komponent React odpowiedzialny za całą logikę.

```
/src/pages/
└── auth/
    └── callback.astro
/src/components/
└── pages/
    └── auth/
        ├── AuthCallback.tsx
        └── AuthCallbackError.tsx
```

**Drzewo komponentów:**

```
Layout.astro
└── callback.astro
    └── AuthCallback.tsx (client:load)
        ├── Spinner.tsx (stan ładowania)
        └── AuthCallbackError.tsx (stan błędu)
            └── Button.tsx
```

## 5. Szczegóły komponentów

### `callback.astro`

- **Opis komponentu:** Strona Astro, która stanowi punkt wejścia dla ścieżki `/auth/callback`. Jej jedynym zadaniem jest renderowanie globalnego layoutu (`Layout.astro`) oraz umieszczenie w jego slocie komponentu `AuthCallback.tsx` w trybie `client:load`, aby zapewnić natychmiastowe wykonanie logiki po stronie klienta.
- **Główne elementy:**
  - `<Layout>`
  - `<AuthCallback client:load />`
- **Propsy:** Brak.

### `AuthCallback.tsx`

- **Opis komponentu:** Główny komponent React, który zarządza stanem procesu uwierzytelniania. Domyślnie wyświetla wskaźnik ładowania. Nasłuchuje na zmiany stanu uwierzytelnienia z Supabase, aby obsłużyć sukces (przekierowanie) lub błąd (wyświetlenie komunikatu). **Jego zawartość (spinner lub błąd) powinna być wyśrodkowana w pionie i poziomie wewnątrz kontenera, w którym jest renderowana (główny obszar layoutu).**
- **Główne elementy:**
  - Logika warunkowa renderująca `Spinner` lub `AuthCallbackError`.
  - `useEffect` do obsługi logiki po stronie klienta.
- **Obsługiwane interakcje:** Komponent nie obsługuje bezpośrednich interakcji użytkownika. Jego działanie jest w pełni automatyczne i oparte na stanie uwierzytelnienia.
- **Obsługiwana walidacja:** Pośrednio waliduje token autoryzacyjny z URL poprzez interakcję z Supabase SDK.
- **Typy:** `AuthState`, `AuthErrorViewModel`.
- **Propsy:** Brak.

### `AuthCallbackError.tsx`

- **Opis komponentu:** Komponent dedykowany do wyświetlania informacji o błędzie, gdy proces logowania się nie powiedzie. Prezentuje użytkownikowi czytelny komunikat i umożliwia powrót do strony logowania.
- **Główne elementy:**
  - Kontener `div` z wyśrodkowaną treścią.
  - Elementy tekstowe na tytuł i treść błędu.
  - Komponent `<Button>` z `shadcn/ui` jako przycisk akcji.
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku "Wróć do logowania" nawiguje użytkownika do `/login`.
- **Typy:** Brak.
- **Propsy:**
  ```typescript
  interface AuthCallbackErrorProps {
    title: string;
    message: string;
    actionLabel: string;
    actionHref: string;
  }
  ```

## 6. Typy

Wprowadzimy lokalne typy dla komponentu `AuthCallback.tsx` w celu zarządzania jego stanem wewnętrznym.

```typescript
// Typ określający możliwy stan widoku
type AuthState = "loading" | "success" | "error";

// ViewModel dla danych o błędzie do wyświetlenia
interface AuthErrorViewModel {
  title: string;
  message: string;
}
```

## 7. Zarządzanie stanem

Cała logika stanu zostanie zamknięta w klienckim komponencie `AuthCallback.tsx` przy użyciu hooków `useState` i `useEffect`. Rozważone zostanie stworzenie customowego hooka `useAuthCallback` w celu separacji logiki od prezentacji.

- **`useAuthCallback.ts`**
  - **Cel:** Abstrahuje logikę interakcji z Supabase Auth i zarządza stanem `loading`/`success`/`error`.
  - **Stan wewnętrzny:**
    - `status: AuthState` - przechowuje aktualny stan procesu (domyślnie `'loading'`).
    - `error: AuthErrorViewModel | null` - przechowuje szczegóły błędu.
  - **Logika:**
    - W `useEffect` hook, subskrybuje do `supabase.auth.onAuthStateChange`.
    - Po otrzymaniu zdarzenia `SIGNED_IN`, zmienia status na `'success'` i inicjuje przekierowanie.
    - W przypadku wykrycia błędu (np. z parametrów URL lub braku sesji po określonym czasie), zmienia status na `'error'` i ustawia odpowiedni komunikat.
    - Implementuje mechanizm timeout (np. 10 sekund), po którym, jeśli status nadal jest `'loading'`, przechodzi w stan błędu (np. problem z siecią).
  - **Zwracane wartości:** `{ status: AuthState; error: AuthErrorViewModel | null; }`

## 8. Integracja API

Integracja nie opiera się na tradycyjnym wywołaniu API (fetch), lecz na wykorzystaniu Supabase JS SDK.

- **Mechanizm:** Komponent `AuthCallback.tsx` (poprzez hook `useAuthCallback`) będzie nasłuchiwał na zdarzenia z `supabase.auth.onAuthStateChange`.
- **Przepływ:**
  1. Użytkownik ląduje na `/auth/callback` z tokenem w hashu URL (`#access_token=...`).
  2. Supabase SDK automatycznie odczytuje ten token.
  3. SDK komunikuje się z serwerami Supabase w celu weryfikacji tokenu.
  4. Po pomyślnej weryfikacji, SDK emituje zdarzenie `SIGNED_IN` wraz z obiektem sesji.
  5. W przypadku niepowodzenia (np. token wygasł), Supabase może przekierować z powrotem z parametrami błędu w URL, lub `onAuthStateChange` nie zwróci sesji. Nasz hook musi obsłużyć oba te scenariusze.
- **Typy:** Obiekt `session` pochodzi z typów `@supabase/supabase-js`.

## 9. Interakcje użytkownika

Jedyną interakcją jest pasywne oczekiwanie użytkownika. W przypadku błędu, użytkownik ma możliwość kliknięcia przycisku w celu powrotu do strony logowania.

- **Oczekiwanie na weryfikację:** Użytkownik widzi animowany wskaźnik ładowania.
- **Błąd weryfikacji:** Użytkownik widzi ekran błędu z przyciskiem "Wróć do logowania". Kliknięcie przenosi go na stronę `/login`.
- **Pomyślna weryfikacja:** Użytkownik jest automatycznie przekierowany na stronę główną (`/`).

## 10. Warunki i walidacja

Walidacja jest przeprowadzana przez Supabase. Frontend reaguje jedynie na jej wynik.

- **Warunek 1: Token jest prawidłowy.**
  - **Weryfikacja:** `onAuthStateChange` zwraca `event: 'SIGNED_IN'` i ważny obiekt `session`.
  - **Wynik:** Przekierowanie na `/`.
- **Warunek 2: Token jest nieprawidłowy lub wygasł.**
  - **Weryfikacja:** Supabase zwraca błąd w parametrach URL (`error_description`) lub `onAuthStateChange` nie zwraca sesji w oczekiwanym czasie.
  - **Wynik:** Wyświetlenie komponentu `AuthCallbackError` z odpowiednim komunikatem.
- **Warunek 3: Brak połączenia z siecią.**
  - **Weryfikacja:** Timeout w `useAuthCallback` zostaje osiągnięty, a status wciąż jest `'loading'`.
  - **Wynik:** Wyświetlenie komponentu `AuthCallbackError` z komunikatem o problemie z połączeniem.

## 11. Obsługa błędów

- **Wygasły/Nieprawidłowy link:** Wyświetlany jest komunikat: "Link logowania wygasł lub jest nieprawidłowy." wraz z przyciskiem powrotu do `/login`.
- **Problem z siecią:** Wyświetlany jest komunikat: "Wystąpił problem z połączeniem. Sprawdź swoją sieć i spróbuj ponownie." wraz z przyciskiem powrotu do `/login`.
- **Inne błędy Supabase:** Generyczny komunikat błędu: "Wystąpił nieoczekiwany błąd podczas logowania. Spróbuj ponownie." wraz z przyciskiem powrotu do `/login`.

## 12. Kroki implementacji

1.  **Utworzenie struktury plików:**
    - Stworzyć plik `/src/pages/auth/callback.astro`.
    - Stworzyć plik `/src/components/pages/auth/AuthCallback.tsx`.
    - Stworzyć plik `/src/components/pages/auth/AuthCallbackError.tsx`.

2.  **Implementacja `callback.astro`:**
    - Dodać kod strony, który zapewni integrację z głównym layoutem aplikacji. Poniższy kod stanowi gotowy szablon:

      ```astro
      ---
      import Layout from "../../../layouts/Layout.astro";
      import AuthCallback from "../../../components/pages/auth/AuthCallback.tsx";
      ---

      <Layout title="Authenticating... | Jiddo NPC Generator">
        <AuthCallback client:load />
      </Layout>
      ```

3.  **Implementacja komponentu `AuthCallbackError.tsx`:**
    - Zaimplementować statyczny komponent przyjmujący propsy `title`, `message`, `actionLabel`, `actionHref`.
    - Użyć komponentów z `shadcn/ui` (`Card`, `Button`) i stylów Tailwind do jego ostylowania.

4.  **Implementacja logiki w `useAuthCallback.ts` (opcjonalnie, ale zalecane):**
    - Stworzyć hook, który zarządza stanami (`loading`, `success`, `error`).
    - Dodać `useEffect` do subskrypcji `onAuthStateChange`.
    - Zaimplementować logikę zmiany stanu w zależności od odpowiedzi z Supabase.
    - Dodać mechanizm timeoutu na wypadek problemów z siecią.

5.  **Implementacja komponentu `AuthCallback.tsx`:**
    - Użyć hooka `useAuthCallback` do pobrania aktualnego stanu (`status`, `error`).
    - Zaimplementować logikę renderowania warunkowego:
      - Jeśli `status === 'loading'`, renderuj `Spinner` wyśrodkowany na ekranie.
      - Jeśli `status === 'error'`, renderuj `AuthCallbackError`, przekazując odpowiednie komunikaty z obiektu `error`.
    - W `useEffect` nasłuchiwać na zmianę `status` na `'success'` i wykonać przekierowanie (`window.location.href = '/'`).

6.  **Testowanie:**
    - Przetestować ścieżkę sukcesu przez wygenerowanie i kliknięcie prawidłowego magic linka.
    - Przetestować ścieżkę błędu przez próbę użycia wygasłego linka.
    - Przetestować obsługę błędów sieciowych (np. przez zablokowanie dostępu do Supabase w narzędziach deweloperskich).
