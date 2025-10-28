# Plan implementacji widoku Home

## 1. Przegląd

Widok strony głównej (`/`) jest punktem wejścia do aplikacji Jiddo NPC Generator. Jego głównym celem jest prezentacja najnowszych, opublikowanych przez społeczność NPC. Interfejs dynamicznie dostosowuje się w zależności od statusu uwierzytelnienia użytkownika, oferując inny układ i liczbę wyświetlanych NPC dla gości i zalogowanych użytkowników, aby zoptymalizować doświadczenie każdej z tych grup.

## 2. Routing widoku

Widok będzie dostępny pod główną ścieżką aplikacji:

- **Ścieżka:** `/`
- **Plik:** `src/pages/index.astro`

## 3. Struktura komponentów

Główna logika widoku zostanie zaimplementowana w komponencie React, renderowanym po stronie klienta wewnątrz strony Astro.

```
src/pages/index.astro
└── src/components/pages/home/HomePage.tsx (client:load)
    ├── hooks/useFeaturedNpcs.ts (logika fetchowania danych)
    ├── (stan ładowania)
    │   └── NpcGrid.tsx
    │       └── NpcSkeletonCard.tsx (x8)
    ├── (stan błędu)
    │   └── ErrorState.tsx
    ├── (stan z danymi)
    │   ├── (użytkownik zalogowany)
    │   │   ├── HomeHeader.tsx
    │   │   └── NpcGrid.tsx
    │   │       └── NpcCard.tsx (x8)
    │   └── (gość)
    │       └── NpcGrid.tsx
    │           ├── FeaturedInfoPanel.tsx
    │           └── NpcCard.tsx (x6)
```

## 4. Szczegóły komponentów

### `HomePage.tsx`

- **Opis komponentu:** Główny komponent-kontener dla strony głównej. Wykorzystuje hook `useFeaturedNpcs` do pobierania danych i zarządzania stanami (ładowanie, błąd, sukces). Na podstawie stanu uwierzytelnienia i stanu danych renderuje odpowiedni układ interfejsu.
- **Główne elementy:** `HomeHeader`, `NpcGrid`, `ErrorState`, `div` (jako wrapper).
- **Obsługiwane interakcje:** Brak bezpośrednich; zarządza renderowaniem komponentów podrzędnych.
- **Obsługiwana walidacja:** Sprawdzenie stanu `isLoading`, `error`, `data` w celu renderowania warunkowego.
- **Typy:** `NpcListItemDto[]`.
- **Propsy:** Brak.

### `HomeHeader.tsx`

- **Opis komponentu:** Nagłówek sekcji "Featured NPC's" wyświetlany tylko dla zalogowanych użytkowników. Zawiera tytuł, ikonę z tooltipem oraz przycisk nawigacyjny.
- **Główne elementy:** Tytuł `h2`, komponent `Tooltip` (z Shadcn/ui) owijający ikonę "info", komponent `Button` (z Shadcn/ui) wewnątrz tagu `<a>` lub komponentu `Link`.
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku "Explore all NPCs" nawiguje do `/npcs`.
  - Najazd na ikonę "info" wyświetla tooltip z opisem.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** Brak.

### `FeaturedInfoPanel.tsx`

- **Opis komponentu:** Duży panel informacyjny wyświetlany tylko dla gości. Zawiera tytuł, opis aplikacji oraz przycisk zachęcający do eksploracji. W siatce zajmuje przestrzeń dwóch kart.
- **Główne elementy:** Tytuł `h2`, paragraf `<p>` z opisem, komponent `Button` wewnątrz tagu `<a>`.
- **Obsługiwane interakcje:** Kliknięcie przycisku "Explore all NPCs" nawiguje do `/npcs`.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** Brak.

### `NpcGrid.tsx`

- **Opis komponentu:** Responsywny kontener siatki, który układa karty NPC. Posiada dwa warianty układu w zależności od tego, czy jest renderowany dla gościa, czy zalogowanego użytkownika.
- **Główne elementy:** `div` ze stylami siatki Tailwind CSS. Renderuje dzieci przekazane przez propsy (`NpcCard`, `NpcSkeletonCard`, `FeaturedInfoPanel`).
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:**
  - `isAuthenticated: boolean`: Określa wariant siatki do wyrenderowania.
  - `children: React.ReactNode`: Komponenty do wyświetlenia w siatce.

