-- Catalog: one category has many products. One product belongs to one category.
-- A category with shown_in_list = true becomes a tab on the product list.
-- Deleting a category is refused while any product still points at it.

create table if not exists public.gp_categories (
  id bigint generated always as identity primary key,
  name text not null,
  name_key text generated always as (lower(btrim(name))) stored,
  picture_url text not null default '',
  order_sequence integer not null default 0,
  shown_in_list boolean not null default true,
  created_at timestamptz not null default now(),
  constraint gp_categories_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint gp_categories_order_nonnegative check (order_sequence >= 0),
  constraint gp_categories_name_key unique (name_key)
);

create table if not exists public.gp_products (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.gp_categories (id) on delete restrict,
  name text not null,
  sku text not null default '',
  description text not null default '',
  image_url text not null default '',
  supplier text not null default '',
  barcode text not null default '',
  selling_price numeric(14, 2) not null default 0,
  cost numeric(14, 2) not null default 0,
  net_price numeric(14, 2) not null default 0,
  loyalty_points numeric(14, 2) not null default 0,
  commission numeric(14, 2) not null default 0,
  weight_kg numeric(12, 3) not null default 0,
  dimension_w_cm numeric(12, 2) not null default 0,
  dimension_h_cm numeric(12, 2) not null default 0,
  vat_exempted boolean not null default true,
  visible_to_customer boolean not null default true,
  track_quantity boolean not null default false,
  sell_without_stock boolean not null default false,
  is_rental boolean not null default false,
  is_addon boolean not null default false,
  total_qty_sold numeric(14, 3) not null default 0,
  created_at timestamptz not null default now(),
  constraint gp_products_name_len check (char_length(btrim(name)) between 1 and 120),
  constraint gp_products_money_nonnegative check (
    selling_price >= 0
    and cost >= 0
    and net_price >= 0
    and loyalty_points >= 0
    and commission >= 0
    and weight_kg >= 0
    and dimension_w_cm >= 0
    and dimension_h_cm >= 0
    and total_qty_sold >= 0
  )
);

create index if not exists gp_products_category_idx
  on public.gp_products (category_id);

create unique index if not exists gp_products_sku_idx
  on public.gp_products (lower(sku))
  where sku <> '';

alter table public.gp_categories enable row level security;
alter table public.gp_products enable row level security;

revoke all on table public.gp_categories from anon, authenticated;
grant select, insert, update, delete on table public.gp_categories to authenticated;

revoke all on table public.gp_products from anon, authenticated;
grant select, insert, update, delete on table public.gp_products to authenticated;

drop policy if exists gp_categories_authenticated on public.gp_categories;
create policy gp_categories_authenticated
  on public.gp_categories
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists gp_products_authenticated on public.gp_products;
create policy gp_products_authenticated
  on public.gp_products
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.gp_categories (name, order_sequence, shown_in_list)
select seed.name, seed.order_sequence, seed.shown_in_list
from (
  values
    ('DUMBBELL', 0, true),
    ('OLYMPIC PLATE', 0, true),
    ('WEIGHTS', 0, true),
    ('BAR', 0, true),
    ('BARBELL', 0, true),
    ('RACK', 0, true),
    ('MACHINE', 0, true),
    ('BENCH', 0, true),
    ('FLOOR MATS', 0, true),
    ('ACCESSORIES', 0, true),
    ('ARTIFICIAL GRASS', 0, true)
) as seed(name, order_sequence, shown_in_list)
where not exists (
  select 1
  from public.gp_categories existing
  where existing.name_key = lower(seed.name)
);

insert into public.gp_products (
  category_id,
  name,
  sku,
  selling_price,
  cost,
  vat_exempted,
  visible_to_customer,
  created_at
)
select
  category.id,
  'INSTALLATION FEE',
  '1245',
  10000,
  10000,
  true,
  true,
  timestamptz '2026-10-20 12:00:00+08'
from public.gp_categories category
where category.name_key = 'accessories'
  and not exists (
    select 1
    from public.gp_products product
    where product.category_id = category.id
      and product.sku = '1245'
  );

comment on table public.gp_categories is
  'Product groups. shown_in_list adds the category as a tab on the product list.';
comment on table public.gp_products is
  'Sellable items. category_id is required, so every product sits in exactly one category.';
comment on column public.gp_products.category_id is
  'Parent category. ON DELETE RESTRICT keeps a category while products still use it.';
