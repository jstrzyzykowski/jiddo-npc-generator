# Plan implementacji widoku Profil Użytkownika

## 1. Przegląd

Widok Profil Użytkownika prezentuje dane zalogowanego użytkownika oraz listy jego NPC w dwóch zakładkach: Drafts i Published. Dostęp do widoku mają wyłącznie zalogowani. Sekcja boczna wyświetla podstawowe informacje (awatar, nazwa, data dołączenia), a sekcja główna oferuje sub‑menu z pozycją "NPCs" (z licznikiem) oraz przełączalne zakładki Drafts/Published z listami kart NPC, paginowanymi mechanizmem infinite scroll. Widok korzysta z endpointów aplikacyjnych: GET /api/profiles/me oraz GET /api/npcs z parametrami visibility=mine i status.

## 2. Routing widoku

- Ścieżka: `/profile/[userId]`
- Pliki:
  - `src/pages/profile/[userId]/index.astro` – strona Astro z wyspą React.
  - Główna wyspa React: `src/components/pages/profile/ProfileApp.tsx`.
- Gating dostępu: jeśli użytkownik niezalogowany – UI wyświetla CTA do logowania; rekomendowane uzupełnienie o middleware RLS po stronie API (już istnieje) i ewentualny redirect w warstwie stron, jeśli projekt przewiduje.
- Re‑use istniejących layoutów:
  - Wrapper strony: `src/components/AppShell.tsx`.
  - Sub‑menu: `src/components/layout/SecondaryNavbar.tsx`.

## 3. Struktura komponentów

- `ProfileApp` (React, strona)
  - `ProfileHeader` (opcjonalnie – tytuł, breadcrumbs)
  - `ProfileLayout` (grid: aside + main)
    - `ProfileAside` (awatar, nazwa, data dołączenia)
    - `ProfileMain` (część główna)
      - `ProfileSubnav` (pozycja "NPCs" z licznikiem) – re‑use `layout/SecondaryNavbar.tsx`
      - `NpcsSection`
        - `NpcTabs` (Drafts | Published) – re‑use `ui/tabs.tsx`
        - `FilterTags` (sort, shop/keywords) – re‑use `features/npc/list/FilterTags.tsx`
        - `NpcGrid` (siatka kart) – re‑use `features/npc/list/NpcGrid.tsx`
          - `NpcCard` (pojedynczy wpis)
        - `InfiniteScrollTrigger` – re‑use `shared/InfiniteScrollTrigger.tsx`
        - `EmptyState` – re‑use `pages/home/EmptyState.tsx`

## 4. Szczegóły komponentów

### ProfileApp

- Opis: Kontener widoku profilu. Zarządza stanem sekcji, zakładek, filtrów, danymi profilu i listami NPC.
- Główne elementy: wrapper, `ProfileLayout`, wewnętrzne provider’y (np. kontekst profilu), wyspa React w `index.astro`.
- Obsługiwane interakcje:
  - Zmiana sekcji sub‑menu (tu: "NPCs").
  - Zmiana zakładki (Drafts/Published).
  - Zmiana tagów (Shop, Keywords, XML, Focus, Travel, Voice).
  - Zmiana sortowania (od najnowszych do najstarszych NPC).
  - Detekcja końca listy (intersection) i dociąganie kolejnych stron.
- Walidacja:
  - Sprawdzenie zalogowania na podstawie 401 z `/api/profiles/me`.
  - Weryfikacja `userId` w URL względem `me.id`; przy rozbieżności – przekierowanie na `/profile/{me.id}` lub komunikat 403 (wg założeń projektu).
- Typy: `GetProfileMeResponseDto`, `GetNpcListResponseDto`, `NpcListItemDto`, ViewModel’e: `ProfileViewState`, `NpcListQuery`, `NpcListState` (patrz sekcja Typy).
- Propsy: brak (komponent stronowy).

### ProfileLayout

