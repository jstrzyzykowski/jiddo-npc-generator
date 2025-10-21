-- Drop the old, more restrictive insert policy
drop policy if exists "telemetry_events_insert_authenticated" on public.telemetry_events;

-- Create a new insert policy allowing users to log events for their own NPCs, even after a soft delete.
create policy "telemetry_events_insert_authenticated"
on public.telemetry_events
for insert
to authenticated
with check (
  (user_id = auth.uid()) and
  (
    npc_id is null or
    exists (
      select 1
      from public.npcs
      where npcs.id = telemetry_events.npc_id and npcs.owner_id = auth.uid()
    )
  )
);

-- Create a new select policy for users to view their own telemetry data, which can be useful for debugging.
create policy "telemetry_events_select_authenticated"
on public.telemetry_events
for select
to authenticated
using (user_id = auth.uid());
