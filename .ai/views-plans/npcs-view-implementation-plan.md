# Plan implementacji widoku listy NPC (`/npcs`)

## 1. Przegląd

Celem tego widoku jest wyświetlenie publicznej, paginowanej listy wszystkich opublikowanych NPC. Implementacja będzie bazować na istniejących komponentach-placeholderach, rozbudowując je o docelową funkcjonalność. Kluczowym elementem architektury jest **centralny plik konfiguracyjny**, który definiuje opcje sortowania i filtrowania, oraz dedykowany **`NpcListProvider`** (React Context), który zarządza stanem. Zgodnie z najlepszymi praktykami Astro, początkowy stan kontekstu zostanie określony po stronie serwera na podstawie parametrów URL (zwalidowanych z użyciem konfiguracji) i przekazany jako `props` do hydracji.

## 2. Architektura i Konfiguracja

- **Centralna Konfiguracja:** W `src/components/features/npc/list/config.ts` zostaną zdefiniowane opcje sortowania i filtrowania, wartości domyślne oraz funkcje pomocnicze do walidacji i parsowania parametrów URL. Zapewni to "Single Source of Truth" dla całej logiki widoku.
- **Routing i Stan:** Widok będzie reagował na parametry `?sort=` i `?filter=`. Stan aplikacji będzie synchronizowany z URL po stronie klienta.

## 3. Struktura komponentów

Logika widoku zostanie odizolowana i udostępniona przez `NpcListProvider`, który będzie warunkowo renderowany w `RootProvider.tsx` (głównym komponencie layoutu) tylko dla ścieżki `/npcs`.

```
/src/pages/npcs.astro
└── /src/components/pages/npcs/NpcsApp.tsx
    └── /src/components/AppShell.tsx
        └── /src/components/RootProvider.tsx  // Warunkowo renderuje NpcListProvider
            ├── /src/components/layout/SecondaryNavbar.tsx (konsumuje konfigurację i kontekst)
            └── /src/components/pages/npcs/NpcsPage.tsx (konsumuje kontekst)
                ├── /src/components/features/npc/list/FilterTags.tsx
                ├── /src/components/features/npc/list/NpcGrid.tsx
                │   ├── /src/components/features/npc/list/NpcCard.tsx
                │   │   └── /src/components/features/npc/list/NpcCardActions.tsx
                │   └── /src/components/ui/SkeletonCard.tsx
                └── /src/components/shared/InfiniteScrollTrigger.tsx
```

## 4. Szczegóły komponentów

### `config.ts`

- **Lokalizacja:** `src/components/features/npc/list/config.ts`
- **Odpowiedzialność:** Eksportowanie `SORT_OPTIONS`, `FILTER_TAGS`, `DEFAULT_SORT`, `DEFAULT_FILTER` oraz funkcji pomocniczych (np. `getSortOptionFromParam`).

### `npcs.astro`

- **Odpowiedzialność:** Po stronie serwera zaimportuje konfigurację, użyje funkcji pomocniczych do sparsowania `Astro.url.searchParams` i przygotuje bezpieczne `initialSort` i `initialFilter`. Następnie pobierze `initialData` i przekaże wszystko jako `props`.

### `RootProvider.tsx`

- **Odpowiedzialność:** Warunkowo wyrenderuje `NpcListProvider`, przekazując do niego `initialSort` i `initialFilter` otrzymane z `npcs.astro`.

### `NpcListProvider.tsx`

- **Odpowiedzialność:** Przyjmie stan początkowy z `props`. Będzie zarządzał zmianami stanu i synchronizował je z parametrami URL po stronie klienta za pomocą `history.pushState`.

### `SecondaryNavbar.tsx` i `FilterTags.tsx`

- **Odpowiedzialność:** Zaimportują `SORT_OPTIONS` / `FILTER_TAGS` z `config.ts`, aby dynamicznie wyrenderować opcje w UI. Będą komunikować zmiany do `NpcListProvider` poprzez hook `useNpcListContext`.

### Pozostałe komponenty

- `NpcsPage.tsx`, `NpcGrid.tsx`, `NpcCard.tsx`, `NpcCardActions.tsx` i `InfiniteScrollTrigger.tsx` zostaną zaimplementowane zgodnie z założeniami, konsumując dane i logikę z dostarczonych hooków i kontekstu.

## 5. Typy

