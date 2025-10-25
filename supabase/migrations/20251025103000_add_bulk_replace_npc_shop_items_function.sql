-- migration: add bulk_replace_npc_shop_items rpc
-- purpose: transactional replacement of npc shop items via single RPC
-- affects: function public.bulk_replace_npc_shop_items

set statement_timeout to 0;

create or replace function public.bulk_replace_npc_shop_items(
  p_npc_id uuid,
  p_items jsonb
)
returns setof public.npc_shop_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_deleted_at timestamptz;
  v_auth_role text := auth.role();
  v_auth_user uuid := auth.uid();
  v_items jsonb;
  v_items_count integer;
  v_now timestamptz := timezone('utc', now());
begin
  if p_npc_id is null then
    raise exception using errcode = '22023', message = 'INVALID_NPC_ID';
  end if;

  select owner_id, deleted_at
    into v_owner_id, v_deleted_at
  from public.npcs
  where id = p_npc_id
  limit 1;

  if not found or v_deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'NPC_NOT_FOUND';
  end if;

  if v_auth_role <> 'service_role' then
    if v_auth_user is null or v_owner_id is distinct from v_auth_user then
      raise exception using errcode = '42501', message = 'NPC_ACCESS_FORBIDDEN';
    end if;
  end if;

  v_items := coalesce(p_items -> 'items', '[]'::jsonb);

  if jsonb_typeof(v_items) <> 'array' then
    raise exception using errcode = '22P02', message = 'INVALID_ITEMS_PAYLOAD';
  end if;

  v_items_count := jsonb_array_length(v_items);

  if v_items_count > 255 then
    raise exception using errcode = 'P0001', message = 'NPC_SHOP_ITEM_LIMIT_EXCEEDED';
  end if;

  update public.npc_shop_items
     set deleted_at = v_now
   where npc_id = p_npc_id
     and deleted_at is null;

  if v_items_count = 0 then
    return;
  end if;

  return query
    insert into public.npc_shop_items (
      npc_id,
      list_type,
      name,
      item_id,
      price,
      subtype,
      charges,
      real_name,
      container_item_id
    )
    select
      p_npc_id,
      (item ->> 'listType')::public.npc_shop_item_list_type,
      item ->> 'name',
      (item ->> 'itemId')::integer,
      (item ->> 'price')::integer,
      coalesce((item ->> 'subtype')::integer, 0),
      coalesce((item ->> 'charges')::integer, 0),
      nullif(trim(item ->> 'realName'), ''),
      case
        when item ? 'containerItemId'
             and (item ->> 'containerItemId') is not null
             and trim(item ->> 'containerItemId') <> ''
        then (item ->> 'containerItemId')::integer
        else null
      end
    from jsonb_array_elements(v_items) as raw(item)
    returning *;
end;
$$;

comment on function public.bulk_replace_npc_shop_items(uuid, jsonb)
  is 'Soft deletes existing shop items for an NPC and inserts the provided items within a single transaction.';

grant execute on function public.bulk_replace_npc_shop_items(uuid, jsonb) to authenticated;

