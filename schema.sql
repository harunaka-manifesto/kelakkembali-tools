-- =========================================================================
-- Kelak Kembali — Quotation & Invoice Generator
-- Supabase schema. Run once, whole file, in the SQL Editor.
--
-- Safe to re-run: every statement is idempotent.
-- =========================================================================

-- Navigation (search the quoted migration title; applied blocks stay intact):
--   Base schema                         customers, orders, document log, RLS
--   "dashboard UX overhaul"            order titles/fitting dates/history
--   "document name + payment schemes"  per-order document/payment terms
--   "fitting schedule + Google"        events, credentials, calendar history
--   "the real lifecycle"               customer pipeline, payments, intake
--   "status stops being"               derived status and cancellation
--   "schedule gets a second anchor"    design/production/final payment dates
--   "moodboard generator"              moodboard document/history support
--   "fitting revisions log"            fitting sessions and journal photos
--   "atomic fitting photo batches"     save_fitting_photo_batch RPC
--   "quotation and invoice feeds"      document_feed read model + paging index
--   "fitting photo annotations"       fitting_photos.annotation + batch RPC v2
--   "per-termin invoices"              invoice termin identity in document history
--   "penjahit production ledger"      stable item IDs, jobs, payments and refunds
--   "customer done and penjahit removal" customers.completed_at, penjahit delete grant

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
                    'Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3',
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


-- =========================================================================
-- Migration — the real lifecycle
--
-- The schema started at the quotation. The work does not:
--
--   enquiry -> consultation -> moodboard -> quotation -> invoice
--     -> FIRST PAYMENT -> design phase -> fittings -> wedding
--
-- Two consequences, and this block is both of them.
--
-- One: everything left of the quotation had nowhere to live. A customer who
-- has enquired but not been quoted was indistinguishable from one who was
-- quoted a year ago and went quiet. Customers gain a stage, the dates those
-- stages happened on, and a single follow-up nudge so something chases them.
-- It sits on customers rather than orders because at enquiry time there is no
-- order yet — that is the whole point of the stage.
--
-- Two: the fitting schedule was anchored on two dates typed in by hand, at a
-- moment when neither is actually knowable. Nothing can be scheduled before
-- the deposit clears, and the only two dates anyone really knows are the first
-- payment and the wedding. So orders gain first_payment_date and lose both
-- hand-typed anchors — see calendar.js, which now derives all five
-- appointments from those two dates.
--
-- Plus intake_submissions, the landing table for the public Tally form.
-- =========================================================================

-- ------------------------- Customers: the pipeline -------------------------

alter table public.customers add column if not exists stage text;
alter table public.customers add column if not exists consult_date date;
alter table public.customers add column if not exists moodboard_date date;
alter table public.customers add column if not exists lost_reason text;

-- Existing rows before the constraint, as with the Draft removal above. A
-- customer who already has an order is past the early pipeline by definition;
-- everyone else starts at the beginning.
update public.customers c set stage =
  case when exists (select 1 from public.orders o where o.customer_id = c.id)
       then 'Ordering' else 'Enquiry' end
  where c.stage is null;

alter table public.customers alter column stage set default 'Enquiry';
alter table public.customers alter column stage set not null;

alter table public.customers drop constraint if exists customers_stage_check;
alter table public.customers add constraint customers_stage_check
  check (stage in ('Enquiry', 'Consultation', 'Moodboard', 'Ordering', 'Lost'));

-- 'Lost' is a resting place, not a failure to record: an enquiry that went cold
-- should stop appearing in the deadline strip without being deleted, because
-- the same couple may come back and the history is worth having.

-- ------------------------ Customers: the wedding date ----------------------

-- Couples often book before they have set a date, and "sometime in June" is
-- real information that a date column cannot hold. Rather than a second column,
-- the date is always stored — as the LAST day of the month when only the month
-- is known, which is the safe direction to be wrong in — and this flag records
-- how much of it to believe. The app renders month-only dates as approximate
-- and refuses to push an approximate fitting schedule to Google Calendar.
alter table public.customers add column if not exists wedding_date_precision text;

update public.customers set wedding_date_precision = 'day'
  where wedding_date_precision is null;

alter table public.customers alter column wedding_date_precision set default 'day';
alter table public.customers alter column wedding_date_precision set not null;

alter table public.customers drop constraint if exists customers_wedding_precision_check;
alter table public.customers add constraint customers_wedding_precision_check
  check (wedding_date_precision in ('day', 'month'));

-- ------------------------- Customers: the follow-up ------------------------

-- One open nudge per customer, stored rather than derived. Deriving it would
-- mean joining document_log for every customer on the homepage to find out when
-- the quotation went out; storing it also means a date can be pushed back by
-- hand when a client asks for more time, which is the common case and which no
-- derivation would survive.
alter table public.customers add column if not exists follow_up_date date;
alter table public.customers add column if not exists follow_up_label text;
alter table public.customers add column if not exists follow_up_google_event_id text;
alter table public.customers add column if not exists follow_up_synced_at timestamptz;

create index if not exists customers_stage_idx on public.customers (stage);
create index if not exists customers_follow_up_idx on public.customers (follow_up_date);

-- --------------------- Orders: the schedule anchor moves --------------------

-- Stamped when the first deposit is logged, editable afterwards for the times
-- the money landed on Friday and got logged on Monday. Everything in
-- order_events counts from here.
alter table public.orders add column if not exists first_payment_date date;

-- The two hand-typed anchors are gone. They are derived now, and keeping the
-- columns would leave two answers to the same question with nothing to say
-- which one is right. Precedent: the same two columns were dropped from
-- customers by the dashboard migration above, for the same reason.
alter table public.orders drop column if exists fitting_1_date;
alter table public.orders drop column if exists final_fitting_date;

-- ---------------------------- Intake submissions ---------------------------

-- Where the public Tally form lands. Rows arrive only through the `intake`
-- Edge Function, which verifies Tally's HMAC signature and writes with the
-- service-role key — the anon key cannot reach this table any more than any
-- other. Nothing here becomes a customer until it has been read and accepted.
create table if not exists public.intake_submissions (
  id                     uuid primary key default gen_random_uuid(),
  -- The whole webhook body, verbatim. The extracted columns below are a
  -- convenience for the review screen; this is the record. A question added to
  -- the form later is still recoverable from rows submitted before anyone
  -- thought to give it a column.
  payload                jsonb not null,
  name                   text,
  phone                  text,
  instagram              text,
  -- Deliberately unconstrained, unlike customers.source. A stranger's dropdown
  -- answer must never be able to reject the insert; the review screen is where
  -- it gets reconciled with the real list.
  source                 text,
  wedding_date           date,
  wedding_date_precision text,
  notes                  text,
  status                 text not null default 'new'
                           check (status in ('new', 'accepted', 'dismissed')),
  -- Set on accept, so a submission can be traced to the record it became.
  -- Nulled rather than deleted if that customer is later removed.
  customer_id            uuid references public.customers (id) on delete set null,
  created_at             timestamptz not null default now(),
  reviewed_at            timestamptz
);

create index if not exists intake_submissions_status_idx
  on public.intake_submissions (status, created_at desc);

alter table public.intake_submissions enable row level security;

drop policy if exists "signed-in full access" on public.intake_submissions;
create policy "signed-in full access" on public.intake_submissions
  for all to authenticated using (true) with check (true);


