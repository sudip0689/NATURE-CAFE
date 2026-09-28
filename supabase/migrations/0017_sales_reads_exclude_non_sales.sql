-- 0017_sales_reads_exclude_non_sales.sql
--
-- Three aggregates were still counting every row in bills as money taken.
--
-- They were right when they were written: a bill was a sale, full stop. Soft
-- delete (0012), the hold workflow (0013) and cancellation (0016) each added a
-- way for a bill to exist without being one, and only get_sales_summary (0012)
-- and get_management_summary (0014) were taught about them.
--
-- The visible damage was on Reports, which disagreed with itself: the summary
-- card came from get_sales_summary and counted delivered orders, while the day
-- rows and the top-items table beside it counted held, cancelled and deleted
-- ones too — 630 against 555, same screen, same day.
--
-- All three now ask what get_sales_summary asks: delivered, and not deleted.
-- Bodies are otherwise untouched, including the Asia/Kolkata day boundary.

-- ---------------------------------------------------------------------------
-- Today's takings
-- ---------------------------------------------------------------------------

create or replace function public.get_dashboard_today()
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
  where b.created_at >= (
    date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'
  )
    and b.deleted_at is null
    and b.status = 'delivered'
$$;

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
    and b.deleted_at is null
    and b.status = 'delivered'
  group by 1
  order by 1 desc
$$;

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
    and b.deleted_at is null
    and b.status = 'delivered'
  group by bi.product_name
  order by 3 desc, 2 desc, 1
  -- Clamped rather than trusted: p_limit arrives from a query string.
  limit greatest(1, least(coalesce(p_limit, 10), 50))
$$;
