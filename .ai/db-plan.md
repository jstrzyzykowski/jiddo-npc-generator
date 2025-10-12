1. Tabele

- **profiles**
  - `id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE RESTRICT`
  - `display_name text NOT NULL`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`
  - Ograniczenia:
    - `CHECK (char_length(display_name) BETWEEN 1 AND 64)`
  - Komentarze: przechowuje publiczne metadane użytkownika; `display_name` inicjowane triggerem z e-maila.

- **npcs**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `owner_id uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT`
  - `client_request_id text UNIQUE NULLS NOT DISTINCT`
  - `name citext NOT NULL`
  - `status npc_status NOT NULL DEFAULT 'draft'`
  - `system npc_system NOT NULL`
  - `implementation_type npc_implementation_type NOT NULL`
  - `script text NOT NULL DEFAULT 'default.lua'`
  - `xml_content text`
  - `greet text`
  - `farewell text`
  - `decline text`
  - `noshop text`
  - `oncloseshop text`
  - `shop_enabled boolean NOT NULL DEFAULT false`
  - `shop_mode npc_shop_mode`
  - `shop_message_buy text`
  - `shop_message_sell text`
  - `shop_message_trade text`
  - `keywords_enabled boolean NOT NULL DEFAULT false`
  - `focus_enabled boolean NOT NULL DEFAULT false`
  - `travel_enabled boolean NOT NULL DEFAULT false`
  - `voice_enabled boolean NOT NULL DEFAULT false`
  - `look_type npc_look_type`
  - `look_type_id integer`
  - `look_item_id integer`
  - `look_head integer`
  - `look_body integer`
  - `look_legs integer`
  - `look_feet integer`
  - `look_addons integer`
  - `look_mount integer`
  - `walk_interval integer`
  - `floor_change boolean`
  - `health_now integer`
  - `health_max integer`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`
  - `published_at timestamptz`
  - `first_published_at timestamptz`
  - `deleted_at timestamptz`
  - Ograniczenia: - `CHECK (octet_length(xml_content) <= 262144)` - `CHECK (char_length(name) BETWEEN 1 AND 64)` - `CHECK (walk_interval IS NULL OR walk_interval >= 0)` - `CHECK (health_now IS NULL OR health_now >= 0)` - `CHECK (health_max IS NULL OR health_max >= 0)` - `CHECK (health_now IS NULL OR health_max IS NULL OR health_now <= health_max)` - `CHECK (shop_mode IS NULL OR shop_enabled = true)` - `CHECK (keywords_enabled = true OR keywords_enabled = false)` - `CHECK (look_head IS NULL OR look_head BETWEEN 0 AND 132)` - `CHECK (look_body IS NULL OR look_body BETWEEN 0 AND 132)` - `CHECK (look_legs IS NULL OR look_legs BETWEEN 0 AND 132)` - `CHECK (look_feet IS NULL OR look_feet BETWEEN 0 AND 132)` - `CHECK (look_addons IS NULL OR look_addons BETWEEN 0 AND 3)` - `CHECK (look_mount IS NULL OR look_mount >= 0)` - `CHECK (
  (look_type = 'item' AND look_item_id IS NOT NULL AND look_type_id IS NULL AND look_head IS NULL AND look_body IS NULL AND look_legs IS NULL AND look_feet IS NULL AND look_addons IS NULL AND look_mount IS NULL)
  OR (look_type IN ('player', 'monster') AND look_type_id IS NOT NULL AND look_item_id IS NULL)
  OR (look_type IS NULL AND look_type_id IS NULL AND look_item_id IS NULL)
)`
  - Komentarze: zawiera znormalizowane atrybuty kreatora NPC; `xml_content` przechowuje wygenerowany XML.

- **npc_shop_items**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `npc_id uuid NOT NULL REFERENCES npcs (id) ON DELETE RESTRICT`
  - `item_type npc_shop_item_type NOT NULL`
  - `name text`
  - `item_id integer NOT NULL`
  - `price integer NOT NULL`
  - `subtype integer`
  - `charges integer`
  - `container text`
  - `real_name text`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`
  - Ograniczenia:
    - `CHECK (price >= 0)`
    - `CHECK (item_id > 0)`
    - `CHECK (subtype IS NULL OR subtype >= 0)`
    - `CHECK (charges IS NULL OR charges >= 0)`
    - `CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 64)`
    - `CHECK (container IS NULL OR char_length(container) BETWEEN 1 AND 64)`
    - `CHECK (real_name IS NULL OR char_length(real_name) BETWEEN 1 AND 64)`

- **npc_keywords**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `npc_id uuid NOT NULL REFERENCES npcs (id) ON DELETE RESTRICT`
  - `phrases citext[] NOT NULL`
  - `response text NOT NULL`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`
  - Ograniczenia:
    - `CHECK (array_length(phrases, 1) BETWEEN 1 AND 32)`
    - `CHECK (response <> '' AND char_length(response) <= 512)`
    - `EXCLUDE USING gin (npc_id WITH =, phrases WITH &&)`
  - Dodatkowe walidacje przez trigger: każda fraza musi mieć długość 1–64 znaki.

