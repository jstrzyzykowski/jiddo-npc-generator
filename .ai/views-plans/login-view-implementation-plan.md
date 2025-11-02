# Plan implementacji widoku Logowania (`/login`)

## 1. Przegląd

Widok logowania umożliwia użytkownikom uwierzytelnienie w aplikacji za pomocą metody "magic link" dostarczanej przez Supabase. Użytkownik podaje swój adres e-mail, na który wysyłany jest jednorazowy link logujący. Strona składa się z formularza do wprowadzenia adresu e-mail oraz komunikatu potwierdzającego wysłanie linku, który zastępuje pole e-mail i przycisk wysyłania formularza po pomyślnej akcji.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką:

- **Ścieżka:** `/login`
- **Plik:** `src/pages/login.astro`

Strona ta będzie renderować komponent React (`LoginPage.tsx`) w trybie `client:load`. Dodatkowo, użytkownicy, którzy są już zalogowani, będą automatycznie przekierowywani na stronę główną (`/`) za pomocą logiki w middleware.

## 3. Struktura komponentów

Hierarchia komponentów dla widoku logowania będzie następująca:

```
/src/pages/login.astro
└── /src/components/pages/login/LoginPage.tsx
    └── /src/components/pages/login/MagicLinkForm.tsx
        ├── Card (Shadcn)
        ├── Form (react-hook-form / Shadcn)
        └── CardContent (renderowanie warunkowe)
            ├── (stan początkowy)
            │   ├── Input (Shadcn)
            │   └── Button (Shadcn)
            └── (stan po wysłaniu)
                └── Alert (Shadcn) z komunikatem sukcesu
```

## 4. Szczegóły komponentów

### `LoginPage.tsx`

- **Opis komponentu:** Główny komponent-kontener dla widoku logowania. Jego jedynym zadaniem jest renderowanie formularza.
- **Główne elementy:** Renderuje komponent `MagicLinkForm`.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** Brak.

### `MagicLinkForm.tsx`

- **Opis komponentu:** Formularz umożliwiający użytkownikowi wprowadzenie adresu e-mail i zażądanie linku logowania. Komponent zarządza swoim wewnętrznym stanem, aby po pomyślnym wysłaniu zapytania, zastąpić pola formularza komunikatem sukcesu.
- **Główne elementy:**
  - `Card` z `CardHeader` (tytuł "Sign Up or Log In"), `CardContent` i `CardFooter`.
  - `Form` z `react-hook-form` i komponentami `FormField`, `FormItem`, `FormControl`, `FormMessage` z Shadcn.
  - Renderowanie warunkowe wewnątrz `CardContent`:
    - **Stan początkowy:** `Input` dla pola e-mail z `autoFocus` oraz `Button` z tekstem "Send magic link".
    - **Stan ładowania (po kliknięciu):** Przycisk jest nieaktywny, wyświetla spinner i tekst "Sending...".
    - **Stan po wysłaniu:** Komponent `Alert` z Shadcn zawierający ikonę (`Mail`), tytuł "Check your email for a special login link" i opis "Be sure to check your spam...".
- **Obsługiwane interakcje:**
  - Wprowadzanie tekstu w polu e-mail.
  - Kliknięcie przycisku wysyłania formularza.
- **Obsługiwana walidacja:**
  - Pole e-mail nie może być puste.
  - Wartość w polu e-mail musi być poprawnym formatem adresu e-mail.
- **Typy:** `MagicFormViewModel`
- **Propsy:** Brak.

## 5. Typy

Do obsługi formularza logowania zdefiniowany zostanie schemat walidacji Zod oraz odpowiadający mu typ ViewModel.

```typescript
// src/lib/validators/authValidators.ts
import { z } from "zod";

export const MagicLinkFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email address is required." })
    .email({ message: "Please enter a valid email address." }),
});

export type MagicFormViewModel = z.infer<typeof MagicLinkFormSchema>;
```

## 6. Zarządzanie stanem

- **Stan lokalny (`LoginPage.tsx`):** Brak. Komponent jest bezstanowy.
- **Stan formularza i widoku (`MagicLinkForm.tsx`):**
  - `isSubmitted (boolean)`: Lokalny stan (`useState`) komponentu, który kontroluje, czy wyświetlać pola formularza, czy komunikat o sukcesie. Domyślnie `false`.
  - Stan formularza (`email`, `errors`, `isSubmitting`) jest zarządzany przez `react-hook-form`.

Niestandardowy hook (np. `useMagicLink`) nie jest wymagany w MVP, logika API może być zawarta bezpośrednio w komponencie formularza.

## 7. Integracja API

Integracja z API odbywa się poprzez klienta Supabase po stronie klienta. Nie jest wymagany dedykowany endpoint backendowy.

- **Akcja:** Wysłanie magicznego linku.
- **Metoda Supabase:** `supabase.auth.signInWithOtp()`
- **Parametry żądania:**
  ```typescript
  {
    email: string; // Adres e-mail użytkownika
    options: {
      // URL, na który użytkownik zostanie przekierowany po kliknięciu linku
      emailRedirectTo: string; // np. `${window.location.origin}/auth/callback`
    }
  }
  ```
