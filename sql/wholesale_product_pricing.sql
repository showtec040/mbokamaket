alter table public.produits
  add column if not exists wholesale_price numeric;

alter table public.produits
  drop constraint if exists produits_wholesale_price_valid;

alter table public.produits
  add constraint produits_wholesale_price_valid
  check (wholesale_price is null or (wholesale_price > 0 and wholesale_price < price));
