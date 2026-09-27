-- ---------------------------------------------------------------------------
-- Deleting a bill, without destroying it.
--
-- Café management needs to be able to remove a bill rung up in error. What it
-- must not do is take the sale's history with it: bill_items.bill_id cascades,
-- so a real DELETE silently takes every line of the order too, and the bill
-- number -- which is UNIQUE and drawn from a sequence -- would leave a hole in
-- the record with nothing to say why.
--
-- So the row stays and is marked instead. It vanishes from the bills list,
-- from search, from the dashboard and from every sales total, while the items,
-- the number and the audit trail remain where an accountant can still find
-- them.
-- ---------------------------------------------------------------------------

alter table public.bills
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete restrict;

comment on column public.bills.deleted_at is
  'When café management removed this bill. Null for a live bill; every normal '
  'read filters on it. The row is kept so the order lines, the bill number and '
  'the audit trail survive.';

comment on column public.bills.deleted_by is
  'Who removed it. Restricted rather than nulled on profile deletion, so the '
  'answer to "who did this" cannot quietly disappear.';

-- Every list, search and report asks for live bills in date order, so the
-- index covers exactly that and stays small by excluding the deleted ones.
create index if not exists bills_active_created_idx
  on public.bills (created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Sales totals must not count a deleted bill.
--
-- The one place this could have been missed: the summary aggregates the table
-- directly, so filtering in the application queries alone would have left
-- deleted bills in the day's takings while they were gone from the list that
-- is supposed to explain it.
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
    and b.deleted_at is null
$$;

grant execute on function public.get_sales_summary(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- The delete itself.
--
-- An RPC because bills has no UPDATE policy -- the publishable key cannot
-- write to it at all, which is why creating a bill goes through create_bill.
-- The same reasoning applies here, and it puts the "management only" rule in
-- the database rather than only in the page that renders the button.
-- ---------------------------------------------------------------------------

create or replace function public.delete_bill(
  p_actor   uuid,
  p_bill_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role   text;
  v_number text;
begin
  -- The actor is passed in, not read from auth.uid(). This app has no
  -- Supabase Auth -- the session is a cookie the server owns -- so create_bill
  -- does the same. auth.uid() here would be null and every delete would be
  -- refused as "not management".
  select p.role into v_role
    from public.profiles p
   where p.id = p_actor;

  -- The billing counter rings sales up; it does not remove them.
  if v_role is distinct from 'owner' then
    raise exception 'Only café management can delete a bill.'
      using errcode = '42501';
  end if;

  update public.bills b
     set deleted_at = now(),
         deleted_by = p_actor
   where b.id = p_bill_id
     and b.deleted_at is null
  returning b.bill_number into v_number;

  -- Already deleted, or never there. Saying so is better than reporting a
  -- success for something that did not happen -- a double-tap that silently
  -- "succeeded" twice is how people stop trusting the confirmation.
  if v_number is null then
    raise exception 'That bill is no longer there to delete.'
      using errcode = 'P0002';
  end if;

  return v_number;
end;
$$;

revoke all on function public.delete_bill(uuid, uuid) from public;
grant execute on function public.delete_bill(uuid, uuid) to authenticated;

comment on function public.delete_bill(uuid, uuid) is
  'Soft-deletes a bill on behalf of café management. Refuses for any other '
  'role. The row, its items and its number are kept.';
