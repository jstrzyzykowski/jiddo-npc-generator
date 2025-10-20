-- migration: allow owners to read deleted NPCs for RLS subqueries
-- purpose: adjust select policy so owner can access soft-deleted rows, enabling cascade updates
-- affects: policy npcs_select_authenticated on public.npcs
-- notes: keeps anon visibility unchanged

set statement_timeout to 0;
set lock_timeout to 0;

drop policy if exists npcs_select_authenticated on public.npcs;

create policy npcs_select_authenticated
  on public.npcs
  for select
  to authenticated
  using (
    (
      owner_id = (select auth.uid())
    )
    or (
      deleted_at is null
      and status = 'published'
    )
  );

