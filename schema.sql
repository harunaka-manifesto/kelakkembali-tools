-- =========================================================================
-- Kelak Kembali — Quotation & Invoice Generator
-- Supabase schema. Run once, whole file, in the SQL Editor.
--
-- Safe to re-run: every statement is idempotent.
-- =========================================================================

create extension if not exists pgcrypto;

-- ------------------------------- Customers -------------------------------

create table if not exists public.customers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  phone              text,
  instagram          text,
  -- Where the enquiry came from. Free text would drift into "ig"/"IG"/"insta"
  -- within a month, so it is constrained.
  source             text check (source in ('Instagram', 'TikTok', 'Referral', 'Walk-in', 'Other')),
  wedding_date       date,
  fitting_1_date     date,   -- estimated first fitting
  final_fitting_date date,   -- estimated final fitting
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- The list is sorted by what is coming up soonest.
create index if not exists customers_wedding_date_idx on public.customers (wedding_date);

-- -------------------------------- Orders ---------------------------------

-- items and includes are jsonb rather than child tables. Both are short,
-- always read and written whole, and order-sensitive — a child table would buy
-- nothing here and cost a position column plus two round trips per save.
--   items:    [{ "name": text, "qty": int, "price": int }]
--   includes: [text]  — the ticked labels, in display order
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers (id) on delete cascade,
  document_date date not null default current_date,
  status        text not null default 'Draft'
                check (status in ('Draft', 'Quoted', 'Confirmed', 'In production', 'Delivered')),
  items         jsonb not null default '[]'::jsonb,
  includes      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on public.orders (customer_id);

-- ----------------------------- Document log ------------------------------

-- A paper trail of the numbers, not the files: what was generated, when, and
-- for how much. Kept if the order is later edited, so you can still see that
-- the quotation sent in March said something different.
create table if not exists public.document_log (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  kind       text not null check (kind in ('quotation', 'invoice')),
  total      bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists document_log_order_id_idx on public.document_log (order_id, created_at desc);

-- ------------------------------ updated_at -------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
  before update on public.customers
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ------------------------------ Row security -----------------------------

-- The anon key is committed to the repo and served to every visitor, so it has
-- to be worthless on its own. These policies grant nothing to `anon`: every
-- read and write requires a signed-in session, which only the shared account's
-- password produces.

alter table public.customers    enable row level security;
alter table public.orders       enable row level security;
alter table public.document_log enable row level security;

drop policy if exists "signed-in full access" on public.customers;
create policy "signed-in full access" on public.customers
  for all to authenticated using (true) with check (true);

drop policy if exists "signed-in full access" on public.orders;
create policy "signed-in full access" on public.orders
  for all to authenticated using (true) with check (true);

drop policy if exists "signed-in full access" on public.document_log;
create policy "signed-in full access" on public.document_log
  for all to authenticated using (true) with check (true);

-- =========================================================================
-- Migration — dashboard UX overhaul
--
-- Multiple orders per customer (bride, groom, family) each need their own
-- fitting schedule, so the two fitting-date columns move from customers to
-- orders. Orders also gain an optional title (bride/groom/etc, falls back to
-- the item list in the UI when blank) and a payment/action history. Draft is
-- dropped from the order status list: an order is created only once it's
-- about to be quoted, so there was never really a draft stage in practice.
-- =========================================================================

-- ---------------------- Orders: title + fitting dates ---------------------

alter table public.orders add column if not exists title text;
alter table public.orders add column if not exists fitting_1_date date;
alter table public.orders add column if not exists final_fitting_date date;

-- items shape is now [{ "name": text, "qty": int, "price": int, "cost": int }].
-- cost is the estimated per-unit production cost — used only for the profit
-- figure on the order detail page, never rendered on the quotation or invoice.

-- Carry each customer's fitting dates onto their order, but only when there
-- is exactly one — with two or more orders there is no way to know which one
-- the shared date belonged to, so those are left null rather than guessed.
update public.orders o
set fitting_1_date     = c.fitting_1_date,
    final_fitting_date = c.final_fitting_date
from public.customers c
where o.customer_id = c.id
  and o.fitting_1_date is null
  and o.final_fitting_date is null
  and (c.fitting_1_date is not null or c.final_fitting_date is not null)
  and (select count(*) from public.orders o2 where o2.customer_id = c.id) = 1;

-- Fitting dates now live on the order, not the customer.
alter table public.customers drop column if exists fitting_1_date;
alter table public.customers drop column if exists final_fitting_date;

-- --------------------------- Orders: drop Draft ---------------------------

-- Existing rows first, so the tightened constraint below never rejects data
-- that is already sitting in the table.
update public.orders set status = 'Quoted' where status = 'Draft';

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('Quoted', 'Confirmed', 'In production', 'Delivered'));
alter table public.orders alter column status set default 'Quoted';

-- ------------------------------ Order history ------------------------------

-- What happened to an order and when — separate from document_log, which is
-- specifically the paper trail of quotation/invoice downloads and their
-- totals. The two are merged only when the order detail page renders them.
--   detail shapes:
--     created / updated        -> {}
--     payment_logged           -> { "deposit_index": 0|1|2,
--                                    "deposit_label": text, "amount": int }
create table if not exists public.order_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  action     text not null check (action in ('created', 'updated', 'payment_logged')),
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_history_order_id_idx on public.order_history (order_id, created_at desc);

alter table public.order_history enable row level security;

drop policy if exists "signed-in full access" on public.order_history;
create policy "signed-in full access" on public.order_history
  for all to authenticated using (true) with check (true);
