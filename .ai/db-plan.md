1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

- **Typy pomocnicze (ENUM)**
  - `npc_status`: `draft`, `published`.
  - `npc_system`: `jiddo_tfs_1_5` (rozszerzalne na kolejne systemy).
  - `npc_implementation_type`: `xml`.
  - `npc_shop_mode`: `trade_window`, `talk_mode`.
  - `npc_shop_item_list_type`: `buy`, `sell`.
  - `npc_look_type`: `player`, `monster`, `item`.
- **profiles**
  - `id` uuid PRIMARY KEY REFERENCES `auth.users(id)` ON DELETE CASCADE.
  - `display_name` text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 255).
  - `created_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `updated_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
- **npcs**
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid().
  - `owner_id` uuid NOT NULL REFERENCES `profiles(id)` ON DELETE RESTRICT.
  - `client_request_id` uuid NOT NULL.
  - `status` npc_status NOT NULL DEFAULT 'draft'.
  - `system` npc_system NOT NULL DEFAULT 'jiddo_tfs_1_5'.
  - `implementation_type` npc_implementation_type NOT NULL DEFAULT 'xml'.
  - `name` text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255).
  - `script` text NOT NULL DEFAULT 'default.lua' CHECK (script = 'default.lua').
  - `walk_interval` integer NOT NULL CHECK (walk_interval BETWEEN 0 AND 65535).
  - `floor_change` boolean NOT NULL DEFAULT false.
  - `health_now` integer NOT NULL CHECK (health_now BETWEEN 0 AND 65535).
  - `health_max` integer NOT NULL CHECK (health_max BETWEEN 1 AND 65535 AND health_max >= health_now).
  - `look_type` npc_look_type NOT NULL.
  - `look_type_id` integer CHECK (look_type <> 'player' AND look_type <> 'monster' OR look_type_id > 0).
  - `look_item_id` integer CHECK (look_type = 'item' AND look_item_id > 0 OR look_type <> 'item' AND look_item_id IS NULL).
  - `look_head` integer CHECK (look_type = 'player' AND look_head BETWEEN 0 AND 132 OR look_type <> 'player' AND look_head IS NULL).
  - `look_body` integer CHECK (look_type = 'player' AND look_body BETWEEN 0 AND 132 OR look_type <> 'player' AND look_body IS NULL).
  - `look_legs` integer CHECK (look_type = 'player' AND look_legs BETWEEN 0 AND 132 OR look_type <> 'player' AND look_legs IS NULL).
  - `look_feet` integer CHECK (look_type = 'player' AND look_feet BETWEEN 0 AND 132 OR look_type <> 'player' AND look_feet IS NULL).
  - `look_addons` integer CHECK (look_type = 'player' AND look_addons BETWEEN 0 AND 3 OR look_type <> 'player' AND look_addons IS NULL).
  - `look_mount` integer CHECK (look_mount IS NULL OR look_mount >= 0).
  - `greet_message` text NOT NULL CHECK (char_length(greet_message) BETWEEN 1 AND 512).
  - `farewell_message` text NOT NULL CHECK (char_length(farewell_message) BETWEEN 1 AND 512).
  - `decline_message` text NOT NULL CHECK (char_length(decline_message) BETWEEN 1 AND 512).
  - `no_shop_message` text NOT NULL CHECK (char_length(no_shop_message) BETWEEN 1 AND 512).
  - `on_close_shop_message` text NOT NULL CHECK (char_length(on_close_shop_message) BETWEEN 1 AND 512).
  - `focus_enabled` boolean NOT NULL DEFAULT false.
  - `travel_enabled` boolean NOT NULL DEFAULT false.
  - `voice_enabled` boolean NOT NULL DEFAULT false.
  - `shop_enabled` boolean NOT NULL DEFAULT false.
  - `shop_mode` npc_shop_mode NOT NULL DEFAULT 'trade_window'.
  - `shop_message_buy` text CHECK (shop_message_buy IS NULL OR char_length(shop_message_buy) BETWEEN 1 AND 512).
  - `shop_message_sell` text CHECK (shop_message_sell IS NULL OR char_length(shop_message_sell) BETWEEN 1 AND 512).
  - `keywords_enabled` boolean NOT NULL DEFAULT false.
  - `content_size_bytes` integer NOT NULL DEFAULT 0 CHECK (content_size_bytes BETWEEN 0 AND 262144).
  - `published_at` timestamptz.
  - `first_published_at` timestamptz.
  - `created_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `updated_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `deleted_at` timestamptz.