-- =========================================================================
-- Migration — the customer status stops being a thing you set
--
-- The pipeline shipped as five stages you moved a customer through by hand.
-- That was one more record to keep true, and in practice every stage worth
-- knowing is already implied by something else that happened:
--
--   In consultation  no orders yet
--   Ordering         at least one order exists
--   Active           at least one order has a first payment
--   Completed        the wedding date has passed
--
-- So it is derived, exactly as orders.status already is — see "The lifecycle"
-- in the README. The stage column and its check constraint go, and the only
-- thing left to store is the one fact no other record implies: that a customer
-- decided not to proceed. That is what cancelled_at is.
--
-- consult_date goes with the stage that gave it meaning. moodboard_date stays:
-- it is the one date with a promise attached (roughly a week), and it is what
-- the consultation follow-up counts from.
-- =========================================================================

alter table public.customers add column if not exists cancelled_at timestamptz;
alter table public.customers add column if not exists cancelled_reason text;

-- Anyone already parked at 'Lost' meant exactly this. Done before the column
-- is dropped, so the fact survives the stage that recorded it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'stage'
  ) then
    execute $mig$
      update public.customers
      set cancelled_at = coalesce(cancelled_at, updated_at, now())
      where stage = 'Lost' and cancelled_at is null
    $mig$;
  end if;
end
$$;

drop index if exists public.customers_stage_idx;
alter table public.customers drop constraint if exists customers_stage_check;
alter table public.customers drop column if exists stage;
alter table public.customers drop column if exists lost_reason;
alter table public.customers drop column if exists consult_date;

create index if not exists customers_cancelled_idx on public.customers (cancelled_at);

-- ------------------- Orders: backfill the first payment date ----------------

-- orders.first_payment_date is only written when a deposit is logged, and it
-- did not exist until the lifecycle migration above. So every payment logged
-- before that day left the column null, and a customer who has plainly paid
-- reads as merely Ordering — and gets no fitting schedule, because the whole
-- programme counts from this date.
--
-- order_history has the answer: it has been recording payment_logged since long
-- before the column existed. The earliest one is the date the clock started.
--
-- at time zone, not a plain ::date cast: created_at is a timestamptz stored in
-- UTC, and a deposit logged at 9am in Jakarta is still the previous day in UTC.
-- Casting straight to date would quietly move every one of these a day earlier,
-- and the whole schedule with it.
update public.orders o
set first_payment_date = paid.on_date
from (
  select order_id,
         (min(created_at) at time zone 'Asia/Jakarta')::date as on_date
  from public.order_history
  where action = 'payment_logged'
  group by order_id
) paid
where o.id = paid.order_id
  and o.first_payment_date is null;


-- =========================================================================
-- Migration — the schedule gets a second anchor
--
-- The whole programme used to hang off the first payment: measurements a
-- fortnight after it, then fittings spread out to the wedding. That put four
-- fitting dates in the calendar before the design had even been approved,
-- which is a calendar you stop believing.
--
-- What actually happens is two phases with two different anchors:
--
--   1st payment  design begins — a fortnight of drawing and revising, ending
--                in a conversation and a request for the next payment
--   2nd payment  production begins — body measurements within a week, then
--                fittings at three-week gaps up to the wedding
--   last payment the order is finished and the customer is done
--
-- So orders gains the other two payment dates, order_events gains a span (the
-- design phase is a fortnight-long block, not a day) and a pinned flag, and
-- the stage constraint widens to admit the two design rows.
-- =========================================================================

alter table public.orders add column if not exists second_payment_date date;
alter table public.orders add column if not exists final_payment_date date;

-- The design phase is the only row with a span. Null everywhere else, and
-- everywhere else keeps meaning "one all-day event on event_date".
alter table public.order_events add column if not exists end_date date;

-- Set when the appointment has been moved by hand in Google Calendar. The app
-- owns the programme; whoever dragged the event owns that appointment, so a
-- pinned row keeps its date through every recalculation and the rest of the
-- programme is redistributed around it. See computeProduction in calendar.js.
alter table public.order_events
  add column if not exists pinned boolean not null default false;

alter table public.order_events drop constraint if exists order_events_stage_check;
alter table public.order_events add constraint order_events_stage_check
  check (stage in (
    'Design phase', 'Design deadline',
    'Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting'));

-- --------------- Orders: backfill the other two payment dates ---------------

-- Same problem, same answer, as the first_payment_date backfill above: these
-- columns are only written when a deposit is logged, so every deposit logged
-- before today left them null. Without this every finished customer would read
-- as Active again the moment completion starts being driven by the last
-- payment instead of by the wedding date having passed.
--
-- at time zone, not a plain ::date cast, for the reason given above: a deposit
-- logged at 9am in Jakarta is still the previous day in UTC.
--
-- deposit_index is the position in the order's own payment terms. The second
-- deposit is index 1; the last is index 2 for the standard 35/35/30 scheme and
-- one less than the term count for a custom one.

update public.orders o
set second_payment_date = paid.on_date
from (
  select order_id,
         (min(created_at) at time zone 'Asia/Jakarta')::date as on_date
  from public.order_history
  where action = 'payment_logged'
    and detail->>'deposit_index' = '1'
  group by order_id
) paid
where o.id = paid.order_id
  and o.second_payment_date is null;

update public.orders o
set final_payment_date = paid.on_date
from (
  select h.order_id,
         (min(h.created_at) at time zone 'Asia/Jakarta')::date as on_date
  from public.order_history h
  join public.orders x on x.id = h.order_id
  where h.action = 'payment_logged'
    -- Guarded rather than cast blind: one malformed detail would fail the
    -- whole migration, and this file has to stay re-runnable.
    and h.detail->>'deposit_index' ~ '^[0-9]+$'
    and (h.detail->>'deposit_index')::int = case
      when x.payment_scheme = 'other' and jsonb_typeof(x.payment_terms) = 'array'
        then jsonb_array_length(x.payment_terms) - 1
      else 2
    end
  group by h.order_id
) paid
where o.id = paid.order_id
  and o.final_payment_date is null;

-- Nothing is backfilled into second_payment_date for custom schemes. They
-- start production on their first payment — a scheme we cannot read term by
-- term gets no gate — and productionAnchor in app.js reads first_payment_date
-- directly for them. Copying it here would put a second payment in the order
-- editor that nobody ever took.


-- =========================================================================
-- Migration — moodboard generator
--
-- The moodboard feature keeps source images in the browser, compiles a 16:9
-- PDF, downloads it, and then archives a copy in Drive. document_log gains a
-- 'moodboard' kind and a
-- drive_link column so the generated file can be opened straight from the
-- order history. order_history gains 'moodboard_generated' so the event
-- shows in the timeline.
-- =========================================================================

-- Widen document_log.kind to accept moodboard entries.
alter table public.document_log drop constraint if exists document_log_kind_check;
alter table public.document_log add constraint document_log_kind_check
  check (kind in ('quotation', 'invoice', 'moodboard'));

-- Moodboard rows link to the archived Drive copy. Quotation/invoice rows leave
-- this null.
alter table public.document_log add column if not exists drive_link text;

-- Moodboards have no monetary total — the column must accept null for them.
-- The original NOT NULL was correct for quotation/invoice but too tight now.
alter table public.document_log alter column total drop not null;

-- Widen order_history.action.
alter table public.order_history drop constraint if exists order_history_action_check;
alter table public.order_history add constraint order_history_action_check
  check (action in ('created', 'updated', 'payment_logged', 'scheduled', 'calendar_synced', 'moodboard_generated'));


