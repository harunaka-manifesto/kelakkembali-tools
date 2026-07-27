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
--
-- Wrapped in a guard because the two DROPs below it remove the very columns it
-- reads: on the second run of this file there is nothing left to carry over,
-- and a plain statement would fail at parse time rather than quietly finding no
-- rows. Inside `execute` the body is only parsed if the guard lets it run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'fitting_1_date'
  ) then
    execute $mig$
      update public.orders o
      set fitting_1_date     = c.fitting_1_date,
          final_fitting_date = c.final_fitting_date
      from public.customers c
      where o.customer_id = c.id
        and o.fitting_1_date is null
        and o.final_fitting_date is null
        and (c.fitting_1_date is not null or c.final_fitting_date is not null)
        and (select count(*) from public.orders o2 where o2.customer_id = c.id) = 1
    $mig$;
  end if;
end
$$;

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

-- =========================================================================
-- Migration — document name + payment schemes
--
-- Two things that were being inferred and should not have been.
--
-- doc_name: the name printed on the quotation and invoice was the customer's
-- own name, which is wrong as often as it is right — the record is filed under
-- whoever books and pays, and the document is addressed to whoever the outfit
-- is for. They are now separate fields, and the order asks for its own.
--
-- payment_scheme / payment_terms: the 35/35/30 split is the wedding-attire
-- package's, not the studio's. Other services are quoted on their own terms, so
-- an order can now carry its own list. Standard orders store nothing and keep
-- using the built-in split, so nothing already in the table has to be migrated.
--   payment_terms: [{ "label": text, "percent": number, "desc": text }]
-- =========================================================================

alter table public.orders add column if not exists doc_name text;

alter table public.orders add column if not exists payment_scheme text not null default 'standard';
alter table public.orders drop constraint if exists orders_payment_scheme_check;
alter table public.orders add constraint orders_payment_scheme_check
  check (payment_scheme in ('standard', 'other'));

alter table public.orders add column if not exists payment_terms jsonb not null default '[]'::jsonb;

-- =========================================================================
-- Migration — fitting schedule + Google Calendar
--
-- The two dates an order already carries are the ends of a programme, not the
-- whole of it: fitting_1_date is when the client comes in to be measured, and
-- final_fitting_date is the last time they are seen before the wedding. The
-- three fittings in between were only ever in someone's head.
--
-- They are derivable, so they are now derived — evenly spaced between the two
-- anchors, never closer together than production can keep up with. The result
-- is stored rather than computed on read because each row has to remember the
-- Google event it created, so that moving a date moves that event instead of
-- adding a second one.
-- =========================================================================

-- ---------------------------- Fitting schedule ----------------------------

-- One row per appointment, anchors included: the anchors are what the client
-- was promised and belong in the calendar as much as the fittings do. Rows are
-- rewritten wholesale whenever the order's dates change, which is why the
-- Google id has to survive that rewrite — see replaceOrderEvents in db.js.
--
-- A tight window drops the middle fittings rather than crowding them, so an
-- order may legitimately have fewer than five rows. The unique constraint is
-- on (order_id, stage) rather than a position column for exactly that reason:
-- "Fitting 3" means the same thing whether or not "Fitting 2" exists.
create table if not exists public.order_events (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  stage           text not null check (stage in (
                    'Body measurements', 'Fitting 1', 'Fitting 2', 'Fitting 3',
                    'Final fitting')),
  event_date      date not null,
  google_event_id text,        -- null until the first successful sync
  synced_at       timestamptz, -- null while the row is ahead of the calendar
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (order_id, stage)
);

create index if not exists order_events_order_id_idx on public.order_events (order_id, event_date);

-- The homepage reads every upcoming appointment across every order at once.
create index if not exists order_events_event_date_idx on public.order_events (event_date);

drop trigger if exists order_events_touch_updated_at on public.order_events;
create trigger order_events_touch_updated_at
  before update on public.order_events
  for each row execute function public.touch_updated_at();

alter table public.order_events enable row level security;

drop policy if exists "signed-in full access" on public.order_events;
create policy "signed-in full access" on public.order_events
  for all to authenticated using (true) with check (true);

-- --------------------------- Google credentials ---------------------------

-- The one table in this schema with no policy on it, deliberately.
--
-- Everywhere else, "signed in" is the whole security model: the anon key is
-- public, the shared password is the real gate, and anyone through it may read
-- anything. That model does not stretch to a Google refresh token. A refresh
-- token is a standing grant over a calendar — it does not expire with the
-- session, and it is not ours to hand to the browser just because the browser
-- authenticated.
--
-- RLS enabled with zero policies denies `anon` and `authenticated` alike. Only
-- the service-role key bypasses RLS, and that key exists solely inside the
-- google-calendar Edge Function. So the token can be written and used, and
-- never read back out by the app. Confirm with a select from the browser
-- console: it must return no rows even while signed in.
create table if not exists public.google_credentials (
  id            smallint primary key default 1 check (id = 1),
  refresh_token text not null,
  calendar_id   text not null default 'primary',
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists google_credentials_touch_updated_at on public.google_credentials;
create trigger google_credentials_touch_updated_at
  before update on public.google_credentials
  for each row execute function public.touch_updated_at();

alter table public.google_credentials enable row level security;

-- Named only so a re-run cannot leave an older, laxer policy in place.
drop policy if exists "signed-in full access" on public.google_credentials;

-- ------------------------- History: two new actions ------------------------

-- 'scheduled'       -> { "count": int, "dropped": [text], "dates": {stage: date} }
-- 'calendar_synced' -> { "count": int }
alter table public.order_history drop constraint if exists order_history_action_check;
alter table public.order_history add constraint order_history_action_check
  check (action in ('created', 'updated', 'payment_logged', 'scheduled', 'calendar_synced'));
