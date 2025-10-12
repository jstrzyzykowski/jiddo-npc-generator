# Kompleksowy Schemat Bazy Danych PostgreSQL dla Jiddo NPC Generator

## 1. Rozszerzenia i Typy niestandardowe (ENUMs)

Na początku definiujemy wymagane rozszerzenia PostgreSQL oraz niestandardowe typy danych (ENUM), które zapewnią spójność i integralność danych w całej aplikacji.

```sql
-- Włączenie wymaganych rozszerzeń
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Definicja typów ENUM dla kluczowych atrybutów
CREATE TYPE npc_status AS ENUM ('draft', 'published');
CREATE TYPE npc_system AS ENUM ('jiddo_tfs_1_5');
CREATE TYPE npc_implementation_type AS ENUM ('xml');
CREATE TYPE npc_look_type AS ENUM ('player', 'monster', 'item');
CREATE TYPE shop_mode AS ENUM ('trade_window', 'talk_mode');
CREATE TYPE shop_item_type AS ENUM ('buy', 'sell');
```

## 2. Definicje Tabel

Poniżej znajdują się definicje wszystkich tabel w schemacie bazy danych. Struktura została zaprojektowana w oparciu o zasady normalizacji, z silnym typowaniem i ograniczeniami integralności danych.

### Tabela `profiles`

Przechowuje publiczne dane użytkowników, powiązane z systemem autentykacji Supabase.

```sql
CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "display_name" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Komentarze do tabeli i kolumn
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user, linked to the authentication system.';
COMMENT ON COLUMN public.profiles.id IS 'User ID, references auth.users.id.';
COMMENT ON COLUMN public.profiles.display_name IS 'Publicly visible display name of the user. Initialized from email, not unique in MVP.';
```

### Tabela `npcs`

Centralna tabela aplikacji, przechowująca wszystkie dane dotyczące NPC.

```sql
CREATE TABLE "public"."npcs" (
    -- Identyfikatory i Metadane
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "owner_id" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    "client_request_id" text UNIQUE,

    -- Dane Podstawowe NPC
    "name" citext NOT NULL,
    "status" npc_status DEFAULT 'draft' NOT NULL,
    "system" npc_system NOT NULL,
    "implementation_type" npc_implementation_type NOT NULL,
    "script" text DEFAULT 'default.lua' NOT NULL,
    "xml_content" text,

    -- Znaczniki Czasu i Cyklu Życia
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "published_at" timestamptz,
    "first_published_at" timestamptz,
    "deleted_at" timestamptz,

    -- Atrybuty Wyglądu
    "look_type" npc_look_type NOT NULL,
    "head" smallint DEFAULT 0 NOT NULL CHECK (head >= 0 AND head <= 132),
    "body" smallint DEFAULT 0 NOT NULL CHECK (body >= 0 AND body <= 132),
    "legs" smallint DEFAULT 0 NOT NULL CHECK (legs >= 0 AND legs <= 132),
    "feet" smallint DEFAULT 0 NOT NULL CHECK (feet >= 0 AND feet <= 132),
    "addons" smallint DEFAULT 0 NOT NULL CHECK (addons >= 0 AND addons <= 3),
    "look_mount" integer,
    "look_item_id" integer,

    -- Wiadomości NPC
    "greet_message" text,
    "farewell_message" text,
    "decline_message" text,

    -- Konfiguracja i flagi modułów
    "walkinterval" integer DEFAULT 2000 NOT NULL,
    "floorchange" boolean DEFAULT false NOT NULL,
    "health_now" integer DEFAULT 100 NOT NULL,
    "health_max" integer DEFAULT 100 NOT NULL,
    "shop_enabled" boolean DEFAULT false NOT NULL,
    "keywords_enabled" boolean DEFAULT false NOT NULL,
    "focus_enabled" boolean DEFAULT false NOT NULL,
    "travel_enabled" boolean DEFAULT false NOT NULL,
    "voice_enabled" boolean DEFAULT false NOT NULL,
    "shop_mode" shop_mode,
    "shop_noshop_message" text,
    "shop_onclose_message" text,

    -- Ograniczenia
    CONSTRAINT "name_length_check" CHECK (char_length(name) > 0 AND char_length(name) <= 100),
    CONSTRAINT "greet_message_length_check" CHECK (char_length(greet_message) <= 255),
    CONSTRAINT "farewell_message_length_check" CHECK (char_length(farewell_message) <= 255),
    CONSTRAINT "decline_message_length_check" CHECK (char_length(decline_message) <= 255),
    CONSTRAINT "shop_noshop_message_length_check" CHECK (char_length(shop_noshop_message) <= 255),
    CONSTRAINT "shop_onclose_message_length_check" CHECK (char_length(shop_onclose_message) <= 255),
    CONSTRAINT "xml_content_size_check" CHECK (octet_length(xml_content) <= 262144) -- 256 KB
);

COMMENT ON TABLE public.npcs IS 'Central table containing all data for a Non-Player Character (NPC).';
COMMENT ON COLUMN public.npcs.client_request_id IS 'Idempotency key to prevent duplicate NPC creation on retries.';
```