-- =========================================================================
-- Migration — fitting revisions log
--
-- Fitting photos deliberately point to a stage name rather than an
-- order_events row: schedules are recalculated, while fitting notes must last.
-- =========================================================================

create table if not exists public.fitting_photos (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  stage         text not null check (stage in (
                  'Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3',
                  'Final fitting')),
  caption       text,
  drive_file_id text,
  drive_link    text,
  position      smallint not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists fitting_photos_order_stage_idx
  on public.fitting_photos (order_id, stage, position);

alter table public.fitting_photos enable row level security;

drop policy if exists "signed-in full access" on public.fitting_photos;
create policy "signed-in full access" on public.fitting_photos
  for all to authenticated using (true) with check (true);

-- Fitting photos predate sessions, so session_id stays nullable.  Removing a
-- session never removes the journal entries it collected.
create table if not exists public.fitting_sessions (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  stage        text not null check (stage in (
               'Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3',
               'Final fitting')),
  status       text not null default 'active' check (status in ('active', 'completed')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists fitting_sessions_order_created_idx
  on public.fitting_sessions (order_id, created_at desc);

alter table public.fitting_sessions enable row level security;
drop policy if exists "signed-in full access" on public.fitting_sessions;
create policy "signed-in full access" on public.fitting_sessions
  for all to authenticated using (true) with check (true);

alter table public.fitting_photos
  add column if not exists session_id uuid references public.fitting_sessions (id) on delete set null;

create index if not exists fitting_photos_session_position_idx
  on public.fitting_photos (session_id, position);

-- =========================================================================
-- Migration — fitting log feed read model
--
-- The global Fitting logs page needs one flat, searchable, deterministically
-- ordered row per fitting session.  Doing that in the browser would mean
-- joining every customer, order, session, and photo collection in memory just
-- to render ten cards, so the join, the stage vocabulary, the calendar date,
-- and the search haystack are all resolved here instead.
--
-- Each stored stage keeps its own feed key and label, including Final fitting.
-- =========================================================================

-- Newest-first paging over the whole workspace, with id as the tie-break the
-- cursor also uses, so equal timestamps can never reorder between pages.
create index if not exists fitting_sessions_created_id_idx
  on public.fitting_sessions (created_at desc, id desc);

drop view if exists public.fitting_log_feed;

create view public.fitting_log_feed
with (security_invoker = true) as
with photo_rollup as (
  -- Pre-aggregated so joining photos cannot duplicate a session row.  Legacy
  -- photos with session_id is null belong to no particular log and are
  -- deliberately invisible to this feed.
  select
    fp.session_id,
    count(*)::int as photo_count,
    (
      select coalesce(jsonb_agg(preview order by preview.position, preview.created_at, preview.id), '[]'::jsonb)
      from (
        select inner_fp.id, inner_fp.drive_file_id, inner_fp.position, inner_fp.created_at
        from public.fitting_photos inner_fp
        where inner_fp.session_id = fp.session_id
        order by inner_fp.position asc, inner_fp.created_at asc, inner_fp.id asc
        limit 3
      ) preview
    ) as preview_photos
  from public.fitting_photos fp
  where fp.session_id is not null
  group by fp.session_id
),
resolved as (
  select
    fs.id,
    fs.order_id,
    o.customer_id,
    c.name as customer_name,
    o.title as order_title,
    -- Mirrors orderLabel() in app.js: a non-blank title wins, otherwise the
    -- first item name plus a count of the rest, otherwise 'Empty order'.
    case
      when nullif(btrim(coalesce(o.title, '')), '') is not null then btrim(o.title)
      when nullif(btrim(coalesce(o.items -> 0 ->> 'name', '')), '') is not null then
        btrim(o.items -> 0 ->> 'name')
        || case when jsonb_array_length(o.items) > 1
                then ' + ' || (jsonb_array_length(o.items) - 1)::text || ' more'
                else '' end
      else 'Empty order'
    end as order_label,
    case fs.stage
      when 'Sizing'            then 'sizing'
      when 'Fitting 1'         then 'fitting-1'
      when 'Fitting 2'         then 'fitting-2'
      when 'Fitting 3'         then 'fitting-3'
      when 'Final fitting'     then 'final-fitting'
    end as stage_key,
    case fs.stage
      when 'Sizing'            then 'Sizing'
      when 'Fitting 1'         then 'Fitting 1'
      when 'Fitting 2'         then 'Fitting 2'
      when 'Fitting 3'         then 'Fitting 3'
      when 'Final fitting'     then 'Final fitting'
    end as stage_label,
    fs.status,
    fs.created_at,
    -- The workshop's day, not UTC's: a log tapped at 1am Jakarta time must be
    -- displayed and searched on the day the fitting actually happened.
    (fs.created_at at time zone 'Asia/Jakarta')::date as log_date,
    coalesce(pr.photo_count, 0) as photo_count,
    coalesce(pr.preview_photos, '[]'::jsonb) as preview_photos
  from public.fitting_sessions fs
  join public.orders o    on o.id = fs.order_id
  join public.customers c on c.id = o.customer_id
  left join photo_rollup pr on pr.session_id = fs.id
  -- An unrecognised stored stage has no feed label, so it stays out rather
  -- than inventing a fifth vocabulary word.
  where fs.stage in ('Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting')
)
select
  r.id,
  r.order_id,
  r.customer_id,
  r.customer_name,
  r.order_title,
  r.order_label,
  r.stage_key,
  r.stage_label,
  r.status,
  r.created_at,
  r.log_date,
  r.photo_count,
  r.preview_photos,
  -- Exactly the three things the page says are searchable: the customer, the
  -- resolved order label, and the date string printed on the card.  No ids,
  -- captions, notes, status, or staff.
  lower(
    coalesce(r.customer_name, '') || ' ' ||
    coalesce(r.order_label, '') || ' ' ||
    to_char(r.log_date, 'FMDD Mon YYYY')
  ) as search_text
from resolved r;

-- Same audience as the underlying tables; security_invoker keeps their RLS in
-- force, so this grants no visibility anybody did not already have.
grant select on public.fitting_log_feed to authenticated;

-- =========================================================================
-- Migration — independent one-per-stage fitting logs
-- =========================================================================

-- Rename the first production stage in place. Existing calendar ids, pinned
-- state and dates stay on the same rows; clearing synced_at makes the next
-- sync update the remote title instead of inserting another event.
alter table public.order_events drop constraint if exists order_events_stage_check;
alter table public.fitting_sessions drop constraint if exists fitting_sessions_stage_check;
alter table public.fitting_photos drop constraint if exists fitting_photos_stage_check;

update public.order_events
set stage = 'Sizing', synced_at = null
where stage = 'Body measurements';
update public.fitting_sessions set stage = 'Sizing' where stage = 'Body measurements';
update public.fitting_photos set stage = 'Sizing' where stage = 'Body measurements';

alter table public.order_events add constraint order_events_stage_check
  check (stage in ('Design phase', 'Design deadline', 'Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting'));
alter table public.fitting_sessions add constraint fitting_sessions_stage_check
  check (stage in ('Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting'));
alter table public.fitting_photos add constraint fitting_photos_stage_check
  check (stage in ('Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting'));

-- Merge historical duplicate sessions. Newest created_at/id wins; every photo
-- moves to it and is then assigned a stable zero-based position.
with ranked as (
  select id, order_id, stage,
         first_value(id) over (
           partition by order_id, stage order by created_at desc, id desc
         ) as keeper_id,
         bool_or(status = 'completed') over (partition by order_id, stage) as any_completed,
         max(completed_at) filter (where status = 'completed') over (partition by order_id, stage) as merged_completed_at
  from public.fitting_sessions
)
update public.fitting_sessions fs
set status = 'completed',
    completed_at = coalesce(fs.completed_at, r.merged_completed_at, now())
from ranked r
where fs.id = r.keeper_id and r.any_completed and fs.status <> 'completed';

with ranked_sessions as (
  select id, first_value(id) over (
    partition by order_id, stage order by created_at desc, id desc
  ) as keeper_id
  from public.fitting_sessions
), ordered as (
  select fp.id, rs.keeper_id,
         row_number() over (
           partition by rs.keeper_id
           order by source_session.created_at, fp.position, fp.created_at, fp.id
         ) - 1 as new_position
  from public.fitting_photos fp
  join public.fitting_sessions source_session on source_session.id = fp.session_id
  join ranked_sessions rs on rs.id = source_session.id
  where fp.session_id is not null
)
update public.fitting_photos fp
set session_id = ordered.keeper_id,
    position = ordered.new_position::smallint
from ordered where ordered.id = fp.id;

with ranked as (
  select id, row_number() over (
    partition by order_id, stage order by created_at desc, id desc
  ) as duplicate_number
  from public.fitting_sessions
)
delete from public.fitting_sessions fs
using ranked r where fs.id = r.id and r.duplicate_number > 1;

create unique index if not exists fitting_sessions_order_stage_uidx
  on public.fitting_sessions (order_id, stage);

alter table public.fitting_photos drop constraint if exists fitting_photos_session_id_fkey;
alter table public.fitting_photos add constraint fitting_photos_session_id_fkey
  foreign key (session_id) references public.fitting_sessions (id) on delete cascade;

-- Five distinct stage keys in the feed; Final fitting is not Fitting 3.
drop view if exists public.fitting_log_feed;
create view public.fitting_log_feed
with (security_invoker = true) as
with photo_rollup as (
  select fp.session_id, count(*)::int as photo_count,
    (select coalesce(jsonb_agg(preview order by preview.position, preview.created_at, preview.id), '[]'::jsonb)
     from (select p.id, p.drive_file_id, p.position, p.created_at
           from public.fitting_photos p where p.session_id = fp.session_id
           order by p.position, p.created_at, p.id limit 3) preview) as preview_photos
  from public.fitting_photos fp where fp.session_id is not null group by fp.session_id
), resolved as (
  select fs.id, fs.order_id, o.customer_id, c.name as customer_name,
    o.title as order_title,
    case when nullif(btrim(coalesce(o.title, '')), '') is not null then btrim(o.title)
         when nullif(btrim(coalesce(o.items -> 0 ->> 'name', '')), '') is not null then
           btrim(o.items -> 0 ->> 'name') || case when jsonb_array_length(o.items) > 1 then ' + ' || (jsonb_array_length(o.items) - 1)::text || ' more' else '' end
         else 'Empty order' end as order_label,
    case fs.stage when 'Sizing' then 'sizing' when 'Fitting 1' then 'fitting-1'
      when 'Fitting 2' then 'fitting-2' when 'Fitting 3' then 'fitting-3'
      when 'Final fitting' then 'final-fitting' end as stage_key,
    fs.stage as stage_label, fs.status, fs.created_at,
    (fs.created_at at time zone 'Asia/Jakarta')::date as log_date,
    coalesce(pr.photo_count, 0) as photo_count,
    coalesce(pr.preview_photos, '[]'::jsonb) as preview_photos
  from public.fitting_sessions fs
  join public.orders o on o.id = fs.order_id
  join public.customers c on c.id = o.customer_id
  left join photo_rollup pr on pr.session_id = fs.id
  where fs.stage in ('Sizing', 'Fitting 1', 'Fitting 2', 'Fitting 3', 'Final fitting')
)
select r.*,
  lower(coalesce(r.customer_name, '') || ' ' || coalesce(r.order_label, '') || ' ' || to_char(r.log_date, 'FMDD Mon YYYY')) as search_text
from resolved r;
grant select on public.fitting_log_feed to authenticated;

-- =========================================================================
-- Migration — "atomic fitting photo batches"
--
-- The Add fitting photos page edits captions, deletes existing rows and
-- inserts new ones in one gesture. Sending that as three PostgREST calls
-- would let a dropped connection leave a log half-edited, so the whole batch
-- is one transaction here instead. security_invoker keeps the table's own RLS
-- in force: this grants nobody a row they could not already write.
-- =========================================================================

create or replace function public.save_fitting_photo_batch(
  p_session_id      uuid,
  p_caption_updates jsonb default '[]'::jsonb,
  p_delete_ids      uuid[] default '{}'::uuid[],
  p_new_photos      jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session   public.fitting_sessions%rowtype;
  v_updates   jsonb  := coalesce(p_caption_updates, '[]'::jsonb);
  v_new       jsonb  := coalesce(p_new_photos, '[]'::jsonb);
  v_deletes   uuid[] := coalesce(p_delete_ids, '{}'::uuid[]);
  v_delete_n  int    := coalesce(array_length(coalesce(p_delete_ids, '{}'::uuid[]), 1), 0);
  v_existing  int;
  v_retained  int;
  v_created   jsonb;
  v_photos    jsonb;
begin
  if p_session_id is null then
    raise exception 'A fitting log id is required.';
  end if;
  if jsonb_typeof(v_updates) <> 'array' or jsonb_typeof(v_new) <> 'array' then
    raise exception 'Invalid photo payload.';
  end if;

  -- Locked first: capacity, order_id and stage are all read from this row, so
  -- a second batch cannot slip past the 20-photo ceiling between the check and
  -- the insert.
  select * into v_session from public.fitting_sessions where id = p_session_id for update;
  if not found then
    raise exception 'That fitting log is no longer available.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    group by (u ->> 'id') having count(*) > 1
  ) then
    raise exception 'The same photo was edited twice in one batch.';
  end if;

  if (select count(distinct d) from unnest(v_deletes) d) <> v_delete_n then
    raise exception 'The same photo was deleted twice in one batch.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    where (u ->> 'id')::uuid = any (v_deletes)
  ) then
    raise exception 'A photo cannot be edited and deleted in the same batch.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_new) n
    where nullif(btrim(coalesce(n ->> 'client_key', '')), '') is null
  ) then
    raise exception 'Every new photo needs a client key.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_new) n
    group by (n ->> 'client_key') having count(*) > 1
  ) then
    raise exception 'Two new photos share one client key.';
  end if;

  -- A photo id from another log is a wrong payload, not a partial save: the
  -- whole batch fails before anything is written.
  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    where not exists (
      select 1 from public.fitting_photos p
      where p.id = (u ->> 'id')::uuid and p.session_id = p_session_id
    )
  ) then
    raise exception 'A caption edit points at a photo from a different fitting log.';
  end if;

  if exists (
    select 1 from unnest(v_deletes) d
    where not exists (
      select 1 from public.fitting_photos p
      where p.id = d and p.session_id = p_session_id
    )
  ) then
    raise exception 'A deletion points at a photo from a different fitting log.';
  end if;

  select count(*)::int into v_existing
  from public.fitting_photos where session_id = p_session_id;

  -- Only additions are capped. A legacy log that already holds more than 20
  -- stays fully editable: captions and deletions never make it worse.
  if jsonb_array_length(v_new) > 0
     and (v_existing - v_delete_n + jsonb_array_length(v_new)) > 20 then
    raise exception 'A fitting log can hold at most 20 photos.';
  end if;

  update public.fitting_photos p
  set caption = u.caption
  from (
    select (e ->> 'id')::uuid as id,
           nullif(btrim(coalesce(e ->> 'caption', '')), '') as caption
    from jsonb_array_elements(v_updates) e
  ) u
  where p.id = u.id and p.session_id = p_session_id;

  delete from public.fitting_photos
  where session_id = p_session_id and id = any (v_deletes);

  -- Deleting from the middle leaves gaps; the detail page, the share filename
  -- and the PDF all number photos from `position`, so it is closed here.
  with ordered as (
    select id, (row_number() over (order by position, created_at, id) - 1)::smallint as new_position
    from public.fitting_photos where session_id = p_session_id
  )
  update public.fitting_photos p
  set position = ordered.new_position
  from ordered
  where ordered.id = p.id and p.position is distinct from ordered.new_position;

  select count(*)::int into v_retained
  from public.fitting_photos where session_id = p_session_id;

  -- order_id and stage come from the locked session, never from the browser.
  -- Drive ids stay null: archival is the post-commit phase.
  with incoming as (
    select e.value ->> 'client_key' as client_key,
           nullif(btrim(coalesce(e.value ->> 'caption', '')), '') as caption,
           (e.ordinality - 1)::int as idx
    from jsonb_array_elements(v_new) with ordinality as e(value, ordinality)
  ), inserted as (
    insert into public.fitting_photos (order_id, session_id, stage, caption, position, drive_file_id, drive_link)
    select v_session.order_id, p_session_id, v_session.stage, i.caption,
           (v_retained + i.idx)::smallint, null, null
    from incoming i
    returning *
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('client_key', i.client_key, 'photo', to_jsonb(ins)) order by ins.position),
    '[]'::jsonb
  ) into v_created
  from inserted ins
  join incoming i on i.idx = ins.position - v_retained;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.position, p.created_at, p.id), '[]'::jsonb)
  into v_photos
  from public.fitting_photos p where p.session_id = p_session_id;

  return jsonb_build_object('photos', v_photos, 'created', coalesce(v_created, '[]'::jsonb));
