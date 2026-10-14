-- Apply this migration before deploying guest checkout.
-- The guest's real name belongs to the private order row, not the public profile.
-- Set TURNSTILE_SECRET_KEY as a Supabase Edge Function secret and configure
-- VITE_TURNSTILE_SITE_KEY at build time. Disable CAPTCHA in Supabase Auth settings;
-- guest-order-captcha.sql enforces CAPTCHA only for anonymous order creation.
alter table public.orders
  add column if not exists buyer_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_buyer_name_length'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_buyer_name_length
      check (buyer_name is null or char_length(btrim(buyer_name)) between 1 and 120);
  end if;
end;
$$;

notify pgrst, 'reload schema';
