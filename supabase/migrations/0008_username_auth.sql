-- 0008_username_auth.sql — replace Supabase Auth with two fixed usernames.
--
-- WHAT CHANGES AND WHY IT MATTERS
--
-- The app now has no passwords. Login is a username picked from a list of two,
-- so anyone who can open the URL can choose "owner". The owner/cashier split is
-- therefore a workflow convenience, not a security boundary, and the database
-- can no longer identify who is calling: auth.uid() is always null.
--
-- Everything that used to rest on auth.uid() is rewritten accordingly:
--   · profiles no longer references auth.users, and holds exactly two rows
--   · RLS stops trying to identify a caller, because it cannot
--   · create_bill takes the actor explicitly instead of reading auth.uid()
--
-- ONE GUARANTEE IS DELIBERATELY KEPT. bills and bill_items still have no
-- INSERT/UPDATE/DELETE policy, so the only way a bill can exist is through
-- create_bill, which re-reads every price from products. Access control is gone;
-- money integrity is not. A bill still cannot be written with a made-up price,
-- and a saved bill still cannot be edited.

-- ---------------------------------------------------------------------------
-- 1. Detach from Supabase Auth
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_email_changed on auth.users;
drop function if exists private.handle_new_user();
drop function if exists private.sync_profile_email();

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles drop column if exists email;
alter table public.profiles add column if not exists username text;

-- ---------------------------------------------------------------------------
-- 2. Exactly two accounts, with fixed ids so bills reference something stable
-- ---------------------------------------------------------------------------

insert into public.profiles (id, username, full_name, role, is_active)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner',   'Owner',   'owner',   true),
  ('00000000-0000-0000-0000-0000000000a2', 'cashier', 'Cashier', 'cashier', true)
on conflict (id) do update
  set username  = excluded.username,
      full_name = excluded.full_name,
      role      = excluded.role,
      is_active = true;

-- Anything left over from the auth era is not a valid login any more.
delete from public.profiles where username is null;

alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- 3. RLS without a caller identity
--
-- The old policies all resolved to false once auth.uid() went away, which would
-- have locked the app out of its own database. They are replaced with honest
-- ones: reads and catalog writes are open to the app's key, and the role split
-- is enforced in server code (src/lib/auth.ts).
--
-- Being blunt about the consequence: PostgREST is reachable with the
-- publishable key. That is not a downgrade from the password-less login — it is
-- the same exposure by a different door.
-- ---------------------------------------------------------------------------

drop function if exists private.current_profile_role() cascade;
drop function if exists private.is_owner() cascade;
drop function if exists private.is_staff() cascade;

-- profiles: readable so the login screen can resolve a username. Not writable.
drop policy if exists profiles_select_self_or_owner on public.profiles;
drop policy if exists profiles_insert_owner on public.profiles;
drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_read on public.profiles
  for select to anon, authenticated using (true);

-- categories / products / settings: the app manages these, guarded server-side.
drop policy if exists categories_select_staff on public.categories;
drop policy if exists categories_write_owner on public.categories;
create policy categories_all on public.categories
  for all to anon, authenticated using (true) with check (true);

drop policy if exists products_select_staff on public.products;
drop policy if exists products_write_owner on public.products;
create policy products_all on public.products
  for all to anon, authenticated using (true) with check (true);

drop policy if exists settings_select_staff on public.settings;
drop policy if exists settings_update_owner on public.settings;
create policy settings_read on public.settings
  for select to anon, authenticated using (true);
create policy settings_update on public.settings
  for update to anon, authenticated using (true) with check (true);

-- bills / bill_items: readable, and STILL not directly writable by anyone.
drop policy if exists bills_select_owner_or_own on public.bills;
drop policy if exists bill_items_select_visible_bill on public.bill_items;
create policy bills_read on public.bills
  for select to anon, authenticated using (true);
create policy bill_items_read on public.bill_items
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. create_bill, with the actor passed in
-- ---------------------------------------------------------------------------

drop function if exists public.create_bill(jsonb, text, text, text, numeric, uuid);

create or replace function public.create_bill(
  p_actor           uuid,
  p_items           jsonb,
  p_payment_method  text,
  p_customer_name   text default null,
  p_customer_mobile text default null,
  p_discount        numeric default 0,
  p_request_id      uuid default null
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
  -- The actor is whoever the server says is signed in. Both roles may bill.
  select p.role into v_role
  from public.profiles p
  where p.id = p_actor and p.is_active;

  if v_role is null or v_role not in ('owner', 'cashier') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  if p_request_id is not null then
    select b.id, b.bill_number, b.total into v_existing
    from public.bills b where b.client_request_id = p_request_id;
    if found then
      out_id := v_existing.id;
      out_bill_number := v_existing.bill_number;
      out_total := v_existing.total;
      return next; return;
    end if;
  end if;

  if p_payment_method is null or p_payment_method not in ('cash', 'upi', 'card') then
    raise exception 'BAD_PAYMENT_METHOD' using errcode = '22023';
  end if;

  if v_mobile is not null and v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'BAD_MOBILE' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  with requested as (
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::int) as quantity
      from jsonb_array_elements(p_items) as item
     group by 1
  )
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

  -- Prices come from the table. This is the guarantee that survives the
  -- removal of authentication.
  with requested as (
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::int) as quantity
      from jsonb_array_elements(p_items) as item
     group by 1
  )
  select count(*)::int, coalesce(sum(p.price * r.quantity), 0)
    into v_matched, v_subtotal
    from requested r
    join public.products p on p.id = r.product_id and p.is_active;

  if v_matched <> v_requested then
    raise exception 'PRODUCT_UNAVAILABLE' using errcode = '22023';
  end if;

  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'BAD_DISCOUNT' using errcode = '22023';
  end if;

  v_total := v_subtotal - v_discount;
  v_number := private.next_bill_number();

  insert into public.bills (
    bill_number, customer_name, customer_mobile,
    subtotal, discount, total, payment_method, cashier_id, client_request_id
  )
  values (
    v_number, coalesce(v_name, 'Walk-in Customer'), v_mobile,
    v_subtotal, v_discount, v_total, p_payment_method, p_actor, p_request_id
  )
  returning id into v_bill_id;

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
    join public.products p on p.id = r.product_id and p.is_active;

  out_id := v_bill_id;
  out_bill_number := v_number;
  out_total := v_total;
  return next;

exception
  when unique_violation then
    if p_request_id is not null then
      select b.id, b.bill_number, b.total into v_existing
      from public.bills b where b.client_request_id = p_request_id;
      if found then
        out_id := v_existing.id;
        out_bill_number := v_existing.bill_number;
        out_total := v_existing.total;
        return next; return;
      end if;
    end if;
    raise;
end;
$$;

grant execute on function
  public.create_bill(uuid, jsonb, text, text, text, numeric, uuid)
  to anon, authenticated;

-- The reporting functions are SECURITY INVOKER and now see everything, which
-- is correct: there is no per-user scoping left to apply.
grant execute on function public.get_dashboard_today() to anon;
grant execute on function public.get_sales_summary(date, date) to anon;
grant execute on function public.get_daily_sales(date, date) to anon;
grant execute on function public.get_top_items(date, date, int) to anon;