end;
$$;

revoke all on function public.save_fitting_photo_batch(uuid, jsonb, uuid[], jsonb) from public;
grant execute on function public.save_fitting_photo_batch(uuid, jsonb, uuid[], jsonb) to authenticated;


-- =========================================================================
-- Migration — "quotation and invoice feeds"
--
-- A quotation and an invoice are two renderings of one order, not two
-- records: the only durable trace either leaves is a document_log row holding
-- the total that was actually sent. The two list pages therefore feed off
-- document_log, and they need exactly what document_log deliberately does not
-- store — whose order it was and what the order was called.
--
-- Resolving that in the browser would mean holding every order and every
-- customer in memory to render ten rows, and would reduce the search to a
-- client filter over one loaded page instead of the whole history. So the
-- join, the Jakarta calendar date, and the search haystack are resolved here,
-- the same way fitting_log_feed does it for fitting sessions.
--
-- Moodboard rows share this table but are a different object — a Drive link
-- and no total — and neither list route can render one, so they are excluded
-- here rather than filtered by every caller.
-- =========================================================================

-- Newest-first paging across the whole history, with id as the same tie-break
-- the cursor uses, so equal timestamps cannot reorder between pages. Every
-- query filters kind first, so kind leads the index.
create index if not exists document_log_kind_created_idx
  on public.document_log (kind, created_at desc, id desc);

