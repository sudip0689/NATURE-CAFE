-- 0003_cafe_assets.sql — storage for café-level images (currently the UPI QR).
--
-- Separate from product-images because the lifecycle differs: there is exactly
-- one café, its assets are replaced rather than accumulated, and mixing them
-- into the menu bucket makes both harder to reason about later.
--
-- Public-read: the QR is printed on every receipt and handed to customers, so
-- it is about as public as an image gets.

insert into storage.buckets (id, name, public)
values ('cafe-assets', 'cafe-assets', true)
on conflict (id) do nothing;

drop policy if exists cafe_assets_public_read on storage.objects;
create policy cafe_assets_public_read on storage.objects
  for select
  using (bucket_id = 'cafe-assets');

drop policy if exists cafe_assets_owner_writes on storage.objects;
create policy cafe_assets_owner_writes on storage.objects
  for all to authenticated
  using (bucket_id = 'cafe-assets' and private.is_owner())
  with check (bucket_id = 'cafe-assets' and private.is_owner());
