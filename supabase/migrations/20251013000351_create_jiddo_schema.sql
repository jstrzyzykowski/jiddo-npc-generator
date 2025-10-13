-- migration: create jiddo npc generator schema foundation
-- purpose: introduce enums, tables, constraints, triggers, and row level security required by the jiddo npc generator mvp
-- affects: types npc_status, npc_system, npc_implementation_type, npc_shop_mode, npc_shop_item_list_type, npc_look_type; tables profiles, npcs, npc_shop_items, npc_keywords, npc_keyword_phrases, telemetry_events; supporting functions, triggers, indexes, and rls policies
-- notes: statements are ordered to satisfy dependencies; all destructive operations are omitted in this initial migration

set statement_timeout to 0;

create extension if not exists pgcrypto;

-- create enumerated types described in the db plan
create type public.npc_status as enum ('draft', 'published');
create type public.npc_system as enum ('jiddo_tfs_1_5');
create type public.npc_implementation_type as enum ('xml');
create type public.npc_shop_mode as enum ('trade_window', 'talk_mode');
create type public.npc_shop_item_list_type as enum ('buy', 'sell');
create type public.npc_look_type as enum ('player', 'monster', 'item');

-- create profiles table mirroring auth.users with additional metadata
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 255),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- create core npcs table holding configurable npc definitions
create table public.npcs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  client_request_id uuid not null,
  status public.npc_status not null default 'draft',
  system public.npc_system not null default 'jiddo_tfs_1_5',
  implementation_type public.npc_implementation_type not null default 'xml',
  name text not null check (char_length(name) between 1 and 255),
  script text not null default 'default.lua' check (script = 'default.lua'),
  walk_interval integer not null check (walk_interval between 0 and 65535),
  floor_change boolean not null default false,
  health_now integer not null check (health_now between 0 and 65535),
  health_max integer not null check (health_max between 1 and 65535 and health_max >= health_now),
  look_type public.npc_look_type not null,
  look_type_id integer check ((look_type <> 'player' and look_type <> 'monster') or look_type_id > 0),
  look_item_id integer check ((look_type = 'item' and look_item_id > 0) or (look_type <> 'item' and look_item_id is null)),
  look_head integer check ((look_type = 'player' and look_head between 0 and 132) or (look_type <> 'player' and look_head is null)),
  look_body integer check ((look_type = 'player' and look_body between 0 and 132) or (look_type <> 'player' and look_body is null)),
  look_legs integer check ((look_type = 'player' and look_legs between 0 and 132) or (look_type <> 'player' and look_legs is null)),
  look_feet integer check ((look_type = 'player' and look_feet between 0 and 132) or (look_type <> 'player' and look_feet is null)),
  look_addons integer check ((look_type = 'player' and look_addons between 0 and 3) or (look_type <> 'player' and look_addons is null)),
  look_mount integer check (look_mount is null or look_mount >= 0),
  greet_message text not null check (char_length(greet_message) between 1 and 512),
  farewell_message text not null check (char_length(farewell_message) between 1 and 512),
  decline_message text not null check (char_length(decline_message) between 1 and 512),
  no_shop_message text not null check (char_length(no_shop_message) between 1 and 512),
  on_close_shop_message text not null check (char_length(on_close_shop_message) between 1 and 512),
  focus_enabled boolean not null default false,
  travel_enabled boolean not null default false,
  voice_enabled boolean not null default false,
  shop_enabled boolean not null default false,
  shop_mode public.npc_shop_mode not null default 'trade_window',
  shop_message_buy text check (shop_message_buy is null or char_length(shop_message_buy) between 1 and 512),
  shop_message_sell text check (shop_message_sell is null or char_length(shop_message_sell) between 1 and 512),
  keywords_enabled boolean not null default false,
  content_size_bytes integer not null default 0 check (content_size_bytes between 0 and 262144),
  published_at timestamptz,
  first_published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