```typescript
// DTO (z src/types.ts, używane bezpośrednio)
import type { GetNpcListResponseDto, NpcListItemDto } from "@/types";

// ViewModels
export type SortValue = "newest" | "oldest";
export type FilterValue = "all" | "shop" | "keywords";

export interface SortOption {
  value: SortValue;
  label: string;
  params: { sort: "published_at"; order: "asc" | "desc" };
}

export interface FilterTag {
  value: FilterValue;
  label: string;
  params: { shopEnabled?: boolean; keywordsEnabled?: boolean };
}

// Typ dla wartości kontekstu
export interface NpcListContextValue {
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  filter: FilterTag;
  setFilter: (filter: FilterTag) => void;
}

// Typ stanu dla hooka useNpcList
export interface NpcListState {
  items: NpcListItemDto[];
  status: "idle" | "loading" | "loading-more" | "success" | "error";
  error: Error | null;
  nextCursor: string | null;
  hasMore: boolean;
}
```

## 6. Zarządzanie stanem

### `NpcListProvider` i `useNpcListContext` (Context + Hook)

- **Cel:** Centralne zarządzanie stanem sortowania i filtrowania.
- **Inicjalizacja:** Stan jest inicjowany z `props` (`initialSort`, `initialFilter`) przekazanych z serwera.
- **Aktualizacja:** Aktualizuje URL po stronie klienta przy zmianie stanu.

### `useNpcList` (Custom Hook)

- **Cel:** Abstrakcja logiki pobierania danych i paginacji.
- **Inicjalizacja:** Inicjalizowany z `initialData` z SSR.
- **Reaktywność:** Subskrybuje zmiany w `NpcListContext` i pobiera nowe dane, gdy `sort` lub `filter` ulegną zmianie.

## 7. Integracja API

- **Endpoint:** `GET /api/npcs`
- Hook `useNpcList` będzie budował zapytanie na podstawie stanu z `NpcListContext`.

## 8. Interakcje użytkownika

- **Zmiana sortowania/filtrowania:** Użytkownik wchodzi w interakcję z UI (`SecondaryNavbar`, `FilterTags`), co wywołuje funkcje `setSort`/`setFilter` z kontekstu. To aktualizuje stan w `NpcListProvider`, zmienia URL i powoduje, że `useNpcList` pobiera nowe dane.
- **Załadowanie strony:** `npcs.astro` na serwerze odczytuje URL, przygotowuje stan początkowy i dane, zapewniając płynną hydrację po stronie klienta.

## 9. Warunki i walidacja

- Walidacja parametrów URL odbywa się centralnie w `npcs.astro` przy użyciu funkcji z `config.ts`, co zapewnia odporność na nieprawidłowe dane wejściowe.

## 10. Obsługa błędów

- Hook `useNpcList` będzie odpowiedzialny za obsługę błędów z API i przekazywanie ich do komponentów UI, które wyświetlą odpowiednie komunikaty.

## 11. Kroki implementacji

1.  **Stworzenie Konfiguracji (`config.ts`):** Utworzenie pliku z definicjami (`SORT_OPTIONS`, `FILTER_TAGS`), wartościami domyślnymi i funkcjami pomocniczymi do parsowania.
2.  **Stworzenie Kontekstu (`NpcListProvider.tsx`):** Implementacja logiki przyjmowania `initial` propsów, zarządzania stanem i synchronizacji z URL po stronie klienta.
3.  **Modyfikacja `npcs.astro`:** Dodanie logiki po stronie serwera do parsowania URL (z użyciem `config.ts`), przygotowywania `initial` propsów i pobierania `initialData`.
4.  **Modyfikacja `RootProvider.tsx`:** Dodanie logiki warunkowego renderowania `NpcListProvider`.
5.  **Implementacja `useNpcList`:** Stworzenie hooka, który subskrybuje kontekst, jest inicjalizowany danymi z SSR i zarządza logiką pobierania danych.
6.  **Modyfikacja Komponentów UI (`SecondaryNavbar.tsx`, `NpcsPage.tsx`):** Podłączenie komponentów do konfiguracji (w celu renderowania opcji) i do kontekstu (w celu odczytu/aktualizacji stanu). `NpcsPage` zastąpi obecny placeholder.
7.  **Stworzenie pozostałych komponentów:** Implementacja `FilterTags`, `NpcGrid`, `NpcCard`, etc.
8.  **Testowanie:** Manualne przetestowanie całego przepływu, w tym odporności na nieprawidłowe parametry w URL, działania przycisku "wstecz" i poprawnej hydracji stanu z serwera.
