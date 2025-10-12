<conversation_summary>
<decisions>

1.  **Tabela `profiles`**: Utworzona, powiązana z `auth.users`, przechowuje `display_name` (w MVP nieunikalny, inicjowany z e-maila). Dostęp jest ściśle regulowany przez cztery dedykowane polityki RLS: publiczny odczyt (`SELECT`), aktualizacja tylko przez właściciela (`UPDATE`), oraz zablokowane operacje `INSERT` (obsługiwane przez trigger) i `DELETE`.
2.  **Identyfikatory**: Wszystkie klucze główne encji będą typu `uuid` z domyślną wartością `gen_random_uuid()`.
3.  **Struktura tabeli `npcs`**: Znormalizowana, płaska struktura bez użycia `JSONB`. Zawiera metadane (`status`, `script`, `implementation_type`), dane podstawowe, pełen zestaw znaczników czasu (`created_at`, `updated_at`, `published_at`, `first_published_at`), szczegółowe, znormalizowane atrybuty wyglądu NPC (`look_type`, `look_type_id`, `look_item_id`, `look_head`, `look_body`, `look_legs`, `look_feet`, `look_addons`, `look_mount`), wiadomości, flagi modułów i konfigurację sklepu. Nazwa (`name`) jest typu `TEXT`, a jej unikalność (case-insensitive) per właściciel jest zapewniona przez częściowy indeks unikalny na `(owner_id, lower(name))` z warunkiem `WHERE deleted_at IS NULL`.
4.  **Kaskadowy Soft Delete**: Mechanizm "miękkiego usuwania" jest standardem dla wszystkich kluczowych encji. Ustawienie znacznika czasu `deleted_at` na rekordzie w tabeli `npcs` uruchomi dedykowany trigger bazodanowy. Trigger ten będzie odpowiedzialny za propagację operacji ("kaskadowy soft delete"), ustawiając `deleted_at` na wszystkich powiązanych rekordach w tabelach zależnych (`npc_shop_items`, `npc_keywords`, `npc_keyword_phrases`). Aby wspierać ten mechanizm, wszystkie wymienione tabele podrzędne również posiadają kolumnę `deleted_at`. Fizyczne usuwanie rekordów jest zablokowane na poziomie RLS.
5.  **Relacje One-to-Many**: Moduł `Shop` jest zaimplementowany jako tabela `npc_shop_items`. Moduł `Keywords` został w pełni znormalizowany i składa się z dwóch tabel: `npc_keywords` (przechowującej np. komunikat odpowiedzi) oraz `npc_keyword_phrases` (przechowującej poszczególne frazy kluczowe). Unikalność fraz (case-insensitive) w obrębie jednego słowa kluczowego jest gwarantowana w sposób deklaratywny za pomocą standardowego ograniczenia `UNIQUE` na tabeli `npc_keyword_phrases`, wykorzystującego funkcję `lower()`.
6.  **Walidacja i Limity**: Ograniczenia (np. ~255 pozycji w sklepie/keywords) są egzekwowane przez triggery. Integralność danych — w tym wymagane pola, zakresy wartości oraz limity długości dla nazw i komunikatów (do 255 znaków) — jest zapewniona przez `CHECK` i `NOT NULL constraints`. Dodatkowo, dla atrybutów wyglądu NPC zaimplementowane zostaną dedykowane `CHECK constraints`, które będą weryfikować logikę warunkową (np. `look_item_id` musi być `NULL` gdy `look_type` to `'player'` lub `'monster'`) oraz precyzyjne zakresy wartości (np. `look_head BETWEEN 0 AND 132`, `look_addons BETWEEN 0 AND 3`, `look_mount >= 0`).
7.  **Bezpieczeństwo**: Row-Level Security (RLS) jest włączone domyślnie dla wszystkich tabel aplikacyjnych. Polityki dla tabeli `npcs` precyzyjnie definiują dostęp właścicielowi oraz publiczny (w zależności od statusu publikacji). Kluczowym założeniem bezpieczeństwa jest hermetyzacja danych: polityki RLS na wszystkich tabelach zależnych (`npc_shop_items`, `npc_keywords`, `npc_keyword_phrases`) **muszą** weryfikować status nadrzędnego rekordu NPC, zezwalając na dostęp tylko wtedy, gdy `npcs.deleted_at IS NULL`. Dodatkowo, kolumna `owner_id` w tabeli `npcs` jest niezmienna po utworzeniu rekordu, co jest gwarantowane przez dedykowany trigger.
8.  **Indeksowanie**: Zastosowano dedykowane, częściowe indeksy (partial indexes), które jawnie wykluczają usunięte rekordy (warunek `WHERE deleted_at IS NULL`). Strategia ta dotyczy zarówno tabeli `npcs`, jak i wszystkich tabel zależnych (`npc_shop_items`, `npc_keywords`, `npc_keyword_phrases`), optymalizując zapytania i zapewniając spójność unikalnych kluczy. Zoptymalizowano także dostęp do danych podrzędnych przez indeksy na kluczach obcych, w tym złożony indeks `(npc_id, item_type)` dla tabeli `npc_shop_items`.
9.  **Idempotentność**: Operacja tworzenia NPC jest zabezpieczona przez unikalny `client_request_id`, aby zapobiec duplikatom przy ponawianiu prób.
10. **Walidacja przy publikacji**: Implementacja triggera (`BEFORE UPDATE ON npcs`), który przed zmianą statusu na `published` weryfikuje integralność danych wg. precyzyjnej listy kontrolnej. W przypadku niespełnienia któregokolwiek warunku, transakcja musi zostać przerwana. Lista warunków do sprawdzenia:
    - **A. Podstawowa integralność:**
      - Nazwa (`name`) nie może być pusta.
      - Muszą być spełnione warunki logiczne dla atrybutów wyglądu w zależności od `look_type` (np. `look_item_id` > 0 dla `'item'`, poprawne wartości `look_head` etc. dla `'player'`).
    - **B. Walidacja aktywnych modułów:** (dla wszystkich poniższych warunków, "aktywny" rekord oznacza taki, w którym `deleted_at IS NULL`)
      - Jeśli `shop_enabled` = `true`, musi istnieć co najmniej jeden aktywny przedmiot w `npc_shop_items`.
      - Jeśli `keywords_enabled` = `true`, musi istnieć co najmniej jedno aktywne słowo kluczowe w `npc_keywords`, a każde z nich musi mieć co najmniej jedną aktywną frazę w `npc_keyword_phrases`.
    - **C. Weryfikacja stanu:**
      - Rekord nie może być oznaczony jako usunięty (`deleted_at` musi być `NULL`).
      - Trigger musi zarządzać znacznikami czasu `published_at` i `first_published_at` (ustawiając je na `NOW()` zgodnie z logiką pierwszego lub kolejnego wydania).
