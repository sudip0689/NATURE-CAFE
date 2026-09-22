-- 0009_management_summary.sql — the four numbers on the management dashboard.
--
-- One function rather than four round trips, and bucketed on the Asia/Kolkata
-- day like every other figure in the app, so the dashboard can never disagree
-- with the sales screen about when today started.
--
-- "Known customers" counts distinct mobile numbers, not bills: a walk-in who
-- never gives a number isn't a customer we can count, and counting bills would
-- just be the bill total wearing a different label.

create or replace function public.get_management_summary()
returns table (
  food_items      bigint,
  todays_bills    bigint,
  todays_sales    numeric,
  known_customers bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.products where is_active)::bigint,
    (select count(*) from public.bills
      where created_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata')
                             at time zone 'Asia/Kolkata'))::bigint,
    (select coalesce(sum(total), 0) from public.bills
      where created_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata')
                             at time zone 'Asia/Kolkata'))::numeric,
    (select count(distinct customer_mobile) from public.bills
      where customer_mobile is not null)::bigint
$$;

grant execute on function public.get_management_summary() to anon, authenticated;
