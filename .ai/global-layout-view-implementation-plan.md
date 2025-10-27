# Plan implementacji widoku: Układ Globalny (Global Layout)

## 1. Przegląd

Celem tego zadania jest implementacja globalnego, spójnego układu aplikacji (`Layout`), który będzie obejmował wszystkie strony. Układ ten zarządza nawigacją, stopką oraz globalnym stanem sesji użytkownika – zarządzanym centralnie przy użyciu wzorca React Context – dynamicznie dostosowując interfejs w zależności od tego, czy użytkownik jest zalogowany, czy nie. Komponenty te muszą być w pełni responsywne zgodnie z dostarczoną wizją UI.

## 2. Routing widoku

Układ będzie aplikowany do wszystkich stron w aplikacji poprzez zagnieżdżenie ich w komponencie `src/layouts/Layout.astro`. Nie posiada on własnej, dedykowanej ścieżki.

## 3. Struktura komponentów

Komponenty zostaną zaimplementowane w architekturze "wyspowej" (Islands Architecture), gdzie statyczna struktura jest zarządzana przez Astro, a interaktywne elementy przez React. Stan sesji będzie zarządzany globalnie przez `AuthProvider`.

```
src/layouts/Layout.astro
└── src/components/layout/GlobalLayout.tsx (client:load)
    └── src/components/auth/AuthProvider.tsx
        ├── src/components/layout/Topbar.tsx
        │   ├── LogoLink.astro (statyczny)
        │   ├── (Warunkowo) DesktopNav.tsx
        │   │   ├── CreateNpcButton.tsx (używa useAuth)
        │   │   └── (Warunkowo)
        │   │       ├── GuestNav.tsx
        │   │       └── UserNav.tsx (używa useAuth)
        │   │           └── UserDropdown.tsx (używa useAuth)
        │   └── (Warunkowo) MobileNav.tsx (używa useAuth)
        ├── src/components/layout/SecondaryNavbar.tsx
        ├── <slot /> (Renderuje zawartość bieżącej strony)
        └── src/components/layout/Footer.tsx
```

## 4. Szczegóły komponentów

### `GlobalLayout.tsx`

- **Opis komponentu:** Główny, kliencki komponent React, który jest sercem dynamicznego layoutu. Jego głównym zadaniem jest renderowanie `AuthProvider`, który udostępnia stan sesji, oraz zarządzanie logiką UI niezwiązaną z sesją (np. scroll).
- **Główne elementy:** Renderuje `AuthProvider`, który opakowuje `Topbar`, `SecondaryNavbar`, `Footer` i `<slot />`.
- **Obsługiwane interakcje:** Nasłuchuje na zdarzenie `scroll` w celu implementacji logiki ukrywania/pokazywania `SecondaryNavbar` i `Footer`.
- **Typy:** Brak.
- **Propsy:** `currentPath: string` (przekazany z `Astro.url.pathname`).

### `Topbar.tsx`

- **Opis komponentu:** Górny pasek nawigacyjny. Pobiera stan sesji za pomocą hooka `useAuth` i na jego podstawie wyświetla odpowiednie komponenty (`GuestNav`/`UserNav`).
- **Główne elementy:** `LogoLink`, `DesktopNav`, `MobileNav`, `CreateNpcButton`.
- **Obsługiwane interakcje:** Brak (deleguje do komponentów podrzędnych).
- **Typy:** Brak.
- **Propsy:** Brak.

### `UserNav.tsx`

- **Opis komponentu:** Wyświetla nawigację dla zalogowanego użytkownika. Pobiera dane użytkownika z hooka `useAuth`.
- **Główne elementy:** Komponent `Avatar` i `UserDropdown`.
- **Obsługiwane interakcje:** Kliknięcie w awatar otwiera menu.
- **Typy:** `UserViewModel`.
- **Propsy:** Brak.

### `UserDropdown.tsx`

- **Opis komponentu:** Menu rozwijane dla zalogowanego użytkownika. Pobiera dane użytkownika i funkcję `logout` z hooka `useAuth`.
- **Główne elementy:** `DropdownMenu` z shadcn/ui.
- **Obsługiwane interakcje:** Kliknięcie w link profilu, kliknięcie "Wyloguj", przełączanie motywu.
- **Typy:** Brak.
- **Propsy:** Brak.

### `GuestNav.tsx`

- **Opis komponentu:** Wyświetla nawigację dla gościa, czyli przycisk "Sign In".
- **Główne elementy:** Komponent `Button` z shadcn/ui.
- **Obsługiwane interakcje:** Kliknięcie w przycisk nawiguje do `/login`.
- **Typy:** Brak.
- **Propsy:** Brak.

### `CreateNpcButton.tsx`

