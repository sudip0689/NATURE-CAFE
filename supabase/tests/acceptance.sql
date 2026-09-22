-- acceptance.sql — the billing engine, tested at the database.
--
-- Since migration 0008 there is no Supabase Auth, so this file no longer
-- impersonates users via JWT claims. It resolves the two fixed accounts by
-- username and passes the actor to create_bill the way the server does.
--
-- WHAT MOVED OUT OF THIS FILE
--   "Cashier cannot change a price" used to be an RLS test. RLS can no longer
--   tell who is calling, so that rule is now enforced by requireOwner() in
--   src/lib/auth.ts and has to be tested through the UI instead. Asserting it
--   here would produce a green that means nothing.
--
-- WHAT STAYS ENFORCED BY THE DATABASE, AND IS TESTED HERE
--   Bills can only be created by create_bill, which reads prices from the
--   products table; and once written they cannot be edited or deleted by
--   anyone, through any key. Access control is gone; money integrity is not.
--
-- HOW TO RUN: paste into the Supabase SQL Editor. Creates nothing permanent
-- and deletes every bill it writes, including on an unexpected failure.

create or replace function pg_temp.acceptance()
returns table (case_name text, passed boolean, detail text)
language plpgsql
as $$
declare
  v_owner uuid; v_cashier uuid; v_a uuid; v_b uuid;
  v_req uuid := gen_random_uuid();
  v_bill_a uuid; v_bill_b uuid; v_created uuid[] := '{}';
  v_rows int; v_err text; v_total numeric; v_qty int; v_snapshot numeric;
  v_items jsonb; v_method text;