- **analytics_events**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `event_type analytics_event_type NOT NULL`
  - `user_id uuid REFERENCES profiles (id) ON DELETE SET NULL`
  - `npc_id uuid REFERENCES npcs (id) ON DELETE SET NULL`
  - `occurred_at timestamptz NOT NULL DEFAULT now()`
  - `metadata jsonb`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - Ograniczenia:
    - `CHECK (jsonb_typeof(metadata) = 'object' OR metadata IS NULL)`

- **ai_generation_attempts**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `npc_id uuid NOT NULL REFERENCES npcs (id) ON DELETE CASCADE`
  - `owner_id uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT`
  - `status ai_generation_status NOT NULL`
  - `provider text`
  - `model text`
  - `latency_ms integer`
  - `error_code text`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `payload jsonb`
  - Ograniczenia:
    - `CHECK (latency_ms IS NULL OR latency_ms >= 0)`
    - `CHECK (jsonb_typeof(payload) = 'object' OR payload IS NULL)`

- **refresh_tokens** _(jeżeli Supabase wymaga lokalnej tabeli na potrzeby TTL – opcjonalne, pozostawione poza MVP)_

---

2. Relacje

- `profiles (1) — (n) npcs`: właściciel NPC.
- `npcs (1) — (n) npc_shop_items`: przedmioty sklepu.
- `npcs (1) — (n) npc_keywords`: wpisy keywords.
- `profiles (1) — (n) analytics_events`: zdarzenia telemetryczne powiązane z użytkownikiem.
- `profiles (1) — (n) ai_generation_attempts`: logi generacji odseparowane per właściciel.
- `npcs (1) — (n) analytics_events`: zdarzenia telemetryczne powiązane z NPC.
- `npcs (1) — (n) ai_generation_attempts`: każda próba generacji powiązana z konkretnym NPC.

---

3. Indeksy

- `profiles`
  - `CREATE INDEX profiles_display_name_idx ON profiles USING gin (display_name gin_trgm_ops);` _(opcjonalne dla wyszukiwarki przyszłości)_

- `npcs`
  - `CREATE UNIQUE INDEX npcs_owner_name_unique_idx ON npcs (owner_id, lower(name)) WHERE deleted_at IS NULL;`
  - `CREATE INDEX npcs_owner_updated_idx ON npcs (owner_id, updated_at DESC, id DESC) WHERE deleted_at IS NULL;`
  - `CREATE INDEX npcs_published_idx ON npcs (published_at DESC, id DESC) WHERE published_at IS NOT NULL AND deleted_at IS NULL;`
  - `CREATE INDEX npcs_status_idx ON npcs (status, deleted_at);`

- `npc_shop_items`
  - `CREATE INDEX npc_shop_items_npc_type_idx ON npc_shop_items (npc_id, item_type);`

- `npc_keywords`
  - `CREATE INDEX npc_keywords_npc_idx ON npc_keywords (npc_id);`

- `analytics_events`
  - `CREATE INDEX analytics_events_event_idx ON analytics_events (event_type, occurred_at DESC);`
  - `CREATE INDEX analytics_events_user_idx ON analytics_events (user_id, occurred_at DESC);`
  - `CREATE INDEX analytics_events_npc_idx ON analytics_events (npc_id, occurred_at DESC);`

- `ai_generation_attempts`
  - `CREATE INDEX ai_generation_attempts_npc_idx ON ai_generation_attempts (npc_id, created_at DESC);`
  - `CREATE INDEX ai_generation_attempts_owner_idx ON ai_generation_attempts (owner_id, created_at DESC);`

---

4. Polityki RLS

- **profiles**
  - `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY public_profiles_select ON profiles FOR SELECT USING (true);`
  - `CREATE POLICY own_profiles_update ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());`
  - `CREATE POLICY profiles_insert_blocked ON profiles FOR INSERT WITH CHECK (false);`
  - `CREATE POLICY profiles_delete_blocked ON profiles FOR DELETE USING (false);`

- **npcs**
  - `ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY npcs_owner_select ON npcs FOR SELECT USING (owner_id = auth.uid());`
  - `CREATE POLICY npcs_public_select ON npcs FOR SELECT USING (deleted_at IS NULL AND published_at IS NOT NULL);`
  - `CREATE POLICY npcs_owner_modify ON npcs FOR INSERT WITH CHECK (owner_id = auth.uid());`
  - `CREATE POLICY npcs_owner_update ON npcs FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());`
  - `CREATE POLICY npcs_no_delete ON npcs FOR DELETE USING (false);`

