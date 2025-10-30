# Plan implementacji widoku: Szczegóły NPC (NPC Detail)

## 1. Przegląd

Widok "Szczegóły NPC" ma na celu prezentację wszystkich kluczowych informacji o konkretnym NPC. Umożliwia on publiczny wgląd w metadane oraz wygenerowany kod XML i LUA dla każdego opublikowanego NPC. Dla właściciela danego zasobu, widok dodatkowo udostępnia kluczowe akcje zarządcze, takie jak edycja, publikacja oraz usunięcie NPC. Widok jest kluczowym elementem aplikacji, pełniącym zarówno funkcję informacyjną dla społeczności, jak i zarządczą dla twórców NPC.

## 2. Routing widoku

Widok będzie dostępny pod dynamiczną ścieżką URL, która zawiera identyfikator UUID konkretnego NPC.

- **Ścieżka:** `/npcs/[npcId]`
- **Plik implementacji:** `src/pages/npcs/[npcId].astro`

Strona będzie renderowana z użyciem `AppShell` i funkcji `createRootPage` (z `src/components/AppShell.tsx`), aby zapewnić spójność z resztą aplikacji. Plik `.astro` będzie eksportował komponent React opakowany w tę funkcję.

## 3. Struktura komponentów

Widok zostanie zbudowany w oparciu o architekturę komponentową. Komponenty interaktywne będą renderowane po stronie klienta (`client:load`).

```
src/pages/npcs/[npcId].astro
└── AppShell (istniejący, za pomocą `createRootPage`)
    └── NpcDetailView (nowy, kontener)
        ├── NpcMetadataPanel (nowy)
        │   ├── Badge (z Shadcn/ui)
        │   └── Tooltip (z Shadcn/ui)
        ├── NpcCodePreview (nowy)
        │   ├── Tabs (z Shadcn/ui)
        │   └── Button (z Shadcn/ui)
        └── NpcOwnerActions (nowy, reużywalny)
            ├── DropdownMenu (z Shadcn/ui)
            └── DeleteNpcModal (istniejący, z `src/components/features/npc/modal/DeleteNpcModal.tsx`)
```

**Uwaga:** Do dodawania brakujących komponentów z biblioteki Shadcn/ui należy użyć polecenia:

```bash
npx shadcn-ui@latest add [component-name]
```

## 4. Szczegóły komponentów

### NpcDetailView (Kontener)

- **Opis komponentu:** Główny komponent-kontener dla widoku. Odpowiedzialny za pobranie danych NPC z API na podstawie `npcId` z URL, zarządzanie stanem (ładowanie, błędy, dane NPC) oraz przekazywanie danych i handlerów zdarzeń do komponentów podrzędnych.
- **Główne elementy:** `div` otaczający `NpcMetadataPanel`, `NpcCodePreview` i `NpcOwnerActions`. Wyświetla `Spinner` w stanie ładowania lub komunikat o błędzie.
- **Propsy:** `npcId: string`.

### NpcMetadataPanel

- **Opis komponentu:** Komponent prezentacyjny wyświetlający metadane NPC. Powinien zachować wizualną spójność z istniejącym komponentem `NpcCard.tsx`, szczególnie w kwestii stylizacji nazwy, autora, statusu, modułów i dat.
- **Główne elementy:** Wizualny podgląd NPC (placeholder/obrazek, tak jak w `NpcCard.tsx`), lista definicji (`dl`, `dt`, `dd`), komponent `Badge` do wyświetlania statusu i aktywnych modułów, `Tooltip` do wyświetlania pełnej daty.
- **Propsy:** `metadata: NpcMetadataViewModel`.

### NpcCodePreview

- **Opis komponentu:** Wyświetla kod XML i LUA w zakładkach. Umożliwia kopiowanie zawartości każdej zakładki do schowka. Treść skryptu LUA jest pobierana ze statycznego pliku `src/assets/lua/default.lua`, który jest częścią projektu dla wersji MVP.
- **Główne elementy:** Komponent `Tabs` z Shadcn/ui z dwiema zakładkami. Każda zakładka zawiera blok `<pre><code>` oraz `Button` do kopiowania.
- **Propsy:** `code: NpcCodeViewModel`, `onCopy: (content: string) => void`.

### NpcOwnerActions (Reużywalny)