-- create table of npc shop items
create table public.npc_shop_items (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npcs (id) on delete restrict,
  list_type public.npc_shop_item_list_type not null,
  name text not null check (char_length(name) between 1 and 255),
  item_id integer not null check (item_id > 0),
  price integer not null check (price >= 0),
  subtype integer not null default 0 check (subtype >= 0),
  charges integer not null default 0 check (charges >= 0),
  real_name text check (real_name is null or char_length(real_name) between 1 and 255),
  container_item_id integer check (container_item_id is null or container_item_id > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

-- create table storing npc keyword responses
create table public.npc_keywords (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npcs (id) on delete restrict,
  response text not null check (char_length(response) between 1 and 512),
  sort_index integer not null default 0 check (sort_index >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint npc_keywords_compound_pk unique (npc_id, id)
);

-- create table storing phrases that map to keyword responses
create table public.npc_keyword_phrases (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null,
  npc_id uuid not null,
  phrase text not null check (char_length(phrase) between 1 and 64),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint npc_keyword_phrases_keyword_fkey foreign key (keyword_id, npc_id) references public.npc_keywords (id, npc_id) on delete restrict
);

-- create optional telemetry table for auditing application events
create table public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 1 and 255),
  user_id uuid references public.profiles (id) on delete set null,
  npc_id uuid references public.npcs (id) on delete set null,
  metadata jsonb check (jsonb_typeof(metadata) in ('object', 'null')),
  created_at timestamptz not null default timezone('utc', now())
);

-- ensure row level security is active on every table per security baseline
alter table public.profiles enable row level security;
alter table public.npcs enable row level security;
alter table public.npc_shop_items enable row level security;
alter table public.npc_keywords enable row level security;
alter table public.npc_keyword_phrases enable row level security;
alter table public.telemetry_events enable row level security;

-- add unique and supporting indexes demanded by the db plan
create unique index idx_profiles_display_name_lower on public.profiles (lower(display_name));

alter table public.npcs add constraint npcs_client_request_id_unique unique (client_request_id);
create unique index idx_npcs_owner_name_unique on public.npcs (owner_id, lower(name)) where deleted_at is null;
create index idx_npcs_public_listing on public.npcs (status, published_at, id) where deleted_at is null and status = 'published';

create index idx_npc_shop_items_active on public.npc_shop_items (npc_id, list_type, id) where deleted_at is null;
create index idx_npc_shop_items_npc_deleted on public.npc_shop_items (npc_id, deleted_at);
create index idx_npc_shop_items_item_id on public.npc_shop_items (item_id);

create index idx_npc_keywords_sorting on public.npc_keywords (npc_id, deleted_at, sort_index);
create unique index idx_npc_keywords_response_unique on public.npc_keywords (npc_id, lower(response)) where deleted_at is null;

create unique index idx_npc_keyword_phrases_unique_phrase on public.npc_keyword_phrases (npc_id, lower(phrase)) where deleted_at is null;
create index idx_npc_keyword_phrases_conflict on public.npc_keyword_phrases (keyword_id, deleted_at, phrase);
create index idx_npc_keyword_phrases_keyword on public.npc_keyword_phrases (keyword_id, npc_id);

create index idx_telemetry_events_type_created_at on public.telemetry_events (event_type, created_at desc);
create index idx_telemetry_events_npc on public.telemetry_events (npc_id);
create index idx_telemetry_events_user on public.telemetry_events (user_id);

-- helper function keeps updated_at columns consistent across tables
create function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

-- function automatically provisions a profile row when a new auth user is created
create function public.create_profile_for_new_user() returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  fallback_name text;
begin
  fallback_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.email, ''),
    'user_' || left(new.id::text, 8)
  );
  fallback_name := left(fallback_name, 255);

  insert into public.profiles (id, display_name)
  values (new.id, fallback_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- function prevents ownership changes after npc creation to enforce security guarantees
create function public.prevent_npc_owner_change() returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be modified for npc %', old.id;
  end if;
  return new;
end;
$$;

-- function cascades soft delete state to dependent shop and keyword records
create function public.propagate_npc_soft_delete() returns trigger
language plpgsql
as $$
declare
  effective_deleted_at timestamptz := new.deleted_at;
begin
  if new.deleted_at is distinct from old.deleted_at then
    if effective_deleted_at is null then
      -- restoring an npc clears soft delete marks on dependent rows
      update public.npc_shop_items
         set deleted_at = null
       where npc_id = new.id
         and deleted_at is not null;

      update public.npc_keywords
         set deleted_at = null
       where npc_id = new.id
         and deleted_at is not null;

      update public.npc_keyword_phrases
         set deleted_at = null
       where npc_id = new.id
         and deleted_at is not null;
    else
      -- applying soft delete propagates timestamp to dependent rows
      update public.npc_shop_items
         set deleted_at = effective_deleted_at
       where npc_id = new.id
         and (deleted_at is null or deleted_at <> effective_deleted_at);

      update public.npc_keywords
         set deleted_at = effective_deleted_at
       where npc_id = new.id
         and (deleted_at is null or deleted_at <> effective_deleted_at);

      update public.npc_keyword_phrases
         set deleted_at = effective_deleted_at
       where npc_id = new.id
         and (deleted_at is null or deleted_at <> effective_deleted_at);
    end if;
  end if;

  return new;
end;
$$;

-- function enforces publishing preconditions, content size limitations, and timestamp management
create function public.enforce_npc_publish_ready() returns trigger
language plpgsql
as $$
declare
  active_shop_count integer;
  active_keyword_count integer;
  current_ts timestamptz := timezone('utc', now());
begin
  if new.content_size_bytes > 262144 then
    raise exception 'npc % exceeds maximum allowed content size (262144 bytes)', coalesce(new.id::text, 'new');
  end if;

  if tg_op = 'insert' then
    if new.status = 'published' then
      if new.deleted_at is not null then
        raise exception 'cannot publish npc % while marked as deleted', coalesce(new.id::text, 'new');
      end if;

      if new.shop_enabled then
        select count(*) into active_shop_count
        from public.npc_shop_items
        where npc_id = new.id
          and deleted_at is null;

        if coalesce(active_shop_count, 0) = 0 then
          raise exception 'npc % cannot be published without active shop items', coalesce(new.id::text, 'new');
        end if;
      end if;

      if new.keywords_enabled then
        select count(*) into active_keyword_count
        from public.npc_keywords
        where npc_id = new.id
          and deleted_at is null;

        if coalesce(active_keyword_count, 0) = 0 then
          raise exception 'npc % cannot be published without active keyword responses', coalesce(new.id::text, 'new');
        end if;
      end if;

      if new.published_at is null then
        new.published_at := current_ts;
      end if;

      if new.first_published_at is null then
        new.first_published_at := current_ts;
      end if;
    end if;

    return new;
  end if;

  -- enforce rules during updates
  if new.status = 'published' then
    if new.deleted_at is not null then
      raise exception 'cannot publish npc % while marked as deleted', new.id;
    end if;

    if new.shop_enabled then
      select count(*) into active_shop_count
      from public.npc_shop_items
      where npc_id = new.id
        and deleted_at is null;

      if coalesce(active_shop_count, 0) = 0 then
        raise exception 'npc % cannot be published without active shop items', new.id;
      end if;
    end if;

    if new.keywords_enabled then
      select count(*) into active_keyword_count
      from public.npc_keywords
      where npc_id = new.id
        and deleted_at is null;

      if coalesce(active_keyword_count, 0) = 0 then
        raise exception 'npc % cannot be published without active keyword responses', new.id;
      end if;
    end if;

    if new.published_at is null then
      new.published_at := current_ts;
    end if;

    if old.first_published_at is null then
      new.first_published_at := current_ts;
    else
      new.first_published_at := old.first_published_at;
    end if;
  else
    if old.status = 'published' and new.status <> 'published' then
      new.published_at := null;
    end if;

    if old.first_published_at is not null then
      new.first_published_at := old.first_published_at;
    end if;
  end if;

  return new;
end;
$$;

-- function caps shop item count and guards against operations on deleted parents
create function public.enforce_npc_shop_item_limit() returns trigger
language plpgsql
as $$
declare
  active_count integer;
  parent_deleted timestamptz;
  current_row_id uuid := coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
begin
  select deleted_at into parent_deleted
  from public.npcs
  where id = new.npc_id;

  if parent_deleted is not null then
    raise exception 'cannot modify shop items for deleted npc %', new.npc_id;
  end if;

  if new.deleted_at is null then
    select count(*) into active_count
    from public.npc_shop_items
    where npc_id = new.npc_id
      and deleted_at is null
      and id <> current_row_id;

    if coalesce(active_count, 0) >= 255 then
      raise exception 'npc % exceeds maximum active shop item limit (255)', new.npc_id;
    end if;
  end if;

  return new;
end;
$$;

-- function restricts keyword count and prevents modifications on deleted parents
create function public.enforce_npc_keyword_limit() returns trigger
language plpgsql
as $$
declare
  active_count integer;
  parent_deleted timestamptz;
  current_row_id uuid := coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
begin
  select deleted_at into parent_deleted
  from public.npcs
  where id = new.npc_id;

  if parent_deleted is not null then
    raise exception 'cannot modify keywords for deleted npc %', new.npc_id;
  end if;

  if new.deleted_at is null then
    select count(*) into active_count
    from public.npc_keywords
    where npc_id = new.npc_id
      and deleted_at is null
      and id <> current_row_id;

    if coalesce(active_count, 0) >= 255 then
      raise exception 'npc % exceeds maximum active keyword limit (255)', new.npc_id;
    end if;
  end if;

  return new;
end;
$$;

-- function enforces reserved phrases for talk-mode shops and keeps parent linkage intact
create function public.enforce_keyword_phrase_rules() returns trigger
language plpgsql
as $$
declare
  reserved_phrases constant text[] := array['buy', 'sell', 'offer', 'trade', 'hi', 'hello', 'bye'];
  parent_mode public.npc_shop_mode;
  parent_shop_enabled boolean;
  parent_deleted timestamptz;
begin
  select shop_mode, shop_enabled, deleted_at
    into parent_mode, parent_shop_enabled, parent_deleted
  from public.npcs
  where id = new.npc_id;

  if parent_deleted is not null then
    raise exception 'cannot modify keyword phrases for deleted npc %', new.npc_id;
  end if;

  if tg_op = 'insert' then
    -- ensure keyword_id belongs to the same npc
    if not exists (
      select 1
      from public.npc_keywords kw
      where kw.id = new.keyword_id
        and kw.npc_id = new.npc_id
    ) then
      raise exception 'keyword % does not belong to npc %', new.keyword_id, new.npc_id;
    end if;
  end if;

  if parent_shop_enabled and parent_mode = 'talk_mode' then
    if lower(new.phrase) = any(reserved_phrases) then
      raise exception 'phrase "%" is reserved for shop talk mode and cannot be reused', new.phrase;
    end if;
  end if;

  return new;
end;
$$;

-- attach triggers to keep audit columns and business rules enforced
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_npcs_set_updated_at
before update on public.npcs
for each row execute function public.set_updated_at();

create trigger trg_npcs_prevent_owner_change
before update on public.npcs
for each row execute function public.prevent_npc_owner_change();

create trigger trg_npcs_publish_guard
before insert or update on public.npcs
for each row execute function public.enforce_npc_publish_ready();

create trigger trg_npcs_soft_delete_cascade
after update on public.npcs
for each row execute function public.propagate_npc_soft_delete();

create trigger trg_npc_shop_items_set_updated_at
before update on public.npc_shop_items
for each row execute function public.set_updated_at();

create trigger trg_npc_shop_items_limit
before insert on public.npc_shop_items
for each row execute function public.enforce_npc_shop_item_limit();

create trigger trg_npc_keywords_set_updated_at
before update on public.npc_keywords
for each row execute function public.set_updated_at();

create trigger trg_npc_keywords_limit
before insert on public.npc_keywords
for each row execute function public.enforce_npc_keyword_limit();

create trigger trg_npc_keyword_phrases_set_updated_at
before update on public.npc_keyword_phrases
for each row execute function public.set_updated_at();

create trigger trg_npc_keyword_phrases_rules
before insert or update on public.npc_keyword_phrases
for each row execute function public.enforce_keyword_phrase_rules();

create trigger trg_auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

-- row level security policies for profiles
create policy profiles_select_anon
on public.profiles
for select
to anon
using (true);

create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

create policy profiles_update_authenticated
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- row level security policies for npcs
create policy npcs_select_anon
on public.npcs
for select
to anon
using (deleted_at is null and status = 'published');

create policy npcs_select_authenticated
on public.npcs
for select
to authenticated
using (deleted_at is null and (status = 'published' or owner_id = auth.uid()));

create policy npcs_insert_authenticated
on public.npcs
for insert
to authenticated
with check (owner_id = auth.uid());

create policy npcs_update_authenticated
on public.npcs
for update
to authenticated
using (deleted_at is null and owner_id = auth.uid())
with check (owner_id = auth.uid());

-- row level security policies for npc_shop_items
create policy npc_shop_items_select_anon
on public.npc_shop_items
for select
to anon
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_shop_items.npc_id
      and parent.deleted_at is null
      and parent.status = 'published'
  )
);

