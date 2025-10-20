-- migration: enable soft delete updates for npcs table
-- purpose: allow owners to set deleted_at while preserving existing update protections
-- affects: policy npcs_soft_delete_authenticated on public.npcs
-- notes: adds dedicated UPDATE policy so soft delete operations pass RLS checks

set statement_timeout to 0;
set lock_timeout to 0;

drop policy if exists npcs_soft_delete_authenticated on public.npcs;

create policy npcs_soft_delete_authenticated
  on public.npcs
  for update
  to authenticated
  using (
    deleted_at is null
    and owner_id = (select auth.uid())
  )
  with check (
    owner_id = (select auth.uid())
  );

