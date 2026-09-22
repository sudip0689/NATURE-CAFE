-- 0001_foundation.sql — Nature Caffe POS, Phase 1 foundation.
--
-- Scope: profiles/roles, catalog, bills, settings, and RLS on every table.
--
-- Two rules shape everything below:
--   1. A bill is immutable. Bill lines carry a *snapshot* of name and price, and
--      there is no UPDATE or DELETE policy on bills/bill_items — so re-pricing a
--      product tomorrow cannot rewrite what a customer was charged today.
--   2. A cashier cannot write to the catalog. That is enforced here, in RLS, not
--      by hiding a button.
--
-- There are deliberately no stock/quantity-on-hand columns. v1 is items, prices,
-- categories, availability, and billing.
--
-- Ordering note: tables are created before the helper functions that read them.
-- Postgres validates a SQL-language function body at CREATE time, so defining
-- private.current_profile_role() first fails with "relation profiles does not
-- exist". Keep this order.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Private schema + the one dependency-free helper
-- ---------------------------------------------------------------------------

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'cashier' check (role in ('owner', 'cashier')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role) where is_active;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists categories_name_unique
  on public.categories (lower(name));

create index if not exists categories_active_idx
  on public.categories (sort_order, name) where is_active;

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
  before update on public.categories
  for each row execute function private.touch_updated_at();

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category_id  uuid references public.categories(id) on delete restrict,
  price        numeric(10, 2) not null check (price >= 0),
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists products_name_unique
  on public.products (lower(name));

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active, name);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function private.touch_updated_at();

create sequence if not exists public.bill_number_seq as bigint start 1;

create table if not exists public.bills (
  id               uuid primary key default gen_random_uuid(),
  bill_number      text not null unique,
  customer_name    text not null default 'Walk-in Customer',
  customer_mobile  text check (customer_mobile is null or customer_mobile ~ '^[6-9][0-9]{9}$'),
  subtotal         numeric(10, 2) not null check (subtotal >= 0),
  discount         numeric(10, 2) not null default 0 check (discount >= 0),
  total            numeric(10, 2) not null check (total >= 0),
  payment_method   text not null check (payment_method in ('cash', 'upi', 'card')),
  cashier_id       uuid not null references public.profiles(id) on delete restrict,
  created_at       timestamptz not null default now(),

  constraint bills_total_is_subtotal_less_discount check (total = subtotal - discount),
  constraint bills_discount_within_subtotal check (discount <= subtotal)
);

create index if not exists bills_created_at_idx on public.bills (created_at desc);
create index if not exists bills_cashier_idx on public.bills (cashier_id, created_at desc);
create index if not exists bills_mobile_idx on public.bills (customer_mobile)
  where customer_mobile is not null;

create table if not exists public.bill_items (
  id            uuid primary key default gen_random_uuid(),
  bill_id       uuid not null references public.bills(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text not null,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10, 2) not null check (unit_price >= 0),
  line_total    numeric(10, 2) not null check (line_total >= 0),
  created_at    timestamptz not null default now(),

  constraint bill_items_line_total_matches check (line_total = unit_price * quantity)
);

create index if not exists bill_items_bill_idx on public.bill_items (bill_id);

-- product_id is ON DELETE SET NULL rather than RESTRICT on purpose: the receipt
-- reads from product_name/unit_price, so a deleted product leaves history intact.
comment on column public.bill_items.product_name is
  'Snapshot taken at sale time. Never join to products to render an old bill.';

create table if not exists public.settings (
  id              smallint primary key default 1 check (id = 1),
  cafe_name       text not null default 'Nature Caffe',
  tagline         text not null default 'Good Food · Good Mood',
  address         text not null default '',
  phone           text not null default '',
  upi_id          text not null default '',
  upi_name        text not null default '',
  upi_qr_url      text,
  receipt_footer  text not null default 'Thank You! Visit Again',
  updated_at      timestamptz not null default now()
);

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function private.touch_updated_at();

-- The app always expects exactly one settings row.
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Role helpers
--
-- SECURITY DEFINER and in a non-exposed schema, so that a policy on
-- public.profiles can ask "what is my role?" without re-entering that same
-- policy. Reading profiles from inside a profiles policy is the classic
-- infinite-recursion trap in Supabase RLS; this is the way around it.
-- ---------------------------------------------------------------------------

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
$$;

