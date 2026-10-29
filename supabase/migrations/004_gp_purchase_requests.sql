-- A purchase request is one header and many product lines.
-- Suggested quantity is stored on the line so a later stock change does not rewrite a saved request.
-- Last delivery is not stored. There is no receiving history yet.

create table if not exists public.gp_purchase_requests (
  id bigint generated always as identity primary key,
  pr_no text not null,
  pr_date date not null,
  ship_date_from date not null,
  ship_date_to date not null,
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gp_purchase_requests_pr_no_len check (char_length(btrim(pr_no)) between 1 and 40),
  constraint gp_purchase_requests_notes_len check (char_length(notes) <= 2000),
  constraint gp_purchase_requests_ship_range check (ship_date_to >= ship_date_from)
);

create unique index if not exists gp_purchase_requests_pr_no_key
  on public.gp_purchase_requests (lower(btrim(pr_no)));

create table if not exists public.gp_purchase_request_lines (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.gp_purchase_requests (id) on delete cascade,
  line_no integer not null,
  product_id bigint not null references public.gp_products (id) on delete restrict,
  qty_sold numeric(14, 3) not null default 0,
  lead_time_days integer not null default 1,
  suggested_qty numeric(14, 3) not null default 0,
  qty_request numeric(14, 3) not null default 0,
  constraint gp_purchase_request_lines_line_no check (line_no > 0),
  constraint gp_purchase_request_lines_qty_sold check (qty_sold >= 0),
  constraint gp_purchase_request_lines_lead check (lead_time_days >= 0 and lead_time_days <= 3650),
  constraint gp_purchase_request_lines_qty_request check (qty_request >= 0),
  constraint gp_purchase_request_lines_request_line unique (request_id, line_no)
);

create index if not exists gp_purchase_request_lines_product_idx
  on public.gp_purchase_request_lines (product_id);

alter table public.gp_purchase_requests enable row level security;
alter table public.gp_purchase_request_lines enable row level security;

revoke all on table public.gp_purchase_requests from anon, authenticated;
revoke all on table public.gp_purchase_request_lines from anon, authenticated;
grant select, insert, update, delete on table public.gp_purchase_requests to authenticated;
grant select, insert, update, delete on table public.gp_purchase_request_lines to authenticated;

drop policy if exists gp_purchase_requests_authenticated on public.gp_purchase_requests;
create policy gp_purchase_requests_authenticated
  on public.gp_purchase_requests
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists gp_purchase_request_lines_authenticated on public.gp_purchase_request_lines;
create policy gp_purchase_request_lines_authenticated
  on public.gp_purchase_request_lines
  for all
  to authenticated
  using (true)
  with check (true);

comment on table public.gp_purchase_requests is
  'Header for one purchase request: number, dates, and notes.';

comment on table public.gp_purchase_request_lines is
  'One product row on a purchase request. suggested_qty uses qty sold, lead time, min threshold, and on-hand at save time.';
