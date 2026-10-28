-- Prepared migration for atomic daily AI quota reservations.
-- Do not execute against production without separate approval.
create table if not exists public.ai_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  plan_code text not null
);
create index if not exists ai_quota_reservations_user_expiry_idx on public.ai_quota_reservations(user_id, expires_at);
alter table public.ai_quota_reservations enable row level security;
revoke all on public.ai_quota_reservations from anon, authenticated;
grant all on public.ai_quota_reservations to service_role;

create or replace function public.reserve_ai_quota(p_user_id uuid, p_daily_limit integer, p_plan_code text, p_ttl_seconds integer default 120)
returns table(reservation_id uuid, allowed boolean, used integer, daily_limit integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_used integer; v_id uuid;
begin
 if p_user_id is null or p_daily_limit < 1 then raise exception 'Invalid quota reservation arguments'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
 delete from public.ai_quota_reservations where user_id=p_user_id and expires_at<=now();
 select (select count(*)::integer from public.usage_events ue where ue.user_id=p_user_id and ue.event_type='ai_request' and ue.created_at >= ((date_trunc('day', now() at time zone 'utc')) at time zone 'utc')) + (select count(*)::integer from public.ai_quota_reservations ar where ar.user_id=p_user_id and ar.expires_at>now()) into v_used;
 if v_used >= p_daily_limit then return query select null::uuid,false,v_used,p_daily_limit; return; end if;
 insert into public.ai_quota_reservations(user_id,expires_at,plan_code) values(p_user_id,now()+make_interval(secs=>greatest(1,least(p_ttl_seconds,120))),p_plan_code) returning id into v_id;
 return query select v_id,true,v_used+1,p_daily_limit;
end; $$;
create or replace function public.finalize_ai_quota(p_reservation_id uuid,p_user_id uuid,p_provider text,p_model text,p_plan_code text,p_usage jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_res public.ai_quota_reservations%rowtype;
begin
 select * into v_res from public.ai_quota_reservations where id=p_reservation_id and user_id=p_user_id for update;
 if not found or v_res.expires_at<=now() then if found then delete from public.ai_quota_reservations where id=p_reservation_id; end if; return false; end if;
 insert into public.usage_events(user_id,event_type,provider,model,details) values(p_user_id,'ai_request',p_provider,p_model,jsonb_build_object('plan',p_plan_code,'usage',coalesce(p_usage,'{}'::jsonb)));
 delete from public.ai_quota_reservations where id=p_reservation_id; return true;
end; $$;
create or replace function public.release_ai_quota(p_reservation_id uuid,p_user_id uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_deleted integer;
begin delete from public.ai_quota_reservations where id=p_reservation_id and user_id=p_user_id; get diagnostics v_deleted=row_count; return v_deleted>0; end; $$;
revoke all on function public.reserve_ai_quota(uuid,integer,text,integer) from public,anon,authenticated;
revoke all on function public.finalize_ai_quota(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.release_ai_quota(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_ai_quota(uuid,integer,text,integer) to service_role;
grant execute on function public.finalize_ai_quota(uuid,uuid,text,text,text,jsonb) to service_role;
grant execute on function public.release_ai_quota(uuid,uuid) to service_role;
