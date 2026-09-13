-- Run after the production migration: supabase db query --linked --file tests/production-ledger.sql
-- Every fixture and mutation is rolled back, including on an assertion failure.
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
do $$
declare
  customer_a uuid := gen_random_uuid(); customer_b uuid := gen_random_uuid();
  order_a uuid := gen_random_uuid(); order_b uuid := gen_random_uuid();
  tailor_a uuid := gen_random_uuid(); tailor_b uuid := gen_random_uuid();
  job_a uuid := gen_random_uuid(); job_b uuid := gen_random_uuid(); job_c uuid := gen_random_uuid();
  payment uuid := gen_random_uuid(); refund uuid := gen_random_uuid(); correction uuid := gen_random_uuid();
  item_a text; item_b text; batch jsonb; entry jsonb; patch jsonb;
  failed boolean; n integer; balance numeric;
begin
  insert into public.customers(id, name) values (customer_a, 'Production test customer A'), (customer_b, 'Production test customer B');
  insert into public.orders(id, customer_id, items) values
    (order_a, customer_a, '[{"name":"Skirt","qty":2,"price":500000,"cost":100000},{"name":"Top","qty":1,"price":200000}]'),
    (order_b, customer_b, '[{"name":"Dress","qty":1,"price":900000}]');
  select items->0->>'id' into item_a from public.orders where id = order_a;
  select items->0->>'id' into item_b from public.orders where id = order_b;
  assert item_a is not null and item_b is not null, 'Stable IDs were not assigned';
  insert into public.penjahit(id, name) values (tailor_a, 'Production test penjahit A'), (tailor_b, 'Production test penjahit B');
  batch := jsonb_build_array(
    jsonb_build_object('id', job_a, 'penjahit_id', tailor_a, 'order_id', order_a, 'item_id', item_a, 'description', 'Sewing', 'quantity', 2, 'unit_price', 100000, 'assigned_date', '2026-09-13'),
    jsonb_build_object('id', job_b, 'penjahit_id', tailor_a, 'order_id', order_b, 'item_id', item_b, 'description', 'Sewing', 'quantity', 1, 'unit_price', 250000, 'assigned_date', '2026-09-13')
  );
  perform public.save_production_jobs(batch);
  perform public.save_production_jobs(batch);
  select count(*) into n from public.production_jobs where id in (job_a, job_b);
  assert n = 2, 'Retries duplicated jobs';
  select amount into balance from public.production_job_feed where id = job_a;
  assert balance = 200000, 'Per-piece total is wrong';

  perform public.save_production_jobs(jsonb_build_array(batch->0 || jsonb_build_object('id', job_c, 'penjahit_id', tailor_b, 'description', 'Embroidery')));
  select count(*) into n from public.production_jobs where item_id = item_a::uuid;
  assert n = 2, 'An item cannot have separate services';

  failed := false;
  begin
    perform public.save_production_jobs(jsonb_build_array(
      batch->0 || jsonb_build_object('id', gen_random_uuid()),
      batch->1 || jsonb_build_object('id', gen_random_uuid(), 'quantity', 999)));
  exception when others then failed := true; end;
  assert failed, 'Invalid batch was accepted';
  select count(*) into n from public.production_jobs where order_id in (order_a, order_b);
  assert n = 3, 'Failed batch left a partial assignment';

  update public.orders set items = jsonb_build_array(items->1, (items->0) || '{"name":"Renamed skirt"}') where id = order_a;
  select count(*) into n from public.production_job_feed where item_id = item_a::uuid;
  assert n = 2, 'Reordering/renaming lost job links';
  failed := false;
  begin update public.orders set items = '[]' where id = order_a;
  exception when others then failed := true; end;
  assert failed, 'Linked item deletion was allowed';
  failed := false;
  begin delete from public.customers where id = customer_a;
  exception when integrity_constraint_violation then failed := true; end;
  assert failed, 'Linked customer deletion was allowed';

  entry := jsonb_build_object('id', payment, 'job_id', job_a, 'kind', 'payment', 'amount', 300000, 'payment_date', '2026-09-13');
  perform public.record_production_payment(entry);
  perform public.record_production_payment(entry);
  select amount - paid + refunded into balance from public.production_job_feed where id = job_a;
  assert balance = -100000, 'Overpayment credit or retry handling is wrong';
  select count(*) into n from public.production_payments where job_id = job_a;
  assert n = 1, 'Retry duplicated a payment';
  entry := jsonb_build_object('id', refund, 'job_id', job_a, 'kind', 'refund', 'amount', 50000, 'payment_date', '2026-09-13');
  perform public.record_production_payment(entry);
  select amount - paid + refunded into balance from public.production_job_feed where id = job_a;
  assert balance = -50000, 'Refund balance is wrong';

  failed := false;
  begin perform public.record_production_payment(entry || jsonb_build_object('id', gen_random_uuid(), 'amount', 999999));
  exception when others then failed := true; end;
  assert failed, 'Excess refund was accepted';
  select count(*) into n from public.production_payments where job_id = job_a;
  assert n = 2, 'Invalid refund left a payment record';

  entry := jsonb_build_object('id', correction, 'job_id', job_a, 'kind', 'payment', 'amount', 250000, 'payment_date', '2026-09-13', 'void_entry_id', payment, 'void_reason', 'Correct amount');
  perform public.record_production_payment(entry);
  perform public.record_production_payment(entry);
  select amount - paid + refunded into balance from public.production_job_feed where id = job_a;
  assert balance = 0, 'Correction is not atomic or duplicated';
  assert exists(select 1 from public.production_payments where id = payment and voided_at is not null), 'Original payment history was lost';

  patch := batch->0 || jsonb_build_object('status', 'Done');
  perform public.update_production_job(patch);
  patch := patch || jsonb_build_object('status', 'Cancelled', 'cancellation_charge', 50000);
  perform public.update_production_job(patch);
  select amount - paid + refunded into balance from public.production_job_feed where id = job_a;
  assert balance = -150000, 'Cancellation credit is wrong';
  failed := false;
  begin perform public.update_production_job(patch || jsonb_build_object('penjahit_id', tailor_b));
  exception when others then failed := true; end;
  assert failed, 'Paid job could be reassigned';

  patch := batch->1 || jsonb_build_object('status', 'Done');
  perform public.update_production_job(patch);
  assert exists(select 1 from public.production_job_feed where id = job_b and status = 'Done' and amount > paid - refunded), 'Done job lost its debt';
  update public.penjahit set archived_at = now() where id = tailor_b;
  failed := false;
  begin perform public.save_production_jobs(jsonb_build_array(batch->0 || jsonb_build_object('id', gen_random_uuid(), 'penjahit_id', tailor_b)));
  exception when others then failed := true; end;
  assert failed, 'Archived penjahit received new work';

  assert not has_table_privilege('authenticated', 'public.production_payments', 'INSERT'), 'Payments can bypass the RPC';
  assert not has_table_privilege('anon', 'public.production_jobs', 'SELECT'), 'Anonymous production access is enabled';
  perform set_config('request.jwt.claim.sub', '', true);
  failed := false;
  begin perform public.save_production_jobs(batch);
  exception when others then failed := true; end;
  assert failed, 'Unauthenticated RPC was accepted';
end $$;
select 'Production ledger checks passed; fixtures rolled back.' as result;
rollback;