### Tabela `npc_shop_items`

Przechowuje listę przedmiotów, które NPC może kupować lub sprzedawać.

```sql
CREATE TABLE "public"."npc_shop_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "npc_id" uuid NOT NULL REFERENCES public.npcs(id) ON DELETE RESTRICT,
    "item_type" shop_item_type NOT NULL,
    "name" text NOT NULL,
    "item_id" integer NOT NULL CHECK (item_id > 0),
    "price" integer NOT NULL CHECK (price >= 0),
    "subtype" integer CHECK (subtype >= 0),
    "charges" integer CHECK (charges >= 0),
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT "name_length_check" CHECK (char_length(name) > 0 AND char_length(name) <= 100)
);

COMMENT ON TABLE public.npc_shop_items IS 'Stores shop items (buy/sell lists) associated with an NPC.';
```

### Tabela `npc_keywords`

Przechowuje słowa kluczowe i odpowiedzi dla modułu interakcji NPC.

```sql
CREATE TABLE "public"."npc_keywords" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "npc_id" uuid NOT NULL REFERENCES public.npcs(id) ON DELETE RESTRICT,
    "phrases" citext[] NOT NULL,
    "response" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,

    -- Ograniczenie EXCLUDE zapewnia, że żadne dwie tablice fraz dla tego samego NPC nie mają wspólnych elementów.
    CONSTRAINT "unique_phrases_per_npc" EXCLUDE USING GIN (npc_id WITH =, phrases WITH &&),
    CONSTRAINT "response_length_check" CHECK (char_length(response) > 0 AND char_length(response) <= 512)
);

COMMENT ON TABLE public.npc_keywords IS 'Stores keywords and responses for an NPC. Each keyword can have multiple phrases.';
COMMENT ON COLUMN public.npc_keywords.phrases IS 'Array of case-insensitive phrases that trigger the response.';
```

## 3. Indeksy

Indeksy są kluczowe dla wydajności zapytań. Zastosowano indeksy częściowe (`partial indexes`) w celu optymalizacji zapytań filtrujących usunięte rekordy.

```sql
-- Indeks dla publicznej listy NPC (np. strona główna, /npcs)
CREATE INDEX "idx_public_npcs_list" ON "public"."npcs" (published_at DESC, id DESC)
WHERE (published_at IS NOT NULL AND deleted_at IS NULL);
COMMENT ON INDEX public.idx_public_npcs_list IS 'Optimizes queries for public NPC listings, sorted by publication date for stable cursor pagination.';

-- Indeks dla prywatnej listy NPC właściciela ("Moje NPC")
CREATE INDEX "idx_owner_npcs_list" ON "public"."npcs" (owner_id, updated_at DESC, id DESC)
WHERE (deleted_at IS NULL);
COMMENT ON INDEX public.idx_owner_npcs_list IS 'Optimizes queries for fetching NPCs belonging to a specific user, sorted by last update time.';

-- Unikalny indeks częściowy dla nazwy NPC per właściciel
CREATE UNIQUE INDEX "idx_unique_npc_name_per_owner" ON "public"."npcs" (owner_id, name)
WHERE (deleted_at IS NULL);
COMMENT ON INDEX public.idx_unique_npc_name_per_owner IS 'Ensures NPC name is unique per owner, excluding soft-deleted records.';

-- Indeksy dla kluczy obcych w tabelach podrzędnych
CREATE INDEX "idx_npc_shop_items_npc_id" ON "public"."npc_shop_items" (npc_id, item_type);
CREATE INDEX "idx_npc_keywords_npc_id" ON "public"."npc_keywords" (npc_id);

-- Indeks GIN na frazach kluczowych, wymagany przez ograniczenie EXCLUDE
CREATE INDEX "idx_npc_keywords_phrases_gin" ON "public"."npc_keywords" USING GIN (phrases);
```