- Opis: Siatka 2‑kolumnowa (aside + main). Odpowiada za układ i responsywność.
- Główne elementy: kontenery div, grid CSS (Tailwind 4), sloty na aside i main.
- Interakcje: brak.
- Walidacja: brak.
- Typy: brak.
- Propsy:
  - `aside: ReactNode`
  - `children: ReactNode`

### ProfileAside

- Opis: Panel z danymi użytkownika.
- Główne elementy: avatar, displayName, join date, ewentualnie przyciski profilowe.
- Interakcje: brak.
- Walidacja: wyświetla placeholdery/szkielety, gdy dane się ładują; przy błędzie – komunikat.
- Typy: `GetProfileMeResponseDto` (wykorzystanie pól: `displayName`, `createdAt`).
- Propsy:
  - `profile: GetProfileMeResponseDto | null`
  - `loading: boolean`
  - `error?: string`

### ProfileSubnav

- Opis: Pasek pod nawigacją z kategoriami; dla MVP jedna pozycja "NPCs" z licznikiem.
- Główne elementy: przyciski/linki kategorii, badge z liczbą (`npcCounts.draft + npcCounts.published`).
- Interakcje: kliknięcie pozycji "NPCs" przełącza widok główny.
- Walidacja: licznik nieujemny; fallback 0 przy braku danych.
- Typy: `GetProfileMeResponseDto['npcCounts']`.
- Propsy:
  - `active: 'npcs' | 'overview'`
  - `counts: ProfileNpcCountsDto | null`
  - `onChange: (key: 'npcs' | 'overview') => void`

### NpcsSection

- Opis: Główna sekcja list NPC użytkownika.
- Główne elementy: `NpcTabs`, `FilterTags`, `NpcGrid`, `InfiniteScrollTrigger`, `EmptyState`.
- Interakcje:
  - Zmiana zakładki → reset listy i pobranie pierwszej strony.
  - Zmiana filtrów/sortowania → reset danych i pobranie.
  - Scroll do końca → pobranie kolejnej strony (jeśli `nextCursor` != null).
- Walidacja:
  - `visibility=mine` wymaga zalogowania (wymusza 401 → obsłużyć na poziomie strony).
  - Parametr `status` ∈ {`draft`, `published`}.
  - `limit` dodatnie (np. 24) i rozsądne (UX/wydajność).
- Typy: `NpcListQuery`, `NpcListState`, `GetNpcListResponseDto`.
- Re‑use: `features/npc/list/NpcListProvider.tsx`, `features/npc/list/useNpcList.ts`.
- Propsy:
  - `initialTab?: TabKey`
  - `profile: GetProfileMeResponseDto`

### NpcTabs

- Opis: Zakładki filtrujące status listy (Drafts i Published).
- Główne elementy: komponent Tabs z Shadcn/ui (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) – re‑use `src/components/ui/tabs.tsx`.
- Interakcje: kliknięcie zmienia `tabKey` w stanie rodzica.
- Walidacja: dopuszczalne wartości: `drafts` | `published`.
- Typy: `TabKey` = 'drafts' | 'published'.
- Propsy:
  - `value: TabKey`
  - `onValueChange: (value: TabKey) => void`
  - `counts?: ProfileNpcCountsDto`

### FilterTags (re‑use istniejącego komponentu)

- Opis: Gotowy komponent tagów/filtrów listy NPC używany na `/npcs`.
- Główne elementy: Select (sort), przełączniki tagów (Shop, Keywords) – oraz ewentualnie inne predefiniowane w `features/npc/list/config.ts`.
- Interakcje: zmiana filtrów wywołuje `onChange` (resetuje listę i pobiera od pierwszej strony).
- Walidacja:
  - `sort` ∈ {`updated_at`, `published_at`, `created_at`}; `order` ∈ {`asc`, `desc`}.
  - `shopEnabled`, `keywordsEnabled` – boolean (zgodnie z API).
- Typy: `NpcListQuery` (bez kursora/limitu), konfiguracja z `features/npc/list/config.ts`.
- Propsy: zgodne z interfejsem istniejącego `FilterTags` – dostosować mapping do `NpcListQuery` widoku profilu.