drop view if exists public.document_feed;

create view public.document_feed
with (security_invoker = true) as
with resolved as (
  select
    dl.id,
    dl.order_id,
    dl.kind,
    dl.total,
    dl.created_at,
    o.customer_id,
    c.name   as customer_name,
    o.title  as order_title,
    o.status as order_status,
    -- Mirrors orderLabel() in app.js and the identical expression in
    -- fitting_log_feed: a non-blank title wins, otherwise the first item name
    -- plus a count of the rest, otherwise 'Empty order'.
    case
      when nullif(btrim(coalesce(o.title, '')), '') is not null then btrim(o.title)
      when nullif(btrim(coalesce(o.items -> 0 ->> 'name', '')), '') is not null then
        btrim(o.items -> 0 ->> 'name') ||
        case when jsonb_array_length(o.items) > 1
             then ' + ' || (jsonb_array_length(o.items) - 1)::text || ' more'
             else '' end
      else 'Empty order'
    end as order_label,
    -- The workshop's day, not UTC's: a document generated at 9am in Jakarta is
    -- still the previous day in UTC.
    (dl.created_at at time zone 'Asia/Jakarta')::date as issued_date
  from public.document_log dl
  join public.orders    o on o.id = dl.order_id
  join public.customers c on c.id = o.customer_id
  where dl.kind in ('quotation', 'invoice')
)
select
  r.*,
  lower(
    coalesce(r.customer_name, '') || ' ' ||
    coalesce(r.order_label, '')   || ' ' ||
    to_char(r.issued_date, 'FMDD Mon YYYY')
  ) as search_text
from resolved r;

-- security_invoker keeps every underlying table's own RLS in force, so this
-- grants nobody a row they could not already read.
grant select on public.document_feed to authenticated;



-- =========================================================================
-- Migration — "fitting photo annotations"
--
-- A fitting photo can now carry a red markup: the circle a fitter draws round
-- the seam that has to move. It is stored as vector strokes rather than a
-- second, flattened image, because the marks have to stay editable, the Drive
-- archive has to keep holding the clean original, and the same coordinates
-- have to redraw identically in the browser and in the PDF.
--
-- Points live in normalized image space (0..1 of the natural image), so a
-- stroke survives every resolution, screen width, orientation and page size it
-- is ever drawn at. Stroke width is a fraction of the longest edge for the
-- same reason. Shape:
--
--   { "v": 1, "w": 2560, "h": 1706,
--     "strokes": [ { "width": 0.006, "points": [[0.12,0.33],[0.13,0.34]] } ] }
--
-- null — the default, and every row that predates this — means no annotation.
-- =========================================================================

alter table public.fitting_photos
  add column if not exists annotation jsonb;

-- A backstop, not the real limit: the browser caps strokes and points long
-- before this. It exists so a stuck pointer or a hand-written payload cannot
-- push a megabyte into a row the feed and the detail page both read.
alter table public.fitting_photos
  drop constraint if exists fitting_photos_annotation_check;
alter table public.fitting_photos
  add constraint fitting_photos_annotation_check
  check (
    annotation is null
    or (jsonb_typeof(annotation) = 'object' and pg_column_size(annotation) <= 65536)
  );

-- The batch RPC's second argument stops being captions-only, so it is renamed
-- from p_caption_updates to p_photo_updates. Postgres refuses to rename a
-- parameter through create or replace, and leaving the old four-argument
-- function in place beside a new one would make every call ambiguous, so the
-- old signature is dropped first. The argument list stays four wide.
drop function if exists public.save_fitting_photo_batch(uuid, jsonb, uuid[], jsonb);

