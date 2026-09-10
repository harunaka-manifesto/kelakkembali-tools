-- =========================================================================
-- Kelak Kembali — legacy quotation & invoice backfill
-- Data only. Run once, whole file, in the SQL Editor, after schema.sql.
--
-- Safe to re-run: every row carries a literal id and every insert is guarded
-- by `on conflict (id) do nothing`, so a second run inserts nothing. The ids
-- appear nowhere else in the codebase — this file is their only origin, which
-- is what makes a row traceable back to the sheet of paper it came from.
--
-- SOURCE
--   kelakembali Quotation for (1).pdf   21 pages
--   Kelakembali Invoice for Adey.pdf (1).pdf   4 pages
-- The other three supplied files are duplicates: `kelakembali Quotation
-- for.pdf` and `Kelakembali Invoice for Adey.pdf.pdf` are byte-identical to
-- the two above, and `kelakembali Quotation For Anya Family Fitter
-- service.pdf.pdf` is page 8 of the big deck on its own. Of the 25 unique
-- pages, one is a signature note ("For Flo Groom - Mas iswar") and two are
-- blank, leaving 23 documents: 12 quotations and 11 invoices.
--
-- WRITES  10 customers, 19 orders, 23 document_log rows. Nothing else — no
-- payments, no fitting schedule, no calendar events. None of that is on the
-- paper, and guessing it would put dates in the calendar nobody agreed to.
--
-- HOW THE PAPER WAS READ
--
--   One order per job, not one per document. Where a client's quotation and
--   invoice describe the same items they are a single order and the INVOICE's
--   numbers win — the quotation survives as its own document_log row holding
--   the total that was actually sent. Bening, Flo (February) and Ibu Devie
--   Kusuma are the three orders in that shape.
--
--   Names are kept exactly as written. Flo and Audrey carry identical line
--   items, as do Elsie and Ibu Debbie, and Karen's quotation shares Adey's
--   base price — they are still separate customers here. Merging two of them
--   later is one update; unpicking a wrong merge is not.
--
--   Instalment lines store the amount charged, not the catalogue price. An
--   invoice reading `unit 6.500.000 -> total 1.950.000` is a 35% termin, not
--   a quantity times a price, and the app totals an order as qty * price. The
--   original figure is kept legible in the item name instead.
--
--   Discounts and credits are their own negative line, so the sum of the
--   items still equals the total printed on the invoice and the reason for
--   the difference is not lost.
--
--   Customers have a name and nothing else. No phone, Instagram or wedding
--   date appears on any of these documents; source is 'Other' because the
--   column is constrained and none of them says where the enquiry came from.
--   A null wedding_date keeps these ten out of the deadline strip until a
--   real date is typed in, which is the correct behaviour for a backfill.
-- =========================================================================


-- ------------------------------- Customers -------------------------------

insert into public.customers (id, name, source) values
  ('c0000000-0000-4000-8000-000000000001', 'Anya',              'Other'),
  ('c0000000-0000-4000-8000-000000000002', 'Bening',            'Other'),
  ('c0000000-0000-4000-8000-000000000003', 'Elsie',             'Other'),
  ('c0000000-0000-4000-8000-000000000004', 'Ibu Debbie',        'Other'),
  ('c0000000-0000-4000-8000-000000000005', 'Lazuardi',          'Other'),
  ('c0000000-0000-4000-8000-000000000006', 'Karen',             'Other'),
  ('c0000000-0000-4000-8000-000000000007', 'Flo',               'Other'),
  ('c0000000-0000-4000-8000-000000000008', 'Audrey',            'Other'),
  ('c0000000-0000-4000-8000-000000000009', 'Adey',              'Other'),
  ('c0000000-0000-4000-8000-00000000000a', 'Ibu Devie Kusuma',  'Other')
on conflict (id) do nothing;


-- -------------------------------- Orders ---------------------------------
--
-- status: an order with an invoice is 'Confirmed'; a quotation on its own is
-- 'Quoted'. Nothing is marked 'In production' or 'Delivered' — no document
-- says a garment was finished or handed over.
--
-- doc_name is set only where the paper is addressed to someone other than the
-- customer the record is filed under: Anya's family quotation, and Audrey's
-- two mothers. Everywhere else it stays null and the customer's name is used.
--
-- payment_scheme stays 'standard' (the built-in 35/35/30) unless the document
-- prints different terms, in which case they are written out in full.
--
-- created_at is set to midday Jakarta on the document's own date rather than
-- left at now(), so the order list sorts in the order the work actually
-- happened.

