# Plan implementacji widoku: Kreator NPC

## 1. Przegląd

Widok Kreatora NPC jest **kluczowym narzędziem w aplikacji**, umożliwiającym użytkownikom tworzenie nowych oraz edytowanie istniejących postaci NPC. Składa się z podglądu generowanego kodu XML i statycznego skryptu LUA po lewej stronie oraz aside panel po prawej stronie z bogatym i rozbudowanym formularzem konfiguracyjnym z parametrami NPC i modułami (Sklep, Słowa Kluczowe) - każdy moduł to osobna sekcja w formularzu kreatora aktywowana poprzez włączenie modułu przez checkbox. Widok obsługuje asynchroniczne generowanie plików, zarządzanie złożonym stanem formularza oraz zapewnia interaktywny feedback dla użytkownika, prowadząc go przez proces od wstępnego szkicu do gotowego NPC.

## 2. Routing widoku

Widok będzie dostępny pod dwiema dynamicznymi ścieżkami, obsługiwanymi przez jeden plik Astro:

- **Ścieżka pliku:** `src/pages/creator/[[...npcId]].astro`
- **Tworzenie nowego NPC:** `/creator` (`npcId` jest niezdefiniowane)
- **Edycja istniejącego NPC:** `/creator/[npcId]` (gdzie `[npcId]` to UUID postaci)

Strona będzie korzystać z głównego layoutu aplikacji poprzez funkcję `createRootPage` z `src/components/AppShell.tsx`, zapewniając spójny wygląd z resztą aplikacji.

## 3. Struktura komponentów

Hierarchia komponentów została zaprojektowana w sposób modułowy, aby oddzielić logikę od prezentacji i ułatwić zarządzanie złożonością widoku.

- **Komponenty istniejące do ponownego wykorzystania:**
  - `AppShell.tsx`: Główna powłoka aplikacji, zapewniająca nawigację i spójny layout.
  - `NpcCodePreview.tsx`: Komponent z zakładkami do wyświetlania podglądu kodu XML i LUA. Zostanie rozszerzony o wyświetlanie wskaźnika ładowania.
  - Komponenty Shadcn UI z `src/components/ui/*` (Button, Input, Card, Tabs, Spinner, etc.).

  Pamiętaj, że zawsze możesz dodać nowy komponent z biblioteki Shadcn UI używając polecenia:

  ```bash
  npx shadcn@latest add [component-name]
  ```

  Pełna lista komponentów dostępnych w Shadcn UI znajdziesz w pliku `.cursor/rules/ui-shadcn-helper.mdc`.

- **Nowe komponenty do utworzenia:**

```
- CreatorPage.astro (strona)
  - CreatorApp.tsx (główny komponent widoku)
    - aside panel boczny z formularzem kreatora
      - CreatorForm.tsx (główny formularz)
        - NpcParametersFormSection.tsx (sekcja z podstawowymi danymi NPC)
        - ShopItemsEditor.tsx (zarządzanie przedmiotami w sklepie)
          - ShopItemCard.tsx (pojedynczy przedmiot)
        - KeywordsEditor.tsx (zarządzanie słowami kluczowymi)
          - KeywordCard.tsx (pojedynczy wpis słowa kluczowego)
        - CreatorActionToolbar.tsx (dolny pasek z przyciskami akcji)
    - main
      - NpcCodePreview.tsx (istniejący, do wykorzystania, będzie rozszerzony o wyświetlanie wskaźnika ładowania)
    - GenerationStatusPoller.tsx (komponent niewizualny do odpytywania o status generacji)
```

## 4. Szczegóły komponentów

### CreatorApp.tsx

- **Opis:** Główny, nadrzędny komponent React dla widoku kreatora. Odpowiedzialny za pobieranie danych NPC w trybie edycji, zarządzanie stanem za pomocą hooka `useNpcCreator` oraz renderowanie dwukolumnowego layoutu z `aside` panelem bocznym z formularzem kreatora i panelem głównym z podglądem generowanego kodu XML i statycznego skryptu LUA.
- **Główne elementy:** `div` z `grid grid-cols-1 md:grid-cols-3 gap-4`, zawierający `aside` dla `CreatorForm` i `main` dla `NpcCodePreview`.
- **Kluczowe zadania:**
  - Inicjalizacja hooka `useNpcCreator`.
  - Warunkowe renderowanie `GenerationStatusPoller` na podstawie stanu `generationState` z hooka.
  - Przekazanie `npcId` do hooka w celu rozróżnienia trybu `create`/`edit`.
  - Obsługa stanu ładowania (`isLoading`) i błędu (`error`) podczas pobierania danych NPC w trybie edycji, wyświetlając odpowiednio spinner lub komunikat błędu na całą stronę.
