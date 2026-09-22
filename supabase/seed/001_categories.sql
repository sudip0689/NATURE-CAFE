-- Starter menu categories. Safe to re-run; the owner can rename, reorder,
-- deactivate or add to these from Settings once Phase 2 lands.

insert into public.categories (name, sort_order) values
  ('Coffee',  10),
  ('Drinks',  20),
  ('Snacks',  30),
  ('Rolls',   40),
  ('Burger',  50),
  ('Pizza',   60),
  ('Chinese', 70)
on conflict do nothing;