create or replace function public.save_fitting_photo_batch(
  p_session_id    uuid,
  p_photo_updates jsonb default '[]'::jsonb,
  p_delete_ids    uuid[] default '{}'::uuid[],
  p_new_photos    jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session   public.fitting_sessions%rowtype;
  v_updates   jsonb  := coalesce(p_photo_updates, '[]'::jsonb);
  v_new       jsonb  := coalesce(p_new_photos, '[]'::jsonb);
  v_deletes   uuid[] := coalesce(p_delete_ids, '{}'::uuid[]);
  v_delete_n  int    := coalesce(array_length(coalesce(p_delete_ids, '{}'::uuid[]), 1), 0);
  v_existing  int;
  v_retained  int;
  v_created   jsonb;
  v_photos    jsonb;
begin
  if p_session_id is null then
    raise exception 'A fitting log id is required.';
  end if;
  if jsonb_typeof(v_updates) <> 'array' or jsonb_typeof(v_new) <> 'array' then
    raise exception 'Invalid photo payload.';
  end if;

  -- Locked first: capacity, order_id and stage are all read from this row, so
  -- a second batch cannot slip past the 20-photo ceiling between the check and
  -- the insert.
  select * into v_session from public.fitting_sessions where id = p_session_id for update;
  if not found then
    raise exception 'That fitting log is no longer available.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    group by (u ->> 'id') having count(*) > 1
  ) then
    raise exception 'The same photo was edited twice in one batch.';
  end if;

  -- Key presence is the contract: an absent key leaves its column alone, a key
  -- present with null clears it. An entry carrying neither is a caller bug, not
  -- a no-op worth silently accepting.
  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    where not (u ? 'caption') and not (u ? 'annotation')
  ) then
    raise exception 'A photo edit changed nothing.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    where (u ? 'annotation') and jsonb_typeof(u -> 'annotation') not in ('object', 'null')
  ) or exists (
    select 1 from jsonb_array_elements(v_new) n
    where (n ? 'annotation') and jsonb_typeof(n -> 'annotation') not in ('object', 'null')
  ) then
    raise exception 'Invalid annotation payload.';
  end if;

  if (select count(distinct d) from unnest(v_deletes) d) <> v_delete_n then
    raise exception 'The same photo was deleted twice in one batch.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    where (u ->> 'id')::uuid = any (v_deletes)
  ) then
    raise exception 'A photo cannot be edited and deleted in the same batch.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_new) n
    where nullif(btrim(coalesce(n ->> 'client_key', '')), '') is null
  ) then
    raise exception 'Every new photo needs a client key.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_new) n
    group by (n ->> 'client_key') having count(*) > 1
  ) then
    raise exception 'Two new photos share one client key.';
  end if;

  -- A photo id from another log is a wrong payload, not a partial save: the
  -- whole batch fails before anything is written.
  if exists (
    select 1 from jsonb_array_elements(v_updates) u
    where not exists (
      select 1 from public.fitting_photos p
      where p.id = (u ->> 'id')::uuid and p.session_id = p_session_id
    )
  ) then
    raise exception 'A photo edit points at a photo from a different fitting log.';
  end if;

  if exists (
    select 1 from unnest(v_deletes) d
    where not exists (
      select 1 from public.fitting_photos p
      where p.id = d and p.session_id = p_session_id
    )
  ) then
    raise exception 'A deletion points at a photo from a different fitting log.';
  end if;

  select count(*)::int into v_existing
  from public.fitting_photos where session_id = p_session_id;

  -- Only additions are capped. A legacy log that already holds more than 20
  -- stays fully editable: captions, marks and deletions never make it worse.
  if jsonb_array_length(v_new) > 0
     and (v_existing - v_delete_n + jsonb_array_length(v_new)) > 20 then
    raise exception 'A fitting log can hold at most 20 photos.';
  end if;

  update public.fitting_photos p
  set caption    = case when u.has_caption    then u.caption    else p.caption    end,
      annotation = case when u.has_annotation then u.annotation else p.annotation end
  from (
    select (e ->> 'id')::uuid                               as id,
           (e ? 'caption')                                  as has_caption,
           nullif(btrim(coalesce(e ->> 'caption', '')), '') as caption,
           (e ? 'annotation')                               as has_annotation,
           case when jsonb_typeof(e -> 'annotation') = 'null'
                then null else e -> 'annotation' end        as annotation
    from jsonb_array_elements(v_updates) e
  ) u
  where p.id = u.id and p.session_id = p_session_id;

  delete from public.fitting_photos
  where session_id = p_session_id and id = any (v_deletes);

  -- Deleting from the middle leaves gaps; the detail page, the share filename
  -- and the PDF all number photos from `position`, so it is closed here.
  with ordered as (
    select id, (row_number() over (order by position, created_at, id) - 1)::smallint as new_position
    from public.fitting_photos where session_id = p_session_id
  )
  update public.fitting_photos p
  set position = ordered.new_position
  from ordered
  where ordered.id = p.id and p.position is distinct from ordered.new_position;

  select count(*)::int into v_retained
  from public.fitting_photos where session_id = p_session_id;

  -- order_id and stage come from the locked session, never from the browser.
  -- Drive ids stay null: archival is the post-commit phase.
  with incoming as (
    select e.value ->> 'client_key' as client_key,
           nullif(btrim(coalesce(e.value ->> 'caption', '')), '') as caption,
           case when jsonb_typeof(e.value -> 'annotation') = 'object'
                then e.value -> 'annotation' else null end as annotation,
           (e.ordinality - 1)::int as idx
    from jsonb_array_elements(v_new) with ordinality as e(value, ordinality)
  ), inserted as (
    insert into public.fitting_photos
      (order_id, session_id, stage, caption, annotation, position, drive_file_id, drive_link)
    select v_session.order_id, p_session_id, v_session.stage, i.caption, i.annotation,
           (v_retained + i.idx)::smallint, null, null
    from incoming i
    returning *
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('client_key', i.client_key, 'photo', to_jsonb(ins)) order by ins.position),
    '[]'::jsonb
  ) into v_created
  from inserted ins
  join incoming i on i.idx = ins.position - v_retained;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.position, p.created_at, p.id), '[]'::jsonb)
  into v_photos
  from public.fitting_photos p where p.session_id = p_session_id;

  return jsonb_build_object('photos', v_photos, 'created', coalesce(v_created, '[]'::jsonb));
end;
$$;

revoke all on function public.save_fitting_photo_batch(uuid, jsonb, uuid[], jsonb) from public;
grant execute on function public.save_fitting_photo_batch(uuid, jsonb, uuid[], jsonb) to authenticated;


-- =========================================================================
-- Migration — "per-termin invoices"
--
-- An invoice logs the amount it asks for, plus enough identity to distinguish
-- equal-sized termins in the document feed. Quotations and legacy invoices
-- keep both fields null.
-- =========================================================================

alter table public.document_log
  add column if not exists term_number smallint,
  add column if not exists term_count smallint;

alter table public.document_log
  drop constraint if exists document_log_term_identity_check;

alter table public.document_log
  add constraint document_log_term_identity_check check (
    (term_number is null and term_count is null)
    or (kind = 'invoice' and term_number > 0 and term_count > 0 and term_number <= term_count)
  );

drop view if exists public.document_feed;