- **Obsługiwane interakcje:** Brak bezpośrednich. Komponent orkiestruje przepływ danych i stanu między dziećmi.
- **Typy:** `GetNpcDetailsResponseDto` (dane wejściowe).
- **Propsy:** `npcId?: string`.

### CreatorForm.tsx

- **Opis:** Panel boczny (`aside`) zawierający cały formularz. Wykorzystuje `react-hook-form` do zarządzania stanem i walidacją Zod i zodResolver. Renderuje sekcje formularza i pasek akcji (sticky bottom bar przycisków akcji).
- **Główne elementy:** Znacznik `<form>` opakowujący `NpcParametersFormSection`, `ShopItemsEditor`, `KeywordsEditor` oraz `CreatorActionToolbar`.
- **Uwagi implementacyjne:**
- Jeżeli checkbox modułu jest zaznaczony, to sekcja modułu powinna być widoczna.
- Jeżeli checkbox modułu jest niezaznaczony, to sekcja modułu powinna być niewidoczna a stan modułu powinien być czyszczony (po ponownej aktywacji checkboxa sekcja modułu powinna być widoczna i stan modułu powinien czyścić się do domyślnego stanu).
  - Należy opakować zawartość formularza w komponent `<ScrollArea>` z `shadcn/ui`, aby zapewnić użyteczność na mniejszych wysokościach ekranu.
- **Obsługiwane interakcje:** Przesłanie formularza (submit).
- **Typy:** `CreatorFormData`.
- **Propsy:** Otrzymuje `form` (instancję z `useForm`) i `generationState` z `useNpcCreator`.

### NpcParametersFormSection.tsx

- **Opis:** Sekcja formularza z podstawowymi polami NPC (nazwa, wygląd, itp.). Zorganizowana dla lepszej czytelności `CreatorForm`.
- **Główne elementy:** Komponenty `FormField`, `FormControl`, `FormLabel`, `Input` z `shadcn/ui` dla każdego pola.
- **Dodatkowe elementy:**
  - Oprócz pól podstawowych, sekcja ta będzie zawierać checkboxy dla wszystkich modułów (tylko 2 będą klikalne - Shop oraz Keywords, ponieważ te moduły są wspierane w ramach MVP). Checkboxy będą kontrolować widoczność modułów `ShopItemsEditor` i `KeywordsEditor`. Każdy moduł to osobna sekcja w formularzu kreatora.
- **Obsługiwane interakcje:** Wprowadzanie danych przez użytkownika.
- **Typy:** Część `CreatorFormData`.
- **Propsy:** `control` (z `react-hook-form`), `disabled` (boolean).

### ShopItemsEditor.tsx & ShopItemCard.tsx

- **Opis:** Komponent do dynamicznego zarządzania listą przedmiotów w sklepie (`buy`/`sell`). Wykorzystuje hook `useFieldArray` z `react-hook-form`.
- **Główne elementy:** Dwie sekcje (kupno/sprzedaż), każda z przyciskiem "Dodaj przedmiot" i listą komponentów `ShopItemCard`. Każdy `ShopItemCard` to zestaw pól (`Input`) dla jednego przedmiotu oraz przycisk "Usuń".
- **Obsługiwane interakcje:** Dodawanie, usuwanie i edycja przedmiotów.
- **Typy:** `CreatorFormData['shop_items']`.
- **Propsy:** `control`, `register`, `errors` (z `react-hook-form`), `disabled`.

### KeywordsEditor.tsx & KeywordCard.tsx