- **npc_shop_items**
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid().
  - `npc_id` uuid NOT NULL REFERENCES `npcs(id)` ON DELETE RESTRICT.
  - `list_type` npc_shop_item_list_type NOT NULL.
  - `name` text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255).
  - `item_id` integer NOT NULL CHECK (item_id > 0).
  - `price` integer NOT NULL CHECK (price >= 0).
  - `subtype` integer NOT NULL DEFAULT 0 CHECK (subtype >= 0).
  - `charges` integer NOT NULL DEFAULT 0 CHECK (charges >= 0).
  - `real_name` text CHECK (real_name IS NULL OR char_length(real_name) BETWEEN 1 AND 255).
  - `container_item_id` integer CHECK (container_item_id IS NULL OR container_item_id > 0).
  - `created_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `updated_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `deleted_at` timestamptz.
- **npc_keywords**
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid().
  - `npc_id` uuid NOT NULL REFERENCES `npcs(id)` ON DELETE RESTRICT.
  - `response` text NOT NULL CHECK (char_length(response) BETWEEN 1 AND 512).
  - `sort_index` integer NOT NULL DEFAULT 0 CHECK (sort_index >= 0).
  - `created_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `updated_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `deleted_at` timestamptz.
- **npc_keyword_phrases**
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid().
  - `keyword_id` uuid NOT NULL.
  - `npc_id` uuid NOT NULL.
  - `phrase` text NOT NULL CHECK (char_length(phrase) BETWEEN 1 AND 64).
  - `created_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `updated_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).
  - `deleted_at` timestamptz.
  - FOREIGN KEY (`keyword_id`, `npc_id`) REFERENCES `npc_keywords(id, npc_id)` ON DELETE RESTRICT.
- **telemetry_events** (opcjonalnie do rejestrowania zdarzeń aplikacyjnych)
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid().
  - `event_type` text NOT NULL CHECK (char_length(event_type) BETWEEN 1 AND 255).
  - `user_id` uuid REFERENCES `profiles(id)` ON DELETE SET NULL.
  - `npc_id` uuid REFERENCES `npcs(id)` ON DELETE SET NULL.
  - `metadata` jsonb CHECK (jsonb_typeof(metadata) IN ('object', 'null')).
  - `created_at` timestamptz NOT NULL DEFAULT timezone('utc', now()).

2. Relacje między tabelami

- `profiles` 1→∞ `npcs` (właściciel zasobu).
- `npcs` 1→∞ `npc_shop_items` (pozycje sklepu przypisane do NPC).
- `npcs` 1→∞ `npc_keywords` (zestawy odpowiedzi katalogowane per NPC).
- `npc_keywords` 1→∞ `npc_keyword_phrases`; dodatkowo `npc_keyword_phrases` przechowują `npc_id`, aby egzekwować globalną unikalność fraz w obrębie NPC.
- `profiles` 1→∞ `telemetry_events`, `npcs` 1→∞ `telemetry_events` (jeśli tabela wykorzystywana).

3. Indeksy

- `profiles`: indeks na `lower(display_name)` (wyszukiwanie case-insensitive, bez wymuszenia unikalności).
- `npcs`: unikalny indeks częściowy `UNIQUE (owner_id, lower(name)) WHERE deleted_at IS NULL`; indeks opcjonalny `UNIQUE (client_request_id)`; indeks częściowy na `status`, `published_at`, `id` dla list publicznych (`WHERE deleted_at IS NULL AND status = 'published'`); indeksy na `updated_at` i `created_at` dla sortowania (`WHERE deleted_at IS NULL`).
- `npc_shop_items`: indeks częściowy na (`npc_id`, `list_type`, `id`) z warunkiem `deleted_at IS NULL`; złożony indeks (`npc_id`, `deleted_at`) do walidacji limitu; indeks na `item_id` dla zapytań raportowych.
- `npc_keywords`: indeks częściowy (`npc_id`, `deleted_at`, `sort_index`) dla ładowania ustawień; indeks częściowy `UNIQUE (npc_id, lower(response)) WHERE deleted_at IS NULL` (unikalne odpowiedzi, opcjonalnie jeśli potrzebne biznesowo).
- `npc_keyword_phrases`: indeks częściowy `UNIQUE (npc_id, lower(phrase)) WHERE deleted_at IS NULL`; indeks częściowy (`keyword_id`, `deleted_at`, `phrase`) dla szybkiego sprawdzania konfliktów; indeks (`keyword_id`, `npc_id`) wspierający klucz obcy.
- `telemetry_events`: indeks na (`event_type`, `created_at` DESC); indeks na `npc_id`; indeks na `user_id`.