create view public.document_feed
with (security_invoker = true) as
with resolved as (
  select
    dl.id,
    dl.order_id,
    dl.kind,
    dl.total,
    dl.term_number,
    dl.term_count,
    dl.created_at,
    o.customer_id,
    c.name   as customer_name,
    o.title  as order_title,
    o.status as order_status,
    case
      when nullif(btrim(coalesce(o.title, '')), '') is not null then btrim(o.title)
      when nullif(btrim(coalesce(o.items -> 0 ->> 'name', '')), '') is not null then
        btrim(o.items -> 0 ->> 'name') ||
        case when jsonb_array_length(o.items) > 1
             then ' + ' || (jsonb_array_length(o.items) - 1)::text || ' more'
             else '' end
      else 'Empty order'
    end as order_label,
    (dl.created_at at time zone 'Asia/Jakarta')::date as issued_date
  from public.document_log dl
  join public.orders    o on o.id = dl.order_id
  join public.customers c on c.id = o.customer_id
  where dl.kind in ('quotation', 'invoice')
)
select
  r.*,
  lower(
    coalesce(r.customer_name, '') || ' ' ||
    coalesce(r.order_label, '')   || ' ' ||
    case when r.term_number is not null
         then 'termin ' || r.term_number::text || ' of ' || r.term_count::text || ' '
         else '' end ||
    to_char(r.issued_date, 'FMDD Mon YYYY')
  ) as search_text
from resolved r;

grant select on public.document_feed to authenticated;

-- ---------------------- "penjahit production ledger" ----------------------
begin;

create table if not exists public.penjahit (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  phone text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.production_jobs (
  id uuid primary key,
  penjahit_id uuid not null references public.penjahit(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  item_id uuid not null,
  item_name text not null,
  description text not null check (length(btrim(description)) between 1 and 500),
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  assigned_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  due_date date,
  notes text,
  status text not null default 'Assigned' check (status in ('Assigned', 'In progress', 'Done', 'Cancelled')),
  cancellation_charge bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  create_request jsonb not null,
  check (quantity::numeric * unit_price <= 9007199254740991),
  check (cancellation_charge between 0 and 9007199254740991),
  check ((status = 'Cancelled') = (cancellation_charge is not null))
);

create table if not exists public.production_payments (
  id uuid primary key,
  job_id uuid not null references public.production_jobs(id) on delete restrict,
  kind text not null check (kind in ('payment', 'refund')),
  amount bigint not null check (amount between 1 and 9007199254740991),
  payment_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text,
  void_request_id uuid unique,
  request jsonb not null,
  void_request jsonb,
  check ((voided_at is null and void_reason is null) or (voided_at is not null and length(btrim(void_reason)) > 0))
);

create index if not exists production_jobs_penjahit_idx on public.production_jobs(penjahit_id, created_at desc);
create index if not exists production_jobs_item_idx on public.production_jobs(order_id, item_id);
create index if not exists production_payments_job_idx on public.production_payments(job_id, created_at);

alter table public.penjahit enable row level security;
alter table public.production_jobs enable row level security;
alter table public.production_payments enable row level security;
drop policy if exists "signed-in full access" on public.penjahit;
create policy "signed-in full access" on public.penjahit for all to authenticated using (true) with check (true);
drop policy if exists "signed-in read" on public.production_jobs;
create policy "signed-in read" on public.production_jobs for select to authenticated using (true);
drop policy if exists "signed-in read" on public.production_payments;
create policy "signed-in read" on public.production_payments for select to authenticated using (true);
revoke all on public.penjahit, public.production_jobs, public.production_payments from anon, authenticated;
grant select, insert, update on public.penjahit to authenticated;
grant select on public.production_jobs, public.production_payments to authenticated;

-- Only authenticated RPCs write financial records. Their definer privilege is
-- deliberately limited to these operations; direct table writes are revoked.
create or replace function public.production_item_ids()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  items jsonb := '[]'::jsonb;
  ids text[] := '{}';
begin
  if jsonb_typeof(new.items) is distinct from 'array' then
    raise exception 'Order items must be a list.';
  end if;
  for item in select value from jsonb_array_elements(new.items) loop
    if jsonb_typeof(item) is distinct from 'object' then raise exception 'Invalid order item.'; end if;
    if coalesce(item->>'id', '') = '' then item := item || jsonb_build_object('id', gen_random_uuid()); end if;
    perform (item->>'id')::uuid;
    if item->>'id' = any(ids) then raise exception 'Each order item needs its own ID.'; end if;
    ids := array_append(ids, item->>'id');
    items := items || jsonb_build_array(item);
  end loop;
  if tg_op = 'UPDATE' and exists (
    select 1 from public.production_jobs j where j.order_id = new.id and not (j.item_id::text = any(ids))
  ) then
    raise exception 'This item has penjahit work linked to it. Keep the item to preserve its production and payment history.';
  end if;
  new.items := items;
  return new;
end $$;
drop trigger if exists production_item_ids on public.orders;
create trigger production_item_ids before insert or update of items on public.orders
for each row execute function public.production_item_ids();
update public.orders set items = items where exists (
  select 1 from jsonb_array_elements(items) item where coalesce(item->>'id', '') = ''
);

create or replace function public.save_production_jobs(p_jobs jsonb)
returns setof public.production_jobs language plpgsql security definer set search_path = '' as $$
declare
  entry jsonb;
  source_item jsonb;
  existing public.production_jobs;
begin
  if auth.uid() is null then raise exception 'Sign in to save production work.'; end if;
  if jsonb_typeof(p_jobs) is distinct from 'array' or jsonb_array_length(p_jobs) not between 1 and 100 then
    raise exception 'Select between 1 and 100 jobs.';
  end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_jobs)) <> jsonb_array_length(p_jobs) then
    raise exception 'Each job needs a unique ID.';
  end if;
  -- Stable lock order also makes two simultaneous multi-customer saves safe.
  perform 1 from public.orders where id in (select (value->>'order_id')::uuid from jsonb_array_elements(p_jobs)) order by id for update;
  for entry in select value from jsonb_array_elements(p_jobs) loop
    perform pg_advisory_xact_lock(hashtextextended(entry->>'id', 0));
    select * into existing from public.production_jobs where id = (entry->>'id')::uuid;
    if found then
      if existing.create_request <> entry then raise exception 'This save was already used. Reload before changing it.'; end if;
      return next existing;
      continue;
    end if;
    if coalesce(entry->>'quantity', '') !~ '^[0-9]+$' or coalesce(entry->>'unit_price', '') !~ '^[0-9]+$' then
      raise exception 'Quantity and price must be whole numbers.';
    end if;
    perform 1 from public.penjahit where id = (entry->>'penjahit_id')::uuid and archived_at is null for share;
    if not found then raise exception 'Choose an active penjahit.'; end if;
    select item into source_item from public.orders o, jsonb_array_elements(o.items) item
      where o.id = (entry->>'order_id')::uuid and item->>'id' = entry->>'item_id';
    if source_item is null or coalesce(btrim(source_item->>'name'), '') = '' then raise exception 'Choose a saved, named order item.'; end if;
    if (entry->>'quantity')::integer > coalesce((source_item->>'qty')::numeric, 0) then
      raise exception 'Assigned quantity cannot exceed the source item quantity.';
    end if;
    insert into public.production_jobs(id, penjahit_id, order_id, item_id, item_name, description, quantity, unit_price, assigned_date, due_date, notes, create_request)
      values ((entry->>'id')::uuid, (entry->>'penjahit_id')::uuid, (entry->>'order_id')::uuid, (entry->>'item_id')::uuid,
        source_item->>'name', btrim(entry->>'description'), (entry->>'quantity')::integer, (entry->>'unit_price')::bigint,
        (entry->>'assigned_date')::date, nullif(entry->>'due_date', '')::date, nullif(entry->>'notes', ''), entry)
      returning * into existing;
    return next existing;
  end loop;
