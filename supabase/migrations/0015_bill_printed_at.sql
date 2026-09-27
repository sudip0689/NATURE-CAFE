-- ---------------------------------------------------------------------------
-- When the receipt actually came out of the printer.
--
-- Deliberately a timestamp beside status rather than a third status value.
-- Printing is not a stage of the order: a delivered order is delivered
-- whether the paper jammed or not, and the one rule that matters here is that
-- a failed print must never move an order back to hold. Keeping it in its own
-- column makes that impossible to get wrong — nothing about printing can
-- write to status at all.
-- ---------------------------------------------------------------------------

alter table public.bills
  add column if not exists printed_at timestamptz;

comment on column public.bills.printed_at is
  'When a receipt was last successfully printed. Null means never printed, '
  'which is not the same as not delivered — a print failure leaves the order '
  'delivered and simply unprinted.';

create or replace function public.mark_bill_printed(
  p_actor   uuid,
  p_bill_id uuid
)
returns void
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

  -- Only this column, ever. A reprint updates the timestamp; nothing here can
  -- reach status or delivered_at.
  update public.bills
     set printed_at = now()
   where id = p_bill_id
     and deleted_at is null;
end;
$$;

revoke all on function public.mark_bill_printed(uuid, uuid) from public;
grant execute on function public.mark_bill_printed(uuid, uuid) to authenticated;
