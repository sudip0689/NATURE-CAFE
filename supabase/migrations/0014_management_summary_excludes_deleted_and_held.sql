-- ---------------------------------------------------------------------------
-- The dashboard was counting bills it should not have.
--
-- get_management_summary read the whole of bills: deleted rows included, which
-- the soft-delete work should have caught here and missed, and now held ones
-- too. "Today's Bills" and "Today's Sales" are the two numbers the owner looks
-- at when closing up, and they were quietly counting a bill that had been
-- deleted and food still sitting on the pass.
--
-- Dropped rather than replaced because it gains a column: held_orders, so the
-- dashboard can say how many orders are waiting without a second round trip.
-- ---------------------------------------------------------------------------

drop function if exists public.get_management_summary();

create function public.get_management_summary()
returns table (
  food_items      bigint,
  todays_bills    bigint,
  todays_sales    numeric,
  known_customers bigint,
  held_orders     bigint
)
language sql
stable
set search_path = ''
as $$
  select
    (select count(*) from public.products where is_active)::bigint,
    (select count(*) from public.bills
      where created_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata')
                             at time zone 'Asia/Kolkata')
        and deleted_at is null
        and status = 'delivered')::bigint,
    (select coalesce(sum(total), 0) from public.bills
      where created_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata')
                             at time zone 'Asia/Kolkata')
        and deleted_at is null
        and status = 'delivered')::numeric,
    (select count(distinct customer_mobile) from public.bills
      where customer_mobile is not null
        and deleted_at is null)::bigint,
    (select count(*) from public.bills
      where status = 'hold' and deleted_at is null)::bigint
$$;

grant execute on function public.get_management_summary() to authenticated;
