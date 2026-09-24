-- Let the menu decide the order of items, the way categories already do.
--
-- Products were listed alphabetically, so Fried Chicken opened with "Chicken
-- Chest" while the printed menu leads with "Chicken Leg". A cashier reading
-- down the board and down the screen was reading two different lists.
--
-- Mirrors categories.sort_order exactly, including the tie-break: equal
-- sort_order falls back to name, so nothing is ever in an arbitrary order.
--
-- The default is deliberately high rather than 0. A product added later has
-- no considered position, and landing at the end of its category is a far
-- better guess than jumping to the front of a menu the owner has arranged.

alter table public.products
  add column if not exists sort_order integer not null default 100;

-- Matches how the menu is read, category by category.
create index if not exists products_category_sort_idx
  on public.products (category_id, sort_order, name);
