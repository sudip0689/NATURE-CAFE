-- ---------------------------------------------------------------------------
-- HOLD → DELIVERED.
--
-- Until now a bill was the sale: ringing it up was the end of the story. The
-- counter needs the middle of that story back — the stretch where the food is
-- being cooked and the order is waiting — so a bill now starts on hold and
-- becomes a sale when it is handed over.
--
-- Three things this deliberately does not do:
--
--   · Invent a second numbering system. #NC000012 is the same order on hold,
--     delivered and in the history.
--   · Touch create_bill. It is the careful one — idempotent on
--     client_request_id, prices server-side, recovers from a unique violation
--     — and column defaults mean it does not have to change to start holding
--     orders. Not editing it is the safest version of this migration.
--   · Rewrite history. The bills already in the table were completed sales,
--     so they are marked delivered at the moment they were rung up, which is
--     what actually happened.
-- ---------------------------------------------------------------------------

alter table public.bills
  add column if not exists status text not null default 'delivered',
  add column if not exists held_at timestamptz,
  add column if not exists delivered_at timestamptz;

-- Every existing bill was a finished sale. They take 'delivered' from the
-- default above; this gives them the timestamp to match rather than leaving
-- a table of delivered orders that were apparently never delivered.
update public.bills
   set delivered_at = created_at
 where delivered_at is null
   and status = 'delivered';

-- Only now does the default flip, so it applies to new orders and not to the
-- rows that were already here. create_bill names neither column in its
-- insert, which is exactly why it needs no changes: a new order picks up
-- 'hold' and held_at = now() on its own.
alter table public.bills alter column status set default 'hold';
alter table public.bills alter column held_at set default now();

do $$
begin
  alter table public.bills
    add constraint bills_status_check check (status in ('hold', 'delivered'));
exception
  when duplicate_object then null;
end $$;

comment on column public.bills.status is
  'hold while the order is being prepared, delivered once it is handed over. '
  'A sale is only counted when it is delivered.';
comment on column public.bills.held_at is
  'When the order went on hold. The counter shows the wait from this, and it '
  'survives the app being closed and reopened. Null on bills from before the '
  'hold workflow existed.';
comment on column public.bills.delivered_at is
  'When it was handed over. Backfilled to created_at for bills that predate '
  'the hold workflow, because those were complete the moment they were rung up.';

-- The hold list is "oldest first, still waiting", which is this exactly.
create index if not exists bills_hold_idx
  on public.bills (held_at)
  where status = 'hold' and deleted_at is null;

-- ---------------------------------------------------------------------------
-- A sale is a delivered order.
--
-- Without this the takings would count food that is still on the pass, and
-- the day's total would fall as orders were delivered rather than rise.
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
    and b.status = 'delivered'
$$;

grant execute on function public.get_sales_summary(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Handing the order over.
--
-- An RPC for the same reason create_bill is one: bills has no UPDATE policy,
-- so the publishable key cannot write to it at all.
-- ---------------------------------------------------------------------------

create or replace function public.deliver_bill(
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

  -- Whoever works the till. Management monitors the hold list rather than
  -- working it, but the owner also serves customers on this app.
  if v_role is null or v_role not in ('owner', 'cashier') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  -- `status = 'hold'` in the predicate is what makes a double tap harmless:
  -- the second one matches nothing rather than moving delivered_at forward.
  return query
    update public.bills b
       set status = 'delivered',
           delivered_at = now()
     where b.id = p_bill_id
       and b.status = 'hold'
       and b.deleted_at is null
    returning b.bill_number, b.total;

  if not found then
    raise exception 'NOT_HELD' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.deliver_bill(uuid, uuid) from public;
grant execute on function public.deliver_bill(uuid, uuid) to authenticated;

comment on function public.deliver_bill(uuid, uuid) is
  'Moves a held order to delivered. Refuses anything not currently on hold, '
  'so delivering twice cannot move the timestamp or double-count the sale.';

-- ---------------------------------------------------------------------------
-- Deployed. Kept as the record of why the default moved twice.
--
-- The columns landed before the application code did, so for a while the
-- default was put back to 'delivered'. With it at 'hold', an order rung up on
-- the then-deployed till would have been created held, still shown in the
-- bills list (that build had no status filter) and left out of
-- get_sales_summary -- the day's takings would quietly under-report.
--
-- Flipped back to 'hold' once the application code was live, which is the
-- state now. The order matters: with the code deployed first, the worst case
-- during the gap is an order that does not go on hold, rather than one that
-- goes on hold in front of a build that cannot see it.
--