- **Odpowiedź (sukces):** Obiekt zawierający `data` (zwykle `user: null`, `session: null` w tym przypadku) i `error: null`. Pomyślne wykonanie funkcji oznacza, że e-mail został wysłany.
- **Odpowiedź (błąd):** Obiekt zawierający `data: null` i `error`, który opisuje problem (np. błąd walidacji po stronie serwera, błąd wysyłki e-maila).

## 8. Interakcje użytkownika

1.  **Wejście na stronę:** Użytkownik widzi formularz z polem e-mail, które jest automatycznie aktywne (`autoFocus`).
2.  **Wpisanie błędnego e-maila:** Podczas wpisywania lub po utracie fokusu, walidacja po stronie klienta wyświetla błąd pod polem, jeśli format jest nieprawidłowy.
3.  **Wysłanie formularza:**
    - **Z błędnym e-mailem:** Przycisk jest zablokowany lub kliknięcie nie wywołuje akcji API; błąd walidacji jest widoczny.
    - **Z poprawnym e-mailem:**
      - Przycisk wysyłania staje się nieaktywny (`disabled`), jego tekst zmienia się na "Sending...", a po lewej stronie tekstu pojawia się ikona spinnera.
      - Wywoływana jest funkcja `supabase.auth.signInWithOtp()`.
      - **W przypadku sukcesu:** Wewnątrz karty formularza, pole `Input` i przycisk `Button` są zastępowane przez komunikat o pomyślnym wysłaniu.
      - **W przypadku błędu:** Przycisk staje się ponownie aktywny, a użytkownikowi wyświetlany jest komunikat błędu w formie powiadomienia toast.

## 9. Warunki i walidacja

- **Walidacja po stronie klienta (w `MagicLinkForm.tsx` przy użyciu Zod):**
  - `email` jest wymagany (`.min(1)`).
  - `email` musi być poprawnym adresem e-mail (`.email()`).
- **Stan interfejsu w zależności od walidacji:**
  - Przycisk "Send magic link" jest nieaktywny, jeśli formularz jest w stanie `isSubmitting`.
  - Komunikaty o błędach walidacji są wyświetlane pod polem `Input` za pomocą komponentu `FormMessage`.

## 10. Obsługa błędów

- **Błąd walidacji formatu e-mail:** Obsługiwany lokalnie przez `react-hook-form` i Zod. Użytkownik widzi komunikat bezpośrednio pod polem formularza.
- **Błąd wysyłania linku (np. błąd sieci, błąd serwera Supabase):**
  - W bloku `catch` wywołania API, zostanie wyświetlone powiadomienie typu "toast" (z biblioteki `sonner` lub innej zintegrowanej z Shadcn).
  - Przykładowy komunikat: "Wystąpił błąd podczas wysyłania linku. Spróbuj ponownie."
  - Szczegółowy błąd zostanie zalogowany do konsoli deweloperskiej w celu ułatwienia debugowania.

## 11. Kroki implementacji

1.  **Utworzenie struktury plików:**
    - Strona Astro: `src/pages/login.astro`.
    - Komponenty React: `src/components/pages/login/LoginPage.tsx`, `MagicLinkForm.tsx`.
    - Plik walidacji Zod: `src/lib/validators/authValidators.ts`.
2.  **Strona Astro (`login.astro`):**
    - Zdefiniowanie podstawowego layoutu strony.
    - Import i renderowanie komponentu `LoginPage.tsx` z dyrektywą `client:load`.
3.  **Komponent `LoginPage.tsx`:**
    - Implementacja prostego renderowania komponentu `MagicLinkForm`.
4.  **Schemat walidacji (`authValidators.ts`):**
    - Zdefiniowanie `MagicLinkFormSchema` przy użyciu `zod`.
5.  **Komponent `MagicLinkForm.tsx`:**
    - Budowa UI przy użyciu komponentów Shadcn (`Card`, `Input`, `Button`, `Form`, `Alert`).
    - Integracja z `react-hook-form` i `zodResolver`, używając `MagicLinkFormSchema`.
    - Dodanie atrybutu `autoFocus` do pola `Input`.
    - Implementacja lokalnego stanu `isSubmitted` do zarządzania widokiem wewnątrz komponentu.
    - Implementacja logiki `onSubmit`, która wywołuje `supabase.auth.signInWithOtp()` i w przypadku sukcesu zmienia stan `isSubmitted` na `true`.
    - Implementacja renderowania warunkowego wewnątrz `CardContent` na podstawie stanu `isSubmitted`.
    - Obsługa stanów `isSubmitting` w celu deaktywacji przycisku.
    - Implementacja obsługi błędów (wyświetlanie toastów).
6.  **Middleware (aktualizacja):**
    - W `src/middleware/index.ts` dodać logikę, która sprawdza, czy użytkownik ma aktywną sesję. Jeśli tak i próbuje wejść na `/login`, przekierować go na `/`.
7.  **Toast (jeśli nie istnieje):**
    - Upewnić się, że `Toaster` z `sonner` jest dodany do głównego layoutu aplikacji (`Layout.astro` lub `RootProvider.tsx`), aby powiadomienia były widoczne.
8.  **Testowanie:**
    - Przetestowanie walidacji.
    - Sprawdzenie pomyślnego scenariusza wysyłania linku i zmiany widoku wewnątrz formularza.
    - Symulacja błędu API i weryfikacja wyświetlania toastów.
    - Weryfikacja przekierowania dla zalogowanego użytkownika.