- **Opis:** Komponent do dynamicznego zarządzania listą słów kluczowych i powiązanych z nimi fraz. Używa zagnieżdżonego `useFieldArray` (jeden dla wpisów, drugi dla fraz w ramach wpisu).
- **Główne elementy:** Przycisk "Dodaj słowo kluczowe" i lista `KeywordCard`. `KeywordCard` zawiera pole `textarea` dla odpowiedzi, listę pól `Input` dla fraz z przyciskami "Usuń frazę" oraz przycisk "Usuń słowo kluczowe".
- **Obsługiwane interakcje:** Dodawanie/usuwanie słów kluczowych, dodawanie/usuwanie fraz w ramach słowa kluczowego.
- **Typy:** `CreatorFormData['keywords']`.
- **Propsy:** `control`, `register`, `errors` (z `react-hook-form`), `disabled`.

### CreatorActionToolbar.tsx

- **Opis:** Przyklejony do dołu panelu bocznego pasek z głównymi przyciskami akcji. Jego stan (widoczne przyciski, ich status `disabled`) jest dynamicznie kontrolowany na podstawie stanu formularza i trybu kreatora.
- **Główne elementy:** Komponenty `Button` z `shadcn/ui`.
- **Obsługiwane interakcje:** Kliknięcie przycisku "Zapisz wersję roboczą", "Zapisz zmiany", "Generuj XML".
- **Szczegółowa logika stanu przycisków:**
  - **Tryb `create` (nowy NPC):**
    - **"Zapisz wersję roboczą"**: Widoczny zawsze. Staje się aktywny (`disabled={false}`), gdy formularz jest poprawny (`formState.isValid`).
  - **Tryb `edit` (istniejący NPC):**
    - **"Zapisz zmiany"**: Widoczny tylko, gdy formularz ma niezapisane zmiany (`formState.isDirty`). Staje się aktywny, gdy formularz jest poprawny (`formState.isValid`).
    - **"Generuj ponownie XML"**: Widoczny tylko, gdy formularz nie ma niezapisanych zmian (`!formState.isDirty`). Staje się aktywny, gdy formularz jest poprawny (`formState.isValid`) ORAZ gdy nie trwa już inne zadanie generowania (`generationState.status !== 'processing'`).
  - Wszystkie przyciski powinny być nieaktywne podczas trwania operacji (np. `formState.isSubmitting` lub `generationState.status === 'processing'`).
- **Warunki walidacji:** Przyciski zapisu/generowania są aktywne tylko, gdy formularz jest poprawny (`isValid`). Przycisk "Generuj" jest nieaktywny, gdy formularz ma niezapisane zmiany (`isDirty`).
- **Propsy:** `mode: 'create' | 'edit'`, `formState: { isDirty, isValid, isSubmitting }`, `generationState`, `onSubmit: (data) => void`, `onGenerate: (data) => void`.

### GenerationStatusPoller.tsx

- **Opis:** Komponent niewizualny (renderujący `null`), odpowiedzialny za cykliczne odpytywanie endpointu statusu zadania generowania. Jego zadaniem jest implementacja wzorca pollingu po stronie klienta.
- **Główne elementy:** Nie renderuje żadnych elementów DOM. Cała logika zawarta jest w hooku `useEffect`.
- **Logika wewnętrzna:**
  - Przy zamontowaniu, komponent uruchamia `setInterval`, który co określony czas (`intervalMs`) wysyła żądanie `GET` na endpoint `/api/npcs/{npcId}/generation-jobs/{jobId}`.
  - Po otrzymaniu odpowiedzi:
    - Jeśli `status` to `succeeded` lub `failed`, interwał jest czyszczony (`clearInterval`), a odpowiednia funkcja zwrotna (`onSuccess` lub `onError`) jest wywoływana z danymi.
    - Jeśli `status` to `processing` lub `queued`, polling jest kontynuowany.
  - `useEffect` powinien zawierać funkcję czyszczącą, która zatrzymuje interwał w przypadku odmontowania komponentu, aby uniknąć wycieków pamięci.
- **Propsy:**
  - `npcId: string` (Wymagany)
  - `jobId: string` (Wymagany)
  - `onSuccess: (response: GenerationJobStatusResponseDto) => void` (Wymagany)
  - `onError: (error: any) => void` (Wymagany)
  - `intervalMs?: number` (Opcjonalny, domyślnie np. `2500`)

## 5. Typy

Głównym typem zarządzającym stanem formularza będzie `CreatorFormData`, wyinferowany z schematu Zod, co zapewni pełne bezpieczeństwo typów i walidację.