- **Opis komponentu:** Wyświetla przycisk "Create NPC". Jego stan zależy od statusu zalogowania pobranego z hooka `useAuth`.
- **Główne elementy:** `Button` i `Tooltip` z shadcn/ui.
- **Obsługiwane interakcje:** Przekierowanie do `/creator` (dla zalogowanych) lub wyświetlenie tooltipa (dla gości).
- **Typy:** Brak.
- **Propsy:** Brak.

### `SecondaryNavbar.tsx`

- **Opis komponentu:** Drugi, "przyklejony" pasek nawigacyjny, umieszczony pod głównym `Topbar`. Jest widoczny w zależności od kierunku scrollowania. Wyświetla linki do głównych stron oraz kontekstowe przyciski (sortowanie/filtrowanie).
- **Główne elementy:** Linki "Home" i "NPCs". Warunkowo renderowane przyciski `DropdownMenu` ("Sortuj", "Filtruj").
- **Obsługiwane interakcje:** Kliknięcie linków nawiguje do odpowiednich stron. Kliknięcie przycisków sortowania/filtrowania otwiera menu.
- **Warunki walidacji:** Przyciski "Sortuj" i "Filtruj" są widoczne tylko, gdy `currentPath` to `/npcs`.
- **Typy:** Brak.
- **Propsy:** `isVisible: boolean`, `currentPath: string`.

## 5. Typy

Na potrzeby interfejsu użytkownika zdefiniowane zostaną następujące typy ViewModel oraz typ dla wartości kontekstu.

```typescript
// src/components/auth/types.ts

/**
 * Reprezentuje dane zalogowanego użytkownika na potrzeby UI.
 */
export interface UserViewModel {
  id: string;
  displayName: string;
}

/**
 * Definiuje kształt wartości udostępnianej przez AuthContext.
 */
export interface AuthContextType {
  user: UserViewModel | null;
  isLoading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
}
```

## 6. Zarządzanie stanem

Zarządzanie stanem sesji użytkownika zostanie zrealizowane globalnie po stronie klienta przy użyciu wzorca **React Context + Custom Hook**.

### `AuthContext.ts`

- **Cel:** Stworzenie instancji Kontekstu (`React.createContext`), która będzie nośnikiem dla stanu sesji. Eksportuje `AuthContext`.

### `AuthProvider.tsx`

- **Cel:** Komponent-dostawca, który zarządza całą logiką stanu sesji i udostępnia go poprzez `AuthContext.Provider`.
- **Struktura:**
  - Używa `useState` do przechowywania stanu `{ user, isLoading, error }`.
  - Używa `useEffect` do jednorazowego wywołania API (`GET /api/profiles/me`) po zamontowaniu komponentu i ustawienia stanu.
  - Definiuje asynchroniczną funkcję `logout`, która wywołuje Supabase `signOut` i aktualizuje lokalny stan.
  - Opakowuje swoje `children` w `<AuthContext.Provider>`.
  - Wartość (`value`) przekazywana do Providera jest memoizowana za pomocą `useMemo`, aby zapobiec niepotrzebnym re-renderom komponentów konsumujących kontekst.

### `useAuth.ts`

- **Cel:** Prosty, customowy hook, który ułatwia komponentom dostęp do `AuthContext`.
- **Struktura:** `export const useAuth = () => useContext(AuthContext);`. Rzuca błąd, jeśli jest używany poza `AuthProvider`.

## 7. Integracja API

Komponenty będą pośrednio komunikować się z API poprzez `AuthProvider`.

- **Endpoint:** `GET /api/profiles/me`
- **Klient API:** Funkcja serwisowa `api.profiles.getMe()` będzie wywoływana **jednorazowo** wewnątrz `useEffect` w komponencie `AuthProvider.tsx`.
- **Typ żądania:** Brak (dane autoryzacyjne są przesyłane w cookie).
- **Typy odpowiedzi:**
  - **Sukces (200 OK):** `GetProfileMeResponseDto` (z `src/types.ts`). Odpowiedź zostanie zmapowana na `UserViewModel`.
  - **Błąd (401 Unauthorized):** Oznacza brak aktywnej sesji (użytkownik jest gościem). Stan `user` zostanie ustawiony na `null`.
  - **Inne błędy (5xx, błąd sieci):** Będą traktowane jako sesja gościa, a błąd zostanie zapisany w stanie i zalogowany do konsoli.

## 8. Interakcje użytkownika

- **Użytkownik zalogowany:**
  - **Kliknięcie awatara:** Otwiera `DropdownMenu`.
  - **Kliknięcie linku "Profil":** Przekierowuje na stronę `/profile/{userId}` (ID pobrane z `useAuth`).
  - **Kliknięcie "Wyloguj":** Wywołuje funkcję `logout` z hooka `useAuth`, co skutkuje wylogowaniem i odświeżeniem UI.
  - **Kliknięcie "Create NPC":** Przekierowuje do `/creator`.