- **npc_shop_items** i **npc_keywords**
  - `ALTER TABLE npc_shop_items ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE npc_keywords ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY npc_children_owner_select ON npc_shop_items FOR SELECT USING (EXISTS (SELECT 1 FROM npcs WHERE npcs.id = npc_shop_items.npc_id AND npcs.owner_id = auth.uid()));`
  - `CREATE POLICY npc_children_public_select ON npc_shop_items FOR SELECT USING (EXISTS (SELECT 1 FROM npcs WHERE npcs.id = npc_shop_items.npc_id AND npcs.deleted_at IS NULL AND npcs.published_at IS NOT NULL));`
  - `CREATE POLICY npc_children_owner_modify ON npc_shop_items FOR INSERT, UPDATE, DELETE USING (EXISTS (SELECT 1 FROM npcs WHERE npcs.id = npc_shop_items.npc_id AND npcs.owner_id = auth.uid()));`
  - Analogiczne polityki dla `npc_keywords`.

- **analytics_events**
  - `ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY analytics_events_service_role ON analytics_events USING (auth.role() = 'service_role');`
  - `CREATE POLICY analytics_events_read_own ON analytics_events FOR SELECT USING (user_id = auth.uid());`
  - Brak polityk INSERT/UPDATE/DELETE dla zwykłych użytkowników (operacje wykonywane tylko przez backend/service role).

- **ai_generation_attempts**
  - `ALTER TABLE ai_generation_attempts ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY ai_attempts_owner_select ON ai_generation_attempts FOR SELECT USING (owner_id = auth.uid());`
  - `CREATE POLICY ai_attempts_service_insert ON ai_generation_attempts FOR INSERT WITH CHECK (auth.role() = 'service_role');`
  - Brak polityk UPDATE/DELETE (tylko service role).

---

5. Dodatkowe uwagi

- **Typy ENUM**
  - `CREATE TYPE npc_status AS ENUM ('draft', 'published');`
  - `CREATE TYPE npc_system AS ENUM ('jiddo_tfs_1_5');`
  - `CREATE TYPE npc_implementation_type AS ENUM ('xml');`
  - `CREATE TYPE npc_look_type AS ENUM ('player', 'monster', 'item');`
  - `CREATE TYPE npc_shop_mode AS ENUM ('trade_window', 'talk_mode');`
  - `CREATE TYPE npc_shop_item_type AS ENUM ('buy', 'sell');`
  - `CREATE TYPE analytics_event_type AS ENUM ('npc_created', 'npc_published', 'ai_generation_error', 'ai_generation_success', 'session_started');`
  - `CREATE TYPE ai_generation_status AS ENUM ('success', 'error');`

- **Triggery i funkcje**
  - Funkcja `set_updated_at()` przypisana do `profiles`, `npcs`, `npc_shop_items`, `npc_keywords`.
  - Trigger na `auth.users` tworzący rekord w `profiles` z `display_name` = część e-maila przed `@`.
  - Trigger `prevent_owner_change` na `npcs` blokujący modyfikację `owner_id` po utworzeniu.
  - Trigger `enforce_publish_ready` na `npcs BEFORE UPDATE` walidujący publikację (status, xml_content, moduły, soft delete) oraz ustawiający `published_at`/`first_published_at`.
  - Trigger `enforce_shop_limit` na `npc_shop_items BEFORE INSERT` pilnujący limitu 255 pozycji per `(npc_id, item_type)`.
  - Trigger `enforce_keywords_limit` na `npc_keywords BEFORE INSERT` pilnujący limitu 255 wpisów per `npc_id`.
  - Trigger `validate_keyword_phrases` na `npc_keywords` sprawdzający, czy długość każdej frazy mieści się w zakresie 1–64 znaki.

- **Rozszerzenia Postgres**
  - `pgcrypto` dla `gen_random_uuid()`.
  - `citext` dla porównań case-insensitive.
  - `btree_gin` dla indeksów na tablicach `citext[]`.
  - `pg_trgm` (opcjonalne) dla wyszukiwania po `display_name` i `name` w przyszłości.

- **Walidacje aplikacyjne uzupełniające**
  - Blokada wykorzystania fraz sklepu w module `Keywords` podczas `talk_mode` – logika w backendzie.
  - Obsługa limitu 256 KB na froncie przed zapisem/kopiowaniem.
  - Potwierdzenie edycji opublikowanego NPC w UI.

- **Paginacja**
  - SSR/infinite scroll korzysta z indeksu `(published_at DESC, id DESC)` i kursora na tych kolumnach.

- **Idempotentność**
  - `client_request_id` służy do zabezpieczenia przed duplikacją przy retrach tworzenia NPC; backend weryfikuje konflikt (UNIQUE NULLS NOT DISTINCT).