- **Uwagi implementacyjne do schematu `CreatorFormSchema`:**
  - Schemat przedstawiony w planie jest bazowy. Należy go rozszerzyć o dwa pola boolean: `is_shop_active` oraz `is_keywords_active`, które będą powiązane z przełącznikami w UI.
  - Należy zaimplementować walidację warunkową za pomocą metody `.refine()` z Zod. Logika ta powinna sprawdzać:
    - Jeśli `is_shop_active` jest `true`, to pole `shop_items` musi być tablicą zawierającą co najmniej jeden element.
    - Jeśli `is_keywords_active` jest `true`, to pole `keywords` musi być tablicą zawierającą co najmniej jeden element.
  - Pola `shop_items` i `keywords` powinny być opcjonalne (`.optional()`) w bazowym schemacie, aby walidacja `.refine()` mogła działać poprawnie.

```typescript
// Schemat Zod do walidacji i inferencji typu
import { z } from "zod";

const ShopItemSchema = z.object({
  name: z.string().min(1, "Nazwa przedmiotu jest wymagana."),
  item_id: z.coerce.number().int().positive("ID przedmiotu musi być dodatnią liczbą całkowitą."),
  price: z.coerce.number().int().nonnegative("Cena musi być liczbą nieujemną."),
  subtype: z.coerce.number().int().optional(),
  charges: z.coerce.number().int().optional(),
  real_name: z.string().optional(),
  container_item_id: z.coerce.number().int().optional(),
  list_type: z.enum(["buy", "sell"]), // Pole pomocnicze do logiki w komponencie
});

const KeywordSchema = z.object({
  response_text: z.string().min(1, "Tekst odpowiedzi jest wymagany."),
  phrases: z.array(z.string().min(1, "Fraza nie może być pusta.")).min(1, "Musi istnieć co najmniej jedna fraza."),
});

export const CreatorFormSchema = z.object({
  // Podstawowe parametry NPC (zgodnie z `types.ts` i API)
  name: z.string().min(3, "Nazwa musi mieć co najmniej 3 znaki.").max(50),
  look_type: z.coerce.number().int().positive(),
  look_head: z.coerce.number().int().min(0),
  look_body: z.coerce.number().int().min(0),
  look_legs: z.coerce.number().int().min(0),
  look_feet: z.coerce.number().int().min(0),
  look_addons: z.coerce.number().int().min(0).max(3),

  // Moduły
  shop_items: z.array(ShopItemSchema),
  keywords: z.array(KeywordSchema),
});

export type CreatorFormData = z.infer<typeof CreatorFormSchema>;
```

## 6. Zarządzanie stanem

Cała złożona logika stanu, operacje API, obsługa formularza i cykl życia generowania NPC zostaną zamknięte w niestandardowym hooku `useNpcCreator`.

- **`useNpcCreator(npcId?: string)`:**
  - **Stan wewnętrzny:**
    - Stan ładowania i błędu dla początkowego pobierania danych (`isLoading`, `error`).
    - Tryb pracy (`mode: 'create' | 'edit'`).
    - Stan procesu generowania (`generationState: { status, jobId }`).
    - Instancja formularza z `useForm<CreatorFormData>` z `zodResolver(CreatorFormSchema)`.
  - **Szczegóły implementacji `useNpcCreator`:**
    - **`handleSaveDraft`**: Ta funkcja powinna najpierw wysłać żądanie `POST /api/npcs` z podstawowymi danymi NPC. Po otrzymaniu w odpowiedzi `npcId`, powinna sekwencyjnie wysłać żądania `PUT` dla `shop-items` i `keywords`, ale tylko jeśli odpowiednie moduły są aktywne i zawierają dane. Po pomyślnym zakończeniu wszystkich operacji, następuje programowe przekierowanie na stronę edycji (`/creator/{npcId}`).
    - **`handleSaveChanges`**: Ta funkcja musi być zoptymalizowana. Powinna sprawdzać, które części formularza zostały zmienione (`form.formState.dirtyFields`). Żądanie `PATCH /api/npcs/{npcId}` powinno być wysyłane tylko jeśli zmieniły się podstawowe dane. Podobnie, żądania `PUT` do `shop-items` i `keywords` powinny być wysyłane warunkowo. Po pomyślnym zapisie, kluczowe jest wywołanie `form.reset(data)` z nowymi danymi, aby zresetować stan `isDirty` do `false`.
    - **`handleGenerate`**: Uruchamia żądanie `POST /.../generate` i aktualizuje `generationState`, co powoduje zamontowanie komponentu `GenerationStatusPoller` w `CreatorApp`.
    - **Obsługa stanu generowania**: Hook powinien eksponować funkcje do obsługi sukcesu i błędu pollingu, które będą przekazywane jako propsy do `GenerationStatusPoller`. Funkcje te będą odpowiedzialne za aktualizację `generationState` (np. zapisanie finalnego XML, ustawienie statusu na `succeeded` lub `failed`).
  - **Efekty:**
    - **(NOWY KRYTYCZNY EFEKT)** Należy zaimplementować `useEffect`, który będzie obserwował (`form.watch`) zmiany w polach `is_shop_active` i `is_keywords_active`. Gdy wartość któregoś z tych pól zmieni się na `false`, hook powinien wywołać `form.setValue` dla odpowiedniej tablicy (`shop_items` lub `keywords`), ustawiając jej wartość na pustą tablicę `[]`, aby wyczyścić stan odznaczonego modułu.
    - `useEffect` do pobierania danych NPC, jeśli `npcId` istnieje.
    - `useEffect` do resetowania formularza po załadowaniu danych.
    - `useEffect` do obsługi ostrzeżenia `beforeunload`, gdy formularz jest "brudny" (`isDirty`).
  - **Funkcje zwracane:**
    - Obiekt zawierający: `form`, `mode`, `generationState`, `isLoading`, `error` oraz funkcje obsługi zdarzeń: `handleSaveDraft`, `handleSaveChanges`, `handleGenerate`.