comment on function private.current_profile_role() is
  'Role of the calling user, or NULL when unauthenticated or deactivated. '
  'Deactivating a profile therefore removes every permission immediately.';

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_profile_role() = 'owner', false)
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_profile_role() in ('owner', 'cashier')
$$;

revoke all on function private.current_profile_role() from public;
revoke all on function private.is_owner() from public;
revoke all on function private.is_staff() from public;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.is_owner() to authenticated;
grant execute on function private.is_staff() to authenticated;

-- A profile row is created for every auth user, so a signed-in user can never
-- exist without a role. Role comes from signup metadata and defaults to the
-- least-privileged option.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner'
      else 'cashier'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.next_bill_number()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'NC' || lpad(nextval('public.bill_number_seq')::text, 6, '0')
$$;

comment on function private.next_bill_number() is
  'Bill numbers come from a Postgres sequence, so two cashiers billing in the '
  'same millisecond cannot collide. Never generate these in the browser.';

-- Only the Phase 4 bill-creation RPC should mint numbers.
revoke all on function private.next_bill_number() from public;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.bills      enable row level security;
alter table public.bill_items enable row level security;
alter table public.settings   enable row level security;

-- profiles ------------------------------------------------------------------

drop policy if exists profiles_select_self_or_owner on public.profiles;
create policy profiles_select_self_or_owner on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_owner());

drop policy if exists profiles_insert_owner on public.profiles;
create policy profiles_insert_owner on public.profiles
  for insert to authenticated
  with check (private.is_owner());

drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner on public.profiles
  for update to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- No delete policy: cashiers are deactivated, not deleted, so their bills keep
-- a valid cashier_id.

-- categories ----------------------------------------------------------------

drop policy if exists categories_select_staff on public.categories;
create policy categories_select_staff on public.categories
  for select to authenticated
  using (private.is_owner() or (is_active and private.is_staff()));

drop policy if exists categories_write_owner on public.categories;
create policy categories_write_owner on public.categories
  for all to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- products ------------------------------------------------------------------

drop policy if exists products_select_staff on public.products;
create policy products_select_staff on public.products
  for select to authenticated
  using (private.is_owner() or (is_active and private.is_staff()));

-- This single policy is the enforcement behind "a cashier cannot change a
-- price". There is no cashier-writable path to this table at all.
drop policy if exists products_write_owner on public.products;
create policy products_write_owner on public.products
  for all to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- bills ---------------------------------------------------------------------

drop policy if exists bills_select_owner_or_own on public.bills;
create policy bills_select_owner_or_own on public.bills
  for select to authenticated
  using (private.is_owner() or cashier_id = (select auth.uid()));

-- Deliberately NO insert policy.
--
-- Bills are created only by the SECURITY DEFINER `create_bill` RPC added in
-- Phase 4, which re-reads each price from public.products server-side. If a
-- cashier could INSERT here directly, they could POST a bill to PostgREST with
-- unit_price = 1 and the CHECK constraints would happily accept it — they only
-- verify that the arithmetic is self-consistent, not that the price is real.
-- Closing the direct path is what makes "a cashier cannot change a price" true
-- at the till as well as in the catalog.

-- bill_items ----------------------------------------------------------------

drop policy if exists bill_items_select_visible_bill on public.bill_items;
create policy bill_items_select_visible_bill on public.bill_items
  for select to authenticated
  using (
    exists (
      select 1 from public.bills b
      where b.id = bill_id
        and (private.is_owner() or b.cashier_id = (select auth.uid()))
    )
  );

-- No insert policy here either, for the same reason as public.bills: lines are
-- written by the Phase 4 RPC inside the same transaction as their parent bill.

-- settings ------------------------------------------------------------------

-- Cashiers read settings because the receipt needs the café name and UPI QR.
-- Nothing secret is stored here.
drop policy if exists settings_select_staff on public.settings;
create policy settings_select_staff on public.settings
  for select to authenticated
  using (private.is_staff());

drop policy if exists settings_update_owner on public.settings;
create policy settings_update_owner on public.settings
  for update to authenticated
  using (private.is_owner())
  with check (private.is_owner());
