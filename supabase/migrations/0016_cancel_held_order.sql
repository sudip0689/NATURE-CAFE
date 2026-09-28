-- ---------------------------------------------------------------------------
-- A customer can change their mind while the food is still being made.
--
-- A third value on the existing status column rather than anything new: the
-- reads that matter already ask for status = 'delivered' (sales, bills,
-- export, the dashboard) or status = 'hold' (the hold list), so a cancelled
-- order drops out of all of them the moment it is marked, with no query
-- anywhere needing to learn about it.
--
-- Not a delete. The order, its items, its customer and the payment method it
-- was rung up under all stay exactly where they are; what changes is that it
-- stops being a sale.
-- ---------------------------------------------------------------------------

alter table public.bills drop constraint if exists bills_status_check;
alter table public.bills
  add constraint bills_status_check
  check (status in ('hold', 'delivered', 'cancelled'));

alter table public.bills
  add column if not exists cancelled_at timestamptz;

comment on column public.bills.cancelled_at is
  'When a held order was cancelled. Separate from deleted_at: deleting is '
  'management removing a bill that should not have existed, cancelling is a '
  'customer changing their mind about one that legitimately did.';

create or replace function public.cancel_bill(
  p_actor   uuid,
  p_bill_id uuid
)
returns table (out_bill_number text, out_total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select p.role into v_role
    from public.profiles p
   where p.id = p_actor and p.is_active;

  if v_role is null or v_role not in ('owner', 'cashier') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  -- `status = 'hold'` in the predicate is the whole safety rule: a delivered
  -- order is a completed sale and a cancelled one is already cancelled, so
  -- neither matches and neither can be walked backwards from here.
  return query
    update public.bills b
       set status = 'cancelled',
           cancelled_at = now()
     where b.id = p_bill_id
       and b.status = 'hold'
       and b.deleted_at is null
    returning b.bill_number, b.total;

  if not found then
    raise exception 'NOT_HELD' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.cancel_bill(uuid, uuid) from public;
grant execute on function public.cancel_bill(uuid, uuid) to authenticated;

comment on function public.cancel_bill(uuid, uuid) is
  'Cancels an order that is still on hold. Refuses anything delivered or '
  'already cancelled, so the completed-sale workflow cannot be reversed here.';
