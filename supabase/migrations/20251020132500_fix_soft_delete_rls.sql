-- migration: adjust RLS policies to support NPC soft delete cascade
-- purpose: drop redundant soft delete policy and relax child table update checks when parent is deleted
-- affects: policies on public.npcs, public.npc_shop_items, public.npc_keywords, public.npc_keyword_phrases
-- notes: keeps ownership checks intact while allowing trigger-driven propagation

set statement_timeout to 0;
set lock_timeout to 0;

-- allow shop item updates regardless of parent deleted state (still owner-scoped)
drop policy if exists npc_shop_items_update_authenticated on public.npc_shop_items;
create policy npc_shop_items_update_authenticated
  on public.npc_shop_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_shop_items.npc_id
        and parent.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_shop_items.npc_id
        and parent.owner_id = (select auth.uid())
    )
  );

-- allow keyword updates during soft delete cascade
drop policy if exists npc_keywords_update_authenticated on public.npc_keywords;
create policy npc_keywords_update_authenticated
  on public.npc_keywords
  for update
  to authenticated
  using (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keywords.npc_id
        and parent.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keywords.npc_id
        and parent.owner_id = (select auth.uid())
    )
  );

-- allow keyword phrase updates during soft delete cascade
drop policy if exists npc_keyword_phrases_update_authenticated on public.npc_keyword_phrases;
create policy npc_keyword_phrases_update_authenticated
  on public.npc_keyword_phrases
  for update
  to authenticated
  using (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keyword_phrases.npc_id
        and parent.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.npcs parent
      where parent.id = public.npc_keyword_phrases.npc_id
        and parent.owner_id = (select auth.uid())
    )
  );