### NpcGrid (re‑use istniejącego komponentu)

- Opis: Siatka kart NPC.
- Główne elementy: siatka responsywna, renderuje karty `src/components/pages/home/NpcCard.tsx`.
- Interakcje: kliknięcie karty przechodzi do strony szczegółów NPC (publiczny widok szczegółów – URL `/npcs/[id]`).
- Walidacja: brak.
- Typy: `NpcListItemDto[]` oraz statusy z `useNpcList`.
- Propsy (zgodnie z istniejącym interfejsem):
  - `items: NpcListItemDto[]`
  - `status: NpcListStatus`
  - `error: Error | null`
  - `hasMore: boolean`
  - `isLoading: boolean`
  - `isLoadingMore: boolean`
  - `onLoadMore: () => void`
  - `onRetry: () => void`
  - `onRefresh?: () => void`

### NpcCard (re‑use istniejącego komponentu)

- Opis: Kafelek z informacjami o NPC używany w listach (HOME, /npcs, profil).
- Ścieżka: `src/components/pages/home/NpcCard.tsx`
- Główne elementy: placeholder 4:3, nazwa, autor, moduły (Shop/Keywords), status, metadane; akcje właściciela przez `NpcOwnerActions`.
- Interakcje: klik na cały kafelek → przejście do szczegółów; dla właściciela: publikacja/edycja/usuwanie.
- Propsy:
  - `npc: NpcListItemDto`
  - `className?: string`
  - `onRefresh?: () => void`

### InfiniteScrollTrigger (re‑use istniejącego komponentu)

- Opis: Niewidoczny element obserwowany przez `IntersectionObserver`.
- Główne elementy: div z ref.
- Interakcje: wejście w viewport → `onIntersect`.
- Walidacja: brak.
- Typy: brak.
- Propsy:
  - `onTrigger: () => void`
  - `disabled?: boolean`
- Ścieżka: `src/components/shared/InfiniteScrollTrigger.tsx`

### EmptyState (re‑use istniejącego komponentu)

- Opis: Istniejący komponent pustego stanu używany na stronie głównej. Dla nowych użytkowników CTA "Create NPC" prowadzi do kreatora.
- Główne elementy: ikona, tytuł, opis, przycisk CTA.
- Interakcje: kliknięcie CTA → nawigacja do kreatora.
- Walidacja: brak.
- Typy: brak.
- Propsy:
  - `title: string`
  - `description?: string`
  - `action?: { label: string; href: string }`
- Ścieżka: `src/components/pages/home/EmptyState.tsx`

## 5. Typy

Wykorzystanie istniejących DTO z `src/types.ts` oraz nowe ViewModel’e dla widoku.

- Istniejące:
  - `GetProfileMeResponseDto` (id, displayName, createdAt, updatedAt, npcCounts: { draft, published })
  - `GetNpcListResponseDto` = { items: `NpcListItemDto`[], pageInfo: { nextCursor: string | null; total?: number | null } }
  - `NpcListItemDto` (id, name, owner, status, modules, publishedAt, updatedAt, contentSizeBytes)
  - `NpcListVisibilityFilter` | `NpcStatus` | pola sort/limit/cursor (z `GetNpcListQueryDto`)

- Nowe (ViewModel):
  - `type TabKey = 'drafts' | 'published'`
  - `interface ProfileViewState {
  activeSection: 'npcs' | 'overview';
  tab: TabKey;
  filters: {
    sort: 'updated_at' | 'published_at' | 'created_at';
    order: 'asc' | 'desc';
    shopEnabled?: boolean;
    keywordsEnabled?: boolean;
    search?: string;
  };
  profile: GetProfileMeResponseDto | null;
  loadingProfile: boolean;
  profileError?: string;
}`
  - `interface NpcListQuery {
  visibility: 'mine';
  status: 'draft' | 'published';
  sort: 'updated_at' | 'published_at' | 'created_at';
  order: 'asc' | 'desc';
  shopEnabled?: boolean;
  keywordsEnabled?: boolean;
  search?: string;
  limit: number; // np. 24
  cursor?: string | null;
}`
  - `interface NpcListState {
  items: NpcListItemDto[];
  nextCursor: string | null;
  loading: boolean;
  error?: string;
  exhausted: boolean; // nextCursor === null po co najmniej jednym pobraniu
}`