- **Gość:**
  - **Kliknięcie "Sign In":** Przekierowuje na stronę `/login`.
  - **Kliknięcie "Create NPC":** Brak akcji (przycisk jest nieaktywny), po najechaniu pojawia się tooltip.
- **Wszyscy użytkownicy:**
  - **Scrollowanie strony w dół:** Powoduje ukrycie `SecondaryNavbar` (chowa się pod `Topbar`) oraz `Footer` (chowa się pod dolną krawędź ekranu).
  - **Scrollowanie strony w górę:** Powoduje ponowne pojawienie się `SecondaryNavbar` i `Footer`.

## 9. Warunki i walidacja

Głównym warunkiem weryfikowanym przez interfejs jest stan uwierzytelnienia użytkownika.

- **Komponenty:** `Topbar.tsx`, `CreateNpcButton.tsx`, `UserNav.tsx`, etc.
- **Weryfikacja:** Odbywa się na podstawie wartości `{ user, isLoading }` pobranych z hooka `useAuth`.
- **Wpływ na interfejs:**
  - Jeśli `isLoading` jest `true`, wyświetlane są skeleton loaders, aby zapobiec "mruganiu" interfejsu (FOUC).
  - Jeśli `isLoading` jest `false` i `user` istnieje, wyświetlana jest nawigacja dla zalogowanego użytkownika.
  - Jeśli `isLoading` jest `false` i `user` jest `null`, wyświetlana jest nawigacja dla gościa.
- **Widoczność przycisków w `SecondaryNavbar`:**
  - Przyciski "Sortuj" i "Filtruj" są renderowane tylko wtedy, gdy `currentPath` przekazany do `GlobalLayout.tsx` (a następnie do `SecondaryNavbar.tsx`) jest równy `/npcs` lub zaczyna się od `/npcs/`.

## 10. Obsługa błędów

- **Błąd pobierania profilu (np. błąd serwera 500, problem z siecią):**
  - `AuthProvider` przechwyci błąd.
  - Stan `user` zostanie ustawiony na `null`, a `error` na obiekt błędu.
  - Interfejs zachowa się tak, jak dla gościa, zapewniając ciągłość działania aplikacji.
  - Błąd zostanie zalogowany do konsoli deweloperskiej.
- **Błąd wylogowania:**
  - Funkcja `logout` w `AuthProvider` obsłuży potencjalny błąd z Supabase `signOut`.
  - Błąd zostanie zalogowany do konsoli. Można rozważyć dodanie powiadomienia typu "toast" informującego o niepowodzeniu.

## 11. Kroki implementacji

1.  **Stworzenie struktury plików dla autentykacji:** Utworzenie folderu `src/components/auth` oraz plików `AuthContext.tsx`, `AuthProvider.tsx`, `useAuth.ts` i `types.ts`.
2.  **Implementacja Kontekstu i Typów:** Zdefiniowanie `AuthContextType` w `types.ts` i stworzenie `AuthContext` w `AuthContext.tsx`.
3.  **Implementacja `AuthProvider`:** Zaimplementowanie komponentu `AuthProvider` z całą logiką: stanem, efektem do pobierania danych z `/api/profiles/me` oraz funkcją `logout`.
4.  **Implementacja `useAuth`:** Stworzenie prostego hooka, który udostępnia `AuthContext`.
5.  **Implementacja `GlobalLayout.tsx`:** Zmiana komponentu tak, aby renderował `AuthProvider` i opakowywał w niego resztę layoutu (`Topbar`, `slot` itd.).
6.  **Refaktoryzacja komponentów UI:**
    - Usunięcie propsów związanych z sesją z `Topbar`, `UserNav`, `CreateNpcButton` itd.
    - Zastąpienie ich bezpośrednim wywołaniem hooka `useAuth()` wewnątrz tych komponentów w celu uzyskania dostępu do danych i funkcji.
7.  **Integracja z `Layout.astro`:** Upewnienie się, że `GlobalLayout.tsx` jest poprawnie renderowany w `src/layouts/Layout.astro` z dyrektywą `client:load`.
8.  **Implementacja pozostałych komponentów layoutu:** Wdrożenie `SecondaryNavbar`, `Footer` oraz logiki scrollowania w `GlobalLayout.tsx`.
9.  **Stylowanie i testowanie:** Finalne dopracowanie stylów Tailwind CSS, testowanie responsywności, interakcji oraz obsługi stanów (ładowanie, zalogowany, gość, błąd).
