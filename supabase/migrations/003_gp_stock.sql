-- One stock row per product. The inventory list reads this row.
-- min_on_hand null means no minimum. on_hand at or below the minimum is for re-stock.

create table if not exists public.gp_product_stock (
  product_id bigint primary key references public.gp_products (id) on delete cascade,
  uom text not null default '1 Piece',
  on_hand numeric(14, 3) not null default 0,
  min_on_hand numeric(14, 3),
  updated_at timestamptz not null default now(),
  constraint gp_product_stock_on_hand_nonnegative check (on_hand >= 0),
  constraint gp_product_stock_min_nonnegative check (min_on_hand is null or min_on_hand >= 0)
);

alter table public.gp_product_stock enable row level security;

revoke all on table public.gp_product_stock from anon, authenticated;
grant select, insert, update, delete on table public.gp_product_stock to authenticated;

drop policy if exists gp_product_stock_authenticated on public.gp_product_stock;
create policy gp_product_stock_authenticated
  on public.gp_product_stock
  for all
  to authenticated
  using (true)
  with check (true);

with seed as (
  select *
  from (
    values
      ('RACK'::text, 'SAND BAG RACK'::text, 'sand-bag-rck'::text, '1 Piece'::text, 5::numeric, 0::numeric),
      ('ACCESSORIES', 'BASKETBALL BOARD W/ RING', 'BASKETBALL-WHOOP', '2 Piece', 0, 0),
      ('MACHINE', 'PRC/DEC FLY ELITE EDGE', 'U2007C', '1 Piece', 2, 0),
      ('MACHINE', 'ELITE EDGE LEG CURL/LEG EXTENSION', 'U2086C', '1 Piece', 3, 0),
      ('MACHINE', 'PECTORAL MACHINE', 'U3004C', '1 Piece', 1, null),
      ('MACHINE', 'LOW ROW PLATE LOADED', 'Y925Z', '1 Piece', 1, 0),
      ('MACHINE', 'LAT & PULLEY MACHINE ELITE EDGE', 'U2085C', '1 Piece', 2, null),
      ('MACHINE', 'DIP/CHIN ASSIST ELITE EDGE', 'U2009C', '1 Piece', 3, 0),
      ('MACHINE', 'CHEST TO SHOULDER PRESS ELITE EDGE', 'U2084C', '1 Piece', 3, 0),
      ('MACHINE', 'CAMBER CURL & TRICEPS ELITE EDGE', 'U2087C', '1 Piece', 2, 0),
      ('ARTIFICIAL GRASS', 'LUXUOR LIVING ARTIFICIAL GRASS 40MM', 'GRASS-40MM', '1 Piece', 2, 0),
      ('ARTIFICIAL GRASS', 'LUXUOR LIVING ARTIFICIAL GRASS 35MM', 'GRASS-35MM', '1 Piece', 0, 0),
      ('ARTIFICIAL GRASS', 'LUXUOR LIVING ARTIFICIAL GRASS 30MM', 'GRASS-30MM', '1 Piece', 0, 0),
      ('ARTIFICIAL GRASS', 'LUXUOR LIVING ARTIFICIAL GRASS 25MM', 'GRASS-25MM', '1 Piece', 0, 0)
  ) as rows(category_name, name, sku, uom, on_hand, min_on_hand)
),
inserted as (
  insert into public.gp_products (category_id, name, sku)
  select category.id, seed.name, seed.sku
  from seed
  join public.gp_categories category on category.name_key = lower(seed.category_name)
  where not exists (
    select 1
    from public.gp_products product
    where lower(product.sku) = lower(seed.sku)
  )
  returning id, sku
)
insert into public.gp_product_stock (product_id, uom, on_hand, min_on_hand)
select product.id, seed.uom, seed.on_hand, seed.min_on_hand
from seed
join (
  select id, sku from inserted
  union
  select id, sku from public.gp_products
) product on lower(product.sku) = lower(seed.sku)
where not exists (
  select 1
  from public.gp_product_stock stock
  where stock.product_id = product.id
);

comment on table public.gp_product_stock is
  'Current count for one product. The inventory list is this row joined to gp_products.';