## 4. Funkcje i Triggery

Automatyzacja kluczowych operacji (np. aktualizacja `updated_at`, walidacja przy publikacji) jest realizowana za pomocą funkcji i triggerów PostgreSQL.

```sql
-- 1. Generyczna funkcja do aktualizacji znacznika czasu `updated_at`
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Generic trigger function to update the updated_at timestamp on any table modification.';

-- Przypisanie triggera `updated_at` do tabel
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.npcs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.npc_shop_items FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.npc_keywords FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 2. Funkcja i trigger do automatycznego tworzenia profilu dla nowego użytkownika
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ language 'plpgsql' security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to automatically create a user profile upon new user registration in auth.users.';

-- 3. Funkcja i trigger do walidacji przed publikacją NPC
CREATE OR REPLACE FUNCTION public.validate_npc_publication()
RETURNS TRIGGER AS $$
DECLARE
  shop_item_count integer;
  keyword_count integer;
BEGIN
  -- Trigger działa tylko przy zmianie statusu na 'published'
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    -- Sprawdzenie, czy NPC nie jest usunięty
    IF NEW.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot publish a deleted NPC.';
    END IF;

    -- Sprawdzenie, czy treść XML istnieje
    IF NEW.xml_content IS NULL OR trim(NEW.xml_content) = '' THEN
      RAISE EXCEPTION 'Cannot publish NPC with empty XML content.';
    END IF;

    -- Walidacja modułu Shop
    IF NEW.shop_enabled THEN
      SELECT count(*) INTO shop_item_count FROM public.npc_shop_items WHERE npc_id = NEW.id;
      IF shop_item_count = 0 THEN
        RAISE EXCEPTION 'Cannot publish: Shop module is enabled but has no items.';
      END IF;
    END IF;

    -- Walidacja modułu Keywords
    IF NEW.keywords_enabled THEN
      SELECT count(*) INTO keyword_count FROM public.npc_keywords WHERE npc_id = NEW.id;
      IF keyword_count = 0 THEN
        RAISE EXCEPTION 'Cannot publish: Keywords module is enabled but has no keywords.';
      END IF;
    END IF;

    -- Ustawienie znaczników czasu publikacji
    NEW.published_at := now();
    IF OLD.first_published_at IS NULL THEN
      NEW.first_published_at := NEW.published_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

CREATE TRIGGER before_npc_publish
  BEFORE UPDATE OF status ON public.npcs
  FOR EACH ROW EXECUTE PROCEDURE public.validate_npc_publication();

COMMENT ON FUNCTION public.validate_npc_publication() IS 'Validates that an NPC meets all requirements before its status is changed to "published".';


-- 4. Funkcje i triggery do walidacji limitów w modułach
CREATE OR REPLACE FUNCTION public.check_shop_item_limit()
RETURNS TRIGGER AS $$
DECLARE
  item_count integer;
BEGIN
  SELECT count(*) INTO item_count FROM public.npc_shop_items WHERE npc_id = NEW.npc_id;
  IF item_count >= 255 THEN
    RAISE EXCEPTION 'Cannot add more than 255 items to the shop.';
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER enforce_shop_item_limit
  BEFORE INSERT ON public.npc_shop_items
  FOR EACH ROW EXECUTE PROCEDURE public.check_shop_item_limit();


CREATE OR REPLACE FUNCTION public.check_keyword_limit()
RETURNS TRIGGER AS $$
DECLARE
  keyword_count integer;
BEGIN
  SELECT count(*) INTO keyword_count FROM public.npc_keywords WHERE npc_id = NEW.npc_id;
  IF keyword_count >= 255 THEN
    RAISE EXCEPTION 'Cannot add more than 255 keywords.';
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER enforce_keyword_limit
  BEFORE INSERT ON public.npc_keywords
  FOR EACH ROW EXECUTE PROCEDURE public.check_keyword_limit();

-- 5. Trigger do zapewnienia niezmienności `owner_id`
CREATE OR REPLACE FUNCTION public.prevent_owner_id_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
        RAISE EXCEPTION 'Changing the owner of an NPC is not allowed.';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER protect_owner_id
    BEFORE UPDATE ON public.npcs
    FOR EACH ROW EXECUTE PROCEDURE public.prevent_owner_id_change();

-- 6. Trigger do walidacji długości fraz w tablicy
CREATE OR REPLACE FUNCTION public.validate_keyword_phrases()
RETURNS TRIGGER AS $$
DECLARE
    phrase citext;
BEGIN
    IF TG_OP = 'INSERT' OR NEW.phrases IS DISTINCT FROM OLD.phrases THEN
        IF array_length(NEW.phrases, 1) IS NULL OR array_length(NEW.phrases, 1) = 0 THEN
             RAISE EXCEPTION 'Keywords must have at least one phrase.';
        END IF;

        FOREACH phrase IN ARRAY NEW.phrases
        LOOP
            IF char_length(phrase) < 1 OR char_length(phrase) > 64 THEN
                RAISE EXCEPTION 'All phrases must be between 1 and 64 characters long.';
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER enforce_phrase_validation
    BEFORE INSERT OR UPDATE ON public.npc_keywords
    FOR EACH ROW EXECUTE PROCEDURE public.validate_keyword_phrases();

```