11. **Automatyzacja DB**: Aktualizacja kolumny `updated_at` będzie realizowana przez jedną, generyczną funkcję triggera, przypisaną do wszystkich wymagających tego tabel. Dodatkowo, osobny trigger będzie odpowiedzialny za automatyczne tworzenie profilu użytkownika.
12. **Typy danych**: Wykorzystano dedykowane typy `ENUM` dla statusów, systemów i typów wyglądu NPC. Porównania case-insensitive są realizowane z użyciem standardowej funkcji `lower()` w indeksach unikalnych, co eliminuje potrzebę stosowania rozszerzenia `citext`.
13. **Dokumentacja schematu**: Zatwierdzono wymóg dokumentowania schematu (tabel, kolumn, typów) bezpośrednio w PostgreSQL za pomocą poleceń `COMMENT ON`, aby ułatwić jego utrzymanie.
    </decisions>

<matched_recommendations>

1.  **Normalizacja zamiast JSONB**: Kluczowe parametry kreatora NPC (wygląd, wiadomości, konfiguracja modułów) powinny być przechowywane w dedykowanych, silnie typowanych kolumnach, a nie w jednej kolumnie `JSONB`. Zapewnia to integralność danych i wydajność zapytań.
2.  **RLS jako podstawa bezpieczeństwa**: Dostęp do danych na poziomie wiersza powinien być kontrolowany przez polityki Row-Level Security, a nie wyłącznie przez logikę aplikacyjną. Zapewnia to spójne i solidne zabezpieczenie danych bezpośrednio w bazie.
3.  **Triggery do kluczowych walidacji**: Logika biznesowa krytyczna dla integralności danych, taka jak sprawdzanie kompletności NPC przed publikacją czy egzekkowanie limitów, powinna być zaimplementowana za pomocą triggerów.
4.  **Częściowe indeksy (Partial Indexes)**: W celu optymalizacji wydajności zapytań filtrujących dane (np. tylko opublikowane i nieusunięte NPC), należy stosować indeksy częściowe, które obejmują tylko odpowiedni podzbiór danych.
5.  **Użycie standardowych mechanizmów dla unikalności case-insensitive**: Dla pól, które muszą być unikalne niezależnie od wielkości liter (np. frazy kluczowe, nazwy NPC), należy używać standardowego typu `TEXT` w połączeniu z funkcją `lower()` w unikalnych indeksach. Takie podejście eliminuje zależność od rozszerzenia `citext` i zwiększa przenośność schematu.
6.  **Idempotency Key dla operacji `Create`**: Aby zapobiec tworzeniu duplikatów zasobów w przypadku problemów sieciowych i ponawiania prób, operacje `INSERT` powinny być chronione kluczem idempotencji.
    </matched_recommendations>

