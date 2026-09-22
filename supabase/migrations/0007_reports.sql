-- 0007_reports.sql — Phase 6.
--
-- Two aggregates the existing screens can't answer: how each day compared, and
-- what actually sells. Both SECURITY INVOKER, so RLS decides whose bills are
-- counted — an owner sees the counter, a cashier would see only their own.
--
-- Both bucket on the Asia/Kolkata day, matching get_dashboard_today() and
-- get_sales_summary(). Three functions disagreeing about when a day starts is
-- how an owner ends up with three different answers to one question.

-- ---------------------------------------------------------------------------
-- Day-by-day breakdown
-- ---------------------------------------------------------------------------

create or replace function public.get_daily_sales(
  p_from date,
  p_to   date
)
returns table (
  day         date,
  bill_count  bigint,
  cash_sales  numeric,
  upi_sales   numeric,
  card_sales  numeric,
  total_sales numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (b.created_at at time zone 'Asia/Kolkata')::date,
    count(*)::bigint,
    coalesce(sum(b.total) filter (where b.payment_method = 'cash'), 0)::numeric,
    coalesce(sum(b.total) filter (where b.payment_method = 'upi'), 0)::numeric,
    coalesce(sum(b.total) filter (where b.payment_method = 'card'), 0)::numeric,
    coalesce(sum(b.total), 0)::numeric
  from public.bills b
  where b.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and b.created_at <  ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
  group by 1
  order by 1 desc
$$;

comment on function public.get_daily_sales(date, date) is
  'One row per café day in the range, newest first. Days with no sales are '
  'absent rather than zero — the caller fills gaps if it wants them.';

-- ---------------------------------------------------------------------------
-- What sells
-- ---------------------------------------------------------------------------

create or replace function public.get_top_items(
  p_from  date,
  p_to    date,
  p_limit int default 10
)
returns table (
  product_name  text,
  quantity_sold bigint,
  revenue       numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  -- Grouped by the *snapshot* name, not product_id, for two reasons: a product
  -- deleted later has product_id set to NULL and would vanish from its own
  -- sales history, and the name on the receipt is what the customer actually
  -- bought. A rename therefore splits the rows, which is the honest answer.
  select
    bi.product_name,
    sum(bi.quantity)::bigint,
    sum(bi.line_total)::numeric
  from public.bill_items bi
  join public.bills b on b.id = bi.bill_id
  where b.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and b.created_at <  ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
  group by bi.product_name
  order by 3 desc, 2 desc, 1
  -- Clamped rather than trusted: p_limit arrives from a query string.
  limit greatest(1, least(coalesce(p_limit, 10), 50))
$$;

grant execute on function public.get_daily_sales(date, date) to authenticated;
grant execute on function public.get_top_items(date, date, int) to authenticated;

-- Same treatment as 0006: no reason for an unauthenticated caller to reach these.
revoke all on function public.get_daily_sales(date, date) from anon;
revoke all on function public.get_top_items(date, date, int) from anon;