- **Opis komponentu:** Komponent ten powinien zostać zaimplementowany jako reużywalny, poprzez refaktoryzację istniejącej logiki z komponentu `NpcCard.tsx` (znajdującej się w pliku `src/components/pages/home/NpcCard.tsx` w liniach 95-134). Będzie on odpowiedzialny za wyświetlanie menu z akcjami dla właściciela NPC (Edytuj, Publikuj, Usuń) i zarządzanie stanem modala `DeleteNpcModal`.
- **Główne elementy:** `DropdownMenu` z opcjami. Opcja "Usuń" jest zintegrowana z istniejącym komponentem `DeleteNpcModal`.
- **Obsługiwane interakcje:**
  - `onEdit()`: Nawiguje do strony edytora.
  - `onPublish()`: Wywołuje funkcję publikacji.
  - `onDeleteSuccess()`: Callback wywoływany po pomyślnym usunięciu NPC.
- **Propsy:** `npc: Pick<NpcListItemDto, 'id' | 'name' | 'status'>`, `onPublish: () => Promise<void>`, `onDeleteSuccess: () => void`.

## 5. Typy

Do implementacji widoku potrzebne będą nowe, dedykowane typy `ViewModel`, które będą transformacją typów DTO (`NpcDetailResponseDto`) w celu ułatwienia ich konsumpcji przez komponenty.

```typescript
// Nowe typy ViewModel do umieszczenia w src/components/features/npc/detail/types.ts

// Reprezentuje pełny model danych dla widoku NpcDetailView
export interface NpcDetailViewModel {
  metadata: NpcMetadataViewModel;
  code: NpcCodeViewModel;
  ownerActions: OwnerActionsViewModel;
  isOwner: boolean;
}

// Dane dla panelu metadanych
export interface NpcMetadataViewModel {
  name: string;
  author: string;
  status: "draft" | "published";
  createdAt: string; // Sformatowana data
  updatedAt: string; // Sformatowana data
  publishedAt: string | null; // Sformatowana data
  activeModules: ("Shop" | "Keywords")[];
}

// Dane dla panelu z kodem
export interface NpcCodeViewModel {
  xml: string;
  lua: string;
  isCopyDisabled: boolean; // Jeśli contentSizeBytes > 256 KB
}

// Dane dla komponentu NpcOwnerActions
export interface OwnerActionsViewModel {
  id: string;
  name: string;
  status: "draft" | "published";
}
```

## 6. Zarządzanie stanem

Logika biznesowa i stan widoku zostaną zamknięte w dedykowanym custom hooku `useNpcDetail`.

**`useNpcDetail.ts`** (`src/hooks/useNpcDetail.ts`)

- **Cel:** Enkapsulacja całej logiki związanej z widokiem szczegółów NPC.
- **Zarządzany stan:**
  - `npc: NpcDetailViewModel | null`: Przechowuje dane NPC gotowe do wyświetlenia.
  - `isLoading: boolean`: Status ładowania danych.
  - `error: Error | null`: Informacje o błędzie.
- **Funkcje:**
  - `fetchNpc(npcId: string)`: Pobiera dane z `GET /api/npcs/{npcId}` oraz treść skryptu LUA z `src/assets/lua/default.lua`.
  - `publishNpc()`: Wysyła żądanie `POST /api/npcs/{npcId}/publish`.
  - `handleDeleteSuccess()`: Obsługuje przekierowanie po pomyślnym usunięciu.
  - `copyToClipboard(content: string)`: Kopiuje tekst do schowka.
- **Efekty uboczne:** Wywołanie `fetchNpc` w `useEffect`. Wyświetlanie powiadomień (toast) po operacjach API.

## 7. Integracja API

Integracja będzie opierać się na wywołaniach `fetch` do zdefiniowanych endpointów API Astro.

- **Pobieranie danych:**
  - **Endpoint:** `GET /api/npcs/{npcId}`
  - **Typ odpowiedzi:** `NpcDetailResponseDto`
- **Publikacja:**
  - **Endpoint:** `POST /api/npcs/{npcId}/publish`
  - **Typ żądania:** `{ confirmed: true }`
  - **Typ odpowiedzi:** `PublishNpcResponseDto`
