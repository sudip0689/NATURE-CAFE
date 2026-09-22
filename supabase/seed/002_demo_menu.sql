-- Demo menu, using the items and prices from the spec's own worked examples.
-- Safe to re-run, and safe to delete once the café enters its real menu:
--   delete from public.products where name in (...);

insert into public.products (name, category_id, price)
select v.name, c.id, v.price
from (values
  ('Cold Coffee',   'Coffee',  80.00),
  ('Filter Coffee', 'Coffee',  40.00),
  ('Masala Chai',   'Drinks',  25.00),
  ('Fresh Lime',    'Drinks',  35.00),
  ('French Fries',  'Snacks',  90.00),
  ('Veg Pakora',    'Snacks',  60.00),
  ('Chicken Roll',  'Rolls',  120.00),
  ('Egg Roll',      'Rolls',   70.00),
  ('Veg Burger',    'Burger',  95.00),
  ('Margherita',    'Pizza',  199.00),
  ('Hakka Noodles', 'Chinese', 140.00)
) as v(name, category, price)
join public.categories c on lower(c.name) = lower(v.category)
on conflict do nothing;
