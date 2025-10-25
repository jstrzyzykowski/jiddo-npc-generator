-- migration: add bulk_replace_npc_keywords rpc
-- purpose: transactional replacement of npc keywords and phrases via single RPC
-- affects: function public.bulk_replace_npc_keywords

set statement_timeout to 0;

create or replace function public.bulk_replace_npc_keywords(
  p_npc_id uuid,
  p_owner_id uuid,
  p_keywords jsonb
)
returns table (
  id uuid,
  npc_id uuid,
  response text,
  sort_index integer,
  created_at timestamptz,
  updated_at timestamptz,
  phrases jsonb
)
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
  v_item jsonb;
  v_response text;
  v_sort_index integer;
  v_phrases jsonb;
  v_phrase_value text;
  v_phrase_record record;
  v_keyword_row public.npc_keywords%rowtype;
begin
  if p_npc_id is null then
    raise exception using errcode = '22023', message = 'INVALID_NPC_ID';
  end if;

  if p_owner_id is null then
    raise exception using errcode = '22023', message = 'INVALID_OWNER_ID';
  end if;

  select owner_id, deleted_at
    into v_owner_id, v_deleted_at
  from public.npcs
  where id = p_npc_id
  limit 1;

  if not found or v_deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'NPC_NOT_FOUND';
  end if;

  if v_owner_id is distinct from p_owner_id then
    raise exception using errcode = '42501', message = 'NPC_ACCESS_FORBIDDEN';
  end if;

  if v_auth_role <> 'service_role' then
    if v_auth_user is null or v_auth_user is distinct from v_owner_id then
      raise exception using errcode = '42501', message = 'NPC_ACCESS_FORBIDDEN';
    end if;
  end if;

  v_items := coalesce(p_keywords -> 'items', '[]'::jsonb);

  if jsonb_typeof(v_items) <> 'array' then
    raise exception using errcode = '22P02', message = 'INVALID_ITEMS_PAYLOAD';
  end if;

  v_items_count := jsonb_array_length(v_items);

  if v_items_count > 255 then
    raise exception using errcode = 'P0001', message = 'NPC_KEYWORD_LIMIT_EXCEEDED';
  end if;

  update public.npc_keyword_phrases
     set deleted_at = v_now
   where npc_id = p_npc_id
     and deleted_at is null;

  update public.npc_keywords
     set deleted_at = v_now
   where npc_id = p_npc_id
     and deleted_at is null;

  if v_items_count = 0 then
    return;
  end if;

  for v_item in
    select item
    from jsonb_array_elements(v_items) as raw(item)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = '22P02', message = 'INVALID_ITEMS_PAYLOAD';
    end if;

    v_response := v_item ->> 'response';
    if v_response is null or length(trim(v_response)) = 0 or length(v_response) > 512 then
      raise exception using errcode = '22P02', message = 'INVALID_KEYWORD_RESPONSE';
    end if;
    v_response := trim(v_response);

    begin
      v_sort_index := (v_item ->> 'sortIndex')::integer;
    exception when others then
      raise exception using errcode = '22P02', message = 'INVALID_KEYWORD_SORT_INDEX';
    end;

    if v_sort_index is null or v_sort_index < 0 then
      raise exception using errcode = '22P02', message = 'INVALID_KEYWORD_SORT_INDEX';
    end if;

    v_phrases := v_item -> 'phrases';
    if v_phrases is null or jsonb_typeof(v_phrases) <> 'array' then
      raise exception using errcode = '22P02', message = 'INVALID_KEYWORD_PHRASES';
    end if;

    if jsonb_array_length(v_phrases) = 0 then
      raise exception using errcode = '22P02', message = 'INVALID_KEYWORD_PHRASES';
    end if;

    insert into public.npc_keywords (npc_id, response, sort_index)
    values (p_npc_id, v_response, v_sort_index)
    returning * into v_keyword_row;

    for v_phrase_record in
      select phrase_text, ordinality
      from jsonb_array_elements_text(v_phrases) with ordinality as raw(phrase_text, ordinality)
    loop
      v_phrase_value := trim(v_phrase_record.phrase_text);

      if v_phrase_value is null or length(v_phrase_value) = 0 or length(v_phrase_value) > 64 then
        raise exception using errcode = '22P02', message = 'INVALID_KEYWORD_PHRASE';
      end if;

      insert into public.npc_keyword_phrases (npc_id, keyword_id, phrase)
      values (p_npc_id, v_keyword_row.id, v_phrase_value);
    end loop;
  end loop;

  return query
    select
      k.id,
      k.npc_id,
      k.response,
      k.sort_index,
      k.created_at,
      k.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'phrase', p.phrase
          )
          order by p.created_at, p.id
        ) filter (where p.id is not null),
        '[]'::jsonb
      ) as phrases
    from public.npc_keywords k
    left join public.npc_keyword_phrases p
      on p.keyword_id = k.id
     and p.deleted_at is null
    where k.npc_id = p_npc_id
      and k.deleted_at is null
    group by k.id, k.npc_id, k.response, k.sort_index, k.created_at, k.updated_at
    order by k.sort_index, k.created_at, k.id;
end;
$$;

comment on function public.bulk_replace_npc_keywords(uuid, uuid, jsonb)
  is 'Soft deletes existing keywords and phrases for an NPC and inserts the provided data within a single transaction.';

grant execute on function public.bulk_replace_npc_keywords(uuid, uuid, jsonb) to authenticated;