<database_planning_summary>
Na podstawie analizy wymagań PRD oraz szczegółowej sesji Q&A, projekt bazy danych dla MVP Jiddo NPC Generator został w pełni zdefiniowany. Baza danych będzie oparta na PostgreSQL w ramach usługi Supabase, z silnym naciskiem na integralność danych, bezpieczeństwo i wydajność od samego początku.

**Kluczowe Encje i Relacje:**

- **`profiles`**: Tabela przechowująca publiczne dane użytkowników, powiązana relacją 1-do-1 z `auth.users` Supabase.
- **`npcs`**: Centralna tabela aplikacji. Przechowuje wszystkie kluczowe informacje o NPC w znormalizowanej, płaskiej strukturze, włączając w to status (`draft`/`published`), typ implementacji (`xml`), skrypt (`default.lua`), szczegółowe atrybuty wyglądu oraz pełen cykl życia (znaczniki czasu). Każdy NPC jest powiązany z właścicielem (`owner_id`).
- **`npc_shop_items`**: Tabela przechowująca przedmioty do kupna/sprzedaży w module sklepu, połączona relacją one-to-many z `npcs`.
- **`npc_keywords`**: Tabela przechowująca definicje słów kluczowych (np. komunikat odpowiedzi), połączona relacją one-to-many z `npcs`.
- **`npc_keyword_phrases`**: Nowa tabela przechowująca poszczególne frazy (synonimy) dla każdego słowa kluczowego. Każda fraza jest osobnym wierszem, co stanowi w pełni znormalizowany model. Tabela jest połączona relacją one-to-many z `npc_keywords`.

**Schemat i Typy Danych:**

- Schemat unika `JSONB` na rzecz silnie typowanych, znormalizowanych kolumn, co ułatwia walidację i zapytania.
- Wykorzystywane są dedykowane typy `ENUM` (`npc_status`, `npc_system`, `npc_look_type` etc.) w celu zapewnienia spójności wartości.
- Porównania case-insensitive są realizowane z użyciem standardowej funkcji `lower()` w indeksach unikalnych, co eliminuje potrzebę stosowania rozszerzenia `citext`.

**Bezpieczeństwo i Integralność Danych:**

- Wszystkie tabele są chronione przez Row-Level Security (RLS), z precyzyjnie zdefiniowanymi politykami. Tabela `profiles` posiada cztery dedykowane reguły (publiczny odczyt, edycja przez właściciela, blokada `INSERT`/`DELETE`), a dostęp do pozostałych zasobów jest uzależniony od właściciela i statusu publikacji. Dostęp do danych w tabelach zależnych jest dodatkowo chroniony przez weryfikację statusu `deleted_at` nadrzędnego rekordu NPC.
- Soft delete (przez `deleted_at`) jest standardem, a dedykowany trigger zapewnia kaskadowe propagowanie tej operacji na dane zależne. Fizyczne usuwanie danych jest zablokowane.
- Klucze obce z `ON DELETE RESTRICT` zapewniają integralność referencyjną między tabelami.
- Krytyczne reguły biznesowe, takie jak walidacja przed publikacją i egzekwowanie limitów, są zaimplementowane za pomocą triggerów, co czyni je niezależnymi od logiki aplikacji.

**Wydajność i Skalowalność:**

- Zdefiniowano strategię indeksowania opartą na indeksach częściowych z warunkiem `WHERE deleted_at IS NULL` dla wszystkich encji wspierających soft-delete. Optymalizuje to najczęstsze zapytania (listy publiczne, listy prywatne) i zapewnia integralność unikalnych kluczy.
- Paginacja kursorowa ("infinite scroll") jest wspierana przez stabilne sortowanie z użyciem złożonego klucza (`published_at`, `id`).
- Kwestie takie jak partycjonowanie czy FTS (Full-Text Search) zostały świadomie odłożone na przyszłość, aby uniknąć over-engineeringu w MVP.

**Automatyzacja i Dokumentacja:**

- Zastosowano triggery do automatyzacji zadań, takich jak aktualizacja `updated_at` (za pomocą jednej, generycznej funkcji) czy inicjalizacja `display_name` w profilu.
- Zalecono dokumentowanie schematu bezpośrednio w bazie danych za pomocą poleceń `COMMENT`, co ułatwi jego utrzymanie w przyszłości.
  </database_planning_summary>

<unresolved_issues>
Brak zidentyfikowanych nierozwiązanych kwestii. Wszystkie pytania postawione na etapie planowania zostały wyczerpująco omówione, a decyzje projektowe zostały podjęte i zatwierdzone, co pozwala na przejście do kolejnego etapu rozwoju.
</unresolved_issues>
</conversation_summary>