## 7. Integracja API

Interakcja z backendem będzie realizowana za pomocą funkcji-wrapperów na `fetch`, wywoływanych z hooka `useNpcCreator`.

- **`GET /api/npcs/{npcId}`:** Pobranie danych do edycji. Zwraca `GetNpcDetailsResponseDto`.
- **`POST /api/npcs`:** Zapis nowego NPC jako wersji roboczej.
  - **Request:** `CreateNpcCommandInput` (mapowany z `CreatorFormData`).
  - **Response:** `NpcEntity` (częściowe).
- **`PATCH /api/npcs/{npcId}`:** Zapis zmian w podstawowych danych NPC.
  - **Request:** `UpdateNpcCommandInput` (mapowany z `CreatorFormData`).
- **`PUT /api/npcs/{npcId}/shop-items`:** Hurtowe zastąpienie przedmiotów w sklepie.
  - **Request:** `BulkReplaceNpcShopItemsCommandInput` (mapowany z `CreatorFormData.shop_items`).
- **`PUT /api/npcs/{npcId}/keywords`:** Hurtowe zastąpienie słów kluczowych.
  - **Request:** `BulkReplaceNpcKeywordsCommandInput` (mapowany z `CreatorFormData.keywords`).
- **`POST /api/npcs/{npcId}/generate`:** Uruchomienie zadania generowania XML.
  - **Request:** `TriggerNpcGenerationCommandInput`.
  - **Response:** `{ jobId, ... }`.
- **`GET /api/npcs/{npcId}/generation-jobs/{jobId}`:** Sprawdzanie statusu zadania generowania (polling).

## 8. Interakcje użytkownika

- **Wypełnianie formularza:** Walidacja odbywa się w czasie rzeczywistym, komunikaty o błędach pojawiają się pod polami. Stan przycisków w `CreatorActionToolbar` jest na bieżąco aktualizowany.
- **Zapis wersji roboczej:** Użytkownik klika "Zapisz wersję roboczą". Przycisk pokazuje spinner. Po sukcesie następuje przekierowanie na `/creator/{npcId}`.
- **Zapis zmian:** Użytkownik klika "Zapisz zmiany". Przycisk pokazuje spinner. Po sukcesie formularz jest oznaczany jako "czysty" (`isDirty: false`), a przyciski wracają do stanu początkowego edycji.
- **Generowanie XML:** Użytkownik klika "Generuj XML". Formularz staje się nieaktywny (`disabled`), a w panelu podglądu XML pojawia się spinner. Po zakończeniu (sukces lub błąd) formularz jest odblokowywany.
- **Próba opuszczenia strony:** Jeśli formularz ma niezapisane zmiany, przeglądarka wyświetli natywne okno dialogowe z ostrzeżeniem.