### `NpcCard.tsx`

- **Opis komponentu:** Karta prezentująca podsumowanie pojedynczego NPC. Jest w całości klikalna i przenosi do strony szczegółów.
- **Główne elementy:** Komponent `Card` (z Shadcn/ui) opakowany w tag `<a>`. Zawiera `img` dla obrazu (placeholder 4:3), `CardHeader` z `CardTitle`, `CardContent` z informacjami o autorze i `CardFooter` z ikonami aktywnych modułów.
- **Obsługiwane interakcje:** Kliknięcie karty nawiguje do `/npcs/{npc.id}`.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `NpcListItemDto`.
- **Propsy:**
  - `npc: NpcListItemDto`: Obiekt z danymi NPC do wyświetlenia.

### `NpcSkeletonCard.tsx`

- **Opis komponentu:** Wersja "szkieletowa" komponentu `NpcCard`, używana do sygnalizowania stanu ładowania danych. Ma identyczne wymiary jak `NpcCard`, aby zapobiec przesunięciom układu.
- **Główne elementy:** Komponent `Card` zawierający komponenty `Skeleton` (z Shadcn/ui) imitujące układ `NpcCard`.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** Brak.

## 5. Typy

Do implementacji widoku wykorzystane zostaną istniejące typy DTO zdefiniowane w `src/types.ts`. Nie ma potrzeby tworzenia nowych, dedykowanych typów ViewModel.

- **`GetFeaturedNpcsQueryDto`**: Używany do typowania parametrów zapytania API.
  - `limit?: number`
- **`GetFeaturedNpcsResponseDto`**: Typ odpowiedzi z API.
  - `items: NpcListItemDto[]`
- **`NpcListItemDto`**: Główny model danych dla pojedynczego NPC na liście.
  - `id: string`
  - `name: string`
  - `owner: { id: string; displayName: string | null }`
  - `status: "draft" | "published"`
  - `modules: { shopEnabled: boolean; keywordsEnabled: boolean }`
  - `publishedAt: string | null`
  - `updatedAt: string`
  - `contentSizeBytes: number`

## 6. Zarządzanie stanem

Logika pobierania danych oraz zarządzanie stanami (ładowanie, błąd, dane) zostanie wyizolowana w dedykowanym custom hooku.

- **`useFeaturedNpcs.ts`**:
  - **Cel:** Enkapsulacja logiki fetchowania danych dla komponentu `HomePage`.
  - **Zależności:** `useAuth` (kontekst do sprawdzania stanu uwierzytelnienia).
  - **Zwracane wartości:** `{ npcs: NpcListItemDto[] | null, isLoading: boolean, error: Error | null }`.
  - **Logika:**
    1. Pobiera stan uwierzytelnienia z `useAuth`.
    2. Na podstawie statusu auth, ustawia parametr `limit` (6 dla gościa, 8 dla zalogowanego).
    3. W `useEffect` uruchamia zapytanie do API, ustawiając `isLoading` na `true`.
    4. Po otrzymaniu odpowiedzi, aktualizuje stan `npcs` lub `error` i ustawia `isLoading` na `false`.

## 7. Integracja API

Integracja z backendem będzie realizowana poprzez wywołanie endpointu `GET /api/npcs/featured`.

- **Endpoint:** `GET /api/npcs/featured`
- **Logika wywołania:**
  - Hook `useFeaturedNpcs` konstruuje URL z odpowiednim parametrem `limit`.
  - `fetch('/api/npcs/featured?limit=6')` dla gościa.
  - `fetch('/api/npcs/featured?limit=8')` dla zalogowanego użytkownika.
- **Typy żądania:** `GetFeaturedNpcsQueryDto` (dla parametrów `URLSearchParams`).
- **Typy odpowiedzi:** `GetFeaturedNpcsResponseDto` (dla pomyślnej odpowiedzi) lub standardowy obiekt błędu API (w przypadku niepowodzenia).

## 8. Interakcje użytkownika

- **Wejście na stronę:**
  - **Akcja:** Użytkownik otwiera stronę `/`.
  - **Wynik:** Wyświetlany jest stan ładowania (szkielety kart). Po załadowaniu danych, w zależności od statusu logowania, pojawia się siatka z `FeaturedInfoPanel` (gość) lub `HomeHeader` (zalogowany) oraz karty NPC.