insert into public.orders
  (id, customer_id, title, doc_name, document_date, status, items, includes,
   payment_scheme, payment_terms, created_at)
values

-- ---- Anya ---------------------------------------------------------------

-- Quotation 02 September 2026. The only quotation in the deck with no total
-- printed on it; the two unit prices are quoted together, so the order total
-- is their sum.
('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
 'Tailored shirt + sleeveless top', null, '2026-09-02', 'Quoted',
 '[{"name":"Tailored Shirt","qty":1,"price":1470000},
   {"name":"Tailored Asymmetrical Sleeveless Top","qty":1,"price":1400000}]'::jsonb,
 '["Cotton Fabrics","Custom design & consultation","Production","Fitting"]'::jsonb,
 'standard', '[]'::jsonb, '2026-09-02 12:00:00+07'),

-- Quotation 20 July 2026, addressed to "Anya ( Family Attire )". Priced per
-- person, so one line at the per-person rate.
('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
 'Family formal suit set', 'Anya ( Family Attire )', '2026-07-20', 'Quoted',
 '[{"name":"Tailored Formal Suit Set (per person)","qty":1,"price":3200000}]'::jsonb,
 '["Semi wool fabric","Custom design & consultation","Production","Fitting","Dry Cleaning","Kamen Tailoring Service"]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-20 12:00:00+07'),

-- Quotation 20 July 2026. Design scope lists two garments under one total, so
-- one line rather than two invented prices.
('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001',
 'Boned strapless dress + outer kebaya', null, '2026-07-20', 'Quoted',
 '[{"name":"Boned Strapless Dress with Outer Kebaya","qty":1,"price":2500000}]'::jsonb,
 '["Custom design & consultation","Production","Fitting","Dry cleaning"]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-20 12:00:00+07'),

-- Quotation 20 July 2026. Shares a garment with the order above at a
-- different price, so it reads like a revision — but both are quotations, and
-- only quotation-to-invoice was merged. Kept separate, deliberately.
('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001',
 'Wedding package — sister + family', null, '2026-07-20', 'Quoted',
 '[{"name":"Boned Strapless Dress with Kebaya Outer (Sister of the Groom)","qty":1,"price":2375000},
   {"name":"Family Formal Suit with Kamen (Father and Brother attire)","qty":3,"price":3200000}]'::jsonb,
 '["Semi Wool for Formal Suit","Custom design & consultation","Production","Fitting","Dry Cleaning","Batik Tailoring Service"]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-20 12:00:00+07'),

-- Quotation 20 July 2026. A service, not a garment: 30/70 terms and no
-- fabric or production bullets to record.
('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001',
 'On-site fitter service', null, '2026-07-20', 'Quoted',
 '[{"name":"On-Site Family Fitter Service","qty":1,"price":1350000},
   {"name":"On-Site Groom Fitter Service","qty":1,"price":375000}]'::jsonb,
 '[]'::jsonb,
 'other',
 '[{"label":"Deposit","percent":30,"desc":"30% deposit is required upon confirmation"},
   {"label":"Balance","percent":70,"desc":"The remaining 70% balance due no later than 7 days before the event date"}]'::jsonb,
 '2026-07-20 12:00:00+07'),

-- ---- Bening -------------------------------------------------------------

-- Quotation 22 July 2026 and invoice 25 July 2026, same two garments and the
-- same 8.475.000. One order, dated to the invoice.
('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000002',
 'Contemporary bridal suit + skirt', null, '2026-07-25', 'Confirmed',
 '[{"name":"Contemporary Bridal Suit with one detachable element","qty":1,"price":7225000},
   {"name":"Bridal Skirt","qty":1,"price":1250000}]'::jsonb,
 '["Standard fabric","Veil (polos)","Custom design & consultation","Production","Fitting","Laundry"]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-25 12:00:00+07'),

-- ---- Elsie --------------------------------------------------------------

-- Quotation 22 June 2026. The three garments come to 10.864.000; the printed
-- 13.580.000 is that plus the 25% rush fee noted underneath them, which is
-- written as its own line so the arithmetic on the page is reproducible.
('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000003',
 'Bridal gown + gloves + veil', null, '2026-06-22', 'Quoted',
 '[{"name":"Bridal Gown","qty":1,"price":8289000},
   {"name":"Gloves with detail lace","qty":1,"price":1000000},
   {"name":"Cathedral Veil Lace","qty":1,"price":1575000},
   {"name":"Rush Fee (25%)","qty":1,"price":2716000}]'::jsonb,
 '["Standard Fabric","Custom design & consultation","Production","Fitting","Dry Cleaning"]'::jsonb,
 'standard', '[]'::jsonb, '2026-06-22 12:00:00+07'),