4. Zasady PostgreSQL (RLS)

- `profiles`: `SELECT` dostępny publicznie (USING TRUE); `UPDATE` ograniczony do właściciela (`auth.uid() = id`); `INSERT` i `DELETE` zabronione; domyślna polityka odmowy włączona.
- `npcs`: polityka odczytu publicznego (`status = 'published' AND deleted_at IS NULL`) dla gości; polityka odczytu/aktualizacji właściciela (`auth.uid() = owner_id AND deleted_at IS NULL`); polityka wstawiania wymagająca dopasowania `auth.uid()` do `owner_id`; polityka soft delete (aktualizacja `deleted_at`) tylko dla właściciela; brak dostępu do wierszy usuniętych (`deleted_at IS NULL` w USING).
- `npc_shop_items`, `npc_keywords`, `npc_keyword_phrases`: polityki dziedziczące uprawnienia z nadrzędnego NPC (`EXISTS (SELECT 1 FROM npcs WHERE npcs.id = ... AND npcs.deleted_at IS NULL AND (npcs.status = 'published' OR npcs.owner_id = auth.uid()))`); operacje modyfikujące ograniczone do właściciela.
- `telemetry_events`: odczyt ograniczony do personelu (np. rola z claim `role = 'service'`); wstawianie dozwolone dla zalogowanych użytkowników; aktualizacja i delete zablokowane.
- Wszystkie tabele mają domyślną politykę odmowy (RLS ON + brak polityk → blokada), dlatego powyższe polityki muszą być zdefiniowane eksplicytnie.

5. Dodatkowe uwagi

- Wymagany jest trigger `updated_at` aktualizujący znacznik czasu na `profiles`, `npcs`, `npc_shop_items`, `npc_keywords`, `npc_keyword_phrases` przy każdej modyfikacji.
- Wymagany jest trigger na `auth.users` do automatycznego tworzenia rekordu w `profiles` przy rejestracji nowego użytkownika.
- Wymagany jest trigger `prevent_owner_change` na `npcs`, który blokuje modyfikację kolumny `owner_id` po utworzeniu rekordu.
- Soft delete w `npcs` powinien propagować `deleted_at` do tabel zależnych (`npc_shop_items`, `npc_keywords`, `npc_keyword_phrases`) poprzez trigger kaskadowy.
- Publikacja NPC wymaga triggera `BEFORE UPDATE` na `npcs`, który weryfikuje integralność danych (kompletność modułów, brak naruszeń limitów, obecność aktywnych rekordów zgodnie z modułami) i zarządza `published_at` / `first_published_at`.
- Limit 256 KB dla generowanych treści powinien być wyliczany aplikacyjnie i zapisywany w kolumnie `content_size_bytes`; dodatkowa walidacja może być zaimplementowana w triggerze, który blokuje zapis przekraczający limit.
- Limit pozycji (≈255) w `npc_shop_items` i `npc_keywords` powinien być wymuszony przez dedykowane triggery `BEFORE INSERT`, które zliczają aktywne rekordy (`deleted_at IS NULL`).
- Utrzymywanie unikalności fraz w module Keywords wymaga dodatkowego triggera zabezpieczającego przed konfliktami pomiędzy modułem Shop w trybie `talk_mode` (blokada dodania frazy z listy zarezerwowanych słów).
- Tabela `telemetry_events` jest opcjonalna; jeżeli zespół wybierze zewnętrzny system telemetryczny, można pominąć migrację dla tej tabeli.