- **Kliknięcie karty NPC:**
  - **Akcja:** Użytkownik klika na dowolny komponent `NpcCard`.
  - **Wynik:** Następuje przekierowanie na stronę szczegółów danego NPC: `/npcs/{npc.id}`.
- **Kliknięcie przycisku "Explore all NPCs":**
  - **Akcja:** Użytkownik klika przycisk w `FeaturedInfoPanel` lub `HomeHeader`.
  - **Wynik:** Następuje przekierowanie na stronę z listą wszystkich NPC: `/npcs`.

## 9. Warunki i walidacja

Interfejs użytkownika będzie dynamicznie reagował na poniższe warunki:

- **Status uwierzytelnienia:**
  - **Warunek:** Użytkownik jest zalogowany.
  - **Komponent:** `HomePage.tsx`.
  - **Wynik:** Wyświetlany jest `HomeHeader` i siatka 8 NPC. API jest wywoływane z `limit=8`.
  - **Warunek:** Użytkownik nie jest zalogowany (gość).
  - **Komponent:** `HomePage.tsx`.
  - **Wynik:** Wyświetlany jest `FeaturedInfoPanel` i siatka 6 NPC. API jest wywoływane z `limit=6`.
- **Stan pobierania danych:**
  - **Warunek:** `isLoading` jest `true`.
  - **Komponent:** `HomePage.tsx`.
  - **Wynik:** Wyświetlana jest siatka z komponentami `NpcSkeletonCard`.

## 10. Obsługa błędów

- **Błąd API:**
  - **Scenariusz:** Zapytanie do `GET /api/npcs/featured` kończy się niepowodzeniem (np. błąd 500).
  - **Obsługa:** Hook `useFeaturedNpcs` przechwytuje błąd i ustawia stan `error`. Komponent `HomePage` renderuje dedykowany komponent `ErrorState`, informujący użytkownika o problemie z załadowaniem danych i sugerujący odświeżenie strony.
- **Brak danych:**
  - **Scenariusz:** API zwraca pustą tablicę `items: []`.
  - **Obsługa:** Komponent `HomePage` renderuje stan pusty – np. komunikat "Obecnie nie ma żadnych wyróżnionych NPC." zamiast siatki kart.

## 11. Kroki implementacji

1.  **Stworzenie struktury plików:** Utworzenie plików dla nowych komponentów: `HomePage.tsx`, `HomeHeader.tsx`, `FeaturedInfoPanel.tsx`, `NpcGrid.tsx` w `src/components/pages/home/`.
2.  **Implementacja `useFeaturedNpcs`:** Stworzenie custom hooka w `src/hooks/` do obsługi logiki pobierania danych, w tym obsługi stanu uwierzytelnienia.
3.  **Implementacja komponentów szkieletowych:** Stworzenie lub weryfikacja `NpcSkeletonCard.tsx`, upewniając się, że jego wymiary odpowiadają `NpcCard.tsx`.
4.  **Implementacja `NpcCard.tsx`:** Stworzenie karty NPC, która przyjmuje `npc: NpcListItemDto` jako prop i renderuje dane. Opakowanie całości w tag `<a>`.
5.  **Implementacja `NpcGrid.tsx`:** Stworzenie komponentu siatki z logiką warunkową dla stylów `grid` w zależności od propa `isAuthenticated`.
6.  **Implementacja `FeaturedInfoPanel.tsx` i `HomeHeader.tsx`:** Stworzenie tych dwóch wariantów nagłówka, w tym obsługa nawigacji przycisku "Explore all NPCs".
7.  **Implementacja `HomePage.tsx`:** Połączenie wszystkich komponentów. Wywołanie `useFeaturedNpcs`, obsługa stanów `isLoading` i `error`, oraz warunkowe renderowanie układu dla gościa lub zalogowanego użytkownika.
8.  **Aktualizacja strony Astro:** W `src/pages/index.astro`, osadzenie i hydratacja komponentu `<HomePage client:load />` wewnątrz głównego layoutu.
9.  **Stylowanie:** Dopracowanie stylów w Tailwind CSS dla wszystkich komponentów, aby były zgodne z wizją UI, w tym responsywność.
10. **Testowanie:** Ręczne przetestowanie wszystkich scenariuszy: widok gościa, widok zalogowanego użytkownika, stan ładowania, stan błędu oraz wszystkie interakcje (klikanie kart i przycisków).