## 9. Warunki i walidacja

- **Poziom formularza:** `CreatorActionToolbar` jest głównym strażnikiem. Przyciski akcji są nieaktywne, jeśli:
  - Formularz jest niewypełniony poprawnie (`!isValid`).
  - Trwa operacja zapisu/generowania (`isSubmitting` lub `generationState.status === 'pending'`).
  - Użytkownik próbuje generować XML z niezapisanymi zmianami (`isDirty`).
- **Poziom pól:** Każde pole jest walidowane zgodnie ze schematem `CreatorFormSchema`. Komunikaty o błędach są wyświetlane pod odpowiednimi polami dzięki integracji `react-hook-form` z `shadcn/ui`.

## 10. Obsługa błędów

- **Błąd pobierania danych:** Jeśli `GET /api/npcs/{npcId}` zwróci błąd, `CreatorApp` wyświetli komponent błędu na całą stronę z możliwością ponowienia próby.
- **Błędy walidacji API:** Jeśli API odrzuci dane (np. błąd 400), hook `useNpcCreator` przechwyci błąd, wyświetli powiadomienie typu "toast" (za pomocą `sonner`) z treścią błędu i pozostawi formularz w stanie do edycji.
- **Błędy generowania:** Zarówno błąd przy starcie generowania, jak i błąd zwrócony przez polling, zostaną zakomunikowane użytkownikowi za pomocą "toasta". Formularz zostanie odblokowany, aby umożliwić poprawki i ponowną próbę.
- **Błędy sieciowe:** Ogólne błędy sieciowe będą obsługiwane w podobny sposób, z wyświetleniem generycznego komunikatu w toaście.

## 11. Kroki implementacji

1.  **Struktura plików i routing:**
    - Utworzenie pliku routingu `src/pages/creator/[[...npcId]].astro`.
    - Stworzenie puste pliki dla wszystkich nowych komponentów i hooka `useNpcCreator` w odpowiednich katalogach (`src/components/pages/creator`, `src/hooks`).
2.  **Typy i Walidacja:**
    - W `src/lib/validators/npcValidators.ts` zaimplementować pełny schemat `CreatorFormSchema` wraz z walidacją warunkową `.refine()`.
3.  **Hook `useNpcCreator`:**
    - Zaimplementować szkielet hooka, inicjalizację `useForm` z `zodResolver` oraz stany `mode` i `generationState`.
    - Dodać logikę pobierania danych w trybie `edit` i resetowania formularza.
4.  **Komponenty UI (Bottom-Up):**
    - Zaimplementować `ShopItemCard` i `KeywordCard`.
    - Zaimplementować `ShopItemsEditor` i `KeywordsEditor` z użyciem `useFieldArray`.
    - Zaimplementować `NpcParametersFormSection` z przełącznikami modułów.
    - Zaimplementować `CreatorActionToolbar` ze szczegółową logiką stanu przycisków.
5.  **Złożenie widoku:**
    - Złożyć `CreatorForm.tsx` z mniejszych sekcji, dodając `ScrollArea`.
    - Zaimplementować `CreatorApp.tsx`, integrując w nim `useNpcCreator`, `CreatorForm` i `NpcCodePreview`.
6.  **Logika zapisu:**
    - Wypełnić logikę `handleSaveDraft` i `handleSaveChanges` w `useNpcCreator`, włączając wywołania API, obsługę błędów (toasty) i logikę przekierowania/resetowania formularza.
7.  **Logika generowania (Polling):**
    - Wypełnić logikę `handleGenerate` w hooku.
    - Zaimplementować w pełni komponent `GenerationStatusPoller.tsx`.
    - Zintegrować `GenerationStatusPoller` z `CreatorApp`, przekazując mu odpowiednie propsy i funkcje zwrotne z `useNpcCreator`.
    - Zaktualizować `NpcCodePreview`, aby reagował na zmiany w `generationState` (wyświetlanie spinnera i finalnego XML).
8.  **Funkcje pomocnicze i finalizacja:**
    - Zaimplementować mechanizm ostrzegania `beforeunload` w `useNpcCreator`.
    - Dodać pełną obsługę błędów i stanów ładowania we wszystkich komponentach.
    - Przeprowadzić testy manualne dla obu trybów (`create` i `edit`), włączając w to przypadki brzegowe i scenariusze błędów.
