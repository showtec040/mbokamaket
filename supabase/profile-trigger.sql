-- Profile schema, privacy view and Auth profile trigger.

alter table public.profiles enable row level security;

alter table public.profiles
  add column if not exists account_type text not null default 'personal';

alter table public.profiles
  add column if not exists business_name text;

alter table public.profiles
  add column if not exists business_categories text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('personal', 'boutique', 'magasin', 'agence_immo'));

create or replace view public.public_profiles as
select
  id,
  name,
  case when show_email or auth.uid() = id then email else null end as email,
  case when show_phone or auth.uid() = id then phone else null end as phone,
  role,
  avatar,
  bio,
  username,
  case when not is_private or auth.uid() = id then address else null end as address,
  created_at,
  is_private,
  show_phone,
  show_email,
  allow_messages,
  allow_follows,
  show_online_status,
  is_verified,
  verified_at,
  verified_by,
  account_type,
  business_name,
  business_categories,
  certification_requested_at
from public.profiles;

grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant select on public.public_profiles to anon, authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Create the profile after email, Google or Facebook registration.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role, account_type, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'role' in ('buyer', 'seller')
      then new.raw_user_meta_data ->> 'role'
      else 'buyer'
    end,
    case when new.raw_user_meta_data ->> 'account_type' in ('personal', 'boutique', 'magasin', 'agence_immo')
      then new.raw_user_meta_data ->> 'account_type'
      else 'personal'
    end,
    nullif(new.raw_user_meta_data ->> 'business_name', '')
  )
  on conflict (id) do update set
    name = coalesce(nullif(excluded.name, ''), public.profiles.name),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    role = excluded.role,
    account_type = excluded.account_type,
    business_name = excluded.business_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();
