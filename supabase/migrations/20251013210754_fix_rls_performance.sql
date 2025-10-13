-- migration: fix rls performance warnings by using stable function calls
-- purpose: replace all `auth.uid()` calls in rls policies with `(select auth.uid())` to allow the query planner to cache the result and avoid per-row re-evaluation.
-- affects: rls policies on tables profiles, npcs, npc_shop_items, npc_keywords, npc_keyword_phrases, telemetry_events
-- notes: this change significantly improves query performance on tables with rls enabled.

-- drop and recreate the policy for 'profiles'
drop policy profiles_update_authenticated on public.profiles;
create policy profiles_update_authenticated
  on public.profiles
  for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- drop and recreate policies for 'npcs'
drop policy npcs_select_authenticated on public.npcs;
create policy npcs_select_authenticated
  on public.npcs
  for select
  to authenticated
  using ( deleted_at is null and (status = 'published' or owner_id = (select auth.uid())) );

drop policy npcs_insert_authenticated on public.npcs;
create policy npcs_insert_authenticated
  on public.npcs
  for insert
  to authenticated
  with check ( owner_id = (select auth.uid()) );

drop policy npcs_update_authenticated on public.npcs;
create policy npcs_update_authenticated
  on public.npcs
  for update
  to authenticated
  using ( deleted_at is null and owner_id = (select auth.uid()) )
  with check ( owner_id = (select auth.uid()) );

-- drop and recreate policies for 'npc_shop_items'
drop policy npc_shop_items_select_authenticated on public.npc_shop_items;
create policy npc_shop_items_select_authenticated
  on public.npc_shop_items
  for select
  to authenticated
  using (
    deleted_at is null and
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_shop_items.npc_id
        and parent.deleted_at is null
        and (parent.status = 'published' or parent.owner_id = (select auth.uid()))
    )
  );

drop policy npc_shop_items_insert_authenticated on public.npc_shop_items;
create policy npc_shop_items_insert_authenticated
  on public.npc_shop_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_shop_items.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  );

drop policy npc_shop_items_update_authenticated on public.npc_shop_items;
create policy npc_shop_items_update_authenticated
  on public.npc_shop_items
  for update
  to authenticated
  using (
    deleted_at is null and
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_shop_items.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_shop_items.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  );

-- drop and recreate policies for 'npc_keywords'
drop policy npc_keywords_select_authenticated on public.npc_keywords;
create policy npc_keywords_select_authenticated
  on public.npc_keywords
  for select
  to authenticated
  using (
    deleted_at is null and
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keywords.npc_id
        and parent.deleted_at is null
        and (parent.status = 'published' or parent.owner_id = (select auth.uid()))
    )
  );

drop policy npc_keywords_insert_authenticated on public.npc_keywords;
create policy npc_keywords_insert_authenticated
  on public.npc_keywords
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keywords.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  );

drop policy npc_keywords_update_authenticated on public.npc_keywords;
create policy npc_keywords_update_authenticated
  on public.npc_keywords
  for update
  to authenticated
  using (
    deleted_at is null and
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keywords.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keywords.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  );

-- drop and recreate policies for 'npc_keyword_phrases'
drop policy npc_keyword_phrases_select_authenticated on public.npc_keyword_phrases;
create policy npc_keyword_phrases_select_authenticated
  on public.npc_keyword_phrases
  for select
  to authenticated
  using (
    deleted_at is null and
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keyword_phrases.npc_id
        and parent.deleted_at is null
        and (parent.status = 'published' or parent.owner_id = (select auth.uid()))
    )
  );

drop policy npc_keyword_phrases_insert_authenticated on public.npc_keyword_phrases;
create policy npc_keyword_phrases_insert_authenticated
  on public.npc_keyword_phrases
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keyword_phrases.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  );

drop policy npc_keyword_phrases_update_authenticated on public.npc_keyword_phrases;
create policy npc_keyword_phrases_update_authenticated
  on public.npc_keyword_phrases
  for update
  to authenticated
  using (
    deleted_at is null and
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keyword_phrases.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keyword_phrases.npc_id
        and parent.deleted_at is null
        and parent.owner_id = (select auth.uid())
    )
  );

-- drop and recreate policy for 'telemetry_events'
drop policy telemetry_events_insert_authenticated on public.telemetry_events;
create policy telemetry_events_insert_authenticated
  on public.telemetry_events
  for insert
  to authenticated
  with check (
    (user_id is null or user_id = (select auth.uid())) and
    (
      npc_id is null or
      exists (
        select 1 from public.npcs parent
        where parent.id = public.telemetry_events.npc_id
          and parent.deleted_at is null
          and parent.owner_id = (select auth.uid())
      )
    )
  );