-- ---- Ibu Debbie ---------------------------------------------------------

-- Invoice 28 May 2026. The same three garments as Elsie's quotation at the
-- same prices, without the rush fee. Filed separately: the two documents name
-- two different people and nothing on either says they are one job.
('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000004',
 'Bridal gown + gloves + veil', null, '2026-05-28', 'Confirmed',
 '[{"name":"Bridal Gown","qty":1,"price":8289000},
   {"name":"Gloves with detail lace","qty":1,"price":1000000},
   {"name":"Cathedral Veil Lace","qty":1,"price":1575000}]'::jsonb,
 '[]'::jsonb,
 'other',
 '[{"label":"Deposit","percent":50,"desc":"First 50% deposit to confirm the order and commence the design process"},
   {"label":"Repayment","percent":50,"desc":"Second 50% to be settled 7 days prior to delivery"}]'::jsonb,
 '2026-05-28 12:00:00+07'),

-- ---- Lazuardi -----------------------------------------------------------

('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000005',
 'Overlapped suit beskap', null, '2026-05-04', 'Quoted',
 '[{"name":"Overlapped Suit Beskap, traditional modern","qty":1,"price":6375000}]'::jsonb,
 '["Cotton fabric","Semi wool fabric","Custom design & consultation","Production (Suit, Pants, and Shirt)","Fitting","Laundry","Saluak Minang (tutup kepala)"]'::jsonb,
 'standard', '[]'::jsonb, '2026-05-04 12:00:00+07'),

-- ---- Karen --------------------------------------------------------------

-- Quotation 01 April 2026. Never invoiced under this name; the 6.870.000 base
-- reappears on Adey's invoice, which is filed under Adey.
('d0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000006',
 'Contemporary bridal kebaya set', null, '2026-04-01', 'Quoted',
 '[{"name":"Custom Contemporary Bridal Kebaya Set with Skirt and One Detachable Element","qty":1,"price":6870000}]'::jsonb,
 '["Fabrics","Veil","Custom design & consultation","Production","Fitting","Dry cleaning"]'::jsonb,
 'standard', '[]'::jsonb, '2026-04-01 12:00:00+07'),

-- Invoice 02 June 2026. Priced at 4.875.000 but totalled at 4.250.000; the
-- 625.000 difference is unexplained on the page and is recorded as a discount
-- rather than quietly folded into the unit price.
('d0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000006',
 'Custom groom attire', null, '2026-06-02', 'Confirmed',
 '[{"name":"Overlapped and Layering Suit","qty":1,"price":4875000},
   {"name":"Discount","qty":1,"price":-625000}]'::jsonb,
 '[]'::jsonb,
 'standard', '[]'::jsonb, '2026-06-02 12:00:00+07'),

-- ---- Flo ----------------------------------------------------------------

-- Quotation 16 February 2026 (4.500.000) and invoice 19 February 2026. One
-- order, dated to the invoice. Both documents are on the HAN letterhead rather
-- than Kelak Kembali; the schema has nowhere to record a brand, so the fact
-- lives here.
--
-- The invoice prints 5.350.000 less a 1.200.000 discount and totals it at
-- 4.500.000 — but that subtraction gives 4.150.000, so one of the three
-- figures on the page is wrong. 4.500.000 is the one to trust: the quotation
-- three days earlier says 4.500.000, and the invoice's own down payment of
-- 1.575.000 is exactly 35% of it. Stored as the single agreed figure rather
-- than as a price and a discount that do not reconcile; inventing an 850.000
-- discount to make the arithmetic close would be worse than recording what
-- both documents actually agree on.
('d0000000-0000-4000-8000-00000000000c', 'c0000000-0000-4000-8000-000000000007',
 'Bridal kebaya + skirt', null, '2026-02-19', 'Confirmed',
 '[{"name":"Custom Wedding Dress (after discount; invoice printed Rp 5.350.000 less Rp 1.200.000)","qty":1,"price":4500000}]'::jsonb,
 '["Fabric","Veil Embroidery","Custom design & consultation","Production","Fitting","Laundry"]'::jsonb,
 'standard', '[]'::jsonb, '2026-02-19 12:00:00+07'),