create policy npc_shop_items_select_authenticated
on public.npc_shop_items
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_shop_items.npc_id
      and parent.deleted_at is null
      and (parent.status = 'published' or parent.owner_id = auth.uid())
  )
);

create policy npc_shop_items_insert_authenticated
on public.npc_shop_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_shop_items.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
);

create policy npc_shop_items_update_authenticated
on public.npc_shop_items
for update
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_shop_items.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_shop_items.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
);

-- row level security policies for npc_keywords
create policy npc_keywords_select_anon
on public.npc_keywords
for select
to anon
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keywords.npc_id
      and parent.deleted_at is null
      and parent.status = 'published'
  )
);

create policy npc_keywords_select_authenticated
on public.npc_keywords
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keywords.npc_id
      and parent.deleted_at is null
      and (parent.status = 'published' or parent.owner_id = auth.uid())
  )
);

create policy npc_keywords_insert_authenticated
on public.npc_keywords
for insert
to authenticated
with check (
  exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keywords.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
);

create policy npc_keywords_update_authenticated
on public.npc_keywords
for update
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keywords.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keywords.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
);

-- row level security policies for npc_keyword_phrases
create policy npc_keyword_phrases_select_anon
on public.npc_keyword_phrases
for select
to anon
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keyword_phrases.npc_id
      and parent.deleted_at is null
      and parent.status = 'published'
  )
);

create policy npc_keyword_phrases_select_authenticated
on public.npc_keyword_phrases
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keyword_phrases.npc_id
      and parent.deleted_at is null
      and (parent.status = 'published' or parent.owner_id = auth.uid())
  )
);

create policy npc_keyword_phrases_insert_authenticated
on public.npc_keyword_phrases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keyword_phrases.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
);

create policy npc_keyword_phrases_update_authenticated
on public.npc_keyword_phrases
for update
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keyword_phrases.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.npcs parent
    where parent.id = public.npc_keyword_phrases.npc_id
      and parent.deleted_at is null
      and parent.owner_id = auth.uid()
  )
);

-- row level security policies for telemetry_events
create policy telemetry_events_select_service_role
on public.telemetry_events
for select
to service_role
using (true);

create policy telemetry_events_insert_authenticated
on public.telemetry_events
for insert
to authenticated
with check (
  (user_id is null or user_id = auth.uid())
  and (
    npc_id is null
    or exists (
      select 1
      from public.npcs parent
      where parent.id = public.telemetry_events.npc_id
        and parent.deleted_at is null
        and parent.owner_id = auth.uid()
    )
  )
);

-- destructive policies (update/delete) are intentionally omitted for telemetry_events to keep logs immutable


