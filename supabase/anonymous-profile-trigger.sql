-- Fix profile creation for Supabase anonymous users.
-- Run this focused migration instead of rerunning profile-trigger.sql, which also
-- changes the public profile view and profile RLS policies.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role, account_type, business_name, show_email, is_private)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case
      when new.is_anonymous then 'anonymous+' || new.id::text || '@users.mbokamaket.invalid'
      else new.email
    end,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'role' in ('buyer', 'seller')
      then new.raw_user_meta_data ->> 'role'
      else 'buyer'
    end,
    case when new.raw_user_meta_data ->> 'account_type' in ('personal', 'boutique', 'magasin', 'agence_immo')
      then new.raw_user_meta_data ->> 'account_type'
      else 'personal'
    end,
    nullif(new.raw_user_meta_data ->> 'business_name', ''),
    not coalesce(new.is_anonymous, false),
    coalesce(new.is_anonymous, false)
  )
  on conflict (id) do update set
    name = coalesce(nullif(excluded.name, ''), public.profiles.name),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    role = excluded.role,
    account_type = excluded.account_type,
    business_name = excluded.business_name,
    show_email = case when new.is_anonymous then false else public.profiles.show_email end,
    is_private = case when new.is_anonymous then true else public.profiles.is_private end;

  return new;
end;
$$;