-- Quotation 16 February 2026, mother of the bride. Also HAN letterhead.
('d0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000007',
 'Mother-of-bride tunic', null, '2026-02-16', 'Quoted',
 '[{"name":"A-line tunic with asymmetrical hem and draped cowl neckline (per person)","qty":1,"price":1500000}]'::jsonb,
 '["Plain Fabric","Custom design & consultation","Production","Fitting","Laundry"]'::jsonb,
 'standard', '[]'::jsonb, '2026-02-16 12:00:00+07'),

-- Invoice 22 June 2026. Every line is an instalment against a larger price,
-- so the amounts charged are stored and the catalogue figures kept in the
-- names.
('d0000000-0000-4000-8000-00000000000e', 'c0000000-0000-4000-8000-000000000007',
 'Repayment — dress, camisole, veil', null, '2026-06-22', 'Confirmed',
 '[{"name":"Repayment — Custom Wedding Dress (of Rp 6.500.000)","qty":1,"price":1950000},
   {"name":"Repayment — Camisole (of Rp 800.000)","qty":1,"price":400000},
   {"name":"Add on Veil","qty":1,"price":210000}]'::jsonb,
 '[]'::jsonb,
 'standard', '[]'::jsonb, '2026-06-22 12:00:00+07'),

-- ---- Audrey -------------------------------------------------------------

-- Invoice 20 July 2026. Line for line identical to Flo above, plus a credit
-- for fabric the client supplied herself. Filed under Audrey because that is
-- the name on the invoice.
('d0000000-0000-4000-8000-00000000000f', 'c0000000-0000-4000-8000-000000000008',
 'Repayment — dress, camisole, veil', null, '2026-07-20', 'Confirmed',
 '[{"name":"Payment — Custom Wedding Dress (of Rp 6.500.000)","qty":1,"price":1950000},
   {"name":"Repayment — Camisole (of Rp 800.000)","qty":1,"price":400000},
   {"name":"Add on Veil","qty":1,"price":210000},
   {"name":"Fabric provided by Audrey (Luxora Cady 4 x 80.000)","qty":1,"price":-320000}]'::jsonb,
 '[]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-20 12:00:00+07'),

-- Invoice 20 July 2026, addressed to "Audrey Mom". Same booking, different
-- wearer — that is what doc_name is for, so it is one customer with three
-- orders rather than three customers.
('d0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000008',
 'Mother of the bride', 'Audrey Mom', '2026-07-20', 'Confirmed',
 '[{"name":"Custom Attire Mother of the Bride (of Rp 2.500.000)","qty":1,"price":1625000},
   {"name":"Additional Tulle Fabric 0,75 m (of Rp 420.000)","qty":1,"price":315000},
   {"name":"Shawl MOB Add on (include fabric)","qty":1,"price":150000},
   {"name":"Mobile Fitting Service (free)","qty":1,"price":0}]'::jsonb,
 '[]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-20 12:00:00+07'),

-- Invoice 20 July 2026, addressed to "Audrey ( MOG )".
('d0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000008',
 'Mother of the groom', 'Audrey ( MOG )', '2026-07-20', 'Confirmed',
 '[{"name":"Custom Attire Mother of the Groom (of Rp 2.500.000)","qty":1,"price":1625000},
   {"name":"Additional Tulle Fabric 0,75 m (of Rp 420.000)","qty":1,"price":315000},
   {"name":"Lining Replacement MOG","qty":1,"price":200000},
   {"name":"Shawl MOG Add on (include fabric)","qty":1,"price":200000},
   {"name":"Additional Satin 2,5 m and Gosend","qty":1,"price":268000},
   {"name":"Obi","qty":1,"price":150000},
   {"name":"Mobile Fitting Service (free)","qty":1,"price":0}]'::jsonb,
 '[]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-20 12:00:00+07'),

-- ---- Adey ---------------------------------------------------------------

-- Two invoices, 20 and 21 July 2026, differing only by date and the words
-- "(50%)". Both were issued, so both are logged below; the order carries the
-- single 3.654.500 and is dated to the later one.
('d0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000009',
 'Bridal attire set — termin II + styling', null, '2026-07-21', 'Confirmed',
 '[{"name":"Termin II — Custom Bridal Attire Set (of Rp 6.870.000)","qty":1,"price":2404500},
   {"name":"Down Payment (50%) — Bridal Styling (of Rp 2.500.000)","qty":1,"price":1250000}]'::jsonb,
 '[]'::jsonb,
 'standard', '[]'::jsonb, '2026-07-21 12:00:00+07'),