begin
  select id into v_owner   from public.profiles where username = 'owner';
  select id into v_cashier from public.profiles where username = 'cashier';
  select id into v_a from public.products where is_active order by name limit 1;
  select id into v_b from public.products where is_active and id <> v_a order by name limit 1;

  if v_owner is null or v_cashier is null then
    case_name := 'setup'; passed := false;
    detail := 'Missing the owner/cashier rows. Re-run migration 0008.';
    return next; return;
  end if;

  if v_a is null or v_b is null then
    case_name := 'setup'; passed := false;
    detail := 'Needs two active products. Run supabase/seed/002_demo_menu.sql.';
    return next; return;
  end if;

  v_items := jsonb_build_array(
    jsonb_build_object('product_id', v_a, 'quantity', 3),
    jsonb_build_object('product_id', v_b, 'quantity', 1));

  -- ---- guards -----------------------------------------------------------
  begin perform public.create_bill(v_cashier, '[]'::jsonb, 'cash'); v_err := 'NO ERROR';
  exception when others then v_err := sqlerrm; end;
  case_name := 'empty cart is refused'; passed := v_err = 'EMPTY_CART';
  detail := v_err; return next;

  begin perform public.create_bill(v_cashier, v_items, 'bitcoin'); v_err := 'NO ERROR';
  exception when others then v_err := sqlerrm; end;
  case_name := 'unknown payment method is refused'; passed := v_err = 'BAD_PAYMENT_METHOD';
  detail := v_err; return next;

  begin perform public.create_bill(v_cashier, v_items, 'cash', 'X', '12345'); v_err := 'NO ERROR';
  exception when others then v_err := sqlerrm; end;
  case_name := 'invalid mobile is refused'; passed := v_err = 'BAD_MOBILE';
  detail := v_err; return next;

  begin perform public.create_bill(v_cashier, v_items, 'cash', 'X', null, 999999); v_err := 'NO ERROR';
  exception when others then v_err := sqlerrm; end;
  case_name := 'discount larger than subtotal is refused'; passed := v_err = 'BAD_DISCOUNT';
  detail := v_err; return next;

  begin perform public.create_bill(v_cashier,
    jsonb_build_array(jsonb_build_object(
      'product_id','00000000-0000-0000-0000-000000000000'::uuid,'quantity',1)),
    'cash'); v_err := 'NO ERROR';
  exception when others then v_err := sqlerrm; end;
  case_name := 'unavailable product refuses the whole bill';
  passed := v_err = 'PRODUCT_UNAVAILABLE'; detail := v_err; return next;

  begin perform public.create_bill(
    '00000000-0000-0000-0000-00000000dead'::uuid, v_items, 'cash'); v_err := 'NO ERROR';
  exception when others then v_err := sqlerrm; end;
  case_name := 'an unknown actor cannot create a bill';
  passed := v_err = 'NOT_ALLOWED'; detail := v_err; return next;

  -- ---- customer details + prices read server-side -----------------------
  select out_id, out_total into v_bill_a, v_total
  from public.create_bill(v_cashier, v_items, 'upi', 'Rahul Das', '9876543210', 0, v_req);
  v_created := v_created || v_bill_a;

  select (p1.price * 3 + p2.price) into v_snapshot
  from public.products p1, public.products p2 where p1.id = v_a and p2.id = v_b;
  case_name := 'total is computed from database prices'; passed := v_total = v_snapshot;
  detail := format('got=%s expected=%s', v_total, v_snapshot); return next;

  select count(*) into v_rows from public.bills
  where id = v_bill_a and customer_name = 'Rahul Das' and customer_mobile = '9876543210';
  case_name := 'customer name and mobile are stored'; passed := v_rows = 1;
  detail := format('matched=%s', v_rows); return next;

  select quantity into v_qty from public.bill_items
  where bill_id = v_bill_a and product_id = v_a;
  case_name := 'multiple quantities recorded on one line'; passed := v_qty = 3;
  detail := format('qty=%s', v_qty); return next;

  -- ---- duplicate billing -------------------------------------------------
  select out_id into v_bill_b
  from public.create_bill(v_cashier, v_items, 'upi', 'Rahul Das', '9876543210', 0, v_req);
  select count(*) into v_rows from public.bills where client_request_id = v_req;
  case_name := 'duplicate submit returns the same bill, not a second one';
  passed := (v_bill_a = v_bill_b and v_rows = 1);
  detail := format('same_id=%s rows=%s', v_bill_a = v_bill_b, v_rows); return next;

  -- ---- each payment method ----------------------------------------------
  foreach v_method in array array['cash','upi','card'] loop
    declare v_id uuid; v_stored text;
    begin
      select out_id into v_id from public.create_bill(
        v_cashier, v_items, v_method, 'X', null, 0, gen_random_uuid());
      v_created := v_created || v_id;
      select payment_method into v_stored from public.bills where id = v_id;
      case_name := format('%s payment is stored with the bill', v_method);
      passed := v_stored = v_method; detail := format('stored=%s', v_stored);
      return next;
    end;
  end loop;

  -- ---- bills are immutable, for every key --------------------------------
  set local role anon;
  begin update public.bills set total = 1 where id = v_bill_a;
    get diagnostics v_rows = row_count; v_err := null;
  exception when others then v_rows := -1; v_err := sqlstate; end;
  case_name := 'a saved bill cannot be edited through the API';
  passed := (v_rows = 0 or v_err is not null);
  detail := format('rows_changed=%s', v_rows); return next;

  begin insert into public.bills (bill_number, subtotal, total, payment_method, cashier_id)
    values ('NCFAKE01', 1, 1, 'cash', v_cashier); v_err := null;
  exception when others then v_err := sqlstate; end;
  case_name := 'a bill cannot be inserted directly, only via create_bill';
  passed := v_err is not null; detail := format('err=%s', coalesce(v_err,'INSERT SUCCEEDED'));
  return next;
  reset role;

  -- ---- price change does not rewrite history -----------------------------
  select unit_price into v_snapshot from public.bill_items
  where bill_id = v_bill_a and product_id = v_a;

  update public.products set price = price + 50 where id = v_a;

  select unit_price into v_total from public.bill_items
  where bill_id = v_bill_a and product_id = v_a;
  case_name := 'raising a price does not change an old receipt';
  passed := v_total = v_snapshot;
  detail := format('before=%s after=%s', v_snapshot, v_total); return next;

  update public.products set price = price - 50 where id = v_a;

  -- ---- cleanup -----------------------------------------------------------
  delete from public.bills where id = any(v_created);
  case_name := 'cleanup'; passed := true;
  detail := format('%s test bills removed', coalesce(array_length(v_created,1),0));
  return next;

exception when others then
  reset role;
  delete from public.bills where id = any(v_created);
  case_name := 'ABORTED'; passed := false; detail := sqlerrm; return next;
end;
$$;

select * from pg_temp.acceptance();
