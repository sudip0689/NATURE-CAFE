-- 0002_owner_module.sql — Phase 2 (Owner).
--
-- Adds the product-image bucket and the dashboard aggregate. No table changes:
-- the Phase 1 schema already carries everything the owner screens read.

-- ---------------------------------------------------------------------------
-- Product images
--
-- Public-read on purpose: these are photos of food on a menu, nothing private,
-- and the POS grid should render them without signing every URL. Writes stay
-- owner-only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select
  using (bucket_id = 'product-images');

drop policy if exists product_images_owner_writes on storage.objects;
create policy product_images_owner_writes on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and private.is_owner())
  with check (bucket_id = 'product-images' and private.is_owner());

-- ---------------------------------------------------------------------------
-- Today's takings
--
-- SECURITY INVOKER, so RLS still applies: an owner sees the whole counter, and
-- if a cashier ever calls this they see only their own bills.
--
-- "Today" is a café day in Kolkata, not a UTC day. A 23:30 IST sale is 18:00
-- UTC the same date, but an 05:00 IST sale is 23:30 UTC the *previous* date —
-- bucket on UTC and the morning's takings quietly land on yesterday.
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
$$;

comment on function public.get_dashboard_today() is
  'Today''s sales split by payment method, bucketed on the Asia/Kolkata day.';

grant execute on function public.get_dashboard_today() to authenticated;
