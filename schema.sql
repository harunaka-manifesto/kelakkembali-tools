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
