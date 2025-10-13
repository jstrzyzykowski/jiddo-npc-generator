-- migration: fix function search path security warnings
-- purpose: apply a secure search_path to all trigger functions to mitigate CVE-2018-1058
-- affects: functions set_updated_at, prevent_npc_owner_change, propagate_npc_soft_delete, enforce_npc_publish_ready, enforce_npc_shop_item_limit, enforce_npc_keyword_limit, enforce_keyword_phrase_rules
-- notes: this change hardens the database against search path hijacking attacks

alter function public.set_updated_at() set search_path = public;
alter function public.prevent_npc_owner_change() set search_path = public;
alter function public.propagate_npc_soft_delete() set search_path = public;
alter function public.enforce_npc_publish_ready() set search_path = public;
alter function public.enforce_npc_shop_item_limit() set search_path = public;
alter function public.enforce_npc_keyword_limit() set search_path = public;
alter function public.enforce_keyword_phrase_rules() set search_path = public;