## 6. Zarządzanie stanem

- Lokalny stan w `ProfileApp` (React): `ProfileViewState` oraz dwa bufory wyników dla zakładek (by przełączanie było natychmiastowe).
- Re‑use istniejącej logiki listy:
  - Provider: `src/components/features/npc/list/NpcListProvider.tsx` (kontekst listy i konfiguracja domyślnych parametrów).
  - Hook: `src/components/features/npc/list/useNpcList.ts` (pobieranie, kursory, append, statusy, błędy).
- Dodatkowe hooki:
  - `useProfileMe()` – pobiera `/api/profiles/me`, zarządza `loading`/`error`/`data`.
  - `InfiniteScrollTrigger` – wywołuje `loadMore` z `useNpcList` (brak potrzeby własnego `useIntersection`).
- Debounce dla `search` (jeśli używane): 300–500 ms.
- Anulowanie żądań (opcjonalne): `AbortController` – jeśli nie jest zapewniony w `useNpcList`.

## 7. Integracja API

- Profil:
  - `GET /api/profiles/me`
  - Response: `GetProfileMeResponseDto`
  - Błędy: 401 (niezalogowany) → UI z CTA logowania; inne 5xx → komunikat błędu i retry.

- Lista NPC użytkownika:
  - `GET /api/npcs?visibility=mine&status={draft|published}&limit={n}&cursor={token?}&sort={...}&order={...}&shopEnabled={bool?}&keywordsEnabled={bool?}&search={q?}`
  - Response: `GetNpcListResponseDto`
  - Paginacja: używać `pageInfo.nextCursor` jako następnego `cursor`; gdy `null` → koniec listy.
  - Błędy: 401 (brak sesji) → CTA logowania; 403 (nieuprawniony) → komunikat; inne → toast + przycisk retry.

## 8. Interakcje użytkownika

- Kliknięcie "NPCs" w sub‑menu → przełącza sekcję główną na listy NPC.
- Przełączenie zakładki Drafts/Published → reset listy i pobranie pierwszej strony dla wybranego statusu.
- Zmiana sortowania lub tagów → reset i ponowne pobranie.
- Scroll do końca (przecięcie `InfiniteScrollSentinel`) → dociągnięcie kolejnej strony (jeśli dostępna).
- Kliknięcie karty NPC → nawigacja do publicznej strony szczegółów NPC.
- Brak jakichkolwiek NPC (licznik 0) → `EmptyState` z CTA "Create NPC" do kreatora.

## 9. Warunki i walidacja

- Autoryzacja: żądania z `visibility=mine` wymagają aktywnej sesji; 401 → CTA logowania.
- Status: zakładki mapują się na `status=draft` lub `status=published` (tylko te wartości dozwolone).
- Parametry zapytań:
  - `limit` > 0 i rozsądne (np. 24) – po stronie UI kontrolowane.
  - `sort` ∈ {`updated_at`, `published_at`, `created_at`}; `order` ∈ {`asc`, `desc`}.
  - `shopEnabled`, `keywordsEnabled`, `xmlEnabled`, `focusEnabled`, `travelEnabled`, `voiceEnabled` – opcjonalne boolean.
- Zgodność z API: korzystać z `pageInfo.nextCursor`; nie dublować rekordów (append unikalnych `id`).

## 10. Obsługa błędów

- Profil: 401 → moduł "not logged" (CTA); 404/403 (jeśli weryfikujemy `userId` ≠ `me.id`) → redirect lub komunikat.
- Listy: błędy sieciowe → sekcja błędu nad listą + przycisk "Try again"; zachować dotychczasowe elementy.
- Paginacja: brak kolejnej strony (nextCursor = null) → zatrzymać obserwację sentinela i pokazać komunikat „No more results”.
- Puste stany: per zakładka (brak wyników po filtrach) oraz ogólny (obie listy puste) – różne treści.

