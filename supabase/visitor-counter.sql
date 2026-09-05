create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visited_at timestamptz not null default now()
);

alter table public.site_visits enable row level security;

drop policy if exists "Anyone can register a visit" on public.site_visits;
create policy "Anyone can register a visit"
  on public.site_visits for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can read visit count" on public.site_visits;
create policy "Anyone can read visit count"
  on public.site_visits for select
  to anon, authenticated
  using (true);