-- 0005_billing.sql — Phase 4. The one function that creates money.
--
-- Everything about this is shaped by three rules from the spec:
--
--   "Never trust client-submitted prices."
--   "Re-read authoritative product prices server-side when creating bills."
--   "Use database transactions/RPC where necessary for bill creation."
--
-- So create_bill takes product ids and quantities and nothing else. Prices,
-- names, the subtotal and the bill number are all derived here. There is no
-- INSERT policy on bills or bill_items (see 0001), which makes this function
-- the only door into those tables — not the preferred door, the only one.
--
-- SECURITY DEFINER, so it bypasses RLS by design and therefore does its own
-- authorisation in full, up front.

-- ---------------------------------------------------------------------------
-- Idempotency
--
-- A counter tablet on café wifi will double-tap and will retry. Without this,
-- either of those charges the customer twice. The client mints one id per
-- order and reuses it across retries; a repeat call returns the original bill
-- instead of writing a second one.
-- ---------------------------------------------------------------------------

alter table public.bills
  add column if not exists client_request_id uuid;

create unique index if not exists bills_client_request_id_key
  on public.bills (client_request_id)
  where client_request_id is not null;

comment on column public.bills.client_request_id is
  'Idempotency key supplied by the till. A retry with the same id returns the '
  'existing bill rather than creating a duplicate.';

-- ---------------------------------------------------------------------------
-- create_bill
-- ---------------------------------------------------------------------------

create or replace function public.create_bill(
  p_items          jsonb,
  p_payment_method text,
  p_customer_name  text default null,
  p_customer_mobile text default null,
  p_discount       numeric default 0,
  p_request_id     uuid default null
)
returns table (
  out_id          uuid,
  out_bill_number text,
  out_total       numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cashier   uuid := (select auth.uid());
  v_role      text;
  v_name      text := nullif(btrim(coalesce(p_customer_name, '')), '');
  v_mobile    text := nullif(btrim(coalesce(p_customer_mobile, '')), '');
  v_discount  numeric(10, 2) := round(coalesce(p_discount, 0), 2);
  v_subtotal  numeric(10, 2);
  v_total     numeric(10, 2);
  v_requested int;
  v_matched   int;
  v_bad_qty   int;
  v_bill_id   uuid;
  v_number    text;
  v_existing  record;
begin
  -- 1. Who is asking ------------------------------------------------------
  if v_cashier is null then
    raise exception 'NOT_SIGNED_IN' using errcode = '28000';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_cashier
    and p.is_active;

  if v_role is null or v_role not in ('owner', 'cashier') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  -- 2. Already done? ------------------------------------------------------
  if p_request_id is not null then
    select b.id, b.bill_number, b.total
      into v_existing
      from public.bills b
     where b.client_request_id = p_request_id;

    if found then
      out_id := v_existing.id;
      out_bill_number := v_existing.bill_number;
      out_total := v_existing.total;
      return next;
      return;
    end if;
  end if;

  -- 3. Shape of the request ------------------------------------------------
  if p_payment_method is null or p_payment_method not in ('cash', 'upi', 'card') then
    raise exception 'BAD_PAYMENT_METHOD' using errcode = '22023';
  end if;

  if v_mobile is not null and v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'BAD_MOBILE' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  -- Duplicate product ids in the payload are summed rather than rejected —
  -- the cart shouldn't produce them, but charging twice for one line because
  -- of a client bug would be the worse failure.
  with requested as (
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::int) as quantity
      from jsonb_array_elements(p_items) as item
     group by 1
  )
  -- Counted, not min()'d: min() skips NULLs, so a line with a missing
  -- quantity would pass a min >= 1 test and then poison the subtotal.
  select count(*)::int,
         count(*) filter (where quantity is null or quantity < 1)::int
    into v_requested, v_bad_qty
    from requested;

  if coalesce(v_requested, 0) = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  if coalesce(v_bad_qty, 0) > 0 then
    raise exception 'BAD_QUANTITY' using errcode = '22023';
  end if;

  -- 4. Prices, read from the table and never from the caller ---------------
  with requested as (
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::int) as quantity
      from jsonb_array_elements(p_items) as item
     group by 1
  )
  select count(*)::int, coalesce(sum(p.price * r.quantity), 0)
    into v_matched, v_subtotal
    from requested r
    join public.products p
      on p.id = r.product_id
     and p.is_active;

  -- Something was deleted or taken off the menu between the tap and the save.
  if v_matched <> v_requested then
    raise exception 'PRODUCT_UNAVAILABLE' using errcode = '22023';
  end if;

  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'BAD_DISCOUNT' using errcode = '22023';
  end if;

  v_total := v_subtotal - v_discount;

  -- 5. Write ---------------------------------------------------------------
  v_number := private.next_bill_number();

  insert into public.bills (
    bill_number, customer_name, customer_mobile,
    subtotal, discount, total, payment_method, cashier_id, client_request_id
  )
  values (
    v_number,
    coalesce(v_name, 'Walk-in Customer'),
    v_mobile,
    v_subtotal, v_discount, v_total,
    p_payment_method, v_cashier, p_request_id
  )
  returning id into v_bill_id;

  -- The snapshot. product_name and unit_price are copied here on purpose:
  -- re-pricing the item tomorrow must not change this receipt.
  with requested as (
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::int) as quantity
      from jsonb_array_elements(p_items) as item
     group by 1
  )
  insert into public.bill_items (
    bill_id, product_id, product_name, quantity, unit_price, line_total
  )
  select v_bill_id, p.id, p.name, r.quantity, p.price, p.price * r.quantity
    from requested r
    join public.products p
      on p.id = r.product_id
     and p.is_active;

  out_id := v_bill_id;
  out_bill_number := v_number;
  out_total := v_total;
  return next;

exception
  when unique_violation then
    -- Two taps raced and the other one won. Hand back its bill.
    if p_request_id is not null then
      select b.id, b.bill_number, b.total
        into v_existing
        from public.bills b
       where b.client_request_id = p_request_id;

      if found then
        out_id := v_existing.id;
        out_bill_number := v_existing.bill_number;
        out_total := v_existing.total;
        return next;
        return;
      end if;
    end if;
    raise;
end;
$$;

comment on function public.create_bill is
  'The only way a bill comes into existence. Takes product ids and quantities; '
  'reads every price from public.products. Idempotent on p_request_id.';

revoke all on function public.create_bill(jsonb, text, text, text, numeric, uuid) from public;
grant execute on function public.create_bill(jsonb, text, text, text, numeric, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sales totals for a date range, bucketed on the Kolkata day.
-- SECURITY INVOKER: RLS decides whose bills are counted.
-- ---------------------------------------------------------------------------

create or replace function public.get_sales_summary(
  p_from date,
  p_to   date
)
returns table (
  total_sales numeric,
  bill_count  bigint,
  cash_sales  numeric,
  upi_sales   numeric,
  card_sales  numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(b.total), 0)::numeric,
    count(*)::bigint,
    coalesce(sum(b.total) filter (where b.payment_method = 'cash'), 0)::numeric,
    coalesce(sum(b.total) filter (where b.payment_method = 'upi'), 0)::numeric,
    coalesce(sum(b.total) filter (where b.payment_method = 'card'), 0)::numeric
  from public.bills b
  where b.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and b.created_at <  ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
$$;

grant execute on function public.get_sales_summary(date, date) to authenticated;