-- ---- Ibu Devie Kusuma ---------------------------------------------------

-- A rate card and an invoice, both dated 28 August 2026. The rate card is
-- headed "INVOICE" but is a quotation: four sizes with unit prices, no
-- quantities and no total. The invoice picks two of them, so they are one
-- order and the invoice's quantities win.
('d0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-00000000000a',
 'Casula — bordir + polos', null, '2026-08-28', 'Confirmed',
 '[{"name":"Kasula Bordir (Front and Back) Size 18 x 100cm dan Shawl","qty":4,"price":3000000},
   {"name":"Kasula Polos Lis Emas dan Shawl","qty":2,"price":1200000}]'::jsonb,
 '[]'::jsonb,
 'other',
 '[{"label":"Deposit","percent":30,"desc":"30% deposit is required upon confirmation"},
   {"label":"Balance","percent":70,"desc":"The remaining 70% balance due no later than 7 days before the event date"}]'::jsonb,
 '2026-08-28 12:00:00+07')

on conflict (id) do nothing;


-- ----------------------------- Document log ------------------------------
--
-- One row per sheet of paper, holding the total that document actually
-- printed — which is not always the order's total. Elsie's quotation carries
-- the rush fee, the Bening pair agree, and Ibu Devie's rate card had no total
-- at all and so stores null (the column has accepted null since the moodboard
-- migration).
--
-- created_at is midday Asia/Jakarta on the document's own date, not now().
-- document_feed derives issued_date as (created_at at time zone
-- 'Asia/Jakarta')::date, so midday local round-trips to the printed date
-- whatever the server clock is doing.

insert into public.document_log (id, order_id, kind, total, created_at) values
  -- Anya
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'quotation',  2870000, '2026-09-02 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'quotation',  3200000, '2026-07-20 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'quotation',  2500000, '2026-07-20 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', 'quotation', 11975000, '2026-07-20 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000005', 'quotation',  1725000, '2026-07-20 12:00:00+07'),
  -- Bening — the quotation and the invoice it became
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006', 'quotation',  8475000, '2026-07-22 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000006', 'invoice',    8475000, '2026-07-25 12:00:00+07'),
  -- Elsie
  ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000007', 'quotation', 13580000, '2026-06-22 12:00:00+07'),
  -- Ibu Debbie
  ('e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000008', 'invoice',   10864000, '2026-05-28 12:00:00+07'),
  -- Lazuardi
  ('e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000009', 'quotation',  6375000, '2026-05-04 12:00:00+07'),
  -- Karen
  ('e0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-00000000000a', 'quotation',  6870000, '2026-04-01 12:00:00+07'),
  ('e0000000-0000-4000-8000-00000000000c', 'd0000000-0000-4000-8000-00000000000b', 'invoice',    4250000, '2026-06-02 12:00:00+07'),
  -- Flo
  ('e0000000-0000-4000-8000-00000000000d', 'd0000000-0000-4000-8000-00000000000c', 'quotation',  4500000, '2026-02-16 12:00:00+07'),
  ('e0000000-0000-4000-8000-00000000000e', 'd0000000-0000-4000-8000-00000000000c', 'invoice',    4500000, '2026-02-19 12:00:00+07'),
  ('e0000000-0000-4000-8000-00000000000f', 'd0000000-0000-4000-8000-00000000000d', 'quotation',  1500000, '2026-02-16 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-00000000000e', 'invoice',    2560000, '2026-06-22 12:00:00+07'),
  -- Audrey
  ('e0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-00000000000f', 'invoice',    2240000, '2026-07-20 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000010', 'invoice',    2090000, '2026-07-20 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000011', 'invoice',    2758000, '2026-07-20 12:00:00+07'),
  -- Adey — the same invoice reissued a day later
  ('e0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000012', 'invoice',    3654500, '2026-07-20 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000012', 'invoice',    3654500, '2026-07-21 12:00:00+07'),
  -- Ibu Devie Kusuma — the rate card carries no total
  ('e0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000013', 'quotation',     null, '2026-08-28 12:00:00+07'),
  ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000013', 'invoice',   14400000, '2026-08-28 12:00:00+07')
on conflict (id) do nothing;