## 11. Kroki implementacji

1. Routing i szkielet strony
   - Utwórz `src/pages/profile/[userId]/index.astro` z wyspą `ProfileApp`.
   - Dostosuj meta/tytuł; przygotuj kontener układu.
2. Komponenty layoutu
   - Oprzyj stronę o `src/components/AppShell.tsx`.
   - Zaimplementuj `ProfileLayout` (grid) oraz `ProfileAside`, `ProfileMain` (sloty).
3. Pobranie profilu
   - Dodaj hook `useProfileMe` (GET `/api/profiles/me`).
   - Wyświetl dane w `ProfileAside`; obsłuż loading/error.
   - Jeśli `userId` z URL ≠ `me.id`, wykonaj redirect do `/profile/{me.id}` albo pokaż komunikat 403 (wg decyzji w projekcie).
4. Sub‑menu i licznik
   - Zaimplementuj `ProfileSubnav` wykorzystując `src/components/layout/SecondaryNavbar.tsx` z pozycją "NPCs" i badge `drafts + published`.
5. Zakładki i tagi
   - Dodaj `NpcTabs` re‑use `src/components/ui/tabs.tsx`.
   - Re‑use `FilterTags` z `src/components/features/npc/list/FilterTags.tsx` (sort + shop/keywords).
6. Paginacja i listy
   - Re‑use `NpcListProvider` i `useNpcList` z `src/components/features/npc/list/` (konfiguruj `visibility=mine`, `status` wg zakładki).
   - Re‑use `NpcGrid` z `src/components/features/npc/list/NpcGrid.tsx` – automatycznie renderuje `src/components/pages/home/NpcCard.tsx` dla każdego elementu.
   - Re‑use `InfiniteScrollTrigger` z `src/components/shared/InfiniteScrollTrigger.tsx` i podłącz `onTrigger` do `loadMore`.
7. Puste stany
   - Re‑use `src/components/pages/home/EmptyState.tsx` jako globalny pusty stan (gdy oba liczniki 0) oraz jako stan per zakładka (brak wyników po filtrach).
8. Obsługa błędów i UX
   - Dodaj komunikaty o błędach (toasty/alerty) dla profilu i list.
   - Dodaj przyciski retry; wyłącz obserwację przy błędach dociągania.
9. Testy manualne
   - Scenariusze: nowy użytkownik (0/0), tylko drafty, tylko published, mieszane; brak sesji (401); błąd sieci; infinite scroll.
10. Optymalizacje (opcjonalnie)

- Anulowanie żądań przy zmianie filtrów (AbortController).
- Prefetch pierwszej strony drugiej zakładki po bezczynności.

## 12. Re‑use istniejących komponentów – szybka mapa referencyjna

- Layout i nawigacja:
  - `src/components/AppShell.tsx`
  - `src/components/layout/SecondaryNavbar.tsx`
  - `src/components/layout/CreateNpcButton.tsx`
- UI (Shadcn):
  - `src/components/ui/tabs.tsx`, `button.tsx`, `badge.tsx`, `card.tsx`, `dialog.tsx`, `tooltip.tsx`, `switch.tsx`, `input.tsx`, `form.tsx`, `alert.tsx`, `skeleton.tsx`, `sonner.tsx`
- Lista NPC (gotowe elementy):
  - `src/components/features/npc/list/NpcListProvider.tsx`
  - `src/components/features/npc/list/useNpcList.ts`
  - `src/components/features/npc/list/NpcGrid.tsx`
  - `src/components/features/npc/list/FilterTags.tsx`
  - `src/components/features/npc/list/config.ts`
  - `src/components/pages/home/NpcCard.tsx`
- Scroll / loading / empty:
  - `src/components/shared/InfiniteScrollTrigger.tsx`
  - `src/components/pages/home/NpcSkeletonCard.tsx`
  - `src/components/pages/home/EmptyState.tsx`