## 5. Zabezpieczenia na Poziomie Wiersza (Row-Level Security)

Polityki RLS są fundamentalnym elementem bezpieczeństwa aplikacji, zapewniając, że użytkownicy mają dostęp wyłącznie do danych, do których są uprawnieni.

```sql
-- Włączenie RLS dla wszystkich tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_keywords ENABLE ROW LEVEL SECURITY;

-- Polityki dla tabeli `profiles`
CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles"
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile." ON "public"."profiles"
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Profile creation is handled by a trigger." ON "public"."profiles"
    FOR INSERT WITH CHECK (false);

CREATE POLICY "Profiles cannot be deleted by users." ON "public"."profiles"
    FOR DELETE USING (false);

-- Polityki dla tabeli `npcs`
CREATE POLICY "Public can view published NPCs, owners can view their own." ON "public"."npcs"
    FOR SELECT USING (
      (status = 'published' AND deleted_at IS NULL) OR (auth.uid() = owner_id)
    );

CREATE POLICY "Users can create NPCs." ON "public"."npcs"
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own NPCs." ON "public"."npcs"
    FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Physical delete is disabled, soft-delete via UPDATE." ON "public"."npcs"
    FOR DELETE USING (false);

-- Polityki dla tabel podrzędnych (`npc_shop_items`, `npc_keywords`)
CREATE POLICY "Public can view items of published NPCs." ON "public"."npc_shop_items"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM npcs
            WHERE npcs.id = npc_shop_items.npc_id AND npcs.status = 'published' AND npcs.deleted_at IS NULL
        )
    );

CREATE POLICY "Owners can manage their NPC's shop items." ON "public"."npc_shop_items"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM npcs WHERE npcs.id = npc_shop_items.npc_id AND npcs.owner_id = auth.uid()
        )
    );

CREATE POLICY "Public can view keywords of published NPCs." ON "public"."npc_keywords"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM npcs
            WHERE npcs.id = npc_keywords.npc_id AND npcs.status = 'published' AND npcs.deleted_at IS NULL
        )
    );

CREATE POLICY "Owners can manage their NPC's keywords." ON "public"."npc_keywords"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM npcs WHERE npcs.id = npc_keywords.npc_id AND npcs.owner_id = auth.uid()
        )
    );
```
