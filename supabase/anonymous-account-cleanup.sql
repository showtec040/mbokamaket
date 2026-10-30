-- Run as the Supabase database owner after guest checkout has been configured.
-- Anonymous accounts older than 24 hours are deleted every 15 minutes.
-- Their order records and delivery details are preserved for sellers.

do $$
declare
  buyer_id_attnum smallint;
  foreign_key record;
begin
  select attnum
    into buyer_id_attnum
    from pg_attribute
   where attrelid = 'public.orders'::regclass
     and attname = 'buyer_id'
     and not attisdropped;

  if buyer_id_attnum is null then
    raise exception 'La colonne public.orders.buyer_id est introuvable.';
  end if;

  for foreign_key in
    select conname
      from pg_constraint
     where conrelid = 'public.orders'::regclass
       and contype = 'f'
       and confrelid = 'auth.users'::regclass
       and buyer_id_attnum = any(conkey)
  loop
    execute format('alter table public.orders drop constraint %I', foreign_key.conname);
  end loop;

  alter table public.orders alter column buyer_id drop not null;
  alter table public.orders
    add constraint orders_buyer_id_fkey
    foreign key (buyer_id) references auth.users (id) on delete set null;
end;
$$;

create or replace function public.cleanup_expired_anonymous_accounts()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  expired_user_id uuid;
  removed_count integer := 0;
  affected_rows integer;
begin
  for expired_user_id in
    select id
      from auth.users
     where is_anonymous
       and created_at < statement_timestamp() - interval '24 hours'
     order by created_at
     limit 500
  loop
    if to_regclass('public.conversations') is not null then
      if to_regclass('public.messages') is not null then
        execute $sql$
          delete from public.messages
           where sender_id = $1
              or recipient_id = $1
              or conversation_id in (
                select id
                  from public.conversations
                 where buyer_id = $1 or seller_id = $1
              )
        $sql$ using expired_user_id;
      end if;

      if to_regclass('public.conversation_user_visibility') is not null then
        execute $sql$
          delete from public.conversation_user_visibility
           where user_id = $1
              or conversation_id in (
                select id
                  from public.conversations
                 where buyer_id = $1 or seller_id = $1
              )
        $sql$ using expired_user_id;
      end if;

      execute $sql$
        delete from public.conversations
         where buyer_id = $1 or seller_id = $1
      $sql$ using expired_user_id;
    end if;

    if to_regclass('public.product_comments') is not null then
      execute 'delete from public.product_comments where user_id = $1'
        using expired_user_id;
    end if;

    delete from auth.users where id = expired_user_id;
    get diagnostics affected_rows = row_count;
    removed_count := removed_count + affected_rows;
  end loop;

  return removed_count;
end;
$$;

revoke all on function public.cleanup_expired_anonymous_accounts() from public, anon, authenticated, service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
      from cron.job
     where jobname = 'cleanup-expired-anonymous-accounts'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'cleanup-expired-anonymous-accounts',
    '*/15 * * * *',
    'select public.cleanup_expired_anonymous_accounts();'
  );
end;
$$;