end $$;

create or replace function public.update_production_job(p_job jsonb)
returns public.production_jobs language plpgsql security definer set search_path = '' as $$
declare original public.production_jobs; result public.production_jobs; source_item jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to edit production work.'; end if;
  select * into original from public.production_jobs where id = (p_job->>'id')::uuid for update;
  if not found then raise exception 'This production job no longer exists.'; end if;
  if original.penjahit_id <> (p_job->>'penjahit_id')::uuid and exists (select 1 from public.production_payments where job_id = original.id) then
    raise exception 'This job has payment history. Settle or cancel it and create a job for the other penjahit.';
  end if;
  if original.penjahit_id <> (p_job->>'penjahit_id')::uuid then
    perform 1 from public.penjahit where id = (p_job->>'penjahit_id')::uuid and archived_at is null for share;
    if not found then raise exception 'Choose an active penjahit.'; end if;
  end if;
  if coalesce(p_job->>'quantity', '') !~ '^[0-9]+$' or coalesce(p_job->>'unit_price', '') !~ '^[0-9]+$'
    or (p_job->>'status' = 'Cancelled' and coalesce(p_job->>'cancellation_charge', '') !~ '^[0-9]+$') then
    raise exception 'Enter whole quantities and rupiah amounts, including the final charge for a cancelled job.';
  end if;
  select item into source_item from public.orders o, jsonb_array_elements(o.items) item
    where o.id = original.order_id and item->>'id' = original.item_id::text;
  if (p_job->>'quantity')::integer > greatest(original.quantity, coalesce((source_item->>'qty')::numeric, 0)) then
    raise exception 'Assigned quantity cannot exceed the source item quantity.';
  end if;
  update public.production_jobs set penjahit_id = (p_job->>'penjahit_id')::uuid,
    description = btrim(p_job->>'description'), quantity = (p_job->>'quantity')::integer,
    unit_price = (p_job->>'unit_price')::bigint, status = p_job->>'status',
    assigned_date = (p_job->>'assigned_date')::date, due_date = nullif(p_job->>'due_date', '')::date,
    notes = nullif(p_job->>'notes', ''),
    cancellation_charge = case when p_job->>'status' = 'Cancelled' then (p_job->>'cancellation_charge')::bigint else null end,
    updated_at = now() where id = original.id returning * into result;
  return result;
end $$;

create or replace function public.record_production_payment(p_change jsonb)
returns setof public.production_payments language plpgsql security definer set search_path = '' as $$
declare
  job uuid := (p_change->>'job_id')::uuid;
  request_id uuid := (p_change->>'id')::uuid;
  void_id uuid := nullif(p_change->>'void_entry_id', '')::uuid;
  previous jsonb;
  net numeric;
begin
  if auth.uid() is null then raise exception 'Sign in to record payments.'; end if;
  if request_id is null then raise exception 'A payment needs a save identifier.'; end if;
  perform 1 from public.production_jobs where id = job for update;
  if not found then raise exception 'This production job no longer exists.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(request_id::text, 0));
  select request into previous from public.production_payments where id = request_id;
  if previous is null then select void_request into previous from public.production_payments where void_request_id = request_id; end if;
  if previous is not null then
    if previous <> p_change then raise exception 'This save was already used. Reload before changing it.'; end if;
    return query select * from public.production_payments where job_id = job order by created_at, id;
    return;
  end if;
  if void_id is not null then
    if coalesce(btrim(p_change->>'void_reason'), '') = '' then raise exception 'Explain why this entry is being corrected.'; end if;
    update public.production_payments set voided_at = now(), void_reason = btrim(p_change->>'void_reason'),
      void_request_id = request_id, void_request = p_change where id = void_id and job_id = job and voided_at is null;
    if not found then raise exception 'This entry was already corrected or belongs to another job.'; end if;
  end if;
  if p_change->>'kind' in ('payment', 'refund') then
    if coalesce(p_change->>'amount', '') !~ '^[0-9]+$' then raise exception 'Enter a positive whole rupiah amount.'; end if;
    insert into public.production_payments(id, job_id, kind, amount, payment_date, notes, request)
      values (request_id, job, p_change->>'kind', (p_change->>'amount')::bigint,
        (p_change->>'payment_date')::date, nullif(p_change->>'notes', ''), p_change);
  elsif void_id is null or p_change->>'kind' is distinct from 'void' then
    raise exception 'Choose payment, refund, or a correction.';
  end if;
  select coalesce(sum(case when kind = 'payment' then amount::numeric else -amount::numeric end), 0)
    into net from public.production_payments where job_id = job and voided_at is null;
  if net < 0 then raise exception 'Refunds cannot exceed this job''s payments. Correct the refund first if needed.'; end if;
  if net > 9007199254740991 then raise exception 'The payment total is too large.'; end if;
  return query select * from public.production_payments where job_id = job order by created_at, id;
end $$;

revoke all on function public.production_item_ids() from public, anon, authenticated;
revoke all on function public.save_production_jobs(jsonb), public.update_production_job(jsonb), public.record_production_payment(jsonb) from public, anon;
grant execute on function public.save_production_jobs(jsonb), public.update_production_job(jsonb), public.record_production_payment(jsonb) to authenticated;

create or replace view public.production_job_feed with (security_invoker = true) as
select j.id, j.penjahit_id, j.order_id, j.item_id, j.item_name, j.description, j.quantity, j.unit_price,
  j.assigned_date, j.due_date, j.notes, j.status, j.cancellation_charge, j.created_at, j.updated_at,
  p.name as penjahit_name, c.id as customer_id, c.name as customer_name,
  coalesce(nullif(o.title, ''), nullif(o.items->0->>'name', ''), 'Order') as order_title,
  case when j.status = 'Cancelled' then j.cancellation_charge else j.quantity::bigint * j.unit_price end as amount,
  coalesce(pay.paid, 0) as paid, coalesce(pay.refunded, 0) as refunded,
  coalesce(pay.history_count, 0) > 0 as has_history
from public.production_jobs j
join public.penjahit p on p.id = j.penjahit_id
join public.orders o on o.id = j.order_id
join public.customers c on c.id = o.customer_id
left join lateral (
  select sum(amount) filter (where kind = 'payment' and voided_at is null) as paid,
    sum(amount) filter (where kind = 'refund' and voided_at is null) as refunded,
    count(*) as history_count from public.production_payments where job_id = j.id
) pay on true;
grant select on public.production_job_feed to authenticated;
notify pgrst, 'reload schema';
commit;

-- ------------------ "customer done and penjahit removal" ------------------
-- A customer can be marked done by hand, which sends them to the foot of the
-- homepage ledger. It is a timestamp rather than a flag so "when" is kept, and
-- nullable so un-marking is just clearing it. Nothing is derived from it.
--
-- Penjahit could be archived but never deleted: the table was granted select,
-- insert and update only. A penjahit with jobs still cannot be deleted — the
-- restrict foreign key on production_jobs refuses it — so this only lets an
-- unused or mistaken profile go.
begin;
alter table public.customers add column if not exists completed_at timestamptz;
grant delete on public.penjahit to authenticated;
notify pgrst, 'reload schema';
commit;