- **Usuwanie:**
  - **Endpoint:** `DELETE /api/npcs/{npcId}`
  - **Typ odpowiedzi:** `DeleteNpcResponseDto`
  - **Logika:** Obsłużona wewnątrz reużywalnego komponentu `NpcOwnerActions` i istniejącego `DeleteNpcModal`.

## 8. Interakcje użytkownika

- **Wejście na stronę:** `useNpcDetail` pobiera dane, wyświetlany jest loader, a następnie renderowane są dane NPC.
- **Kopiowanie kodu:** Kliknięcie przycisku "Kopiuj" kopiuje zawartość aktywnej zakładki i wyświetla `toast.success`.
- **Akcje właściciela (Edytuj, Publikuj, Usuń):** Obsługiwane przez reużywalny komponent `NpcOwnerActions`, który zarządza logiką i stanem tych operacji, w tym wyświetlaniem modala `DeleteNpcModal`.

## 9. Warunki i walidacja

- **Dostęp do akcji właściciela:** Komponent `NpcOwnerActions` jest renderowany tylko gdy zalogowany użytkownik jest właścicielem NPC.
- **Widoczność przycisku "Publikuj":** Przycisk w `NpcOwnerActions` jest renderowany tylko, gdy `npc.status === 'draft'`.
- **Blokada kopiowania:** Przycisk "Kopiuj" jest `disabled`, gdy `npc.contentSizeBytes > 262144` (256 KB).
- **Walidacja usunięcia:** Obsłużona wewnątrz `DeleteNpcModal` (max. 256 znaków dla powodu).

## 10. Obsługa błędów

- **NPC nie znaleziony (404):** `NpcDetailView` wyświetli komunikat "Nie znaleziono NPC" z przyciskiem powrotu.
- **Błąd walidacji publikacji (422):** `useNpcDetail` wyświetli `toast.error` z komunikatem z API.
- **Inne błędy serwera (500) i sieciowe:** Zostaną obsłużone i poskutkują wyświetleniem generycznego komunikatu `toast.error`.

## 11. Kroki implementacji

1.  **Przegląd istniejących komponentów:** Przed implementacją, programista powinien użyć narzędzi do listowania plików (np. `ls -R src/components`), aby zapoznać się z istniejącymi komponentami, zwłaszcza w `src/components/ui` i `src/components/features`.
2.  **Refaktoryzacja `NpcOwnerActions`:**
    - Utworzyć nowy, reużywalny komponent `src/components/features/npc/actions/NpcOwnerActions.tsx`.
    - Przenieść logikę i JSX menu akcji właściciela z `NpcCard.tsx` (linie 95-134) do nowego komponentu.
    - Zaktualizować `NpcCard.tsx`, aby używał nowego komponentu `NpcOwnerActions`.
3.  **Stworzenie pliku strony:** Utworzyć plik `src/pages/npcs/[npcId].astro`. Zaimportować `NpcDetailView` oraz `createRootPage` i wyeksportować `export default createRootPage(NpcDetailView)`.
4.  **Struktura katalogów:** Utworzyć katalog `src/components/features/npc/detail/` na nowe komponenty widoku.
5.  **Implementacja typów:** Zdefiniować `ViewModel` w pliku `src/components/features/npc/detail/types.ts` zgodnie z sekcją 5.
6.  **Implementacja custom hooka `useNpcDetail`:** Stworzyć plik `src/hooks/useNpcDetail.ts`. Zaimplementować logikę pobierania danych NPC i statycznego pliku LUA, akcje i zarządzanie stanem.
7.  **Implementacja komponentów `NpcMetadataPanel` i `NpcCodePreview`:** Stworzyć komponenty prezentacyjne, dbając o spójność wizualną z `NpcCard.tsx`.
8.  **Implementacja kontenera `NpcDetailView`:** Zintegrować wszystkie części: użyć hooka `useNpcDetail` i przekazać dane do `NpcMetadataPanel`, `NpcCodePreview` oraz `NpcOwnerActions`.
9.  **Stylowanie:** Dodać style Tailwind CSS, aby uzyskać dwukolumnowy layout na desktopie i jednokolumnowy na mobile.
10. **Testowanie manualne:** Sprawdzić wszystkie historyjki użytkownika, w tym ścieżki błędów, działanie dla właściciela i zwykłego użytkownika oraz responsywność.
